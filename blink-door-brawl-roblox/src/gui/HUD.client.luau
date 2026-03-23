-- Blink Door Brawl HUD
-- Release-quality: teleport flash, kill popup, door placement feedback,
-- timer urgency, score pop, countdown drama, result screen

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local localPlayer = Players.LocalPlayer
local playerGui = localPlayer:WaitForChild("PlayerGui")

local MatchStateChanged = ReplicatedStorage:WaitForChild("MatchStateChanged")
local MatchCountdown = ReplicatedStorage:WaitForChild("MatchCountdown")
local ScoreChanged = ReplicatedStorage:WaitForChild("ScoreChanged")
local DoorStateChanged = ReplicatedStorage:WaitForChild("DoorStateChanged")
local ActionCooldown = ReplicatedStorage:WaitForChild("ActionCooldown")
local ActionRequest = ReplicatedStorage:WaitForChild("ActionRequest")
local DoorComboEvent = ReplicatedStorage:WaitForChild("DoorComboEvent")

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlinkDoorHUD"
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

local topBar = Instance.new("Frame")
topBar.Size = UDim2.new(1, 0, 0, 96)
topBar.BackgroundColor3 = Color3.fromRGB(16, 19, 29)
topBar.BackgroundTransparency = 0.18
topBar.BorderSizePixel = 0
topBar.Parent = rootFrame

local stateLabel = Instance.new("TextLabel")
stateLabel.Size = UDim2.fromScale(0.26, 0.5)
stateLabel.Position = UDim2.fromScale(0.02, 0.04)
stateLabel.BackgroundTransparency = 1
stateLabel.TextXAlignment = Enum.TextXAlignment.Left
stateLabel.Font = Enum.Font.GothamBlack
stateLabel.TextScaled = true
stateLabel.TextColor3 = Color3.fromRGB(246, 246, 246)
stateLabel.Text = "Lobby"
stateLabel.Parent = topBar

local timerLabel = Instance.new("TextLabel")
timerLabel.Size = UDim2.fromScale(0.16, 0.5)
timerLabel.Position = UDim2.fromScale(0.41, 0.04)
timerLabel.BackgroundTransparency = 1
timerLabel.Font = Enum.Font.GothamBlack
timerLabel.TextScaled = true
timerLabel.TextColor3 = Color3.fromRGB(255, 218, 104)
timerLabel.Text = "--"
timerLabel.Parent = topBar

local scoreLabel = Instance.new("TextLabel")
scoreLabel.Size = UDim2.fromScale(0.24, 0.5)
scoreLabel.Position = UDim2.fromScale(0.74, 0.04)
scoreLabel.BackgroundTransparency = 1
scoreLabel.TextXAlignment = Enum.TextXAlignment.Right
scoreLabel.Font = Enum.Font.GothamBlack
scoreLabel.TextScaled = true
scoreLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
scoreLabel.Text = "KOs 0"
scoreLabel.Parent = topBar

local rankLabel = Instance.new("TextLabel")
rankLabel.Size = UDim2.fromScale(0.28, 0.3)
rankLabel.Position = UDim2.fromScale(0.02, 0.62)
rankLabel.BackgroundTransparency = 1
rankLabel.TextXAlignment = Enum.TextXAlignment.Left
rankLabel.Font = Enum.Font.GothamBold
rankLabel.TextScaled = true
rankLabel.TextColor3 = Color3.fromRGB(225, 230, 242)
rankLabel.Text = "Rank --"
rankLabel.Parent = topBar

local leaderLabel = Instance.new("TextLabel")
leaderLabel.Size = UDim2.fromScale(0.46, 0.3)
leaderLabel.Position = UDim2.fromScale(0.52, 0.62)
leaderLabel.BackgroundTransparency = 1
leaderLabel.TextXAlignment = Enum.TextXAlignment.Right
leaderLabel.Font = Enum.Font.GothamMedium
leaderLabel.TextScaled = true
leaderLabel.TextColor3 = Color3.fromRGB(225, 230, 242)
leaderLabel.Text = "Leader --"
leaderLabel.Parent = topBar

local doorLabel = Instance.new("TextLabel")
doorLabel.Size = UDim2.fromOffset(400, 28)
doorLabel.Position = UDim2.new(0.5, -200, 1, -150)
doorLabel.BackgroundTransparency = 1
doorLabel.Font = Enum.Font.GothamBold
doorLabel.TextScaled = true
doorLabel.TextColor3 = Color3.fromRGB(240, 240, 240)
doorLabel.Text = "Entry: -- | Exit: --"
doorLabel.Parent = rootFrame

