-- HUD.client.luau
-- Hot Air Havoc: full game HUD with fuel gauge, altitude meter, controls,
-- status indicators, minimap, and mobile buttons.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local stateFolder = ReplicatedStorage:WaitForChild("HotAirHavocState")

-- Remotes
local BurnStart = ReplicatedStorage:WaitForChild("BurnStart")
local BurnStop = ReplicatedStorage:WaitForChild("BurnStop")
local VentStart = ReplicatedStorage:WaitForChild("VentStart")
local VentStop = ReplicatedStorage:WaitForChild("VentStop")
local Boost = ReplicatedStorage:WaitForChild("Boost")
local PlayerStateUpdate = ReplicatedStorage:WaitForChild("PlayerStateUpdate")
local MatchResult = ReplicatedStorage:WaitForChild("MatchResult")
local EliminatedEvent = ReplicatedStorage:WaitForChild("Eliminated")
local FuelPickupCollected = ReplicatedStorage:WaitForChild("FuelPickupCollected")
local GrappleRequest = ReplicatedStorage:WaitForChild("GrappleRequest")
local GrappleStateEvent = ReplicatedStorage:WaitForChild("GrappleStateEvent")

----------------------------------------------------------------------------
-- Player state (synced from server)
----------------------------------------------------------------------------
local currentFuel = 100
local currentAltitude = 20
local currentAction = "GLIDING"
local inWindLane = false
local boostReady = true
local boostCooldownRemaining = 0
local isEliminated = false
local grappleReady = true
local grappleCooldownRemaining = 0

-- Input state
local isBurning = false
local isVenting = false

----------------------------------------------------------------------------
-- Screen GUI
----------------------------------------------------------------------------
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "HotAirHavocHUD"
screenGui.ResetOnSpawn = false
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.Parent = playerGui

----------------------------------------------------------------------------
-- Helper: create UI elements
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
-- Top Bar: Title, State, Timer
----------------------------------------------------------------------------
local topBar = makeFrame({
	Size = UDim2.new(0, 420, 0, 70),
	Position = UDim2.new(0.5, 0, 0, 10),
	AnchorPoint = Vector2.new(0.5, 0),
	BackgroundColor3 = Color3.fromRGB(46, 29, 22),
	BackgroundTransparency = 0.16,
	Corner = 14,
})

local titleLabel = makeLabel({
	Size = UDim2.new(1, -20, 0, 28),
	Position = UDim2.fromOffset(10, 6),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(255, 255, 255),
	TextXAlignment = Enum.TextXAlignment.Left,
	Text = "Hot Air Havoc",
	Parent = topBar,
})

local stateTimerLabel = makeLabel({
	Size = UDim2.new(1, -20, 0, 26),
	Position = UDim2.fromOffset(10, 36),
	Font = Enum.Font.GothamMedium,
	TextColor3 = Color3.fromRGB(255, 208, 109),
	TextXAlignment = Enum.TextXAlignment.Left,
	Text = "Lobby 00",
	Parent = topBar,
})

----------------------------------------------------------------------------
-- Status Text (BURNING / VENTING / GLIDING / etc.)
----------------------------------------------------------------------------
local statusFrame = makeFrame({
	Size = UDim2.new(0, 260, 0, 40),
	Position = UDim2.new(0.5, 0, 0, 88),
	AnchorPoint = Vector2.new(0.5, 0),
	BackgroundColor3 = Color3.fromRGB(20, 20, 20),
	BackgroundTransparency = 0.3,
	Corner = 10,
})

local actionLabel = makeLabel({
	Size = UDim2.new(1, -10, 1, 0),
	Position = UDim2.fromOffset(5, 0),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(255, 255, 255),
	Text = "GLIDING",
	Parent = statusFrame,
})

----------------------------------------------------------------------------
-- Warning Labels
----------------------------------------------------------------------------
local windLaneLabel = makeLabel({
	Size = UDim2.new(0, 200, 0, 30),
	Position = UDim2.new(0.5, 0, 0, 132),
	AnchorPoint = Vector2.new(0.5, 0),
	Font = Enum.Font.GothamBold,
	TextColor3 = Color3.fromRGB(255, 208, 109),
	Text = "",
})

local lowFuelLabel = makeLabel({
	Size = UDim2.new(0, 200, 0, 30),
	Position = UDim2.new(0.5, 0, 0, 164),
	AnchorPoint = Vector2.new(0.5, 0),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(255, 60, 40),
	Text = "",
})

