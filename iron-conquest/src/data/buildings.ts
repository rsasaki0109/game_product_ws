import type { BuildingDef, BuildingType } from '../types/game.ts'

export const BUILDING_DEFS: BuildingDef[] = [
  { type: 'hq', name: 'HQ', color: '#eab308', hp: 800, cost: 0, size: 3.0, buildTime: 0 },
  { type: 'barracks', name: 'Barracks', color: '#6366f1', hp: 400, cost: 120, size: 2.0, buildTime: 5 },
  { type: 'factory', name: 'Factory', color: '#8b5cf6', hp: 500, cost: 300, size: 2.5, buildTime: 7 },
  { type: 'tower', name: 'Tower', color: '#ef4444', hp: 250, cost: 120, size: 1.5, buildTime: 4 },
  { type: 'refinery', name: 'Refinery', color: '#06b6d4', hp: 200, cost: 180, size: 1.5, buildTime: 3 },
]

export function getBuildingDef(type: BuildingType): BuildingDef {
  const def = BUILDING_DEFS.find(d => d.type === type)
  if (!def) throw new Error(`Unknown building: ${type}`)
  return def
}
