-- HUD
-- Size Shifter: size indicator, HP bar, lives, kills, stomp cooldown, result screen

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local localPlayer = Players.LocalPlayer
local playerGui = localPlayer:WaitForChild("PlayerGui")

local MatchStateChanged = ReplicatedStorage:WaitForChild("MatchStateChanged")
local MatchCountdown = ReplicatedStorage:WaitForChild("MatchCountdown")
local PlayFeed = ReplicatedStorage:WaitForChild("PlayFeed")
local SizeChange = ReplicatedStorage:WaitForChild("SizeChange")
local PunchRequest = ReplicatedStorage:WaitForChild("PunchRequest")
local StompRequest = ReplicatedStorage:WaitForChild("StompRequest")
local DashRequest = ReplicatedStorage:WaitForChild("DashRequest")
local HitFeedback = ReplicatedStorage:WaitForChild("HitFeedback")
local ActionCooldown = ReplicatedStorage:WaitForChild("ActionCooldown")
local PlayerStatsChanged = ReplicatedStorage:WaitForChild("PlayerStatsChanged")
local KillFeed = ReplicatedStorage:WaitForChild("KillFeed")

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "SizeShifterHUD"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.Parent = playerGui

local rootFrame = Instance.new("Frame")
rootFrame.Size = UDim2.fromScale(1, 1)
rootFrame.Position = UDim2.fromScale(0, 0)
rootFrame.BackgroundTransparency = 1
rootFrame.Parent = screenGui

local flashOverlay = Instance.new("Frame")
flashOverlay.Size = UDim2.fromScale(1, 1)
flashOverlay.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
flashOverlay.BackgroundTransparency = 1
flashOverlay.BorderSizePixel = 0
flashOverlay.ZIndex = 100
flashOverlay.Parent = screenGui

-- Top bar
local topFrame = Instance.new("Frame")
topFrame.Size = UDim2.new(1, 0, 0, 80)
topFrame.BackgroundColor3 = Color3.fromRGB(14, 16, 22)
topFrame.BackgroundTransparency = 0.22
topFrame.BorderSizePixel = 0
topFrame.Parent = rootFrame

local stateLabel = Instance.new("TextLabel")
stateLabel.Size = UDim2.fromScale(0.25, 0.5)
stateLabel.Position = UDim2.fromScale(0.02, 0.06)
stateLabel.TextXAlignment = Enum.TextXAlignment.Left
stateLabel.BackgroundTransparency = 1
stateLabel.Font = Enum.Font.GothamBold
stateLabel.TextColor3 = Color3.fromRGB(244, 244, 244)
stateLabel.TextScaled = true
stateLabel.Text = "Lobby"
stateLabel.Parent = topFrame

local timerLabel = Instance.new("TextLabel")
timerLabel.Size = UDim2.fromScale(0.15, 0.5)
timerLabel.Position = UDim2.fromScale(0.42, 0.06)
timerLabel.BackgroundTransparency = 1
timerLabel.Font = Enum.Font.GothamBold
timerLabel.TextColor3 = Color3.fromRGB(255, 236, 135)
timerLabel.TextScaled = true
timerLabel.Text = "--"
timerLabel.Parent = topFrame

local killsLabel = Instance.new("TextLabel")
killsLabel.Size = UDim2.fromScale(0.15, 0.5)
killsLabel.Position = UDim2.fromScale(0.62, 0.06)
killsLabel.BackgroundTransparency = 1
killsLabel.Font = Enum.Font.GothamBold
killsLabel.TextColor3 = Color3.fromRGB(255, 150, 80)
killsLabel.TextScaled = true
killsLabel.Text = "Kills: 0"
killsLabel.Parent = topFrame

