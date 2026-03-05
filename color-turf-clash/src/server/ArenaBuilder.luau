local ArenaBuilder = {}

local function createPart(parent, name, size, cframe, color, material, transparency, canCollide)
	local part = Instance.new("Part")
	part.Name = name
	part.Anchored = true
	part.Size = size
	part.CFrame = cframe
	part.Color = color
	part.Material = material
	part.Transparency = transparency or 0
	part.CanCollide = canCollide == nil and true or canCollide
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.Parent = parent
	return part
end

local function createSpawn(parent, name, position, color, lookAt)
	local spawn = Instance.new("SpawnLocation")
	spawn.Name = name
	spawn.Size = Vector3.new(10, 1, 10)
	spawn.Anchored = true
	spawn.Neutral = false
	spawn.AllowTeamChangeOnTouch = false
	spawn.TeamColor = color
	spawn.Color = color.Color
	spawn.Material = Enum.Material.SmoothPlastic
	spawn.CFrame = CFrame.lookAt(position, lookAt)
	spawn.Parent = parent
	return spawn
end

function ArenaBuilder.ensureArena(config)
	local old = workspace:FindFirstChild("ColorTurfArena")
	if old then
		old:Destroy()
	end

	local arena = Instance.new("Model")
	arena.Name = "ColorTurfArena"
	arena.Parent = workspace

	local arenaConfig = config.Arena
	local width = arenaConfig.width
	local length = arenaConfig.length
	local halfW = width * 0.5
	local halfL = length * 0.5

	createPart(arena, "FloorBase", Vector3.new(width, 1, length), CFrame.new(0, 0, 0), config.Teams.Neutral.dark, Enum.Material.Asphalt, 0, true)
	createPart(arena, "Wall_North", Vector3.new(width, arenaConfig.wallHeight, 2), CFrame.new(0, arenaConfig.wallHeight * 0.5, -halfL), Color3.fromRGB(24, 24, 30), Enum.Material.Concrete)
	createPart(arena, "Wall_South", Vector3.new(width, arenaConfig.wallHeight, 2), CFrame.new(0, arenaConfig.wallHeight * 0.5, halfL), Color3.fromRGB(24, 24, 30), Enum.Material.Concrete)
	createPart(arena, "Wall_West", Vector3.new(2, arenaConfig.wallHeight, length), CFrame.new(-halfW, arenaConfig.wallHeight * 0.5, 0), Color3.fromRGB(24, 24, 30), Enum.Material.Concrete)
	createPart(arena, "Wall_East", Vector3.new(2, arenaConfig.wallHeight, length), CFrame.new(halfW, arenaConfig.wallHeight * 0.5, 0), Color3.fromRGB(24, 24, 30), Enum.Material.Concrete)

	createSpawn(arena, "Spawn_Red", Vector3.new(-arenaConfig.spawnOffsetX, 1.5, 0), BrickColor.new("Really red"), Vector3.new(0, 2, 0))
	createSpawn(arena, "Spawn_Blue", Vector3.new(arenaConfig.spawnOffsetX, 1.5, 0), BrickColor.new("Bright blue"), Vector3.new(0, 2, 0))

	local decoRed = createPart(arena, "RedZone", Vector3.new(width * 0.5, 0.2, length), CFrame.new(-width * 0.25, 0.62, 0), config.Teams.Red.dark, Enum.Material.Neon, 0.8, false)
	local decoBlue = createPart(arena, "BlueZone", Vector3.new(width * 0.5, 0.2, length), CFrame.new(width * 0.25, 0.62, 0), config.Teams.Blue.dark, Enum.Material.Neon, 0.8, false)
	decoRed.CanTouch = false
	decoBlue.CanTouch = false

	local centerMarker = createPart(arena, "CenterMarker", Vector3.new(12, 0.4, 12), CFrame.new(0, 0.65, 0), Color3.fromRGB(255, 224, 95), Enum.Material.Neon, 0.18, false)
	centerMarker.CanTouch = false

	return arena
end

return ArenaBuilder
