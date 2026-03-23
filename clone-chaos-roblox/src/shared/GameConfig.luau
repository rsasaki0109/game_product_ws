-- GameConfig
-- Clone Chaos shared configuration

local GameConfig = {}

-- Match progression
GameConfig.MIN_PLAYERS = 1
GameConfig.LOBBY_WAIT = 10
GameConfig.COUNTDOWN_SECONDS = 3
GameConfig.MATCH_DURATION = 90
GameConfig.RESULT_DURATION = 8

-- Arena
GameConfig.ARENA_WIDTH = 60
GameConfig.ARENA_LENGTH = 60
GameConfig.WALL_HEIGHT = 12
GameConfig.ROOM_SIZE = 15

-- Player
GameConfig.PLAYER_HP = 100
GameConfig.PLAYER_DAMAGE = 12
GameConfig.PUNCH_COOLDOWN = 1
GameConfig.PUNCH_RANGE = 7
GameConfig.DEFAULT_WALK_SPEED = 16
GameConfig.DEFAULT_JUMP_POWER = 50

-- Clones
GameConfig.MAX_CLONES = 3
GameConfig.CLONE_HP = 40
GameConfig.CLONE_DAMAGE = 8
GameConfig.CLONE_SPAWN_COOLDOWN = 6
GameConfig.CLONE_CHASE_RANGE = 20
GameConfig.CLONE_ATTACK_RANGE = 5
GameConfig.CLONE_SPEED = 14

-- Abilities
GameConfig.RECALL_COOLDOWN = 10
GameConfig.MARK_COOLDOWN = 2
GameConfig.DISGUISE_COOLDOWN = 12

-- Scoring
GameConfig.POINTS_REAL_KILL = 3
GameConfig.POINTS_CLONE_KILL = 1

return GameConfig
