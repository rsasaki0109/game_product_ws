import type { Climber, Hold, Wall } from '../types/game.ts'

export function findReachableHolds(
  wall: Wall,
  position: [number, number],
): Hold[] {
  return wall.holds.filter(h => {
    if (h.destroyed) return false
    const dx = Math.abs(h.x - position[0])
    const dy = h.y - position[1]
    return dx <= 2 && dy <= 2 && dy >= -1
  })
}

export function findHoldInDirection(
  wall: Wall,
  position: [number, number],
  direction: 'up' | 'down' | 'left' | 'right',
): Hold | null {
  const reachable = findReachableHolds(wall, position)
  if (reachable.length === 0) return null

  // Filter to holds in the requested direction
  let candidates: Hold[]
  switch (direction) {
    case 'up':
      candidates = reachable.filter(h => h.y > position[1])
      break
    case 'down':
      candidates = reachable.filter(h => h.y < position[1])
      break
    case 'left':
      candidates = reachable.filter(h => h.x < position[0])
      break
    case 'right':
      candidates = reachable.filter(h => h.x > position[0])
      break
  }

  if (candidates.length === 0) return null

  // Pick the closest in the primary axis, break ties by secondary
  candidates.sort((a, b) => {
    if (direction === 'up') return a.y - b.y || Math.abs(a.x - position[0]) - Math.abs(b.x - position[0])
    if (direction === 'down') return b.y - a.y || Math.abs(a.x - position[0]) - Math.abs(b.x - position[0])
    if (direction === 'left') return b.x - a.x || (a.y - position[1]) - (b.y - position[1])
    return a.x - b.x || (a.y - position[1]) - (b.y - position[1])
  })

  return candidates[0]
}

export function moveToHold(climber: Climber, hold: Hold): Climber {
  const newClimber = { ...climber }
  newClimber.position = [hold.x, hold.y]
  newClimber.stamina = Math.max(0, newClimber.stamina - 2)
  newClimber.moveTimer = 0.3

  if (hold.type === 'recovery') {
    newClimber.stamina = Math.min(100, newClimber.stamina + 15)
  }

  if (hold.y > newClimber.height) {
    newClimber.height = hold.y
  }

  return newClimber
}

export function applyFall(climber: Climber): Climber {
  const newClimber = { ...climber }
  newClimber.position = [
    climber.position[0],
    Math.max(0, climber.position[1] - 5),
  ]
  newClimber.stamina = Math.max(0, newClimber.stamina - 20)
  return newClimber
}

export function checkFragileBreak(hold: Hold): boolean {
  return hold.type === 'fragile' && Math.random() < 0.5
}
