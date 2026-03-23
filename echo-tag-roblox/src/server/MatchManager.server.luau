-- MatchManager
-- Echo Tag: darkness-based tag game with sonar echo pulses and decoys

local Debris = game:GetService("Debris")
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
local EchoPulseRequest = getOrCreateRemote("EchoPulseRequest", "RemoteEvent")
local DecoyRequest = getOrCreateRemote("DecoyRequest", "RemoteEvent")
local SprintRequest = getOrCreateRemote("SprintRequest", "RemoteEvent")
local PlayerStateUpdate = getOrCreateRemote("PlayerStateUpdate", "RemoteEvent")
local MatchResult = getOrCreateRemote("MatchResult", "RemoteEvent")
local TagEvent = getOrCreateRemote("TagEvent", "RemoteEvent")
local EchoPulseVisual = getOrCreateRemote("EchoPulseVisual", "RemoteEvent")
local DecoyPulseVisual = getOrCreateRemote("DecoyPulseVisual", "RemoteEvent")
local PlayerRevealed = getOrCreateRemote("PlayerRevealed", "RemoteEvent")
local GameFeed = getOrCreateRemote("GameFeed", "RemoteEvent")

----------------------------------------------------------------------------
-- State
----------------------------------------------------------------------------
local stateFolder = ReplicatedStorage:WaitForChild("EchoTagState")
local stateValue = stateFolder:WaitForChild("State")

-- [Player] = { isTagger, echoCooldownEnd, decoyCooldownEnd, sprintCooldownEnd,
--              sprintEnd, tagImmunityEnd, tagCount, survivalTime, eliminated }
local playerStates = {}
local heartbeatConnection = nil
local matchActive = false
local matchStartTime = 0
local tagConnections = {}

----------------------------------------------------------------------------
-- Arena References
----------------------------------------------------------------------------
local function getArena()
	return workspace:FindFirstChild("EchoTagArena")
end

----------------------------------------------------------------------------
-- Leaderstats
----------------------------------------------------------------------------
local function setupLeaderstats(player)
	local leaderstats = player:FindFirstChild("leaderstats")
	if not leaderstats then
		leaderstats = Instance.new("Folder")
		leaderstats.Name = "leaderstats"
		leaderstats.Parent = player
	end
	if not leaderstats:FindFirstChild("Tags") then
		local tags = Instance.new("IntValue")
		tags.Name = "Tags"
		tags.Parent = leaderstats
	end
	if not leaderstats:FindFirstChild("Score") then
		local score = Instance.new("IntValue")
		score.Name = "Score"
		score.Parent = leaderstats
	end
end

----------------------------------------------------------------------------
-- Tagger Management
----------------------------------------------------------------------------
local function clearTaggerVisuals(player)
	local character = player.Character
	if not character then
		return
	end

	-- Remove glow
	local light = character:FindFirstChild("TaggerGlow")
	if light then
		light:Destroy()
	end

	local highlight = character:FindFirstChild("TaggerHighlight")
	if highlight then
		highlight:Destroy()
	end
end

local function applyTaggerVisuals(player)
	local character = player.Character
	if not character then
		return
	end
	local hrp = character:FindFirstChild("HumanoidRootPart")
	if not hrp then
		return
	end

	-- Faint red glow (visible even in darkness)
	local existingLight = character:FindFirstChild("TaggerGlow")
	if not existingLight then
		local light = Instance.new("PointLight")
		light.Name = "TaggerGlow"
		light.Color = GameConfig.TAGGER_GLOW_COLOR
		light.Brightness = GameConfig.TAGGER_GLOW_BRIGHTNESS
		light.Range = GameConfig.TAGGER_GLOW_RANGE
		light.Shadows = false
		light.Parent = hrp
	end

	-- Red highlight
	local existingHL = character:FindFirstChild("TaggerHighlight")
	if not existingHL then
		local highlight = Instance.new("Highlight")
		highlight.Name = "TaggerHighlight"
		highlight.FillColor = GameConfig.TAGGER_GLOW_COLOR
		highlight.FillTransparency = 0.85
		highlight.OutlineColor = Color3.fromRGB(255, 80, 80)
		highlight.OutlineTransparency = 0.3
		highlight.DepthMode = Enum.HighlightDepthMode.Occluded
		highlight.Parent = character
	end