local hintLabel = Instance.new("TextLabel")
hintLabel.Size = UDim2.fromOffset(420, 28)
hintLabel.Position = UDim2.new(0.5, -210, 1, -120)
hintLabel.BackgroundTransparency = 1
hintLabel.Font = Enum.Font.GothamMedium
hintLabel.TextScaled = true
hintLabel.TextColor3 = Color3.fromRGB(230, 230, 230)
hintLabel.Text = "Q Entry  |  E Exit  |  F Push"
hintLabel.Parent = rootFrame

local countdownLabel = Instance.new("TextLabel")
countdownLabel.Size = UDim2.fromOffset(300, 120)
countdownLabel.Position = UDim2.new(0.5, -150, 0.5, -60)
countdownLabel.BackgroundTransparency = 1
countdownLabel.Font = Enum.Font.GothamBlack
countdownLabel.TextScaled = true
countdownLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
countdownLabel.TextStrokeTransparency = 0.45
countdownLabel.Visible = false
countdownLabel.Parent = rootFrame

-- Kill notification popup (center-screen)
local killPopup = Instance.new("TextLabel")
killPopup.Size = UDim2.fromOffset(400, 60)
killPopup.Position = UDim2.new(0.5, -200, 0.35, 0)
killPopup.BackgroundTransparency = 1
killPopup.Font = Enum.Font.GothamBlack
killPopup.TextScaled = true
killPopup.TextColor3 = Color3.fromRGB(255, 80, 100)
killPopup.TextStrokeTransparency = 0.3
killPopup.Text = ""
killPopup.Visible = false
killPopup.ZIndex = 95
killPopup.Parent = rootFrame

-- Door placement notification
local doorPlacedPopup = Instance.new("TextLabel")
doorPlacedPopup.Size = UDim2.fromOffset(260, 40)
doorPlacedPopup.Position = UDim2.new(0.5, -130, 0.6, 0)
doorPlacedPopup.BackgroundTransparency = 1
doorPlacedPopup.Font = Enum.Font.GothamBold
doorPlacedPopup.TextScaled = true
doorPlacedPopup.TextColor3 = Color3.fromRGB(82, 226, 255)
doorPlacedPopup.TextStrokeTransparency = 0.5
doorPlacedPopup.Text = ""
doorPlacedPopup.Visible = false
doorPlacedPopup.ZIndex = 94
doorPlacedPopup.Parent = rootFrame

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
resultTitle.TextColor3 = Color3.fromRGB(255, 220, 80)
resultTitle.TextStrokeTransparency = 0.3
resultTitle.Text = ""
resultTitle.ZIndex = 91
resultTitle.Parent = resultFrame

local resultStats = Instance.new("TextLabel")
resultStats.Size = UDim2.fromScale(0.5, 0.16)
resultStats.Position = UDim2.fromScale(0.25, 0.44)
resultStats.BackgroundTransparency = 1
resultStats.Font = Enum.Font.GothamBold
resultStats.TextScaled = true
resultStats.TextColor3 = Color3.fromRGB(230, 230, 230)
resultStats.TextStrokeTransparency = 0.5
resultStats.Text = ""
resultStats.ZIndex = 91
resultStats.Parent = resultFrame

local buttonFrame = Instance.new("Frame")
buttonFrame.Size = UDim2.fromOffset(486, 86)
buttonFrame.Position = UDim2.new(0.5, -243, 1, -96)
buttonFrame.BackgroundColor3 = Color3.fromRGB(13, 16, 24)
buttonFrame.BackgroundTransparency = 0.12
buttonFrame.BorderSizePixel = 0
buttonFrame.Parent = rootFrame

local layout = Instance.new("UIListLayout")
layout.FillDirection = Enum.FillDirection.Horizontal
layout.HorizontalAlignment = Enum.HorizontalAlignment.Center
layout.VerticalAlignment = Enum.VerticalAlignment.Center
layout.Padding = UDim.new(0, 12)
layout.Parent = buttonFrame

local buttons = {}
local cooldownUntil = {
	PLACE_ENTRY = 0,
	PLACE_EXIT = 0,
	PUSH = 0,
}
local doorState = {
	entry = false,
	exit = false,
}

-- DOOR COMBO popup
local comboPopup = Instance.new("TextLabel")
comboPopup.Size = UDim2.fromOffset(360, 56)
comboPopup.Position = UDim2.new(0.5, -180, 0.25, 0)
comboPopup.BackgroundTransparency = 1
comboPopup.Font = Enum.Font.GothamBlack
comboPopup.TextScaled = true
comboPopup.TextColor3 = Color3.fromRGB(82, 180, 255)
comboPopup.TextStrokeTransparency = 0.2
comboPopup.TextStrokeColor3 = Color3.fromRGB(0, 30, 80)
comboPopup.Text = "DOOR COMBO!"
comboPopup.Visible = false
comboPopup.ZIndex = 96
comboPopup.Parent = rootFrame

