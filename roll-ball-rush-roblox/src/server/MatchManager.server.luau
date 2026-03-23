local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")

local GameConfig = require(ReplicatedStorage.Shared:WaitForChild("GameConfig"))
local ArenaBuilder = require(script.Parent:WaitForChild("ArenaBuilder"))

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

local function getOrCreateChild(parent, name, className)
	local existing = parent:FindFirstChild(name)
	if existing then
		return existing
	end
	local child = Instance.new(className)
	child.Name = name
	child.Parent = parent
	return child
end

local BallCommandRequest = getOrCreateRemote("BallCommandRequest", "RemoteEvent")

local currentState = "Lobby"
local controlLock = {}
local checkpointIndex = {}
local finishRank = {}
local finishOrder = {}
local playerStates = {}
local triggerConnections = {}
local heartbeatConnection
local studioDebugEnabled = RunService:IsStudio()
local debugPrefix = "[RollBallDebug]"
local debugFolder = studioDebugEnabled and getOrCreateChild(ReplicatedStorage, "RollBallDebug", "Folder") or nil
local debugCommand = debugFolder and getOrCreateChild(debugFolder, "Command", "BindableFunction") or nil
local debugSnapshotValue = debugFolder and getOrCreateChild(debugFolder, "SnapshotJson", "StringValue") or nil
local debugLastEventValue = debugFolder and getOrCreateChild(debugFolder, "LastEventJson", "StringValue") or nil
local debugSmokeTestValue = debugFolder and getOrCreateChild(debugFolder, "SmokeTestJson", "StringValue") or nil
local smokeTestStarted = false
local publishDebugSnapshot
local pushDebugEvent

local stateFolder = ReplicatedStorage:FindFirstChild("RollBallRushState") or Instance.new("Folder")
stateFolder.Name = "RollBallRushState"
stateFolder.Parent = ReplicatedStorage

local function getOrCreateValue(parent, name, className)
	local existing = parent:FindFirstChild(name)
	if existing then
		return existing
	end
	local value = Instance.new(className)
	value.Name = name
	value.Parent = parent
	return value
end

local titleValue = getOrCreateValue(stateFolder, "Title", "StringValue")
local hookValue = getOrCreateValue(stateFolder, "Hook", "StringValue")
local stateValue = getOrCreateValue(stateFolder, "State", "StringValue")
local timerValue = getOrCreateValue(stateFolder, "Timer", "IntValue")
local controlsValue = getOrCreateValue(stateFolder, "Controls", "StringValue")
local summaryValue = getOrCreateValue(stateFolder, "Summary", "StringValue")

titleValue.Value = GameConfig.TITLE
hookValue.Value = GameConfig.HOOK
controlsValue.Value = table.concat(GameConfig.CONTROLS, "  |  ")
summaryValue.Value = "Boost the straights and brake the turns."

local function round3(value)
	return math.round(value * 1000) / 1000
end

local function vectorToTable(value)
	if not value then
		return nil
	end
	return {
		x = round3(value.X),
		y = round3(value.Y),
		z = round3(value.Z),
	}
end

local function tableToVector(value, fallback)
	if typeof(value) ~= "table" then
		return fallback
	end
	return Vector3.new(
		tonumber(value.x) or fallback.X,
		tonumber(value.y) or fallback.Y,
		tonumber(value.z) or fallback.Z
	)
end

local function encodeDebugJson(payload)
	local ok, encoded = pcall(HttpService.JSONEncode, HttpService, payload)
	if ok then
		return encoded
	end
	return "{\"ok\":false,\"error\":\"json_encode_failed\"}"
end

local function findPlayer(query)
	if typeof(query) == "Instance" and query:IsA("Player") then
		return query
	end

	local players = Players:GetPlayers()
	if query == nil or query == "" then
		return players[1]
	end

	local needle = string.lower(tostring(query))
	for _, player in ipairs(players) do
		if string.lower(player.Name) == needle then
			return player
		end
	end
	for _, player in ipairs(players) do
		if string.find(string.lower(player.Name), needle, 1, true) then
			return player
		end
	end
	return nil
end

local function getCharacterBits(player)
	local character = player.Character
	if not character then
		return nil, nil, nil
	end
	local root = character:FindFirstChild("HumanoidRootPart")
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	if not root or not humanoid then
		return nil, nil, nil
	end
	return character, root, humanoid
end

local function getArena()
	return workspace:FindFirstChild("RollBallRushArena")
end

local function getArenaPart(name)
	local arena = getArena()
	if not arena then
		return nil
	end
	local part = arena:FindFirstChild(name)
	if part and part:IsA("BasePart") then
		return part
	end
	return nil
end

local function checkpointPartName(index)
	return string.format("Checkpoint_%d", index)
end

local function getCheckpointPart(index)
	return getArenaPart(checkpointPartName(index))
end

local function setState(stateName, timer, summary)
	currentState = stateName
	stateValue.Value = stateName
	timerValue.Value = timer or 0
	if summary then
		summaryValue.Value = summary
	end
	if publishDebugSnapshot then
		publishDebugSnapshot("state_changed", {
			state = stateName,
			timer = timer or 0,
			summary = summary,
		})
	end
	if pushDebugEvent then
		pushDebugEvent("state_changed", {
			state = stateName,
			timer = timer or 0,
			summary = summary,
		})
	end
