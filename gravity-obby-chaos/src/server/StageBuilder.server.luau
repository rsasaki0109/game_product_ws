--[[
	StageBuilder (Server) — Obbyステージの自動生成
	ServerScriptService に配置

	テスト用に、コードからステージのパーツを生成する。
	本番ではRoblox Studioで手作りのステージに置き換える想定。
]]

local Workspace = game:GetService("Workspace")

---------------------------------------------------------------------------
-- ヘルパー
---------------------------------------------------------------------------
local function createPart(props: { [string]: any }): BasePart
	local part = Instance.new("Part")
	part.Anchored = true
	part.CanCollide = true
	for key, value in props do
		(part :: any)[key] = value
	end
	part.Parent = Workspace
	return part
end

local function createSpawnPoint(name: string, position: Vector3)
	local spawn = Instance.new("SpawnLocation")
	spawn.Name = name
	spawn.Anchored = true
	spawn.CanCollide = true
	spawn.Size = Vector3.new(12, 1, 12)
	spawn.Position = position
	spawn.Material = Enum.Material.Neon
	spawn.Color = Color3.fromRGB(0, 200, 100)
	spawn.Transparency = 0.3
	spawn.Parent = Workspace
	return spawn
end

local function createGoal(name: string, position: Vector3, size: Vector3)
	local goal = Instance.new("Part")
	goal.Name = name
	goal.Anchored = true
	goal.CanCollide = false -- すり抜ける（Touched判定のみ）
	goal.Size = size
	goal.Position = position
	goal.Material = Enum.Material.ForceField
	goal.Color = Color3.fromRGB(255, 220, 50)
	goal.Transparency = 0.5
	goal.Parent = Workspace
	return goal
end

local function createKillZone(position: Vector3, size: Vector3)
	local kill = Instance.new("Part")
	kill.Name = "KillZone"
	kill.Anchored = true
	kill.CanCollide = false
	kill.Size = size
	kill.Position = position
	kill.Transparency = 1
	kill.Parent = Workspace

	kill.Touched:Connect(function(hit)
		local character = hit.Parent
		if not character then return end
		local humanoid = character:FindFirstChildOfClass("Humanoid")
		if humanoid then
			humanoid.Health = 0
		end
	end)

	return kill
end

---------------------------------------------------------------------------
-- Stage 1: 「はじめての無重力」
---------------------------------------------------------------------------
local function buildStage1()
	local stageFolder = Instance.new("Folder")
	stageFolder.Name = "Stage_1"
	stageFolder.Parent = Workspace

	-- スポーンポイント
	createSpawnPoint("StageSpawn_1", Vector3.new(0, 5, 0))

	-- === 通常Obbyセクション（床 → ジャンプ台） ===
	-- 床のプラットフォーム
	local platforms = {
		{ pos = Vector3.new(0, 3, 0),    size = Vector3.new(14, 2, 14), color = Color3.fromRGB(80, 80, 100) },
		{ pos = Vector3.new(0, 3, -20),  size = Vector3.new(8, 2, 8),   color = Color3.fromRGB(60, 60, 90) },
		{ pos = Vector3.new(10, 3, -35), size = Vector3.new(6, 2, 6),   color = Color3.fromRGB(60, 60, 90) },
		{ pos = Vector3.new(-5, 3, -50), size = Vector3.new(6, 2, 6),   color = Color3.fromRGB(60, 60, 90) },
		{ pos = Vector3.new(5, 3, -65),  size = Vector3.new(8, 2, 8),   color = Color3.fromRGB(60, 60, 90) },
		-- 中間地点（ここで重力反転が起きる）
		{ pos = Vector3.new(0, 3, -85),  size = Vector3.new(14, 2, 14), color = Color3.fromRGB(100, 50, 150) },
	}

	for i, p in platforms do
		local part = createPart({
			Name = "Platform_" .. i,
			Position = p.pos,
			Size = p.size,
			Color = p.color,
			Material = Enum.Material.SmoothPlastic,
		})
		part.Parent = stageFolder
	end

	-- === 天井セクション（重力反転後に歩くエリア）===
	-- 天井の高さ = Y:40
	local ceilingHeight = 40
	local ceilingPlatforms = {
		{ pos = Vector3.new(0, ceilingHeight, -85),   size = Vector3.new(14, 2, 14), color = Color3.fromRGB(150, 50, 100) },
		{ pos = Vector3.new(-10, ceilingHeight, -100), size = Vector3.new(6, 2, 6),  color = Color3.fromRGB(130, 40, 90) },
		{ pos = Vector3.new(5, ceilingHeight, -115),  size = Vector3.new(6, 2, 6),   color = Color3.fromRGB(130, 40, 90) },
		{ pos = Vector3.new(-5, ceilingHeight, -130), size = Vector3.new(8, 2, 8),   color = Color3.fromRGB(130, 40, 90) },
		{ pos = Vector3.new(0, ceilingHeight, -150),  size = Vector3.new(14, 2, 14), color = Color3.fromRGB(100, 50, 150) },
	}

	for i, p in ceilingPlatforms do
		local part = createPart({
			Name = "CeilingPlatform_" .. i,
			Position = p.pos,
			Size = p.size,
			Color = p.color,
			Material = Enum.Material.SmoothPlastic,
		})
		part.Parent = stageFolder
	end

	-- 天井（囲い）— 反転前のジャンプで頭をぶつけないよう高めに
	createPart({
		Name = "Ceiling",
		Position = Vector3.new(0, ceilingHeight + 2, -85),
		Size = Vector3.new(200, 2, 200),
		Color = Color3.fromRGB(30, 30, 50),
		Material = Enum.Material.SmoothPlastic,
		Transparency = 0.8,
	}).Parent = stageFolder

	-- ゴール
	createGoal("StageGoal_1", Vector3.new(0, ceilingHeight + 5, -150), Vector3.new(14, 10, 2))

	-- キルゾーン（落下死）
	createKillZone(Vector3.new(0, -50, -75), Vector3.new(500, 2, 500))

	-- 装飾: ステージ名の看板
	local sign = createPart({
		Name = "StageSign",
		Position = Vector3.new(0, 10, 5),
		Size = Vector3.new(12, 4, 0.5),
		Color = Color3.fromRGB(20, 20, 40),
		Material = Enum.Material.SmoothPlastic,
	})
	sign.Parent = stageFolder

	local surfaceGui = Instance.new("SurfaceGui")
	surfaceGui.Face = Enum.NormalId.Front
	surfaceGui.Parent = sign

	local signLabel = Instance.new("TextLabel")
	signLabel.Size = UDim2.new(1, 0, 1, 0)
	signLabel.BackgroundTransparency = 1
	signLabel.Font = Enum.Font.GothamBlack
	signLabel.TextSize = 48
	signLabel.TextColor3 = Color3.fromRGB(200, 100, 255)
	signLabel.Text = "STAGE 1\nはじめての無重力"
	signLabel.TextScaled = true
	signLabel.Parent = surfaceGui
