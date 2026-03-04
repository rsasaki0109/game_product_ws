local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local localPlayer = Players.LocalPlayer
local playerGui = localPlayer:WaitForChild("PlayerGui")

local MatchStateChanged = ReplicatedStorage:WaitForChild("MatchStateChanged")
local ScoreChanged = ReplicatedStorage:WaitForChild("ScoreChanged")
local MatchCountdown = ReplicatedStorage:WaitForChild("MatchCountdown")
local FeedEvent = ReplicatedStorage:WaitForChild("FeedEvent")
local ActionCooldown = ReplicatedStorage:WaitForChild("ActionCooldown")
local ShootRequest = ReplicatedStorage:WaitForChild("ShootRequest")
local DashRequest = ReplicatedStorage:WaitForChild("DashRequest")

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "ColorTurfHUD"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui

local topFrame = Instance.new("Frame")
topFrame.Size = UDim2.new(1, 0, 0, 92)
topFrame.BackgroundColor3 = Color3.fromRGB(13, 14, 22)
topFrame.BackgroundTransparency = 0.23
topFrame.BorderSizePixel = 0
topFrame.Parent = screenGui

local stateLabel = Instance.new("TextLabel")
stateLabel.Size = UDim2.new(0.28, 0, 0.52, 0)
stateLabel.Position = UDim2.new(0.02, 0, 0.03, 0)
stateLabel.BackgroundTransparency = 1
stateLabel.TextXAlignment = Enum.TextXAlignment.Left
stateLabel.Font = Enum.Font.GothamBold
stateLabel.TextScaled = true
stateLabel.TextColor3 = Color3.fromRGB(245, 245, 245)
stateLabel.Text = "Lobby"
stateLabel.Parent = topFrame

local timerLabel = Instance.new("TextLabel")
timerLabel.Size = UDim2.new(0.18, 0, 0.52, 0)
timerLabel.Position = UDim2.new(0.41, 0, 0.03, 0)
timerLabel.BackgroundTransparency = 1
timerLabel.Font = Enum.Font.GothamBold
timerLabel.TextScaled = true
timerLabel.TextColor3 = Color3.fromRGB(255, 232, 134)
timerLabel.Text = "--"
timerLabel.Parent = topFrame

local teamLabel = Instance.new("TextLabel")
teamLabel.Size = UDim2.new(0.26, 0, 0.52, 0)
teamLabel.Position = UDim2.new(0.72, 0, 0.03, 0)
teamLabel.BackgroundTransparency = 1
teamLabel.TextXAlignment = Enum.TextXAlignment.Right
teamLabel.Font = Enum.Font.GothamBold
teamLabel.TextScaled = true
teamLabel.TextColor3 = Color3.fromRGB(220, 220, 220)
teamLabel.Text = "Team: --"
teamLabel.Parent = topFrame

local barBack = Instance.new("Frame")
barBack.Size = UDim2.new(0.96, 0, 0.28, 0)
barBack.Position = UDim2.new(0.02, 0, 0.62, 0)
barBack.BackgroundColor3 = Color3.fromRGB(43, 45, 56)
barBack.BorderSizePixel = 0
barBack.Parent = topFrame

local redBar = Instance.new("Frame")
redBar.Size = UDim2.new(0.5, 0, 1, 0)
redBar.BackgroundColor3 = Color3.fromRGB(239, 95, 95)
redBar.BorderSizePixel = 0
redBar.Parent = barBack

local blueBar = Instance.new("Frame")
blueBar.Size = UDim2.new(0.5, 0, 1, 0)
blueBar.Position = UDim2.new(0.5, 0, 0, 0)
blueBar.BackgroundColor3 = Color3.fromRGB(92, 152, 255)
blueBar.BorderSizePixel = 0
blueBar.Parent = barBack

local redPctLabel = Instance.new("TextLabel")
redPctLabel.Size = UDim2.new(0.2, 0, 0.24, 0)
redPctLabel.Position = UDim2.new(0.02, 0, 0.64, 0)
redPctLabel.BackgroundTransparency = 1
redPctLabel.TextXAlignment = Enum.TextXAlignment.Left
redPctLabel.Font = Enum.Font.GothamBold
redPctLabel.TextScaled = true
redPctLabel.TextColor3 = Color3.fromRGB(255, 215, 215)
redPctLabel.Text = "R 0.0%"
redPctLabel.Parent = topFrame

