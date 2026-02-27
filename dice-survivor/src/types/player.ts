import type { Die } from './dice.ts'
import type { StatusEffect } from './enemy.ts'

export interface PlayerState {
  maxHp: number
  currentHp: number
  shield: number
  dice: [Die, Die, Die]
  statusEffects: StatusEffect[]
}