end

---------------------------------------------------------------------------
-- Stage 2: 「グラビティタワー」
---------------------------------------------------------------------------
local function buildStage2()
	local stageFolder = Instance.new("Folder")
	stageFolder.Name = "Stage_2"
	stageFolder.Parent = Workspace

	local offsetX = 200  -- Stage 1 とずらす

	createSpawnPoint("StageSpawn_2", Vector3.new(offsetX, 5, 0))

	-- 4面タワー構造: 各面にプラットフォームを配置
	-- タワーの中心
	local towerCenter = Vector3.new(offsetX, 50, 0)
	local towerSize = 60  -- タワーの幅
	local levels = 10     -- 階層数

	-- 中央の柱（装飾）
	createPart({
		Name = "TowerCore",
		Position = towerCenter,
		Size = Vector3.new(4, levels * 10, 4),
		Color = Color3.fromRGB(40, 0, 80),
		Material = Enum.Material.Neon,
		Transparency = 0.5,
	}).Parent = stageFolder

	-- 4方向に足場を配置
	local directions = {
		{ offset = Vector3.new(1, 0, 0), name = "East" },
		{ offset = Vector3.new(-1, 0, 0), name = "West" },
		{ offset = Vector3.new(0, 0, 1), name = "South" },
		{ offset = Vector3.new(0, 0, -1), name = "North" },
	}

	for level = 1, levels do
		local y = level * 10
		local dir = directions[((level - 1) % 4) + 1]
		local offset = dir.offset * 15

		-- メイン足場
		local platPos = Vector3.new(offsetX, y, 0) + offset
		local part = createPart({
			Name = string.format("TowerPlat_%s_%d", dir.name, level),
			Position = platPos,
			Size = Vector3.new(8, 2, 8),
			Color = Color3.fromHSV((level / levels) * 0.8, 0.7, 0.8),
			Material = Enum.Material.SmoothPlastic,
		})
		part.Parent = stageFolder

		-- 中間足場（小さめ）
		if level < levels then
			local midPos = Vector3.new(offsetX, y + 5, 0) + offset * 0.5
			createPart({
				Name = "TowerMid_" .. level,
				Position = midPos,
				Size = Vector3.new(4, 1, 4),
				Color = Color3.fromHSV((level / levels) * 0.8, 0.5, 0.6),
				Material = Enum.Material.SmoothPlastic,
			}).Parent = stageFolder
		end
	end

	-- 壁面プラットフォーム（重力シフト時に使用）
	for level = 1, levels do
		local y = level * 10
		-- 壁に張り付く足場
		createPart({
			Name = "WallPlat_" .. level,
			Position = Vector3.new(offsetX + 25, y, 0),
			Size = Vector3.new(2, 8, 8),
			Color = Color3.fromRGB(0, 150, 200),
			Material = Enum.Material.SmoothPlastic,
			Transparency = 0.3,
		}).Parent = stageFolder
	end

	-- スタート地点
	createPart({
		Name = "TowerBase",
		Position = Vector3.new(offsetX, 3, 0),
		Size = Vector3.new(20, 2, 20),
		Color = Color3.fromRGB(60, 60, 80),
		Material = Enum.Material.SmoothPlastic,
	}).Parent = stageFolder

	-- ゴール（タワー頂上）
	createGoal("StageGoal_2", Vector3.new(offsetX, levels * 10 + 5, 0), Vector3.new(12, 10, 12))

	createKillZone(Vector3.new(offsetX, -50, 0), Vector3.new(500, 2, 500))
