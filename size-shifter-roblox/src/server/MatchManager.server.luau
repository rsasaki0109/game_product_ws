-- MatchManager
-- Size Shifter: size-based PvP with giant/normal/tiny combat
-- POLISHED: size shockwaves, environmental destruction, size combos,
--           tiny secret passages, camera zoom events

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
local SizeChange = getOrCreateRemote("SizeChange", "RemoteEvent")
local PunchRequest = getOrCreateRemote("PunchRequest", "RemoteEvent")
local StompRequest = getOrCreateRemote("StompRequest", "RemoteEvent")
local DashRequest = getOrCreateRemote("DashRequest", "RemoteEvent")
local HitFeedback = getOrCreateRemote("HitFeedback", "RemoteEvent")
local ActionCooldown = getOrCreateRemote("ActionCooldown", "RemoteEvent")
local PlayerStatsChanged = getOrCreateRemote("PlayerStatsChanged", "RemoteEvent")
local KillFeed = getOrCreateRemote("KillFeed", "RemoteEvent")
local ComboUpdate = getOrCreateRemote("ComboUpdate", "RemoteEvent")
local CameraZoom = getOrCreateRemote("CameraZoom", "RemoteEvent")
local Shockwave = getOrCreateRemote("Shockwave", "RemoteEvent")

-- State
local currentState = "Lobby"
local playerSize: {[Player]: string} = {}
local playerHP: {[Player]: number} = {}
local playerLives: {[Player]: number} = {}
local playerKills: {[Player]: number} = {}
local playerDeaths: {[Player]: number} = {}
local matchEndTime = 0

-- Combo tracking
local playerComboData: {[Player]: {
	davidKills: number, -- tiny kills of giants (this life)
	titanKills: number, -- giant kills of tinies without size change (this life)
	sizeChangedSinceTitan: boolean,
}} = {}