local eliminatedLabel = makeLabel({
	Size = UDim2.new(0, 400, 0, 60),
	Position = UDim2.new(0.5, 0, 0.4, 0),
	AnchorPoint = Vector2.new(0.5, 0.5),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(255, 80, 60),
	Text = "",
})

----------------------------------------------------------------------------
-- Fuel Gauge (left side, vertical bar)
----------------------------------------------------------------------------
local fuelFrame = makeFrame({
	Size = UDim2.new(0, 44, 0, 260),
	Position = UDim2.new(0, 18, 0.5, 0),
	AnchorPoint = Vector2.new(0, 0.5),
	BackgroundColor3 = Color3.fromRGB(30, 20, 14),
	BackgroundTransparency = 0.1,
	Corner = 8,
})

local fuelBarBg = makeFrame({
	Size = UDim2.new(0, 28, 0, 210),
	Position = UDim2.new(0.5, 0, 0, 10),
	AnchorPoint = Vector2.new(0.5, 0),
	BackgroundColor3 = Color3.fromRGB(50, 35, 25),
	Corner = 6,
	Parent = fuelFrame,
})

local fuelBarFill = makeFrame({
	Size = UDim2.new(1, 0, 1, 0),
	Position = UDim2.new(0, 0, 1, 0),
	AnchorPoint = Vector2.new(0, 1),
	BackgroundColor3 = Color3.fromRGB(255, 165, 40),
	Corner = 6,
	Parent = fuelBarBg,
})

local fuelTextLabel = makeLabel({
	Size = UDim2.new(1, 0, 0, 28),
	Position = UDim2.new(0, 0, 1, -30),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(255, 255, 255),
	Text = "100",
	Parent = fuelFrame,
})

local fuelTitleLabel = makeLabel({
	Size = UDim2.new(1, 0, 0, 16),
	Position = UDim2.new(0, 0, 1, -6),
	Font = Enum.Font.GothamMedium,
	TextColor3 = Color3.fromRGB(200, 180, 150),
	Text = "FUEL",
	Parent = fuelFrame,
})

----------------------------------------------------------------------------
-- Altitude Meter (right side, vertical bar)
----------------------------------------------------------------------------
local altFrame = makeFrame({
	Size = UDim2.new(0, 44, 0, 260),
	Position = UDim2.new(1, -18, 0.5, 0),
	AnchorPoint = Vector2.new(1, 0.5),
	BackgroundColor3 = Color3.fromRGB(14, 20, 30),
	BackgroundTransparency = 0.1,
	Corner = 8,
})

local altBarBg = makeFrame({
	Size = UDim2.new(0, 28, 0, 210),
	Position = UDim2.new(0.5, 0, 0, 10),
	AnchorPoint = Vector2.new(0.5, 0),
	BackgroundColor3 = Color3.fromRGB(25, 35, 50),
	Corner = 6,
	Parent = altFrame,
})

local altBarFill = makeFrame({
	Size = UDim2.new(1, 0, 0, 0),
	Position = UDim2.new(0, 0, 1, 0),
	AnchorPoint = Vector2.new(0, 1),
	BackgroundColor3 = Color3.fromRGB(80, 180, 255),
	Corner = 6,
	Parent = altBarBg,
})

-- Wind layer markers on altitude bar
local windLayerYs = { 34, 52, 70 }
local maxAlt = 90
for _, wy in ipairs(windLayerYs) do
	local fraction = wy / maxAlt
	local marker = makeFrame({
		Size = UDim2.new(1, 4, 0, 3),
		Position = UDim2.new(0, -2, 1 - fraction, 0),
		AnchorPoint = Vector2.new(0, 0.5),
		BackgroundColor3 = Color3.fromRGB(100, 255, 100),
		BackgroundTransparency = 0.3,
		Parent = altBarBg,
	})
	marker.ZIndex = 3
end

local altTextLabel = makeLabel({
	Size = UDim2.new(1, 0, 0, 28),
	Position = UDim2.new(0, 0, 1, -30),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(255, 255, 255),
	Text = "20",
	Parent = altFrame,
})

local altTitleLabel = makeLabel({
	Size = UDim2.new(1, 0, 0, 16),
	Position = UDim2.new(0, 0, 1, -6),
	Font = Enum.Font.GothamMedium,
	TextColor3 = Color3.fromRGB(150, 180, 200),
	Text = "ALT",
	Parent = altFrame,
})

