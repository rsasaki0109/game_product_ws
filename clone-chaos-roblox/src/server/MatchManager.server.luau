-- MatchManager
-- Clone Chaos: spawn AI clones, disguise swaps, find the real player

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
local SpawnCloneRequest = getOrCreateRemote("SpawnCloneRequest", "RemoteEvent")
local RecallClonesRequest = getOrCreateRemote("RecallClonesRequest", "RemoteEvent")
local MarkRequest = getOrCreateRemote("MarkRequest", "RemoteEvent")
local DisguiseRequest = getOrCreateRemote("DisguiseRequest", "RemoteEvent")
local PunchRequest = getOrCreateRemote("PunchRequest", "RemoteEvent")
local ActionCooldown = getOrCreateRemote("ActionCooldown", "RemoteEvent")
local PlayerStatsChanged = getOrCreateRemote("PlayerStatsChanged", "RemoteEvent")
local KillFeed = getOrCreateRemote("KillFeed", "RemoteEvent")
local CloneCountChanged = getOrCreateRemote("CloneCountChanged", "RemoteEvent")
local DisguiseEffect = getOrCreateRemote("DisguiseEffect", "RemoteEvent")

-- State
local currentState = "Lobby"
local playerClones: {[Player]: {Model}} = {}
local cloneHP: {[Model]: number} = {}
local cloneOwner: {[Model]: Player} = {}
local cloneTarget: {[Model]: Vector3?} = {} -- mark override
local playerHP: {[Player]: number} = {}
local playerScores: {[Player]: number} = {}
local matchEndTime = 0

local cooldowns: {[string]: {[Player]: number}} = {
	SpawnClone = {},
	Recall = {},
	Mark = {},
	Disguise = {},
	Punch = {},
}

local function postFeed(message: string, color: Color3?, duration: number?)
	PlayFeed:FireAllClients(message, color or Color3.fromRGB(255, 255, 255), duration)
end

local function broadcastState(state: string, payload: any?)
	currentState = state
	MatchStateChanged:FireAllClients(state, payload)
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

local function getCloneRoot(clone: Model): BasePart?
	return clone:FindFirstChild("HumanoidRootPart")
end

local function getCloneHumanoid(clone: Model): Humanoid?
	return clone:FindFirstChildOfClass("Humanoid")
end

local function sendStats(player: Player)
	local clones = playerClones[player] or {}
	local cloneHPs = {}
	for _, clone in clones do
		table.insert(cloneHPs, cloneHP[clone] or 0)
	end

	PlayerStatsChanged:FireClient(player, {
		hp = playerHP[player] or 0,
		maxHp = GameConfig.PLAYER_HP,
		score = playerScores[player] or 0,
		cloneCount = #clones,
		maxClones = GameConfig.MAX_CLONES,
		cloneHPs = cloneHPs,
	})
end

-- Create a clone of a player
local function createClone(player: Player): Model?
	local char = player.Character
	if not char then return nil end

	local clone = char:Clone()
	clone.Name = player.Name .. "_Clone"

	-- Remove scripts from clone
	for _, desc in clone:GetDescendants() do
		if desc:IsA("BaseScript") or desc:IsA("LocalScript") then
			desc:Destroy()
		end
	end

	-- Position near player
	local root = getRootPart(player)
	if root then
		local offset = Vector3.new(math.random(-5, 5), 0, math.random(-5, 5))
		local cloneRoot = clone:FindFirstChild("HumanoidRootPart")
		if cloneRoot then
			cloneRoot.CFrame = root.CFrame + offset
		end
	end

	-- Set clone attributes
	clone:SetAttribute("IsClone", true)
	clone:SetAttribute("OwnerName", player.Name)

	-- Make clone humanoid work
	local humanoid = clone:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.MaxHealth = GameConfig.CLONE_HP
		humanoid.Health = GameConfig.CLONE_HP
		humanoid.WalkSpeed = GameConfig.CLONE_SPEED
	end

	clone.Parent = workspace

	cloneHP[clone] = GameConfig.CLONE_HP
	cloneOwner[clone] = player

	return clone
end

