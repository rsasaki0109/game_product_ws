-- HUD.client.luau
-- Echo Tag: sonar-themed HUD with role display, cooldowns, echo pulse visuals,
-- kill feed, timer urgency, result screen, mobile buttons

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local stateFolder = ReplicatedStorage:WaitForChild("EchoTagState")

-- Remotes
local EchoPulseRequest = ReplicatedStorage:WaitForChild("EchoPulseRequest")
local DecoyRequest = ReplicatedStorage:WaitForChild("DecoyRequest")
local SprintRequest = ReplicatedStorage:WaitForChild("SprintRequest")
local PlayerStateUpdate = ReplicatedStorage:WaitForChild("PlayerStateUpdate")
local MatchResult = ReplicatedStorage:WaitForChild("MatchResult")
local TagEvent = ReplicatedStorage:WaitForChild("TagEvent")
local EchoPulseVisual = ReplicatedStorage:WaitForChild("EchoPulseVisual")
local DecoyPulseVisual = ReplicatedStorage:WaitForChild("DecoyPulseVisual")
local PlayerRevealed = ReplicatedStorage:WaitForChild("PlayerRevealed")
local GameFeed = ReplicatedStorage:WaitForChild("GameFeed")

----------------------------------------------------------------------------
-- Player state (synced from server)
----------------------------------------------------------------------------
local isTagger = false
local echoCooldown = 0
local decoyCooldown = 0
local sprintCooldown = 0
local isSprinting = false
local tagCount = 0
local matchTime = 0

----------------------------------------------------------------------------
-- Screen GUI
----------------------------------------------------------------------------
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "EchoTagHUD"
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
-- Flash & Shake
----------------------------------------------------------------------------
local flashOverlay = Instance.new("Frame")
flashOverlay.Size = UDim2.fromScale(1, 1)
flashOverlay.BackgroundColor3 = Color3.fromRGB(60, 180, 255)
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
-- Sonar ring visual overlay (2D ring that expands on screen)
----------------------------------------------------------------------------
local sonarRing = Instance.new("Frame")
sonarRing.Size = UDim2.fromOffset(10, 10)
sonarRing.Position = UDim2.new(0.5, 0, 0.5, 0)
sonarRing.AnchorPoint = Vector2.new(0.5, 0.5)
sonarRing.BackgroundTransparency = 1
sonarRing.BorderSizePixel = 0
sonarRing.Visible = false
sonarRing.Parent = screenGui

local sonarStroke = Instance.new("UIStroke")
sonarStroke.Thickness = 3
sonarStroke.Color = Color3.fromRGB(60, 180, 255)
sonarStroke.Transparency = 0
sonarStroke.Parent = sonarRing

local sonarCorner = Instance.new("UICorner")
sonarCorner.CornerRadius = UDim.new(0.5, 0)
sonarCorner.Parent = sonarRing

local function playSonarRingEffect(color: Color3)
	sonarStroke.Color = color
	sonarRing.Visible = true
	sonarRing.Size = UDim2.fromOffset(10, 10)
	sonarStroke.Transparency = 0

	task.spawn(function()
		local duration = 0.8
		local steps = 20
		for step = 1, steps do
			local frac = step / steps
			local size = 10 + 600 * frac
			sonarRing.Size = UDim2.fromOffset(size, size)
			sonarStroke.Transparency = frac * 0.8
			sonarStroke.Thickness = math.max(1, 3 * (1 - frac))
			task.wait(duration / steps)
		end
		sonarRing.Visible = false
	end)
end

----------------------------------------------------------------------------
-- Top Bar
----------------------------------------------------------------------------
local topBar = makeFrame({
	Size = UDim2.new(0, 420, 0, 70),
	Position = UDim2.new(0.5, 0, 0, 10),
	AnchorPoint = Vector2.new(0.5, 0),
	BackgroundColor3 = Color3.fromRGB(8, 12, 25),
	BackgroundTransparency = 0.16,
	Corner = 14,
	Parent = rootFrame,
})

