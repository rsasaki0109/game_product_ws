import { create } from 'zustand'
import type { GameState, EventType } from '../types/game.ts'
import { tickDash } from '../logic/dash.ts'
import { tickJavelin } from '../logic/javelin.ts'
import { tickHighJump } from '../logic/highJump.ts'
import { tickMarathon } from '../logic/marathon.ts'
import { tickAISabotage } from '../logic/aiAthlete.ts'
import {
  applySabotageToDash,
  applySabotageToJavelin,
  applySabotageToHighJump,
  applySabotageToMarathon,
} from '../logic/sabotage.ts'
import * as sfx from '../logic/sound.ts'

function createAthlete() {
  return {
    position: 0,
    speed: 0,
    stamina: 100,
    score: 0,
    stunTimer: 0,
    debuffTimer: 0,
    debuffType: null,
  }
}

function createEventState(type: EventType) {
  return {
    type,
    phase: 'ready' as const,
    elapsed: 0,
    playerResult: 0,
    aiResult: 0,
    power: 0,
    powerDir: 1,
    angle: 40,
    thrown: false,
    barHeight: 1.5,
    attempts: 0,
    maxAttempts: 3,
    jumpPhase: 'approach' as const,
    jumpPower: 0,
    bestHeight: 0,
    aiBestHeight: 0,
    aiAttempts: 0,
    aiBarHeight: 1.5,
    aiJumping: false,
    aiJumpTimer: 0,
    courseLength: 3000,
  }
}

const EVENTS: EventType[] = ['dash', 'javelin', 'highJump', 'marathon']

let _lastStepTime = 0
let _prevEventPhase = ''
let _prevThrown = false
let _prevJumpPhase = ''

function loadHighScore(): number | null {
  try {
    const v = localStorage.getItem('quad-clash-highscore')
    return v ? parseInt(v, 10) : null
  } catch { return null }
}

function saveHighScore(score: number) {
  try {
    const prev = loadHighScore()
    if (prev === null || score > prev) {
      localStorage.setItem('quad-clash-highscore', score.toString())
    }
  } catch { /* noop */ }
}

function loadTutorialSeen(): boolean {
  try { return localStorage.getItem('quad-clash-tutorial-seen') === '1' } catch { return true }
}

function saveTutorialSeen() {
  try { localStorage.setItem('quad-clash-tutorial-seen', '1') } catch { /* noop */ }
}

const TUTORIAL_STEPS = [
  'Compete in 4 events against the AI!',
  'Each event has unique controls - shown at the top',
  'You get 2 sabotage items per event. Press 1-2 to use them!',
  'Win the most points across all 4 events!',
]

export { TUTORIAL_STEPS }

interface GameActions {
  startGame: () => void
  startEvent: () => void
  tick: (delta: number, keys: Record<string, boolean>, spaceJustPressed: boolean, spaceJustReleased: boolean, shiftJustPressed: boolean, shiftPressed: boolean) => void
  useSabotage: (index: 1 | 2 | 3) => void
  finishEvent: () => void
  advanceIntro: (delta: number) => void
  advanceResult: (delta: number) => void
  togglePause: () => void
  nextTutorialStep: () => void
  dismissTutorial: () => void
  returnToTitle: () => void
  showTutorialFromTitle: () => void
}

interface ExtraState {
  paused: boolean
  showTutorial: boolean
  tutorialStep: number
  highScore: number | null
  totalSabotagesUsed: number
}

