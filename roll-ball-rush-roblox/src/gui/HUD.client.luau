local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local stateFolder = ReplicatedStorage:WaitForChild("RollBallRushState")

local function getValue(name)
	return stateFolder:WaitForChild(name)
end

local titleValue = getValue("Title")
local hookValue = getValue("Hook")
local stateValue = getValue("State")
local timerValue = getValue("Timer")
local controlsValue = getValue("Controls")
local summaryValue = getValue("Summary")

local gui = Instance.new("ScreenGui")
gui.Name = "RollBallHUD"
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")

-- Main info panel (top-left)
local panel = Instance.new("Frame")
panel.Name = "Panel"
panel.AnchorPoint = Vector2.new(0, 0)
panel.Position = UDim2.fromOffset(18, 18)
panel.Size = UDim2.fromOffset(370, 168)
panel.BackgroundColor3 = Color3.fromRGB(17, 28, 40)
panel.BackgroundTransparency = 0.18
panel.Parent = gui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 14)
corner.Parent = panel

local stroke = Instance.new("UIStroke")
stroke.Color = Color3.fromRGB(113, 188, 255)
stroke.Transparency = 0.25
stroke.Parent = panel

local titleLabel = Instance.new("TextLabel")
titleLabel.Size = UDim2.fromOffset(338, 28)
titleLabel.Position = UDim2.fromOffset(16, 12)
titleLabel.BackgroundTransparency = 1
titleLabel.Font = Enum.Font.GothamBlack
titleLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
titleLabel.TextXAlignment = Enum.TextXAlignment.Left
titleLabel.TextSize = 26
titleLabel.Parent = panel

local hookLabel = Instance.new("TextLabel")
hookLabel.Size = UDim2.fromOffset(338, 20)
hookLabel.Position = UDim2.fromOffset(16, 42)
hookLabel.BackgroundTransparency = 1
hookLabel.Font = Enum.Font.Gotham
hookLabel.TextColor3 = Color3.fromRGB(201, 224, 244)
hookLabel.TextXAlignment = Enum.TextXAlignment.Left
hookLabel.TextSize = 14
hookLabel.Parent = panel

local statusLabel = Instance.new("TextLabel")
statusLabel.Size = UDim2.fromOffset(338, 24)
statusLabel.Position = UDim2.fromOffset(16, 70)
statusLabel.BackgroundTransparency = 1
statusLabel.Font = Enum.Font.GothamBold
statusLabel.TextColor3 = Color3.fromRGB(255, 223, 133)
statusLabel.TextXAlignment = Enum.TextXAlignment.Left
statusLabel.TextSize = 18
statusLabel.Parent = panel

local detailLabel = Instance.new("TextLabel")
detailLabel.Size = UDim2.fromOffset(338, 22)
detailLabel.Position = UDim2.fromOffset(16, 98)
detailLabel.BackgroundTransparency = 1
detailLabel.Font = Enum.Font.Gotham
detailLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
detailLabel.TextXAlignment = Enum.TextXAlignment.Left
detailLabel.TextSize = 14
detailLabel.Parent = panel

local controlsLabel = Instance.new("TextLabel")
controlsLabel.Size = UDim2.fromOffset(338, 18)
controlsLabel.Position = UDim2.fromOffset(16, 120)
controlsLabel.BackgroundTransparency = 1
controlsLabel.Font = Enum.Font.Gotham
controlsLabel.TextColor3 = Color3.fromRGB(178, 202, 224)
controlsLabel.TextXAlignment = Enum.TextXAlignment.Left
controlsLabel.TextSize = 12
controlsLabel.Parent = panel

-- Speed indicator (top-right)
local speedFrame = Instance.new("Frame")
speedFrame.Name = "SpeedIndicator"
speedFrame.AnchorPoint = Vector2.new(1, 0)
speedFrame.Position = UDim2.new(1, -18, 0, 18)
speedFrame.Size = UDim2.fromOffset(160, 56)
speedFrame.BackgroundColor3 = Color3.fromRGB(17, 28, 40)
speedFrame.BackgroundTransparency = 0.18
speedFrame.Parent = gui

local speedCorner = Instance.new("UICorner")
speedCorner.CornerRadius = UDim.new(0, 12)
speedCorner.Parent = speedFrame

