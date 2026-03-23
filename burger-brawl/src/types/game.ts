export type GamePhase = 'title' | 'playing' | 'game_over' | 'game_over_transition'
export type Difficulty = 'easy' | 'normal' | 'hard'

export type CustomerType = 'normal' | 'monster'
export type MonsterKind = 'karenzilla' | 'creamthrower' | 'tableflip' | 'screamking'

export type OrderItem = 'burger' | 'fries' | 'drink' | 'combo'

export interface CustomerDef {
  type: CustomerType
  monsterKind?: MonsterKind
  name: string
  color: string
  hp: number
  speed: number
  order?: OrderItem
  patience: number // seconds before leaving (normal) or attacking (monster)
  score: number
  emoji: string
}

export interface CustomerInstance {
  uid: number
  def: CustomerDef
  position: number // lane position (0-4)
  distance: number // distance from counter (starts at 10, walks to 1)
  currentHp: number
  patienceTimer: number
  state: 'approaching' | 'waiting' | 'served' | 'leaving' | 'attacking' | 'punched' | 'dead'
  serveTimer: number // countdown after order starts
  hitFlash: number
}

export interface ProjectileInstance {
  uid: number
  position: [number, number] // [lane, distance]
  speed: number
  damage: number
  type: 'punch' | 'bazooka'
  alive: boolean
}

export type ActionType = 'serve_burger' | 'serve_fries' | 'serve_drink' | 'serve_combo' | 'punch' | 'bazooka'
