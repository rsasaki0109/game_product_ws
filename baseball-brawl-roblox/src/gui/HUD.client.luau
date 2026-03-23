-- HUD
-- マッチ状態、スコア、ボール支配、フィード、クールダウン表示
-- Release-quality: screen flash, score pop, countdown drama, timer urgency

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local localPlayer = Players.LocalPlayer
local playerGui = localPlayer:WaitForChild("PlayerGui")

local MatchStateChanged = ReplicatedStorage:WaitForChild("MatchStateChanged")
local MatchCountdown = ReplicatedStorage:WaitForChild("MatchCountdown")
local ScoreChanged = ReplicatedStorage:WaitForChild("ScoreChanged")
local BallOwnerChanged = ReplicatedStorage:WaitForChild("BallOwnerChanged")
local PlayFeed = ReplicatedStorage:WaitForChild("PlayFeed")
local ActionCooldown = ReplicatedStorage:WaitForChild("ActionCooldown")
local SwingRequest = ReplicatedStorage:WaitForChild("SwingRequest")
local DashRequest = ReplicatedStorage:WaitForChild("DashRequest")
local RageModeEvent = ReplicatedStorage:WaitForChild("RageModeEvent")

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BaseballBrawlHUD"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.Parent = playerGui

-- Root frame for screen-shake offset
local rootFrame = Instance.new("Frame")
rootFrame.Size = UDim2.fromScale(1, 1)
rootFrame.Position = UDim2.fromScale(0, 0)
rootFrame.BackgroundTransparency = 1
rootFrame.Parent = screenGui

-- Flash overlay
local flashOverlay = Instance.new("Frame")
flashOverlay.Size = UDim2.fromScale(1, 1)
flashOverlay.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
flashOverlay.BackgroundTransparency = 1
flashOverlay.BorderSizePixel = 0
flashOverlay.ZIndex = 100
flashOverlay.Parent = screenGui

local topFrame = Instance.new("Frame")
topFrame.Size = UDim2.new(1, 0, 0, 88)
topFrame.BackgroundColor3 = Color3.fromRGB(14, 16, 22)
topFrame.BackgroundTransparency = 0.22
topFrame.BorderSizePixel = 0
topFrame.Parent = rootFrame

local stateLabel = Instance.new("TextLabel")
stateLabel.Size = UDim2.fromScale(0.32, 0.56)
stateLabel.Position = UDim2.fromScale(0.02, 0.06)
stateLabel.TextXAlignment = Enum.TextXAlignment.Left
stateLabel.BackgroundTransparency = 1
stateLabel.Font = Enum.Font.GothamBold
stateLabel.TextColor3 = Color3.fromRGB(244, 244, 244)
stateLabel.TextScaled = true
stateLabel.Text = "Lobby"
stateLabel.Parent = topFrame

local timerLabel = Instance.new("TextLabel")
timerLabel.Size = UDim2.fromScale(0.2, 0.56)
timerLabel.Position = UDim2.fromScale(0.4, 0.06)
timerLabel.BackgroundTransparency = 1
timerLabel.Font = Enum.Font.GothamBold
timerLabel.TextColor3 = Color3.fromRGB(255, 236, 135)
timerLabel.TextScaled = true
timerLabel.Text = "--"
timerLabel.Parent = topFrame

local scoreLabel = Instance.new("TextLabel")
scoreLabel.Size = UDim2.fromScale(0.34, 0.56)
scoreLabel.Position = UDim2.fromScale(0.64, 0.06)
scoreLabel.TextXAlignment = Enum.TextXAlignment.Right
scoreLabel.BackgroundTransparency = 1
scoreLabel.Font = Enum.Font.GothamBold
scoreLabel.TextColor3 = Color3.fromRGB(244, 244, 244)
scoreLabel.TextScaled = true
scoreLabel.Text = "R 0 : 0 B"
scoreLabel.Parent = topFrame

