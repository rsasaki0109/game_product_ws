--[[
	GravityEffects (Client) — 重力変化時のビジュアルエフェクト
	StarterPlayerScripts に配置

	責務:
	- 重力シフト警告の表示
	- 画面エフェクト（歪み、フラッシュ）
	- 方向矢印インジケータ
	- Zero-G パーティクル
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Players = game:GetService("Players")

local GravityConfig = require(ReplicatedStorage:WaitForChild("GravityConfig"))

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

---------------------------------------------------------------------------
-- UI作成
---------------------------------------------------------------------------
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "GravityEffectsGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.Parent = playerGui

-- 警告テキスト
local warningLabel = Instance.new("TextLabel")
warningLabel.Name = "GravityWarning"
warningLabel.Size = UDim2.new(0.6, 0, 0.1, 0)
warningLabel.Position = UDim2.new(0.2, 0, 0.15, 0)
warningLabel.BackgroundTransparency = 1
warningLabel.Font = Enum.Font.GothamBlack
warningLabel.TextSize = 36
warningLabel.TextColor3 = Color3.fromRGB(255, 60, 60)
warningLabel.TextStrokeTransparency = 0.3
warningLabel.TextStrokeColor3 = Color3.new(0, 0, 0)
warningLabel.Text = ""
warningLabel.TextTransparency = 1
warningLabel.Parent = screenGui

-- 方向矢印
local arrowLabel = Instance.new("TextLabel")
arrowLabel.Name = "DirectionArrow"
arrowLabel.Size = UDim2.new(0.2, 0, 0.2, 0)
arrowLabel.Position = UDim2.new(0.4, 0, 0.4, 0)
arrowLabel.BackgroundTransparency = 1
arrowLabel.Font = Enum.Font.GothamBlack
arrowLabel.TextSize = 72
arrowLabel.TextColor3 = Color3.fromRGB(0, 200, 255)
arrowLabel.TextStrokeTransparency = 0
arrowLabel.TextStrokeColor3 = Color3.new(0, 0, 0)
arrowLabel.Text = ""
arrowLabel.TextTransparency = 1
arrowLabel.Parent = screenGui

-- 画面フラッシュ用フレーム
local flashFrame = Instance.new("Frame")
flashFrame.Name = "FlashFrame"
flashFrame.Size = UDim2.new(1, 0, 1, 0)
flashFrame.BackgroundColor3 = Color3.fromRGB(150, 0, 255)
flashFrame.BackgroundTransparency = 1
flashFrame.BorderSizePixel = 0
flashFrame.Parent = screenGui

---------------------------------------------------------------------------
-- エフェクト関数
---------------------------------------------------------------------------
local directionArrows = {
	Down  = "↓",
	Up    = "↑",
	North = "↗",
	South = "↙",
	East  = "→",
	West  = "←",
}

local function showWarning(eventType: string, seconds: number)
	local eventNames = {
		GravityFlip = "GRAVITY FLIP",
		GravityShift = "GRAVITY SHIFT",
		GravityStorm = "GRAVITY STORM",
		ZeroG = "ZERO GRAVITY",
	}
	local name = eventNames[eventType] or "GRAVITY CHANGE"

	-- カウントダウン表示
	for i = seconds, 1, -1 do
		warningLabel.Text = string.format("⚠ %s IN %d...", name, i)
		warningLabel.TextTransparency = 0

		-- パルスアニメーション
		local pulseTween = TweenService:Create(warningLabel, TweenInfo.new(0.3), {
			TextSize = 42,
		})
		pulseTween:Play()
		task.wait(0.3)
		local resetTween = TweenService:Create(warningLabel, TweenInfo.new(0.3), {
			TextSize = 36,
		})
		resetTween:Play()
		task.wait(0.7)
	end

	-- フェードアウト
	TweenService:Create(warningLabel, TweenInfo.new(0.5), {
		TextTransparency = 1,
	}):Play()
end

local function showDirectionArrow(directionName: string)
	local arrow = directionArrows[directionName] or "?"
	arrowLabel.Text = arrow
	arrowLabel.TextTransparency = 0
	arrowLabel.TextSize = 100

	-- 拡大 → 縮小 → フェードアウト
	local expandTween = TweenService:Create(arrowLabel, TweenInfo.new(0.2, Enum.EasingStyle.Back), {
		TextSize = 120,
	})
	expandTween:Play()
	expandTween.Completed:Wait()

	task.wait(0.3)

	TweenService:Create(arrowLabel, TweenInfo.new(0.5), {
		TextTransparency = 1,
		TextSize = 72,
	}):Play()
end

local function flashScreen()
	flashFrame.BackgroundTransparency = 0.6
	TweenService:Create(flashFrame, TweenInfo.new(0.4, Enum.EasingStyle.Exponential), {
		BackgroundTransparency = 1,
	}):Play()
end

---------------------------------------------------------------------------
-- RemoteEvent リスナー
---------------------------------------------------------------------------
local GravityWarningEvent = ReplicatedStorage:WaitForChild("GravityWarning")
local GravityChangedEvent = ReplicatedStorage:WaitForChild("GravityChanged")
local PlayerGravityChangedEvent = ReplicatedStorage:WaitForChild("PlayerGravityChanged")
local ZeroGEvent = ReplicatedStorage:WaitForChild("ZeroGravity")

GravityWarningEvent.OnClientEvent:Connect(function(eventType: string, seconds: number)
	task.spawn(showWarning, eventType, seconds)
end)

GravityChangedEvent.OnClientEvent:Connect(function(directionName: string)
	flashScreen()
	task.spawn(showDirectionArrow, directionName)
end)

PlayerGravityChangedEvent.OnClientEvent:Connect(function(directionName: string)
	flashScreen()
	task.spawn(showDirectionArrow, directionName)
end)

ZeroGEvent.OnClientEvent:Connect(function(isZeroG: boolean)
	if isZeroG then
		warningLabel.Text = "✦ ZERO GRAVITY ✦"
		warningLabel.TextColor3 = Color3.fromRGB(0, 200, 255)
		warningLabel.TextTransparency = 0
		flashFrame.BackgroundColor3 = Color3.fromRGB(0, 100, 255)
		flashScreen()
	else
		TweenService:Create(warningLabel, TweenInfo.new(0.5), {
			TextTransparency = 1,
		}):Play()
		warningLabel.TextColor3 = Color3.fromRGB(255, 60, 60)
	end
end)
