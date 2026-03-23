local MatchConfig = {}

MatchConfig.MIN_PLAYERS = 1
MatchConfig.LOBBY_WAIT = 8
MatchConfig.COUNTDOWN_SECONDS = 3
MatchConfig.MATCH_DURATION = 75
MatchConfig.RESULT_DURATION = 8

MatchConfig.DEFAULT_WALK_SPEED = 16
MatchConfig.DEFAULT_JUMP_POWER = 50

MatchConfig.CHECKPOINT_COUNT = 3
MatchConfig.CHECKPOINT_RESPAWN_OFFSET = Vector3.new(0, 4, 0)
MatchConfig.FALL_RESET_Y = 10

MatchConfig.COURSE = {
	startHeight = 30,
	highHeight = 38,
	startX = -120,
	checkpoint1X = -70,
	checkpoint2X = -20,
	checkpoint3X = 40,
	finishX = 100,
	spawnName = "Spawn_Main",
	finishName = "FinishPad",
}

MatchConfig.COMMANDS = {
	STEP = {
		displayName = "STEP",
		color = Color3.fromRGB(245, 245, 245),
		textColor = Color3.fromRGB(31, 34, 43),
		cooldown = 0.55,
		lifetime = 2.8,
		size = Vector3.new(8, 1, 8),
	},
	BRIDGE = {
		displayName = "BRIDGE",
		color = Color3.fromRGB(255, 214, 92),
		textColor = Color3.fromRGB(51, 39, 0),
		cooldown = 1.9,
		lifetime = 3.4,
		size = Vector3.new(8, 1, 8),
	},
	UP = {
		displayName = "UP",
		color = Color3.fromRGB(92, 235, 255),
		textColor = Color3.fromRGB(12, 48, 56),
		cooldown = 1.45,
		lifetime = 3.2,
		size = Vector3.new(8, 1, 8),
	},
	PUSH = {
		displayName = "PUSH",
		color = Color3.fromRGB(255, 120, 50),
		textColor = Color3.fromRGB(60, 20, 0),
		cooldown = 1.1,
		lifetime = 3.0,
		size = Vector3.new(8, 1, 8),
	},
	TRAP = {
		displayName = "TRAP",
		color = Color3.fromRGB(180, 60, 180),
		textColor = Color3.fromRGB(40, 10, 40),
		cooldown = 1.1,
		lifetime = 4.0,
		size = Vector3.new(8, 1, 8),
	},
}

return MatchConfig