local livesLabel = Instance.new("TextLabel")
livesLabel.Size = UDim2.fromScale(0.18, 0.5)
livesLabel.Position = UDim2.fromScale(0.8, 0.06)
livesLabel.TextXAlignment = Enum.TextXAlignment.Right
livesLabel.BackgroundTransparency = 1
livesLabel.Font = Enum.Font.GothamBold
livesLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
livesLabel.TextScaled = true
livesLabel.Text = "Lives: 3"
livesLabel.Parent = topFrame

-- Size indicator (center-left)
local sizeFrame = Instance.new("Frame")
sizeFrame.Size = UDim2.fromOffset(140, 60)
sizeFrame.Position = UDim2.new(0, 20, 0.5, -80)
sizeFrame.BackgroundColor3 = Color3.fromRGB(180, 180, 180)
sizeFrame.BorderSizePixel = 0
sizeFrame.Parent = rootFrame

local sizeCorner = Instance.new("UICorner")
sizeCorner.CornerRadius = UDim.new(0, 10)
sizeCorner.Parent = sizeFrame

local sizeLabel = Instance.new("TextLabel")
sizeLabel.Size = UDim2.fromScale(1, 1)
sizeLabel.BackgroundTransparency = 1
sizeLabel.Font = Enum.Font.GothamBlack
sizeLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
sizeLabel.TextScaled = true
sizeLabel.Text = "NORMAL"
sizeLabel.Parent = sizeFrame

-- HP bar
local hpFrame = Instance.new("Frame")
hpFrame.Size = UDim2.fromOffset(140, 20)
hpFrame.Position = UDim2.new(0, 20, 0.5, -12)
hpFrame.BackgroundColor3 = Color3.fromRGB(40, 40, 50)
hpFrame.BorderSizePixel = 0
hpFrame.Parent = rootFrame

local hpCorner = Instance.new("UICorner")
hpCorner.CornerRadius = UDim.new(0, 4)
hpCorner.Parent = hpFrame

local hpFill = Instance.new("Frame")
hpFill.Size = UDim2.fromScale(1, 1)
hpFill.BackgroundColor3 = Color3.fromRGB(80, 220, 80)
hpFill.BorderSizePixel = 0
hpFill.Parent = hpFrame

local hpFillCorner = Instance.new("UICorner")
hpFillCorner.CornerRadius = UDim.new(0, 4)
hpFillCorner.Parent = hpFill

local hpLabel = Instance.new("TextLabel")
hpLabel.Size = UDim2.fromScale(1, 1)
hpLabel.BackgroundTransparency = 1
hpLabel.Font = Enum.Font.GothamBold
hpLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
hpLabel.TextScaled = true
hpLabel.Text = "80/80"
hpLabel.ZIndex = 2
hpLabel.Parent = hpFrame

-- Cooldown labels
local cooldownFrame = Instance.new("Frame")
cooldownFrame.Size = UDim2.fromOffset(300, 28)
cooldownFrame.Position = UDim2.new(0, 12, 1, -68)
cooldownFrame.BackgroundTransparency = 1
cooldownFrame.Parent = rootFrame

local cooldownLabel = Instance.new("TextLabel")
cooldownLabel.Size = UDim2.fromScale(1, 1)
cooldownLabel.BackgroundTransparency = 1
cooldownLabel.Font = Enum.Font.GothamMedium
cooldownLabel.TextColor3 = Color3.fromRGB(230, 230, 230)
cooldownLabel.TextScaled = true
cooldownLabel.TextXAlignment = Enum.TextXAlignment.Left
cooldownLabel.Text = "Punch: Ready | Stomp: -- | Dash: Ready"
cooldownLabel.Parent = cooldownFrame

-- Countdown label
local countdownLabel = Instance.new("TextLabel")
countdownLabel.Size = UDim2.fromOffset(280, 110)
countdownLabel.Position = UDim2.new(0.5, -140, 0.5, -55)
countdownLabel.BackgroundTransparency = 1
countdownLabel.Font = Enum.Font.GothamBlack
countdownLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
countdownLabel.TextScaled = true
countdownLabel.TextStrokeTransparency = 0.45
countdownLabel.Visible = false
countdownLabel.Parent = rootFrame