----------------------------------------------------------------------------
-- Controls Display (bottom center)
----------------------------------------------------------------------------
local controlsFrame = makeFrame({
	Size = UDim2.new(0, 310, 0, 50),
	Position = UDim2.new(0.5, 0, 1, -14),
	AnchorPoint = Vector2.new(0.5, 1),
	BackgroundColor3 = Color3.fromRGB(30, 30, 30),
	BackgroundTransparency = 0.3,
	Corner = 10,
})

-- Q = BURN
local burnIndicator = makeLabel({
	Size = UDim2.new(0, 90, 0, 36),
	Position = UDim2.fromOffset(8, 7),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(180, 180, 180),
	Text = "Q BURN",
	Parent = controlsFrame,
})
local burnCorner = Instance.new("UICorner")
burnCorner.CornerRadius = UDim.new(0, 8)
burnCorner.Parent = burnIndicator
local burnStroke = Instance.new("UIStroke")
burnStroke.Color = Color3.fromRGB(100, 100, 100)
burnStroke.Thickness = 2
burnStroke.Parent = burnIndicator

-- E = VENT
local ventIndicator = makeLabel({
	Size = UDim2.new(0, 90, 0, 36),
	Position = UDim2.fromOffset(108, 7),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(180, 180, 180),
	Text = "E VENT",
	Parent = controlsFrame,
})
local ventCorner = Instance.new("UICorner")
ventCorner.CornerRadius = UDim.new(0, 8)
ventCorner.Parent = ventIndicator
local ventStroke = Instance.new("UIStroke")
ventStroke.Color = Color3.fromRGB(100, 100, 100)
ventStroke.Thickness = 2
ventStroke.Parent = ventIndicator

-- F = BOOST
local boostIndicator = makeLabel({
	Size = UDim2.new(0, 90, 0, 36),
	Position = UDim2.fromOffset(208, 7),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(180, 180, 180),
	Text = "F BOOST",
	Parent = controlsFrame,
})
local boostCornerUI = Instance.new("UICorner")
boostCornerUI.CornerRadius = UDim.new(0, 8)
boostCornerUI.Parent = boostIndicator
local boostStroke = Instance.new("UIStroke")
boostStroke.Color = Color3.fromRGB(100, 100, 100)
boostStroke.Thickness = 2
boostStroke.Parent = boostIndicator

-- Expand controls frame for grapple
controlsFrame.Size = UDim2.new(0, 420, 0, 50)

-- R = GRAPPLE
local grappleIndicator = makeLabel({
	Size = UDim2.new(0, 100, 0, 36),
	Position = UDim2.fromOffset(308, 7),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(180, 180, 180),
	Text = "R GRAPPLE",
	Parent = controlsFrame,
})
local grappleCornerUI = Instance.new("UICorner")
grappleCornerUI.CornerRadius = UDim.new(0, 8)
grappleCornerUI.Parent = grappleIndicator
local grappleStroke = Instance.new("UIStroke")
grappleStroke.Color = Color3.fromRGB(100, 100, 100)
grappleStroke.Thickness = 2
grappleStroke.Parent = grappleIndicator

-- Grapple notification popup
local grapplePopup = makeLabel({
	Size = UDim2.new(0, 300, 0, 40),
	Position = UDim2.new(0.5, 0, 0.55, 0),
	AnchorPoint = Vector2.new(0.5, 0.5),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(255, 200, 60),
	Text = "",
})
grapplePopup.TextStrokeTransparency = 0.3
grapplePopup.Visible = false
grapplePopup.ZIndex = 10

GrappleStateEvent.OnClientEvent:Connect(function(targetType, targetInfo, cooldown)
	if targetType == "fuel" then
		grapplePopup.Text = "GRAPPLE -> FUEL!"
		grapplePopup.TextColor3 = Color3.fromRGB(255, 200, 60)
	elseif targetType == "player" then
		grapplePopup.Text = string.format("STEALING from %s!", tostring(targetInfo))
		grapplePopup.TextColor3 = Color3.fromRGB(255, 80, 80)
	end
	grapplePopup.Visible = true
	task.delay(2, function()
		grapplePopup.Visible = false
	end)
end)

----------------------------------------------------------------------------
-- Mobile Buttons (shown on touch devices)
----------------------------------------------------------------------------
local isMobile = UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled

local mobileFrame = makeFrame({
	Size = UDim2.new(0, 280, 0, 100),
	Position = UDim2.new(1, -20, 1, -80),
	AnchorPoint = Vector2.new(1, 1),
	BackgroundTransparency = 1,
})
mobileFrame.Visible = isMobile

