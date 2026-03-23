import { useState, useEffect } from 'react'
import { useGameStore, TUTORIAL_STEPS } from '../store/gameStore.ts'
import { SKILLS } from '../logic/skills.ts'

function SkillPopup() {
  const [popup, setPopup] = useState<{ emoji: string; name: string; timer: number } | null>(null)

  useEffect(() => {
    // Subscribe to skill usage events
    const unsub = useGameStore.subscribe((state, prev) => {
      // Detect when AI gets newly frozen
      if (state.ai.freezeTimer > prev.ai.freezeTimer) {
        setPopup({ emoji: '\u{1F9CA}', name: 'FREEZE!', timer: 1 })
      } else if (state.ai.shakeTimer > prev.ai.shakeTimer) {
        setPopup({ emoji: '\u{1F30A}', name: 'SHAKE!', timer: 1 })
      }
      // Detect destroyed hold (aiWall changed with fewer holds)
      const prevAlive = prev.aiWall.holds.filter(h => !h.destroyed).length
      const currAlive = state.aiWall.holds.filter(h => !h.destroyed).length
      if (currAlive < prevAlive) {
        setPopup({ emoji: '\u{1F4A5}', name: 'DESTROY!', timer: 1 })
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!popup) return
    const t = setTimeout(() => setPopup(null), 1000)
    return () => clearTimeout(t)
  }, [popup])

  if (!popup) return null

  return (
    <div style={{
      position: 'absolute',
      top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      pointerEvents: 'none',
    }}>
      <div style={{ fontSize: 64 }}>{popup.emoji}</div>
      <div style={{
        fontSize: 22, fontWeight: 900,
        color: '#22d3ee',
        textShadow: '0 0 20px #22d3ee, 0 0 40px #22d3ee',
        marginTop: 4,
      }}>
        {popup.name}
      </div>
    </div>
  )
}

function Bar({ value, max, color, showValue }: { value: number; max: number; color: string; showValue?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 120,
        height: 12,
        background: 'rgba(0,0,0,0.5)',
        borderRadius: 6,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          transition: 'width 0.15s',
        }} />
      </div>
      {showValue && <span style={{ fontSize: 11, fontWeight: 700, minWidth: 28 }}>{Math.floor(value)}</span>}
    </div>
  )
}

