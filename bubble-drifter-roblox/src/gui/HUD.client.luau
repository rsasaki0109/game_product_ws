local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local stateFolder = ReplicatedStorage:WaitForChild("BubbleDrifterState")

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BubbleDrifterHUD"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui

-- Main info panel (top-left)
local frame = Instance.new("Frame")
frame.Size = UDim2.fromOffset(420, 138)
frame.Position = UDim2.fromOffset(18, 18)
frame.BackgroundColor3 = Color3.fromRGB(21, 36, 49)
frame.BackgroundTransparency = 0.18
frame.Parent = screenGui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 18)
corner.Parent = frame

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, -24, 0, 34)
title.Position = UDim2.fromOffset(12, 10)
title.BackgroundTransparency = 1
title.Font = Enum.Font.GothamBlack
title.TextXAlignment = Enum.TextXAlignment.Left
title.TextColor3 = Color3.fromRGB(255, 255, 255)
title.TextScaled = true
title.Parent = frame

local hook = Instance.new("TextLabel")
hook.Size = UDim2.new(1, -24, 0, 28)
hook.Position = UDim2.fromOffset(12, 46)
hook.BackgroundTransparency = 1
hook.Font = Enum.Font.GothamMedium
hook.TextWrapped = true
hook.TextXAlignment = Enum.TextXAlignment.Left
hook.TextColor3 = Color3.fromRGB(220, 238, 245)
hook.TextScaled = true
hook.Parent = frame

local status = Instance.new("TextLabel")
status.Size = UDim2.new(0.46, -12, 0, 36)
status.Position = UDim2.fromOffset(12, 78)
status.BackgroundTransparency = 1
status.Font = Enum.Font.GothamBold
status.TextXAlignment = Enum.TextXAlignment.Left
status.TextColor3 = Color3.fromRGB(118, 213, 255)
status.TextScaled = true
status.Parent = frame

local controls = Instance.new("TextLabel")
controls.Size = UDim2.new(0.54, -12, 0, 36)
controls.Position = UDim2.new(0.46, 0, 0, 78)
controls.BackgroundTransparency = 1
controls.Font = Enum.Font.Gotham
controls.TextXAlignment = Enum.TextXAlignment.Right
controls.TextColor3 = Color3.fromRGB(255, 255, 255)
controls.TextScaled = true
controls.Parent = frame

local detail = Instance.new("TextLabel")
detail.Size = UDim2.new(1, -24, 0, 24)
detail.Position = UDim2.fromOffset(12, 114)
detail.BackgroundTransparency = 1
detail.Font = Enum.Font.GothamMedium
detail.TextXAlignment = Enum.TextXAlignment.Left
detail.TextColor3 = Color3.fromRGB(230, 247, 255)
detail.TextScaled = true
detail.Parent = frame

-- Bubble status indicator (top-right)
local bubbleFrame = Instance.new("Frame")
bubbleFrame.Name = "BubbleStatus"
bubbleFrame.AnchorPoint = Vector2.new(1, 0)
bubbleFrame.Position = UDim2.new(1, -18, 0, 18)
bubbleFrame.Size = UDim2.fromOffset(170, 56)
bubbleFrame.BackgroundColor3 = Color3.fromRGB(21, 36, 49)
bubbleFrame.BackgroundTransparency = 0.18
bubbleFrame.Parent = screenGui

local bubbleCorner = Instance.new("UICorner")
bubbleCorner.CornerRadius = UDim.new(0, 12)
bubbleCorner.Parent = bubbleFrame

local bubbleStroke = Instance.new("UIStroke")
bubbleStroke.Color = Color3.fromRGB(118, 213, 255)
bubbleStroke.Transparency = 0.25
bubbleStroke.Parent = bubbleFrame