local ownerLabel = Instance.new("TextLabel")
ownerLabel.Size = UDim2.new(1, -24, 0.36, 0)
ownerLabel.Position = UDim2.new(0, 12, 0.58, 0)
ownerLabel.TextXAlignment = Enum.TextXAlignment.Left
ownerLabel.BackgroundTransparency = 1
ownerLabel.Font = Enum.Font.GothamMedium
ownerLabel.TextColor3 = Color3.fromRGB(224, 224, 224)
ownerLabel.TextScaled = true
ownerLabel.Text = "Ball: Neutral"
ownerLabel.Parent = topFrame

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

local cooldownLabel = Instance.new("TextLabel")
cooldownLabel.Size = UDim2.fromOffset(360, 32)
cooldownLabel.Position = UDim2.new(0, 12, 1, -38)
cooldownLabel.BackgroundTransparency = 1
cooldownLabel.Font = Enum.Font.GothamMedium
cooldownLabel.TextColor3 = Color3.fromRGB(230, 230, 230)
cooldownLabel.TextScaled = true
cooldownLabel.TextXAlignment = Enum.TextXAlignment.Left
cooldownLabel.Text = "Swing: Ready | Dash: Ready"
cooldownLabel.Parent = rootFrame

local hintLabel = Instance.new("TextLabel")
hintLabel.Size = UDim2.fromOffset(460, 32)
hintLabel.Position = UDim2.new(0.5, -230, 1, -38)
hintLabel.BackgroundTransparency = 1
hintLabel.Font = Enum.Font.GothamMedium
hintLabel.TextColor3 = Color3.fromRGB(232, 232, 232)
hintLabel.TextScaled = true
hintLabel.Text = "LMB/F: Swing  |  E/Q/Shift: Dash"
hintLabel.Parent = rootFrame

local feedFrame = Instance.new("Frame")
feedFrame.Size = UDim2.fromOffset(420, 186)
feedFrame.Position = UDim2.new(1, -432, 0, 96)
feedFrame.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
feedFrame.BackgroundTransparency = 0.62
feedFrame.BorderSizePixel = 0
feedFrame.Parent = rootFrame

local feedStroke = Instance.new("UIStroke")
feedStroke.Thickness = 1
feedStroke.Transparency = 0.45
feedStroke.Color = Color3.fromRGB(255, 255, 255)
feedStroke.Parent = feedFrame

local feedCorner = Instance.new("UICorner")
feedCorner.CornerRadius = UDim.new(0, 6)
feedCorner.Parent = feedFrame

local swingButton = Instance.new("TextButton")
swingButton.Size = UDim2.fromOffset(138, 56)
swingButton.Position = UDim2.new(1, -298, 1, -138)
swingButton.BackgroundColor3 = Color3.fromRGB(245, 101, 56)
swingButton.TextColor3 = Color3.fromRGB(255, 255, 255)
swingButton.Font = Enum.Font.GothamBold
swingButton.TextScaled = true
swingButton.Text = "SWING"
swingButton.Visible = UserInputService.TouchEnabled
swingButton.Parent = rootFrame

local dashButton = Instance.new("TextButton")
dashButton.Size = UDim2.fromOffset(138, 56)
dashButton.Position = UDim2.new(1, -146, 1, -138)
dashButton.BackgroundColor3 = Color3.fromRGB(86, 138, 255)
dashButton.TextColor3 = Color3.fromRGB(255, 255, 255)
dashButton.Font = Enum.Font.GothamBold
dashButton.TextScaled = true
dashButton.Text = "DASH"
dashButton.Visible = UserInputService.TouchEnabled
dashButton.Parent = rootFrame

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
resultTitle.Position = UDim2.fromScale(0.2, 0.28)
resultTitle.BackgroundTransparency = 1
resultTitle.Font = Enum.Font.GothamBlack
resultTitle.TextScaled = true
resultTitle.TextColor3 = Color3.fromRGB(255, 236, 120)
resultTitle.TextStrokeTransparency = 0.3
resultTitle.Text = ""
resultTitle.ZIndex = 91
resultTitle.Parent = resultFrame

