import { create } from 'zustand'
import type { GamePhase, PlayerState, MiniGameState } from '../types/game.ts'
import { generateMiniGame, tickInnerGame, checkCoinCollection, checkObstacleCollision, checkSpeedPad, checkPowerUpCollection, FINISH_LINE, SPEED_PAD_MULTIPLIER, SPEED_PAD_DURATION } from '../logic/miniGame.ts'
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
    comebackActive: false,
    tauntImmunityTimer: 0,
    speedBuffTimer: 0,
    shieldBuff: false,
    speedBuffMultiplier: 1,
    speedPadTimer: 0,
    recentActions: [],
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
  photoFinish: boolean
  closeRaceActive: boolean
  closeRaceSoundCooldown: number
  finishTimes: { player: number | null; ai: number | null }

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

/** Check if a player should get the Desperation Boost (>20% behind) */
function computeComeback(self: PlayerState, opponent: PlayerState): boolean {
  return opponent.progress - self.progress > 20
}

/** Apply shield: absorbs one hit, returns true if absorbed */
function tryAbsorbWithShield(target: PlayerState): boolean {
  if (target.shieldBuff) {
    target.shieldBuff = false
    return true
  }
  return false
}

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
  photoFinish: false,
  closeRaceActive: false,
  closeRaceSoundCooldown: 0,
  finishTimes: { player: null, ai: null },

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
      photoFinish: false,
      closeRaceActive: false,
      closeRaceSoundCooldown: 0,
      finishTimes: { player: null, ai: null },
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
    const p = { ...s.player, recentActions: [...s.player.recentActions] }
    const ai = { ...s.ai }
    const logs = [...s.physicalLog]

    // Check if AI has taunt immunity
    if (ai.tauntImmunityTimer > 0) {
      logs.push({ text: 'BLOCKED!', timer: 1, side: 'left' })
      set({ physicalLog: logs })
      return
    }

    const actionEmojis: Record<string, string> = {
      push: '👋', cover: '🙈', pillow: '🛋️', tickle: '🤣',
    }

    switch (actionId) {
      case 'push':
        if (p.pushCooldown > 0) return
        if (tryAbsorbWithShield(ai)) {
          logs.push({ text: 'SHIELD BLOCKS PUSH!', timer: 1.5, side: 'left' })
        } else {
          ai.pushTimer = 0.6
          ai.vy = 3
          logs.push({ text: 'PUSH!', timer: 1.5, side: 'left' })
        }
        p.pushCooldown = 3
        p.physicalActionsUsed++
        p.tauntImmunityTimer = 1.5
        sfx.pushSound()
        break
      case 'cover':
        if (p.coverCooldown > 0) return
        if (tryAbsorbWithShield(ai)) {
          logs.push({ text: 'SHIELD BLOCKS COVER!', timer: 1.5, side: 'left' })
        } else {
          ai.blindTimer = 1
          logs.push({ text: 'EYES COVERED!', timer: 1.5, side: 'left' })
        }
        p.coverCooldown = 5
        p.physicalActionsUsed++
        p.tauntImmunityTimer = 1.5
        sfx.coverEyes()
        break
      case 'pillow':
        if (p.pillowCooldown > 0) return
        if (tryAbsorbWithShield(ai)) {
          logs.push({ text: 'SHIELD BLOCKS PILLOW!', timer: 1.5, side: 'left' })
        } else {
          ai.stunTimer = 1.2
          logs.push({ text: 'PILLOW SMACK!', timer: 1.5, side: 'left' })
        }
        p.pillowCooldown = 4
        p.physicalActionsUsed++
        p.tauntImmunityTimer = 1.5
        sfx.pillowHit()
        break
      case 'tickle':
        if (p.tickleCooldown > 0) return
        if (tryAbsorbWithShield(ai)) {
          logs.push({ text: 'SHIELD BLOCKS TICKLE!', timer: 1.5, side: 'left' })
        } else {
          ai.reverseTimer = 2
          logs.push({ text: 'TICKLE! Controls reversed!', timer: 2, side: 'left' })
        }
        p.tickleCooldown = 6
        p.physicalActionsUsed++
        p.tauntImmunityTimer = 1.5
        sfx.tickleSound()
        break
    }

    // Track recent actions (keep last 3)
    p.recentActions.push({ emoji: actionEmojis[actionId] || '?', timer: 3 })
    if (p.recentActions.length > 3) p.recentActions.shift()

    set({ player: p, ai, physicalLog: logs })
  },

  tick: (delta, keys) => {
    const s = get()
    if (s.phase !== 'playing') return
    if (s.paused || s.showTutorial) return

    const elapsed = s.elapsed + delta
    const p: PlayerState = { ...s.player, recentActions: [...s.player.recentActions] }
    const ai: PlayerState = { ...s.ai, recentActions: [...s.ai.recentActions] }
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
      who.tauntImmunityTimer = Math.max(0, who.tauntImmunityTimer - delta)
      who.speedBuffTimer = Math.max(0, who.speedBuffTimer - delta)
      who.speedPadTimer = Math.max(0, who.speedPadTimer - delta)
      // Decay recent action timers
      who.recentActions = who.recentActions
        .map(a => ({ ...a, timer: a.timer - delta }))
        .filter(a => a.timer > 0)
    }

    // Compute comeback boost
    p.comebackActive = computeComeback(p, ai)
    ai.comebackActive = computeComeback(ai, p)

    // Compute effective speed multipliers
    const pSpeedMult = (p.comebackActive ? 1.1 : 1)
      * (p.speedBuffTimer > 0 ? 1.2 : 1)
      * (p.speedPadTimer > 0 ? SPEED_PAD_MULTIPLIER : 1)
    const aiSpeedMult = (ai.comebackActive ? 1.1 : 1)
      * (ai.speedBuffTimer > 0 ? 1.2 : 1)
      * (ai.speedPadTimer > 0 ? SPEED_PAD_MULTIPLIER : 1)

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
      pSpeedMult,
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

    // Obstacle collision (with ramp support)
    const pObsResult = checkObstacleCollision(p.x, p.y, mg1.obstacles)
    if (pObsResult.rampBounce) {
      p.vy = 18 // super jump from ramp
      sfx.rampBounce()
    } else if (pObsResult.hit && p.onGround) {
      p.x = Math.max(0, p.x - 2)
      p.vy = 5
      sfx.obstacleHit()
    }

    // Speed pad check
    if (checkSpeedPad(p.x, p.y, mg1.speedPads) && p.speedPadTimer <= 0) {
      p.speedPadTimer = SPEED_PAD_DURATION
      sfx.speedPad()
    }

    // Power-up collection
    const pPowerUp = checkPowerUpCollection(p.x, p.y, mg1.powerUps)
    if (pPowerUp.collected) {
      mg1 = { ...mg1, powerUps: pPowerUp.powerUps }
      sfx.powerUp()
      switch (pPowerUp.collected.kind) {
        case 'speed':
          p.speedBuffTimer = 3
          break
        case 'shield':
          p.shieldBuff = true
          break
        case 'stun':
          ai.stunTimer = Math.max(ai.stunTimer, 0.5)
          break
      }
    }

    // --- AI inner game (difficulty: starts slower, speeds up) ---
    const aiMove = aiDecideMovement(ai, mg2.obstacles, elapsed)
    const aiResult = tickInnerGame(
      ai.x, ai.y, ai.vy, ai.onGround,
      aiMove.moveRight, aiMove.moveLeft, aiMove.jump,
      ai.reverseTimer > 0,
      ai.stunTimer > 0 || ai.pushTimer > 0,
      delta,
      aiSpeedMult,
    )
    ai.x = aiResult.x; ai.y = aiResult.y; ai.vy = aiResult.vy
    ai.onGround = aiResult.onGround; ai.progress = aiResult.progress

    const aiCoins = checkCoinCollection(ai.x, ai.y, mg2.coins)
    ai.score += aiCoins.collected * 15
    ai.coinsCollected += aiCoins.collected
    mg2 = { ...mg2, coins: aiCoins.coins, scrollX: Math.max(0, ai.x - 5) }

    const aiObsResult = checkObstacleCollision(ai.x, ai.y, mg2.obstacles)
    if (aiObsResult.rampBounce) {
      ai.vy = 18
    } else if (aiObsResult.hit && ai.onGround) {
      ai.x = Math.max(0, ai.x - 2)
      ai.vy = 5
    }

    // AI speed pad
    if (checkSpeedPad(ai.x, ai.y, mg2.speedPads) && ai.speedPadTimer <= 0) {
      ai.speedPadTimer = SPEED_PAD_DURATION
    }

    // AI power-up collection
    const aiPowerUp = checkPowerUpCollection(ai.x, ai.y, mg2.powerUps)
    if (aiPowerUp.collected) {
      mg2 = { ...mg2, powerUps: aiPowerUp.powerUps }
      switch (aiPowerUp.collected.kind) {
        case 'speed':
          ai.speedBuffTimer = 3
          break
        case 'shield':
          ai.shieldBuff = true
          break
        case 'stun':
          p.stunTimer = Math.max(p.stunTimer, 0.5)
          break
      }
    }

    // --- AI physical actions ---
    const aiAction = aiDecidePhysical(ai, p, elapsed)
    const logs = s.physicalLog
      .map(l => ({ ...l, timer: l.timer - delta }))
      .filter(l => l.timer > 0)

    if (aiAction) {
      // Check player taunt immunity
      if (p.tauntImmunityTimer > 0) {
        logs.push({ text: 'YOU BLOCK IT!', timer: 1, side: 'right' })
      } else {
        const aiActionEmojis: Record<string, string> = {
          push: '👋', cover: '🙈', pillow: '🛋️', tickle: '🤣',
        }
        switch (aiAction) {
          case 'push':
            if (tryAbsorbWithShield(p)) {
              logs.push({ text: 'YOUR SHIELD BLOCKS!', timer: 1.5, side: 'right' })
            } else {
              p.pushTimer = 0.6; p.vy = 3
              logs.push({ text: 'AI PUSHES YOU!', timer: 1.5, side: 'right' })
            }
            ai.pushCooldown = 3
            ai.physicalActionsUsed++
            ai.tauntImmunityTimer = 1.5
            sfx.pushSound()
            break
          case 'cover':
            if (tryAbsorbWithShield(p)) {
              logs.push({ text: 'YOUR SHIELD BLOCKS!', timer: 1.5, side: 'right' })
            } else {
              p.blindTimer = 1
              logs.push({ text: 'AI COVERS YOUR EYES!', timer: 1.5, side: 'right' })
            }
            ai.coverCooldown = 5
            ai.physicalActionsUsed++
            ai.tauntImmunityTimer = 1.5
            sfx.coverEyes()
            break
          case 'pillow':
            if (tryAbsorbWithShield(p)) {
              logs.push({ text: 'YOUR SHIELD BLOCKS!', timer: 1.5, side: 'right' })
            } else {
              p.stunTimer = 1.2
              logs.push({ text: 'AI PILLOW ATTACK!', timer: 1.5, side: 'right' })
            }
            ai.pillowCooldown = 4
            ai.physicalActionsUsed++
            ai.tauntImmunityTimer = 1.5
            sfx.pillowHit()
            break
          case 'tickle':
            if (tryAbsorbWithShield(p)) {
              logs.push({ text: 'YOUR SHIELD BLOCKS!', timer: 1.5, side: 'right' })
            } else {
              p.reverseTimer = 2
              logs.push({ text: 'AI TICKLES YOU!', timer: 2, side: 'right' })
            }
            ai.tickleCooldown = 6
            ai.physicalActionsUsed++
            ai.tauntImmunityTimer = 1.5
            sfx.tickleSound()
            break
        }
        // Track AI recent actions
        ai.recentActions.push({ emoji: aiActionEmojis[aiAction] || '?', timer: 3 })
        if (ai.recentActions.length > 3) ai.recentActions.shift()
      }
    }

    // Close race detection (within 5% progress of each other)
    const progressDiff = Math.abs(p.progress - ai.progress)
    const isCloseRace = progressDiff < 5 && p.progress > 20 && ai.progress > 20
    let closeRaceSoundCd = Math.max(0, s.closeRaceSoundCooldown - delta)
    if (isCloseRace && closeRaceSoundCd <= 0) {
      sfx.closeRace()
      closeRaceSoundCd = 2 // play heartbeat every 2s
    }

    // Win check with photo finish detection
    let winner = s.winner
    let phase: GamePhase = 'playing'
    const ft = { ...s.finishTimes }
    let isPhotoFinish = s.photoFinish

    if (p.x >= FINISH_LINE && ft.player === null) {
      ft.player = elapsed
    }
    if (ai.x >= FINISH_LINE && ft.ai === null) {
      ft.ai = elapsed
    }

    // Check for finish
    if (ft.player !== null && ft.ai === null && elapsed - ft.player > 2) {
      // Player finished, AI didn't within 2s -> player wins
      winner = 'player'; phase = 'result'
      sfx.finish()
      saveBestTime(elapsed)
    } else if (ft.ai !== null && ft.player === null && elapsed - ft.ai > 2) {
      // AI finished, player didn't within 2s -> AI wins
      winner = 'ai'; phase = 'result'
      sfx.finish()
    } else if (ft.player !== null && ft.ai !== null) {
      // Both finished - check for photo finish
      const gap = Math.abs(ft.player - ft.ai)
      if (gap < 2) {
        isPhotoFinish = true
        sfx.photoFinish()
      }
      winner = ft.player <= ft.ai ? 'player' : 'ai'
      phase = 'result'
      sfx.finish()
      if (winner === 'player') saveBestTime(elapsed)
    } else if (ft.player !== null && ft.ai === null) {
      // Player just finished, wait up to 2s for AI
      // (handled above on next tick)
    } else if (ft.ai !== null && ft.player === null) {
      // AI just finished, wait up to 2s for player
    }

    set({
      phase, elapsed, player: p, ai,
      miniGame1: mg1, miniGame2: mg2,
      winner, physicalLog: logs,
      bestTime: winner === 'player' ? (loadBestTime()) : s.bestTime,
      photoFinish: isPhotoFinish,
      closeRaceActive: isCloseRace,
      closeRaceSoundCooldown: closeRaceSoundCd,
      finishTimes: ft,
    })
  },
}))
