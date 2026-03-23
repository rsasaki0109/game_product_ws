export type Vec3 = [number, number, number]

export type GamePhase = 'title' | 'playing' | 'wave_pause' | 'game_over' | 'game_over_transition' | 'victory'
export type Difficulty = 'easy' | 'normal' | 'hard'

export type EnemyType = 'drone' | 'turret' | 'heavy' | 'boss'

export interface EnemyDef {
  type: EnemyType
  name: string
  hp: number
  speed: number
  damage: number
  attackCooldown: number
  attackRange: number
  scale: number
  color: string
  emissive: string
  lockPoints: number
  score: number
}

export interface EnemyInstance {
  uid: number
  def: EnemyDef
  position: Vec3
  currentHp: number
  maxHp: number
  attackTimer: number
  orbitAngle: number
  alive: boolean
}

export interface ProjectileInstance {
  uid: number
  position: Vec3
  targetUid: number
  lastKnownTargetPos: Vec3
  speed: number
  velocity: Vec3
  damage: number
  alive: boolean
  age: number
}

export interface QuickShotInstance {
  uid: number
  position: Vec3
  velocity: Vec3
  damage: number
  ttl: number
  alive: boolean
  isEnemy: boolean
}

export interface WaveDef {
  spawns: { type: EnemyType; count: number }[]
}

export interface PlayerState {
  position: Vec3
  hp: number
  maxHp: number
  energy: number
  maxEnergy: number
  dashCooldown: number
  dashTimer: number
  regenTimer: number
  quickShotCooldown: number
}

export interface LockOnState {
  active: boolean
  lockedUids: number[]
}
