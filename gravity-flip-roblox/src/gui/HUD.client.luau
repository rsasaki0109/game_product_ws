-- HUD.client.luau
-- Gravity Flip Arena: HP bar, gravity indicator, cooldowns, kill feed,
-- timer urgency, result screen, mobile buttons, visual effects
-- POLISHED: kill streak HUD, gravity compass, flip counter, leaderboard

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local stateFolder = ReplicatedStorage:WaitForChild("GravityFlipState")

-- Remotes
local FlipGravity = ReplicatedStorage:WaitForChild("FlipGravity")
local PunchRequest = ReplicatedStorage:WaitForChild("PunchRequest")
local PlayerStateUpdate = ReplicatedStorage:WaitForChild("PlayerStateUpdate")
local MatchResult = ReplicatedStorage:WaitForChild("MatchResult")
local KillFeed = ReplicatedStorage:WaitForChild("KillFeed")
local GravityChanged = ReplicatedStorage:WaitForChild("GravityChanged")
local DamageFlash = ReplicatedStorage:WaitForChild("DamageFlash")
local Announcer = ReplicatedStorage:WaitForChild("Announcer")
local StreakUpdate = ReplicatedStorage:WaitForChild("StreakUpdate")
local LeaderboardUpdate = ReplicatedStorage:WaitForChild("LeaderboardUpdate")

----------------------------------------------------------------------------
-- Player state (synced from server)
----------------------------------------------------------------------------
local currentHP = 100
local currentGravity = "Down"
local currentKills = 0
local currentDeaths = 0
local flipCooldown = 0
local punchCooldown = 0
local currentStreak = 0
local currentTotalFlips = 0
local leaderboardData = {}

----------------------------------------------------------------------------
-- Screen GUI
----------------------------------------------------------------------------
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "GravityFlipHUD"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.Parent = playerGui

----------------------------------------------------------------------------
-- Helpers
----------------------------------------------------------------------------
local function makeFrame(props)
	local f = Instance.new("Frame")
	f.Size = props.Size or UDim2.new(0, 100, 0, 100)
	f.Position = props.Position or UDim2.new(0, 0, 0, 0)
	f.AnchorPoint = props.AnchorPoint or Vector2.new(0, 0)
	f.BackgroundColor3 = props.BackgroundColor3 or Color3.fromRGB(30, 30, 30)
	f.BackgroundTransparency = props.BackgroundTransparency or 0
	f.BorderSizePixel = 0
	f.Parent = props.Parent or screenGui
	if props.Corner then
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(0, props.Corner)
		c.Parent = f
	end
	return f
end

local function makeLabel(props)
	local t = Instance.new("TextLabel")
	t.Size = props.Size or UDim2.new(1, 0, 1, 0)
	t.Position = props.Position or UDim2.new(0, 0, 0, 0)
	t.AnchorPoint = props.AnchorPoint or Vector2.new(0, 0)
	t.BackgroundTransparency = 1
	t.Font = props.Font or Enum.Font.GothamBold
	t.TextColor3 = props.TextColor3 or Color3.fromRGB(255, 255, 255)
	t.TextScaled = props.TextScaled ~= false
	t.Text = props.Text or ""
	t.TextXAlignment = props.TextXAlignment or Enum.TextXAlignment.Center
	t.TextYAlignment = props.TextYAlignment or Enum.TextYAlignment.Center
	t.Parent = props.Parent or screenGui
	if props.ZIndex then
		t.ZIndex = props.ZIndex
	end
	return t
end

local function makeButton(props)
	local b = Instance.new("TextButton")
	b.Size = props.Size or UDim2.new(0, 80, 0, 80)
	b.Position = props.Position or UDim2.new(0, 0, 0, 0)
	b.AnchorPoint = props.AnchorPoint or Vector2.new(0, 0)
	b.BackgroundColor3 = props.BackgroundColor3 or Color3.fromRGB(60, 60, 60)
	b.Font = props.Font or Enum.Font.GothamBlack
	b.TextColor3 = props.TextColor3 or Color3.fromRGB(255, 255, 255)
	b.TextScaled = true
	b.Text = props.Text or ""
	b.BorderSizePixel = 0
	b.Parent = props.Parent or screenGui
	if props.Corner then
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(0, props.Corner)
		c.Parent = b
	end
	return b
end

----------------------------------------------------------------------------
-- Flash overlay
----------------------------------------------------------------------------
local flashOverlay = Instance.new("Frame")
flashOverlay.Size = UDim2.fromScale(1, 1)
flashOverlay.BackgroundColor3 = Color3.fromRGB(255, 50, 50)
flashOverlay.BackgroundTransparency = 1
flashOverlay.BorderSizePixel = 0
flashOverlay.ZIndex = 100
flashOverlay.Parent = screenGui

