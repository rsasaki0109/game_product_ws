import { create } from 'zustand'
import type { GamePhase, PlayerState, MiniGameState } from '../types/game.ts'
import { generateMiniGame, tickInnerGame, checkCoinCollection, checkObstacleCollision, FINISH_LINE } from '../logic/miniGame.ts'
import { aiDecideMovement, aiDecidePhysical } from '../logic/aiPlayer.ts'
import * as sfx from '../logic/sound.ts'

function makePlayer(couchX: number): PlayerState {
  return {
    x: 0, y: 0, vy: 0, onGround: true,
    score: 0, progress: 0,
    couchX, leanDir: 0,
    blindTimer: 0, reverseTimer: 0, shakeTimer: 0,
    pushTimer: 0, stunTimer: 0, stealCooldown: 0,
    pushCooldown: 0, coverCooldown: 0, pillowCooldown: 0, tickleCooldown: 0,
    coinsCollected: 0, physicalActionsUsed: 0,
  }
}

function loadBestTime(): number | null {
  try {
    const v = localStorage.getItem('couch-chaos-best')
    return v ? parseFloat(v) : null
  } catch { return null }
}

function saveBestTime(time: number) {
  try {
    const prev = loadBestTime()
    if (prev === null || time < prev) {
      localStorage.setItem('couch-chaos-best', time.toFixed(2))
    }
  } catch { /* noop */ }
}

function loadTutorialSeen(): boolean {
  try { return localStorage.getItem('couch-chaos-tutorial-seen') === '1' } catch { return true }
}

function saveTutorialSeen() {
  try { localStorage.setItem('couch-chaos-tutorial-seen', '1') } catch { /* noop */ }
}

interface GameStore {
  phase: GamePhase
  player: PlayerState
  ai: PlayerState
  miniGame1: MiniGameState  // player's game
  miniGame2: MiniGameState  // AI's game
  elapsed: number
  winner: 'player' | 'ai' | null
  physicalLog: { text: string; timer: number; side: 'left' | 'right' }[]
  bestTime: number | null
  paused: boolean
  showTutorial: boolean
  tutorialStep: number

  startGame: () => void
  returnToTitle: () => void
  tick: (delta: number, keys: Record<string, boolean>) => void
  doPhysical: (actionId: string) => void
  togglePause: () => void
  nextTutorialStep: () => void
  dismissTutorial: () => void
  showTutorialFromTitle: () => void
}

const TUTORIAL_STEPS = [
  'Arrow keys or WASD to run and jump in your race',
  'Collect coins for bonus points! Avoid red obstacles!',
  'Physical attacks: T=Push  Y=Cover Eyes  U=Pillow  I=Tickle',
  'The AI will attack you back! First to finish wins!',
]

