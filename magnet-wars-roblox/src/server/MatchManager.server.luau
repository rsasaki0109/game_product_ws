-- MatchManager
-- Magnet Wars: magnetic polarity combat, arena shrinking, pulse ability

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local GameConfig = require(ReplicatedStorage:WaitForChild("GameConfig"))
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
local PlayFeed = getOrCreateRemote("PlayFeed", "RemoteEvent")
local PoleSwitch = getOrCreateRemote("PoleSwitch", "RemoteEvent")
local PulseRequest = getOrCreateRemote("PulseRequest", "RemoteEvent")
local PulseEffect = getOrCreateRemote("PulseEffect", "RemoteEvent")
local PlayerEliminated = getOrCreateRemote("PlayerEliminated", "RemoteEvent")
local ArenaShrinkWarn = getOrCreateRemote("ArenaShrinkWarn", "RemoteEvent")
local PlayerCountChanged = getOrCreateRemote("PlayerCountChanged", "RemoteEvent")
local ActionCooldown = getOrCreateRemote("ActionCooldown", "RemoteEvent")

-- State
local currentState = "Lobby"
local playerPoles: {[Player]: string} = {}
local playerAlive: {[Player]: boolean} = {}
local pulseCooldowns: {[Player]: number} = {}
local currentRingCount = 6
local lastShrinkTime = 0
local matchStartTime = 0
local matchEndTime = 0

local function postFeed(message: string, color: Color3?, duration: number?)
	PlayFeed:FireAllClients(message, color or Color3.fromRGB(255, 255, 255), duration)
end

local function broadcastState(state: string, payload: any?)
	currentState = state
	MatchStateChanged:FireAllClients(state, payload)
end

local function getAlivePlayers(): {Player}
	local alive = {}
	for player, isAlive in playerAlive do
		if isAlive and player.Parent == Players then
			table.insert(alive, player)
		end
	end
	return alive
end

local function getAliveCount(): number
	return #getAlivePlayers()
end

local function getRootPart(player: Player): BasePart?
	local char = player.Character
	if not char then return nil end
	return char:FindFirstChild("HumanoidRootPart")
end

local function getHumanoid(player: Player): Humanoid?
	local char = player.Character
	if not char then return nil end
	return char:FindFirstChildOfClass("Humanoid")
end

local function eliminatePlayer(player: Player)
	if not playerAlive[player] then return end
	playerAlive[player] = false

	postFeed(string.format("%s eliminated!", player.Name), Color3.fromRGB(255, 100, 100), 2)
	PlayerEliminated:FireAllClients(player.Name)
	PlayerCountChanged:FireAllClients(getAliveCount())

	-- Disable character
	local humanoid = getHumanoid(player)
	if humanoid then
		humanoid.Health = 0
	end
end

local function applyBodyVelocity(rootPart: BasePart, velocity: Vector3, duration: number)
	-- Remove existing
	local existing = rootPart:FindFirstChild("MagnetForce")
	if existing then
		existing:Destroy()
	end

	local bv = Instance.new("BodyVelocity")
	bv.Name = "MagnetForce"
	bv.MaxForce = Vector3.new(50000, 20000, 50000)
	bv.Velocity = velocity
	bv.Parent = rootPart

	task.delay(duration, function()
		if bv.Parent then
			bv:Destroy()
		end
	end)
end

-- Magnetic force calculation
local function applyMagneticForces()
	local alive = getAlivePlayers()
	for i = 1, #alive do
		for j = i + 1, #alive do
			local playerA = alive[i]
			local playerB = alive[j]
			local rootA = getRootPart(playerA)
			local rootB = getRootPart(playerB)
			if not rootA or not rootB then continue end

			local poleA = playerPoles[playerA] or "N"
			local poleB = playerPoles[playerB] or "N"

			local diff = rootB.Position - rootA.Position
			local dist = diff.Magnitude

			if dist > GameConfig.MAGNET_RANGE or dist < 1 then continue end

			local direction = diff.Unit
			local samePole = (poleA == poleB)

			local forceMagnitude
			if samePole then
				-- Repel: push apart
				forceMagnitude = GameConfig.REPEL_FORCE / dist
			else
				-- Attract: pull together
				forceMagnitude = GameConfig.ATTRACT_FORCE / dist
			end

			local forceVec
			if samePole then
				-- A pushes away from B, B pushes away from A
				forceVec = direction * forceMagnitude
			else
				-- A pulls toward B, B pulls toward A
				forceVec = direction * forceMagnitude
			end

			-- Apply impulse-style force via BodyVelocity
			local velA, velB
			if samePole then
				velA = -forceVec * 0.02
				velB = forceVec * 0.02
			else
				velA = forceVec * 0.02
				velB = -forceVec * 0.02
			end

			-- Additive velocity nudge
			local bvA = rootA:FindFirstChild("MagnetPush")
			if not bvA then
				bvA = Instance.new("BodyVelocity")
				bvA.Name = "MagnetPush"
				bvA.MaxForce = Vector3.new(30000, 5000, 30000)
				bvA.P = 1000
				bvA.Parent = rootA
			end
			bvA.Velocity = velA

			local bvB = rootB:FindFirstChild("MagnetPush")
			if not bvB then
				bvB = Instance.new("BodyVelocity")
				bvB.Name = "MagnetPush"
				bvB.MaxForce = Vector3.new(30000, 5000, 30000)
				bvB.P = 1000
				bvB.Parent = rootB
			end
			bvB.Velocity = velB
		end
	end

	-- Clear magnet push for players not near anyone
	for _, player in alive do
		local root = getRootPart(player)
		if not root then continue end

		local hasNearby = false
		for _, other in alive do
			if other == player then continue end
			local otherRoot = getRootPart(other)
			if otherRoot and (otherRoot.Position - root.Position).Magnitude <= GameConfig.MAGNET_RANGE then
				hasNearby = true
				break
			end
		end

		if not hasNearby then
			local bv = root:FindFirstChild("MagnetPush")
			if bv then
				bv.Velocity = Vector3.zero
			end
		end
	end
