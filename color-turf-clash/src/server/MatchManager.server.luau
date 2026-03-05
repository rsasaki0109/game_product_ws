local Debris = game:GetService("Debris")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local MatchConfig = require(ReplicatedStorage:WaitForChild("MatchConfig"))
local ArenaBuilder = require(script.Parent:WaitForChild("ArenaBuilder"))
local TurfManager = require(script.Parent:WaitForChild("TurfManager"))

local function getOrCreateRemote(name, className)
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
local ScoreChanged = getOrCreateRemote("ScoreChanged", "RemoteEvent")
local MatchCountdown = getOrCreateRemote("MatchCountdown", "RemoteEvent")
local FeedEvent = getOrCreateRemote("FeedEvent", "RemoteEvent")
local HitFeedback = getOrCreateRemote("HitFeedback", "RemoteEvent")
local PaintBurst = getOrCreateRemote("PaintBurst", "RemoteEvent")
local ActionCooldown = getOrCreateRemote("ActionCooldown", "RemoteEvent")
local ShootRequest = getOrCreateRemote("ShootRequest", "RemoteEvent")
local DashRequest = getOrCreateRemote("DashRequest", "RemoteEvent")

local currentState = "Lobby"
local arena
local playerTeams = {}
local controlLock = {}
local inkHealth = {}
local cooldownUntil = {
	Shoot = {},
	Dash = {},
}
local pulseSessionId = 0

local function teamColor(teamName)
	if MatchConfig.Teams[teamName] then
		return MatchConfig.Teams[teamName].primary
	end
	return Color3.fromRGB(255, 255, 255)
end

local function postFeed(message, color, duration)
	FeedEvent:FireAllClients(message, color or Color3.fromRGB(255, 255, 255), duration or 2)
end

local function setState(stateName, payload)
	currentState = stateName
	MatchStateChanged:FireAllClients(stateName, payload)
end

local function getCharacterBits(player)
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
	local _, _, humanoid = getCharacterBits(player)
	if not humanoid then
		return
	end
	if controlLock[player] then
		humanoid.WalkSpeed = 0
		humanoid.JumpPower = 0
		humanoid.AutoRotate = false
	else
		humanoid.WalkSpeed = MatchConfig.DEFAULT_WALK_SPEED
		humanoid.JumpPower = MatchConfig.DEFAULT_JUMP_POWER
		humanoid.AutoRotate = true
	end
end

local function lockAllPlayers(locked)
	for _, player in ipairs(Players:GetPlayers()) do
		controlLock[player] = locked
		applyMovementState(player)
	end
end

local function assignBalancedTeam(player)
	local red = 0
	local blue = 0
	for _, teamName in pairs(playerTeams) do
		if teamName == "Red" then
			red += 1
		elseif teamName == "Blue" then
			blue += 1
		end
	end
	if red <= blue then
		playerTeams[player] = "Red"
	else
		playerTeams[player] = "Blue"
	end
	player:SetAttribute("TeamName", playerTeams[player])
end

local function rebalanceTeams()
	local players = Players:GetPlayers()
	for _, player in ipairs(players) do
		playerTeams[player] = nil
	end

	for i = #players, 2, -1 do
		local j = math.random(1, i)
		players[i], players[j] = players[j], players[i]
	end

	local nextTeam = 1
	for _, player in ipairs(players) do
		playerTeams[player] = nextTeam == 1 and "Red" or "Blue"
		player:SetAttribute("TeamName", playerTeams[player])
		nextTeam = 3 - nextTeam
	end
end

local function addTeamHighlight(player)
	local character = player.Character
	if not character then
		return
	end

	local highlight = character:FindFirstChild("TeamGlow")
	if not highlight then
		highlight = Instance.new("Highlight")
		highlight.Name = "TeamGlow"
		highlight.DepthMode = Enum.HighlightDepthMode.Occluded
		highlight.Parent = character
	end

	local teamName = playerTeams[player]
	highlight.FillColor = teamColor(teamName)
	highlight.FillTransparency = 0.72
	highlight.OutlineTransparency = 0.1
	highlight.OutlineColor = Color3.fromRGB(255, 255, 255)
end

local function getSpawn(teamName)
	if not arena then
		return nil
	end
	local team = MatchConfig.Teams[teamName]
	if not team then
		return nil
	end
	local spawn = arena:FindFirstChild(team.spawnName)
	if spawn and spawn:IsA("BasePart") then
		return spawn
	end
	return nil
end

