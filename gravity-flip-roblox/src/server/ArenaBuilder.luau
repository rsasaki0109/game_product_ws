-- ArenaBuilder
-- Gravity Flip Arena: enclosed cube room with platforms on all 6 inner surfaces

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

local function createSpawn(parent, name, position)
	local spawn = Instance.new("SpawnLocation")
	spawn.Name = name
	spawn.Size = Vector3.new(8, 1, 8)
	spawn.Anchored = true
	spawn.Neutral = true
	spawn.AllowTeamChangeOnTouch = false
	spawn.Color = Color3.fromRGB(180, 220, 255)
	spawn.Material = Enum.Material.Neon
	spawn.Transparency = 0.3
	spawn.CFrame = CFrame.new(position)
	spawn.Parent = parent
	return spawn
end

function ArenaBuilder.ensureArena(config)
	local old = workspace:FindFirstChild("GravityFlipArena")
	if old then
		old:Destroy()
	end

	local arena = Instance.new("Model")
	arena.Name = "GravityFlipArena"
	arena.Parent = workspace

	local S = config.ARENA_SIZE
	local half = S * 0.5
	local wallThick = 2
	local theme = config.THEME

	-- Floor (bottom)
	createPart(arena, "Floor", Vector3.new(S, wallThick, S), CFrame.new(0, -half, 0), theme.floor, Enum.Material.SmoothPlastic)

	-- Ceiling (top)
	createPart(arena, "Ceiling", Vector3.new(S, wallThick, S), CFrame.new(0, half, 0), theme.ceiling, Enum.Material.SmoothPlastic)

	-- Wall North (Z-)
	createPart(arena, "Wall_North", Vector3.new(S, S, wallThick), CFrame.new(0, 0, -half), theme.wallNorth, Enum.Material.SmoothPlastic)

	-- Wall South (Z+)
	createPart(arena, "Wall_South", Vector3.new(S, S, wallThick), CFrame.new(0, 0, half), theme.wallSouth, Enum.Material.SmoothPlastic)

	-- Wall East (X+)
	createPart(arena, "Wall_East", Vector3.new(wallThick, S, S), CFrame.new(half, 0, 0), theme.wallEast, Enum.Material.SmoothPlastic)

	-- Wall West (X-)
	createPart(arena, "Wall_West", Vector3.new(wallThick, S, S), CFrame.new(-half, 0, 0), theme.wallWest, Enum.Material.SmoothPlastic)

	-- Platforms on floor
	local platSize = config.PLATFORM_SIZE
	local platThick = config.PLATFORM_THICKNESS
	local floorY = -half + wallThick * 0.5 + platThick * 0.5 + 0.1

	createPart(arena, "Plat_Floor_1", Vector3.new(platSize, platThick, platSize), CFrame.new(-8, floorY, -8), theme.platform, Enum.Material.Concrete)
	createPart(arena, "Plat_Floor_2", Vector3.new(platSize, platThick, platSize), CFrame.new(8, floorY, 8), theme.platform, Enum.Material.Concrete)
	createPart(arena, "Plat_Floor_3", Vector3.new(platSize * 0.7, platThick, platSize * 0.7), CFrame.new(0, floorY + 3, 0), theme.platform, Enum.Material.Concrete)
	createPart(arena, "Plat_Floor_4", Vector3.new(platSize * 0.5, platThick, platSize * 1.2), CFrame.new(10, floorY + 1, -6), theme.platform, Enum.Material.Concrete)

	-- Platforms on ceiling (for upside-down players)
	local ceilY = half - wallThick * 0.5 - platThick * 0.5 - 0.1

	createPart(arena, "Plat_Ceil_1", Vector3.new(platSize, platThick, platSize), CFrame.new(8, ceilY, -8), theme.platform, Enum.Material.Concrete)
	createPart(arena, "Plat_Ceil_2", Vector3.new(platSize, platThick, platSize), CFrame.new(-8, ceilY, 8), theme.platform, Enum.Material.Concrete)
	createPart(arena, "Plat_Ceil_3", Vector3.new(platSize * 0.7, platThick, platSize * 0.7), CFrame.new(0, ceilY - 3, 0), theme.platform, Enum.Material.Concrete)
	createPart(arena, "Plat_Ceil_4", Vector3.new(platSize * 0.5, platThick, platSize * 1.2), CFrame.new(-10, ceilY - 1, 6), theme.platform, Enum.Material.Concrete)

	-- Platforms on Wall North (Z-)
	local wallNorthZ = -half + wallThick * 0.5 + platThick * 0.5 + 0.1
	createPart(arena, "Plat_WN_1", Vector3.new(platSize, platSize * 0.7, platThick), CFrame.new(-6, 6, wallNorthZ), theme.platform, Enum.Material.Concrete)
	createPart(arena, "Plat_WN_2", Vector3.new(platSize, platSize * 0.7, platThick), CFrame.new(8, -4, wallNorthZ), theme.platform, Enum.Material.Concrete)

	-- Platforms on Wall South (Z+)
	local wallSouthZ = half - wallThick * 0.5 - platThick * 0.5 - 0.1
	createPart(arena, "Plat_WS_1", Vector3.new(platSize, platSize * 0.7, platThick), CFrame.new(6, -6, wallSouthZ), theme.platform, Enum.Material.Concrete)
	createPart(arena, "Plat_WS_2", Vector3.new(platSize, platSize * 0.7, platThick), CFrame.new(-8, 4, wallSouthZ), theme.platform, Enum.Material.Concrete)

	-- Platforms on Wall East (X+)
	local wallEastX = half - wallThick * 0.5 - platThick * 0.5 - 0.1
	createPart(arena, "Plat_WE_1", Vector3.new(platThick, platSize * 0.7, platSize), CFrame.new(wallEastX, 5, -7), theme.platform, Enum.Material.Concrete)
	createPart(arena, "Plat_WE_2", Vector3.new(platThick, platSize * 0.7, platSize), CFrame.new(wallEastX, -5, 7), theme.platform, Enum.Material.Concrete)

	-- Platforms on Wall West (X-)
	local wallWestX = -half + wallThick * 0.5 + platThick * 0.5 + 0.1
	createPart(arena, "Plat_WW_1", Vector3.new(platThick, platSize * 0.7, platSize), CFrame.new(wallWestX, -5, -7), theme.platform, Enum.Material.Concrete)
	createPart(arena, "Plat_WW_2", Vector3.new(platThick, platSize * 0.7, platSize), CFrame.new(wallWestX, 5, 7), theme.platform, Enum.Material.Concrete)

	-- Center floating platform (reachable from any gravity direction)
	createPart(arena, "CenterPlatform", Vector3.new(6, 6, 6), CFrame.new(0, 0, 0), theme.neon, Enum.Material.Neon, 0.3)

	-- Edge glow strips on all faces
	local stripThick = 0.3
	local stripWidth = S
	-- Floor edge strips
	createPart(arena, "Strip_Floor_N", Vector3.new(stripWidth, stripThick, stripThick), CFrame.new(0, -half + wallThick * 0.5 + 0.2, -half + wallThick + 0.2), theme.neon, Enum.Material.Neon, 0.3, false)
	createPart(arena, "Strip_Floor_S", Vector3.new(stripWidth, stripThick, stripThick), CFrame.new(0, -half + wallThick * 0.5 + 0.2, half - wallThick - 0.2), theme.neon, Enum.Material.Neon, 0.3, false)

	-- Spawn on floor
	createSpawn(arena, "Spawn", Vector3.new(0, -half + wallThick * 0.5 + 1, 0))

	return arena
end

return ArenaBuilder
