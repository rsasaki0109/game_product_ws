local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")

local MatchConfig = require(ReplicatedStorage:WaitForChild("MatchConfig"))
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

local MatchStateChanged = getOrCreateRemote("MatchStateChanged", "RemoteEvent")
local MatchCountdown = getOrCreateRemote("MatchCountdown", "RemoteEvent")
local ProgressChanged = getOrCreateRemote("ProgressChanged", "RemoteEvent")
local CommandCooldown = getOrCreateRemote("CommandCooldown", "RemoteEvent")
local CommandRequest = getOrCreateRemote("CommandRequest", "RemoteEvent")

local currentState = "Lobby"
local arena
local controlLock = {}
local playerCheckpoint = {}
local playerFinishedRank = {}
local finishOrder = {}
local cooldownUntil = {
	STEP = {},
	BRIDGE = {},
	UP = {},
}
local triggerConnections = {}
local playSessionId = 0
local studioDebugEnabled = RunService:IsStudio()
local debugPrefix = "[WordStepDebug]"
local debugFolder = studioDebugEnabled and getOrCreateChild(ReplicatedStorage, "WordStepDebug", "Folder") or nil
local debugCommand = debugFolder and getOrCreateChild(debugFolder, "Command", "BindableFunction") or nil
local debugSnapshotValue = debugFolder and getOrCreateChild(debugFolder, "SnapshotJson", "StringValue") or nil
local debugLastEventValue = debugFolder and getOrCreateChild(debugFolder, "LastEventJson", "StringValue") or nil
local debugSmokeTestValue = debugFolder and getOrCreateChild(debugFolder, "SmokeTestJson", "StringValue") or nil
local smokeTestStarted = false
local publishDebugSnapshot
local pushDebugEvent

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
	local x = tonumber(value.x) or fallback.X
	local y = tonumber(value.y) or fallback.Y
	local z = tonumber(value.z) or fallback.Z
	return Vector3.new(x, y, z)
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

local function setState(stateName, payload)
	currentState = stateName
	MatchStateChanged:FireAllClients(stateName, payload)
	if publishDebugSnapshot then
		publishDebugSnapshot("state_changed", payload)
	end
	if pushDebugEvent then
		pushDebugEvent("state_changed", {
			state = stateName,
			payload = payload,
		})
	end
end

local function getArenaPart(name)
	if not arena then
		return nil
	end
	local target = arena:FindFirstChild(name)
	if target and target:IsA("BasePart") then
		return target
	end
	return nil
end

local function checkpointName(index)
	if index <= 0 then
		return MatchConfig.COURSE.spawnName
	end
	return string.format("Checkpoint_%d", index)
end

local function getCheckpointPart(index)
	return getArenaPart(checkpointName(index))
end

local function checkpointDisplay(index)
	return math.clamp(index or 0, 0, MatchConfig.CHECKPOINT_COUNT)
end

local function setCheckpoint(player, index)
	local current = playerCheckpoint[player] or 0
	if index <= current then
		return
	end
	playerCheckpoint[player] = index
	player:SetAttribute("CheckpointIndex", index)
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
end

local function teleportToCheckpoint(player)
	local _, hrp = getCharacterBits(player)
	if not hrp then
		return
	end
	local checkpoint = getCheckpointPart(playerCheckpoint[player] or 0)
	if not checkpoint then
		return
	end
	hrp.CFrame = checkpoint.CFrame + MatchConfig.CHECKPOINT_RESPAWN_OFFSET
	hrp.AssemblyLinearVelocity = Vector3.zero
	hrp.AssemblyAngularVelocity = Vector3.zero
end

local function teleportPlayer(player, position, lookAtPosition)
	local _, hrp = getCharacterBits(player)
	if not hrp then
		return false, "missing_character"
	end
	local lookTarget = lookAtPosition or (position + Vector3.new(1, 0, 0))
	local flatLookTarget = Vector3.new(lookTarget.X, position.Y, lookTarget.Z)
	if (flatLookTarget - position).Magnitude < 0.01 then
		flatLookTarget = position + Vector3.new(1, 0, 0)
	end
	hrp.CFrame = CFrame.lookAt(position, flatLookTarget)
	hrp.AssemblyLinearVelocity = Vector3.zero
	hrp.AssemblyAngularVelocity = Vector3.zero
	return true, nil, position
