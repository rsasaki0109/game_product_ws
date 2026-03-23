local Lighting = game:GetService("Lighting")
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

local stateFolder = getOrCreateValue(ReplicatedStorage, "EchoTagState", "Folder")
local titleValue = getOrCreateValue(stateFolder, "Title", "StringValue")
local hookValue = getOrCreateValue(stateFolder, "Hook", "StringValue")
local stateValue = getOrCreateValue(stateFolder, "State", "StringValue")
local timerValue = getOrCreateValue(stateFolder, "Timer", "IntValue")
local controlsValue = getOrCreateValue(stateFolder, "Controls", "StringValue")

titleValue.Value = GameConfig.TITLE
hookValue.Value = GameConfig.HOOK
controlsValue.Value = table.concat(GameConfig.CONTROLS, "  |  ")

local ArenaBuilder = require(script.Parent:WaitForChild("ArenaBuilder"))

-- Set up dark lighting
local function setupDarkLighting()
	Lighting.Ambient = GameConfig.AMBIENT_COLOR
	Lighting.OutdoorAmbient = GameConfig.AMBIENT_COLOR
	Lighting.Brightness = GameConfig.AMBIENT_BRIGHTNESS
	Lighting.ClockTime = GameConfig.CLOCK_TIME
	Lighting.FogEnd = 80
	Lighting.FogStart = 10
	Lighting.FogColor = Color3.fromRGB(0, 0, 0)
	Lighting.GlobalShadows = false

	-- Remove any existing sky
	for _, child in ipairs(Lighting:GetChildren()) do
		if child:IsA("Sky") or child:IsA("Atmosphere") then
			child:Destroy()
		end
	end
end

local function restoreLighting()
	Lighting.Ambient = Color3.fromRGB(128, 128, 128)
	Lighting.OutdoorAmbient = Color3.fromRGB(128, 128, 128)
	Lighting.Brightness = 2
	Lighting.ClockTime = 14
	Lighting.FogEnd = 100000
	Lighting.FogStart = 0
	Lighting.GlobalShadows = true
end

local function teleportAllToSpawn()
	local arena = workspace:FindFirstChild("EchoTagArena")
	local spawn = arena and arena:FindFirstChild("Spawn")
	if not spawn then
		return
	end

	for _, player in ipairs(Players:GetPlayers()) do
		local character = player.Character
		local root = character and character:FindFirstChild("HumanoidRootPart")
		if root then
			root.CFrame = spawn.CFrame + Vector3.new(math.random(-4, 4), 4, math.random(-4, 4))
			root.AssemblyLinearVelocity = Vector3.zero
			root.AssemblyAngularVelocity = Vector3.zero
		end
	end
end

ArenaBuilder.ensureArena(GameConfig)

while true do
	-- Lobby: restore lighting so players can see
	restoreLighting()

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

	-- Countdown
	teleportAllToSpawn()
	for remain = GameConfig.COUNTDOWN_SECONDS, 1, -1 do
		stateValue.Value = "Countdown"
		timerValue.Value = remain
		task.wait(1)
	end

	-- Go dark!
	setupDarkLighting()

	-- Playing
	for remain = GameConfig.MATCH_DURATION, 0, -1 do
		if stateValue.Value == "Result" then
			break
		end
		stateValue.Value = "Playing"
		timerValue.Value = remain
		task.wait(1)
	end

	-- Result - restore lighting
	restoreLighting()
	for remain = GameConfig.RESULT_DURATION, 0, -1 do
		stateValue.Value = "Result"
		timerValue.Value = remain
		task.wait(1)
	end
end
