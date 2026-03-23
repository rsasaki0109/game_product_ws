import type { AthleteState, EventState } from '../types/game.ts'

export function applySabotageToDash(
  target: AthleteState,
  index: number,
): void {
  switch (index) {
    case 1: // Banana - trip 1.5s
      target.stunTimer = 1.5
      break
    case 2: // Headwind -40% speed 3s
      target.debuffType = 'headwind'
      target.debuffTimer = 3.0
      break
    case 3: // Smokescreen 2s
      target.debuffType = 'smokescreen'
      target.debuffTimer = 2.0
      break
  }
}

export function applySabotageToJavelin(
  target: AthleteState,
  event: EventState,
  index: number,
  isTargetAI: boolean,
): void {
  switch (index) {
    case 1: // Shaky - faster oscillation
      if (isTargetAI) {
        // AI gets worse random
        target.debuffType = 'shaky'
        target.debuffTimer = 5.0
      } else {
        target.debuffType = 'shaky'
        target.debuffTimer = 5.0
        event.powerDir = event.powerDir * 2.5
      }
      break
    case 2: // Wall - cap distance
      target.debuffType = 'wall'
      target.debuffTimer = 10.0
      break
    case 3: // Gravity - angle offset
      target.debuffType = 'gravity'
      target.debuffTimer = 10.0
      break
  }
}

export function applySabotageToHighJump(
  target: AthleteState,
  event: EventState,
  index: number,
  isTargetAI: boolean,
): void {
  switch (index) {
    case 1: // Raise bar +0.15m
      if (isTargetAI) {
        event.aiBarHeight += 0.15
      } else {
        event.barHeight += 0.15
      }
      break
    case 2: // Slip - timing window halved
      target.debuffType = 'slip'
      target.debuffTimer = 5.0
      break
    case 3: // Gust - -20% height
      target.debuffType = 'gust'
      target.debuffTimer = 5.0
      break
  }
}

export function applySabotageToMarathon(
  target: AthleteState,
  index: number,
): void {
  switch (index) {
    case 1: // Pothole - stumble
      target.stunTimer = 0.8
      break
    case 2: // Fatigue - stamina -30
      target.stamina = Math.max(0, target.stamina - 30)
      break
    case 3: // Reverse - run backward 1.5s
      target.debuffType = 'reverse'
      target.debuffTimer = 1.5
      break
  }
}