local speedStroke = Instance.new("UIStroke")
speedStroke.Color = Color3.fromRGB(113, 188, 255)
speedStroke.Transparency = 0.25
speedStroke.Parent = speedFrame

local speedStateLabel = Instance.new("TextLabel")
speedStateLabel.Name = "SpeedState"
speedStateLabel.Size = UDim2.new(1, -16, 0, 24)
speedStateLabel.Position = UDim2.fromOffset(8, 4)
speedStateLabel.BackgroundTransparency = 1
speedStateLabel.Font = Enum.Font.GothamBlack
speedStateLabel.TextScaled = true
speedStateLabel.TextXAlignment = Enum.TextXAlignment.Center
speedStateLabel.Parent = speedFrame

local speedValueLabel = Instance.new("TextLabel")
speedValueLabel.Name = "SpeedValue"
speedValueLabel.Size = UDim2.new(1, -16, 0, 20)
speedValueLabel.Position = UDim2.fromOffset(8, 30)
speedValueLabel.BackgroundTransparency = 1
speedValueLabel.Font = Enum.Font.GothamBold
speedValueLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
speedValueLabel.TextScaled = true
speedValueLabel.TextXAlignment = Enum.TextXAlignment.Center
speedValueLabel.Parent = speedFrame

-- Cooldown bars (top-right, below speed indicator)
local boostBarBg = Instance.new("Frame")
boostBarBg.Name = "BoostBarBg"
boostBarBg.AnchorPoint = Vector2.new(1, 0)
boostBarBg.Position = UDim2.new(1, -18, 0, 82)
boostBarBg.Size = UDim2.fromOffset(160, 18)
boostBarBg.BackgroundColor3 = Color3.fromRGB(40, 36, 20)
boostBarBg.BackgroundTransparency = 0.3
boostBarBg.Parent = gui

local boostBarCorner = Instance.new("UICorner")
boostBarCorner.CornerRadius = UDim.new(0, 6)
boostBarCorner.Parent = boostBarBg

local boostBarFill = Instance.new("Frame")
boostBarFill.Name = "Fill"
boostBarFill.Size = UDim2.new(1, 0, 1, 0)
boostBarFill.BackgroundColor3 = Color3.fromRGB(255, 214, 102)
boostBarFill.Parent = boostBarBg

local boostFillCorner = Instance.new("UICorner")
boostFillCorner.CornerRadius = UDim.new(0, 6)
boostFillCorner.Parent = boostBarFill

local boostBarLabel = Instance.new("TextLabel")
boostBarLabel.Size = UDim2.fromScale(1, 1)
boostBarLabel.BackgroundTransparency = 1
boostBarLabel.Font = Enum.Font.GothamBold
boostBarLabel.TextColor3 = Color3.fromRGB(40, 36, 20)
boostBarLabel.TextScaled = true
boostBarLabel.Text = "BOOST"
boostBarLabel.ZIndex = 2
boostBarLabel.Parent = boostBarBg

local brakeBarBg = Instance.new("Frame")
brakeBarBg.Name = "BrakeBarBg"
brakeBarBg.AnchorPoint = Vector2.new(1, 0)
brakeBarBg.Position = UDim2.new(1, -18, 0, 104)
brakeBarBg.Size = UDim2.fromOffset(160, 18)
brakeBarBg.BackgroundColor3 = Color3.fromRGB(20, 30, 45)
brakeBarBg.BackgroundTransparency = 0.3
brakeBarBg.Parent = gui

local brakeBarCorner = Instance.new("UICorner")
brakeBarCorner.CornerRadius = UDim.new(0, 6)
brakeBarCorner.Parent = brakeBarBg

local brakeBarFill = Instance.new("Frame")
brakeBarFill.Name = "Fill"
brakeBarFill.Size = UDim2.new(1, 0, 1, 0)
brakeBarFill.BackgroundColor3 = Color3.fromRGB(93, 175, 255)
brakeBarFill.Parent = brakeBarBg

local brakeFillCorner = Instance.new("UICorner")
brakeFillCorner.CornerRadius = UDim.new(0, 6)
brakeFillCorner.Parent = brakeBarFill

