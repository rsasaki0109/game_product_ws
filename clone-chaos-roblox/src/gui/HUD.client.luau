-- HUD
-- Clone Chaos: clone count, HP, score, cooldowns, kill feed, disguise prompt, result screen
-- POLISHED: clone command mode selector, deception stats, clone explosion button,
--           enhanced kill feed, "Was it real?" popup

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local localPlayer = Players.LocalPlayer
local playerGui = localPlayer:WaitForChild("PlayerGui")

local MatchStateChanged = ReplicatedStorage:WaitForChild("MatchStateChanged")
local MatchCountdown = ReplicatedStorage:WaitForChild("MatchCountdown")
local PlayFeed = ReplicatedStorage:WaitForChild("PlayFeed")
local SpawnCloneRequest = ReplicatedStorage:WaitForChild("SpawnCloneRequest")
local RecallClonesRequest = ReplicatedStorage:WaitForChild("RecallClonesRequest")
local MarkRequest = ReplicatedStorage:WaitForChild("MarkRequest")
local DisguiseRequest = ReplicatedStorage:WaitForChild("DisguiseRequest")
local PunchRequest = ReplicatedStorage:WaitForChild("PunchRequest")
local ActionCooldown = ReplicatedStorage:WaitForChild("ActionCooldown")
local PlayerStatsChanged = ReplicatedStorage:WaitForChild("PlayerStatsChanged")
local KillFeed = ReplicatedStorage:WaitForChild("KillFeed")
local CloneCountChanged = ReplicatedStorage:WaitForChild("CloneCountChanged")
local DisguiseEffect = ReplicatedStorage:WaitForChild("DisguiseEffect")
local CloneModeRequest = ReplicatedStorage:WaitForChild("CloneModeRequest")
local CloneExplodeRequest = ReplicatedStorage:WaitForChild("CloneExplodeRequest")
local WasItReal = ReplicatedStorage:WaitForChild("WasItReal")
local DeceptionStat = ReplicatedStorage:WaitForChild("DeceptionStat")

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "CloneChaosHUD"
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
stateLabel.Size = UDim2.fromScale(0.2, 0.5)
stateLabel.Position = UDim2.fromScale(0.02, 0.06)
stateLabel.TextXAlignment = Enum.TextXAlignment.Left
stateLabel.BackgroundTransparency = 1
stateLabel.Font = Enum.Font.GothamBold
stateLabel.TextColor3 = Color3.fromRGB(244, 244, 244)
stateLabel.TextScaled = true
stateLabel.Text = "Lobby"
stateLabel.Parent = topFrame

local timerLabel = Instance.new("TextLabel")
timerLabel.Size = UDim2.fromScale(0.12, 0.5)
timerLabel.Position = UDim2.fromScale(0.22, 0.06)
timerLabel.BackgroundTransparency = 1
timerLabel.Font = Enum.Font.GothamBold
timerLabel.TextColor3 = Color3.fromRGB(255, 236, 135)
timerLabel.TextScaled = true
timerLabel.Text = "--"
timerLabel.Parent = topFrame

local scoreLabel = Instance.new("TextLabel")
scoreLabel.Size = UDim2.fromScale(0.15, 0.5)
scoreLabel.Position = UDim2.fromScale(0.36, 0.06)
scoreLabel.BackgroundTransparency = 1
scoreLabel.Font = Enum.Font.GothamBold
scoreLabel.TextColor3 = Color3.fromRGB(255, 200, 60)
scoreLabel.TextScaled = true
scoreLabel.Text = "Score: 0"
scoreLabel.Parent = topFrame

local cloneCountLabel = Instance.new("TextLabel")
cloneCountLabel.Size = UDim2.fromScale(0.15, 0.5)
cloneCountLabel.Position = UDim2.fromScale(0.53, 0.06)
cloneCountLabel.BackgroundTransparency = 1
cloneCountLabel.Font = Enum.Font.GothamBold
cloneCountLabel.TextColor3 = Color3.fromRGB(150, 200, 255)
cloneCountLabel.TextScaled = true
cloneCountLabel.Text = "Clones: 0/3"
cloneCountLabel.Parent = topFrame

