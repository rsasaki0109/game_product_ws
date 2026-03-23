import { create } from 'zustand'
import type { GamePhase, Climber, Wall } from '../types/game.ts'
import { generateWall } from '../logic/wallGen.ts'
import {
  findHoldInDirection,
  moveToHold,
  applyFall,
  findReachableHolds,
  checkFragileBreak,
} from '../logic/climbing.ts'
import { destroyHold, freeze, shake, SKILLS } from '../logic/skills.ts'
import { aiDecision, getAiCooldown } from '../logic/aiClimber.ts'
import * as sfx from '../logic/sound.ts'

const WIN_HEIGHT = 28
const TIME_LIMIT = 120
const STAMINA_DRAIN_RATE = 1.2 // per second

function makeClimber(): Climber {
  return {
    position: [2, 0],
    stamina: 100,
    energy: 0,
    freezeTimer: 0,
    shakeTimer: 0,
    moveTimer: 0,
    height: 0,
    fallFlash: 0,
    holdsGrabbed: 0,
    skillsUsed: 0,
  }
}

function loadBestTime(): number | null {
  try {
    const v = localStorage.getItem('climb-clash-best')
    return v ? parseFloat(v) : null
  } catch { return null }
}

function saveBestTime(time: number) {
  try {
    const prev = loadBestTime()
    if (prev === null || time < prev) {
      localStorage.setItem('climb-clash-best', time.toFixed(2))
    }
  } catch { /* noop */ }
}

function loadTutorialSeen(): boolean {
  try { return localStorage.getItem('climb-clash-tutorial-seen') === '1' } catch { return true }
}

function saveTutorialSeen() {
  try { localStorage.setItem('climb-clash-tutorial-seen', '1') } catch { /* noop */ }
}

const TUTORIAL_STEPS = [
  'WASD to move between holds on your wall',
  'Watch your stamina! It drains while climbing',
  'Sabotage: 1=Destroy Hold  2=Freeze  3=Shake (costs energy)',
  'First to the top wins! Don\'t let your stamina hit zero!',
]

export { TUTORIAL_STEPS }

interface GameStore {
  phase: GamePhase
  playerWall: Wall
  aiWall: Wall
  player: Climber
  ai: Climber
  elapsed: number
  aiCooldown: number
  bestTime: number | null
  paused: boolean
  showTutorial: boolean
  tutorialStep: number

  startGame: () => void
  returnToTitle: () => void
  tick: (delta: number) => void
  movePlayer: (direction: 'up' | 'down' | 'left' | 'right') => void
  useSkill: (skillId: string) => void
  togglePause: () => void
  nextTutorialStep: () => void
  dismissTutorial: () => void
  showTutorialFromTitle: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'title',
  playerWall: { holds: [] },
  aiWall: { holds: [] },
  player: makeClimber(),
  ai: makeClimber(),
  elapsed: 0,
  aiCooldown: 0.8,
  bestTime: loadBestTime(),
  paused: false,
  showTutorial: !loadTutorialSeen(),
  tutorialStep: 0,

  startGame: () => {
    const showTut = !loadTutorialSeen()
    set({
      phase: 'playing',
      playerWall: generateWall(),
      aiWall: generateWall(),
      player: makeClimber(),
      ai: makeClimber(),
      elapsed: 0,
      aiCooldown: 0.8,
      paused: false,
      showTutorial: showTut,
      tutorialStep: 0,
    })
  },

  returnToTitle: () => {
    set({ phase: 'title', bestTime: loadBestTime() })
  },

  togglePause: () => {
    const s = get()
    if (s.phase !== 'playing') return
    if (s.showTutorial) return
    set({ paused: !s.paused })
  },

  nextTutorialStep: () => {
    const s = get()
    if (s.tutorialStep >= TUTORIAL_STEPS.length - 1) {
      saveTutorialSeen()
      set({ showTutorial: false })
    } else {
      set({ tutorialStep: s.tutorialStep + 1 })
    }
  },

  dismissTutorial: () => {
    saveTutorialSeen()
    set({ showTutorial: false })
  },

  showTutorialFromTitle: () => {
    const s = get()
    s.startGame()
    set({ showTutorial: true, tutorialStep: 0 })
  },

