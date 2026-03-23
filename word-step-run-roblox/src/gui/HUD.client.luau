-- Word Step Run HUD
-- Release-quality: block spawn flash, checkpoint popup, cooldown bars,
-- timer urgency, countdown drama, finish celebration, result screen

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local localPlayer = Players.LocalPlayer
local playerGui = localPlayer:WaitForChild("PlayerGui")

local MatchStateChanged = ReplicatedStorage:WaitForChild("MatchStateChanged")
local MatchCountdown = ReplicatedStorage:WaitForChild("MatchCountdown")
local ProgressChanged = ReplicatedStorage:WaitForChild("ProgressChanged")
local CommandCooldown = ReplicatedStorage:WaitForChild("CommandCooldown")
local CommandRequest = ReplicatedStorage:WaitForChild("CommandRequest")

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "WordStepHUD"
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
topBar.Size = UDim2.new(1, 0, 0, 94)
topBar.BackgroundColor3 = Color3.fromRGB(16, 19, 28)
topBar.BackgroundTransparency = 0.18
topBar.BorderSizePixel = 0
topBar.Parent = rootFrame

local stateLabel = Instance.new("TextLabel")
stateLabel.Size = UDim2.fromScale(0.32, 0.5)
stateLabel.Position = UDim2.fromScale(0.02, 0.04)
stateLabel.BackgroundTransparency = 1
stateLabel.TextXAlignment = Enum.TextXAlignment.Left
stateLabel.Font = Enum.Font.GothamBlack
stateLabel.TextScaled = true
stateLabel.TextColor3 = Color3.fromRGB(246, 246, 246)
stateLabel.Text = "Lobby"
stateLabel.Parent = topBar

local timerLabel = Instance.new("TextLabel")
timerLabel.Size = UDim2.fromScale(0.18, 0.5)
timerLabel.Position = UDim2.fromScale(0.41, 0.04)
timerLabel.BackgroundTransparency = 1
timerLabel.Font = Enum.Font.GothamBlack
timerLabel.TextScaled = true
timerLabel.TextColor3 = Color3.fromRGB(255, 220, 104)
timerLabel.Text = "--"
timerLabel.Parent = topBar

local rankLabel = Instance.new("TextLabel")
rankLabel.Size = UDim2.fromScale(0.22, 0.5)
rankLabel.Position = UDim2.fromScale(0.76, 0.04)
rankLabel.BackgroundTransparency = 1
rankLabel.TextXAlignment = Enum.TextXAlignment.Right
rankLabel.Font = Enum.Font.GothamBlack
rankLabel.TextScaled = true
rankLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
rankLabel.Text = "Rank --"
rankLabel.Parent = topBar

local progressLabel = Instance.new("TextLabel")
progressLabel.Size = UDim2.fromScale(0.46, 0.32)
progressLabel.Position = UDim2.fromScale(0.02, 0.58)
progressLabel.BackgroundTransparency = 1
progressLabel.TextXAlignment = Enum.TextXAlignment.Left
progressLabel.Font = Enum.Font.GothamBold
progressLabel.TextScaled = true
progressLabel.TextColor3 = Color3.fromRGB(220, 225, 240)
progressLabel.Text = "Checkpoint 0/3"
progressLabel.Parent = topBar

local hintLabel = Instance.new("TextLabel")
hintLabel.Size = UDim2.fromScale(0.5, 0.32)
hintLabel.Position = UDim2.fromScale(0.48, 0.58)
hintLabel.BackgroundTransparency = 1
hintLabel.TextXAlignment = Enum.TextXAlignment.Right
hintLabel.Font = Enum.Font.GothamMedium
hintLabel.TextScaled = true
hintLabel.TextColor3 = Color3.fromRGB(229, 229, 229)
hintLabel.Text = "Q STEP  E BRIDGE  R UP  F PUSH  G TRAP"
hintLabel.Parent = topBar

local countdownLabel = Instance.new("TextLabel")
countdownLabel.Size = UDim2.fromOffset(320, 120)
countdownLabel.Position = UDim2.new(0.5, -160, 0.5, -60)
countdownLabel.BackgroundTransparency = 1
countdownLabel.Font = Enum.Font.GothamBlack
countdownLabel.TextScaled = true
countdownLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
countdownLabel.TextStrokeTransparency = 0.45
countdownLabel.Visible = false
countdownLabel.Parent = rootFrame

