import { useEffect, useRef, useCallback } from 'react'
import { useGameStore, TUTORIAL_STEPS } from '../store/gameStore.ts'
import { EVENT_NAMES, EVENT_CONTROLS } from '../data/events.ts'
import { SABOTAGE_DEFS } from '../types/game.ts'
import GameScene from './GameScene.tsx'

export default function HUD() {
  const phase = useGameStore((s) => s.phase)
  const currentEventIndex = useGameStore((s) => s.currentEventIndex)
  const events = useGameStore((s) => s.events)
  const playerScores = useGameStore((s) => s.playerScores)
  const aiScores = useGameStore((s) => s.aiScores)
  const player = useGameStore((s) => s.player)
  const ai = useGameStore((s) => s.ai)
  const event = useGameStore((s) => s.event)
  const sabotageUses = useGameStore((s) => s.sabotageUses)
  const startGame = useGameStore((s) => s.startGame)
  const tick = useGameStore((s) => s.tick)
  const useSabotage = useGameStore((s) => s.useSabotage)
  const advanceIntro = useGameStore((s) => s.advanceIntro)
  const advanceResult = useGameStore((s) => s.advanceResult)
  const paused = useGameStore((s) => s.paused)
  const showTutorial = useGameStore((s) => s.showTutorial)
  const tutorialStep = useGameStore((s) => s.tutorialStep)
  const highScore = useGameStore((s) => s.highScore)
  const totalSabotagesUsed = useGameStore((s) => s.totalSabotagesUsed)
  const togglePause = useGameStore((s) => s.togglePause)
  const nextTutorialStep = useGameStore((s) => s.nextTutorialStep)
  const dismissTutorial = useGameStore((s) => s.dismissTutorial)
  const returnToTitle = useGameStore((s) => s.returnToTitle)
  const showTutorialFromTitle = useGameStore((s) => s.showTutorialFromTitle)

  const keysRef = useRef<Record<string, boolean>>({})
  const prevKeysRef = useRef<Record<string, boolean>>({})
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  // Key handlers
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true
      // Escape for pause
      if (e.key === 'Escape') {
        togglePause()
        return
      }
      // R restart
      if (e.key === 'r' || e.key === 'R') {
        const store = useGameStore.getState()
        if (store.phase === 'final_result') { store.startGame(); return }
      }
      // Sabotage keys (only when not paused)
      const store = useGameStore.getState()
      if (store.paused) return
      if (e.key === '1') useSabotage(1)
      if (e.key === '2') useSabotage(2)
      if (e.key === '3') useSabotage(3)
      // Prevent scrolling
      if (['ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault()
      }
    }
    const onUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [useSabotage, togglePause])

  const gameLoop = useCallback((time: number) => {
    if (lastTimeRef.current === 0) lastTimeRef.current = time
    const delta = Math.min((time - lastTimeRef.current) / 1000, 0.05)
    lastTimeRef.current = time

    const store = useGameStore.getState()
    const keys = keysRef.current
    const prev = prevKeysRef.current

    if (store.phase === 'playing' && !store.paused) {
      const spaceJustPressed = keys[' '] && !prev[' ']
      const spaceJustReleased = !keys[' '] && prev[' ']
      const shiftJustPressed = keys['Shift'] && !prev['Shift']
      const shiftPressed = !!keys['Shift']
      tick(delta, keys, spaceJustPressed, spaceJustReleased, shiftJustPressed, shiftPressed)
    } else if (store.phase === 'event_intro') {
      advanceIntro(delta)
    } else if (store.phase === 'event_result') {
      advanceResult(delta)
    }

    prevKeysRef.current = { ...keys }
    rafRef.current = requestAnimationFrame(gameLoop)
  }, [tick, advanceIntro, advanceResult])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(gameLoop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [gameLoop])

  const totalPlayer = playerScores.reduce((a, b) => a + b, 0)
  const totalAI = aiScores.reduce((a, b) => a + b, 0)

  // Determine which sabotage list to show
  const sabotageIndex = phase === 'playing'
    ? events.indexOf(event.type)
    : (currentEventIndex < events.length ? currentEventIndex : 0)
  const currentSabotages = SABOTAGE_DEFS[sabotageIndex] ?? SABOTAGE_DEFS[0]

  return (
    <div className="game-container">
      {/* 3D Canvas area */}
      {(phase === 'playing' || phase === 'event_result') && (
        <div className="canvas-area">
          <GameScene />
        </div>
      )}

      {/* ─── TITLE SCREEN ─── */}
      {phase === 'title' && !showTutorial && (
        <div className="overlay title-overlay">
          <h1 className="title-text">QUAD CLASH</h1>
          <p className="subtitle">4-Event Athletic Competition with Sabotage</p>
          <div className="event-list-preview">
            {events.map((ev, i) => (
              <span key={ev} className="event-tag">{i + 1}. {EVENT_NAMES[ev]}</span>
            ))}
          </div>

          {highScore !== null && (
            <div style={{
              marginTop: 10, padding: '10px 20px', borderRadius: 12,
              background: 'rgba(255,215,64,0.12)', border: '1px solid rgba(255,215,64,0.35)',
              fontSize: 16, fontWeight: 800, color: '#ffd740',
              textShadow: '0 0 10px rgba(255,215,64,0.4)',
            }}>
              High Score: {highScore} pts
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="start-button" onClick={startGame}>
              START GAME
            </button>
            <button className="start-button" onClick={showTutorialFromTitle}
              style={{ background: 'rgba(255,255,255,0.1)', color: '#8b89a0', boxShadow: 'none' }}>
              HOW TO PLAY
            </button>
          </div>
          <div className="controls-hint" style={{ marginTop: 8 }}>
            <p>Space / Shift = Action keys</p>
            <p>Arrow keys = Direction</p>
            <p>1 / 2 = Sabotage | Esc = Pause</p>
          </div>
        </div>
      )}

      {/* ─── TUTORIAL OVERLAY (on title) ─── */}
      {phase === 'title' && showTutorial && (
        <div className="overlay" style={{
          background: 'radial-gradient(circle at 30% 20%, rgba(79, 195, 247, 0.12), transparent 50%), radial-gradient(circle at 70% 70%, rgba(179, 136, 255, 0.12), transparent 50%), var(--bg-primary)',
        }}>
          <div style={{
            maxWidth: 460, padding: '32px 28px', borderRadius: 18,
            background: 'rgba(20,24,41,0.95)',
            border: '2px solid rgba(79,195,247,0.45)',
            boxShadow: '0 0 50px rgba(79,195,247,0.2)',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 32, fontWeight: 900, letterSpacing: '0.06em',
              background: 'linear-gradient(140deg, #8de6ff 0%, #b388ff 55%, #ffd740 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 16,
            }}>
              QUAD CLASH
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#4fc3f7', marginBottom: 4, letterSpacing: '0.1em' }}>
              HOW TO PLAY ({tutorialStep + 1}/{TUTORIAL_STEPS.length})
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.6, margin: '14px 0 22px', color: '#e8e6f0' }}>
              {TUTORIAL_STEPS[tutorialStep]}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="start-button" onClick={nextTutorialStep}
                style={{ padding: '12px 24px', fontSize: 15 }}>
                {tutorialStep < TUTORIAL_STEPS.length - 1 ? 'NEXT' : 'LET\'S GO!'}
              </button>
              {tutorialStep < TUTORIAL_STEPS.length - 1 && (
                <button className="start-button" onClick={dismissTutorial}
                  style={{ padding: '12px 18px', fontSize: 13, background: 'rgba(255,255,255,0.1)', color: '#8b89a0', boxShadow: 'none' }}>
                  SKIP
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Event intro overlay */}
      {phase === 'event_intro' && (
        <div className="overlay intro-overlay">
          <div className="intro-badge">EVENT {currentEventIndex + 1} / {events.length}</div>
          <h2 className="intro-event-name">
            {EVENT_NAMES[events[currentEventIndex]]}
          </h2>
          <div className="intro-controls">
            {EVENT_CONTROLS[events[currentEventIndex]].map((c) => (
              <span key={c} className="control-tag">{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Playing HUD */}
      {phase === 'playing' && (
        <div className="hud">
          {/* Top bar */}
          <div className="hud-top">
            <div className="hud-event-name">{EVENT_NAMES[event.type]}</div>
            <div className="hud-scores">
              <span className="score-player">YOU: {totalPlayer}</span>
              <span className="score-ai">AI: {totalAI}</span>
            </div>
          </div>

          {/* Controls for current event */}
          <div className="hud-controls-bar" style={{
            position: 'absolute', top: 48, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 8, pointerEvents: 'none',
          }}>
            {EVENT_CONTROLS[event.type].map((c) => (
              <span key={c} style={{
                padding: '4px 10px', borderRadius: 6,
                fontSize: 12, fontWeight: 700,
                color: '#69f0ae',
                background: 'rgba(105, 240, 174, 0.12)',
                border: '1px solid rgba(105, 240, 174, 0.25)',
              }}>{c}</span>
            ))}
            <span style={{
              padding: '4px 10px', borderRadius: 6,
              fontSize: 12, fontWeight: 700,
              color: '#ffd740',
              background: 'rgba(255, 215, 64, 0.12)',
              border: '1px solid rgba(255, 215, 64, 0.25)',
            }}>1-2: Sabotage</span>
            <span style={{
              padding: '4px 10px', borderRadius: 6,
              fontSize: 12, fontWeight: 700,
              color: '#b0b0b0',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}>Esc: Pause</span>
          </div>

          {/* Event-specific stats */}
          <div className="hud-stats">
            {event.type === 'dash' && (
              <>
                <div className="stat-row">
                  <span className="stat-label">Distance</span>
                  <span className="stat-value">{player.position.toFixed(1)}m / 100m</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Speed</span>
                  <div className="power-bar" style={{ width: 160, height: 16 }}>
                    <div className="power-fill" style={{ width: `${Math.min(100, player.speed)}%` }} />
                  </div>
                </div>
                <div className="stat-row">
                  <span className="stat-label">AI Distance</span>
                  <span className="stat-value">{ai.position.toFixed(1)}m</span>
                </div>
              </>
            )}
            {event.type === 'javelin' && !event.thrown && (
              <>
                <div className="stat-row">
                  <span className="stat-label">Power</span>
                  <div className="power-bar" style={{ width: 180, height: 18, borderRadius: 9 }}>
                    <div className="power-fill" style={{ width: `${event.power}%`, borderRadius: 9 }} />
                  </div>
                  <span className="stat-value" style={{ minWidth: 40 }}>{event.power.toFixed(0)}%</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Angle</span>
                  <span className="stat-value" style={{ fontSize: 18 }}>{event.angle.toFixed(0)}&deg;</span>
                </div>
              </>
            )}
            {event.type === 'javelin' && event.thrown && (
              <>
                <div className="stat-row">
                  <span className="stat-label">Your throw</span>
                  <span className="stat-value">{event.playerResult.toFixed(1)}m</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">AI throw</span>
                  <span className="stat-value">{event.aiResult.toFixed(1)}m</span>
                </div>
              </>
            )}
            {event.type === 'highJump' && (
              <>
                <div className="stat-row">
                  <span className="stat-label">Bar Height</span>
                  <span className="stat-value">{event.barHeight.toFixed(2)}m</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Best</span>
                  <span className="stat-value">{event.bestHeight.toFixed(2)}m</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Attempts</span>
                  <span className="stat-value">{event.attempts} / {event.maxAttempts}</span>
                </div>
              </>
            )}
            {event.type === 'marathon' && (
              <>
                <div className="stat-row">
                  <span className="stat-label">Distance</span>
                  <span className="stat-value">{(player.position).toFixed(0)}m / 3000m</span>
                </div>
                {/* Marathon progress bar */}
                <div className="stat-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                  <span className="stat-label" style={{ fontSize: 11 }}>Progress</span>
                  <div style={{
                    position: 'relative', width: '100%', height: 14,
                    background: 'rgba(255,255,255,0.1)', borderRadius: 7, overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 7,
                      width: `${Math.min(100, (player.position / 3000) * 100)}%`,
                      background: 'linear-gradient(90deg, #4fc3f7, #69f0ae)',
                      transition: 'width 0.1s',
                    }} />
                    <div style={{
                      position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 7,
                      width: `${Math.min(100, (ai.position / 3000) * 100)}%`,
                      background: '#ff5252', opacity: 0.4,
                      transition: 'width 0.1s',
                    }} />
                    {/* Player marker */}
                    <div style={{
                      position: 'absolute',
                      left: `${Math.min(97, (player.position / 3000) * 100)}%`,
                      top: -1, width: 3, height: 16, background: '#4fc3f7', borderRadius: 2,
                    }} />
                    {/* AI marker */}
                    <div style={{
                      position: 'absolute',
                      left: `${Math.min(97, (ai.position / 3000) * 100)}%`,
                      top: -1, width: 3, height: 16, background: '#ff5252', borderRadius: 2,
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                    <span style={{ color: '#4fc3f7' }}>You</span>
                    <span style={{ color: '#8b89a0' }}>{Math.max(0, 3000 - player.position).toFixed(0)}m left</span>
                    <span style={{ color: '#ff5252' }}>AI</span>
                  </div>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Stamina</span>
                  <div className="stamina-bar" style={{ width: 160, height: 14 }}>
                    <div
                      className="stamina-fill"
                      style={{
                        width: `${player.stamina}%`,
                        background: player.stamina > 50 ? '#69f0ae' : player.stamina > 20 ? '#ffd740' : '#ff5252',
                      }}
                    />
                  </div>
                </div>
                <div className="stat-row">
                  <span className="stat-label">AI Dist</span>
                  <span className="stat-value">{ai.position.toFixed(0)}m</span>
                </div>
              </>
            )}
          </div>

          {/* Sabotage buttons */}
          <div className="hud-sabotage">
            <div className="sabotage-label">SABOTAGE ({sabotageUses} left)</div>
            <div className="sabotage-buttons">
              {currentSabotages.map((s, i) => (
                <button
                  key={s.id}
                  className="sabotage-btn"
                  onClick={() => useSabotage((i + 1) as 1 | 2 | 3)}
                  disabled={sabotageUses <= 0 || event.phase !== 'running'}
                  title={s.description}
                  style={{ minWidth: 90 }}
                >
                  <span className="sabotage-key">{i + 1}</span>
                  <span className="sabotage-name">{s.name}</span>
                  <span style={{ fontSize: 10, opacity: 0.7, color: '#ccc', marginTop: 2 }}>{s.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Debuff indicator */}
          {player.debuffType && (
            <div className="debuff-indicator" style={{
              fontSize: 28,
              padding: '16px 32px',
              background: 'rgba(255, 82, 82, 0.25)',
              border: '2px solid rgba(255, 82, 82, 0.6)',
              borderRadius: 16,
              textShadow: '0 0 20px rgba(255, 82, 82, 0.8)',
            }}>
              {player.debuffType === 'banana' && 'BANANA! \uD83C\uDF4C'}
              {player.debuffType === 'headwind' && 'HEADWIND! \uD83D\uDCA8'}
              {player.debuffType === 'smokescreen' && 'SMOKESCREEN! \uD83C\uDF2B\uFE0F'}
              {player.debuffType === 'shaky' && 'SHAKY! \uD83D\uDE35'}
              {player.debuffType === 'wall' && 'WALL! \uD83E\uDDF1'}
              {player.debuffType === 'gravity' && 'GRAVITY! \u2B07\uFE0F'}
              {player.debuffType === 'raise' && 'BAR RAISED! \u2B06\uFE0F'}
              {player.debuffType === 'slip' && 'SLIP! \uD83D\uDCA6'}
              {player.debuffType === 'gust' && 'GUST! \uD83D\uDCA8'}
              {player.debuffType === 'pothole' && 'POTHOLE! \uD83D\uDD73\uFE0F'}
              {player.debuffType === 'fatigue' && 'FATIGUE! \uD83D\uDE29'}
              {player.debuffType === 'reverse' && 'REVERSE! \u21A9\uFE0F'}
              {!['banana','headwind','smokescreen','shaky','wall','gravity','raise','slip','gust','pothole','fatigue','reverse'].includes(player.debuffType) && `${player.debuffType.toUpperCase()}!`}
              <div style={{ fontSize: 14, marginTop: 4 }}>({player.debuffTimer.toFixed(1)}s)</div>
            </div>
          )}

          {/* ─── PAUSE OVERLAY ─── */}
          {paused && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 50,
              background: 'rgba(10,14,26,0.85)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'auto',
            }}>
              <div style={{
                padding: '36px 48px', borderRadius: 18,
                background: 'rgba(20,24,41,0.95)',
                border: '2px solid rgba(79,195,247,0.4)',
                textAlign: 'center',
              }}>
                <div style={{
                  fontSize: 32, fontWeight: 900, letterSpacing: '0.06em',
                  background: 'linear-gradient(140deg, #4fc3f7, #b388ff)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: 20,
                }}>
                  PAUSED
                </div>
                <button className="start-button" onClick={togglePause}
                  style={{ padding: '12px 32px', fontSize: 16, marginRight: 10 }}>
                  RESUME
                </button>
                <button className="start-button" onClick={returnToTitle}
                  style={{ padding: '12px 24px', fontSize: 14, background: 'rgba(255,255,255,0.1)', color: '#8b89a0', boxShadow: 'none' }}>
                  QUIT
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── EVENT RESULT with scoreboard ─── */}
      {phase === 'event_result' && (() => {
        const isTime = event.type === 'dash' || event.type === 'marathon'
        const playerWon = isTime
          ? event.playerResult <= event.aiResult
          : event.playerResult >= event.aiResult
        const lastPlayerPts = playerScores[playerScores.length - 1]
        const lastAiPts = aiScores[aiScores.length - 1]

        // Determine next event name (if exists)
        const nextIdx = playerScores.length // playerScores already has the latest
        const hasNext = nextIdx < events.length
        const nextEventName = hasNext ? EVENT_NAMES[events[nextIdx]] : null

        return (
          <div className="overlay result-overlay">
            <h2 className="result-title">{EVENT_NAMES[event.type]} - RESULT</h2>
            <div style={{
              fontSize: 24, fontWeight: 900, marginBottom: 8,
              color: playerWon ? '#69f0ae' : '#ff5252',
            }}>
              {playerWon ? 'YOU WIN 1ST!' : 'AI TAKES 1ST!'}
            </div>
            <div className="result-details">
              <div className="result-row" style={{
                border: playerWon ? '1px solid rgba(105,240,174,0.4)' : '1px solid rgba(255,255,255,0.12)',
              }}>
                <span className="result-label">YOU {playerWon ? '(1st)' : '(2nd)'}</span>
                <span className="result-value">
                  {isTime ? `${event.playerResult.toFixed(2)}s` : `${event.playerResult.toFixed(2)}m`}
                </span>
                <span className="result-pts">+{lastPlayerPts} pts</span>
              </div>
              <div className="result-row" style={{
                border: !playerWon ? '1px solid rgba(255,82,82,0.4)' : '1px solid rgba(255,255,255,0.12)',
              }}>
                <span className="result-label ai-label">AI {!playerWon ? '(1st)' : '(2nd)'}</span>
                <span className="result-value">
                  {isTime ? `${event.aiResult.toFixed(2)}s` : `${event.aiResult.toFixed(2)}m`}
                </span>
                <span className="result-pts">+{lastAiPts} pts</span>
              </div>
            </div>

            {/* Full scoreboard */}
            <div style={{
              marginTop: 14, padding: '14px 18px', borderRadius: 12,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
              minWidth: 340, fontFamily: 'Consolas, "Courier New", monospace',
            }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#ffd740', textAlign: 'center', marginBottom: 10, letterSpacing: '0.1em' }}>
                EVENT RESULTS
              </div>
              {events.map((ev, i) => {
                if (i >= playerScores.length) return null
                return (
                  <div key={ev} style={{
                    display: 'flex', justifyContent: 'space-between', fontSize: 13,
                    padding: '3px 0', borderBottom: i < playerScores.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}>
                    <span style={{ color: '#8b89a0', minWidth: 120 }}>{i + 1}. {EVENT_NAMES[ev]}</span>
                    <span style={{ color: '#4fc3f7', fontWeight: 700, minWidth: 70 }}>YOU {playerScores[i]}</span>
                    <span style={{ color: '#ff5252', fontWeight: 700, minWidth: 60 }}>AI {aiScores[i]}</span>
                  </div>
                )
              })}
              <div style={{
                display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 900,
                marginTop: 8, paddingTop: 8, borderTop: '2px solid rgba(255,255,255,0.15)',
              }}>
                <span style={{ color: '#8b89a0' }}>Total:</span>
                <span style={{ color: '#4fc3f7' }}>YOU {totalPlayer}</span>
                <span style={{ color: '#ff5252' }}>AI {totalAI}</span>
              </div>
              {nextEventName && (
                <div style={{ textAlign: 'center', marginTop: 10, fontSize: 13, color: '#b388ff', fontWeight: 700 }}>
                  Next: {nextEventName}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ─── FINAL RESULT ─── */}
      {phase === 'final_result' && (
        <div className="overlay final-overlay">
          <h1 className="final-title">
            {totalPlayer > totalAI ? 'YOU WIN!' : totalPlayer < totalAI ? 'AI WINS!' : 'DRAW!'}
          </h1>
          <div className="final-scores">
            <div className="final-score-card player-card">
              <div className="final-score-label">YOU</div>
              <div className="final-score-total">{totalPlayer}</div>
            </div>
            <div className="final-vs">VS</div>
            <div className="final-score-card ai-card">
              <div className="final-score-label">AI</div>
              <div className="final-score-total">{totalAI}</div>
            </div>
          </div>
          <div className="final-breakdown">
            {events.map((ev, i) => (
              <div key={ev} className="breakdown-row">
                <span className="breakdown-event">{EVENT_NAMES[ev]}</span>
                <span className="breakdown-player">{playerScores[i] ?? '-'}</span>
                <span className="breakdown-separator">-</span>
                <span className="breakdown-ai">{aiScores[i] ?? '-'}</span>
              </div>
            ))}
          </div>

          {/* Extra stats */}
          <div style={{
            display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: '#8b89a0',
          }}>
            <span>Sabotages Used: {totalSabotagesUsed}</span>
            {highScore !== null && (
              <span style={{ color: '#ffd740' }}>High Score: {highScore}</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="start-button" onClick={startGame}>
              PLAY AGAIN
            </button>
            <button className="start-button" onClick={returnToTitle}
              style={{ background: 'rgba(255,255,255,0.1)', color: '#8b89a0', boxShadow: 'none' }}>
              TITLE
            </button>
          </div>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 8, color: '#8b89a0' }}>[R] Quick Restart</div>
        </div>
      )}
    </div>
  )
}
