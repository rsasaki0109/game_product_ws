import type { WaveDef, EnemyInstance } from '../types/game.ts'
import { getEnemyDef } from '../data/enemies.ts'

export function getWavesForFloor(floor: number): WaveDef[][] {
  if (floor <= 2) return [[{ enemyId: 'goblin', count: 2 + floor }]]
  if (floor <= 4)
    return [
      [{ enemyId: 'goblin', count: 3 }],
      [{ enemyId: 'goblin', count: 2 }, { enemyId: 'skeleton', count: 1 }],
    ]
  if (floor <= 6)
    return [
      [{ enemyId: 'skeleton', count: 3 }],
      [{ enemyId: 'skeleton', count: 2 }, { enemyId: 'goblin', count: 2 }],
    ]
  if (floor <= 9)
    return [
      [{ enemyId: 'skeleton', count: 2 }, { enemyId: 'orc', count: 1 }],
      [{ enemyId: 'orc', count: 2 }, { enemyId: 'skeleton', count: 2 }],
    ]
  return [[{ enemyId: 'dark_knight', count: 1 }]]
}

let nextUid = 1

export function spawnEnemyInstance(
  enemyId: string,
  floor: number,
): EnemyInstance {
  const def = getEnemyDef(enemyId)
  const scale = 1 + (floor - 1) * 0.12
  const angle = Math.random() * Math.PI * 2
  const radius = 10 + Math.random() * 3

  return {
    uid: nextUid++,
    def,
    currentHp: Math.round(def.baseHp * scale),
    maxHp: Math.round(def.baseHp * scale),
    attack: Math.round(def.baseAttack * scale),
    speed: def.baseSpeed * (1 + (floor - 1) * 0.04),
    position: [
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius,
    ],
    state: 'chase',
    attackTimer: 0,
    hitTimer: 0,
    windUpTimer: 0,
  }
}

export function resetUidCounter() {
  nextUid = 1
}
