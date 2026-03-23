-- MatchManager
-- Gravity Flip Arena: per-player gravity, punch combat, HP tracking, scoring

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

----------------------------------------------------------------------------
-- State
----------------------------------------------------------------------------
local stateFolder = ReplicatedStorage:WaitForChild("GravityFlipState")
local stateValue = stateFolder:WaitForChild("State")

-- [Player] = { hp, gravityDir, gravityName, kills, deaths, flipCooldownEnd, punchCooldownEnd, bodyForce, gyro, eliminated }
local playerStates = {}
local heartbeatConnection = nil
local matchActive = false

----------------------------------------------------------------------------
-- Arena References
----------------------------------------------------------------------------
local function getArena()
	return workspace:FindFirstChild("GravityFlipArena")
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

	-- BodyForce to override workspace gravity
	-- We need to counteract default gravity and apply our own
	local bf = Instance.new("BodyForce")
	bf.Name = "GravityForce"
	bf.Parent = hrp

	-- BodyGyro to orient player to their gravity surface
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

	-- Counteract default gravity (workspace gravity is 0, -196.2, 0 by default)
	-- and apply our custom gravity direction
	local defaultGravity = Vector3.new(0, -workspace.Gravity, 0)
	local customGravity = gravDir * GameConfig.GRAVITY_MAGNITUDE
	local netForce = (customGravity - defaultGravity) * mass

	if ps.bodyForce and ps.bodyForce.Parent then
		ps.bodyForce.Force = netForce
	end

	-- Orient the character so "down" matches gravity direction
	if ps.gyro and ps.gyro.Parent then
		local upDir = getUpFromGravity(gravDir)
		-- Create a CFrame where Y-axis aligns with our "up"
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
	}

	-- Set HP attribute on character
	local character = player.Character
	if character then
		character:SetAttribute("HP", GameConfig.MAX_HP)

		-- Apply highlight
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

	-- Start with normal gravity
	applyGravityForce(player, "Down")
end

local function clearPlayerState(player)
	removeGravityRig(player)
	playerStates[player] = nil
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

	-- Reset position
	hrp.CFrame = spawn.CFrame + Vector3.new(math.random(-4, 4), 4, math.random(-4, 4))
	hrp.AssemblyLinearVelocity = Vector3.zero
	hrp.AssemblyAngularVelocity = Vector3.zero

	-- Reset state
	ps.hp = GameConfig.MAX_HP
	ps.eliminated = false
	ps.gravityName = "Down"
	ps.lastAttacker = nil

	if character then
		character:SetAttribute("HP", GameConfig.MAX_HP)
	end

	-- Recreate gravity rig (may have been lost)
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

		local leaderstats = victim:FindFirstChild("leaderstats")
		if leaderstats and leaderstats:FindFirstChild("Deaths") then
			leaderstats.Deaths.Value += 1
		end

		local killerName = "the arena"
		if attacker and attacker ~= victim then
			local aps = playerStates[attacker]
			if aps then
				aps.kills += 1
				local aLeaderstats = attacker:FindFirstChild("leaderstats")
				if aLeaderstats and aLeaderstats:FindFirstChild("Kills") then
					aLeaderstats.Kills.Value += 1
				end
			end
			killerName = attacker.Name
		end

		KillFeed:FireAllClients(string.format("%s eliminated by %s", victim.Name, killerName), Color3.fromRGB(255, 100, 80))

		-- Schedule respawn
		ps.respawnAt = tick() + GameConfig.RESPAWN_TIME

		-- Move to spectator briefly
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

	-- Distances to each wall
	local distances = {
		{ name = "Up", dist = math.abs(half - pos.Y) },
		{ name = "Down", dist = math.abs(half + pos.Y) },
		{ name = "North", dist = math.abs(half + pos.Z) },
		{ name = "South", dist = math.abs(half - pos.Z) },
		{ name = "East", dist = math.abs(half - pos.X) },
		{ name = "West", dist = math.abs(half + pos.X) },
	}

	-- Only consider wall directions (not Up/Down)
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

	-- Don't flip to same direction
	if targetDir == ps.gravityName then
		return
	end

	ps.flipCooldownEnd = now + GameConfig.FLIP_COOLDOWN
	applyGravityForce(player, targetDir)

	-- Notify all clients for visual effect
	GravityChanged:FireAllClients(player.Name, targetDir)
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

	-- Find targets in range and cone
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

		-- Hit! Apply damage and knockback
		damagePlayer(otherPlayer, player, GameConfig.PUNCH_DAMAGE)

		-- Knockback in the direction from puncher to victim
		local knockDir = toTarget.Unit
		-- Also add force in victim's "up" direction for loft
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
			-- Player fell outside the arena
			damagePlayer(player, ps.lastAttacker, GameConfig.FALL_DAMAGE)
			if not ps.eliminated then
				-- Teleport back if still alive
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

	heartbeatConnection = RunService.Heartbeat:Connect(function(_dt)
		if not matchActive then
			return
		end

		local now = tick()

		for player, ps in pairs(playerStates) do
			-- Handle respawn timer
			if ps.eliminated and ps.respawnAt > 0 and now >= ps.respawnAt then
				ps.respawnAt = 0
				respawnPlayer(player)
			end

			if ps.eliminated then
				continue
			end

			-- Reapply gravity force (mass may change, or rig may reset)
			-- Only reapply occasionally to avoid performance issues
			-- The BodyForce persists, so we just check kill zones

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
		-- Match starting
		for _, player in ipairs(Players:GetPlayers()) do
			initPlayerState(player)
		end

		matchActive = true
		startHeartbeat()

	elseif newState == "Result" and previousState == "Playing" then
		-- Match ended
		stopHeartbeat()

		local results = calculateResults()
		MatchResult:FireAllClients(results)

		-- Clean up
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
			-- Re-init gravity rig on respawn
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
