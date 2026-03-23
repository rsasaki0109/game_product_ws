-- ArenaBuilder
-- Magnet Wars circular arena with shrinkable rings

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
	local oldArena = workspace:FindFirstChild("MagnetWarsArena")
	if oldArena then
		oldArena:Destroy()
	end

	local arena = Instance.new("Model")
	arena.Name = "MagnetWarsArena"
	arena.Parent = workspace

	local radius = config.ARENA_RADIUS
	local ringCount = 6
	local ringWidth = radius / ringCount

	-- Build arena as concentric rings (so we can destroy outer rings to shrink)
	for ring = 1, ringCount do
		local innerR = (ring - 1) * ringWidth
		local outerR = ring * ringWidth
		local segmentCount = math.max(12, ring * 6)
		local angleStep = (2 * math.pi) / segmentCount

		for seg = 0, segmentCount - 1 do
			local angle1 = seg * angleStep
			local angle2 = (seg + 1) * angleStep
			local midAngle = (angle1 + angle2) / 2
			local midR = (innerR + outerR) / 2

			local cx = math.cos(midAngle) * midR
			local cz = math.sin(midAngle) * midR

			local chordLen = 2 * outerR * math.sin(angleStep / 2)
			local depth = outerR - innerR

			-- Color gradient: center = bright cyan, edges = dark blue
			local t = ring / ringCount
			local r = math.floor(20 + 40 * t)
			local g = math.floor(180 - 80 * t)
			local b = math.floor(255 - 60 * t)

			local part = createPart(
				arena,
				string.format("Ring%d_Seg%d", ring, seg),
				Vector3.new(depth + 0.2, config.ARENA_HEIGHT, chordLen + 0.2),
				CFrame.new(cx, 0, cz) * CFrame.Angles(0, -midAngle + math.pi / 2, 0),
				Color3.fromRGB(r, g, b),
				Enum.Material.Neon,
				0.05
			)
			part:SetAttribute("Ring", ring)
		end
	end

	-- Central glow disc
	createPart(
		arena,
		"CenterGlow",
		Vector3.new(10, 0.5, 10),
		CFrame.new(0, config.ARENA_HEIGHT / 2 + 0.3, 0),
		Color3.fromRGB(180, 240, 255),
		Enum.Material.Neon,
		0.3,
		false
	)

	-- Spawn points (4 cardinal directions)
	local spawnRadius = radius * 0.5
	local spawnPositions = {
		Vector3.new(spawnRadius, config.ARENA_HEIGHT / 2 + 1, 0),
		Vector3.new(-spawnRadius, config.ARENA_HEIGHT / 2 + 1, 0),
		Vector3.new(0, config.ARENA_HEIGHT / 2 + 1, spawnRadius),
		Vector3.new(0, config.ARENA_HEIGHT / 2 + 1, -spawnRadius),
	}

	for i, pos in spawnPositions do
		local spawn = Instance.new("SpawnLocation")
		spawn.Name = string.format("Spawn_%d", i)
		spawn.Size = Vector3.new(6, 1, 6)
		spawn.Anchored = true
		spawn.Neutral = true
		spawn.AllowTeamChangeOnTouch = false
		spawn.Material = Enum.Material.SmoothPlastic
		spawn.Color = Color3.fromRGB(100, 200, 255)
		spawn.Transparency = 0.5
		spawn.CFrame = CFrame.new(pos)
		spawn.Parent = arena
	end

	return arena
end

function ArenaBuilder.shrinkArena(arena: Model, currentRingCount: number)
	-- Remove the outermost ring
	local ringToRemove = currentRingCount
	local removed = 0

	for _, child in arena:GetChildren() do
		if child:IsA("BasePart") and child:GetAttribute("Ring") == ringToRemove then
			-- Visual destruction effect: flash then destroy
			child.Color = Color3.fromRGB(255, 80, 40)
			child.Material = Enum.Material.Neon
			child.Transparency = 0.5
			task.delay(0.3, function()
				child:Destroy()
			end)
			removed += 1
		end
	end

	return removed > 0
end

return ArenaBuilder
