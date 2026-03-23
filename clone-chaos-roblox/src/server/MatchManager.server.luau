-- MatchManager
-- Clone Chaos: spawn AI clones, disguise swaps, find the real player
-- POLISHED: clone behavior modes, fake death, clone explosion, visual deception,
--           "Was it real?" popup, enhanced kill feed

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
local CloneModeRequest = getOrCreateRemote("CloneModeRequest", "RemoteEvent")
local CloneExplodeRequest = getOrCreateRemote("CloneExplodeRequest", "RemoteEvent")
local WasItReal = getOrCreateRemote("WasItReal", "RemoteEvent")
local DeceptionStat = getOrCreateRemote("DeceptionStat", "RemoteEvent")

-- State
local currentState = "Lobby"
local playerClones: {[Player]: {Model}} = {}
local cloneHP: {[Model]: number} = {}
local cloneOwner: {[Model]: Player} = {}
local cloneTarget: {[Model]: Vector3?} = {}
local cloneMode: {[Model]: string} = {} -- "AGGRESSIVE" | "DEFENSIVE" | "DECOY"
local playerHP: {[Player]: number} = {}
local playerScores: {[Player]: number} = {}
local playerCloneMode: {[Player]: string} = {} -- selected mode for next spawn
local playerFakeDeathUsed: {[Player]: boolean} = {} -- once per life
local playerEnemiesFooled: {[Player]: number} = {} -- deception stat
local matchEndTime = 0

local cooldowns: {[string]: {[Player]: number}} = {
	SpawnClone = {},
	Recall = {},
	Mark = {},
	Disguise = {},
	Punch = {},
	CloneExplode = {},
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
		cloneMode = playerCloneMode[player] or "AGGRESSIVE",
		enemiesFooled = playerEnemiesFooled[player] or 0,
	})
end

-- Create a clone of a player
local function createClone(player: Player, mode: string?): Model?
	local char = player.Character
	if not char then return nil end

	local clone = char:Clone()
	-- Visual deception: clone has IDENTICAL name to player
	clone.Name = player.Name

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

	-- Set clone attributes (hidden from other players - only server uses these)
	clone:SetAttribute("IsClone", true)
	clone:SetAttribute("OwnerName", player.Name)
	clone:SetAttribute("CloneMode", mode or "AGGRESSIVE")

	-- Make the nametag show the player's real name for deception
	local humanoid = clone:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.MaxHealth = GameConfig.CLONE_HP
		humanoid.Health = GameConfig.CLONE_HP
		humanoid.WalkSpeed = GameConfig.CLONE_SPEED
		humanoid.DisplayName = player.DisplayName
	end

	clone.Parent = workspace

	local selectedMode = mode or playerCloneMode[player] or "AGGRESSIVE"
	cloneHP[clone] = GameConfig.CLONE_HP
	cloneOwner[clone] = player
	cloneMode[clone] = selectedMode

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
	cloneMode[clone] = nil
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
			-- Enhanced kill feed: distinguish clone kills
			KillFeed:FireAllClients(
				string.format("%s killed %s's CLONE! (+%d)", attacker.Name, ownerName, GameConfig.POINTS_CLONE_KILL),
				attacker.Name,
				ownerName
			)
			sendStats(attacker)

			-- "Was it real?" popup to the killer
			WasItReal:FireClient(attacker)

			-- Track deception stat for clone owner
			if owner then
				playerEnemiesFooled[owner] = (playerEnemiesFooled[owner] or 0) + 1
				DeceptionStat:FireClient(owner, playerEnemiesFooled[owner])
			end
		end

		destroyClone(clone)
	end
end

-- Find nearest clone to a player
local function findNearestClone(player: Player): Model?
	local root = getRootPart(player)
	if not root then return nil end

	local clones = playerClones[player] or {}
	local nearest = nil
	local nearestDist = math.huge

	for _, clone in clones do
		local cr = getCloneRoot(clone)
		if cr then
			local dist = (cr.Position - root.Position).Magnitude
			if dist < nearestDist then
				nearestDist = dist
				nearest = clone
			end
		end
	end

	return nearest
end

