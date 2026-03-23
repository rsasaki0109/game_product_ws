import type { EnemyInstance } from '../types/game.ts'
import { distance2D, direction2D } from './combat.ts'

export function updateEnemyAI(
  enemy: EnemyInstance,
  playerPos: [number, number, number],
  delta: number,
  floor?: number,
): Partial<EnemyInstance> {
  const dist = distance2D(enemy.position, playerPos)

  if (enemy.hitTimer > 0) {
    return {
      hitTimer: enemy.hitTimer - delta,
      state: 'stagger',
    }
  }

  if (enemy.attackTimer > 0) {
    return { attackTimer: enemy.attackTimer - delta }
  }

  // Wind-up countdown
  if (enemy.state === 'windUp') {
    const wt = enemy.windUpTimer - delta
    if (wt <= 0) {
      return {
        state: 'attack',
        attackTimer: enemy.def.attackCooldown + (floor === 1 ? 0.5 : 0),
        windUpTimer: 0,
      }
    }
    return { windUpTimer: wt }
  }

  if (dist <= enemy.def.attackRange) {
    if (enemy.state !== 'attack') {
      return {
        state: 'windUp',
        windUpTimer: 0.5,
      }
    }
    return {}
  }

  const [dx, dz] = direction2D(enemy.position, playerPos)
  const moveSpeed = enemy.speed * delta
  const newPos: [number, number, number] = [
    clampArena(enemy.position[0] + dx * moveSpeed),
    0,
    clampArena(enemy.position[2] + dz * moveSpeed),
  ]

  return {
    position: newPos,
    state: 'chase',
  }
}

function clampArena(v: number): number {
  return Math.max(-14, Math.min(14, v))
}