-- Death message overlay
local deathMessage = Instance.new("TextLabel")
deathMessage.Size = UDim2.fromOffset(400, 80)
deathMessage.Position = UDim2.new(0.5, -200, 0.35, 0)
deathMessage.BackgroundTransparency = 1
deathMessage.Font = Enum.Font.GothamBlack
deathMessage.TextColor3 = Color3.fromRGB(255, 50, 50)
deathMessage.TextScaled = true
deathMessage.TextStrokeTransparency = 0.2
deathMessage.Text = ""
deathMessage.Visible = false
deathMessage.ZIndex = 95
deathMessage.Parent = screenGui

-- Feed frame
local feedFrame = Instance.new("Frame")
feedFrame.Size = UDim2.fromOffset(380, 160)
feedFrame.Position = UDim2.new(1, -392, 0, 90)
feedFrame.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
feedFrame.BackgroundTransparency = 0.62
feedFrame.BorderSizePixel = 0
feedFrame.Parent = rootFrame

local feedCornerUI = Instance.new("UICorner")
feedCornerUI.CornerRadius = UDim.new(0, 6)
feedCornerUI.Parent = feedFrame

-- Mobile buttons
local tinyButton = Instance.new("TextButton")
tinyButton.Size = UDim2.fromOffset(90, 50)
tinyButton.Position = UDim2.new(1, -410, 1, -138)
tinyButton.BackgroundColor3 = Color3.fromRGB(80, 200, 255)
tinyButton.TextColor3 = Color3.fromRGB(255, 255, 255)
tinyButton.Font = Enum.Font.GothamBold
tinyButton.TextScaled = true
tinyButton.Text = "TINY"
tinyButton.Visible = UserInputService.TouchEnabled
tinyButton.Parent = rootFrame

local normalButton = Instance.new("TextButton")
normalButton.Size = UDim2.fromOffset(90, 50)
normalButton.Position = UDim2.new(1, -310, 1, -138)
normalButton.BackgroundColor3 = Color3.fromRGB(180, 180, 180)
normalButton.TextColor3 = Color3.fromRGB(255, 255, 255)
normalButton.Font = Enum.Font.GothamBold
normalButton.TextScaled = true
normalButton.Text = "NORMAL"
normalButton.Visible = UserInputService.TouchEnabled
normalButton.Parent = rootFrame

local giantButton = Instance.new("TextButton")
giantButton.Size = UDim2.fromOffset(90, 50)
giantButton.Position = UDim2.new(1, -210, 1, -138)
giantButton.BackgroundColor3 = Color3.fromRGB(255, 80, 40)
giantButton.TextColor3 = Color3.fromRGB(255, 255, 255)
giantButton.Font = Enum.Font.GothamBold
giantButton.TextScaled = true
giantButton.Text = "GIANT"
giantButton.Visible = UserInputService.TouchEnabled
giantButton.Parent = rootFrame

local punchButton = Instance.new("TextButton")
punchButton.Size = UDim2.fromOffset(90, 50)
punchButton.Position = UDim2.new(1, -110, 1, -138)
punchButton.BackgroundColor3 = Color3.fromRGB(245, 101, 56)
punchButton.TextColor3 = Color3.fromRGB(255, 255, 255)
punchButton.Font = Enum.Font.GothamBold
punchButton.TextScaled = true
punchButton.Text = "PUNCH"
punchButton.Visible = UserInputService.TouchEnabled
punchButton.Parent = rootFrame

-- Hint
local hintLabel = Instance.new("TextLabel")
hintLabel.Size = UDim2.fromOffset(540, 28)
hintLabel.Position = UDim2.new(0.5, -270, 1, -34)
hintLabel.BackgroundTransparency = 1
hintLabel.Font = Enum.Font.GothamMedium
hintLabel.TextColor3 = Color3.fromRGB(232, 232, 232)
hintLabel.TextScaled = true
hintLabel.Text = "E: Shrink | R: Normal | Q: Grow | Click: Punch | F: Stomp | Shift: Dash"
hintLabel.Parent = rootFrame

