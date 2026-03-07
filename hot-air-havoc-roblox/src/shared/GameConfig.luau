local GameConfig = {}

GameConfig.TITLE = "Hot Air Havoc"
GameConfig.HOOK = "Manage altitude, steal wind lanes, and stay airborne longer than everyone else."
GameConfig.MIN_PLAYERS = 1
GameConfig.LOBBY_WAIT = 8
GameConfig.COUNTDOWN_SECONDS = 3
GameConfig.MATCH_DURATION = 90
GameConfig.RESULT_DURATION = 8

GameConfig.THEME = {
	sky = Color3.fromRGB(112, 176, 255),
	dock = Color3.fromRGB(89, 62, 46),
	wind = Color3.fromRGB(255, 208, 109),
	storm = Color3.fromRGB(255, 114, 91),
}

GameConfig.CONTROLS = {
	"Q: Burn",
	"E: Vent",
	"F: Boost",
}

return GameConfig
