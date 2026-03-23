import type { GameState } from '../types/game.ts'
import { applySabotageToDash } from './sabotage.ts'
import { applySabotageToJavelin } from './sabotage.ts'
import { applySabotageToHighJump } from './sabotage.ts'
import { applySabotageToMarathon } from './sabotage.ts'

// AI sabotage usage: random chance per second
const AI_SABOTAGE_CHANCE = 0.18 // 18% chance per second

export function tickAISabotage(state: GameState, delta: number): void {
  if (state.aiSabotageUses <= 0) return
  if (state.event.phase !== 'running') return

  // Don't sabotage too early
  if (state.event.elapsed < 1.5) return

  const roll = Math.random()
  if (roll > AI_SABOTAGE_CHANCE * delta) return

  const index = (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3
  state.aiSabotageUses--

  const eventType = state.event.type

  switch (eventType) {
    case 'dash':
      applySabotageToDash(state.player, index)
      break
    case 'javelin':
      applySabotageToJavelin(state.player, state.event, index, false)
      break
    case 'highJump':
      applySabotageToHighJump(state.player, state.event, index, false)
      break
    case 'marathon':
      applySabotageToMarathon(state.player, index)
      break
  }
}