local resultStats = Instance.new("TextLabel")
resultStats.Size = UDim2.fromScale(0.5, 0.18)
resultStats.Position = UDim2.fromScale(0.25, 0.42)
resultStats.BackgroundTransparency = 1
resultStats.Font = Enum.Font.GothamBold
resultStats.TextScaled = true
resultStats.TextColor3 = Color3.fromRGB(230, 230, 230)
resultStats.TextStrokeTransparency = 0.5
resultStats.Text = ""
resultStats.ZIndex = 91
resultStats.Parent = resultFrame

-- RAGE MODE overlay
local rageBorder = Instance.new("Frame")
rageBorder.Size = UDim2.fromScale(1, 1)
rageBorder.BackgroundTransparency = 1
rageBorder.BorderSizePixel = 0
rageBorder.Visible = false
rageBorder.ZIndex = 98
rageBorder.Parent = screenGui

local rageBorderStroke = Instance.new("UIStroke")
rageBorderStroke.Thickness = 6
rageBorderStroke.Color = Color3.fromRGB(255, 30, 30)
rageBorderStroke.Transparency = 0
rageBorderStroke.Parent = rageBorder

local rageLabel = Instance.new("TextLabel")
rageLabel.Size = UDim2.fromOffset(320, 50)
rageLabel.Position = UDim2.new(0.5, -160, 0.18, 0)
rageLabel.BackgroundTransparency = 1
rageLabel.Font = Enum.Font.GothamBlack
rageLabel.TextScaled = true
rageLabel.TextColor3 = Color3.fromRGB(255, 40, 40)
rageLabel.TextStrokeTransparency = 0.2
rageLabel.TextStrokeColor3 = Color3.fromRGB(80, 0, 0)
rageLabel.Text = "RAGE MODE!"
rageLabel.Visible = false
rageLabel.ZIndex = 99
rageLabel.Parent = screenGui

local rageOverlay = Instance.new("Frame")
rageOverlay.Size = UDim2.fromScale(1, 1)
rageOverlay.BackgroundColor3 = Color3.fromRGB(255, 0, 0)
rageOverlay.BackgroundTransparency = 1
rageOverlay.BorderSizePixel = 0
rageOverlay.Visible = false
rageOverlay.ZIndex = 97
rageOverlay.Parent = screenGui

local rageActiveUntil = 0
local ragePlayerName = nil

RageModeEvent.OnClientEvent:Connect(function(playerName, active, duration)
	if playerName == localPlayer.Name then
		if active then
			rageActiveUntil = tick() + duration
			ragePlayerName = playerName
			rageBorder.Visible = true
			rageLabel.Visible = true
			rageOverlay.Visible = true
		else
			rageActiveUntil = 0
			rageBorder.Visible = false
			rageLabel.Visible = false
			rageOverlay.Visible = false
		end
	end
end)

local feedLabels = {}
local cooldownUntil = {
	Swing = 0,
	Dash = 0,
}

local lastRedScore = 0
local lastBlueScore = 0
local currentMatchState = "Lobby"
local currentTimerValue = 0

-- === Visual juice helpers ===

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

local shakeUntil = 0
local shakeIntensity = 0

local function screenShake(intensity: number, duration: number)
	shakeIntensity = intensity
	shakeUntil = tick() + duration
end

local function scorePop()
	task.spawn(function()
		local origSize = scoreLabel.Size
		scoreLabel.Size = UDim2.fromScale(origSize.X.Scale * 1.25, origSize.Y.Scale * 1.4)
		scoreLabel.TextColor3 = Color3.fromRGB(255, 255, 120)
		task.wait(0.12)
		scoreLabel.Size = origSize
		scoreLabel.TextColor3 = Color3.fromRGB(244, 244, 244)
	end)
end

local function countdownPop(remaining: number)
	-- Bigger numbers as countdown approaches zero
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

-- === Feed ===

local function removeFeedLabel(target)
	for idx, label in ipairs(feedLabels) do
		if label == target then
			table.remove(feedLabels, idx)
			break
		end
	end
	for index, label in ipairs(feedLabels) do
		label.Position = UDim2.fromOffset(10, (index - 1) * 34 + 8)
	end