local titleLabel = makeLabel({
	Size = UDim2.new(0.5, -10, 0, 28),
	Position = UDim2.fromOffset(12, 6),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(60, 180, 255),
	TextXAlignment = Enum.TextXAlignment.Left,
	Text = "Echo Tag",
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

local tagCountLabel = makeLabel({
	Size = UDim2.new(0, 100, 0, 28),
	Position = UDim2.new(1, -110, 0, 6),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(255, 200, 80),
	TextXAlignment = Enum.TextXAlignment.Right,
	Text = "Tags: 0",
	Parent = topBar,
})

----------------------------------------------------------------------------
-- Role Indicator
----------------------------------------------------------------------------
local roleFrame = makeFrame({
	Size = UDim2.new(0, 220, 0, 50),
	Position = UDim2.new(0.5, 0, 0, 88),
	AnchorPoint = Vector2.new(0.5, 0),
	BackgroundColor3 = Color3.fromRGB(20, 20, 30),
	BackgroundTransparency = 0.25,
	Corner = 12,
	Parent = rootFrame,
})

local roleLabel = makeLabel({
	Size = UDim2.new(1, -10, 1, 0),
	Position = UDim2.fromOffset(5, 0),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(100, 200, 255),
	Text = "HIDER",
	Parent = roleFrame,
})

local roleStroke = Instance.new("UIStroke")
roleStroke.Thickness = 2
roleStroke.Color = Color3.fromRGB(60, 180, 255)
roleStroke.Parent = roleFrame

----------------------------------------------------------------------------
-- Sprint Indicator
----------------------------------------------------------------------------
local sprintLabel = makeLabel({
	Size = UDim2.new(0, 160, 0, 30),
	Position = UDim2.new(0.5, 0, 0, 144),
	AnchorPoint = Vector2.new(0.5, 0),
	Font = Enum.Font.GothamBold,
	TextColor3 = Color3.fromRGB(120, 255, 120),
	Text = "",
	Parent = rootFrame,
})

----------------------------------------------------------------------------
-- Cooldown Display
----------------------------------------------------------------------------
local cooldownFrame = makeFrame({
	Size = UDim2.new(0, 400, 0, 44),
	Position = UDim2.new(0.5, 0, 1, -60),
	AnchorPoint = Vector2.new(0.5, 1),
	BackgroundColor3 = Color3.fromRGB(8, 12, 25),
	BackgroundTransparency = 0.3,
	Corner = 10,
	Parent = rootFrame,
})

local echoCdLabel = makeLabel({
	Size = UDim2.new(0, 120, 0, 36),
	Position = UDim2.fromOffset(8, 4),
	Font = Enum.Font.GothamBold,
	TextColor3 = Color3.fromRGB(60, 180, 255),
	Text = "Echo: Ready",
	TextXAlignment = Enum.TextXAlignment.Left,
	Parent = cooldownFrame,
})

local decoyCdLabel = makeLabel({
	Size = UDim2.new(0, 120, 0, 36),
	Position = UDim2.fromOffset(140, 4),
	Font = Enum.Font.GothamBold,
	TextColor3 = Color3.fromRGB(255, 180, 60),
	Text = "Decoy: Ready",
	TextXAlignment = Enum.TextXAlignment.Center,
	Parent = cooldownFrame,
})

local sprintCdLabel = makeLabel({
	Size = UDim2.new(0, 120, 0, 36),
	Position = UDim2.new(1, -128, 0, 4),
	Font = Enum.Font.GothamBold,
	TextColor3 = Color3.fromRGB(120, 255, 120),
	Text = "Sprint: Ready",
	TextXAlignment = Enum.TextXAlignment.Right,
	Parent = cooldownFrame,
})

----------------------------------------------------------------------------
-- Controls Hint
----------------------------------------------------------------------------
local hintLabel = makeLabel({
	Size = UDim2.new(0, 460, 0, 24),
	Position = UDim2.new(0.5, 0, 1, -16),
	AnchorPoint = Vector2.new(0.5, 1),
	Font = Enum.Font.GothamMedium,
	TextColor3 = Color3.fromRGB(140, 140, 160),
	Text = "Q: Echo Pulse  |  E: Decoy (hiders)  |  F: Sprint",
	Parent = rootFrame,
})

----------------------------------------------------------------------------
-- Feed
----------------------------------------------------------------------------
local feedFrame = makeFrame({
	Size = UDim2.new(0, 360, 0, 150),
	Position = UDim2.new(1, -16, 0, 96),
	AnchorPoint = Vector2.new(1, 0),
	BackgroundColor3 = Color3.fromRGB(0, 0, 0),
	BackgroundTransparency = 0.65,
	Corner = 8,
	Parent = rootFrame,
})

local feedStroke = Instance.new("UIStroke")
feedStroke.Thickness = 1
feedStroke.Transparency = 0.5
feedStroke.Color = Color3.fromRGB(60, 120, 180)
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
		label.Position = UDim2.fromOffset(10, (index - 1) * 28 + 6)
	end
end

local function addFeed(message: string, color: Color3, lifetime: number?)
	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(1, -20, 0, 22)
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
		line.Position = UDim2.fromOffset(10, (index - 1) * 28 + 6)
	end

	while #feedLabels > 5 do
		local oldest = table.remove(feedLabels)
		if oldest then
			oldest:Destroy()
		end
	end

	task.delay(lifetime or 3.5, function()
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
	TextColor3 = Color3.fromRGB(60, 180, 255),
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
	BackgroundColor3 = Color3.fromRGB(8, 12, 25),
	BackgroundTransparency = 0.1,
	Corner = 16,
})
resultFrame.Visible = false
resultFrame.ZIndex = 10

local resultTitle = makeLabel({
	Size = UDim2.new(1, -20, 0, 40),
	Position = UDim2.fromOffset(10, 10),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(60, 180, 255),
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
	Size = UDim2.new(0, 280, 0, 100),
	Position = UDim2.new(1, -20, 1, -80),
	AnchorPoint = Vector2.new(1, 1),
	BackgroundTransparency = 1,
	Parent = rootFrame,
})
mobileFrame.Visible = isMobile

local echoBtn = makeButton({
	Size = UDim2.new(0, 80, 0, 80),
	Position = UDim2.fromOffset(0, 0),
	BackgroundColor3 = Color3.fromRGB(30, 100, 180),
	Text = "ECHO\nQ",
	Corner = 14,
	Parent = mobileFrame,
})

local decoyBtn = makeButton({
	Size = UDim2.new(0, 80, 0, 80),
	Position = UDim2.fromOffset(95, 0),
	BackgroundColor3 = Color3.fromRGB(180, 120, 30),
	Text = "DECOY\nE",
	Corner = 14,
	Parent = mobileFrame,
})

local sprintBtn = makeButton({
	Size = UDim2.new(0, 80, 0, 80),
	Position = UDim2.fromOffset(190, 0),
	BackgroundColor3 = Color3.fromRGB(40, 160, 60),
	Text = "SPRINT\nF",
	Corner = 14,
	Parent = mobileFrame,
})

-- Mobile button events
echoBtn.MouseButton1Click:Connect(function()
	EchoPulseRequest:FireServer()
end)

decoyBtn.MouseButton1Click:Connect(function()
	DecoyRequest:FireServer()
end)

sprintBtn.MouseButton1Click:Connect(function()
	SprintRequest:FireServer()
end)

----------------------------------------------------------------------------
-- Keyboard Input
----------------------------------------------------------------------------
UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then
		return
	end

	if input.KeyCode == Enum.KeyCode.Q then
		EchoPulseRequest:FireServer()
	elseif input.KeyCode == Enum.KeyCode.E then
		DecoyRequest:FireServer()
	elseif input.KeyCode == Enum.KeyCode.F then
		SprintRequest:FireServer()
	end
end)

