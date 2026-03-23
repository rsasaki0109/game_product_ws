import type { CrystalNode } from '../types/game.ts'

export function generateCrystalNodes(): CrystalNode[] {
  const nodes: CrystalNode[] = []
  const count = 7
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
    const radius = 14 + Math.random() * 8
    nodes.push({
      id: i + 1,
      position: [
        30 + Math.cos(angle) * radius,
        30 + Math.sin(angle) * radius,
      ],
      remaining: 500 + Math.floor(Math.random() * 300),
      hasMine: false,
    })
  }
  return nodes
}
