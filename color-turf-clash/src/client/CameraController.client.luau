local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local localPlayer = Players.LocalPlayer
local HitFeedback = ReplicatedStorage:WaitForChild("HitFeedback")

local shakeEndsAt = 0
local shakePower = 0

local function applyCharacterCamera(character)
	local camera = workspace.CurrentCamera
	if not camera then
		return
	end
	local humanoid = character:WaitForChild("Humanoid")
	camera.CameraSubject = humanoid
	camera.FieldOfView = 79
end

HitFeedback.OnClientEvent:Connect(function(intensity, duration)
	local i = tonumber(intensity) or 0.25
	local d = tonumber(duration) or 0.1
	shakePower = math.max(shakePower, i)
	shakeEndsAt = math.max(shakeEndsAt, tick() + d)
end)

RunService.RenderStepped:Connect(function()
	local camera = workspace.CurrentCamera
	if not camera then
		return
	end

	if tick() < shakeEndsAt and shakePower > 0.001 then
		local jitter = Vector3.new(
			(math.random() - 0.5) * shakePower,
			(math.random() - 0.5) * shakePower,
			(math.random() - 0.5) * shakePower * 0.4
		)
		camera.CFrame = camera.CFrame * CFrame.new(jitter)
	else
		shakePower *= 0.87
		if shakePower < 0.01 then
			shakePower = 0
		end
	end
end)

if localPlayer.Character then
	applyCharacterCamera(localPlayer.Character)
end

localPlayer.CharacterAdded:Connect(applyCharacterCamera)