local function screenFlash(color: Color3, duration: number, startAlpha: number)
	flashOverlay.BackgroundColor3 = color
	flashOverlay.BackgroundTransparency = 1 - (startAlpha or 0.4)
	task.spawn(function()
		local steps = 8
		for step = 1, steps do
			flashOverlay.BackgroundTransparency = 1 - (startAlpha or 0.4) * (1 - step / steps)
			task.wait(duration / steps)
		end
		flashOverlay.BackgroundTransparency = 1
	end)
end

----------------------------------------------------------------------------
-- Root frame for screen shake
----------------------------------------------------------------------------
local rootFrame = Instance.new("Frame")
rootFrame.Size = UDim2.fromScale(1, 1)
rootFrame.Position = UDim2.fromScale(0, 0)
rootFrame.BackgroundTransparency = 1
rootFrame.Parent = screenGui

local shakeUntil = 0
local shakeIntensity = 0

local function screenShake(intensity: number, duration: number)
	shakeIntensity = intensity
	shakeUntil = tick() + duration
end

----------------------------------------------------------------------------
-- Top Bar: Title, State, Timer
----------------------------------------------------------------------------
local topBar = makeFrame({
	Size = UDim2.new(0, 440, 0, 70),
	Position = UDim2.new(0.5, 0, 0, 10),
	AnchorPoint = Vector2.new(0.5, 0),
	BackgroundColor3 = Color3.fromRGB(20, 25, 40),
	BackgroundTransparency = 0.16,
	Corner = 14,
	Parent = rootFrame,
})

local titleLabel = makeLabel({
	Size = UDim2.new(0.5, -10, 0, 28),
	Position = UDim2.fromOffset(12, 6),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(180, 220, 255),
	TextXAlignment = Enum.TextXAlignment.Left,
	Text = "Gravity Flip Arena",
	Parent = topBar,
})

local stateTimerLabel = makeLabel({
	Size = UDim2.new(0.5, -10, 0, 26),
	Position = UDim2.fromOffset(12, 36),
	Font = Enum.Font.GothamMedium,
	TextColor3 = Color3.fromRGB(255, 236, 135),
	TextXAlignment = Enum.TextXAlignment.Left,
	Text = "Lobby 00",
	Parent = topBar,
})

local killsLabel = makeLabel({
	Size = UDim2.new(0, 120, 0, 28),
	Position = UDim2.new(1, -130, 0, 6),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(255, 200, 80),
	TextXAlignment = Enum.TextXAlignment.Right,
	Text = "K: 0  D: 0",
	Parent = topBar,
})

----------------------------------------------------------------------------
-- HP Bar
----------------------------------------------------------------------------
local hpFrame = makeFrame({
	Size = UDim2.new(0, 300, 0, 28),
	Position = UDim2.new(0.5, 0, 0, 88),
	AnchorPoint = Vector2.new(0.5, 0),
	BackgroundColor3 = Color3.fromRGB(40, 20, 20),
	BackgroundTransparency = 0.2,
	Corner = 8,
	Parent = rootFrame,
})

local hpBarFill = makeFrame({
	Size = UDim2.new(1, 0, 1, 0),
	Position = UDim2.new(0, 0, 0, 0),
	BackgroundColor3 = Color3.fromRGB(80, 220, 120),
	Corner = 8,
	Parent = hpFrame,
})

local hpText = makeLabel({
	Size = UDim2.new(1, 0, 1, 0),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(255, 255, 255),
	Text = "100 HP",
	Parent = hpFrame,
})
hpText.ZIndex = 3

----------------------------------------------------------------------------
-- Gravity Direction Indicator
----------------------------------------------------------------------------
local gravFrame = makeFrame({
	Size = UDim2.new(0, 180, 0, 44),
	Position = UDim2.new(0.5, 0, 0, 122),
	AnchorPoint = Vector2.new(0.5, 0),
	BackgroundColor3 = Color3.fromRGB(30, 30, 50),
	BackgroundTransparency = 0.25,
	Corner = 10,
	Parent = rootFrame,
})

local gravLabel = makeLabel({
	Size = UDim2.new(1, -10, 1, 0),
	Position = UDim2.fromOffset(5, 0),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(180, 220, 255),
	Text = "GRAVITY: DOWN",
	Parent = gravFrame,
})