end

local function teleportPlayerToArenaPart(player, partName, offset, lookAtPartName)
	local part = getArenaPart(partName)
	if not part then
		return false, "unknown_part"
	end
	local lookAtPart = lookAtPartName and getArenaPart(lookAtPartName) or nil
	local destination = part.Position + offset
	return teleportPlayer(player, destination, lookAtPart and lookAtPart.Position or nil)
end

local function resetPlayersToCheckpointZero()
	for _, player in ipairs(Players:GetPlayers()) do
		playerCheckpoint[player] = 0
		playerFinishedRank[player] = nil
		player:SetAttribute("CheckpointIndex", 0)
		player:SetAttribute("FinishRank", 0)
		teleportToCheckpoint(player)
	end
end

local function clearConnections()
	for _, connection in ipairs(triggerConnections) do
		connection:Disconnect()
	end
	table.clear(triggerConnections)
end

local function computeRankings()
	local ranked = Players:GetPlayers()
	table.sort(ranked, function(a, b)
		local finishA = playerFinishedRank[a]
		local finishB = playerFinishedRank[b]
		if finishA and finishB then
			return finishA < finishB
		end
		if finishA ~= nil then
			return true
		end
		if finishB ~= nil then
			return false
		end

		local checkpointA = playerCheckpoint[a] or 0
		local checkpointB = playerCheckpoint[b] or 0
		if checkpointA ~= checkpointB then
			return checkpointA > checkpointB
		end

		local _, rootA = getCharacterBits(a)
		local _, rootB = getCharacterBits(b)
		local posA = rootA and rootA.Position.X or -math.huge
		local posB = rootB and rootB.Position.X or -math.huge
		if posA ~= posB then
			return posA > posB
		end

		return a.UserId < b.UserId
	end)
	return ranked
end

local function collectWordBlocks()
	local blocks = {}
	for _, child in ipairs(workspace:GetChildren()) do
		if child:IsA("BasePart") and child.Name == "WordBlock" then
			table.insert(blocks, child)
		end
	end
	return blocks
end

local function clearWordBlocks()
	local blocks = collectWordBlocks()
	for _, block in ipairs(blocks) do
		block:Destroy()
	end
	return #blocks
end

