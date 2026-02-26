import type { PlayerState } from './player.ts'
import type { EnemyInstance } from './enemy.ts'
import type { DiceRollResult, ComboResult } from './dice.ts'
import type { LootOption } from './loot.ts'

export type GamePhase =
  | 'title'
  | 'battle_start'
  | 'battle_player_turn'
  | 'battle_rolling'
  | 'battle_resolving'
  | 'battle_enemy_turn'
  | 'reward'
  | 'game_over'
  | 'victory'

export interface TurnState {
  rollResults: DiceRollResult[]
  combos: ComboResult[]
  totalDamage: number
  totalShield: number
  totalHeal: number
  log: string[]
}

export interface RunState {
  phase: GamePhase
  floor: number
  maxFloor: number
  player: PlayerState
  enemy: EnemyInstance | null
  turn: TurnState
  rewardOptions: LootOption[]
  runStats: {
    enemiesDefeated: number
    totalDamageDealt: number
    floorsCleared: number
    turnsPlayed: number
  }
}
