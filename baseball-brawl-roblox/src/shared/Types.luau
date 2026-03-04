--!strict

export type TeamName = "Red" | "Blue"

export type ScoreState = {
	Red: number,
	Blue: number,
}

export type MatchStateName = "Lobby" | "Countdown" | "Playing" | "Result"

export type FeedEvent = {
	message: string,
	color: Color3,
	duration: number,
}

return {}