-- Result overlay
local resultFrame = Instance.new("Frame")
resultFrame.Size = UDim2.fromScale(1, 1)
resultFrame.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
resultFrame.BackgroundTransparency = 0.45
resultFrame.BorderSizePixel = 0
resultFrame.Visible = false
resultFrame.ZIndex = 90
resultFrame.Parent = screenGui

local resultTitle = Instance.new("TextLabel")
resultTitle.Size = UDim2.fromScale(0.6, 0.12)
resultTitle.Position = UDim2.fromScale(0.2, 0.3)
resultTitle.BackgroundTransparency = 1
resultTitle.Font = Enum.Font.GothamBlack
resultTitle.TextScaled = true
resultTitle.TextColor3 = Color3.fromRGB(255, 236, 120)
resultTitle.TextStrokeTransparency = 0.3
resultTitle.Text = ""
resultTitle.ZIndex = 91
resultTitle.Parent = resultFrame

local resultStats = Instance.new("TextLabel")
resultStats.Size = UDim2.fromScale(0.5, 0.1)
resultStats.Position = UDim2.fromScale(0.25, 0.44)
resultStats.BackgroundTransparency = 1
resultStats.Font = Enum.Font.GothamBold
resultStats.TextScaled = true
resultStats.TextColor3 = Color3.fromRGB(230, 230, 230)
resultStats.TextStrokeTransparency = 0.5
resultStats.Text = ""
resultStats.ZIndex = 91
resultStats.Parent = resultFrame

-- State
local currentMatchState = "Lobby"
local currentTimerValue = 0
local currentSize = "normal"
local currentHP = 80
local currentMaxHP = 80
local currentLives = 3
local currentKills = 0
local shakeUntil = 0
local shakeIntensity = 0
local feedLabels = {}

local cooldownUntil = {
	Punch = 0,
	Stomp = 0,
	Dash = 0,
}

-- Helpers
local function screenFlash(color: Color3, duration: number, startAlpha: number)
	flashOverlay.BackgroundColor3 = color
	flashOverlay.BackgroundTransparency = 1 - (startAlpha or 0.55)
	task.spawn(function()
		local steps = 8
		for step = 1, steps do
			flashOverlay.BackgroundTransparency = 1 - (startAlpha or 0.55) * (1 - step / steps)
			task.wait(duration / steps)
		end
		flashOverlay.BackgroundTransparency = 1
	end)
end

local function screenShake(intensity: number, duration: number)
	shakeIntensity = intensity
	shakeUntil = tick() + duration
end

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

	table.insert(feedLabels, 1, label)
	for index, line in ipairs(feedLabels) do
		line.Position = UDim2.fromOffset(10, (index - 1) * 30 + 6)
	end

	while #feedLabels > 5 do
		local oldest = table.remove(feedLabels)
		if oldest then oldest:Destroy() end
	end

	task.delay(lifetime or 2.5, function()
		if not label.Parent then return end
		label:Destroy()
		removeFeedLabel(label)
	end)
end

local function updateSizeDisplay()
	if currentSize == "giant" then
		sizeFrame.BackgroundColor3 = Color3.fromRGB(255, 80, 40)
		sizeLabel.Text = "GIANT"
	elseif currentSize == "tiny" then
		sizeFrame.BackgroundColor3 = Color3.fromRGB(80, 200, 255)
		sizeLabel.Text = "TINY"
	else
		sizeFrame.BackgroundColor3 = Color3.fromRGB(150, 150, 160)
		sizeLabel.Text = "NORMAL"
	end
end