-- Destroy a clone
local function destroyClone(clone: Model)
	local owner = cloneOwner[clone]
	if owner and playerClones[owner] then
		local clones = playerClones[owner]
		for i, c in clones do
			if c == clone then
				table.remove(clones, i)
				break
			end
		end
		CloneCountChanged:FireClient(owner, #playerClones[owner])
		sendStats(owner)
	end

	cloneHP[clone] = nil
	cloneOwner[clone] = nil
	cloneTarget[clone] = nil
	clone:Destroy()
end

-- Damage a clone
local function damageClone(clone: Model, amount: number, attacker: Player?)
	local hp = cloneHP[clone] or 0
	hp = math.max(0, hp - amount)
	cloneHP[clone] = hp

	local humanoid = getCloneHumanoid(clone)
	if humanoid then
		humanoid.Health = hp
	end

	if hp <= 0 then
		local owner = cloneOwner[clone]
		local ownerName = owner and owner.Name or "Unknown"

		if attacker then
			playerScores[attacker] = (playerScores[attacker] or 0) + GameConfig.POINTS_CLONE_KILL
			KillFeed:FireAllClients(
				string.format("Killed %s's CLONE! (+%d)", ownerName, GameConfig.POINTS_CLONE_KILL),
				attacker.Name,
				ownerName
			)
			sendStats(attacker)
		end

		destroyClone(clone)
	end
end

-- Damage a real player
local function damagePlayer(victim: Player, amount: number, attacker: Player?)
	if currentState ~= "Playing" then return end
	if not playerHP[victim] then return end

	playerHP[victim] = math.max(0, playerHP[victim] - amount)

	local humanoid = getHumanoid(victim)
	if humanoid then
		humanoid.Health = playerHP[victim]
	end

	if playerHP[victim] <= 0 then
		-- Real body died! All clones die too
		if attacker and attacker ~= victim then
			playerScores[attacker] = (playerScores[attacker] or 0) + GameConfig.POINTS_REAL_KILL
			KillFeed:FireAllClients(
				string.format("Killed %s! (REAL) (+%d)", victim.Name, GameConfig.POINTS_REAL_KILL),
				attacker.Name,
				victim.Name
			)
			postFeed(string.format("%s found and killed %s's REAL BODY!", attacker.Name, victim.Name), Color3.fromRGB(255, 80, 80), 3)
			sendStats(attacker)
		end

		-- Destroy all clones
		local clones = playerClones[victim] or {}
		for i = #clones, 1, -1 do
			destroyClone(clones[i])
		end
		playerClones[victim] = {}

		-- Respawn after delay
		task.delay(2, function()
			if victim.Parent == Players and currentState == "Playing" then
				victim:LoadCharacter()
				task.wait(0.5)
				playerHP[victim] = GameConfig.PLAYER_HP
				local h = getHumanoid(victim)
				if h then
					h.MaxHealth = GameConfig.PLAYER_HP
					h.Health = GameConfig.PLAYER_HP
					h.WalkSpeed = GameConfig.DEFAULT_WALK_SPEED
					h.JumpPower = GameConfig.DEFAULT_JUMP_POWER
				end
				sendStats(victim)
			end
		end)

		sendStats(victim)
	else
		sendStats(victim)
	end
end

-- Clone AI: chase and punch nearest enemy
local function updateCloneAI()
	for clone, owner in cloneOwner do
		if not clone.Parent then continue end
		if not owner or owner.Parent ~= Players then
			destroyClone(clone)
			continue
		end

		local cloneRoot = getCloneRoot(clone)
		if not cloneRoot then continue end

		local humanoid = getCloneHumanoid(clone)
		if not humanoid or humanoid.Health <= 0 then continue end

		-- If there's a mark target, move there first
		local markPos = cloneTarget[clone]
		if markPos then
			humanoid:MoveTo(markPos)
			if (cloneRoot.Position - markPos).Magnitude < 3 then
				cloneTarget[clone] = nil
			end
			continue
		end

		-- Find nearest enemy (player or clone from other team)
		local nearestTarget = nil
		local nearestDist = GameConfig.CLONE_CHASE_RANGE
		local nearestIsClone = false

		for _, otherPlayer in Players:GetPlayers() do
			if otherPlayer == owner then continue end

			-- Target the real player
			local otherRoot = getRootPart(otherPlayer)
			if otherRoot then
				local dist = (otherRoot.Position - cloneRoot.Position).Magnitude
				if dist < nearestDist then
					nearestDist = dist
					nearestTarget = otherRoot
					nearestIsClone = false
				end
			end

			-- Target enemy clones
			local otherClones = playerClones[otherPlayer] or {}
			for _, otherClone in otherClones do
				local otherCloneRoot = getCloneRoot(otherClone)
				if otherCloneRoot then
					local dist = (otherCloneRoot.Position - cloneRoot.Position).Magnitude
					if dist < nearestDist then
						nearestDist = dist
						nearestTarget = otherCloneRoot
						nearestIsClone = true
					end
				end
			end
		end

		if nearestTarget then
			humanoid:MoveTo(nearestTarget.Position)

			-- Attack if in range
			if nearestDist < GameConfig.CLONE_ATTACK_RANGE then
				-- Find who we're attacking
				if nearestIsClone then
					local targetClone = nearestTarget.Parent :: Model
					if targetClone and cloneHP[targetClone] then
						damageClone(targetClone, GameConfig.CLONE_DAMAGE, owner)
					end
				else
					-- Attacking a real player
					for _, otherPlayer in Players:GetPlayers() do
						if otherPlayer == owner then continue end
						local otherRoot = getRootPart(otherPlayer)
						if otherRoot == nearestTarget then
							damagePlayer(otherPlayer, GameConfig.CLONE_DAMAGE, owner)
							break
						end
					end
				end
			end
		end
	end
end

-- Spawn Clone handler
local function handleSpawnClone(player: Player)
	if currentState ~= "Playing" then return end

	local now = tick()
	if cooldowns.SpawnClone[player] and now < cooldowns.SpawnClone[player] then return end

	local clones = playerClones[player] or {}
	if #clones >= GameConfig.MAX_CLONES then return end

	cooldowns.SpawnClone[player] = now + GameConfig.CLONE_SPAWN_COOLDOWN
	ActionCooldown:FireClient(player, "SpawnClone", GameConfig.CLONE_SPAWN_COOLDOWN)

	local clone = createClone(player)
	if clone then
		if not playerClones[player] then
			playerClones[player] = {}
		end
		table.insert(playerClones[player], clone)
		CloneCountChanged:FireClient(player, #playerClones[player])
		sendStats(player)
	end
end

-- Recall handler
local function handleRecall(player: Player)
	if currentState ~= "Playing" then return end

	local now = tick()
	if cooldowns.Recall[player] and now < cooldowns.Recall[player] then return end
	cooldowns.Recall[player] = now + GameConfig.RECALL_COOLDOWN
	ActionCooldown:FireClient(player, "Recall", GameConfig.RECALL_COOLDOWN)

	local root = getRootPart(player)
	if not root then return end

	local clones = playerClones[player] or {}
	for _, clone in clones do
		local cloneRoot = getCloneRoot(clone)
		if cloneRoot then
			local offset = Vector3.new(math.random(-4, 4), 0, math.random(-4, 4))
			cloneRoot.CFrame = root.CFrame + offset
		end
		cloneTarget[clone] = nil
	end
end

-- Mark handler
local function handleMark(player: Player, position: Vector3?)
	if currentState ~= "Playing" then return end
	if not position then return end

	local now = tick()
	if cooldowns.Mark[player] and now < cooldowns.Mark[player] then return end
	cooldowns.Mark[player] = now + GameConfig.MARK_COOLDOWN
	ActionCooldown:FireClient(player, "Mark", GameConfig.MARK_COOLDOWN)

	local clones = playerClones[player] or {}
	for _, clone in clones do
		cloneTarget[clone] = position
	end
end

-- Disguise handler (swap position with a clone)
local function handleDisguise(player: Player)
	if currentState ~= "Playing" then return end

	local now = tick()
	if cooldowns.Disguise[player] and now < cooldowns.Disguise[player] then return end

	local clones = playerClones[player] or {}
	if #clones == 0 then return end

	cooldowns.Disguise[player] = now + GameConfig.DISGUISE_COOLDOWN
	ActionCooldown:FireClient(player, "Disguise", GameConfig.DISGUISE_COOLDOWN)

	-- Pick a random clone to swap with
	local swapClone = clones[math.random(1, #clones)]
	local root = getRootPart(player)
	local cloneRoot = getCloneRoot(swapClone)

	if root and cloneRoot then
		local playerCF = root.CFrame
		local cloneCF = cloneRoot.CFrame

		root.CFrame = cloneCF
		cloneRoot.CFrame = playerCF

		DisguiseEffect:FireAllClients(player.Name)
	end
end

-- Punch handler (player punch)
local function handlePunch(player: Player)
	if currentState ~= "Playing" then return end

	local now = tick()
	if cooldowns.Punch[player] and now < cooldowns.Punch[player] then return end
	cooldowns.Punch[player] = now + GameConfig.PUNCH_COOLDOWN
	ActionCooldown:FireClient(player, "Punch", GameConfig.PUNCH_COOLDOWN)

	local root = getRootPart(player)
	if not root then return end

	local origin = root.Position
	local lookDir = root.CFrame.LookVector

	-- Check all potential targets in range
	for _, other in Players:GetPlayers() do
		if other == player then continue end

		-- Hit real player
		local otherRoot = getRootPart(other)
		if otherRoot then
			local diff = otherRoot.Position - origin
			if diff.Magnitude < GameConfig.PUNCH_RANGE and lookDir:Dot(diff.Unit) > 0.3 then
				damagePlayer(other, GameConfig.PLAYER_DAMAGE, player)

				-- Knockback
				local knockDir = diff.Unit + Vector3.new(0, 0.2, 0)
				local bv = Instance.new("BodyVelocity")
				bv.Name = "PunchKnock"
				bv.MaxForce = Vector3.new(30000, 15000, 30000)
				bv.Velocity = knockDir * 30
				bv.Parent = otherRoot
				task.delay(0.2, function()
					if bv.Parent then bv:Destroy() end
				end)
			end
		end

		-- Hit enemy clones
		local otherClones = playerClones[other] or {}
		for _, otherClone in otherClones do
			local cr = getCloneRoot(otherClone)
			if cr then
				local diff = cr.Position - origin
				if diff.Magnitude < GameConfig.PUNCH_RANGE and lookDir:Dot(diff.Unit) > 0.3 then
					damageClone(otherClone, GameConfig.PLAYER_DAMAGE, player)
				end
			end
		end
	end
end

-- Win condition
local function getWinner(): Player?
	local bestPlayer = nil
	local bestScore = -1
	for _, player in Players:GetPlayers() do
		local score = playerScores[player] or 0
		if score > bestScore then
			bestScore = score
			bestPlayer = player
		end
	end
	return bestPlayer
end

-- Round state machine
local function resetMatch()
	-- Destroy all existing clones
	for _, clones in playerClones do
		for _, clone in clones do
			clone:Destroy()
		end
	end
	playerClones = {}
	cloneHP = {}
	cloneOwner = {}
	cloneTarget = {}
	playerHP = {}
	playerScores = {}
	cooldowns = { SpawnClone = {}, Recall = {}, Mark = {}, Disguise = {}, Punch = {} }

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

	return #Players:GetPlayers() >= GameConfig.MIN_PLAYERS
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
	matchEndTime = tick() + GameConfig.MATCH_DURATION

	for _, player in Players:GetPlayers() do
		playerHP[player] = GameConfig.PLAYER_HP
		playerScores[player] = 0
		playerClones[player] = {}

		local humanoid = getHumanoid(player)
		if humanoid then
			humanoid.MaxHealth = GameConfig.PLAYER_HP
			humanoid.Health = GameConfig.PLAYER_HP
			humanoid.WalkSpeed = GameConfig.DEFAULT_WALK_SPEED
			humanoid.JumpPower = GameConfig.DEFAULT_JUMP_POWER
		end

		sendStats(player)
	end

	broadcastState("Playing", { remaining = GameConfig.MATCH_DURATION })
	postFeed("FIGHT! Spawn clones with Q, find the REAL enemy!", Color3.fromRGB(255, 255, 100), 3)

	local aiTickTime = 0

	local heartbeatConn
	heartbeatConn = RunService.Heartbeat:Connect(function()
		if currentState ~= "Playing" then
			heartbeatConn:Disconnect()
			return
		end

		-- Clone AI ticks every 0.5s
		if tick() > aiTickTime + 0.5 then
			aiTickTime = tick()
			updateCloneAI()
		end
	end)

	while currentState == "Playing" do
		task.wait(0.5)

		local remaining = matchEndTime - tick()
		broadcastState("Playing", { remaining = math.max(0, math.ceil(remaining)) })

		if remaining <= 0 then
			heartbeatConn:Disconnect()
			return getWinner()
		end
	end

	heartbeatConn:Disconnect()
	return getWinner()
end

local function showResult(winner: Player?)
	local winnerName = winner and winner.Name or "Nobody"
	local score = winner and (playerScores[winner] or 0) or 0
	broadcastState("Result", { winner = winnerName, score = score })
	postFeed(string.format("%s wins with %d points!", winnerName, score), Color3.fromRGB(255, 236, 120), 4)

	task.wait(GameConfig.RESULT_DURATION)
end

-- Input handlers
SpawnCloneRequest.OnServerEvent:Connect(function(player)
	handleSpawnClone(player)
end)

RecallClonesRequest.OnServerEvent:Connect(function(player)
	handleRecall(player)
end)

MarkRequest.OnServerEvent:Connect(function(player, position)
	if typeof(position) == "Vector3" then
		handleMark(player, position)
	end
end)

DisguiseRequest.OnServerEvent:Connect(function(player)
	handleDisguise(player)
end)

PunchRequest.OnServerEvent:Connect(function(player)
	handlePunch(player)
end)

-- Player cleanup
Players.PlayerRemoving:Connect(function(player)
	-- Destroy all clones
	local clones = playerClones[player] or {}
	for i = #clones, 1, -1 do
		destroyClone(clones[i])
	end
	playerClones[player] = nil
	playerHP[player] = nil
	playerScores[player] = nil
	for _, cd in cooldowns do
		cd[player] = nil
	end
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