local bluePctLabel = Instance.new("TextLabel")
bluePctLabel.Size = UDim2.new(0.2, 0, 0.24, 0)
bluePctLabel.Position = UDim2.new(0.78, 0, 0.64, 0)
bluePctLabel.BackgroundTransparency = 1
bluePctLabel.TextXAlignment = Enum.TextXAlignment.Right
bluePctLabel.Font = Enum.Font.GothamBold
bluePctLabel.TextScaled = true
bluePctLabel.TextColor3 = Color3.fromRGB(215, 228, 255)
bluePctLabel.Text = "B 0.0%"
bluePctLabel.Parent = topFrame

local countdownLabel = Instance.new("TextLabel")
countdownLabel.Size = UDim2.new(0, 300, 0, 120)
countdownLabel.Position = UDim2.new(0.5, -150, 0.5, -60)
countdownLabel.BackgroundTransparency = 1
countdownLabel.Font = Enum.Font.GothamBlack
countdownLabel.TextScaled = true
countdownLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
countdownLabel.Visible = false
countdownLabel.Parent = screenGui

local feedFrame = Instance.new("Frame")
feedFrame.Size = UDim2.new(0, 460, 0, 190)
feedFrame.Position = UDim2.new(1, -472, 0, 102)
feedFrame.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
feedFrame.BackgroundTransparency = 0.6
feedFrame.BorderSizePixel = 0
feedFrame.Parent = screenGui

local feedStroke = Instance.new("UIStroke")
feedStroke.Thickness = 1
feedStroke.Transparency = 0.42
feedStroke.Color = Color3.fromRGB(255, 255, 255)
feedStroke.Parent = feedFrame

local hintLabel = Instance.new("TextLabel")
hintLabel.Size = UDim2.new(0, 420, 0, 32)
hintLabel.Position = UDim2.new(0.5, -210, 1, -38)
hintLabel.BackgroundTransparency = 1
hintLabel.Font = Enum.Font.GothamMedium
hintLabel.TextScaled = true
hintLabel.TextColor3 = Color3.fromRGB(235, 235, 235)
hintLabel.Text = "LMB/F: Shoot | E/Q/Shift: Dash"
hintLabel.Parent = screenGui

local cooldownLabel = Instance.new("TextLabel")
cooldownLabel.Size = UDim2.new(0, 340, 0, 32)
cooldownLabel.Position = UDim2.new(0, 12, 1, -38)
cooldownLabel.BackgroundTransparency = 1
cooldownLabel.TextXAlignment = Enum.TextXAlignment.Left
cooldownLabel.Font = Enum.Font.GothamMedium
cooldownLabel.TextScaled = true
cooldownLabel.TextColor3 = Color3.fromRGB(235, 235, 235)
cooldownLabel.Text = "Shoot: Ready | Dash: Ready"
cooldownLabel.Parent = screenGui

local shootButton = Instance.new("TextButton")
shootButton.Size = UDim2.new(0, 140, 0, 58)
shootButton.Position = UDim2.new(1, -296, 1, -144)
shootButton.BackgroundColor3 = Color3.fromRGB(239, 95, 95)
shootButton.Font = Enum.Font.GothamBold
shootButton.TextScaled = true
shootButton.TextColor3 = Color3.fromRGB(255, 255, 255)
shootButton.Text = "SHOOT"
shootButton.Visible = UserInputService.TouchEnabled
shootButton.Parent = screenGui

local dashButton = Instance.new("TextButton")
dashButton.Size = UDim2.new(0, 140, 0, 58)
dashButton.Position = UDim2.new(1, -146, 1, -144)
dashButton.BackgroundColor3 = Color3.fromRGB(92, 152, 255)
dashButton.Font = Enum.Font.GothamBold
dashButton.TextScaled = true
dashButton.TextColor3 = Color3.fromRGB(255, 255, 255)
dashButton.Text = "DASH"
dashButton.Visible = UserInputService.TouchEnabled
dashButton.Parent = screenGui

local feedLabels = {}
local cooldownUntil = {
	Shoot = 0,
	Dash = 0,
}

local function updateTeamLabel()
	local teamName = localPlayer:GetAttribute("TeamName")
	if teamName == "Red" then
		teamLabel.Text = "Team: RED"
		teamLabel.TextColor3 = Color3.fromRGB(239, 95, 95)
	elseif teamName == "Blue" then
		teamLabel.Text = "Team: BLUE"
		teamLabel.TextColor3 = Color3.fromRGB(92, 152, 255)
	else
		teamLabel.Text = "Team: --"
		teamLabel.TextColor3 = Color3.fromRGB(220, 220, 220)
	end
