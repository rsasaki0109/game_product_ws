export type EnemyIntentType = 'attack' | 'defend' | 'buff' | 'special'

export interface EnemyIntent {
  type: EnemyIntentType
  value: number
  label: string
  emoji: string
}

export interface EnemyDef {
  id: string
  name: string
  emoji: string
  baseHp: number
  baseAttack: number
  intentPattern: EnemyIntentType[]
  isBoss: boolean
  description: string
}

export interface StatusEffect {
  type: 'poison' | 'burn' | 'weakness' | 'strength'
  stacks: number
  turnsRemaining: number
}

export interface EnemyInstance {
  def: EnemyDef
  currentHp: number
  maxHp: number
  shield: number
  attack: number
  intentIndex: number
  currentIntent: EnemyIntent
  statusEffects: StatusEffect[]
}
