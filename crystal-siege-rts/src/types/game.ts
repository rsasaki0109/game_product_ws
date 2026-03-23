export type Vec2 = [number, number] // [x, z]

export type GamePhase = 'title' | 'playing' | 'wave_incoming' | 'game_over' | 'victory'
export type Difficulty = 'easy' | 'normal' | 'hard'

export type UnitType = 'worker' | 'soldier' | 'archer' | 'knight'
export type UnitOwner = 'player' | 'enemy'

export interface UnitDef {
  type: UnitType
  name: string
  color: string
  hp: number
  attack: number
  attackRange: number
  attackCooldown: number
  speed: number
  cost: number
  trainTime: number
  scale: number
}

export interface UnitInstance {
  uid: number
  def: UnitDef
  owner: UnitOwner
  currentHp: number
  maxHp: number
  attack: number
  speed: number
  position: Vec2
  targetPos: Vec2 | null
  targetUid: number | null
  state: 'idle' | 'moving' | 'attacking' | 'gathering' | 'returning'
  attackTimer: number
  gatherTimer: number
  carryingCrystals: number
  assignedNodeId: number | null
}

export type BuildingType = 'hq' | 'barracks' | 'tower' | 'mine'

export interface BuildingDef {
  type: BuildingType
  name: string
  color: string
  hp: number
  cost: number
  size: number
  buildTime: number
}

export interface BuildingInstance {
  uid: number
  def: BuildingDef
  owner: UnitOwner
  currentHp: number
  maxHp: number
  position: Vec2
  isBuilt: boolean
  buildProgress: number
  trainingQueue: UnitType[]
  trainProgress: number
  attackTimer: number
  assignedNodeId: number | null
}

export interface CrystalNode {
  id: number
  position: Vec2
  remaining: number
  hasMine: boolean
}

export interface EnemyWaveDef {
  enemies: { type: UnitType; count: number }[]
  spawnEdges: ('north' | 'south' | 'east' | 'west')[]
}