-- Fake Death: swap with nearest clone instead of dying
local function tryFakeDeath(victim: Player): boolean
	if playerFakeDeathUsed[victim] then
		return false
	end

	-- 30% chance
	if math.random() > 0.3 then
		return false
	end

	local nearestClone = findNearestClone(victim)
	if not nearestClone then
		return false
	end

	local root = getRootPart(victim)
	local cloneRoot = getCloneRoot(nearestClone)
	if not root or not cloneRoot then
		return false
	end

	-- Swap positions
	local playerCF = root.CFrame
	local cloneCF = cloneRoot.CFrame
	root.CFrame = cloneCF
	cloneRoot.CFrame = playerCF

	-- Destroy the clone (it "dies" in place of the player)
	destroyClone(nearestClone)

	-- Restore some HP
	playerHP[victim] = math.max(1, math.floor(GameConfig.PLAYER_HP * 0.3))
	local h = getHumanoid(victim)
	if h then
		h.Health = playerHP[victim]
	end

	playerFakeDeathUsed[victim] = true

	postFeed(string.format("%s used FAKE DEATH!", victim.Name), Color3.fromRGB(180, 120, 255), 2)
	DisguiseEffect:FireAllClients(victim.Name)
	sendStats(victim)

	return true
end

-- Clone Explosion: sacrifice a clone for AoE damage
local function handleCloneExplode(player: Player)
	if currentState ~= "Playing" then return end

	local now = tick()
	if cooldowns.CloneExplode[player] and now < cooldowns.CloneExplode[player] then return end

	local root = getRootPart(player)
	if not root then return end

	-- Find nearest clone within 10 studs
	local nearest = findNearestClone(player)
	if not nearest then return end

	local cr = getCloneRoot(nearest)
	if not cr then return end

	local dist = (cr.Position - root.Position).Magnitude
	if dist > 10 then return end

	cooldowns.CloneExplode[player] = now + 2 -- 2 second cooldown
	ActionCooldown:FireClient(player, "CloneExplode", 2)

	local explosionPos = cr.Position

	-- Destroy the clone
	destroyClone(nearest)

	-- Create explosion visual
	local explosion = Instance.new("Part")
	explosion.Name = "CloneExplosion"
	explosion.Shape = Enum.PartType.Ball
	explosion.Size = Vector3.new(2, 2, 2)
	explosion.CFrame = CFrame.new(explosionPos)
	explosion.Anchored = true
	explosion.CanCollide = false
	explosion.CanTouch = false
	explosion.Material = Enum.Material.Neon
	explosion.Color = Color3.fromRGB(180, 120, 255)
	explosion.Transparency = 0.2
	explosion.Parent = workspace

	-- Expand and fade
	task.spawn(function()
		for i = 1, 8 do
			explosion.Size = Vector3.new(2 + i * 2, 2 + i * 2, 2 + i * 2)
			explosion.Transparency = 0.2 + (i / 8) * 0.8
			task.wait(0.04)
		end
		explosion:Destroy()
	end)

	-- Deal AoE damage (15 damage in 8 stud radius)
	for _, other in Players:GetPlayers() do
		if other == player then continue end
		if not playerHP[other] or playerHP[other] <= 0 then continue end

		local otherRoot = getRootPart(other)
		if not otherRoot then continue end

		local aoeRange = (otherRoot.Position - explosionPos).Magnitude
		if aoeRange <= 8 then
			-- Damage real player
			local damageToDeal = 15
			playerHP[other] = math.max(0, playerHP[other] - damageToDeal)
			local h = getHumanoid(other)
			if h then
				h.Health = playerHP[other]
			end

			-- Knockback
			local knockDir = (otherRoot.Position - explosionPos).Unit + Vector3.new(0, 0.3, 0)
			local bv = Instance.new("BodyVelocity")
			bv.Name = "ExplosionKnock"
			bv.MaxForce = Vector3.new(30000, 15000, 30000)
			bv.Velocity = knockDir * 35
			bv.Parent = otherRoot
			task.delay(0.25, function()
				if bv.Parent then bv:Destroy() end
			end)

			sendStats(other)

			if playerHP[other] <= 0 then
				playerScores[player] = (playerScores[player] or 0) + GameConfig.POINTS_REAL_KILL
				KillFeed:FireAllClients(
					string.format("%s killed %s with CLONE EXPLOSION! (REAL BODY) (+%d)", player.Name, other.Name, GameConfig.POINTS_REAL_KILL),
					player.Name,
					other.Name
				)
				postFeed(string.format("CLONE EXPLOSION killed %s!", other.Name), Color3.fromRGB(255, 80, 255), 3)
				sendStats(player)

				-- Respawn
				task.delay(2, function()
					if other.Parent == Players and currentState == "Playing" then
						other:LoadCharacter()
						task.wait(0.5)
						playerHP[other] = GameConfig.PLAYER_HP
						playerFakeDeathUsed[other] = false
						local hum = getHumanoid(other)
						if hum then
							hum.MaxHealth = GameConfig.PLAYER_HP
							hum.Health = GameConfig.PLAYER_HP
							hum.WalkSpeed = GameConfig.DEFAULT_WALK_SPEED
							hum.JumpPower = GameConfig.DEFAULT_JUMP_POWER
						end
						sendStats(other)
					end
				end)
			end
		end

		-- Also damage enemy clones in range
		local otherClones = playerClones[other] or {}
		for _, otherClone in otherClones do
			local ocr = getCloneRoot(otherClone)
			if ocr and (ocr.Position - explosionPos).Magnitude <= 8 then
				damageClone(otherClone, 15, player)
			end
		end
	end

	postFeed(string.format("%s detonated a CLONE EXPLOSION!", player.Name), Color3.fromRGB(180, 120, 255), 2)
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
		-- Check for Fake Death
		if tryFakeDeath(victim) then
			return
		end

		-- Real body died! All clones die too
		if attacker and attacker ~= victim then
			playerScores[attacker] = (playerScores[attacker] or 0) + GameConfig.POINTS_REAL_KILL
			KillFeed:FireAllClients(
				string.format("%s killed %s! (REAL BODY) (+%d)", attacker.Name, victim.Name, GameConfig.POINTS_REAL_KILL),
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
				playerFakeDeathUsed[victim] = false -- Reset fake death on respawn
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

-- Clone AI: behavior depends on mode
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

		local mode = cloneMode[clone] or "AGGRESSIVE"

		-- If there's a mark target, move there first (overrides mode)
		local markPos = cloneTarget[clone]
		if markPos then
			humanoid:MoveTo(markPos)
			if (cloneRoot.Position - markPos).Magnitude < 3 then
				cloneTarget[clone] = nil
			end
			continue
		end

		-- DECOY mode: run in a random direction, mimicking a fleeing player
		if mode == "DECOY" then
			-- Pick a new target every so often
			if not clone:GetAttribute("DecoyTarget") or math.random() < 0.02 then
				local randomDir = Vector3.new(math.random() - 0.5, 0, math.random() - 0.5).Unit * 30
				local target = cloneRoot.Position + randomDir
				clone:SetAttribute("DecoyTarget", true)
				humanoid:MoveTo(target)
			end
			continue
		end

		-- DEFENSIVE mode: patrol near owner, attack anyone who gets close
		if mode == "DEFENSIVE" then
			local ownerRoot = getRootPart(owner)
			if ownerRoot then
				local distToOwner = (cloneRoot.Position - ownerRoot.Position).Magnitude

				-- Stay near owner (within 12 studs)
				if distToOwner > 12 then
					humanoid:MoveTo(ownerRoot.Position + Vector3.new(math.random(-4, 4), 0, math.random(-4, 4)))
					continue
				end

				-- Attack anyone who gets close to owner
				local nearestTarget = nil
				local nearestDist = 10 -- only attack within 10 studs of clone

				for _, otherPlayer in Players:GetPlayers() do
					if otherPlayer == owner then continue end

					local otherRoot = getRootPart(otherPlayer)
					if otherRoot then
						local dist = (otherRoot.Position - cloneRoot.Position).Magnitude
						if dist < nearestDist then
							nearestDist = dist
							nearestTarget = otherRoot
						end
					end
				end

				if nearestTarget then
					humanoid:MoveTo(nearestTarget.Position)
					if nearestDist < GameConfig.CLONE_ATTACK_RANGE then
						for _, otherPlayer in Players:GetPlayers() do
							if otherPlayer == owner then continue end
							local otherRoot = getRootPart(otherPlayer)
							if otherRoot == nearestTarget then
								damagePlayer(otherPlayer, GameConfig.CLONE_DAMAGE, owner)
								break
							end
						end
					end
				else
					-- Patrol around owner
					if math.random() < 0.03 then
						humanoid:MoveTo(ownerRoot.Position + Vector3.new(math.random(-6, 6), 0, math.random(-6, 6)))
					end
				end
			end
			continue
		end

		-- AGGRESSIVE mode (default): chase nearest enemy
		local nearestTarget = nil
		local nearestDist = GameConfig.CLONE_CHASE_RANGE
		local nearestIsClone = false

		for _, otherPlayer in Players:GetPlayers() do
			if otherPlayer == owner then continue end

			local otherRoot = getRootPart(otherPlayer)
			if otherRoot then
				local dist = (otherRoot.Position - cloneRoot.Position).Magnitude
				if dist < nearestDist then
					nearestDist = dist
					nearestTarget = otherRoot
					nearestIsClone = false
				end
			end

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

			if nearestDist < GameConfig.CLONE_ATTACK_RANGE then
				if nearestIsClone then
					local targetClone = nearestTarget.Parent :: Model
					if targetClone and cloneHP[targetClone] then
						damageClone(targetClone, GameConfig.CLONE_DAMAGE, owner)
					end
				else
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

	local selectedMode = playerCloneMode[player] or "AGGRESSIVE"
	local clone = createClone(player, selectedMode)
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

	for _, other in Players:GetPlayers() do
		if other == player then continue end

		-- Hit real player
		local otherRoot = getRootPart(other)
		if otherRoot then
			local diff = otherRoot.Position - origin
			if diff.Magnitude < GameConfig.PUNCH_RANGE and lookDir:Dot(diff.Unit) > 0.3 then
				damagePlayer(other, GameConfig.PLAYER_DAMAGE, player)

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

-- Clone mode change handler
local function handleCloneModeChange(player: Player, mode: string)
	if mode ~= "AGGRESSIVE" and mode ~= "DEFENSIVE" and mode ~= "DECOY" then
		return
	end
	playerCloneMode[player] = mode

	-- Also update existing clones' modes
	local clones = playerClones[player] or {}
	for _, clone in clones do
		cloneMode[clone] = mode
		clone:SetAttribute("CloneMode", mode)
	end

	sendStats(player)
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
	for _, clones in playerClones do
		for _, clone in clones do
			clone:Destroy()
		end
	end
	playerClones = {}
	cloneHP = {}
	cloneOwner = {}
	cloneTarget = {}
	cloneMode = {}
	playerHP = {}
	playerScores = {}
	playerCloneMode = {}
	playerFakeDeathUsed = {}
	playerEnemiesFooled = {}
	cooldowns = { SpawnClone = {}, Recall = {}, Mark = {}, Disguise = {}, Punch = {}, CloneExplode = {} }

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
		playerCloneMode[player] = "AGGRESSIVE"
		playerFakeDeathUsed[player] = false
		playerEnemiesFooled[player] = 0

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
	postFeed("FIGHT! Spawn clones with Q, find the REAL enemy! Double-press G near clone to EXPLODE it!", Color3.fromRGB(255, 255, 100), 4)

	local aiTickTime = 0

	local heartbeatConn
	heartbeatConn = RunService.Heartbeat:Connect(function()
		if currentState ~= "Playing" then
			heartbeatConn:Disconnect()
			return
		end

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

CloneModeRequest.OnServerEvent:Connect(function(player, mode)
	if typeof(mode) == "string" then
		handleCloneModeChange(player, mode)
	end
end)

CloneExplodeRequest.OnServerEvent:Connect(function(player)
	handleCloneExplode(player)
end)

-- Player cleanup
Players.PlayerRemoving:Connect(function(player)
	local clones = playerClones[player] or {}
	for i = #clones, 1, -1 do
		destroyClone(clones[i])
	end
	playerClones[player] = nil
	playerHP[player] = nil
	playerScores[player] = nil
	playerCloneMode[player] = nil
	playerFakeDeathUsed[player] = nil
	playerEnemiesFooled[player] = nil
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
