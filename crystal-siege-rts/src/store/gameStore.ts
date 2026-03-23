import { create } from 'zustand'
import type {
  GamePhase, Difficulty, Vec2, UnitInstance, BuildingInstance, CrystalNode,
  UnitType, BuildingType, UnitOwner,
} from '../types/game.ts'
import { getUnitDef } from '../data/units.ts'
import { getBuildingDef } from '../data/buildings.ts'
import { getWaveDef } from '../data/waves.ts'
import { generateCrystalNodes } from '../data/map.ts'
import { getNextUid, resetUids } from '../logic/ids.ts'
import { tickUnit } from '../logic/unitAI.ts'
import { getMineIncome } from '../logic/economy.ts'
import { spawnWaveUnits } from '../logic/waves.ts'
import { distance2D, calculateDamage } from '../logic/combat.ts'
import * as sfx from '../logic/sound.ts'

const MAX_WAVE = 10
const WAVE_INTERVAL = 30
const TOWER_RANGE = 10
const TOWER_DAMAGE = 20
const TOWER_COOLDOWN = 1.2

interface GameStats {
  unitsTrainedTotal: number
  buildingsBuilt: number
  resourcesGathered: number
  enemiesKilled: number
}

interface GameStore {
  phase: GamePhase
  crystals: number
  currentWave: number
  waveTimer: number
  waveInProgress: boolean
  waveAnnouncTimer: number
  units: UnitInstance[]
  buildings: BuildingInstance[]
  crystalNodes: CrystalNode[]
  selectedUnitUids: number[]
  selectedBuildingUid: number | null
  buildMode: BuildingType | null
  cameraCenter: Vec2
  cameraZoom: number
  enemiesKilledTotal: number
  dragRect: { x: number; y: number; w: number; h: number } | null
  moveMarker: { position: Vec2; timer: number } | null
  buildError: string | null
  buildErrorTimer: number
  elapsed: number
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
  return {
    uid: getNextUid(), def, owner,
    currentHp: def.hp, maxHp: def.hp,
    attack: def.attack, speed: def.speed,
    position, targetPos: null, targetUid: null,
    state: 'idle', attackTimer: 0, gatherTimer: 0,
    carryingCrystals: 0, assignedNodeId: null,
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
  crystals: 600,
  currentWave: 0,
  waveTimer: 15,
  waveInProgress: false,
  waveAnnouncTimer: 0,
  units: [],
  buildings: [],
  crystalNodes: [],
  selectedUnitUids: [],
  selectedBuildingUid: null,
  buildMode: null,
  cameraCenter: [30, 30],
  cameraZoom: 35,
  enemiesKilledTotal: 0,
  dragRect: null,
  moveMarker: null,
  buildError: null,
  buildErrorTimer: 0,
  elapsed: 0,
  paused: false,
  showTutorial: !localStorage.getItem('crystalSiegeTutorialDone'),
  tutorialStep: 0,
  stats: { unitsTrainedTotal: 0, buildingsBuilt: 0, resourcesGathered: 0, enemiesKilled: 0 },
  difficulty: 'normal' as Difficulty,

  setDifficulty: (d: Difficulty) => set({ difficulty: d }),

  startGame: () => {
    resetUids()
    const nodes = generateCrystalNodes()
    const hq = createBuilding('hq', 'player', [30, 30], true)
    const workers = [
      createUnit('worker', 'player', [28, 30]),
      createUnit('worker', 'player', [30, 28]),
      createUnit('worker', 'player', [32, 30]),
    ]
    const needsTutorial = !localStorage.getItem('crystalSiegeTutorialDone')
    set({
      phase: 'playing',
      crystals: 600,
      currentWave: 0,
      waveTimer: 12,
      waveInProgress: false,
      waveAnnouncTimer: 0,
      units: workers,
      buildings: [hq],
      crystalNodes: nodes,
      selectedUnitUids: [],
      selectedBuildingUid: null,
      buildMode: null,
      cameraCenter: [30, 30],
      cameraZoom: 35,
      enemiesKilledTotal: 0,
      dragRect: null,
      moveMarker: null,
      buildError: null,
      buildErrorTimer: 0,
      elapsed: 0,
      paused: needsTutorial,
      showTutorial: needsTutorial,
      tutorialStep: 0,
      stats: { unitsTrainedTotal: 0, buildingsBuilt: 0, resourcesGathered: 0, enemiesKilled: 0 },
    })
  },

  returnToTitle: () => set({ phase: 'title' }),

  tick: (delta: number) => {
    const s = get()
    if (s.phase !== 'playing' && s.phase !== 'wave_incoming') return
    if (s.paused) return

    // Wave announcement
    if (s.phase === 'wave_incoming') {
      const t = s.waveAnnouncTimer - delta
      if (t <= 0) {
        set({ phase: 'playing', waveAnnouncTimer: 0 })
      } else {
        set({ waveAnnouncTimer: t })
      }
      // Still tick game during announcement
    }

    let { crystals, waveTimer, waveInProgress, currentWave, enemiesKilledTotal } = s
    let elapsed = s.elapsed + delta
    const stats = { ...s.stats }
    const units = [...s.units]
    const buildings = [...s.buildings]
    const nodes = [...s.crystalNodes]

    // Mine income
    const mineInc = getMineIncome(buildings, delta)
    crystals += mineInc
    stats.resourcesGathered += mineInc

    // Passive crystal income: +3/sec even without mines
    crystals += 3 * delta

    // Wave timer
    if (!waveInProgress) {
      waveTimer -= delta
      if (waveTimer <= 0) {
        currentWave++
        if (currentWave <= MAX_WAVE) {
          const waveDef = getWaveDef(currentWave)
          const enemies = spawnWaveUnits(waveDef, currentWave)
          units.push(...enemies)
          waveInProgress = true
          sfx.waveIncoming()
          set({ phase: 'wave_incoming', waveAnnouncTimer: 2 })
        }
      }
    }

    // Unit AI tick
    const damageMap = new Map<number, number>()
    let crystalsGained = 0

    const updatedUnits: UnitInstance[] = []
    for (const unit of units) {
      const result = tickUnit(unit, units, buildings, nodes, delta)
      updatedUnits.push(result.unit)
      for (const dmg of result.damages) {
        damageMap.set(dmg.targetUid, (damageMap.get(dmg.targetUid) ?? 0) + dmg.amount)
      }
      crystalsGained += result.crystalsDelivered
    }
    if (crystalsGained > 0 && Math.random() < 0.3) sfx.crystalPickup()
    crystals += crystalsGained
    stats.resourcesGathered += crystalsGained

    // Apply damage to units
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
        enemiesKilledTotal++
        stats.enemiesKilled++
      }
    }

