import type { EnemyDef, EnemyInstance } from '../types/enemy.ts'
import { getEnemiesForFloor, getBossForFloor } from '../data/enemies.ts'
import { resolveEnemyIntent } from './combat.ts'

export function isBossFloor(floor: number): boolean {
  return floor === 5 || floor === 10 || floor === 15
}

export function generateEnemy(floor: number): EnemyInstance {
  const bossDef = getBossForFloor(floor)
  const def = bossDef ?? pickRandom(getEnemiesForFloor(floor))
  return scaleEnemy(def, floor)
}

function scaleEnemy(def: EnemyDef, floor: number): EnemyInstance {
  const scale = 1 + (floor - 1) * 0.15
  const attack = Math.round(def.baseAttack * scale)
  const firstIntent = def.intentPattern[0]
  return {
    def,
    currentHp: Math.round(def.baseHp * scale),
    maxHp: Math.round(def.baseHp * scale),
    shield: 0,
    attack,
    intentIndex: 0,
    currentIntent: resolveEnemyIntent(firstIntent, attack),
    statusEffects: [],
  }
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
