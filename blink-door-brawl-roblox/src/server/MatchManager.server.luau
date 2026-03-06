local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")

local MatchConfig = require(ReplicatedStorage:WaitForChild("MatchConfig"))
local ArenaBuilder = require(script.Parent:WaitForChild("ArenaBuilder"))

local function getOrCreateChild(parent, name, className)
	local existing = parent:FindFirstChild(name)
	if existing then
		return existing
	end
	local remote = Instance.new(className)
	remote.Name = name
	remote.Parent = parent
	return remote
end

local MatchStateChanged = getOrCreateChild(ReplicatedStorage, "MatchStateChanged", "RemoteEvent")
local MatchCountdown = getOrCreateChild(ReplicatedStorage, "MatchCountdown", "RemoteEvent")
local ScoreChanged = getOrCreateChild(ReplicatedStorage, "ScoreChanged", "RemoteEvent")
local DoorStateChanged = getOrCreateChild(ReplicatedStorage, "DoorStateChanged", "RemoteEvent")
local ActionCooldown = getOrCreateChild(ReplicatedStorage, "ActionCooldown", "RemoteEvent")
local ActionRequest = getOrCreateChild(ReplicatedStorage, "ActionRequest", "RemoteEvent")

local currentState = "Lobby"
local arena
local controlLock = {}
local scores = {}
local deaths = {}
local lastThreat = {}
local recentTeleportUntil = {}
local doorPairs = {}
local doorConnections = {}
local actionCooldownUntil = {
	PLACE_ENTRY = {},
	PLACE_EXIT = {},
	PUSH = {},
}
local spawnIndex = 0
local studioDebugEnabled = RunService:IsStudio()
local debugPrefix = "[BlinkDoorDebug]"
local debugFolder = studioDebugEnabled and getOrCreateChild(ReplicatedStorage, "BlinkDoorDebug", "Folder") or nil
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
	local root = character:FindFirstChild("HumanoidRootPart")
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	if not root or not humanoid then
		return nil, nil, nil
	end
	return character, root, humanoid
end

local function getPlayerFromHit(hit)
	if not hit then
		return nil
	end
	local model = hit:FindFirstAncestorOfClass("Model")
	if not model then
		return nil
	end
	return Players:GetPlayerFromCharacter(model)
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

local function summarizeDoor(part)
	if not part or not part.Parent then
		return nil
	end
	return {
		name = part.Name,
		position = vectorToTable(part.Position),
	}
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
	publishDebugSnapshot("state_changed", payload)
	pushDebugEvent("state_changed", {
		state = stateName,
		payload = payload,
	})
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

local function chooseSpawn()
	spawnIndex += 1
	local name = string.format("Spawn_%d", ((spawnIndex - 1) % 4) + 1)
	return getArenaPart(name)
end

local function teleportToSpawn(player)
	local _, root = getCharacterBits(player)
	if not root then
		return nil
	end
	local spawn = chooseSpawn()
	if not spawn then
		return nil
	end
	root.CFrame = spawn.CFrame + Vector3.new(0, 4, 0)
	root.AssemblyLinearVelocity = Vector3.zero
	root.AssemblyAngularVelocity = Vector3.zero
	return spawn
end

local function setDoorState(player)
	local pair = doorPairs[player]
	DoorStateChanged:FireClient(player, pair and pair.Entry ~= nil, pair and pair.Exit ~= nil)
	publishDebugSnapshot("door_state", {
		player = player.Name,
		entryActive = pair and pair.Entry ~= nil or false,
		exitActive = pair and pair.Exit ~= nil or false,
	})
end

local function clearDoorConnection(player)
	local connection = doorConnections[player]
	if connection then
		connection:Disconnect()
		doorConnections[player] = nil
	end
end

local function clearPlayerDoors(player)
	clearDoorConnection(player)
	local pair = doorPairs[player]
	if not pair then
		setDoorState(player)
		return
	end
	if pair.Entry and pair.Entry.Parent then
		pair.Entry:Destroy()
	end
	if pair.Exit and pair.Exit.Parent then
		pair.Exit:Destroy()
	end
	doorPairs[player] = {
		Entry = nil,
		Exit = nil,
	}
	setDoorState(player)
