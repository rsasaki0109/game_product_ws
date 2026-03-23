import type { EnemyWaveDef } from '../types/game.ts'

const EDGES = ['north', 'south', 'east', 'west'] as const

export function getWaveDef(wave: number): EnemyWaveDef {
  const edge1 = EDGES[wave % 4]
  const edge2 = EDGES[(wave + 2) % 4]

  if (wave <= 3) {
    return {
      enemies: [{ type: 'soldier', count: Math.round((2 + wave * 2) * 0.5) }],
      spawnEdges: [edge1],
    }
  }
  if (wave <= 6) {
    return {
      enemies: [
        { type: 'soldier', count: Math.round((3 + wave) * 0.8) },
        { type: 'archer', count: Math.max(1, Math.floor(wave / 2) - 1) },
      ],
      spawnEdges: [edge1, edge2],
    }
  }
  if (wave <= 9) {
    return {
      enemies: [
        { type: 'soldier', count: 4 + wave },
        { type: 'archer', count: wave - 2 },
        { type: 'knight', count: Math.floor((wave - 6) * 1.5) },
      ],
      spawnEdges: [edge1, edge2],
    }
  }
  // Wave 10: boss wave
  return {
    enemies: [
      { type: 'knight', count: 8 },
      { type: 'soldier', count: 10 },
      { type: 'archer', count: 8 },
    ],
    spawnEdges: ['north', 'south', 'east', 'west'],
  }
}

export function getWaveStatScale(wave: number): number {
  return 1 + (wave - 1) * 0.15
}
