local Debris = game:GetService("Debris")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local PaintBurst = ReplicatedStorage:WaitForChild("PaintBurst")

local colors = {
	Red = Color3.fromRGB(239, 95, 95),
	Blue = Color3.fromRGB(92, 152, 255),
}

local function spawnBurst(position, teamName)
	local color = colors[teamName] or Color3.fromRGB(255, 255, 255)

	local ring = Instance.new("Part")
	ring.Name = "PaintRingFx"
	ring.Shape = Enum.PartType.Cylinder
	ring.Anchored = true
	ring.CanCollide = false
	ring.CanTouch = false
	ring.CanQuery = false
	ring.Material = Enum.Material.Neon
	ring.Color = color
	ring.Transparency = 0.22
	ring.Size = Vector3.new(1, 0.4, 1)
	ring.CFrame = CFrame.new(position + Vector3.new(0, 0.4, 0)) * CFrame.Angles(0, 0, math.rad(90))
	ring.Parent = workspace
	Debris:AddItem(ring, 0.8)

	task.spawn(function()
		for step = 1, 10 do
			if not ring.Parent then
				return
			end
			local alpha = step / 10
			ring.Size = Vector3.new(1 + alpha * 16, 0.4, 1 + alpha * 16)
			ring.Transparency = 0.2 + alpha * 0.7
			task.wait(0.04)
		end
	end)
end

PaintBurst.OnClientEvent:Connect(function(position, teamName)
	if typeof(position) == "Vector3" then
		spawnBurst(position, teamName)
	end
end)
