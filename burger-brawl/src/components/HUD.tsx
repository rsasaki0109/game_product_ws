import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore.ts'

const TUTORIAL_STEPS = [
  { text: 'A/D to select a lane (green highlight shows current lane)', keys: 'A D' },
  { text: 'Serve food to normal customers: Q=Burger W=Fries E=Drink R=Combo', keys: 'Q W E R' },
  { text: 'MONSTERS have horns and red glow - PUNCH them with Space!', keys: 'SPACE' },
  { text: 'F to fire Bazooka at tough monsters (limited ammo!)', keys: 'F' },
]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function HUD() {
  const phase = useGameStore(s => s.phase)
  const score = useGameStore(s => s.score)
  const lives = useGameStore(s => s.lives)
  const ammo = useGameStore(s => s.ammo)
  const combo = useGameStore(s => s.combo)
  const comboTimer = useGameStore(s => s.comboTimer)
  const feedback = useGameStore(s => s.feedback)
  const selectedLane = useGameStore(s => s.selectedLane)
  const customers = useGameStore(s => s.customers)
  const startGame = useGameStore(s => s.startGame)
  const returnToTitle = useGameStore(s => s.returnToTitle)
  const punchCooldown = useGameStore(s => s.punchCooldown)
  const bazookaCooldown = useGameStore(s => s.bazookaCooldown)
  const wrongAction = useGameStore(s => s.wrongAction)
  const highScore = useGameStore(s => s.highScore)
  const showTutorial = useGameStore(s => s.showTutorial)
  const tutorialStep = useGameStore(s => s.tutorialStep)
  const paused = useGameStore(s => s.paused)
  const bestCombo = useGameStore(s => s.bestCombo)
  const customersServed = useGameStore(s => s.customersServed)
  const monstersDefeated = useGameStore(s => s.monstersDefeated)
  const timeSurvived = useGameStore(s => s.timeSurvived)
  const togglePause = useGameStore(s => s.togglePause)
  const showTutorialAgain = useGameStore(s => s.showTutorialAgain)
  const difficulty = useGameStore(s => s.difficulty)
  const setDifficulty = useGameStore(s => s.setDifficulty)
  const gameOverTransition = useGameStore(s => s.gameOverTransition)

  const [newRecordFlash, setNewRecordFlash] = useState(false)
  const isNewHighScore = score > highScore && highScore > 0

  // Find customer in selected lane
  const laneCustomer = customers.find(c =>
    c.position === selectedLane && (c.state === 'waiting' || c.state === 'approaching')
  )

  useEffect(() => {
    if (phase === 'playing' && highScore > 0 && score > highScore && !newRecordFlash) {
      setNewRecordFlash(true)
      setTimeout(() => setNewRecordFlash(false), 2000)
    }
  }, [score, highScore, phase, newRecordFlash])

  // Keyboard for tutorial advance and R restart
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') {
        const s = useGameStore.getState()
        if (s.phase === 'game_over') s.startGame()
      }
      if (useGameStore.getState().showTutorial && useGameStore.getState().tutorialStep >= 0) {
        useGameStore.getState().advanceTutorial()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Tutorial overlay
  if (phase === 'playing' && showTutorial && tutorialStep >= 0) {
    const step = TUTORIAL_STEPS[tutorialStep]
    return (
      <div className="hud">
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto' }}>
          <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 8 }}>
            TUTORIAL ({tutorialStep + 1}/{TUTORIAL_STEPS.length})
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 12 }}>
            {step.text}
          </div>
          <div style={{
            display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap',
          }}>
            {step.keys.split(' ').map(k => (
              <span key={k} style={{
                padding: '6px 12px',
                background: 'rgba(245,158,11,0.25)',
                border: '1px solid rgba(245,158,11,0.6)',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 900,
                color: '#f59e0b',
                textShadow: '0 0 8px rgba(245,158,11,0.4)',
              }}>
                {k}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 11, opacity: 0.5 }}>
            Press any key to continue
          </div>
        </div>
      </div>
    )
  }

  // Pause overlay
  if (paused && phase === 'playing') {
    return (
      <div className="hud">
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto' }}>
          <div className="hudCenterTitle" style={{ fontSize: 28, letterSpacing: '0.15em', color: '#f59e0b' }}>
            PAUSED
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
            <button className="hudBtn hudBtnPrimary" onClick={togglePause}>RESUME</button>
            <button className="hudBtn" onClick={returnToTitle}>QUIT</button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'game_over_transition' as string) {
    return (
      <div className="hud">
        <div style={{
          position: 'absolute', inset: 0,
          background: `rgba(255,0,0,${gameOverTransition * 0.3})`,
          pointerEvents: 'none',
        }} />
      </div>
    )
  }

  if (phase === 'title') {
    return (
      <div className="hud">
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto' }}>
          <div style={{
            fontSize: 32, fontWeight: 900, letterSpacing: '0.1em', marginBottom: 4,
            textShadow: '0 0 20px rgba(245,158,11,0.6), 0 0 40px rgba(245,158,11,0.3)',
            color: '#f59e0b',
          }}>
            BURGER BRAWL
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
            Serve customers. Smash monsters. Survive as long as you can!
          </div>
          {highScore > 0 && (
            <div style={{
              fontSize: 13, fontWeight: 700, marginBottom: 12,
              color: '#fbbf24',
              textShadow: '0 0 8px rgba(251,191,36,0.3)',
            }}>
              HIGH SCORE: {highScore}
            </div>
          )}
          <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 10 }}>
            A/D: Lane | Q/W/E/R: Serve | Space: Punch | F: Bazooka
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
            {(['easy', 'normal', 'hard'] as const).map(d => (
              <button key={d} className="hudBtn" style={{
                padding: '4px 12px', fontSize: 11,
                background: difficulty === d ? 'rgba(245,158,11,0.4)' : undefined,
                border: difficulty === d ? '1px solid #f59e0b' : undefined,
                color: d === 'easy' ? '#86efac' : d === 'hard' ? '#fca5a5' : '#e2e8f0',
              }} onClick={() => setDifficulty(d)}>{d.toUpperCase()}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="hudBtn hudBtnPrimary" onClick={startGame}>START SHIFT</button>
            <button className="hudBtn" onClick={showTutorialAgain}>HOW TO PLAY</button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'game_over') {
    return (
      <div className="hud">
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto' }}>
          <div className="hudCenterTitle" style={{ color: '#ef4444', fontSize: 24 }}>SHIFT OVER!</div>
          {isNewHighScore && (
            <div style={{
              fontSize: 16, fontWeight: 900, color: '#fbbf24', marginBottom: 8,
              textShadow: '0 0 12px rgba(251,191,36,0.5)',
            }}>
              NEW HIGH SCORE!
            </div>
          )}
          <div className="hudCenterBody" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Score: {score}</div>
            {highScore > 0 && !isNewHighScore && (
              <div style={{ fontSize: 12, opacity: 0.6 }}>High Score: {highScore}</div>
            )}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
            <div>Time Survived: {formatTime(timeSurvived)}</div>
            <div>Customers Served: {customersServed}</div>
            <div>Monsters Defeated: {monstersDefeated}</div>
            <div>Best Combo: {bestCombo}</div>
          </div>
          <button className="hudBtn hudBtnPrimary" onClick={startGame}>RETRY</button>
          <button className="hudBtn" onClick={returnToTitle} style={{ marginLeft: 8 }}>TITLE</button>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 8 }}>[R] Quick Restart</div>
        </div>
      </div>
    )
  }

  return (
    <div className="hud">
      {/* Top-left: score & lives */}
      <div className="hudTop">
        <div className="hudTitle" style={{ color: '#f59e0b' }}>BURGER BRAWL</div>
        <div className="hudStat" style={{ fontSize: 18, fontWeight: 900 }}>Score: {score}</div>
        {highScore > 0 && (
          <div className="hudStat" style={{ opacity: 0.4, fontSize: 10 }}>Personal Best: {highScore}</div>
        )}
        <div className="hudStat">Lives: {'❤️'.repeat(lives)}{'🖤'.repeat(3 - lives)}</div>
        <div className="hudStat">Ammo: {'🚀'.repeat(ammo)}{'⬛'.repeat(5 - ammo)}</div>
      </div>

      {/* NEW RECORD flash */}
      {newRecordFlash && (
        <div style={{
          position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)',
          fontSize: 24, fontWeight: 900, color: '#fbbf24',
          textShadow: '0 0 20px #f59e0b, 0 0 40px #f59e0b',
          animation: 'pulse 0.5s ease-in-out infinite alternate',
          pointerEvents: 'none',
        }}>
          NEW RECORD!
        </div>
      )}

      {/* Combo - dramatic when > 2 */}
      {comboTimer > 0 && combo > 1 && (
        <div style={{
          position: 'absolute',
          top: combo > 2 ? '15%' : '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: combo > 2 ? 48 : 28,
          fontWeight: 900,
          color: '#f59e0b',
          textShadow: '0 0 20px #f59e0b, 0 0 40px #f59e0b',
          opacity: Math.min(1, comboTimer),
          background: combo > 2 ? 'rgba(245,158,11,0.15)' : 'transparent',
          padding: combo > 2 ? '8px 24px' : 0,
          borderRadius: 12,
        }}>
          x{combo} COMBO!
        </div>
      )}
      {/* Persistent streak counter */}
      {combo > 2 && comboTimer > 0 && (
        <div style={{
          position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
          fontSize: 14, fontWeight: 700, color: '#fbbf24',
          background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: 8,
        }}>
          STREAK: {combo}
        </div>
      )}

      {/* Feedback popup */}
      {feedback && (
        <div style={{
          position: 'absolute', top: '40%', left: '50%', transform: 'translateX(-50%)',
          fontSize: 18, fontWeight: 900, color: feedback.color,
          textShadow: `0 0 10px ${feedback.color}`,
          opacity: Math.min(1, feedback.timer * 2),
        }}>
          {feedback.text}
        </div>
      )}

      {/* Wrong action warning */}
      {wrongAction && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 56, fontWeight: 900, color: '#ff0000',
          textShadow: '0 0 30px #ff0000, 0 0 60px #ff0000',
          background: 'rgba(255,0,0,0.15)',
          padding: '16px 40px', borderRadius: 16,
          border: '4px solid #ff0000',
          opacity: Math.min(1, wrongAction.timer * 2),
          pointerEvents: 'none',
        }}>
          X {wrongAction.text}
        </div>
      )}

      {/* Top-right: selected lane info */}
      <div style={{
        position: 'absolute', top: 14, right: 14,
        padding: '10px 12px',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 12,
        background: 'rgba(0,0,0,0.38)',
        backdropFilter: 'blur(6px)',
        minWidth: 160,
      }}>
        <div className="hudTitle">Lane {selectedLane + 1}</div>
        {laneCustomer ? (
          <>
            <div className="hudStat">
              {laneCustomer.def.emoji} {laneCustomer.def.name}
            </div>
            <div className="hudStat">
              {laneCustomer.def.type === 'normal'
                ? `Order: ${laneCustomer.def.order}`
                : `MONSTER! HP: ${laneCustomer.currentHp}`
              }
            </div>
          </>
        ) : (
          <div className="hudStat" style={{ opacity: 0.5 }}>Empty</div>
        )}
      </div>

      {/* Bottom: action bar */}
      <div className="hudBottom" style={{ pointerEvents: 'auto' }}>
        <div className="hudActionGroup">
          <span className="hudStat" style={{ marginRight: 8 }}>Serve:</span>
          <button className="hudBtn actionBtn" style={{ background: '#b45309' }}>
            [Q] 🍔
          </button>
          <button className="hudBtn actionBtn" style={{ background: '#ca8a04' }}>
            [W] 🍟
          </button>
          <button className="hudBtn actionBtn" style={{ background: '#1d4ed8' }}>
            [E] 🥤
          </button>
          <button className="hudBtn actionBtn" style={{ background: '#15803d' }}>
            [R] 🍱
          </button>
        </div>
        <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.2)', margin: '0 8px' }} />
        <div className="hudActionGroup">
          <span className="hudStat" style={{ marginRight: 8 }}>Fight:</span>
          <button className="hudBtn actionBtn"
            style={{ background: '#dc2626', opacity: punchCooldown > 0 ? 0.4 : 1 }}>
            [Space] 👊
          </button>
          <button className="hudBtn actionBtn"
            style={{ background: '#ea580c', opacity: bazookaCooldown > 0 || ammo <= 0 ? 0.4 : 1 }}>
            [F] 🚀
          </button>
        </div>
      </div>

      {/* Controls hint */}
      <div className="hudHelp">
        <span>A/D: Lane</span>
        <span className="hudKeysSep">|</span>
        <span>Q/W/E/R: Serve</span>
        <span className="hudKeysSep">|</span>
        <span>Space: Punch</span>
        <span className="hudKeysSep">|</span>
        <span>F: Bazooka</span>
        <span className="hudKeysSep">|</span>
        <span>Esc: Pause</span>
      </div>
    </div>
  )
}
