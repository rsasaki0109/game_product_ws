-- GameConfig
-- Magnet Wars shared configuration

local GameConfig = {}

-- Match progression
GameConfig.MIN_PLAYERS = 1
GameConfig.LOBBY_WAIT = 10
GameConfig.COUNTDOWN_SECONDS = 3
GameConfig.MATCH_DURATION = 60
GameConfig.RESULT_DURATION = 8

-- Arena
GameConfig.ARENA_RADIUS = 50
GameConfig.ARENA_SHRINK_INTERVAL = 20
GameConfig.ARENA_SHRINK_AMOUNT = 8
GameConfig.ARENA_HEIGHT = 3
GameConfig.ELIMINATION_Y = -10

-- Magnetic forces
GameConfig.MAGNET_RANGE = 15
GameConfig.REPEL_FORCE = 800
GameConfig.ATTRACT_FORCE = 600

-- Pulse ability
GameConfig.PULSE_COOLDOWN = 3
GameConfig.PULSE_RANGE = 20
GameConfig.PULSE_FORCE = 60

-- Player defaults
GameConfig.DEFAULT_WALK_SPEED = 16
GameConfig.DEFAULT_JUMP_POWER = 50

return GameConfig
