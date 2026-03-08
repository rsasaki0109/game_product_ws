local ContextActionService = game:GetService("ContextActionService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local BubbleRequest = ReplicatedStorage:WaitForChild("BubbleRequest")

local function send(commandName)
	BubbleRequest:FireServer(commandName)
end

local function onBubbleAction(_, inputState)
	if inputState == Enum.UserInputState.Begin then
		send("Bubble")
	end
end

local function onPopAction(_, inputState)
	if inputState == Enum.UserInputState.Begin then
		send("Pop")
	end
end

ContextActionService:BindAction("BubbleDrifter_Bubble", onBubbleAction, true, Enum.KeyCode.Q)
ContextActionService:BindAction("BubbleDrifter_Pop", onPopAction, true, Enum.KeyCode.E)

local bubbleButton = ContextActionService:GetButton("BubbleDrifter_Bubble")
if bubbleButton then
	bubbleButton.Size = UDim2.fromOffset(124, 124)
	bubbleButton.Position = UDim2.new(1, -270, 1, -170)
	bubbleButton.Text = "BUBBLE"
end

local popButton = ContextActionService:GetButton("BubbleDrifter_Pop")
if popButton then
	popButton.Size = UDim2.fromOffset(124, 124)
	popButton.Position = UDim2.new(1, -136, 1, -170)
	popButton.Text = "POP"
end

if not UserInputService.TouchEnabled then
	if bubbleButton then
		bubbleButton.Visible = false
	end
	if popButton then
		popButton.Visible = false
	end
end
