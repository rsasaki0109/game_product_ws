-- ArenaBuilder
-- Echo Tag: dark enclosed room with pillars and hiding spots

local ArenaBuilder = {}

local function createPart(parent, name, size, cframe, color, material, transparency, canCollide)
	local part = Instance.new("Part")
	part.Name = name
	part.Size = size
	part.CFrame = cframe
	part.Color = color
	part.Material = material
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

function ArenaBuilder.ensureArena(config)
	local old = workspace:FindFirstChild("EchoTagArena")
	if old then
		old:Destroy()
	end

	local arena = Instance.new("Model")
	arena.Name = "EchoTagArena"
	arena.Parent = workspace

	local W = config.ARENA_WIDTH
	local L = config.ARENA_LENGTH
	local H = config.ARENA_HEIGHT
	local halfW = W * 0.5
	local halfL = L * 0.5
	local wallThick = 2
	local theme = config.THEME

	-- Floor
	createPart(arena, "Floor", Vector3.new(W, wallThick, L), CFrame.new(0, 0, 0), theme.floor, Enum.Material.SmoothPlastic)

	-- Ceiling
	createPart(arena, "Ceiling", Vector3.new(W + 4, wallThick, L + 4), CFrame.new(0, H, 0), theme.ceiling, Enum.Material.SmoothPlastic)

	-- Walls
	createPart(arena, "Wall_North", Vector3.new(W + 4, H, wallThick), CFrame.new(0, H * 0.5, -halfL), theme.wall, Enum.Material.SmoothPlastic)
	createPart(arena, "Wall_South", Vector3.new(W + 4, H, wallThick), CFrame.new(0, H * 0.5, halfL), theme.wall, Enum.Material.SmoothPlastic)
	createPart(arena, "Wall_East", Vector3.new(wallThick, H, L + 4), CFrame.new(halfW, H * 0.5, 0), theme.wall, Enum.Material.SmoothPlastic)
	createPart(arena, "Wall_West", Vector3.new(wallThick, H, L + 4), CFrame.new(-halfW, H * 0.5, 0), theme.wall, Enum.Material.SmoothPlastic)

	-- Pillars (cylindrical obstacles scattered around)
	local pillarPositions = {
		Vector3.new(-18, 0, -18),
		Vector3.new(18, 0, -18),
		Vector3.new(-18, 0, 18),
		Vector3.new(18, 0, 18),
		Vector3.new(0, 0, -12),
		Vector3.new(0, 0, 12),
		Vector3.new(-10, 0, 0),
		Vector3.new(10, 0, 0),
		Vector3.new(-22, 0, 6),
		Vector3.new(22, 0, -6),
		Vector3.new(-8, 0, -22),
		Vector3.new(8, 0, 22),
	}

	for index, pos in ipairs(pillarPositions) do
		local pillarHeight = math.random(8, 14)
		local pillarRadius = math.random(2, 4)
		local pillar = createPart(
			arena,
			string.format("Pillar_%d", index),
			Vector3.new(pillarRadius * 2, pillarHeight, pillarRadius * 2),
			CFrame.new(pos.X, pillarHeight * 0.5 + 1, pos.Z),
			theme.pillar,
			Enum.Material.Concrete
		)
		pillar.Shape = Enum.PartType.Cylinder
		pillar.CFrame = CFrame.new(pos.X, pillarHeight * 0.5 + 1, pos.Z) * CFrame.Angles(0, 0, math.rad(90))
		pillar.Size = Vector3.new(pillarHeight, pillarRadius * 2, pillarRadius * 2)
	end

	-- Hiding walls (low walls to crouch behind)
	local hideWallPositions = {
		{ pos = Vector3.new(-14, 0, -8), rot = 0, w = 8, h = 5 },
		{ pos = Vector3.new(14, 0, 8), rot = math.rad(45), w = 6, h = 4 },
		{ pos = Vector3.new(6, 0, -20), rot = math.rad(90), w = 10, h = 6 },
		{ pos = Vector3.new(-6, 0, 20), rot = math.rad(-30), w = 8, h = 5 },
		{ pos = Vector3.new(-20, 0, -20), rot = math.rad(60), w = 6, h = 4 },
		{ pos = Vector3.new(20, 0, 20), rot = math.rad(-60), w = 7, h = 5 },
	}

	for index, hw in ipairs(hideWallPositions) do
		createPart(
			arena,
			string.format("HideWall_%d", index),
			Vector3.new(hw.w, hw.h, 2),
			CFrame.new(hw.pos.X, hw.h * 0.5 + 1, hw.pos.Z) * CFrame.Angles(0, hw.rot, 0),
			theme.hideWall,
			Enum.Material.Concrete
		)
	end

	-- Spawn locations
	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "Spawn"
	spawn.Size = Vector3.new(10, 1, 10)
	spawn.CFrame = CFrame.new(0, 1.5, 0)
	spawn.Anchored = true
	spawn.Neutral = true
	spawn.AllowTeamChangeOnTouch = false
	spawn.Color = theme.spawn
	spawn.Material = Enum.Material.Neon
	spawn.Transparency = 0.5
	spawn.Parent = arena

	-- Tagger spawn (corner)
	local taggerSpawn = Instance.new("SpawnLocation")
	taggerSpawn.Name = "TaggerSpawn"
	taggerSpawn.Size = Vector3.new(6, 1, 6)
	taggerSpawn.CFrame = CFrame.new(-halfW + 5, 1.5, -halfL + 5)
	taggerSpawn.Anchored = true
	taggerSpawn.Neutral = true
	taggerSpawn.AllowTeamChangeOnTouch = false
	taggerSpawn.Color = theme.taggerSpawn
	taggerSpawn.Material = Enum.Material.Neon
	taggerSpawn.Transparency = 0.5
	taggerSpawn.Parent = arena

	return arena
end

return ArenaBuilder
