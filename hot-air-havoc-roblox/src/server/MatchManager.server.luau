-- MatchManager
-- Hot Air Havoc: balloon altitude survival game mechanics

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
local BurnStart = getOrCreateRemote("BurnStart", "RemoteEvent")
local BurnStop = getOrCreateRemote("BurnStop", "RemoteEvent")
local VentStart = getOrCreateRemote("VentStart", "RemoteEvent")
local VentStop = getOrCreateRemote("VentStop", "RemoteEvent")
local Boost = getOrCreateRemote("Boost", "RemoteEvent")
local PlayerStateUpdate = getOrCreateRemote("PlayerStateUpdate", "RemoteEvent")
local MatchResult = getOrCreateRemote("MatchResult", "RemoteEvent")
local EliminatedEvent = getOrCreateRemote("Eliminated", "RemoteEvent")
local FuelPickupCollected = getOrCreateRemote("FuelPickupCollected", "RemoteEvent")
local GrappleRequest = getOrCreateRemote("GrappleRequest", "RemoteEvent")
local GrappleStateEvent = getOrCreateRemote("GrappleStateEvent", "RemoteEvent")

----------------------------------------------------------------------------
-- State
----------------------------------------------------------------------------
local stateFolder = ReplicatedStorage:WaitForChild("HotAirHavocState")
local stateValue = stateFolder:WaitForChild("State")

local playerStates = {} -- [Player] = { fuel, isBurning, isVenting, isBoosting, boostEnd, boostCooldownEnd, eliminated, bodyVelocity, balloon }
local heartbeatConnection = nil
local fuelPickupConnections = {}

-- GRAPPLE HOOK state
local grappleCooldownUntil = {} -- [Player] = tick
local grappleActive = {} -- [Player] = { target, targetType, startedAt, stealTotal }
local GRAPPLE_COOLDOWN = 8
local GRAPPLE_RANGE = 60
local GRAPPLE_FUEL_STEAL_RATE = 5 -- per second
local GRAPPLE_FUEL_STEAL_TOTAL = 10
local GRAPPLE_STEAL_DURATION = 2
local GRAPPLE_PULL_FORCE = 15

----------------------------------------------------------------------------
-- Arena references
----------------------------------------------------------------------------
local function getArena()
	return workspace:FindFirstChild("HotAirHavocArena")
end

local function getArenaPart(name: string)
	local arena = getArena()
	if not arena then return nil end
	local target = arena:FindFirstChild(name)
	if target and target:IsA("BasePart") then
		return target
	end
	return nil
end

----------------------------------------------------------------------------
-- Balloon Rig
----------------------------------------------------------------------------
local function createBalloonRig(player)
	local character = player.Character
	if not character then return end
	local hrp = character:FindFirstChild("HumanoidRootPart")
	if not hrp then return end

	-- Remove existing balloon
	local oldBalloon = character:FindFirstChild("Balloon")
	if oldBalloon then oldBalloon:Destroy() end
	local oldBV = hrp:FindFirstChild("HavocVelocity")
	if oldBV then oldBV:Destroy() end

	-- Create balloon sphere
	local balloon = Instance.new("Part")
	balloon.Name = "Balloon"
	balloon.Shape = Enum.PartType.Ball
	balloon.Size = GameConfig.BALLOON_SIZE
	balloon.Color = GameConfig.THEME.balloon
	balloon.Material = Enum.Material.SmoothPlastic
	balloon.Transparency = 0.3
	balloon.CanCollide = false
	balloon.CanTouch = false
	balloon.CanQuery = false
	balloon.Massless = true
	balloon.Anchored = false
	balloon.Parent = character

	-- Weld balloon above head
	local weld = Instance.new("WeldConstraint")
	weld.Part0 = hrp
	weld.Part1 = balloon
	weld.Parent = balloon

	balloon.CFrame = hrp.CFrame * CFrame.new(GameConfig.BALLOON_OFFSET)

	-- Rope visual
	local attachment0 = Instance.new("Attachment")
	attachment0.Name = "RopeTop"
	attachment0.Position = Vector3.new(0, -GameConfig.BALLOON_SIZE.Y / 2, 0)
	attachment0.Parent = balloon

	local attachment1 = Instance.new("Attachment")
	attachment1.Name = "RopeBottom"
	attachment1.Position = Vector3.new(0, 2, 0)
	attachment1.Parent = hrp

	local rope = Instance.new("RopeConstraint")
	rope.Name = "BalloonRope"
	rope.Attachment0 = attachment0
	rope.Attachment1 = attachment1
	rope.Length = GameConfig.ROPE_LENGTH
	rope.Visible = true
	rope.Color = BrickColor.new("Brown")
	rope.Thickness = 0.15
	rope.Parent = balloon

	-- BodyVelocity for physics control
	local bv = Instance.new("BodyVelocity")
	bv.Name = "HavocVelocity"
	bv.MaxForce = Vector3.new(2000, 8000, 2000)
	bv.Velocity = Vector3.new(0, 0, 0)
	bv.P = 1250
	bv.Parent = hrp

	return balloon, bv
