local GameConfig = {}

GameConfig.TITLE = "Hot Air Havoc"
GameConfig.HOOK = "Manage altitude, steal wind lanes, and stay airborne longer than everyone else."
GameConfig.MIN_PLAYERS = 1
GameConfig.LOBBY_WAIT = 8
GameConfig.COUNTDOWN_SECONDS = 3
GameConfig.MATCH_DURATION = 90
GameConfig.RESULT_DURATION = 8

GameConfig.THEME = {
	sky = Color3.fromRGB(112, 176, 255),
	dock = Color3.fromRGB(89, 62, 46),
	wind = Color3.fromRGB(255, 208, 109),
	storm = Color3.fromRGB(255, 114, 91),
	balloon = Color3.fromRGB(255, 88, 60),
	fuel = Color3.fromRGB(255, 232, 138),
}

GameConfig.CONTROLS = {
	"Q: Burn",
	"E: Vent",
	"F: Boost",
}

-- Physics
GameConfig.GRAVITY_VELOCITY = -3
GameConfig.BURN_VELOCITY = 15
GameConfig.BURN_FUEL_RATE = 8
GameConfig.VENT_VELOCITY = -10
GameConfig.MAX_ALTITUDE = 90
GameConfig.ELIMINATION_Y = 5
GameConfig.MAX_FUEL = 100
GameConfig.STARTING_FUEL = 100

-- Wind layers
GameConfig.WIND_LAYERS = { 34, 52, 70 }
GameConfig.WIND_RANGE = 6
GameConfig.WIND_BOOST_X = 12

-- Fuel pickups
GameConfig.FUEL_RESTORE = 25
GameConfig.FUEL_RESPAWN_TIME = 8

-- Boost
GameConfig.BOOST_FUEL_COST = 20
GameConfig.BOOST_VELOCITY = 25
GameConfig.BOOST_DURATION = 0.5
GameConfig.BOOST_COOLDOWN = 4

-- Scoring
GameConfig.SCORE_1ST = 10
GameConfig.SCORE_2ND = 7
GameConfig.SCORE_3RD = 5
GameConfig.SCORE_OTHER = 2

-- Spectator
GameConfig.SPECTATOR_POSITION = Vector3.new(0, 50, -120)

-- Balloon rig
GameConfig.BALLOON_SIZE = Vector3.new(8, 8, 8)
GameConfig.BALLOON_OFFSET = Vector3.new(0, 7, 0)
GameConfig.ROPE_LENGTH = 6

return GameConfig
