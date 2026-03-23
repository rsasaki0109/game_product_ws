-- ArenaBuilder
-- Clone Chaos maze-like building interior

local ArenaBuilder = {}

local function createPart(parent: Instance, name: string, size: Vector3, cframe: CFrame, color: Color3, material: Enum.Material, transparency: number?, canCollide: boolean?)
	local part = Instance.new("Part")
	part.Name = name
	part.Anchored = true
	part.Size = size
	part.CFrame = cframe
	part.Color = color
	part.Material = material
	part.Transparency = transparency or 0
	part.CanCollide = if canCollide == nil then true else canCollide
	part.CanTouch = true
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.Parent = parent
	return part
end

function ArenaBuilder.ensureArena(config)
	local oldArena = workspace:FindFirstChild("CloneChaosArena")
	if oldArena then
		oldArena:Destroy()
	end

	local arena = Instance.new("Model")
	arena.Name = "CloneChaosArena"
	arena.Parent = workspace

	local w = config.ARENA_WIDTH
	local l = config.ARENA_LENGTH
	local halfW = w / 2
	local halfL = l / 2
	local wallH = config.WALL_HEIGHT
	local wallThick = 2

	local floorColor = Color3.fromRGB(60, 60, 65)
	local wallColor = Color3.fromRGB(90, 90, 100)
	local accentColor = Color3.fromRGB(50, 70, 90)

	-- Floor
	createPart(arena, "Floor", Vector3.new(w, 1, l), CFrame.new(0, 0, 0), floorColor, Enum.Material.Concrete)

	-- Ceiling
	createPart(arena, "Ceiling", Vector3.new(w, 1, l), CFrame.new(0, wallH, 0), floorColor, Enum.Material.Concrete)

	-- Outer walls
	createPart(arena, "Wall_North", Vector3.new(w, wallH, wallThick), CFrame.new(0, wallH / 2, -halfL), wallColor, Enum.Material.Concrete)
	createPart(arena, "Wall_South", Vector3.new(w, wallH, wallThick), CFrame.new(0, wallH / 2, halfL), wallColor, Enum.Material.Concrete)
	createPart(arena, "Wall_West", Vector3.new(wallThick, wallH, l), CFrame.new(-halfW, wallH / 2, 0), wallColor, Enum.Material.Concrete)
	createPart(arena, "Wall_East", Vector3.new(wallThick, wallH, l), CFrame.new(halfW, wallH / 2, 0), wallColor, Enum.Material.Concrete)

	-- Interior walls creating rooms and corridors
	-- Horizontal walls with doorways
	local interiorWalls = {
		-- Horizontal dividers
		{pos = Vector3.new(-10, wallH / 2, -15), size = Vector3.new(18, wallH, wallThick)},
		{pos = Vector3.new(18, wallH / 2, -15), size = Vector3.new(14, wallH, wallThick)},
		{pos = Vector3.new(-18, wallH / 2, 0), size = Vector3.new(14, wallH, wallThick)},
		{pos = Vector3.new(10, wallH / 2, 0), size = Vector3.new(18, wallH, wallThick)},
		{pos = Vector3.new(-10, wallH / 2, 15), size = Vector3.new(18, wallH, wallThick)},
		{pos = Vector3.new(18, wallH / 2, 15), size = Vector3.new(14, wallH, wallThick)},
		-- Vertical dividers
		{pos = Vector3.new(0, wallH / 2, -22), size = Vector3.new(wallThick, wallH, 12)},
		{pos = Vector3.new(0, wallH / 2, 22), size = Vector3.new(wallThick, wallH, 12)},
		{pos = Vector3.new(-15, wallH / 2, -7), size = Vector3.new(wallThick, wallH, 14)},
		{pos = Vector3.new(15, wallH / 2, 7), size = Vector3.new(wallThick, wallH, 14)},
	}

	for i, wallDef in interiorWalls do
		createPart(arena, string.format("InnerWall_%d", i), wallDef.size, CFrame.new(wallDef.pos), accentColor, Enum.Material.Concrete)
	end

	-- Hiding spots (crates / boxes)
	local cratePositions = {
		Vector3.new(-24, 2, -24),
		Vector3.new(24, 2, -24),
		Vector3.new(-24, 2, 24),
		Vector3.new(24, 2, 24),
		Vector3.new(0, 2, -8),
		Vector3.new(0, 2, 8),
		Vector3.new(-10, 2, 10),
		Vector3.new(10, 2, -10),
	}

	for i, pos in cratePositions do
		createPart(arena, string.format("Crate_%d", i), Vector3.new(4, 4, 4), CFrame.new(pos), Color3.fromRGB(140, 100, 60), Enum.Material.Wood)
	end

	-- Dim lighting pillars (neon accents)
	local lightPositions = {
		Vector3.new(-12, wallH - 1, -12),
		Vector3.new(12, wallH - 1, -12),
		Vector3.new(-12, wallH - 1, 12),
		Vector3.new(12, wallH - 1, 12),
	}

	for i, pos in lightPositions do
		local light = createPart(arena, string.format("Light_%d", i), Vector3.new(2, 0.5, 2), CFrame.new(pos), Color3.fromRGB(200, 220, 255), Enum.Material.Neon, 0.2, false)
		local pointLight = Instance.new("PointLight")
		pointLight.Brightness = 1
		pointLight.Range = 20
		pointLight.Color = Color3.fromRGB(200, 220, 255)
		pointLight.Parent = light
	end

	-- Spawn locations (in corners of rooms)
	local spawnPositions = {
		Vector3.new(-22, 1.5, -22),
		Vector3.new(22, 1.5, -22),
		Vector3.new(-22, 1.5, 22),
		Vector3.new(22, 1.5, 22),
	}
	for i, pos in spawnPositions do
		local spawn = Instance.new("SpawnLocation")
		spawn.Name = string.format("Spawn_%d", i)
		spawn.Size = Vector3.new(6, 1, 6)
		spawn.Anchored = true
		spawn.Neutral = true
		spawn.AllowTeamChangeOnTouch = false
		spawn.Material = Enum.Material.SmoothPlastic
		spawn.Color = Color3.fromRGB(100, 150, 200)
		spawn.Transparency = 0.4
		spawn.CFrame = CFrame.new(pos)
		spawn.Parent = arena
	end

	return arena
end

return ArenaBuilder
