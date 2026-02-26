import type { DieFace } from './dice.ts'

export type LootType = 'face_upgrade' | 'heal' | 'max_hp_up'

export interface LootOption {
  id: string
  type: LootType
  label: string
  description: string
  emoji: string
  face?: DieFace
  healAmount?: number
  hpIncrease?: number
}
