import type { Climber, Wall } from '../types/game.ts'
import { findReachableHolds, moveToHold, applyFall, checkFragileBreak } from './climbing.ts'
import { destroyHold, freeze, shake } from './skills.ts'

const BASE_COOLDOWN_MIN = 0.2
const BASE_COOLDOWN_MAX = 0.35
const FAST_COOLDOWN = 0.15

interface AiDecisionResult {
  ai: Climber
  aiWall: Wall
  playerWall: Wall
  player: Climber
}

export function aiDecision(
  ai: Climber,
  aiWall: Wall,
  player: Climber,
  playerWall: Wall,
): AiDecisionResult {
  let newAi = { ...ai }
  let newAiWall = aiWall
  let newPlayerWall = playerWall
  let newPlayer = player

  // Check if frozen
  if (newAi.freezeTimer > 0) {
    return { ai: newAi, aiWall: newAiWall, playerWall: newPlayerWall, player: newPlayer }
  }

  // Use skills aggressively whenever energy is available
  if (ai.energy >= 20) {
    // Priority: freeze (30) > shake (25) > destroy (20)
    if (ai.energy >= 30) {
      newPlayer = freeze(newPlayer)
      newAi = { ...newAi, energy: newAi.energy - 30 }
      return { ai: newAi, aiWall: newAiWall, playerWall: newPlayerWall, player: newPlayer }
    } else if (ai.energy >= 25) {
      newPlayer = shake(newPlayer)
      newAi = { ...newAi, energy: newAi.energy - 25 }
      return { ai: newAi, aiWall: newAiWall, playerWall: newPlayerWall, player: newPlayer }
    } else if (ai.energy >= 20) {
      newPlayerWall = destroyHold(newPlayerWall, player.position)
      newAi = { ...newAi, energy: newAi.energy - 20 }
      return { ai: newAi, aiWall: newAiWall, playerWall: newPlayerWall, player: newPlayer }
    }
  }

  // Move: pick best reachable hold (highest y, prefer recovery)
  const reachable = findReachableHolds(newAiWall, newAi.position)
  if (reachable.length === 0) {
    newAi = applyFall(newAi)
    return { ai: newAi, aiWall: newAiWall, playerWall: newPlayerWall, player: newPlayer }
  }

  // Sort: prefer higher y, then recovery type
  reachable.sort((a, b) => {
    if (b.y !== a.y) return b.y - a.y
    if (a.type === 'recovery' && b.type !== 'recovery') return -1
    if (b.type === 'recovery' && a.type !== 'recovery') return 1
    return 0
  })

  const target = reachable[0]
  // Check fragile break on current hold when moving away
  const currentHold = newAiWall.holds.find(
    h => h.x === newAi.position[0] && h.y === newAi.position[1] && !h.destroyed,
  )
  if (currentHold && checkFragileBreak(currentHold)) {
    newAiWall = {
      holds: newAiWall.holds.map(h =>
        h === currentHold ? { ...h, destroyed: true } : h,
      ),
    }
  }

  newAi = moveToHold(newAi, target)

  return { ai: newAi, aiWall: newAiWall, playerWall: newPlayerWall, player: newPlayer }
}

export function getAiCooldown(playerHeight: number, aiHeight: number): number {
  if (playerHeight > aiHeight + 5) {
    return FAST_COOLDOWN
  }
  return BASE_COOLDOWN_MIN + Math.random() * (BASE_COOLDOWN_MAX - BASE_COOLDOWN_MIN)
}
