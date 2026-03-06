local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local localPlayer = Players.LocalPlayer
local playerGui = localPlayer:WaitForChild("PlayerGui")

local MatchStateChanged = ReplicatedStorage:WaitForChild("MatchStateChanged")
local MatchCountdown = ReplicatedStorage:WaitForChild("MatchCountdown")
local ProgressChanged = ReplicatedStorage:WaitForChild("ProgressChanged")
local CommandCooldown = ReplicatedStorage:WaitForChild("CommandCooldown")
local CommandRequest = ReplicatedStorage:WaitForChild("CommandRequest")

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "WordStepHUD"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui

local topBar = Instance.new("Frame")
topBar.Size = UDim2.new(1, 0, 0, 94)
topBar.BackgroundColor3 = Color3.fromRGB(16, 19, 28)
topBar.BackgroundTransparency = 0.18
topBar.BorderSizePixel = 0
topBar.Parent = screenGui

local stateLabel = Instance.new("TextLabel")
stateLabel.Size = UDim2.new(0.32, 0, 0.5, 0)
stateLabel.Position = UDim2.new(0.02, 0, 0.04, 0)
stateLabel.BackgroundTransparency = 1
stateLabel.TextXAlignment = Enum.TextXAlignment.Left
stateLabel.Font = Enum.Font.GothamBlack
stateLabel.TextScaled = true
stateLabel.TextColor3 = Color3.fromRGB(246, 246, 246)
stateLabel.Text = "Lobby"
stateLabel.Parent = topBar

local timerLabel = Instance.new("TextLabel")
timerLabel.Size = UDim2.new(0.18, 0, 0.5, 0)
timerLabel.Position = UDim2.new(0.41, 0, 0.04, 0)
timerLabel.BackgroundTransparency = 1
timerLabel.Font = Enum.Font.GothamBlack
timerLabel.TextScaled = true
timerLabel.TextColor3 = Color3.fromRGB(255, 220, 104)
timerLabel.Text = "--"
timerLabel.Parent = topBar

local rankLabel = Instance.new("TextLabel")
rankLabel.Size = UDim2.new(0.22, 0, 0.5, 0)
rankLabel.Position = UDim2.new(0.76, 0, 0.04, 0)
rankLabel.BackgroundTransparency = 1
rankLabel.TextXAlignment = Enum.TextXAlignment.Right
rankLabel.Font = Enum.Font.GothamBlack
rankLabel.TextScaled = true
rankLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
rankLabel.Text = "Rank --"
rankLabel.Parent = topBar

local progressLabel = Instance.new("TextLabel")
progressLabel.Size = UDim2.new(0.46, 0, 0.32, 0)
progressLabel.Position = UDim2.new(0.02, 0, 0.58, 0)
progressLabel.BackgroundTransparency = 1
progressLabel.TextXAlignment = Enum.TextXAlignment.Left
progressLabel.Font = Enum.Font.GothamBold
progressLabel.TextScaled = true
progressLabel.TextColor3 = Color3.fromRGB(220, 225, 240)
progressLabel.Text = "Checkpoint 0/3"
progressLabel.Parent = topBar

local hintLabel = Instance.new("TextLabel")
hintLabel.Size = UDim2.new(0.5, 0, 0.32, 0)
hintLabel.Position = UDim2.new(0.48, 0, 0.58, 0)
hintLabel.BackgroundTransparency = 1
hintLabel.TextXAlignment = Enum.TextXAlignment.Right
hintLabel.Font = Enum.Font.GothamMedium
hintLabel.TextScaled = true
hintLabel.TextColor3 = Color3.fromRGB(229, 229, 229)
hintLabel.Text = "Q STEP   E BRIDGE   R UP"
hintLabel.Parent = topBar

local countdownLabel = Instance.new("TextLabel")
countdownLabel.Size = UDim2.new(0, 320, 0, 120)
countdownLabel.Position = UDim2.new(0.5, -160, 0.5, -60)
countdownLabel.BackgroundTransparency = 1
countdownLabel.Font = Enum.Font.GothamBlack
countdownLabel.TextScaled = true
countdownLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
countdownLabel.Visible = false
countdownLabel.Parent = screenGui

