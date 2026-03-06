local ArenaBuilder = {}

local function createPart(parent, name, size, cframe, color, material, transparency, canCollide)
	local part = Instance.new("Part")
	part.Name = name
	part.Anchored = true
	part.Size = size
	part.CFrame = cframe
	part.Color = color
	part.Material = material or Enum.Material.SmoothPlastic
	part.Transparency = transparency or 0
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
	gui.Size = UDim2.fromOffset(180, 44)
	gui.StudsOffset = Vector3.new(0, 4.5, 0)
	gui.AlwaysOnTop = true
	gui.MaxDistance = 180
	gui.Parent = target

	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Font = Enum.Font.GothamBlack
	label.TextScaled = true
	label.TextColor3 = color or Color3.fromRGB(255, 255, 255)
	label.TextStrokeTransparency = 0.35
	label.Text = text
	label.Parent = gui
end

local function createIsland(parent, name, center, size, labelText)
	local island = createPart(parent, name, size, CFrame.new(center), Color3.fromRGB(35, 39, 52), Enum.Material.Slate)
	local trim = createPart(parent, name .. "_Trim", Vector3.new(size.X + 2, 0.4, size.Z + 2), CFrame.new(center + Vector3.new(0, size.Y * 0.5 + 0.21, 0)), Color3.fromRGB(104, 112, 145), Enum.Material.Neon, 0.15, false)
	trim.CanTouch = false
	if labelText then
		addBillboard(island, labelText, Color3.fromRGB(255, 255, 255))
	end
	return island
end

local function createCheckpoint(parent, name, center, labelText, color, checkpointIndex)
	local pad = createPart(parent, name, Vector3.new(14, 1, 10), CFrame.new(center), color, Enum.Material.Neon, 0.08, false)
	pad:SetAttribute("CheckpointIndex", checkpointIndex)
	addBillboard(pad, labelText, Color3.fromRGB(255, 255, 255))
	return pad
end

local function createGuide(parent, text, center, color)
	local plate = createPart(parent, text .. "_Guide", Vector3.new(16, 1, 16), CFrame.new(center), color, Enum.Material.Neon, 0.28, false)
	plate.CanTouch = false
	addBillboard(plate, text, Color3.fromRGB(255, 255, 255))
end

function ArenaBuilder.ensureArena(config)
	local old = workspace:FindFirstChild("WordStepArena")
	if old then
		old:Destroy()
	end

	local arena = Instance.new("Model")
	arena.Name = "WordStepArena"
	arena.Parent = workspace

	local course = config.COURSE

	createIsland(arena, "StartIsland", Vector3.new(course.startX, course.startHeight, 0), Vector3.new(30, 3, 22), "START")
	createIsland(arena, "Island_1", Vector3.new(course.checkpoint1X, course.startHeight, 0), Vector3.new(18, 3, 18), "STEP")
	createIsland(arena, "Island_2", Vector3.new(course.checkpoint2X, course.startHeight, 0), Vector3.new(20, 3, 18), "BRIDGE")
	createIsland(arena, "Island_3", Vector3.new(course.checkpoint3X, course.highHeight, 0), Vector3.new(22, 3, 18), "UP")
	createIsland(arena, "FinishIsland", Vector3.new(course.finishX, course.highHeight, 0), Vector3.new(34, 3, 24), "FINISH")

	local spawn = createPart(arena, course.spawnName, Vector3.new(10, 1, 10), CFrame.new(course.startX, course.startHeight + 2.1, 0), Color3.fromRGB(82, 214, 255), Enum.Material.Neon, 0.4, false)
	spawn.CanTouch = false

	createCheckpoint(arena, "Checkpoint_1", Vector3.new(course.checkpoint1X, course.startHeight + 2.1, 0), "CP 1", Color3.fromRGB(239, 114, 114), 1)
	createCheckpoint(arena, "Checkpoint_2", Vector3.new(course.checkpoint2X, course.startHeight + 2.1, 0), "CP 2", Color3.fromRGB(255, 214, 92), 2)
	createCheckpoint(arena, "Checkpoint_3", Vector3.new(course.checkpoint3X, course.highHeight + 2.1, 0), "CP 3", Color3.fromRGB(92, 235, 255), 3)

	local finish = createPart(arena, course.finishName, Vector3.new(22, 1, 12), CFrame.new(course.finishX, course.highHeight + 2.1, 0), Color3.fromRGB(111, 255, 151), Enum.Material.Neon, 0.05, false)
	addBillboard(finish, "GOAL", Color3.fromRGB(255, 255, 255))

	createGuide(arena, "STEP", Vector3.new(-96, course.startHeight + 6, 0), Color3.fromRGB(245, 245, 245))
	createGuide(arena, "BRIDGE", Vector3.new(-44, course.startHeight + 6, 0), Color3.fromRGB(255, 214, 92))
	createGuide(arena, "UP", Vector3.new(10, course.highHeight + 4, 0), Color3.fromRGB(92, 235, 255))

	local skyBase = createPart(arena, "SkyBase", Vector3.new(520, 2, 200), CFrame.new(-10, 0, 0), Color3.fromRGB(190, 210, 255), Enum.Material.SmoothPlastic, 0.88, false)
	skyBase.CanTouch = false
	skyBase.CanQuery = false

	return arena
end

return ArenaBuilder