-- Checkpoint notification popup
local checkpointPopup = Instance.new("TextLabel")
checkpointPopup.Size = UDim2.fromOffset(380, 60)
checkpointPopup.Position = UDim2.new(0.5, -190, 0.35, 0)
checkpointPopup.BackgroundTransparency = 1
checkpointPopup.Font = Enum.Font.GothamBlack
checkpointPopup.TextScaled = true
checkpointPopup.TextColor3 = Color3.fromRGB(120, 255, 160)
checkpointPopup.TextStrokeTransparency = 0.3
checkpointPopup.Text = ""
checkpointPopup.Visible = false
checkpointPopup.ZIndex = 95
checkpointPopup.Parent = rootFrame

-- Finish celebration overlay
local finishFrame = Instance.new("Frame")
finishFrame.Size = UDim2.fromScale(1, 1)
finishFrame.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
finishFrame.BackgroundTransparency = 0.4
finishFrame.BorderSizePixel = 0
finishFrame.Visible = false
finishFrame.ZIndex = 90
finishFrame.Parent = screenGui

local finishTitle = Instance.new("TextLabel")
finishTitle.Size = UDim2.fromScale(0.6, 0.14)
finishTitle.Position = UDim2.fromScale(0.2, 0.28)
finishTitle.BackgroundTransparency = 1
finishTitle.Font = Enum.Font.GothamBlack
finishTitle.TextScaled = true
finishTitle.TextColor3 = Color3.fromRGB(255, 220, 80)
finishTitle.TextStrokeTransparency = 0.2
finishTitle.Text = ""
finishTitle.ZIndex = 91
finishTitle.Parent = finishFrame

local finishStats = Instance.new("TextLabel")
finishStats.Size = UDim2.fromScale(0.5, 0.12)
finishStats.Position = UDim2.fromScale(0.25, 0.44)
finishStats.BackgroundTransparency = 1
finishStats.Font = Enum.Font.GothamBold
finishStats.TextScaled = true
finishStats.TextColor3 = Color3.fromRGB(230, 230, 230)
finishStats.TextStrokeTransparency = 0.5
finishStats.Text = ""
finishStats.ZIndex = 91
finishStats.Parent = finishFrame

-- Cooldown bar frame (visual bars per command)
local cooldownBarFrame = Instance.new("Frame")
cooldownBarFrame.Size = UDim2.fromOffset(320, 18)
cooldownBarFrame.Position = UDim2.new(0.5, -160, 0, 100)
cooldownBarFrame.BackgroundTransparency = 1
cooldownBarFrame.Parent = rootFrame

local cooldownBarLayout = Instance.new("UIListLayout")
cooldownBarLayout.FillDirection = Enum.FillDirection.Horizontal
cooldownBarLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
cooldownBarLayout.Padding = UDim.new(0, 8)
cooldownBarLayout.Parent = cooldownBarFrame

local commandFrame = Instance.new("Frame")
commandFrame.Size = UDim2.fromOffset(474, 86)
commandFrame.Position = UDim2.new(0.5, -237, 1, -102)
commandFrame.BackgroundColor3 = Color3.fromRGB(15, 16, 24)
commandFrame.BackgroundTransparency = 0.12
commandFrame.BorderSizePixel = 0
commandFrame.Parent = rootFrame

local commandList = Instance.new("UIListLayout")
commandList.FillDirection = Enum.FillDirection.Horizontal
commandList.HorizontalAlignment = Enum.HorizontalAlignment.Center
commandList.VerticalAlignment = Enum.VerticalAlignment.Center
commandList.Padding = UDim.new(0, 12)
commandList.Parent = commandFrame

local PushTrapEvent = ReplicatedStorage:WaitForChild("PushTrapEvent")

local cooldownUntil = {
	STEP = 0,
	BRIDGE = 0,
	UP = 0,
	PUSH = 0,
	TRAP = 0,
}

