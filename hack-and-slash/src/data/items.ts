import type { ItemDef } from '../types/game.ts'

export const ITEMS: ItemDef[] = [
  { id: 'rusty_sword', name: 'Rusty Sword', emoji: '\u2694\uFE0F', stat: 'attack', value: 2 },
  { id: 'sharp_blade', name: 'Sharp Blade', emoji: '\uD83D\uDDE1\uFE0F', stat: 'attack', value: 4 },
  { id: 'leather_boots', name: 'Leather Boots', emoji: '\uD83E\uDD7E', stat: 'speed', value: 0.5 },
  { id: 'swift_sandals', name: 'Swift Sandals', emoji: '\uD83D\uDC5F', stat: 'speed', value: 1.0 },
  { id: 'health_ring', name: 'Health Ring', emoji: '\uD83D\uDC8D', stat: 'maxHp', value: 10 },
  { id: 'vitality_amulet', name: 'Vitality Amulet', emoji: '\uD83D\uDCAE', stat: 'maxHp', value: 20 },
]
