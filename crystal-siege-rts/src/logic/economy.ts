import type { BuildingInstance } from '../types/game.ts'

export function getMineIncome(mines: BuildingInstance[], delta: number): number {
  let income = 0
  for (const m of mines) {
    if (m.def.type === 'mine' && m.isBuilt && m.owner === 'player') {
      income += 6 * delta
    }
  }
  return income
}