local function teleportToTeamSpawn(player)
	local _, hrp = getCharacterBits(player)
	if not hrp then
		return
	end
	local teamName = playerTeams[player]
	local spawn = getSpawn(teamName)
	if not spawn then
		return
	end
	hrp.CFrame = spawn.CFrame + Vector3.new(0, 4, 0)
	hrp.AssemblyLinearVelocity = Vector3.zero
	hrp.AssemblyAngularVelocity = Vector3.zero
end

local function resetAllPlayersToSpawns()
	for _, player in ipairs(Players:GetPlayers()) do
		teleportToTeamSpawn(player)
	end
end

local function updateScoreboard()
	local coverage = TurfManager.getCoverage()
	ScoreChanged:FireAllClients(coverage.Red, coverage.Blue, coverage.Neutral, coverage.RedTiles, coverage.BlueTiles, coverage.Total)
end

local function setupLeaderstats(player)
	local leaderstats = player:FindFirstChild("leaderstats")
	if not leaderstats then
		leaderstats = Instance.new("Folder")
		leaderstats.Name = "leaderstats"
		leaderstats.Parent = player
	end

	if not leaderstats:FindFirstChild("Splats") then
		local value = Instance.new("IntValue")
		value.Name = "Splats"
		value.Parent = leaderstats
	end
	if not leaderstats:FindFirstChild("Paint") then
		local value = Instance.new("IntValue")
		value.Name = "Paint"
		value.Parent = leaderstats
	end
end

local function incrementStat(player, statName, delta)
	local leaderstats = player:FindFirstChild("leaderstats")
	if not leaderstats then
		return
	end
	local stat = leaderstats:FindFirstChild(statName)
	if stat and stat:IsA("IntValue") then
		stat.Value += delta
	end
end

local function setInkHealth(player, value)
	inkHealth[player] = math.clamp(value, 0, MatchConfig.INK_HEALTH_MAX)
end

local function resetInkHealthAll()
	for _, player in ipairs(Players:GetPlayers()) do
		setInkHealth(player, MatchConfig.INK_HEALTH_MAX)
	end
end

local function cooldownReady(actionName, userId, cooldown)
	local now = tick()
	local bucket = cooldownUntil[actionName]
	local untilTime = bucket[userId] or 0
	if now < untilTime then
		return false
	end
	bucket[userId] = now + cooldown
	return true
end

local function makePaintFx(position, teamName)
	local blob = Instance.new("Part")
	blob.Name = "PaintBurstFX"
	blob.Shape = Enum.PartType.Ball
	blob.Size = Vector3.new(2.5, 2.5, 2.5)
	blob.Anchored = true
	blob.CanCollide = false
	blob.CanTouch = false
	blob.CanQuery = false
	blob.Material = Enum.Material.Neon
	blob.Color = teamColor(teamName)
	blob.CFrame = CFrame.new(position + Vector3.new(0, 0.7, 0))
	blob.Parent = workspace
	Debris:AddItem(blob, 0.35)
end

local function paintAtPoint(position, teamName, radius)
	local changed = TurfManager.paintAt(position, teamName, radius)
	if changed > 0 then
		updateScoreboard()
	end
	return changed
end

local function applyDamage(targetPlayer, amount, attacker)
	local hp = (inkHealth[targetPlayer] or MatchConfig.INK_HEALTH_MAX) - amount
	setInkHealth(targetPlayer, hp)
	HitFeedback:FireClient(targetPlayer, 0.35, 0.12)
	if hp > 0 then
		return
	end

	setInkHealth(targetPlayer, MatchConfig.INK_HEALTH_MAX)
	incrementStat(attacker, "Splats", 1)
	postFeed(string.format("%s splatted %s", attacker.Name, targetPlayer.Name), teamColor(playerTeams[attacker]), 2.2)

	controlLock[targetPlayer] = true
	applyMovementState(targetPlayer)
	teleportToTeamSpawn(targetPlayer)

	task.delay(MatchConfig.RESPAWN_LOCK, function()
		if not targetPlayer.Parent then
			return
		end
		controlLock[targetPlayer] = currentState ~= "Playing"
		applyMovementState(targetPlayer)
	end)
end

local function getPlayerFromPart(part)
	if not part then
		return nil
	end
	local model = part:FindFirstAncestorOfClass("Model")
	if not model then
		return nil
	end
	return Players:GetPlayerFromCharacter(model)
end

