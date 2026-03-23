-- Boot
-- Magnet Wars server entry point: round state machine

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local GameConfig = require(ReplicatedStorage:WaitForChild("GameConfig"))
local ArenaBuilder = require(script.Parent:WaitForChild("ArenaBuilder"))

local function getOrCreateRemote(name: string, className: string): Instance
	local existing = ReplicatedStorage:FindFirstChild(name)
	if existing then
		return existing
	end
	local remote = Instance.new(className)
	remote.Name = name
	remote.Parent = ReplicatedStorage
	return remote
end

-- Pre-create all RemoteEvents so client can WaitForChild them
getOrCreateRemote("MatchStateChanged", "RemoteEvent")
getOrCreateRemote("MatchCountdown", "RemoteEvent")
getOrCreateRemote("PlayFeed", "RemoteEvent")
getOrCreateRemote("PoleSwitch", "RemoteEvent")
getOrCreateRemote("PulseRequest", "RemoteEvent")
getOrCreateRemote("PulseEffect", "RemoteEvent")
getOrCreateRemote("PlayerEliminated", "RemoteEvent")
getOrCreateRemote("ArenaShrinkWarn", "RemoteEvent")
getOrCreateRemote("PlayerCountChanged", "RemoteEvent")
getOrCreateRemote("ActionCooldown", "RemoteEvent")

-- Build arena on start
ArenaBuilder.ensureArena(GameConfig)

print("[MagnetWars] Boot complete. Arena built. MatchManager will handle rounds.")