end

local function clearAllDoors()
	for _, player in ipairs(Players:GetPlayers()) do
		clearPlayerDoors(player)
	end
end

local function setThreat(targetPlayer, sourcePlayer)
	if not targetPlayer or not sourcePlayer or targetPlayer == sourcePlayer then
		return
	end
	lastThreat[targetPlayer] = {
		sourceUserId = sourcePlayer.UserId,
		expiresAt = tick() + MatchConfig.THREAT_WINDOW,
	}
end

local function resolveThreatSource(targetPlayer)
	local threat = lastThreat[targetPlayer]
	if not threat then
		return nil
	end
	if tick() > threat.expiresAt then
		lastThreat[targetPlayer] = nil
		return nil
	end
	for _, player in ipairs(Players:GetPlayers()) do
		if player.UserId == threat.sourceUserId then
			return player
		end
	end
	return nil
end

local function computeRankedPlayers()
	local ranked = Players:GetPlayers()
	table.sort(ranked, function(a, b)
		local scoreA = scores[a] or 0
		local scoreB = scores[b] or 0
		if scoreA ~= scoreB then
			return scoreA > scoreB
		end
		local deathsA = deaths[a] or 0
		local deathsB = deaths[b] or 0
		if deathsA ~= deathsB then
			return deathsA < deathsB
		end
		return a.UserId < b.UserId
	end)
	return ranked
end

local function buildDebugSnapshot(reason, extra)
	local ranked = computeRankedPlayers()
	local playersPayload = {}
	local lockedPlayers = 0
	for _, player in ipairs(ranked) do
		local _, root = getCharacterBits(player)
		local pair = doorPairs[player]
		if controlLock[player] then
			lockedPlayers += 1
		end
		table.insert(playersPayload, {
			name = player.Name,
			userId = player.UserId,
			score = scores[player] or 0,
			deaths = deaths[player] or 0,
			position = root and vectorToTable(root.Position) or nil,
			doors = {
				entry = summarizeDoor(pair and pair.Entry or nil),
				exit = summarizeDoor(pair and pair.Exit or nil),
			},
		})
	end

	return {
		ok = true,
		reason = reason,
		state = currentState,
		lockedPlayers = lockedPlayers,
		playerCount = #playersPayload,
		arenaReady = arena ~= nil,
		players = playersPayload,
		extra = extra,
	}
end

publishDebugSnapshot = function(reason, extra)
	if not studioDebugEnabled or not debugSnapshotValue then
		return nil
	end
	local snapshot = buildDebugSnapshot(reason, extra)
	local encoded = encodeDebugJson(snapshot)
	debugSnapshotValue.Value = encoded
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

local function pushScoreboard()
	local ranked = computeRankedPlayers()
	local rankMap = {}
	for rank, player in ipairs(ranked) do
		rankMap[player] = rank
	end

	local leader = ranked[1]
	local leaderName = leader and leader.Name or "--"
	local leaderScore = leader and (scores[leader] or 0) or 0

	for _, player in ipairs(Players:GetPlayers()) do
		ScoreChanged:FireClient(player, {
			score = scores[player] or 0,
			deaths = deaths[player] or 0,
			rank = rankMap[player] or #ranked,
			leaderName = leaderName,
			leaderScore = leaderScore,
		})
	end
end

local function cooldownReady(actionName, player, cooldown)
	local bucket = actionCooldownUntil[actionName]
	local now = tick()
	local untilTime = bucket[player.UserId] or 0
	if now < untilTime then
		return false
	end
	bucket[player.UserId] = now + cooldown
	return true
end