export const useGameStore = create<GameState & GameActions & ExtraState>((set, get) => ({
  phase: 'title',
  currentEventIndex: 0,
  events: EVENTS,
  playerScores: [],
  aiScores: [],
  player: createAthlete(),
  ai: createAthlete(),
  event: createEventState('dash'),
  sabotageUses: 2,
  aiSabotageUses: 2,
  introTimer: 0,
  resultTimer: 0,
  paused: false,
  showTutorial: !loadTutorialSeen(),
  tutorialStep: 0,
  highScore: loadHighScore(),
  totalSabotagesUsed: 0,

  startGame: () => {
    const showTut = !loadTutorialSeen()
    set({
      phase: showTut ? 'title' : 'event_intro',
      currentEventIndex: 0,
      playerScores: [],
      aiScores: [],
      player: createAthlete(),
      ai: createAthlete(),
      event: createEventState(EVENTS[0]),
      sabotageUses: 2,
      aiSabotageUses: 2,
      introTimer: 0,
      resultTimer: 0,
      paused: false,
      showTutorial: showTut,
      tutorialStep: 0,
      totalSabotagesUsed: 0,
    })
    // If no tutorial needed, start intro immediately
    if (!showTut) {
      set({ phase: 'event_intro' })
    }
  },

  returnToTitle: () => {
    set({ phase: 'title', highScore: loadHighScore() })
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
      set({ showTutorial: false, phase: 'event_intro' })
    } else {
      set({ tutorialStep: s.tutorialStep + 1 })
    }
  },

  dismissTutorial: () => {
    saveTutorialSeen()
    set({ showTutorial: false, phase: 'event_intro' })
  },

  showTutorialFromTitle: () => {
    set({ showTutorial: true, tutorialStep: 0 })
  },

  startEvent: () => {
    const s = get()
    const eventType = s.events[s.currentEventIndex]
    set({
      phase: 'playing',
      player: createAthlete(),
      ai: createAthlete(),
      event: createEventState(eventType),
      sabotageUses: 2,
      aiSabotageUses: 2,
    })
  },

  tick: (delta, keys, spaceJustPressed, spaceJustReleased, shiftJustPressed, shiftPressed) => {
    const s = get()
    if (s.phase !== 'playing') return
    if (s.paused) return
    if (s.event.phase === 'finished') return

    // Deep clone relevant mutable state
    const player = { ...s.player }
    const ai = { ...s.ai }
    const event = { ...s.event }
    const mutableState: GameState = {
      ...s,
      player,
      ai,
      event,
    }

    const prevPhase = _prevEventPhase
    const prevThrown = _prevThrown
    const prevJumpPhase = _prevJumpPhase
    _prevEventPhase = event.phase
    _prevThrown = event.thrown
    _prevJumpPhase = event.jumpPhase

    switch (event.type) {
      case 'dash':
        tickDash(mutableState, delta, keys, spaceJustPressed, shiftJustPressed)
        // Run step sound throttled
        if (mutableState.event.phase === 'running' && mutableState.player.stunTimer <= 0) {
          const now = performance.now()
          if (now - _lastStepTime > 150) {
            sfx.runStep()
            _lastStepTime = now
          }
        }
        // Boost sound
        if (shiftJustPressed && player.stamina > 0) {
          sfx.boost()
        }
        break
      case 'javelin':
        tickJavelin(mutableState, delta, keys, keys[' '] || keys['Space'], spaceJustReleased)
        // Throw sound
        if (!prevThrown && mutableState.event.thrown) {
          sfx.throwSound()
        }
        break
      case 'highJump':
        tickHighJump(mutableState, delta, keys, spaceJustPressed)
        // Takeoff sound
        if (prevJumpPhase === 'takeoff' && mutableState.event.jumpPhase === 'flight') {
          sfx.jumpTakeoff()
        }
        // Bar clear/fail - check when flight ends
        if (prevJumpPhase === 'flight' && mutableState.event.jumpPhase !== 'flight') {
          if (mutableState.event.bestHeight > (s.event.bestHeight || 0)) {
            sfx.barClear()
          } else if (mutableState.event.phase !== 'finished') {
            sfx.barFail()
          }
        }
        if (prevJumpPhase === 'flight' && mutableState.event.phase === 'finished') {
          if (mutableState.event.bestHeight >= mutableState.event.aiBestHeight) {
            sfx.barClear()
          } else {
            sfx.barFail()
          }
        }
        break
      case 'marathon':
        tickMarathon(mutableState, delta, keys, shiftPressed)
        // Run step sound throttled
        if (mutableState.event.phase === 'running' && mutableState.player.stunTimer <= 0) {
          const now = performance.now()
          if (now - _lastStepTime > 150) {
            sfx.runStep()
            _lastStepTime = now
          }
        }
        if (shiftPressed && player.stamina > 10) {
          // boost sound on sprint start (throttled)
        }
        break
    }

    // Event start sound
    if (prevPhase === 'ready' && mutableState.event.phase === 'running') {
      sfx.eventStart()
    }

    // AI sabotage
    const prevAiSab = mutableState.aiSabotageUses
    tickAISabotage(mutableState, delta)
    if (mutableState.aiSabotageUses < prevAiSab) {
      sfx.sabotageHit()
    }

    set({
      player: mutableState.player,
      ai: mutableState.ai,
      event: mutableState.event,
      aiSabotageUses: mutableState.aiSabotageUses,
    })

    // Auto-finish
    if (mutableState.event.phase === 'finished') {
      setTimeout(() => get().finishEvent(), 100)
    }
  },

  useSabotage: (index) => {
    const s = get()
    if (s.sabotageUses <= 0) return
    if (s.event.phase !== 'running') return
    if (s.paused) return

    const ai = { ...s.ai }
    const event = { ...s.event }

    switch (s.event.type) {
      case 'dash':
        applySabotageToDash(ai, index)
        break
      case 'javelin':
        applySabotageToJavelin(ai, event, index, true)
        break
      case 'highJump':
        applySabotageToHighJump(ai, event, index, true)
        break
      case 'marathon':
        applySabotageToMarathon(ai, index)
        break
    }

    sfx.sabotageUse()

    set({
      ai,
      event,
      sabotageUses: s.sabotageUses - 1,
      totalSabotagesUsed: s.totalSabotagesUsed + 1,
    })
  },

  finishEvent: () => {
    const s = get()
    const ev = s.event

    let playerPts = 0
    let aiPts = 0

    // For dash and marathon: lower time is better
    // For javelin and highJump: higher distance/height is better
    if (ev.type === 'dash' || ev.type === 'marathon') {
      if (ev.playerResult <= ev.aiResult) {
        playerPts = 10
        aiPts = 6
      } else {
        playerPts = 6
        aiPts = 10
      }
      // Bonus for big margin
      const margin = Math.abs(ev.playerResult - ev.aiResult)
      if (margin > 2) {
        if (ev.playerResult < ev.aiResult) playerPts += 2
        else aiPts += 2
      }
    } else {
      if (ev.playerResult >= ev.aiResult) {
        playerPts = 10
        aiPts = 6
      } else {
        playerPts = 6
        aiPts = 10
      }
      const margin = Math.abs(ev.playerResult - ev.aiResult)
      if (ev.type === 'javelin' && margin > 10) {
        if (ev.playerResult > ev.aiResult) playerPts += 2
        else aiPts += 2
      }
      if (ev.type === 'highJump' && margin > 0.3) {
        if (ev.playerResult > ev.aiResult) playerPts += 2
        else aiPts += 2
      }
    }

    if (playerPts > aiPts) {
      sfx.eventWin()
    } else {
      sfx.eventLose()
    }

    const newPlayerScores = [...s.playerScores, playerPts]
    const newAiScores = [...s.aiScores, aiPts]

    const nextIndex = s.currentEventIndex + 1
    const allDone = nextIndex >= s.events.length

    set({
      phase: 'event_result',
      playerScores: newPlayerScores,
      aiScores: newAiScores,
      currentEventIndex: allDone ? s.currentEventIndex : nextIndex,
      resultTimer: 0,
    })

    if (allDone) {
      const totalPlayer = newPlayerScores.reduce((a, b) => a + b, 0)
      saveHighScore(totalPlayer)
      // Show result for 3s then final
      setTimeout(() => {
        set({ phase: 'final_result', highScore: loadHighScore() })
      }, 3000)
    }
  },

  advanceIntro: (delta) => {
    const s = get()
    const t = s.introTimer + delta
    if (t >= 2.0) {
      set({ introTimer: 0 })
      get().startEvent()
    } else {
      set({ introTimer: t })
    }
  },

  advanceResult: (delta) => {
    const s = get()
    if (s.phase !== 'event_result') return
    const t = s.resultTimer + delta
    if (t >= 3.0) {
      const allDone = s.currentEventIndex >= s.events.length
      if (allDone) {
        set({ phase: 'final_result', resultTimer: 0, highScore: loadHighScore() })
      } else {
        set({ phase: 'event_intro', introTimer: 0, resultTimer: 0 })
      }
    } else {
      set({ resultTimer: t })
    }
  },
}))
