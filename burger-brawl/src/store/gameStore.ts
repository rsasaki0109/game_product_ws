import { create } from 'zustand'
import type { GamePhase, Difficulty, CustomerInstance, ProjectileInstance, OrderItem, ActionType } from '../types/game.ts'
import { resetUids, getNextUid } from '../logic/ids.ts'
import { spawnCustomer } from '../logic/spawner.ts'
import * as sfx from '../logic/sound.ts'

const COUNTER_DIST = 1.5
const PUNCH_DAMAGE = 1
const BAZOOKA_DAMAGE = 3
const BAZOOKA_COST = 1
const SERVE_TIME = 0.5
const MAX_LIVES = 3
const PUNCH_COOLDOWN = 0.2
const BAZOOKA_COOLDOWN = 1.0
const SPEED_BONUS_WINDOW = 2.0 // seconds after arrival for 2x score
const RUSH_INTERVAL = 30 // seconds between rushes
const RUSH_WARNING_TIME = 3 // seconds before rush to show warning
const RUSH_SPAWN_COUNT = 4 // number of customers in a rush
const GOLDEN_CHANCE = 0.08 // 8% chance per spawn

const LS_HIGH_SCORE_KEY = 'burger-brawl-highscore'
const LS_TUTORIAL_KEY = 'burger-brawl-tutorial-done'

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

interface GameStore {
  phase: GamePhase
  score: number
  lives: number
  ammo: number
  elapsed: number
  spawnTimer: number
  selectedLane: number
  punchCooldown: number
  bazookaCooldown: number
  customers: CustomerInstance[]
  projectiles: ProjectileInstance[]
  combo: number
  comboTimer: number
  feedback: { text: string; timer: number; color: string } | null
  ammoRegenTimer: number
  punchFlashTimer: number
  cameraShakeTimer: number
  wrongAction: { text: string; timer: number } | null
  highScore: number
  showTutorial: boolean
  tutorialStep: number
  paused: boolean
  bestCombo: number
  customersServed: number
  monstersDefeated: number
  timeSurvived: number
  idlePenaltyTimer: number
  difficulty: Difficulty
  gameOverTransition: number
  // New: wave/rush system
  rushTimer: number
  rushWarningActive: boolean
  rushWarningTimer: number
  // New: streak tracking
  streak: number
  bestStreak: number
  // New: speed bonus display
  speedBonusTimer: number

  startGame: () => void
  returnToTitle: () => void
  setDifficulty: (d: Difficulty) => void
  tick: (delta: number) => void
  selectLane: (lane: number) => void
  doAction: (action: ActionType) => void
  togglePause: () => void
  advanceTutorial: () => void
  showTutorialAgain: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'title',
  score: 0,
  lives: MAX_LIVES,
  ammo: 5,
  elapsed: 0,
  spawnTimer: 1,
  selectedLane: 2,
  punchCooldown: 0,
  bazookaCooldown: 0,
  customers: [],
  projectiles: [],
  combo: 0,
  comboTimer: 0,
  feedback: null,
  ammoRegenTimer: 6,
  punchFlashTimer: 0,
  cameraShakeTimer: 0,
  wrongAction: null,
  highScore: loadHighScore(),
  showTutorial: !loadTutorialDone(),
  tutorialStep: 0,
  paused: false,
  bestCombo: 0,
  customersServed: 0,
  monstersDefeated: 0,
  timeSurvived: 0,
  idlePenaltyTimer: 0,
  difficulty: 'normal' as Difficulty,
  gameOverTransition: 0,
  rushTimer: RUSH_INTERVAL,
  rushWarningActive: false,
  rushWarningTimer: 0,
  streak: 0,
  bestStreak: 0,
  speedBonusTimer: 0,

  setDifficulty: (d: Difficulty) => set({ difficulty: d }),

