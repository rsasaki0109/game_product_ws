import { create } from 'zustand'
import type {
  GamePhase, Difficulty, Vec2, UnitInstance, BuildingInstance, IronNode,
  UnitType, BuildingType, UnitOwner,
} from '../types/game.ts'
import { getUnitDef } from '../data/units.ts'
import { getBuildingDef } from '../data/buildings.ts'
import { generateIronNodes } from '../data/map.ts'
import { getNextUid, resetUids } from '../logic/ids.ts'
import { tickUnit } from '../logic/unitAI.ts'
import { getRefineryIncome } from '../logic/economy.ts'
import { distance2D, calculateDamage } from '../logic/combat.ts'
import { tickCommander } from '../logic/enemyCommander.ts'
import * as sfx from '../logic/sound.ts'

const TOWER_RANGE = 10
const TOWER_DAMAGE = 15
const TOWER_COOLDOWN = 1.5

interface GameStats {
  unitsTrainedTotal: number
  buildingsBuilt: number
  resourcesGathered: number
  enemyUnitsKilled: number
}

interface GameStore {
  phase: GamePhase
  iron: number
  enemyIron: number
  elapsed: number
  lastRushTime: number
  units: UnitInstance[]
  buildings: BuildingInstance[]
  ironNodes: IronNode[]
  selectedUnitUids: number[]
  selectedBuildingUid: number | null
  buildMode: BuildingType | null
  cameraCenter: Vec2
  cameraZoom: number
  dragRect: { x: number; y: number; w: number; h: number } | null
  moveMarker: { position: Vec2; timer: number } | null
  buildError: string | null
  buildErrorTimer: number
  underAttack: boolean
  paused: boolean
  showTutorial: boolean
  tutorialStep: number
  stats: GameStats
  difficulty: Difficulty

  startGame: () => void
  returnToTitle: () => void
  setDifficulty: (d: Difficulty) => void
  tick: (delta: number) => void
  selectUnits: (uids: number[]) => void
  selectBuilding: (uid: number | null) => void
  clearSelection: () => void
  commandMove: (pos: Vec2) => void
  commandAttack: (uid: number) => void
  commandGather: (nodeId: number) => void
  enterBuildMode: (type: BuildingType) => void
  placeBuild: (pos: Vec2) => void
  cancelBuildMode: () => void
  trainUnit: (buildingUid: number, unitType: UnitType) => void
  panCamera: (dx: number, dz: number) => void
  zoomCamera: (delta: number) => void
  setDragRect: (rect: { x: number; y: number; w: number; h: number } | null) => void
  togglePause: () => void
  nextTutorialStep: () => void
  dismissTutorial: () => void
  showTutorialOnTitle: () => void
}

function createUnit(type: UnitType, owner: UnitOwner, position: Vec2): UnitInstance {
  const def = getUnitDef(type)
  // Player units get +10% HP training bonus
  const hpBonus = owner === 'player' ? Math.round(def.hp * 1.1) : def.hp
  return {
    uid: getNextUid(), def, owner,
    currentHp: hpBonus, maxHp: hpBonus,
    attack: def.attack, speed: def.speed,
    position, targetPos: null, targetUid: null,
    state: 'idle', attackTimer: 0, gatherTimer: 0,
    carryingIron: 0, assignedNodeId: null,
  }
}