end

---------------------------------------------------------------------------
-- Stage 3: 「カオスアリーナ」
---------------------------------------------------------------------------
local function buildStage3()
	local stageFolder = Instance.new("Folder")
	stageFolder.Name = "Stage_3"
	stageFolder.Parent = Workspace

	local offsetX = 400

	createSpawnPoint("StageSpawn_3", Vector3.new(offsetX, 5, 0))

	-- 巨大な箱型アリーナ（6面に足場）
	local arenaSize = 80
	local center = Vector3.new(offsetX, arenaSize / 2, 0)

	-- 6面の壁（半透明で中が見える）
	local walls = {
		{ pos = center + Vector3.new(0, arenaSize/2, 0),  size = Vector3.new(arenaSize, 2, arenaSize), name = "Top" },
		{ pos = center + Vector3.new(0, -arenaSize/2, 0), size = Vector3.new(arenaSize, 2, arenaSize), name = "Bottom" },
		{ pos = center + Vector3.new(arenaSize/2, 0, 0),  size = Vector3.new(2, arenaSize, arenaSize), name = "East" },
		{ pos = center + Vector3.new(-arenaSize/2, 0, 0), size = Vector3.new(2, arenaSize, arenaSize), name = "West" },
		{ pos = center + Vector3.new(0, 0, arenaSize/2),  size = Vector3.new(arenaSize, arenaSize, 2), name = "South" },
		{ pos = center + Vector3.new(0, 0, -arenaSize/2), size = Vector3.new(arenaSize, arenaSize, 2), name = "North" },
	}

	for _, w in walls do
		createPart({
			Name = "ArenaWall_" .. w.name,
			Position = w.pos,
			Size = w.size,
			Color = Color3.fromRGB(20, 0, 40),
			Material = Enum.Material.Glass,
			Transparency = 0.7,
		}).Parent = stageFolder
	end

	-- アリーナ内の浮遊足場（ランダム配置）
	local rng = Random.new(42)  -- シード固定で再現性を確保
	for i = 1, 30 do
		local pos = center + Vector3.new(
			rng:NextNumber(-30, 30),
			rng:NextNumber(-30, 30),
			rng:NextNumber(-30, 30)
		)
		local size = Vector3.new(
			rng:NextNumber(3, 10),
			rng:NextNumber(1, 3),
			rng:NextNumber(3, 10)
		)

		createPart({
			Name = "FloatPlat_" .. i,
			Position = pos,
			Size = size,
			Color = Color3.fromHSV(rng:NextNumber(0.6, 0.9), 0.8, 0.7),
			Material = Enum.Material.Neon,
			Transparency = 0.1,
		}).Parent = stageFolder
	end

	-- スタート足場
	createPart({
		Name = "ArenaStart",
		Position = Vector3.new(offsetX, 3, 0),
		Size = Vector3.new(14, 2, 14),
		Color = Color3.fromRGB(0, 200, 100),
		Material = Enum.Material.SmoothPlastic,
	}).Parent = stageFolder

	-- ゴール（アリーナの対角線上）
	createGoal("StageGoal_3", center + Vector3.new(30, 30, 30), Vector3.new(10, 10, 10))
end

---------------------------------------------------------------------------
-- ロビー
---------------------------------------------------------------------------
local function buildLobby()
	local lobbyFolder = Instance.new("Folder")
	lobbyFolder.Name = "Lobby"
	lobbyFolder.Parent = Workspace

	-- ロビー床
	createPart({
		Name = "LobbyFloor",
		Position = Vector3.new(0, -1, 50),
		Size = Vector3.new(60, 2, 60),
		Color = Color3.fromRGB(40, 40, 60),
		Material = Enum.Material.SmoothPlastic,
	}).Parent = lobbyFolder

	-- ライティング
	local light = Instance.new("PointLight")
	light.Brightness = 2
	light.Range = 60
	light.Color = Color3.fromRGB(150, 100, 255)

	local lightPart = createPart({
		Name = "LobbyLight",
		Position = Vector3.new(0, 20, 50),
		Size = Vector3.new(2, 2, 2),
		Material = Enum.Material.Neon,
		Color = Color3.fromRGB(150, 100, 255),
		Transparency = 0.5,
	})
	light.Parent = lightPart
	lightPart.Parent = lobbyFolder
end

---------------------------------------------------------------------------
-- 全ステージ生成
---------------------------------------------------------------------------
print("[StageBuilder] Building stages...")
buildLobby()
buildStage1()
buildStage2()
buildStage3()
print("[StageBuilder] All stages built!")