end

local function setTagger(player)
	-- Clear old tagger visuals from everyone
	for p, ps in pairs(playerStates) do
		if ps.isTagger then
			ps.isTagger = false
			clearTaggerVisuals(p)
			-- Reset speed
			local char = p.Character
			local hum = char and char:FindFirstChildOfClass("Humanoid")
			if hum then
				hum.WalkSpeed = GameConfig.DEFAULT_WALK_SPEED
			end
		end
	end

	-- Set new tagger
	local ps = playerStates[player]
	if ps then
		ps.isTagger = true
		ps.tagImmunityEnd = tick() + GameConfig.TAG_IMMUNITY_TIME
		applyTaggerVisuals(player)

		-- Tagger gets slight speed bonus
		local character = player.Character
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		if humanoid then
			humanoid.WalkSpeed = GameConfig.DEFAULT_WALK_SPEED + GameConfig.TAGGER_SPEED_BONUS
		end
	end

	GameFeed:FireAllClients(
		string.format("%s is now the TAGGER!", player.Name),
		Color3.fromRGB(255, 80, 80)
	)
end

local function pickRandomTagger()
	local players = Players:GetPlayers()
	if #players == 0 then
		return
	end
	local tagger = players[math.random(1, #players)]
	setTagger(tagger)
end

----------------------------------------------------------------------------
-- Echo Pulse System
----------------------------------------------------------------------------
local function createEchoPulse(origin: Vector3, range: number, color: Color3, sourcePlayer)
	-- Create expanding sphere visual
	local sphere = Instance.new("Part")
	sphere.Name = "EchoPulse"
	sphere.Shape = Enum.PartType.Ball
	sphere.Size = Vector3.new(1, 1, 1)
	sphere.Position = origin
	sphere.Anchored = true
	sphere.CanCollide = false
	sphere.CanTouch = false
	sphere.CanQuery = false
	sphere.Color = color
	sphere.Material = Enum.Material.Neon
	sphere.Transparency = GameConfig.ECHO_TRANSPARENCY_START
	sphere.Parent = workspace

	-- Add PointLight to the sphere
	local light = Instance.new("PointLight")
	light.Brightness = GameConfig.ECHO_REVEAL_LIGHT_BRIGHTNESS
	light.Range = GameConfig.ECHO_REVEAL_LIGHT_RANGE
	light.Color = color
	light.Shadows = false
	light.Parent = sphere

	-- Notify clients for visual effects
	EchoPulseVisual:FireAllClients(origin, range, color, sourcePlayer and sourcePlayer.Name or "")

	-- Expand the sphere over time
	local expandDuration = range / GameConfig.ECHO_EXPAND_SPEED
	local startTime = tick()

	-- Track revealed players
	local revealedPlayers = {}

	task.spawn(function()
		while sphere.Parent do
			local elapsed = tick() - startTime
			local fraction = math.clamp(elapsed / expandDuration, 0, 1)
			local currentRadius = range * fraction
			local diameter = currentRadius * 2

			sphere.Size = Vector3.new(diameter, diameter, diameter)
			sphere.Position = origin

			-- Fade out as it expands
			sphere.Transparency = GameConfig.ECHO_TRANSPARENCY_START + (GameConfig.ECHO_TRANSPARENCY_END - GameConfig.ECHO_TRANSPARENCY_START) * fraction

			-- Check for players within the expanding radius
			for otherPlayer, otherPs in pairs(playerStates) do
				if revealedPlayers[otherPlayer] then
					continue
				end

				local otherChar = otherPlayer.Character
				local otherHrp = otherChar and otherChar:FindFirstChild("HumanoidRootPart")
				if not otherHrp then
					continue
				end

				local dist = (otherHrp.Position - origin).Magnitude
				if dist <= currentRadius then
					revealedPlayers[otherPlayer] = true

					-- Briefly reveal this player with a light
					local revealLight = Instance.new("PointLight")
					revealLight.Name = "EchoReveal"
					revealLight.Brightness = GameConfig.ECHO_REVEAL_LIGHT_BRIGHTNESS
					revealLight.Range = GameConfig.ECHO_REVEAL_LIGHT_RANGE
					revealLight.Color = color
					revealLight.Shadows = false
					revealLight.Parent = otherHrp

					-- Highlight the revealed player
					local revealHL = Instance.new("Highlight")
					revealHL.Name = "EchoRevealHL"
					revealHL.FillColor = color
					revealHL.FillTransparency = 0.6
					revealHL.OutlineColor = color
					revealHL.OutlineTransparency = 0.2
					revealHL.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
					revealHL.Parent = otherChar

					PlayerRevealed:FireAllClients(otherPlayer.Name, otherPs.isTagger)

					-- Remove reveal after duration
					task.delay(GameConfig.ECHO_REVEAL_DURATION, function()
						if revealLight.Parent then
							revealLight:Destroy()
						end
						if revealHL.Parent then
							revealHL:Destroy()
						end
					end)
				end
			end

			if fraction >= 1 then
				break
			end

			task.wait(0.03)
		end

		-- Fade and destroy
		task.wait(0.2)
		if sphere.Parent then
			sphere:Destroy()
		end
	end)

	-- Safety cleanup
	Debris:AddItem(sphere, expandDuration + 1)
end

local function createDecoyPulse(position: Vector3)
	-- Delayed fake echo
	task.delay(GameConfig.DECOY_DELAY, function()
		createEchoPulse(position, GameConfig.DECOY_RANGE, GameConfig.DECOY_COLOR, nil)
		DecoyPulseVisual:FireAllClients(position)
	end)
end

----------------------------------------------------------------------------
-- Tag Detection
----------------------------------------------------------------------------
local function setupTagDetection()
	-- Clean old connections
	for _, conn in ipairs(tagConnections) do
		conn:Disconnect()
	end
	tagConnections = {}

	for player, ps in pairs(playerStates) do
		local character = player.Character
		if not character then
			continue
		end

		local humanoid = character:FindFirstChildOfClass("Humanoid")
		if not humanoid then
			continue
		end

		-- Use Touched on all character parts
		for _, part in ipairs(character:GetChildren()) do
			if not part:IsA("BasePart") then
				continue
			end

			local conn = part.Touched:Connect(function(hit)
				if not matchActive then
					return
				end

				local hitChar = hit.Parent
				if not hitChar then
					return
				end

				local hitPlayer = Players:GetPlayerFromCharacter(hitChar)
				if not hitPlayer or hitPlayer == player then
					return
				end

				local myState = playerStates[player]
				local hitState = playerStates[hitPlayer]
				if not myState or not hitState then
					return
				end

				local now = tick()

				-- Tagger tags hider
				if myState.isTagger and not hitState.isTagger then
					-- Check immunity
					if now < hitState.tagImmunityEnd then
						return
					end
					if now < myState.tagImmunityEnd then
						return
					end

					-- Tag!
					myState.tagCount += 1
					local leaderstats = player:FindFirstChild("leaderstats")
					if leaderstats and leaderstats:FindFirstChild("Tags") then
						leaderstats.Tags.Value += 1
					end

					-- Transfer tagger role
					setTagger(hitPlayer)

					TagEvent:FireAllClients(player.Name, hitPlayer.Name)
					GameFeed:FireAllClients(
						string.format("%s tagged %s!", player.Name, hitPlayer.Name),
						Color3.fromRGB(255, 200, 80)
					)

					-- Refresh tag connections since roles changed
					task.defer(setupTagDetection)
				end
			end)

			table.insert(tagConnections, conn)
		end
	end
end

----------------------------------------------------------------------------
-- Sprint System
----------------------------------------------------------------------------
local function applySprint(player)
	local ps = playerStates[player]
	if not ps then
		return
	end

	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if not humanoid then
		return
	end

	local baseSpeed = GameConfig.DEFAULT_WALK_SPEED
	if ps.isTagger then
		baseSpeed += GameConfig.TAGGER_SPEED_BONUS
	end

	humanoid.WalkSpeed = baseSpeed * GameConfig.SPRINT_SPEED_MULTIPLIER
	ps.sprintEnd = tick() + GameConfig.SPRINT_DURATION

	-- Reset speed after duration
	task.delay(GameConfig.SPRINT_DURATION, function()
		if not playerStates[player] then
			return
		end
		local char = player.Character
		local hum = char and char:FindFirstChildOfClass("Humanoid")
		if hum then
			local base = GameConfig.DEFAULT_WALK_SPEED
			if playerStates[player].isTagger then
				base += GameConfig.TAGGER_SPEED_BONUS
			end
			hum.WalkSpeed = base
		end
	end)
end

----------------------------------------------------------------------------
-- Input Handling
----------------------------------------------------------------------------
EchoPulseRequest.OnServerEvent:Connect(function(player)
	if not matchActive then
		return
	end
	local ps = playerStates[player]
	if not ps then
		return
	end

	local now = tick()
	if now < ps.echoCooldownEnd then
		return
	end

	local character = player.Character
	local hrp = character and character:FindFirstChild("HumanoidRootPart")
	if not hrp then
		return
	end

	ps.echoCooldownEnd = now + GameConfig.ECHO_COOLDOWN
	createEchoPulse(hrp.Position, GameConfig.ECHO_RANGE, GameConfig.ECHO_SPHERE_COLOR, player)
end)

DecoyRequest.OnServerEvent:Connect(function(player)
	if not matchActive then
		return
	end
	local ps = playerStates[player]
	if not ps then
		return
	end

	-- Only hiders can use decoys
	if ps.isTagger then
		return
	end

	local now = tick()
	if now < ps.decoyCooldownEnd then
		return
	end

	local character = player.Character
	local hrp = character and character:FindFirstChild("HumanoidRootPart")
	if not hrp then
		return
	end

	ps.decoyCooldownEnd = now + GameConfig.DECOY_COOLDOWN

	-- Place decoy at player's current position
	createDecoyPulse(hrp.Position)

	GameFeed:FireClient(player, "Decoy placed! It will pulse in 2 seconds.", Color3.fromRGB(255, 180, 60))
end)

SprintRequest.OnServerEvent:Connect(function(player)
	if not matchActive then
		return
	end
	local ps = playerStates[player]
	if not ps then
		return
	end

	local now = tick()
	if now < ps.sprintCooldownEnd then
		return
	end

	ps.sprintCooldownEnd = now + GameConfig.SPRINT_COOLDOWN
	applySprint(player)
end)

----------------------------------------------------------------------------
-- Player State Management
----------------------------------------------------------------------------
local function initPlayerState(player)
	playerStates[player] = {
		isTagger = false,
		echoCooldownEnd = 0,
		decoyCooldownEnd = 0,
		sprintCooldownEnd = 0,
		sprintEnd = 0,
		tagImmunityEnd = 0,
		tagCount = 0,
		survivalTime = 0,
		eliminated = false,
	}

	-- Set default walk speed
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.WalkSpeed = GameConfig.DEFAULT_WALK_SPEED
	end
end

local function clearPlayerState(player)
	clearTaggerVisuals(player)

	-- Remove any echo reveal lights
	local character = player.Character
	if character then
		local revealLight = character:FindFirstChild("EchoReveal", true)
		if revealLight then
			revealLight:Destroy()
		end
		local revealHL = character:FindFirstChild("EchoRevealHL")
		if revealHL then
			revealHL:Destroy()
		end
	end

	playerStates[player] = nil
end

----------------------------------------------------------------------------
-- Results
----------------------------------------------------------------------------
local function calculateResults()
	local rankings = {}
	local now = tick()

	for player, ps in pairs(playerStates) do
		local timeAlive = now - matchStartTime
		table.insert(rankings, {
			player = player,
			isTagger = ps.isTagger,
			tagCount = ps.tagCount,
			survivalTime = timeAlive,
		})
	end

	-- Sort: non-taggers first (survivors), then by tag count, then survival time
	table.sort(rankings, function(a, b)
		-- Survivors (non-taggers) rank higher
		if a.isTagger ~= b.isTagger then
			return not a.isTagger
		end
		-- Among equal roles, more tags = better
		if a.tagCount ~= b.tagCount then
			return a.tagCount > b.tagCount
		end
		return a.survivalTime > b.survivalTime
	end)

	local results = {}
	for rank, entry in ipairs(rankings) do
		local score = 0
		if not entry.isTagger then
			score += GameConfig.SCORE_SURVIVOR
		end
		score += entry.tagCount * GameConfig.SCORE_TAG

		-- Bonus for last hider standing (first rank non-tagger)
		if rank == 1 and not entry.isTagger then
			score += GameConfig.SCORE_LAST_HIDER
		end

		table.insert(results, {
			name = entry.player.Name,
			rank = rank,
			score = score,
			tags = entry.tagCount,
			isTagger = entry.isTagger,
			role = entry.isTagger and "TAGGER" or "HIDER",
		})

		-- Update leaderstats
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
			-- Send state update
			local echoCdRemain = math.max(0, ps.echoCooldownEnd - now)
			local decoyCdRemain = math.max(0, ps.decoyCooldownEnd - now)
			local sprintCdRemain = math.max(0, ps.sprintCooldownEnd - now)
			local isSprinting = now < ps.sprintEnd

			PlayerStateUpdate:FireClient(player, {
				isTagger = ps.isTagger,
				echoCooldown = echoCdRemain,
				decoyCooldown = decoyCdRemain,
				sprintCooldown = sprintCdRemain,
				isSprinting = isSprinting,
				tagCount = ps.tagCount,
				matchTime = math.floor(now - matchStartTime),
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

	-- If tagger left, pick a new one
	if matchActive then
		local hasTagger = false
		for _, ps in pairs(playerStates) do
			if ps.isTagger then
				hasTagger = true
				break
			end
		end
		if not hasTagger then
			-- Pick a random remaining player as tagger
			local remainingPlayers = {}
			for p, _ in pairs(playerStates) do
				table.insert(remainingPlayers, p)
			end
			if #remainingPlayers > 0 then
				setTagger(remainingPlayers[math.random(1, #remainingPlayers)])
				setupTagDetection()
			end
		end
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

		-- Scatter hiders around the arena
		local arena = getArena()
		if arena then
			local hiderSpawn = arena:FindFirstChild("Spawn")
			if hiderSpawn then
				for _, player in ipairs(Players:GetPlayers()) do
					local character = player.Character
					local root = character and character:FindFirstChild("HumanoidRootPart")
					if root then
						root.CFrame = hiderSpawn.CFrame + Vector3.new(math.random(-8, 8), 3, math.random(-8, 8))
						root.AssemblyLinearVelocity = Vector3.zero
					end
				end
			end
		end

		matchStartTime = tick()
		matchActive = true

		-- Pick tagger after a brief delay so everyone spawns first
		task.delay(0.5, function()
			if not matchActive then
				return
			end
			pickRandomTagger()

			-- Move tagger to tagger spawn
			for player, ps in pairs(playerStates) do
				if ps.isTagger then
					local taggerSpawn = arena and arena:FindFirstChild("TaggerSpawn")
					if taggerSpawn then
						local character = player.Character
						local root = character and character:FindFirstChild("HumanoidRootPart")
						if root then
							root.CFrame = taggerSpawn.CFrame + Vector3.new(0, 3, 0)
							root.AssemblyLinearVelocity = Vector3.zero
						end
					end
					break
				end
			end

			setupTagDetection()
		end)

		startHeartbeat()

	elseif newState == "Result" and previousState == "Playing" then
		-- Match ended
		stopHeartbeat()

		-- Clean tag connections
		for _, conn in ipairs(tagConnections) do
			conn:Disconnect()
		end
		tagConnections = {}

		local results = calculateResults()
		MatchResult:FireAllClients(results)

		-- Clean up all echo spheres
		for _, child in ipairs(workspace:GetChildren()) do
			if child.Name == "EchoPulse" then
				child:Destroy()
			end
		end

		-- Clean up
		for _, player in ipairs(Players:GetPlayers()) do
			clearPlayerState(player)
		end

	elseif newState == "Lobby" and previousState ~= "Lobby" then
		stopHeartbeat()

		for _, conn in ipairs(tagConnections) do
			conn:Disconnect()
		end
		tagConnections = {}

		for _, player in ipairs(Players:GetPlayers()) do
			clearPlayerState(player)
		end
	end

	previousState = newState
end)

-- Handle character respawning mid-match
Players.PlayerAdded:Connect(function(player)
	player.CharacterAdded:Connect(function(_character)
		if matchActive then
			task.wait(0.5)
			if not playerStates[player] then
				initPlayerState(player)
			end
			-- Re-apply tagger visuals if needed
			local ps = playerStates[player]
			if ps and ps.isTagger then
				applyTaggerVisuals(player)
			end
			-- Refresh tag detection
			setupTagDetection()
		end
	end)
end)