local burnBtn = makeButton({
	Size = UDim2.new(0, 80, 0, 80),
	Position = UDim2.fromOffset(0, 0),
	BackgroundColor3 = Color3.fromRGB(200, 100, 20),
	TextColor3 = Color3.fromRGB(255, 255, 255),
	Text = "BURN\nQ",
	Corner = 14,
	Parent = mobileFrame,
})

local ventBtn = makeButton({
	Size = UDim2.new(0, 80, 0, 80),
	Position = UDim2.fromOffset(95, 0),
	BackgroundColor3 = Color3.fromRGB(40, 120, 200),
	TextColor3 = Color3.fromRGB(255, 255, 255),
	Text = "VENT\nE",
	Corner = 14,
	Parent = mobileFrame,
})

local boostBtn = makeButton({
	Size = UDim2.new(0, 80, 0, 80),
	Position = UDim2.fromOffset(190, 0),
	BackgroundColor3 = Color3.fromRGB(200, 40, 40),
	TextColor3 = Color3.fromRGB(255, 255, 255),
	Text = "BOOST\nF",
	Corner = 14,
	Parent = mobileFrame,
})

-- Mobile button events
burnBtn.MouseButton1Down:Connect(function()
	isBurning = true
	BurnStart:FireServer()
end)
burnBtn.MouseButton1Up:Connect(function()
	isBurning = false
	BurnStop:FireServer()
end)

ventBtn.MouseButton1Down:Connect(function()
	isVenting = true
	VentStart:FireServer()
end)
ventBtn.MouseButton1Up:Connect(function()
	isVenting = false
	VentStop:FireServer()
end)

boostBtn.MouseButton1Click:Connect(function()
	Boost:FireServer()
end)

----------------------------------------------------------------------------
-- Minimap (top-right corner)
----------------------------------------------------------------------------
local minimapSize = 130
local minimapFrame = makeFrame({
	Size = UDim2.new(0, minimapSize, 0, minimapSize),
	Position = UDim2.new(1, -18, 0, 10),
	AnchorPoint = Vector2.new(1, 0),
	BackgroundColor3 = Color3.fromRGB(20, 30, 45),
	BackgroundTransparency = 0.2,
	Corner = 10,
})

local minimapTitle = makeLabel({
	Size = UDim2.new(1, 0, 0, 16),
	Position = UDim2.fromOffset(0, 2),
	Font = Enum.Font.GothamMedium,
	TextColor3 = Color3.fromRGB(150, 180, 200),
	Text = "MAP",
	Parent = minimapFrame,
})

-- Player dots on minimap (up to 6)
local minimapDots = {}
local dotColors = {
	Color3.fromRGB(255, 80, 80),
	Color3.fromRGB(80, 180, 255),
	Color3.fromRGB(80, 255, 80),
	Color3.fromRGB(255, 200, 60),
	Color3.fromRGB(200, 80, 255),
	Color3.fromRGB(255, 160, 80),
}

for i = 1, 6 do
	local dot = makeFrame({
		Size = UDim2.new(0, 8, 0, 8),
		Position = UDim2.new(0.5, 0, 0.5, 0),
		AnchorPoint = Vector2.new(0.5, 0.5),
		BackgroundColor3 = dotColors[i],
		Corner = 4,
		Parent = minimapFrame,
	})
	dot.Visible = false
	dot.ZIndex = 5
	minimapDots[i] = dot
end

-- Fuel pickup markers on minimap
local minimapFuelDots = {}
for i = 1, 6 do
	local fdot = makeFrame({
		Size = UDim2.new(0, 5, 0, 5),
		Position = UDim2.new(0.5, 0, 0.5, 0),
		AnchorPoint = Vector2.new(0.5, 0.5),
		BackgroundColor3 = Color3.fromRGB(255, 232, 138),
		Corner = 3,
		Parent = minimapFrame,
	})
	fdot.Visible = true
	fdot.ZIndex = 4
	minimapFuelDots[i] = fdot
end

----------------------------------------------------------------------------
-- Result Panel
----------------------------------------------------------------------------
local resultFrame = makeFrame({
	Size = UDim2.new(0, 360, 0, 280),
	Position = UDim2.new(0.5, 0, 0.5, 0),
	AnchorPoint = Vector2.new(0.5, 0.5),
	BackgroundColor3 = Color3.fromRGB(30, 22, 16),
	BackgroundTransparency = 0.1,
	Corner = 16,
})
resultFrame.Visible = false
resultFrame.ZIndex = 10

