import type { UnitInstance, BuildingInstance, CrystalNode, Vec2 } from '../types/game.ts'
import { distance2D, moveToward, calculateDamage } from './combat.ts'

export interface DamageEvent {
  targetUid: number
  amount: number
}

export interface UnitTickResult {
  unit: UnitInstance
  damages: DamageEvent[]
  crystalsDelivered: number
}

export function tickUnit(
  unit: UnitInstance,
  allUnits: UnitInstance[],
  buildings: BuildingInstance[],
  nodes: CrystalNode[],
  delta: number,
): UnitTickResult {
  const u = { ...unit }
  const damages: DamageEvent[] = []
  let crystalsDelivered = 0

  // Tick attack cooldown
  if (u.attackTimer > 0) u.attackTimer = Math.max(0, u.attackTimer - delta)
  if (u.gatherTimer > 0) u.gatherTimer = Math.max(0, u.gatherTimer - delta)

  // Enemy AI: auto-acquire targets
  if (u.owner === 'enemy' && u.state === 'idle') {
    const playerBuildings = buildings.filter(b => b.owner === 'player' && b.isBuilt)
    const playerUnits = allUnits.filter(a => a.owner === 'player')
    // Attack nearest player unit first, then building
    let nearest: { uid: number; pos: Vec2; dist: number } | null = null
    for (const pu of playerUnits) {
      const d = distance2D(u.position, pu.position)
      if (!nearest || d < nearest.dist) nearest = { uid: pu.uid, pos: pu.position, dist: d }
    }
    if (!nearest) {
      for (const pb of playerBuildings) {
        const d = distance2D(u.position, pb.position)
        if (!nearest || d < nearest.dist) nearest = { uid: pb.uid, pos: pb.position, dist: d }
      }
    }
    if (nearest) {
      u.targetUid = nearest.uid
      u.targetPos = nearest.pos
      u.state = 'moving'
    }
  }

  // State machine
  switch (u.state) {
    case 'idle':
      break

    case 'moving': {
      if (!u.targetPos) { u.state = 'idle'; break }

      // Check if we have an attack target in range
      if (u.targetUid !== null) {
        const target = allUnits.find(a => a.uid === u.targetUid)
          ?? buildings.find(b => b.uid === u.targetUid)
        if (target) {
          const pos: Vec2 = 'position' in target ? target.position : [0, 0]
          const dist = distance2D(u.position, pos)
          if (dist <= u.def.attackRange) {
            u.state = 'attacking'
            break
          }
          u.targetPos = pos
        } else {
          u.targetUid = null
          u.state = 'idle'
          break
        }
      }

      const dist = distance2D(u.position, u.targetPos)
      if (dist < 0.5) {
        u.state = 'idle'
        u.targetPos = null
      } else {
        u.position = moveToward(u.position, u.targetPos, u.speed, delta)
      }
      break
    }

    case 'attacking': {
      const target = allUnits.find(a => a.uid === u.targetUid)
        ?? buildings.find(b => b.uid === u.targetUid)
      if (!target) {
        u.state = 'idle'
        u.targetUid = null
        break
      }
      const pos: Vec2 = target.position
      const dist = distance2D(u.position, pos)

      if (dist > u.def.attackRange + 0.5) {
        u.targetPos = pos
        u.state = 'moving'
        break
      }

      if (u.attackTimer <= 0) {
        damages.push({ targetUid: target.uid, amount: calculateDamage(u.attack) })
        u.attackTimer = u.def.attackCooldown
      }
      break
    }

    case 'gathering': {
      if (u.assignedNodeId === null) { u.state = 'idle'; break }
      const node = nodes.find(n => n.id === u.assignedNodeId)
      if (!node || node.remaining <= 0) { u.state = 'idle'; u.assignedNodeId = null; break }

      const dist = distance2D(u.position, node.position)
      if (dist > 1.5) {
        u.position = moveToward(u.position, node.position, u.speed, delta)
      } else {
        // At node - gather
        if (u.gatherTimer <= 0 && u.carryingCrystals < 15) {
          u.carryingCrystals = 15
          u.gatherTimer = 1.5
          u.state = 'returning'
        }
      }
      break
    }

    case 'returning': {
      // Find nearest HQ or mine
      const dropoffs = buildings.filter(b =>
        b.owner === 'player' && b.isBuilt && (b.def.type === 'hq' || b.def.type === 'mine')
      )
      if (dropoffs.length === 0) { u.state = 'idle'; break }

      let nearest = dropoffs[0]
      let nearDist = distance2D(u.position, nearest.position)
      for (const b of dropoffs) {
        const d = distance2D(u.position, b.position)
        if (d < nearDist) { nearest = b; nearDist = d }
      }

      if (nearDist > 1.5) {
        u.position = moveToward(u.position, nearest.position, u.speed, delta)
      } else {
        crystalsDelivered = u.carryingCrystals
        u.carryingCrystals = 0
        u.state = 'gathering'
      }
      break
    }
  }

  // Auto-retaliation: if idle and got attacked, fight back
  // (handled externally when applying damage)

  return { unit: u, damages, crystalsDelivered }
}