local cooldowns: {[string]: {[Player]: number}} = {
	Punch = {},
	Stomp = {},
	Dash = {},
	SizeChange = {},
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

local function sendStats(player: Player)
	local combo = playerComboData[player]
	PlayerStatsChanged:FireClient(player, {
		size = playerSize[player] or "normal",
		hp = playerHP[player] or 0,
		maxHp = GameConfig.Sizes[playerSize[player] or "normal"].hp,
		lives = playerLives[player] or 0,
		kills = playerKills[player] or 0,
		deaths = playerDeaths[player] or 0,
		davidProgress = combo and combo.davidKills or 0,
		titanProgress = combo and combo.titanKills or 0,
	})
end

local function sendStatsToAll()
	for _, player in Players:GetPlayers() do
		sendStats(player)
	end
end

-- Size Momentum Shockwave
local function createShockwave(position: Vector3, radius: number, force: number, player: Player, goingGiant: boolean)
	-- Visual effect notification
	Shockwave:FireAllClients(position, radius, goingGiant)

	-- Create expanding ring visual
	local ring = Instance.new("Part")
	ring.Name = "ShockwaveRing"
	ring.Shape = Enum.PartType.Cylinder
	ring.Size = Vector3.new(0.5, 2, 2)
	ring.CFrame = CFrame.new(position) * CFrame.Angles(0, 0, math.rad(90))
	ring.Anchored = true
	ring.CanCollide = false
	ring.CanTouch = false
	ring.Material = Enum.Material.Neon
	ring.Color = goingGiant and Color3.fromRGB(255, 80, 40) or Color3.fromRGB(80, 200, 255)
	ring.Transparency = 0.3
	ring.Parent = workspace

	task.spawn(function()
		for i = 1, 10 do
			local scale = radius * (i / 10) * 2
			ring.Size = Vector3.new(0.5, scale, scale)
			ring.Transparency = 0.3 + (i / 10) * 0.7
			task.wait(0.04)
		end
		ring:Destroy()
	end)

	-- Apply force to nearby players
	for _, other in Players:GetPlayers() do
		if other == player then continue end
		if not playerLives[other] or playerLives[other] <= 0 then continue end

		local otherRoot = getRootPart(other)
		if not otherRoot then continue end

		local diff = otherRoot.Position - position
		local dist = diff.Magnitude
		if dist > radius then continue end

		if goingGiant then
			-- Push away
			local pushDir = diff.Unit + Vector3.new(0, 0.3, 0)
			local bv = Instance.new("BodyVelocity")
			bv.Name = "ShockPush"
			bv.MaxForce = Vector3.new(40000, 20000, 40000)
			bv.Velocity = pushDir * force
			bv.Parent = otherRoot
			task.delay(0.3, function()
				if bv.Parent then bv:Destroy() end
			end)
		else
			-- Magnetic pull (going tiny near giant) -- only if other is giant
			if playerSize[other] == "giant" then
				local pullDir = -diff.Unit
				local bv = Instance.new("BodyVelocity")
				bv.Name = "ShockPull"
				bv.MaxForce = Vector3.new(20000, 10000, 20000)
				bv.Velocity = pullDir * 15
				bv.Parent = otherRoot
				task.delay(0.5, function()
					if bv.Parent then bv:Destroy() end
				end)
			end
		end
	end
end

-- Environmental destruction: giants break breakable platforms
local function breakNearbyPlatforms(position: Vector3, radius: number)
	local arena = workspace:FindFirstChild("SizeShifterArena")
	if not arena then return end

	for _, child in arena:GetChildren() do
		if child:GetAttribute("Breakable") and child:IsA("BasePart") and child.Parent then
			local dist = (child.Position - position).Magnitude
			if dist < radius then
				local hp = child:GetAttribute("HP") or 0
				hp -= 30
				if hp <= 0 then
					-- Store original data for rebuild
					local origPos = child.CFrame
					local origSize = child.Size
					local origColor = Color3.fromRGB(180, 100, 80)

					-- Destruction effect
					child.Color = Color3.fromRGB(255, 80, 40)
					child.Material = Enum.Material.Neon
					task.delay(0.2, function()
						if child.Parent then
							child.Transparency = 1
							child.CanCollide = false
						end
					end)

					postFeed("A platform was SMASHED!", Color3.fromRGB(255, 180, 80), 1.5)

					-- Rebuild after 5 seconds
					task.delay(5, function()
						if child.Parent then
							child.Transparency = 0
							child.CanCollide = true
							child.Color = origColor
							child.Material = Enum.Material.Brick
							child:SetAttribute("HP", 60)
							child.CFrame = origPos
							child.Size = origSize
						end
					end)
				else
					child:SetAttribute("HP", hp)
					child.Color = Color3.fromRGB(180 + (60 - hp), 100, 80)
				end
			end
		end
	end
end

-- Heal pickup check for tiny players in tunnels
local function checkTinyTunnelHealing()
	local arena = workspace:FindFirstChild("SizeShifterArena")
	if not arena then return end

	for _, tinyPlayer in Players:GetPlayers() do
		if playerSize[tinyPlayer] ~= "tiny" then continue end
		if not playerLives[tinyPlayer] or playerLives[tinyPlayer] <= 0 then continue end

		local root = getRootPart(tinyPlayer)
		if not root then continue end

		-- Check if near health pickups
		for _, child in arena:GetChildren() do
			if child:GetAttribute("HealthPickup") and child:IsA("BasePart") and child.Transparency < 0.5 then
				local dist = (child.Position - root.Position).Magnitude
				if dist < 4 then
					-- Heal the tiny player
					local maxHp = GameConfig.Sizes.tiny.hp
					local healAmount = 10
					playerHP[tinyPlayer] = math.min(maxHp, (playerHP[tinyPlayer] or 0) + healAmount)
					local h = getHumanoid(tinyPlayer)
					if h then
						h.Health = playerHP[tinyPlayer]
					end

					-- Fade the pickup temporarily
					child.Transparency = 0.8
					child.CanCollide = false
					task.delay(8, function()
						if child.Parent then
							child.Transparency = 0.3
							child.CanCollide = false -- pickups are never collidable
						end
					end)

					sendStats(tinyPlayer)
					break
				end
			end
		end
	end
end

-- Apply size to a player's character
local function applySize(player: Player, sizeName: string)
	local sizeConfig = GameConfig.Sizes[sizeName]
	if not sizeConfig then return end

	local oldSize = playerSize[player]
	playerSize[player] = sizeName

	local char = player.Character
	if not char then return end
	local humanoid = char:FindFirstChildOfClass("Humanoid")
	if not humanoid then return end

	local function setScale(scaleName: string, value: number)
		local scaleVal = humanoid:FindFirstChild(scaleName)
		if scaleVal and scaleVal:IsA("NumberValue") then
			scaleVal.Value = value
		end
	end

	setScale("BodyHeightScale", sizeConfig.scale)
	setScale("BodyWidthScale", sizeConfig.scale)
	setScale("BodyDepthScale", sizeConfig.scale)
	setScale("HeadScale", sizeConfig.scale)

	humanoid.WalkSpeed = sizeConfig.speed
	humanoid.JumpPower = sizeConfig.jumpPower
	humanoid.MaxHealth = sizeConfig.hp

	local oldMax = humanoid.MaxHealth
	if playerHP[player] then
		local ratio = playerHP[player] / math.max(1, oldMax)
		playerHP[player] = math.ceil(ratio * sizeConfig.hp)
	else
		playerHP[player] = sizeConfig.hp
	end
	humanoid.Health = playerHP[player]

	-- Visual highlight based on size
	local highlight = char:FindFirstChild("SizeHighlight")
	if not highlight then
		highlight = Instance.new("Highlight")
		highlight.Name = "SizeHighlight"
		highlight.FillTransparency = 0.7
		highlight.OutlineTransparency = 0.4
		highlight.Parent = char
	end

	if sizeName == "giant" then
		highlight.FillColor = Color3.fromRGB(255, 80, 40)
		highlight.OutlineColor = Color3.fromRGB(255, 120, 60)
	elseif sizeName == "tiny" then
		highlight.FillColor = Color3.fromRGB(80, 200, 255)
		highlight.OutlineColor = Color3.fromRGB(120, 220, 255)
	else
		highlight.FillColor = Color3.fromRGB(180, 180, 180)
		highlight.OutlineColor = Color3.fromRGB(220, 220, 220)
	end

	-- Size Momentum Shockwave when changing size while moving
	local root = getRootPart(player)
	if root and oldSize and oldSize ~= sizeName then
		local velocity = root.AssemblyLinearVelocity
		local speed = Vector3.new(velocity.X, 0, velocity.Z).Magnitude

		if speed > 3 then
			if sizeName == "giant" then
				-- Going GIANT: push nearby players away
				createShockwave(root.Position, 8, 30, player, true)
			elseif sizeName == "tiny" and oldSize ~= "tiny" then
				-- Going TINY: magnetic pull on nearby giants
				createShockwave(root.Position, 8, 15, player, false)
			end
		end

		-- Track combo: reset titan kills if size changed from giant
		local combo = playerComboData[player]
		if combo and oldSize == "giant" and sizeName ~= "giant" then
			combo.sizeChangedSinceTitan = true
			combo.titanKills = 0
		end
	end

	-- Camera zoom event
	CameraZoom:FireClient(player, sizeName)

	SizeChange:FireAllClients(player.Name, sizeName)
	sendStats(player)
end

-- Damage a player
local function damagePlayer(victim: Player, amount: number, attacker: Player?, deathMessage: string?)
	if currentState ~= "Playing" then return end
	if not playerHP[victim] then return end
	if playerLives[victim] and playerLives[victim] <= 0 then return end

	playerHP[victim] = math.max(0, playerHP[victim] - amount)

	local humanoid = getHumanoid(victim)
	if humanoid then
		humanoid.Health = playerHP[victim]
	end

	HitFeedback:FireClient(victim, amount)

	if playerHP[victim] <= 0 then
		-- Death
		playerLives[victim] = (playerLives[victim] or 1) - 1
		playerDeaths[victim] = (playerDeaths[victim] or 0) + 1

		if attacker and attacker ~= victim then
			playerKills[attacker] = (playerKills[attacker] or 0) + 1

			-- Combo tracking
			local attackerSize = playerSize[attacker] or "normal"
			local victimSize = playerSize[victim] or "normal"
			local combo = playerComboData[attacker]

			if combo then
				-- DAVID'S REVENGE: kill giants as tiny
				if attackerSize == "tiny" and victimSize == "giant" then
					combo.davidKills += 1
					if combo.davidKills >= 2 then
						-- Bonus!
						playerKills[attacker] = (playerKills[attacker] or 0) + 5 -- bonus points via extra kills value
						postFeed(string.format("%s: DAVID'S REVENGE! (+5 bonus)", attacker.Name), Color3.fromRGB(80, 200, 255), 3)
						ComboUpdate:FireClient(attacker, "DAVID'S REVENGE", Color3.fromRGB(80, 200, 255))

						-- Speed buff for 5 seconds
						local h = getHumanoid(attacker)
						if h then
							h.WalkSpeed = GameConfig.Sizes.tiny.speed + 10
							task.delay(5, function()
								if playerSize[attacker] == "tiny" then
									local hum = getHumanoid(attacker)
									if hum then
										hum.WalkSpeed = GameConfig.Sizes.tiny.speed
									end
								end
							end)
						end

						combo.davidKills = 0
					else
						ComboUpdate:FireClient(attacker, string.format("DAVID'S REVENGE: %d/2", combo.davidKills), Color3.fromRGB(80, 200, 255))
					end
				end

				-- TITAN RAGE: kill tinies as giant without changing size
				if attackerSize == "giant" and victimSize == "tiny" and not combo.sizeChangedSinceTitan then
					combo.titanKills += 1
					if combo.titanKills >= 3 then
						playerKills[attacker] = (playerKills[attacker] or 0) + 5
						postFeed(string.format("%s: TITAN RAGE! (+5 bonus + HP regen)", attacker.Name), Color3.fromRGB(255, 80, 40), 3)
						ComboUpdate:FireClient(attacker, "TITAN RAGE!", Color3.fromRGB(255, 80, 40))

						-- HP regen for 5 seconds
						task.spawn(function()
							for _ = 1, 10 do
								if playerSize[attacker] == "giant" and playerHP[attacker] then
									local maxHp = GameConfig.Sizes.giant.hp
									playerHP[attacker] = math.min(maxHp, playerHP[attacker] + 5)
									local hum = getHumanoid(attacker)
									if hum then
										hum.Health = playerHP[attacker]
									end
									sendStats(attacker)
								end
								task.wait(0.5)
							end
						end)

						combo.titanKills = 0
					else
						ComboUpdate:FireClient(attacker, string.format("TITAN RAGE: %d/3", combo.titanKills), Color3.fromRGB(255, 80, 40))
					end
				end
			end

			sendStats(attacker)

			local msg = deathMessage or string.format("%s eliminated %s!", attacker.Name, victim.Name)
			KillFeed:FireAllClients(msg, attacker.Name, victim.Name)
			postFeed(msg, Color3.fromRGB(255, 100, 100), 2)
		end

		if playerLives[victim] > 0 then
			task.delay(1.5, function()
				if victim and victim.Parent == Players then
					local h = getHumanoid(victim)
					if h then h.Health = 0 end
					task.wait(0.5)
					victim:LoadCharacter()
					task.wait(0.5)
					applySize(victim, "normal")
					playerHP[victim] = GameConfig.Sizes.normal.hp
					-- Reset combo data on death
					playerComboData[victim] = {
						davidKills = 0,
						titanKills = 0,
						sizeChangedSinceTitan = false,
					}
					sendStats(victim)
				end
			end)
		else
			postFeed(string.format("%s is OUT! (0 lives)", victim.Name), Color3.fromRGB(255, 60, 60), 3)
			if humanoid then
				humanoid.Health = 0
			end
		end

		sendStats(victim)
	else
		sendStats(victim)
	end
end

-- Punch handler
local function handlePunch(player: Player)
	if currentState ~= "Playing" then return end
	if not playerLives[player] or playerLives[player] <= 0 then return end

	local now = tick()
	if cooldowns.Punch[player] and now < cooldowns.Punch[player] then return end
	cooldowns.Punch[player] = now + GameConfig.PUNCH_COOLDOWN
	ActionCooldown:FireClient(player, "Punch", GameConfig.PUNCH_COOLDOWN)

	local root = getRootPart(player)
	if not root then return end

	local mySize = playerSize[player] or "normal"
	local sizeConfig = GameConfig.Sizes[mySize]
	local origin = root.Position
	local lookDir = root.CFrame.LookVector

	for _, other in Players:GetPlayers() do
		if other == player then continue end
		if not playerLives[other] or playerLives[other] <= 0 then continue end

		local otherRoot = getRootPart(other)
		if not otherRoot then continue end

		local diff = otherRoot.Position - origin
		local dist = diff.Magnitude

		if dist > sizeConfig.punchRange then continue end

		local dot = lookDir:Dot(diff.Unit)
		if dot < 0.3 then continue end

		local otherSize = playerSize[other] or "normal"
		local damage = sizeConfig.damage

		if mySize == "giant" and otherSize == "tiny" then
			damagePlayer(other, 9999, player, string.format("%s SQUISHED %s!", player.Name, other.Name))
		else
			damagePlayer(other, damage, player)

			local knockDir = diff.Unit + Vector3.new(0, 0.3, 0)
			local knockForce = knockDir * (sizeConfig.damage * 2)
			local bv = Instance.new("BodyVelocity")
			bv.Name = "PunchKnock"
			bv.MaxForce = Vector3.new(40000, 20000, 40000)
			bv.Velocity = knockForce
			bv.Parent = otherRoot
			task.delay(0.2, function()
				if bv.Parent then bv:Destroy() end
			end)
		end
	end
end

-- Stomp handler (Giant only) - now also breaks breakable platforms
local function handleStomp(player: Player)
	if currentState ~= "Playing" then return end
	if not playerLives[player] or playerLives[player] <= 0 then return end
	if playerSize[player] ~= "giant" then return end

	local now = tick()
	if cooldowns.Stomp[player] and now < cooldowns.Stomp[player] then return end
	cooldowns.Stomp[player] = now + GameConfig.STOMP_COOLDOWN
	ActionCooldown:FireClient(player, "Stomp", GameConfig.STOMP_COOLDOWN)

	local root = getRootPart(player)
	if not root then return end
	local origin = root.Position

	postFeed(string.format("%s used STOMP!", player.Name), Color3.fromRGB(255, 150, 50), 1.5)

	for _, other in Players:GetPlayers() do
		if other == player then continue end
		if not playerLives[other] or playerLives[other] <= 0 then continue end

		local otherRoot = getRootPart(other)
		if not otherRoot then continue end

		local dist = (otherRoot.Position - origin).Magnitude
		if dist > GameConfig.STOMP_RANGE then continue end

		local otherSize = playerSize[other] or "normal"
		if otherSize == "giant" then continue end

		damagePlayer(other, GameConfig.STOMP_DAMAGE, player)

		local knockDir = (otherRoot.Position - origin).Unit + Vector3.new(0, 0.5, 0)
		local bv = Instance.new("BodyVelocity")
		bv.Name = "StompKnock"
		bv.MaxForce = Vector3.new(40000, 30000, 40000)
		bv.Velocity = knockDir * 40
		bv.Parent = otherRoot
		task.delay(0.3, function()
			if bv.Parent then bv:Destroy() end
		end)
	end

	-- Break nearby breakable platforms
	breakNearbyPlatforms(origin, GameConfig.STOMP_RANGE + 4)
end

-- Dash handler
local function handleDash(player: Player)
	if currentState ~= "Playing" then return end
	if not playerLives[player] or playerLives[player] <= 0 then return end

	local now = tick()
	if cooldowns.Dash[player] and now < cooldowns.Dash[player] then return end
	cooldowns.Dash[player] = now + GameConfig.DASH_COOLDOWN
	ActionCooldown:FireClient(player, "Dash", GameConfig.DASH_COOLDOWN)

	local root = getRootPart(player)
	if not root then return end

	local dashDir = root.CFrame.LookVector
	local bv = Instance.new("BodyVelocity")
	bv.Name = "DashForce"
	bv.MaxForce = Vector3.new(60000, 20000, 60000)
	bv.Velocity = dashDir * GameConfig.DASH_FORCE + Vector3.new(0, 15, 0)
	bv.Parent = root
	task.delay(0.25, function()
		if bv.Parent then bv:Destroy() end
	end)
end

-- Size change handler with cooldown
local function handleSizeChange(player: Player, newSize: string)
	if currentState ~= "Playing" then return end
	if not playerLives[player] or playerLives[player] <= 0 then return end
	if not GameConfig.Sizes[newSize] then return end
	if playerSize[player] == newSize then return end

	local now = tick()
	if cooldowns.SizeChange[player] and now < cooldowns.SizeChange[player] then return end
	cooldowns.SizeChange[player] = now + GameConfig.SIZE_CHANGE_COOLDOWN
	ActionCooldown:FireClient(player, "SizeChange", GameConfig.SIZE_CHANGE_COOLDOWN)

	applySize(player, newSize)
end

-- Tiny climbing on giant: passive damage
local function checkTinyOnGiant()
	for _, tinyPlayer in Players:GetPlayers() do
		if playerSize[tinyPlayer] ~= "tiny" then continue end
		if not playerLives[tinyPlayer] or playerLives[tinyPlayer] <= 0 then continue end

		local tinyRoot = getRootPart(tinyPlayer)
		if not tinyRoot then continue end

		for _, giantPlayer in Players:GetPlayers() do
			if giantPlayer == tinyPlayer then continue end
			if playerSize[giantPlayer] ~= "giant" then continue end
			if not playerLives[giantPlayer] or playerLives[giantPlayer] <= 0 then continue end

			local giantRoot = getRootPart(giantPlayer)
			if not giantRoot then continue end

			local diff = tinyRoot.Position - giantRoot.Position
			local horizontalDist = Vector3.new(diff.X, 0, diff.Z).Magnitude
			local verticalDiff = diff.Y

			if horizontalDist < 5 and verticalDiff > 3 and verticalDiff < 12 then
				damagePlayer(giantPlayer, 5, tinyPlayer)
			end
		end
	end
end

-- Win condition
local function getWinner(): Player?
	local bestPlayer = nil
	local bestKills = -1
	for _, player in Players:GetPlayers() do
		local kills = playerKills[player] or 0
		local deaths = playerDeaths[player] or 0
		if kills > bestKills or (kills == bestKills and deaths < (playerDeaths[bestPlayer] or 0)) then
			bestKills = kills
			bestPlayer = player
		end
	end
	return bestPlayer
end

local function allEliminated(): boolean
	local alive = 0
	for _, player in Players:GetPlayers() do
		if playerLives[player] and playerLives[player] > 0 then
			alive += 1
		end
	end
	return alive <= 1
end

-- Round state machine
local function resetMatch()
	playerSize = {}
	playerHP = {}
	playerLives = {}
	playerKills = {}
	playerDeaths = {}
	playerComboData = {}
	cooldowns = { Punch = {}, Stomp = {}, Dash = {}, SizeChange = {} }

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
		playerSize[player] = "normal"
		playerHP[player] = GameConfig.Sizes.normal.hp
		playerLives[player] = GameConfig.MAX_LIVES
		playerKills[player] = 0
		playerDeaths[player] = 0
		playerComboData[player] = {
			davidKills = 0,
			titanKills = 0,
			sizeChangedSinceTitan = false,
		}
		applySize(player, "normal")
	end

	broadcastState("Playing", { remaining = GameConfig.MATCH_DURATION })
	postFeed("FIGHT! Switch sizes with Q/E/R! Giants break platforms!", Color3.fromRGB(255, 255, 100), 3)

	local tinyDamageTick = 0
	local healTick = 0

	local heartbeatConn
	heartbeatConn = RunService.Heartbeat:Connect(function()
		if currentState ~= "Playing" then
			heartbeatConn:Disconnect()
			return
		end

		local now = tick()

		-- Tiny-on-giant passive damage every 1 second
		if now > tinyDamageTick + 1 then
			tinyDamageTick = now
			checkTinyOnGiant()
		end

		-- Tiny tunnel healing every 2 seconds
		if now > healTick + 2 then
			healTick = now
			checkTinyTunnelHealing()
		end
	end)

	while currentState == "Playing" do
		task.wait(0.5)

		local remaining = matchEndTime - tick()
		broadcastState("Playing", { remaining = math.max(0, math.ceil(remaining)) })

		if allEliminated() or remaining <= 0 then
			heartbeatConn:Disconnect()
			return getWinner()
		end
	end

	heartbeatConn:Disconnect()
	return getWinner()
end

local function showResult(winner: Player?)
	local winnerName = winner and winner.Name or "Nobody"
	local kills = winner and (playerKills[winner] or 0) or 0
	broadcastState("Result", { winner = winnerName, kills = kills })
	postFeed(string.format("%s wins with %d kills!", winnerName, kills), Color3.fromRGB(255, 236, 120), 4)

	for _, player in Players:GetPlayers() do
		local char = player.Character
		if char then
			local hl = char:FindFirstChild("SizeHighlight")
			if hl then hl:Destroy() end
		end
	end

	task.wait(GameConfig.RESULT_DURATION)
end

-- Input handlers
SizeChange.OnServerEvent:Connect(function(player, newSize)
	handleSizeChange(player, tostring(newSize))
end)

PunchRequest.OnServerEvent:Connect(function(player)
	handlePunch(player)
end)

StompRequest.OnServerEvent:Connect(function(player)
	handleStomp(player)
end)

DashRequest.OnServerEvent:Connect(function(player)
	handleDash(player)
end)

-- Player cleanup
Players.PlayerRemoving:Connect(function(player)
	playerSize[player] = nil
	playerHP[player] = nil
	playerLives[player] = nil
	playerKills[player] = nil
	playerDeaths[player] = nil
	playerComboData[player] = nil
	cooldowns.Punch[player] = nil
	cooldowns.Stomp[player] = nil
	cooldowns.Dash[player] = nil
	cooldowns.SizeChange[player] = nil
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