-- Deception stat display
local deceptionLabel = Instance.new("TextLabel")
deceptionLabel.Size = UDim2.fromScale(0.18, 0.5)
deceptionLabel.Position = UDim2.fromScale(0.70, 0.06)
deceptionLabel.TextXAlignment = Enum.TextXAlignment.Right
deceptionLabel.BackgroundTransparency = 1
deceptionLabel.Font = Enum.Font.GothamBold
deceptionLabel.TextColor3 = Color3.fromRGB(180, 120, 255)
deceptionLabel.TextScaled = true
deceptionLabel.Text = "Fooled: 0"
deceptionLabel.Parent = topFrame

-- Clone Mode indicator
local cloneModeLabel = Instance.new("TextLabel")
cloneModeLabel.Size = UDim2.fromScale(0.12, 0.4)
cloneModeLabel.Position = UDim2.fromScale(0.02, 0.55)
cloneModeLabel.TextXAlignment = Enum.TextXAlignment.Left
cloneModeLabel.BackgroundTransparency = 1
cloneModeLabel.Font = Enum.Font.GothamBlack
cloneModeLabel.TextColor3 = Color3.fromRGB(255, 100, 80)
cloneModeLabel.TextScaled = true
cloneModeLabel.Text = "Mode: AGG"
cloneModeLabel.Parent = topFrame

-- HP bar
local hpFrame = Instance.new("Frame")
hpFrame.Size = UDim2.fromOffset(160, 22)
hpFrame.Position = UDim2.new(0, 20, 0.5, -50)
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
hpLabel.Text = "100/100"
hpLabel.ZIndex = 2
hpLabel.Parent = hpFrame

-- Clone HP indicators
local cloneHPFrame = Instance.new("Frame")
cloneHPFrame.Size = UDim2.fromOffset(160, 60)
cloneHPFrame.Position = UDim2.new(0, 20, 0.5, -22)
cloneHPFrame.BackgroundTransparency = 1
cloneHPFrame.Parent = rootFrame

local cloneHPBars = {}
for i = 1, 3 do
	local barBg = Instance.new("Frame")
	barBg.Size = UDim2.new(1, 0, 0, 14)
	barBg.Position = UDim2.fromOffset(0, (i - 1) * 18)
	barBg.BackgroundColor3 = Color3.fromRGB(30, 30, 40)
	barBg.BorderSizePixel = 0
	barBg.Visible = false
	barBg.Parent = cloneHPFrame

	local barCorner = Instance.new("UICorner")
	barCorner.CornerRadius = UDim.new(0, 3)
	barCorner.Parent = barBg

	local barFill = Instance.new("Frame")
	barFill.Size = UDim2.fromScale(1, 1)
	barFill.BackgroundColor3 = Color3.fromRGB(100, 180, 255)
	barFill.BorderSizePixel = 0
	barFill.Parent = barBg

	local barFillCorner = Instance.new("UICorner")
	barFillCorner.CornerRadius = UDim.new(0, 3)
	barFillCorner.Parent = barFill

	local barLabel = Instance.new("TextLabel")
	barLabel.Size = UDim2.fromScale(1, 1)
	barLabel.BackgroundTransparency = 1
	barLabel.Font = Enum.Font.GothamBold
	barLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
	barLabel.TextScaled = true
	barLabel.Text = string.format("Clone %d", i)
	barLabel.ZIndex = 2
	barLabel.Parent = barBg

	cloneHPBars[i] = { bg = barBg, fill = barFill, label = barLabel }
end

-- Clone Mode Selector (AGGRESSIVE / DEFENSIVE / DECOY)
local modeSelectorFrame = Instance.new("Frame")
modeSelectorFrame.Size = UDim2.fromOffset(280, 40)
modeSelectorFrame.Position = UDim2.new(0, 20, 0.5, 44)
modeSelectorFrame.BackgroundTransparency = 1
modeSelectorFrame.Parent = rootFrame