local bubbleStateLabel = Instance.new("TextLabel")
bubbleStateLabel.Name = "BubbleState"
bubbleStateLabel.Size = UDim2.new(1, -16, 0, 28)
bubbleStateLabel.Position = UDim2.fromOffset(8, 4)
bubbleStateLabel.BackgroundTransparency = 1
bubbleStateLabel.Font = Enum.Font.GothamBlack
bubbleStateLabel.TextScaled = true
bubbleStateLabel.TextXAlignment = Enum.TextXAlignment.Center
bubbleStateLabel.Parent = bubbleFrame

local bubbleCooldownLabel = Instance.new("TextLabel")
bubbleCooldownLabel.Name = "CooldownLabel"
bubbleCooldownLabel.Size = UDim2.new(1, -16, 0, 18)
bubbleCooldownLabel.Position = UDim2.fromOffset(8, 34)
bubbleCooldownLabel.BackgroundTransparency = 1
bubbleCooldownLabel.Font = Enum.Font.GothamBold
bubbleCooldownLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
bubbleCooldownLabel.TextScaled = true
bubbleCooldownLabel.TextXAlignment = Enum.TextXAlignment.Center
bubbleCooldownLabel.Text = ""
bubbleCooldownLabel.Parent = bubbleFrame

-- Ring counter (below bubble status)
local ringFrame = Instance.new("Frame")
ringFrame.Name = "RingCounter"
ringFrame.AnchorPoint = Vector2.new(1, 0)
ringFrame.Position = UDim2.new(1, -18, 0, 82)
ringFrame.Size = UDim2.fromOffset(170, 28)
ringFrame.BackgroundColor3 = Color3.fromRGB(40, 36, 20)
ringFrame.BackgroundTransparency = 0.3
ringFrame.Parent = screenGui

local ringCorner = Instance.new("UICorner")
ringCorner.CornerRadius = UDim.new(0, 8)
ringCorner.Parent = ringFrame

local ringLabel = Instance.new("TextLabel")
ringLabel.Size = UDim2.fromScale(1, 1)
ringLabel.BackgroundTransparency = 1
ringLabel.Font = Enum.Font.GothamBold
ringLabel.TextColor3 = Color3.fromRGB(255, 212, 136)
ringLabel.TextScaled = true
ringLabel.Text = "Rings: 0/5"
ringLabel.Parent = ringFrame

-- Height indicator (below ring counter)
local heightFrame = Instance.new("Frame")
heightFrame.Name = "HeightIndicator"
heightFrame.AnchorPoint = Vector2.new(1, 0)
heightFrame.Position = UDim2.new(1, -18, 0, 116)
heightFrame.Size = UDim2.fromOffset(170, 22)
heightFrame.BackgroundColor3 = Color3.fromRGB(21, 36, 49)
heightFrame.BackgroundTransparency = 0.3
heightFrame.Parent = screenGui

local heightCorner = Instance.new("UICorner")
heightCorner.CornerRadius = UDim.new(0, 6)
heightCorner.Parent = heightFrame

local heightBarFill = Instance.new("Frame")
heightBarFill.Name = "Fill"
heightBarFill.Size = UDim2.new(0.5, 0, 1, 0)
heightBarFill.BackgroundColor3 = Color3.fromRGB(118, 213, 255)
heightBarFill.Parent = heightFrame

local heightFillCorner = Instance.new("UICorner")
heightFillCorner.CornerRadius = UDim.new(0, 6)
heightFillCorner.Parent = heightBarFill

local heightLabel = Instance.new("TextLabel")
heightLabel.Size = UDim2.fromScale(1, 1)
heightLabel.BackgroundTransparency = 1
heightLabel.Font = Enum.Font.GothamBold
heightLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
heightLabel.TextScaled = true
heightLabel.Text = "Alt: 0"
heightLabel.ZIndex = 2
heightLabel.Parent = heightFrame

