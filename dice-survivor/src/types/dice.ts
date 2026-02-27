export type FaceSymbol =
  | 'attack'
  | 'shield'
  | 'heal'
  | 'poison'
  | 'fire'
  | 'lightning'
  | 'doubleStrike'
  | 'vampiric'
  | 'thorns'
  | 'blank'

export interface DieFace {
  id: string
  symbol: FaceSymbol
  value: number
  label: string
  emoji: string
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary'
  description: string
}

export interface Die {
  id: string
  faces: [DieFace, DieFace, DieFace, DieFace, DieFace, DieFace]
  color: string
}

export interface DiceRollResult {
  dieId: string
  rolledFaceIndex: number
  face: DieFace
}

export interface ComboResult {
  symbol: FaceSymbol
  count: number
  bonusLabel: string
  bonusDamage: number
  bonusShield: number
  bonusHeal: number
}
