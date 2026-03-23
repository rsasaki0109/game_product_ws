import type { Hold, HoldType, Wall } from '../types/game.ts'

const WALL_WIDTH = 5
const WALL_HEIGHT = 30

function randomHoldType(): HoldType {
  const r = Math.random()
  if (r < 0.6) return 'normal'
  if (r < 0.9) return 'fragile'
  return 'recovery'
}

export function generateWall(): Wall {
  const holds: Hold[] = []
  const occupied = new Set<string>()

  for (let y = 0; y < WALL_HEIGHT; y++) {
    const count = 2 + Math.floor(Math.random() * 3) // 2-4
    const positions: number[] = []

    // Shuffle x positions and pick 'count' of them
    const xs = [0, 1, 2, 3, 4]
    for (let i = xs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[xs[i], xs[j]] = [xs[j], xs[i]]
    }

    for (let i = 0; i < count; i++) {
      positions.push(xs[i])
    }

    for (const x of positions) {
      const key = `${x},${y}`
      if (!occupied.has(key)) {
        occupied.add(key)
        holds.push({ x, y, type: randomHoldType(), destroyed: false })
      }
    }
  }

  // Ensure at least one hold every 2 rows to prevent stuck
  for (let y = 0; y < WALL_HEIGHT; y += 2) {
    const hasHold = holds.some(
      h => (h.y === y || h.y === y + 1) && !h.destroyed,
    )
    if (!hasHold) {
      const x = Math.floor(Math.random() * WALL_WIDTH)
      holds.push({ x, y, type: 'normal', destroyed: false })
    }
  }

  return { holds }
}

export { WALL_WIDTH, WALL_HEIGHT }
