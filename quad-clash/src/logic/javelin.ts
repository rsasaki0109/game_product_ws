import type { GameState } from '../types/game.ts'

const POWER_SPEED = 80 // base oscillation speed

export function tickJavelin(
  state: GameState,
  delta: number,
  keys: Record<string, boolean>,
  spacePressed: boolean,
  spaceJustReleased: boolean,
): void {
  const { player, ai, event } = state

  if (event.phase === 'ready') {
    event.elapsed += delta
    if (event.elapsed >= 0.5) {
      event.phase = 'running'
      event.elapsed = 0
      event.power = 0
      event.powerDir = 1
      event.angle = 40
      event.thrown = false
    }
    return
  }

  if (event.phase !== 'running') return

  event.elapsed += delta

  if (!event.thrown) {
    // Power meter oscillates
    const shakyMult = player.debuffType === 'shaky' ? 2.5 : 1.0
    const speed = POWER_SPEED * shakyMult

    if (spacePressed) {
      event.power += event.powerDir * speed * delta
      if (event.power >= 100) {
        event.power = 100
        event.powerDir = -1
      } else if (event.power <= 0) {
        event.power = 0
        event.powerDir = 1
      }
    }

    // Adjust angle
    if (keys['ArrowUp']) {
      event.angle = Math.min(60, event.angle + 40 * delta)
    }
    if (keys['ArrowDown']) {
      event.angle = Math.max(20, event.angle - 40 * delta)
    }

    // Release to throw
    if (spaceJustReleased && event.power > 0) {
      event.thrown = true

      let angle = event.angle
      // Gravity sabotage: offset angle
      if (player.debuffType === 'gravity') {
        angle -= 10
      }
      if (player.debuffTimer > 0) {
        player.debuffTimer -= delta
        if (player.debuffTimer <= 0) {
          player.debuffType = null
        }
      }

      const rad = (angle * Math.PI) / 180
      let distance = event.power * Math.sin(2 * rad) * 0.5
      distance += (Math.random() - 0.5) * 5 // variance

      // Wall sabotage
      if (player.debuffType === 'wall') {
        distance = Math.min(distance, 100 * 0.6 * 0.5)
      }

      event.playerResult = Math.max(0, distance)

      // AI throw
      const aiPower = 60 + Math.random() * 30
      let aiAngle = 35 + Math.random() * 15
      if (ai.debuffType === 'gravity') {
        aiAngle -= 10
      }
      const aiRad = (aiAngle * Math.PI) / 180
      let aiDistance = aiPower * Math.sin(2 * aiRad) * 0.5
      aiDistance += (Math.random() - 0.5) * 5

      if (ai.debuffType === 'wall') {
        aiDistance = Math.min(aiDistance, 100 * 0.6 * 0.5)
      }
      if (ai.debuffType === 'shaky') {
        aiDistance *= 0.7 // worse result
      }

      event.aiResult = Math.max(0, aiDistance)

      // Clear debuffs
      player.debuffType = null
      player.debuffTimer = 0
      ai.debuffType = null
      ai.debuffTimer = 0
    }
  } else {
    // After throw, wait a moment then finish
    if (event.elapsed > 1.5) {
      event.phase = 'finished'
    }
  }
}
