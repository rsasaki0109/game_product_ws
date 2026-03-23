import type { WaveDef } from '../types/game.ts'

const WAVES: WaveDef[] = [
  { spawns: [{ type: 'drone', count: 3 }] },                                                          // W1
  { spawns: [{ type: 'drone', count: 5 }] },                                                          // W2
  { spawns: [{ type: 'drone', count: 6 }, { type: 'turret', count: 1 }] },                            // W3
  { spawns: [{ type: 'drone', count: 3 }, { type: 'turret', count: 1 }] },                            // W4 (-20%)
  { spawns: [{ type: 'drone', count: 4 }, { type: 'turret', count: 1 }] },                            // W5 (-30%)
  { spawns: [{ type: 'drone', count: 4 }, { type: 'turret', count: 1 }, { type: 'heavy', count: 1 }] }, // W6 (-20%)
  { spawns: [{ type: 'drone', count: 4 }, { type: 'heavy', count: 1 }] },                             // W7 (-25%)
  { spawns: [{ type: 'turret', count: 2 }, { type: 'heavy', count: 1 }] },                            // W8 (-30%)
  { spawns: [{ type: 'drone', count: 6 }, { type: 'heavy', count: 1 }, { type: 'turret', count: 1 }] }, // W9 (-25%)
  { spawns: [{ type: 'drone', count: 6 }, { type: 'heavy', count: 3 }, { type: 'turret', count: 3 }] }, // W10
  { spawns: [{ type: 'heavy', count: 4 }, { type: 'turret', count: 4 }] },                            // W11
  { spawns: [{ type: 'drone', count: 10 }, { type: 'heavy', count: 3 }] },                            // W12
  { spawns: [{ type: 'heavy', count: 5 }, { type: 'turret', count: 4 }] },                            // W13
  { spawns: [{ type: 'drone', count: 8 }, { type: 'heavy', count: 4 }, { type: 'turret', count: 3 }] }, // W14
  { spawns: [{ type: 'boss', count: 1 }, { type: 'heavy', count: 2 }, { type: 'drone', count: 4 }] }, // W15 (reduced escort)
]

export function getWaveDef(wave: number): WaveDef {
  return WAVES[Math.min(wave - 1, WAVES.length - 1)]
}

export const MAX_WAVE = WAVES.length
