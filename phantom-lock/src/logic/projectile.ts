import type { Vec3, ProjectileInstance, QuickShotInstance } from '../types/game.ts'
import { sub3, normalize3, scale3, add3, lerp3 } from './combat.ts'
import { getNextUid } from './ids.ts'

const HOMING_SPEED = 25
const HOMING_TURN_RATE = 4.0 // rad/s equivalent as lerp factor
const QUICK_SHOT_SPEED = 40

export function steerProjectile(
  proj: ProjectileInstance,
  targetPos: Vec3,
  delta: number,
): ProjectileInstance {
  const desiredDir = normalize3(sub3(targetPos, proj.position))
  const currentDir = normalize3(proj.velocity)
  const t = Math.min(1, HOMING_TURN_RATE * delta)
  const newDir = normalize3(lerp3(currentDir, desiredDir, t))
  const newVel = scale3(newDir, proj.speed)
  const newPos: Vec3 = add3(proj.position, scale3(newVel, delta))

  return {
    ...proj,
    position: newPos,
    velocity: newVel,
    lastKnownTargetPos: targetPos,
    age: proj.age + delta,
  }
}

export function spawnHomingProjectile(
  playerPos: Vec3,
  targetUid: number,
  targetPos: Vec3,
  damage: number,
): ProjectileInstance {
  const dir = normalize3(sub3(targetPos, playerPos))
  return {
    uid: getNextUid(),
    position: [...playerPos] as Vec3,
    targetUid,
    lastKnownTargetPos: targetPos,
    speed: HOMING_SPEED,
    velocity: scale3(dir, HOMING_SPEED),
    damage,
    alive: true,
    age: 0,
  }
}

export function spawnQuickShot(
  origin: Vec3,
  direction: Vec3,
  damage: number,
  isEnemy: boolean,
): QuickShotInstance {
  const dir = normalize3(direction)
  return {
    uid: getNextUid(),
    position: [...origin] as Vec3,
    velocity: scale3(dir, QUICK_SHOT_SPEED),
    damage,
    ttl: 2.0,
    alive: true,
    isEnemy,
  }
}