end

local function addFeed(message: string, color: Color3, lifetime: number?)
	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(1, -20, 0, 28)
	label.Position = UDim2.fromOffset(10, 8)
	label.BackgroundTransparency = 1
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.Font = Enum.Font.GothamBold
	label.TextScaled = true
	label.TextColor3 = color
	label.TextStrokeTransparency = 0.5
	label.Text = message
	label.Parent = feedFrame

	-- Slide-in animation
	label.TextTransparency = 1
	task.spawn(function()
		for step = 1, 4 do
			label.TextTransparency = 1 - step / 4
			task.wait(0.03)
		end
	end)

	table.insert(feedLabels, 1, label)
	for index, line in ipairs(feedLabels) do
		line.Position = UDim2.fromOffset(10, (index - 1) * 34 + 8)
	end

	while #feedLabels > 5 do
		local oldest = table.remove(feedLabels)
		if oldest then
			oldest:Destroy()
		end
	end

	task.delay(lifetime or 2.1, function()
		if not label.Parent then
			return
		end
		for step = 1, 8 do
			label.TextTransparency = step / 8
			task.wait(0.05)
		end
		label:Destroy()
		removeFeedLabel(label)
	end)
end

local function cooldownText(actionName: string)
	local remain = cooldownUntil[actionName] - tick()
	if remain <= 0 then
		return "Ready"
	end
	return string.format("%.1fs", remain)
end

local function updateCooldownUi()
	cooldownLabel.Text = string.format("Swing: %s | Dash: %s", cooldownText("Swing"), cooldownText("Dash"))
end

swingButton.MouseButton1Click:Connect(function()
	SwingRequest:FireServer()
end)

dashButton.MouseButton1Click:Connect(function()
	DashRequest:FireServer()
end)

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
		stateLabel.Text = "Playing"
		resultFrame.Visible = false
		if payload and payload.remaining ~= nil then
			currentTimerValue = tonumber(payload.remaining) or 0
			timerLabel.Text = tostring(payload.remaining)
		end
	elseif state == "Result" then
		stateLabel.Text = "Result"
		resultFrame.Visible = true
		if payload and payload.winner then
			timerLabel.Text = tostring(payload.winner)
			resultTitle.Text = tostring(payload.winner) .. " WINS!"
			resultStats.Text = string.format("R %d : %d B", lastRedScore, lastBlueScore)
		end
	end
end)

MatchCountdown.OnClientEvent:Connect(function(remaining)
	if remaining > 0 then
		countdownLabel.Visible = true
		countdownLabel.Text = tostring(remaining)
		countdownPop(remaining)
		screenFlash(Color3.fromRGB(255, 255, 255), 0.2, 0.15)
	else
		countdownLabel.Text = "BRAWL!"
		countdownLabel.TextColor3 = Color3.fromRGB(255, 200, 60)
		countdownLabel.Size = UDim2.fromOffset(380, 150)
		countdownLabel.Position = UDim2.new(0.5, -190, 0.5, -75)
		screenFlash(Color3.fromRGB(255, 220, 80), 0.35, 0.35)
		task.delay(0.7, function()
			countdownLabel.Visible = false
		end)
	end
end)

ScoreChanged.OnClientEvent:Connect(function(red, blue)
	local redChanged = red ~= lastRedScore
	local blueChanged = blue ~= lastBlueScore
	lastRedScore = red
	lastBlueScore = blue
	scoreLabel.Text = string.format("R %d : %d B", red, blue)

	if redChanged or blueChanged then
		scorePop()
		screenFlash(Color3.fromRGB(255, 255, 180), 0.3, 0.3)
		screenShake(6, 0.25)
	end
end)

BallOwnerChanged.OnClientEvent:Connect(function(teamName, playerName)
	if not teamName then
		ownerLabel.Text = "Ball: Neutral"
		ownerLabel.TextColor3 = Color3.fromRGB(224, 224, 224)
		return
	end
	ownerLabel.Text = string.format("Ball: %s (%s)", teamName, playerName or "")
	if teamName == "Red" then
		ownerLabel.TextColor3 = Color3.fromRGB(245, 104, 104)
	else
		ownerLabel.TextColor3 = Color3.fromRGB(122, 170, 255)
	end
end)

