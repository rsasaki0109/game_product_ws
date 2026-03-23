-- MatchManager
-- Gravity Flip Arena: per-player gravity, punch combat, HP tracking, scoring
-- POLISHED: kill streaks, gravity trails, dynamic arena rotation, announcer text

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local GameConfig = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("GameConfig"))

----------------------------------------------------------------------------
-- Helpers
----------------------------------------------------------------------------
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

----------------------------------------------------------------------------
-- Remote Events
----------------------------------------------------------------------------
local FlipGravity = getOrCreateRemote("FlipGravity", "RemoteEvent")
local PunchRequest = getOrCreateRemote("PunchRequest", "RemoteEvent")
local PlayerStateUpdate = getOrCreateRemote("PlayerStateUpdate", "RemoteEvent")
local MatchResult = getOrCreateRemote("MatchResult", "RemoteEvent")
local KillFeed = getOrCreateRemote("KillFeed", "RemoteEvent")
local GravityChanged = getOrCreateRemote("GravityChanged", "RemoteEvent")
local DamageFlash = getOrCreateRemote("DamageFlash", "RemoteEvent")
local Announcer = getOrCreateRemote("Announcer", "RemoteEvent")
local StreakUpdate = getOrCreateRemote("StreakUpdate", "RemoteEvent")
local LeaderboardUpdate = getOrCreateRemote("LeaderboardUpdate", "RemoteEvent")

----------------------------------------------------------------------------
-- State
----------------------------------------------------------------------------
local stateFolder = ReplicatedStorage:WaitForChild("GravityFlipState")
local stateValue = stateFolder:WaitForChild("State")

-- [Player] = { hp, gravityDir, gravityName, kills, deaths, flipCooldownEnd, punchCooldownEnd,
--              bodyForce, gyro, eliminated, respawnAt, lastAttacker, streak, totalFlips,
--              speedBoostUntil, invulnerableUntil }
local playerStates = {}
local heartbeatConnection = nil
local matchActive = false
local lastPlatformRotateTime = 0
local doubleKillTracking = {} -- [Player] = { lastKillTime }

----------------------------------------------------------------------------
-- Arena References
----------------------------------------------------------------------------
local function getArena()
	return workspace:FindFirstChild("GravityFlipArena")
end

----------------------------------------------------------------------------
-- Announcer Broadcast
----------------------------------------------------------------------------
local function announce(message: string, color: Color3?)
	Announcer:FireAllClients(message, color or Color3.fromRGB(255, 255, 100))
end

----------------------------------------------------------------------------
-- Gravity System
----------------------------------------------------------------------------
local function getGravityVector(dirName: string): Vector3
	return GameConfig.GRAVITY_DIRS[dirName] or Vector3.new(0, -1, 0)
end

local function getUpFromGravity(gravDir: Vector3): Vector3
	return -gravDir
end

local function createGravityRig(player)
	local character = player.Character
	if not character then
		return nil, nil
	end
	local hrp = character:FindFirstChild("HumanoidRootPart")
	if not hrp then
		return nil, nil
	end

	-- Remove existing
	local oldBF = hrp:FindFirstChild("GravityForce")
	if oldBF then
		oldBF:Destroy()
	end
	local oldGyro = hrp:FindFirstChild("GravityGyro")
	if oldGyro then
		oldGyro:Destroy()
	end

	local bf = Instance.new("BodyForce")
	bf.Name = "GravityForce"
	bf.Parent = hrp

	local gyro = Instance.new("BodyGyro")
	gyro.Name = "GravityGyro"
	gyro.MaxTorque = Vector3.new(40000, 40000, 40000)
	gyro.P = 6000
	gyro.D = 500
	gyro.Parent = hrp

	return bf, gyro
end