end

local function removeBalloonRig(player)
	local character = player.Character
	if not character then return end

	local balloon = character:FindFirstChild("Balloon")
	if balloon then balloon:Destroy() end

	local hrp = character:FindFirstChild("HumanoidRootPart")
	if hrp then
		local bv = hrp:FindFirstChild("HavocVelocity")
		if bv then bv:Destroy() end
		local att = hrp:FindFirstChild("RopeBottom")
		if att then att:Destroy() end
	end
end

----------------------------------------------------------------------------
-- Player State Management
----------------------------------------------------------------------------
local function initPlayerState(player)
	local balloon, bv = createBalloonRig(player)
	playerStates[player] = {
		fuel = GameConfig.STARTING_FUEL,
		isBurning = false,
		isVenting = false,
		isBoosting = false,
		boostEnd = 0,
		boostCooldownEnd = 0,
		eliminated = false,
		bodyVelocity = bv,
		balloon = balloon,
	}
end

local function clearPlayerState(player)
	removeBalloonRig(player)
	playerStates[player] = nil
end

local function getActionState(ps)
	if ps.eliminated then return "ELIMINATED" end
	if ps.isBoosting then return "BOOSTING" end
	if ps.isBurning then return "BURNING" end
	if ps.isVenting then return "VENTING" end
	return "GLIDING"
end

local function isInWindLayer(altitude: number): boolean
	for _, layerY in ipairs(GameConfig.WIND_LAYERS) do
		if math.abs(altitude - layerY) <= GameConfig.WIND_RANGE then
			return true
		end
	end
	return false
end

local function getWindLayerBoost(altitude: number): number
	for _, layerY in ipairs(GameConfig.WIND_LAYERS) do
		if math.abs(altitude - layerY) <= GameConfig.WIND_RANGE then
			return GameConfig.WIND_BOOST_X
		end
	end
	return 0
end