local comboFlashFrame = Instance.new("Frame")
comboFlashFrame.Size = UDim2.fromScale(1, 1)
comboFlashFrame.BackgroundColor3 = Color3.fromRGB(82, 180, 255)
comboFlashFrame.BackgroundTransparency = 1
comboFlashFrame.BorderSizePixel = 0
comboFlashFrame.ZIndex = 97
comboFlashFrame.Parent = screenGui

DoorComboEvent.OnClientEvent:Connect(function(playerName, active)
	if playerName == localPlayer.Name and active then
		comboPopup.Visible = true
		comboPopup.TextTransparency = 0
		-- Blue lightning flash
		comboFlashFrame.BackgroundTransparency = 0.6
		task.spawn(function()
			for step = 1, 8 do
				comboFlashFrame.BackgroundTransparency = 0.6 + step * 0.05
				task.wait(0.04)
			end
			comboFlashFrame.BackgroundTransparency = 1
		end)
		screenFlash(Color3.fromRGB(82, 180, 255), 0.35, 0.3)
		screenShake(6, 0.25)
		task.spawn(function()
			task.wait(2.5)
			for step = 1, 8 do
				if not comboPopup.Parent then return end
				comboPopup.TextTransparency = step / 8
				task.wait(0.05)
			end
			comboPopup.Visible = false
		end)
	end
end)

local currentMatchState = "Lobby"
local currentTimerValue = 0
local lastScore = 0
local lastDeaths = 0

-- === Visual juice helpers ===

local function screenFlash(color: Color3, duration: number, startAlpha: number)
	flashOverlay.BackgroundColor3 = color
	flashOverlay.BackgroundTransparency = 1 - (startAlpha or 0.5)
	task.spawn(function()
		local steps = 8
		for step = 1, steps do
			flashOverlay.BackgroundTransparency = 1 - (startAlpha or 0.5) * (1 - step / steps)
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
		scoreLabel.Size = UDim2.fromScale(origSize.X.Scale * 1.3, origSize.Y.Scale * 1.4)
		scoreLabel.TextColor3 = Color3.fromRGB(255, 120, 140)
		task.wait(0.12)
		scoreLabel.Size = origSize
		scoreLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
	end)
end

local function showKillPopup(text: string)
	killPopup.Text = text
	killPopup.Visible = true
	killPopup.TextTransparency = 0
	task.spawn(function()
		task.wait(1.5)
		for step = 1, 6 do
			killPopup.TextTransparency = step / 6
			task.wait(0.06)
		end
		killPopup.Visible = false
	end)
end

local function showDoorPlacedPopup(doorType: string)
	local color = doorType == "Entry" and Color3.fromRGB(82, 226, 255) or Color3.fromRGB(255, 171, 69)
	doorPlacedPopup.TextColor3 = color
	doorPlacedPopup.Text = doorType .. " Door Placed!"
	doorPlacedPopup.Visible = true
	doorPlacedPopup.TextTransparency = 0
	task.spawn(function()
		task.wait(0.8)
		for step = 1, 6 do
			doorPlacedPopup.TextTransparency = step / 6
			task.wait(0.05)
		end
		doorPlacedPopup.Visible = false
	end)
end

local function countdownPop(remaining: number)
	local scale = 1 + (4 - math.clamp(remaining, 1, 3)) * 0.3
	local baseW = 300
	local baseH = 120
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

-- === Button factory ===

local function makeButton(actionName, labelText, color)
	local button = Instance.new("TextButton")
	button.Name = actionName .. "Button"
	button.Size = UDim2.fromOffset(154, 60)
	button.BackgroundColor3 = color
	button.TextColor3 = Color3.fromRGB(18, 22, 28)
	button.Font = Enum.Font.GothamBlack
	button.TextScaled = true
	button.Text = labelText
	button.Parent = buttonFrame

	local stroke = Instance.new("UIStroke")
	stroke.Thickness = 1
	stroke.Color = Color3.fromRGB(255, 255, 255)
	stroke.Transparency = 0.6
	stroke.Parent = button

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 6)
	corner.Parent = button

	button.MouseButton1Click:Connect(function()
		ActionRequest:FireServer(actionName)
	end)

	buttons[actionName] = button
end