local brakeBarLabel = Instance.new("TextLabel")
brakeBarLabel.Size = UDim2.fromScale(1, 1)
brakeBarLabel.BackgroundTransparency = 1
brakeBarLabel.Font = Enum.Font.GothamBold
brakeBarLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
brakeBarLabel.TextScaled = true
brakeBarLabel.Text = "BRAKE"
brakeBarLabel.ZIndex = 2
brakeBarLabel.Parent = brakeBarBg

-- Center popup notification (checkpoint flash, finish celebration)
local popupLabel = Instance.new("TextLabel")
popupLabel.Name = "Popup"
popupLabel.AnchorPoint = Vector2.new(0.5, 0.5)
popupLabel.Position = UDim2.new(0.5, 0, 0.3, 0)
popupLabel.Size = UDim2.fromOffset(400, 60)
popupLabel.BackgroundTransparency = 1
popupLabel.Font = Enum.Font.GothamBlack
popupLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
popupLabel.TextStrokeTransparency = 0.3
popupLabel.TextStrokeColor3 = Color3.fromRGB(0, 0, 0)
popupLabel.TextScaled = true
popupLabel.Text = ""
popupLabel.Visible = false
popupLabel.ZIndex = 10
popupLabel.Parent = gui

-- Screen flash overlay (boost=blue, brake=red)
local screenFlash = Instance.new("Frame")
screenFlash.Name = "ScreenFlash"
screenFlash.AnchorPoint = Vector2.new(0.5, 0.5)
screenFlash.Position = UDim2.fromScale(0.5, 0.5)
screenFlash.Size = UDim2.fromScale(1, 1)
screenFlash.BackgroundColor3 = Color3.fromRGB(93, 175, 255)
screenFlash.BackgroundTransparency = 1
screenFlash.BorderSizePixel = 0
screenFlash.ZIndex = 5
screenFlash.Parent = gui

-- Result screen (center, shows finish order)
local resultFrame = Instance.new("Frame")
resultFrame.Name = "ResultScreen"
resultFrame.AnchorPoint = Vector2.new(0.5, 0.5)
resultFrame.Position = UDim2.fromScale(0.5, 0.5)
resultFrame.Size = UDim2.fromOffset(340, 220)
resultFrame.BackgroundColor3 = Color3.fromRGB(12, 22, 34)
resultFrame.BackgroundTransparency = 0.1
resultFrame.Visible = false
resultFrame.ZIndex = 8
resultFrame.Parent = gui

local resultCorner = Instance.new("UICorner")
resultCorner.CornerRadius = UDim.new(0, 16)
resultCorner.Parent = resultFrame

local resultStroke = Instance.new("UIStroke")
resultStroke.Color = Color3.fromRGB(135, 255, 173)
resultStroke.Thickness = 2
resultStroke.Parent = resultFrame

local resultTitle = Instance.new("TextLabel")
resultTitle.Name = "ResultTitle"
resultTitle.Size = UDim2.new(1, -24, 0, 36)
resultTitle.Position = UDim2.fromOffset(12, 10)
resultTitle.BackgroundTransparency = 1
resultTitle.Font = Enum.Font.GothamBlack
resultTitle.TextColor3 = Color3.fromRGB(135, 255, 173)
resultTitle.TextScaled = true
resultTitle.Text = "RESULTS"
resultTitle.ZIndex = 9
resultTitle.Parent = resultFrame

local resultBody = Instance.new("TextLabel")
resultBody.Name = "ResultBody"
resultBody.Size = UDim2.new(1, -24, 1, -56)
resultBody.Position = UDim2.fromOffset(12, 50)
resultBody.BackgroundTransparency = 1
resultBody.Font = Enum.Font.GothamBold
resultBody.TextColor3 = Color3.fromRGB(255, 255, 255)
resultBody.TextScaled = true
resultBody.TextXAlignment = Enum.TextXAlignment.Left
resultBody.TextYAlignment = Enum.TextYAlignment.Top
resultBody.Text = ""
resultBody.TextWrapped = true
resultBody.ZIndex = 9
resultBody.Parent = resultFrame

