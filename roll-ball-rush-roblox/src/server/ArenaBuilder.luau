local ArenaBuilder = {}

local function createPart(parent, name, size, cframe, color, material, transparency, canCollide)
	local part = Instance.new("Part")
	part.Name = name
	part.Size = size
	part.CFrame = cframe
	part.Color = color
	part.Material = material or Enum.Material.SmoothPlastic
	part.Transparency = transparency or 0
	part.Anchored = true
	part.CanCollide = canCollide == nil and true or canCollide
	part.CanTouch = true
	part.CanQuery = true
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.Parent = parent
	return part
end

local function addBillboard(target, text, color)
	local gui = Instance.new("BillboardGui")
	gui.Name = target.Name .. "_Label"
	gui.Size = UDim2.fromOffset(180, 42)
	gui.StudsOffset = Vector3.new(0, 4, 0)
	gui.AlwaysOnTop = true
	gui.MaxDistance = 180
	gui.Parent = target

	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Font = Enum.Font.GothamBlack
	label.TextScaled = true
	label.TextColor3 = color
	label.TextStrokeTransparency = 0.35
	label.Text = text
	label.Parent = gui
end

local function createCheckpoint(parent, index, position)
	local checkpoint = createPart(
		parent,
		string.format("Checkpoint_%d", index),
		Vector3.new(16, 6, 16),
		CFrame.new(position),
		Color3.fromRGB(255, 255, 255),
		Enum.Material.Neon,
		1,
		false
	)
	checkpoint:SetAttribute("CheckpointIndex", index)
	checkpoint.CanTouch = true
	checkpoint.CanQuery = false
	return checkpoint
end

-- Create a visible checkpoint ring (large glowing torus-like structure)
local function createCheckpointRing(parent, index, position)
	-- Outer ring frame using 4 neon pillars in a square to form a visible gate
	local ringColor = Color3.fromRGB(255, 166, 87)
	local pillarSize = Vector3.new(1.5, 12, 1.5)
	local halfWidth = 8

	-- Left pillar
	createPart(parent, string.format("CPRing_%d_L", index), pillarSize,
		CFrame.new(position + Vector3.new(-halfWidth, 3, 0)),
		ringColor, Enum.Material.Neon, 0.15, false
	).CanTouch = false

	-- Right pillar
	createPart(parent, string.format("CPRing_%d_R", index), pillarSize,
		CFrame.new(position + Vector3.new(halfWidth, 3, 0)),
		ringColor, Enum.Material.Neon, 0.15, false
	).CanTouch = false

	-- Top beam
	createPart(parent, string.format("CPRing_%d_T", index), Vector3.new(halfWidth * 2 + 1.5, 1.5, 1.5),
		CFrame.new(position + Vector3.new(0, 9, 0)),
		ringColor, Enum.Material.Neon, 0.15, false
	).CanTouch = false

	-- Glowing base plate (visible marker on ground)
	local basePlate = createPart(parent, string.format("CPRing_%d_Base", index), Vector3.new(halfWidth * 2, 0.3, 4),
		CFrame.new(position + Vector3.new(0, -0.5, 0)),
		ringColor, Enum.Material.Neon, 0.3, false
	)
	basePlate.CanTouch = false

	-- Label
	addBillboard(basePlate, string.format("CP %d", index), Color3.fromRGB(255, 255, 255))
end

-- Create guard rails along course edges
local function createGuardRail(parent, name, position, size, angle)
	local cframe = CFrame.new(position)
	if angle then
		cframe = cframe * CFrame.Angles(0, math.rad(angle), 0)
	end
	local rail = createPart(parent, name, size, cframe,
		Color3.fromRGB(180, 190, 200), Enum.Material.SmoothPlastic, 0, true
	)
	rail.CanTouch = false
	return rail
end

-- Create directional arrow marker
local function createArrowMarker(parent, index, position, direction)
	-- Arrow is a wedge-shaped part pointing the travel direction
	local arrowColor = Color3.fromRGB(255, 200, 100)
	local arrow = createPart(parent, string.format("Arrow_%d", index), Vector3.new(3, 0.3, 5),
		CFrame.lookAt(position, position + direction) * CFrame.new(0, 0, 0),
		arrowColor, Enum.Material.Neon, 0.2, false
	)
	arrow.CanTouch = false
	arrow.Shape = Enum.PartType.Wedge
	return arrow
end

