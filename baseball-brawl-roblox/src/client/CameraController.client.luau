-- CameraController
-- 被弾/衝突時の軽い画面シェイクを付与

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local localPlayer = Players.LocalPlayer

local HitFeedback = ReplicatedStorage:WaitForChild("HitFeedback")

local shakeEndsAt = 0
local shakeStrength = 0

local function getCamera()
	return workspace.CurrentCamera
end

local function onCharacterAdded(character: Model)
	local camera = getCamera()
	if not camera then
		return
	end

	local humanoid = character:WaitForChild("Humanoid")
	camera.CameraSubject = humanoid
	camera.FieldOfView = 78
end

HitFeedback.OnClientEvent:Connect(function(intensity, duration)
	local safeIntensity = tonumber(intensity) or 0.22
	local safeDuration = tonumber(duration) or 0.12

	if safeIntensity > shakeStrength then
		shakeStrength = safeIntensity
	end
	shakeEndsAt = math.max(shakeEndsAt, tick() + safeDuration)
end)

RunService.RenderStepped:Connect(function()
	local camera = getCamera()
	if not camera then
		return
	end

	if tick() < shakeEndsAt and shakeStrength > 0 then
		local strength = shakeStrength
		local offset = Vector3.new(
			(math.random() - 0.5) * strength,
			(math.random() - 0.5) * strength,
			(math.random() - 0.5) * strength * 0.4
		)
		camera.CFrame = camera.CFrame * CFrame.new(offset)
	else
		shakeStrength *= 0.87
		if shakeStrength < 0.01 then
			shakeStrength = 0
		end
	end
end)

if localPlayer.Character then
	onCharacterAdded(localPlayer.Character)
end

localPlayer.CharacterAdded:Connect(onCharacterAdded)
