local GameConfig = {}

GameConfig.TITLE = "Gravity Flip Arena"
GameConfig.HOOK = "Flip gravity to walk on walls and ceilings. Punch rivals off every surface. Last player standing wins."
GameConfig.MIN_PLAYERS = 1
GameConfig.LOBBY_WAIT = 10
GameConfig.COUNTDOWN_SECONDS = 3
GameConfig.MATCH_DURATION = 60
GameConfig.RESULT_DURATION = 8

GameConfig.CONTROLS = {
	"Q: Flip UP",
	"E: Flip DOWN",
	"F: Flip to WALL",
	"Click: Punch",
}

-- Arena
GameConfig.ARENA_SIZE = 40
GameConfig.PLATFORM_THICKNESS = 2
GameConfig.PLATFORM_SIZE = 10
GameConfig.PLATFORMS_PER_FACE = 4

-- Player
GameConfig.MAX_HP = 100
GameConfig.DEFAULT_WALK_SPEED = 18
GameConfig.DEFAULT_JUMP_POWER = 50

-- Gravity flip
GameConfig.FLIP_COOLDOWN = 2.0
GameConfig.GRAVITY_MAGNITUDE = 196.2
GameConfig.FLIP_ROTATE_TIME = 0.3

-- Punch
GameConfig.PUNCH_RANGE = 8
GameConfig.PUNCH_CONE_DOT = 0.4
GameConfig.PUNCH_DAMAGE = 15
GameConfig.PUNCH_KNOCKBACK = 65
GameConfig.PUNCH_UP_FORCE = 20
GameConfig.PUNCH_COOLDOWN = 0.6

-- Respawn
GameConfig.RESPAWN_TIME = 2.0
GameConfig.FALL_DAMAGE = 20
GameConfig.KILL_ZONE_PADDING = 8

-- Scoring
GameConfig.SCORE_KILL = 1
GameConfig.SCORE_1ST = 10
GameConfig.SCORE_2ND = 7
GameConfig.SCORE_3RD = 5
GameConfig.SCORE_OTHER = 2

-- Spectator
GameConfig.SPECTATOR_POSITION = Vector3.new(0, 60, -80)

-- Theme
GameConfig.THEME = {
	floor = Color3.fromRGB(60, 70, 90),
	ceiling = Color3.fromRGB(90, 60, 70),
	wallNorth = Color3.fromRGB(70, 90, 60),
	wallSouth = Color3.fromRGB(60, 90, 80),
	wallEast = Color3.fromRGB(80, 60, 90),
	wallWest = Color3.fromRGB(90, 80, 60),
	platform = Color3.fromRGB(120, 130, 150),
	killZone = Color3.fromRGB(255, 60, 40),
	neon = Color3.fromRGB(180, 220, 255),
}

-- Gravity direction vectors
GameConfig.GRAVITY_DIRS = {
	Down = Vector3.new(0, -1, 0),
	Up = Vector3.new(0, 1, 0),
	North = Vector3.new(0, 0, -1),
	South = Vector3.new(0, 0, 1),
	East = Vector3.new(1, 0, 0),
	West = Vector3.new(-1, 0, 0),
}

return GameConfig
