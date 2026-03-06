local MatchConfig = {}

MatchConfig.MIN_PLAYERS = 1
MatchConfig.LOBBY_WAIT = 8
MatchConfig.COUNTDOWN_SECONDS = 3
MatchConfig.MATCH_DURATION = 90
MatchConfig.RESULT_DURATION = 8

MatchConfig.DEFAULT_WALK_SPEED = 16
MatchConfig.DEFAULT_JUMP_POWER = 50

MatchConfig.FALL_RESET_Y = 12
MatchConfig.THREAT_WINDOW = 5.0
MatchConfig.TELEPORT_LOCK = 1.1

MatchConfig.Arena = {
	centerY = 34,
	centerSize = Vector3.new(34, 3, 34),
	sideSize = Vector3.new(22, 3, 22),
	offset = 46,
	spawnRadius = 15,
}

MatchConfig.DOOR = {
	entryColor = Color3.fromRGB(82, 226, 255),
	exitColor = Color3.fromRGB(255, 171, 69),
	size = Vector3.new(7, 9, 1.2),
	placeDistance = 10,
	exitOffset = Vector3.new(0, 2.5, 0),
	launchSpeed = 28,
	cooldown = 1.0,
}

MatchConfig.PUSH = {
	cooldown = 2.0,
	range = 12,
	coneDot = 0.18,
	force = 82,
	upForce = 20,
}

return MatchConfig