PlayFeed.OnClientEvent:Connect(function(message, color, duration)
	local msgStr = tostring(message)
	addFeed(msgStr, color or Color3.fromRGB(255, 255, 255), duration)

	-- Trigger screen effects for special events
	if string.find(msgStr, "CHAOS PULSE") then
		screenFlash(Color3.fromRGB(255, 130, 40), 0.45, 0.4)
		screenShake(10, 0.4)
	elseif string.find(msgStr, "MONSTER SHOT") then
		screenFlash(Color3.fromRGB(255, 220, 80), 0.5, 0.5)
		screenShake(8, 0.35)
	end
end)

ActionCooldown.OnClientEvent:Connect(function(actionName, duration)
	if cooldownUntil[actionName] ~= nil then
		cooldownUntil[actionName] = tick() + (tonumber(duration) or 0)
	end
end)

RunService.RenderStepped:Connect(function()
	updateCooldownUi()

	-- Screen shake
	if tick() < shakeUntil then
		local ox = (math.random() - 0.5) * shakeIntensity * 2
		local oy = (math.random() - 0.5) * shakeIntensity * 2
		rootFrame.Position = UDim2.fromOffset(ox, oy)
	else
		rootFrame.Position = UDim2.fromScale(0, 0)
	end

	-- Rage mode visual pulse
	if rageActiveUntil > 0 and tick() < rageActiveUntil then
		local pulse = math.abs(math.sin(tick() * 6))
		rageBorderStroke.Color = Color3.fromRGB(255, math.floor(30 + 60 * pulse), 0)
		rageBorderStroke.Thickness = 4 + pulse * 4
		rageOverlay.BackgroundTransparency = 0.88 - pulse * 0.08
		rageLabel.TextColor3 = Color3.fromRGB(255, math.floor(40 + 80 * pulse), math.floor(40 * pulse))
		local remain = math.ceil(rageActiveUntil - tick())
		rageLabel.Text = string.format("RAGE MODE! %ds", remain)
	elseif rageActiveUntil > 0 and tick() >= rageActiveUntil then
		rageActiveUntil = 0
		rageBorder.Visible = false
		rageLabel.Visible = false
		rageOverlay.Visible = false
	end

	-- Timer urgency: flash red under 15s
	if currentMatchState == "Playing" then
		local remain = currentTimerValue
		if remain <= 15 and remain > 0 then
			local pulse = math.abs(math.sin(tick() * 4))
			timerLabel.TextColor3 = Color3.fromRGB(
				255,
				math.floor(80 + 100 * pulse),
				math.floor(60 + 75 * pulse)
			)
		else
			timerLabel.TextColor3 = Color3.fromRGB(255, 236, 135)
		end
	else
		timerLabel.TextColor3 = Color3.fromRGB(255, 236, 135)
	end
end)

-- (timer value is updated inside the main MatchStateChanged handler above)

----------------------------------------------------------------------------
-- POLISH: Animated title pulse in Lobby
----------------------------------------------------------------------------
local titlePulseConnection = RunService.RenderStepped:Connect(function()
	if currentMatchState == "Lobby" then
		local scale = 1.0 + 0.1 * math.sin(tick() * 3)
		stateLabel.TextScaled = true
		stateLabel.Size = UDim2.fromScale(0.32 * scale, 0.56 * scale)
	else
		stateLabel.Size = UDim2.fromScale(0.32, 0.56)
	end
end)

----------------------------------------------------------------------------
-- POLISH: Session Best score tracking
----------------------------------------------------------------------------
local sessionBestScore = 0

