import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore.ts'

const TUTORIAL_STEPS = [
  { text: 'WASD to move around the arena', keys: 'W A S D' },
  { text: 'Click to swing your sword at enemies', keys: 'LMB' },
  { text: "Space to dodge (you're invincible during dodge!)", keys: 'SPACE' },
  { text: 'Defeat all enemies to advance to the next floor', keys: '' },
]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function HUD() {
  const phase = useGameStore(s => s.phase)
  const floor = useGameStore(s => s.floor)
  const waveIndex = useGameStore(s => s.waveIndex)
  const waveDefs = useGameStore(s => s.waveDefs)
  const player = useGameStore(s => s.player)
  const enemies = useGameStore(s => s.enemies)
  const collectedItems = useGameStore(s => s.collectedItems)
  const enemiesKilled = useGameStore(s => s.enemiesKilled)
  const startGame = useGameStore(s => s.startGame)
  const returnToTitle = useGameStore(s => s.returnToTitle)
  const damageNumbers = useGameStore(s => s.damageNumbers)
  const highScore = useGameStore(s => s.highScore)
  const showTutorial = useGameStore(s => s.showTutorial)
  const tutorialStep = useGameStore(s => s.tutorialStep)
  const paused = useGameStore(s => s.paused)
  const bestCombo = useGameStore(s => s.bestCombo)
  const timeSurvived = useGameStore(s => s.timeSurvived)
  const togglePause = useGameStore(s => s.togglePause)
  const showTutorialAgain = useGameStore(s => s.showTutorialAgain)
  const difficulty = useGameStore(s => s.difficulty)
  const setDifficulty = useGameStore(s => s.setDifficulty)
  const gameOverTransition = useGameStore(s => s.gameOverTransition)

  const [newRecordFlash, setNewRecordFlash] = useState(false)

  const hpPercent = Math.max(0, (player.currentHp / player.maxHp) * 100)
  const score = enemiesKilled * 10 + collectedItems.length * 25 + floor * 100
  const isNewHighScore = score > highScore && highScore > 0

  // Flash "NEW RECORD!" when score exceeds personal best
  useEffect(() => {
    if (phase === 'playing' && highScore > 0 && score > highScore && !newRecordFlash) {
      setNewRecordFlash(true)
      setTimeout(() => setNewRecordFlash(false), 2000)
    }
  }, [score, highScore, phase, newRecordFlash])

  // Keyboard listener for pause, tutorial advance, and R restart
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        const s = useGameStore.getState()
        if (s.showTutorial && s.tutorialStep >= 0) return
        s.togglePause()
      }
      if (e.code === 'KeyR') {
        const s = useGameStore.getState()
        if (s.phase === 'game_over' || s.phase === 'victory') {
          s.startGame()
        }
      }
      if (useGameStore.getState().showTutorial && useGameStore.getState().tutorialStep >= 0) {
        useGameStore.getState().advanceTutorial()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Tutorial overlay (shown during playing phase)
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
          {step.keys && (
            <div style={{
              display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16,
            }}>
              {step.keys.split(' ').map(k => (
                <span key={k} style={{
                  padding: '6px 12px',
                  background: 'rgba(34,197,94,0.25)',
                  border: '1px solid rgba(34,197,94,0.6)',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 900,
                  color: '#22c55e',
                  textShadow: '0 0 8px rgba(34,197,94,0.4)',
                }}>
                  {k}
                </span>
              ))}
            </div>
          )}
          <div style={{ fontSize: 11, opacity: 0.5 }}>
            Press any key to continue
          </div>
        </div>
      </div>
    )
  }

  // Pause overlay
  if (paused && (phase === 'playing' || phase === 'floor_clear')) {
    return (
      <div className="hud">
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto' }}>
          <div className="hudCenterTitle" style={{ fontSize: 28, letterSpacing: '0.15em' }}>
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

  // Game over transition: red flash overlay
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
            textShadow: '0 0 20px rgba(34,197,94,0.6), 0 0 40px rgba(34,197,94,0.3)',
            color: '#22c55e',
          }}>
            HACK & SLASH
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
            Defeat enemies, collect loot, conquer 10 floors!
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
            WASD: Move | Click: Attack | Space: Dodge
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
            {(['easy', 'normal', 'hard'] as const).map(d => (
              <button key={d} className="hudBtn"
                style={{
                  padding: '4px 12px', fontSize: 11,
                  background: difficulty === d ? 'rgba(34,197,94,0.4)' : undefined,
                  border: difficulty === d ? '1px solid #22c55e' : undefined,
                  color: d === 'easy' ? '#86efac' : d === 'hard' ? '#fca5a5' : '#e2e8f0',
                }}
                onClick={() => setDifficulty(d)}>
                {d.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="hudBtn hudBtnPrimary" onClick={startGame}>
              START GAME
            </button>
            <button className="hudBtn" onClick={showTutorialAgain}>
              HOW TO PLAY
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'game_over') {
    return (
      <div className="hud">
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto' }}>
          <div className="hudCenterTitle" style={{ color: '#ef4444', fontSize: 24 }}>
            GAME OVER
          </div>
          {isNewHighScore && (
            <div style={{
              fontSize: 16, fontWeight: 900, color: '#fbbf24', marginBottom: 8,
              textShadow: '0 0 12px rgba(251,191,36,0.5)',
              animation: 'pulse 0.6s ease-in-out infinite alternate',
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
            <div>Floor Reached: {floor}</div>
            <div>Enemies Killed: {enemiesKilled}</div>
            <div>Items Collected: {collectedItems.length}</div>
            <div>Best Combo: {bestCombo}</div>
            <div>Time Survived: {formatTime(timeSurvived)}</div>
          </div>
          <button className="hudBtn hudBtnPrimary" onClick={startGame}>
            RETRY
          </button>
          <button className="hudBtn" onClick={returnToTitle} style={{ marginLeft: 8 }}>
            TITLE
          </button>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 8 }}>[R] Quick Restart</div>
        </div>
      </div>
    )
  }

  if (phase === 'victory') {
    return (
      <div className="hud">
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto' }}>
          <div className="hudCenterTitle" style={{ color: '#22c55e', fontSize: 24 }}>
            VICTORY!
          </div>
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
            <div>All 10 floors cleared!</div>
            <div>Enemies Killed: {enemiesKilled}</div>
            <div>Items Collected: {collectedItems.length}</div>
            <div>Best Combo: {bestCombo}</div>
            <div>Time Survived: {formatTime(timeSurvived)}</div>
          </div>
          <button className="hudBtn hudBtnPrimary" onClick={startGame}>
            PLAY AGAIN
          </button>
          <button className="hudBtn" onClick={returnToTitle} style={{ marginLeft: 8 }}>
            TITLE
          </button>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 8 }}>[R] Quick Restart</div>
        </div>
      </div>
    )
  }

  return (
    <div className="hud">
      {/* Top-left stats */}
      <div className="hudTop">
        <div className="hudTitle">FLOOR {floor}</div>
        <div className="hudStat">
          Wave {waveIndex + 1}/{waveDefs.length} | Enemies: {enemies.length}
        </div>
        {/* HP bar */}
        <div style={{ marginTop: 4 }}>
          <div style={{
            width: 160,
            height: 14,
            background: 'rgba(0,0,0,0.5)',
            borderRadius: 7,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${hpPercent}%`,
              height: '100%',
              background: hpPercent > 30 ? '#ef4444' : '#dc2626',
              transition: 'width 0.15s',
            }} />
          </div>
          <div className="hudStat" style={{ marginTop: 2 }}>
            HP: {player.currentHp}/{player.maxHp}
          </div>
        </div>
        <div className="hudStat">ATK: {player.attack} | SPD: {player.speed.toFixed(1)}</div>
        <div className="hudStat" style={{ color: '#fbbf24' }}>Score: {score}</div>
        {highScore > 0 && (
          <div className="hudStat" style={{ opacity: 0.4, fontSize: 10 }}>Personal Best: {highScore}</div>
        )}
      </div>

      {/* NEW RECORD flash */}
      {newRecordFlash && (
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          fontSize: 24, fontWeight: 900, color: '#fbbf24',
          textShadow: '0 0 20px #f59e0b, 0 0 40px #f59e0b',
          animation: 'pulse 0.5s ease-in-out infinite alternate',
          pointerEvents: 'none',
        }}>
          NEW RECORD!
        </div>
      )}

      {/* Floor clear overlay */}
      {phase === 'floor_clear' && (
        <div className="hudCenterOverlay">
          <div className="hudCenterTitle" style={{ color: '#22c55e', fontSize: 20 }}>
            FLOOR CLEAR!
          </div>
        </div>
      )}

      {/* Collected items (bottom-right) */}
      {collectedItems.length > 0 && (
        <div style={{
          position: 'absolute',
          right: 14,
          bottom: 14,
          padding: '10px 12px',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 12,
          background: 'rgba(0,0,0,0.38)',
          backdropFilter: 'blur(6px)',
          maxHeight: 200,
          overflowY: 'auto',
        }}>
          <div className="hudTitle" style={{ marginBottom: 6 }}>LOOT</div>
          {collectedItems.slice(-8).map((item, i) => (
            <div key={i} className="hudStat">
              {item.emoji} {item.name}
            </div>
          ))}
        </div>
      )}

      {/* Floating damage numbers */}
      {damageNumbers.map((dn, i) => {
        const floatY = (1 - dn.timer) * 60
        return (
          <div key={`dmg-${i}`} style={{
            position: 'absolute',
            left: `${50 + dn.x * 3}%`,
            top: `${35 - floatY * 0.5}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: 24,
            fontWeight: 900,
            color: '#fbbf24',
            textShadow: '0 0 8px #f59e0b, 0 2px 4px rgba(0,0,0,0.5)',
            opacity: Math.min(1, dn.timer * 2),
            pointerEvents: 'none',
          }}>
            -{dn.value}
          </div>
        )
      })}

      {/* Controls hint */}
      <div className="hudHelp">
        <span>WASD: Move</span>
        <span className="hudKeysSep">|</span>
        <span>Click: Attack</span>
        <span className="hudKeysSep">|</span>
        <span>Space: Dodge</span>
        <span className="hudKeysSep">|</span>
        <span>Esc: Pause</span>
      </div>
    </div>
  )
}