local modeButtons = {}
local modeConfigs = {
	{ name = "AGGRESSIVE", short = "AGG", color = Color3.fromRGB(255, 80, 60) },
	{ name = "DEFENSIVE", short = "DEF", color = Color3.fromRGB(60, 180, 255) },
	{ name = "DECOY", short = "DCY", color = Color3.fromRGB(180, 120, 255) },
}

for i, cfg in modeConfigs do
	local btn = Instance.new("TextButton")
	btn.Size = UDim2.fromOffset(86, 36)
	btn.Position = UDim2.fromOffset((i - 1) * 92, 0)
	btn.BackgroundColor3 = cfg.color
	btn.TextColor3 = Color3.fromRGB(255, 255, 255)
	btn.Font = Enum.Font.GothamBold
	btn.TextScaled = true
	btn.Text = cfg.short
	btn.BorderSizePixel = 0
	btn.Parent = modeSelectorFrame

	local btnCorner = Instance.new("UICorner")
	btnCorner.CornerRadius = UDim.new(0, 6)
	btnCorner.Parent = btn

	btn.MouseButton1Click:Connect(function()
		CloneModeRequest:FireServer(cfg.name)
	end)

	modeButtons[cfg.name] = btn
end

-- Clone Explosion button
local explodeButton = Instance.new("TextButton")
explodeButton.Size = UDim2.fromOffset(120, 36)
explodeButton.Position = UDim2.new(0, 20, 0.5, 88)
explodeButton.BackgroundColor3 = Color3.fromRGB(200, 60, 255)
explodeButton.TextColor3 = Color3.fromRGB(255, 255, 255)
explodeButton.Font = Enum.Font.GothamBlack
explodeButton.TextScaled = true
explodeButton.Text = "EXPLODE [G]"
explodeButton.BorderSizePixel = 0
explodeButton.Visible = false
explodeButton.Parent = rootFrame

local explodeBtnCorner = Instance.new("UICorner")
explodeBtnCorner.CornerRadius = UDim.new(0, 8)
explodeBtnCorner.Parent = explodeButton

explodeButton.MouseButton1Click:Connect(function()
	CloneExplodeRequest:FireServer()
end)

-- "Was it real?" popup
local wasItRealLabel = Instance.new("TextLabel")
wasItRealLabel.Size = UDim2.fromOffset(300, 50)
wasItRealLabel.Position = UDim2.new(0.5, -150, 0.35, 0)
wasItRealLabel.BackgroundTransparency = 1
wasItRealLabel.Font = Enum.Font.GothamBlack
wasItRealLabel.TextColor3 = Color3.fromRGB(180, 120, 255)
wasItRealLabel.TextScaled = true
wasItRealLabel.TextStrokeTransparency = 0.2
wasItRealLabel.Text = "Was it real...?"
wasItRealLabel.Visible = false
wasItRealLabel.ZIndex = 95
wasItRealLabel.Parent = screenGui

-- Cooldown display
local cooldownFrame = Instance.new("Frame")
cooldownFrame.Size = UDim2.fromOffset(500, 28)
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
cooldownLabel.Text = "Q: Clone | E: Recall | F: Mark | R: Disguise | G: Explode | Click: Punch"
cooldownLabel.Parent = cooldownFrame

-- Disguise ready prompt
local disguisePrompt = Instance.new("TextLabel")
disguisePrompt.Size = UDim2.fromOffset(300, 40)
disguisePrompt.Position = UDim2.new(0.5, -150, 0.22, 0)
disguisePrompt.BackgroundTransparency = 1
disguisePrompt.Font = Enum.Font.GothamBlack
disguisePrompt.TextColor3 = Color3.fromRGB(180, 120, 255)
disguisePrompt.TextScaled = true
disguisePrompt.TextStrokeTransparency = 0.3
disguisePrompt.Text = "DISGUISE READY! [R]"
disguisePrompt.Visible = false
disguisePrompt.ZIndex = 95
disguisePrompt.Parent = screenGui

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

-- Feed frame
local feedFrame = Instance.new("Frame")
feedFrame.Size = UDim2.fromOffset(400, 180)
feedFrame.Position = UDim2.new(1, -412, 0, 90)
feedFrame.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
feedFrame.BackgroundTransparency = 0.62
feedFrame.BorderSizePixel = 0
feedFrame.Parent = rootFrame

