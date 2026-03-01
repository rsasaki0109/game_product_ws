--[[
	Types — 型定義（共有）
]]

export type GravityDirection = "Down" | "Up" | "North" | "South" | "East" | "West"

export type GravityEvent = "GravityFlip" | "GravityShift" | "ZeroG" | "GravityStorm"

export type PlayerGravityState = {
	direction: GravityDirection,
	isAnchored: boolean,       -- 重力アンカーで固定中か
	isZeroG: boolean,          -- 無重力状態か
	isBoosting: boolean,       -- 反重力ブースト中か
}

export type RoundState = "Lobby" | "Countdown" | "Racing" | "Result"

export type StageConfig = {
	name: string,
	difficulty: number,        -- 1〜5
	gravityEvent: GravityEvent,
	duration: number,          -- ラウンド制限時間（秒）
	itemsEnabled: boolean,
}

export type PlayerResult = {
	player: Player,
	rank: number,
	time: number,              -- ゴールまでの時間（秒）
	coins: number,
}

return nil
