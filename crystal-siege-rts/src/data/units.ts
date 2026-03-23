import type { UnitDef, UnitType } from '../types/game.ts'

export const UNIT_DEFS: UnitDef[] = [
  { type: 'worker', name: 'Worker', color: '#f59e0b', hp: 30, attack: 3, attackRange: 1.5, attackCooldown: 1.0, speed: 4, cost: 50, trainTime: 2.25, scale: 0.4 },
  { type: 'soldier', name: 'Soldier', color: '#3b82f6', hp: 120, attack: 18, attackRange: 1.8, attackCooldown: 1.0, speed: 3.5, cost: 100, trainTime: 3.75, scale: 0.5 },
  { type: 'archer', name: 'Archer', color: '#22c55e', hp: 45, attack: 10, attackRange: 8.0, attackCooldown: 1.5, speed: 3, cost: 120, trainTime: 4.5, scale: 0.45 },
  { type: 'knight', name: 'Knight', color: '#8b5cf6', hp: 250, attack: 22, attackRange: 2.0, attackCooldown: 1.5, speed: 2.5, cost: 200, trainTime: 6, scale: 0.6 },
]

export function getUnitDef(type: UnitType): UnitDef {
  const def = UNIT_DEFS.find(d => d.type === type)
  if (!def) throw new Error(`Unknown unit: ${type}`)
  return def
}
