import type { UnitInstance, EnemyWaveDef, Vec2 } from '../types/game.ts'
import { getUnitDef } from '../data/units.ts'
import { getWaveStatScale } from '../data/waves.ts'
import { getNextUid } from './ids.ts'

export function spawnWaveUnits(waveDef: EnemyWaveDef, waveNumber: number): UnitInstance[] {
  const scale = getWaveStatScale(waveNumber)
  const units: UnitInstance[] = []

  for (const entry of waveDef.enemies) {
    const def = getUnitDef(entry.type)
    const perEdge = Math.ceil(entry.count / waveDef.spawnEdges.length)

    for (let edgeIdx = 0; edgeIdx < waveDef.spawnEdges.length; edgeIdx++) {
      const edge = waveDef.spawnEdges[edgeIdx]
      const count = Math.min(perEdge, entry.count - edgeIdx * perEdge)
      if (count <= 0) continue

      for (let i = 0; i < count; i++) {
        const pos = getEdgeSpawnPos(edge, i, count)
        units.push({
          uid: getNextUid(),
          def,
          owner: 'enemy',
          currentHp: Math.round(def.hp * scale),
          maxHp: Math.round(def.hp * scale),
          attack: Math.round(def.attack * scale),
          speed: def.speed,
          position: pos,
          targetPos: [30, 30], // Head to center
          targetUid: null,
          state: 'moving',
          attackTimer: 0,
          gatherTimer: 0,
          carryingCrystals: 0,
          assignedNodeId: null,
        })
      }
    }
  }

  return units
}

function getEdgeSpawnPos(edge: string, index: number, total: number): Vec2 {
  const spread = 20
  const offset = ((index + 0.5) / total - 0.5) * spread + 30
  switch (edge) {
    case 'north': return [offset, 0.5]
    case 'south': return [offset, 59.5]
    case 'east':  return [59.5, offset]
    case 'west':  return [0.5, offset]
    default:      return [offset, 0.5]
  }
}
