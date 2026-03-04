local MatchConfig = {}

MatchConfig.MIN_PLAYERS = 1
MatchConfig.LOBBY_WAIT = 10
MatchConfig.COUNTDOWN_SECONDS = 3
MatchConfig.MATCH_DURATION = 95
MatchConfig.RESULT_DURATION = 8

MatchConfig.DEFAULT_WALK_SPEED = 16
MatchConfig.DEFAULT_JUMP_POWER = 50

MatchConfig.SHOOT_COOLDOWN = 0.18
MatchConfig.SHOOT_RANGE = 110
MatchConfig.SHOOT_DAMAGE = 36
MatchConfig.SHOOT_PAINT_RADIUS = 11

MatchConfig.DASH_COOLDOWN = 3.5
MatchConfig.DASH_FORCE = 120
MatchConfig.DASH_UP_FORCE = 22
MatchConfig.DASH_DAMAGE = 22
MatchConfig.DASH_RANGE = 10
MatchConfig.DASH_PAINT_RADIUS = 8

MatchConfig.INK_HEALTH_MAX = 100
MatchConfig.RESPAWN_LOCK = 1.0

MatchConfig.COLOR_SURGE_INTERVAL = 15
MatchConfig.COLOR_SURGE_JITTER = 3
MatchConfig.COLOR_SURGE_RADIUS = 15

MatchConfig.Arena = {
	width = 192,
	length = 128,
	wallHeight = 24,
	spawnOffsetX = 70,
	tileSize = 8,
	gridX = 24,
	gridZ = 16,
}

MatchConfig.Teams = {
	Red = {
		spawnName = "Spawn_Red",
		primary = Color3.fromRGB(239, 95, 95),
		dark = Color3.fromRGB(122, 45, 45),
	},
	Blue = {
		spawnName = "Spawn_Blue",
		primary = Color3.fromRGB(92, 152, 255),
		dark = Color3.fromRGB(40, 70, 130),
	},
	Neutral = {
		primary = Color3.fromRGB(68, 70, 82),
		dark = Color3.fromRGB(40, 42, 50),
	},
}

return MatchConfig
