import type { Vec3, EnemyInstance, QuickShotInstance } from '../types/game.ts'
import { sub3, normalize3, clampArena } from './combat.ts'
import { spawnQuickShot } from './projectile.ts'

export function tickEnemy(
  enemy: EnemyInstance,
  playerPos: Vec3,
  delta: number,
  elapsed: number,
): { enemy: EnemyInstance; shots: QuickShotInstance[] } {
  if (!enemy.alive) return { enemy, shots: [] }

  const e = { ...enemy }
  const shots: QuickShotInstance[] = []

  // Attack timer
  e.attackTimer = Math.max(0, e.attackTimer - delta)

  const toPlayer = sub3(playerPos, e.position)
  const dirToPlayer = normalize3(toPlayer)

  switch (e.def.type) {
    case 'drone': {
      // Orbit player with bobbing
      e.orbitAngle += 1.5 * delta
      const orbitR = 7 + Math.sin(elapsed * 0.7 + e.uid) * 3
      e.position = [
        playerPos[0] + Math.cos(e.orbitAngle) * orbitR,
        1.5 + Math.sin(elapsed * 2 + e.uid * 0.5) * 1.0,
        playerPos[2] + Math.sin(e.orbitAngle) * orbitR,
      ]
      // Drones also shoot at player on cooldown
      if (e.attackTimer <= 0) {
        shots.push(spawnQuickShot(e.position, dirToPlayer, e.def.damage, true))
        e.attackTimer = e.def.attackCooldown
      }
      break
    }

    case 'turret': {
      // Stationary, shoot at player
      if (e.attackTimer <= 0) {
        shots.push(spawnQuickShot(e.position, dirToPlayer, e.def.damage, true))
        e.attackTimer = e.def.attackCooldown
      }
      break
    }

    case 'heavy': {
      // Slowly approach
      const spd = e.def.speed * delta
      e.position = [
        clampArena(e.position[0] + dirToPlayer[0] * spd),
        e.position[1],
        clampArena(e.position[2] + dirToPlayer[2] * spd),
      ]
      // Spread shot
      if (e.attackTimer <= 0) {
        for (let i = -1; i <= 1; i++) {
          const angle = i * 0.15
          const dir: Vec3 = [
            dirToPlayer[0] * Math.cos(angle) - dirToPlayer[2] * Math.sin(angle),
            dirToPlayer[1],
            dirToPlayer[0] * Math.sin(angle) + dirToPlayer[2] * Math.cos(angle),
          ]
          shots.push(spawnQuickShot(e.position, dir, e.def.damage, true))
        }
        e.attackTimer = e.def.attackCooldown
      }
      break
    }

    case 'boss': {
      // Slowly approach
      const spd = e.def.speed * delta
      e.position = [
        clampArena(e.position[0] + dirToPlayer[0] * spd),
        e.position[1],
        clampArena(e.position[2] + dirToPlayer[2] * spd),
      ]
      // Alternating attacks
      if (e.attackTimer <= 0) {
        for (let i = -2; i <= 2; i++) {
          const angle = i * 0.12
          const dir: Vec3 = [
            dirToPlayer[0] * Math.cos(angle) - dirToPlayer[2] * Math.sin(angle),
            dirToPlayer[1],
            dirToPlayer[0] * Math.sin(angle) + dirToPlayer[2] * Math.cos(angle),
          ]
          shots.push(spawnQuickShot(e.position, dir, e.def.damage, true))
        }
        e.attackTimer = e.def.attackCooldown
      }
      break
    }
  }

  return { enemy: e, shots }
}