local function addDoorLabel(part, text)
	local gui = Instance.new("BillboardGui")
	gui.Name = part.Name .. "_Label"
	gui.Size = UDim2.fromOffset(120, 46)
	gui.StudsOffset = Vector3.new(0, 6, 0)
	gui.AlwaysOnTop = true
	gui.MaxDistance = 150
	gui.Parent = part

	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Font = Enum.Font.GothamBlack
	label.TextScaled = true
	label.TextColor3 = Color3.fromRGB(255, 255, 255)
	label.TextStrokeTransparency = 0.35
	label.Text = text
	label.Parent = gui
end

local function flatLookVector(root)
	local look = root.CFrame.LookVector
	local flat = Vector3.new(look.X, 0, look.Z)
	if flat.Magnitude < 0.01 then
		return Vector3.new(0, 0, -1)
	end
	return flat.Unit
end

local function findDoorPlacement(root, character)
	local look = flatLookVector(root)
	local candidate = root.Position + look * MatchConfig.DOOR.placeDistance

	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = { character }
	params.IgnoreWater = true

	local result = workspace:Raycast(candidate + Vector3.new(0, 10, 0), Vector3.new(0, -22, 0), params)
	if not result or not result.Instance or not result.Instance:IsA("BasePart") then
		return nil
	end
	if result.Normal.Y < 0.65 then
		return nil
	end

	local center = result.Position + Vector3.new(0, MatchConfig.DOOR.size.Y * 0.5, 0) + look * 0.25
	local cframe = CFrame.lookAt(center, center + look)
	return cframe
end

local function namedDoorPlacement(partName, facePartName)
	local part = getArenaPart(partName)
	if not part then
		return nil, "unknown_part"
	end

	local lookTarget = getArenaPart(facePartName or "CenterIsland")
	local lookDirection = Vector3.new(0, 0, -1)
	if lookTarget and lookTarget ~= part then
		local offset = lookTarget.Position - part.Position
		lookDirection = Vector3.new(offset.X, 0, offset.Z)
	end
	if lookDirection.Magnitude < 0.01 then
		lookDirection = Vector3.new(0, 0, -1)
	end

	local center = part.Position + Vector3.new(0, part.Size.Y * 0.5 + MatchConfig.DOOR.size.Y * 0.5, 0)
	return CFrame.lookAt(center, center + lookDirection.Unit)
end

local function createDoorPart(doorName, color, cframe)
	local part = Instance.new("Part")
	part.Name = doorName
	part.Anchored = true
	part.CanCollide = false
	part.CanTouch = true
	part.CanQuery = true
	part.Material = Enum.Material.Neon
	part.Color = color
	part.Transparency = 0.05
	part.Size = MatchConfig.DOOR.size
	part.CFrame = cframe
	part.Parent = workspace

	local frame = Instance.new("Part")
	frame.Name = doorName .. "_Frame"
	frame.Anchored = true
	frame.CanCollide = false
	frame.CanTouch = false
	frame.CanQuery = false
	frame.Material = Enum.Material.SmoothPlastic
	frame.Color = Color3.fromRGB(255, 255, 255)
	frame.Transparency = 0.55
	frame.Size = Vector3.new(MatchConfig.DOOR.size.X + 1, MatchConfig.DOOR.size.Y + 1, 0.5)
	frame.CFrame = cframe * CFrame.new(0, 0, 0.35)
	frame.Parent = workspace

	part.Destroying:Connect(function()
		if frame.Parent then
			frame:Destroy()
		end
	end)

	addDoorLabel(part, doorName)
	return part
end

