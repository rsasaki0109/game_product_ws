-- MatchManager
-- Baseball Brawl のラウンド進行、乱闘、ボール制御を管理

local Debris = game:GetService("Debris")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local MatchConfig = require(ReplicatedStorage:WaitForChild("MatchConfig"))
local ArenaBuilder = require(script.Parent:WaitForChild("ArenaBuilder"))

local function getOrCreateRemote(name: string, className: string): Instance
	local existing = ReplicatedStorage:FindFirstChild(name)
	if existing then
		return existing
	end

	local remote = Instance.new(className)
	remote.Name = name
	remote.Parent = ReplicatedStorage
	return remote
end

local MatchStateChanged = getOrCreateRemote("MatchStateChanged", "RemoteEvent")
local MatchCountdown = getOrCreateRemote("MatchCountdown", "RemoteEvent")
local ScoreChanged = getOrCreateRemote("ScoreChanged", "RemoteEvent")
local BallOwnerChanged = getOrCreateRemote("BallOwnerChanged", "RemoteEvent")
local PlayFeed = getOrCreateRemote("PlayFeed", "RemoteEvent")
local HitFeedback = getOrCreateRemote("HitFeedback", "RemoteEvent")
local ActionCooldown = getOrCreateRemote("ActionCooldown", "RemoteEvent")
local SwingRequest = getOrCreateRemote("SwingRequest", "RemoteEvent")
local DashRequest = getOrCreateRemote("DashRequest", "RemoteEvent")

local currentState = "Lobby"
local scores = {
	Red = 0,
	Blue = 0,
}

local playerTeams = {}
local stunUntilByPlayer = {}
local controlLockByPlayer = {}

local actionCooldowns = {
	Swing = {},
	Dash = {},
}

local ball = nil
local ballLastTouchedTeam = nil
local ballLastTouchedPlayer = nil
local goalLockUntil = 0
local kickoffInProgress = false
local pulseSessionId = 0
local bumperTouchAt = {}

local goalConnections = {}
local bumperConnections = {}

local TEAM_NAMES = { "Red", "Blue" }

local function getArena()
	return workspace:FindFirstChild("BaseballBrawlArena")
end

local function getArenaPart(name: string)
	local arena = getArena()
	if not arena then
		return nil
	end
	local target = arena:FindFirstChild(name)
	if target and target:IsA("BasePart") then
		return target
	end
	return nil
end

local function postFeed(message: string, color: Color3?, duration: number?)
	PlayFeed:FireAllClients(message, color or Color3.fromRGB(255, 255, 255), duration or 2.2)
end

local function setState(newState: string, payload)
	currentState = newState
	MatchStateChanged:FireAllClients(newState, payload)
end

local function pushScore()
	ScoreChanged:FireAllClients(scores.Red, scores.Blue)
end

local function teamColor(teamName: string?)
	if teamName and MatchConfig.Teams[teamName] then
		return MatchConfig.Teams[teamName].color
	end
	return Color3.fromRGB(230, 230, 230)
end

local function setBallOwner(teamName: string?, player)
	ballLastTouchedTeam = teamName
	ballLastTouchedPlayer = player
	if teamName then
		BallOwnerChanged:FireAllClients(teamName, player and player.Name or "")
	else
		BallOwnerChanged:FireAllClients(nil, nil)
	end
end

local function incrementStat(player, statName: string, delta: number)
	local leaderstats = player:FindFirstChild("leaderstats")
	if not leaderstats then
		return
	end
	local stat = leaderstats:FindFirstChild(statName)
	if stat and stat:IsA("IntValue") then
		stat.Value += delta
	end
end

local function setupLeaderstats(player)
	local leaderstats = player:FindFirstChild("leaderstats")
	if not leaderstats then
		leaderstats = Instance.new("Folder")
		leaderstats.Name = "leaderstats"
		leaderstats.Parent = player
	end

	if not leaderstats:FindFirstChild("Goals") then
		local goals = Instance.new("IntValue")
		goals.Name = "Goals"
		goals.Parent = leaderstats
	end

	if not leaderstats:FindFirstChild("BigHits") then
		local bigHits = Instance.new("IntValue")
		bigHits.Name = "BigHits"
		bigHits.Parent = leaderstats
	end
