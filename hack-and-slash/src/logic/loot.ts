import type { ItemDef } from '../types/game.ts'
import { ITEMS } from '../data/items.ts'

const DROP_RATE = 0.55

export function rollLoot(floor: number): ItemDef | null {
  if (Math.random() > DROP_RATE) return null

  const weighted = ITEMS.map((item, i) => {
    const tier = Math.floor(i / 2)
    const floorBonus = Math.max(0, floor - tier * 3)
    return { item, weight: 1 + floorBonus }
  })

  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0)
  let roll = Math.random() * totalWeight
  for (const w of weighted) {
    roll -= w.weight
    if (roll <= 0) return w.item
  }
  return weighted[0].item
}
