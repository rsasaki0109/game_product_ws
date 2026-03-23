export type GamePhase = 'title' | 'playing' | 'victory' | 'defeat'
export type HoldType = 'normal' | 'fragile' | 'recovery'

export interface Hold {
  x: number
  y: number
  type: HoldType
  destroyed: boolean
}

export interface Wall {
  holds: Hold[]
}

export interface Climber {
  position: [number, number] // grid coords [x, y]
  stamina: number // 0-100
  energy: number // 0-100
  freezeTimer: number
  shakeTimer: number
  moveTimer: number // cooldown between moves
  height: number // highest y reached
  fallFlash: number // timer for fall visual feedback
  holdsGrabbed: number
  skillsUsed: number
}

export interface SkillDef {
  id: string
  name: string
  cost: number
  description: string
}