end

-- BALL POWER-UPS
local PowerUpEvent = getOrCreateRemote("PowerUpEvent", "RemoteEvent")
local POWERUP_TYPES = { "MAGNET", "SPIKE", "SHRINK", "BOUNCE" }
local POWERUP_DURATION = 8
local MAGNET_RANGE = 25
local MAGNET_FORCE = 12
local SPIKE_KNOCKBACK = 40
local SPIKE_RANGE = 8
local powerUpParts = {} -- list of power-up part instances
local powerUpConnections = {}

local function getPlayerState(player)
	local state = playerStates[player]
	if state then
		return state
	end
	state = {
		boostUntil = 0,
		boostCooldownUntil = 0,
		brakeUntil = 0,
		brakeCooldownUntil = 0,
		shell = nil,
		shellRotation = CFrame.identity,
		powerUp = nil, -- current power-up name or nil
		powerUpUntil = 0,
	}
	playerStates[player] = state
	return state
end

local function clearPowerUp(player)
	local state = playerStates[player]
	if state then
		state.powerUp = nil
		state.powerUpUntil = 0
		player:SetAttribute("PowerUp", "")
		player:SetAttribute("PowerUpRemaining", 0)
		PowerUpEvent:FireClient(player, "", 0)
	end
end

local function grantPowerUp(player, powerUpName)
	local state = getPlayerState(player)
	state.powerUp = powerUpName
	state.powerUpUntil = tick() + POWERUP_DURATION
	player:SetAttribute("PowerUp", powerUpName)
	player:SetAttribute("PowerUpRemaining", POWERUP_DURATION)
	PowerUpEvent:FireClient(player, powerUpName, POWERUP_DURATION)

	-- Visual change for SHRINK
	if powerUpName == "SHRINK" then
		local _, _, humanoid = getCharacterBits(player)
		if humanoid then
			humanoid.WalkSpeed = (GameConfig.DEFAULT_WALK_SPEED or 16) * 1.4
		end
	end
end