export { TUTORIAL_STEPS }

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'title',
  player: makePlayer(-1),
  ai: makePlayer(1),
  miniGame1: generateMiniGame(),
  miniGame2: generateMiniGame(),
  elapsed: 0,
  winner: null,
  physicalLog: [],
  bestTime: loadBestTime(),
  paused: false,
  showTutorial: !loadTutorialSeen(),
  tutorialStep: 0,

  startGame: () => {
    const showTut = !loadTutorialSeen()
    set({
      phase: 'playing',
      player: makePlayer(-1),
      ai: makePlayer(1),
      miniGame1: generateMiniGame(),
      miniGame2: generateMiniGame(),
      elapsed: 0,
      winner: null,
      physicalLog: [],
      paused: false,
      showTutorial: showTut,
      tutorialStep: 0,
    })
  },

  returnToTitle: () => set({ phase: 'title', bestTime: loadBestTime() }),

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

  doPhysical: (actionId) => {
    const s = get()
    if (s.phase !== 'playing' || s.paused || s.showTutorial) return
    const p = { ...s.player }
    const ai = { ...s.ai }
    const logs = [...s.physicalLog]

    switch (actionId) {
      case 'push':
        if (p.pushCooldown > 0) return
        ai.pushTimer = 0.6
        ai.vy = 3 // knock their character
        p.pushCooldown = 3
        p.physicalActionsUsed++
        logs.push({ text: 'PUSH!', timer: 1.5, side: 'left' })
        sfx.pushSound()
        break
      case 'cover':
        if (p.coverCooldown > 0) return
        ai.blindTimer = 1
        p.coverCooldown = 5
        p.physicalActionsUsed++
        logs.push({ text: 'EYES COVERED!', timer: 1.5, side: 'left' })
        sfx.coverEyes()
        break
      case 'pillow':
        if (p.pillowCooldown > 0) return
        ai.stunTimer = 1.2
        p.pillowCooldown = 4
        p.physicalActionsUsed++
        logs.push({ text: 'PILLOW SMACK!', timer: 1.5, side: 'left' })
        sfx.pillowHit()
        break
      case 'tickle':
        if (p.tickleCooldown > 0) return
        ai.reverseTimer = 2
        p.tickleCooldown = 6
        p.physicalActionsUsed++
        logs.push({ text: 'TICKLE! Controls reversed!', timer: 2, side: 'left' })
        sfx.tickleSound()
        break
    }

    set({ player: p, ai, physicalLog: logs })
  },

  tick: (delta, keys) => {
    const s = get()
    if (s.phase !== 'playing') return
    if (s.paused || s.showTutorial) return

    const elapsed = s.elapsed + delta
    const p = { ...s.player }
    const ai = { ...s.ai }
    let mg1 = { ...s.miniGame1 }
    let mg2 = { ...s.miniGame2 }

    // Decay timers
    for (const who of [p, ai]) {
      who.blindTimer = Math.max(0, who.blindTimer - delta)
      who.reverseTimer = Math.max(0, who.reverseTimer - delta)
      who.shakeTimer = Math.max(0, who.shakeTimer - delta)
      who.pushTimer = Math.max(0, who.pushTimer - delta)
      who.stunTimer = Math.max(0, who.stunTimer - delta)
      who.pushCooldown = Math.max(0, who.pushCooldown - delta)
      who.coverCooldown = Math.max(0, who.coverCooldown - delta)
      who.pillowCooldown = Math.max(0, who.pillowCooldown - delta)
      who.tickleCooldown = Math.max(0, who.tickleCooldown - delta)
    }

    // --- Player inner game ---
    const pMoveRight = keys['ArrowRight'] || keys['KeyD']
    const pMoveLeft = keys['ArrowLeft'] || keys['KeyA']
    const pJump = keys['ArrowUp'] || keys['KeyW'] || keys['Space']

    const pResult = tickInnerGame(
      p.x, p.y, p.vy, p.onGround,
      pMoveRight, pMoveLeft, pJump,
      p.reverseTimer > 0,
      p.stunTimer > 0 || p.pushTimer > 0,
      delta,
    )
    // Jump sound
    if (pJump && p.onGround && !(p.stunTimer > 0 || p.pushTimer > 0)) {
      sfx.jump()
    }
    p.x = pResult.x; p.y = pResult.y; p.vy = pResult.vy
    p.onGround = pResult.onGround; p.progress = pResult.progress

    // Coin collection
    const pCoins = checkCoinCollection(p.x, p.y, mg1.coins)
    if (pCoins.collected > 0) sfx.coinCollect()
    p.score += pCoins.collected * 15
    p.coinsCollected += pCoins.collected
    mg1 = { ...mg1, coins: pCoins.coins, scrollX: Math.max(0, p.x - 5) }

    // Obstacle collision
    if (checkObstacleCollision(p.x, p.y, mg1.obstacles) && p.onGround) {
      p.x = Math.max(0, p.x - 2)
      p.vy = 5
      sfx.obstacleHit()
    }

    // --- AI inner game (difficulty: starts slower, speeds up) ---
    const aiMove = aiDecideMovement(ai, mg2.obstacles, elapsed)
    const aiResult = tickInnerGame(
      ai.x, ai.y, ai.vy, ai.onGround,
      aiMove.moveRight, aiMove.moveLeft, aiMove.jump,
      ai.reverseTimer > 0,
      ai.stunTimer > 0 || ai.pushTimer > 0,
      delta,
    )
    ai.x = aiResult.x; ai.y = aiResult.y; ai.vy = aiResult.vy
    ai.onGround = aiResult.onGround; ai.progress = aiResult.progress

    const aiCoins = checkCoinCollection(ai.x, ai.y, mg2.coins)
    ai.score += aiCoins.collected * 15
    ai.coinsCollected += aiCoins.collected
    mg2 = { ...mg2, coins: aiCoins.coins, scrollX: Math.max(0, ai.x - 5) }

    if (checkObstacleCollision(ai.x, ai.y, mg2.obstacles) && ai.onGround) {
      ai.x = Math.max(0, ai.x - 2)
      ai.vy = 5
    }

    // --- AI physical actions ---
    const aiAction = aiDecidePhysical(ai, p, elapsed)
    const logs = s.physicalLog
      .map(l => ({ ...l, timer: l.timer - delta }))
      .filter(l => l.timer > 0)

    if (aiAction) {
      switch (aiAction) {
        case 'push':
          p.pushTimer = 0.6; p.vy = 3; ai.pushCooldown = 3
          ai.physicalActionsUsed++
          logs.push({ text: 'AI PUSHES YOU!', timer: 1.5, side: 'right' })
          sfx.pushSound()
          break
        case 'cover':
          p.blindTimer = 1; ai.coverCooldown = 5
          ai.physicalActionsUsed++
          logs.push({ text: 'AI COVERS YOUR EYES!', timer: 1.5, side: 'right' })
          sfx.coverEyes()
          break
        case 'pillow':
          p.stunTimer = 1.2; ai.pillowCooldown = 4
          ai.physicalActionsUsed++
          logs.push({ text: 'AI PILLOW ATTACK!', timer: 1.5, side: 'right' })
          sfx.pillowHit()
          break
        case 'tickle':
          p.reverseTimer = 2; ai.tickleCooldown = 6
          ai.physicalActionsUsed++
          logs.push({ text: 'AI TICKLES YOU!', timer: 2, side: 'right' })
          sfx.tickleSound()
          break
      }
    }

    // Win check
    let winner = s.winner
    let phase: GamePhase = 'playing'
    if (p.x >= FINISH_LINE) {
      winner = 'player'; phase = 'result'
      sfx.finish()
      saveBestTime(elapsed)
    } else if (ai.x >= FINISH_LINE) {
      winner = 'ai'; phase = 'result'
      sfx.finish()
    }

    set({
      phase, elapsed, player: p, ai,
      miniGame1: mg1, miniGame2: mg2,
      winner, physicalLog: logs,
      bestTime: winner === 'player' ? (loadBestTime()) : s.bestTime,
    })
  },
}))