  startGame: () => {
    resetUids()
    const s = get()
    set({
      phase: 'playing', score: 0, lives: MAX_LIVES, ammo: 5,
      elapsed: 0, spawnTimer: 2.5, selectedLane: 2,
      punchCooldown: 0, bazookaCooldown: 0,
      customers: [
        spawnCustomer(0, []),
        spawnCustomer(0, []),
      ].filter(Boolean) as CustomerInstance[], projectiles: [],
      combo: 0, comboTimer: 0, feedback: null,
      ammoRegenTimer: 6, punchFlashTimer: 0, cameraShakeTimer: 0,
      wrongAction: null, paused: false,
      bestCombo: 0, customersServed: 0, monstersDefeated: 0, timeSurvived: 0, idlePenaltyTimer: 0, gameOverTransition: 0,
      showTutorial: s.showTutorial,
      tutorialStep: s.showTutorial ? 0 : -1,
      rushTimer: RUSH_INTERVAL,
      rushWarningActive: false,
      rushWarningTimer: 0,
      streak: 0,
      bestStreak: 0,
      speedBonusTimer: 0,
    })
  },

  returnToTitle: () => set({ phase: 'title', paused: false }),

  togglePause: () => {
    const s = get()
    if (s.phase !== 'playing') return
    if (s.showTutorial && s.tutorialStep >= 0) return
    set({ paused: !s.paused })
  },