-- Mobile buttons (bottom-right)
local mobileButtonSize = UDim2.fromOffset(80, 80)
local boostButton = Instance.new("TextButton")
boostButton.Name = "BoostButton"
boostButton.AnchorPoint = Vector2.new(1, 1)
boostButton.Position = UDim2.new(1, -100, 1, -24)
boostButton.Size = mobileButtonSize
boostButton.BackgroundColor3 = Color3.fromRGB(255, 214, 102)
boostButton.BackgroundTransparency = 0.2
boostButton.Font = Enum.Font.GothamBlack
boostButton.TextColor3 = Color3.fromRGB(40, 36, 20)
boostButton.TextScaled = true
boostButton.Text = "BOOST"
boostButton.ZIndex = 6
boostButton.Parent = gui

local boostBtnCorner = Instance.new("UICorner")
boostBtnCorner.CornerRadius = UDim.new(0, 16)
boostBtnCorner.Parent = boostButton

local brakeButton = Instance.new("TextButton")
brakeButton.Name = "BrakeButton"
brakeButton.AnchorPoint = Vector2.new(1, 1)
brakeButton.Position = UDim2.new(1, -18, 1, -24)
brakeButton.Size = mobileButtonSize
brakeButton.BackgroundColor3 = Color3.fromRGB(93, 175, 255)
brakeButton.BackgroundTransparency = 0.2
brakeButton.Font = Enum.Font.GothamBlack
brakeButton.TextColor3 = Color3.fromRGB(255, 255, 255)
brakeButton.TextScaled = true
brakeButton.Text = "BRAKE"
brakeButton.ZIndex = 6
brakeButton.Parent = gui

local brakeBtnCorner = Instance.new("UICorner")
brakeBtnCorner.CornerRadius = UDim.new(0, 16)
brakeBtnCorner.Parent = brakeButton

-- Wire mobile buttons to server
local BallCommandRequest = ReplicatedStorage:WaitForChild("BallCommandRequest")
boostButton.Activated:Connect(function()
	BallCommandRequest:FireServer("Boost")
end)
brakeButton.Activated:Connect(function()
	BallCommandRequest:FireServer("Brake")
end)

-- Popup helper
local popupThread = nil
local function showPopup(text, color, duration)
	if popupThread then
		task.cancel(popupThread)
	end
	popupLabel.Text = text
	popupLabel.TextColor3 = color
	popupLabel.Visible = true
	popupThread = task.delay(duration or 1.5, function()
		popupLabel.Visible = false
		popupThread = nil
	end)
end

-- Screen flash helper
local flashThread = nil
local function flashScreen(color, duration)
	if flashThread then
		task.cancel(flashThread)
	end
	screenFlash.BackgroundColor3 = color
	screenFlash.BackgroundTransparency = 0.7
	flashThread = task.delay(duration or 0.2, function()
		screenFlash.BackgroundTransparency = 1
		flashThread = nil
	end)
end

-- POWER-UP indicator
local PowerUpEvent = ReplicatedStorage:WaitForChild("PowerUpEvent")

local powerUpFrame = Instance.new("Frame")
powerUpFrame.Name = "PowerUpFrame"
powerUpFrame.AnchorPoint = Vector2.new(0.5, 0)
powerUpFrame.Position = UDim2.new(0.5, 0, 0, 18)
powerUpFrame.Size = UDim2.fromOffset(200, 48)
powerUpFrame.BackgroundColor3 = Color3.fromRGB(50, 40, 15)
powerUpFrame.BackgroundTransparency = 0.2
powerUpFrame.Visible = false
powerUpFrame.Parent = gui

local powerUpCorner = Instance.new("UICorner")
powerUpCorner.CornerRadius = UDim.new(0, 10)
powerUpCorner.Parent = powerUpFrame

local powerUpStroke = Instance.new("UIStroke")
powerUpStroke.Color = Color3.fromRGB(255, 200, 50)
powerUpStroke.Thickness = 2
powerUpStroke.Parent = powerUpFrame

local powerUpLabel = Instance.new("TextLabel")
powerUpLabel.Size = UDim2.new(0.65, 0, 1, 0)
powerUpLabel.Position = UDim2.fromOffset(8, 0)
powerUpLabel.BackgroundTransparency = 1
powerUpLabel.Font = Enum.Font.GothamBlack
powerUpLabel.TextScaled = true
powerUpLabel.TextColor3 = Color3.fromRGB(255, 220, 80)
powerUpLabel.TextXAlignment = Enum.TextXAlignment.Left
powerUpLabel.Text = ""
powerUpLabel.Parent = powerUpFrame