local function teleportThroughDoor(owner, targetPlayer)
	local pair = doorPairs[owner]
	if not pair or not pair.Entry or not pair.Exit then
		return false, "door_pair_incomplete"
	end

	local _, root = getCharacterBits(targetPlayer)
	if not root then
		return false, "missing_root"
	end

	local now = tick()
	if now < (recentTeleportUntil[targetPlayer] or 0) then
		return false, "teleport_locked"
	end
	recentTeleportUntil[targetPlayer] = now + MatchConfig.TELEPORT_LOCK

	local exitDoor = pair.Exit
	local destination = exitDoor.CFrame + exitDoor.CFrame.LookVector * 4 + MatchConfig.DOOR.exitOffset
	root.CFrame = destination
	root.AssemblyLinearVelocity = exitDoor.CFrame.LookVector * MatchConfig.DOOR.launchSpeed + Vector3.new(0, 7, 0)
	root.AssemblyAngularVelocity = Vector3.zero

	if owner ~= targetPlayer then
		setThreat(targetPlayer, owner)
	end
	pushDebugEvent("teleport", {
		owner = owner.Name,
		target = targetPlayer.Name,
		destination = vectorToTable(destination.Position),
	})
	publishDebugSnapshot("teleport", {
		owner = owner.Name,
		target = targetPlayer.Name,
	})
	return true, nil, destination
end

local function bindEntryTouch(player)
	clearDoorConnection(player)
	local pair = doorPairs[player]
	if not pair or not pair.Entry then
		return
	end

	doorConnections[player] = pair.Entry.Touched:Connect(function(hit)
		if currentState ~= "Playing" then
			return
		end
		local targetPlayer = getPlayerFromHit(hit)
		if not targetPlayer then
			return
		end
		teleportThroughDoor(player, targetPlayer)
	end)
end

local function placeDoor(player, doorType, options)
	options = options or {}
	if (currentState ~= "Playing" or controlLock[player]) and not options.force then
		return nil, "not_playing"
	end

	local cooldownName = doorType == "Entry" and "PLACE_ENTRY" or "PLACE_EXIT"
	local character, root = getCharacterBits(player)
	if not character or not root then
		return nil, "missing_character"
	end
	if not options.force and not cooldownReady(cooldownName, player, MatchConfig.DOOR.cooldown) then
		return nil, "cooldown"
	end

	local cframe = options.cframe
	local namedReason = nil
	if not cframe and options.partName then
		cframe, namedReason = namedDoorPlacement(options.partName, options.facePartName)
	end
	if not cframe then
		if options.partName then
			return nil, namedReason or "invalid_part"
		end
		cframe = findDoorPlacement(root, character)
	end
	if not cframe then
		if not options.force then
			actionCooldownUntil[cooldownName][player.UserId] = tick() + MatchConfig.DOOR.cooldown * 0.35
		end
		return nil, "no_surface"
	end

	local pair = doorPairs[player]
	if not pair then
		pair = { Entry = nil, Exit = nil }
		doorPairs[player] = pair
	end

	if doorType == "Entry" then
		if pair.Entry and pair.Entry.Parent then
			pair.Entry:Destroy()
		end
		pair.Entry = createDoorPart("Entry", MatchConfig.DOOR.entryColor, cframe)
		bindEntryTouch(player)
	else
		if pair.Exit and pair.Exit.Parent then
			pair.Exit:Destroy()
		end
		pair.Exit = createDoorPart("Exit", MatchConfig.DOOR.exitColor, cframe)
	end

	setDoorState(player)
	if not options.force then
		ActionCooldown:FireClient(player, cooldownName, MatchConfig.DOOR.cooldown)
	end
	pushDebugEvent("door_placed", {
		player = player.Name,
		doorType = doorType,
		position = vectorToTable(cframe.Position),
		forced = options.force == true,
	})
	return doorType == "Entry" and pair.Entry or pair.Exit, nil
end

local function applyImpulse(player, direction, force, upForce)
	local _, root = getCharacterBits(player)
	if not root then
		return
	end
	local dir = direction
	if dir.Magnitude < 0.01 then
		dir = Vector3.new(1, 0, 0)
	end
	local horizontal = Vector3.new(dir.X, 0, dir.Z)
	if horizontal.Magnitude < 0.01 then
		horizontal = Vector3.new(1, 0, 0)
	end
	horizontal = horizontal.Unit
	root:ApplyImpulse((horizontal * force + Vector3.new(0, upForce, 0)) * root.AssemblyMass)
end