end

local function applyTeamHighlight(player)
	local character = player.Character
	if not character then
		return
	end

	local teamName = playerTeams[player]
	local color = teamColor(teamName)

	local highlight = character:FindFirstChild("TeamGlow")
	if not highlight then
		highlight = Instance.new("Highlight")
		highlight.Name = "TeamGlow"
		highlight.DepthMode = Enum.HighlightDepthMode.Occluded
		highlight.Parent = character
	end

	highlight.FillColor = color
	highlight.FillTransparency = 0.7
	highlight.OutlineColor = Color3.fromRGB(255, 255, 255)
	highlight.OutlineTransparency = 0.2
end

local function getTeamCounts()
	local counts = { Red = 0, Blue = 0 }
	for _, teamName in playerTeams do
		if counts[teamName] then
			counts[teamName] += 1
		end
	end
	return counts
end

local function assignTeam(player)
	local counts = getTeamCounts()
	local teamName = "Red"
	if counts.Blue < counts.Red then
		teamName = "Blue"
	elseif counts.Blue == counts.Red then
		teamName = TEAM_NAMES[math.random(1, #TEAM_NAMES)]
	end

	playerTeams[player] = teamName
	player:SetAttribute("TeamName", teamName)
end

local function rebalanceTeams()
	local players = Players:GetPlayers()
	for _, player in players do
		playerTeams[player] = nil
	end

	for index = #players, 2, -1 do
		local swap = math.random(1, index)
		players[index], players[swap] = players[swap], players[index]
	end

	local nextTeam = 1
	for _, player in players do
		local teamName = TEAM_NAMES[nextTeam]
		nextTeam = (nextTeam % #TEAM_NAMES) + 1
		playerTeams[player] = teamName
		player:SetAttribute("TeamName", teamName)
		applyTeamHighlight(player)
	end
end

local function findSpawnForTeam(teamName: string)
	local info = MatchConfig.Teams[teamName]
	if not info then
		return nil
	end
	return getArenaPart(info.spawnName)
end

local function getCharacterAndHumanoid(player)
	local character = player.Character
	if not character then
		return nil, nil, nil
	end
	local hrp = character:FindFirstChild("HumanoidRootPart")
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	if not hrp or not humanoid then
		return nil, nil, nil
	end
	return character, hrp, humanoid
end

local function applyMovementState(player)
	local _, _, humanoid = getCharacterAndHumanoid(player)
	if not humanoid then
		return
	end

	local locked = controlLockByPlayer[player] == true
	local stunned = (stunUntilByPlayer[player] or 0) > tick()

	if locked then
		humanoid.WalkSpeed = 0
		humanoid.JumpPower = 0
		humanoid.AutoRotate = false
		return
	end

	humanoid.AutoRotate = true
	if stunned then
		humanoid.WalkSpeed = MatchConfig.STUN_WALK_SPEED
		humanoid.JumpPower = MatchConfig.STUN_JUMP_POWER
	else
		humanoid.WalkSpeed = MatchConfig.DEFAULT_WALK_SPEED
		humanoid.JumpPower = MatchConfig.DEFAULT_JUMP_POWER
	end
end

local function stunPlayer(player, duration: number)
	local expiresAt = tick() + duration
	local currentExpires = stunUntilByPlayer[player] or 0
	if expiresAt > currentExpires then
		stunUntilByPlayer[player] = expiresAt
	end
	applyMovementState(player)

	task.delay(duration + 0.05, function()
		if not player.Parent then
			return
		end
		if (stunUntilByPlayer[player] or 0) <= tick() then
			stunUntilByPlayer[player] = nil
			applyMovementState(player)
		end
	end)
end

local function lockAllPlayers(locked: boolean)
	for _, player in Players:GetPlayers() do
		controlLockByPlayer[player] = locked
		applyMovementState(player)
	end
end

local function teleportPlayerToTeamSpawn(player)
	local _, hrp = getCharacterAndHumanoid(player)
	if not hrp then
		return
	end
	local teamName = playerTeams[player]
	if not teamName then
		return
	end
	local spawn = findSpawnForTeam(teamName)
	if not spawn then
		return
	end
	hrp.CFrame = spawn.CFrame + Vector3.new(0, 4, 0)
	hrp.AssemblyLinearVelocity = Vector3.zero
	hrp.AssemblyAngularVelocity = Vector3.zero
end

local function resetAllPlayersToSpawn()
	for _, player in Players:GetPlayers() do
		teleportPlayerToTeamSpawn(player)
	end
end

local function ensureBall()
	if ball and ball.Parent then
		return ball
	end

	local newBall = Instance.new("Part")
	newBall.Name = "BrawlBall"
	newBall.Shape = Enum.PartType.Ball
	newBall.Size = Vector3.new(MatchConfig.BALL_RADIUS * 2, MatchConfig.BALL_RADIUS * 2, MatchConfig.BALL_RADIUS * 2)
	newBall.Material = Enum.Material.Neon
	newBall.Color = Color3.fromRGB(255, 225, 122)
	newBall.TopSurface = Enum.SurfaceType.Smooth
	newBall.BottomSurface = Enum.SurfaceType.Smooth
	newBall.Anchored = false
	newBall.CanCollide = true
	newBall.CanTouch = true
	newBall.CanQuery = true
	newBall.CustomPhysicalProperties = PhysicalProperties.new(1, 0.35, 0.2)
	newBall.Parent = workspace

	ball = newBall
	pcall(function()
		ball:SetNetworkOwner(nil)
	end)

	return newBall
end

local function ballSpawnCFrame()
	local spawnPart = getArenaPart("BallSpawn")
	if spawnPart then
		return spawnPart.CFrame + Vector3.new(0, MatchConfig.BALL_RADIUS + 2, 0)
	end
	return CFrame.new(0, 8, 0)
end

local function resetBall(reason: string?)
	local currentBall = ensureBall()
	currentBall.CFrame = ballSpawnCFrame()
	currentBall.AssemblyLinearVelocity = Vector3.zero
	currentBall.AssemblyAngularVelocity = Vector3.zero
	pcall(function()
		currentBall:SetNetworkOwner(nil)
	end)
	setBallOwner(nil, nil)
	if reason then
		postFeed(reason, Color3.fromRGB(255, 229, 120), 1.6)
	end
end

local function scoringTeamFromSensor(sensorName: string)
	if sensorName == "GoalSensor_Red" then
		return "Blue"
	end
	if sensorName == "GoalSensor_Blue" then
		return "Red"
	end
	return nil
end

local function isCooldownReady(actionName: string, userId: number, cooldown: number)
	local bucket = actionCooldowns[actionName]
	local now = tick()
	local prev = bucket[userId] or 0
	if now - prev < cooldown then
		return false
	end
	bucket[userId] = now
	return true
end

local function applyImpulseToCharacter(player, direction: Vector3, force: number, upForce: number)
	local _, hrp = getCharacterAndHumanoid(player)
	if not hrp then
		return
	end

	local dir = direction
	if dir.Magnitude < 0.001 then
		dir = Vector3.new(math.random() - 0.5, 0, math.random() - 0.5)
	end
	local horizontal = Vector3.new(dir.X, 0, dir.Z)
	if horizontal.Magnitude < 0.001 then
		horizontal = Vector3.new(1, 0, 0)
	end
	dir = horizontal.Unit

	local impulse = (dir * force + Vector3.new(0, upForce, 0)) * hrp.AssemblyMass
	hrp:ApplyImpulse(impulse)
end

local function pulseShockwaveVisual(position: Vector3)
	local ring = Instance.new("Part")
	ring.Name = "PulseRing"
	ring.Shape = Enum.PartType.Cylinder
	ring.Anchored = true
	ring.CanCollide = false
	ring.CanTouch = false
	ring.Material = Enum.Material.Neon
	ring.Color = Color3.fromRGB(255, 150, 55)
	ring.Transparency = 0.3
	ring.Size = Vector3.new(1, 0.7, 1)
	ring.CFrame = CFrame.new(position + Vector3.new(0, 0.2, 0)) * CFrame.Angles(0, 0, math.rad(90))
	ring.Parent = workspace
	Debris:AddItem(ring, 0.9)

	task.spawn(function()
		for step = 1, 10 do
			if not ring.Parent then
				return
			end
			local alpha = step / 10
			ring.Size = Vector3.new(1 + alpha * MatchConfig.CHAOS_PULSE_RADIUS * 2, 0.7, 1 + alpha * MatchConfig.CHAOS_PULSE_RADIUS * 2)
			ring.Transparency = 0.25 + alpha * 0.7
			task.wait(0.05)
		end
	end)
end

local function triggerChaosPulse()
	if currentState ~= "Playing" then
		return
	end

	local core = getArenaPart("ChaosCore")
	if not core then
		return
	end

	postFeed("CHAOS PULSE!", Color3.fromRGB(255, 150, 55), 1.8)
	pulseShockwaveVisual(core.Position)

	for _, player in Players:GetPlayers() do
		local _, hrp = getCharacterAndHumanoid(player)
		if hrp then
			local offset = hrp.Position - core.Position
			local distance = offset.Magnitude
			if distance <= MatchConfig.CHAOS_PULSE_RADIUS then
				local strength = 1 - (distance / MatchConfig.CHAOS_PULSE_RADIUS)
				applyImpulseToCharacter(player, offset, MatchConfig.CHAOS_PULSE_FORCE * (0.45 + strength), MatchConfig.CHAOS_PULSE_UP_FORCE)
				stunPlayer(player, MatchConfig.CHAOS_PULSE_STUN)
				HitFeedback:FireClient(player, 0.4 + strength * 0.3, 0.15)
			end
		end
	end

	if ball and ball.Parent then
		local offset = ball.Position - core.Position
		local distance = offset.Magnitude
		if distance <= MatchConfig.CHAOS_PULSE_RADIUS * 1.1 then
			local dir = if distance > 0.1 then offset.Unit else Vector3.new(math.random(), 0, math.random()).Unit
			ball:ApplyImpulse((dir * MatchConfig.CHAOS_BALL_FORCE + Vector3.new(0, MatchConfig.CHAOS_PULSE_UP_FORCE, 0)) * ball.AssemblyMass)
			setBallOwner(nil, nil)
		end
	end
end

local function postGoalMessage(scoringTeam: string, scoreSpeed: number)
	local speedText = string.format("%.0f", scoreSpeed)
	local shooterName = ballLastTouchedPlayer and ballLastTouchedPlayer.Name or "Unknown"
	if scoreSpeed >= MatchConfig.MONSTER_SHOT_SPEED then
		postFeed(string.format("MONSTER SHOT! %s (spd %s)", shooterName, speedText), teamColor(scoringTeam), 2.8)
	else
		postFeed(string.format("GOAL! %s +1", scoringTeam), teamColor(scoringTeam), 2.1)
	end
end

local function kickoffReset()
	if kickoffInProgress then
		return
	end
	kickoffInProgress = true

	lockAllPlayers(true)
	resetAllPlayersToSpawn()
	resetBall()

	task.delay(MatchConfig.KICKOFF_FREEZE, function()
		kickoffInProgress = false
		if currentState == "Playing" then
			lockAllPlayers(false)
		end
	end)
end

local function onGoalTouched(goalSensor, hit)
	if currentState ~= "Playing" then
		return
	end
	if kickoffInProgress then
		return
	end
	if not ball or hit ~= ball then
		return
	end
	if tick() < goalLockUntil then
		return
	end

	goalLockUntil = tick() + MatchConfig.SCORE_COOLDOWN
	local scoringTeam = scoringTeamFromSensor(goalSensor.Name)
	if not scoringTeam then
		return
	end

	scores[scoringTeam] += 1
	pushScore()

	if ballLastTouchedPlayer and playerTeams[ballLastTouchedPlayer] == scoringTeam then
		incrementStat(ballLastTouchedPlayer, "Goals", 1)
	end

	local speed = ball.AssemblyLinearVelocity.Magnitude
	postGoalMessage(scoringTeam, speed)
	kickoffReset()
end

local function clearConnections(connectionList)
	for _, connection in connectionList do
		connection:Disconnect()
	end
	table.clear(connectionList)
end

local function bindGoalEvents()
	clearConnections(goalConnections)

	local redSensor = getArenaPart("GoalSensor_Red")
	local blueSensor = getArenaPart("GoalSensor_Blue")

	if redSensor then
		table.insert(goalConnections, redSensor.Touched:Connect(function(hit)
			onGoalTouched(redSensor, hit)
		end))
	end
	if blueSensor then
		table.insert(goalConnections, blueSensor.Touched:Connect(function(hit)
			onGoalTouched(blueSensor, hit)
		end))
	end
end

local function onBumperTouched(bumper, hit)
	if currentState ~= "Playing" then
		return
	end

	local character = hit.Parent
	if not character then
		return
	end
	local player = Players:GetPlayerFromCharacter(character)
	if not player then
		return
	end

	local key = tostring(player.UserId) .. ":" .. bumper.Name
	local now = tick()
	local last = bumperTouchAt[key] or 0
	if now - last < 1 then
		return
	end
	bumperTouchAt[key] = now

	local _, hrp = getCharacterAndHumanoid(player)
	if not hrp then
		return
	end

	local away = hrp.Position - bumper.Position
	if away.Magnitude < 0.01 then
		away = Vector3.new(math.random() - 0.5, 0, math.random() - 0.5)
	end
	applyImpulseToCharacter(player, away, 100, 62)
	HitFeedback:FireClient(player, 0.33, 0.14)
	postFeed(string.format("%s got launched!", player.Name), Color3.fromRGB(255, 209, 80), 1.6)
end

local function bindBumperEvents()
	clearConnections(bumperConnections)
	for _, child in (getArena() and getArena():GetChildren() or {}) do
		if child:IsA("BasePart") and string.match(child.Name, "^Bumper_") then
			table.insert(bumperConnections, child.Touched:Connect(function(hit)
				onBumperTouched(child, hit)
			end))
		end
	end
end

local function resetMatchState()
	scores.Red = 0
	scores.Blue = 0
	goalLockUntil = 0
	kickoffInProgress = false
	table.clear(bumperTouchAt)
	pushScore()
	setBallOwner(nil, nil)
end

local function announceWinner()
	if scores.Red > scores.Blue then
		return "Red Wins"
	elseif scores.Blue > scores.Red then
		return "Blue Wins"
	end
	return "Draw"
end

local function playerCount()
	return #Players:GetPlayers()
end

local function resolveDirection(fromPos: Vector3, toPos: Vector3, fallback: Vector3)
	local offset = toPos - fromPos
	local mag = offset.Magnitude
	if mag > 0.001 then
		return offset / mag
	end
	return fallback
end

local function handleSwing(player)
	if currentState ~= "Playing" then
		return
	end
	if kickoffInProgress then
		return
	end
	if not isCooldownReady("Swing", player.UserId, MatchConfig.SWING_COOLDOWN) then
		return
	end

	ActionCooldown:FireClient(player, "Swing", MatchConfig.SWING_COOLDOWN)

	local _, hrp = getCharacterAndHumanoid(player)
	if not hrp then
		return
	end

	local teamName = playerTeams[player]
	if not teamName then
		return
	end

	local facing = hrp.CFrame.LookVector
	hrp:ApplyImpulse((facing * MatchConfig.SWING_LUNGE) * hrp.AssemblyMass)

	local origin = hrp.Position + facing * 1.8
	local hits = 0

	for _, other in Players:GetPlayers() do
		if other ~= player and playerTeams[other] ~= teamName then
			local _, otherRoot, otherHumanoid = getCharacterAndHumanoid(other)
			if otherRoot and otherHumanoid and otherHumanoid.Health > 0 then
				local direction = resolveDirection(origin, otherRoot.Position, facing)
				local distance = (otherRoot.Position - origin).Magnitude
				if distance <= MatchConfig.SWING_RANGE and direction:Dot(facing) >= MatchConfig.SWING_CONE_DOT then
					applyImpulseToCharacter(other, direction, MatchConfig.SWING_KNOCKBACK, MatchConfig.SWING_UP_FORCE)
					stunPlayer(other, MatchConfig.SWING_STUN)
					HitFeedback:FireClient(other, 0.45, 0.16)
					hits += 1
					incrementStat(player, "BigHits", 1)
				end
			end
		end
	end

	if ball and ball.Parent then
		local direction = resolveDirection(origin, ball.Position, facing)
		local distance = (ball.Position - origin).Magnitude
		if distance <= MatchConfig.BALL_HIT_RANGE and direction:Dot(facing) >= MatchConfig.BALL_HIT_DOT then
			local spread = Vector3.new(
				(math.random() - 0.5) * MatchConfig.BALL_SPREAD,
				0,
				(math.random() - 0.5) * MatchConfig.BALL_SPREAD
			)
			local shotDirection = (facing + spread * 0.03).Unit
			ball:ApplyImpulse((shotDirection * MatchConfig.BALL_HIT_FORCE + Vector3.new(0, MatchConfig.BALL_LIFT_FORCE, 0)) * ball.AssemblyMass)
			setBallOwner(teamName, player)
			if ball.AssemblyLinearVelocity.Magnitude > MatchConfig.MONSTER_SHOT_SPEED then
				postFeed(string.format("%s unleashed a rocket shot!", player.Name), teamColor(teamName), 2.2)
			end
		end
	end

	if hits >= 2 then
		postFeed(string.format("%s landed a MULTI HIT x%d", player.Name, hits), teamColor(teamName), 2.2)
	elseif hits == 1 then
		postFeed(string.format("%s cracked an opponent", player.Name), teamColor(teamName), 1.6)
	end
end

local function handleDash(player)
	if currentState ~= "Playing" then
		return
	end
	if kickoffInProgress then
		return
	end
	if not isCooldownReady("Dash", player.UserId, MatchConfig.DASH_COOLDOWN) then
		return
	end

	ActionCooldown:FireClient(player, "Dash", MatchConfig.DASH_COOLDOWN)

	local _, hrp = getCharacterAndHumanoid(player)
	if not hrp then
		return
	end

	local teamName = playerTeams[player]
	local facing = hrp.CFrame.LookVector
	hrp:ApplyImpulse((facing * MatchConfig.DASH_FORCE + Vector3.new(0, MatchConfig.DASH_UP_FORCE, 0)) * hrp.AssemblyMass)
	HitFeedback:FireClient(player, 0.2, 0.1)

	local tackled = 0
	for _, other in Players:GetPlayers() do
		if other ~= player and playerTeams[other] ~= teamName then
			local _, otherRoot = getCharacterAndHumanoid(other)
			if otherRoot then
				local direction = resolveDirection(hrp.Position, otherRoot.Position, facing)
				local distance = (otherRoot.Position - hrp.Position).Magnitude
				if distance <= MatchConfig.DASH_HIT_RANGE and direction:Dot(facing) > -0.2 then
					applyImpulseToCharacter(other, direction, MatchConfig.SWING_KNOCKBACK * 0.9, MatchConfig.SWING_UP_FORCE * 0.8)
					stunPlayer(other, MatchConfig.DASH_HIT_STUN)
					HitFeedback:FireClient(other, 0.36, 0.12)
					tackled += 1
				end
			end
		end
	end

	if tackled > 0 then
		postFeed(string.format("%s dash tackled x%d", player.Name, tackled), teamColor(teamName), 1.8)
	end
end

local function checkBallBounds()
	if not ball or not ball.Parent then
		return
	end

	local pos = ball.Position
	local arena = MatchConfig.Arena
	local outX = math.abs(pos.X) > (arena.width * 0.5 + MatchConfig.BALL_RESET_BOUNDS_PADDING)
	local outZ = math.abs(pos.Z) > (arena.length * 0.5 + MatchConfig.BALL_RESET_BOUNDS_PADDING)
	if outX or outZ or pos.Y < MatchConfig.BALL_RESET_HEIGHT then
		resetBall("Ball Reset")
	end
end

local function runLobby()
	lockAllPlayers(false)

	while true do
		while playerCount() < MatchConfig.MIN_PLAYERS do
			setState("Lobby", { waitingFor = MatchConfig.MIN_PLAYERS })
			task.wait(1)
		end

		rebalanceTeams()
		for _, player in Players:GetPlayers() do
			teleportPlayerToTeamSpawn(player)
			applyTeamHighlight(player)
		end

		local aborted = false
		for remain = MatchConfig.LOBBY_WAIT, 0, -1 do
			if playerCount() < MatchConfig.MIN_PLAYERS then
				aborted = true
				break
			end
			setState("Lobby", { remaining = remain })
			task.wait(1)
		end

		if not aborted then
			return
		end
	end
end

local function runCountdown()
	setState("Countdown")
	lockAllPlayers(true)
	resetAllPlayersToSpawn()
	resetBall()

	for remain = MatchConfig.COUNTDOWN_SECONDS, 1, -1 do
		MatchCountdown:FireAllClients(remain)
		task.wait(1)
	end

	MatchCountdown:FireAllClients(0)
end

local function runPlaying()
	kickoffInProgress = false
	lockAllPlayers(false)
	pulseSessionId += 1
	local thisPulseSession = pulseSessionId

	task.spawn(function()
		while currentState == "Playing" and thisPulseSession == pulseSessionId do
			local jitter = math.random(-MatchConfig.CHAOS_PULSE_JITTER, MatchConfig.CHAOS_PULSE_JITTER)
			task.wait(MatchConfig.CHAOS_PULSE_INTERVAL + jitter)
			if currentState ~= "Playing" or thisPulseSession ~= pulseSessionId then
				break
			end
			triggerChaosPulse()
		end
	end)

	for remain = MatchConfig.MATCH_DURATION, 0, -1 do
		setState("Playing", { remaining = remain, red = scores.Red, blue = scores.Blue })
		checkBallBounds()
		if scores.Red >= MatchConfig.MAX_SCORE or scores.Blue >= MatchConfig.MAX_SCORE then
			break
		end
		task.wait(1)
	end

	lockAllPlayers(true)
end

local function runResult()
	local winner = announceWinner()
	local payload = {
		winner = winner,
		red = scores.Red,
		blue = scores.Blue,
	}

	postFeed(winner, Color3.fromRGB(255, 255, 255), 2.8)
	setState("Result", payload)

	for remain = MatchConfig.RESULT_DURATION, 0, -1 do
		payload.remaining = remain
		setState("Result", payload)
		task.wait(1)
	end
end

SwingRequest.OnServerEvent:Connect(function(player)
	handleSwing(player)
end)

DashRequest.OnServerEvent:Connect(function(player)
	handleDash(player)
end)

Players.PlayerAdded:Connect(function(player)
	setupLeaderstats(player)
	assignTeam(player)
	player:SetAttribute("TeamName", playerTeams[player])
	controlLockByPlayer[player] = (currentState == "Countdown" or currentState == "Result")

	player.CharacterAdded:Connect(function()
		task.wait(0.1)
		applyTeamHighlight(player)
		teleportPlayerToTeamSpawn(player)
		applyMovementState(player)
	end)

	MatchStateChanged:FireClient(player, currentState, { red = scores.Red, blue = scores.Blue })
	ScoreChanged:FireClient(player, scores.Red, scores.Blue)
	if ballLastTouchedTeam then
		BallOwnerChanged:FireClient(player, ballLastTouchedTeam, ballLastTouchedPlayer and ballLastTouchedPlayer.Name or "")
	else
		BallOwnerChanged:FireClient(player, nil, nil)
	end
end)

Players.PlayerRemoving:Connect(function(player)
	playerTeams[player] = nil
	stunUntilByPlayer[player] = nil
	controlLockByPlayer[player] = nil
	actionCooldowns.Swing[player.UserId] = nil
	actionCooldowns.Dash[player.UserId] = nil
	if ballLastTouchedPlayer == player then
		setBallOwner(nil, nil)
	end
end)

for _, player in Players:GetPlayers() do
	setupLeaderstats(player)
	if not playerTeams[player] then
		assignTeam(player)
	end
	if player.Character then
		applyTeamHighlight(player)
		applyMovementState(player)
	end
end

ArenaBuilder.ensureArena(MatchConfig)
bindGoalEvents()
bindBumperEvents()
resetMatchState()
resetBall()

while true do
	runLobby()
	resetMatchState()
	runCountdown()
	setState("Playing", { remaining = MatchConfig.MATCH_DURATION, red = scores.Red, blue = scores.Blue })
	runPlaying()
	runResult()
end
