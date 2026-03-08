local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local GameConfig = require(ReplicatedStorage.Shared:WaitForChild("GameConfig"))

local function getOrCreateValue(parent, name, className)
	local existing = parent:FindFirstChild(name)
	if existing then
		return existing
	end
	local value = Instance.new(className)
	value.Name = name
	value.Parent = parent
	return value
end

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

local function ensureArena()
	local old = workspace:FindFirstChild("HotAirHavocArena")
	if old then
		old:Destroy()
	end

	local arena = Instance.new("Model")
	arena.Name = "HotAirHavocArena"
	arena.Parent = workspace

	createPart(arena, "SkyFloor", Vector3.new(280, 2, 280), CFrame.new(0, -6, 0), GameConfig.THEME.sky, Enum.Material.SmoothPlastic, 0.18, false)
	createPart(arena, "Dock", Vector3.new(52, 4, 34), CFrame.new(0, 16, 0), GameConfig.THEME.dock, Enum.Material.WoodPlanks, 0, true)
	createPart(arena, "WindLayer_Low", Vector3.new(130, 1, 24), CFrame.new(0, 34, -16), GameConfig.THEME.wind, Enum.Material.Neon, 0.36, false)
	createPart(arena, "WindLayer_Mid", Vector3.new(140, 1, 24), CFrame.new(0, 52, 20), GameConfig.THEME.wind, Enum.Material.Neon, 0.36, false)
	createPart(arena, "WindLayer_High", Vector3.new(150, 1, 24), CFrame.new(0, 70, -6), GameConfig.THEME.wind, Enum.Material.Neon, 0.36, false)
	createPart(arena, "StormRing", Vector3.new(170, 6, 170), CFrame.new(0, 58, 0), GameConfig.THEME.storm, Enum.Material.ForceField, 0.78, false)

	for index, position in ipairs({
		Vector3.new(-44, 28, -28),
		Vector3.new(44, 28, 12),
		Vector3.new(-18, 46, 26),
		Vector3.new(20, 46, -20),
		Vector3.new(-28, 64, 8),
		Vector3.new(34, 64, -10),
	}) do
		createPart(arena, string.format("Fuel_%d", index), Vector3.new(4, 6, 4), CFrame.new(position), Color3.fromRGB(255, 232, 138), Enum.Material.Neon, 0.18, false)
	end

	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "Spawn"
	spawn.Size = Vector3.new(12, 1, 12)
	spawn.CFrame = CFrame.new(0, 19, 0)
	spawn.Anchored = true
	spawn.Neutral = false
	spawn.AllowTeamChangeOnTouch = false
	spawn.Color = GameConfig.THEME.wind
	spawn.Material = Enum.Material.Neon
	spawn.Parent = arena

	return arena
end

local stateFolder = getOrCreateValue(ReplicatedStorage, "HotAirHavocState", "Folder")
local titleValue = getOrCreateValue(stateFolder, "Title", "StringValue")
local hookValue = getOrCreateValue(stateFolder, "Hook", "StringValue")
local stateValue = getOrCreateValue(stateFolder, "State", "StringValue")
local timerValue = getOrCreateValue(stateFolder, "Timer", "IntValue")
local controlsValue = getOrCreateValue(stateFolder, "Controls", "StringValue")

titleValue.Value = GameConfig.TITLE
hookValue.Value = GameConfig.HOOK
controlsValue.Value = table.concat(GameConfig.CONTROLS, "  |  ")

local function teleportAllToSpawn()
	local arena = workspace:FindFirstChild("HotAirHavocArena")
	local spawn = arena and arena:FindFirstChild("Spawn")
	if not spawn then
		return
	end

	for _, player in ipairs(Players:GetPlayers()) do
		local character = player.Character
		local root = character and character:FindFirstChild("HumanoidRootPart")
		if root then
			root.CFrame = spawn.CFrame + Vector3.new(math.random(-6, 6), 4, math.random(-6, 6))
			root.AssemblyLinearVelocity = Vector3.zero
			root.AssemblyAngularVelocity = Vector3.zero
		end
	end
end

ensureArena()

while true do
	while #Players:GetPlayers() < GameConfig.MIN_PLAYERS do
		stateValue.Value = "Lobby"
		timerValue.Value = GameConfig.MIN_PLAYERS
		task.wait(1)
	end

	for remain = GameConfig.LOBBY_WAIT, 0, -1 do
		stateValue.Value = "Lobby"
		timerValue.Value = remain
		task.wait(1)
	end

	teleportAllToSpawn()
	for remain = GameConfig.COUNTDOWN_SECONDS, 1, -1 do
		stateValue.Value = "Countdown"
		timerValue.Value = remain
		task.wait(1)
	end

	for remain = GameConfig.MATCH_DURATION, 0, -1 do
		stateValue.Value = "Playing"
		timerValue.Value = remain
		task.wait(1)
	end

	for remain = GameConfig.RESULT_DURATION, 0, -1 do
		stateValue.Value = "Result"
		timerValue.Value = remain
		task.wait(1)
	end
end