local cooldownDuration = {
	STEP = 0.55,
	BRIDGE = 1.9,
	UP = 1.45,
	PUSH = 1.1,
	TRAP = 1.1,
}

local cooldownBarColors = {
	STEP = Color3.fromRGB(245, 245, 245),
	BRIDGE = Color3.fromRGB(255, 214, 92),
	UP = Color3.fromRGB(92, 235, 255),
	PUSH = Color3.fromRGB(255, 120, 50),
	TRAP = Color3.fromRGB(180, 60, 180),
}

-- PUSH/TRAP notification popup
local spellPopup = Instance.new("TextLabel")
spellPopup.Size = UDim2.fromOffset(320, 44)
spellPopup.Position = UDim2.new(0.5, -160, 0.42, 0)
spellPopup.BackgroundTransparency = 1
spellPopup.Font = Enum.Font.GothamBlack
spellPopup.TextScaled = true
spellPopup.TextStrokeTransparency = 0.2
spellPopup.Text = ""
spellPopup.Visible = false
spellPopup.ZIndex = 96
spellPopup.Parent = rootFrame

PushTrapEvent.OnClientEvent:Connect(function(effectType, sourceName)
	if effectType == "PUSHED" then
		spellPopup.Text = string.format("PUSHED by %s!", sourceName)
		spellPopup.TextColor3 = Color3.fromRGB(255, 120, 50)
	elseif effectType == "TRAPPED" then
		spellPopup.Text = string.format("TRAPPED by %s!", sourceName)
		spellPopup.TextColor3 = Color3.fromRGB(180, 60, 180)
	end
	spellPopup.Visible = true
	spellPopup.TextTransparency = 0
	task.spawn(function()
		task.wait(1.5)
		for step = 1, 6 do
			spellPopup.TextTransparency = step / 6
			task.wait(0.05)
		end
		spellPopup.Visible = false
	end)
end)

local buttons = {}
local cooldownBars = {}

local currentMatchState = "Lobby"
local currentTimerValue = 0
local lastCheckpoint = 0
local lastFinishRank = 0

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

local function showCheckpointPopup(checkpointIndex: number, totalCheckpoints: number)
	checkpointPopup.Text = string.format("CHECKPOINT %d/%d!", checkpointIndex, totalCheckpoints)
	checkpointPopup.Visible = true
	checkpointPopup.TextTransparency = 0
	screenFlash(Color3.fromRGB(120, 255, 160), 0.3, 0.25)
	screenShake(4, 0.2)
	task.spawn(function()
		task.wait(1.8)
		for step = 1, 6 do
			checkpointPopup.TextTransparency = step / 6
			task.wait(0.06)
		end
		checkpointPopup.Visible = false
	end)
end

local function showFinishCelebration(rank: number)
	finishFrame.Visible = true
	screenFlash(Color3.fromRGB(255, 220, 80), 0.5, 0.5)
	screenShake(8, 0.35)

	local ordinal = "th"
	if rank == 1 then
		ordinal = "st"
	elseif rank == 2 then
		ordinal = "nd"
	elseif rank == 3 then
		ordinal = "rd"
	end
	finishTitle.Text = string.format("FINISHED %d%s!", rank, ordinal)

	if rank == 1 then
		finishTitle.TextColor3 = Color3.fromRGB(255, 220, 80)
		finishStats.Text = "WINNER!"
	elseif rank == 2 then
		finishTitle.TextColor3 = Color3.fromRGB(200, 210, 230)
		finishStats.Text = "Great run!"
	elseif rank == 3 then
		finishTitle.TextColor3 = Color3.fromRGB(205, 145, 80)
		finishStats.Text = "Well done!"
	else
		finishTitle.TextColor3 = Color3.fromRGB(230, 230, 230)
		finishStats.Text = "You finished!"
	end
end

local function countdownPop(remaining: number)
	local scale = 1 + (4 - math.clamp(remaining, 1, 3)) * 0.3
	local baseW = 320
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

-- === Cooldown bar creation ===

