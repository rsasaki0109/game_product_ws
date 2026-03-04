local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local ShootRequest = ReplicatedStorage:WaitForChild("ShootRequest")
local DashRequest = ReplicatedStorage:WaitForChild("DashRequest")

local localNext = {
	Shoot = 0,
	Dash = 0,
}

local function tryFire(actionName, remote, gap)
	local now = tick()
	if now < localNext[actionName] then
		return
	end
	localNext[actionName] = now + gap
	remote:FireServer()
end

local function tryShoot()
	tryFire("Shoot", ShootRequest, 0.07)
end

local function tryDash()
	tryFire("Dash", DashRequest, 0.12)
end

UserInputService.InputBegan:Connect(function(input, processed)
	if processed then
		return
	end

	if input.UserInputType == Enum.UserInputType.MouseButton1 then
		tryShoot()
		return
	end

	if input.KeyCode == Enum.KeyCode.F or input.KeyCode == Enum.KeyCode.ButtonR2 then
		tryShoot()
		return
	end

	if input.KeyCode == Enum.KeyCode.E
		or input.KeyCode == Enum.KeyCode.Q
		or input.KeyCode == Enum.KeyCode.LeftShift
		or input.KeyCode == Enum.KeyCode.ButtonB then
		tryDash()
	end
end)