local feedCornerUI = Instance.new("UICorner")
feedCornerUI.CornerRadius = UDim.new(0, 6)
feedCornerUI.Parent = feedFrame

-- Mobile buttons
local cloneButton = Instance.new("TextButton")
cloneButton.Size = UDim2.fromOffset(70, 50)
cloneButton.Position = UDim2.new(1, -480, 1, -138)
cloneButton.BackgroundColor3 = Color3.fromRGB(100, 180, 255)
cloneButton.TextColor3 = Color3.fromRGB(255, 255, 255)
cloneButton.Font = Enum.Font.GothamBold
cloneButton.TextScaled = true
cloneButton.Text = "CLONE"
cloneButton.Visible = UserInputService.TouchEnabled
cloneButton.Parent = rootFrame

local recallButton = Instance.new("TextButton")
recallButton.Size = UDim2.fromOffset(70, 50)
recallButton.Position = UDim2.new(1, -400, 1, -138)
recallButton.BackgroundColor3 = Color3.fromRGB(80, 200, 120)
recallButton.TextColor3 = Color3.fromRGB(255, 255, 255)
recallButton.Font = Enum.Font.GothamBold
recallButton.TextScaled = true
recallButton.Text = "RECALL"
recallButton.Visible = UserInputService.TouchEnabled
recallButton.Parent = rootFrame

local markButton = Instance.new("TextButton")
markButton.Size = UDim2.fromOffset(70, 50)
markButton.Position = UDim2.new(1, -320, 1, -138)
markButton.BackgroundColor3 = Color3.fromRGB(255, 200, 60)
markButton.TextColor3 = Color3.fromRGB(255, 255, 255)
markButton.Font = Enum.Font.GothamBold
markButton.TextScaled = true
markButton.Text = "MARK"
markButton.Visible = UserInputService.TouchEnabled
markButton.Parent = rootFrame

local disguiseButton = Instance.new("TextButton")
disguiseButton.Size = UDim2.fromOffset(70, 50)
disguiseButton.Position = UDim2.new(1, -240, 1, -138)
disguiseButton.BackgroundColor3 = Color3.fromRGB(180, 120, 255)
disguiseButton.TextColor3 = Color3.fromRGB(255, 255, 255)
disguiseButton.Font = Enum.Font.GothamBold
disguiseButton.TextScaled = true
disguiseButton.Text = "SWAP"
disguiseButton.Visible = UserInputService.TouchEnabled
disguiseButton.Parent = rootFrame

local explodeMobileBtn = Instance.new("TextButton")
explodeMobileBtn.Size = UDim2.fromOffset(70, 50)
explodeMobileBtn.Position = UDim2.new(1, -160, 1, -138)
explodeMobileBtn.BackgroundColor3 = Color3.fromRGB(200, 60, 255)
explodeMobileBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
explodeMobileBtn.Font = Enum.Font.GothamBold
explodeMobileBtn.TextScaled = true
explodeMobileBtn.Text = "BOOM"
explodeMobileBtn.Visible = UserInputService.TouchEnabled
explodeMobileBtn.Parent = rootFrame

local punchMobileButton = Instance.new("TextButton")
punchMobileButton.Size = UDim2.fromOffset(70, 50)
punchMobileButton.Position = UDim2.new(1, -80, 1, -138)
punchMobileButton.BackgroundColor3 = Color3.fromRGB(245, 101, 56)
punchMobileButton.TextColor3 = Color3.fromRGB(255, 255, 255)
punchMobileButton.Font = Enum.Font.GothamBold
punchMobileButton.TextScaled = true
punchMobileButton.Text = "PUNCH"
punchMobileButton.Visible = UserInputService.TouchEnabled
punchMobileButton.Parent = rootFrame

