import { create } from 'zustand'
import type { GamePhase, Difficulty, EnemyInstance, LootDrop, ItemDef } from '../types/game.ts'
import { calculateDamage, distance2D } from '../logic/combat.ts'
import { updateEnemyAI } from '../logic/enemyAI.ts'
import { rollLoot } from '../logic/loot.ts'
import { getWavesForFloor, spawnEnemyInstance, resetUidCounter } from '../logic/waves.ts'
import * as sfx from '../logic/sound.ts'

const MAX_FLOOR = 10
const INITIAL_HP = 100
const INITIAL_ATTACK = 7
const INITIAL_SPEED = 6
const ATTACK_COOLDOWN = 0.3
const DODGE_COOLDOWN = 0.8
const INVULN_DURATION = 0.5
const ATTACK_RANGE = 2.5
const STAGGER_DURATION = 0.35

const LS_HIGH_SCORE_KEY = 'hack-and-slash-highscore'
const LS_TUTORIAL_KEY = 'hack-and-slash-tutorial-done'

function loadHighScore(): number {
  try {
    const v = localStorage.getItem(LS_HIGH_SCORE_KEY)
    return v ? parseInt(v, 10) || 0 : 0
  } catch { return 0 }
}

function saveHighScore(score: number) {
  try { localStorage.setItem(LS_HIGH_SCORE_KEY, String(score)) } catch {}
}

function loadTutorialDone(): boolean {
  try { return localStorage.getItem(LS_TUTORIAL_KEY) === '1' } catch { return false }
}

function saveTutorialDone() {
  try { localStorage.setItem(LS_TUTORIAL_KEY, '1') } catch {}
}

interface PlayerState {
  maxHp: number
  currentHp: number
  attack: number
  speed: number
  position: [number, number, number]
  isAttacking: boolean
  attackTimer: number
  isDodging: boolean
  dodgeTimer: number
  invulnTimer: number
  facing: number
}

interface DamageNumber {
  x: number
  z: number
  value: number
  timer: number
}

interface DeathEffect {
  x: number
  z: number
  timer: number
}

interface GameStore {
  phase: GamePhase
  floor: number
  waveIndex: number
  waveDefs: ReturnType<typeof getWavesForFloor>
  spawnQueue: { enemyId: string; count: number }[]
  spawnTimer: number
  player: PlayerState
  enemies: EnemyInstance[]
  lootDrops: LootDrop[]
  collectedItems: ItemDef[]
  enemiesKilled: number
  nextLootId: number
  floorClearTimer: number
  shakeTimer: number
  damageNumbers: DamageNumber[]
  highScore: number
  showTutorial: boolean
  tutorialStep: number
  paused: boolean
  bestCombo: number
  currentCombo: number
  timeSurvived: number
  lastKillTime: number
  difficulty: Difficulty
  gameOverTransition: number
  deathEffects: DeathEffect[]

  startGame: () => void
  returnToTitle: () => void
  setDifficulty: (d: Difficulty) => void
  updatePlayer: (partial: Partial<PlayerState>) => void
  playerAttack: () => void
  playerDodge: (dirX: number, dirZ: number) => void
  tick: (delta: number) => void
  togglePause: () => void
  advanceTutorial: () => void
  showTutorialAgain: () => void
}