local powerUpTimerLabel = Instance.new("TextLabel")
powerUpTimerLabel.Size = UDim2.new(0.3, 0, 1, 0)
powerUpTimerLabel.Position = UDim2.new(0.7, 0, 0, 0)
powerUpTimerLabel.BackgroundTransparency = 1
powerUpTimerLabel.Font = Enum.Font.GothamBold
powerUpTimerLabel.TextScaled = true
powerUpTimerLabel.TextColor3 = Color3.fromRGB(255, 255, 200)
powerUpTimerLabel.TextXAlignment = Enum.TextXAlignment.Right
powerUpTimerLabel.Text = ""
powerUpTimerLabel.Parent = powerUpFrame

local currentPowerUp = ""
local powerUpEndTick = 0

local POWERUP_COLORS = {
	MAGNET = Color3.fromRGB(200, 80, 255),
	SPIKE = Color3.fromRGB(255, 80, 80),
	SHRINK = Color3.fromRGB(80, 255, 150),
	BOUNCE = Color3.fromRGB(80, 200, 255),
}

PowerUpEvent.OnClientEvent:Connect(function(powerUpName, duration)
	currentPowerUp = powerUpName
	if powerUpName and powerUpName ~= "" then
		powerUpEndTick = tick() + duration
		powerUpLabel.Text = powerUpName
		powerUpLabel.TextColor3 = POWERUP_COLORS[powerUpName] or Color3.fromRGB(255, 220, 80)
		powerUpStroke.Color = POWERUP_COLORS[powerUpName] or Color3.fromRGB(255, 200, 50)
		powerUpFrame.Visible = true
		showPopup(powerUpName .. " POWER-UP!", POWERUP_COLORS[powerUpName] or Color3.fromRGB(255, 220, 80), 1.5)
	else
		powerUpFrame.Visible = false
		powerUpEndTick = 0
	end
end)

-- Track previous attribute values for change detection
local prevCheckpoint = 0
local prevFinishRank = 0
local prevBoostReady = true
local prevBrakeReady = true
local prevState = ""