-- Wind direction indicator (below height)
local windFrame = Instance.new("Frame")
windFrame.Name = "WindIndicator"
windFrame.AnchorPoint = Vector2.new(1, 0)
windFrame.Position = UDim2.new(1, -18, 0, 144)
windFrame.Size = UDim2.fromOffset(170, 24)
windFrame.BackgroundColor3 = Color3.fromRGB(21, 36, 49)
windFrame.BackgroundTransparency = 0.3
windFrame.Visible = false
windFrame.Parent = screenGui

local windCorner = Instance.new("UICorner")
windCorner.CornerRadius = UDim.new(0, 6)
windCorner.Parent = windFrame

local windLabel = Instance.new("TextLabel")
windLabel.Size = UDim2.fromScale(1, 1)
windLabel.BackgroundTransparency = 1
windLabel.Font = Enum.Font.GothamBold
windLabel.TextColor3 = Color3.fromRGB(176, 243, 255)
windLabel.TextScaled = true
windLabel.Text = "WIND -->"
windLabel.Parent = windFrame

-- Center popup notification
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
popupLabel.Parent = screenGui

-- Result screen
local resultFrame = Instance.new("Frame")
resultFrame.Name = "ResultScreen"
resultFrame.AnchorPoint = Vector2.new(0.5, 0.5)
resultFrame.Position = UDim2.fromScale(0.5, 0.5)
resultFrame.Size = UDim2.fromOffset(340, 240)
resultFrame.BackgroundColor3 = Color3.fromRGB(12, 22, 34)
resultFrame.BackgroundTransparency = 0.1
resultFrame.Visible = false
resultFrame.ZIndex = 8
resultFrame.Parent = screenGui

local resultCorner = Instance.new("UICorner")
resultCorner.CornerRadius = UDim.new(0, 16)
resultCorner.Parent = resultFrame

local resultStroke = Instance.new("UIStroke")
resultStroke.Color = Color3.fromRGB(118, 213, 255)
resultStroke.Thickness = 2
resultStroke.Parent = resultFrame

local resultTitle = Instance.new("TextLabel")
resultTitle.Name = "ResultTitle"
resultTitle.Size = UDim2.new(1, -24, 0, 36)
resultTitle.Position = UDim2.fromOffset(12, 10)
resultTitle.BackgroundTransparency = 1
resultTitle.Font = Enum.Font.GothamBlack
resultTitle.TextColor3 = Color3.fromRGB(118, 213, 255)
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

local bubbleButton = Instance.new("TextButton")
bubbleButton.Name = "BubbleButton"
bubbleButton.AnchorPoint = Vector2.new(1, 1)
bubbleButton.Position = UDim2.new(1, -100, 1, -24)
bubbleButton.Size = mobileButtonSize
bubbleButton.BackgroundColor3 = Color3.fromRGB(176, 243, 255)
bubbleButton.BackgroundTransparency = 0.2
bubbleButton.Font = Enum.Font.GothamBlack
bubbleButton.TextColor3 = Color3.fromRGB(21, 36, 49)
bubbleButton.TextScaled = true
bubbleButton.Text = "BUBBLE"
bubbleButton.ZIndex = 6
bubbleButton.Parent = screenGui

local bubbleBtnCorner = Instance.new("UICorner")
bubbleBtnCorner.CornerRadius = UDim.new(0, 16)
bubbleBtnCorner.Parent = bubbleButton

local popButton = Instance.new("TextButton")
popButton.Name = "PopButton"
popButton.AnchorPoint = Vector2.new(1, 1)
popButton.Position = UDim2.new(1, -18, 1, -24)
popButton.Size = mobileButtonSize
popButton.BackgroundColor3 = Color3.fromRGB(255, 120, 120)
popButton.BackgroundTransparency = 0.2
popButton.Font = Enum.Font.GothamBlack
popButton.TextColor3 = Color3.fromRGB(255, 255, 255)
popButton.TextScaled = true
popButton.Text = "POP"
popButton.ZIndex = 6
popButton.Parent = screenGui