----------------------------------------------------------------------------
-- Gravity Compass (shows arrow for your gravity direction)
----------------------------------------------------------------------------
local compassFrame = makeFrame({
	Size = UDim2.new(0, 52, 0, 52),
	Position = UDim2.new(0.5, 100, 0, 124),
	AnchorPoint = Vector2.new(0, 0),
	BackgroundColor3 = Color3.fromRGB(20, 20, 40),
	BackgroundTransparency = 0.2,
	Corner = 26,
	Parent = rootFrame,
})

local compassArrow = makeLabel({
	Size = UDim2.new(1, 0, 1, 0),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(255, 255, 100),
	Text = "v",
	Parent = compassFrame,
})

local compassDirectionMap = {
	Down = { arrow = "v", rotation = 0 },
	Up = { arrow = "^", rotation = 0 },
	North = { arrow = ">", rotation = 0 },
	South = { arrow = "<", rotation = 0 },
	East = { arrow = ">", rotation = 0 },
	West = { arrow = "<", rotation = 0 },
}

----------------------------------------------------------------------------
-- Flip Counter
----------------------------------------------------------------------------
local flipCountFrame = makeFrame({
	Size = UDim2.new(0, 120, 0, 32),
	Position = UDim2.new(0, 16, 0, 172),
	BackgroundColor3 = Color3.fromRGB(30, 30, 50),
	BackgroundTransparency = 0.3,
	Corner = 8,
	Parent = rootFrame,
})

local flipCountLabel = makeLabel({
	Size = UDim2.new(1, -8, 1, 0),
	Position = UDim2.fromOffset(4, 0),
	Font = Enum.Font.GothamBold,
	TextColor3 = Color3.fromRGB(180, 220, 255),
	TextXAlignment = Enum.TextXAlignment.Left,
	Text = "Flips: 0",
	Parent = flipCountFrame,
})

----------------------------------------------------------------------------
-- Kill Streak HUD
----------------------------------------------------------------------------
local streakFrame = makeFrame({
	Size = UDim2.new(0, 200, 0, 44),
	Position = UDim2.new(0.5, 0, 0, 172),
	AnchorPoint = Vector2.new(0.5, 0),
	BackgroundColor3 = Color3.fromRGB(50, 20, 10),
	BackgroundTransparency = 0.3,
	Corner = 10,
	Parent = rootFrame,
})
streakFrame.Visible = false

local streakLabel = makeLabel({
	Size = UDim2.new(1, -10, 1, 0),
	Position = UDim2.fromOffset(5, 0),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(255, 200, 60),
	Text = "STREAK: 0",
	Parent = streakFrame,
})

-- Streak popup (center screen, appears on 3/5/7)
local streakPopup = makeLabel({
	Size = UDim2.fromOffset(400, 70),
	Position = UDim2.new(0.5, 0, 0.3, 0),
	AnchorPoint = Vector2.new(0.5, 0.5),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(255, 200, 60),
	Text = "",
	Parent = rootFrame,
})
streakPopup.TextStrokeTransparency = 0.2
streakPopup.TextStrokeColor3 = Color3.fromRGB(100, 50, 0)
streakPopup.Visible = false
streakPopup.ZIndex = 50

----------------------------------------------------------------------------
-- Leaderboard (top 3)
----------------------------------------------------------------------------
local leaderboardFrame = makeFrame({
	Size = UDim2.new(0, 160, 0, 100),
	Position = UDim2.new(1, -16, 0, 96),
	AnchorPoint = Vector2.new(1, 0),
	BackgroundColor3 = Color3.fromRGB(15, 15, 30),
	BackgroundTransparency = 0.3,
	Corner = 8,
	Parent = rootFrame,
})

local leaderboardTitle = makeLabel({
	Size = UDim2.new(1, -8, 0, 22),
	Position = UDim2.fromOffset(4, 2),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(255, 236, 135),
	TextXAlignment = Enum.TextXAlignment.Left,
	Text = "TOP PLAYERS",
	Parent = leaderboardFrame,
})

local lbLabels = {}
for i = 1, 3 do
	local medalColors = {
		Color3.fromRGB(255, 215, 0),
		Color3.fromRGB(192, 192, 192),
		Color3.fromRGB(205, 127, 50),
	}
	local lb = makeLabel({
		Size = UDim2.new(1, -12, 0, 20),
		Position = UDim2.fromOffset(6, 22 + (i - 1) * 24),
		Font = Enum.Font.GothamBold,
		TextColor3 = medalColors[i],
		TextXAlignment = Enum.TextXAlignment.Left,
		Text = "",
		Parent = leaderboardFrame,
	})
	lbLabels[i] = lb
end

