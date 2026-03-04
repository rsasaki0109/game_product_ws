-- ArenaBuilder
-- Baseball Brawl のアリーナを生成する

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

local function createSpawn(parent: Instance, name: string, position: Vector3, color: BrickColor, lookAt: Vector3)
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
	local oldArena = workspace:FindFirstChild("BaseballBrawlArena")
	if oldArena then
		oldArena:Destroy()
	end

	local arena = Instance.new("Model")
	arena.Name = "BaseballBrawlArena"
	arena.Parent = workspace

	local arenaConfig = config.Arena
	local width = arenaConfig.width
	local length = arenaConfig.length
	local wallHeight = arenaConfig.wallHeight
	local halfW = width * 0.5
	local halfL = length * 0.5

	local field = createPart(arena, "Field", Vector3.new(width, 1, length), CFrame.new(0, 0, 0), Color3.fromRGB(48, 132, 64), Enum.Material.Grass)
	field.CanTouch = false
	createPart(arena, "CenterLine", Vector3.new(width, 0.2, 1), CFrame.new(0, 0.6, 0), Color3.fromRGB(246, 246, 246), Enum.Material.Neon)

	createPart(arena, "Wall_North", Vector3.new(width, wallHeight, 2), CFrame.new(0, wallHeight * 0.5, -halfL), Color3.fromRGB(28, 28, 30), Enum.Material.Concrete)
	createPart(arena, "Wall_South", Vector3.new(width, wallHeight, 2), CFrame.new(0, wallHeight * 0.5, halfL), Color3.fromRGB(28, 28, 30), Enum.Material.Concrete)
	createPart(arena, "Wall_West", Vector3.new(2, wallHeight, length), CFrame.new(-halfW, wallHeight * 0.5, 0), Color3.fromRGB(28, 28, 30), Enum.Material.Concrete)
	createPart(arena, "Wall_East", Vector3.new(2, wallHeight, length), CFrame.new(halfW, wallHeight * 0.5, 0), Color3.fromRGB(28, 28, 30), Enum.Material.Concrete)

	createSpawn(arena, "Spawn_Red", Vector3.new(-arenaConfig.spawnOffsetX, 1.5, 0), BrickColor.new("Really red"), Vector3.new(0, 1.5, 0))
	createSpawn(arena, "Spawn_Blue", Vector3.new(arenaConfig.spawnOffsetX, 1.5, 0), BrickColor.new("Bright blue"), Vector3.new(0, 1.5, 0))

	local goalDepth = arenaConfig.goalDepth
	local goalWidth = arenaConfig.goalWidth
	local goalHeight = arenaConfig.goalHeight

	local redGoalVisual = createPart(arena, "GoalVisual_Red", Vector3.new(goalDepth, goalHeight, goalWidth), CFrame.new(-halfW + goalDepth * 0.5 + 2, goalHeight * 0.5 + 0.5, 0), Color3.fromRGB(235, 79, 79), Enum.Material.Neon, 0.55, false)
	redGoalVisual.CanTouch = false
	local blueGoalVisual = createPart(arena, "GoalVisual_Blue", Vector3.new(goalDepth, goalHeight, goalWidth), CFrame.new(halfW - goalDepth * 0.5 - 2, goalHeight * 0.5 + 0.5, 0), Color3.fromRGB(90, 145, 255), Enum.Material.Neon, 0.55, false)
	blueGoalVisual.CanTouch = false

	local redSensor = createPart(arena, "GoalSensor_Red", Vector3.new(goalDepth * 0.45, goalHeight * 0.9, goalWidth * 0.9), CFrame.new(-halfW + goalDepth * 0.5 + 2, goalHeight * 0.5 + 0.5, 0), Color3.fromRGB(255, 255, 255), Enum.Material.SmoothPlastic, 1, false)
	redSensor.CanQuery = false
	local blueSensor = createPart(arena, "GoalSensor_Blue", Vector3.new(goalDepth * 0.45, goalHeight * 0.9, goalWidth * 0.9), CFrame.new(halfW - goalDepth * 0.5 - 2, goalHeight * 0.5 + 0.5, 0), Color3.fromRGB(255, 255, 255), Enum.Material.SmoothPlastic, 1, false)
	blueSensor.CanQuery = false

	local redDeco = createPart(arena, "RedHalf", Vector3.new(width * 0.5, 0.15, length), CFrame.new(-width * 0.25, 0.61, 0), Color3.fromRGB(120, 40, 40), Enum.Material.Neon, 0.78)
	redDeco.CanCollide = false
	redDeco.CanTouch = false
	local blueDeco = createPart(arena, "BlueHalf", Vector3.new(width * 0.5, 0.15, length), CFrame.new(width * 0.25, 0.61, 0), Color3.fromRGB(35, 70, 120), Enum.Material.Neon, 0.78)
	blueDeco.CanCollide = false
	blueDeco.CanTouch = false

	local ballSpawn = createPart(arena, "BallSpawn", Vector3.new(6, 1, 6), CFrame.new(0, 1.1, 0), Color3.fromRGB(255, 222, 107), Enum.Material.Neon, 0.25)
	ballSpawn.CanCollide = false
	ballSpawn.CanTouch = false

	local chaosCore = createPart(arena, "ChaosCore", Vector3.new(10, 1, 10), CFrame.new(0, 1.2, 0), Color3.fromRGB(255, 128, 47), Enum.Material.Neon, 0.2)
	chaosCore.CanCollide = false
	chaosCore.CanTouch = false

	local bumperOffsetX = width * 0.22
	local bumperOffsetZ = length * 0.28
	local bumperPositions = {
		Vector3.new(-bumperOffsetX, 1.2, -bumperOffsetZ),
		Vector3.new(-bumperOffsetX, 1.2, bumperOffsetZ),
		Vector3.new(bumperOffsetX, 1.2, -bumperOffsetZ),
		Vector3.new(bumperOffsetX, 1.2, bumperOffsetZ),
	}

	for index, position in bumperPositions do
		local bumper = createPart(arena, string.format("Bumper_%d", index), Vector3.new(14, 1.2, 14), CFrame.new(position), Color3.fromRGB(255, 178, 36), Enum.Material.Neon, 0.15)
		bumper.CanCollide = false
	end

	return arena
end

return ArenaBuilder
