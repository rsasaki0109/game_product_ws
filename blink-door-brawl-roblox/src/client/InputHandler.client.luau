local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local ActionRequest = ReplicatedStorage:WaitForChild("ActionRequest")

local localNext = {
	PLACE_ENTRY = 0,
	PLACE_EXIT = 0,
	PUSH = 0,
}

local function tryFire(actionName)
	local now = tick()
	if now < (localNext[actionName] or 0) then
		return
	end
	localNext[actionName] = now + 0.08
	ActionRequest:FireServer(actionName)
end

UserInputService.InputBegan:Connect(function(input, processed)
	if processed then
		return
	end

	if input.KeyCode == Enum.KeyCode.Q then
		tryFire("PLACE_ENTRY")
	elseif input.KeyCode == Enum.KeyCode.E then
		tryFire("PLACE_EXIT")
	elseif input.KeyCode == Enum.KeyCode.F then
		tryFire("PUSH")
	end
end)