----------------------------------------------------------------------------
-- Announcer Banner (center top)
----------------------------------------------------------------------------
local announcerLabel = makeLabel({
	Size = UDim2.fromOffset(500, 40),
	Position = UDim2.new(0.5, 0, 0, 220),
	AnchorPoint = Vector2.new(0.5, 0),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(255, 255, 100),
	Text = "",
	Parent = rootFrame,
})
announcerLabel.TextStrokeTransparency = 0.3
announcerLabel.TextStrokeColor3 = Color3.fromRGB(80, 60, 0)
announcerLabel.Visible = false
announcerLabel.ZIndex = 40

----------------------------------------------------------------------------
-- Cooldown Indicators
----------------------------------------------------------------------------
local cooldownFrame = makeFrame({
	Size = UDim2.new(0, 360, 0, 44),
	Position = UDim2.new(0.5, 0, 1, -60),
	AnchorPoint = Vector2.new(0.5, 1),
	BackgroundColor3 = Color3.fromRGB(20, 20, 20),
	BackgroundTransparency = 0.35,
	Corner = 10,
	Parent = rootFrame,
})

local flipCdLabel = makeLabel({
	Size = UDim2.new(0, 160, 0, 36),
	Position = UDim2.fromOffset(8, 4),
	Font = Enum.Font.GothamBold,
	TextColor3 = Color3.fromRGB(180, 220, 255),
	Text = "Flip: Ready",
	TextXAlignment = Enum.TextXAlignment.Left,
	Parent = cooldownFrame,
})

local punchCdLabel = makeLabel({
	Size = UDim2.new(0, 160, 0, 36),
	Position = UDim2.new(1, -168, 0, 4),
	Font = Enum.Font.GothamBold,
	TextColor3 = Color3.fromRGB(255, 160, 80),
	Text = "Punch: Ready",
	TextXAlignment = Enum.TextXAlignment.Right,
	Parent = cooldownFrame,
})

----------------------------------------------------------------------------
-- Controls Hint
----------------------------------------------------------------------------
local hintLabel = makeLabel({
	Size = UDim2.new(0, 500, 0, 24),
	Position = UDim2.new(0.5, 0, 1, -16),
	AnchorPoint = Vector2.new(0.5, 1),
	Font = Enum.Font.GothamMedium,
	TextColor3 = Color3.fromRGB(180, 180, 180),
	Text = "Q: Flip UP  |  E: Flip DOWN  |  F: Flip WALL  |  Click: Punch",
	Parent = rootFrame,
})

----------------------------------------------------------------------------
-- Kill Feed
----------------------------------------------------------------------------
local feedFrame = makeFrame({
	Size = UDim2.new(0, 380, 0, 160),
	Position = UDim2.new(1, -16, 0, 200),
	AnchorPoint = Vector2.new(1, 0),
	BackgroundColor3 = Color3.fromRGB(0, 0, 0),
	BackgroundTransparency = 0.65,
	Corner = 8,
	Parent = rootFrame,
})

local feedStroke = Instance.new("UIStroke")
feedStroke.Thickness = 1
feedStroke.Transparency = 0.5
feedStroke.Color = Color3.fromRGB(180, 220, 255)
feedStroke.Parent = feedFrame

local feedLabels = {}

local function removeFeedLabel(target)
	for idx, label in ipairs(feedLabels) do
		if label == target then
			table.remove(feedLabels, idx)
			break
		end
	end
	for index, label in ipairs(feedLabels) do
		label.Position = UDim2.fromOffset(10, (index - 1) * 30 + 6)
	end
end

local function addFeed(message: string, color: Color3, lifetime: number?)
	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(1, -20, 0, 24)
	label.Position = UDim2.fromOffset(10, 6)
	label.BackgroundTransparency = 1
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.Font = Enum.Font.GothamBold
	label.TextScaled = true
	label.TextColor3 = color
	label.TextStrokeTransparency = 0.5
	label.Text = message
	label.Parent = feedFrame

	label.TextTransparency = 1
	task.spawn(function()
		for step = 1, 4 do
			label.TextTransparency = 1 - step / 4
			task.wait(0.03)
		end
	end)

	table.insert(feedLabels, 1, label)
	for index, line in ipairs(feedLabels) do
		line.Position = UDim2.fromOffset(10, (index - 1) * 30 + 6)
	end

	while #feedLabels > 5 do
		local oldest = table.remove(feedLabels)
		if oldest then
			oldest:Destroy()
		end
	end

	task.delay(lifetime or 3.0, function()
		if not label.Parent then
			return
		end
		for step = 1, 6 do
			label.TextTransparency = step / 6
			task.wait(0.04)
		end
		label:Destroy()
		removeFeedLabel(label)
	end)