-- Hint label
local hintLabel = Instance.new("TextLabel")
hintLabel.Size = UDim2.fromOffset(600, 28)
hintLabel.Position = UDim2.new(0.5, -300, 1, -34)
hintLabel.BackgroundTransparency = 1
hintLabel.Font = Enum.Font.GothamMedium
hintLabel.TextColor3 = Color3.fromRGB(232, 232, 232)
hintLabel.TextScaled = true
hintLabel.Text = "Q: Clone | E: Recall | F: Mark | R: Disguise | G: Explode | 1/2/3: Mode | Click: Punch"
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
local currentScore = 0
local currentHP = 100
local currentMaxHP = 100
local currentCloneCount = 0
local currentCloneHPs = {}
local currentCloneMode = "AGGRESSIVE"
local currentEnemiesFooled = 0
local shakeUntil = 0
local shakeIntensity = 0
local feedLabels = {}

local cooldownUntil = {
	SpawnClone = 0,
	Recall = 0,
	Mark = 0,
	Disguise = 0,
	Punch = 0,
	CloneExplode = 0,
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
		label.Position = UDim2.fromOffset(10, (index - 1) * 32 + 6)
	end
end

local function addFeed(message: string, color: Color3, lifetime: number?)
	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(1, -20, 0, 26)
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
		line.Position = UDim2.fromOffset(10, (index - 1) * 32 + 6)
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

local function cooldownText(actionName: string)
	local remain = cooldownUntil[actionName] - tick()
	if remain <= 0 then return "Ready" end
	return string.format("%.1fs", remain)
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

local function updateCloneHPDisplay()
	for i = 1, 3 do
		local bar = cloneHPBars[i]
		if i <= currentCloneCount and currentCloneHPs[i] then
			bar.bg.Visible = true
			local ratio = currentCloneHPs[i] / 40
			bar.fill.Size = UDim2.fromScale(math.clamp(ratio, 0, 1), 1)
			bar.label.Text = string.format("Clone %d: %d", i, currentCloneHPs[i])
		else
			bar.bg.Visible = false
		end
	end
end

local function updateModeDisplay()
	for modeName, btn in modeButtons do
		if modeName == currentCloneMode then
			btn.BackgroundTransparency = 0
		else
			btn.BackgroundTransparency = 0.5
		end
	end

	local modeShortNames = { AGGRESSIVE = "AGG", DEFENSIVE = "DEF", DECOY = "DCY" }
	local modeColors = {
		AGGRESSIVE = Color3.fromRGB(255, 100, 80),
		DEFENSIVE = Color3.fromRGB(60, 180, 255),
		DECOY = Color3.fromRGB(180, 120, 255),
	}
	cloneModeLabel.Text = string.format("Mode: %s", modeShortNames[currentCloneMode] or "AGG")
	cloneModeLabel.TextColor3 = modeColors[currentCloneMode] or Color3.fromRGB(255, 100, 80)
end

-- Input handling
UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end

	if input.KeyCode == Enum.KeyCode.Q then
		SpawnCloneRequest:FireServer()
	elseif input.KeyCode == Enum.KeyCode.E then
		RecallClonesRequest:FireServer()
	elseif input.KeyCode == Enum.KeyCode.F then
		local char = localPlayer.Character
		if char then
			local root = char:FindFirstChild("HumanoidRootPart")
			if root then
				local target = root.Position + root.CFrame.LookVector * 20
				MarkRequest:FireServer(target)
			end
		end
	elseif input.KeyCode == Enum.KeyCode.R then
		DisguiseRequest:FireServer()
	elseif input.KeyCode == Enum.KeyCode.G then
		CloneExplodeRequest:FireServer()
	elseif input.KeyCode == Enum.KeyCode.One then
		CloneModeRequest:FireServer("AGGRESSIVE")
	elseif input.KeyCode == Enum.KeyCode.Two then
		CloneModeRequest:FireServer("DEFENSIVE")
	elseif input.KeyCode == Enum.KeyCode.Three then
		CloneModeRequest:FireServer("DECOY")
	elseif input.UserInputType == Enum.UserInputType.MouseButton1 then
		PunchRequest:FireServer()
	end
end)