local commandFrame = Instance.new("Frame")
commandFrame.Size = UDim2.new(0, 474, 0, 86)
commandFrame.Position = UDim2.new(0.5, -237, 1, -102)
commandFrame.BackgroundColor3 = Color3.fromRGB(15, 16, 24)
commandFrame.BackgroundTransparency = 0.12
commandFrame.BorderSizePixel = 0
commandFrame.Parent = screenGui

local commandList = Instance.new("UIListLayout")
commandList.FillDirection = Enum.FillDirection.Horizontal
commandList.HorizontalAlignment = Enum.HorizontalAlignment.Center
commandList.VerticalAlignment = Enum.VerticalAlignment.Center
commandList.Padding = UDim.new(0, 12)
commandList.Parent = commandFrame

local cooldownUntil = {
	STEP = 0,
	BRIDGE = 0,
	UP = 0,
}

local buttons = {}

local function makeButton(commandName, keyHint, color)
	local button = Instance.new("TextButton")
	button.Name = commandName .. "Button"
	button.Size = UDim2.new(0, 150, 0, 60)
	button.BackgroundColor3 = color
	button.TextColor3 = Color3.fromRGB(18, 22, 28)
	button.Font = Enum.Font.GothamBlack
	button.TextScaled = true
	button.AutoButtonColor = true
	button.Text = string.format("%s\n[%s]", commandName, keyHint)
	button.Parent = commandFrame

	local stroke = Instance.new("UIStroke")
	stroke.Thickness = 1
	stroke.Color = Color3.fromRGB(255, 255, 255)
	stroke.Transparency = 0.6
	stroke.Parent = button

	button.MouseButton1Click:Connect(function()
		CommandRequest:FireServer(commandName)
	end)

	buttons[commandName] = button
end

makeButton("STEP", "Q", Color3.fromRGB(245, 245, 245))
makeButton("BRIDGE", "E", Color3.fromRGB(255, 214, 92))
makeButton("UP", "R", Color3.fromRGB(92, 235, 255))

local function setState(stateName, payload)
	if stateName == "Lobby" then
		stateLabel.Text = "Lobby"
		timerLabel.Text = payload and payload.remaining and tostring(payload.remaining) or "--"
	elseif stateName == "Countdown" then
		stateLabel.Text = "Get Ready"
	elseif stateName == "Playing" then
		stateLabel.Text = "Race"
		timerLabel.Text = payload and payload.remaining ~= nil and tostring(payload.remaining) or "--"
	elseif stateName == "Result" then
		stateLabel.Text = "Result"
		timerLabel.Text = payload and payload.winners or "--"
	else
		stateLabel.Text = tostring(stateName)
	end
end

MatchStateChanged.OnClientEvent:Connect(function(stateName, payload)
	setState(stateName, payload)
end)

MatchCountdown.OnClientEvent:Connect(function(remaining)
	if remaining > 0 then
		countdownLabel.Visible = true
		countdownLabel.Text = tostring(remaining)
	else
		countdownLabel.Text = "GO!"
		task.delay(0.6, function()
			countdownLabel.Visible = false
		end)
	end
end)

ProgressChanged.OnClientEvent:Connect(function(payload)
	if typeof(payload) ~= "table" then
		return
	end
	rankLabel.Text = string.format("Rank %s", tostring(payload.rank or "--"))
	progressLabel.Text = string.format("Checkpoint %d/%d", payload.checkpoint or 0, payload.totalCheckpoints or 3)
end)

CommandCooldown.OnClientEvent:Connect(function(commandName, duration)
	if cooldownUntil[commandName] ~= nil then
		cooldownUntil[commandName] = tick() + (tonumber(duration) or 0)
	end
end)

RunService.RenderStepped:Connect(function()
	for commandName, button in pairs(buttons) do
		local remain = (cooldownUntil[commandName] or 0) - tick()
		if remain > 0 then
			button.TextTransparency = 0.25
			button.Text = string.format("%s\n%.1fs", commandName, remain)
		else
			button.TextTransparency = 0
			if commandName == "STEP" then
				button.Text = "STEP\n[Q]"
			elseif commandName == "BRIDGE" then
				button.Text = "BRIDGE\n[E]"
			else
				button.Text = "UP\n[R]"
			end
		end
	end

	if UserInputService.TouchEnabled then
		hintLabel.Text = "Tap buttons to place word blocks"
	else
		hintLabel.Text = "Q STEP   E BRIDGE   R UP"
	end
end)