----------------------------------------------------------------------------
-- Server Events
----------------------------------------------------------------------------
PlayerStateUpdate.OnClientEvent:Connect(function(data)
	if typeof(data) ~= "table" then
		return
	end
	isTagger = data.isTagger or false
	echoCooldown = data.echoCooldown or 0
	decoyCooldown = data.decoyCooldown or 0
	sprintCooldown = data.sprintCooldown or 0
	isSprinting = data.isSprinting or false
	tagCount = data.tagCount or 0
	matchTime = data.matchTime or 0
end)

EchoPulseVisual.OnClientEvent:Connect(function(origin, _range, color, sourceName)
	if sourceName == player.Name then
		playSonarRingEffect(color)
		screenFlash(color, 0.3, 0.2)
	else
		-- Distant echo - subtle flash
		screenFlash(color, 0.15, 0.08)
	end
end)

DecoyPulseVisual.OnClientEvent:Connect(function(_position)
	-- Orange flash for decoy
	screenFlash(Color3.fromRGB(255, 180, 60), 0.2, 0.12)
end)

TagEvent.OnClientEvent:Connect(function(taggerName, taggedName)
	screenFlash(Color3.fromRGB(255, 80, 80), 0.4, 0.35)
	screenShake(6, 0.3)

	if taggedName == player.Name then
		addFeed("YOU WERE TAGGED! You are now the TAGGER!", Color3.fromRGB(255, 80, 80), 4)
	elseif taggerName == player.Name then
		addFeed("You tagged " .. taggedName .. "! You are now a HIDER!", Color3.fromRGB(80, 255, 120), 4)
	end
end)