local function applyGravityForce(player, gravDirName: string)
	local ps = playerStates[player]
	if not ps then
		return
	end

	local character = player.Character
	if not character then
		return
	end
	local hrp = character:FindFirstChild("HumanoidRootPart")
	if not hrp then
		return
	end

	local gravDir = getGravityVector(gravDirName)
	local mass = 0
	for _, part in ipairs(character:GetDescendants()) do
		if part:IsA("BasePart") then
			mass += part:GetMass()
		end
	end

	local defaultGravity = Vector3.new(0, -workspace.Gravity, 0)
	local customGravity = gravDir * GameConfig.GRAVITY_MAGNITUDE
	local netForce = (customGravity - defaultGravity) * mass

	if ps.bodyForce and ps.bodyForce.Parent then
		ps.bodyForce.Force = netForce
	end

	if ps.gyro and ps.gyro.Parent then
		local upDir = getUpFromGravity(gravDir)
		local lookDir
		if math.abs(upDir.Y) > 0.9 then
			lookDir = Vector3.new(0, 0, -1)
		else
			lookDir = Vector3.new(0, 1, 0):Cross(upDir).Unit
			if lookDir.Magnitude < 0.1 then
				lookDir = Vector3.new(0, 0, -1)
			end
		end
		local rightDir = upDir:Cross(lookDir).Unit
		lookDir = rightDir:Cross(upDir).Unit
		ps.gyro.CFrame = CFrame.fromMatrix(Vector3.zero, rightDir, upDir, -lookDir)
	end

	ps.gravityDir = gravDir
	ps.gravityName = gravDirName
end

local function removeGravityRig(player)
	local character = player.Character
	if not character then
		return
	end
	local hrp = character:FindFirstChild("HumanoidRootPart")
	if hrp then
		local bf = hrp:FindFirstChild("GravityForce")
		if bf then
			bf:Destroy()
		end
		local gyro = hrp:FindFirstChild("GravityGyro")
		if gyro then
			gyro:Destroy()
		end
	end
end

----------------------------------------------------------------------------
-- Gravity Trail System
----------------------------------------------------------------------------
local function spawnGravityTrail(position: Vector3, gravDir: Vector3)
	local arena = getArena()
	if not arena then
		return
	end

	local trailDir = -gravDir -- arrow points in direction of "up" after flip
	for i = 1, 4 do
		local trailPart = Instance.new("Part")
		trailPart.Name = "GravTrail"
		trailPart.Size = Vector3.new(1.2, 1.2, 0.3)
		trailPart.CFrame = CFrame.new(position + trailDir * (i * 1.5))
		trailPart.Anchored = true
		trailPart.CanCollide = false
		trailPart.CanTouch = false
		trailPart.CanQuery = false
		trailPart.Material = Enum.Material.Neon
		trailPart.Color = Color3.fromRGB(180, 220, 255)
		trailPart.Transparency = 0.3 + (i * 0.1)
		trailPart.Shape = Enum.PartType.Ball
		trailPart.Parent = arena

		-- Fade and destroy over 1 second
		task.spawn(function()
			local fadeSteps = 10
			for step = 1, fadeSteps do
				task.wait(0.1)
				if trailPart.Parent then
					trailPart.Transparency = (0.3 + (i * 0.1)) + (step / fadeSteps) * (1 - (0.3 + (i * 0.1)))
					trailPart.Size = trailPart.Size * 0.92
				end
			end
			if trailPart.Parent then
				trailPart:Destroy()
			end
		end)
	end
end

----------------------------------------------------------------------------
-- Dynamic Arena Rotation
----------------------------------------------------------------------------
local rotatablePlatforms = {
	"Plat_WN_1", "Plat_WN_2", "Plat_WS_1", "Plat_WS_2",
	"Plat_WE_1", "Plat_WE_2", "Plat_WW_1", "Plat_WW_2",
	"Plat_Floor_1", "Plat_Floor_2", "Plat_Ceil_1", "Plat_Ceil_2",
}