local function updateHPDisplay()
	local ratio = currentHP / math.max(1, currentMaxHP)
	hpFill.Size = UDim2.fromScale(math.clamp(ratio, 0, 1), 1)
	hpLabel.Text = string.format("%d/%d", currentHP, currentMaxHP)

	if ratio > 0.5 then
		hpFill.BackgroundColor3 = Color3.fromRGB(80, 220, 80)
	elseif ratio > 0.25 then
		hpFill.BackgroundColor3 = Color3.fromRGB(255, 200, 60)
	else
		hpFill.BackgroundColor3 = Color3.fromRGB(255, 60, 60)
	end
end

local function cooldownText(actionName: string)
	local remain = cooldownUntil[actionName] - tick()
	if remain <= 0 then return "Ready" end
	return string.format("%.1fs", remain)
end

-- Input
UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end

	if input.KeyCode == Enum.KeyCode.Q then
		SizeChange:FireServer("giant")
	elseif input.KeyCode == Enum.KeyCode.E then
		SizeChange:FireServer("tiny")
	elseif input.KeyCode == Enum.KeyCode.R then
		SizeChange:FireServer("normal")
	elseif input.KeyCode == Enum.KeyCode.F then
		StompRequest:FireServer()
	elseif input.KeyCode == Enum.KeyCode.LeftShift then
		DashRequest:FireServer()
	elseif input.UserInputType == Enum.UserInputType.MouseButton1 then
		PunchRequest:FireServer()
	end
end)

-- Mobile buttons
tinyButton.MouseButton1Click:Connect(function()
	SizeChange:FireServer("tiny")
end)
normalButton.MouseButton1Click:Connect(function()
	SizeChange:FireServer("normal")
end)
giantButton.MouseButton1Click:Connect(function()
	SizeChange:FireServer("giant")
end)
punchButton.MouseButton1Click:Connect(function()
	PunchRequest:FireServer()
end)

-- Remote handlers
MatchStateChanged.OnClientEvent:Connect(function(state, payload)
	currentMatchState = state
	if state == "Lobby" then
		stateLabel.Text = "Lobby"
		timerLabel.Text = payload and payload.remaining and tostring(payload.remaining) or "--"
		resultFrame.Visible = false
	elseif state == "Countdown" then
		stateLabel.Text = "Get Ready"
		resultFrame.Visible = false
	elseif state == "Playing" then
		stateLabel.Text = "FIGHT!"
		resultFrame.Visible = false
		if payload and payload.remaining ~= nil then
			currentTimerValue = tonumber(payload.remaining) or 0
			timerLabel.Text = tostring(math.ceil(currentTimerValue))
		end
	elseif state == "Result" then
		stateLabel.Text = "Result"
		resultFrame.Visible = true
		if payload and payload.winner then
			resultTitle.Text = tostring(payload.winner) .. " WINS!"
			resultStats.Text = string.format("%d kills", payload.kills or 0)
		end
	end
end)

MatchCountdown.OnClientEvent:Connect(function(remaining)
	if remaining > 0 then
		countdownLabel.Visible = true
		countdownLabel.Text = tostring(remaining)
		screenFlash(Color3.fromRGB(255, 255, 255), 0.2, 0.15)
	else
		countdownLabel.Text = "FIGHT!"
		countdownLabel.TextColor3 = Color3.fromRGB(255, 200, 60)
		screenFlash(Color3.fromRGB(255, 220, 80), 0.35, 0.35)
		task.delay(0.7, function()
			countdownLabel.Visible = false
		end)
	end
end)

PlayerStatsChanged.OnClientEvent:Connect(function(stats)
	if stats.size then
		currentSize = stats.size
		updateSizeDisplay()
	end
	if stats.hp then
		currentHP = stats.hp
		currentMaxHP = stats.maxHp or currentMaxHP
		updateHPDisplay()
	end
	if stats.lives then
		currentLives = stats.lives
		livesLabel.Text = string.format("Lives: %d", currentLives)
	end
	if stats.kills then
		currentKills = stats.kills
		killsLabel.Text = string.format("Kills: %d", currentKills)
	end
end)

