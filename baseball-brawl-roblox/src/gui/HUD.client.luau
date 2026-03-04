-- HUD
-- マッチ状態、スコア、ボール支配、フィード、クールダウン表示

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local localPlayer = Players.LocalPlayer
local playerGui = localPlayer:WaitForChild("PlayerGui")

local MatchStateChanged = ReplicatedStorage:WaitForChild("MatchStateChanged")
local MatchCountdown = ReplicatedStorage:WaitForChild("MatchCountdown")
local ScoreChanged = ReplicatedStorage:WaitForChild("ScoreChanged")
local BallOwnerChanged = ReplicatedStorage:WaitForChild("BallOwnerChanged")
local PlayFeed = ReplicatedStorage:WaitForChild("PlayFeed")
local ActionCooldown = ReplicatedStorage:WaitForChild("ActionCooldown")
local SwingRequest = ReplicatedStorage:WaitForChild("SwingRequest")
local DashRequest = ReplicatedStorage:WaitForChild("DashRequest")

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BaseballBrawlHUD"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui

local topFrame = Instance.new("Frame")
topFrame.Size = UDim2.new(1, 0, 0, 88)
topFrame.BackgroundColor3 = Color3.fromRGB(14, 16, 22)
topFrame.BackgroundTransparency = 0.22
topFrame.BorderSizePixel = 0
topFrame.Parent = screenGui

local stateLabel = Instance.new("TextLabel")
stateLabel.Size = UDim2.new(0.32, 0, 0.56, 0)
stateLabel.Position = UDim2.new(0.02, 0, 0.06, 0)
stateLabel.TextXAlignment = Enum.TextXAlignment.Left
stateLabel.BackgroundTransparency = 1
stateLabel.Font = Enum.Font.GothamBold
stateLabel.TextColor3 = Color3.fromRGB(244, 244, 244)
stateLabel.TextScaled = true
stateLabel.Text = "Lobby"
stateLabel.Parent = topFrame

local timerLabel = Instance.new("TextLabel")
timerLabel.Size = UDim2.new(0.2, 0, 0.56, 0)
timerLabel.Position = UDim2.new(0.4, 0, 0.06, 0)
timerLabel.BackgroundTransparency = 1
timerLabel.Font = Enum.Font.GothamBold
timerLabel.TextColor3 = Color3.fromRGB(255, 236, 135)
timerLabel.TextScaled = true
timerLabel.Text = "--"
timerLabel.Parent = topFrame

local scoreLabel = Instance.new("TextLabel")
scoreLabel.Size = UDim2.new(0.34, 0, 0.56, 0)
scoreLabel.Position = UDim2.new(0.64, 0, 0.06, 0)
scoreLabel.TextXAlignment = Enum.TextXAlignment.Right
scoreLabel.BackgroundTransparency = 1
scoreLabel.Font = Enum.Font.GothamBold
scoreLabel.TextColor3 = Color3.fromRGB(244, 244, 244)
scoreLabel.TextScaled = true
scoreLabel.Text = "R 0 : 0 B"
scoreLabel.Parent = topFrame

local ownerLabel = Instance.new("TextLabel")
ownerLabel.Size = UDim2.new(1, -24, 0.36, 0)
ownerLabel.Position = UDim2.new(0, 12, 0.58, 0)
ownerLabel.TextXAlignment = Enum.TextXAlignment.Left
ownerLabel.BackgroundTransparency = 1
ownerLabel.Font = Enum.Font.GothamMedium
ownerLabel.TextColor3 = Color3.fromRGB(224, 224, 224)
ownerLabel.TextScaled = true
ownerLabel.Text = "Ball: Neutral"
ownerLabel.Parent = topFrame

local countdownLabel = Instance.new("TextLabel")
countdownLabel.Size = UDim2.new(0, 280, 0, 110)
countdownLabel.Position = UDim2.new(0.5, -140, 0.5, -55)
countdownLabel.BackgroundTransparency = 1
countdownLabel.Font = Enum.Font.GothamBlack
countdownLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
countdownLabel.TextScaled = true
countdownLabel.Visible = false
countdownLabel.Parent = screenGui

local cooldownLabel = Instance.new("TextLabel")
cooldownLabel.Size = UDim2.new(0, 360, 0, 32)
cooldownLabel.Position = UDim2.new(0, 12, 1, -38)
cooldownLabel.BackgroundTransparency = 1
cooldownLabel.Font = Enum.Font.GothamMedium
cooldownLabel.TextColor3 = Color3.fromRGB(230, 230, 230)
cooldownLabel.TextScaled = true
cooldownLabel.TextXAlignment = Enum.TextXAlignment.Left
cooldownLabel.Text = "Swing: Ready | Dash: Ready"
cooldownLabel.Parent = screenGui

local hintLabel = Instance.new("TextLabel")
hintLabel.Size = UDim2.new(0, 460, 0, 32)
hintLabel.Position = UDim2.new(0.5, -230, 1, -38)
hintLabel.BackgroundTransparency = 1
hintLabel.Font = Enum.Font.GothamMedium
hintLabel.TextColor3 = Color3.fromRGB(232, 232, 232)
hintLabel.TextScaled = true
hintLabel.Text = "LMB/F: Swing  |  E/Q/Shift: Dash"
hintLabel.Parent = screenGui

local feedFrame = Instance.new("Frame")
feedFrame.Size = UDim2.new(0, 420, 0, 186)
feedFrame.Position = UDim2.new(1, -432, 0, 96)
feedFrame.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
feedFrame.BackgroundTransparency = 0.62
feedFrame.BorderSizePixel = 0
feedFrame.Parent = screenGui