function ArenaBuilder.ensureArena(config)
	local old = workspace:FindFirstChild("RollBallRushArena")
	if old then
		old:Destroy()
	end

	local arena = Instance.new("Model")
	arena.Name = "RollBallRushArena"
	arena.Parent = workspace

	local theme = config.THEME

	createPart(arena, "SkyFloor", Vector3.new(320, 4, 320), CFrame.new(0, -24, -88), theme.sky, Enum.Material.SmoothPlastic, 0.15, false)
	createPart(arena, "StartPlatform", Vector3.new(28, 2, 28), CFrame.new(0, 10, 18), theme.track, Enum.Material.SmoothPlastic, 0, true)
	createPart(arena, "Ramp_1", Vector3.new(24, 2, 58), CFrame.new(0, 8, -12) * CFrame.Angles(math.rad(-8), 0, 0), theme.track, Enum.Material.SmoothPlastic, 0, true)
	createPart(arena, "Landing_1", Vector3.new(30, 2, 20), CFrame.new(24, 6, -58), theme.track, Enum.Material.SmoothPlastic, 0, true)
	createPart(arena, "Ramp_2", Vector3.new(24, 2, 54), CFrame.new(24, 4, -92) * CFrame.Angles(math.rad(-10), 0, 0), theme.track, Enum.Material.SmoothPlastic, 0, true)
	createPart(arena, "CrossLane", Vector3.new(58, 2, 24), CFrame.new(-2, 2, -128), theme.track, Enum.Material.SmoothPlastic, 0, true)
	createPart(arena, "FinalRamp", Vector3.new(24, 2, 52), CFrame.new(0, 1, -168) * CFrame.Angles(math.rad(-7), 0, 0), theme.track, Enum.Material.SmoothPlastic, 0, true)
	local goalPlatform = createPart(arena, "GoalPlatform", Vector3.new(28, 2, 24), CFrame.new(config.COURSE.goal), theme.goal, Enum.Material.Neon, 0.08, true)
	addBillboard(goalPlatform, "GOAL", Color3.fromRGB(255, 255, 255))

	local boostStrip = createPart(arena, "BoostStrip", Vector3.new(18, 0.4, 20), CFrame.new(0, 11.1, 2), theme.boost, Enum.Material.Neon, 0.15, false)
	addBillboard(boostStrip, "BOOST LANE", Color3.fromRGB(88, 70, 36))

	local brakeZone = createPart(arena, "BrakeZone", Vector3.new(18, 0.4, 18), CFrame.new(-2, 2.1, -142), theme.brake, Enum.Material.Neon, 0.2, false)
	addBillboard(brakeZone, "BRAKE", Color3.fromRGB(255, 255, 255))

	-- Invisible checkpoint triggers
	createCheckpoint(arena, 0, config.COURSE.spawn + Vector3.new(0, 2, 0))
	for index, position in ipairs(config.COURSE.checkpoints) do
		createCheckpoint(arena, index, position + Vector3.new(0, 2, 0))
	end

	-- Visible checkpoint rings (large, glowing gates)
	for index, position in ipairs(config.COURSE.checkpoints) do
		createCheckpointRing(arena, index, position)
	end

	local goalGate = createPart(arena, "GoalGate", Vector3.new(20, 10, 10), CFrame.new(config.COURSE.goal + Vector3.new(0, 5, 0)), theme.goal, Enum.Material.Neon, 0.88, false)
	goalGate.CanTouch = true
	goalGate.CanQuery = false

	-- Guard rails along course edges (low walls, 3 studs tall)
	-- Ramp 1 rails
	createGuardRail(arena, "Rail_R1_L", Vector3.new(-12, 10, -12), Vector3.new(1.5, 3, 58), 0)
	createGuardRail(arena, "Rail_R1_R", Vector3.new(12, 10, -12), Vector3.new(1.5, 3, 58), 0)
	-- Landing 1 rails
	createGuardRail(arena, "Rail_L1_L", Vector3.new(9, 8, -58), Vector3.new(1.5, 3, 20), 0)
	createGuardRail(arena, "Rail_L1_R", Vector3.new(39, 8, -58), Vector3.new(1.5, 3, 20), 0)
	-- Ramp 2 rails
	createGuardRail(arena, "Rail_R2_L", Vector3.new(12, 6, -92), Vector3.new(1.5, 3, 54), 0)
	createGuardRail(arena, "Rail_R2_R", Vector3.new(36, 6, -92), Vector3.new(1.5, 3, 54), 0)
	-- CrossLane rails
	createGuardRail(arena, "Rail_CL_F", Vector3.new(-2, 4, -116), Vector3.new(58, 3, 1.5), 0)
	createGuardRail(arena, "Rail_CL_B", Vector3.new(-2, 4, -140), Vector3.new(58, 3, 1.5), 0)
	-- Final ramp rails
	createGuardRail(arena, "Rail_FR_L", Vector3.new(-12, 3, -168), Vector3.new(1.5, 3, 52), 0)
	createGuardRail(arena, "Rail_FR_R", Vector3.new(12, 3, -168), Vector3.new(1.5, 3, 52), 0)

	-- Course direction arrows at each checkpoint
	local directions = {
		Vector3.new(0, 0, -1),   -- CP1: forward
		Vector3.new(1, 0, -1).Unit,  -- CP2: forward-right
		Vector3.new(-1, 0, -1).Unit, -- CP3: forward-left
		Vector3.new(0, 0, -1),  -- CP4: forward
	}
	for index, position in ipairs(config.COURSE.checkpoints) do
		local dir = directions[index] or Vector3.new(0, 0, -1)
		createArrowMarker(arena, index, position + Vector3.new(0, 0.5, -3), dir)
	end

	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "Spawn"
	spawn.Size = Vector3.new(12, 1, 12)
	spawn.CFrame = CFrame.new(config.COURSE.spawn + Vector3.new(0, 2, 0))
	spawn.Anchored = true
	spawn.Neutral = false
	spawn.AllowTeamChangeOnTouch = false
	spawn.Color = theme.accent
	spawn.Material = Enum.Material.Neon
	spawn.Parent = arena

	return arena
end

return ArenaBuilder