    // Apply damage to buildings
    const survivingBuildings: BuildingInstance[] = []
    for (const b of buildings) {
      const dmg = damageMap.get(b.uid)
      if (dmg) {
        b.currentHp = Math.max(0, b.currentHp - dmg)
      }
      if (b.currentHp > 0) survivingBuildings.push(b)
    }

    if (anyCombat) sfx.combat()

    // Building construction (auto-progress)
    for (const b of survivingBuildings) {
      if (!b.isBuilt) {
        b.buildProgress += delta / b.def.buildTime
        if (b.buildProgress >= 1) {
          b.isBuilt = true
          b.buildProgress = 1
          if (b.owner === 'player') sfx.buildComplete()
        }
      }
    }

    // Training queue
    for (const b of survivingBuildings) {
      if (b.trainingQueue.length > 0 && b.isBuilt) {
        const unitType = b.trainingQueue[0]
        const def = getUnitDef(unitType)
        b.trainProgress += delta / def.trainTime
        if (b.trainProgress >= 1) {
          const angle = Math.random() * Math.PI * 2
          const spawnPos: Vec2 = [
            b.position[0] + Math.cos(angle) * (b.def.size + 1),
            b.position[1] + Math.sin(angle) * (b.def.size + 1),
          ]
          survivingUnits.push(createUnit(unitType, 'player', spawnPos))
          stats.unitsTrainedTotal++
          sfx.unitTrained()
          b.trainingQueue.shift()
          b.trainProgress = 0
        }
      }
    }