makeButton("PLACE_ENTRY", "ENTRY\n[Q]", Color3.fromRGB(82, 226, 255))
makeButton("PLACE_EXIT", "EXIT\n[E]", Color3.fromRGB(255, 171, 69))
makeButton("PUSH", "PUSH\n[F]", Color3.fromRGB(255, 96, 119))

-- === Event handlers ===

MatchStateChanged.OnClientEvent:Connect(function(stateName, payload)
	currentMatchState = stateName
	if stateName == "Lobby" then
		stateLabel.Text = "Lobby"
		timerLabel.Text = payload and payload.remaining and tostring(payload.remaining) or "--"
		resultFrame.Visible = false
	elseif stateName == "Countdown" then
		stateLabel.Text = "Get Ready"
		resultFrame.Visible = false
	elseif stateName == "Playing" then
		stateLabel.Text = "Brawl"
		resultFrame.Visible = false
		if payload and payload.remaining ~= nil then
			currentTimerValue = tonumber(payload.remaining) or 0
			timerLabel.Text = tostring(payload.remaining)
		end
	elseif stateName == "Result" then
		stateLabel.Text = "Result"
		timerLabel.Text = payload and payload.winner or "--"
		resultFrame.Visible = true
		resultTitle.Text = (payload and payload.winner or "??") .. " WINS!"
		resultStats.Text = string.format("Your KOs: %d  |  Deaths: %d", lastScore, lastDeaths)
	else
		stateLabel.Text = tostring(stateName)
	end
end)

MatchCountdown.OnClientEvent:Connect(function(remaining)
	if remaining > 0 then
		countdownLabel.Visible = true
		countdownLabel.Text = tostring(remaining)
		countdownPop(remaining)
		screenFlash(Color3.fromRGB(255, 255, 255), 0.2, 0.12)
	else
		countdownLabel.Text = "FIGHT!"
		countdownLabel.TextColor3 = Color3.fromRGB(255, 80, 100)
		countdownLabel.Size = UDim2.fromOffset(400, 150)
		countdownLabel.Position = UDim2.new(0.5, -200, 0.5, -75)
		screenFlash(Color3.fromRGB(255, 80, 100), 0.35, 0.3)
		task.delay(0.6, function()
			countdownLabel.Visible = false
		end)
	end
end)

ScoreChanged.OnClientEvent:Connect(function(payload)
	if typeof(payload) ~= "table" then
		return
	end
	local newScore = payload.score or 0
	local newDeaths = payload.deaths or 0

	-- Detect KO
	if newScore > lastScore then
		showKillPopup(string.format("KO! (%d total)", newScore))
		scorePop()
		screenFlash(Color3.fromRGB(255, 80, 100), 0.25, 0.25)
		screenShake(5, 0.2)
	end

	-- Detect death
	if newDeaths > lastDeaths then
		screenFlash(Color3.fromRGB(200, 50, 50), 0.4, 0.35)
		screenShake(8, 0.3)
	end

	lastScore = newScore
	lastDeaths = newDeaths

	scoreLabel.Text = string.format("KOs %d", newScore)
	rankLabel.Text = string.format("Rank %d  |  Deaths %d", payload.rank or 0, newDeaths)
	leaderLabel.Text = string.format("Leader %s (%d)", payload.leaderName or "--", payload.leaderScore or 0)
end)

DoorStateChanged.OnClientEvent:Connect(function(entryActive, exitActive)
	local prevEntry = doorState.entry
	local prevExit = doorState.exit
	doorState.entry = entryActive == true
	doorState.exit = exitActive == true

	-- Show placement feedback
	if not prevEntry and doorState.entry then
		showDoorPlacedPopup("Entry")
	end
	if not prevExit and doorState.exit then
		showDoorPlacedPopup("Exit")
	end

	-- Flash when both doors are linked (teleport ready)
	if doorState.entry and doorState.exit and (not prevEntry or not prevExit) then
		screenFlash(Color3.fromRGB(82, 226, 255), 0.3, 0.2)
	end
end)

ActionCooldown.OnClientEvent:Connect(function(actionName, duration)
	if cooldownUntil[actionName] ~= nil then
		cooldownUntil[actionName] = tick() + (tonumber(duration) or 0)
	end
end)