local function makeCooldownBar(commandName: string, color: Color3)
	local holder = Instance.new("Frame")
	holder.Size = UDim2.fromOffset(100, 14)
	holder.BackgroundColor3 = Color3.fromRGB(30, 30, 40)
	holder.BorderSizePixel = 0
	holder.Parent = cooldownBarFrame

	local holderCorner = Instance.new("UICorner")
	holderCorner.CornerRadius = UDim.new(0, 4)
	holderCorner.Parent = holder

	local fill = Instance.new("Frame")
	fill.Size = UDim2.fromScale(1, 1)
	fill.BackgroundColor3 = color
	fill.BorderSizePixel = 0
	fill.Parent = holder

	local fillCorner = Instance.new("UICorner")
	fillCorner.CornerRadius = UDim.new(0, 4)
	fillCorner.Parent = fill

	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Font = Enum.Font.GothamBold
	label.TextScaled = true
	label.TextColor3 = Color3.fromRGB(20, 20, 30)
	label.Text = commandName
	label.ZIndex = 2
	label.Parent = holder

	cooldownBars[commandName] = {
		holder = holder,
		fill = fill,
	}
end

makeCooldownBar("STEP", Color3.fromRGB(245, 245, 245))
makeCooldownBar("BRIDGE", Color3.fromRGB(255, 214, 92))
makeCooldownBar("UP", Color3.fromRGB(92, 235, 255))
makeCooldownBar("PUSH", Color3.fromRGB(255, 120, 50))
makeCooldownBar("TRAP", Color3.fromRGB(180, 60, 180))

-- === Button factory ===

local function makeButton(commandName, keyHint, color)
	local button = Instance.new("TextButton")
	button.Name = commandName .. "Button"
	button.Size = UDim2.fromOffset(150, 60)
	button.BackgroundColor3 = color
	button.TextColor3 = Color3.fromRGB(18, 22, 28)
	button.Font = Enum.Font.GothamBlack
	button.TextScaled = true
	button.AutoButtonColor = true
	button.Text = string.format("%s\n[%s]", commandName, keyHint)
	button.Parent = commandFrame

	local stroke = Instance.new("UIStroke")
	stroke.Thickness = 1
	stroke.Color = Color3.fromRGB(255, 255, 255)
	stroke.Transparency = 0.6
	stroke.Parent = button

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 6)
	corner.Parent = button

	button.MouseButton1Click:Connect(function()
		CommandRequest:FireServer(commandName)
	end)

	buttons[commandName] = button
end

makeButton("STEP", "Q", Color3.fromRGB(245, 245, 245))
makeButton("BRIDGE", "E", Color3.fromRGB(255, 214, 92))
makeButton("UP", "R", Color3.fromRGB(92, 235, 255))
makeButton("PUSH", "F", Color3.fromRGB(255, 120, 50))
makeButton("TRAP", "G", Color3.fromRGB(180, 60, 180))

-- Widen command frame for 5 buttons
commandFrame.Size = UDim2.fromOffset(790, 86)

-- === State handler ===

local function setState(stateName, payload)
	currentMatchState = stateName
	if stateName == "Lobby" then
		stateLabel.Text = "Lobby"
		timerLabel.Text = payload and payload.remaining and tostring(payload.remaining) or "--"
		finishFrame.Visible = false
		lastCheckpoint = 0
		lastFinishRank = 0
	elseif stateName == "Countdown" then
		stateLabel.Text = "Get Ready"
		finishFrame.Visible = false
	elseif stateName == "Playing" then
		stateLabel.Text = "Race"
		if payload and payload.remaining ~= nil then
			currentTimerValue = tonumber(payload.remaining) or 0
			timerLabel.Text = tostring(payload.remaining)
		end
	elseif stateName == "Result" then
		stateLabel.Text = "Result"
		timerLabel.Text = payload and payload.winners or "--"
		-- Show result overlay if player didn't finish
		if lastFinishRank == 0 then
			finishFrame.Visible = true
			finishTitle.Text = "TIME UP!"
			finishTitle.TextColor3 = Color3.fromRGB(255, 100, 100)
			finishStats.Text = payload and payload.winners or "No finishers"
		end
	else
		stateLabel.Text = tostring(stateName)
	end
end

MatchStateChanged.OnClientEvent:Connect(function(stateName, payload)
	setState(stateName, payload)
end)

