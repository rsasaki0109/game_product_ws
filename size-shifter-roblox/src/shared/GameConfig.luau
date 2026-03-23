-- GameConfig
-- Size Shifter shared configuration

local GameConfig = {}

-- Match progression
GameConfig.MIN_PLAYERS = 1
GameConfig.LOBBY_WAIT = 10
GameConfig.COUNTDOWN_SECONDS = 3
GameConfig.MATCH_DURATION = 90
GameConfig.RESULT_DURATION = 8
GameConfig.MAX_LIVES = 3

-- Arena
GameConfig.ARENA_WIDTH = 80
GameConfig.ARENA_LENGTH = 80
GameConfig.WALL_HEIGHT = 20

-- Size configs
GameConfig.Sizes = {
	tiny = {
		scale = 0.3,
		hp = 30,
		damage = 5,
		speed = 28,
		punchRange = 4,
		jumpPower = 70,
	},
	normal = {
		scale = 1.0,
		hp = 80,
		damage = 15,
		speed = 16,
		punchRange = 7,
		jumpPower = 50,
	},
	giant = {
		scale = 3.0,
		hp = 200,
		damage = 30,
		speed = 10,
		punchRange = 14,
		jumpPower = 35,
	},
}

-- Abilities
GameConfig.PUNCH_COOLDOWN = 1
GameConfig.STOMP_COOLDOWN = 4
GameConfig.STOMP_RANGE = 12
GameConfig.STOMP_DAMAGE = 20
GameConfig.DASH_COOLDOWN = 3
GameConfig.DASH_FORCE = 80
GameConfig.SIZE_TRANSITION_TIME = 0.5

-- Player defaults
GameConfig.DEFAULT_WALK_SPEED = 16
GameConfig.DEFAULT_JUMP_POWER = 50

return GameConfig