local popBtnCorner = Instance.new("UICorner")
popBtnCorner.CornerRadius = UDim.new(0, 16)
popBtnCorner.Parent = popButton

-- BUBBLE MERGE event
local BubbleMergeEvent = ReplicatedStorage:WaitForChild("BubbleMergeEvent")

BubbleMergeEvent.OnClientEvent:Connect(function(playerAName, playerBName, action)
	local localName = player.Name
	if localName == playerAName or localName == playerBName then
		if action == "merge" then
			showPopup("BUBBLE MERGE!", Color3.fromRGB(255, 140, 255), 2)
		elseif action == "pop" then
			showPopup("MERGE POP!", Color3.fromRGB(255, 80, 80), 1.5)
		end
	end
end)

-- Wire mobile buttons
local BubbleRequest = ReplicatedStorage:WaitForChild("BubbleRequest")
bubbleButton.Activated:Connect(function()
	BubbleRequest:FireServer("Bubble")
end)
popButton.Activated:Connect(function()
	BubbleRequest:FireServer("Pop")
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

-- Track previous values for change detection
local prevCheckpoint = 0
local prevRingScore = 0
local prevFinishRank = 0
local prevState = ""

-- Wind direction arrow helper
local function windArrow(windX, windZ)
	if math.abs(windX) < 1 and math.abs(windZ) < 1 then
		return ""
	end
	local angle = math.atan2(windX, -windZ)
	local deg = math.deg(angle)
	if deg < 0 then
		deg = deg + 360
	end
	-- 8-direction compass
	if deg < 22.5 or deg >= 337.5 then
		return "WIND ^"
	elseif deg < 67.5 then
		return "WIND ^>"
	elseif deg < 112.5 then
		return "WIND -->"
	elseif deg < 157.5 then
		return "WIND v>"
	elseif deg < 202.5 then
		return "WIND v"
	elseif deg < 247.5 then
		return "WIND <v"
	elseif deg < 292.5 then
		return "WIND <--"
	else
		return "WIND <^"
	end
end

local function refresh()
	title.Text = stateFolder.Title.Value
	hook.Text = stateFolder.Hook.Value
	controls.Text = stateFolder.Controls.Value

	local gameState = stateFolder.State.Value
	local timer = stateFolder.Timer.Value

	-- Timer urgency
	if gameState == "Playing" and timer <= 15 then
		local blink = math.floor(tick() * 2) % 2 == 0
		status.TextColor3 = blink and Color3.fromRGB(255, 80, 80) or Color3.fromRGB(118, 213, 255)
	else
		status.TextColor3 = Color3.fromRGB(118, 213, 255)
	end
	status.Text = string.format("%s  %02d", gameState, timer)

	local ringScoreVal = player:GetAttribute("RingScore") or 0
	local checkpointVal = player:GetAttribute("CheckpointIndex") or 0
	local raceRank = player:GetAttribute("RaceRank") or 1
	local bubbleActive = player:GetAttribute("BubbleActive") or false
	local finishRankVal = player:GetAttribute("FinishRank") or 0

	-- Bubble status indicator
	local isPlaying = (gameState == "Playing" or gameState == "Countdown")
	bubbleFrame.Visible = isPlaying
	if bubbleActive then
		bubbleStateLabel.Text = "FLOATING"
		bubbleStateLabel.TextColor3 = Color3.fromRGB(176, 243, 255)
		bubbleFrame.BackgroundColor3 = Color3.fromRGB(21, 46, 59)
	else
		bubbleStateLabel.Text = "WALKING"
		bubbleStateLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
		bubbleFrame.BackgroundColor3 = Color3.fromRGB(21, 36, 49)
	end

	-- Bubble cooldown indicator
	local cooldownUntil = player:GetAttribute("BubbleCooldownUntil") or 0
	local now = tick()
	if not bubbleActive and cooldownUntil > now then
		local remaining = math.ceil((cooldownUntil - now) * 10) / 10
		bubbleCooldownLabel.Text = string.format("CD: %.1fs", remaining)
		bubbleCooldownLabel.TextColor3 = Color3.fromRGB(255, 150, 150)
	else
		bubbleCooldownLabel.Text = bubbleActive and "Active" or "Ready"
		bubbleCooldownLabel.TextColor3 = bubbleActive and Color3.fromRGB(176, 243, 255) or Color3.fromRGB(100, 200, 100)
	end

	-- Ring counter
	ringFrame.Visible = isPlaying
	ringLabel.Text = string.format("Rings: %d/5", ringScoreVal)

	-- Height indicator
	heightFrame.Visible = isPlaying
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	local altitude = root and math.floor(root.Position.Y) or 0
	local maxHeight = 92
	local heightFraction = math.clamp(altitude / maxHeight, 0, 1)
	heightBarFill.Size = UDim2.new(heightFraction, 0, 1, 0)
	heightLabel.Text = string.format("Alt: %d", altitude)

	-- Wind direction (check if player is in a wind lane area)
	local inWind = false
	if root and isPlaying then
		-- Check approximate wind lane positions
		local pos = root.Position
		if pos.Y >= 24 and pos.Y <= 36 and pos.X >= -39 and pos.X <= -17 then
			windLabel.Text = windArrow(18, -26)
			inWind = true
		elseif pos.Y >= 39 and pos.Y <= 54 and pos.X >= -17 and pos.X <= 9 then
			windLabel.Text = windArrow(20, -22)
			inWind = true
		elseif pos.Y >= 57 and pos.Y <= 72 and pos.X >= 6 and pos.X <= 30 then
			windLabel.Text = windArrow(-12, -24)
			inWind = true
		end
	end
	windFrame.Visible = inWind

	-- Mobile button visibility
	bubbleButton.Visible = (gameState == "Playing")
	popButton.Visible = (gameState == "Playing")

	-- Checkpoint popup
	if checkpointVal > prevCheckpoint and checkpointVal > 0 and gameState == "Playing" then
		showPopup(string.format("Checkpoint %d/5!", checkpointVal), Color3.fromRGB(255, 223, 133), 1.5)
	end

	-- Ring pass flash
	if ringScoreVal > prevRingScore and gameState == "Playing" then
		showPopup(string.format("Ring %d/5 Cleared!", ringScoreVal), Color3.fromRGB(255, 212, 136), 1.2)
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
		showPopup(string.format("YOU FINISHED %d%s!", finishRankVal, ordinal), Color3.fromRGB(120, 255, 190), 4)
	end

	-- Result screen
	if gameState == "Result" then
		resultFrame.Visible = true
		local summaryChild = stateFolder:FindFirstChild("Summary")
		resultBody.Text = summaryChild and summaryChild.Value or ""
	elseif prevState == "Result" and gameState ~= "Result" then
		resultFrame.Visible = false
	end

	-- Detail line
	local finishText = finishRankVal > 0 and string.format("Finish #%d", finishRankVal) or string.format("Rank %d", raceRank)
	detail.Text = string.format(
		"Rings %d/5  |  CP %d/5  |  %s  |  Bubble %s",
		ringScoreVal,
		checkpointVal,
		finishText,
		bubbleActive and "ON" or "OFF"
	)

	-- Save for change detection
	prevCheckpoint = checkpointVal
	prevRingScore = ringScoreVal
	prevFinishRank = finishRankVal
	prevState = gameState
end

for _, child in ipairs(stateFolder:GetChildren()) do
	if child:IsA("StringValue") or child:IsA("IntValue") then
		child:GetPropertyChangedSignal("Value"):Connect(refresh)
	end
end

for _, attrName in ipairs({ "RingScore", "CheckpointIndex", "RaceRank", "BubbleActive", "FinishRank", "BubbleCooldownUntil" }) do
	player:GetAttributeChangedSignal(attrName):Connect(refresh)
end

-- Periodic updates for timer blink, height, wind, and cooldown
RunService.Heartbeat:Connect(function()
	local gameState = stateFolder.State.Value
	local timer = stateFolder.Timer.Value

	-- Timer blink
	if gameState == "Playing" and timer <= 15 then
		local blink = math.floor(tick() * 2) % 2 == 0
		status.TextColor3 = blink and Color3.fromRGB(255, 80, 80) or Color3.fromRGB(118, 213, 255)
	end

	-- Update height bar continuously
	if gameState == "Playing" or gameState == "Countdown" then
		local character = player.Character
		local root = character and character:FindFirstChild("HumanoidRootPart")
		if root then
			local altitude = math.floor(root.Position.Y)
			local heightFraction = math.clamp(altitude / 92, 0, 1)
			heightBarFill.Size = UDim2.new(heightFraction, 0, 1, 0)
			heightLabel.Text = string.format("Alt: %d", altitude)

			-- Update wind indicator
			local pos = root.Position
			local inWind = false
			if pos.Y >= 24 and pos.Y <= 36 and pos.X >= -39 and pos.X <= -17 then
				windLabel.Text = windArrow(18, -26)
				inWind = true
			elseif pos.Y >= 39 and pos.Y <= 54 and pos.X >= -17 and pos.X <= 9 then
				windLabel.Text = windArrow(20, -22)
				inWind = true
			elseif pos.Y >= 57 and pos.Y <= 72 and pos.X >= 6 and pos.X <= 30 then
				windLabel.Text = windArrow(-12, -24)
				inWind = true
			end
			windFrame.Visible = inWind
		end
	end

	-- Update bubble cooldown text
	local cooldownUntil = player:GetAttribute("BubbleCooldownUntil") or 0
	local bubbleActive = player:GetAttribute("BubbleActive") or false
	local now = tick()
	if not bubbleActive and cooldownUntil > now then
		local remaining = math.ceil((cooldownUntil - now) * 10) / 10
		bubbleCooldownLabel.Text = string.format("CD: %.1fs", remaining)
		bubbleCooldownLabel.TextColor3 = Color3.fromRGB(255, 150, 150)
	end
end)

refresh()

----------------------------------------------------------------------------
-- POLISH: Animated title pulse in Lobby
----------------------------------------------------------------------------
RunService.RenderStepped:Connect(function()
	local gameState = stateFolder.State.Value
	if gameState == "Lobby" then
		local scale = 1.0 + 0.1 * math.sin(tick() * 3)
		title.Size = UDim2.new(1, -24, 0, 34 * scale)
	else
		title.Size = UDim2.new(1, -24, 0, 34)
	end
end)

----------------------------------------------------------------------------
-- POLISH: Session Best score tracking
----------------------------------------------------------------------------
local sessionBestScore = 0

local bestLabel = Instance.new("TextLabel")
bestLabel.Name = "SessionBest"
bestLabel.Size = UDim2.new(1, -24, 0, 24)
bestLabel.Position = UDim2.fromOffset(12, 190)
bestLabel.BackgroundTransparency = 1
bestLabel.Font = Enum.Font.GothamBold
bestLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
bestLabel.TextScaled = true
bestLabel.TextXAlignment = Enum.TextXAlignment.Left
bestLabel.Text = ""
bestLabel.Visible = false
bestLabel.ZIndex = 9
bestLabel.Parent = resultFrame

local newBestLabel = Instance.new("TextLabel")
newBestLabel.Size = UDim2.new(1, -24, 0, 20)
newBestLabel.Position = UDim2.fromOffset(12, 216)
newBestLabel.BackgroundTransparency = 1
newBestLabel.Font = Enum.Font.GothamBlack
newBestLabel.TextColor3 = Color3.fromRGB(255, 220, 40)
newBestLabel.TextStrokeTransparency = 0.2
newBestLabel.TextScaled = true
newBestLabel.TextXAlignment = Enum.TextXAlignment.Left
newBestLabel.Text = "NEW BEST!"
newBestLabel.Visible = false
newBestLabel.ZIndex = 10
newBestLabel.Parent = resultFrame

local function checkSessionBest()
	local ringScore = player:GetAttribute("RingScore") or 0
	local finishRank = player:GetAttribute("FinishRank") or 0
	local score = ringScore + (finishRank > 0 and (5 - finishRank) or 0)
	local isNew = score > sessionBestScore and sessionBestScore > 0
	if score > sessionBestScore then
		sessionBestScore = score
	end
	player:SetAttribute("SessionBestScore", sessionBestScore)
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

stateFolder.State:GetPropertyChangedSignal("Value"):Connect(function()
	local gs = stateFolder.State.Value
	if gs == "Result" then
		checkSessionBest()
	elseif gs == "Lobby" then
		bestLabel.Visible = false
		newBestLabel.Visible = false
	end
end)

----------------------------------------------------------------------------
-- POLISH: Quick restart hint (R key)
----------------------------------------------------------------------------
local UserInputService = game:GetService("UserInputService")

local restartHint = Instance.new("TextLabel")
restartHint.Size = UDim2.new(1, -24, 0, 20)
restartHint.Position = UDim2.fromOffset(12, 218)
restartHint.BackgroundTransparency = 1
restartHint.Font = Enum.Font.GothamMedium
restartHint.TextColor3 = Color3.fromRGB(180, 180, 180)
restartHint.TextScaled = true
restartHint.TextXAlignment = Enum.TextXAlignment.Left
restartHint.Text = "Press R for quick restart"
restartHint.Visible = false
restartHint.ZIndex = 9
restartHint.Parent = resultFrame

stateFolder.State:GetPropertyChangedSignal("Value"):Connect(function()
	restartHint.Visible = (stateFolder.State.Value == "Result")
end)

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.R and stateFolder.State.Value == "Result" then
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
-- POLISH: Countdown drama overlay
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
countdownOverlay.Parent = screenGui

local lastCountdownVal = -1
stateFolder.Timer:GetPropertyChangedSignal("Value"):Connect(function()
	local gs = stateFolder.State.Value
	local tv = stateFolder.Timer.Value
	if gs == "Countdown" and tv > 0 and tv ~= lastCountdownVal then
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
		lastCountdownVal = tv
	elseif gs == "Playing" and lastCountdownVal > 0 then
		countdownOverlay.Text = "DRIFT!"
		countdownOverlay.TextColor3 = Color3.fromRGB(255, 220, 60)
		countdownOverlay.Size = UDim2.fromOffset(400, 160)
		lastCountdownVal = -1
		task.delay(0.7, function()
			countdownOverlay.Visible = false
		end)
	end
end)

stateFolder.State:GetPropertyChangedSignal("Value"):Connect(function()
	if stateFolder.State.Value == "Lobby" then
		countdownOverlay.Visible = false
		lastCountdownVal = -1
	end
end)

----------------------------------------------------------------------------
-- POLISH: Altitude milestone popups: 10m!, 20m!, etc.
----------------------------------------------------------------------------
local lastMilestone = 0

RunService.Heartbeat:Connect(function()
	local gs = stateFolder.State.Value
	if gs ~= "Playing" then
		lastMilestone = 0
		return
	end
	local char = player.Character
	local root = char and char:FindFirstChild("HumanoidRootPart")
	if not root then return end
	local alt = math.floor(root.Position.Y)
	local milestone = math.floor(alt / 10) * 10
	if milestone > lastMilestone and milestone >= 10 then
		lastMilestone = milestone
		showPopup(string.format("%dm!", milestone), Color3.fromRGB(120, 255, 220), 1.2)
	end
end)
