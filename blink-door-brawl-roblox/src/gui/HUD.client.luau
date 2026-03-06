local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local localPlayer = Players.LocalPlayer
local playerGui = localPlayer:WaitForChild("PlayerGui")

local MatchStateChanged = ReplicatedStorage:WaitForChild("MatchStateChanged")
local MatchCountdown = ReplicatedStorage:WaitForChild("MatchCountdown")
local ScoreChanged = ReplicatedStorage:WaitForChild("ScoreChanged")
local DoorStateChanged = ReplicatedStorage:WaitForChild("DoorStateChanged")
local ActionCooldown = ReplicatedStorage:WaitForChild("ActionCooldown")
local ActionRequest = ReplicatedStorage:WaitForChild("ActionRequest")

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlinkDoorHUD"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui

local topBar = Instance.new("Frame")
topBar.Size = UDim2.new(1, 0, 0, 96)
topBar.BackgroundColor3 = Color3.fromRGB(16, 19, 29)
topBar.BackgroundTransparency = 0.18
topBar.BorderSizePixel = 0
topBar.Parent = screenGui

local stateLabel = Instance.new("TextLabel")
stateLabel.Size = UDim2.new(0.26, 0, 0.5, 0)
stateLabel.Position = UDim2.new(0.02, 0, 0.04, 0)
stateLabel.BackgroundTransparency = 1
stateLabel.TextXAlignment = Enum.TextXAlignment.Left
stateLabel.Font = Enum.Font.GothamBlack
stateLabel.TextScaled = true
stateLabel.TextColor3 = Color3.fromRGB(246, 246, 246)
stateLabel.Text = "Lobby"
stateLabel.Parent = topBar

local timerLabel = Instance.new("TextLabel")
timerLabel.Size = UDim2.new(0.16, 0, 0.5, 0)
timerLabel.Position = UDim2.new(0.41, 0, 0.04, 0)
timerLabel.BackgroundTransparency = 1
timerLabel.Font = Enum.Font.GothamBlack
timerLabel.TextScaled = true
timerLabel.TextColor3 = Color3.fromRGB(255, 218, 104)
timerLabel.Text = "--"
timerLabel.Parent = topBar

local scoreLabel = Instance.new("TextLabel")
scoreLabel.Size = UDim2.new(0.24, 0, 0.5, 0)
scoreLabel.Position = UDim2.new(0.74, 0, 0.04, 0)
scoreLabel.BackgroundTransparency = 1
scoreLabel.TextXAlignment = Enum.TextXAlignment.Right
scoreLabel.Font = Enum.Font.GothamBlack
scoreLabel.TextScaled = true
scoreLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
scoreLabel.Text = "KOs 0"
scoreLabel.Parent = topBar

local rankLabel = Instance.new("TextLabel")
rankLabel.Size = UDim2.new(0.28, 0, 0.3, 0)
rankLabel.Position = UDim2.new(0.02, 0, 0.62, 0)
rankLabel.BackgroundTransparency = 1
rankLabel.TextXAlignment = Enum.TextXAlignment.Left
rankLabel.Font = Enum.Font.GothamBold
rankLabel.TextScaled = true
rankLabel.TextColor3 = Color3.fromRGB(225, 230, 242)
rankLabel.Text = "Rank --"
rankLabel.Parent = topBar

local leaderLabel = Instance.new("TextLabel")
leaderLabel.Size = UDim2.new(0.46, 0, 0.3, 0)
leaderLabel.Position = UDim2.new(0.52, 0, 0.62, 0)
leaderLabel.BackgroundTransparency = 1
leaderLabel.TextXAlignment = Enum.TextXAlignment.Right
leaderLabel.Font = Enum.Font.GothamMedium
leaderLabel.TextScaled = true
leaderLabel.TextColor3 = Color3.fromRGB(225, 230, 242)
leaderLabel.Text = "Leader --"
leaderLabel.Parent = topBar

local doorLabel = Instance.new("TextLabel")
doorLabel.Size = UDim2.new(0, 400, 0, 28)
doorLabel.Position = UDim2.new(0.5, -200, 1, -150)
doorLabel.BackgroundTransparency = 1
doorLabel.Font = Enum.Font.GothamBold
doorLabel.TextScaled = true
doorLabel.TextColor3 = Color3.fromRGB(240, 240, 240)
doorLabel.Text = "Entry: -- | Exit: --"
doorLabel.Parent = screenGui

local hintLabel = Instance.new("TextLabel")
hintLabel.Size = UDim2.new(0, 420, 0, 28)
hintLabel.Position = UDim2.new(0.5, -210, 1, -120)
hintLabel.BackgroundTransparency = 1
hintLabel.Font = Enum.Font.GothamMedium
hintLabel.TextScaled = true
hintLabel.TextColor3 = Color3.fromRGB(230, 230, 230)
hintLabel.Text = "Q Entry  |  E Exit  |  F Push"
hintLabel.Parent = screenGui

local countdownLabel = Instance.new("TextLabel")
countdownLabel.Size = UDim2.new(0, 300, 0, 120)
countdownLabel.Position = UDim2.new(0.5, -150, 0.5, -60)
countdownLabel.BackgroundTransparency = 1
countdownLabel.Font = Enum.Font.GothamBlack
countdownLabel.TextScaled = true
countdownLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
countdownLabel.Visible = false
countdownLabel.Parent = screenGui