HitFeedback.OnClientEvent:Connect(function(damage)
	screenFlash(Color3.fromRGB(255, 50, 50), 0.2, 0.3)
	screenShake(6, 0.2)
end)

KillFeed.OnClientEvent:Connect(function(message, attackerName, victimName)
	local color = Color3.fromRGB(255, 255, 255)
	if attackerName == localPlayer.Name then
		color = Color3.fromRGB(80, 255, 80)
	elseif victimName == localPlayer.Name then
		color = Color3.fromRGB(255, 80, 80)
		if string.find(tostring(message), "SQUISHED") then
			deathMessage.Text = "SQUISHED!"
			deathMessage.Visible = true
			screenFlash(Color3.fromRGB(255, 0, 0), 0.5, 0.6)
			screenShake(12, 0.4)
			task.delay(2, function()
				deathMessage.Visible = false
			end)
		end
	end
	addFeed(tostring(message), color, 3)
end)

PlayFeed.OnClientEvent:Connect(function(message, color, duration)
	addFeed(tostring(message), color or Color3.fromRGB(255, 255, 255), duration)
end)

ActionCooldown.OnClientEvent:Connect(function(actionName, duration)
	if cooldownUntil[actionName] ~= nil then
		cooldownUntil[actionName] = tick() + (tonumber(duration) or 0)
	end
end)

-- Render loop
RunService.RenderStepped:Connect(function()
	-- Cooldown text
	local stompText = currentSize == "giant" and cooldownText("Stomp") or "--"
	cooldownLabel.Text = string.format("Punch: %s | Stomp: %s | Dash: %s", cooldownText("Punch"), stompText, cooldownText("Dash"))

	-- Screen shake
	if tick() < shakeUntil then
		local ox = (math.random() - 0.5) * shakeIntensity * 2
		local oy = (math.random() - 0.5) * shakeIntensity * 2
		rootFrame.Position = UDim2.fromOffset(ox, oy)
	else
		rootFrame.Position = UDim2.fromScale(0, 0)
	end

	-- Timer urgency
	if currentMatchState == "Playing" then
		if currentTimerValue <= 15 and currentTimerValue > 0 then
			local p = math.abs(math.sin(tick() * 4))
			timerLabel.TextColor3 = Color3.fromRGB(255, math.floor(80 + 100 * p), math.floor(60 + 75 * p))
		else
			timerLabel.TextColor3 = Color3.fromRGB(255, 236, 135)
		end
	else
		timerLabel.TextColor3 = Color3.fromRGB(255, 236, 135)
	end

	-- POLISH: Animated title pulse in Lobby
	if currentMatchState == "Lobby" then
		local scale = 1.0 + 0.1 * math.sin(tick() * 3)
		stateLabel.Size = UDim2.fromScale(0.25 * scale, 0.5 * scale)
	else
		stateLabel.Size = UDim2.fromScale(0.25, 0.5)
	end
end)

----------------------------------------------------------------------------
-- POLISH: Dramatic countdown (scale + color for 3-2-1)
----------------------------------------------------------------------------
local function countdownPop(remaining)
	local scale = 1 + (4 - math.clamp(remaining, 1, 3)) * 0.3
	local baseW = 280
	local baseH = 110
	countdownLabel.Size = UDim2.fromOffset(baseW * scale, baseH * scale)
	countdownLabel.Position = UDim2.new(0.5, -baseW * scale * 0.5, 0.5, -baseH * scale * 0.5)
	if remaining == 1 then
		countdownLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
	elseif remaining == 2 then
		countdownLabel.TextColor3 = Color3.fromRGB(255, 200, 80)
	else
		countdownLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
	end
end

MatchCountdown.OnClientEvent:Connect(function(remaining)
	if remaining > 0 then
		countdownPop(remaining)
	end
end)

----------------------------------------------------------------------------
-- POLISH: Session Best kill tracking
----------------------------------------------------------------------------
local sessionBestKills = 0

