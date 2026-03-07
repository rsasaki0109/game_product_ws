# Roll Ball Rush Roblox

A fast Roblox prototype where you climb inside a giant ball, roll downhill, and hit the finish gate before everyone else.

## Hook
- One screenshot explanation: `you are inside a rolling ball`
- Immediate feel: `boost on ramps, brake before turns`
- Easy party race: `wide track, checkpoints, fast rematches`

## MVP Direction
- Up to 8 players
- 1 round = 75 seconds
- `Boost` and `Brake` only
- Wide downhill course with checkpoints
- First players through the finish gate win

## Controls
- `Q`: Boost
- `E`: Brake
- `Space`: Jump
- `WASD`: Steer
- Mobile: `BOOST` / `BRAKE`

## Directory
- `default.project.json`: Rojo mapping
- `design.md`: design memo
- `src/server`: arena and round logic
- `src/shared`: match config
- `src/client`: input
- `src/gui`: HUD

## Current Status
- New Rojo project scaffold
- Rolling ball shell visual
- Boost / Brake race loop
- Checkpoints, finish, and HUD
- Build-ready MVP
- Studio-only debug harness and smoke test

## Debug Harness
- `ReplicatedStorage/RollBallDebug`
- `Command`
- `SnapshotJson`
- `LastEventJson`
- `SmokeTestJson`

Supported commands:
- `snapshot`
- `teleport_part`
- `force_command`
- `set_checkpoint`
- `drop_player`
- `respawn_check`
- `claim_finish`
