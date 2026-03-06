local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
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

local function setState(stateName, payload)
	currentState = stateName
	MatchStateChanged:FireAllClients(stateName, payload)
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

local function handleCommand(player, commandName)
	local info = MatchConfig.COMMANDS[commandName]
	if not info then
		return
	end
	if currentState ~= "Playing" or controlLock[player] or playerFinishedRank[player] then
		return
	end
	if not cooldownReady(commandName, player) then
		return
	end

	local character, root = getCharacterBits(player)
	if not character or not root then
		return
	end

	local placements, look = buildPlacements(commandName, root)
	local ignored = { character }
	local created = 0

	for _, placement in ipairs(placements) do
		local cframe = CFrame.lookAt(placement.position, placement.position + look)
		if canPlaceBlock(cframe, placement.size, ignored) then
			spawnWordBlock(cframe, placement.size, commandName, info.lifetime)
			created += 1
		end
	end

	if created > 0 then
		CommandCooldown:FireClient(player, commandName, info.cooldown)
	else
		cooldownUntil[commandName][player.UserId] = tick() + info.cooldown * 0.35
	end
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

local function runRespawnThread(sessionId)
	task.spawn(function()
		while currentState == "Playing" and playSessionId == sessionId do
			for _, player in ipairs(Players:GetPlayers()) do
				if not playerFinishedRank[player] then
					local _, root = getCharacterBits(player)
					if root and root.Position.Y < MatchConfig.FALL_RESET_Y then
						teleportToCheckpoint(player)
					end
				end
			end
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