local function handleShoot(player)
	if currentState ~= "Playing" or controlLock[player] then
		return
	end
	if not cooldownReady("Shoot", player.UserId, MatchConfig.SHOOT_COOLDOWN) then
		return
	end

	ActionCooldown:FireClient(player, "Shoot", MatchConfig.SHOOT_COOLDOWN)

	local _, hrp = getCharacterBits(player)
	if not hrp then
		return
	end
	local teamName = playerTeams[player]
	if not teamName then
		return
	end

	local origin = hrp.Position + Vector3.new(0, 2.3, 0)
	local direction = hrp.CFrame.LookVector * MatchConfig.SHOOT_RANGE

	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = { player.Character }
	params.IgnoreWater = true

	local result = workspace:Raycast(origin, direction, params)
	local hitPosition = origin + direction
	if result then
		hitPosition = result.Position
	end

	local changed = 0
	changed += paintAtPoint(hitPosition, teamName, MatchConfig.SHOOT_PAINT_RADIUS)
	changed += paintAtPoint(origin + direction * 0.35, teamName, MatchConfig.SHOOT_PAINT_RADIUS * 0.65)
	changed += paintAtPoint(origin + direction * 0.7, teamName, MatchConfig.SHOOT_PAINT_RADIUS * 0.55)

	if changed > 0 then
		incrementStat(player, "Paint", changed)
	end

	if result then
		local targetPlayer = getPlayerFromPart(result.Instance)
		if targetPlayer and targetPlayer ~= player and playerTeams[targetPlayer] ~= teamName then
			applyDamage(targetPlayer, MatchConfig.SHOOT_DAMAGE, player)
		end
	end

	makePaintFx(hitPosition, teamName)
	PaintBurst:FireAllClients(hitPosition, teamName)
end

local function applyImpulse(player, vector)
	local _, hrp = getCharacterBits(player)
	if not hrp then
		return
	end
	hrp:ApplyImpulse(vector * hrp.AssemblyMass)
end

local function handleDash(player)
	if currentState ~= "Playing" or controlLock[player] then
		return
	end
	if not cooldownReady("Dash", player.UserId, MatchConfig.DASH_COOLDOWN) then
		return
	end

	ActionCooldown:FireClient(player, "Dash", MatchConfig.DASH_COOLDOWN)

	local _, hrp = getCharacterBits(player)
	if not hrp then
		return
	end
	local teamName = playerTeams[player]
	if not teamName then
		return
	end

	local launch = hrp.CFrame.LookVector * MatchConfig.DASH_FORCE + Vector3.new(0, MatchConfig.DASH_UP_FORCE, 0)
	applyImpulse(player, launch)
	HitFeedback:FireClient(player, 0.2, 0.08)

	local changed = paintAtPoint(hrp.Position, teamName, MatchConfig.DASH_PAINT_RADIUS)
	if changed > 0 then
		incrementStat(player, "Paint", changed)
	end

	local hits = 0
	for _, target in ipairs(Players:GetPlayers()) do
		if target ~= player and playerTeams[target] ~= teamName then
			local _, targetRoot = getCharacterBits(target)
			if targetRoot then
				local distance = (targetRoot.Position - hrp.Position).Magnitude
				if distance <= MatchConfig.DASH_RANGE then
					applyDamage(target, MatchConfig.DASH_DAMAGE, player)
					local away = (targetRoot.Position - hrp.Position)
					if away.Magnitude > 0.01 then
						applyImpulse(target, away.Unit * 84 + Vector3.new(0, 22, 0))
					end
					hits += 1
				end
			end
		end
	end

	if hits > 1 then
		postFeed(string.format("%s dashed through %d opponents", player.Name, hits), teamColor(teamName), 1.8)
	end
end

local function runColorSurgeThread(sessionId)
	task.spawn(function()
		while currentState == "Playing" and pulseSessionId == sessionId do
			local jitter = math.random(-MatchConfig.COLOR_SURGE_JITTER, MatchConfig.COLOR_SURGE_JITTER)
			task.wait(MatchConfig.COLOR_SURGE_INTERVAL + jitter)
			if currentState ~= "Playing" or pulseSessionId ~= sessionId then
				break
			end
			local targetTeam = math.random(1, 2) == 1 and "Red" or "Blue"
			local x = (math.random() - 0.5) * (MatchConfig.Arena.width * 0.75)
			local z = (math.random() - 0.5) * (MatchConfig.Arena.length * 0.75)
			local center = Vector3.new(x, 1, z)
			local changed = paintAtPoint(center, targetTeam, MatchConfig.COLOR_SURGE_RADIUS)
			makePaintFx(center, targetTeam)
			PaintBurst:FireAllClients(center, targetTeam)
			if changed > 0 then
				postFeed("COLOR SURGE!", teamColor(targetTeam), 1.7)
			end
		end
	end)
