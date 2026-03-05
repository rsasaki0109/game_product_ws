--[[
	GravityManager (Server) — 重力システムの中枢
	ServerScriptService に配置

	責務:
	- グローバル重力イベントのスケジューリング
	- プレイヤーごとの重力状態管理
	- クライアントへの重力変更通知
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local GravityConfig = require(ReplicatedStorage:WaitForChild("GravityConfig"))

---------------------------------------------------------------------------
-- RemoteEvents の作成
---------------------------------------------------------------------------
local function createRemote(name: string, className: string): Instance
	local existing = ReplicatedStorage:FindFirstChild(name)
	if existing and existing:IsA(className) then
		return existing
	end
	if existing then
		existing:Destroy()
	end

	local remote = Instance.new(className)
	remote.Name = name
	remote.Parent = ReplicatedStorage
	return remote
end

-- グローバル重力変更を全クライアントに通知
local GravityChangedEvent = createRemote("GravityChanged", "RemoteEvent")
-- 重力変更の警告を全クライアントに通知
local GravityWarningEvent = createRemote("GravityWarning", "RemoteEvent")
-- 個別プレイヤーの重力変更
local PlayerGravityEvent = createRemote("PlayerGravityChanged", "RemoteEvent")
-- Zero-G イベント
local ZeroGEvent = createRemote("ZeroGravity", "RemoteEvent")
-- プレイヤー操作による重力切り替え要求
local RequestPlayerGravityShiftEvent = createRemote("RequestPlayerGravityShift", "RemoteEvent")

---------------------------------------------------------------------------
-- State
---------------------------------------------------------------------------
local currentDirection: string = "Down"
local isRunning: boolean = false
local playerStates: { [Player]: { direction: string, isAnchored: boolean } } = {}
local lastShiftRequestAt: { [Player]: number } = {}

---------------------------------------------------------------------------
-- Utility
---------------------------------------------------------------------------
local function getRandomDirection(exclude: string?): string
	local names = GravityConfig.DirectionNames
	local choice: string
	repeat
		choice = names[math.random(1, #names)]
	until choice ~= exclude
	return choice
end

local function getOppositeDirection(dir: string): string
	local opposites = {
		Down = "Up", Up = "Down",
		North = "South", South = "North",
		East = "West", West = "East",
	}
	return opposites[dir] or "Down"
end

local function getPerpendicularDirection(dir: string): string
	local perp = {
		Down = { "North", "South", "East", "West" },
		Up = { "North", "South", "East", "West" },
		North = { "Down", "Up", "East", "West" },
		South = { "Down", "Up", "East", "West" },
		East = { "Down", "Up", "North", "South" },
		West = { "Down", "Up", "North", "South" },
	}
	local options = perp[dir] or { "Down" }
	return options[math.random(1, #options)]
end

---------------------------------------------------------------------------
-- 重力の適用
---------------------------------------------------------------------------
local function applyGravityToPlayer(player: Player, direction: string)
	local character = player.Character
	if not character then return end

	local hrp = character:FindFirstChild("HumanoidRootPart")
	if not hrp then return end

	local gravityVec = GravityConfig.Directions[direction]
	if not gravityVec then return end

	-- 既存の VectorForce を取得 or 作成
	local attachment = hrp:FindFirstChild("GravityAttachment")
	if not attachment then
		attachment = Instance.new("Attachment")
		attachment.Name = "GravityAttachment"
		attachment.Parent = hrp
	end

	local vf = hrp:FindFirstChild("GravityForce")
	if not vf then
		vf = Instance.new("VectorForce")
		vf.Name = "GravityForce"
		vf.ApplyAtCenterOfMass = true
		vf.RelativeTo = Enum.ActuationType.World
		vf.Attachment0 = attachment
		vf.Parent = hrp
	end

	-- デフォルト重力を打ち消し + 新しい方向の重力を適用
	local mass = 0
	for _, part in character:GetDescendants() do
		if part:IsA("BasePart") then
			mass += part:GetMass()
		end
	end

	local defaultGravityForce = Vector3.new(0, -1, 0) * GravityConfig.GRAVITY_MAGNITUDE * mass
	local newGravityForce = gravityVec * GravityConfig.GRAVITY_MAGNITUDE * mass

	-- デフォルトを打ち消して新しい方向に引っ張る
	vf.Force = -defaultGravityForce + newGravityForce

	-- AlignOrientation でキャラの上方向を合わせる
	local ao = hrp:FindFirstChild("GravityAlign")
	if not ao then
		ao = Instance.new("AlignOrientation")
		ao.Name = "GravityAlign"
		ao.Mode = Enum.OrientationAlignmentMode.OneAttachment
		ao.Attachment0 = attachment
		ao.RigidityEnabled = false
		ao.Responsiveness = 15
		ao.Parent = hrp
	end

	-- 重力方向に合わせた回転を計算
	local upVector = -gravityVec  -- 重力と逆が「上」
	local lookVector = Vector3.new(0, 0, -1)
	if math.abs(upVector:Dot(lookVector)) > 0.99 then
		lookVector = Vector3.new(1, 0, 0)
	end
	local rightVector = lookVector:Cross(upVector).Unit
	lookVector = upVector:Cross(rightVector).Unit

	ao.CFrame = CFrame.fromMatrix(Vector3.zero, rightVector, upVector, -lookVector)
end

local function setGlobalGravity(direction: string)
	currentDirection = direction

	for player, state in playerStates do
		if not state.isAnchored then
			state.direction = direction
			applyGravityToPlayer(player, direction)
		end
	end

	-- 全クライアントに通知
	GravityChangedEvent:FireAllClients(direction)
end

local function canPlayerRequestShift(player: Player): boolean
	local cooldown = GravityConfig.PLAYER_SHIFT_COOLDOWN or 4
	local lastAt = lastShiftRequestAt[player] or 0
	return (tick() - lastAt) >= cooldown
end

local function handlePlayerShiftRequest(player: Player)
	if not isRunning then return end

	local state = playerStates[player]
	if not state or state.isAnchored then return end
	if not canPlayerRequestShift(player) then return end

	local baseDirection = state.direction
	if baseDirection == "ZeroG" or not GravityConfig.Directions[baseDirection] then
		baseDirection = currentDirection
	end

	local nextDirection = getOppositeDirection(baseDirection)
	state.direction = nextDirection
	lastShiftRequestAt[player] = tick()

	applyGravityToPlayer(player, nextDirection)
	PlayerGravityEvent:FireClient(player, nextDirection)
end

---------------------------------------------------------------------------
-- 重力イベント
---------------------------------------------------------------------------
function startGravityFlipLoop(firstEventDelay: number?)
	local config = GravityConfig.Events.GravityFlip
	local firstCycle = true
	while isRunning do
		local interval = if firstCycle and firstEventDelay
			then firstEventDelay
			else math.random(config.interval.min, config.interval.max)
		interval = math.max(GravityConfig.WARNING_TIME + 1, interval)
		firstCycle = false

		-- 警告
		task.wait(interval - GravityConfig.WARNING_TIME)
		if not isRunning then break end
		GravityWarningEvent:FireAllClients("GravityFlip", GravityConfig.WARNING_TIME)

		task.wait(GravityConfig.WARNING_TIME)
		if not isRunning then break end

		-- 反転
		local newDir = getOppositeDirection(currentDirection)
		setGlobalGravity(newDir)
	end
end

function startGravityShiftLoop(firstEventDelay: number?)
	local config = GravityConfig.Events.GravityShift
	local firstCycle = true
	while isRunning do
		local interval = if firstCycle and firstEventDelay
			then firstEventDelay
			else math.random(config.interval.min, config.interval.max)
		interval = math.max(GravityConfig.WARNING_TIME + 1, interval)
		firstCycle = false

		task.wait(interval - GravityConfig.WARNING_TIME)
		if not isRunning then break end
		GravityWarningEvent:FireAllClients("GravityShift", GravityConfig.WARNING_TIME)

		task.wait(GravityConfig.WARNING_TIME)
		if not isRunning then break end

		-- 90° 回転
		local newDir = getPerpendicularDirection(currentDirection)
		setGlobalGravity(newDir)
	end
end

function startGravityStormLoop(firstEventDelay: number?)
	local config = GravityConfig.Events.GravityStorm
	if firstEventDelay and firstEventDelay > 0 then
		task.wait(firstEventDelay)
		if not isRunning then return end
	end

	while isRunning do
		local interval = config.interval.min
			+ math.random() * (config.interval.max - config.interval.min)

		task.wait(interval)
		if not isRunning then break end

		local newDir = getRandomDirection(currentDirection)
		setGlobalGravity(newDir)
	end
end

function triggerZeroG()
	local config = GravityConfig.Events.ZeroG
	ZeroGEvent:FireAllClients(true)

	for player, state in playerStates do
		state.direction = "ZeroG"
		local character = player.Character
		if not character then continue end
		local hrp = character:FindFirstChild("HumanoidRootPart")
		if not hrp then continue end
		local vf = hrp:FindFirstChild("GravityForce")
		if vf then
			-- デフォルト重力を打ち消すだけ（浮遊状態）
			local mass = 0
			for _, part in character:GetDescendants() do
				if part:IsA("BasePart") then mass += part:GetMass() end
			end
			vf.Force = Vector3.new(0, 1, 0) * GravityConfig.GRAVITY_MAGNITUDE * mass
		end
	end

	task.wait(config.duration)

	-- 元に戻す
	ZeroGEvent:FireAllClients(false)
	setGlobalGravity(currentDirection)
end

---------------------------------------------------------------------------
-- Public API（RoundManager から呼ばれる）
---------------------------------------------------------------------------
local GravityManager = {}

function GravityManager:Start(eventType: string, options: { firstEventDelay: number? }?)
	isRunning = true
	currentDirection = "Down"
	local firstEventDelay = if options then options.firstEventDelay else nil

	for _, player in Players:GetPlayers() do
		if not playerStates[player] then
			playerStates[player] = {
				direction = currentDirection,
				isAnchored = false,
			}
		end
		if not lastShiftRequestAt[player] then
			lastShiftRequestAt[player] = 0
		end
	end

	setGlobalGravity("Down")

	if eventType == "GravityFlip" then
		task.spawn(startGravityFlipLoop, firstEventDelay)
	elseif eventType == "GravityShift" then
		task.spawn(startGravityShiftLoop, firstEventDelay)
	elseif eventType == "GravityStorm" then
		task.spawn(startGravityStormLoop, firstEventDelay)
	end
end

function GravityManager:Stop()
	isRunning = false
	-- 全員の重力をデフォルトに戻す
	setGlobalGravity("Down")

	-- VectorForce/AlignOrientation を除去
	for player, _ in playerStates do
		local character = player.Character
		if not character then continue end
		local hrp = character:FindFirstChild("HumanoidRootPart")
		if not hrp then continue end
		local vf = hrp:FindFirstChild("GravityForce")
		if vf then vf:Destroy() end
		local ao = hrp:FindFirstChild("GravityAlign")
		if ao then ao:Destroy() end
		local att = hrp:FindFirstChild("GravityAttachment")
		if att then att:Destroy() end
		playerStates[player] = {
			direction = "Down",
			isAnchored = false,
		}
		lastShiftRequestAt[player] = 0
	end
end

function GravityManager:TriggerZeroG()
	task.spawn(triggerZeroG)
end

function GravityManager:SetPlayerGravity(player: Player, direction: string)
	local state = playerStates[player]
	if state then
		state.direction = direction
		applyGravityToPlayer(player, direction)
		PlayerGravityEvent:FireClient(player, direction)
	end
end

function GravityManager:SetPlayerAnchored(player: Player, anchored: boolean)
	local state = playerStates[player]
	if state then
		state.isAnchored = anchored
	end
end

function GravityManager:GetCurrentDirection(): string
	return currentDirection
end

---------------------------------------------------------------------------
-- プレイヤー接続管理
---------------------------------------------------------------------------
RequestPlayerGravityShiftEvent.OnServerEvent:Connect(handlePlayerShiftRequest)

local function registerPlayer(player: Player)
	playerStates[player] = {
		direction = currentDirection,
		isAnchored = false,
	}
	lastShiftRequestAt[player] = 0

	player.CharacterAdded:Connect(function()
		-- キャラ生成時に現在の重力を適用
		task.wait(0.5) -- 物理安定待ち
		if isRunning and playerStates[player] then
			applyGravityToPlayer(player, playerStates[player].direction)
		end
	end)
end

Players.PlayerAdded:Connect(registerPlayer)
for _, player in Players:GetPlayers() do
	registerPlayer(player)
end

Players.PlayerRemoving:Connect(function(player)
	playerStates[player] = nil
	lastShiftRequestAt[player] = nil
end)

return GravityManager
