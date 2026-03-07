local GameConfig = {}

GameConfig.TITLE = "Bubble Drifter"
GameConfig.HOOK = "Ride soap bubbles, follow the wind, and pop at the right time."
GameConfig.MIN_PLAYERS = 1
GameConfig.LOBBY_WAIT = 8
GameConfig.COUNTDOWN_SECONDS = 3
GameConfig.MATCH_DURATION = 80
GameConfig.RESULT_DURATION = 8
GameConfig.DEFAULT_WALK_SPEED = 16
GameConfig.DEFAULT_JUMP_POWER = 50
GameConfig.RESET_Y = 6

GameConfig.THEME = {
	sky = Color3.fromRGB(178, 227, 255),
	cloud = Color3.fromRGB(255, 255, 255),
	ring = Color3.fromRGB(255, 212, 136),
	accent = Color3.fromRGB(118, 213, 255),
	shell = Color3.fromRGB(176, 243, 255),
}

GameConfig.CONTROLS = {
	"Q: Bubble",
	"E: Pop",
	"WASD: Drift",
}

GameConfig.COURSE = {
	spawn = Vector3.new(0, 18, 0),
	checkpoints = {
		Vector3.new(-28, 24, -16),
		Vector3.new(-8, 34, -36),
		Vector3.new(8, 46, -58),
		Vector3.new(22, 60, -80),
		Vector3.new(0, 78, -96),
	},
	rings = {
		Vector3.new(-28, 30, -16),
		Vector3.new(-8, 40, -36),
		Vector3.new(8, 52, -58),
		Vector3.new(22, 66, -80),
		Vector3.new(0, 84, -96),
	},
	goal = Vector3.new(0, 82, -108),
	maxHeight = 92,
}

GameConfig.SCORING = {
	ringValue = 1,
	finishBonus = {
		[1] = 5,
		[2] = 3,
		[3] = 2,
		default = 1,
	},
}

GameConfig.BUBBLE = {
	liftAcceleration = 84,
	maxHorizontalSpeed = 36,
	maxVerticalSpeed = 26,
	reactivateDelay = 0.6,
	shellDiameter = 8,
	ceilingPush = 110,
	walkSpeed = 13,
	jumpPower = 26,
}

return GameConfig
