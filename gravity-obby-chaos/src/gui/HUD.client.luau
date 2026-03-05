--[[
	HUD (Client) — ゲーム中のUI表示
	StarterGui に配置

	責務:
	- 順位 / タイマー / コイン表示
	- ラウンド状態表示（ロビー/カウントダウン/レース/リザルト）
	- アイテムスロット表示
	- リザルト画面
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local itemKeyHint = UserInputService.TouchEnabled and "[Tap]" or "[E]"

---------------------------------------------------------------------------
-- UI 構築
---------------------------------------------------------------------------
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "GameHUD"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.DisplayOrder = 1
screenGui.Parent = player:WaitForChild("PlayerGui")

-- ===== トップバー =====
local topBar = Instance.new("Frame")
topBar.Name = "TopBar"
topBar.Size = UDim2.new(1, 0, 0, 50)
topBar.Position = UDim2.new(0, 0, 0, 0)
topBar.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
topBar.BackgroundTransparency = 0.5
topBar.BorderSizePixel = 0
topBar.Parent = screenGui

-- タイマー
local timerLabel = Instance.new("TextLabel")
timerLabel.Name = "Timer"
timerLabel.Size = UDim2.new(0.3, 0, 1, 0)
timerLabel.Position = UDim2.new(0.35, 0, 0, 0)
timerLabel.BackgroundTransparency = 1
timerLabel.Font = Enum.Font.GothamBlack
timerLabel.TextSize = 28
timerLabel.TextColor3 = Color3.new(1, 1, 1)
timerLabel.Text = "00:00"
timerLabel.Parent = topBar

-- 順位
local rankLabel = Instance.new("TextLabel")
rankLabel.Name = "Rank"
rankLabel.Size = UDim2.new(0.25, 0, 1, 0)
rankLabel.Position = UDim2.new(0.02, 0, 0, 0)
rankLabel.BackgroundTransparency = 1
rankLabel.Font = Enum.Font.GothamBold
rankLabel.TextSize = 22
rankLabel.TextColor3 = Color3.fromRGB(255, 220, 50)
rankLabel.TextXAlignment = Enum.TextXAlignment.Left
rankLabel.Text = ""
rankLabel.Parent = topBar

-- コイン
local coinLabel = Instance.new("TextLabel")
coinLabel.Name = "Coins"
coinLabel.Size = UDim2.new(0.25, 0, 1, 0)
coinLabel.Position = UDim2.new(0.73, 0, 0, 0)
coinLabel.BackgroundTransparency = 1
coinLabel.Font = Enum.Font.GothamBold
coinLabel.TextSize = 22
coinLabel.TextColor3 = Color3.fromRGB(255, 200, 0)
coinLabel.TextXAlignment = Enum.TextXAlignment.Right
coinLabel.Text = "Coins: 0"
coinLabel.Parent = topBar

-- ===== 中央テキスト（カウントダウン/状態表示） =====
local centerLabel = Instance.new("TextLabel")
centerLabel.Name = "CenterText"
centerLabel.Size = UDim2.new(0.8, 0, 0.2, 0)
centerLabel.Position = UDim2.new(0.1, 0, 0.35, 0)
centerLabel.BackgroundTransparency = 1
centerLabel.Font = Enum.Font.GothamBlack
centerLabel.TextSize = 72
centerLabel.TextColor3 = Color3.new(1, 1, 1)
centerLabel.TextStrokeTransparency = 0
centerLabel.TextStrokeColor3 = Color3.new(0, 0, 0)
centerLabel.Text = ""
centerLabel.TextTransparency = 1
centerLabel.Parent = screenGui

-- ===== アイテムスロット =====
local itemFrame = Instance.new("Frame")
itemFrame.Name = "ItemSlot"
itemFrame.Size = UDim2.new(0, 120, 0, 50)
itemFrame.Position = UDim2.new(0.02, 0, 0.9, 0)
itemFrame.BackgroundColor3 = Color3.fromRGB(30, 30, 50)
itemFrame.BackgroundTransparency = 0.3
itemFrame.BorderSizePixel = 0
itemFrame.Visible = false
itemFrame.Parent = screenGui

local itemCorner = Instance.new("UICorner")
itemCorner.CornerRadius = UDim.new(0, 8)
itemCorner.Parent = itemFrame

local itemLabel = Instance.new("TextLabel")
itemLabel.Name = "ItemName"
itemLabel.Size = UDim2.new(1, -10, 1, 0)
itemLabel.Position = UDim2.new(0, 5, 0, 0)
itemLabel.BackgroundTransparency = 1
itemLabel.Font = Enum.Font.GothamBold
itemLabel.TextSize = 16
itemLabel.TextColor3 = Color3.new(1, 1, 1)
itemLabel.TextXAlignment = Enum.TextXAlignment.Left
itemLabel.Text = itemKeyHint .. " ---"
itemLabel.Parent = itemFrame

-- ===== ステージ情報 =====
local stageLabel = Instance.new("TextLabel")
stageLabel.Name = "StageLabel"
stageLabel.Size = UDim2.new(0.7, 0, 0, 28)
stageLabel.Position = UDim2.new(0.15, 0, 0, 56)
stageLabel.BackgroundTransparency = 1
stageLabel.Font = Enum.Font.GothamBold
stageLabel.TextSize = 20
stageLabel.TextColor3 = Color3.fromRGB(180, 220, 255)
stageLabel.Text = ""
stageLabel.Visible = false
stageLabel.Parent = screenGui

local guideLabel = Instance.new("TextLabel")
guideLabel.Name = "GuideLabel"
guideLabel.Size = UDim2.new(0.8, 0, 0, 34)
guideLabel.Position = UDim2.new(0.1, 0, 1, -56)
guideLabel.BackgroundTransparency = 1
guideLabel.Font = Enum.Font.GothamBold
guideLabel.TextSize = 20
guideLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
guideLabel.TextStrokeTransparency = 0.5
guideLabel.TextStrokeColor3 = Color3.new(0, 0, 0)
guideLabel.Text = ""
guideLabel.Visible = false
guideLabel.Parent = screenGui

-- ===== リザルト画面 =====
local resultFrame = Instance.new("Frame")
resultFrame.Name = "ResultScreen"
resultFrame.Size = UDim2.new(0.6, 0, 0.7, 0)
resultFrame.Position = UDim2.new(0.2, 0, 0.15, 0)
resultFrame.BackgroundColor3 = Color3.fromRGB(10, 10, 30)
resultFrame.BackgroundTransparency = 0.2
resultFrame.BorderSizePixel = 0
resultFrame.Visible = false
resultFrame.Parent = screenGui

local resultCorner = Instance.new("UICorner")
resultCorner.CornerRadius = UDim.new(0, 12)
resultCorner.Parent = resultFrame

local resultTitle = Instance.new("TextLabel")
resultTitle.Size = UDim2.new(1, 0, 0.15, 0)
resultTitle.BackgroundTransparency = 1
resultTitle.Font = Enum.Font.GothamBlack
resultTitle.TextSize = 36
resultTitle.TextColor3 = Color3.fromRGB(255, 220, 50)
resultTitle.Text = "RESULTS"
resultTitle.Parent = resultFrame

local resultList = Instance.new("TextLabel")
resultList.Name = "ResultList"
resultList.Size = UDim2.new(0.9, 0, 0.75, 0)
resultList.Position = UDim2.new(0.05, 0, 0.2, 0)
resultList.BackgroundTransparency = 1
resultList.Font = Enum.Font.GothamBold
resultList.TextSize = 22
resultList.TextColor3 = Color3.new(1, 1, 1)
resultList.TextXAlignment = Enum.TextXAlignment.Left
resultList.TextYAlignment = Enum.TextYAlignment.Top
resultList.Text = ""
resultList.Parent = resultFrame

---------------------------------------------------------------------------
-- ヘルパー
---------------------------------------------------------------------------
local function formatTime(seconds: number): string
	if seconds < 0 then return "DNF" end
	local mins = math.floor(seconds / 60)
	local secs = math.floor(seconds % 60)
	return string.format("%02d:%02d", mins, secs)
end

local function showCenterText(text: string, duration: number?, size: number?)
	centerLabel.Text = text
	centerLabel.TextSize = size or 72
	centerLabel.TextTransparency = 0

	if duration then
		task.delay(duration, function()
			TweenService:Create(centerLabel, TweenInfo.new(0.5), {
				TextTransparency = 1,
			}):Play()
		end)
	end
end

local rankMedals = { "🥇", "🥈", "🥉" }
local currentState = "Lobby"
local currentRaceDuration = 0
local raceEndsAt = 0

---------------------------------------------------------------------------
-- RemoteEvent リスナー
---------------------------------------------------------------------------
local RoundStateEvent = ReplicatedStorage:WaitForChild("RoundStateChanged")
local CountdownEvent = ReplicatedStorage:WaitForChild("Countdown")
local PlayerFinishedEvent = ReplicatedStorage:WaitForChild("PlayerFinished")
local ResultEvent = ReplicatedStorage:WaitForChild("RoundResult")
local StageInfoEvent = ReplicatedStorage:WaitForChild("StageInfoChanged")

RoundStateEvent.OnClientEvent:Connect(function(state: string)
	currentState = state

	if state == "Lobby" then
		resultFrame.Visible = false
		rankLabel.Text = ""
		timerLabel.Text = "LOBBY"
		stageLabel.Visible = false
		guideLabel.Visible = false
		itemFrame.Visible = false
		showCenterText("GRAVITY OBBY CHAOS", nil, 48)
	elseif state == "Racing" then
		if currentRaceDuration > 0 then
			raceEndsAt = tick() + currentRaceDuration
		end
		TweenService:Create(centerLabel, TweenInfo.new(0.3), {
			TextTransparency = 1,
		}):Play()
	elseif state == "Result" then
		timerLabel.Text = "RESULT"
		guideLabel.Visible = false
		itemFrame.Visible = false
		-- ResultEvent で処理
	end
end)

CountdownEvent.OnClientEvent:Connect(function(count: number)
	if count == 1 then
		showCenterText("GO!", 1, 96)
	else
		showCenterText(tostring(count), 0.8, 96)
	end
end)

PlayerFinishedEvent.OnClientEvent:Connect(function(playerName: string, rank: number, time: number)
	if playerName == player.Name then
		local medal = rankMedals[rank] or ("#" .. rank)
		showCenterText(medal .. " FINISH!", 3, 64)
	end
end)

ResultEvent.OnClientEvent:Connect(function(results: { any })
	resultFrame.Visible = true
	local lines = {}
	for _, entry in results do
		local medal = rankMedals[entry.rank] or ("#" .. entry.rank)
		local timeStr = formatTime(entry.time)
		table.insert(lines, string.format(
			"%s  %s  -  %s  (+%d coins)",
			medal, entry.name, timeStr, entry.coins
		))
	end
	resultList.Text = table.concat(lines, "\n")
end)

StageInfoEvent.OnClientEvent:Connect(function(info)
	currentRaceDuration = info.duration or 0
	stageLabel.Text = string.format("STAGE %d  %s", info.stageIndex, info.name)
	stageLabel.Visible = true

	guideLabel.Text = info.hint or ""
	guideLabel.Visible = guideLabel.Text ~= ""

	itemFrame.Visible = info.itemsEnabled == true
	if not itemFrame.Visible then
		itemLabel.Text = itemKeyHint .. " ---"
	end
end)

RunService.RenderStepped:Connect(function()
	if currentState ~= "Racing" then
		return
	end

	if raceEndsAt <= 0 then
		return
	end

	local remaining = math.max(0, raceEndsAt - tick())
	timerLabel.Text = formatTime(remaining)
end)

-- アイテム表示更新
local ItemPickupEvent = ReplicatedStorage:FindFirstChild("ItemPickup")
if ItemPickupEvent then
	ItemPickupEvent.OnClientEvent:Connect(function(itemName: string)
		local displayNames = {
			GravityBomb = "重力爆弾",
			GravityAnchor = "重力アンカー",
			AntiGravBoost = "反重力ブースト",
			GravityReverse = "重力リバース",
		}
		itemLabel.Text = itemKeyHint .. " " .. (displayNames[itemName] or itemName)
	end)
end

local ItemUsedEvent = ReplicatedStorage:FindFirstChild("ItemUsed")
if ItemUsedEvent then
	ItemUsedEvent.OnClientEvent:Connect(function()
		itemLabel.Text = itemKeyHint .. " ---"
	end)
end