local resultTitle = makeLabel({
	Size = UDim2.new(1, -20, 0, 36),
	Position = UDim2.fromOffset(10, 10),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(255, 208, 109),
	Text = "RESULTS",
	Parent = resultFrame,
})
resultTitle.ZIndex = 11

local resultBody = makeLabel({
	Size = UDim2.new(1, -20, 1, -56),
	Position = UDim2.fromOffset(10, 50),
	Font = Enum.Font.GothamMedium,
	TextColor3 = Color3.fromRGB(255, 255, 255),
	TextYAlignment = Enum.TextYAlignment.Top,
	TextXAlignment = Enum.TextXAlignment.Left,
	Text = "",
	Parent = resultFrame,
})
resultBody.ZIndex = 11

----------------------------------------------------------------------------
-- Keyboard Input
----------------------------------------------------------------------------
UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end

	if input.KeyCode == Enum.KeyCode.Q then
		isBurning = true
		BurnStart:FireServer()
	elseif input.KeyCode == Enum.KeyCode.E then
		isVenting = true
		VentStart:FireServer()
	elseif input.KeyCode == Enum.KeyCode.F then
		Boost:FireServer()
	elseif input.KeyCode == Enum.KeyCode.R then
		GrappleRequest:FireServer()
	end
end)

UserInputService.InputEnded:Connect(function(input, _gameProcessed)
	if input.KeyCode == Enum.KeyCode.Q then
		isBurning = false
		BurnStop:FireServer()
	elseif input.KeyCode == Enum.KeyCode.E then
		isVenting = false
		VentStop:FireServer()
	end
end)

----------------------------------------------------------------------------
-- State Updates from Server
----------------------------------------------------------------------------
PlayerStateUpdate.OnClientEvent:Connect(function(data)
	if typeof(data) ~= "table" then return end
	currentFuel = data.fuel or currentFuel
	currentAltitude = data.altitude or currentAltitude
	currentAction = data.action or currentAction
	inWindLane = data.inWindLane or false
	boostReady = data.boostReady ~= false
	boostCooldownRemaining = data.boostCooldownRemaining or 0
	grappleReady = data.grappleReady ~= false
	grappleCooldownRemaining = data.grappleCooldownRemaining or 0
end)

EliminatedEvent.OnClientEvent:Connect(function(playerName)
	if playerName == player.Name then
		isEliminated = true
		eliminatedLabel.Text = "ELIMINATED"
	end
end)

MatchResult.OnClientEvent:Connect(function(results)
	if typeof(results) ~= "table" then return end
	resultFrame.Visible = true

	local lines = {}
	for _, entry in ipairs(results) do
		local status = entry.alive and "ALIVE" or "OUT"
		local line = string.format(
			"#%d  %s  [%s]  Alt:%d  Fuel:%d  +%d pts",
			entry.rank, entry.name, status, entry.altitude, entry.fuel, entry.score
		)
		table.insert(lines, line)
	end
	resultBody.Text = table.concat(lines, "\n")

	-- Hide result after a while when state changes
	task.delay(10, function()
		resultFrame.Visible = false
	end)
end)

----------------------------------------------------------------------------
-- UI Refresh Loop
----------------------------------------------------------------------------
local flashTimer = 0

