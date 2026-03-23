-- HUD
-- Magnet Wars: pole indicator, pulse cooldown, arena shrink timer, player count, result screen

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local localPlayer = Players.LocalPlayer
local playerGui = localPlayer:WaitForChild("PlayerGui")

local MatchStateChanged = ReplicatedStorage:WaitForChild("MatchStateChanged")
local MatchCountdown = ReplicatedStorage:WaitForChild("MatchCountdown")
local PlayFeed = ReplicatedStorage:WaitForChild("PlayFeed")
local PoleSwitch = ReplicatedStorage:WaitForChild("PoleSwitch")
local PulseRequest = ReplicatedStorage:WaitForChild("PulseRequest")
local PulseEffect = ReplicatedStorage:WaitForChild("PulseEffect")
local PlayerEliminated = ReplicatedStorage:WaitForChild("PlayerEliminated")
local ArenaShrinkWarn = ReplicatedStorage:WaitForChild("ArenaShrinkWarn")
local PlayerCountChanged = ReplicatedStorage:WaitForChild("PlayerCountChanged")
local ActionCooldown = ReplicatedStorage:WaitForChild("ActionCooldown")

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "MagnetWarsHUD"
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

-- Top bar
local topFrame = Instance.new("Frame")
topFrame.Size = UDim2.new(1, 0, 0, 80)
topFrame.BackgroundColor3 = Color3.fromRGB(14, 16, 22)
topFrame.BackgroundTransparency = 0.22
topFrame.BorderSizePixel = 0
topFrame.Parent = rootFrame

local stateLabel = Instance.new("TextLabel")
stateLabel.Size = UDim2.fromScale(0.3, 0.5)
stateLabel.Position = UDim2.fromScale(0.02, 0.06)
stateLabel.TextXAlignment = Enum.TextXAlignment.Left
stateLabel.BackgroundTransparency = 1
stateLabel.Font = Enum.Font.GothamBold
stateLabel.TextColor3 = Color3.fromRGB(244, 244, 244)
stateLabel.TextScaled = true
stateLabel.Text = "Lobby"
stateLabel.Parent = topFrame

local timerLabel = Instance.new("TextLabel")
timerLabel.Size = UDim2.fromScale(0.2, 0.5)
timerLabel.Position = UDim2.fromScale(0.4, 0.06)
timerLabel.BackgroundTransparency = 1
timerLabel.Font = Enum.Font.GothamBold
timerLabel.TextColor3 = Color3.fromRGB(255, 236, 135)
timerLabel.TextScaled = true
timerLabel.Text = "--"
timerLabel.Parent = topFrame

local playerCountLabel = Instance.new("TextLabel")
playerCountLabel.Size = UDim2.fromScale(0.25, 0.5)
playerCountLabel.Position = UDim2.fromScale(0.73, 0.06)
playerCountLabel.TextXAlignment = Enum.TextXAlignment.Right
playerCountLabel.BackgroundTransparency = 1
playerCountLabel.Font = Enum.Font.GothamBold
playerCountLabel.TextColor3 = Color3.fromRGB(244, 244, 244)
playerCountLabel.TextScaled = true
playerCountLabel.Text = "Players: --"
playerCountLabel.Parent = topFrame

local shrinkLabel = Instance.new("TextLabel")
shrinkLabel.Size = UDim2.new(1, -24, 0.38, 0)
shrinkLabel.Position = UDim2.new(0, 12, 0.56, 0)
shrinkLabel.TextXAlignment = Enum.TextXAlignment.Left
shrinkLabel.BackgroundTransparency = 1
shrinkLabel.Font = Enum.Font.GothamMedium
shrinkLabel.TextColor3 = Color3.fromRGB(224, 224, 224)
shrinkLabel.TextScaled = true
shrinkLabel.Text = ""
shrinkLabel.Parent = topFrame

-- Pole indicator (center-left, large)
local poleFrame = Instance.new("Frame")
poleFrame.Size = UDim2.fromOffset(120, 120)
poleFrame.Position = UDim2.new(0, 20, 0.5, -60)
poleFrame.BackgroundColor3 = Color3.fromRGB(50, 100, 255)
poleFrame.BorderSizePixel = 0
poleFrame.Parent = rootFrame

local poleCorner = Instance.new("UICorner")
poleCorner.CornerRadius = UDim.new(0, 16)
poleCorner.Parent = poleFrame

local poleStroke = Instance.new("UIStroke")
poleStroke.Thickness = 3
poleStroke.Color = Color3.fromRGB(100, 150, 255)
poleStroke.Parent = poleFrame

