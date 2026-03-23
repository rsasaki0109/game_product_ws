import type {
  UnitInstance, BuildingInstance, IronNode,
  UnitType, BuildingType, Vec2,
} from '../types/game.ts'
import { distance2D } from './combat.ts'

export interface CommanderAction {
  type: 'train' | 'build' | 'sendWorkerGather' | 'sendRush'
  unitType?: UnitType
  buildingType?: BuildingType
  buildingUid?: number
  position?: Vec2
  unitUids?: number[]
  targetPos?: Vec2
  nodeId?: number
}

export function tickCommander(
  elapsed: number,
  enemyIron: number,
  units: UnitInstance[],
  buildings: BuildingInstance[],
  nodes: IronNode[],
  lastRushTime: number,
): CommanderAction[] {
  const actions: CommanderAction[] = []

  const enemyUnits = units.filter(u => u.owner === 'enemy')
  const enemyBuildings = buildings.filter(b => b.owner === 'enemy')
  const enemyWorkers = enemyUnits.filter(u => u.def.type === 'worker')
  const enemyCombat = enemyUnits.filter(u => u.def.type !== 'worker')
  const enemyHQ = enemyBuildings.find(b => b.def.type === 'hq')
  if (!enemyHQ) return actions

  const hasBarracks = enemyBuildings.some(b => b.def.type === 'barracks' && b.isBuilt)
  const barracksBuilding = enemyBuildings.find(b => b.def.type === 'barracks' && b.isBuilt)
  const factoryBuilding = enemyBuildings.find(b => b.def.type === 'factory' && b.isBuilt)
  const barracksExists = enemyBuildings.some(b => b.def.type === 'barracks')
  const factoryExists = enemyBuildings.some(b => b.def.type === 'factory')

  // Send idle workers to gather from nearest unrefined node
  for (const w of enemyWorkers) {
    if (w.state === 'idle' && w.assignedNodeId === null) {
      let nearestNode: IronNode | null = null
      let nearDist = Infinity
      for (const n of nodes) {
        if (n.remaining <= 0) continue
        const d = distance2D(w.position, n.position)
        if (d < nearDist) { nearestNode = n; nearDist = d }
      }
      if (nearestNode) {
        actions.push({
          type: 'sendWorkerGather',
          unitUids: [w.uid],
          nodeId: nearestNode.id,
        })
      }
    }
  }

  // Economy phase: train workers up to 5
  if (enemyWorkers.length < 5 && enemyIron >= 40) {
    const hqTraining = enemyHQ.trainingQueue.length
    if (hqTraining === 0) {
      actions.push({ type: 'train', unitType: 'worker', buildingUid: enemyHQ.uid })
    }
  }

  // Build refinery on nearest unrefined node
  if (enemyIron >= 180) {
    const unrefinedNodes = nodes.filter(n => !n.hasRefinery && n.remaining > 0)
    let nearestUnrefined: IronNode | null = null
    let nearDist = Infinity
    for (const n of unrefinedNodes) {
      const d = distance2D(enemyHQ.position, n.position)
      if (d < nearDist) { nearestUnrefined = n; nearDist = d }
    }
    if (nearestUnrefined) {
      actions.push({ type: 'build', buildingType: 'refinery', position: nearestUnrefined.position, nodeId: nearestUnrefined.id })
    }
  }

  // Military phase (30s+)
  if (elapsed >= 30) {
    // Build barracks
    if (!barracksExists && enemyIron >= 150) {
      const angle = Math.random() * Math.PI * 2
      const pos: Vec2 = [
        enemyHQ.position[0] + Math.cos(angle) * 6,
        enemyHQ.position[1] + Math.sin(angle) * 6,
      ]
      actions.push({ type: 'build', buildingType: 'barracks', position: pos })
    }

    // Build factory (need barracks first)
    if (hasBarracks && !factoryExists && enemyIron >= 300) {
      const angle = Math.random() * Math.PI * 2
      const pos: Vec2 = [
        enemyHQ.position[0] + Math.cos(angle) * 8,
        enemyHQ.position[1] + Math.sin(angle) * 8,
      ]
      actions.push({ type: 'build', buildingType: 'factory', position: pos })
    }

    // Train militia/ranger from barracks
    if (barracksBuilding && barracksBuilding.trainingQueue.length < 2 && enemyIron >= 100) {
      const type: UnitType = Math.random() < 0.5 ? 'militia' : 'ranger'
      actions.push({ type: 'train', unitType: type, buildingUid: barracksBuilding.uid })
    }

    // Train tank from factory
    if (factoryBuilding && factoryBuilding.trainingQueue.length < 2 && enemyIron >= 250) {
      actions.push({ type: 'train', unitType: 'tank', buildingUid: factoryBuilding.uid })
    }

    // Build tower near base
    const enemyTowers = enemyBuildings.filter(b => b.def.type === 'tower')
    if (enemyTowers.length < 2 && enemyIron >= 120) {
      const angle = Math.random() * Math.PI * 2
      const pos: Vec2 = [
        enemyHQ.position[0] + Math.cos(angle) * 5,
        enemyHQ.position[1] + Math.sin(angle) * 5,
      ]
      actions.push({ type: 'build', buildingType: 'tower', position: pos })
    }
  }

  // Rush timer: first at 80s, then every 50s
  const rushReady = elapsed >= 80 && (elapsed - lastRushTime >= 50)
  if (rushReady && enemyCombat.length >= 3) {
    const combatUids = enemyCombat.filter(u => u.state === 'idle' || u.state === 'moving').map(u => u.uid)
    if (combatUids.length >= 2) {
      actions.push({
        type: 'sendRush',
        unitUids: combatUids,
        targetPos: [15, 15],
      })
    }
  }

  return actions
}
