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

local BubbleRequest = getOrCreateRemote("BubbleRequest", "RemoteEvent")

local currentState = "Lobby"
local bubbleStates = {}
local controlLock = {}
local checkpointIndex = {}
local ringScore = {}
local finishRank = {}
local finishOrder = {}
local ringTouched = {}
local ringConnections = {}
local heartbeatConnection
local studioDebugEnabled = RunService:IsStudio()
local debugPrefix = "[BubbleDrifterDebug]"
local debugFolder = studioDebugEnabled and getOrCreateChild(ReplicatedStorage, "BubbleDrifterDebug", "Folder") or nil
local debugCommand = debugFolder and getOrCreateChild(debugFolder, "Command", "BindableFunction") or nil
local debugSnapshotValue = debugFolder and getOrCreateChild(debugFolder, "SnapshotJson", "StringValue") or nil
local debugLastEventValue = debugFolder and getOrCreateChild(debugFolder, "LastEventJson", "StringValue") or nil
local debugSmokeTestValue = debugFolder and getOrCreateChild(debugFolder, "SmokeTestJson", "StringValue") or nil
local smokeTestStarted = false
local publishDebugSnapshot
local pushDebugEvent

local stateFolder = ReplicatedStorage:FindFirstChild("BubbleDrifterState") or Instance.new("Folder")
stateFolder.Name = "BubbleDrifterState"
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
summaryValue.Value = "Pass rings, ride wind, and pop to drop."

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
	return workspace:FindFirstChild("BubbleDrifterArena")
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

		local scoreA = ringScore[a] or 0
		local scoreB = ringScore[b] or 0
		if scoreA ~= scoreB then
			return scoreA > scoreB
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

	for _, player in ipairs(Players:GetPlayers()) do
		player:SetAttribute("RingScore", ringScore[player] or 0)
		player:SetAttribute("CheckpointIndex", checkpointIndex[player] or 0)
		player:SetAttribute("FinishRank", finishRank[player] or 0)
		player:SetAttribute("RaceRank", rankMap[player] or #ranked)
		player:SetAttribute("BubbleActive", bubbleStates[player] and bubbleStates[player].active or false)
	end
end

local function bubbleShellName()
	return "BubbleShell"
end

local function ensureBubbleRig(player)
	local state = bubbleStates[player]
	if state and state.attachment and state.attachment.Parent then
		return state
	end

	local character, root = getCharacterBits(player)
	if not character or not root then
		return nil
	end

	state = state or {
		active = false,
		cooldownUntil = 0,
	}

	local attachment = root:FindFirstChild("BubbleAttachment")
	if not attachment then
		attachment = Instance.new("Attachment")
		attachment.Name = "BubbleAttachment"
		attachment.Parent = root
	end

	local vectorForce = root:FindFirstChild("BubbleForce")
	if not vectorForce then
		vectorForce = Instance.new("VectorForce")
		vectorForce.Name = "BubbleForce"
		vectorForce.Attachment0 = attachment
		vectorForce.RelativeTo = Enum.ActuatorRelativeTo.World
		vectorForce.ApplyAtCenterOfMass = true
		vectorForce.Enabled = true
		vectorForce.Parent = root
	end

	state.attachment = attachment
	state.force = vectorForce
	bubbleStates[player] = state
	return state
end

local function destroyBubbleShell(player)
	local character = player.Character
	if not character then
		return
	end
	local shell = character:FindFirstChild(bubbleShellName())
	if shell then
		shell:Destroy()
	end
end

local function ensureBubbleShell(player)
	local character, root = getCharacterBits(player)
	if not character or not root then
		return nil
	end

	local shell = character:FindFirstChild(bubbleShellName())
	if shell then
		return shell
	end

	shell = Instance.new("Part")
	shell.Name = bubbleShellName()
	shell.Shape = Enum.PartType.Ball
	shell.Size = Vector3.new(GameConfig.BUBBLE.shellDiameter, GameConfig.BUBBLE.shellDiameter, GameConfig.BUBBLE.shellDiameter)
	shell.Color = GameConfig.THEME.shell
	shell.Transparency = 0.46
	shell.Material = Enum.Material.ForceField
	shell.CanCollide = false
	shell.CanTouch = false
	shell.CanQuery = false
	shell.Massless = true
	shell.Anchored = false
	shell.Parent = character

	local weld = Instance.new("WeldConstraint")
	weld.Part0 = shell
	weld.Part1 = root
	weld.Parent = shell

	shell.CFrame = root.CFrame
	return shell
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
		return
	end

	local active = bubbleStates[player] and bubbleStates[player].active
	humanoid.AutoRotate = true
	humanoid.WalkSpeed = active and GameConfig.BUBBLE.walkSpeed or GameConfig.DEFAULT_WALK_SPEED
	humanoid.JumpPower = active and GameConfig.BUBBLE.jumpPower or GameConfig.DEFAULT_JUMP_POWER
end

local function setBubbleActive(player, active, reason)
	local state = ensureBubbleRig(player)
	if not state then
		return false, "missing_character"
	end

	if active then
		if currentState ~= "Playing" then
			return false, "state_not_playing"
		end
		if controlLock[player] or finishRank[player] then
			return false, "player_locked"
		end
		if tick() < (state.cooldownUntil or 0) then
			return false, "cooldown"
		end
		state.active = true
		ensureBubbleShell(player)
	else
		if state.active then
			state.cooldownUntil = tick() + GameConfig.BUBBLE.reactivateDelay
		end
		state.active = false
		destroyBubbleShell(player)
		if state.force then
			state.force.Force = Vector3.zero
		end
	end

	player:SetAttribute("BubbleActive", state.active)
	player:SetAttribute("BubbleCooldownUntil", state.cooldownUntil or 0)
	applyMovementState(player)
	updatePlayerAttributes()
	if not active and reason == "Pop" then
		summaryValue.Value = "Pop to drop onto the next wind lane."
	end
	if pushDebugEvent then
		pushDebugEvent(state.active and "bubble_activated" or "bubble_popped", {
			player = player.Name,
			reason = reason,
			cooldownUntil = round3(state.cooldownUntil or 0),
		})
	end
	if publishDebugSnapshot then
		publishDebugSnapshot(state.active and "bubble_activated" or "bubble_popped", {
			player = player.Name,
			reason = reason,
		})
	end
	return true, nil
end

local function lockAllPlayers(locked)
	for _, player in ipairs(Players:GetPlayers()) do
		controlLock[player] = locked
		applyMovementState(player)
	end
end

local function clearRingConnections()
	for _, connection in ipairs(ringConnections) do
		connection:Disconnect()
	end
	table.clear(ringConnections)
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
	local destination = part.Position + offset
	return teleportPlayer(player, destination, lookAtPart and lookAtPart.Position or nil)
end

local function teleportToCheckpoint(player)
	local checkpoint = getCheckpointPart(checkpointIndex[player] or 0)
	if not checkpoint then
		return
	end

	local destination = checkpoint.Position + Vector3.new(math.random(-2, 2), 2, math.random(-2, 2))
	teleportPlayer(player, destination, checkpoint.Position + Vector3.new(0, 0, -12))
end

local function resetRoundData()
	table.clear(finishOrder)
	for _, player in ipairs(Players:GetPlayers()) do
		checkpointIndex[player] = 0
		ringScore[player] = 0
		finishRank[player] = nil
		ringTouched[player] = {}
		player:SetAttribute("CheckpointIndex", 0)
		player:SetAttribute("RingScore", 0)
		player:SetAttribute("FinishRank", 0)
		player:SetAttribute("RaceRank", 1)
		setBubbleActive(player, false, "RoundReset")
		teleportToCheckpoint(player)
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

local function clearRingForPlayer(player, index, source)
	if currentState ~= "Playing" then
		return false, "state_not_playing"
	end
	if finishRank[player] then
		return false, "already_finished"
	end
	if index < 1 or index > #GameConfig.COURSE.rings then
		return false, "invalid_ring"
	end

	local touched = ringTouched[player]
	if not touched then
		touched = {}
		ringTouched[player] = touched
	end
	if touched[index] then
		return false, "already_cleared"
	end
	if index > (checkpointIndex[player] or 0) + 1 then
		return false, "ring_out_of_order"
	end

	touched[index] = true
	checkpointIndex[player] = math.max(checkpointIndex[player] or 0, index)
	ringScore[player] = (ringScore[player] or 0) + GameConfig.SCORING.ringValue
	summaryValue.Value = string.format("%s cleared Ring %d", player.Name, index)
	updatePlayerAttributes()

	if pushDebugEvent then
		pushDebugEvent("ring_cleared", {
			player = player.Name,
			ring = index,
			source = source or "touch",
			ringScore = ringScore[player] or 0,
		})
	end
	if publishDebugSnapshot then
		publishDebugSnapshot("ring_cleared", {
			player = player.Name,
			ring = index,
			source = source or "touch",
		})
	end
	return true, nil
end

local function finishPlayer(player, source)
	if currentState ~= "Playing" then
		return false, "state_not_playing"
	end
	if finishRank[player] then
		return false, "already_finished"
	end
	if (checkpointIndex[player] or 0) < #GameConfig.COURSE.rings then
		return false, "missing_rings"
	end

	local rank = #finishOrder + 1
	finishRank[player] = rank
	player:SetAttribute("FinishRank", rank)
	table.insert(finishOrder, player)

	local finishBonus = GameConfig.SCORING.finishBonus[rank] or GameConfig.SCORING.finishBonus.default
	ringScore[player] = (ringScore[player] or 0) + finishBonus
	controlLock[player] = true
	setBubbleActive(player, false, "Finish")
	applyMovementState(player)
	summaryValue.Value = string.format("%s finished #%d", player.Name, rank)
	updatePlayerAttributes()

	if pushDebugEvent then
		pushDebugEvent("player_finished", {
			player = player.Name,
			rank = rank,
			source = source or "touch",
			ringScore = ringScore[player] or 0,
		})
	end
	if publishDebugSnapshot then
		publishDebugSnapshot("player_finished", {
			player = player.Name,
			rank = rank,
			source = source or "touch",
		})
	end
	return true, nil, rank
end

local function pointInPart(part, worldPosition)
	local localPosition = part.CFrame:PointToObjectSpace(worldPosition)
	local half = part.Size * 0.5
	return math.abs(localPosition.X) <= half.X
		and math.abs(localPosition.Y) <= half.Y
		and math.abs(localPosition.Z) <= half.Z
end

local function windVectorForPosition(position)
	local arena = getArena()
	if not arena then
		return Vector3.zero
	end

	for _, child in ipairs(arena:GetChildren()) do
		if child:IsA("BasePart") and string.match(child.Name, "^WindLane_") and pointInPart(child, position) then
			return Vector3.new(
				child:GetAttribute("WindVectorX") or 0,
				child:GetAttribute("WindVectorY") or 0,
				child:GetAttribute("WindVectorZ") or 0
			)
		end
	end
	return Vector3.zero
end

local function bindCourseTriggers()
	clearRingConnections()

	local arena = getArena()
	if not arena then
		return
	end

	for _, child in ipairs(arena:GetChildren()) do
		if child:IsA("BasePart") and string.match(child.Name, "^Ring_") then
			table.insert(ringConnections, child.Touched:Connect(function(hit)
				local model = hit.Parent
				local player = model and Players:GetPlayerFromCharacter(model)
				if not player or currentState ~= "Playing" then
					return
				end

				local index = child:GetAttribute("RingIndex") or 0
				clearRingForPlayer(player, index, "touch")
			end))
		elseif child:IsA("BasePart") and child.Name == "GoalPad" then
			table.insert(ringConnections, child.Touched:Connect(function(hit)
				local model = hit.Parent
				local player = model and Players:GetPlayerFromCharacter(model)
				if not player or currentState ~= "Playing" or finishRank[player] then
					return
				end
				finishPlayer(player, "touch")
			end))
		end
	end
end

local function respawnFallenPlayers()
	local respawns = 0
	for _, player in ipairs(Players:GetPlayers()) do
		if not finishRank[player] then
			local _, root = getCharacterBits(player)
			if root and root.Position.Y < GameConfig.RESET_Y then
				setBubbleActive(player, false, "FallReset")
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

local function buildDebugSnapshot(reason, extra)
	local playersPayload = {}
	local activeBubbles = 0
	local lockedPlayers = 0

	for _, player in ipairs(Players:GetPlayers()) do
		local state = bubbleStates[player]
		local _, root = getCharacterBits(player)
		if state and state.active then
			activeBubbles += 1
		end
		if controlLock[player] then
			lockedPlayers += 1
		end
		table.insert(playersPayload, {
			name = player.Name,
			userId = player.UserId,
			checkpoint = checkpointIndex[player] or 0,
			ringScore = ringScore[player] or 0,
			finishRank = finishRank[player] or 0,
			raceRank = player:GetAttribute("RaceRank") or 0,
			bubbleActive = state and state.active or false,
			cooldownUntil = round3(state and state.cooldownUntil or 0),
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
		activeBubbles = activeBubbles,
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

local function heartbeatStep()
	for _, player in ipairs(Players:GetPlayers()) do
		local state = bubbleStates[player]
		if state and state.active and currentState == "Playing" then
			local _, root = getCharacterBits(player)
			if root and state.force then
				local wind = windVectorForPosition(root.Position)
				local verticalBoost = root.Position.Y >= GameConfig.COURSE.maxHeight and -GameConfig.BUBBLE.ceilingPush or GameConfig.BUBBLE.liftAcceleration
				local force = Vector3.new(wind.X, verticalBoost, wind.Z) * root.AssemblyMass
				state.force.Force = force

				local velocity = root.AssemblyLinearVelocity
				local horizontal = Vector3.new(velocity.X, 0, velocity.Z)
				if horizontal.Magnitude > GameConfig.BUBBLE.maxHorizontalSpeed then
					horizontal = horizontal.Unit * GameConfig.BUBBLE.maxHorizontalSpeed
				end
				local vertical = math.clamp(velocity.Y, -GameConfig.BUBBLE.maxVerticalSpeed, GameConfig.BUBBLE.maxVerticalSpeed)
				root.AssemblyLinearVelocity = Vector3.new(horizontal.X, vertical, horizontal.Z)
			end
		elseif state and state.force then
			state.force.Force = Vector3.zero
		end
	end

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
		local partName = payload.partName or "StartCloud"
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
	elseif commandName == "bubble_on" then
		if not player then
			return {
				ok = false,
				error = "player_not_found",
			}
		end
		local ok, reason = setBubbleActive(player, true, "DebugBubbleOn")
		local snapshot = publishDebugSnapshot("command_bubble_on", {
			player = player.Name,
			reason = reason,
		})
		return {
			ok = ok,
			error = reason,
			player = player.Name,
			snapshot = snapshot,
		}
	elseif commandName == "bubble_off" then
		if not player then
			return {
				ok = false,
				error = "player_not_found",
			}
		end
		local ok, reason = setBubbleActive(player, false, "DebugBubbleOff")
		local snapshot = publishDebugSnapshot("command_bubble_off", {
			player = player.Name,
			reason = reason,
		})
		return {
			ok = ok,
			error = reason,
			player = player.Name,
			snapshot = snapshot,
		}
	elseif commandName == "claim_ring" then
		if not player then
			return {
				ok = false,
				error = "player_not_found",
			}
		end
		local ringIndex = math.floor(tonumber(payload.ringIndex) or 0)
		local ok, reason = clearRingForPlayer(player, ringIndex, "debug")
		local snapshot = publishDebugSnapshot("command_claim_ring", {
			player = player.Name,
			ring = ringIndex,
			reason = reason,
		})
		return {
			ok = ok,
			error = reason,
			player = player.Name,
			ring = ringIndex,
			snapshot = snapshot,
		}
	elseif commandName == "claim_finish" then
		if not player then
			return {
				ok = false,
				error = "player_not_found",
			}
		end
		local ok, reason, rank = finishPlayer(player, "debug")
		local snapshot = publishDebugSnapshot("command_claim_finish", {
			player = player.Name,
			reason = reason,
			rank = rank,
		})
		return {
			ok = ok,
			error = reason,
			player = player.Name,
			rank = rank,
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
					partName = "StartCloud",
					offset = { x = 0, y = 6, z = 0 },
					lookAtPartName = "GoalCloud",
				})
				recordStep("teleport_start", teleported.ok, teleported)

				local bubbleOn = runDebugCommand("bubble_on", {
					player = player,
				})
				recordStep("bubble_on", bubbleOn.ok, bubbleOn)

				task.wait(0.1)
				local bubbleOnSnapshot = runDebugCommand("snapshot", {})
				local bubbleOnPlayer = getDebugPlayerState(bubbleOnSnapshot, player.Name)
				recordStep("verify_bubble_on", bubbleOnSnapshot.ok and bubbleOnPlayer and bubbleOnPlayer.bubbleActive == true, {
					snapshot = bubbleOnSnapshot,
				})

				local bubbleOff = runDebugCommand("bubble_off", {
					player = player,
				})
				recordStep("bubble_off", bubbleOff.ok, bubbleOff)

				task.wait(0.05)
				local bubbleOffSnapshot = runDebugCommand("snapshot", {})
				local bubbleOffPlayer = getDebugPlayerState(bubbleOffSnapshot, player.Name)
				recordStep("verify_bubble_off", bubbleOffSnapshot.ok and bubbleOffPlayer and bubbleOffPlayer.bubbleActive == false, {
					snapshot = bubbleOffSnapshot,
				})

				for ringIndex = 1, 2 do
					local claimedRing = runDebugCommand("claim_ring", {
						player = player,
						ringIndex = ringIndex,
					})
					recordStep("claim_ring_" .. ringIndex, claimedRing.ok, claimedRing)
				end

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

				for ringIndex = 3, #GameConfig.COURSE.rings do
					local claimedRing = runDebugCommand("claim_ring", {
						player = player,
						ringIndex = ringIndex,
					})
					recordStep("claim_ring_" .. ringIndex, claimedRing.ok, claimedRing)
				end

				local finished = runDebugCommand("claim_finish", {
					player = player,
				})
				recordStep("claim_finish", finished.ok, finished)

				local finalSnapshot = runDebugCommand("snapshot", {})
				local finalPlayer = getDebugPlayerState(finalSnapshot, player.Name)
				recordStep("verify_finish_state", finalSnapshot.ok and finalPlayer and finalPlayer.finishRank == 1 and finalPlayer.ringScore >= 10, {
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

BubbleRequest.OnServerEvent:Connect(function(player, commandName)
	if typeof(commandName) ~= "string" then
		return
	end
	if commandName == "Bubble" then
		setBubbleActive(player, true, commandName)
	elseif commandName == "Pop" then
		setBubbleActive(player, false, commandName)
	end
end)

Players.PlayerAdded:Connect(function(player)
	checkpointIndex[player] = 0
	ringScore[player] = 0
	finishRank[player] = nil
	ringTouched[player] = {}
	controlLock[player] = currentState ~= "Playing"
	player:SetAttribute("CheckpointIndex", 0)
	player:SetAttribute("RingScore", 0)
	player:SetAttribute("FinishRank", 0)
	player:SetAttribute("RaceRank", 1)
	player:SetAttribute("BubbleActive", false)
	player:SetAttribute("BubbleCooldownUntil", 0)
	if pushDebugEvent then
		pushDebugEvent("player_added", {
			player = player.Name,
		})
	end

	player.CharacterAdded:Connect(function()
		task.wait(0.1)
		ensureBubbleRig(player)
		teleportToCheckpoint(player)
		applyMovementState(player)
	end)

	if studioDebugEnabled then
		runSmokeTest()
	end
end)

Players.PlayerRemoving:Connect(function(player)
	destroyBubbleShell(player)
	bubbleStates[player] = nil
	controlLock[player] = nil
	checkpointIndex[player] = nil
	ringScore[player] = nil
	finishRank[player] = nil
	ringTouched[player] = nil
end)

ArenaBuilder.ensureArena(GameConfig)
bindCourseTriggers()

if heartbeatConnection then
	heartbeatConnection:Disconnect()
end
heartbeatConnection = RunService.Heartbeat:Connect(heartbeatStep)

for _, player in ipairs(Players:GetPlayers()) do
	checkpointIndex[player] = checkpointIndex[player] or 0
	ringScore[player] = ringScore[player] or 0
	ringTouched[player] = ringTouched[player] or {}
	controlLock[player] = true
	player:SetAttribute("CheckpointIndex", checkpointIndex[player])
	player:SetAttribute("RingScore", ringScore[player])
	player:SetAttribute("FinishRank", 0)
	player:SetAttribute("RaceRank", 1)
	player:SetAttribute("BubbleActive", false)
	player:SetAttribute("BubbleCooldownUntil", 0)
	if player.Character then
		ensureBubbleRig(player)
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
		setState("Lobby", remain, "Study the wind lanes.")
		task.wait(1)
	end

	resetRoundData()
	lockAllPlayers(true)
	for remain = GameConfig.COUNTDOWN_SECONDS, 1, -1 do
		setState("Countdown", remain, "Bubble on and climb.")
		task.wait(1)
	end

	lockAllPlayers(false)
	for remain = GameConfig.MATCH_DURATION, 0, -1 do
		setState("Playing", remain, "Pass rings, then land on the goal cloud.")
		updatePlayerAttributes()
		if #finishOrder >= #Players:GetPlayers() and #finishOrder > 0 then
			break
		end
		task.wait(1)
	end

	lockAllPlayers(true)
	for _, player in ipairs(Players:GetPlayers()) do
		setBubbleActive(player, false, "Result")
	end

	for remain = GameConfig.RESULT_DURATION, 0, -1 do
		setState("Result", remain, winnersText())
		updatePlayerAttributes()
		task.wait(1)
	end
end
