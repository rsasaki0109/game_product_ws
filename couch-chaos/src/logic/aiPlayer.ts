import type { PlayerState } from '../types/game.ts'
import type { ObstacleInstance } from '../types/game.ts'

export function aiDecideMovement(
  ai: PlayerState,
  obstacles: ObstacleInstance[],
  elapsed: number,
): { moveRight: boolean; moveLeft: boolean; jump: boolean } {
  // AI speed ramp: starts slower, reaches full speed over ~15 seconds
  const speedFactor = Math.min(1.0, 0.55 + elapsed * 0.03)
  // Randomly pause forward movement to simulate slower early game
  const moveRight = Math.random() < speedFactor
  const moveLeft = false

  // Jump if obstacle ahead
  let jump = false
  for (const obs of obstacles) {
    if (obs.x > ai.x && obs.x < ai.x + 3 && ai.onGround) {
      jump = true
      break
    }
  }

  // Random jumps for coins
  if (!jump && Math.random() < 0.02 && ai.onGround) {
    jump = true
  }

  return { moveRight, moveLeft, jump }
}

export function aiDecidePhysical(
  ai: PlayerState,
  player: PlayerState,
  elapsed: number,
): string | null {
  // AI uses physical actions when player is ahead
  if (player.progress <= ai.progress + 5) return null
  if (elapsed < 3) return null

  const roll = Math.random()

  if (ai.pushCooldown <= 0 && roll < 0.007) return 'push'
  if (ai.coverCooldown <= 0 && roll < 0.003) return 'cover'
  if (ai.pillowCooldown <= 0 && roll < 0.005) return 'pillow'
  if (ai.tickleCooldown <= 0 && roll < 0.002) return 'tickle'

  return null
}