end

----------------------------------------------------------------------------
-- Countdown Overlay
----------------------------------------------------------------------------
local countdownLabel = makeLabel({
	Size = UDim2.fromOffset(280, 120),
	Position = UDim2.new(0.5, 0, 0.45, 0),
	AnchorPoint = Vector2.new(0.5, 0.5),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(255, 255, 255),
	TextStrokeTransparency = 0.3,
	Text = "",
	Parent = rootFrame,
})
countdownLabel.Visible = false

----------------------------------------------------------------------------
-- Result Panel
----------------------------------------------------------------------------
local resultFrame = makeFrame({
	Size = UDim2.new(0, 380, 0, 300),
	Position = UDim2.new(0.5, 0, 0.5, 0),
	AnchorPoint = Vector2.new(0.5, 0.5),
	BackgroundColor3 = Color3.fromRGB(15, 20, 35),
	BackgroundTransparency = 0.1,
	Corner = 16,
})
resultFrame.Visible = false
resultFrame.ZIndex = 10

local resultTitle = makeLabel({
	Size = UDim2.new(1, -20, 0, 40),
	Position = UDim2.fromOffset(10, 10),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(180, 220, 255),
	Text = "RESULTS",
	Parent = resultFrame,
	ZIndex = 11,
})

local resultBody = makeLabel({
	Size = UDim2.new(1, -20, 1, -60),
	Position = UDim2.fromOffset(10, 54),
	Font = Enum.Font.GothamMedium,
	TextColor3 = Color3.fromRGB(230, 230, 230),
	TextYAlignment = Enum.TextYAlignment.Top,
	TextXAlignment = Enum.TextXAlignment.Left,
	Text = "",
	Parent = resultFrame,
	ZIndex = 11,
})

----------------------------------------------------------------------------
-- Mobile Buttons
----------------------------------------------------------------------------
local isMobile = UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled

local mobileFrame = makeFrame({
	Size = UDim2.new(0, 360, 0, 100),
	Position = UDim2.new(1, -20, 1, -80),
	AnchorPoint = Vector2.new(1, 1),
	BackgroundTransparency = 1,
	Parent = rootFrame,
})
mobileFrame.Visible = isMobile

local flipUpBtn = makeButton({
	Size = UDim2.new(0, 75, 0, 75),
	Position = UDim2.fromOffset(0, 0),
	BackgroundColor3 = Color3.fromRGB(100, 60, 180),
	Text = "FLIP\nUP",
	Corner = 12,
	Parent = mobileFrame,
})

local flipDownBtn = makeButton({
	Size = UDim2.new(0, 75, 0, 75),
	Position = UDim2.fromOffset(85, 0),
	BackgroundColor3 = Color3.fromRGB(60, 130, 180),
	Text = "FLIP\nDOWN",
	Corner = 12,
	Parent = mobileFrame,
})

local flipWallBtn = makeButton({
	Size = UDim2.new(0, 75, 0, 75),
	Position = UDim2.fromOffset(170, 0),
	BackgroundColor3 = Color3.fromRGB(60, 180, 100),
	Text = "FLIP\nWALL",
	Corner = 12,
	Parent = mobileFrame,
})

local punchBtn = makeButton({
	Size = UDim2.new(0, 75, 0, 75),
	Position = UDim2.fromOffset(255, 0),
	BackgroundColor3 = Color3.fromRGB(220, 80, 50),
	Text = "PUNCH",
	Corner = 12,
	Parent = mobileFrame,
})

-- Mobile button events
flipUpBtn.MouseButton1Click:Connect(function()
	FlipGravity:FireServer("Up")
end)

flipDownBtn.MouseButton1Click:Connect(function()
	FlipGravity:FireServer("Down")
end)

flipWallBtn.MouseButton1Click:Connect(function()
	FlipGravity:FireServer("Wall")
end)

punchBtn.MouseButton1Click:Connect(function()
	PunchRequest:FireServer()
end)

----------------------------------------------------------------------------
-- Keyboard Input
----------------------------------------------------------------------------
UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then
		return
	end

	if input.KeyCode == Enum.KeyCode.Q then
		FlipGravity:FireServer("Up")
	elseif input.KeyCode == Enum.KeyCode.E then
		FlipGravity:FireServer("Down")
	elseif input.KeyCode == Enum.KeyCode.F then
		FlipGravity:FireServer("Wall")
	elseif input.UserInputType == Enum.UserInputType.MouseButton1 then
		PunchRequest:FireServer()
	end
end)