local poleLabel = Instance.new("TextLabel")
poleLabel.Size = UDim2.fromScale(1, 0.7)
poleLabel.Position = UDim2.fromScale(0, 0.05)
poleLabel.BackgroundTransparency = 1
poleLabel.Font = Enum.Font.GothamBlack
poleLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
poleLabel.TextScaled = true
poleLabel.Text = "N"
poleLabel.Parent = poleFrame

local poleSubLabel = Instance.new("TextLabel")
poleSubLabel.Size = UDim2.fromScale(1, 0.25)
poleSubLabel.Position = UDim2.fromScale(0, 0.72)
poleSubLabel.BackgroundTransparency = 1
poleSubLabel.Font = Enum.Font.GothamBold
poleSubLabel.TextColor3 = Color3.fromRGB(220, 220, 220)
poleSubLabel.TextScaled = true
poleSubLabel.Text = "N-POLE"
poleSubLabel.Parent = poleFrame

-- Pulse cooldown bar
local pulseFrame = Instance.new("Frame")
pulseFrame.Size = UDim2.fromOffset(120, 30)
pulseFrame.Position = UDim2.new(0, 20, 0.5, 70)
pulseFrame.BackgroundColor3 = Color3.fromRGB(30, 30, 40)
pulseFrame.BorderSizePixel = 0
pulseFrame.Parent = rootFrame

local pulseCorner = Instance.new("UICorner")
pulseCorner.CornerRadius = UDim.new(0, 6)
pulseCorner.Parent = pulseFrame

local pulseFill = Instance.new("Frame")
pulseFill.Size = UDim2.fromScale(1, 1)
pulseFill.BackgroundColor3 = Color3.fromRGB(255, 200, 60)
pulseFill.BorderSizePixel = 0
pulseFill.Parent = pulseFrame

local pulseFillCorner = Instance.new("UICorner")
pulseFillCorner.CornerRadius = UDim.new(0, 6)
pulseFillCorner.Parent = pulseFill

local pulseLabel = Instance.new("TextLabel")
pulseLabel.Size = UDim2.fromScale(1, 1)
pulseLabel.BackgroundTransparency = 1
pulseLabel.Font = Enum.Font.GothamBold
pulseLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
pulseLabel.TextScaled = true
pulseLabel.Text = "PULSE"
pulseLabel.ZIndex = 2
pulseLabel.Parent = pulseFrame

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

local feedCorner = Instance.new("UICorner")
feedCorner.CornerRadius = UDim.new(0, 6)
feedCorner.Parent = feedFrame

-- Mobile buttons
local nPoleButton = Instance.new("TextButton")
nPoleButton.Size = UDim2.fromOffset(110, 56)
nPoleButton.Position = UDim2.new(1, -350, 1, -138)
nPoleButton.BackgroundColor3 = Color3.fromRGB(50, 100, 255)
nPoleButton.TextColor3 = Color3.fromRGB(255, 255, 255)
nPoleButton.Font = Enum.Font.GothamBold
nPoleButton.TextScaled = true
nPoleButton.Text = "N-POLE"
nPoleButton.Visible = UserInputService.TouchEnabled
nPoleButton.Parent = rootFrame

local sPoleButton = Instance.new("TextButton")
sPoleButton.Size = UDim2.fromOffset(110, 56)
sPoleButton.Position = UDim2.new(1, -230, 1, -138)
sPoleButton.BackgroundColor3 = Color3.fromRGB(255, 50, 50)
sPoleButton.TextColor3 = Color3.fromRGB(255, 255, 255)
sPoleButton.Font = Enum.Font.GothamBold
sPoleButton.TextScaled = true
sPoleButton.Text = "S-POLE"
sPoleButton.Visible = UserInputService.TouchEnabled
sPoleButton.Parent = rootFrame

local pulseButton = Instance.new("TextButton")
pulseButton.Size = UDim2.fromOffset(110, 56)
pulseButton.Position = UDim2.new(1, -110, 1, -138)
pulseButton.BackgroundColor3 = Color3.fromRGB(255, 200, 60)
pulseButton.TextColor3 = Color3.fromRGB(255, 255, 255)
pulseButton.Font = Enum.Font.GothamBold
pulseButton.TextScaled = true
pulseButton.Text = "PULSE"
pulseButton.Visible = UserInputService.TouchEnabled
pulseButton.Parent = rootFrame

