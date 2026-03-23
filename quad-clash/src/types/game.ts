export type GamePhase = 'title' | 'event_intro' | 'playing' | 'event_result' | 'final_result'
export type EventType = 'dash' | 'javelin' | 'highJump' | 'marathon'

export interface SabotageDef {
  id: string
  name: string
  description: string
  eventType: EventType
}

export interface AthleteState {
  position: number
  speed: number
  stamina: number
  score: number
  stunTimer: number
  debuffTimer: number
  debuffType: string | null
}

export interface EventState {
  type: EventType
  phase: 'ready' | 'running' | 'finished'
  elapsed: number
  playerResult: number
  aiResult: number
  // Javelin specific
  power: number
  powerDir: number
  angle: number
  thrown: boolean
  // High Jump specific
  barHeight: number
  attempts: number
  maxAttempts: number
  jumpPhase: 'approach' | 'takeoff' | 'flight' | 'done'
  jumpPower: number
  bestHeight: number
  aiBestHeight: number
  aiAttempts: number
  // High Jump AI tracking
  aiBarHeight: number
  aiJumping: boolean
  aiJumpTimer: number
  // Marathon specific
  courseLength: number
}

export interface GameState {
  phase: GamePhase
  currentEventIndex: number
  events: EventType[]
  playerScores: number[]
  aiScores: number[]
  player: AthleteState
  ai: AthleteState
  event: EventState
  sabotageUses: number
  aiSabotageUses: number
  introTimer: number
  resultTimer: number
}

export const SABOTAGE_DEFS: SabotageDef[][] = [
  // dash
  [
    { id: 'banana', name: 'Banana', description: 'Opponent trips, stops 1s', eventType: 'dash' },
    { id: 'headwind', name: 'Headwind', description: 'Opponent -40% speed 2s', eventType: 'dash' },
    { id: 'smokescreen', name: 'Smokescreen', description: 'Dark overlay 1.5s', eventType: 'dash' },
  ],
  // javelin
  [
    { id: 'shaky', name: 'Shaky', description: 'Power meter oscillates faster', eventType: 'javelin' },
    { id: 'wall', name: 'Wall', description: 'Max distance capped 60%', eventType: 'javelin' },
    { id: 'gravity', name: 'Gravity', description: 'Angle offset -10 degrees', eventType: 'javelin' },
  ],
  // highJump
  [
    { id: 'raise', name: 'Raise Bar', description: '+0.15m on next jump', eventType: 'highJump' },
    { id: 'slip', name: 'Slip', description: 'Timing window halved', eventType: 'highJump' },
    { id: 'gust', name: 'Gust', description: '-20% jump height', eventType: 'highJump' },
  ],
  // marathon
  [
    { id: 'pothole', name: 'Pothole', description: 'Opponent stumbles -0.5s', eventType: 'marathon' },
    { id: 'fatigue', name: 'Fatigue', description: 'Opponent stamina -20', eventType: 'marathon' },
    { id: 'reverse', name: 'Reverse', description: 'Run backward 1s', eventType: 'marathon' },
  ],
]
