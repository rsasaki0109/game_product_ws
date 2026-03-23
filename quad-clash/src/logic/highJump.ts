import type { GameState } from '../types/game.ts'

const APPROACH_TIME = 2.0
const TAKEOFF_WINDOW = 0.5 // timing window for perfect jump
const FLIGHT_TIME = 1.5

export function tickHighJump(
  state: GameState,
  delta: number,
  keys: Record<string, boolean>,
  spaceJustPressed: boolean,
): void {
  const { player, event } = state

  if (event.phase === 'ready') {
    event.elapsed += delta
    if (event.elapsed >= 0.5) {
      event.phase = 'running'
      event.elapsed = 0
      event.barHeight = 1.5
      event.aiBarHeight = 1.5
      event.attempts = 0
      event.aiAttempts = 0
      event.maxAttempts = 3
      event.jumpPhase = 'approach'
      event.bestHeight = 0
      event.aiBestHeight = 0
      event.jumpPower = 0
      event.aiJumping = false
      event.aiJumpTimer = 0
    }
    return
  }

  if (event.phase !== 'running') return

  event.elapsed += delta
  void keys

  switch (event.jumpPhase) {
    case 'approach': {
      // Auto approach, player position moves toward bar
      player.position += 3 * delta
      if (player.position >= APPROACH_TIME * 3) {
        event.jumpPhase = 'takeoff'
        event.elapsed = 0
      }
      break
    }

    case 'takeoff': {
      // Player must press space at the right time
      event.elapsed += 0 // already incremented above

      const window = player.debuffType === 'slip' ? TAKEOFF_WINDOW * 0.5 : TAKEOFF_WINDOW
      const perfectTime = 0.5

      if (spaceJustPressed) {
        const diff = Math.abs(event.elapsed - perfectTime)
        if (diff <= window) {
          // Good timing: closer to perfect = more power
          event.jumpPower = 100 * (1 - diff / window)
        } else {
          event.jumpPower = 30 // bad timing
        }
        event.jumpPhase = 'flight'
        event.elapsed = 0
      }

      // Auto-fail if too late
      if (event.elapsed > perfectTime + window + 0.3) {
        event.jumpPower = 10
        event.jumpPhase = 'flight'
        event.elapsed = 0
      }
      break
    }

    case 'flight': {
      // Arrow up during flight for bonus
      if (keys['ArrowUp'] && event.elapsed < 0.5) {
        event.jumpPower = Math.min(100, event.jumpPower + 20 * delta)
      }

      if (event.elapsed >= FLIGHT_TIME) {
        // Calculate jump height
        let jumpHeight = 1.2 + (event.jumpPower / 100) * 1.3 // 1.2m to 2.5m range
        if (player.debuffType === 'gust') {
          jumpHeight *= 0.8
        }

        const cleared = jumpHeight >= event.barHeight

        if (cleared) {
          event.bestHeight = event.barHeight
          event.barHeight += 0.1
          event.attempts = 0
        } else {
          event.attempts++
        }

        // Clear player debuffs
        player.debuffType = null
        player.debuffTimer = 0

        // AI jump
        tickAIHighJump(state)

        // Check if both done
        const playerDone = !cleared && event.attempts >= event.maxAttempts
        const aiDone = event.aiAttempts >= event.maxAttempts

        if (playerDone && aiDone) {
          event.phase = 'finished'
          event.playerResult = event.bestHeight
          event.aiResult = event.aiBestHeight
        } else if (playerDone) {
          // Player done, let AI continue
          while (event.aiAttempts < event.maxAttempts) {
            tickAIHighJump(state)
            if (event.aiAttempts >= event.maxAttempts) break
          }
          event.phase = 'finished'
          event.playerResult = event.bestHeight
          event.aiResult = event.aiBestHeight
        } else {
          // Reset for next jump
          event.jumpPhase = 'approach'
          event.elapsed = 0
          player.position = 0
        }
      }
      break
    }

    case 'done':
      break
  }
}

function tickAIHighJump(state: GameState): void {
  const { ai, event } = state

  // AI has ~80% success rate
  const successRate = ai.debuffType === 'gust' ? 0.6 : 0.8
  const success = Math.random() < successRate

  if (success) {
    event.aiBestHeight = event.aiBarHeight
    event.aiBarHeight += 0.1
    event.aiAttempts = 0
  } else {
    event.aiAttempts++
  }

  // Clear AI debuffs after jump
  ai.debuffType = null
  ai.debuffTimer = 0
}
