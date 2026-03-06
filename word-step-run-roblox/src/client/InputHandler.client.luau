local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local CommandRequest = ReplicatedStorage:WaitForChild("CommandRequest")

local localNext = {
	STEP = 0,
	BRIDGE = 0,
	UP = 0,
}

local function tryFire(commandName)
	local now = tick()
	if now < (localNext[commandName] or 0) then
		return
	end
	localNext[commandName] = now + 0.08
	CommandRequest:FireServer(commandName)
end

UserInputService.InputBegan:Connect(function(input, processed)
	if processed then
		return
	end

	if input.KeyCode == Enum.KeyCode.Q then
		tryFire("STEP")
	elseif input.KeyCode == Enum.KeyCode.E then
		tryFire("BRIDGE")
	elseif input.KeyCode == Enum.KeyCode.R then
		tryFire("UP")
	end
end)
