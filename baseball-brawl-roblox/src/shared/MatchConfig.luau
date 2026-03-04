-- MatchConfig
-- サーバー/クライアント共通で使う設定値

local MatchConfig = {}

-- 基本進行
MatchConfig.MIN_PLAYERS = 1
MatchConfig.LOBBY_WAIT = 10
MatchConfig.COUNTDOWN_SECONDS = 3
MatchConfig.MATCH_DURATION = 100
MatchConfig.RESULT_DURATION = 8
MatchConfig.MAX_SCORE = 7
MatchConfig.SCORE_COOLDOWN = 1.25
MatchConfig.KICKOFF_FREEZE = 1.0

-- プレイヤー制御
MatchConfig.DEFAULT_WALK_SPEED = 16
MatchConfig.DEFAULT_JUMP_POWER = 50
MatchConfig.STUN_WALK_SPEED = 6
MatchConfig.STUN_JUMP_POWER = 0

-- スイング
MatchConfig.SWING_COOLDOWN = 0.55
MatchConfig.SWING_RANGE = 12
MatchConfig.SWING_CONE_DOT = 0.35
MatchConfig.SWING_KNOCKBACK = 95
MatchConfig.SWING_UP_FORCE = 36
MatchConfig.SWING_STUN = 0.45
MatchConfig.SWING_LUNGE = 24

-- ダッシュ
MatchConfig.DASH_COOLDOWN = 3.0
MatchConfig.DASH_FORCE = 120
MatchConfig.DASH_UP_FORCE = 22
MatchConfig.DASH_HIT_RANGE = 7
MatchConfig.DASH_HIT_STUN = 0.35

-- ボール
MatchConfig.BALL_RADIUS = 2.2
MatchConfig.BALL_HIT_RANGE = 15
MatchConfig.BALL_HIT_DOT = 0.15
MatchConfig.BALL_HIT_FORCE = 145
MatchConfig.BALL_LIFT_FORCE = 46
MatchConfig.BALL_SPREAD = 12
MatchConfig.BALL_RESET_HEIGHT = -25
MatchConfig.BALL_RESET_BOUNDS_PADDING = 24
MatchConfig.MONSTER_SHOT_SPEED = 150

-- カオス演出
MatchConfig.CHAOS_PULSE_INTERVAL = 14
MatchConfig.CHAOS_PULSE_JITTER = 3
MatchConfig.CHAOS_PULSE_RADIUS = 52
MatchConfig.CHAOS_PULSE_FORCE = 115
MatchConfig.CHAOS_PULSE_UP_FORCE = 44
MatchConfig.CHAOS_PULSE_STUN = 0.35
MatchConfig.CHAOS_BALL_FORCE = 230

MatchConfig.Teams = {
	Red = {
		spawnName = "Spawn_Red",
		goalSensor = "GoalSensor_Blue",
		color = Color3.fromRGB(235, 79, 79),
	},
	Blue = {
		spawnName = "Spawn_Blue",
		goalSensor = "GoalSensor_Red",
		color = Color3.fromRGB(90, 145, 255),
	},
}

MatchConfig.Arena = {
	width = 180,
	length = 120,
	wallHeight = 18,
	spawnOffsetX = 42,
	goalDepth = 6,
	goalWidth = 32,
	goalHeight = 10,
}

return MatchConfig