  advanceTutorial: () => {
    const s = get()
    const maxStep = 3
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

  selectLane: (lane) => set({ selectedLane: Math.max(0, Math.min(4, lane)) }),

  doAction: (action) => {
    const s = get()
    if (s.phase !== 'playing' || s.paused) return
    set({ idlePenaltyTimer: 0 })
    const lane = s.selectedLane

    // Find nearest customer in selected lane
    const inLane = s.customers
      .filter(c => c.position === lane && (c.state === 'waiting' || c.state === 'approaching' || c.state === 'attacking'))
      .sort((a, b) => a.distance - b.distance)
    const target = inLane[0]

    if (action === 'punch') {
      if (s.punchCooldown > 0) return
      if (target && target.distance <= 3) {
        if (target.def.type === 'monster') {
          sfx.punchHit()
          target.currentHp -= PUNCH_DAMAGE
          target.hitFlash = 0.2
          if (target.currentHp <= 0) {
            target.state = 'dead'
            const comboBonus = Math.min(5, s.combo + 1)
            sfx.comboUp()
            const newCombo = s.combo + 1
            const newStreak = s.streak + 1
            set({
              score: s.score + target.def.score * comboBonus,
              combo: newCombo,
              comboTimer: 3,
              feedback: { text: `${target.def.emoji} PUNCH! x${comboBonus}`, timer: 1, color: '#ef4444' },
              punchCooldown: PUNCH_COOLDOWN,
              punchFlashTimer: 0.2,
              cameraShakeTimer: 0.1,
              monstersDefeated: s.monstersDefeated + 1,
              bestCombo: Math.max(s.bestCombo, newCombo),
              streak: newStreak,
              bestStreak: Math.max(s.bestStreak, newStreak),
            })
          } else {
            set({
              punchCooldown: PUNCH_COOLDOWN,
              punchFlashTimer: 0.15,
              cameraShakeTimer: 0.08,
              feedback: { text: `${target.def.emoji} HIT! HP:${target.currentHp}`, timer: 0.5, color: '#fbbf24' },
            })
          }
        } else {
          // Punched a normal customer! Penalty!
          sfx.wrongAction()
          sfx.lifeLost()
          set({
            lives: s.lives - 1,
            score: Math.max(0, s.score - 20),
            feedback: { text: 'Wrong target! -1 Life', timer: 1.5, color: '#ef4444' },
            punchCooldown: PUNCH_COOLDOWN,
            wrongAction: { text: 'WRONG TARGET!', timer: 1.5 },
            streak: 0, // Reset streak on mistake
          })
          target.state = 'leaving'
        }
      } else {
        set({ punchCooldown: PUNCH_COOLDOWN })
      }
      return
    }

    if (action === 'bazooka') {
      if (s.bazookaCooldown > 0 || s.ammo <= 0) return
      // Fire bazooka down the lane
      const proj: ProjectileInstance = {
        uid: getNextUid(),
        position: [lane, 0],
        speed: 15,
        damage: BAZOOKA_DAMAGE,
        type: 'bazooka',
        alive: true,
      }
      sfx.bazookaFire()
      set({
        projectiles: [...s.projectiles, proj],
        ammo: s.ammo - BAZOOKA_COST,
        bazookaCooldown: BAZOOKA_COOLDOWN,
      })
      return
    }

    // Serve actions
    const orderMap: Record<string, OrderItem> = {
      serve_burger: 'burger', serve_fries: 'fries',
      serve_drink: 'drink', serve_combo: 'combo',
    }
    const item = orderMap[action]
    if (!item) return

    if (target && target.def.type === 'normal' && target.state === 'waiting') {
      if (target.def.order === item) {
        // Correct order!
        sfx.serveFood()
        target.state = 'served'
        target.serveTimer = SERVE_TIME

        // Check speed bonus: time waiting = patience - patienceTimer
        const timeWaiting = target.def.patience - target.patienceTimer
        const isSpeedBonus = timeWaiting <= SPEED_BONUS_WINDOW
        const speedMult = isSpeedBonus ? 2 : 1

        // Check if golden customer
        const isGolden = target.def.name === 'Golden Customer'

        const comboBonus = Math.min(5, s.combo + 1)
        sfx.comboUp()
        if (isSpeedBonus) sfx.speedBonus()

        const newCombo = s.combo + 1
        const newStreak = s.streak + 1
        const baseScore = target.def.score * comboBonus * speedMult
        const feedbackText = isSpeedBonus
          ? `${target.def.emoji} FAST SERVE! +${baseScore} (2x)`
          : `${target.def.emoji} Served! +${baseScore}`

        let newAmmo = s.ammo
        let newLives = s.lives
        if (isGolden) {
          // Golden customer reward: +1 ammo or +1 life
          sfx.goldenCustomer()
          if (s.lives < MAX_LIVES) {
            newLives = s.lives + 1
          } else {
            newAmmo = Math.min(5, s.ammo + 1)
          }
        }

        set({
          score: s.score + baseScore,
          combo: newCombo,
          comboTimer: 3,
          feedback: { text: isGolden ? `GOLDEN! ${feedbackText} +BONUS!` : feedbackText, timer: 1.2, color: isGolden ? '#fbbf24' : isSpeedBonus ? '#22d3ee' : '#22c55e' },
          customersServed: s.customersServed + 1,
          bestCombo: Math.max(s.bestCombo, newCombo),
          streak: newStreak,
          bestStreak: Math.max(s.bestStreak, newStreak),
          speedBonusTimer: isSpeedBonus ? 1.5 : s.speedBonusTimer,
          ammo: newAmmo,
          lives: newLives,
        })
      } else {
        // Wrong order!
        set({
          score: Math.max(0, s.score - 5),
          feedback: { text: `Wrong order!`, timer: 1, color: '#fbbf24' },
          streak: 0, // Reset streak on wrong order
        })
      }
    } else if (target && target.def.type === 'monster' && target.state === 'waiting') {
      // Tried to serve a monster - it gets angrier, attacks faster
      sfx.wrongAction()
      set({
        feedback: { text: `That's a MONSTER! PUNCH it!`, timer: 1.5, color: '#ef4444' },
        wrongAction: { text: 'WRONG TARGET!', timer: 1.5 },
        streak: 0,
      })
    }
  },

  tick: (delta) => {
    const s = get()
    if (s.phase === 'game_over_transition') {
      const t = s.gameOverTransition - delta
      if (t <= 0) {
        set({ phase: 'game_over', gameOverTransition: 0 })
      } else {
        set({ gameOverTransition: t })
      }
      return
    }
    if (s.phase !== 'playing') return
    if (s.paused) return
    if (s.showTutorial && s.tutorialStep >= 0) return

    const elapsed = s.elapsed + delta
    const timeSurvived = s.timeSurvived + delta
    let { lives, score, ammo, spawnTimer, combo, comboTimer, feedback } = s
    let punchCooldown = Math.max(0, s.punchCooldown - delta)
    let bazookaCooldown = Math.max(0, s.bazookaCooldown - delta)
    let punchFlashTimer = Math.max(0, s.punchFlashTimer - delta)
    let cameraShakeTimer = Math.max(0, s.cameraShakeTimer - delta)
    let speedBonusTimer = Math.max(0, s.speedBonusTimer - delta)

    // Wrong action decay
    let wrongAction = s.wrongAction
    if (wrongAction) {
      wrongAction = { ...wrongAction, timer: wrongAction.timer - delta }
      if (wrongAction.timer <= 0) wrongAction = null
    }

    // Combo decay
    comboTimer = Math.max(0, comboTimer - delta)
    if (comboTimer <= 0) combo = 0

    // Feedback decay
    if (feedback) {
      feedback = { ...feedback, timer: feedback.timer - delta }
      if (feedback.timer <= 0) feedback = null
    }

    // Rush/wave system
    let rushTimer = s.rushTimer - delta
    let rushWarningActive = s.rushWarningActive
    let rushWarningTimer = s.rushWarningTimer

    // Show warning before rush
    if (rushTimer <= RUSH_WARNING_TIME && !rushWarningActive && rushTimer > 0) {
      rushWarningActive = true
      rushWarningTimer = RUSH_WARNING_TIME
      sfx.rushWarning()
    }

    if (rushWarningActive) {
      rushWarningTimer = Math.max(0, rushWarningTimer - delta)
    }

    // Spawn rush
    let rushSpawned = false
    if (rushTimer <= 0) {
      const occupiedLanes = s.customers
        .filter(c => c.state !== 'dead' && c.state !== 'leaving')
        .map(c => c.position)
      for (let i = 0; i < RUSH_SPAWN_COUNT; i++) {
        const currentOccupied = [
          ...occupiedLanes,
          ...s.customers.filter(c => c.state !== 'dead' && c.state !== 'leaving').map(c => c.position),
        ]
        const newCustomer = spawnCustomer(elapsed, currentOccupied)
        if (newCustomer) {
          if (newCustomer.def.type === 'monster') sfx.monsterGrowl()
          s.customers.push(newCustomer)
        }
      }
      rushTimer = RUSH_INTERVAL
      rushWarningActive = false
      rushWarningTimer = 0
      rushSpawned = true
    }

    // Spawn - improved difficulty curve (skip normal spawn during rush frame)
    if (!rushSpawned) {
      spawnTimer -= delta
      const diffSpawnMult = s.difficulty === 'easy' ? 1.3 : s.difficulty === 'hard' ? 0.7 : 1.0
      const spawnInterval = Math.max(0.8, 3.0 - elapsed * 0.015) * diffSpawnMult
      if (spawnTimer <= 0) {
        const occupiedLanes = s.customers
          .filter(c => c.state !== 'dead' && c.state !== 'leaving')
          .map(c => c.position)

        // Golden customer chance
        const isGolden = Math.random() < GOLDEN_CHANCE
        const newCustomer = spawnCustomer(elapsed, occupiedLanes, false, isGolden)
        if (newCustomer) {
          if (newCustomer.def.type === 'monster') sfx.monsterGrowl()
          if (newCustomer.def.name === 'Golden Customer') sfx.goldenCustomer()
          s.customers.push(newCustomer)
        }
        // After 30s, guarantee at least 1 monster every 3 spawns
        if (elapsed > 30 && newCustomer && newCustomer.def.type !== 'monster') {
          const recentCustomers = s.customers.slice(-2)
          const noRecentMonster = recentCustomers.every(c => c.def.type !== 'monster')
          if (noRecentMonster) {
            const monsterCustomer = spawnCustomer(elapsed, occupiedLanes, true)
            if (monsterCustomer) {
              sfx.monsterGrowl()
              s.customers.push(monsterCustomer)
            }
          }
        }
        spawnTimer = spawnInterval
      }
    }

    // Ammo regen (1 every 6 seconds, max 5)
    let ammoRegenTimer = s.ammoRegenTimer - delta
    if (ammoRegenTimer <= 0 && ammo < 5) {
      ammo++
      ammoRegenTimer = 6
    }

    // Update customers
    const activeCustomers: CustomerInstance[] = []
    for (const c of s.customers) {
      const cu = { ...c }
      cu.hitFlash = Math.max(0, cu.hitFlash - delta)

      switch (cu.state) {
        case 'approaching':
          cu.distance -= cu.def.speed * delta
          if (cu.distance <= COUNTER_DIST) {
            cu.distance = COUNTER_DIST
            cu.state = 'waiting'
          }
          break

        case 'waiting':
          cu.patienceTimer -= delta
          if (cu.patienceTimer <= 0) {
            if (cu.def.type === 'monster') {
              cu.state = 'attacking'
            } else {
              // Customer left unhappy
              cu.state = 'leaving'
              lives--
              sfx.customerAngry()
              sfx.lifeLost()
              feedback = { text: `${cu.def.emoji} Left angry! -1 Life`, timer: 1.5, color: '#ef4444' }
            }
          }
          break

        case 'attacking':
          // Monster reached counter - damages the shop
          lives = Math.max(0, lives - 1)
          cu.state = 'leaving'
          sfx.lifeLost()
          feedback = { text: `${cu.def.emoji} ATTACK! -1 Life`, timer: 1.5, color: '#dc2626' }
          break

        case 'served':
          cu.serveTimer -= delta
          if (cu.serveTimer <= 0) cu.state = 'leaving'
          break

        case 'leaving':
          cu.distance += 3 * delta
          if (cu.distance > 14) continue // Remove
          break

        case 'dead':
          cu.distance += 0.5 * delta // Slide back a bit
          if (cu.distance > 14) continue
          break

        case 'punched':
          cu.state = 'dead'
          break
      }

      activeCustomers.push(cu)
    }

    // Projectiles
    const activeProjectiles: ProjectileInstance[] = []
    let { monstersDefeated, bestCombo, streak, bestStreak } = s
    for (const p of s.projectiles) {
      if (!p.alive) continue
      const np = { ...p, position: [p.position[0], p.position[1] + p.speed * delta] as [number, number] }

      // Hit check
      let hit = false
      for (const c of activeCustomers) {
        if (c.position === np.position[0] && Math.abs(c.distance - np.position[1]) < 1 &&
          (c.state === 'approaching' || c.state === 'waiting' || c.state === 'attacking')) {
          if (c.def.type === 'monster') {
            sfx.bazookaExplode()
            c.currentHp -= np.damage
            c.hitFlash = 0.3
            if (c.currentHp <= 0) {
              c.state = 'dead'
              const comboBonus = Math.min(5, combo + 1)
              score += c.def.score * comboBonus
              combo++
              comboTimer = 3
              sfx.comboUp()
              feedback = { text: `${c.def.emoji} BOOM! x${comboBonus}`, timer: 1, color: '#f97316' }
              monstersDefeated++
              bestCombo = Math.max(bestCombo, combo)
              streak++
              bestStreak = Math.max(bestStreak, streak)
            }
            hit = true
            break
          } else {
            // Hit normal customer with bazooka!! Big penalty!
            sfx.bazookaExplode()
            sfx.wrongAction()
            sfx.lifeLost()
            c.state = 'leaving'
            lives--
            score = Math.max(0, score - 30)
            feedback = { text: `Bazooka on customer!! -1 Life`, timer: 2, color: '#dc2626' }
            wrongAction = { text: 'WRONG TARGET!', timer: 1.5 }
            streak = 0
            hit = true
            break
          }
        }
      }

      if (np.position[1] > 14) hit = true
      if (!hit) activeProjectiles.push(np)
    }

    // Idle penalty removed (annoying, not harder)
    let idlePenaltyTimer = 0

    // Game over check
    if (lives <= 0) {
      const newHigh = Math.max(s.highScore, score)
      if (newHigh > s.highScore) saveHighScore(newHigh)
      set({
        phase: 'game_over_transition', gameOverTransition: 1.0, elapsed, score, lives: 0, customers: activeCustomers,
        projectiles: activeProjectiles, combo, comboTimer, feedback,
        spawnTimer, ammo, punchCooldown, bazookaCooldown,
        ammoRegenTimer, punchFlashTimer, cameraShakeTimer, wrongAction,
        timeSurvived, highScore: newHigh, monstersDefeated, bestCombo, idlePenaltyTimer,
        rushTimer, rushWarningActive, rushWarningTimer,
        streak, bestStreak, speedBonusTimer,
      })
      return
    }

    set({
      elapsed, score, lives, ammo, spawnTimer,
      customers: activeCustomers, projectiles: activeProjectiles,
      combo, comboTimer, feedback, punchCooldown, bazookaCooldown,
      ammoRegenTimer, punchFlashTimer, cameraShakeTimer, wrongAction,
      timeSurvived, monstersDefeated, bestCombo, idlePenaltyTimer,
      rushTimer, rushWarningActive, rushWarningTimer,
      streak, bestStreak, speedBonusTimer,
    })
  },
}))