  tick: (delta) => {
    const s = get()
    if (s.phase !== 'playing') return
    if (s.paused || s.showTutorial) return

    const elapsed = s.elapsed + delta
    let player = { ...s.player }
    let ai = { ...s.ai }
    let playerWall = s.playerWall
    let aiWall = s.aiWall

    // Update timers
    player.freezeTimer = Math.max(0, player.freezeTimer - delta)
    player.shakeTimer = Math.max(0, player.shakeTimer - delta)
    player.moveTimer = Math.max(0, player.moveTimer - delta)
    player.fallFlash = Math.max(0, player.fallFlash - delta)
    ai.freezeTimer = Math.max(0, ai.freezeTimer - delta)
    ai.shakeTimer = Math.max(0, ai.shakeTimer - delta)
    ai.moveTimer = Math.max(0, ai.moveTimer - delta)
    ai.fallFlash = Math.max(0, ai.fallFlash - delta)

    // Stamina drain
    player.stamina = Math.max(0, player.stamina - STAMINA_DRAIN_RATE * delta)
    ai.stamina = Math.max(0, ai.stamina - STAMINA_DRAIN_RATE * delta)

    // Energy gain (5 per second)
    player.energy = Math.min(100, player.energy + 5 * delta)
    ai.energy = Math.min(100, ai.energy + 5 * delta)

    // Stamina zero: fall
    if (player.stamina <= 0) {
      player = applyFall(player)
      player.stamina = 40
      player.fallFlash = 0.8
      sfx.fall()
    }
    if (ai.stamina <= 0) {
      ai = applyFall(ai)
      ai.stamina = 40
      ai.fallFlash = 0.8
    }

    // Check if player has no reachable holds
    const playerReachable = findReachableHolds(playerWall, player.position)
    if (playerReachable.length === 0 && player.position[1] > 0) {
      player = applyFall(player)
      player.fallFlash = 0.8
      sfx.fall()
    }

    // AI decision
    let aiCooldown = s.aiCooldown - delta
    if (aiCooldown <= 0 && ai.moveTimer <= 0) {
      const result = aiDecision(ai, aiWall, player, playerWall)
      ai = result.ai
      aiWall = result.aiWall
      playerWall = result.playerWall
      player = result.player
      aiCooldown = getAiCooldown(player.height, ai.height)
    }

    // Win/lose checks
    let phase: GamePhase = 'playing'
    if (player.height >= WIN_HEIGHT) {
      phase = 'victory'
      sfx.victory()
      saveBestTime(elapsed)
    } else if (ai.height >= WIN_HEIGHT) {
      phase = 'defeat'
    } else if (elapsed >= TIME_LIMIT) {
      phase = player.height >= ai.height ? 'victory' : 'defeat'
      if (phase === 'victory') {
        sfx.victory()
        saveBestTime(elapsed)
      }
    }

    set({
      phase,
      player,
      ai,
      playerWall,
      aiWall,
      elapsed,
      aiCooldown,
      bestTime: (phase === 'victory') ? loadBestTime() : s.bestTime,
    })
  },

  movePlayer: (direction) => {
    const s = get()
    if (s.phase !== 'playing') return
    if (s.paused || s.showTutorial) return
    if (s.player.freezeTimer > 0) return
    if (s.player.moveTimer > 0) return

    let playerWall = s.playerWall

    // If shaking, 30% chance move goes wrong
    let actualDirection = direction
    if (s.player.shakeTimer > 0 && Math.random() < 0.3) {
      const dirs: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right']
      const others = dirs.filter(d => d !== direction)
      actualDirection = others[Math.floor(Math.random() * others.length)]
    }

    const hold = findHoldInDirection(playerWall, s.player.position, actualDirection)
    if (!hold) return

    // Check fragile break on current hold (moving away)
    const currentHold = playerWall.holds.find(
      h => h.x === s.player.position[0] && h.y === s.player.position[1] && !h.destroyed,
    )
    if (currentHold && checkFragileBreak(currentHold)) {
      playerWall = {
        holds: playerWall.holds.map(h =>
          h === currentHold ? { ...h, destroyed: true } : h,
        ),
      }
      sfx.fragileBreak()
    }

    const newPlayer = moveToHold(s.player, hold)
    newPlayer.holdsGrabbed = s.player.holdsGrabbed + 1
    sfx.grab()

    if (hold.type === 'recovery') {
      sfx.recoveryHold()
    }

    // Subtle tick every 3 holds of height progress
    if (hold.y > s.player.height && hold.y % 3 === 0) {
      sfx.climbProgress()
    }

    set({
      player: newPlayer,
      playerWall,
    })
  },

  useSkill: (skillId) => {
    const s = get()
    if (s.phase !== 'playing') return
    if (s.paused || s.showTutorial) return

    const skill = SKILLS.find(sk => sk.id === skillId)
    if (!skill) return
    if (s.player.energy < skill.cost) return

    let player = { ...s.player, energy: s.player.energy - skill.cost, skillsUsed: s.player.skillsUsed + 1 }
    let ai = s.ai
    let aiWall = s.aiWall

    switch (skillId) {
      case 'destroy':
        aiWall = destroyHold(aiWall, ai.position)
        sfx.skillDestroy()
        break
      case 'freeze':
        ai = freeze(ai)
        sfx.skillFreeze()
        break
      case 'shake':
        ai = shake(ai)
        sfx.skillShake()
        break
    }

    set({ player, ai, aiWall })
  },
}))
