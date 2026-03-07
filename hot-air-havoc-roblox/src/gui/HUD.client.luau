local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local stateFolder = ReplicatedStorage:WaitForChild("HotAirHavocState")

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "HotAirHavocHUD"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui

local frame = Instance.new("Frame")
frame.Size = UDim2.fromOffset(540, 138)
frame.Position = UDim2.new(0, 18, 0, 18)
frame.BackgroundColor3 = Color3.fromRGB(46, 29, 22)
frame.BackgroundTransparency = 0.16
frame.Parent = screenGui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 18)
corner.Parent = frame

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, -24, 0, 34)
title.Position = UDim2.fromOffset(12, 10)
title.BackgroundTransparency = 1
title.Font = Enum.Font.GothamBlack
title.TextXAlignment = Enum.TextXAlignment.Left
title.TextColor3 = Color3.fromRGB(255, 255, 255)
title.TextScaled = true
title.Parent = frame

local hook = Instance.new("TextLabel")
hook.Size = UDim2.new(1, -24, 0, 28)
hook.Position = UDim2.fromOffset(12, 46)
hook.BackgroundTransparency = 1
hook.Font = Enum.Font.GothamMedium
hook.TextWrapped = true
hook.TextXAlignment = Enum.TextXAlignment.Left
hook.TextColor3 = Color3.fromRGB(255, 231, 205)
hook.TextScaled = true
hook.Parent = frame

local status = Instance.new("TextLabel")
status.Size = UDim2.new(0.46, -12, 0, 36)
status.Position = UDim2.fromOffset(12, 92)
status.BackgroundTransparency = 1
status.Font = Enum.Font.GothamBold
status.TextXAlignment = Enum.TextXAlignment.Left
status.TextColor3 = Color3.fromRGB(255, 208, 109)
status.TextScaled = true
status.Parent = frame

local controls = Instance.new("TextLabel")
controls.Size = UDim2.new(0.54, -12, 0, 36)
controls.Position = UDim2.new(0.46, 0, 0, 92)
controls.BackgroundTransparency = 1
controls.Font = Enum.Font.Gotham
controls.TextXAlignment = Enum.TextXAlignment.Right
controls.TextColor3 = Color3.fromRGB(255, 255, 255)
controls.TextScaled = true
controls.Parent = frame

local function refresh()
	title.Text = stateFolder.Title.Value
	hook.Text = stateFolder.Hook.Value
	status.Text = string.format("%s  %02d", stateFolder.State.Value, stateFolder.Timer.Value)
	controls.Text = stateFolder.Controls.Value
end

for _, child in ipairs(stateFolder:GetChildren()) do
	if child:IsA("StringValue") or child:IsA("IntValue") then
		child:GetPropertyChangedSignal("Value"):Connect(refresh)
	end
end

refresh()