local function rotatePlatformSection()
	local arena = getArena()
	if not arena then
		return
	end

	local platName = rotatablePlatforms[math.random(1, #rotatablePlatforms)]
	local plat = arena:FindFirstChild(platName)
	if not plat then
		return
	end

	-- Pick a random new position on a different face
	local half = GameConfig.ARENA_SIZE * 0.5
	local faces = {
		{ offset = Vector3.new(math.random(-12, 12), -half + 4, math.random(-12, 12)), name = "floor" },
		{ offset = Vector3.new(math.random(-12, 12), half - 4, math.random(-12, 12)), name = "ceiling" },
		{ offset = Vector3.new(math.random(-12, 12), math.random(-8, 8), -half + 4), name = "north wall" },
		{ offset = Vector3.new(math.random(-12, 12), math.random(-8, 8), half - 4), name = "south wall" },
		{ offset = Vector3.new(half - 4, math.random(-8, 8), math.random(-12, 12)), name = "east wall" },
		{ offset = Vector3.new(-half + 4, math.random(-8, 8), math.random(-12, 12)), name = "west wall" },
	}

	local face = faces[math.random(1, #faces)]

	-- Flash the platform before moving
	local origColor = plat.Color
	plat.Color = Color3.fromRGB(255, 255, 100)
	plat.Material = Enum.Material.Neon

	announce(string.format("Platform shifting to the %s!", face.name), Color3.fromRGB(255, 200, 80))

	task.delay(0.5, function()
		if plat.Parent then
			plat.CFrame = CFrame.new(face.offset)
			plat.Color = origColor
			plat.Material = Enum.Material.Concrete
		end
	end)
end

----------------------------------------------------------------------------
-- Kill Streak System
----------------------------------------------------------------------------
local streakMessages = {
	[3] = { text = "GRAVITY MASTER!", color = Color3.fromRGB(255, 200, 60) },
	[5] = { text = "UNSTOPPABLE!", color = Color3.fromRGB(255, 80, 255) },
	[7] = { text = "GODLIKE!", color = Color3.fromRGB(255, 40, 40) },
}

local function applyStreakReward(player, streak: number)
	local ps = playerStates[player]
	if not ps then
		return
	end

	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")

	if streak == 3 then
		-- Speed boost for 4 seconds
		if humanoid then
			humanoid.WalkSpeed = GameConfig.DEFAULT_WALK_SPEED + 8
			ps.speedBoostUntil = tick() + 4
		end
		announce(string.format("%s: GRAVITY MASTER! (3 streak)", player.Name), Color3.fromRGB(255, 200, 60))

	elseif streak == 5 then
		-- Invulnerability for 2 seconds
		ps.invulnerableUntil = tick() + 2
		announce(string.format("%s: UNSTOPPABLE! (5 streak)", player.Name), Color3.fromRGB(255, 80, 255))

		-- Visual glow
		if character then
			local glow = character:FindFirstChild("GravityGlow")
			if glow then
				glow.FillColor = Color3.fromRGB(255, 80, 255)
				glow.FillTransparency = 0.3
				task.delay(2, function()
					if glow and glow.Parent then
						glow.FillColor = Color3.fromRGB(180, 220, 255)
						glow.FillTransparency = 0.8
					end
				end)
			end
		end

	elseif streak == 7 then
		announce(string.format("%s: GODLIKE! (7 streak)", player.Name), Color3.fromRGB(255, 40, 40))
	end

	-- Notify the player's client about their streak
	local streakData = streakMessages[streak]
	if streakData then
		StreakUpdate:FireClient(player, streak, streakData.text, streakData.color)
	end
end

----------------------------------------------------------------------------
-- Leaderboard
----------------------------------------------------------------------------
local function broadcastLeaderboard()
	local rankings = {}
	for p, ps in pairs(playerStates) do
		table.insert(rankings, { name = p.Name, kills = ps.kills })
	end
	table.sort(rankings, function(a, b)
		return a.kills > b.kills
	end)

	local top3 = {}
	for i = 1, math.min(3, #rankings) do
		table.insert(top3, { name = rankings[i].name, kills = rankings[i].kills })
	end
	LeaderboardUpdate:FireAllClients(top3)
end

----------------------------------------------------------------------------
-- Player State Management
----------------------------------------------------------------------------
local function initPlayerState(player)
	local bf, gyro = createGravityRig(player)
	playerStates[player] = {
		hp = GameConfig.MAX_HP,
		gravityDir = Vector3.new(0, -1, 0),
		gravityName = "Down",
		kills = 0,
		deaths = 0,
		flipCooldownEnd = 0,
		punchCooldownEnd = 0,
		bodyForce = bf,
		gyro = gyro,
		eliminated = false,
		respawnAt = 0,
		lastAttacker = nil,
		streak = 0,
		totalFlips = 0,
		speedBoostUntil = 0,
		invulnerableUntil = 0,
	}
	doubleKillTracking[player] = { lastKillTime = 0 }

	local character = player.Character
	if character then
		character:SetAttribute("HP", GameConfig.MAX_HP)

		local highlight = character:FindFirstChild("GravityGlow")
		if not highlight then
			highlight = Instance.new("Highlight")
			highlight.Name = "GravityGlow"
			highlight.DepthMode = Enum.HighlightDepthMode.Occluded
			highlight.Parent = character
		end
		highlight.FillColor = Color3.fromRGB(180, 220, 255)
		highlight.FillTransparency = 0.8
		highlight.OutlineColor = Color3.fromRGB(255, 255, 255)
		highlight.OutlineTransparency = 0.4
	end

	applyGravityForce(player, "Down")
end

local function clearPlayerState(player)
	removeGravityRig(player)
	playerStates[player] = nil
	doubleKillTracking[player] = nil
end

local function setupLeaderstats(player)
	local leaderstats = player:FindFirstChild("leaderstats")
	if not leaderstats then
		leaderstats = Instance.new("Folder")
		leaderstats.Name = "leaderstats"
		leaderstats.Parent = player
	end
	if not leaderstats:FindFirstChild("Kills") then
		local kills = Instance.new("IntValue")
		kills.Name = "Kills"
		kills.Parent = leaderstats
	end
	if not leaderstats:FindFirstChild("Deaths") then
		local deaths = Instance.new("IntValue")
		deaths.Name = "Deaths"
		deaths.Parent = leaderstats
	end
end

----------------------------------------------------------------------------
-- Damage & Kill
----------------------------------------------------------------------------
local function respawnPlayer(player)
	local ps = playerStates[player]
	if not ps then
		return
	end

	local arena = getArena()
	local spawn = arena and arena:FindFirstChild("Spawn")
	if not spawn then
		return
	end

	local character = player.Character
	local hrp = character and character:FindFirstChild("HumanoidRootPart")
	if not hrp then
		return
	end

	hrp.CFrame = spawn.CFrame + Vector3.new(math.random(-4, 4), 4, math.random(-4, 4))
	hrp.AssemblyLinearVelocity = Vector3.zero
	hrp.AssemblyAngularVelocity = Vector3.zero

	ps.hp = GameConfig.MAX_HP
	ps.eliminated = false
	ps.gravityName = "Down"
	ps.lastAttacker = nil
	ps.streak = 0 -- Reset streak on death

	if character then
		character:SetAttribute("HP", GameConfig.MAX_HP)
	end

	local bf, gyro = createGravityRig(player)
	ps.bodyForce = bf
	ps.gyro = gyro
	applyGravityForce(player, "Down")
end

local function damagePlayer(victim, attacker, amount: number)
	local ps = playerStates[victim]
	if not ps or ps.eliminated then
		return
	end

	-- Check invulnerability
	if ps.invulnerableUntil and tick() < ps.invulnerableUntil then
		return
	end

	ps.hp = math.max(0, ps.hp - amount)
	ps.lastAttacker = attacker

	local character = victim.Character
	if character then
		character:SetAttribute("HP", ps.hp)
	end

	DamageFlash:FireClient(victim, amount)

	if ps.hp <= 0 then
		-- Kill
		ps.eliminated = true
		ps.deaths += 1
		ps.streak = 0 -- Reset victim streak

		local leaderstats = victim:FindFirstChild("leaderstats")
		if leaderstats and leaderstats:FindFirstChild("Deaths") then
			leaderstats.Deaths.Value += 1
		end

		local killerName = "the arena"
		if attacker and attacker ~= victim then
			local aps = playerStates[attacker]
			if aps then
				aps.kills += 1
				aps.streak += 1

				local aLeaderstats = attacker:FindFirstChild("leaderstats")
				if aLeaderstats and aLeaderstats:FindFirstChild("Kills") then
					aLeaderstats.Kills.Value += 1
				end

				-- Double kill detection
				local dkt = doubleKillTracking[attacker]
				local now = tick()
				if dkt and (now - dkt.lastKillTime) < 3.0 then
					announce(string.format("DOUBLE KILL! %s is on fire!", attacker.Name), Color3.fromRGB(255, 150, 50))
				end
				if dkt then
					dkt.lastKillTime = now
				end

				-- Streak rewards
				if streakMessages[aps.streak] then
					applyStreakReward(attacker, aps.streak)
				end

				-- Broadcast updated leaderboard
				broadcastLeaderboard()
			end
			killerName = attacker.Name
		end

		KillFeed:FireAllClients(string.format("%s eliminated by %s", victim.Name, killerName), Color3.fromRGB(255, 100, 80))

		ps.respawnAt = tick() + GameConfig.RESPAWN_TIME

		local hrp = character and character:FindFirstChild("HumanoidRootPart")
		if hrp then
			hrp.CFrame = CFrame.new(GameConfig.SPECTATOR_POSITION)
			hrp.AssemblyLinearVelocity = Vector3.zero
		end
	end
end

----------------------------------------------------------------------------
-- Nearest Wall Logic
----------------------------------------------------------------------------
local function findNearestWallDirection(player): string
	local character = player.Character
	local hrp = character and character:FindFirstChild("HumanoidRootPart")
	if not hrp then
		return "Down"
	end

	local pos = hrp.Position
	local half = GameConfig.ARENA_SIZE * 0.5

	local distances = {
		{ name = "Up", dist = math.abs(half - pos.Y) },
		{ name = "Down", dist = math.abs(half + pos.Y) },
		{ name = "North", dist = math.abs(half + pos.Z) },
		{ name = "South", dist = math.abs(half - pos.Z) },
		{ name = "East", dist = math.abs(half - pos.X) },
		{ name = "West", dist = math.abs(half + pos.X) },
	}

	local wallDirs = {}
	for _, d in ipairs(distances) do
		if d.name ~= "Up" and d.name ~= "Down" then
			table.insert(wallDirs, d)
		end
	end

	table.sort(wallDirs, function(a, b)
		return a.dist < b.dist
	end)

	return wallDirs[1].name
end

----------------------------------------------------------------------------
-- Input Handling
----------------------------------------------------------------------------
FlipGravity.OnServerEvent:Connect(function(player, direction: string)
	if not matchActive then
		return
	end
	local ps = playerStates[player]
	if not ps or ps.eliminated then
		return
	end

	local now = tick()
	if now < ps.flipCooldownEnd then
		return
	end

	local targetDir
	if direction == "Up" then
		targetDir = "Up"
	elseif direction == "Down" then
		targetDir = "Down"
	elseif direction == "Wall" then
		targetDir = findNearestWallDirection(player)
	else
		return
	end

	if targetDir == ps.gravityName then
		return
	end

	ps.flipCooldownEnd = now + GameConfig.FLIP_COOLDOWN
	ps.totalFlips += 1

	-- Spawn gravity trail at the flip point
	local character = player.Character
	local hrp = character and character:FindFirstChild("HumanoidRootPart")
	if hrp then
		local newGravDir = getGravityVector(targetDir)
		spawnGravityTrail(hrp.Position, newGravDir)
	end

	applyGravityForce(player, targetDir)

	-- Announcer text for gravity flips
	local dirDisplayNames = {
		Up = "CEILING", Down = "FLOOR",
		North = "NORTH WALL", South = "SOUTH WALL",
		East = "EAST WALL", West = "WEST WALL",
	}
	local displayDir = dirDisplayNames[targetDir] or targetDir
	GravityChanged:FireAllClients(player.Name, targetDir)
	announce(string.format("%s flipped to %s!", player.Name, displayDir), Color3.fromRGB(180, 220, 255))
end)

PunchRequest.OnServerEvent:Connect(function(player)
	if not matchActive then
		return
	end
	local ps = playerStates[player]
	if not ps or ps.eliminated then
		return
	end

	local now = tick()
	if now < ps.punchCooldownEnd then
		return
	end

	ps.punchCooldownEnd = now + GameConfig.PUNCH_COOLDOWN

	local character = player.Character
	local hrp = character and character:FindFirstChild("HumanoidRootPart")
	if not hrp then
		return
	end

	local origin = hrp.Position
	local lookDir = hrp.CFrame.LookVector

	for otherPlayer, otherPs in pairs(playerStates) do
		if otherPlayer == player or otherPs.eliminated then
			continue
		end

		local otherChar = otherPlayer.Character
		local otherHrp = otherChar and otherChar:FindFirstChild("HumanoidRootPart")
		if not otherHrp then
			continue
		end

		local toTarget = otherHrp.Position - origin
		local dist = toTarget.Magnitude
		if dist > GameConfig.PUNCH_RANGE then
			continue
		end

		local dot = lookDir:Dot(toTarget.Unit)
		if dot < GameConfig.PUNCH_CONE_DOT then
			continue
		end

		damagePlayer(otherPlayer, player, GameConfig.PUNCH_DAMAGE)

		local knockDir = toTarget.Unit
		local victimUp = getUpFromGravity(otherPs.gravityDir)
		local knockForce = knockDir * GameConfig.PUNCH_KNOCKBACK + victimUp * GameConfig.PUNCH_UP_FORCE
		otherHrp.AssemblyLinearVelocity += knockForce
	end
end)

----------------------------------------------------------------------------
-- Kill Zone Check
----------------------------------------------------------------------------
local function checkKillZones()
	local half = GameConfig.ARENA_SIZE * 0.5 + GameConfig.KILL_ZONE_PADDING

	for player, ps in pairs(playerStates) do
		if ps.eliminated then
			continue
		end

		local character = player.Character
		local hrp = character and character:FindFirstChild("HumanoidRootPart")
		if not hrp then
			continue
		end

		local pos = hrp.Position
		if math.abs(pos.X) > half or math.abs(pos.Y) > half or math.abs(pos.Z) > half then
			damagePlayer(player, ps.lastAttacker, GameConfig.FALL_DAMAGE)
			if not ps.eliminated then
				respawnPlayer(player)
			end
		end
	end
end

----------------------------------------------------------------------------
-- Game Loop (Heartbeat)
----------------------------------------------------------------------------
local function startHeartbeat()
	if heartbeatConnection then
		heartbeatConnection:Disconnect()
	end

	lastPlatformRotateTime = tick()

	heartbeatConnection = RunService.Heartbeat:Connect(function(_dt)
		if not matchActive then
			return
		end

		local now = tick()

		-- Dynamic arena: rotate a platform every 20 seconds
		if now - lastPlatformRotateTime >= 20 then
			lastPlatformRotateTime = now
			rotatePlatformSection()
		end

		for player, ps in pairs(playerStates) do
			-- Handle respawn timer
			if ps.eliminated and ps.respawnAt > 0 and now >= ps.respawnAt then
				ps.respawnAt = 0
				respawnPlayer(player)
			end

			if ps.eliminated then
				continue
			end

			-- Check speed boost expiry
			if ps.speedBoostUntil > 0 and now >= ps.speedBoostUntil then
				ps.speedBoostUntil = 0
				local character = player.Character
				local humanoid = character and character:FindFirstChildOfClass("Humanoid")
				if humanoid then
					humanoid.WalkSpeed = GameConfig.DEFAULT_WALK_SPEED
				end
			end

			-- Send state update
			local flipRemain = math.max(0, ps.flipCooldownEnd - now)
			local punchRemain = math.max(0, ps.punchCooldownEnd - now)

			PlayerStateUpdate:FireClient(player, {
				hp = ps.hp,
				gravityName = ps.gravityName,
				kills = ps.kills,
				deaths = ps.deaths,
				flipCooldown = flipRemain,
				punchCooldown = punchRemain,
				streak = ps.streak,
				totalFlips = ps.totalFlips,
			})
		end

		checkKillZones()
	end)
end

local function stopHeartbeat()
	matchActive = false
	if heartbeatConnection then
		heartbeatConnection:Disconnect()
		heartbeatConnection = nil
	end
end

----------------------------------------------------------------------------
-- Results
----------------------------------------------------------------------------
local function calculateResults()
	local rankings = {}
	for player, ps in pairs(playerStates) do
		table.insert(rankings, {
			player = player,
			kills = ps.kills,
			deaths = ps.deaths,
			hp = ps.hp,
		})
	end

	table.sort(rankings, function(a, b)
		if a.kills ~= b.kills then
			return a.kills > b.kills
		end
		return a.deaths < b.deaths
	end)

	local scoreValues = { GameConfig.SCORE_1ST, GameConfig.SCORE_2ND, GameConfig.SCORE_3RD }
	local results = {}
	for rank, entry in ipairs(rankings) do
		local score = scoreValues[rank] or GameConfig.SCORE_OTHER
		table.insert(results, {
			name = entry.player.Name,
			rank = rank,
			score = score,
			kills = entry.kills,
			deaths = entry.deaths,
		})
	end

	return results
end

----------------------------------------------------------------------------
-- Match Lifecycle
----------------------------------------------------------------------------
Players.PlayerAdded:Connect(function(player)
	setupLeaderstats(player)
end)

for _, player in ipairs(Players:GetPlayers()) do
	setupLeaderstats(player)
end

Players.PlayerRemoving:Connect(function(player)
	if playerStates[player] then
		clearPlayerState(player)
	end
end)

local previousState = ""

stateValue:GetPropertyChangedSignal("Value"):Connect(function()
	local newState = stateValue.Value

	if newState == "Playing" and previousState ~= "Playing" then
		for _, player in ipairs(Players:GetPlayers()) do
			initPlayerState(player)
		end

		matchActive = true
		startHeartbeat()
		announce("FIGHT! Flip gravity and punch your rivals!", Color3.fromRGB(255, 255, 100))

	elseif newState == "Result" and previousState == "Playing" then
		stopHeartbeat()

		local results = calculateResults()
		MatchResult:FireAllClients(results)

		for _, player in ipairs(Players:GetPlayers()) do
			clearPlayerState(player)
		end

	elseif newState == "Lobby" and previousState ~= "Lobby" then
		stopHeartbeat()
		for _, player in ipairs(Players:GetPlayers()) do
			clearPlayerState(player)
		end
	end

	previousState = newState
end)

-- Handle character respawning mid-match
Players.PlayerAdded:Connect(function(player)
	player.CharacterAdded:Connect(function(_character)
		if matchActive and not playerStates[player] then
			task.wait(0.5)
			initPlayerState(player)
		elseif matchActive and playerStates[player] then
			task.wait(0.5)
			local ps = playerStates[player]
			if ps then
				local bf, gyro = createGravityRig(player)
				ps.bodyForce = bf
				ps.gyro = gyro
				applyGravityForce(player, ps.gravityName)
				ps.hp = GameConfig.MAX_HP
				ps.eliminated = false
				local char = player.Character
				if char then
					char:SetAttribute("HP", GameConfig.MAX_HP)
				end
			end
		end
	end)
end)
