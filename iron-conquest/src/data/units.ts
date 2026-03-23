import type { UnitDef, UnitType } from '../types/game.ts'

export const UNIT_DEFS: UnitDef[] = [
  { type: 'worker', name: 'Worker', color: '#f59e0b', hp: 25, attack: 2, attackRange: 1.5, attackCooldown: 1.0, speed: 4, cost: 40, trainTime: 2.5, scale: 0.4, trainedAt: 'hq' },
  { type: 'militia', name: 'Militia', color: '#3b82f6', hp: 75, attack: 10, attackRange: 1.8, attackCooldown: 1.0, speed: 4, cost: 60, trainTime: 4, scale: 0.5, trainedAt: 'barracks' },
  { type: 'ranger', name: 'Ranger', color: '#22c55e', hp: 40, attack: 8, attackRange: 7.0, attackCooldown: 1.5, speed: 3.5, cost: 100, trainTime: 5, scale: 0.45, trainedAt: 'barracks' },
  { type: 'tank', name: 'Tank', color: '#8b5cf6', hp: 180, attack: 22, attackRange: 2.0, attackCooldown: 1.5, speed: 3.0, cost: 200, trainTime: 8, scale: 0.8, trainedAt: 'factory' },
  { type: 'artillery', name: 'Artillery', color: '#ef4444', hp: 50, attack: 30, attackRange: 12.0, attackCooldown: 2.5, speed: 1.5, cost: 250, trainTime: 10, scale: 0.55, trainedAt: 'factory' },
]

export function getUnitDef(type: UnitType): UnitDef {
  const def = UNIT_DEFS.find(d => d.type === type)
  if (!def) throw new Error(`Unknown unit: ${type}`)
  return def
}