if isMobile then
	UserInputService.TouchTap:Connect(function(_positions, gameProcessed)
		if gameProcessed then
			return
		end
		PunchRequest:FireServer()
	end)
end

----------------------------------------------------------------------------
-- Server Events
----------------------------------------------------------------------------
PlayerStateUpdate.OnClientEvent:Connect(function(data)
	if typeof(data) ~= "table" then
		return
	end
	currentHP = data.hp or currentHP
	currentGravity = data.gravityName or currentGravity
	currentKills = data.kills or currentKills
	currentDeaths = data.deaths or currentDeaths
	flipCooldown = data.flipCooldown or 0
	punchCooldown = data.punchCooldown or 0
	currentStreak = data.streak or 0
	currentTotalFlips = data.totalFlips or 0
end)

KillFeed.OnClientEvent:Connect(function(message, color)
	addFeed(tostring(message), color or Color3.fromRGB(255, 255, 255))
	screenShake(4, 0.2)
end)

GravityChanged.OnClientEvent:Connect(function(playerName, dirName)
	if playerName == player.Name then
		screenFlash(Color3.fromRGB(180, 220, 255), 0.25, 0.3)
		screenShake(5, 0.2)
	end
end)

DamageFlash.OnClientEvent:Connect(function(amount)
	screenFlash(Color3.fromRGB(255, 50, 30), 0.3, 0.45)
	screenShake(6 + amount * 0.15, 0.25)
end)

-- Announcer handler
Announcer.OnClientEvent:Connect(function(message, color)
	announcerLabel.Text = tostring(message)
	announcerLabel.TextColor3 = color or Color3.fromRGB(255, 255, 100)
	announcerLabel.Visible = true
	announcerLabel.TextTransparency = 0

	task.spawn(function()
		task.wait(2.5)
		if announcerLabel.Text == message then
			for step = 1, 8 do
				announcerLabel.TextTransparency = step / 8
				task.wait(0.04)
			end
			announcerLabel.Visible = false
		end
	end)
end)

-- Streak popup handler
StreakUpdate.OnClientEvent:Connect(function(streak, text, color)
	streakPopup.Text = text
	streakPopup.TextColor3 = color
	streakPopup.Visible = true
	streakPopup.TextTransparency = 0

	-- Flash and shake
	screenFlash(color, 0.4, 0.4)
	screenShake(8 + streak, 0.3)

	task.spawn(function()
		-- Scale pulse effect
		for i = 1, 4 do
			local scale = 1 + 0.15 * (4 - i)
			streakPopup.Size = UDim2.fromOffset(400 * scale, 70 * scale)
			task.wait(0.06)
		end
		streakPopup.Size = UDim2.fromOffset(400, 70)

		task.wait(2)
		for step = 1, 8 do
			streakPopup.TextTransparency = step / 8
			task.wait(0.04)
		end
		streakPopup.Visible = false
	end)
end)

-- Leaderboard handler
LeaderboardUpdate.OnClientEvent:Connect(function(top3)
	leaderboardData = top3 or {}
	for i = 1, 3 do
		if leaderboardData[i] then
			lbLabels[i].Text = string.format("#%d %s (%d)", i, leaderboardData[i].name, leaderboardData[i].kills)
		else
			lbLabels[i].Text = ""
		end
	end
end)

MatchResult.OnClientEvent:Connect(function(results)
	if typeof(results) ~= "table" then
		return
	end
	resultFrame.Visible = true

	local lines = {}
	for _, entry in ipairs(results) do
		local line = string.format(
			"#%d  %s  K:%d  D:%d  +%d pts",
			entry.rank, entry.name, entry.kills, entry.deaths, entry.score
		)
		table.insert(lines, line)
	end
	resultBody.Text = table.concat(lines, "\n")

	if #results > 0 then
		resultTitle.Text = results[1].name .. " WINS!"
	end

	task.delay(10, function()
		resultFrame.Visible = false
	end)
end)

----------------------------------------------------------------------------
-- Gravity color map
----------------------------------------------------------------------------
local gravityColors = {
	Down = Color3.fromRGB(80, 220, 120),
	Up = Color3.fromRGB(180, 100, 255),
	North = Color3.fromRGB(100, 200, 255),
	South = Color3.fromRGB(255, 180, 80),
	East = Color3.fromRGB(255, 120, 160),
	West = Color3.fromRGB(120, 255, 200),
}

local gravityArrows = {
	Down = "v",
	Up = "^",
	North = "N",
	South = "S",
	East = ">",
	West = "<",
}

----------------------------------------------------------------------------
-- UI Refresh Loop
----------------------------------------------------------------------------
local flashTimer = 0
local lastCountdownValue = -1