local bestLabel = Instance.new("TextLabel")
bestLabel.Size = UDim2.fromScale(0.5, 0.08)
bestLabel.Position = UDim2.fromScale(0.25, 0.62)
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
newBestLabel.Size = UDim2.fromScale(0.4, 0.07)
newBestLabel.Position = UDim2.fromScale(0.3, 0.72)
newBestLabel.BackgroundTransparency = 1
newBestLabel.Font = Enum.Font.GothamBlack
newBestLabel.TextScaled = true
newBestLabel.TextColor3 = Color3.fromRGB(255, 220, 40)
newBestLabel.TextStrokeTransparency = 0.2
newBestLabel.Text = "NEW BEST!"
newBestLabel.ZIndex = 92
newBestLabel.Visible = false
newBestLabel.Parent = resultFrame

local function updateSessionBest()
	local myTeamScore = 0
	-- Use higher of red/blue scores as personal metric
	myTeamScore = math.max(lastRedScore, lastBlueScore)
	localPlayer:SetAttribute("SessionBestScore", math.max(sessionBestScore, myTeamScore))
	local isNew = myTeamScore > sessionBestScore and sessionBestScore > 0
	if myTeamScore > sessionBestScore then
		sessionBestScore = myTeamScore
	end
	bestLabel.Text = string.format("Session Best: %d", sessionBestScore)
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
end

-- Hook into result state
local origResultHandler = MatchStateChanged.OnClientEvent
-- We already connected above, so add a second connection for session best
MatchStateChanged.OnClientEvent:Connect(function(state, _payload)
	if state == "Result" then
		updateSessionBest()
	elseif state == "Lobby" then
		bestLabel.Visible = false
		newBestLabel.Visible = false
	end
end)

----------------------------------------------------------------------------
-- POLISH: Quick restart hint (R key)
----------------------------------------------------------------------------
local restartHint = Instance.new("TextLabel")
restartHint.Size = UDim2.fromScale(0.4, 0.05)
restartHint.Position = UDim2.fromScale(0.3, 0.82)
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
		-- Request restart by re-triggering lobby (simulated)
		local RestartRequest = ReplicatedStorage:FindFirstChild("RestartRequest")
		if RestartRequest then
			RestartRequest:FireServer()
		end
	end
end)

----------------------------------------------------------------------------
-- POLISH: Screen edge flash on damage (HP decrease detection)
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

local lastHP = nil
local function detectDamage()
	local char = localPlayer.Character
	if not char then return end
	local humanoid = char:FindFirstChildWhichIsA("Humanoid")
	if not humanoid then return end
	local hp = humanoid.Health
	if lastHP and hp < lastHP then
		-- Flash red edge
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
	lastHP = hp
end

RunService.Heartbeat:Connect(detectDamage)

----------------------------------------------------------------------------
-- POLISH: MVP label at match end
----------------------------------------------------------------------------
local mvpLabel = Instance.new("TextLabel")
mvpLabel.Size = UDim2.fromScale(0.5, 0.06)
mvpLabel.Position = UDim2.fromScale(0.25, 0.88)
mvpLabel.BackgroundTransparency = 1
mvpLabel.Font = Enum.Font.GothamBlack
mvpLabel.TextScaled = true
mvpLabel.TextColor3 = Color3.fromRGB(255, 200, 60)
mvpLabel.TextStrokeTransparency = 0.2
mvpLabel.Text = ""
mvpLabel.ZIndex = 92
mvpLabel.Visible = false
mvpLabel.Parent = resultFrame

MatchStateChanged.OnClientEvent:Connect(function(state, payload)
	if state == "Result" then
		-- Determine MVP: whichever team won, the winner is MVP
		if payload and payload.winner then
			mvpLabel.Text = "MVP: " .. tostring(payload.winner) .. " Team"
			mvpLabel.Visible = true
			task.spawn(function()
				for i = 1, 8 do
					local pulse = math.abs(math.sin(i * 0.8))
					mvpLabel.TextColor3 = Color3.fromRGB(
						255,
						math.floor(180 + 75 * pulse),
						math.floor(20 + 40 * pulse)
					)
					task.wait(0.2)
				end
			end)
		end
	else
		mvpLabel.Visible = false
	end
end)
