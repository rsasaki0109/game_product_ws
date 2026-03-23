import { useEffect } from 'react'
import { useGameStore, TUTORIAL_STEPS } from '../store/gameStore.ts'
import { P1_ACTIONS } from '../data/actions.ts'

export default function HUD() {
  const phase = useGameStore(s => s.phase)
  const player = useGameStore(s => s.player)
  const ai = useGameStore(s => s.ai)
  const elapsed = useGameStore(s => s.elapsed)
  const winner = useGameStore(s => s.winner)
  const physicalLog = useGameStore(s => s.physicalLog)
  const startGame = useGameStore(s => s.startGame)
  const returnToTitle = useGameStore(s => s.returnToTitle)
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
      if (e.code === 'Escape') {
        togglePause()
      }
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
            fontSize: 36, fontWeight: 900, letterSpacing: '0.08em',
            color: '#a78bfa',
            textShadow: '0 0 30px rgba(167,139,250,0.6), 0 0 60px rgba(167,139,250,0.3)',
            marginBottom: 6,
          }}>
            COUCH CHAOS
          </div>
          <div style={{ fontSize: 13, color: '#d4d0e8', marginBottom: 12, lineHeight: 1.6 }}>
            Race to the finish line... but physical interference is ALLOWED!
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

          <div className="hudCenterBody" style={{ marginBottom: 16, gap: 8 }}>
            <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.6 }}>
              Arrow Keys / WASD: Control your character<br/>
              T: Push | Y: Cover Eyes | U: Pillow Smack | I: Tickle<br/>
              <span style={{ color: '#fbbf24' }}>The AI will fight back!</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="hudBtn hudBtnPrimary" onClick={startGame}
              style={{ fontSize: 16, padding: '12px 32px' }}>
              START!
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

  /* ─── RESULT ─── */
  if (phase === 'result') {
    const newBest = bestTime !== null ? bestTime : null
    return (
      <div className="hud">
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto', maxWidth: 520 }}>
          <div style={{
            fontSize: 28, fontWeight: 900, marginBottom: 8,
            color: winner === 'player' ? '#22c55e' : '#ef4444',
            textShadow: `0 0 20px ${winner === 'player' ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`,
          }}>
            {winner === 'player' ? 'YOU WIN!' : 'AI WINS!'}
          </div>

          {/* Stats table */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '4px 16px',
            fontSize: 13, textAlign: 'left', margin: '8px auto', maxWidth: 360,
          }}>
            <div style={{ fontWeight: 700, color: '#a78bfa' }}></div>
            <div style={{ fontWeight: 700, color: '#60a5fa', textAlign: 'center' }}>YOU</div>
            <div style={{ fontWeight: 700, color: '#f87171', textAlign: 'center' }}>AI</div>

            <div>Score</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>{player.score}</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>{ai.score}</div>

            <div>Coins</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>{player.coinsCollected}</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>{ai.coinsCollected}</div>

            <div>Physical Attacks</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>{player.physicalActionsUsed}</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>{ai.physicalActionsUsed}</div>

            <div>Progress</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>{Math.floor(player.progress)}%</div>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>{Math.floor(ai.progress)}%</div>
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, margin: '8px 0', color: '#e2e8f0' }}>
            Time: {elapsed.toFixed(2)}s
          </div>

          {winner === 'player' && newBest !== null && (
            <div style={{ fontSize: 12, color: '#fbbf24', marginBottom: 6 }}>
              Best Time: {newBest.toFixed(2)}s
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
            <button className="hudBtn hudBtnPrimary" onClick={startGame}>REMATCH</button>
            <button className="hudBtn" onClick={returnToTitle}>TITLE</button>
          </div>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 8 }}>[R] Quick Restart</div>
        </div>
      </div>
    )
  }

  /* ─── PLAYING ─── */
  return (
    <div className="hud">
      {/* Top bar: progress comparison */}
      <div style={{
        position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
        width: 'min(600px, 90vw)', padding: '10px 18px',
        border: '2px solid rgba(255,255,255,0.3)', borderRadius: 14,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 900 }}>
          <span style={{ color: '#60a5fa' }}>YOU {Math.floor(player.progress)}%</span>
          <span className="hudTitle" style={{ fontSize: 16, color: '#a78bfa' }}>RACE TO FINISH</span>
          <span style={{ color: '#f87171' }}>AI {Math.floor(ai.progress)}%</span>
        </div>
        <div style={{ position: 'relative', height: 22, background: '#222', borderRadius: 11, border: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 11,
            width: `${player.progress}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', transition: 'width 0.1s',
            boxShadow: '0 0 10px rgba(59,130,246,0.5)',
          }} />
          <div style={{
            position: 'absolute', right: 0, top: 0, height: '100%', borderRadius: 11,
            width: `${ai.progress}%`, background: 'linear-gradient(270deg, #ef4444, #f87171)', opacity: 0.5, transition: 'width 0.1s',
          }} />
          <div style={{
            position: 'absolute', left: `${Math.min(92, player.progress)}%`, top: -2, height: 26,
            width: 3, background: '#60a5fa', borderRadius: 2,
          }} />
          <div style={{
            position: 'absolute', right: `${Math.min(92, 100 - ai.progress)}%`, top: -2, height: 26,
            width: 3, background: '#f87171', borderRadius: 2,
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
          <span style={{ color: '#93c5fd' }}>Score: {player.score}</span>
          <span style={{ color: '#e2e8f0', fontSize: 12 }}>{elapsed.toFixed(1)}s</span>
          <span style={{ color: '#fca5a5' }}>Score: {ai.score}</span>
        </div>
      </div>

      {/* Debuff indicators */}
      {player.blindTimer > 0 && (
        <div className="debuffAlert">EYES COVERED!</div>
      )}
      {player.reverseTimer > 0 && (
        <div className="debuffAlert" style={{ top: '55%' }}>CONTROLS REVERSED!</div>
      )}
      {player.stunTimer > 0 && (
        <div className="debuffAlert" style={{ top: '60%', color: '#fbbf24' }}>STUNNED!</div>
      )}

      {/* Physical action log */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      }}>
        {physicalLog.map((log, i) => (
          <div key={i} style={{
            fontSize: 18, fontWeight: 900,
            color: log.side === 'left' ? '#60a5fa' : '#f87171',
            textShadow: `0 0 10px ${log.side === 'left' ? '#3b82f6' : '#ef4444'}`,
            opacity: Math.min(1, log.timer),
          }}>
            {log.text}
          </div>
        ))}
      </div>

      {/* Bottom: Physical actions */}
      <div className="hudBottom" style={{ pointerEvents: 'auto' }}>
        <span className="hudStat" style={{ marginRight: 6 }}>Physical:</span>
        {P1_ACTIONS.map(a => {
          const cd = a.id === 'push' ? player.pushCooldown
            : a.id === 'cover' ? player.coverCooldown
            : a.id === 'pillow' ? player.pillowCooldown
            : player.tickleCooldown
          return (
            <button key={a.id} className="hudBtn" style={{
              padding: '6px 10px', fontSize: 13,
              opacity: cd > 0 ? 0.3 : 1,
            }}>
              [{a.key.replace('Key', '')}] {a.emoji}
            </button>
          )
        })}
      </div>

      {/* Controls */}
      <div className="hudHelp">
        <span>Arrows/WASD: Run & Jump</span>
        <span className="hudKeysSep">|</span>
        <span>T: Push</span>
        <span className="hudKeysSep">|</span>
        <span>Y: Cover Eyes</span>
        <span className="hudKeysSep">|</span>
        <span>U: Pillow</span>
        <span className="hudKeysSep">|</span>
        <span>I: Tickle</span>
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
            background: 'rgba(20,10,40,0.95)',
            border: '2px solid rgba(167,139,250,0.5)',
            boxShadow: '0 0 40px rgba(167,139,250,0.25)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 4, letterSpacing: '0.1em' }}>
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
            background: 'rgba(20,10,40,0.95)',
            border: '2px solid rgba(167,139,250,0.4)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#a78bfa', marginBottom: 16, letterSpacing: '0.08em' }}>
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