-- Mobile button handlers
cloneButton.MouseButton1Click:Connect(function()
	SpawnCloneRequest:FireServer()
end)
recallButton.MouseButton1Click:Connect(function()
	RecallClonesRequest:FireServer()
end)
markButton.MouseButton1Click:Connect(function()
	local char = localPlayer.Character
	if char then
		local root = char:FindFirstChild("HumanoidRootPart")
		if root then
			MarkRequest:FireServer(root.Position + root.CFrame.LookVector * 20)
		end
	end
end)
disguiseButton.MouseButton1Click:Connect(function()
	DisguiseRequest:FireServer()
end)
explodeMobileBtn.MouseButton1Click:Connect(function()
	CloneExplodeRequest:FireServer()
end)
punchMobileButton.MouseButton1Click:Connect(function()
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
			resultStats.Text = string.format("%d points", payload.score or 0)
		end
	end
end)

MatchCountdown.OnClientEvent:Connect(function(remaining)
	if remaining > 0 then
		countdownLabel.Visible = true
		countdownLabel.Text = tostring(remaining)
		screenFlash(Color3.fromRGB(255, 255, 255), 0.2, 0.15)
		-- Countdown pop effect
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
	if stats.hp then
		currentHP = stats.hp
		currentMaxHP = stats.maxHp or currentMaxHP
		updateHPDisplay()
	end
	if stats.score then
		currentScore = stats.score
		scoreLabel.Text = string.format("Score: %d", currentScore)
	end
	if stats.cloneCount then
		currentCloneCount = stats.cloneCount
		cloneCountLabel.Text = string.format("Clones: %d/%d", stats.cloneCount, stats.maxClones or 3)
	end
	if stats.cloneHPs then
		currentCloneHPs = stats.cloneHPs
		updateCloneHPDisplay()
	end
	if stats.cloneMode then
		currentCloneMode = stats.cloneMode
		updateModeDisplay()
	end
	if stats.enemiesFooled then
		currentEnemiesFooled = stats.enemiesFooled
		deceptionLabel.Text = string.format("Fooled: %d", currentEnemiesFooled)
	end
end)

KillFeed.OnClientEvent:Connect(function(message, attackerName, victimName)
	local color = Color3.fromRGB(255, 255, 255)
	local msgStr = tostring(message)

	if attackerName == localPlayer.Name then
		color = Color3.fromRGB(80, 255, 80)
	elseif victimName == localPlayer.Name then
		color = Color3.fromRGB(255, 80, 80)
	end

	-- Highlight real kills vs clone kills
	if string.find(msgStr, "REAL BODY") then
		color = Color3.fromRGB(255, 220, 60)
		screenFlash(Color3.fromRGB(255, 200, 60), 0.4, 0.4)
		screenShake(8, 0.3)
	elseif string.find(msgStr, "CLONE") then
		screenFlash(Color3.fromRGB(200, 200, 255), 0.2, 0.2)
	end
	if string.find(msgStr, "EXPLOSION") then
		screenFlash(Color3.fromRGB(180, 60, 255), 0.4, 0.5)
		screenShake(10, 0.4)
	end

	addFeed(msgStr, color, 3)
end)

PlayFeed.OnClientEvent:Connect(function(message, color, duration)
	addFeed(tostring(message), color or Color3.fromRGB(255, 255, 255), duration)
end)

CloneCountChanged.OnClientEvent:Connect(function(count)
	currentCloneCount = count
	cloneCountLabel.Text = string.format("Clones: %d/3", count)
end)

DisguiseEffect.OnClientEvent:Connect(function(playerName)
	if playerName == localPlayer.Name then
		screenFlash(Color3.fromRGB(180, 120, 255), 0.3, 0.5)
		screenShake(6, 0.2)
	else
		screenFlash(Color3.fromRGB(180, 120, 255), 0.15, 0.1)
	end
end)

-- "Was it real?" popup
WasItReal.OnClientEvent:Connect(function()
	wasItRealLabel.Visible = true
	wasItRealLabel.TextTransparency = 0
	screenFlash(Color3.fromRGB(180, 120, 255), 0.3, 0.2)

	task.spawn(function()
		task.wait(1.5)
		for step = 1, 8 do
			wasItRealLabel.TextTransparency = step / 8
			task.wait(0.05)
		end
		wasItRealLabel.Visible = false
	end)
end)