function makeInitialPlayer(): PlayerState {
  return {
    maxHp: INITIAL_HP,
    currentHp: INITIAL_HP,
    attack: INITIAL_ATTACK,
    speed: INITIAL_SPEED,
    position: [0, 0, 0],
    isAttacking: false,
    attackTimer: 0,
    isDodging: false,
    dodgeTimer: 0,
    invulnTimer: 0,
    facing: 0,
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'title',
  floor: 1,
  waveIndex: 0,
  waveDefs: [],
  spawnQueue: [],
  spawnTimer: 0,
  player: makeInitialPlayer(),
  enemies: [],
  lootDrops: [],
  collectedItems: [],
  enemiesKilled: 0,
  nextLootId: 1,
  floorClearTimer: 0,
  shakeTimer: 0,
  damageNumbers: [],
  highScore: loadHighScore(),
  showTutorial: !loadTutorialDone(),
  tutorialStep: 0,
  paused: false,
  bestCombo: 0,
  currentCombo: 0,
  timeSurvived: 0,
  lastKillTime: 0,
  difficulty: 'normal' as Difficulty,
  gameOverTransition: 0,
  deathEffects: [],

  setDifficulty: (d: Difficulty) => set({ difficulty: d }),

  startGame: () => {
    resetUidCounter()
    const waves = getWavesForFloor(1)
    const s = get()
    set({
      phase: 'playing',
      floor: 1,
      waveIndex: 0,
      waveDefs: waves,
      spawnQueue: waves[0] ? [...waves[0]] : [],
      spawnTimer: 0,
      player: makeInitialPlayer(),
      enemies: [],
      lootDrops: [],
      collectedItems: [],
      enemiesKilled: 0,
      nextLootId: 1,
      floorClearTimer: 0,
      shakeTimer: 0,
      damageNumbers: [],
      paused: false,
      bestCombo: 0,
      currentCombo: 0,
      timeSurvived: 0,
      lastKillTime: 0,
      showTutorial: s.showTutorial,
      tutorialStep: s.showTutorial ? 0 : -1,
      gameOverTransition: 0,
      deathEffects: [],
    })
  },

  returnToTitle: () => {
    set({ phase: 'title', paused: false })
  },

  togglePause: () => {
    const s = get()
    if (s.phase !== 'playing' && s.phase !== 'floor_clear') return
    if (s.showTutorial && s.tutorialStep >= 0) return
    set({ paused: !s.paused })
  },

  advanceTutorial: () => {
    const s = get()
    const maxStep = 3 // 0-3 = 4 steps
    if (s.tutorialStep < maxStep) {
      set({ tutorialStep: s.tutorialStep + 1 })
    } else {
      set({ showTutorial: false, tutorialStep: -1 })
      saveTutorialDone()
    }
  },

  showTutorialAgain: () => {
    set({ showTutorial: true, tutorialStep: 0 })
  },

  updatePlayer: (partial) => {
    set(s => ({ player: { ...s.player, ...partial } }))
  },

  playerAttack: () => {
    const s = get()
    if (s.player.attackTimer > 0 || s.paused) return

    const pPos = s.player.position
    const facing = s.player.facing
    const attackPoint: [number, number, number] = [
      pPos[0] + Math.sin(facing) * 1.5,
      0,
      pPos[2] + Math.cos(facing) * 1.5,
    ]

    sfx.swordSwing()

    const hitEnemies: number[] = []
    for (const enemy of s.enemies) {
      if (distance2D(attackPoint, enemy.position) < ATTACK_RANGE) {
        hitEnemies.push(enemy.uid)
      }
    }

    if (hitEnemies.length > 0) sfx.swordHit()

    const dmg = calculateDamage(s.player.attack)
    const newEnemies: EnemyInstance[] = []
    const killed: EnemyInstance[] = []

    for (const enemy of s.enemies) {
      if (hitEnemies.includes(enemy.uid)) {
        const newHp = enemy.currentHp - dmg
        if (newHp <= 0) {
          killed.push(enemy)
          sfx.enemyDeath()
        } else {
          newEnemies.push({
            ...enemy,
            currentHp: newHp,
            hitTimer: STAGGER_DURATION,
            state: 'stagger',
          })
        }
      } else {
        newEnemies.push(enemy)
      }
    }

    let { nextLootId } = s
    const newDrops = [...s.lootDrops]
    for (const k of killed) {
      const item = rollLoot(s.floor)
      if (item) {
        newDrops.push({
          id: nextLootId++,
          item,
          position: [...k.position] as [number, number, number],
          ttl: 15,
        })
      }
    }

    // Damage numbers for all hit enemies
    const newDamageNumbers = [...s.damageNumbers]
    for (const enemy of s.enemies) {
      if (hitEnemies.includes(enemy.uid)) {
        newDamageNumbers.push({
          x: enemy.position[0],
          z: enemy.position[2],
          value: dmg,
          timer: 1.0,
        })
      }
    }

    // Track combo
    const newCombo = killed.length > 0 ? s.currentCombo + killed.length : (hitEnemies.length > 0 ? s.currentCombo + hitEnemies.length : 0)
    const newBestCombo = Math.max(s.bestCombo, newCombo)

    // Death effects for killed enemies
    const newDeathEffects = [...s.deathEffects]
    for (const k of killed) {
      newDeathEffects.push({ x: k.position[0], z: k.position[2], timer: 0.5 })
    }

    set({
      enemies: newEnemies,
      lootDrops: newDrops,
      enemiesKilled: s.enemiesKilled + killed.length,
      nextLootId,
      shakeTimer: hitEnemies.length > 0 ? 0.15 : s.shakeTimer,
      damageNumbers: newDamageNumbers,
      currentCombo: newCombo,
      bestCombo: newBestCombo,
      lastKillTime: killed.length > 0 ? s.timeSurvived : s.lastKillTime,
      deathEffects: newDeathEffects,
      player: {
        ...s.player,
        isAttacking: true,
        attackTimer: ATTACK_COOLDOWN,
      },
    })
  },

  playerDodge: (dirX, dirZ) => {
    const s = get()
    if (s.player.dodgeTimer > 0 || s.player.isDodging || s.paused) return

    sfx.playerDodge()

    const len = Math.sqrt(dirX * dirX + dirZ * dirZ)
    const dx = len > 0.01 ? dirX / len : Math.sin(s.player.facing)
    const dz = len > 0.01 ? dirZ / len : Math.cos(s.player.facing)

    const dashDist = 4
    const newPos: [number, number, number] = [
      clamp(s.player.position[0] + dx * dashDist, -14, 14),
      0,
      clamp(s.player.position[2] + dz * dashDist, -14, 14),
    ]

    set({
      player: {
        ...s.player,
        position: newPos,
        isDodging: true,
        dodgeTimer: DODGE_COOLDOWN,
        invulnTimer: INVULN_DURATION,
      },
    })

    setTimeout(() => {
      set(s2 => ({
        player: { ...s2.player, isDodging: false },
      }))
    }, 150)
  },

  tick: (delta) => {
    const s = get()
    if (s.paused) return
    if (s.showTutorial && s.tutorialStep >= 0 && s.phase === 'playing') return

    // Game over transition: slow-mo then game_over
    if (s.phase === 'game_over_transition') {
      const t = s.gameOverTransition - delta
      if (t <= 0) {
        set({ phase: 'game_over', gameOverTransition: 0 })
      } else {
        // Decay death effects
        const deathEffects = s.deathEffects
          .map(d => ({ ...d, timer: d.timer - delta }))
          .filter(d => d.timer > 0)
        set({ gameOverTransition: t, deathEffects })
      }
      return
    }

    if (s.phase === 'floor_clear') {
      const t = s.floorClearTimer - delta
      if (t <= 0) {
        if (s.floor >= MAX_FLOOR) {
          // Victory - check high score
          const score = s.enemiesKilled * 10 + s.collectedItems.length * 25 + s.floor * 100
          const newHigh = Math.max(s.highScore, score)
          if (newHigh > s.highScore) saveHighScore(newHigh)
          set({ phase: 'victory', highScore: newHigh })
        } else {
          const nextFloor = s.floor + 1
          const waves = getWavesForFloor(nextFloor)
          set({
            phase: 'playing',
            floor: nextFloor,
            waveIndex: 0,
            waveDefs: waves,
            spawnQueue: waves[0] ? [...waves[0]] : [],
            spawnTimer: 0,
            lootDrops: [],
            floorClearTimer: 0,
          })
        }
      } else {
        set({ floorClearTimer: t })
      }
      return
    }

    if (s.phase !== 'playing') return

    // Track time
    const timeSurvived = s.timeSurvived + delta

    // Stuck timeout: if no kills for 30s, game over
    const stuckTimeout = s.difficulty === 'easy' ? 45 : s.difficulty === 'hard' ? 20 : 30
    if (s.enemies.length > 0 && timeSurvived - s.lastKillTime > stuckTimeout) {
      const score = s.enemiesKilled * 10 + s.collectedItems.length * 25 + s.floor * 100
      const newHigh = Math.max(s.highScore, score)
      if (newHigh > s.highScore) saveHighScore(newHigh)
      set({ phase: 'game_over_transition', timeSurvived, highScore: newHigh, gameOverTransition: 1.0 })
      return
    }

    // Update player timers
    const p = { ...s.player }
    if (p.attackTimer > 0) {
      p.attackTimer = Math.max(0, p.attackTimer - delta)
      if (p.attackTimer <= 0) p.isAttacking = false
    }
    if (p.dodgeTimer > 0) p.dodgeTimer = Math.max(0, p.dodgeTimer - delta)
    if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - delta)

    // Decay shake timer
    const shakeTimer = Math.max(0, s.shakeTimer - delta)

    // Decay damage numbers
    const damageNumbers = s.damageNumbers
      .map(d => ({ ...d, timer: d.timer - delta }))
      .filter(d => d.timer > 0)

    // Update enemies
    const updatedEnemies: EnemyInstance[] = []
    let playerDamage = 0

    for (const enemy of s.enemies) {
      const updates = updateEnemyAI(enemy, p.position, delta, s.floor)
      const updated = { ...enemy, ...updates }

      // Wind-up -> attack: deal damage after wind-up completes
      if (updated.state === 'attack' && enemy.state === 'windUp' && p.invulnTimer <= 0) {
        const dist = distance2D(updated.position, p.position)
        if (dist <= updated.def.attackRange) {
          const floorMult = s.floor <= 3 ? 0.6 : 0.8
          const diffMult = s.difficulty === 'easy' ? 0.7 : s.difficulty === 'hard' ? 1.3 : 1.0
          playerDamage += Math.round(calculateDamage(updated.attack) * floorMult * diffMult)
        }
      }

      updatedEnemies.push(updated)
    }

    if (playerDamage > 0 && p.invulnTimer <= 0) {
      p.currentHp = Math.max(0, p.currentHp - playerDamage)
      p.invulnTimer = INVULN_DURATION
      sfx.playerHurt()
      if (p.currentHp <= 0) {
        // Game over transition - check high score
        const score = s.enemiesKilled * 10 + s.collectedItems.length * 25 + s.floor * 100
        const newHigh = Math.max(s.highScore, score)
        if (newHigh > s.highScore) saveHighScore(newHigh)
        set({ phase: 'game_over_transition', player: p, enemies: updatedEnemies, timeSurvived, highScore: newHigh, gameOverTransition: 1.0 })
        return
      }
    }

    // Spawn enemies from queue
    let { spawnTimer, spawnQueue, waveIndex, waveDefs } = s
    const newSpawns: EnemyInstance[] = []
    spawnTimer -= delta
    if (spawnTimer <= 0 && spawnQueue.length > 0) {
      const entry = spawnQueue[0]
      newSpawns.push(spawnEnemyInstance(entry.enemyId, s.floor))
      const remaining = entry.count - 1
      if (remaining > 0) {
        spawnQueue = [{ ...entry, count: remaining }, ...spawnQueue.slice(1)]
      } else {
        spawnQueue = spawnQueue.slice(1)
      }
      spawnTimer = 0.6
    }

    const allEnemies = [...updatedEnemies, ...newSpawns]

    // Check wave/floor completion
    let { lootDrops } = s
    let floorClearTimer = 0
    let phase: GamePhase = 'playing'

    if (allEnemies.length === 0 && spawnQueue.length === 0) {
      const nextWave = waveIndex + 1
      if (nextWave < waveDefs.length) {
        waveIndex = nextWave
        spawnQueue = waveDefs[nextWave] ? [...waveDefs[nextWave]] : []
        spawnTimer = 1.0
      } else {
        phase = 'floor_clear'
        floorClearTimer = 2.0
        sfx.floorClear()
        // Heal 30% of max HP on floor clear
        p.currentHp = Math.min(p.maxHp, p.currentHp + Math.round(p.maxHp * 0.3))
      }
    }

    // Collect loot (auto-pickup within range)
    const newDrops: LootDrop[] = []
    const newItems: ItemDef[] = []
    for (const drop of lootDrops) {
      const ttl = drop.ttl - delta
      if (ttl <= 0) continue
      if (distance2D(p.position, drop.position) < 1.5) {
        sfx.lootPickup()
        newItems.push(drop.item)
        if (drop.item.stat === 'attack') p.attack += drop.item.value
        else if (drop.item.stat === 'speed') p.speed += drop.item.value
        else if (drop.item.stat === 'maxHp') {
          p.maxHp += drop.item.value
          p.currentHp = Math.min(p.currentHp + drop.item.value, p.maxHp)
        }
      } else {
        newDrops.push({ ...drop, ttl })
      }
    }

    // Decay death effects
    const deathEffects = s.deathEffects
      .map(d => ({ ...d, timer: d.timer - delta }))
      .filter(d => d.timer > 0)

    set({
      phase,
      player: p,
      enemies: allEnemies,
      lootDrops: newDrops,
      collectedItems: [...s.collectedItems, ...newItems],
      spawnTimer,
      spawnQueue,
      waveIndex,
      floorClearTimer,
      shakeTimer,
      damageNumbers,
      timeSurvived,
      deathEffects,
    })
  },
}))

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}