RunService.RenderStepped:Connect(function(dt)
	-- Top bar: state and timer from shared state folder
	local stateStr = stateFolder:FindFirstChild("State") and stateFolder.State.Value or "Lobby"
	local timerVal = stateFolder:FindFirstChild("Timer") and stateFolder.Timer.Value or 0
	stateTimerLabel.Text = string.format("%s  %02d", stateStr, timerVal)

	-- Reset elimination on new match
	if stateStr == "Countdown" or stateStr == "Lobby" then
		isEliminated = false
		eliminatedLabel.Text = ""
		resultFrame.Visible = false
		currentAction = "GLIDING"
		currentFuel = 100
		currentAltitude = 20
	end

	-- Fuel gauge
	local fuelFrac = math.clamp(currentFuel / 100, 0, 1)
	fuelBarFill.Size = UDim2.new(1, 0, fuelFrac, 0)
	fuelTextLabel.Text = tostring(currentFuel)

	-- Flash fuel bar when low
	flashTimer += dt
	if currentFuel < 20 then
		local flash = math.sin(flashTimer * 8) > 0
		fuelBarFill.BackgroundColor3 = flash and Color3.fromRGB(255, 50, 30) or Color3.fromRGB(255, 165, 40)
		lowFuelLabel.Text = "LOW FUEL!"
	else
		fuelBarFill.BackgroundColor3 = Color3.fromRGB(255, 165, 40)
		lowFuelLabel.Text = ""
	end

	-- Altitude meter
	local altFrac = math.clamp(currentAltitude / maxAlt, 0, 1)
	altBarFill.Size = UDim2.new(1, 0, altFrac, 0)
	altTextLabel.Text = tostring(currentAltitude)

	-- Action label
	actionLabel.Text = currentAction
	if currentAction == "BURNING" then
		actionLabel.TextColor3 = Color3.fromRGB(255, 165, 40)
	elseif currentAction == "VENTING" then
		actionLabel.TextColor3 = Color3.fromRGB(80, 180, 255)
	elseif currentAction == "BOOSTING" then
		actionLabel.TextColor3 = Color3.fromRGB(255, 80, 60)
	elseif currentAction == "ELIMINATED" then
		actionLabel.TextColor3 = Color3.fromRGB(255, 50, 50)
	else
		actionLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
	end

	-- Wind lane indicator
	windLaneLabel.Text = inWindLane and "IN WIND LANE" or ""

	-- Control indicators: highlight active
	if isBurning then
		burnIndicator.BackgroundColor3 = Color3.fromRGB(255, 140, 20)
		burnIndicator.BackgroundTransparency = 0
		burnIndicator.TextColor3 = Color3.fromRGB(255, 255, 255)
		burnStroke.Color = Color3.fromRGB(255, 200, 80)
	else
		burnIndicator.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
		burnIndicator.BackgroundTransparency = 1
		burnIndicator.TextColor3 = Color3.fromRGB(180, 180, 180)
		burnStroke.Color = Color3.fromRGB(100, 100, 100)
	end

	if isVenting then
		ventIndicator.BackgroundColor3 = Color3.fromRGB(40, 120, 220)
		ventIndicator.BackgroundTransparency = 0
		ventIndicator.TextColor3 = Color3.fromRGB(255, 255, 255)
		ventStroke.Color = Color3.fromRGB(80, 180, 255)
	else
		ventIndicator.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
		ventIndicator.BackgroundTransparency = 1
		ventIndicator.TextColor3 = Color3.fromRGB(180, 180, 180)
		ventStroke.Color = Color3.fromRGB(100, 100, 100)
	end

	if boostReady then
		boostIndicator.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
		boostIndicator.BackgroundTransparency = 1
		boostIndicator.TextColor3 = Color3.fromRGB(255, 80, 60)
		boostStroke.Color = Color3.fromRGB(200, 60, 40)
		boostIndicator.Text = "F BOOST"
	else
		boostIndicator.BackgroundColor3 = Color3.fromRGB(60, 60, 60)
		boostIndicator.BackgroundTransparency = 0.5
		boostIndicator.TextColor3 = Color3.fromRGB(120, 120, 120)
		boostStroke.Color = Color3.fromRGB(80, 80, 80)
		local cd = math.ceil(boostCooldownRemaining)
		boostIndicator.Text = string.format("F (%ds)", cd)
	end

	-- Grapple indicator
	if grappleReady then
		grappleIndicator.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
		grappleIndicator.BackgroundTransparency = 1
		grappleIndicator.TextColor3 = Color3.fromRGB(255, 200, 60)
		grappleStroke.Color = Color3.fromRGB(200, 160, 40)
		grappleIndicator.Text = "R GRAPPLE"
	else
		grappleIndicator.BackgroundColor3 = Color3.fromRGB(60, 60, 60)
		grappleIndicator.BackgroundTransparency = 0.5
		grappleIndicator.TextColor3 = Color3.fromRGB(120, 120, 120)
		grappleStroke.Color = Color3.fromRGB(80, 80, 80)
		local cd = math.ceil(grappleCooldownRemaining)
		grappleIndicator.Text = string.format("R (%ds)", cd)
	end

	-- Minimap: show player positions
	local allPlayers = Players:GetPlayers()
	for i = 1, 6 do
		local dot = minimapDots[i]
		local p = allPlayers[i]
		if p and p.Character then
			local hrp = p.Character:FindFirstChild("HumanoidRootPart")
			if hrp then
				-- Map world XZ to minimap. Arena is roughly -140 to 140
				local mapScale = minimapSize / 300
				local mx = (hrp.Position.X * mapScale) + minimapSize / 2
				local mz = (hrp.Position.Z * mapScale) + minimapSize / 2
				mx = math.clamp(mx, 4, minimapSize - 4)
				mz = math.clamp(mz, 20, minimapSize - 4)
				dot.Position = UDim2.fromOffset(mx, mz)
				dot.Visible = true
				-- Highlight self
				if p == player then
					dot.Size = UDim2.new(0, 10, 0, 10)
				else
					dot.Size = UDim2.new(0, 7, 0, 7)
				end
			else
				dot.Visible = false
			end
		else
			dot.Visible = false
		end
	end

	-- Minimap: fuel pickup positions
	local arena = workspace:FindFirstChild("HotAirHavocArena")
	if arena then
		for i = 1, 6 do
			local fuelPart = arena:FindFirstChild(string.format("Fuel_%d", i))
			local fdot = minimapFuelDots[i]
			if fuelPart and fuelPart.Transparency < 0.9 then
				local mapScale = minimapSize / 300
				local mx = (fuelPart.Position.X * mapScale) + minimapSize / 2
				local mz = (fuelPart.Position.Z * mapScale) + minimapSize / 2
				mx = math.clamp(mx, 3, minimapSize - 3)
				mz = math.clamp(mz, 20, minimapSize - 3)
				fdot.Position = UDim2.fromOffset(mx, mz)
				fdot.Visible = true
			else
				fdot.Visible = false
			end
		end
	end

	-- Show/hide game HUD based on state
	local gameActive = stateStr == "Playing"
	fuelFrame.Visible = gameActive or stateStr == "Countdown"
	altFrame.Visible = gameActive or stateStr == "Countdown"
	controlsFrame.Visible = gameActive
	statusFrame.Visible = gameActive
	minimapFrame.Visible = gameActive
	mobileFrame.Visible = isMobile and gameActive

	-- POLISH: Animated title pulse in Lobby
	if stateStr == "Lobby" then
		local scale = 1.0 + 0.1 * math.sin(tick() * 3)
		titleLabel.Size = UDim2.new(1, -20, 0, 28 * scale)
	else
		titleLabel.Size = UDim2.new(1, -20, 0, 28)
	end

	-- POLISH: FUEL LOW! flashing warning when fuel < 15
	if gameActive and currentFuel < 15 and currentFuel > 0 then
		local flashOn = math.sin(tick() * 10) > 0
		fuelLowLabel.Text = flashOn and "FUEL LOW!" or ""
		fuelLowLabel.TextColor3 = flashOn and Color3.fromRGB(255, 40, 20) or Color3.fromRGB(255, 100, 80)
	end

	-- POLISH: Survival time display
	if gameActive and not isEliminated then
		polishSurvivalTime = polishSurvivalTime + dt
		polishSurvivalLabel.Text = string.format("STILL FLYING  %ds", math.floor(polishSurvivalTime))
		polishSurvivalLabel.Visible = true
	else
		polishSurvivalLabel.Visible = false
	end
end)