end

local function reflowFeed()
	for index, label in ipairs(feedLabels) do
		label.Position = UDim2.new(0, 10, 0, (index - 1) * 34 + 8)
	end
end

local function removeFeedLabel(target)
	for idx, label in ipairs(feedLabels) do
		if label == target then
			table.remove(feedLabels, idx)
			break
		end
	end
	reflowFeed()
end

local function addFeedLine(message, color, duration)
	local line = Instance.new("TextLabel")
	line.Size = UDim2.new(1, -20, 0, 30)
	line.Position = UDim2.new(0, 10, 0, 8)
	line.BackgroundTransparency = 1
	line.TextXAlignment = Enum.TextXAlignment.Left
	line.Font = Enum.Font.GothamBold
	line.TextScaled = true
	line.TextColor3 = color
	line.Text = message
	line.Parent = feedFrame

	table.insert(feedLabels, 1, line)
	reflowFeed()

	while #feedLabels > 5 do
		local oldest = table.remove(feedLabels)
		if oldest then
			oldest:Destroy()
		end
	end

	task.delay(duration or 2.0, function()
		if not line.Parent then
			return
		end
		for step = 1, 8 do
			line.TextTransparency = step / 8
			task.wait(0.05)
		end
		line:Destroy()
		removeFeedLabel(line)
	end)
end

local function formatCooldown(actionName)
	local remain = cooldownUntil[actionName] - tick()
	if remain <= 0 then
		return "Ready"
	end
	return string.format("%.1fs", remain)
end

local function updateCooldownText()
	cooldownLabel.Text = string.format("Shoot: %s | Dash: %s", formatCooldown("Shoot"), formatCooldown("Dash"))
end

shootButton.MouseButton1Click:Connect(function()
	ShootRequest:FireServer()
end)

dashButton.MouseButton1Click:Connect(function()
	DashRequest:FireServer()
end)

MatchStateChanged.OnClientEvent:Connect(function(stateName, payload)
	if stateName == "Lobby" then
		stateLabel.Text = "Lobby"
		if payload and payload.remaining then
			timerLabel.Text = tostring(payload.remaining)
		else
			timerLabel.Text = "--"
		end
	elseif stateName == "Countdown" then
		stateLabel.Text = "Get Ready"
	elseif stateName == "Playing" then
		stateLabel.Text = "Playing"
		if payload and payload.remaining ~= nil then
			timerLabel.Text = tostring(payload.remaining)
		end
	elseif stateName == "Result" then
		stateLabel.Text = "Result"
		if payload and payload.winner then
			timerLabel.Text = tostring(payload.winner)
		end
	else
		stateLabel.Text = tostring(stateName)
	end
end)

MatchCountdown.OnClientEvent:Connect(function(remaining)
	if remaining > 0 then
		countdownLabel.Visible = true
		countdownLabel.Text = tostring(remaining)
	else
		countdownLabel.Text = "PAINT!"
		task.delay(0.7, function()
			countdownLabel.Visible = false
		end)
	end
end)

ScoreChanged.OnClientEvent:Connect(function(redPct, bluePct, neutralPct, redTiles, blueTiles, totalTiles)
	local r = math.clamp(redPct / 100, 0, 1)
	local b = math.clamp(bluePct / 100, 0, 1)

	redBar.Size = UDim2.new(r, 0, 1, 0)
	blueBar.Size = UDim2.new(b, 0, 1, 0)
	blueBar.Position = UDim2.new(1 - b, 0, 0, 0)

	redPctLabel.Text = string.format("R %.1f%%", redPct)
	bluePctLabel.Text = string.format("B %.1f%%", bluePct)
end)

FeedEvent.OnClientEvent:Connect(function(message, color, duration)
	addFeedLine(tostring(message), color or Color3.fromRGB(255, 255, 255), duration)
end)

ActionCooldown.OnClientEvent:Connect(function(actionName, duration)
	if cooldownUntil[actionName] ~= nil then
		cooldownUntil[actionName] = tick() + (tonumber(duration) or 0)
	end
end)

localPlayer:GetAttributeChangedSignal("TeamName"):Connect(updateTeamLabel)
updateTeamLabel()

RunService.RenderStepped:Connect(function()
	updateCooldownText()
end)