local function refresh()
	titleLabel.Text = titleValue.Value
	hookLabel.Text = hookValue.Value
	controlsLabel.Text = controlsValue.Value

	local state = stateValue.Value
	local timer = timerValue.Value

	-- Timer urgency: flash red when < 15s in Playing state
	if state == "Playing" and timer <= 15 then
		local flashOn = (timer % 2 == 0)
		statusLabel.TextColor3 = flashOn and Color3.fromRGB(255, 80, 80) or Color3.fromRGB(255, 223, 133)
	else
		statusLabel.TextColor3 = Color3.fromRGB(255, 223, 133)
	end
	statusLabel.Text = string.format("%s  |  %02ds", state, timer)

	local checkpoint = player:GetAttribute("CheckpointIndex") or 0
	local rank = player:GetAttribute("RaceRank") or 0
	local finishRankVal = player:GetAttribute("FinishRank") or 0
	local speed = math.floor(player:GetAttribute("BallSpeed") or 0)
	local boostReady = player:GetAttribute("BoostReady") or false
	local brakeReady = player:GetAttribute("BrakeReady") or false

	-- Speed state indicator with color coding
	local speedState = "NORMAL"
	local speedColor = Color3.fromRGB(255, 255, 255)
	if not boostReady and speed > 28 then
		speedState = "BOOST"
		speedColor = Color3.fromRGB(255, 214, 102)
	elseif not brakeReady and speed < 15 then
		speedState = "BRAKE"
		speedColor = Color3.fromRGB(93, 175, 255)
	end
	speedStateLabel.Text = speedState
	speedStateLabel.TextColor3 = speedColor
	speedValueLabel.Text = string.format("%d stud/s", speed)
	speedFrame.Visible = (state == "Playing" or state == "Countdown")

	-- Cooldown bars
	boostBarFill.Size = UDim2.new(boostReady and 1 or 0.15, 0, 1, 0)
	boostBarFill.BackgroundColor3 = boostReady and Color3.fromRGB(255, 214, 102) or Color3.fromRGB(100, 90, 50)
	brakeBarFill.Size = UDim2.new(brakeReady and 1 or 0.15, 0, 1, 0)
	brakeBarFill.BackgroundColor3 = brakeReady and Color3.fromRGB(93, 175, 255) or Color3.fromRGB(40, 70, 110)
	boostBarBg.Visible = (state == "Playing" or state == "Countdown")
	brakeBarBg.Visible = (state == "Playing" or state == "Countdown")

	-- Mobile button visibility
	boostButton.Visible = (state == "Playing")
	brakeButton.Visible = (state == "Playing")
	boostButton.BackgroundTransparency = boostReady and 0.2 or 0.6
	brakeButton.BackgroundTransparency = brakeReady and 0.2 or 0.6

	-- Checkpoint flash notification
	if checkpoint > prevCheckpoint and checkpoint > 0 and state == "Playing" then
		showPopup(string.format("Checkpoint %d/4!", checkpoint), Color3.fromRGB(255, 223, 133), 1.5)
	end

	-- Screen flash on boost/brake activation
	if not boostReady and prevBoostReady and state == "Playing" then
		flashScreen(Color3.fromRGB(93, 175, 255), 0.25)
	end
	if not brakeReady and prevBrakeReady and state == "Playing" then
		flashScreen(Color3.fromRGB(255, 100, 100), 0.25)
	end

	-- Finish celebration
	if finishRankVal > 0 and prevFinishRank == 0 then
		local ordinal = "th"
		if finishRankVal == 1 then
			ordinal = "st"
		elseif finishRankVal == 2 then
			ordinal = "nd"
		elseif finishRankVal == 3 then
			ordinal = "rd"
		end
		showPopup(string.format("YOU FINISHED %d%s!", finishRankVal, ordinal), Color3.fromRGB(135, 255, 173), 4)
	end

	-- Result screen
	if state == "Result" then
		resultFrame.Visible = true
		resultBody.Text = summaryValue.Value
	elseif prevState == "Result" and state ~= "Result" then
		resultFrame.Visible = false
	end

	-- Detail line
	local finishText = finishRankVal > 0 and string.format("Finish #%d", finishRankVal) or string.format("Rank %d", rank)
	detailLabel.Text = string.format(
		"CP %d/4  |  %s  |  %d stud/s",
		checkpoint,
		finishText,
		speed
	)

	-- Save previous values for change detection
	prevCheckpoint = checkpoint
	prevFinishRank = finishRankVal
	prevBoostReady = boostReady
	prevBrakeReady = brakeReady
	prevState = state
end

for _, value in ipairs(stateFolder:GetChildren()) do
	if value:IsA("StringValue") or value:IsA("IntValue") then
		value.Changed:Connect(refresh)
	end
end

for _, attributeName in ipairs({ "CheckpointIndex", "RaceRank", "FinishRank", "BallSpeed", "BoostReady", "BrakeReady" }) do
	player:GetAttributeChangedSignal(attributeName):Connect(refresh)
end

-- Periodic timer urgency blink + power-up timer
RunService.Heartbeat:Connect(function()
	local state = stateValue.Value
	local timer = timerValue.Value
	if state == "Playing" and timer <= 15 then
		local t = tick()
		local blink = math.floor(t * 2) % 2 == 0
		statusLabel.TextColor3 = blink and Color3.fromRGB(255, 80, 80) or Color3.fromRGB(255, 223, 133)
	end

	-- Power-up timer update
	if powerUpEndTick > 0 then
		local remain = powerUpEndTick - tick()
		if remain > 0 then
			powerUpTimerLabel.Text = string.format("%.1fs", remain)
			-- Pulse effect when < 2s
			if remain < 2 then
				local pulse = math.abs(math.sin(tick() * 6))
				powerUpFrame.BackgroundTransparency = 0.1 + pulse * 0.3
			end
		else
			powerUpFrame.Visible = false
			powerUpEndTick = 0
			currentPowerUp = ""
		end
	end
end)

refresh()

----------------------------------------------------------------------------
-- POLISH: Animated title pulse in Lobby
----------------------------------------------------------------------------
RunService.RenderStepped:Connect(function()
	local state = stateValue.Value
	if state == "Lobby" then
		local scale = 1.0 + 0.1 * math.sin(tick() * 3)
		titleLabel.TextSize = 26 * scale
	else
		titleLabel.TextSize = 26
	end
end)

----------------------------------------------------------------------------
-- POLISH: Session Best score tracking
----------------------------------------------------------------------------
local sessionBestScore = 0

