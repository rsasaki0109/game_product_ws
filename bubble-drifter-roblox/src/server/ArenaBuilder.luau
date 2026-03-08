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
	gui.StudsOffset = Vector3.new(0, 4.2, 0)
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

local function createCloud(parent, name, position, size, color, labelText)
	local cloud = createPart(parent, name, size, CFrame.new(position), color, Enum.Material.SmoothPlastic, 0, true)
	if labelText then
		addBillboard(cloud, labelText, Color3.fromRGB(41, 58, 82))
	end
	return cloud
end

local function createCheckpoint(parent, index, position)
	local checkpoint = createPart(parent, string.format("Checkpoint_%d", index), Vector3.new(8, 1, 8), CFrame.new(position), Color3.fromRGB(255, 255, 255), Enum.Material.Neon, 1, false)
	checkpoint:SetAttribute("CheckpointIndex", index)
	checkpoint.CanTouch = false
	return checkpoint
end

local function createRing(parent, index, position, color)
	local ring = createPart(parent, string.format("Ring_%d", index), Vector3.new(11, 11, 2), CFrame.new(position), color, Enum.Material.Neon, 0.15, false)
	ring.Shape = Enum.PartType.Cylinder
	ring.CFrame = ring.CFrame * CFrame.Angles(0, 0, math.rad(90))
	ring:SetAttribute("RingIndex", index)
	addBillboard(ring, string.format("RING %d", index), Color3.fromRGB(255, 255, 255))
	return ring
end

local function createWindLane(parent, name, position, size, color, windVector)
	local lane = createPart(parent, name, size, CFrame.new(position), color, Enum.Material.Neon, 0.34, false)
	lane:SetAttribute("WindVectorX", windVector.X)
	lane:SetAttribute("WindVectorY", windVector.Y)
	lane:SetAttribute("WindVectorZ", windVector.Z)
	lane:SetAttribute("LaneName", name)
	return lane
end

function ArenaBuilder.ensureArena(config)
	local old = workspace:FindFirstChild("BubbleDrifterArena")
	if old then
		old:Destroy()
	end

	local arena = Instance.new("Model")
	arena.Name = "BubbleDrifterArena"
	arena.Parent = workspace

	local theme = config.THEME
	local course = config.COURSE

	createPart(arena, "SkyFloor", Vector3.new(280, 2, 280), CFrame.new(0, -6, 0), theme.sky, Enum.Material.SmoothPlastic, 0.22, false)
	createPart(arena, "SkyCeiling", Vector3.new(220, 2, 220), CFrame.new(0, course.maxHeight + 10, -40), Color3.fromRGB(255, 255, 255), Enum.Material.ForceField, 0.88, false).CanTouch = false

	createCloud(arena, "StartCloud", course.spawn, Vector3.new(42, 4, 26), theme.cloud, "START")
	createCloud(arena, "Cloud_1", course.checkpoints[1], Vector3.new(16, 3, 14), theme.cloud, nil)
	createCloud(arena, "Cloud_2", course.checkpoints[2], Vector3.new(16, 3, 14), theme.cloud, nil)
	createCloud(arena, "Cloud_3", course.checkpoints[3], Vector3.new(18, 3, 16), theme.cloud, nil)
	createCloud(arena, "Cloud_4", course.checkpoints[4], Vector3.new(16, 3, 14), theme.cloud, nil)
	createCloud(arena, "Cloud_5", course.checkpoints[5], Vector3.new(16, 3, 14), theme.cloud, nil)
	createCloud(arena, "GoalCloud", course.goal, Vector3.new(34, 4, 24), theme.cloud, "GOAL")

	createCheckpoint(arena, 0, course.spawn + Vector3.new(0, 3, 0))
	for index, checkpointPosition in ipairs(course.checkpoints) do
		createCheckpoint(arena, index, checkpointPosition + Vector3.new(0, 3, 0))
	end

	for index, ringPosition in ipairs(course.rings) do
		createRing(arena, index, ringPosition, theme.ring)
	end

	local goalPad = createPart(arena, "GoalPad", Vector3.new(24, 2, 16), CFrame.new(course.goal + Vector3.new(0, 3.5, 0)), Color3.fromRGB(120, 255, 190), Enum.Material.Neon, 0.12, false)
	goalPad.CanQuery = false
	addBillboard(goalPad, "LAND HERE", Color3.fromRGB(255, 255, 255))

	createWindLane(arena, "WindLane_A", Vector3.new(-28, 28, -20), Vector3.new(22, 8, 70), theme.accent, Vector3.new(18, 0, -26))
	createWindLane(arena, "WindLane_B", Vector3.new(-4, 44, -50), Vector3.new(26, 10, 76), theme.accent, Vector3.new(20, 0, -22))
	createWindLane(arena, "WindLane_C", Vector3.new(18, 62, -80), Vector3.new(24, 10, 68), theme.accent, Vector3.new(-12, 0, -24))

	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "Spawn"
	spawn.Size = Vector3.new(12, 1, 12)
	spawn.CFrame = CFrame.new(course.spawn + Vector3.new(0, 3, 0))
	spawn.Anchored = true
	spawn.Neutral = false
	spawn.AllowTeamChangeOnTouch = false
	spawn.Color = theme.accent
	spawn.Material = Enum.Material.Neon
	spawn.Parent = arena

	return arena
end

return ArenaBuilder