-- Hint label
local hintLabel = Instance.new("TextLabel")
hintLabel.Size = UDim2.fromOffset(460, 28)
hintLabel.Position = UDim2.new(0.5, -230, 1, -34)
hintLabel.BackgroundTransparency = 1
hintLabel.Font = Enum.Font.GothamMedium
hintLabel.TextColor3 = Color3.fromRGB(232, 232, 232)
hintLabel.TextScaled = true
hintLabel.Text = "Q: N-Pole  |  E: S-Pole  |  F: Pulse"
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
local currentPole = "N"
local currentMatchState = "Lobby"
local currentTimerValue = 0
local pulseCooldownUntil = 0
local shakeUntil = 0
local shakeIntensity = 0
local feedLabels = {}

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

local function updatePoleDisplay()
	if currentPole == "N" then
		poleFrame.BackgroundColor3 = Color3.fromRGB(50, 100, 255)
		poleStroke.Color = Color3.fromRGB(100, 150, 255)
		poleLabel.Text = "N"
		poleSubLabel.Text = "N-POLE"
	else
		poleFrame.BackgroundColor3 = Color3.fromRGB(255, 50, 50)
		poleStroke.Color = Color3.fromRGB(255, 100, 100)
		poleLabel.Text = "S"
		poleSubLabel.Text = "S-POLE"
	end
end

-- Input handling
UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end

	if input.KeyCode == Enum.KeyCode.Q then
		currentPole = "N"
		updatePoleDisplay()
		PoleSwitch:FireServer("N")
	elseif input.KeyCode == Enum.KeyCode.E then
		currentPole = "S"
		updatePoleDisplay()
		PoleSwitch:FireServer("S")
	elseif input.KeyCode == Enum.KeyCode.F then
		PulseRequest:FireServer()
	end
end)

-- Mobile button handlers
nPoleButton.MouseButton1Click:Connect(function()
	currentPole = "N"
	updatePoleDisplay()
	PoleSwitch:FireServer("N")
end)

sPoleButton.MouseButton1Click:Connect(function()
	currentPole = "S"
	updatePoleDisplay()
	PoleSwitch:FireServer("S")
end)

pulseButton.MouseButton1Click:Connect(function()
	PulseRequest:FireServer()
end)

-- Remote event handlers
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
			resultStats.Text = "Last player standing!"
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

PlayFeed.OnClientEvent:Connect(function(message, color, duration)
	addFeed(tostring(message), color or Color3.fromRGB(255, 255, 255), duration)

	if string.find(tostring(message), "ARENA SHRINKING") then
		screenFlash(Color3.fromRGB(255, 80, 40), 0.5, 0.5)
		screenShake(10, 0.5)
		shrinkLabel.Text = "ARENA SHRINKING!"
		shrinkLabel.TextColor3 = Color3.fromRGB(255, 80, 40)
		task.delay(2, function()
			shrinkLabel.Text = ""
		end)
	end
end)

PulseEffect.OnClientEvent:Connect(function(playerName, _position)
	screenFlash(Color3.fromRGB(255, 230, 100), 0.3, 0.4)
	screenShake(8, 0.3)
	if playerName == localPlayer.Name then
		screenFlash(Color3.fromRGB(255, 255, 200), 0.2, 0.3)
	end
end)

PlayerEliminated.OnClientEvent:Connect(function(playerName)
	if playerName == localPlayer.Name then
		screenFlash(Color3.fromRGB(255, 0, 0), 0.5, 0.6)
	end
end)

PlayerCountChanged.OnClientEvent:Connect(function(count)
	playerCountLabel.Text = string.format("Alive: %d", count)
end)

ActionCooldown.OnClientEvent:Connect(function(actionName, duration)
	if actionName == "Pulse" then
		pulseCooldownUntil = tick() + (tonumber(duration) or 0)
	end
end)

ArenaShrinkWarn.OnClientEvent:Connect(function(_ringCount)
	shrinkLabel.Text = "ARENA SHRINKING!"
	shrinkLabel.TextColor3 = Color3.fromRGB(255, 80, 40)
	task.delay(2.5, function()
		shrinkLabel.Text = ""
	end)
end)