local function spawnPowerUpParts()
	-- Clean old
	for _, conn in ipairs(powerUpConnections) do
		conn:Disconnect()
	end
	powerUpConnections = {}
	for _, part in ipairs(powerUpParts) do
		if part and part.Parent then
			part:Destroy()
		end
	end
	powerUpParts = {}

	local arena = getArena()
	if not arena then return end

	-- Place power-ups along the course at checkpoint-ish positions
	local positions = {}
	for i = 1, 4 do
		local cp = arena:FindFirstChild(string.format("Checkpoint_%d", i))
		if cp then
			table.insert(positions, cp.Position + Vector3.new(math.random(-8, 8), 3, math.random(-5, 5)))
		end
	end
	-- Add a mid-course position
	local startPart = arena:FindFirstChild("StartPlatform")
	if startPart then
		table.insert(positions, startPart.Position + Vector3.new(0, 3, -30))
	end

	for idx, pos in ipairs(positions) do
		local part = Instance.new("Part")
		part.Name = string.format("PowerUp_%d", idx)
		part.Shape = Enum.PartType.Ball
		part.Size = Vector3.new(3, 3, 3)
		part.Anchored = true
		part.CanCollide = false
		part.CanTouch = true
		part.Material = Enum.Material.Neon
		part.Color = Color3.fromRGB(255, 200, 50)
		part.Transparency = 0.2
		part.Position = pos
		part.Parent = arena

		local billboard = Instance.new("BillboardGui")
		billboard.Size = UDim2.fromOffset(60, 20)
		billboard.StudsOffset = Vector3.new(0, 3, 0)
		billboard.AlwaysOnTop = true
		billboard.Parent = part
		local label = Instance.new("TextLabel")
		label.Size = UDim2.fromScale(1, 1)
		label.BackgroundTransparency = 1
		label.Font = Enum.Font.GothamBlack
		label.TextScaled = true
		label.TextColor3 = Color3.fromRGB(255, 255, 100)
		label.TextStrokeTransparency = 0.3
		label.Text = "?"
		label.Parent = billboard

		table.insert(powerUpParts, part)

		local conn = part.Touched:Connect(function(hit)
			if part.Transparency >= 0.9 then return end
			local character = hit.Parent
			if not character then return end
			local humanoid = character:FindFirstChildWhichIsA("Humanoid")
			if not humanoid then return end
			local touchPlayer = Players:GetPlayerFromCharacter(character)
			if not touchPlayer then return end
			local ps = playerStates[touchPlayer]
			if not ps or ps.powerUp then return end -- already has one

			-- Grant random power-up
			local chosen = POWERUP_TYPES[math.random(1, #POWERUP_TYPES)]
			grantPowerUp(touchPlayer, chosen)

			-- Hide pickup, respawn later
			part.Transparency = 1
			part.CanTouch = false
			task.delay(12, function()
				if part.Parent then
					part.Transparency = 0.2
					part.CanTouch = true
				end
			end)
		end)
		table.insert(powerUpConnections, conn)
	end
end

local function tickPowerUps(dt)
	local now = tick()
	for _, player in ipairs(Players:GetPlayers()) do
		local state = playerStates[player]
		if state and state.powerUp then
			if now >= state.powerUpUntil then
				-- Power-up expired
				if state.powerUp == "SHRINK" then
					local _, _, humanoid = getCharacterBits(player)
					if humanoid then
						humanoid.WalkSpeed = GameConfig.DEFAULT_WALK_SPEED or 16
					end
				end
				clearPowerUp(player)
			else
				local remaining = state.powerUpUntil - now
				player:SetAttribute("PowerUpRemaining", math.ceil(remaining))

				-- MAGNET effect: pull nearby players toward this player
				if state.powerUp == "MAGNET" then
					local _, root = getCharacterBits(player)
					if root then
						for _, other in ipairs(Players:GetPlayers()) do
							if other ~= player then
								local _, otherRoot = getCharacterBits(other)
								if otherRoot then
									local diff = root.Position - otherRoot.Position
									local dist = diff.Magnitude
									if dist < MAGNET_RANGE and dist > 1 then
										local pullForce = diff.Unit * MAGNET_FORCE * dt * (1 - dist / MAGNET_RANGE)
										otherRoot:ApplyImpulse(pullForce * otherRoot.AssemblyMass)
									end
								end
							end
						end
					end
				end

				-- SPIKE effect: knockback players who get close
				if state.powerUp == "SPIKE" then
					local _, root = getCharacterBits(player)
					if root then
						for _, other in ipairs(Players:GetPlayers()) do
							if other ~= player then
								local _, otherRoot = getCharacterBits(other)
								if otherRoot then
									local diff = otherRoot.Position - root.Position
									local dist = diff.Magnitude
									if dist < SPIKE_RANGE and dist > 0.5 then
										local knockDir = diff.Unit + Vector3.new(0, 0.5, 0)
										otherRoot:ApplyImpulse(knockDir * SPIKE_KNOCKBACK * otherRoot.AssemblyMass)
									end
								end
							end
						end
					end
				end

				-- BOUNCE effect: extra jump power
				if state.powerUp == "BOUNCE" then
					local _, _, humanoid = getCharacterBits(player)
					if humanoid then
						humanoid.JumpPower = (GameConfig.DEFAULT_JUMP_POWER or 50) * 1.8
					end
				end
			end
		end
	end
end

local function destroyShell(player)
	local state = playerStates[player]
	if not state then
		return
	end
	if state.shell then
		state.shell:Destroy()
		state.shell = nil
	end
	state.shellRotation = CFrame.identity
end

local function ensureShell(player)
	local state = getPlayerState(player)
	if state.shell and state.shell.Parent then
		return state
	end

	local shellFolder = workspace:FindFirstChild("RollBallShells")
	if not shellFolder then
		shellFolder = Instance.new("Folder")
		shellFolder.Name = "RollBallShells"
		shellFolder.Parent = workspace
	end

	local shell = Instance.new("Part")
	shell.Name = player.Name .. "_BallShell"
	shell.Shape = Enum.PartType.Ball
	shell.Anchored = true
	shell.CanCollide = false
	shell.CanTouch = false
	shell.CanQuery = false
	shell.Material = Enum.Material.ForceField
	shell.Color = GameConfig.THEME.shell
	shell.Transparency = 0.38
	shell.Size = Vector3.new(GameConfig.BALL.diameter, GameConfig.BALL.diameter, GameConfig.BALL.diameter)
	shell.Parent = shellFolder

	state.shell = shell
	state.shellRotation = CFrame.identity
	return state
end

local function computeRankings()
	local ranked = Players:GetPlayers()
	table.sort(ranked, function(a, b)
		local finishA = finishRank[a]
		local finishB = finishRank[b]
		if finishA and finishB then
			return finishA < finishB
		end
		if finishA ~= nil then
			return true
		end
		if finishB ~= nil then
			return false
		end

		local checkpointA = checkpointIndex[a] or 0
		local checkpointB = checkpointIndex[b] or 0
		if checkpointA ~= checkpointB then
			return checkpointA > checkpointB
		end

		local _, rootA = getCharacterBits(a)
		local _, rootB = getCharacterBits(b)
		local zA = rootA and -rootA.Position.Z or -math.huge
		local zB = rootB and -rootB.Position.Z or -math.huge
		if zA ~= zB then
			return zA > zB
		end

		return a.UserId < b.UserId
	end)
	return ranked
end

local function updatePlayerAttributes()
	local ranked = computeRankings()
	local rankMap = {}
	for rank, player in ipairs(ranked) do
		rankMap[player] = rank
	end

	local now = tick()
	for _, player in ipairs(Players:GetPlayers()) do
		local state = getPlayerState(player)
		player:SetAttribute("CheckpointIndex", checkpointIndex[player] or 0)
		player:SetAttribute("FinishRank", finishRank[player] or 0)
		player:SetAttribute("RaceRank", rankMap[player] or #ranked)
		player:SetAttribute("BoostReady", now >= (state.boostCooldownUntil or 0))
		player:SetAttribute("BrakeReady", now >= (state.brakeCooldownUntil or 0))
	end
end

local function currentWalkSpeed(player)
	local state = getPlayerState(player)
	local now = tick()
	if now < (state.boostUntil or 0) then
		return GameConfig.BALL.boostSpeed
	end
	if now < (state.brakeUntil or 0) then
		return GameConfig.BALL.brakeSpeed
	end
	return GameConfig.BALL.baseSpeed
end

local function applyMovementState(player)
	local _, _, humanoid = getCharacterBits(player)
	if not humanoid then
		return
	end

	humanoid.UseJumpPower = true
	humanoid.AutoRotate = true
	if controlLock[player] then
		humanoid.WalkSpeed = 0
		humanoid.JumpPower = 0
	else
		humanoid.WalkSpeed = currentWalkSpeed(player)
		humanoid.JumpPower = GameConfig.DEFAULT_JUMP_POWER
	end
end

local function lockAllPlayers(locked)
	for _, player in ipairs(Players:GetPlayers()) do
		controlLock[player] = locked
		applyMovementState(player)
	end
end

local function clearConnections()
	for _, connection in ipairs(triggerConnections) do
		connection:Disconnect()
	end
	table.clear(triggerConnections)
end

local function teleportPlayer(player, position, lookAtPosition)
	local _, root = getCharacterBits(player)
	if not root then
		return false, "missing_character"
	end

	local lookTarget = lookAtPosition or (position + Vector3.new(0, 0, -10))
	local flatLookTarget = Vector3.new(lookTarget.X, position.Y, lookTarget.Z)
	if (flatLookTarget - position).Magnitude < 0.01 then
		flatLookTarget = position + Vector3.new(0, 0, -10)
	end

	root.CFrame = CFrame.lookAt(position, flatLookTarget)
	root.AssemblyLinearVelocity = Vector3.zero
	root.AssemblyAngularVelocity = Vector3.zero
	return true, nil, position
end

local function teleportPlayerToArenaPart(player, partName, offset, lookAtPartName)
	local part = getArenaPart(partName)
	if not part then
		return false, "unknown_part"
	end
	local lookAtPart = lookAtPartName and getArenaPart(lookAtPartName) or nil
	return teleportPlayer(player, part.Position + offset, lookAtPart and lookAtPart.Position or nil)
end

local function teleportToCheckpoint(player)
	local checkpoint = getCheckpointPart(checkpointIndex[player] or 0)
	if not checkpoint then
		return
	end

	teleportPlayer(player, checkpoint.Position + Vector3.new(math.random(-2, 2), 2, math.random(-2, 2)), checkpoint.Position + Vector3.new(0, 0, -12))
end

local function resetRoundData()
	table.clear(finishOrder)
	for _, player in ipairs(Players:GetPlayers()) do
		checkpointIndex[player] = 0
		finishRank[player] = nil
		local state = getPlayerState(player)
		state.boostUntil = 0
		state.boostCooldownUntil = 0
		state.brakeUntil = 0
		state.brakeCooldownUntil = 0
		state.shellRotation = CFrame.identity
		player:SetAttribute("CheckpointIndex", 0)
		player:SetAttribute("FinishRank", 0)
		player:SetAttribute("BallSpeed", 0)
		teleportToCheckpoint(player)
		applyMovementState(player)
	end
	updatePlayerAttributes()
end

local function winnersText()
	if #finishOrder == 0 then
		local ranked = computeRankings()
		if ranked[1] then
			return string.format("Leader: %s", ranked[1].Name)
		end
		return "No finishers"
	end

	local top = {}
	for index = 1, math.min(3, #finishOrder) do
		table.insert(top, string.format("%d.%s", index, finishOrder[index].Name))
	end
	return table.concat(top, "  ")
end

local function setCheckpoint(player, index)
	if currentState ~= "Playing" then
		return false, "state_not_playing"
	end
	if finishRank[player] then
		return false, "already_finished"
	end
	if index <= (checkpointIndex[player] or 0) then
		return false, "checkpoint_not_advanced"
	end
	checkpointIndex[player] = index
	summaryValue.Value = string.format("%s reached Checkpoint %d", player.Name, index)
	updatePlayerAttributes()
	if pushDebugEvent then
		pushDebugEvent("checkpoint_reached", {
			player = player.Name,
			checkpoint = index,
		})
	end
	if publishDebugSnapshot then
		publishDebugSnapshot("checkpoint_reached", {
			player = player.Name,
			checkpoint = index,
		})
	end
	return true, nil
end

local function finishPlayer(player)
	if currentState ~= "Playing" then
		return false, "state_not_playing"
	end
	if finishRank[player] then
		return false, "already_finished"
	end
	if (checkpointIndex[player] or 0) < #GameConfig.COURSE.checkpoints then
		return false, "missing_checkpoints"
	end

	local rank = #finishOrder + 1
	finishRank[player] = rank
	player:SetAttribute("FinishRank", rank)
	table.insert(finishOrder, player)
	controlLock[player] = true
	applyMovementState(player)
	summaryValue.Value = string.format("%s finished #%d", player.Name, rank)
	updatePlayerAttributes()
	if pushDebugEvent then
		pushDebugEvent("player_finished", {
			player = player.Name,
			rank = rank,
		})
	end
	if publishDebugSnapshot then
		publishDebugSnapshot("player_finished", {
			player = player.Name,
			rank = rank,
		})
	end
	return true, nil, rank
end

local function bindTriggers()
	clearConnections()

	local arena = getArena()
	if not arena then
		return
	end

	for _, child in ipairs(arena:GetChildren()) do
		if child:IsA("BasePart") and string.match(child.Name, "^Checkpoint_") then
			table.insert(triggerConnections, child.Touched:Connect(function(hit)
				local player = Players:GetPlayerFromCharacter(hit.Parent)
				if player and currentState == "Playing" then
					setCheckpoint(player, child:GetAttribute("CheckpointIndex") or 0)
				end
			end))
		elseif child:IsA("BasePart") and child.Name == "GoalGate" then
			table.insert(triggerConnections, child.Touched:Connect(function(hit)
				local player = Players:GetPlayerFromCharacter(hit.Parent)
				if player then
					finishPlayer(player)
				end
			end))
		end
	end
end

local function commandPlayer(player, commandName, options)
	options = options or {}
	if currentState ~= "Playing" or controlLock[player] or finishRank[player] then
		return {
			ok = false,
			error = "player_locked_or_state_invalid",
		}
	end

	local state = getPlayerState(player)
	local now = tick()
	if commandName == "Boost" then
		if not options.skipCooldown and now < (state.boostCooldownUntil or 0) then
			return {
				ok = false,
				error = "boost_cooldown",
			}
		end
		state.boostUntil = now + GameConfig.BALL.boostDuration
		state.boostCooldownUntil = now + GameConfig.BALL.boostCooldown
		state.brakeUntil = 0
		summaryValue.Value = string.format("%s hit BOOST", player.Name)
	elseif commandName == "Brake" then
		if not options.skipCooldown and now < (state.brakeCooldownUntil or 0) then
			return {
				ok = false,
				error = "brake_cooldown",
			}
		end
		state.brakeUntil = now + GameConfig.BALL.brakeDuration
		state.brakeCooldownUntil = now + GameConfig.BALL.brakeCooldown
		state.boostUntil = 0
		summaryValue.Value = string.format("%s hit BRAKE", player.Name)
	else
		return {
			ok = false,
			error = "unknown_command",
		}
	end

	applyMovementState(player)
	updatePlayerAttributes()
	if pushDebugEvent then
		pushDebugEvent("command_applied", {
			player = player.Name,
			command = commandName,
		})
	end
	if publishDebugSnapshot then
		publishDebugSnapshot("command_applied", {
			player = player.Name,
			command = commandName,
		})
	end
	return {
		ok = true,
		player = player.Name,
		command = commandName,
	}
end

local function respawnFallenPlayers()
	local respawns = 0
	for _, player in ipairs(Players:GetPlayers()) do
		if not finishRank[player] then
			local _, root = getCharacterBits(player)
			if root and root.Position.Y < GameConfig.RESET_Y then
				teleportToCheckpoint(player)
				respawns += 1
				if pushDebugEvent then
					pushDebugEvent("player_respawned", {
						player = player.Name,
						checkpoint = checkpointIndex[player] or 0,
					})
				end
			end
		end
	end
	if respawns > 0 and publishDebugSnapshot then
		publishDebugSnapshot("player_respawned", {
			respawns = respawns,
		})
	end
	return respawns
end

-- Speed line effect: create brief parts that fly past the player during boost
local speedLineFolder = nil
local function spawnSpeedLines(root, count)
	if not speedLineFolder then
		speedLineFolder = Instance.new("Folder")
		speedLineFolder.Name = "SpeedLines"
		speedLineFolder.Parent = workspace
	end

	for i = 1, count do
		local offset = Vector3.new(
			(math.random() - 0.5) * 8,
			(math.random() - 0.5) * 4,
			math.random() * 6 + 4
		)
		local line = Instance.new("Part")
		line.Name = "SpeedLine"
		line.Size = Vector3.new(0.15, 0.15, 2.5)
		line.CFrame = CFrame.new(root.Position + root.CFrame:VectorToWorldSpace(offset))
		line.Color = Color3.fromRGB(255, 240, 200)
		line.Material = Enum.Material.Neon
		line.Transparency = 0.3
		line.Anchored = true
		line.CanCollide = false
		line.CanTouch = false
		line.CanQuery = false
		line.Parent = speedLineFolder
		-- Clean up after short delay
		task.delay(0.2, function()
			if line and line.Parent then
				line:Destroy()
			end
		end)
	end
end

local function updateShellVisual(player, dt)
	local state = ensureShell(player)
	local _, root = getCharacterBits(player)
	if not root or not state.shell then
		return
	end

	local velocity = root.AssemblyLinearVelocity
	local horizontalVelocity = Vector3.new(velocity.X, 0, velocity.Z)
	if horizontalVelocity.Magnitude > 0.05 then
		local rollAxis = Vector3.new(horizontalVelocity.Z, 0, -horizontalVelocity.X).Unit
		local rollAngle = horizontalVelocity.Magnitude * dt / GameConfig.BALL.rotationRadius
		state.shellRotation = CFrame.fromAxisAngle(rollAxis, rollAngle) * state.shellRotation
	end

	state.shell.CFrame = CFrame.new(root.Position + GameConfig.BALL.centerOffset) * state.shellRotation
	player:SetAttribute("BallSpeed", math.floor(horizontalVelocity.Magnitude + 0.5))

	-- Trail effect: change shell material/color when boosting or braking
	local now = tick()
	if now < (state.boostUntil or 0) then
		state.shell.Color = Color3.fromRGB(255, 214, 102)
		state.shell.Material = Enum.Material.Neon
		state.shell.Transparency = 0.2
		-- Speed lines during boost
		if math.random() < 0.4 then
			spawnSpeedLines(root, 2)
		end
	elseif now < (state.brakeUntil or 0) then
		state.shell.Color = Color3.fromRGB(93, 175, 255)
		state.shell.Material = Enum.Material.Neon
		state.shell.Transparency = 0.25
	else
		state.shell.Color = GameConfig.THEME.shell
		state.shell.Material = Enum.Material.ForceField
		state.shell.Transparency = 0.38
	end
end

local function buildDebugSnapshot(reason, extra)
	local playersPayload = {}
	local now = tick()
	local activeBoosts = 0
	local activeBrakes = 0
	local lockedPlayers = 0

	for _, player in ipairs(Players:GetPlayers()) do
		local state = getPlayerState(player)
		local _, root = getCharacterBits(player)
		local boostActive = now < (state.boostUntil or 0)
		local brakeActive = now < (state.brakeUntil or 0)
		if boostActive then
			activeBoosts += 1
		end
		if brakeActive then
			activeBrakes += 1
		end
		if controlLock[player] then
			lockedPlayers += 1
		end
		table.insert(playersPayload, {
			name = player.Name,
			userId = player.UserId,
			checkpoint = checkpointIndex[player] or 0,
			finishRank = finishRank[player] or 0,
			raceRank = player:GetAttribute("RaceRank") or 0,
			ballSpeed = player:GetAttribute("BallSpeed") or 0,
			boostActive = boostActive,
			brakeActive = brakeActive,
			boostReady = now >= (state.boostCooldownUntil or 0),
			brakeReady = now >= (state.brakeCooldownUntil or 0),
			locked = controlLock[player] or false,
			position = root and vectorToTable(root.Position) or nil,
			velocity = root and vectorToTable(root.AssemblyLinearVelocity) or nil,
		})
	end

	table.sort(playersPayload, function(a, b)
		return a.userId < b.userId
	end)

	return {
		ok = true,
		reason = reason,
		state = currentState,
		timer = timerValue.Value,
		summary = summaryValue.Value,
		arenaReady = getArena() ~= nil,
		playerCount = #playersPayload,
		activeBoosts = activeBoosts,
		activeBrakes = activeBrakes,
		lockedPlayers = lockedPlayers,
		finishCount = #finishOrder,
		players = playersPayload,
		extra = extra,
	}
end

publishDebugSnapshot = function(reason, extra)
	if not studioDebugEnabled or not debugSnapshotValue then
		return nil
	end
	local snapshot = buildDebugSnapshot(reason, extra)
	debugSnapshotValue.Value = encodeDebugJson(snapshot)
	return snapshot
end

pushDebugEvent = function(eventName, payload)
	if not studioDebugEnabled then
		return
	end
	local eventPayload = {
		event = eventName,
		state = currentState,
		payload = payload,
	}
	local encoded = encodeDebugJson(eventPayload)
	if debugLastEventValue then
		debugLastEventValue.Value = encoded
	end
	print(string.format("%s %s", debugPrefix, encoded))
end

local function heartbeatStep(dt)
	for _, player in ipairs(Players:GetPlayers()) do
		updateShellVisual(player, dt)
		applyMovementState(player)
	end
	tickPowerUps(dt)
	updatePlayerAttributes()
	respawnFallenPlayers()
end

local function getDebugPlayerState(snapshot, playerName)
	if not snapshot or typeof(snapshot) ~= "table" then
		return nil
	end
	for _, playerPayload in ipairs(snapshot.players or {}) do
		if playerPayload.name == playerName then
			return playerPayload
		end
	end
	return nil
end

local function runDebugCommand(commandName, payload)
	payload = typeof(payload) == "table" and payload or {}

	if not studioDebugEnabled then
		return {
			ok = false,
			error = "studio_only",
		}
	end

	if commandName == "snapshot" then
		return publishDebugSnapshot("command_snapshot", nil) or {
			ok = false,
			error = "snapshot_unavailable",
		}
	end

	local player = findPlayer(payload.player)

	if commandName == "teleport_part" then
		if not player then
			return {
				ok = false,
				error = "player_not_found",
			}
		end
		local partName = payload.partName or "StartPlatform"
		local offset = tableToVector(payload.offset, Vector3.new(0, 6, 0))
		local ok, reason, destination = teleportPlayerToArenaPart(player, partName, offset, payload.lookAtPartName)
		local snapshot = publishDebugSnapshot("command_teleport_part", {
			player = player.Name,
			partName = partName,
			reason = reason,
		})
		return {
			ok = ok,
			error = reason,
			player = player.Name,
			partName = partName,
			destination = destination and vectorToTable(destination) or nil,
			snapshot = snapshot,
		}
	elseif commandName == "force_command" then
		if not player then
			return {
				ok = false,
				error = "player_not_found",
			}
		end
		local result = commandPlayer(player, tostring(payload.commandName or ""), {
			skipCooldown = payload.skipCooldown ~= false,
		})
		result.snapshot = publishDebugSnapshot("command_force_command", {
			player = player.Name,
			command = tostring(payload.commandName or ""),
			error = result.error,
		})
		return result
	elseif commandName == "set_checkpoint" then
		if not player then
			return {
				ok = false,
				error = "player_not_found",
			}
		end
		local checkpointValue = math.clamp(math.floor(tonumber(payload.checkpointIndex) or 0), 0, #GameConfig.COURSE.checkpoints)
		checkpointIndex[player] = checkpointValue
		updatePlayerAttributes()
		local snapshot = publishDebugSnapshot("command_set_checkpoint", {
			player = player.Name,
			checkpoint = checkpointValue,
		})
		return {
			ok = true,
			player = player.Name,
			checkpoint = checkpointValue,
			snapshot = snapshot,
		}
	elseif commandName == "drop_player" then
		if not player then
			return {
				ok = false,
				error = "player_not_found",
			}
		end
		local _, root = getCharacterBits(player)
		if not root then
			return {
				ok = false,
				error = "missing_character",
			}
		end
		local targetY = tonumber(payload.y) or (GameConfig.RESET_Y - 20)
		local ok, reason, destination = teleportPlayer(
			player,
			Vector3.new(root.Position.X, targetY, root.Position.Z),
			root.Position + root.CFrame.LookVector * 10
		)
		local snapshot = publishDebugSnapshot("command_drop_player", {
			player = player.Name,
			reason = reason,
		})
		return {
			ok = ok,
			error = reason,
			player = player.Name,
			destination = destination and vectorToTable(destination) or nil,
			snapshot = snapshot,
		}
	elseif commandName == "respawn_check" then
		local respawns = respawnFallenPlayers()
		local snapshot = publishDebugSnapshot("command_respawn_check", {
			respawns = respawns,
		})
		return {
			ok = true,
			respawns = respawns,
			snapshot = snapshot,
		}
	elseif commandName == "claim_finish" then
		if not player then
			return {
				ok = false,
				error = "player_not_found",
			}
		end
		local ok, reason, rank = finishPlayer(player)
		local snapshot = publishDebugSnapshot("command_claim_finish", {
			player = player.Name,
			rank = rank,
			reason = reason,
		})
		return {
			ok = ok,
			error = reason,
			player = player.Name,
			rank = rank,
			snapshot = snapshot,
		}
	end

	return {
		ok = false,
		error = "unknown_command",
		command = tostring(commandName),
	}
end

local function runSmokeTest()
	if smokeTestStarted then
		return
	end
	smokeTestStarted = true

	task.spawn(function()
		local result = {
			ok = false,
			steps = {},
		}

		local function recordStep(name, ok, payload)
			table.insert(result.steps, {
				name = name,
				ok = ok,
				payload = payload,
			})
		end

		local player = findPlayer(nil)
		if not player then
			recordStep("resolve_player", false, {
				error = "player_not_found",
			})
		else
			recordStep("resolve_player", true, {
				player = player.Name,
			})
		end

		local readyDeadline = tick() + GameConfig.LOBBY_WAIT + GameConfig.COUNTDOWN_SECONDS + 10
		while currentState ~= "Playing" and tick() < readyDeadline do
			task.wait(0.1)
		end

		if currentState ~= "Playing" then
			recordStep("wait_for_playing", false, {
				state = currentState,
			})
		elseif player then
			recordStep("wait_for_playing", true, {
				state = currentState,
			})

			local characterDeadline = tick() + 8
			while not select(2, getCharacterBits(player)) and tick() < characterDeadline do
				task.wait(0.1)
			end
			local _, root = getCharacterBits(player)
			recordStep("wait_for_character", root ~= nil, {
				hasCharacter = root ~= nil,
			})

			if root then
				local teleported = runDebugCommand("teleport_part", {
					player = player,
					partName = "StartPlatform",
					offset = { x = 0, y = 5, z = 0 },
					lookAtPartName = "GoalPlatform",
				})
				recordStep("teleport_start", teleported.ok, teleported)

				local boost = runDebugCommand("force_command", {
					player = player,
					commandName = "Boost",
					skipCooldown = true,
				})
				recordStep("force_boost", boost.ok, boost)
				task.wait(0.1)
				local boostSnapshot = runDebugCommand("snapshot", {})
				local boostPlayer = getDebugPlayerState(boostSnapshot, player.Name)
				recordStep("verify_boost", boostSnapshot.ok and boostPlayer and boostPlayer.boostActive == true, {
					snapshot = boostSnapshot,
				})

				local brake = runDebugCommand("force_command", {
					player = player,
					commandName = "Brake",
					skipCooldown = true,
				})
				recordStep("force_brake", brake.ok, brake)
				task.wait(0.1)
				local brakeSnapshot = runDebugCommand("snapshot", {})
				local brakePlayer = getDebugPlayerState(brakeSnapshot, player.Name)
				recordStep("verify_brake", brakeSnapshot.ok and brakePlayer and brakePlayer.brakeActive == true, {
					snapshot = brakeSnapshot,
				})

				local checkpointSet = runDebugCommand("set_checkpoint", {
					player = player,
					checkpointIndex = 2,
				})
				recordStep("set_checkpoint", checkpointSet.ok, checkpointSet)

				local dropped = runDebugCommand("drop_player", {
					player = player,
					y = GameConfig.RESET_Y - 20,
				})
				recordStep("drop_player", dropped.ok, dropped)
				task.wait(0.35)

				local respawnCheck = runDebugCommand("respawn_check", {})
				local _, respawnRoot = getCharacterBits(player)
				local checkpointPart = getCheckpointPart(2)
				local expectedPosition = checkpointPart and (checkpointPart.Position + Vector3.new(0, 2, 0)) or nil
				local distance = (respawnRoot and expectedPosition) and (respawnRoot.Position - expectedPosition).Magnitude or math.huge
				recordStep("verify_respawn", respawnCheck.ok and distance < 6, {
					respawns = respawnCheck.respawns,
					distance = round3(distance),
					snapshot = runDebugCommand("snapshot", {}),
				})

				local finalCheckpoint = runDebugCommand("set_checkpoint", {
					player = player,
					checkpointIndex = #GameConfig.COURSE.checkpoints,
				})
				recordStep("set_final_checkpoint", finalCheckpoint.ok, finalCheckpoint)

				local finish = runDebugCommand("claim_finish", {
					player = player,
				})
				recordStep("claim_finish", finish.ok, finish)

				local finalSnapshot = runDebugCommand("snapshot", {})
				local finalPlayer = getDebugPlayerState(finalSnapshot, player.Name)
				recordStep("verify_finish_state", finalSnapshot.ok and finalPlayer and finalPlayer.finishRank == 1, {
					snapshot = finalSnapshot,
				})
			end
		end

		result.ok = true
		for _, step in ipairs(result.steps) do
			if not step.ok then
				result.ok = false
				break
			end
		end

		result.snapshot = publishDebugSnapshot("smoke_test_complete", nil)
		local encoded = encodeDebugJson(result)
		if debugSmokeTestValue then
			debugSmokeTestValue.Value = encoded
		end
		pushDebugEvent("smoke_test_complete", result)
	end)
end

if debugCommand then
	debugCommand.OnInvoke = function(commandName, payload)
		local response = runDebugCommand(commandName, payload)
		pushDebugEvent("command_invoked", {
			command = tostring(commandName),
			ok = response.ok,
			error = response.error,
		})
		return response
	end
end

BallCommandRequest.OnServerEvent:Connect(function(player, commandName)
	if typeof(commandName) == "string" then
		commandPlayer(player, commandName)
	end
end)

Players.PlayerAdded:Connect(function(player)
	checkpointIndex[player] = 0
	finishRank[player] = nil
	controlLock[player] = currentState ~= "Playing"
	player:SetAttribute("CheckpointIndex", 0)
	player:SetAttribute("FinishRank", 0)
	player:SetAttribute("RaceRank", 1)
	player:SetAttribute("BallSpeed", 0)
	player:SetAttribute("BoostReady", true)
	player:SetAttribute("BrakeReady", true)
	if pushDebugEvent then
		pushDebugEvent("player_added", {
			player = player.Name,
		})
	end

	player.CharacterAdded:Connect(function()
		task.wait(0.1)
		ensureShell(player)
		teleportToCheckpoint(player)
		applyMovementState(player)
	end)

	if studioDebugEnabled then
		runSmokeTest()
	end
end)

Players.PlayerRemoving:Connect(function(player)
	destroyShell(player)
	playerStates[player] = nil
	controlLock[player] = nil
	checkpointIndex[player] = nil
	finishRank[player] = nil
end)

ArenaBuilder.ensureArena(GameConfig)
bindTriggers()

if heartbeatConnection then
	heartbeatConnection:Disconnect()
end
heartbeatConnection = RunService.Heartbeat:Connect(heartbeatStep)

for _, player in ipairs(Players:GetPlayers()) do
	checkpointIndex[player] = checkpointIndex[player] or 0
	finishRank[player] = nil
	controlLock[player] = true
	player:SetAttribute("CheckpointIndex", checkpointIndex[player])
	player:SetAttribute("FinishRank", 0)
	player:SetAttribute("RaceRank", 1)
	player:SetAttribute("BallSpeed", 0)
	player:SetAttribute("BoostReady", true)
	player:SetAttribute("BrakeReady", true)
	if player.Character then
		ensureShell(player)
		teleportToCheckpoint(player)
		applyMovementState(player)
	end
end

publishDebugSnapshot("server_boot", nil)
if pushDebugEvent then
	pushDebugEvent("server_boot", {
		playerCount = #Players:GetPlayers(),
	})
end
if studioDebugEnabled and #Players:GetPlayers() > 0 then
	runSmokeTest()
end

while true do
	while #Players:GetPlayers() < GameConfig.MIN_PLAYERS do
		lockAllPlayers(true)
		setState("Lobby", GameConfig.MIN_PLAYERS, "Waiting for players.")
		task.wait(1)
	end

	resetRoundData()
	lockAllPlayers(true)
	for remain = GameConfig.LOBBY_WAIT, 0, -1 do
		setState("Lobby", remain, "Study the ramps and corners.")
		task.wait(1)
	end

	resetRoundData()
	lockAllPlayers(true)
	for remain = GameConfig.COUNTDOWN_SECONDS, 1, -1 do
		setState("Countdown", remain, "Boost late and hold the line.")
		task.wait(1)
	end

	lockAllPlayers(false)
	spawnPowerUpParts()
	for remain = GameConfig.MATCH_DURATION, 0, -1 do
		setState("Playing", remain, "Hit checkpoints and roll through the finish gate.")
		updatePlayerAttributes()
		if #finishOrder >= #Players:GetPlayers() and #finishOrder > 0 then
			break
		end
		task.wait(1)
	end

	lockAllPlayers(true)
	for remain = GameConfig.RESULT_DURATION, 0, -1 do
		setState("Result", remain, winnersText())
		updatePlayerAttributes()
		task.wait(1)
	end
end
