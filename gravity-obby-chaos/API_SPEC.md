# Gravity Obby Chaos API Spec

Last updated: 2026-03-05

## Scope
- This spec documents runtime APIs used between Roblox client and server.
- Transport is `RemoteEvent` under `ReplicatedStorage`.
- Source of truth is current implementation in `src/server`, `src/client`, and `src/gui`.

## Event Topology

### Server -> Client

| Event name | Payload | Producer | Consumers | Notes |
|---|---|---|---|---|
| `RoundStateChanged` | `(state: string)` | `RoundManager` | `HUD`, `Scoreboard`, `InputHandler` | State values: `Lobby`, `Countdown`, `Racing`, `Result` |
| `Countdown` | `(count: number)` | `RoundManager` | `HUD` | 3,2,1 countdown |
| `PlayerFinished` | `(playerName: string, rank: number, time: number)` | `RoundManager` | `HUD`, `Scoreboard` | Fired on goal touch |
| `RoundResult` | `(results: {any})` | `RoundManager` | `HUD` | End-of-round summary |
| `GravityChanged` | `(directionName: string)` | `GravityManager` | `GravityCamera`, `GravityEffects` | Global gravity direction |
| `PlayerGravityChanged` | `(directionName: string)` | `GravityManager` | `GravityCamera`, `GravityEffects` | Per-player gravity direction |
| `GravityWarning` | `(eventType: string, seconds: number)` | `GravityManager` | `GravityEffects` | Pre-change warning |
| `ZeroGravity` | `(isZeroG: boolean)` | `GravityManager` | `GravityCamera`, `GravityEffects` | Zero-G phase on/off |
| `ItemPickup` | `(itemName: string)` | not implemented | `HUD`, `InputHandler` | Consumer exists, producer missing |
| `ItemUsed` | `()` | not implemented | `HUD`, `InputHandler` | Consumer exists, producer missing |

### Client -> Server

| Event name | Payload | Producer | Consumer | Notes |
|---|---|---|---|---|
| `RequestPlayerGravityShift` | `()` | `InputHandler` | `GravityManager` | Validated with cooldown on server |
| `UseItem` | `(currentItem: string)` | `InputHandler` | not implemented | Producer exists, server handler missing |

## Ownership and Creation
- `RoundManager` creates (or reuses): `RoundStateChanged`, `Countdown`, `PlayerFinished`, `RoundResult`.
- `GravityManager` creates (or reuses): `GravityChanged`, `GravityWarning`, `PlayerGravityChanged`, `ZeroGravity`, `RequestPlayerGravityShift`.
- `UseItem`, `ItemPickup`, `ItemUsed` are referenced from client code but not created/handled on server in current implementation.

## State Contract
- Round state machine (broadcast by `RoundStateChanged`):
  - `Lobby`
  - `Countdown`
  - `Racing`
  - `Result`
- Input gating in client:
  - Gravity shift request is only sent during `Racing`.
  - Item use is local-gated but server-side item API is currently incomplete.

## Known Gaps (Implementation Debt)
- `UseItem` server API is not implemented (`OnServerEvent` handler missing).
- `ItemPickup` and `ItemUsed` server producers are missing.
- As a result, item flow is not end-to-end functional despite client UI hooks.

## Minimal Completion Plan
1. Add server-side `UseItem` `RemoteEvent` creation and `OnServerEvent` handler.
2. Implement authoritative inventory state on server per player.
3. Fire `ItemPickup` and `ItemUsed` from server to sync HUD/Input state.
4. Add validation (race state, item ownership, cooldown, anti-spam).