PlayerRevealed.OnClientEvent:Connect(function(revealedName, revealedIsTagger)
	local color = revealedIsTagger and Color3.fromRGB(255, 80, 80) or Color3.fromRGB(60, 180, 255)
	local roleStr = revealedIsTagger and "TAGGER" or "hider"
	addFeed(string.format("%s revealed! (%s)", revealedName, roleStr), color, 2)
end)

GameFeed.OnClientEvent:Connect(function(message, color)
	addFeed(tostring(message), color or Color3.fromRGB(255, 255, 255))
end)

MatchResult.OnClientEvent:Connect(function(results)
	if typeof(results) ~= "table" then
		return
	end
	resultFrame.Visible = true

	local lines = {}
	for _, entry in ipairs(results) do
		local line = string.format(
			"#%d  %s  [%s]  Tags:%d  +%d pts",
			entry.rank, entry.name, entry.role, entry.tags, entry.score
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
-- UI Refresh Loop
----------------------------------------------------------------------------
local lastCountdownValue = -1

RunService.RenderStepped:Connect(function(_dt)
	-- Top bar: state and timer
	local stateStr = stateFolder:FindFirstChild("State") and stateFolder.State.Value or "Lobby"
	local timerVal = stateFolder:FindFirstChild("Timer") and stateFolder.Timer.Value or 0

	-- Timer urgency: flash red under 15s
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
				countdownLabel.TextColor3 = Color3.fromRGB(60, 180, 255)
			end
			screenFlash(Color3.fromRGB(60, 180, 255), 0.15, 0.12)
		end
		lastCountdownValue = timerVal
	elseif stateStr == "Playing" and lastCountdownValue > 0 then
		countdownLabel.Text = "HUNT!"
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
		isTagger = false
		tagCount = 0
	end

	-- Role indicator
	if isTagger then
		roleLabel.Text = "TAGGER"
		roleLabel.TextColor3 = Color3.fromRGB(255, 80, 80)
		roleStroke.Color = Color3.fromRGB(255, 60, 60)
		roleFrame.BackgroundColor3 = Color3.fromRGB(40, 15, 15)
	else
		roleLabel.Text = "HIDER"
		roleLabel.TextColor3 = Color3.fromRGB(60, 180, 255)
		roleStroke.Color = Color3.fromRGB(60, 180, 255)
		roleFrame.BackgroundColor3 = Color3.fromRGB(10, 20, 35)
	end

	-- Tag count
	tagCountLabel.Text = string.format("Tags: %d", tagCount)

	-- Sprint indicator
	if isSprinting then
		sprintLabel.Text = "SPRINTING!"
		sprintLabel.TextColor3 = Color3.fromRGB(120, 255, 120)
	else
		sprintLabel.Text = ""
	end

	-- Cooldowns
	if echoCooldown > 0.05 then
		echoCdLabel.Text = string.format("Echo: %.1fs", echoCooldown)
		echoCdLabel.TextColor3 = Color3.fromRGB(40, 100, 140)
	else
		echoCdLabel.Text = "Echo: Ready"
		echoCdLabel.TextColor3 = Color3.fromRGB(60, 180, 255)
	end

	if isTagger then
		decoyCdLabel.Text = "Decoy: N/A"
		decoyCdLabel.TextColor3 = Color3.fromRGB(80, 80, 80)
	elseif decoyCooldown > 0.05 then
		decoyCdLabel.Text = string.format("Decoy: %.1fs", decoyCooldown)
		decoyCdLabel.TextColor3 = Color3.fromRGB(140, 100, 40)
	else
		decoyCdLabel.Text = "Decoy: Ready"
		decoyCdLabel.TextColor3 = Color3.fromRGB(255, 180, 60)
	end

	if sprintCooldown > 0.05 then
		sprintCdLabel.Text = string.format("Sprint: %.1fs", sprintCooldown)
		sprintCdLabel.TextColor3 = Color3.fromRGB(60, 100, 60)
	else
		sprintCdLabel.Text = "Sprint: Ready"
		sprintCdLabel.TextColor3 = Color3.fromRGB(120, 255, 120)
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
	roleFrame.Visible = gameActive or stateStr == "Countdown"
	cooldownFrame.Visible = gameActive
	feedFrame.Visible = gameActive or stateStr == "Result"
	hintLabel.Visible = gameActive
	mobileFrame.Visible = isMobile and gameActive
	sprintLabel.Visible = gameActive

	-- Disable decoy button for tagger on mobile
	if isMobile then
		decoyBtn.BackgroundColor3 = isTagger and Color3.fromRGB(60, 60, 60) or Color3.fromRGB(180, 120, 30)
	end

	-- POLISH: Animated title pulse in Lobby
	if stateStr == "Lobby" then
		local scale = 1.0 + 0.1 * math.sin(tick() * 3)
		titleLabel.Size = UDim2.new(0.5 * scale, -10, 0, 28 * scale)
	else
		titleLabel.Size = UDim2.new(0.5, -10, 0, 28)
	end
end)

----------------------------------------------------------------------------
-- POLISH: Session Best tag tracking
----------------------------------------------------------------------------
local sessionBestTags = 0

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
	local isNew = tagCount > sessionBestTags and sessionBestTags > 0
	if tagCount > sessionBestTags then
		sessionBestTags = tagCount
	end
	player:SetAttribute("SessionBestScore", sessionBestTags)
	polishBestLabel.Text = string.format("Session Best: %d tags", sessionBestTags)
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

----------------------------------------------------------------------------
-- POLISH: Quick restart hint
----------------------------------------------------------------------------
local polishRestartHint = makeLabel({
	Size = UDim2.new(1, -20, 0, 18),
	Position = UDim2.fromOffset(10, 280),
	Font = Enum.Font.GothamMedium,
	TextColor3 = Color3.fromRGB(180, 180, 180),
	Text = "Press R for quick restart",
	Parent = resultFrame,
	ZIndex = 11,
})
polishRestartHint.Visible = false

MatchResult.OnClientEvent:Connect(function()
	polishRestartHint.Visible = true
end)

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	local stateChild = stateFolder:FindFirstChild("State")
	local gs = stateChild and stateChild.Value or ""
	if input.KeyCode == Enum.KeyCode.R and (gs == "Result" or resultFrame.Visible) then
		local RestartRequest = ReplicatedStorage:FindFirstChild("RestartRequest")
		if RestartRequest then
			RestartRequest:FireServer()
		end
	end
end)

----------------------------------------------------------------------------
-- POLISH: Screen edge flash on damage
----------------------------------------------------------------------------
local polishDamageEdge = makeFrame({
	Size = UDim2.fromScale(1, 1),
	BackgroundTransparency = 1,
})
polishDamageEdge.ZIndex = 99

local polishEdgeStroke = Instance.new("UIStroke")
polishEdgeStroke.Thickness = 0
polishEdgeStroke.Color = Color3.fromRGB(255, 0, 0)
polishEdgeStroke.Transparency = 1
polishEdgeStroke.Parent = polishDamageEdge

local polishLastHP = nil
RunService.Heartbeat:Connect(function()
	local char = player.Character
	if not char then return end
	local humanoid = char:FindFirstChildWhichIsA("Humanoid")
	if not humanoid then return end
	local hp = humanoid.Health
	if polishLastHP and hp < polishLastHP then
		polishEdgeStroke.Thickness = 8
		polishEdgeStroke.Transparency = 0.2
		task.spawn(function()
			for step = 1, 8 do
				polishEdgeStroke.Transparency = 0.2 + step * 0.1
				polishEdgeStroke.Thickness = 8 - step
				task.wait(0.04)
			end
			polishEdgeStroke.Thickness = 0
			polishEdgeStroke.Transparency = 1
		end)
	end
	polishLastHP = hp
end)

----------------------------------------------------------------------------
-- POLISH: GHOST! popup for surviving 30+ seconds as hider
----------------------------------------------------------------------------
local hiderStartTime = 0
local ghostShown = false

RunService.Heartbeat:Connect(function()
	local stateChild = stateFolder:FindFirstChild("State")
	local gs = stateChild and stateChild.Value or ""
	if gs ~= "Playing" then
		hiderStartTime = 0
		ghostShown = false
		return
	end
	if not isTagger then
		if hiderStartTime == 0 then
			hiderStartTime = tick()
		end
		if not ghostShown and tick() - hiderStartTime >= 30 then
			ghostShown = true
			local ghostLabel = Instance.new("TextLabel")
			ghostLabel.AnchorPoint = Vector2.new(0.5, 0.5)
			ghostLabel.Position = UDim2.fromScale(0.5, 0.3)
			ghostLabel.Size = UDim2.fromOffset(380, 60)
			ghostLabel.BackgroundTransparency = 1
			ghostLabel.Font = Enum.Font.GothamBlack
			ghostLabel.TextScaled = true
			ghostLabel.TextColor3 = Color3.fromRGB(100, 200, 255)
			ghostLabel.TextStrokeTransparency = 0.15
			ghostLabel.TextStrokeColor3 = Color3.fromRGB(0, 30, 80)
			ghostLabel.Text = "GHOST!"
			ghostLabel.ZIndex = 20
			ghostLabel.Parent = screenGui
			screenFlash(Color3.fromRGB(100, 200, 255), 0.3, 0.3)
			playSonarRingEffect(Color3.fromRGB(100, 200, 255))
			task.delay(2.5, function()
				if ghostLabel.Parent then
					for step = 1, 8 do
						ghostLabel.TextTransparency = step / 8
						task.wait(0.04)
					end
					ghostLabel:Destroy()
				end
			end)
		end
	else
		hiderStartTime = 0
		ghostShown = false
	end
end)

-- Reset ghost on role change (tagged)
TagEvent.OnClientEvent:Connect(function(_taggerName, taggedName)
	if taggedName == player.Name then
		hiderStartTime = 0
		ghostShown = false
	end
end)

----------------------------------------------------------------------------
-- POLISH: Remaining hiders count display
----------------------------------------------------------------------------
local hidersCountLabel = makeLabel({
	Size = UDim2.new(0, 140, 0, 26),
	Position = UDim2.new(1, -150, 0, 36),
	Font = Enum.Font.GothamBold,
	TextColor3 = Color3.fromRGB(100, 200, 255),
	TextXAlignment = Enum.TextXAlignment.Right,
	Text = "Hiders: --",
	Parent = topBar,
})

GameFeed.OnClientEvent:Connect(function(message, _color)
	local msgStr = tostring(message)
	-- Try to extract hider count from game feed messages
	local hiderCount = string.match(msgStr, "(%d+) hiders? remaining")
	if hiderCount then
		hidersCountLabel.Text = string.format("Hiders: %s", hiderCount)
	end
end)
