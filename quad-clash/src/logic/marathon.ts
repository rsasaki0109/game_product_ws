import type { GameState } from '../types/game.ts'

const COURSE_LENGTH = 2000 // 2km in meters
const BASE_SPEED = 4 // m/s at normal pace
const FAST_SPEED = 6
const SLOW_SPEED = 2.5
const SPRINT_SPEED = 9
const STAMINA_MAX = 100
const STAMINA_DRAIN_FAST = 12 // per second
const STAMINA_DRAIN_SPRINT = 50
const STAMINA_RECOVER_SLOW = 8
const WALK_SPEED = 1.5

export function tickMarathon(
  state: GameState,
  delta: number,
  keys: Record<string, boolean>,
  shiftPressed: boolean,
): void {
  const { player, ai, event } = state

  if (event.phase === 'ready') {
    event.elapsed += delta
    if (event.elapsed >= 0.5) {
      event.phase = 'running'
      event.elapsed = 0
      player.stamina = STAMINA_MAX
      ai.stamina = STAMINA_MAX
      event.courseLength = COURSE_LENGTH
    }
    return
  }

  if (event.phase !== 'running') return

  event.elapsed += delta

  // --- Player ---
  if (player.stunTimer > 0) {
    player.stunTimer -= delta
  } else if (player.debuffType === 'reverse' && player.debuffTimer > 0) {
    player.debuffTimer -= delta
    player.position -= BASE_SPEED * delta
    player.position = Math.max(0, player.position)
    if (player.debuffTimer <= 0) {
      player.debuffType = null
    }
  } else {
    let speed = BASE_SPEED
    let staminaDrain = 2 // base drain

    if (shiftPressed && player.stamina > 10) {
      speed = SPRINT_SPEED
      staminaDrain = STAMINA_DRAIN_SPRINT
    } else if (keys['ArrowUp']) {
      speed = FAST_SPEED
      staminaDrain = STAMINA_DRAIN_FAST
    } else if (keys['ArrowDown']) {
      speed = SLOW_SPEED
      staminaDrain = -STAMINA_RECOVER_SLOW // recover
    }

    if (player.stamina <= 0) {
      speed = WALK_SPEED
      staminaDrain = -STAMINA_RECOVER_SLOW * 0.5
    }

    player.stamina = Math.max(0, Math.min(STAMINA_MAX, player.stamina - staminaDrain * delta))
    player.speed = speed
    player.position += speed * delta

    // Debuff timer
    if (player.debuffTimer > 0) {
      player.debuffTimer -= delta
      if (player.debuffTimer <= 0) {
        player.debuffType = null
      }
    }
  }

  // --- AI ---
  if (ai.stunTimer > 0) {
    ai.stunTimer -= delta
  } else if (ai.debuffType === 'reverse' && ai.debuffTimer > 0) {
    ai.debuffTimer -= delta
    ai.position -= BASE_SPEED * delta
    ai.position = Math.max(0, ai.position)
    if (ai.debuffTimer <= 0) {
      ai.debuffType = null
    }
  } else {
    // AI pacing strategy
    const progress = ai.position / COURSE_LENGTH
    let aiSpeed: number
    let aiDrain: number

    if (progress > 0.85 && ai.stamina > 15) {
      // Sprint near end
      aiSpeed = SPRINT_SPEED * 0.9
      aiDrain = STAMINA_DRAIN_SPRINT * 0.8
    } else if (ai.stamina < 20) {
      // Recover
      aiSpeed = SLOW_SPEED
      aiDrain = -STAMINA_RECOVER_SLOW
    } else {
      // Normal pace with variation
      aiSpeed = BASE_SPEED + Math.sin(event.elapsed * 0.5) * 0.8
      aiDrain = 5
    }

    if (ai.stamina <= 0) {
      aiSpeed = WALK_SPEED
      aiDrain = -STAMINA_RECOVER_SLOW * 0.5
    }

    ai.stamina = Math.max(0, Math.min(STAMINA_MAX, ai.stamina - aiDrain * delta))
    ai.speed = aiSpeed
    ai.position += aiSpeed * delta

    if (ai.debuffTimer > 0) {
      ai.debuffTimer -= delta
      if (ai.debuffTimer <= 0) {
        ai.debuffType = null
      }
    }
  }

  // Check finish
  if (player.position >= COURSE_LENGTH || ai.position >= COURSE_LENGTH) {
    event.phase = 'finished'
    event.playerResult = player.position >= COURSE_LENGTH ? event.elapsed : event.elapsed + 30
    event.aiResult = ai.position >= COURSE_LENGTH ? event.elapsed : event.elapsed + 30
  }
}
