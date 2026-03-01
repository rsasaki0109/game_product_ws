--[[
	GravityCamera (Client) — 重力方向に追従するカメラ制御
	StarterPlayerScripts に配置

	責務:
	- 重力方向が変わった時にカメラのアップベクトルをスムーズに回転
	- 酔い防止のためのスムーズ補間
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Players = game:GetService("Players")

local GravityConfig = require(ReplicatedStorage:WaitForChild("GravityConfig"))

local player = Players.LocalPlayer
local camera = workspace.CurrentCamera

---------------------------------------------------------------------------
-- State
---------------------------------------------------------------------------
local currentUpVector = Vector3.new(0, 1, 0)   -- 現在のアップベクトル
local targetUpVector = Vector3.new(0, 1, 0)     -- 目標のアップベクトル
local lerpAlpha = 1                              -- 補間の進行度（1 = 完了）

---------------------------------------------------------------------------
-- 重力方向 → アップベクトル変換
---------------------------------------------------------------------------
local function directionToUpVector(dirName: string): Vector3
	local gravityDir = GravityConfig.Directions[dirName]
	if gravityDir then
		return -gravityDir  -- 重力と逆方向が「上」
	end
	return Vector3.new(0, 1, 0)
end

---------------------------------------------------------------------------
-- RemoteEvent リスナー
---------------------------------------------------------------------------
local GravityChangedEvent = ReplicatedStorage:WaitForChild("GravityChanged")
local PlayerGravityChangedEvent = ReplicatedStorage:WaitForChild("PlayerGravityChanged")
local ZeroGEvent = ReplicatedStorage:WaitForChild("ZeroGravity")

local function onGravityChanged(directionName: string)
	targetUpVector = directionToUpVector(directionName)
	lerpAlpha = 0
end

GravityChangedEvent.OnClientEvent:Connect(onGravityChanged)
PlayerGravityChangedEvent.OnClientEvent:Connect(onGravityChanged)

ZeroGEvent.OnClientEvent:Connect(function(isZeroG: boolean)
	if isZeroG then
		-- 無重力時はアップベクトルを維持（変更しない）
	else
		-- 元の重力に戻る時は自然に補間
		lerpAlpha = 0
	end
end)

---------------------------------------------------------------------------
-- カメラ更新（毎フレーム）
---------------------------------------------------------------------------
RunService.RenderStepped:Connect(function(dt: number)
	if lerpAlpha >= 1 then return end

	-- スムーズ補間
	local speed = 1 / GravityConfig.CAMERA_LERP_SPEED
	lerpAlpha = math.min(1, lerpAlpha + dt * speed)

	-- Slerp でアップベクトルを補間
	currentUpVector = currentUpVector:Lerp(targetUpVector, lerpAlpha)

	-- カメラの CFrame を更新（プレイヤーの位置を基準に）
	local character = player.Character
	if not character then return end
	local hrp = character:FindFirstChild("HumanoidRootPart")
	if not hrp then return end

	-- カメラの現在の向きを取得
	local camCF = camera.CFrame
	local lookDir = camCF.LookVector

	-- 新しいアップベクトルに合わせてカメラの向きを再構築
	-- lookDir をアップベクトルの平面に投影
	local projectedLook = (lookDir - currentUpVector * lookDir:Dot(currentUpVector))
	if projectedLook.Magnitude < 0.001 then
		projectedLook = camCF.RightVector:Cross(currentUpVector)
	end
	projectedLook = projectedLook.Unit

	local rightVec = projectedLook:Cross(currentUpVector).Unit

	camera.CFrame = CFrame.fromMatrix(
		camCF.Position,
		rightVec,
		currentUpVector,
		-projectedLook
	)
end)
