import type { EventType } from '../types/game.ts'

export const EVENT_NAMES: Record<EventType, string> = {
  dash: '100m DASH',
  javelin: 'JAVELIN THROW',
  highJump: 'HIGH JUMP',
  marathon: 'MARATHON',
}

export const EVENT_CONTROLS: Record<EventType, string[]> = {
  dash: ['Space = Run', 'Shift = Boost'],
  javelin: ['Hold Space = Power', 'Up/Down = Angle'],
  highJump: ['Space = Jump', 'Up = Arch body'],
  marathon: ['Up = Faster', 'Down = Slower', 'Shift = Sprint'],
}
