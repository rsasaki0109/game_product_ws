export type StatType = 'attack' | 'speed' | 'maxHp'

export interface ItemDef {
  id: string
  name: string
  emoji: string
  stat: StatType
  value: number
}

export interface EnemyDef {
  id: string
  name: string
  color: string
  baseHp: number
  baseAttack: number
  baseSpeed: number
  attackRange: number
  attackCooldown: number
  scale: number
}

export interface EnemyInstance {
  uid: number
  def: EnemyDef
  currentHp: number
  maxHp: number
  attack: number
  speed: number
  position: [number, number, number]
  state: 'chase' | 'attack' | 'stagger' | 'windUp'
  attackTimer: number
  hitTimer: number
  windUpTimer: number
}

export interface LootDrop {
  id: number
  item: ItemDef
  position: [number, number, number]
  ttl: number
}

export interface WaveDef {
  enemyId: string
  count: number
}

export type GamePhase =
  | 'title'
  | 'playing'
  | 'floor_clear'
  | 'game_over'
  | 'game_over_transition'
  | 'victory'

export type Difficulty = 'easy' | 'normal' | 'hard'
