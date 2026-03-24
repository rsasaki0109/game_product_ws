export type GamePhase = 'title' | 'playing' | 'result'

// The "inner game" each player is trying to play
export type MiniGameType = 'race' | 'stack' | 'catch'

export interface PlayerState {
  // Inner game state
  x: number           // character position in their mini-game
  y: number
  vy: number          // vertical velocity (for jump)
  onGround: boolean
  score: number       // coins/points collected in inner game
  progress: number    // 0-100 completion of inner game

  // Physical body on the "couch" (outer game)
  couchX: number      // position on the couch (-1 = left, 1 = right)
  leanDir: number     // leaning direction (-1, 0, 1)

  // Debuffs from physical interference
  blindTimer: number      // screen covered: can't see inner game
  reverseTimer: number    // controls reversed
  shakeTimer: number      // screen shaking
  pushTimer: number       // being pushed away from controller
  stunTimer: number       // stunned from pillow hit
  stealCooldown: number   // item steal cooldown

  // Physical action cooldowns
  pushCooldown: number
  coverCooldown: number
  pillowCooldown: number
  tickleCooldown: number

  // Comeback & buff system
  comebackActive: boolean       // desperation boost active
  tauntImmunityTimer: number    // brief invulnerability after physical action
  speedBuffTimer: number        // speed power-up timer
  shieldBuff: boolean           // absorb next physical attack
  speedBuffMultiplier: number   // speed multiplier from power-ups / speed pads
  speedPadTimer: number         // speed pad boost timer

  // Stats tracking
  coinsCollected: number
  physicalActionsUsed: number
  recentActions: { emoji: string; timer: number }[]  // last 3 action icons
}

export interface CoinInstance {
  x: number
  y: number
  collected: boolean
}

export interface ObstacleInstance {
  x: number
  y: number
  width: number
  height: number
  isRamp?: boolean     // ramp-shaped obstacle: jump on it for boost
}

export interface SpeedPadInstance {
  x: number
  width: number
}

export interface PowerUpInstance {
  x: number
  y: number
  kind: 'speed' | 'shield' | 'stun'
  collected: boolean
}

export interface MiniGameState {
  type: MiniGameType
  coins: CoinInstance[]       // collectibles in the race
  obstacles: ObstacleInstance[]
  speedPads: SpeedPadInstance[]
  powerUps: PowerUpInstance[]
  scrollX: number             // camera scroll for race
  platformY: number[]         // platform heights
}

export interface PhysicalAction {
  id: string
  name: string
  emoji: string
  key: string
  cooldown: number
  description: string
}