end

local function computeWinner()
	local coverage = TurfManager.getCoverage()
	if coverage.Red > coverage.Blue then
		return "Red Wins", coverage
	elseif coverage.Blue > coverage.Red then
		return "Blue Wins", coverage
	end
	return "Draw", coverage
end

local function resetRoundBoard()
	TurfManager.resetToNeutral()
	updateScoreboard()
	resetInkHealthAll()
end

local function waitForPlayers()
	while #Players:GetPlayers() < MatchConfig.MIN_PLAYERS do
		setState("Lobby", { waitingFor = MatchConfig.MIN_PLAYERS })
		task.wait(1)
	end
end

local function runLobby()
	waitForPlayers()
	rebalanceTeams()
	for _, player in ipairs(Players:GetPlayers()) do
		addTeamHighlight(player)
		teleportToTeamSpawn(player)
	end

	for remain = MatchConfig.LOBBY_WAIT, 0, -1 do
		if #Players:GetPlayers() < MatchConfig.MIN_PLAYERS then
			return false
		end
		setState("Lobby", { remaining = remain })
		task.wait(1)
	end
	return true
end

local function runCountdown()
	setState("Countdown")
	lockAllPlayers(true)
	resetAllPlayersToSpawns()
	resetRoundBoard()

	for remain = MatchConfig.COUNTDOWN_SECONDS, 1, -1 do
		MatchCountdown:FireAllClients(remain)
		task.wait(1)
	end
	MatchCountdown:FireAllClients(0)
end

local function runPlaying()
	setState("Playing", { remaining = MatchConfig.MATCH_DURATION })
	lockAllPlayers(false)

	pulseSessionId += 1
	local thisSession = pulseSessionId
	runColorSurgeThread(thisSession)

	for remain = MatchConfig.MATCH_DURATION, 0, -1 do
		local coverage = TurfManager.getCoverage()
		setState("Playing", { remaining = remain, red = coverage.Red, blue = coverage.Blue })
		updateScoreboard()
		task.wait(1)
	end

	lockAllPlayers(true)
end

local function runResult()
	local winnerText, coverage = computeWinner()
	setState("Result", {
		winner = winnerText,
		red = coverage.Red,
		blue = coverage.Blue,
	})
	postFeed(winnerText, Color3.fromRGB(255, 255, 255), 2.6)

	for remain = MatchConfig.RESULT_DURATION, 0, -1 do
		setState("Result", {
			winner = winnerText,
			red = coverage.Red,
			blue = coverage.Blue,
			remaining = remain,
		})
		task.wait(1)
	end
end

ShootRequest.OnServerEvent:Connect(function(player)
	handleShoot(player)
end)

DashRequest.OnServerEvent:Connect(function(player)
	handleDash(player)
end)

Players.PlayerAdded:Connect(function(player)
	setupLeaderstats(player)
	assignBalancedTeam(player)
	setInkHealth(player, MatchConfig.INK_HEALTH_MAX)
	controlLock[player] = currentState ~= "Playing"

	player.CharacterAdded:Connect(function()
		task.wait(0.1)
		addTeamHighlight(player)
		teleportToTeamSpawn(player)
		applyMovementState(player)
	end)

	local coverage = TurfManager.getCoverage()
	MatchStateChanged:FireClient(player, currentState, { red = coverage.Red, blue = coverage.Blue })
	ScoreChanged:FireClient(player, coverage.Red, coverage.Blue, coverage.Neutral, coverage.RedTiles, coverage.BlueTiles, coverage.Total)
end)

Players.PlayerRemoving:Connect(function(player)
	playerTeams[player] = nil
	controlLock[player] = nil
	inkHealth[player] = nil
	cooldownUntil.Shoot[player.UserId] = nil
	cooldownUntil.Dash[player.UserId] = nil
end)

arena = ArenaBuilder.ensureArena(MatchConfig)
TurfManager.initialize(arena, MatchConfig)
updateScoreboard()

for _, player in ipairs(Players:GetPlayers()) do
	setupLeaderstats(player)
	if not playerTeams[player] then
		assignBalancedTeam(player)
	end
	setInkHealth(player, MatchConfig.INK_HEALTH_MAX)
	controlLock[player] = true
	if player.Character then
		addTeamHighlight(player)
		applyMovementState(player)
	end
end

while true do
	if runLobby() then
		runCountdown()
		runPlaying()
		runResult()
	else
		task.wait(1)
	end
end