RunService.RenderStepped:Connect(function(dt)
	flashTimer += dt

	local stateStr = stateFolder:FindFirstChild("State") and stateFolder.State.Value or "Lobby"
	local timerVal = stateFolder:FindFirstChild("Timer") and stateFolder.Timer.Value or 0

	-- Timer urgency
	if stateStr == "Playing" and timerVal <= 15 and timerVal > 0 then
		local pulse = math.abs(math.sin(tick() * 4))
		stateTimerLabel.TextColor3 = Color3.fromRGB(
			255,
			math.floor(80 + 100 * pulse),
			math.floor(60 + 75 * pulse)
		)
	else
		stateTimerLabel.TextColor3 = Color3.fromRGB(255, 236, 135)
	end

	stateTimerLabel.Text = string.format("%s  %02d", stateStr, timerVal)

	-- Countdown display
	if stateStr == "Countdown" then
		if timerVal ~= lastCountdownValue and timerVal > 0 then
			countdownLabel.Visible = true
			countdownLabel.Text = tostring(timerVal)
			local scale = 1 + (4 - math.clamp(timerVal, 1, 3)) * 0.3
			countdownLabel.Size = UDim2.fromOffset(280 * scale, 120 * scale)
			if timerVal == 1 then
				countdownLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
			elseif timerVal == 2 then
				countdownLabel.TextColor3 = Color3.fromRGB(255, 200, 80)
			else
				countdownLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
			end
			screenFlash(Color3.fromRGB(255, 255, 255), 0.15, 0.12)
		end
		lastCountdownValue = timerVal
	elseif stateStr == "Playing" and lastCountdownValue > 0 then
		countdownLabel.Text = "FIGHT!"
		countdownLabel.TextColor3 = Color3.fromRGB(255, 200, 60)
		countdownLabel.Size = UDim2.fromOffset(380, 150)
		screenFlash(Color3.fromRGB(255, 220, 80), 0.35, 0.35)
		lastCountdownValue = -1
		task.delay(0.7, function()
			countdownLabel.Visible = false
		end)
	else
		lastCountdownValue = timerVal
	end

	-- Reset on lobby
	if stateStr == "Lobby" then
		resultFrame.Visible = false
		countdownLabel.Visible = false
		currentHP = 100
		currentKills = 0
		currentDeaths = 0
		currentGravity = "Down"
		currentStreak = 0
		currentTotalFlips = 0
	end

	-- HP bar
	local hpFrac = math.clamp(currentHP / 100, 0, 1)
	hpBarFill.Size = UDim2.new(hpFrac, 0, 1, 0)
	hpText.Text = string.format("%d HP", currentHP)

	if hpFrac > 0.6 then
		hpBarFill.BackgroundColor3 = Color3.fromRGB(80, 220, 120)
	elseif hpFrac > 0.3 then
		hpBarFill.BackgroundColor3 = Color3.fromRGB(255, 200, 60)
	else
		local flash = math.sin(flashTimer * 8) > 0
		hpBarFill.BackgroundColor3 = flash and Color3.fromRGB(255, 60, 40) or Color3.fromRGB(200, 40, 30)
	end

	-- Gravity direction indicator
	local gravColor = gravityColors[currentGravity] or Color3.fromRGB(200, 200, 200)
	local gravArrow = gravityArrows[currentGravity] or "?"
	gravLabel.Text = string.format("GRAVITY: %s %s", string.upper(currentGravity), gravArrow)
	gravLabel.TextColor3 = gravColor

	-- Gravity compass
	local compassData = compassDirectionMap[currentGravity]
	if compassData then
		compassArrow.Text = compassData.arrow
	end
	compassArrow.TextColor3 = gravColor
	compassFrame.BackgroundColor3 = Color3.fromRGB(
		math.floor(gravColor.R * 50),
		math.floor(gravColor.G * 50),
		math.floor(gravColor.B * 50)
	)

	-- Flip counter
	flipCountLabel.Text = string.format("Flips: %d", currentTotalFlips)

	-- Kill streak display
	if currentStreak >= 2 then
		streakFrame.Visible = true
		streakLabel.Text = string.format("STREAK: %d", currentStreak)
		-- Fire/glow effect at 3+
		if currentStreak >= 3 then
			local pulse = math.abs(math.sin(tick() * 5))
			if currentStreak >= 7 then
				streakLabel.TextColor3 = Color3.fromRGB(255, math.floor(40 + 60 * pulse), math.floor(40 + 60 * pulse))
				streakFrame.BackgroundColor3 = Color3.fromRGB(80, 10, 10)
			elseif currentStreak >= 5 then
				streakLabel.TextColor3 = Color3.fromRGB(255, math.floor(80 + 100 * pulse), 255)
				streakFrame.BackgroundColor3 = Color3.fromRGB(60, 10, 60)
			else
				streakLabel.TextColor3 = Color3.fromRGB(255, math.floor(150 + 100 * pulse), math.floor(50 + 50 * pulse))
				streakFrame.BackgroundColor3 = Color3.fromRGB(60, 30, 10)
			end
		else
			streakLabel.TextColor3 = Color3.fromRGB(255, 200, 60)
			streakFrame.BackgroundColor3 = Color3.fromRGB(50, 20, 10)
		end
	else
		streakFrame.Visible = false
	end

	-- Kills/Deaths
	killsLabel.Text = string.format("K: %d  D: %d", currentKills, currentDeaths)

	-- Cooldowns
	if flipCooldown > 0.05 then
		flipCdLabel.Text = string.format("Flip: %.1fs", flipCooldown)
		flipCdLabel.TextColor3 = Color3.fromRGB(120, 140, 160)
	else
		flipCdLabel.Text = "Flip: Ready"
		flipCdLabel.TextColor3 = Color3.fromRGB(180, 220, 255)
	end

	if punchCooldown > 0.05 then
		punchCdLabel.Text = string.format("Punch: %.1fs", punchCooldown)
		punchCdLabel.TextColor3 = Color3.fromRGB(160, 120, 80)
	else
		punchCdLabel.Text = "Punch: Ready"
		punchCdLabel.TextColor3 = Color3.fromRGB(255, 160, 80)
	end

	-- Screen shake
	if tick() < shakeUntil then
		local ox = (math.random() - 0.5) * shakeIntensity * 2
		local oy = (math.random() - 0.5) * shakeIntensity * 2
		rootFrame.Position = UDim2.fromOffset(ox, oy)
	else
		rootFrame.Position = UDim2.fromScale(0, 0)
	end

	-- Show/hide game HUD based on state
	local gameActive = stateStr == "Playing"
	hpFrame.Visible = gameActive or stateStr == "Countdown"
	gravFrame.Visible = gameActive
	compassFrame.Visible = gameActive
	flipCountFrame.Visible = gameActive
	leaderboardFrame.Visible = gameActive
	cooldownFrame.Visible = gameActive
	feedFrame.Visible = gameActive or stateStr == "Result"
	hintLabel.Visible = gameActive
	mobileFrame.Visible = isMobile and gameActive
	announcerLabel.Visible = announcerLabel.Visible and gameActive

	-- Animated title pulse in Lobby
	if stateStr == "Lobby" then
		local scale = 1.0 + 0.1 * math.sin(tick() * 3)
		titleLabel.Size = UDim2.new(0.5 * scale, -10, 0, 28 * scale)
	else
		titleLabel.Size = UDim2.new(0.5, -10, 0, 28)
	end
end)