RunService.RenderStepped:Connect(function()
	local entryText = doorState.entry and "ON" or "OFF"
	local exitText = doorState.exit and "ON" or "OFF"
	doorLabel.Text = string.format("Entry: %s  |  Exit: %s", entryText, exitText)

	-- Colorize door status
	if doorState.entry and doorState.exit then
		doorLabel.TextColor3 = Color3.fromRGB(82, 255, 150)
	elseif doorState.entry or doorState.exit then
		doorLabel.TextColor3 = Color3.fromRGB(255, 218, 104)
	else
		doorLabel.TextColor3 = Color3.fromRGB(240, 240, 240)
	end

	for actionName, button in pairs(buttons) do
		local remain = (cooldownUntil[actionName] or 0) - tick()
		if remain > 0 then
			button.TextTransparency = 0.25
			if actionName == "PLACE_ENTRY" then
				button.Text = string.format("ENTRY\n%.1fs", remain)
			elseif actionName == "PLACE_EXIT" then
				button.Text = string.format("EXIT\n%.1fs", remain)
			else
				button.Text = string.format("PUSH\n%.1fs", remain)
			end
		else
			button.TextTransparency = 0
			if actionName == "PLACE_ENTRY" then
				button.Text = "ENTRY\n[Q]"
			elseif actionName == "PLACE_EXIT" then
				button.Text = "EXIT\n[E]"
			else
				button.Text = "PUSH\n[F]"
			end
		end
	end

	if UserInputService.TouchEnabled then
		hintLabel.Text = "Tap Entry / Exit / Push"
	else
		hintLabel.Text = "Q Entry  |  E Exit  |  F Push"
	end

	-- Screen shake
	if tick() < shakeUntil then
		local ox = (math.random() - 0.5) * shakeIntensity * 2
		local oy = (math.random() - 0.5) * shakeIntensity * 2
		rootFrame.Position = UDim2.fromOffset(ox, oy)
	else
		rootFrame.Position = UDim2.fromScale(0, 0)
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
			timerLabel.TextColor3 = Color3.fromRGB(255, 218, 104)
		end
	else
		timerLabel.TextColor3 = Color3.fromRGB(255, 218, 104)
	end

	-- POLISH: Animated title pulse in Lobby
	if currentMatchState == "Lobby" then
		local scale = 1.0 + 0.1 * math.sin(tick() * 3)
		stateLabel.Size = UDim2.fromScale(0.26 * scale, 0.5 * scale)
	else
		stateLabel.Size = UDim2.fromScale(0.26, 0.5)
	end
end)

----------------------------------------------------------------------------
-- POLISH: Session Best KO tracking
----------------------------------------------------------------------------
local sessionBestKOs = 0

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

MatchStateChanged.OnClientEvent:Connect(function(state, _payload)
	if state == "Result" then
		local isNew = lastScore > sessionBestKOs and sessionBestKOs > 0
		if lastScore > sessionBestKOs then
			sessionBestKOs = lastScore
		end
		localPlayer:SetAttribute("SessionBestScore", sessionBestKOs)
		bestLabel.Text = string.format("Session Best: %d KOs", sessionBestKOs)
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
RunService.Heartbeat:Connect(function()
	local char = localPlayer.Character
	if not char then return end
	local humanoid = char:FindFirstChildWhichIsA("Humanoid")
	if not humanoid then return end
	local hp = humanoid.Health
	if lastHP and hp < lastHP then
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
end)

----------------------------------------------------------------------------
-- POLISH: DOUBLE KILL popup for door combo
----------------------------------------------------------------------------
local doubleKillPopup = Instance.new("TextLabel")
doubleKillPopup.Size = UDim2.fromOffset(420, 60)
doubleKillPopup.Position = UDim2.new(0.5, -210, 0.3, 0)
doubleKillPopup.BackgroundTransparency = 1
doubleKillPopup.Font = Enum.Font.GothamBlack
doubleKillPopup.TextScaled = true
doubleKillPopup.TextColor3 = Color3.fromRGB(255, 80, 255)
doubleKillPopup.TextStrokeTransparency = 0.15
doubleKillPopup.TextStrokeColor3 = Color3.fromRGB(60, 0, 60)
doubleKillPopup.Text = "DOUBLE KILL!"
doubleKillPopup.Visible = false
doubleKillPopup.ZIndex = 97
doubleKillPopup.Parent = rootFrame

DoorComboEvent.OnClientEvent:Connect(function(playerName, active)
	if playerName == localPlayer.Name and active then
		doubleKillPopup.Visible = true
		doubleKillPopup.TextTransparency = 0
		screenFlash(Color3.fromRGB(255, 80, 255), 0.4, 0.4)
		screenShake(8, 0.3)
		task.spawn(function()
			task.wait(2.0)
			for step = 1, 8 do
				if not doubleKillPopup.Parent then return end
				doubleKillPopup.TextTransparency = step / 8
				task.wait(0.05)
			end
			doubleKillPopup.Visible = false
		end)
	end
end)
