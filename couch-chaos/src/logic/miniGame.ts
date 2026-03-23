import type { MiniGameState, CoinInstance, ObstacleInstance } from '../types/game.ts'

export function generateMiniGame(): MiniGameState {
  // Generate a side-scrolling race course
  const coins: CoinInstance[] = []
  const obstacles: ObstacleInstance[] = []

  // Place coins along the course
  for (let i = 0; i < 30; i++) {
    coins.push({
      x: 8 + i * 4 + Math.random() * 2,
      y: 1 + Math.random() * 3,
      collected: false,
    })
  }

  // Place obstacles
  for (let i = 0; i < 15; i++) {
    obstacles.push({
      x: 12 + i * 8 + Math.random() * 3,
      y: 0,
      width: 0.8,
      height: 0.8 + Math.random() * 0.5,
    })
  }

  return {
    type: 'race',
    coins,
    obstacles,
    scrollX: 0,
    platformY: [],
  }
}

const FINISH_LINE = 130
const GRAVITY = -20
const JUMP_FORCE = 14
const RUN_SPEED = 5

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
): { x: number; y: number; vy: number; onGround: boolean; progress: number } {
  if (stunned) {
    return { x: px, y: py, vy, onGround, progress: (px / FINISH_LINE) * 100 }
  }

  let dx = 0
  const effectiveRight = reversed ? moveLeft : moveRight
  const effectiveLeft = reversed ? moveRight : moveLeft
  if (effectiveRight) dx += RUN_SPEED * delta
  if (effectiveLeft) dx -= RUN_SPEED * delta * 0.5

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
): boolean {
  for (const obs of obstacles) {
    if (px > obs.x - 0.4 && px < obs.x + obs.width + 0.4 &&
        py < obs.y + obs.height && py >= obs.y) {
      return true
    }
  }
  return false
}

export { FINISH_LINE }
