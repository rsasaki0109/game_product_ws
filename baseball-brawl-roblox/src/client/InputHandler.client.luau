-- InputHandler
-- PC/ゲームパッド入力からアクションを送る

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local MatchConfig = require(ReplicatedStorage:WaitForChild("MatchConfig"))

local SwingRequest = ReplicatedStorage:WaitForChild("SwingRequest")
local DashRequest = ReplicatedStorage:WaitForChild("DashRequest")

local nextAllowedAt = {
	Swing = 0,
	Dash = 0,
}

local function canSend(actionName: string, minGap: number)
	local now = tick()
	if now < nextAllowedAt[actionName] then
		return false
	end
	nextAllowedAt[actionName] = now + minGap
	return true
end

local function trySwing()
	if canSend("Swing", math.min(0.1, MatchConfig.SWING_COOLDOWN * 0.3)) then
		SwingRequest:FireServer()
	end
end

local function tryDash()
	if canSend("Dash", math.min(0.18, MatchConfig.DASH_COOLDOWN * 0.2)) then
		DashRequest:FireServer()
	end
end

UserInputService.InputBegan:Connect(function(input, processed)
	if processed then
		return
	end

	if input.UserInputType == Enum.UserInputType.MouseButton1 then
		trySwing()
		return
	end

	if input.KeyCode == Enum.KeyCode.F or input.KeyCode == Enum.KeyCode.ButtonR2 then
		trySwing()
		return
	end

	if input.KeyCode == Enum.KeyCode.E
		or input.KeyCode == Enum.KeyCode.Q
		or input.KeyCode == Enum.KeyCode.LeftShift
		or input.KeyCode == Enum.KeyCode.ButtonB then
		tryDash()
	end
end)
