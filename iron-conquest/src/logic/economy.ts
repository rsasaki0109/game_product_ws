import type { BuildingInstance, IronNode, UnitOwner } from '../types/game.ts'

export function getRefineryIncome(buildings: BuildingInstance[], nodes: IronNode[], owner: UnitOwner, delta: number): number {
  let income = 0
  for (const b of buildings) {
    if (b.def.type === 'refinery' && b.isBuilt && b.owner === owner && b.assignedNodeId !== null) {
      const node = nodes.find(n => n.id === b.assignedNodeId)
      if (node && node.remaining > 0) {
        const amount = 3 * delta
        income += amount
      }
    }
  }
  return income
}