end

-- Pulse ability
local function handlePulse(player: Player)
	if currentState ~= "Playing" then return end
	if not playerAlive[player] then return end

	local now = tick()
	if pulseCooldowns[player] and now < pulseCooldowns[player] then return end
	pulseCooldowns[player] = now + GameConfig.PULSE_COOLDOWN

	ActionCooldown:FireClient(player, "Pulse", GameConfig.PULSE_COOLDOWN)

	local root = getRootPart(player)
	if not root then return end

	local origin = root.Position

	PulseEffect:FireAllClients(player.Name, origin)

	-- Push all nearby players outward
	for _, other in getAlivePlayers() do
		if other == player then continue end
		local otherRoot = getRootPart(other)
		if not otherRoot then continue end

		local diff = otherRoot.Position - origin
		local dist = diff.Magnitude
		if dist > GameConfig.PULSE_RANGE or dist < 1 then continue end

		local pushDir = diff.Unit
		local pushForce = pushDir * GameConfig.PULSE_FORCE + Vector3.new(0, GameConfig.PULSE_FORCE * 0.3, 0)
		applyBodyVelocity(otherRoot, pushForce, 0.3)
	end

	postFeed(string.format("%s used PULSE!", player.Name), Color3.fromRGB(255, 200, 60), 1.5)
end

-- Pole switching
local function handlePoleSwitch(player: Player, newPole: string)
	if currentState ~= "Playing" then return end
	if not playerAlive[player] then return end
	if newPole ~= "N" and newPole ~= "S" then return end

	playerPoles[player] = newPole

	-- Update character color
	local char = player.Character
	if char then
		local highlight = char:FindFirstChild("PoleHighlight")
		if not highlight then
			highlight = Instance.new("Highlight")
			highlight.Name = "PoleHighlight"
			highlight.FillTransparency = 0.6
			highlight.OutlineTransparency = 0.3
			highlight.Parent = char
		end

		if newPole == "N" then
			highlight.FillColor = Color3.fromRGB(50, 100, 255)
			highlight.OutlineColor = Color3.fromRGB(100, 150, 255)
		else
			highlight.FillColor = Color3.fromRGB(255, 50, 50)
			highlight.OutlineColor = Color3.fromRGB(255, 100, 100)
		end
	end

	-- Notify all clients
	PoleSwitch:FireAllClients(player.Name, newPole)
end

-- Elimination check
local function checkEliminations()
	for player, isAlive in playerAlive do
		if not isAlive then continue end
		if player.Parent ~= Players then
			playerAlive[player] = false
			continue
		end

		local root = getRootPart(player)
		if not root then continue end

		if root.Position.Y < GameConfig.ELIMINATION_Y then
			eliminatePlayer(player)
		end
	end
end

-- Arena shrink
local function checkArenaShrink()
	local elapsed = tick() - matchStartTime
	local expectedShrinks = math.floor(elapsed / GameConfig.ARENA_SHRINK_INTERVAL)
	local shrinksPerformed = 6 - currentRingCount

	if expectedShrinks > shrinksPerformed and currentRingCount > 1 then
		ArenaShrinkWarn:FireAllClients(currentRingCount)
		postFeed("ARENA SHRINKING!", Color3.fromRGB(255, 80, 40), 2)

		local arena = workspace:FindFirstChild("MagnetWarsArena")
		if arena then
			ArenaBuilder.shrinkArena(arena, currentRingCount)
		end
		currentRingCount -= 1
	end
end

-- Win condition check
local function checkWinCondition(): Player?
	local alive = getAlivePlayers()
	if #alive <= 1 then
		return alive[1]
	end
	return nil
end