local bestLabel = Instance.new("TextLabel")
bestLabel.Size = UDim2.fromScale(0.5, 0.07)
bestLabel.Position = UDim2.fromScale(0.25, 0.56)
bestLabel.BackgroundTransparency = 1
bestLabel.Font = Enum.Font.GothamBold
bestLabel.TextScaled = true
bestLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
bestLabel.TextStrokeTransparency = 0.5
bestLabel.Text = ""
bestLabel.ZIndex = 91
bestLabel.Visible = false
bestLabel.Parent = resultFrame

local newBestLabel = Instance.new("TextLabel")
newBestLabel.Size = UDim2.fromScale(0.4, 0.06)
newBestLabel.Position = UDim2.fromScale(0.3, 0.64)
newBestLabel.BackgroundTransparency = 1
newBestLabel.Font = Enum.Font.GothamBlack
newBestLabel.TextScaled = true
newBestLabel.TextColor3 = Color3.fromRGB(255, 220, 40)
newBestLabel.TextStrokeTransparency = 0.2
newBestLabel.Text = "NEW BEST!"
newBestLabel.ZIndex = 92
newBestLabel.Visible = false
newBestLabel.Parent = resultFrame

MatchStateChanged.OnClientEvent:Connect(function(state, _payload)
	if state == "Result" then
		local isNew = currentKills > sessionBestKills and sessionBestKills > 0
		if currentKills > sessionBestKills then
			sessionBestKills = currentKills
		end
		localPlayer:SetAttribute("SessionBestScore", sessionBestKills)
		bestLabel.Text = string.format("Session Best: %d kills", sessionBestKills)
		bestLabel.Visible = true
		if isNew then
			newBestLabel.Visible = true
			task.spawn(function()
				for i = 1, 6 do
					newBestLabel.TextTransparency = (i % 2 == 0) and 0 or 0.5
					task.wait(0.25)
				end
				newBestLabel.TextTransparency = 0
			end)
		else
			newBestLabel.Visible = false
		end
	elseif state == "Lobby" then
		bestLabel.Visible = false
		newBestLabel.Visible = false
	end
end)

----------------------------------------------------------------------------
-- POLISH: Quick restart hint (R key) -- R is used for normal size, so
-- only active on result screen
----------------------------------------------------------------------------
local restartHint = Instance.new("TextLabel")
restartHint.Size = UDim2.fromScale(0.4, 0.05)
restartHint.Position = UDim2.fromScale(0.3, 0.72)
restartHint.BackgroundTransparency = 1
restartHint.Font = Enum.Font.GothamMedium
restartHint.TextScaled = true
restartHint.TextColor3 = Color3.fromRGB(180, 180, 180)
restartHint.Text = "Press R for quick restart"
restartHint.ZIndex = 91
restartHint.Visible = false
restartHint.Parent = resultFrame

MatchStateChanged.OnClientEvent:Connect(function(state, _payload)
	restartHint.Visible = (state == "Result")
end)

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.R and currentMatchState == "Result" then
		local RestartRequest = ReplicatedStorage:FindFirstChild("RestartRequest")
		if RestartRequest then
			RestartRequest:FireServer()
		end
	end
end)

----------------------------------------------------------------------------
-- POLISH: Screen edge flash on HP decrease
----------------------------------------------------------------------------
local damageEdgeOverlay = Instance.new("Frame")
damageEdgeOverlay.Size = UDim2.fromScale(1, 1)
damageEdgeOverlay.BackgroundTransparency = 1
damageEdgeOverlay.BorderSizePixel = 0
damageEdgeOverlay.ZIndex = 99
damageEdgeOverlay.Parent = screenGui

local edgeStroke = Instance.new("UIStroke")
edgeStroke.Thickness = 0
edgeStroke.Color = Color3.fromRGB(255, 0, 0)
edgeStroke.Transparency = 1
edgeStroke.Parent = damageEdgeOverlay