local function handlePush(player, options)
	options = options or {}
	if (currentState ~= "Playing" or controlLock[player]) and not options.force then
		return 0, "not_playing"
	end
	if not options.force and not cooldownReady("PUSH", player, MatchConfig.PUSH.cooldown) then
		return 0, "cooldown"
	end

	local _, root = getCharacterBits(player)
	if not root then
		return 0, "missing_root"
	end

	local facing = flatLookVector(root)
	local hits = 0
	for _, other in ipairs(Players:GetPlayers()) do
		if other ~= player then
			local _, otherRoot = getCharacterBits(other)
			if otherRoot then
				local offset = otherRoot.Position - root.Position
				local distance = offset.Magnitude
				if distance <= MatchConfig.PUSH.range and distance > 0.01 then
					local direction = offset.Unit
					if direction:Dot(facing) >= MatchConfig.PUSH.coneDot then
						applyImpulse(other, direction, MatchConfig.PUSH.force, MatchConfig.PUSH.upForce)
						setThreat(other, player)
						hits += 1
					end
				end
			end
		end
	end

	if hits > 0 then
		applyImpulse(player, facing, 12, 0)
	end
	if not options.force then
		ActionCooldown:FireClient(player, "PUSH", MatchConfig.PUSH.cooldown)
	end
	pushDebugEvent("push", {
		player = player.Name,
		hits = hits,
		forced = options.force == true,
	})
	publishDebugSnapshot("push", {
		player = player.Name,
		hits = hits,
	})
	return hits, nil
end

local function resetRound()
	spawnIndex = 0
	clearAllDoors()
	for _, player in ipairs(Players:GetPlayers()) do
		scores[player] = 0
		deaths[player] = 0
		lastThreat[player] = nil
		recentTeleportUntil[player] = 0
		player:SetAttribute("Score", 0)
		player:SetAttribute("Deaths", 0)
		teleportToSpawn(player)
		setDoorState(player)
	end
	pushScoreboard()
end

local function respawnFallenPlayers()
	local respawns = 0
	for _, player in ipairs(Players:GetPlayers()) do
		local _, root = getCharacterBits(player)
		if root and root.Position.Y < MatchConfig.FALL_RESET_Y then
			respawns += 1
			deaths[player] = (deaths[player] or 0) + 1
			player:SetAttribute("Deaths", deaths[player])

			local attacker = resolveThreatSource(player)
			if attacker and attacker ~= player then
				scores[attacker] = (scores[attacker] or 0) + 1
				attacker:SetAttribute("Score", scores[attacker])
			end
			lastThreat[player] = nil

			teleportToSpawn(player)
			pushScoreboard()
			pushDebugEvent("player_respawned", {
				player = player.Name,
				attacker = attacker and attacker.Name or nil,
				score = scores[player] or 0,
				deaths = deaths[player] or 0,
			})
		end
	end
	if respawns > 0 then
		publishDebugSnapshot("respawn", {
			respawns = respawns,
		})
	end
	return respawns
end

local function waitForEnoughPlayers()
	while #Players:GetPlayers() < MatchConfig.MIN_PLAYERS do
		setState("Lobby", { waitingFor = MatchConfig.MIN_PLAYERS })
		pushScoreboard()
		task.wait(1)
	end
end

local function runLobby()
	waitForEnoughPlayers()
	lockAllPlayers(true)
	for remain = MatchConfig.LOBBY_WAIT, 0, -1 do
		if #Players:GetPlayers() < MatchConfig.MIN_PLAYERS then
			return false
		end
		setState("Lobby", { remaining = remain })
		pushScoreboard()
		task.wait(1)
	end
	return true
end

local function runCountdown()
	lockAllPlayers(true)
	resetRound()
	setState("Countdown")
	for remain = MatchConfig.COUNTDOWN_SECONDS, 1, -1 do
		MatchCountdown:FireAllClients(remain)
		task.wait(1)
	end
	MatchCountdown:FireAllClients(0)
end

local function runPlaying()
	lockAllPlayers(false)
	for remain = MatchConfig.MATCH_DURATION, 0, -1 do
		setState("Playing", { remaining = remain })
		pushScoreboard()
		respawnFallenPlayers()
		task.wait(1)
	end
	lockAllPlayers(true)
