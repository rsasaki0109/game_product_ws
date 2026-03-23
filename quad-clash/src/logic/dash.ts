import type { GameState } from '../types/game.ts'

const FINISH_DISTANCE = 100
const BASE_SPEED = 8
const MASH_BOOST = 0.15
const SPEED_DECAY = 0.92
const SHIFT_BOOST = 15
const SHIFT_COOLDOWN = 3

export function tickDash(
  state: GameState,
  delta: number,
  keys: Record<string, boolean>,
  spaceJustPressed: boolean,
  shiftJustPressed: boolean,
): void {
  const { player, ai, event } = state

  if (event.phase === 'ready') {
    event.elapsed += delta
    if (event.elapsed >= 0.5) {
      event.phase = 'running'
      event.elapsed = 0
    }
    return
  }

  if (event.phase !== 'running') return

  event.elapsed += delta

  // --- Player ---
  if (player.stunTimer > 0) {
    player.stunTimer -= delta
    player.speed *= 0.1
  } else {
    // Mash space to accelerate
    if (spaceJustPressed) {
      player.speed += MASH_BOOST * 30
    }

    // Speed decay
    player.speed = Math.max(0, player.speed * SPEED_DECAY)

    // Shift boost
    if (shiftJustPressed && player.stamina > 0) {
      player.speed += SHIFT_BOOST
      player.stamina -= 1 // track cooldown via stamina
    }

    // Debuff
    let speedMult = 1.0
    if (player.debuffTimer > 0) {
      player.debuffTimer -= delta
      if (player.debuffType === 'headwind') {
        speedMult = 0.6
      }
      if (player.debuffTimer <= 0) {
        player.debuffType = null
      }
    }

    const effectiveSpeed = (BASE_SPEED + player.speed * 0.1) * speedMult
    player.position += effectiveSpeed * delta
  }

  // --- AI ---
  if (ai.stunTimer > 0) {
    ai.stunTimer -= delta
  } else {
    // AI auto-run with some variance
    const aiTargetSpeed = 11 + Math.sin(event.elapsed * 2) * 1.5
    let aiSpeedMult = 1.0
    if (ai.debuffTimer > 0) {
      ai.debuffTimer -= delta
      if (ai.debuffType === 'headwind') {
        aiSpeedMult = 0.6
      }
      if (ai.debuffTimer <= 0) {
        ai.debuffType = null
      }
    }
    ai.position += aiTargetSpeed * aiSpeedMult * delta
  }

  // Suppress unused warning for keys
  void keys

  // Check finish
  if (player.position >= FINISH_DISTANCE || ai.position >= FINISH_DISTANCE) {
    event.phase = 'finished'
    event.playerResult = player.position >= FINISH_DISTANCE ? event.elapsed : event.elapsed + 2
    event.aiResult = ai.position >= FINISH_DISTANCE ? event.elapsed : event.elapsed + 2

    // Lower time is better for dash, convert to score perspective
    // playerResult and aiResult are times - lower is better
  }
}

export function getDashShiftCooldown(): number {
  return SHIFT_COOLDOWN
}
