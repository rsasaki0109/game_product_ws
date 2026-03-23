local GameConfig = {}

GameConfig.TITLE = "Echo Tag"
GameConfig.HOOK = "Total darkness. Send sonar pulses to reveal the world. Find and tag hiders before time runs out."
GameConfig.MIN_PLAYERS = 1
GameConfig.LOBBY_WAIT = 10
GameConfig.COUNTDOWN_SECONDS = 3
GameConfig.MATCH_DURATION = 90
GameConfig.RESULT_DURATION = 8
GameConfig.MAX_PLAYERS = 8

GameConfig.CONTROLS = {
	"Q: Echo Pulse",
	"E: Decoy Echo (hiders)",
	"F: Sprint",
}

-- Arena
GameConfig.ARENA_WIDTH = 60
GameConfig.ARENA_LENGTH = 60
GameConfig.ARENA_HEIGHT = 16
GameConfig.PILLAR_COUNT = 12
GameConfig.WALL_COUNT = 6

-- Darkness
GameConfig.AMBIENT_BRIGHTNESS = 0.02
GameConfig.AMBIENT_COLOR = Color3.fromRGB(5, 5, 12)
GameConfig.CLOCK_TIME = 0

-- Echo Pulse
GameConfig.ECHO_RANGE = 30
GameConfig.ECHO_EXPAND_SPEED = 40
GameConfig.ECHO_REVEAL_DURATION = 2.0
GameConfig.ECHO_COOLDOWN = 4.0
GameConfig.ECHO_SPHERE_COLOR = Color3.fromRGB(60, 180, 255)
GameConfig.ECHO_TRANSPARENCY_START = 0.5
GameConfig.ECHO_TRANSPARENCY_END = 0.95
GameConfig.ECHO_REVEAL_LIGHT_BRIGHTNESS = 1.2
GameConfig.ECHO_REVEAL_LIGHT_RANGE = 12

-- Decoy Echo (hiders only)
GameConfig.DECOY_DELAY = 2.0
GameConfig.DECOY_COOLDOWN = 8.0
GameConfig.DECOY_RANGE = 25
GameConfig.DECOY_COLOR = Color3.fromRGB(255, 180, 60)

-- Sprint
GameConfig.SPRINT_SPEED_MULTIPLIER = 1.5
GameConfig.SPRINT_DURATION = 2.0
GameConfig.SPRINT_COOLDOWN = 6.0
GameConfig.DEFAULT_WALK_SPEED = 16

-- Tagger
GameConfig.TAGGER_GLOW_COLOR = Color3.fromRGB(255, 40, 40)
GameConfig.TAGGER_GLOW_BRIGHTNESS = 0.4
GameConfig.TAGGER_GLOW_RANGE = 6
GameConfig.TAG_IMMUNITY_TIME = 2.0
GameConfig.TAGGER_SPEED_BONUS = 2

-- Scoring
GameConfig.SCORE_SURVIVOR = 10
GameConfig.SCORE_LAST_HIDER = 5
GameConfig.SCORE_TAG = 3
GameConfig.SCORE_DECOY_USED = 1

-- Theme colors
GameConfig.THEME = {
	floor = Color3.fromRGB(15, 15, 20),
	wall = Color3.fromRGB(20, 20, 30),
	ceiling = Color3.fromRGB(10, 10, 15),
	pillar = Color3.fromRGB(30, 30, 45),
	hideWall = Color3.fromRGB(25, 25, 40),
	spawn = Color3.fromRGB(40, 80, 120),
	taggerSpawn = Color3.fromRGB(120, 30, 30),
}

return GameConfig
