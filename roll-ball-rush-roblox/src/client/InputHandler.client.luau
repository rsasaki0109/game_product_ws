local ContextActionService = game:GetService("ContextActionService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local BallCommandRequest = ReplicatedStorage:WaitForChild("BallCommandRequest")

local ACTIONS = {
	{
		name = "RollBallBoost",
		command = "Boost",
		key = Enum.KeyCode.Q,
		buttonText = "BOOST",
		position = UDim2.fromScale(0.78, 0.82),
	},
	{
		name = "RollBallBrake",
		command = "Brake",
		key = Enum.KeyCode.E,
		buttonText = "BRAKE",
		position = UDim2.fromScale(0.9, 0.82),
	},
}

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "RollBallTouchGui"
screenGui.ResetOnSpawn = false
screenGui.Enabled = UserInputService.TouchEnabled
screenGui.Parent = Players.LocalPlayer:WaitForChild("PlayerGui")

for _, action in ipairs(ACTIONS) do
	ContextActionService:BindAction(action.name, function(_, inputState)
		if inputState == Enum.UserInputState.Begin then
			BallCommandRequest:FireServer(action.command)
		end
		return Enum.ContextActionResult.Sink
	end, true, action.key)

	ContextActionService:SetTitle(action.name, "")
	ContextActionService:SetPosition(action.name, action.position)

	local button = Instance.new("TextButton")
	button.Name = action.name .. "Button"
	button.Size = UDim2.fromOffset(120, 46)
	button.AnchorPoint = Vector2.new(0.5, 0.5)
	button.Position = action.position
	button.BackgroundColor3 = action.command == "Boost" and Color3.fromRGB(255, 200, 98) or Color3.fromRGB(92, 164, 255)
	button.BackgroundTransparency = 0.15
	button.Font = Enum.Font.GothamBlack
	button.Text = action.buttonText
	button.TextColor3 = Color3.fromRGB(255, 255, 255)
	button.TextScaled = true
	button.Visible = UserInputService.TouchEnabled
	button.Parent = screenGui

	button.Activated:Connect(function()
		BallCommandRequest:FireServer(action.command)
	end)
end

if not UserInputService.TouchEnabled then
	screenGui.Enabled = false
end