local buttonFrame = Instance.new("Frame")
buttonFrame.Size = UDim2.new(0, 486, 0, 86)
buttonFrame.Position = UDim2.new(0.5, -243, 1, -96)
buttonFrame.BackgroundColor3 = Color3.fromRGB(13, 16, 24)
buttonFrame.BackgroundTransparency = 0.12
buttonFrame.BorderSizePixel = 0
buttonFrame.Parent = screenGui

local layout = Instance.new("UIListLayout")
layout.FillDirection = Enum.FillDirection.Horizontal
layout.HorizontalAlignment = Enum.HorizontalAlignment.Center
layout.VerticalAlignment = Enum.VerticalAlignment.Center
layout.Padding = UDim.new(0, 12)
layout.Parent = buttonFrame

local buttons = {}
local cooldownUntil = {
	PLACE_ENTRY = 0,
	PLACE_EXIT = 0,
	PUSH = 0,
}
local doorState = {
	entry = false,
	exit = false,
}

local function makeButton(actionName, labelText, color)
	local button = Instance.new("TextButton")
	button.Name = actionName .. "Button"
	button.Size = UDim2.new(0, 154, 0, 60)
	button.BackgroundColor3 = color
	button.TextColor3 = Color3.fromRGB(18, 22, 28)
	button.Font = Enum.Font.GothamBlack
	button.TextScaled = true
	button.Text = labelText
	button.Parent = buttonFrame

	local stroke = Instance.new("UIStroke")
	stroke.Thickness = 1
	stroke.Color = Color3.fromRGB(255, 255, 255)
	stroke.Transparency = 0.6
	stroke.Parent = button

	button.MouseButton1Click:Connect(function()
		ActionRequest:FireServer(actionName)
	end)

	buttons[actionName] = button
end

makeButton("PLACE_ENTRY", "ENTRY\n[Q]", Color3.fromRGB(82, 226, 255))
makeButton("PLACE_EXIT", "EXIT\n[E]", Color3.fromRGB(255, 171, 69))
makeButton("PUSH", "PUSH\n[F]", Color3.fromRGB(255, 96, 119))

MatchStateChanged.OnClientEvent:Connect(function(stateName, payload)
	if stateName == "Lobby" then
		stateLabel.Text = "Lobby"
		timerLabel.Text = payload and payload.remaining and tostring(payload.remaining) or "--"
	elseif stateName == "Countdown" then
		stateLabel.Text = "Get Ready"
	elseif stateName == "Playing" then
		stateLabel.Text = "Brawl"
		timerLabel.Text = payload and payload.remaining ~= nil and tostring(payload.remaining) or "--"
	elseif stateName == "Result" then
		stateLabel.Text = "Result"
		timerLabel.Text = payload and payload.winner or "--"
	else
		stateLabel.Text = tostring(stateName)
	end
end)

MatchCountdown.OnClientEvent:Connect(function(remaining)
	if remaining > 0 then
		countdownLabel.Visible = true
		countdownLabel.Text = tostring(remaining)
	else
		countdownLabel.Text = "FIGHT!"
		task.delay(0.6, function()
			countdownLabel.Visible = false
		end)
	end
end)

ScoreChanged.OnClientEvent:Connect(function(payload)
	if typeof(payload) ~= "table" then
		return
	end
	scoreLabel.Text = string.format("KOs %d", payload.score or 0)
	rankLabel.Text = string.format("Rank %d  |  Deaths %d", payload.rank or 0, payload.deaths or 0)
	leaderLabel.Text = string.format("Leader %s (%d)", payload.leaderName or "--", payload.leaderScore or 0)
end)

DoorStateChanged.OnClientEvent:Connect(function(entryActive, exitActive)
	doorState.entry = entryActive == true
	doorState.exit = exitActive == true
end)

ActionCooldown.OnClientEvent:Connect(function(actionName, duration)
	if cooldownUntil[actionName] ~= nil then
		cooldownUntil[actionName] = tick() + (tonumber(duration) or 0)
	end
end)

RunService.RenderStepped:Connect(function()
	local entryText = doorState.entry and "ON" or "OFF"
	local exitText = doorState.exit and "ON" or "OFF"
	doorLabel.Text = string.format("Entry: %s  |  Exit: %s", entryText, exitText)

	for actionName, button in pairs(buttons) do
		local remain = (cooldownUntil[actionName] or 0) - tick()
		if remain > 0 then
			button.TextTransparency = 0.25
			if actionName == "PLACE_ENTRY" then
				button.Text = string.format("ENTRY\n%.1fs", remain)
			elseif actionName == "PLACE_EXIT" then
				button.Text = string.format("EXIT\n%.1fs", remain)
			else
				button.Text = string.format("PUSH\n%.1fs", remain)
			end
		else
			button.TextTransparency = 0
			if actionName == "PLACE_ENTRY" then
				button.Text = "ENTRY\n[Q]"
			elseif actionName == "PLACE_EXIT" then
				button.Text = "EXIT\n[E]"
			else
				button.Text = "PUSH\n[F]"
			end
		end
	end

	if UserInputService.TouchEnabled then
		hintLabel.Text = "Tap Entry / Exit / Push"
	else
		hintLabel.Text = "Q Entry  |  E Exit  |  F Push"
	end
end)