local feedStroke = Instance.new("UIStroke")
feedStroke.Thickness = 1
feedStroke.Transparency = 0.45
feedStroke.Color = Color3.fromRGB(255, 255, 255)
feedStroke.Parent = feedFrame

local swingButton = Instance.new("TextButton")
swingButton.Size = UDim2.new(0, 138, 0, 56)
swingButton.Position = UDim2.new(1, -298, 1, -138)
swingButton.BackgroundColor3 = Color3.fromRGB(245, 101, 56)
swingButton.TextColor3 = Color3.fromRGB(255, 255, 255)
swingButton.Font = Enum.Font.GothamBold
swingButton.TextScaled = true
swingButton.Text = "SWING"
swingButton.Visible = UserInputService.TouchEnabled
swingButton.Parent = screenGui

local dashButton = Instance.new("TextButton")
dashButton.Size = UDim2.new(0, 138, 0, 56)
dashButton.Position = UDim2.new(1, -146, 1, -138)
dashButton.BackgroundColor3 = Color3.fromRGB(86, 138, 255)
dashButton.TextColor3 = Color3.fromRGB(255, 255, 255)
dashButton.Font = Enum.Font.GothamBold
dashButton.TextScaled = true
dashButton.Text = "DASH"
dashButton.Visible = UserInputService.TouchEnabled
dashButton.Parent = screenGui

local feedLabels = {}
local cooldownUntil = {
	Swing = 0,
	Dash = 0,
}

local function removeFeedLabel(target)
	for idx, label in ipairs(feedLabels) do
		if label == target then
			table.remove(feedLabels, idx)
			break
		end
	end
	for index, label in ipairs(feedLabels) do
		label.Position = UDim2.new(0, 10, 0, (index - 1) * 34 + 8)
	end
end

local function addFeed(message: string, color: Color3, lifetime: number?)
	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(1, -20, 0, 28)
	label.Position = UDim2.new(0, 10, 0, 8)
	label.BackgroundTransparency = 1
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.Font = Enum.Font.GothamBold
	label.TextScaled = true
	label.TextColor3 = color
	label.Text = message
	label.Parent = feedFrame

	table.insert(feedLabels, 1, label)
	for index, line in ipairs(feedLabels) do
		line.Position = UDim2.new(0, 10, 0, (index - 1) * 34 + 8)
	end

	while #feedLabels > 5 do
		local oldest = table.remove(feedLabels)
		if oldest then
			oldest:Destroy()
		end
	end

	task.delay(lifetime or 2.1, function()
		if not label.Parent then
			return
		end
		for step = 1, 8 do
			label.TextTransparency = step / 8
			task.wait(0.05)
		end
		label:Destroy()
		removeFeedLabel(label)
	end)
end

local function cooldownText(actionName: string)
	local remain = cooldownUntil[actionName] - tick()
	if remain <= 0 then
		return "Ready"
	end
	return string.format("%.1fs", remain)
end

local function updateCooldownUi()
	cooldownLabel.Text = string.format("Swing: %s | Dash: %s", cooldownText("Swing"), cooldownText("Dash"))
end

swingButton.MouseButton1Click:Connect(function()
	SwingRequest:FireServer()
end)

dashButton.MouseButton1Click:Connect(function()
	DashRequest:FireServer()
end)

MatchStateChanged.OnClientEvent:Connect(function(state, payload)
	if state == "Lobby" then
		stateLabel.Text = "Lobby"
		timerLabel.Text = payload and payload.remaining and tostring(payload.remaining) or "--"
	elseif state == "Countdown" then
		stateLabel.Text = "Get Ready"
	elseif state == "Playing" then
		stateLabel.Text = "Playing"
		if payload and payload.remaining ~= nil then
			timerLabel.Text = tostring(payload.remaining)
		end
	elseif state == "Result" then
		stateLabel.Text = "Result"
		if payload and payload.winner then
			timerLabel.Text = tostring(payload.winner)
		end
	end
end)

MatchCountdown.OnClientEvent:Connect(function(remaining)
	if remaining > 0 then
		countdownLabel.Visible = true
		countdownLabel.Text = tostring(remaining)
	else
		countdownLabel.Text = "BRAWL!"
		task.delay(0.7, function()
			countdownLabel.Visible = false
		end)
	end
end)

ScoreChanged.OnClientEvent:Connect(function(red, blue)
	scoreLabel.Text = string.format("R %d : %d B", red, blue)
end)

BallOwnerChanged.OnClientEvent:Connect(function(teamName, playerName)
	if not teamName then
		ownerLabel.Text = "Ball: Neutral"
		ownerLabel.TextColor3 = Color3.fromRGB(224, 224, 224)
		return
	end
	ownerLabel.Text = string.format("Ball: %s (%s)", teamName, playerName or "")
	if teamName == "Red" then
		ownerLabel.TextColor3 = Color3.fromRGB(245, 104, 104)
	else
		ownerLabel.TextColor3 = Color3.fromRGB(122, 170, 255)
	end
end)

PlayFeed.OnClientEvent:Connect(function(message, color, duration)
	addFeed(tostring(message), color or Color3.fromRGB(255, 255, 255), duration)
end)

ActionCooldown.OnClientEvent:Connect(function(actionName, duration)
	if cooldownUntil[actionName] ~= nil then
		cooldownUntil[actionName] = tick() + (tonumber(duration) or 0)
	end
end)

RunService.RenderStepped:Connect(function()
	updateCooldownUi()
end)
