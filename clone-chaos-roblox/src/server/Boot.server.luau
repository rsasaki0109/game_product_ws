-- Boot
-- Clone Chaos server entry point: round state machine

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
getOrCreateRemote("SpawnCloneRequest", "RemoteEvent")
getOrCreateRemote("RecallClonesRequest", "RemoteEvent")
getOrCreateRemote("MarkRequest", "RemoteEvent")
getOrCreateRemote("DisguiseRequest", "RemoteEvent")
getOrCreateRemote("PunchRequest", "RemoteEvent")
getOrCreateRemote("ActionCooldown", "RemoteEvent")
getOrCreateRemote("PlayerStatsChanged", "RemoteEvent")
getOrCreateRemote("KillFeed", "RemoteEvent")
getOrCreateRemote("CloneCountChanged", "RemoteEvent")
getOrCreateRemote("DisguiseEffect", "RemoteEvent")

-- Build arena on start
ArenaBuilder.ensureArena(GameConfig)

print("[CloneChaos] Boot complete. Arena built. MatchManager will handle rounds.")