function StaminaBar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const color = pct > 60 ? '#22c55e' : pct > 30 ? '#eab308' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 140,
        height: 14,
        background: 'rgba(0,0,0,0.5)',
        borderRadius: 7,
        overflow: 'hidden',
        border: `1px solid ${color}44`,
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color}, ${pct > 60 ? '#86efac' : pct > 30 ? '#fde047' : '#fca5a5'})`,
          transition: 'width 0.15s, background 0.3s',
          boxShadow: `0 0 6px ${color}66`,
        }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 900, color, minWidth: 28 }}>{Math.floor(value)}</span>
    </div>
  )
}

export default function HUD() {
  const phase = useGameStore(s => s.phase)
  const player = useGameStore(s => s.player)
  const ai = useGameStore(s => s.ai)
  const elapsed = useGameStore(s => s.elapsed)
  const startGame = useGameStore(s => s.startGame)
  const returnToTitle = useGameStore(s => s.returnToTitle)
  const useSkill = useGameStore(s => s.useSkill)
  const bestTime = useGameStore(s => s.bestTime)
  const paused = useGameStore(s => s.paused)
  const showTutorial = useGameStore(s => s.showTutorial)
  const tutorialStep = useGameStore(s => s.tutorialStep)
  const togglePause = useGameStore(s => s.togglePause)
  const nextTutorialStep = useGameStore(s => s.nextTutorialStep)
  const dismissTutorial = useGameStore(s => s.dismissTutorial)
  const showTutorialFromTitle = useGameStore(s => s.showTutorialFromTitle)

  // Escape key for pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') togglePause()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePause])

  /* ─── TITLE ─── */
  if (phase === 'title') {
    return (
      <div className="hud">
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto' }}>
          <div style={{
            fontSize: 32, fontWeight: 900, letterSpacing: '0.08em',
            color: '#2dd48a',
            textShadow: '0 0 30px rgba(45,212,138,0.6), 0 0 60px rgba(45,212,138,0.3)',
            marginBottom: 6,
          }}>
            CLIMB CLASH
          </div>
          <div style={{ fontSize: 13, color: '#d4d0e8', marginBottom: 6, lineHeight: 1.6 }}>
            Race to the top! Sabotage your opponent with skills.
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 12 }}>
            First to height 28 wins. 120s time limit.
          </div>

          {bestTime !== null && (
            <div style={{
              margin: '0 auto 12px', padding: '8px 16px', borderRadius: 10,
              background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)',
              fontSize: 14, fontWeight: 800, color: '#fbbf24',
            }}>
              Best Time: {bestTime.toFixed(2)}s
            </div>
          )}

          <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 14, lineHeight: 1.6 }}>
            WASD: Climb | 1-3: Skills | Esc: Pause
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="hudBtn hudBtnPrimary" onClick={startGame}
              style={{ fontSize: 16, padding: '12px 32px' }}>
              START GAME
            </button>
            <button className="hudBtn" onClick={showTutorialFromTitle}
              style={{ fontSize: 14, padding: '12px 20px' }}>
              HOW TO PLAY
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ─── VICTORY ─── */
  if (phase === 'victory') {
    return (
      <div className="hud">
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto', maxWidth: 520 }}>
          <div style={{
            fontSize: 28, fontWeight: 900, color: '#22c55e',
            textShadow: '0 0 20px rgba(34,197,94,0.5)',
            marginBottom: 8,
          }}>
            VICTORY!
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '4px 16px',
            fontSize: 13, textAlign: 'left', margin: '8px auto', maxWidth: 340,
          }}>
            <div style={{ fontWeight: 700 }}></div>
            <div style={{ fontWeight: 700, color: '#3b82f6', textAlign: 'center' }}>YOU</div>
            <div style={{ fontWeight: 700, color: '#ef4444', textAlign: 'center' }}>AI</div>

            <div>Height Reached</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>{player.height}</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>{ai.height}</div>

            <div>Holds Grabbed</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>{player.holdsGrabbed}</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>{ai.holdsGrabbed}</div>

            <div>Skills Used</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>{player.skillsUsed}</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>{ai.skillsUsed}</div>
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, margin: '8px 0', color: '#e2e8f0' }}>
            Time: {Math.floor(elapsed)}s
          </div>

          {bestTime !== null && (
            <div style={{ fontSize: 12, color: '#fbbf24', marginBottom: 6 }}>
              Best Time: {bestTime.toFixed(2)}s
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
            <button className="hudBtn hudBtnPrimary" onClick={startGame}>PLAY AGAIN</button>
            <button className="hudBtn" onClick={returnToTitle}>TITLE</button>
          </div>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 8 }}>[R] Quick Restart</div>
        </div>
      </div>
    )
  }

  /* ─── DEFEAT ─── */
  if (phase === 'defeat') {
    return (
      <div className="hud">
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto', maxWidth: 520 }}>
          <div style={{
            fontSize: 28, fontWeight: 900, color: '#ef4444',
            textShadow: '0 0 20px rgba(239,68,68,0.5)',
            marginBottom: 8,
          }}>
            DEFEAT
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '4px 16px',
            fontSize: 13, textAlign: 'left', margin: '8px auto', maxWidth: 340,
          }}>
            <div style={{ fontWeight: 700 }}></div>
            <div style={{ fontWeight: 700, color: '#3b82f6', textAlign: 'center' }}>YOU</div>
            <div style={{ fontWeight: 700, color: '#ef4444', textAlign: 'center' }}>AI</div>

            <div>Height Reached</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>{player.height}</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>{ai.height}</div>

            <div>Holds Grabbed</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>{player.holdsGrabbed}</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>{ai.holdsGrabbed}</div>

            <div>Skills Used</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>{player.skillsUsed}</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>{ai.skillsUsed}</div>
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, margin: '8px 0', color: '#e2e8f0' }}>
            Time: {Math.floor(elapsed)}s
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
            <button className="hudBtn hudBtnPrimary" onClick={startGame}>RETRY</button>
            <button className="hudBtn" onClick={returnToTitle}>TITLE</button>
          </div>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 8 }}>[R] Quick Restart</div>
        </div>
      </div>
    )
  }

  // Playing phase
  const timeLeft = Math.max(0, 120 - Math.floor(elapsed))

  return (
    <div className="hud">
      {/* Player stats - left */}
      <div className="hudTop">
        <div className="hudTitle">PLAYER</div>
        <div className="hudStat">Height: {player.height}</div>
        <div className="hudStat">
          Stamina <StaminaBar value={player.stamina} max={100} />
        </div>
        <div className="hudStat">
          Energy <Bar value={player.energy} max={100} color="#3b82f6" showValue />
        </div>
        {player.freezeTimer > 0 && (
          <div className="hudStat" style={{ color: '#93c5fd' }}>FROZEN</div>
        )}
        {player.shakeTimer > 0 && (
          <div className="hudStat" style={{ color: '#fbbf24' }}>SHAKING</div>
        )}
      </div>

      {/* AI stats - right */}
      <div className="hudTop" style={{ left: 'auto', right: 14 }}>
        <div className="hudTitle" style={{ color: '#ef4444' }}>AI</div>
        <div className="hudStat">Height: {ai.height}</div>
        <div className="hudStat">
          Stamina <StaminaBar value={ai.stamina} max={100} />
        </div>
        <div className="hudStat">
          Energy <Bar value={ai.energy} max={100} color="#ef4444" showValue />
        </div>
        {ai.freezeTimer > 0 && (
          <div className="hudStat" style={{ color: '#93c5fd' }}>FROZEN</div>
        )}
        {ai.shakeTimer > 0 && (
          <div className="hudStat" style={{ color: '#fbbf24' }}>SHAKING</div>
        )}
      </div>

      {/* Center: time & height comparison */}
      <div style={{
        position: 'absolute',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        padding: '10px 16px',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 12,
        background: 'rgba(0,0,0,0.38)',
        backdropFilter: 'blur(6px)',
      }}>
        <div className="hudTimer">{timeLeft}s</div>
        <div className="hudStat" style={{ marginTop: 4 }}>
          {player.height} vs {ai.height}
        </div>
      </div>

      {/* Skill buttons */}
      <div style={{
        position: 'absolute',
        bottom: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 10,
        pointerEvents: 'auto',
      }}>
        {SKILLS.map((skill, i) => (
          <button
            key={skill.id}
            className={`hudBtn ${player.energy >= skill.cost ? 'hudBtnPrimary' : ''}`}
            onClick={() => useSkill(skill.id)}
            disabled={player.energy < skill.cost}
            style={{ opacity: player.energy < skill.cost ? 0.5 : 1 }}
          >
            [{i + 1}] {skill.name} ({skill.cost})
          </button>
        ))}
      </div>

      {/* Skill usage popup */}
      <SkillPopup />

      {/* Controls help */}
      <div className="hudHelp" style={{ right: 14, left: 'auto' }}>
        <span>WASD: Climb</span>
        <span className="hudKeysSep">|</span>
        <span>1-3: Skills</span>
        <span className="hudKeysSep">|</span>
        <span>Esc: Pause</span>
      </div>

      {/* ─── TUTORIAL OVERLAY ─── */}
      {showTutorial && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'auto',
        }}>
          <div style={{
            maxWidth: 420, padding: '28px 24px', borderRadius: 16,
            background: 'rgba(10,20,20,0.95)',
            border: '2px solid rgba(45,212,138,0.5)',
            boxShadow: '0 0 40px rgba(45,212,138,0.25)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#2dd48a', marginBottom: 4, letterSpacing: '0.1em' }}>
              HOW TO PLAY ({tutorialStep + 1}/{TUTORIAL_STEPS.length})
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.6, margin: '12px 0 20px', color: '#e2e8f0' }}>
              {TUTORIAL_STEPS[tutorialStep]}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="hudBtn hudBtnPrimary" onClick={nextTutorialStep} style={{ padding: '8px 20px' }}>
                {tutorialStep < TUTORIAL_STEPS.length - 1 ? 'NEXT' : 'GOT IT!'}
              </button>
              {tutorialStep < TUTORIAL_STEPS.length - 1 && (
                <button className="hudBtn" onClick={dismissTutorial} style={{ padding: '8px 16px', fontSize: 11 }}>
                  SKIP
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── PAUSE OVERLAY ─── */}
      {paused && !showTutorial && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'auto',
        }}>
          <div style={{
            padding: '32px 40px', borderRadius: 16,
            background: 'rgba(10,20,20,0.95)',
            border: '2px solid rgba(45,212,138,0.4)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#2dd48a', marginBottom: 16, letterSpacing: '0.08em' }}>
              PAUSED
            </div>
            <button className="hudBtn hudBtnPrimary" onClick={togglePause} style={{ padding: '10px 28px', fontSize: 15 }}>
              RESUME
            </button>
            <button className="hudBtn" onClick={returnToTitle} style={{ marginLeft: 10, padding: '10px 20px' }}>
              QUIT
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