local function buildDebugSnapshot(reason, extra)
	local playersPayload = {}
	local lockedPlayers = 0

	for _, player in ipairs(Players:GetPlayers()) do
		local _, root = getCharacterBits(player)
		if controlLock[player] then
			lockedPlayers += 1
		end
		table.insert(playersPayload, {
			name = player.Name,
			userId = player.UserId,
			checkpoint = checkpointDisplay(playerCheckpoint[player]),
			finishRank = playerFinishedRank[player] or 0,
			locked = controlLock[player] or false,
			position = root and vectorToTable(root.Position) or nil,
		})
	end

	table.sort(playersPayload, function(a, b)
		return a.userId < b.userId
	end)

	return {
		ok = true,
		reason = reason,
		state = currentState,
		arenaReady = arena ~= nil,
		playerCount = #playersPayload,
		lockedPlayers = lockedPlayers,
		wordBlockCount = #collectWordBlocks(),
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

local function updateAllProgress()
	local ranked = computeRankings()
	local rankMap = {}
	for rank, player in ipairs(ranked) do
		rankMap[player] = rank
	end

	for _, player in ipairs(Players:GetPlayers()) do
		ProgressChanged:FireClient(player, {
			rank = rankMap[player] or #ranked,
			checkpoint = checkpointDisplay(playerCheckpoint[player]),
			totalCheckpoints = MatchConfig.CHECKPOINT_COUNT,
			finishedCount = #finishOrder,
			finishRank = playerFinishedRank[player] or 0,
		})
	end
end

local function bindCourseTriggers()
	clearConnections()

	for checkpointIndex = 1, MatchConfig.CHECKPOINT_COUNT do
		local pad = getCheckpointPart(checkpointIndex)
		if pad then
			table.insert(triggerConnections, pad.Touched:Connect(function(hit)
				local model = hit.Parent
				if not model then
					return
				end
				local player = Players:GetPlayerFromCharacter(model)
				if not player or currentState ~= "Playing" then
					return
				end
				setCheckpoint(player, checkpointIndex)
				updateAllProgress()
			end))
		end
	end

	local finish = getArenaPart(MatchConfig.COURSE.finishName)
	if finish then
		table.insert(triggerConnections, finish.Touched:Connect(function(hit)
			local model = hit.Parent
			if not model then
				return
			end
			local player = Players:GetPlayerFromCharacter(model)
			if not player or currentState ~= "Playing" then
				return
			end
			if playerFinishedRank[player] then
				return
			end

			local rank = #finishOrder + 1
			playerFinishedRank[player] = rank
			player:SetAttribute("FinishRank", rank)
			table.insert(finishOrder, player)
			controlLock[player] = true
			applyMovementState(player)
			updateAllProgress()
		end))
	end
end

local function cooldownReady(commandName, player)
	local bucket = cooldownUntil[commandName]
	local now = tick()
	local current = bucket[player.UserId] or 0
	if now < current then
		return false
	end
	bucket[player.UserId] = now + MatchConfig.COMMANDS[commandName].cooldown
	return true
end

local function addWordLabel(part, text, textColor)
	local gui = Instance.new("BillboardGui")
	gui.Name = "WordLabel"
	gui.Size = UDim2.fromOffset(140, 42)
	gui.StudsOffset = Vector3.new(0, 2.8, 0)
	gui.AlwaysOnTop = true
	gui.Parent = part

	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Font = Enum.Font.GothamBlack
	label.TextScaled = true
	label.TextColor3 = textColor
	label.TextStrokeTransparency = 0.42
	label.Text = text
	label.Parent = gui
end

local function canPlaceBlock(cframe, size, ignoreList)
	local params = OverlapParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = ignoreList

	for _, part in ipairs(workspace:GetPartBoundsInBox(cframe, size + Vector3.new(0.35, 0.35, 0.35), params)) do
		if part:IsA("BasePart") and part.CanCollide and part.Name ~= "SkyBase" then
			return false
		end
	end
	return true
end

local function spawnWordBlock(cframe, size, commandName, lifetime)
	local info = MatchConfig.COMMANDS[commandName]
	local block = Instance.new("Part")
	block.Name = "WordBlock"
	block.Anchored = true
	block.CanCollide = true
	block.CanTouch = true
	block.CanQuery = true
	block.Size = size
	block.CFrame = cframe
	block.Color = info.color
	block.Material = Enum.Material.Neon
	block.TopSurface = Enum.SurfaceType.Smooth
	block.BottomSurface = Enum.SurfaceType.Smooth
	block.Parent = workspace

	addWordLabel(block, info.displayName, info.textColor)

	task.spawn(function()
		local fadeAt = lifetime - 0.45
		if fadeAt > 0 then
			task.wait(fadeAt)
		end
		for step = 1, 5 do
			if not block.Parent then
				return
			end
			block.Transparency = step * 0.18
			task.wait(0.07)
		end
		if block.Parent then
			block:Destroy()
		end
	end)
end

local function flatLookVector(root)
	local look = root.CFrame.LookVector
	local flat = Vector3.new(look.X, 0, look.Z)
	if flat.Magnitude < 0.01 then
		return Vector3.new(1, 0, 0)
	end
	return flat.Unit
end

local function buildPlacements(commandName, root)
	local size = MatchConfig.COMMANDS[commandName].size
	local look = flatLookVector(root)
	local baseY = root.Position.Y - 3.2
	local placements = {}

	if commandName == "STEP" then
		table.insert(placements, {
			position = Vector3.new(root.Position.X, baseY, root.Position.Z) + look * 8,
			size = size,
		})
	elseif commandName == "BRIDGE" then
		for _, distance in ipairs({ 8, 16.5, 25 }) do
			table.insert(placements, {
				position = Vector3.new(root.Position.X, baseY, root.Position.Z) + look * distance,
				size = size,
			})
		end
	elseif commandName == "UP" then
		table.insert(placements, {
			position = Vector3.new(root.Position.X, baseY, root.Position.Z) + look * 8,
			size = size,
		})
		table.insert(placements, {
			position = Vector3.new(root.Position.X, baseY + 4.5, root.Position.Z) + look * 16,
			size = size,
		})
	end

	return placements, look
end

local function handleCommand(player, commandName, options)
	options = options or {}
	local info = MatchConfig.COMMANDS[commandName]
	if not info then
		return {
			ok = false,
			error = "unknown_command",
		}
	end
	if currentState ~= "Playing" or controlLock[player] or playerFinishedRank[player] then
		return {
			ok = false,
			error = currentState ~= "Playing" and "state_not_playing" or (controlLock[player] and "player_locked" or "player_finished"),
			state = currentState,
		}
	end
	if not options.skipCooldown and not cooldownReady(commandName, player) then
		return {
			ok = false,
			error = "cooldown",
		}
	end

	local character, root = getCharacterBits(player)
	if not character or not root then
		return {
			ok = false,
			error = "missing_character",
		}
	end

	local placements, look = buildPlacements(commandName, root)
	local ignored = { character }
	local created = 0
	local createdPositions = {}

	for _, placement in ipairs(placements) do
		local cframe = CFrame.lookAt(placement.position, placement.position + look)
		if canPlaceBlock(cframe, placement.size, ignored) then
			spawnWordBlock(cframe, placement.size, commandName, info.lifetime)
			created += 1
			table.insert(createdPositions, vectorToTable(placement.position))
		end
	end

	if created > 0 then
		if not options.skipCooldown then
			CommandCooldown:FireClient(player, commandName, info.cooldown)
		end
	else
		if not options.skipCooldown then
			cooldownUntil[commandName][player.UserId] = tick() + info.cooldown * 0.35
		end
	end

	local errorCode = nil
	if created == 0 then
		errorCode = "blocked"
	end

	local result = {
		ok = created > 0,
		error = errorCode,
		player = player.Name,
		command = commandName,
		created = created,
		positions = createdPositions,
		wordBlockCount = #collectWordBlocks(),
	}

	if pushDebugEvent then
		pushDebugEvent(created > 0 and "command_applied" or "command_blocked", result)
	end
	if publishDebugSnapshot then
		publishDebugSnapshot(created > 0 and "command_applied" or "command_blocked", {
			player = player.Name,
			command = commandName,
			created = created,
		})
	end

	return result
end

local function waitForEnoughPlayers()
	while #Players:GetPlayers() < MatchConfig.MIN_PLAYERS do
		setState("Lobby", { waitingFor = MatchConfig.MIN_PLAYERS })
		updateAllProgress()
		task.wait(1)
	end
end

local function runLobby()
	waitForEnoughPlayers()
	lockAllPlayers(true)
	resetPlayersToCheckpointZero()

	for remain = MatchConfig.LOBBY_WAIT, 0, -1 do
		if #Players:GetPlayers() < MatchConfig.MIN_PLAYERS then
			return false
		end
		setState("Lobby", { remaining = remain })
		updateAllProgress()
		task.wait(1)
	end
	return true
end

local function runCountdown()
	lockAllPlayers(true)
	resetPlayersToCheckpointZero()
	setState("Countdown")

	for remain = MatchConfig.COUNTDOWN_SECONDS, 1, -1 do
		MatchCountdown:FireAllClients(remain)
		task.wait(1)
	end
	MatchCountdown:FireAllClients(0)
end

local function respawnFallenPlayers()
	local respawns = 0
	for _, player in ipairs(Players:GetPlayers()) do
		if not playerFinishedRank[player] then
			local _, root = getCharacterBits(player)
			if root and root.Position.Y < MatchConfig.FALL_RESET_Y then
				teleportToCheckpoint(player)
				respawns += 1
				if pushDebugEvent then
					pushDebugEvent("player_respawned", {
						player = player.Name,
						checkpoint = checkpointDisplay(playerCheckpoint[player]),
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

local function runRespawnThread(sessionId)
	task.spawn(function()
		while currentState == "Playing" and playSessionId == sessionId do
			respawnFallenPlayers()
			task.wait(0.25)
		end
	end)
end

local function winnersText()
	if #finishOrder == 0 then
		return "No Finishers"
	end
	local top = {}
	for index = 1, math.min(3, #finishOrder) do
		table.insert(top, string.format("%d.%s", index, finishOrder[index].Name))
	end
	return table.concat(top, "  ")
end

local function runPlaying()
	playSessionId += 1
	local thisSession = playSessionId
	lockAllPlayers(false)
	setState("Playing", { remaining = MatchConfig.MATCH_DURATION })
	updateAllProgress()
	runRespawnThread(thisSession)

	for remain = MatchConfig.MATCH_DURATION, 0, -1 do
		setState("Playing", { remaining = remain })
		updateAllProgress()
		if #finishOrder >= #Players:GetPlayers() and #finishOrder > 0 then
			break
		end
		task.wait(1)
	end

	lockAllPlayers(true)
end

local function runResult()
	local winners = winnersText()
	for remain = MatchConfig.RESULT_DURATION, 0, -1 do
		setState("Result", {
			remaining = remain,
			winners = winners,
		})
		updateAllProgress()
		task.wait(1)
	end
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

	if commandName == "clear_word_blocks" then
		local cleared = clearWordBlocks()
		local snapshot = publishDebugSnapshot("command_clear_word_blocks", {
			cleared = cleared,
		})
		return {
			ok = true,
			cleared = cleared,
			snapshot = snapshot,
		}
	elseif commandName == "teleport_part" then
		if not player then
			return {
				ok = false,
				error = "player_not_found",
			}
		end
		local offset = tableToVector(payload.offset, Vector3.new(0, 6, 0))
		local ok, reason, destination = teleportPlayerToArenaPart(player, payload.partName or "StartIsland", offset, payload.lookAtPartName)
		local snapshot = publishDebugSnapshot("command_teleport_part", {
			player = player.Name,
			partName = payload.partName or "StartIsland",
			reason = reason,
		})
		return {
			ok = ok,
			error = reason,
			player = player.Name,
			partName = payload.partName or "StartIsland",
			destination = destination and vectorToTable(destination) or nil,
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
		local targetY = tonumber(payload.y) or (MatchConfig.FALL_RESET_Y - 20)
		local ok, reason, destination = teleportPlayer(player, Vector3.new(root.Position.X, targetY, root.Position.Z), root.Position + root.CFrame.LookVector * 10)
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
	elseif commandName == "set_checkpoint" then
		if not player then
			return {
				ok = false,
				error = "player_not_found",
			}
		end
		local checkpointIndex = math.clamp(math.floor(tonumber(payload.checkpointIndex) or 0), 0, MatchConfig.CHECKPOINT_COUNT)
		playerCheckpoint[player] = checkpointIndex
		player:SetAttribute("CheckpointIndex", checkpointIndex)
		local snapshot = publishDebugSnapshot("command_set_checkpoint", {
			player = player.Name,
			checkpoint = checkpointIndex,
		})
		return {
			ok = true,
			player = player.Name,
			checkpoint = checkpointIndex,
			snapshot = snapshot,
		}
	elseif commandName == "force_command" then
		if not player then
			return {
				ok = false,
				error = "player_not_found",
			}
		end
		local commandNameValue = typeof(payload.commandName) == "string" and string.upper(payload.commandName) or nil
		local result = handleCommand(player, commandNameValue, {
			skipCooldown = payload.skipCooldown ~= false,
		})
		result.snapshot = publishDebugSnapshot("command_force_command", {
			player = player.Name,
			command = commandNameValue,
			created = result.created,
			error = result.error,
		})
		return result
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
		local player

		local function recordStep(name, ok, payload)
			table.insert(result.steps, {
				name = name,
				ok = ok,
				payload = payload,
			})
		end

		local function verifyWordBlocks(commandName, expectedCount, teleportPart)
			local commandKey = string.lower(commandName)
			local cleared = runDebugCommand("clear_word_blocks", {})
			recordStep("clear_" .. commandKey, cleared.ok, cleared)

			local teleported = runDebugCommand("teleport_part", {
				player = player,
				partName = teleportPart,
				offset = { x = 0, y = 6, z = 0 },
				lookAtPartName = "FinishIsland",
			})
			recordStep("teleport_" .. commandKey, teleported.ok, teleported)

			local forced = runDebugCommand("force_command", {
				player = player,
				commandName = commandName,
				skipCooldown = true,
			})
			recordStep("force_" .. commandKey, forced.ok, forced)

			task.wait(0.1)
			local snapshot = runDebugCommand("snapshot", {})
			recordStep("verify_" .. commandKey, snapshot.ok and (snapshot.wordBlockCount or 0) >= expectedCount, {
				wordBlockCount = snapshot.wordBlockCount,
				snapshot = snapshot,
			})
		end

		player = findPlayer(nil)
		if not player then
			recordStep("resolve_player", false, {
				error = "player_not_found",
			})
		else
			recordStep("resolve_player", true, {
				player = player.Name,
			})
		end

		local readyDeadline = tick() + MatchConfig.LOBBY_WAIT + MatchConfig.COUNTDOWN_SECONDS + 10
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

			verifyWordBlocks("STEP", 1, "StartIsland")
			verifyWordBlocks("BRIDGE", 3, "StartIsland")
			verifyWordBlocks("UP", 2, "Island_2")

			local checkpointSet = runDebugCommand("set_checkpoint", {
				player = player,
				checkpointIndex = 2,
			})
			recordStep("set_checkpoint", checkpointSet.ok, checkpointSet)

			local dropped = runDebugCommand("drop_player", {
				player = player,
				y = MatchConfig.FALL_RESET_Y - 20,
			})
			recordStep("drop_player", dropped.ok, dropped)

			task.wait(0.35)
			local respawnCheck = runDebugCommand("respawn_check", {})
			local _, root = getCharacterBits(player)
			local checkpointPart = getCheckpointPart(2)
			local expectedPosition = checkpointPart and (checkpointPart.Position + MatchConfig.CHECKPOINT_RESPAWN_OFFSET) or nil
			local distance = (root and expectedPosition) and (root.Position - expectedPosition).Magnitude or math.huge
			recordStep("verify_respawn", respawnCheck.ok and distance < 3, {
				respawns = respawnCheck.respawns,
				distance = round3(distance),
				snapshot = runDebugCommand("snapshot", {}),
			})
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

CommandRequest.OnServerEvent:Connect(function(player, commandName)
	if typeof(commandName) == "string" then
		handleCommand(player, commandName)
	end
end)

Players.PlayerAdded:Connect(function(player)
	playerCheckpoint[player] = 0
	controlLock[player] = currentState ~= "Playing"
	player:SetAttribute("CheckpointIndex", 0)
	player:SetAttribute("FinishRank", 0)

	player.CharacterAdded:Connect(function()
		task.wait(0.1)
		teleportToCheckpoint(player)
		applyMovementState(player)
	end)

	MatchStateChanged:FireClient(player, currentState, nil)
	ProgressChanged:FireClient(player, {
		rank = #Players:GetPlayers(),
		checkpoint = 0,
		totalCheckpoints = MatchConfig.CHECKPOINT_COUNT,
		finishedCount = #finishOrder,
		finishRank = 0,
	})
	if studioDebugEnabled then
		runSmokeTest()
	end
end)

Players.PlayerRemoving:Connect(function(player)
	playerCheckpoint[player] = nil
	controlLock[player] = nil
	playerFinishedRank[player] = nil
	cooldownUntil.STEP[player.UserId] = nil
	cooldownUntil.BRIDGE[player.UserId] = nil
	cooldownUntil.UP[player.UserId] = nil

	for index = #finishOrder, 1, -1 do
		if finishOrder[index] == player then
			table.remove(finishOrder, index)
		end
	end
end)

arena = ArenaBuilder.ensureArena(MatchConfig)
bindCourseTriggers()

for _, player in ipairs(Players:GetPlayers()) do
	playerCheckpoint[player] = 0
	controlLock[player] = true
	player:SetAttribute("CheckpointIndex", 0)
	player:SetAttribute("FinishRank", 0)
	if player.Character then
		teleportToCheckpoint(player)
		applyMovementState(player)
	end
end

publishDebugSnapshot("server_boot", nil)
if studioDebugEnabled and #Players:GetPlayers() > 0 then
	runSmokeTest()
end

while true do
	table.clear(finishOrder)
	for _, player in ipairs(Players:GetPlayers()) do
		playerFinishedRank[player] = nil
		player:SetAttribute("FinishRank", 0)
	end

	if runLobby() then
		runCountdown()
		runPlaying()
		runResult()
	else
		task.wait(1)
	end
end