MatchCountdown.OnClientEvent:Connect(function(remaining)
	if remaining > 0 then
		countdownLabel.Visible = true
		countdownLabel.Text = tostring(remaining)
		countdownPop(remaining)
		screenFlash(Color3.fromRGB(255, 255, 255), 0.2, 0.12)
	else
		countdownLabel.Text = "GO!"
		countdownLabel.TextColor3 = Color3.fromRGB(120, 255, 160)
		countdownLabel.Size = UDim2.fromOffset(420, 160)
		countdownLabel.Position = UDim2.new(0.5, -210, 0.5, -80)
		screenFlash(Color3.fromRGB(120, 255, 160), 0.35, 0.3)
		task.delay(0.6, function()
			countdownLabel.Visible = false
		end)
	end
end)

ProgressChanged.OnClientEvent:Connect(function(payload)
	if typeof(payload) ~= "table" then
		return
	end
	local newCheckpoint = payload.checkpoint or 0
	local totalCheckpoints = payload.totalCheckpoints or 3
	local newFinishRank = payload.finishRank or 0

	rankLabel.Text = string.format("Rank %s", tostring(payload.rank or "--"))
	progressLabel.Text = string.format("Checkpoint %d/%d", newCheckpoint, totalCheckpoints)

	-- Detect new checkpoint reached
	if newCheckpoint > lastCheckpoint and newCheckpoint > 0 then
		showCheckpointPopup(newCheckpoint, totalCheckpoints)
	end
	lastCheckpoint = newCheckpoint

	-- Detect finish
	if newFinishRank > 0 and lastFinishRank == 0 then
		showFinishCelebration(newFinishRank)
	end
	lastFinishRank = newFinishRank
end)

CommandCooldown.OnClientEvent:Connect(function(commandName, duration)
	if cooldownUntil[commandName] ~= nil then
		cooldownUntil[commandName] = tick() + (tonumber(duration) or 0)
		cooldownDuration[commandName] = tonumber(duration) or cooldownDuration[commandName]

		-- Block placement flash
		screenFlash(cooldownBarColors[commandName] or Color3.fromRGB(255, 255, 255), 0.15, 0.12)
	end
end)

RunService.RenderStepped:Connect(function()
	for commandName, button in pairs(buttons) do
		local remain = (cooldownUntil[commandName] or 0) - tick()
		if remain > 0 then
			button.TextTransparency = 0.25
			button.Text = string.format("%s\n%.1fs", commandName, remain)
		else
			button.TextTransparency = 0
			if commandName == "STEP" then
				button.Text = "STEP\n[Q]"
			elseif commandName == "BRIDGE" then
				button.Text = "BRIDGE\n[E]"
			elseif commandName == "UP" then
				button.Text = "UP\n[R]"
			elseif commandName == "PUSH" then
				button.Text = "PUSH\n[F]"
			elseif commandName == "TRAP" then
				button.Text = "TRAP\n[G]"
			end
		end

		-- Update cooldown bar fill
		local bar = cooldownBars[commandName]
		if bar then
			if remain > 0 then
				local total = cooldownDuration[commandName] or 1
				local fraction = math.clamp(remain / total, 0, 1)
				bar.fill.Size = UDim2.fromScale(1 - fraction, 1)
			else
				bar.fill.Size = UDim2.fromScale(1, 1)
			end
		end
	end

	if UserInputService.TouchEnabled then
		hintLabel.Text = "Tap buttons to place word blocks"
	else
		hintLabel.Text = "Q STEP  E BRIDGE  R UP  F PUSH  G TRAP"
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
			timerLabel.TextColor3 = Color3.fromRGB(255, 220, 104)
		end
	else
		timerLabel.TextColor3 = Color3.fromRGB(255, 220, 104)
	end

	-- POLISH: Animated title pulse in Lobby
	if currentMatchState == "Lobby" then
		local scale = 1.0 + 0.1 * math.sin(tick() * 3)
		stateLabel.Size = UDim2.fromScale(0.32 * scale, 0.5 * scale)
	else
		stateLabel.Size = UDim2.fromScale(0.32, 0.5)
	end
end)

----------------------------------------------------------------------------
-- POLISH: Session Best checkpoint tracking
----------------------------------------------------------------------------
local sessionBestCP = 0

