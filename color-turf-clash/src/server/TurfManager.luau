local TurfManager = {}

local teamColors
local tileSize = 8
local gridX = 24
local gridZ = 16
local tiles = {}
local counts = {
	Red = 0,
	Blue = 0,
	Neutral = 0,
}

local function tileColor(teamName)
	if teamName == "Red" then
		return teamColors.Red.primary
	elseif teamName == "Blue" then
		return teamColors.Blue.primary
	end
	return teamColors.Neutral.primary
end

local function setTileOwner(tileData, owner)
	if tileData.owner == owner then
		return false
	end

	counts[tileData.owner] -= 1
	tileData.owner = owner
	counts[owner] += 1
	tileData.part.Color = tileColor(owner)
	return true
end

function TurfManager.initialize(arena, config)
	tileSize = config.Arena.tileSize
	gridX = config.Arena.gridX
	gridZ = config.Arena.gridZ
	teamColors = config.Teams

	table.clear(tiles)
	counts.Red = 0
	counts.Blue = 0
	counts.Neutral = 0

	local old = arena:FindFirstChild("TurfTiles")
	if old then
		old:Destroy()
	end

	local tileModel = Instance.new("Model")
	tileModel.Name = "TurfTiles"
	tileModel.Parent = arena

	local width = config.Arena.width
	local length = config.Arena.length
	local startX = -width * 0.5 + tileSize * 0.5
	local startZ = -length * 0.5 + tileSize * 0.5

	for x = 1, gridX do
		for z = 1, gridZ do
			local tile = Instance.new("Part")
			tile.Name = string.format("Tile_%d_%d", x, z)
			tile.Anchored = true
			tile.CanCollide = false
			tile.CanTouch = false
			tile.CanQuery = true
			tile.Material = Enum.Material.SmoothPlastic
			tile.Size = Vector3.new(tileSize - 0.25, 0.35, tileSize - 0.25)
			tile.CFrame = CFrame.new(startX + (x - 1) * tileSize, 0.7, startZ + (z - 1) * tileSize)
			tile.Color = teamColors.Neutral.primary
			tile.Parent = tileModel

			table.insert(tiles, {
				part = tile,
				owner = "Neutral",
			})
			counts.Neutral += 1
		end
	end
end

function TurfManager.resetToNeutral()
	counts.Red = 0
	counts.Blue = 0
	counts.Neutral = #tiles

	for _, tileData in ipairs(tiles) do
		tileData.owner = "Neutral"
		tileData.part.Color = teamColors.Neutral.primary
	end
end

function TurfManager.paintAt(position, teamName, radius)
	if teamName ~= "Red" and teamName ~= "Blue" then
		return 0
	end

	local changed = 0
	local radiusSq = radius * radius
	for _, tileData in ipairs(tiles) do
		local p = tileData.part.Position
		local dx = p.X - position.X
		local dz = p.Z - position.Z
		if dx * dx + dz * dz <= radiusSq then
			if setTileOwner(tileData, teamName) then
				changed += 1
			end
		end
	end
	return changed
end

function TurfManager.getCoverage()
	local total = #tiles
	if total == 0 then
		return {
			Red = 0,
			Blue = 0,
			Neutral = 0,
			Total = 0,
		}
	end

	local redPct = (counts.Red / total) * 100
	local bluePct = (counts.Blue / total) * 100
	local neutralPct = 100 - redPct - bluePct

	return {
		Red = redPct,
		Blue = bluePct,
		Neutral = neutralPct,
		Total = total,
		RedTiles = counts.Red,
		BlueTiles = counts.Blue,
		NeutralTiles = counts.Neutral,
	}
end

function TurfManager.getTileCount()
	return #tiles
end

return TurfManager
