export type Vec2 = [number, number] // [x, z]

export type GamePhase = 'title' | 'playing' | 'victory' | 'defeat'
export type Difficulty = 'easy' | 'normal' | 'hard'

export type UnitType = 'worker' | 'militia' | 'ranger' | 'tank' | 'artillery'
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
  trainedAt: BuildingType
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
  carryingIron: number
  assignedNodeId: number | null
}

export type BuildingType = 'hq' | 'barracks' | 'factory' | 'tower' | 'refinery'

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

export interface IronNode {
  id: number
  position: Vec2
  remaining: number
  hasRefinery: boolean
  refineryOwner: UnitOwner | null
}
