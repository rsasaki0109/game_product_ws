import type { Climber, SkillDef, Wall } from '../types/game.ts'

export const SKILLS: SkillDef[] = [
  { id: 'destroy', name: 'Destroy Hold', cost: 20, description: 'Remove a hold near opponent' },
  { id: 'freeze', name: 'Freeze', cost: 30, description: 'Freeze opponent for 1.5s' },
  { id: 'shake', name: 'Shake', cost: 25, description: 'Shake opponent wall for 2s' },
]

export function destroyHold(
  targetWall: Wall,
  nearPosition: [number, number],
): Wall {
  const candidates = targetWall.holds.filter(h => {
    if (h.destroyed) return false
    const dx = Math.abs(h.x - nearPosition[0])
    const dy = Math.abs(h.y - nearPosition[1])
    return dx + dy <= 3
  })

  if (candidates.length === 0) return targetWall

  const target = candidates[Math.floor(Math.random() * candidates.length)]
  const newHolds = targetWall.holds.map(h =>
    h === target ? { ...h, destroyed: true } : h,
  )

  return { holds: newHolds }
}

export function freeze(targetClimber: Climber): Climber {
  return { ...targetClimber, freezeTimer: 1.5 }
}

export function shake(targetClimber: Climber): Climber {
  return { ...targetClimber, shakeTimer: 2.0 }
}