----------------------------------------------------------------------------
-- POLISH: Session Best survival time tracking
----------------------------------------------------------------------------
local polishSurvivalTime = 0
local sessionBestSurvival = 0

local polishSurvivalLabel = makeLabel({
	Size = UDim2.new(0, 220, 0, 28),
	Position = UDim2.new(0.5, 0, 0, 196),
	AnchorPoint = Vector2.new(0.5, 0),
	Font = Enum.Font.GothamBold,
	TextColor3 = Color3.fromRGB(180, 255, 180),
	Text = "",
})
polishSurvivalLabel.Visible = false

-- Result screen session best
local resultBestLabel = makeLabel({
	Size = UDim2.new(1, -20, 0, 24),
	Position = UDim2.fromOffset(10, 240),
	Font = Enum.Font.GothamBold,
	TextColor3 = Color3.fromRGB(200, 200, 200),
	Text = "",
	Parent = resultFrame,
})
resultBestLabel.ZIndex = 11

local resultNewBestLabel = makeLabel({
	Size = UDim2.new(1, -20, 0, 20),
	Position = UDim2.fromOffset(10, 266),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(255, 220, 40),
	TextStrokeTransparency = 0.2,
	Text = "NEW BEST!",
	Parent = resultFrame,
})
resultNewBestLabel.ZIndex = 12
resultNewBestLabel.Visible = false

