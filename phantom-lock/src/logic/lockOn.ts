import type { Vec3, EnemyInstance } from '../types/game.ts'
import { sub3, normalize3, dot3 } from './combat.ts'

const LOCK_CONE_ANGLE = 0.35  // radians (~20 degrees, generous for game feel)
const MAX_LOCKS = 8
const LOCK_ENERGY_COST = 3

export function tryLockEnemies(
  enemies: EnemyInstance[],
  currentLocks: number[],
  crosshairWorldPos: Vec3,
  cameraPos: Vec3,
  energy: number,
): { newLocks: number[]; energyUsed: number } {
  const aimDir = normalize3(sub3(crosshairWorldPos, cameraPos))
  let newLocks = [...currentLocks]
  let energyUsed = 0

  for (const enemy of enemies) {
    if (!enemy.alive) continue
    if (newLocks.includes(enemy.uid)) continue
    if (newLocks.length >= MAX_LOCKS) break
    if (energy - energyUsed < LOCK_ENERGY_COST) break

    const toEnemy = normalize3(sub3(enemy.position, cameraPos))
    const angle = Math.acos(Math.min(1, Math.max(-1, dot3(aimDir, toEnemy))))

    if (angle < LOCK_CONE_ANGLE) {
      newLocks.push(enemy.uid)
      energyUsed += LOCK_ENERGY_COST
    }
  }

  return { newLocks, energyUsed }
}

export { MAX_LOCKS, LOCK_ENERGY_COST }
