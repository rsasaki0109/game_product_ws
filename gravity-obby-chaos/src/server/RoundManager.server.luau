--[[
	RoundManager (Server) — ラウンド進行管理
	ServerScriptService に配置

	責務:
	- ロビー → カウントダウン → レース → リザルト のフロー管理
	- ステージ設定の管理
	- ゴール判定・順位計算・報酬配布
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local GravityConfig = require(ReplicatedStorage:WaitForChild("GravityConfig"))

---------------------------------------------------------------------------
-- RemoteEvents
---------------------------------------------------------------------------
local function getOrCreateRemote(name: string, className: string): Instance
	local existing = ReplicatedStorage:FindFirstChild(name)
	if existing then return existing end
	local remote = Instance.new(className)
	remote.Name = name
	remote.Parent = ReplicatedStorage
	return remote
end

local RoundStateEvent = getOrCreateRemote("RoundStateChanged", "RemoteEvent")
local CountdownEvent = getOrCreateRemote("Countdown", "RemoteEvent")
local PlayerFinishedEvent = getOrCreateRemote("PlayerFinished", "RemoteEvent")
local ResultEvent = getOrCreateRemote("RoundResult", "RemoteEvent")
local StageInfoEvent = getOrCreateRemote("StageInfoChanged", "RemoteEvent")

---------------------------------------------------------------------------
-- ステージ定義
---------------------------------------------------------------------------
local Stages = {
	{
		name = "はじめての無重力",
		difficulty = 1,
		gravityEvent = "GravityFlip",
		duration = 75,
		itemsEnabled = false,
		openingGravityDelay = 8,
		hint = "8秒後に天地反転。天井ルートへ走れ。",
	},
	{
		name = "グラビティタワー",
		difficulty = 3,
		gravityEvent = "GravityShift",
		duration = 100,
		itemsEnabled = false,
		openingGravityDelay = 12,
		hint = "壁が床になる。次の足場を先読みしろ。",
	},
	{
		name = "カオスアリーナ",
		difficulty = 5,
		gravityEvent = "GravityStorm",
		fallbackGravityEvent = "GravityShift",
		stormUnlockAfter = GravityConfig.STAGE3_STORM_UNLOCK_AFTER or 2,
		duration = 100,
		itemsEnabled = false,
		openingGravityDelay = 8,
		hint = "重力が暴れる。完走より生存優先。",
	},
}

---------------------------------------------------------------------------
-- State
---------------------------------------------------------------------------
local currentState: string = "Lobby"  -- Lobby | Countdown | Racing | Result
local currentStageIndex: number = 1
local raceStartTime: number = 0
local finishedPlayers: { { player: Player, time: number } } = {}
local isRoundActive: boolean = false
local stagePlayCounts: { [number]: number } = {}
local goalTouchedConnection: RBXScriptConnection? = nil
local startLobby: () -> ()
local startCountdown: () -> ()
local startRace: () -> ()
local endRound: () -> ()

---------------------------------------------------------------------------
-- GravityManager への参照（同じ ServerScriptService 内）
---------------------------------------------------------------------------
-- Rojo構成ではModuleScriptにするのが理想だが、
-- ここでは直接 require で参照するパターン
local GravityManager: any = nil

local function waitForGravityManager()
	-- GravityManager が ModuleScript として配置されている場合
	local gm = script.Parent:FindFirstChild("GravityManager")
	if gm then
		GravityManager = require(gm)
	end
end

task.spawn(waitForGravityManager)

---------------------------------------------------------------------------
-- ステート遷移
---------------------------------------------------------------------------
local function setState(newState: string)
	currentState = newState
	RoundStateEvent:FireAllClients(newState)
end

local function resolveGravityEvent(stageIndex: number, stage: { [string]: any }): string
	if stageIndex ~= 3 then
		return stage.gravityEvent
	end

	local played = stagePlayCounts[stageIndex] or 0
	local unlockAfter = stage.stormUnlockAfter or 2
	if played < unlockAfter then
		return stage.fallbackGravityEvent or "GravityShift"
	end

	return stage.gravityEvent
end

local function broadcastStageInfo()
	local stage = Stages[currentStageIndex]
	local gravityEvent = resolveGravityEvent(currentStageIndex, stage)

	StageInfoEvent:FireAllClients({
		stageIndex = currentStageIndex,
		name = stage.name,
		hint = stage.hint,
		duration = stage.duration,
		itemsEnabled = stage.itemsEnabled,
		gravityEvent = gravityEvent,
	})
end

---------------------------------------------------------------------------
-- スポーンポイント管理
---------------------------------------------------------------------------
local function teleportToSpawn(player: Player)
	local character = player.Character
	if not character then return end
	local hrp = character:FindFirstChild("HumanoidRootPart")
	if not hrp then return end

	-- ステージのスポーンポイントを探す（Workspaceに "SpawnPoint" パーツを配置）
	local spawnPoint = workspace:FindFirstChild("StageSpawn_" .. currentStageIndex)
	if spawnPoint then
		hrp.CFrame = spawnPoint.CFrame + Vector3.new(0, 5, 0)
	end
end

---------------------------------------------------------------------------
-- ゴール判定
---------------------------------------------------------------------------
local function setupGoalDetection()
	local goal = workspace:FindFirstChild("StageGoal_" .. currentStageIndex)
	if not goal then
		warn("[RoundManager] ゴールが見つかりません: StageGoal_" .. currentStageIndex)
		return
	end

	if goalTouchedConnection then
		goalTouchedConnection:Disconnect()
		goalTouchedConnection = nil
	end

	goalTouchedConnection = goal.Touched:Connect(function(hit)
		if not isRoundActive then return end

		local character = hit.Parent
		if not character then return end
		local player = Players:GetPlayerFromCharacter(character)
		if not player then return end

		-- 既にゴール済みか確認
		for _, entry in finishedPlayers do
			if entry.player == player then return end
		end

		local finishTime = tick() - raceStartTime
		local rank = #finishedPlayers + 1
		table.insert(finishedPlayers, { player = player, time = finishTime })

		-- 報酬計算
		local coins = 10  -- ベース
		if rank == 1 then coins = 100
		elseif rank == 2 then coins = 70
		elseif rank == 3 then coins = 50
		else coins = 30 end

		PlayerFinishedEvent:FireAllClients(player.Name, rank, finishTime)

		-- 全員ゴールしたらラウンド終了
		if #finishedPlayers >= #Players:GetPlayers() then
			endRound()
		end
	end)
end

---------------------------------------------------------------------------
-- ラウンド制御
---------------------------------------------------------------------------
startLobby = function()
	setState("Lobby")
	finishedPlayers = {}
	isRoundActive = false

	-- 最低プレイヤー数を待つ（ソロでもテスト可能にするため1人）
	while #Players:GetPlayers() < 1 do
		task.wait(1)
	end

	-- MVPは初速重視でロビー待機を短めにする
	task.wait(6)

	startCountdown()
end

startCountdown = function()
	setState("Countdown")
	broadcastStageInfo()

	-- 全員をスポーンに移動
	for _, player in Players:GetPlayers() do
		teleportToSpawn(player)
	end

	-- 3, 2, 1 カウントダウン
	for i = 3, 1, -1 do
		CountdownEvent:FireAllClients(i)
		task.wait(1)
	end

	startRace()
end

startRace = function()
	setState("Racing")
	isRoundActive = true
	raceStartTime = tick()

	local stage = Stages[currentStageIndex]
	local gravityEvent = resolveGravityEvent(currentStageIndex, stage)

	-- ゴール判定セットアップ
	setupGoalDetection()

	-- 重力マネージャーを起動
	if GravityManager then
		GravityManager:Start(gravityEvent, {
			firstEventDelay = stage.openingGravityDelay,
		})
	end

	-- 制限時間
	task.delay(stage.duration, function()
		if isRoundActive then
			endRound()
		end
	end)

	-- Zero-G イベント（Stage 2以降で1回発生）
	if stage.difficulty >= 3 and GravityManager then
		task.delay(stage.duration * 0.5, function()
			if isRoundActive then
				GravityManager:TriggerZeroG()
			end
		end)
	end
end

endRound = function()
	isRoundActive = false
	stagePlayCounts[currentStageIndex] = (stagePlayCounts[currentStageIndex] or 0) + 1

	-- 重力マネージャーを停止
	if GravityManager then
		GravityManager:Stop()
	end

	setState("Result")

	-- 未ゴールのプレイヤーを追加
	for _, player in Players:GetPlayers() do
		local found = false
		for _, entry in finishedPlayers do
			if entry.player == player then found = true; break end
		end
		if not found then
			table.insert(finishedPlayers, {
				player = player,
				time = -1, -- 未完走
			})
		end
	end

	-- 結果を送信
	local results = {}
	for rank, entry in finishedPlayers do
		local coins = 10
		if rank == 1 then coins = 100
		elseif rank == 2 then coins = 70
		elseif rank == 3 then coins = 50
		elseif entry.time > 0 then coins = 30 end

		table.insert(results, {
			name = entry.player.Name,
			rank = rank,
			time = entry.time,
			coins = coins,
		})
	end
	ResultEvent:FireAllClients(results)

	-- リザルト表示時間
	task.wait(7)

	-- 次のステージ or ループ
	currentStageIndex = (currentStageIndex % #Stages) + 1
	startLobby()
end

---------------------------------------------------------------------------
-- 起動
---------------------------------------------------------------------------
task.spawn(startLobby)
