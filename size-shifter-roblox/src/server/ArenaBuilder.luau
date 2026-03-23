-- ArenaBuilder
-- Size Shifter arena with pillars, ramps, and tiny-only tunnels

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
	local oldArena = workspace:FindFirstChild("SizeShifterArena")
	if oldArena then
		oldArena:Destroy()
	end

	local arena = Instance.new("Model")
	arena.Name = "SizeShifterArena"
	arena.Parent = workspace

	local w = config.ARENA_WIDTH
	local l = config.ARENA_LENGTH
	local halfW = w / 2
	local halfL = l / 2
	local wallH = config.WALL_HEIGHT

	-- Floor
	createPart(arena, "Floor", Vector3.new(w, 1, l), CFrame.new(0, 0, 0), Color3.fromRGB(80, 80, 90), Enum.Material.Concrete)

	-- Walls
	createPart(arena, "Wall_North", Vector3.new(w, wallH, 3), CFrame.new(0, wallH / 2, -halfL), Color3.fromRGB(50, 50, 60), Enum.Material.Concrete)
	createPart(arena, "Wall_South", Vector3.new(w, wallH, 3), CFrame.new(0, wallH / 2, halfL), Color3.fromRGB(50, 50, 60), Enum.Material.Concrete)
	createPart(arena, "Wall_West", Vector3.new(3, wallH, l), CFrame.new(-halfW, wallH / 2, 0), Color3.fromRGB(50, 50, 60), Enum.Material.Concrete)
	createPart(arena, "Wall_East", Vector3.new(3, wallH, l), CFrame.new(halfW, wallH / 2, 0), Color3.fromRGB(50, 50, 60), Enum.Material.Concrete)

	-- Pillars (cover for normal/tiny players)
	local pillarPositions = {
		Vector3.new(-20, 5, -20),
		Vector3.new(20, 5, -20),
		Vector3.new(-20, 5, 20),
		Vector3.new(20, 5, 20),
		Vector3.new(0, 5, 0),
	}
	for i, pos in pillarPositions do
		createPart(arena, string.format("Pillar_%d", i), Vector3.new(4, 10, 4), CFrame.new(pos), Color3.fromRGB(140, 140, 160), Enum.Material.Concrete)
	end

	-- Ramps (for accessing elevated platforms)
	createPart(arena, "Ramp_NW", Vector3.new(8, 1, 16), CFrame.new(-28, 2, -28) * CFrame.Angles(math.rad(-15), 0, 0), Color3.fromRGB(200, 170, 80), Enum.Material.Wood)
	createPart(arena, "Ramp_SE", Vector3.new(8, 1, 16), CFrame.new(28, 2, 28) * CFrame.Angles(math.rad(-15), 0, 0), Color3.fromRGB(200, 170, 80), Enum.Material.Wood)

	-- Elevated platforms
	createPart(arena, "Platform_NW", Vector3.new(12, 1, 12), CFrame.new(-28, 5, -34), Color3.fromRGB(120, 160, 120), Enum.Material.Concrete)
	createPart(arena, "Platform_SE", Vector3.new(12, 1, 12), CFrame.new(28, 5, 34), Color3.fromRGB(120, 160, 120), Enum.Material.Concrete)

	-- Tiny-only tunnels (openings only 2 studs tall -- giants and normals cannot fit)
	local tunnelColor = Color3.fromRGB(100, 80, 140)
	-- Tunnel 1: west side
	createPart(arena, "Tunnel1_Top", Vector3.new(6, 1, 14), CFrame.new(-15, 2.5, 0), tunnelColor, Enum.Material.Concrete)
	createPart(arena, "Tunnel1_Left", Vector3.new(1, 2, 14), CFrame.new(-18, 1.5, 0), tunnelColor, Enum.Material.Concrete)
	createPart(arena, "Tunnel1_Right", Vector3.new(1, 2, 14), CFrame.new(-12, 1.5, 0), tunnelColor, Enum.Material.Concrete)
	-- Tunnel 2: east side
	createPart(arena, "Tunnel2_Top", Vector3.new(6, 1, 14), CFrame.new(15, 2.5, 0), tunnelColor, Enum.Material.Concrete)
	createPart(arena, "Tunnel2_Left", Vector3.new(1, 2, 14), CFrame.new(12, 1.5, 0), tunnelColor, Enum.Material.Concrete)
	createPart(arena, "Tunnel2_Right", Vector3.new(1, 2, 14), CFrame.new(18, 1.5, 0), tunnelColor, Enum.Material.Concrete)

	-- Breakable walls (giants can destroy these)
	for i = 1, 4 do
		local bx = (i - 2.5) * 12
		local bz = (i % 2 == 0) and 12 or -12
		local breakWall = createPart(arena, string.format("BreakWall_%d", i), Vector3.new(2, 6, 8), CFrame.new(bx, 3.5, bz), Color3.fromRGB(180, 100, 80), Enum.Material.Brick)
		breakWall:SetAttribute("Breakable", true)
		breakWall:SetAttribute("HP", 60)
	end

	-- Spawn locations
	local spawnPositions = {
		Vector3.new(-30, 1.5, -30),
		Vector3.new(30, 1.5, -30),
		Vector3.new(-30, 1.5, 30),
		Vector3.new(30, 1.5, 30),
	}
	for i, pos in spawnPositions do
		local spawn = Instance.new("SpawnLocation")
		spawn.Name = string.format("Spawn_%d", i)
		spawn.Size = Vector3.new(8, 1, 8)
		spawn.Anchored = true
		spawn.Neutral = true
		spawn.AllowTeamChangeOnTouch = false
		spawn.Material = Enum.Material.SmoothPlastic
		spawn.Color = Color3.fromRGB(150, 200, 150)
		spawn.Transparency = 0.3
		spawn.CFrame = CFrame.new(pos)
		spawn.Parent = arena
	end

	return arena
end

return ArenaBuilder