MatchResult.OnClientEvent:Connect(function(_results)
	local isNew = polishSurvivalTime > sessionBestSurvival and sessionBestSurvival > 0
	if polishSurvivalTime > sessionBestSurvival then
		sessionBestSurvival = polishSurvivalTime
	end
	player:SetAttribute("SessionBestScore", math.floor(sessionBestSurvival))
	resultBestLabel.Text = string.format("Session Best: %ds", math.floor(sessionBestSurvival))
	if isNew then
		resultNewBestLabel.Visible = true
		task.spawn(function()
			for i = 1, 6 do
				resultNewBestLabel.TextTransparency = (i % 2 == 0) and 0 or 0.5
				task.wait(0.25)
			end
			resultNewBestLabel.TextTransparency = 0
		end)
	else
		resultNewBestLabel.Visible = false
	end
end)

-- Reset survival time on new match
local function resetSurvivalOnNewMatch()
	local stateChild = stateFolder:FindFirstChild("State")
	if stateChild then
		stateChild:GetPropertyChangedSignal("Value"):Connect(function()
			local gs = stateChild.Value
			if gs == "Countdown" or gs == "Lobby" then
				polishSurvivalTime = 0
				polishSurvivalLabel.Visible = false
				resultNewBestLabel.Visible = false
			end
		end)
	end
end
resetSurvivalOnNewMatch()

----------------------------------------------------------------------------
-- POLISH: Quick restart hint (R key) -- R is used for Grapple, so only
-- show on result screen
----------------------------------------------------------------------------
local restartHint = makeLabel({
	Size = UDim2.new(1, -20, 0, 20),
	Position = UDim2.fromOffset(10, 258),
	Font = Enum.Font.GothamMedium,
	TextColor3 = Color3.fromRGB(180, 180, 180),
	Text = "Press R for quick restart",
	Parent = resultFrame,
})
restartHint.ZIndex = 11
restartHint.Visible = false

MatchResult.OnClientEvent:Connect(function()
	restartHint.Visible = true
end)

-- Only handle restart key on result screen
local origInputBeganHandler = UserInputService.InputBegan
UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	local stateChild = stateFolder:FindFirstChild("State")
	local gs = stateChild and stateChild.Value or ""
	if input.KeyCode == Enum.KeyCode.R and gs == "Result" then
		local RestartRequest = ReplicatedStorage:FindFirstChild("RestartRequest")
		if RestartRequest then
			RestartRequest:FireServer()
		end
	end
end)

----------------------------------------------------------------------------
-- POLISH: Screen edge flash on damage
----------------------------------------------------------------------------
local damageEdgeOverlay = makeFrame({
	Size = UDim2.fromScale(1, 1),
	BackgroundTransparency = 1,
})
damageEdgeOverlay.ZIndex = 99

local edgeStroke = Instance.new("UIStroke")
edgeStroke.Thickness = 0
edgeStroke.Color = Color3.fromRGB(255, 0, 0)
edgeStroke.Transparency = 1
edgeStroke.Parent = damageEdgeOverlay

local prevFuelForDamage = 100
RunService.Heartbeat:Connect(function()
	if currentFuel < prevFuelForDamage and prevFuelForDamage - currentFuel > 5 then
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
	prevFuelForDamage = currentFuel
end)

----------------------------------------------------------------------------
-- POLISH: Countdown drama
----------------------------------------------------------------------------
local countdownOverlay = makeLabel({
	Size = UDim2.fromOffset(300, 120),
	Position = UDim2.new(0.5, 0, 0.45, 0),
	AnchorPoint = Vector2.new(0.5, 0.5),
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(255, 255, 255),
	TextStrokeTransparency = 0.3,
	Text = "",
})
countdownOverlay.Visible = false
countdownOverlay.ZIndex = 20

local lastCDVal = -1
local function watchCountdown()
	local timerChild = stateFolder:FindFirstChild("Timer")
	local stateChild = stateFolder:FindFirstChild("State")
	if not timerChild or not stateChild then return end
	timerChild:GetPropertyChangedSignal("Value"):Connect(function()
		local gs = stateChild.Value
		local tv = timerChild.Value
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
			countdownOverlay.Text = "HAVOC!"
			countdownOverlay.TextColor3 = Color3.fromRGB(255, 180, 40)
			countdownOverlay.Size = UDim2.fromOffset(400, 160)
			lastCDVal = -1
			task.delay(0.7, function()
				countdownOverlay.Visible = false
			end)
		end
	end)
	stateChild:GetPropertyChangedSignal("Value"):Connect(function()
		if stateChild.Value == "Lobby" then
			countdownOverlay.Visible = false
			lastCDVal = -1
		end
	end)
end
watchCountdown()