-- Render loop
RunService.RenderStepped:Connect(function()
	-- Pulse cooldown bar
	local pulseRemain = pulseCooldownUntil - tick()
	if pulseRemain > 0 then
		pulseFill.Size = UDim2.fromScale(1 - pulseRemain / 3, 1)
		pulseLabel.Text = string.format("%.1fs", pulseRemain)
	else
		pulseFill.Size = UDim2.fromScale(1, 1)
		pulseLabel.Text = "PULSE"
	end

	-- Screen shake
	if tick() < shakeUntil then
		local ox = (math.random() - 0.5) * shakeIntensity * 2
		local oy = (math.random() - 0.5) * shakeIntensity * 2
		rootFrame.Position = UDim2.fromOffset(ox, oy)
	else
		rootFrame.Position = UDim2.fromScale(0, 0)
	end

	-- Pole indicator glow pulse
	local pulse = math.abs(math.sin(tick() * 3))
	poleStroke.Thickness = 2 + pulse * 2

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
		stateLabel.Size = UDim2.fromScale(0.3 * scale, 0.5 * scale)
	else
		stateLabel.Size = UDim2.fromScale(0.3, 0.5)
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

-- Re-hook countdown to add drama
MatchCountdown.OnClientEvent:Connect(function(remaining)
	if remaining > 0 then
		countdownPop(remaining)
	end
end)

----------------------------------------------------------------------------
-- POLISH: Session Best tracking (use survival placement)
----------------------------------------------------------------------------
local sessionBestScore = 0

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
		local score = currentTimerValue  -- survival time as score
		local isNew = score > sessionBestScore and sessionBestScore > 0
		if score > sessionBestScore then
			sessionBestScore = score
		end
		localPlayer:SetAttribute("SessionBestScore", sessionBestScore)
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
-- POLISH: Screen edge flash on damage
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

local prevHP = nil
RunService.Heartbeat:Connect(function()
	local char = localPlayer.Character
	if not char then return end
	local humanoid = char:FindFirstChildWhichIsA("Humanoid")
	if not humanoid then return end
	local hp = humanoid.Health
	if prevHP and hp < prevHP then
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
	prevHP = hp
end)

----------------------------------------------------------------------------
-- POLISH: REPULSION! popup for pushing 2+ players at once
----------------------------------------------------------------------------
local repulsionCount = 0
local repulsionTimer = 0

PulseEffect.OnClientEvent:Connect(function(playerName, _position)
	if playerName == localPlayer.Name then
		-- Track pulse pushes within a short window
		repulsionCount = repulsionCount + 1
		repulsionTimer = tick() + 0.5
	end
end)

RunService.Heartbeat:Connect(function()
	if repulsionTimer > 0 and tick() > repulsionTimer then
		if repulsionCount >= 2 then
			local repLabel = Instance.new("TextLabel")
			repLabel.Size = UDim2.fromOffset(400, 60)
			repLabel.Position = UDim2.new(0.5, -200, 0.3, 0)
			repLabel.BackgroundTransparency = 1
			repLabel.Font = Enum.Font.GothamBlack
			repLabel.TextScaled = true
			repLabel.TextColor3 = Color3.fromRGB(255, 200, 60)
			repLabel.TextStrokeTransparency = 0.15
			repLabel.TextStrokeColor3 = Color3.fromRGB(80, 60, 0)
			repLabel.Text = "REPULSION!"
			repLabel.ZIndex = 96
			repLabel.Parent = rootFrame
			screenFlash(Color3.fromRGB(255, 200, 60), 0.3, 0.3)
			screenShake(6, 0.25)
			task.delay(2.0, function()
				if repLabel.Parent then
					for step = 1, 8 do
						repLabel.TextTransparency = step / 8
						task.wait(0.04)
					end
					repLabel:Destroy()
				end
			end)
		end
		repulsionCount = 0
		repulsionTimer = 0
	end
end)

----------------------------------------------------------------------------
-- POLISH: Arena shrink countdown warning
----------------------------------------------------------------------------
ArenaShrinkWarn.OnClientEvent:Connect(function(_ringCount)
	-- Dramatic countdown for arena shrink
	task.spawn(function()
		for countdown = 5, 1, -1 do
			shrinkLabel.Text = string.format("ARENA SHRINKING IN %d...", countdown)
			shrinkLabel.TextColor3 = Color3.fromRGB(255, math.floor(40 + countdown * 12), 40)
			task.wait(1)
		end
		shrinkLabel.Text = "ARENA SHRINKING!"
		shrinkLabel.TextColor3 = Color3.fromRGB(255, 40, 20)
		screenFlash(Color3.fromRGB(255, 80, 40), 0.5, 0.5)
		screenShake(12, 0.5)
		task.delay(3, function()
			shrinkLabel.Text = ""
		end)
	end)
end)