-- Deception stat update
DeceptionStat.OnClientEvent:Connect(function(count)
	currentEnemiesFooled = count
	deceptionLabel.Text = string.format("Fooled: %d", count)

	-- Brief glow
	deceptionLabel.TextColor3 = Color3.fromRGB(255, 200, 60)
	task.delay(0.5, function()
		deceptionLabel.TextColor3 = Color3.fromRGB(180, 120, 255)
	end)
end)

ActionCooldown.OnClientEvent:Connect(function(actionName, duration)
	if cooldownUntil[actionName] ~= nil then
		cooldownUntil[actionName] = tick() + (tonumber(duration) or 0)
	end
end)

-- Render loop
RunService.RenderStepped:Connect(function()
	-- Cooldown text
	cooldownLabel.Text = string.format(
		"Clone: %s | Recall: %s | Mark: %s | Disguise: %s | Explode: %s | Punch: %s",
		cooldownText("SpawnClone"),
		cooldownText("Recall"),
		cooldownText("Mark"),
		cooldownText("Disguise"),
		cooldownText("CloneExplode"),
		cooldownText("Punch")
	)

	-- Disguise ready prompt
	local disguiseReady = cooldownUntil.Disguise - tick() <= 0 and currentCloneCount > 0
	disguisePrompt.Visible = disguiseReady and currentMatchState == "Playing"
	if disguiseReady then
		local pulse = math.abs(math.sin(tick() * 3))
		disguisePrompt.TextColor3 = Color3.fromRGB(
			math.floor(150 + 105 * pulse),
			math.floor(80 + 80 * pulse),
			255
		)
	end

	-- Clone explode button visibility (show when near a clone during Playing)
	local showExplode = false
	if currentMatchState == "Playing" and currentCloneCount > 0 then
		local char = localPlayer.Character
		local root = char and char:FindFirstChild("HumanoidRootPart")
		if root then
			-- Check for nearby clones (looking for models with IsClone attribute)
			for _, obj in workspace:GetChildren() do
				if obj:GetAttribute("IsClone") and obj:GetAttribute("OwnerName") == localPlayer.Name then
					local cr = obj:FindFirstChild("HumanoidRootPart")
					if cr and (cr.Position - root.Position).Magnitude <= 10 then
						showExplode = true
						break
					end
				end
			end
		end
	end
	explodeButton.Visible = showExplode

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

	-- Animated title pulse in Lobby
	if currentMatchState == "Lobby" then
		local scale = 1.0 + 0.1 * math.sin(tick() * 3)
		stateLabel.Size = UDim2.fromScale(0.2 * scale, 0.5 * scale)
	else
		stateLabel.Size = UDim2.fromScale(0.2, 0.5)
	end

	-- Show/hide elements based on game state
	local isPlaying = currentMatchState == "Playing"
	modeSelectorFrame.Visible = isPlaying
	cloneModeLabel.Visible = isPlaying
end)

----------------------------------------------------------------------------
-- Session Best score tracking
----------------------------------------------------------------------------
local sessionBestScore = 0

local polishBestLabel = Instance.new("TextLabel")
polishBestLabel.Size = UDim2.fromScale(0.5, 0.07)
polishBestLabel.Position = UDim2.fromScale(0.25, 0.56)
polishBestLabel.BackgroundTransparency = 1
polishBestLabel.Font = Enum.Font.GothamBold
polishBestLabel.TextScaled = true
polishBestLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
polishBestLabel.TextStrokeTransparency = 0.5
polishBestLabel.Text = ""
polishBestLabel.ZIndex = 91
polishBestLabel.Visible = false
polishBestLabel.Parent = resultFrame

MatchStateChanged.OnClientEvent:Connect(function(state, _payload)
	if state == "Result" then
		local isNew = currentScore > sessionBestScore and sessionBestScore > 0
		if currentScore > sessionBestScore then
			sessionBestScore = currentScore
		end
		localPlayer:SetAttribute("SessionBestScore", sessionBestScore)
		polishBestLabel.Text = string.format("Session Best: %d pts", sessionBestScore)
		polishBestLabel.Visible = true
	elseif state == "Lobby" then
		polishBestLabel.Visible = false
	end
end)
