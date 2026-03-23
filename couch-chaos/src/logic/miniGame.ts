import type { MiniGameState, CoinInstance, ObstacleInstance, SpeedPadInstance, PowerUpInstance } from '../types/game.ts'

export function generateMiniGame(): MiniGameState {
  // Generate a side-scrolling race course
  const coins: CoinInstance[] = []
  const obstacles: ObstacleInstance[] = []
  const speedPads: SpeedPadInstance[] = []
  const powerUps: PowerUpInstance[] = []

  // Place coins along the course
  for (let i = 0; i < 30; i++) {
    coins.push({
      x: 8 + i * 4 + Math.random() * 2,
      y: 1 + Math.random() * 3,
      collected: false,
    })
  }

  // Place obstacles (some are ramps)
  for (let i = 0; i < 15; i++) {
    const isRamp = i % 4 === 2 // every 4th obstacle is a ramp
    obstacles.push({
      x: 12 + i * 8 + Math.random() * 3,
      y: 0,
      width: isRamp ? 1.2 : 0.8,
      height: isRamp ? 0.6 : 0.8 + Math.random() * 0.5,
      isRamp,
    })
  }

  // Place speed pads every ~20 units
  for (let i = 0; i < 6; i++) {
    speedPads.push({
      x: 15 + i * 20 + Math.random() * 5,
      width: 2,
    })
  }

  // Place power-ups (golden coins with buffs)
  const kinds: Array<'speed' | 'shield' | 'stun'> = ['speed', 'shield', 'stun']
  for (let i = 0; i < 8; i++) {
    powerUps.push({
      x: 18 + i * 14 + Math.random() * 4,
      y: 1.5 + Math.random() * 2,
      kind: kinds[i % 3],
      collected: false,
    })
  }

  return {
    type: 'race',
    coins,
    obstacles,
    speedPads,
    powerUps,
    scrollX: 0,
    platformY: [],
  }
}

const FINISH_LINE = 130
const GRAVITY = -20
const JUMP_FORCE = 14
const RUN_SPEED = 5
const SPEED_PAD_MULTIPLIER = 2.0
const SPEED_PAD_DURATION = 0.5

export function tickInnerGame(
  px: number,
  py: number,
  vy: number,
  onGround: boolean,
  moveRight: boolean,
  moveLeft: boolean,
  jump: boolean,
  reversed: boolean,
  stunned: boolean,
  delta: number,
  speedMultiplier: number = 1,
): { x: number; y: number; vy: number; onGround: boolean; progress: number; hitRamp: boolean } {
  if (stunned) {
    return { x: px, y: py, vy, onGround, progress: (px / FINISH_LINE) * 100, hitRamp: false }
  }

  let dx = 0
  const effectiveRight = reversed ? moveLeft : moveRight
  const effectiveLeft = reversed ? moveRight : moveLeft
  const speed = RUN_SPEED * speedMultiplier
  if (effectiveRight) dx += speed * delta
  if (effectiveLeft) dx -= speed * delta * 0.5

  let newX = Math.max(0, px + dx)
  let newVy = vy + GRAVITY * delta
  let newY = py + newVy * delta
  let newOnGround = false

  if (newY <= 0) {
    newY = 0
    newVy = 0
    newOnGround = true
  }

  if (jump && onGround && !stunned) {
    newVy = JUMP_FORCE
    newOnGround = false
  }

  return {
    x: newX,
    y: newY,
    vy: newVy,
    onGround: newOnGround,
    progress: Math.min(100, (newX / FINISH_LINE) * 100),
    hitRamp: false,
  }
}

export function checkCoinCollection(
  px: number,
  py: number,
  coins: CoinInstance[],
): { collected: number; coins: CoinInstance[] } {
  let collected = 0
  const updated = coins.map(c => {
    if (c.collected) return c
    const dx = Math.abs(c.x - px)
    const dy = Math.abs(c.y - py)
    if (dx < 1 && dy < 1) {
      collected++
      return { ...c, collected: true }
    }
    return c
  })
  return { collected, coins: updated }
}

export function checkObstacleCollision(
  px: number,
  py: number,
  obstacles: ObstacleInstance[],
): { hit: boolean; rampBounce: boolean } {
  for (const obs of obstacles) {
    if (px > obs.x - 0.4 && px < obs.x + obs.width + 0.4 &&
        py < obs.y + obs.height && py >= obs.y) {
      if (obs.isRamp && py > 0) {
        // Hitting a ramp while airborne gives a boost instead of knockback
        return { hit: false, rampBounce: true }
      }
      return { hit: true, rampBounce: false }
    }
  }
  return { hit: false, rampBounce: false }
}

export function checkSpeedPad(
  px: number,
  py: number,
  speedPads: SpeedPadInstance[],
): boolean {
  if (py > 0.5) return false // must be on ground
  for (const pad of speedPads) {
    if (px > pad.x && px < pad.x + pad.width) {
      return true
    }
  }
  return false
}

export function checkPowerUpCollection(
  px: number,
  py: number,
  powerUps: PowerUpInstance[],
): { collected: PowerUpInstance | null; powerUps: PowerUpInstance[] } {
  let collected: PowerUpInstance | null = null
  const updated = powerUps.map(p => {
    if (p.collected) return p
    const dx = Math.abs(p.x - px)
    const dy = Math.abs(p.y - py)
    if (dx < 1 && dy < 1.2) {
      collected = p
      return { ...p, collected: true }
    }
    return p
  })
  return { collected, powerUps: updated }
}

export { FINISH_LINE, SPEED_PAD_MULTIPLIER, SPEED_PAD_DURATION }
