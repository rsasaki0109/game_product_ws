-- ArenaBuilder
-- Size Shifter arena with pillars, ramps, tiny-only tunnels, breakable platforms, health pickups

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

	---------------------------------------------------------------------------
	-- Tiny-only tunnels (2x2 stud openings - giants and normals cannot fit)
	---------------------------------------------------------------------------
	local tunnelColor = Color3.fromRGB(100, 80, 140)

	-- Tunnel 1: west side (entrance on both ends of a corridor)
	createPart(arena, "Tunnel1_Top", Vector3.new(6, 1, 14), CFrame.new(-15, 2.5, 0), tunnelColor, Enum.Material.Concrete)
	createPart(arena, "Tunnel1_Left", Vector3.new(1, 2, 14), CFrame.new(-18, 1.5, 0), tunnelColor, Enum.Material.Concrete)
	createPart(arena, "Tunnel1_Right", Vector3.new(1, 2, 14), CFrame.new(-12, 1.5, 0), tunnelColor, Enum.Material.Concrete)

	-- Tunnel 2: east side
	createPart(arena, "Tunnel2_Top", Vector3.new(6, 1, 14), CFrame.new(15, 2.5, 0), tunnelColor, Enum.Material.Concrete)
	createPart(arena, "Tunnel2_Left", Vector3.new(1, 2, 14), CFrame.new(12, 1.5, 0), tunnelColor, Enum.Material.Concrete)
	createPart(arena, "Tunnel2_Right", Vector3.new(1, 2, 14), CFrame.new(18, 1.5, 0), tunnelColor, Enum.Material.Concrete)

	-- Tunnel 3: north side (near corner)
	createPart(arena, "Tunnel3_Top", Vector3.new(14, 1, 6), CFrame.new(0, 2.5, -25), tunnelColor, Enum.Material.Concrete)
	createPart(arena, "Tunnel3_Front", Vector3.new(14, 2, 1), CFrame.new(0, 1.5, -28), tunnelColor, Enum.Material.Concrete)
	createPart(arena, "Tunnel3_Back", Vector3.new(14, 2, 1), CFrame.new(0, 1.5, -22), tunnelColor, Enum.Material.Concrete)

	-- Tunnel 4: south side
	createPart(arena, "Tunnel4_Top", Vector3.new(14, 1, 6), CFrame.new(0, 2.5, 25), tunnelColor, Enum.Material.Concrete)
	createPart(arena, "Tunnel4_Front", Vector3.new(14, 2, 1), CFrame.new(0, 1.5, 22), tunnelColor, Enum.Material.Concrete)
	createPart(arena, "Tunnel4_Back", Vector3.new(14, 2, 1), CFrame.new(0, 1.5, 28), tunnelColor, Enum.Material.Concrete)

	---------------------------------------------------------------------------
	-- Health pickups inside tunnels (only tiny can reach)
	---------------------------------------------------------------------------
	local pickupColor = Color3.fromRGB(80, 255, 120)
	local pickupPositions = {
		Vector3.new(-15, 1.2, 0),   -- inside tunnel 1
		Vector3.new(15, 1.2, 0),    -- inside tunnel 2
		Vector3.new(0, 1.2, -25),   -- inside tunnel 3
		Vector3.new(0, 1.2, 25),    -- inside tunnel 4
	}

	for i, pos in pickupPositions do
		local pickup = createPart(
			arena,
			string.format("HealthPickup_%d", i),
			Vector3.new(1.5, 1.5, 1.5),
			CFrame.new(pos),
			pickupColor,
			Enum.Material.Neon,
			0.3,
			false -- not collidable, just a visual + pickup trigger
		)
		pickup.Shape = Enum.PartType.Ball
		pickup:SetAttribute("HealthPickup", true)

		-- Add a point light for visibility
		local light = Instance.new("PointLight")
		light.Brightness = 1.5
		light.Range = 8
		light.Color = pickupColor
		light.Parent = pickup
	end

	---------------------------------------------------------------------------
	-- Breakable platforms (giants can destroy, rebuild after 5s)
	---------------------------------------------------------------------------
	local breakablePositions = {
		{ pos = Vector3.new(-18, 3.5, -12), size = Vector3.new(2, 6, 8) },
		{ pos = Vector3.new(6, 3.5, -12), size = Vector3.new(2, 6, 8) },
		{ pos = Vector3.new(-6, 3.5, 12), size = Vector3.new(2, 6, 8) },
		{ pos = Vector3.new(18, 3.5, 12), size = Vector3.new(2, 6, 8) },
		{ pos = Vector3.new(0, 3.5, 0), size = Vector3.new(8, 6, 2) },
	}

	for i, def in breakablePositions do
		local breakWall = createPart(
			arena,
			string.format("BreakWall_%d", i),
			def.size,
			CFrame.new(def.pos),
			Color3.fromRGB(180, 100, 80),
			Enum.Material.Brick
		)
		breakWall:SetAttribute("Breakable", true)
		breakWall:SetAttribute("HP", 60)

		-- Add crack-like visual indicator
		local crack = Instance.new("Decal")
		crack.Name = "CrackDecal"
		crack.Color3 = Color3.fromRGB(120, 60, 40)
		crack.Transparency = 0.5
		crack.Face = Enum.NormalId.Front
		crack.Parent = breakWall
	end

	---------------------------------------------------------------------------
	-- Spawn locations
	---------------------------------------------------------------------------
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