function createBuilding(type: BuildingType, owner: UnitOwner, position: Vec2, built: boolean): BuildingInstance {
  const def = getBuildingDef(type)
  return {
    uid: getNextUid(), def, owner,
    currentHp: def.hp, maxHp: def.hp,
    position, isBuilt: built,
    buildProgress: built ? 1 : 0,
    trainingQueue: [], trainProgress: 0,
    attackTimer: 0, assignedNodeId: null,
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'title',
  iron: 300,
  enemyIron: 200,
  elapsed: 0,
  lastRushTime: 0,
  units: [],
  buildings: [],
  ironNodes: [],
  selectedUnitUids: [],
  selectedBuildingUid: null,
  buildMode: null,
  cameraCenter: [15, 15],
  cameraZoom: 35,
  dragRect: null,
  moveMarker: null,
  buildError: null,
  buildErrorTimer: 0,
  underAttack: false,
  paused: false,
  showTutorial: !localStorage.getItem('ironConquestTutorialDone'),
  tutorialStep: 0,
  stats: { unitsTrainedTotal: 0, buildingsBuilt: 0, resourcesGathered: 0, enemyUnitsKilled: 0 },
  difficulty: 'normal' as Difficulty,

  setDifficulty: (d: Difficulty) => set({ difficulty: d }),

  startGame: () => {
    resetUids()
    const nodes = generateIronNodes()
    const playerHQ = createBuilding('hq', 'player', [15, 15], true)
    const enemyHQ = createBuilding('hq', 'enemy', [65, 65], true)
    const playerWorkers = [
      createUnit('worker', 'player', [13, 15]),
      createUnit('worker', 'player', [15, 13]),
      createUnit('worker', 'player', [17, 15]),
    ]
    const enemyWorkers = [
      createUnit('worker', 'enemy', [63, 65]),
      createUnit('worker', 'enemy', [65, 63]),
      createUnit('worker', 'enemy', [67, 65]),
    ]
    const needsTutorial = !localStorage.getItem('ironConquestTutorialDone')
    set({
      phase: 'playing',
      iron: 300,
      enemyIron: 200,
      elapsed: 0,
      lastRushTime: 0,
      units: [...playerWorkers, ...enemyWorkers],
      buildings: [playerHQ, enemyHQ],
      ironNodes: nodes,
      selectedUnitUids: [],
      selectedBuildingUid: null,
      buildMode: null,
      cameraCenter: [15, 15],
      cameraZoom: 35,
      dragRect: null,
      moveMarker: null,
      buildError: null,
      buildErrorTimer: 0,
      underAttack: false,
      paused: needsTutorial,
      showTutorial: needsTutorial,
      tutorialStep: 0,
      stats: { unitsTrainedTotal: 0, buildingsBuilt: 0, resourcesGathered: 0, enemyUnitsKilled: 0 },
    })
  },

  returnToTitle: () => set({ phase: 'title' }),

  tick: (delta: number) => {
    const s = get()
    if (s.phase !== 'playing') return
    if (s.paused) return

    const cappedDelta = Math.min(delta, 0.1)
    let { iron, enemyIron, elapsed, lastRushTime } = s
    elapsed += cappedDelta
    const stats = { ...s.stats }
    const units = [...s.units]
    const buildings = [...s.buildings]
    const nodes = [...s.ironNodes]

    // 1. Player refinery income
    const playerRefInc = getRefineryIncome(buildings, nodes, 'player', cappedDelta)
    iron += playerRefInc
    stats.resourcesGathered += playerRefInc

    // 2. Enemy refinery income
    enemyIron += getRefineryIncome(buildings, nodes, 'enemy', cappedDelta)

    // 3. Enemy AI commander
    const trainSpeedMult = Math.pow(0.9, elapsed / 180)
    const actions = tickCommander(elapsed, enemyIron, units, buildings, nodes, lastRushTime)
    for (const action of actions) {
      switch (action.type) {
        case 'train': {
          if (!action.unitType || action.buildingUid === undefined) break
          const def = getUnitDef(action.unitType)
          if (enemyIron < def.cost) break
          const bld = buildings.find(b => b.uid === action.buildingUid)
          if (!bld || !bld.isBuilt) break
          bld.trainingQueue.push(action.unitType)
          enemyIron -= def.cost
          break
        }
        case 'build': {
          if (!action.buildingType || !action.position) break
          const bDef = getBuildingDef(action.buildingType)
          if (enemyIron < bDef.cost) break
          if (action.buildingType === 'refinery') {
            if (action.nodeId === undefined) break
            const node = nodes.find(n => n.id === action.nodeId)
            if (!node || node.hasRefinery) break
            const refinery = createBuilding('refinery', 'enemy', node.position, false)
            refinery.assignedNodeId = node.id
            node.hasRefinery = true
            node.refineryOwner = 'enemy'
            buildings.push(refinery)
          } else {
            const newB = createBuilding(action.buildingType, 'enemy', action.position, false)
            buildings.push(newB)
          }
          enemyIron -= bDef.cost
          break
        }
        case 'sendWorkerGather': {
          if (!action.unitUids || action.nodeId === undefined) break
          for (const uid of action.unitUids) {
            const w = units.find(u => u.uid === uid)
            if (!w) continue
            const node = nodes.find(n => n.id === action.nodeId)
            if (!node) continue
            w.assignedNodeId = action.nodeId
            w.state = 'gathering'
            w.targetPos = node.position
            w.targetUid = null
          }
          break
        }
        case 'sendRush': {
          if (!action.unitUids || !action.targetPos) break
          lastRushTime = elapsed
          for (const uid of action.unitUids) {
            const u = units.find(uu => uu.uid === uid)
            if (!u) continue
            // Attack any player entity encountered - target player HQ
            const playerHQ = buildings.find(b => b.owner === 'player' && b.def.type === 'hq')
            if (playerHQ) {
              u.targetUid = playerHQ.uid
              u.targetPos = playerHQ.position
              u.state = 'moving'
            } else {
              u.targetPos = action.targetPos
              u.targetUid = null
              u.state = 'moving'
            }
          }
          break
        }
      }
    }

    // 4. Unit AI tick
    const damageMap = new Map<number, number>()
    let ironGained = 0
    let enemyIronGained = 0

    const updatedUnits: UnitInstance[] = []
    for (const unit of units) {
      const result = tickUnit(unit, units, buildings, nodes, cappedDelta)
      updatedUnits.push(result.unit)
      for (const dmg of result.damages) {
        damageMap.set(dmg.targetUid, (damageMap.get(dmg.targetUid) ?? 0) + dmg.amount)
      }
      if (result.unit.owner === 'player') {
        ironGained += result.ironDelivered
      } else {
        enemyIronGained += result.ironDelivered
      }
    }
    iron += ironGained
    stats.resourcesGathered += ironGained
    enemyIron += enemyIronGained

    // 5. Apply damage to units
    const survivingUnits: UnitInstance[] = []
    let anyCombat = false
    for (const u of updatedUnits) {
      const dmg = damageMap.get(u.uid)
      if (dmg) {
        u.currentHp = Math.max(0, u.currentHp - dmg)
        damageMap.delete(u.uid)
        anyCombat = true
        // Auto-retaliate
        if (u.state === 'idle' || u.state === 'gathering' || u.state === 'returning') {
          const attacker = updatedUnits.find(a =>
            a.owner !== u.owner && a.state === 'attacking' && a.targetUid === u.uid
          )
          if (attacker && u.def.type !== 'worker') {
            u.targetUid = attacker.uid
            u.state = 'moving'
            u.targetPos = attacker.position
          }
        }
      }
      if (u.currentHp > 0) {
        survivingUnits.push(u)
      } else if (u.owner === 'enemy') {
        stats.enemyUnitsKilled++
      }
    }

    // Apply damage to buildings
    const survivingBuildings: BuildingInstance[] = []
    for (const b of buildings) {
      const dmg = damageMap.get(b.uid)
      if (dmg) {
        b.currentHp = Math.max(0, b.currentHp - dmg)
      }
      if (b.currentHp > 0) {
        survivingBuildings.push(b)
      }
    }

    if (anyCombat) sfx.combat()

    // 6. Building construction
    for (const b of survivingBuildings) {
      if (!b.isBuilt) {
        b.buildProgress += cappedDelta / b.def.buildTime
        if (b.buildProgress >= 1) {
          b.isBuilt = true
          b.buildProgress = 1
          if (b.owner === 'player') sfx.buildComplete()
        }
      }
    }

    // Training queue (both players)
    for (const b of survivingBuildings) {
      if (b.trainingQueue.length > 0 && b.isBuilt) {
        const unitType = b.trainingQueue[0]
        const def = getUnitDef(unitType)
        const speedMult = b.owner === 'enemy' ? trainSpeedMult : 1
        const effectiveTrainTime = def.trainTime * speedMult
        b.trainProgress += cappedDelta / effectiveTrainTime
        if (b.trainProgress >= 1) {
          const angle = Math.random() * Math.PI * 2
          const spawnPos: Vec2 = [
            b.position[0] + Math.cos(angle) * (b.def.size + 1),
            b.position[1] + Math.sin(angle) * (b.def.size + 1),
          ]
          survivingUnits.push(createUnit(unitType, b.owner, spawnPos))
          if (b.owner === 'player') {
            stats.unitsTrainedTotal++
            sfx.unitTrained()
          }
          b.trainingQueue.shift()
          b.trainProgress = 0
        }
      }
    }

    // 7. Tower attacks (both players)
    for (const b of survivingBuildings) {
      if (b.def.type === 'tower' && b.isBuilt) {
        b.attackTimer = Math.max(0, b.attackTimer - cappedDelta)
        if (b.attackTimer <= 0) {
          let nearestEnemy: UnitInstance | null = null
          let nearDist = Infinity
          for (const u of survivingUnits) {
            if (u.owner !== b.owner) {
              const d = distance2D(b.position, u.position)
              if (d < TOWER_RANGE && d < nearDist) {
                nearestEnemy = u
                nearDist = d
              }
            }
          }
          if (nearestEnemy) {
            nearestEnemy.currentHp = Math.max(0, nearestEnemy.currentHp - calculateDamage(TOWER_DAMAGE))
            b.attackTimer = TOWER_COOLDOWN
            if (b.owner === 'player') sfx.towerShot()
          }
        }
      }
    }

    // Remove tower-killed units
    const finalUnits = survivingUnits.filter(u => u.currentHp > 0)

    // Deplete iron nodes from worker gathering
    for (const u of finalUnits) {
      if (u.state === 'returning' && u.carryingIron > 0 && u.assignedNodeId !== null) {
        const node = nodes.find(n => n.id === u.assignedNodeId)
        if (node && node.remaining > 0) {
          node.remaining = Math.max(0, node.remaining - 10)
        }
      }
    }

    // Deplete iron nodes from refineries
    for (const b of survivingBuildings) {
      if (b.def.type === 'refinery' && b.isBuilt && b.assignedNodeId !== null) {
        const node = nodes.find(n => n.id === b.assignedNodeId)
        if (node && node.remaining > 0) {
          node.remaining = Math.max(0, node.remaining - 3 * cappedDelta)
        }
      }
    }

    // 8. Win/lose check
    const playerHQAlive = survivingBuildings.some(b => b.owner === 'player' && b.def.type === 'hq')
    const enemyHQAlive = survivingBuildings.some(b => b.owner === 'enemy' && b.def.type === 'hq')

    if (!enemyHQAlive) {
      sfx.victory()
      const prevBest = localStorage.getItem('ironConquestBestTime')
      if (!prevBest || elapsed < parseFloat(prevBest)) {
        localStorage.setItem('ironConquestBestTime', String(elapsed))
      }
      set({
        phase: 'victory', units: finalUnits, buildings: survivingBuildings,
        ironNodes: nodes, iron, enemyIron, elapsed, lastRushTime, stats,
      })
      return
    }

    if (!playerHQAlive) {
      sfx.defeat()
      set({
        phase: 'defeat', units: finalUnits, buildings: survivingBuildings,
        ironNodes: nodes, iron, enemyIron, elapsed, lastRushTime, stats,
      })
      return
    }

    // Decay move marker
    let moveMarker = s.moveMarker
    if (moveMarker) {
      moveMarker = { ...moveMarker, timer: moveMarker.timer - cappedDelta }
      if (moveMarker.timer <= 0) moveMarker = null
    }

    // Decay build error timer
    let buildError = s.buildError
    let buildErrorTimer = s.buildErrorTimer
    if (buildErrorTimer > 0) {
      buildErrorTimer -= cappedDelta
      if (buildErrorTimer <= 0) {
        buildError = null
        buildErrorTimer = 0
      }
    }

    // Under attack check: enemy units within 15 of player HQ
    const pHQ = survivingBuildings.find(b => b.owner === 'player' && b.def.type === 'hq')
    let underAttack = false
    if (pHQ) {
      underAttack = finalUnits.some(u => u.owner === 'enemy' && distance2D(u.position, pHQ.position) < 15)
    }
    if (underAttack && !s.underAttack) sfx.underAttack()

    set({
      units: finalUnits,
      buildings: survivingBuildings,
      ironNodes: nodes,
      iron,
      enemyIron,
      elapsed,
      lastRushTime,
      moveMarker,
      buildError,
      buildErrorTimer,
      underAttack,
      stats,
    })
  },

  selectUnits: (uids) => { if (uids.length > 0) sfx.selectUnit(); set({ selectedUnitUids: uids, selectedBuildingUid: null }) },
  selectBuilding: (uid) => set({ selectedBuildingUid: uid, selectedUnitUids: [] }),
  clearSelection: () => set({ selectedUnitUids: [], selectedBuildingUid: null }),

  commandMove: (pos) => {
    const s = get()
    const selected = s.units.filter(u => s.selectedUnitUids.includes(u.uid) && u.owner === 'player')
    if (selected.length === 0) return
    const updated = s.units.map(u => {
      if (!s.selectedUnitUids.includes(u.uid)) return u
      const idx = selected.indexOf(u)
      const offsetAngle = (idx / selected.length) * Math.PI * 2
      const offsetR = selected.length > 1 ? 1.5 : 0
      const target: Vec2 = [
        pos[0] + Math.cos(offsetAngle) * offsetR,
        pos[1] + Math.sin(offsetAngle) * offsetR,
      ]
      return { ...u, targetPos: target, targetUid: null, state: 'moving' as const, assignedNodeId: null }
    })
    sfx.commandMoveSound()
    set({ units: updated, moveMarker: { position: pos, timer: 1 } })
  },

  commandAttack: (targetUid) => {
    const s = get()
    const target = s.units.find(u => u.uid === targetUid)
      ?? s.buildings.find(b => b.uid === targetUid)
    if (!target) return
    sfx.commandAttackSound()
    const updated = s.units.map(u => {
      if (!s.selectedUnitUids.includes(u.uid) || u.owner !== 'player') return u
      return { ...u, targetUid, targetPos: target.position, state: 'moving' as const, assignedNodeId: null }
    })
    set({ units: updated })
  },

  commandGather: (nodeId) => {
    const s = get()
    const node = s.ironNodes.find(n => n.id === nodeId)
    if (!node) return
    const updated = s.units.map(u => {
      if (!s.selectedUnitUids.includes(u.uid) || u.owner !== 'player') return u
      if (u.def.type !== 'worker') return u
      return { ...u, assignedNodeId: nodeId, state: 'gathering' as const, targetPos: node.position, targetUid: null }
    })
    set({ units: updated })
  },

  enterBuildMode: (type) => set({ buildMode: type }),
  cancelBuildMode: () => set({ buildMode: null }),

  placeBuild: (pos) => {
    const s = get()
    if (!s.buildMode) return
    const def = getBuildingDef(s.buildMode)
    if (s.iron < def.cost) {
      set({ buildError: 'Not enough iron!', buildErrorTimer: 2 })
      return
    }

    // Refinery must be on an iron node
    if (s.buildMode === 'refinery') {
      const node = s.ironNodes.find(n => distance2D(pos, n.position) < 2 && !n.hasRefinery)
      if (!node) {
        set({ buildError: 'Must be on iron node!', buildErrorTimer: 2 })
        return
      }
      const refinery = createBuilding('refinery', 'player', node.position, false)
      refinery.assignedNodeId = node.id
      const updatedNodes = s.ironNodes.map(n =>
        n.id === node.id ? { ...n, hasRefinery: true, refineryOwner: 'player' as const } : n
      )
      sfx.buildPlace()
      set({
        buildings: [...s.buildings, refinery],
        ironNodes: updatedNodes,
        iron: s.iron - def.cost,
        buildMode: null,
        buildError: null,
        buildErrorTimer: 0,
        stats: { ...s.stats, buildingsBuilt: s.stats.buildingsBuilt + 1 },
      })
      return
    }

    // Check distance from other buildings
    const tooClose = s.buildings.some(b => distance2D(pos, b.position) < b.def.size + def.size)
    if (tooClose) {
      set({ buildError: 'Too close!', buildErrorTimer: 2 })
      return
    }

    const building = createBuilding(s.buildMode, 'player', pos, false)
    sfx.buildPlace()
    set({
      buildings: [...s.buildings, building],
      iron: s.iron - def.cost,
      buildMode: null,
      buildError: null,
      buildErrorTimer: 0,
      stats: { ...s.stats, buildingsBuilt: s.stats.buildingsBuilt + 1 },
    })
  },

  trainUnit: (buildingUid, unitType) => {
    const s = get()
    const def = getUnitDef(unitType)
    if (s.iron < def.cost) return
    const bld = s.buildings.find(b => b.uid === buildingUid)
    if (!bld || !bld.isBuilt || bld.owner !== 'player') return
    const updated = s.buildings.map(b => {
      if (b.uid !== buildingUid) return b
      return { ...b, trainingQueue: [...b.trainingQueue, unitType] }
    })
    set({ buildings: updated, iron: s.iron - def.cost })
  },

  panCamera: (dx, dz) => {
    const s = get()
    set({
      cameraCenter: [
        Math.max(0, Math.min(80, s.cameraCenter[0] + dx)),
        Math.max(0, Math.min(80, s.cameraCenter[1] + dz)),
      ],
    })
  },

  zoomCamera: (delta) => {
    const s = get()
    set({ cameraZoom: Math.max(15, Math.min(60, s.cameraZoom + delta)) })
  },

  setDragRect: (rect) => set({ dragRect: rect }),

  togglePause: () => {
    const s = get()
    if (s.phase !== 'playing') return
    if (s.showTutorial) return
    set({ paused: !s.paused })
  },

  nextTutorialStep: () => {
    const s = get()
    if (s.tutorialStep >= 4) {
      localStorage.setItem('ironConquestTutorialDone', '1')
      set({ showTutorial: false, tutorialStep: 0, paused: false })
    } else {
      set({ tutorialStep: s.tutorialStep + 1 })
    }
  },

  dismissTutorial: () => {
    localStorage.setItem('ironConquestTutorialDone', '1')
    set({ showTutorial: false, tutorialStep: 0, paused: false })
  },

  showTutorialOnTitle: () => {
    localStorage.removeItem('ironConquestTutorialDone')
    const s = get()
    if (s.phase === 'title') {
      s.startGame()
      set({ showTutorial: true, tutorialStep: 0, paused: true })
    }
  },
}))
