local GameConfig = {}

GameConfig.TITLE = "Roll Ball Rush"
GameConfig.HOOK = "Climb inside a rolling ball, boost downhill, and hit the finish gate."
GameConfig.MIN_PLAYERS = 1
GameConfig.LOBBY_WAIT = 8
GameConfig.COUNTDOWN_SECONDS = 3
GameConfig.MATCH_DURATION = 75
GameConfig.RESULT_DURATION = 8
GameConfig.RESET_Y = -20
GameConfig.DEFAULT_JUMP_POWER = 42

GameConfig.THEME = {
	sky = Color3.fromRGB(197, 233, 255),
	track = Color3.fromRGB(242, 242, 242),
	accent = Color3.fromRGB(255, 166, 87),
	boost = Color3.fromRGB(255, 214, 102),
	brake = Color3.fromRGB(93, 175, 255),
	goal = Color3.fromRGB(135, 255, 173),
	shell = Color3.fromRGB(173, 235, 255),
}

GameConfig.CONTROLS = {
	"Q: Boost",
	"E: Brake",
	"Space: Jump",
	"WASD: Steer",
}

GameConfig.COURSE = {
	spawn = Vector3.new(0, 14, 18),
	checkpoints = {
		Vector3.new(0, 11, -10),
		Vector3.new(24, 8, -58),
		Vector3.new(-22, 5, -112),
		Vector3.new(0, 2, -170),
	},
	goal = Vector3.new(0, 2, -194),
}

GameConfig.BALL = {
	diameter = 10,
	centerOffset = Vector3.new(0, -2.5, 0),
	baseSpeed = 22,
	boostSpeed = 34,
	brakeSpeed = 10,
	boostDuration = 1.2,
	brakeDuration = 0.9,
	boostCooldown = 3.0,
	brakeCooldown = 2.0,
	rotationRadius = 5,
}

return GameConfig