local bestLabel = Instance.new("TextLabel")
bestLabel.Size = UDim2.fromScale(0.5, 0.07)
bestLabel.Position = UDim2.fromScale(0.25, 0.58)
bestLabel.BackgroundTransparency = 1
bestLabel.Font = Enum.Font.GothamBold
bestLabel.TextScaled = true
bestLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
bestLabel.TextStrokeTransparency = 0.5
bestLabel.Text = ""
bestLabel.ZIndex = 91
bestLabel.Visible = false
bestLabel.Parent = finishFrame

local newBestLabel = Instance.new("TextLabel")
newBestLabel.Size = UDim2.fromScale(0.4, 0.06)
newBestLabel.Position = UDim2.fromScale(0.3, 0.66)
newBestLabel.BackgroundTransparency = 1
newBestLabel.Font = Enum.Font.GothamBlack
newBestLabel.TextScaled = true
newBestLabel.TextColor3 = Color3.fromRGB(255, 220, 40)
newBestLabel.TextStrokeTransparency = 0.2
newBestLabel.Text = "NEW BEST!"
newBestLabel.ZIndex = 92
newBestLabel.Visible = false
newBestLabel.Parent = finishFrame

MatchStateChanged.OnClientEvent:Connect(function(state, _payload)
	if state == "Result" then
		local score = lastCheckpoint + (lastFinishRank > 0 and 5 or 0)
		local isNew = score > sessionBestCP and sessionBestCP > 0
		if score > sessionBestCP then
			sessionBestCP = score
		end
		localPlayer:SetAttribute("SessionBestScore", sessionBestCP)
		bestLabel.Text = string.format("Session Best: %d", sessionBestCP)
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
-- POLISH: Quick restart hint (R key) -- Note: R is used for UP command
-- Use T instead since R is taken
----------------------------------------------------------------------------
local restartHint = Instance.new("TextLabel")
restartHint.Size = UDim2.fromScale(0.4, 0.05)
restartHint.Position = UDim2.fromScale(0.3, 0.75)
restartHint.BackgroundTransparency = 1
restartHint.Font = Enum.Font.GothamMedium
restartHint.TextScaled = true
restartHint.TextColor3 = Color3.fromRGB(180, 180, 180)
restartHint.Text = "Press R for quick restart"
restartHint.ZIndex = 91
restartHint.Visible = false
restartHint.Parent = finishFrame

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
-- POLISH: PARKOUR! popup for clearing 3+ gaps without falling
----------------------------------------------------------------------------
local gapsClearedInARow = 0
local lastOnGround = true

ProgressChanged.OnClientEvent:Connect(function(payload)
	if typeof(payload) ~= "table" then return end
	local newCP = payload.checkpoint or 0
	if newCP > 0 then
		gapsClearedInARow = gapsClearedInARow + 1
		if gapsClearedInARow >= 3 then
			-- Show PARKOUR! popup
			local parkourLabel = Instance.new("TextLabel")
			parkourLabel.Size = UDim2.fromOffset(380, 60)
			parkourLabel.Position = UDim2.new(0.5, -190, 0.28, 0)
			parkourLabel.BackgroundTransparency = 1
			parkourLabel.Font = Enum.Font.GothamBlack
			parkourLabel.TextScaled = true
			parkourLabel.TextColor3 = Color3.fromRGB(255, 180, 40)
			parkourLabel.TextStrokeTransparency = 0.15
			parkourLabel.TextStrokeColor3 = Color3.fromRGB(80, 40, 0)
			parkourLabel.Text = "PARKOUR!"
			parkourLabel.ZIndex = 96
			parkourLabel.Parent = rootFrame
			screenFlash(Color3.fromRGB(255, 180, 40), 0.3, 0.3)
			screenShake(5, 0.2)
			task.delay(2.0, function()
				if parkourLabel.Parent then
					for step = 1, 8 do
						parkourLabel.TextTransparency = step / 8
						task.wait(0.04)
					end
					parkourLabel:Destroy()
				end
			end)
		end
	end
end)

-- Reset gap counter on death/respawn
localPlayer.CharacterAdded:Connect(function()
	gapsClearedInARow = 0
end)