end

local function resultText()
	local ranked = computeRankedPlayers()
	local winner = ranked[1]
	if not winner then
		return "No Winner"
	end
	return string.format("%s Wins", winner.Name)
end

local function runResult()
	local winnerText = resultText()
	for remain = MatchConfig.RESULT_DURATION, 0, -1 do
		setState("Result", {
			remaining = remain,
			winner = winnerText,
		})
		pushScoreboard()
		task.wait(1)
	end
end

local function runDebugCommand(commandName, payload)
	if not studioDebugEnabled then
		return {
			ok = false,
			error = "studio_only",
		}
	end

	payload = typeof(payload) == "table" and payload or {}
	local player = findPlayer(payload.player)

	if commandName == "snapshot" then
		return buildDebugSnapshot("command_snapshot", payload)
	elseif commandName == "teleport_spawn" then
		if not player then
			return { ok = false, error = "player_not_found" }
		end
		local spawn = teleportToSpawn(player)
		local snapshot = publishDebugSnapshot("command_teleport_spawn", {
			player = player.Name,
			spawn = spawn and spawn.Name or nil,
		})
		return {
			ok = spawn ~= nil,
			player = player.Name,
			spawn = spawn and spawn.Name or nil,
			snapshot = snapshot,
		}
	elseif commandName == "place_entry" then
		if not player then
			return { ok = false, error = "player_not_found" }
		end
		local door, reason = placeDoor(player, "Entry", {
			force = true,
			partName = payload.partName,
			facePartName = payload.facePartName,
		})
		return {
			ok = door ~= nil,
			error = reason,
			player = player.Name,
			door = summarizeDoor(door),
			snapshot = publishDebugSnapshot("command_place_entry", {
				player = player.Name,
				reason = reason,
			}),
		}
	elseif commandName == "place_exit" then
		if not player then
			return { ok = false, error = "player_not_found" }
		end
		local door, reason = placeDoor(player, "Exit", {
			force = true,
			partName = payload.partName,
			facePartName = payload.facePartName,
		})
		return {
			ok = door ~= nil,
			error = reason,
			player = player.Name,
			door = summarizeDoor(door),
			snapshot = publishDebugSnapshot("command_place_exit", {
				player = player.Name,
				reason = reason,
			}),
		}
	elseif commandName == "place_pair" then
		if not player then
			return { ok = false, error = "player_not_found" }
		end
		local entryDoor, entryReason = placeDoor(player, "Entry", {
			force = true,
			partName = payload.entryPartName or payload.partName,
			facePartName = payload.entryFacePartName or payload.facePartName,
		})
		local exitDoor, exitReason = placeDoor(player, "Exit", {
			force = true,
			partName = payload.exitPartName or payload.partName,
			facePartName = payload.exitFacePartName or payload.facePartName,
		})
		return {
			ok = entryDoor ~= nil and exitDoor ~= nil,
			player = player.Name,
			entryError = entryReason,
			exitError = exitReason,
			entry = summarizeDoor(entryDoor),
			exit = summarizeDoor(exitDoor),
			snapshot = publishDebugSnapshot("command_place_pair", {
				player = player.Name,
				entryError = entryReason,
				exitError = exitReason,
			}),
		}
	elseif commandName == "teleport_owner" then
		if not player then
			return { ok = false, error = "player_not_found" }
		end
		local ok, reason, destination = teleportThroughDoor(player, player)
		return {
			ok = ok,
			error = reason,
			player = player.Name,
			destination = destination and vectorToTable(destination.Position) or nil,
			snapshot = publishDebugSnapshot("command_teleport_owner", {
				player = player.Name,
				reason = reason,
			}),
		}
	elseif commandName == "push" then
		if not player then
			return { ok = false, error = "player_not_found" }
		end
		local hits, reason = handlePush(player, {
			force = true,
		})
		return {
			ok = reason == nil,
			error = reason,
			player = player.Name,
			hits = hits,
			snapshot = publishDebugSnapshot("command_push", {
				player = player.Name,
				hits = hits,
				reason = reason,
			}),
		}
	elseif commandName == "respawn_check" then
		local respawns = respawnFallenPlayers()
		return {
			ok = true,
			respawns = respawns,
			snapshot = publishDebugSnapshot("command_respawn_check", {
				respawns = respawns,
			}),
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
			recordStep("resolve_player", false, { error = "player_not_found" })
		else
			recordStep("resolve_player", true, { player = player.Name })
		end

		local readyDeadline = tick() + MatchConfig.LOBBY_WAIT + MatchConfig.COUNTDOWN_SECONDS + 8
		while currentState ~= "Playing" and tick() < readyDeadline do
			task.wait(0.1)
		end

		if currentState ~= "Playing" then
			recordStep("wait_for_playing", false, { state = currentState })
		elseif player then
			recordStep("wait_for_playing", true, { state = currentState })

			local entry = runDebugCommand("place_entry", {
				player = player,
				partName = "CenterIsland",
				facePartName = "NorthIsland",
			})
			recordStep("place_entry", entry.ok, entry)

			local exit = runDebugCommand("place_exit", {
				player = player,
				partName = "NorthIsland",
				facePartName = "CenterIsland",
			})
			recordStep("place_exit", exit.ok, exit)

			local teleported = runDebugCommand("teleport_owner", {
				player = player,
			})
			recordStep("teleport_owner", teleported.ok, teleported)
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

ActionRequest.OnServerEvent:Connect(function(player, actionName)
	if typeof(actionName) ~= "string" then
		return
	end
	if actionName == "PLACE_ENTRY" then
		placeDoor(player, "Entry")
	elseif actionName == "PLACE_EXIT" then
		placeDoor(player, "Exit")
	elseif actionName == "PUSH" then
		handlePush(player)
	end
end)

Players.PlayerAdded:Connect(function(player)
	scores[player] = 0
	deaths[player] = 0
	controlLock[player] = currentState ~= "Playing"
	doorPairs[player] = {
		Entry = nil,
		Exit = nil,
	}
	player:SetAttribute("Score", 0)
	player:SetAttribute("Deaths", 0)

	player.CharacterAdded:Connect(function()
		task.wait(0.1)
		teleportToSpawn(player)
		applyMovementState(player)
	end)

	DoorStateChanged:FireClient(player, false, false)
	ScoreChanged:FireClient(player, {
		score = 0,
		deaths = 0,
		rank = #Players:GetPlayers(),
		leaderName = "--",
		leaderScore = 0,
	})
	MatchStateChanged:FireClient(player, currentState, nil)
	if studioDebugEnabled then
		runSmokeTest()
	end
end)

Players.PlayerRemoving:Connect(function(player)
	clearPlayerDoors(player)
	controlLock[player] = nil
	scores[player] = nil
	deaths[player] = nil
	lastThreat[player] = nil
	recentTeleportUntil[player] = nil
	actionCooldownUntil.PLACE_ENTRY[player.UserId] = nil
	actionCooldownUntil.PLACE_EXIT[player.UserId] = nil
	actionCooldownUntil.PUSH[player.UserId] = nil
	doorPairs[player] = nil
	pushScoreboard()
end)

arena = ArenaBuilder.ensureArena(MatchConfig)

for _, player in ipairs(Players:GetPlayers()) do
	scores[player] = scores[player] or 0
	deaths[player] = deaths[player] or 0
	controlLock[player] = true
	doorPairs[player] = doorPairs[player] or {
		Entry = nil,
		Exit = nil,
	}
	player:SetAttribute("Score", scores[player])
	player:SetAttribute("Deaths", deaths[player])
	if player.Character then
		teleportToSpawn(player)
		applyMovementState(player)
	end
end

publishDebugSnapshot("server_boot", nil)
if studioDebugEnabled and #Players:GetPlayers() > 0 then
	runSmokeTest()
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