    // Tower attacks
    for (const b of survivingBuildings) {
      if (b.def.type === 'tower' && b.isBuilt && b.owner === 'player') {
        b.attackTimer = Math.max(0, b.attackTimer - delta)
        if (b.attackTimer <= 0) {
          let nearestEnemy: UnitInstance | null = null
          let nearDist = Infinity
          for (const u of survivingUnits) {
            if (u.owner === 'enemy') {
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
            sfx.towerShot()
            if (nearestEnemy.currentHp <= 0) {
              enemiesKilledTotal++
              stats.enemiesKilled++
            }
          }
        }
      }
    }

    // Remove tower-killed units
    const finalUnits = survivingUnits.filter(u => u.currentHp > 0)

    // Deplete crystal nodes from worker gathering
    for (const u of finalUnits) {
      if (u.state === 'returning' && u.carryingCrystals > 0 && u.assignedNodeId !== null) {
        const node = nodes.find(n => n.id === u.assignedNodeId)
        if (node && node.remaining > 0) {
          node.remaining = Math.max(0, node.remaining - 10)
        }
      }
    }

    // Wave completion check
    if (waveInProgress) {
      const enemiesAlive = finalUnits.filter(u => u.owner === 'enemy')
      if (enemiesAlive.length === 0) {
        waveInProgress = false
        if (currentWave >= MAX_WAVE) {
          const prev = localStorage.getItem('crystalSiegeBestWave')
          if (!prev || currentWave > parseInt(prev)) {
            localStorage.setItem('crystalSiegeBestWave', String(currentWave))
          }
          const prevTime = localStorage.getItem('crystalSiegeBestTime')
          if (!prevTime || elapsed < parseFloat(prevTime)) {
            localStorage.setItem('crystalSiegeBestTime', String(elapsed))
          }
          set({
            phase: 'victory', units: finalUnits, buildings: survivingBuildings,
            crystalNodes: nodes, crystals, currentWave, enemiesKilledTotal,
            elapsed, stats,
          })
          return
        }
        waveTimer = WAVE_INTERVAL
      }
    }

    // Lose check: no player units and no buildings that can train
    const playerUnits = finalUnits.filter(u => u.owner === 'player')
    const canTrain = survivingBuildings.some(b =>
      b.owner === 'player' && b.isBuilt && (b.def.type === 'hq' || b.def.type === 'barracks')
    )
    if (playerUnits.length === 0 && !canTrain) {
      const prev = localStorage.getItem('crystalSiegeBestWave')
      if (!prev || currentWave > parseInt(prev)) {
        localStorage.setItem('crystalSiegeBestWave', String(currentWave))
      }
      set({
        phase: 'game_over', units: finalUnits, buildings: survivingBuildings,
        crystalNodes: nodes, crystals, currentWave, enemiesKilledTotal,
        elapsed, stats,
      })
      return
    }

    // Decay move marker
    let moveMarker = s.moveMarker
    if (moveMarker) {
      moveMarker = { ...moveMarker, timer: moveMarker.timer - delta }
      if (moveMarker.timer <= 0) moveMarker = null
    }

    // Decay build error timer
    let buildError = s.buildError
    let buildErrorTimer = s.buildErrorTimer
    if (buildErrorTimer > 0) {
      buildErrorTimer -= delta
      if (buildErrorTimer <= 0) {
        buildError = null
        buildErrorTimer = 0
      }
    }

    set({
      units: finalUnits,
      buildings: survivingBuildings,
      crystalNodes: nodes,
      crystals,
      waveTimer,
      waveInProgress,
      currentWave,
      enemiesKilledTotal,
      moveMarker,
      buildError,
      buildErrorTimer,
      elapsed,
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
    sfx.commandMove()
    set({ units: updated, moveMarker: { position: pos, timer: 1 } })
  },

  commandAttack: (targetUid) => {
    const s = get()
    const target = s.units.find(u => u.uid === targetUid)
    if (!target) return
    sfx.commandAttack()
    const updated = s.units.map(u => {
      if (!s.selectedUnitUids.includes(u.uid) || u.owner !== 'player') return u
      return { ...u, targetUid, targetPos: target.position, state: 'moving' as const, assignedNodeId: null }
    })
    set({ units: updated })
  },

  commandGather: (nodeId) => {
    const s = get()
    const node = s.crystalNodes.find(n => n.id === nodeId)
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
    if (s.crystals < def.cost) {
      set({ buildError: 'Not enough crystals!', buildErrorTimer: 2 })
      return
    }

    // Mine must be on a crystal node
    if (s.buildMode === 'mine') {
      const node = s.crystalNodes.find(n => distance2D(pos, n.position) < 2 && !n.hasMine)
      if (!node) {
        set({ buildError: 'Must be on crystal node!', buildErrorTimer: 2 })
        return
      }
      const mine = createBuilding('mine', 'player', node.position, false)
      mine.assignedNodeId = node.id
      const updatedNodes = s.crystalNodes.map(n => n.id === node.id ? { ...n, hasMine: true } : n)
      sfx.buildPlace()
      set({
        buildings: [...s.buildings, mine],
        crystalNodes: updatedNodes,
        crystals: s.crystals - def.cost,
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
      crystals: s.crystals - def.cost,
      buildMode: null,
      buildError: null,
      buildErrorTimer: 0,
      stats: { ...s.stats, buildingsBuilt: s.stats.buildingsBuilt + 1 },
    })
  },

  trainUnit: (buildingUid, unitType) => {
    const s = get()
    const def = getUnitDef(unitType)
    if (s.crystals < def.cost) return
    const updated = s.buildings.map(b => {
      if (b.uid !== buildingUid) return b
      return { ...b, trainingQueue: [...b.trainingQueue, unitType] }
    })
    set({ buildings: updated, crystals: s.crystals - def.cost })
  },

  panCamera: (dx, dz) => {
    const s = get()
    set({
      cameraCenter: [
        Math.max(0, Math.min(60, s.cameraCenter[0] + dx)),
        Math.max(0, Math.min(60, s.cameraCenter[1] + dz)),
      ],
    })
  },

  zoomCamera: (delta) => {
    const s = get()
    set({ cameraZoom: Math.max(15, Math.min(55, s.cameraZoom + delta)) })
  },

  setDragRect: (rect) => set({ dragRect: rect }),

  togglePause: () => {
    const s = get()
    if (s.phase !== 'playing' && s.phase !== 'wave_incoming') return
    if (s.showTutorial) return
    set({ paused: !s.paused })
  },

  nextTutorialStep: () => {
    const s = get()
    if (s.tutorialStep >= 4) {
      localStorage.setItem('crystalSiegeTutorialDone', '1')
      set({ showTutorial: false, tutorialStep: 0, paused: false })
    } else {
      set({ tutorialStep: s.tutorialStep + 1 })
    }
  },

  dismissTutorial: () => {
    localStorage.setItem('crystalSiegeTutorialDone', '1')
    set({ showTutorial: false, tutorialStep: 0, paused: false })
  },

  showTutorialOnTitle: () => {
    localStorage.removeItem('crystalSiegeTutorialDone')
    const s = get()
    if (s.phase === 'title') {
      s.startGame()
      // startGame already checks the tutorial flag, but we forced it
      set({ showTutorial: true, tutorialStep: 0, paused: true })
    }
  },
}))
