--[[
	InputHandler (Client) — アイテム使用・重力操作入力の処理
	StarterPlayerScripts に配置

	責務:
	- アイテム使用キーの検知（E / モバイルボタン）
	- プレイヤー重力切替（Q / モバイルボタン）
	- サーバーへのアイテム使用リクエスト送信
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local Players = game:GetService("Players")

local GravityConfig = require(ReplicatedStorage:WaitForChild("GravityConfig"))

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local isMobile = UserInputService.TouchEnabled

---------------------------------------------------------------------------
-- RemoteEvents
---------------------------------------------------------------------------
local UseItemEvent = ReplicatedStorage:FindFirstChild("UseItem")
local RequestPlayerGravityShiftEvent = ReplicatedStorage:WaitForChild("RequestPlayerGravityShift", 10)
local RoundStateEvent = ReplicatedStorage:WaitForChild("RoundStateChanged", 10)
local StageInfoEvent = ReplicatedStorage:WaitForChild("StageInfoChanged", 10)

---------------------------------------------------------------------------
-- State
---------------------------------------------------------------------------
local currentItem: string? = nil
local canUseItem: boolean = true
local canShiftGravity: boolean = true
local canRequestGravityShift: boolean = false
local itemsEnabled: boolean = false
local useItemButton: TextButton? = nil
local gravityShiftButton: TextButton? = nil

local itemDisplayNames: { [string]: string } = {
	GravityBomb = "Gravity Bomb",
	GravityAnchor = "Gravity Anchor",
	AntiGravBoost = "Anti Grav Boost",
	GravityReverse = "Gravity Reverse",
}

local function getItemLabelText(): string
	if not currentItem then
		return "Use Item"
	end
	return itemDisplayNames[currentItem] or currentItem
end

local function updateUseItemButton()
	if not useItemButton then return end

	useItemButton.Visible = itemsEnabled
	if not itemsEnabled then
		return
	end

	local hasItem = currentItem ~= nil and UseItemEvent ~= nil
	useItemButton.Text = getItemLabelText()
	useItemButton.AutoButtonColor = hasItem
	useItemButton.BackgroundTransparency = hasItem and 0.1 or 0.35
end

local function updateMobileLayout()
	if not gravityShiftButton then return end

	if itemsEnabled then
		gravityShiftButton.Position = GravityConfig.MobileUI.gravityButtonPosition
	else
		gravityShiftButton.Position = GravityConfig.MobileUI.useItemButtonPosition
	end
end

---------------------------------------------------------------------------
-- アイテム使用
---------------------------------------------------------------------------
local function useItem()
	if not UseItemEvent then return end
	if not itemsEnabled then return end
	if not currentItem then return end
	if not canUseItem then return end

	canUseItem = false
	UseItemEvent:FireServer(currentItem)

	-- クールダウンはサーバー側で管理、UIフィードバックのみ
	task.delay(1, function()
		canUseItem = true
	end)
end

local function requestGravityShift()
	if not RequestPlayerGravityShiftEvent then return end
	if not canRequestGravityShift then return end
	if not canShiftGravity then return end

	canShiftGravity = false
	RequestPlayerGravityShiftEvent:FireServer()

	task.delay(GravityConfig.PLAYER_SHIFT_COOLDOWN or 4, function()
		canShiftGravity = true
	end)
end

---------------------------------------------------------------------------
-- モバイルUI
---------------------------------------------------------------------------
local function createMobileControls()
	if not isMobile then return end

	local screenGui = Instance.new("ScreenGui")
	screenGui.Name = "MobileInputGui"
	screenGui.ResetOnSpawn = false
	screenGui.IgnoreGuiInset = true
	screenGui.DisplayOrder = 3
	screenGui.Parent = playerGui

	local useButton = Instance.new("TextButton")
	useButton.Name = "UseItemButton"
	useButton.Size = GravityConfig.MobileUI.useItemButtonSize
	useButton.Position = GravityConfig.MobileUI.useItemButtonPosition
	useButton.BackgroundColor3 = Color3.fromRGB(50, 110, 210)
	useButton.BackgroundTransparency = 0.1
	useButton.BorderSizePixel = 0
	useButton.Font = Enum.Font.GothamBold
	useButton.TextColor3 = Color3.new(1, 1, 1)
	useButton.TextScaled = true
	useButton.Parent = screenGui

	local useCorner = Instance.new("UICorner")
	useCorner.CornerRadius = UDim.new(0, 10)
	useCorner.Parent = useButton

	local gravityButton = Instance.new("TextButton")
	gravityButton.Name = "GravityShiftButton"
	gravityButton.Size = GravityConfig.MobileUI.gravityButtonSize
	gravityButton.Position = GravityConfig.MobileUI.gravityButtonPosition
	gravityButton.BackgroundColor3 = Color3.fromRGB(150, 70, 220)
	gravityButton.BackgroundTransparency = 0.1
	gravityButton.BorderSizePixel = 0
	gravityButton.Font = Enum.Font.GothamBold
	gravityButton.TextColor3 = Color3.new(1, 1, 1)
	gravityButton.TextScaled = true
	gravityButton.Text = "Gravity Flip"
	gravityButton.Parent = screenGui

	local gravityCorner = Instance.new("UICorner")
	gravityCorner.CornerRadius = UDim.new(0, 10)
	gravityCorner.Parent = gravityButton

	useButton.Activated:Connect(useItem)
	gravityButton.Activated:Connect(requestGravityShift)

	useItemButton = useButton
	gravityShiftButton = gravityButton
	updateUseItemButton()
	updateMobileLayout()
end

---------------------------------------------------------------------------
-- 入力バインド
---------------------------------------------------------------------------
UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end

	if input.KeyCode == Enum.KeyCode.E then
		useItem()
	elseif input.KeyCode == Enum.KeyCode.Q then
		requestGravityShift()
	end
end)

---------------------------------------------------------------------------
-- アイテム取得通知（サーバーから）
---------------------------------------------------------------------------
local ItemPickupEvent = ReplicatedStorage:FindFirstChild("ItemPickup")
if ItemPickupEvent then
	ItemPickupEvent.OnClientEvent:Connect(function(itemName: string)
		currentItem = itemName
		updateUseItemButton()
	end)
end

-- アイテム消費通知
local ItemUsedEvent = ReplicatedStorage:FindFirstChild("ItemUsed")
if ItemUsedEvent then
	ItemUsedEvent.OnClientEvent:Connect(function()
		currentItem = nil
		updateUseItemButton()
	end)
end

if StageInfoEvent then
	StageInfoEvent.OnClientEvent:Connect(function(info)
		itemsEnabled = info.itemsEnabled == true and UseItemEvent ~= nil
		if not itemsEnabled then
			currentItem = nil
			canUseItem = true
		end
		updateUseItemButton()
		updateMobileLayout()
	end)
end

if RoundStateEvent then
	RoundStateEvent.OnClientEvent:Connect(function(state: string)
		canRequestGravityShift = state == "Lobby" or state == "Racing"
		if not canRequestGravityShift then
			canShiftGravity = true
		end
	end)
end

createMobileControls()