local bestLabelResult = Instance.new("TextLabel")
bestLabelResult.Name = "SessionBest"
bestLabelResult.Size = UDim2.new(1, -24, 0, 22)
bestLabelResult.Position = UDim2.fromOffset(12, 170)
bestLabelResult.BackgroundTransparency = 1
bestLabelResult.Font = Enum.Font.GothamBold
bestLabelResult.TextColor3 = Color3.fromRGB(200, 200, 200)
bestLabelResult.TextScaled = true
bestLabelResult.TextXAlignment = Enum.TextXAlignment.Left
bestLabelResult.Text = ""
bestLabelResult.Visible = false
bestLabelResult.ZIndex = 9
bestLabelResult.Parent = resultFrame

local newBestResult = Instance.new("TextLabel")
newBestResult.Size = UDim2.new(1, -24, 0, 20)
newBestResult.Position = UDim2.fromOffset(12, 194)
newBestResult.BackgroundTransparency = 1
newBestResult.Font = Enum.Font.GothamBlack
newBestResult.TextColor3 = Color3.fromRGB(255, 220, 40)
newBestResult.TextStrokeTransparency = 0.2
newBestResult.TextScaled = true
newBestResult.TextXAlignment = Enum.TextXAlignment.Left
newBestResult.Text = "NEW BEST!"
newBestResult.Visible = false
newBestResult.ZIndex = 10
newBestResult.Parent = resultFrame

stateValue.Changed:Connect(function()
	local state = stateValue.Value
	if state == "Result" then
		local cp = player:GetAttribute("CheckpointIndex") or 0
		local fr = player:GetAttribute("FinishRank") or 0
		local score = cp + (fr > 0 and 5 or 0)
		local isNew = score > sessionBestScore and sessionBestScore > 0
		if score > sessionBestScore then
			sessionBestScore = score
		end
		player:SetAttribute("SessionBestScore", sessionBestScore)
		bestLabelResult.Text = string.format("Session Best: %d", sessionBestScore)
		bestLabelResult.Visible = true
		if isNew then
			newBestResult.Visible = true
			task.spawn(function()
				for i = 1, 6 do
					newBestResult.TextTransparency = (i % 2 == 0) and 0 or 0.5
					task.wait(0.25)
				end
				newBestResult.TextTransparency = 0
			end)
		else
			newBestResult.Visible = false
		end
	elseif state == "Lobby" then
		bestLabelResult.Visible = false
		newBestResult.Visible = false
	end
end)

----------------------------------------------------------------------------
-- POLISH: Quick restart hint (R key)
----------------------------------------------------------------------------
local UserInputService = game:GetService("UserInputService")

local restartHint = Instance.new("TextLabel")
restartHint.Size = UDim2.new(1, -24, 0, 18)
restartHint.Position = UDim2.fromOffset(12, 196)
restartHint.BackgroundTransparency = 1
restartHint.Font = Enum.Font.GothamMedium
restartHint.TextColor3 = Color3.fromRGB(180, 180, 180)
restartHint.TextScaled = true
restartHint.TextXAlignment = Enum.TextXAlignment.Left
restartHint.Text = "Press R for quick restart"
restartHint.Visible = false
restartHint.ZIndex = 9
restartHint.Parent = resultFrame

stateValue.Changed:Connect(function()
	restartHint.Visible = (stateValue.Value == "Result")
end)

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.R and stateValue.Value == "Result" then
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
damageEdgeOverlay.Parent = gui

local edgeStroke = Instance.new("UIStroke")
edgeStroke.Thickness = 0
edgeStroke.Color = Color3.fromRGB(255, 0, 0)
edgeStroke.Transparency = 1
edgeStroke.Parent = damageEdgeOverlay

local prevPlayerHP = nil
RunService.Heartbeat:Connect(function()
	local char = player.Character
	if not char then return end
	local humanoid = char:FindFirstChildWhichIsA("Humanoid")
	if not humanoid then return end
	local hp = humanoid.Health
	if prevPlayerHP and hp < prevPlayerHP then
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
	prevPlayerHP = hp
end)

