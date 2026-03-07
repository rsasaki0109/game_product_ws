local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local stateFolder = ReplicatedStorage:WaitForChild("RollBallRushState")

local function getValue(name)
	return stateFolder:WaitForChild(name)
end

local titleValue = getValue("Title")
local hookValue = getValue("Hook")
local stateValue = getValue("State")
local timerValue = getValue("Timer")
local controlsValue = getValue("Controls")
local summaryValue = getValue("Summary")

local gui = Instance.new("ScreenGui")
gui.Name = "RollBallHUD"
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")

local panel = Instance.new("Frame")
panel.Name = "Panel"
panel.AnchorPoint = Vector2.new(0, 0)
panel.Position = UDim2.fromOffset(18, 18)
panel.Size = UDim2.fromOffset(370, 144)
panel.BackgroundColor3 = Color3.fromRGB(17, 28, 40)
panel.BackgroundTransparency = 0.18
panel.Parent = gui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 14)
corner.Parent = panel

local stroke = Instance.new("UIStroke")
stroke.Color = Color3.fromRGB(113, 188, 255)
stroke.Transparency = 0.25
stroke.Parent = panel

local titleLabel = Instance.new("TextLabel")
titleLabel.Size = UDim2.fromOffset(338, 28)
titleLabel.Position = UDim2.fromOffset(16, 12)
titleLabel.BackgroundTransparency = 1
titleLabel.Font = Enum.Font.GothamBlack
titleLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
titleLabel.TextXAlignment = Enum.TextXAlignment.Left
titleLabel.TextSize = 26
titleLabel.Parent = panel

local hookLabel = Instance.new("TextLabel")
hookLabel.Size = UDim2.fromOffset(338, 20)
hookLabel.Position = UDim2.fromOffset(16, 42)
hookLabel.BackgroundTransparency = 1
hookLabel.Font = Enum.Font.Gotham
hookLabel.TextColor3 = Color3.fromRGB(201, 224, 244)
hookLabel.TextXAlignment = Enum.TextXAlignment.Left
hookLabel.TextSize = 14
hookLabel.Parent = panel

local statusLabel = Instance.new("TextLabel")
statusLabel.Size = UDim2.fromOffset(338, 24)
statusLabel.Position = UDim2.fromOffset(16, 70)
statusLabel.BackgroundTransparency = 1
statusLabel.Font = Enum.Font.GothamBold
statusLabel.TextColor3 = Color3.fromRGB(255, 223, 133)
statusLabel.TextXAlignment = Enum.TextXAlignment.Left
statusLabel.TextSize = 18
statusLabel.Parent = panel

local detailLabel = Instance.new("TextLabel")
detailLabel.Size = UDim2.fromOffset(338, 22)
detailLabel.Position = UDim2.fromOffset(16, 98)
detailLabel.BackgroundTransparency = 1
detailLabel.Font = Enum.Font.Gotham
detailLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
detailLabel.TextXAlignment = Enum.TextXAlignment.Left
detailLabel.TextSize = 14
detailLabel.Parent = panel

local controlsLabel = Instance.new("TextLabel")
controlsLabel.Size = UDim2.fromOffset(338, 18)
controlsLabel.Position = UDim2.fromOffset(16, 120)
controlsLabel.BackgroundTransparency = 1
controlsLabel.Font = Enum.Font.Gotham
controlsLabel.TextColor3 = Color3.fromRGB(178, 202, 224)
controlsLabel.TextXAlignment = Enum.TextXAlignment.Left
controlsLabel.TextSize = 12
controlsLabel.Parent = panel

local function refresh()
	titleLabel.Text = titleValue.Value
	hookLabel.Text = hookValue.Value
	statusLabel.Text = string.format("%s  |  %02ds", stateValue.Value, timerValue.Value)
	controlsLabel.Text = controlsValue.Value

	local checkpoint = player:GetAttribute("CheckpointIndex") or 0
	local rank = player:GetAttribute("RaceRank") or 0
	local finishRank = player:GetAttribute("FinishRank") or 0
	local speed = math.floor(player:GetAttribute("BallSpeed") or 0)
	local boostReady = player:GetAttribute("BoostReady") and "BOOST READY" or "BOOST CD"
	local brakeReady = player:GetAttribute("BrakeReady") and "BRAKE READY" or "BRAKE CD"
	local finishText = finishRank > 0 and string.format("Finish #%d", finishRank) or string.format("Rank %d", rank)

	detailLabel.Text = string.format(
		"CP %d  |  %s  |  %d stud/s  |  %s  |  %s  |  %s",
		checkpoint,
		finishText,
		speed,
		boostReady,
		brakeReady,
		summaryValue.Value
	)
end

for _, value in ipairs(stateFolder:GetChildren()) do
	if value:IsA("StringValue") or value:IsA("IntValue") then
		value.Changed:Connect(refresh)
	end
end

for _, attributeName in ipairs({ "CheckpointIndex", "RaceRank", "FinishRank", "BallSpeed", "BoostReady", "BrakeReady" }) do
	player:GetAttributeChangedSignal(attributeName):Connect(refresh)
end

refresh()
