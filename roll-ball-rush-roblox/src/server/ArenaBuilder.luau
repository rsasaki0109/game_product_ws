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

	createCheckpoint(arena, 0, config.COURSE.spawn + Vector3.new(0, 2, 0))
	for index, position in ipairs(config.COURSE.checkpoints) do
		createCheckpoint(arena, index, position + Vector3.new(0, 2, 0))
	end

	local goalGate = createPart(arena, "GoalGate", Vector3.new(20, 10, 10), CFrame.new(config.COURSE.goal + Vector3.new(0, 5, 0)), theme.goal, Enum.Material.Neon, 0.88, false)
	goalGate.CanTouch = true
	goalGate.CanQuery = false

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