-- Round state machine
local function resetMatch()
	playerPoles = {}
	playerAlive = {}
	pulseCooldowns = {}
	currentRingCount = 6
	lastShrinkTime = 0

	-- Rebuild arena
	ArenaBuilder.ensureArena(GameConfig)
end

local function startLobby()
	resetMatch()
	broadcastState("Lobby", { remaining = GameConfig.LOBBY_WAIT })
	postFeed("Waiting for players...", Color3.fromRGB(200, 200, 200), 3)

	local waited = 0
	while waited < GameConfig.LOBBY_WAIT do
		task.wait(1)
		waited += 1

		if #Players:GetPlayers() >= GameConfig.MIN_PLAYERS and waited >= 3 then
			break
		end

		broadcastState("Lobby", { remaining = GameConfig.LOBBY_WAIT - waited })
	end

	if #Players:GetPlayers() < GameConfig.MIN_PLAYERS then
		postFeed("Not enough players. Restarting lobby...", Color3.fromRGB(255, 200, 100), 2)
		return false
	end

	return true
end

local function startCountdown()
	broadcastState("Countdown")

	for i = GameConfig.COUNTDOWN_SECONDS, 1, -1 do
		MatchCountdown:FireAllClients(i)
		task.wait(1)
	end

	MatchCountdown:FireAllClients(0)
	task.wait(0.5)
end

local function startMatch()
	matchStartTime = tick()
	matchEndTime = matchStartTime + GameConfig.MATCH_DURATION

	-- Initialize all players
	for _, player in Players:GetPlayers() do
		playerPoles[player] = "N"
		playerAlive[player] = true
		pulseCooldowns[player] = 0

		-- Set up character
		local char = player.Character
		if char then
			local humanoid = char:FindFirstChildOfClass("Humanoid")
			if humanoid then
				humanoid.WalkSpeed = GameConfig.DEFAULT_WALK_SPEED
				humanoid.JumpPower = GameConfig.DEFAULT_JUMP_POWER
			end
		end

		-- Apply initial highlight
		handlePoleSwitch(player, "N")
	end

	PlayerCountChanged:FireAllClients(getAliveCount())

	broadcastState("Playing", { remaining = GameConfig.MATCH_DURATION })
	postFeed("FIGHT! Push enemies off the arena!", Color3.fromRGB(255, 255, 100), 3)

	-- Main game loop
	local heartbeatConn
	heartbeatConn = RunService.Heartbeat:Connect(function()
		if currentState ~= "Playing" then
			heartbeatConn:Disconnect()
			return
		end

		applyMagneticForces()
		checkEliminations()
		checkArenaShrink()

		-- Timer
		local remaining = math.ceil(matchEndTime - tick())
		if remaining ~= math.ceil(matchEndTime - tick() + 1) then
			broadcastState("Playing", { remaining = math.max(0, remaining) })
		end
	end)

	-- Wait for match to end
	while currentState == "Playing" do
		task.wait(0.5)

		local remaining = matchEndTime - tick()
		broadcastState("Playing", { remaining = math.max(0, math.ceil(remaining)) })

		-- Check win condition
		local winner = checkWinCondition()
		if winner then
			heartbeatConn:Disconnect()
			return winner
		end

		-- Time's up
		if remaining <= 0 then
			heartbeatConn:Disconnect()
			-- Last player standing or random
			local alive = getAlivePlayers()
			return alive[1]
		end
	end

	heartbeatConn:Disconnect()
	return nil
end

local function showResult(winner: Player?)
	local winnerName = winner and winner.Name or "Nobody"
	broadcastState("Result", { winner = winnerName })
	postFeed(string.format("%s wins the match!", winnerName), Color3.fromRGB(255, 236, 120), 4)

	-- Clean up magnet forces
	for _, player in Players:GetPlayers() do
		local root = getRootPart(player)
		if root then
			local mp = root:FindFirstChild("MagnetPush")
			if mp then mp:Destroy() end
			local mf = root:FindFirstChild("MagnetForce")
			if mf then mf:Destroy() end
		end
		local char = player.Character
		if char then
			local hl = char:FindFirstChild("PoleHighlight")
			if hl then hl:Destroy() end
		end
	end

	task.wait(GameConfig.RESULT_DURATION)
end

-- Input handlers
PoleSwitch.OnServerEvent:Connect(function(player, newPole)
	handlePoleSwitch(player, tostring(newPole))
end)

PulseRequest.OnServerEvent:Connect(function(player)
	handlePulse(player)
end)

-- Player cleanup
Players.PlayerRemoving:Connect(function(player)
	if playerAlive[player] then
		playerAlive[player] = false
		PlayerCountChanged:FireAllClients(getAliveCount())
	end
	playerPoles[player] = nil
	pulseCooldowns[player] = nil
end)

-- Main loop
task.spawn(function()
	while true do
		local lobbyReady = startLobby()
		if lobbyReady then
			startCountdown()
			local winner = startMatch()
			showResult(winner)
		end
		task.wait(1)
	end
end)
