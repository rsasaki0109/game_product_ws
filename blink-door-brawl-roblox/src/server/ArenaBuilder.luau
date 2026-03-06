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
	gui.MaxDistance = 170
	gui.Parent = target

	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Font = Enum.Font.GothamBlack
	label.TextScaled = true
	label.TextStrokeTransparency = 0.35
	label.TextColor3 = color or Color3.fromRGB(255, 255, 255)
	label.Text = text
	label.Parent = gui
end

local function createIsland(parent, name, center, size, label)
	local island = createPart(parent, name, size, CFrame.new(center), Color3.fromRGB(37, 42, 54), Enum.Material.Slate)
	local top = createPart(parent, name .. "_Top", Vector3.new(size.X + 2, 0.4, size.Z + 2), CFrame.new(center + Vector3.new(0, size.Y * 0.5 + 0.2, 0)), Color3.fromRGB(118, 128, 166), Enum.Material.Neon, 0.18, false)
	top.CanTouch = false
	if label then
		addBillboard(island, label, Color3.fromRGB(255, 255, 255))
	end
	return island
end

function ArenaBuilder.ensureArena(config)
	local old = workspace:FindFirstChild("BlinkDoorArena")
	if old then
		old:Destroy()
	end

	local arena = Instance.new("Model")
	arena.Name = "BlinkDoorArena"
	arena.Parent = workspace

	local arenaConfig = config.Arena
	local y = arenaConfig.centerY
	local offset = arenaConfig.offset

	createIsland(arena, "CenterIsland", Vector3.new(0, y, 0), arenaConfig.centerSize, "CENTER")
	createIsland(arena, "NorthIsland", Vector3.new(0, y, -offset), arenaConfig.sideSize, "NORTH")
	createIsland(arena, "SouthIsland", Vector3.new(0, y, offset), arenaConfig.sideSize, "SOUTH")
	createIsland(arena, "EastIsland", Vector3.new(offset, y, 0), arenaConfig.sideSize, "EAST")
	createIsland(arena, "WestIsland", Vector3.new(-offset, y, 0), arenaConfig.sideSize, "WEST")

	local spawnPositions = {
		Vector3.new(-arenaConfig.spawnRadius, y + 2.2, -arenaConfig.spawnRadius),
		Vector3.new(arenaConfig.spawnRadius, y + 2.2, -arenaConfig.spawnRadius),
		Vector3.new(-arenaConfig.spawnRadius, y + 2.2, arenaConfig.spawnRadius),
		Vector3.new(arenaConfig.spawnRadius, y + 2.2, arenaConfig.spawnRadius),
	}
	for index, position in ipairs(spawnPositions) do
		local spawn = createPart(arena, string.format("Spawn_%d", index), Vector3.new(8, 1, 8), CFrame.new(position), Color3.fromRGB(91, 226, 255), Enum.Material.Neon, 0.25, false)
		addBillboard(spawn, string.format("SPAWN %d", index), Color3.fromRGB(255, 255, 255))
	end

	local backdrop = createPart(arena, "Backdrop", Vector3.new(420, 2, 420), CFrame.new(0, 0, 0), Color3.fromRGB(184, 209, 255), Enum.Material.SmoothPlastic, 0.9, false)
	backdrop.CanTouch = false
	backdrop.CanQuery = false

	local pad = createPart(arena, "CenterBadge", Vector3.new(14, 0.5, 14), CFrame.new(0, y + 1.9, 0), Color3.fromRGB(255, 177, 78), Enum.Material.Neon, 0.1, false)
	pad.CanTouch = false

	return arena
end

return ArenaBuilder