----------------------------------------------------------------------------
-- Fuel Pickups
----------------------------------------------------------------------------
local function setupFuelPickups()
	-- Clean old connections
	for _, conn in ipairs(fuelPickupConnections) do
		conn:Disconnect()
	end
	fuelPickupConnections = {}

	local arena = getArena()
	if not arena then return end

	-- Collect original fuel positions for respawning
	local fuelPositions = {}
	for i = 1, 6 do
		local fuelPart = arena:FindFirstChild(string.format("Fuel_%d", i))
		if fuelPart then
			fuelPositions[i] = fuelPart.Position
		end
	end

	for i = 1, 6 do
		local fuelPart = arena:FindFirstChild(string.format("Fuel_%d", i))
		if fuelPart then
			local conn = fuelPart.Touched:Connect(function(hit)
				if not fuelPart.Parent then return end
				if fuelPart.Transparency >= 0.9 then return end -- already collected

				local character = hit.Parent
				if not character then return end
				local humanoid = character:FindFirstChildWhichIsA("Humanoid")
				if not humanoid then return end
				local player = Players:GetPlayerFromCharacter(character)
				if not player then return end
				local ps = playerStates[player]
				if not ps or ps.eliminated then return end

				-- Collect fuel
				ps.fuel = math.min(ps.fuel + GameConfig.FUEL_RESTORE, GameConfig.MAX_FUEL)
				FuelPickupCollected:FireAllClients(player.Name, i)

				-- Hide the pickup
				fuelPart.Transparency = 1
				fuelPart.CanTouch = false

				-- Respawn after delay at a random position from the pool
				task.delay(GameConfig.FUEL_RESPAWN_TIME, function()
					if not fuelPart.Parent then return end
					-- Pick a random position from the original positions
					local positions = {}
					for _, pos in pairs(fuelPositions) do
						table.insert(positions, pos)
					end
					local newPos = positions[math.random(1, #positions)]
					-- Offset slightly for variety
					fuelPart.Position = newPos + Vector3.new(math.random(-8, 8), math.random(-4, 4), math.random(-8, 8))
					fuelPart.Transparency = 0.18
					fuelPart.CanTouch = true
				end)
			end)
			table.insert(fuelPickupConnections, conn)
		end
	end
end

local function resetFuelPickups()
	local arena = getArena()
	if not arena then return end
	local originalPositions = {
		Vector3.new(-44, 28, -28),
		Vector3.new(44, 28, 12),
		Vector3.new(-18, 46, 26),
		Vector3.new(20, 46, -20),
		Vector3.new(-28, 64, 8),
		Vector3.new(34, 64, -10),
	}
	for i = 1, 6 do
		local fuelPart = arena:FindFirstChild(string.format("Fuel_%d", i))
		if fuelPart then
			fuelPart.Position = originalPositions[i]
			fuelPart.Transparency = 0.18
			fuelPart.CanTouch = true
		end
	end
end

----------------------------------------------------------------------------
-- Elimination
----------------------------------------------------------------------------
local function eliminatePlayer(player)
	local ps = playerStates[player]
	if not ps or ps.eliminated then return end

	ps.eliminated = true
	ps.isBurning = false
	ps.isVenting = false
	ps.isBoosting = false

	-- Remove velocity control
	if ps.bodyVelocity then
		ps.bodyVelocity.Velocity = Vector3.zero
		ps.bodyVelocity.MaxForce = Vector3.zero
	end

	-- Move to spectator position
	local character = player.Character
	local hrp = character and character:FindFirstChild("HumanoidRootPart")
	if hrp then
		hrp.CFrame = CFrame.new(GameConfig.SPECTATOR_POSITION)
		hrp.AssemblyLinearVelocity = Vector3.zero
		hrp.AssemblyAngularVelocity = Vector3.zero
	end

	-- Remove balloon visual
	removeBalloonRig(player)

	EliminatedEvent:FireAllClients(player.Name)
end

local function countAlivePlayers(): number
	local count = 0
	for _, ps in pairs(playerStates) do
		if not ps.eliminated then
			count += 1
		end
	end
	return count
end

local function getLastAlivePlayer()
	for player, ps in pairs(playerStates) do
		if not ps.eliminated then
			return player
		end
	end
	return nil
end

----------------------------------------------------------------------------
-- Scoring
----------------------------------------------------------------------------
local function calculateResults()
	-- Build ranking list
	local rankings = {}
	for player, ps in pairs(playerStates) do
		local character = player.Character
		local hrp = character and character:FindFirstChild("HumanoidRootPart")
		local altitude = hrp and hrp.Position.Y or 0
		table.insert(rankings, {
			player = player,
			alive = not ps.eliminated,
			altitude = altitude,
			fuel = ps.fuel,
		})
	end

	-- Sort: alive first, then by altitude, then by fuel
	table.sort(rankings, function(a, b)
		if a.alive ~= b.alive then
			return a.alive
		end
		if a.altitude ~= b.altitude then
			return a.altitude > b.altitude
		end
		return a.fuel > b.fuel
	end)

	local scoreValues = { GameConfig.SCORE_1ST, GameConfig.SCORE_2ND, GameConfig.SCORE_3RD }
	local results = {}
	for rank, entry in ipairs(rankings) do
		local score = scoreValues[rank] or GameConfig.SCORE_OTHER
		table.insert(results, {
			name = entry.player.Name,
			rank = rank,
			score = score,
			alive = entry.alive,
			altitude = math.floor(entry.altitude),
			fuel = math.floor(entry.fuel),
		})

		-- Set leaderstats
		local leaderstats = entry.player:FindFirstChild("leaderstats")
		if leaderstats then
			local scoreStat = leaderstats:FindFirstChild("Score")
			if scoreStat then
				scoreStat.Value += score
			end
		end
	end

	return results
end

local function setupLeaderstats(player)
	local leaderstats = player:FindFirstChild("leaderstats")
	if not leaderstats then
		leaderstats = Instance.new("Folder")
		leaderstats.Name = "leaderstats"
		leaderstats.Parent = player
	end
	if not leaderstats:FindFirstChild("Score") then
		local score = Instance.new("IntValue")
		score.Name = "Score"
		score.Parent = leaderstats
	end
end

----------------------------------------------------------------------------
-- Input Handling
----------------------------------------------------------------------------
BurnStart.OnServerEvent:Connect(function(player)
	local ps = playerStates[player]
	if not ps or ps.eliminated then return end
	if ps.fuel <= 0 then return end
	ps.isBurning = true
	ps.isVenting = false
end)

BurnStop.OnServerEvent:Connect(function(player)
	local ps = playerStates[player]
	if not ps then return end
	ps.isBurning = false
end)

VentStart.OnServerEvent:Connect(function(player)
	local ps = playerStates[player]
	if not ps or ps.eliminated then return end
	ps.isVenting = true
	ps.isBurning = false
end)

VentStop.OnServerEvent:Connect(function(player)
	local ps = playerStates[player]
	if not ps then return end
	ps.isVenting = false
end)

Boost.OnServerEvent:Connect(function(player)
	local ps = playerStates[player]
	if not ps or ps.eliminated then return end
	local now = tick()
	if now < ps.boostCooldownEnd then return end
	if ps.fuel < GameConfig.BOOST_FUEL_COST then return end

	ps.fuel -= GameConfig.BOOST_FUEL_COST
	ps.isBoosting = true
	ps.boostEnd = now + GameConfig.BOOST_DURATION
	ps.boostCooldownEnd = now + GameConfig.BOOST_COOLDOWN
end)

-- GRAPPLE HOOK handler
GrappleRequest.OnServerEvent:Connect(function(player)
	local ps = playerStates[player]
	if not ps or ps.eliminated then return end
	local now = tick()
	if (grappleCooldownUntil[player] or 0) > now then return end

	local character = player.Character
	local hrp = character and character:FindFirstChild("HumanoidRootPart")
	if not hrp then return end

	-- Find nearest fuel pickup or other player's balloon
	local bestTarget = nil
	local bestDist = GRAPPLE_RANGE
	local bestType = nil

	-- Check fuel pickups
	local arena = getArena()
	if arena then
		for i = 1, 6 do
			local fuelPart = arena:FindFirstChild(string.format("Fuel_%d", i))
			if fuelPart and fuelPart.Transparency < 0.9 then
				local dist = (fuelPart.Position - hrp.Position).Magnitude
				if dist < bestDist then
					bestDist = dist
					bestTarget = fuelPart
					bestType = "fuel"
				end
			end
		end
	end

	-- Check other players' balloons
	for other, otherPs in pairs(playerStates) do
		if other ~= player and not otherPs.eliminated then
			local otherChar = other.Character
			local otherHrp = otherChar and otherChar:FindFirstChild("HumanoidRootPart")
			if otherHrp then
				local dist = (otherHrp.Position - hrp.Position).Magnitude
				if dist < bestDist then
					bestDist = dist
					bestTarget = other
					bestType = "player"
				end
			end
		end
	end

	if not bestTarget then return end

	grappleCooldownUntil[player] = now + GRAPPLE_COOLDOWN

	if bestType == "fuel" then
		-- Pull player toward fuel pickup
		local dir = (bestTarget.Position - hrp.Position).Unit
		local bv = hrp:FindFirstChild("HavocVelocity")
		if bv then
			bv.Velocity = dir * GRAPPLE_PULL_FORCE + Vector3.new(0, 2, 0)
		end
		task.delay(1.5, function()
			if bv and bv.Parent then
				bv.Velocity = Vector3.new(0, 0, 0)
			end
		end)
		GrappleStateEvent:FireClient(player, "fuel", bestTarget.Position, GRAPPLE_COOLDOWN)
	else
		-- Steal fuel from another player over 2 seconds
		grappleActive[player] = {
			target = bestTarget,
			targetType = "player",
			startedAt = now,
			stealTotal = 0,
		}
		GrappleStateEvent:FireClient(player, "player", bestTarget.Name, GRAPPLE_COOLDOWN)
	end
end)

----------------------------------------------------------------------------
-- Game Loop (Heartbeat)
----------------------------------------------------------------------------
local matchActive = false
local earlyWinPlayer = nil

local function startHeartbeat()
	if heartbeatConnection then
		heartbeatConnection:Disconnect()
	end

	earlyWinPlayer = nil

	heartbeatConnection = RunService.Heartbeat:Connect(function(dt)
		if not matchActive then return end

		local now = tick()

		-- Process active grapple fuel steals
		for grappler, grapple in pairs(grappleActive) do
			if grapple.targetType == "player" then
				local elapsed = now - grapple.startedAt
				if elapsed >= GRAPPLE_STEAL_DURATION or grapple.stealTotal >= GRAPPLE_FUEL_STEAL_TOTAL then
					grappleActive[grappler] = nil
				else
					local targetPs = playerStates[grapple.target]
					local grapplePs = playerStates[grappler]
					if targetPs and grapplePs and not targetPs.eliminated and not grapplePs.eliminated then
						local stealAmount = GRAPPLE_FUEL_STEAL_RATE * dt
						local actualSteal = math.min(stealAmount, targetPs.fuel, GRAPPLE_FUEL_STEAL_TOTAL - grapple.stealTotal)
						if actualSteal > 0 then
							targetPs.fuel -= actualSteal
							grapplePs.fuel = math.min(grapplePs.fuel + actualSteal, GameConfig.MAX_FUEL)
							grapple.stealTotal += actualSteal
						end
					else
						grappleActive[grappler] = nil
					end
				end
			end
		end

		for player, ps in pairs(playerStates) do
			if ps.eliminated then continue end

			local character = player.Character
			local hrp = character and character:FindFirstChild("HumanoidRootPart")
			if not hrp or not ps.bodyVelocity or not ps.bodyVelocity.Parent then continue end

			local altitude = hrp.Position.Y
			local yVelocity = GameConfig.GRAVITY_VELOCITY -- default: slow descent
			local xVelocity = 0

			-- Boost check
			if ps.isBoosting then
				if now >= ps.boostEnd then
					ps.isBoosting = false
				else
					yVelocity = GameConfig.BOOST_VELOCITY
				end
			elseif ps.isBurning and ps.fuel > 0 then
				-- Burn: consume fuel, go up
				ps.fuel -= GameConfig.BURN_FUEL_RATE * dt
				if ps.fuel <= 0 then
					ps.fuel = 0
					ps.isBurning = false
				end
				yVelocity = GameConfig.BURN_VELOCITY
			elseif ps.isVenting then
				-- Vent: descend faster
				yVelocity = GameConfig.VENT_VELOCITY
			end

			-- Max altitude cap
			if altitude >= GameConfig.MAX_ALTITUDE and yVelocity > 0 then
				yVelocity = 0
			end

			-- Wind layer boost
			xVelocity = getWindLayerBoost(altitude)

			-- Apply velocity
			ps.bodyVelocity.Velocity = Vector3.new(xVelocity, yVelocity, 0)

			-- Elimination check
			if altitude < GameConfig.ELIMINATION_Y then
				eliminatePlayer(player)

				-- Check for last player standing
				local aliveCount = countAlivePlayers()
				if aliveCount <= 1 then
					earlyWinPlayer = getLastAlivePlayer()
					matchActive = false
					return
				end
			end

			-- Send state update to this player
			PlayerStateUpdate:FireClient(player, {
				fuel = math.floor(ps.fuel),
				altitude = math.floor(altitude),
				action = getActionState(ps),
				inWindLane = isInWindLayer(altitude),
				boostReady = now >= ps.boostCooldownEnd,
				boostCooldownRemaining = math.max(0, ps.boostCooldownEnd - now),
				grappleReady = (grappleCooldownUntil[player] or 0) <= now,
				grappleCooldownRemaining = math.max(0, (grappleCooldownUntil[player] or 0) - now),
			})
		end
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
-- Match Lifecycle Integration
-- Boot.server.luau drives the lobby/countdown/result loop.
-- We watch the State value to know when to start/stop.
----------------------------------------------------------------------------

Players.PlayerAdded:Connect(function(player)
	setupLeaderstats(player)
end)

-- Setup leaderstats for players already in the game
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
		resetFuelPickups()
		setupFuelPickups()

		for _, player in ipairs(Players:GetPlayers()) do
			initPlayerState(player)
		end

		matchActive = true
		earlyWinPlayer = nil
		startHeartbeat()

	elseif newState == "Result" and previousState == "Playing" then
		-- Match ended
		stopHeartbeat()

		local results = calculateResults()
		MatchResult:FireAllClients(results)

		-- Clean up all player states
		for _, player in ipairs(Players:GetPlayers()) do
			clearPlayerState(player)
		end

	elseif newState == "Lobby" and previousState ~= "Lobby" then
		-- Back to lobby, ensure cleanup
		stopHeartbeat()
		for _, player in ipairs(Players:GetPlayers()) do
			clearPlayerState(player)
		end
	end

	previousState = newState
end)

-- Also handle early win: when only 1 player left, force result
RunService.Heartbeat:Connect(function()
	if earlyWinPlayer and stateValue.Value == "Playing" then
		local winner = earlyWinPlayer
		earlyWinPlayer = nil

		stopHeartbeat()

		local results = calculateResults()
		MatchResult:FireAllClients(results)

		-- Force state to result
		stateValue.Value = "Result"

		-- Clean up
		for _, player in ipairs(Players:GetPlayers()) do
			clearPlayerState(player)
		end
	end
end)
