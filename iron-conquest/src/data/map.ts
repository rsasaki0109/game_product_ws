import type { IronNode } from '../types/game.ts'

export function generateIronNodes(): IronNode[] {
  const nodes: IronNode[] = [
    // 2 near player
    { id: 1, position: [10, 20], remaining: 700, hasRefinery: false, refineryOwner: null },
    { id: 2, position: [20, 10], remaining: 650, hasRefinery: false, refineryOwner: null },
    // 2 near enemy
    { id: 3, position: [60, 70], remaining: 700, hasRefinery: false, refineryOwner: null },
    { id: 4, position: [70, 60], remaining: 650, hasRefinery: false, refineryOwner: null },
    // 5 in center
    { id: 5, position: [35, 40], remaining: 800, hasRefinery: false, refineryOwner: null },
    { id: 6, position: [45, 35], remaining: 750, hasRefinery: false, refineryOwner: null },
    { id: 7, position: [40, 45], remaining: 600, hasRefinery: false, refineryOwner: null },
    { id: 8, position: [30, 50], remaining: 700, hasRefinery: false, refineryOwner: null },
    { id: 9, position: [50, 30], remaining: 650, hasRefinery: false, refineryOwner: null },
  ]
  return nodes
}