local polishPrevHP = currentHP
PlayerStatsChanged.OnClientEvent:Connect(function(stats)
	if stats.hp and stats.hp < polishPrevHP then
		edgeStroke.Thickness = 8
		edgeStroke.Transparency = 0.2
		task.spawn(function()
			for step = 1, 8 do
				edgeStroke.Transparency = 0.2 + step * 0.1
				edgeStroke.Thickness = 8 - step
				task.wait(0.04)
			end
			edgeStroke.Thickness = 0
			edgeStroke.Transparency = 1
		end)
	end
	if stats.hp then
		polishPrevHP = stats.hp
	end
end)

----------------------------------------------------------------------------
-- POLISH: GOLIATH! popup for 3 kills as giant
----------------------------------------------------------------------------
local giantKillCount = 0

KillFeed.OnClientEvent:Connect(function(message, attackerName, _victimName)
	if attackerName == localPlayer.Name then
		if currentSize == "giant" then
			giantKillCount = giantKillCount + 1
			if giantKillCount == 3 then
				local goliathLabel = Instance.new("TextLabel")
				goliathLabel.Size = UDim2.fromOffset(400, 60)
				goliathLabel.Position = UDim2.new(0.5, -200, 0.28, 0)
				goliathLabel.BackgroundTransparency = 1
				goliathLabel.Font = Enum.Font.GothamBlack
				goliathLabel.TextScaled = true
				goliathLabel.TextColor3 = Color3.fromRGB(255, 80, 40)
				goliathLabel.TextStrokeTransparency = 0.15
				goliathLabel.TextStrokeColor3 = Color3.fromRGB(80, 20, 0)
				goliathLabel.Text = "GOLIATH!"
				goliathLabel.ZIndex = 96
				goliathLabel.Parent = rootFrame
				screenFlash(Color3.fromRGB(255, 80, 40), 0.4, 0.4)
				screenShake(8, 0.3)
				task.delay(2.5, function()
					if goliathLabel.Parent then
						for step = 1, 8 do
							goliathLabel.TextTransparency = step / 8
							task.wait(0.04)
						end
						goliathLabel:Destroy()
					end
				end)
			end
		else
			giantKillCount = 0
		end
	end
end)

-- Reset giant kills on size change away from giant
SizeChange.OnClientEvent:Connect(function(newSize)
	if newSize ~= "giant" then
		giantKillCount = 0
	end
end)

----------------------------------------------------------------------------
-- POLISH: DAVID! popup for killing a giant while tiny
----------------------------------------------------------------------------
KillFeed.OnClientEvent:Connect(function(message, attackerName, _victimName)
	if attackerName == localPlayer.Name and currentSize == "tiny" then
		local msgStr = tostring(message)
		if string.find(msgStr, "GIANT") or string.find(msgStr, "giant") then
			local davidLabel = Instance.new("TextLabel")
			davidLabel.Size = UDim2.fromOffset(360, 60)
			davidLabel.Position = UDim2.new(0.5, -180, 0.22, 0)
			davidLabel.BackgroundTransparency = 1
			davidLabel.Font = Enum.Font.GothamBlack
			davidLabel.TextScaled = true
			davidLabel.TextColor3 = Color3.fromRGB(80, 200, 255)
			davidLabel.TextStrokeTransparency = 0.15
			davidLabel.TextStrokeColor3 = Color3.fromRGB(0, 40, 80)
			davidLabel.Text = "DAVID!"
			davidLabel.ZIndex = 96
			davidLabel.Parent = rootFrame
			screenFlash(Color3.fromRGB(80, 200, 255), 0.4, 0.4)
			screenShake(8, 0.3)
			task.delay(2.5, function()
				if davidLabel.Parent then
					for step = 1, 8 do
						davidLabel.TextTransparency = step / 8
						task.wait(0.04)
					end
					davidLabel:Destroy()
				end
			end)
		end
	end
end)
