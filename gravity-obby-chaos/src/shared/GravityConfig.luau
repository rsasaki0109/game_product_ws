--[[
	GravityConfig — 重力システムの設定値
	ReplicatedStorage に配置（サーバー/クライアント両方で参照）
]]

local GravityConfig = {}

-- 重力の強さ（Robloxデフォルト: 196.2）
GravityConfig.DEFAULT_GRAVITY = 196.2
GravityConfig.GRAVITY_MAGNITUDE = 196.2

-- 重力方向の定義（6方向）
GravityConfig.Directions = {
	Down  = Vector3.new(0, -1, 0),
	Up    = Vector3.new(0,  1, 0),
	North = Vector3.new(0,  0, -1),
	South = Vector3.new(0,  0,  1),
	East  = Vector3.new(1,  0,  0),
	West  = Vector3.new(-1, 0,  0),
}

-- 方向名のリスト（ランダム選択用）
GravityConfig.DirectionNames = { "Down", "Up", "North", "South", "East", "West" }

-- 重力シフトイベントの設定
GravityConfig.Events = {
	GravityFlip = {
		interval = { min = 15, max = 25 },  -- 秒
		description = "重力が180°反転",
	},
	GravityShift = {
		interval = { min = 20, max = 30 },
		description = "重力が90°回転",
	},
	ZeroG = {
		duration = 3,      -- 秒
		description = "無重力状態",
	},
	GravityStorm = {
		interval = { min = 1.5, max = 2.5 },
		description = "超高速ランダム切替",
	},
}

-- カメラ補間の速度（秒）— 酔い防止のためスムーズに
GravityConfig.CAMERA_LERP_SPEED = 0.3

-- 重力変化の警告時間（秒）
GravityConfig.WARNING_TIME = 3

-- プレイヤー任意の重力切り替えクールダウン（秒）
GravityConfig.PLAYER_SHIFT_COOLDOWN = 4

-- Stage 3 の GravityStorm 段階解放（プレイ回数）
GravityConfig.STAGE3_STORM_UNLOCK_AFTER = 2

-- モバイル向けUI設定
GravityConfig.MobileUI = {
	useItemButtonSize = UDim2.new(0, 120, 0, 56),
	useItemButtonPosition = UDim2.new(1, -140, 1, -140),
	gravityButtonSize = UDim2.new(0, 120, 0, 56),
	gravityButtonPosition = UDim2.new(1, -140, 1, -72),
}

-- アイテム設定
GravityConfig.Items = {
	GravityBomb = {
		radius = 30,           -- スタッド
		duration = 5,          -- 効果時間（秒）
		cooldown = 15,         -- クールダウン（秒）
	},
	GravityAnchor = {
		duration = 8,          -- 次のシフトを無効化する時間
		cooldown = 30,
	},
	AntiGravBoost = {
		duration = 3,          -- 浮遊時間
		speed = 80,            -- 移動速度
		cooldown = 20,
	},
	GravityReverse = {
		duration = 5,
		cooldown = 25,
	},
}

return GravityConfig