----------------------------------------------------------------------------
-- POLISH: Countdown drama
----------------------------------------------------------------------------
local countdownOverlay = Instance.new("TextLabel")
countdownOverlay.Name = "CountdownOverlay"
countdownOverlay.AnchorPoint = Vector2.new(0.5, 0.5)
countdownOverlay.Position = UDim2.fromScale(0.5, 0.45)
countdownOverlay.Size = UDim2.fromOffset(300, 120)
countdownOverlay.BackgroundTransparency = 1
countdownOverlay.Font = Enum.Font.GothamBlack
countdownOverlay.TextScaled = true
countdownOverlay.TextColor3 = Color3.fromRGB(255, 255, 255)
countdownOverlay.TextStrokeTransparency = 0.3
countdownOverlay.Text = ""
countdownOverlay.Visible = false
countdownOverlay.ZIndex = 20
countdownOverlay.Parent = gui

local lastCDVal = -1
timerValue.Changed:Connect(function()
	local gs = stateValue.Value
	local tv = timerValue.Value
	if gs == "Countdown" and tv > 0 and tv ~= lastCDVal then
		countdownOverlay.Visible = true
		countdownOverlay.Text = tostring(tv)
		local scale = 1 + (4 - math.clamp(tv, 1, 3)) * 0.3
		countdownOverlay.Size = UDim2.fromOffset(300 * scale, 120 * scale)
		if tv == 1 then
			countdownOverlay.TextColor3 = Color3.fromRGB(255, 100, 100)
		elseif tv == 2 then
			countdownOverlay.TextColor3 = Color3.fromRGB(255, 200, 80)
		else
			countdownOverlay.TextColor3 = Color3.fromRGB(255, 255, 255)
		end
		lastCDVal = tv
	elseif gs == "Playing" and lastCDVal > 0 then
		countdownOverlay.Text = "ROLL!"
		countdownOverlay.TextColor3 = Color3.fromRGB(135, 255, 173)
		countdownOverlay.Size = UDim2.fromOffset(400, 160)
		lastCDVal = -1
		task.delay(0.7, function()
			countdownOverlay.Visible = false
		end)
	end
end)

stateValue.Changed:Connect(function()
	if stateValue.Value == "Lobby" then
		countdownOverlay.Visible = false
		lastCDVal = -1
	end
end)

----------------------------------------------------------------------------
-- POLISH: SPEED DEMON! popup when maintaining boost for 3+ seconds
----------------------------------------------------------------------------
local boostStartTime = 0
local boostActivePolish = false
local speedDemonShown = false

RunService.Heartbeat:Connect(function()
	local boostReady = player:GetAttribute("BoostReady") or false
	local speed = player:GetAttribute("BallSpeed") or 0
	local state = stateValue.Value

	if state ~= "Playing" then
		boostActivePolish = false
		speedDemonShown = false
		return
	end

	if not boostReady and speed > 28 then
		if not boostActivePolish then
			boostActivePolish = true
			boostStartTime = tick()
			speedDemonShown = false
		elseif not speedDemonShown and tick() - boostStartTime >= 3 then
			speedDemonShown = true
			local speedDemonLabel = Instance.new("TextLabel")
			speedDemonLabel.AnchorPoint = Vector2.new(0.5, 0.5)
			speedDemonLabel.Position = UDim2.fromScale(0.5, 0.35)
			speedDemonLabel.Size = UDim2.fromOffset(420, 60)
			speedDemonLabel.BackgroundTransparency = 1
			speedDemonLabel.Font = Enum.Font.GothamBlack
			speedDemonLabel.TextScaled = true
			speedDemonLabel.TextColor3 = Color3.fromRGB(255, 100, 40)
			speedDemonLabel.TextStrokeTransparency = 0.15
			speedDemonLabel.TextStrokeColor3 = Color3.fromRGB(80, 20, 0)
			speedDemonLabel.Text = "SPEED DEMON!"
			speedDemonLabel.ZIndex = 15
			speedDemonLabel.Parent = gui
			flashScreen(Color3.fromRGB(255, 140, 40), 0.3)
			task.delay(2.0, function()
				if speedDemonLabel.Parent then
					for step = 1, 8 do
						speedDemonLabel.TextTransparency = step / 8
						task.wait(0.04)
					end
					speedDemonLabel:Destroy()
				end
			end)
		end
	else
		boostActivePolish = false
		speedDemonShown = false
	end
end)
