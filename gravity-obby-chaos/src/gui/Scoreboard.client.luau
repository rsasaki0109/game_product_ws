--[[
	Scoreboard (Client) — レース中のリアルタイム順位表示
	StarterGui に配置
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer

---------------------------------------------------------------------------
-- UI 構築
---------------------------------------------------------------------------
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "ScoreboardGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.DisplayOrder = 2
screenGui.Parent = player:WaitForChild("PlayerGui")

local boardFrame = Instance.new("Frame")
boardFrame.Name = "Scoreboard"
boardFrame.Size = UDim2.new(0, 200, 0, 250)
boardFrame.Position = UDim2.new(1, -210, 0, 60)
boardFrame.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
boardFrame.BackgroundTransparency = 0.6
boardFrame.BorderSizePixel = 0
boardFrame.Parent = screenGui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 8)
corner.Parent = boardFrame

local titleLabel = Instance.new("TextLabel")
titleLabel.Size = UDim2.new(1, 0, 0, 30)
titleLabel.BackgroundTransparency = 1
titleLabel.Font = Enum.Font.GothamBlack
titleLabel.TextSize = 16
titleLabel.TextColor3 = Color3.fromRGB(255, 220, 50)
titleLabel.Text = "LEADERBOARD"
titleLabel.Parent = boardFrame

-- プレイヤーリスト用のフレーム
local listFrame = Instance.new("Frame")
listFrame.Name = "PlayerList"
listFrame.Size = UDim2.new(1, -10, 1, -35)
listFrame.Position = UDim2.new(0, 5, 0, 32)
listFrame.BackgroundTransparency = 1
listFrame.Parent = boardFrame

local listLayout = Instance.new("UIListLayout")
listLayout.SortOrder = Enum.SortOrder.LayoutOrder
listLayout.Padding = UDim.new(0, 2)
listLayout.Parent = listFrame

---------------------------------------------------------------------------
-- State
---------------------------------------------------------------------------
local finishedPlayers: { { name: string, rank: number } } = {}
local isRacing: boolean = false

---------------------------------------------------------------------------
-- プレイヤーエントリ作成
---------------------------------------------------------------------------
local function createPlayerEntry(name: string, rank: number, isLocal: boolean): TextLabel
	local entry = Instance.new("TextLabel")
	entry.Name = "Entry_" .. name
	entry.Size = UDim2.new(1, 0, 0, 22)
	entry.BackgroundTransparency = isLocal and 0.7 or 1
	entry.BackgroundColor3 = Color3.fromRGB(0, 100, 200)
	entry.Font = isLocal and Enum.Font.GothamBlack or Enum.Font.GothamBold
	entry.TextSize = 14
	entry.TextColor3 = isLocal and Color3.fromRGB(100, 220, 255) or Color3.new(1, 1, 1)
	entry.TextXAlignment = Enum.TextXAlignment.Left
	entry.Text = string.format("  #%d  %s", rank, name)
	entry.LayoutOrder = rank
	entry.Parent = listFrame

	if isLocal then
		local entryCorner = Instance.new("UICorner")
		entryCorner.CornerRadius = UDim.new(0, 4)
		entryCorner.Parent = entry
	end

	return entry
end

local function clearEntries()
	for _, child in listFrame:GetChildren() do
		if child:IsA("TextLabel") then
			child:Destroy()
		end
	end
end

local function refreshBoard()
	clearEntries()

	-- ゴール済みプレイヤーを先に表示
	for _, entry in finishedPlayers do
		local isLocal = entry.name == player.Name
		createPlayerEntry(entry.name .. " ✓", entry.rank, isLocal)
	end

	-- 未ゴールプレイヤー
	local nextRank = #finishedPlayers + 1
	for _, p in Players:GetPlayers() do
		local isFinished = false
		for _, entry in finishedPlayers do
			if entry.name == p.Name then isFinished = true; break end
		end
		if not isFinished then
			local isLocal = p.Name == player.Name
			createPlayerEntry(p.Name, nextRank, isLocal)
			nextRank += 1
		end
	end
end

---------------------------------------------------------------------------
-- RemoteEvent リスナー
---------------------------------------------------------------------------
local RoundStateEvent = ReplicatedStorage:WaitForChild("RoundStateChanged")
local PlayerFinishedEvent = ReplicatedStorage:WaitForChild("PlayerFinished")

RoundStateEvent.OnClientEvent:Connect(function(state: string)
	if state == "Racing" then
		isRacing = true
		finishedPlayers = {}
		boardFrame.Visible = true
		refreshBoard()
	elseif state == "Lobby" then
		isRacing = false
		boardFrame.Visible = false
	elseif state == "Result" then
		isRacing = false
	end
end)

PlayerFinishedEvent.OnClientEvent:Connect(function(playerName: string, rank: number)
	table.insert(finishedPlayers, { name = playerName, rank = rank })
	refreshBoard()
end)

-- 初期状態
boardFrame.Visible = false
