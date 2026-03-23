import type { BuildingDef, BuildingType } from '../types/game.ts'

export const BUILDING_DEFS: BuildingDef[] = [
  { type: 'hq', name: 'HQ', color: '#eab308', hp: 500, cost: 0, size: 2.5, buildTime: 0 },
  { type: 'barracks', name: 'Barracks', color: '#6366f1', hp: 300, cost: 200, size: 2.0, buildTime: 5 },
  { type: 'tower', name: 'Tower', color: '#ef4444', hp: 200, cost: 150, size: 1.5, buildTime: 4 },
  { type: 'mine', name: 'Mine', color: '#06b6d4', hp: 150, cost: 100, size: 1.5, buildTime: 3 },
]

export function getBuildingDef(type: BuildingType): BuildingDef {
  const def = BUILDING_DEFS.find(d => d.type === type)
  if (!def) throw new Error(`Unknown building: ${type}`)
  return def
}