----------------------------------------------------------------------------
-- Session Best kill tracking
----------------------------------------------------------------------------
local sessionBestKills = 0

local polishBestLabel = makeLabel({
	Size = UDim2.new(1, -20, 0, 24),
	Position = UDim2.fromOffset(10, 240),
	Font = Enum.Font.GothamBold,
	TextColor3 = Color3.fromRGB(200, 200, 200),
	Text = "",
	Parent = resultFrame,
	ZIndex = 11,
})
polishBestLabel.Visible = false

local polishNewBestLabel = makeLabel({
	Size = UDim2.new(1, -20, 0, 20),
	Position = UDim2.fromOffset(10, 266),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(255, 220, 40),
	TextStrokeTransparency = 0.2,
	Text = "NEW BEST!",
	Parent = resultFrame,
	ZIndex = 12,
})
polishNewBestLabel.Visible = false

MatchResult.OnClientEvent:Connect(function(_results)
	local isNew = currentKills > sessionBestKills and sessionBestKills > 0
	if currentKills > sessionBestKills then
		sessionBestKills = currentKills
	end
	player:SetAttribute("SessionBestScore", sessionBestKills)
	polishBestLabel.Text = string.format("Session Best: %d kills", sessionBestKills)
	polishBestLabel.Visible = true
	if isNew then
		polishNewBestLabel.Visible = true
		task.spawn(function()
			for i = 1, 6 do
				polishNewBestLabel.TextTransparency = (i % 2 == 0) and 0 or 0.5
				task.wait(0.25)
			end
			polishNewBestLabel.TextTransparency = 0
		end)
	else
		polishNewBestLabel.Visible = false
	end
end)
