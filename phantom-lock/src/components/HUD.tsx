import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore.ts'
import { MAX_WAVE } from '../data/waves.ts'

const TUTORIAL_STEPS = [
  { text: 'Click to lock your mouse. WASD to move, mouse to aim', keys: 'W A S D' },
  { text: 'Left click for quick shot (single target)', keys: 'LMB' },
  { text: 'Hold RIGHT mouse and sweep over enemies to LOCK ON (up to 8!)', keys: 'RMB' },
  { text: 'Release right mouse to fire HOMING MISSILES at all locked targets!', keys: 'RMB' },
  { text: 'Space to dash (invincible!). Survive 15 waves!', keys: 'SPACE' },
]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function HUD() {
  const phase = useGameStore(s => s.phase)
  const player = useGameStore(s => s.player)
  const currentWave = useGameStore(s => s.currentWave)
  const waveTimer = useGameStore(s => s.waveTimer)
  const enemies = useGameStore(s => s.enemies)
  const score = useGameStore(s => s.score)
  const combo = useGameStore(s => s.combo)
  const comboTimer = useGameStore(s => s.comboTimer)
  const startGame = useGameStore(s => s.startGame)
  const returnToTitle = useGameStore(s => s.returnToTitle)
  const highScore = useGameStore(s => s.highScore)
  const showTutorial = useGameStore(s => s.showTutorial)
  const tutorialStep = useGameStore(s => s.tutorialStep)
  const paused = useGameStore(s => s.paused)
  const bestCombo = useGameStore(s => s.bestCombo)
  const totalMissilesFired = useGameStore(s => s.totalMissilesFired)
  const totalEnemiesKilled = useGameStore(s => s.totalEnemiesKilled)
  const timeSurvived = useGameStore(s => s.timeSurvived)
  const togglePause = useGameStore(s => s.togglePause)
  const showTutorialAgain = useGameStore(s => s.showTutorialAgain)
  const difficulty = useGameStore(s => s.difficulty)
  const setDifficulty = useGameStore(s => s.setDifficulty)
  const gameOverTransition = useGameStore(s => s.gameOverTransition)

  const [newRecordFlash, setNewRecordFlash] = useState(false)
  const isNewHighScore = score > highScore && highScore > 0

  useEffect(() => {
    if ((phase === 'playing' || phase === 'wave_pause') && highScore > 0 && score > highScore && !newRecordFlash) {
      setNewRecordFlash(true)
      setTimeout(() => setNewRecordFlash(false), 2000)
    }
  }, [score, highScore, phase, newRecordFlash])

  // Keyboard for tutorial advance and R restart
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') {
        const s = useGameStore.getState()
        if (s.phase === 'game_over' || s.phase === 'victory') s.startGame()
      }
      if (useGameStore.getState().showTutorial && useGameStore.getState().tutorialStep >= 0) {
        useGameStore.getState().advanceTutorial()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Tutorial overlay
  if ((phase === 'playing' || phase === 'wave_pause') && showTutorial && tutorialStep >= 0) {
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
                background: 'rgba(34,211,238,0.25)',
                border: '1px solid rgba(34,211,238,0.6)',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 900,
                color: '#22d3ee',
                textShadow: '0 0 8px rgba(34,211,238,0.4)',
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
  if (paused && (phase === 'playing' || phase === 'wave_pause')) {
    return (
      <div className="hud">
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto' }}>
          <div className="hudCenterTitle" style={{ fontSize: 28, letterSpacing: '0.15em', color: '#22d3ee' }}>
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
        <div style={{ position: 'absolute', inset: 0, background: `rgba(255,0,0,${gameOverTransition * 0.3})`, pointerEvents: 'none' }} />
      </div>
    )
  }

  if (phase === 'title') {
    return (
      <div className="hud">
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto' }}>
          <div style={{
            fontSize: 32, fontWeight: 900, letterSpacing: '0.1em', marginBottom: 4,
            textShadow: '0 0 20px rgba(34,211,238,0.6), 0 0 40px rgba(34,211,238,0.3)',
            color: '#22d3ee',
          }}>
            PHANTOM LOCK
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
            Multi-Lock-On Arena Shooter - Lock targets and unleash homing missiles!
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
            RMB Drag: Lock-On | Release: Fire Missiles | Space: Dash
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
            {(['easy', 'normal', 'hard'] as const).map(d => (
              <button key={d} className="hudBtn" style={{
                padding: '4px 12px', fontSize: 11,
                background: difficulty === d ? 'rgba(34,211,238,0.4)' : undefined,
                border: difficulty === d ? '1px solid #22d3ee' : undefined,
                color: d === 'easy' ? '#86efac' : d === 'hard' ? '#fca5a5' : '#e2e8f0',
              }} onClick={() => setDifficulty(d)}>{d.toUpperCase()}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="hudBtn hudBtnPrimary" onClick={startGame}>START</button>
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
          <div className="hudCenterTitle" style={{ color: '#ef4444', fontSize: 24 }}>DESTROYED</div>
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
            <div>Wave Reached: {currentWave}/{MAX_WAVE}</div>
            <div>Enemies Destroyed: {totalEnemiesKilled}</div>
            <div>Best Lock-On Burst: {bestCombo}</div>
            <div>Missiles Fired: {totalMissilesFired}</div>
            <div>Time Survived: {formatTime(timeSurvived)}</div>
            {totalMissilesFired > 0 && (
              <div>Accuracy: {Math.round((totalEnemiesKilled / Math.max(1, totalMissilesFired)) * 100)}%</div>
            )}
          </div>
          <button className="hudBtn hudBtnPrimary" onClick={startGame}>RETRY</button>
          <button className="hudBtn" onClick={returnToTitle} style={{ marginLeft: 8 }}>TITLE</button>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 8 }}>[R] Quick Restart</div>
        </div>
      </div>
    )
  }

  if (phase === 'victory') {
    return (
      <div className="hud">
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto' }}>
          <div className="hudCenterTitle" style={{ color: '#22d3ee', fontSize: 24 }}>MISSION COMPLETE</div>
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
            <div>All {MAX_WAVE} waves cleared!</div>
            <div>Enemies Destroyed: {totalEnemiesKilled}</div>
            <div>Best Lock-On Burst: {bestCombo}</div>
            <div>Missiles Fired: {totalMissilesFired}</div>
            <div>Time: {formatTime(timeSurvived)}</div>
            {totalMissilesFired > 0 && (
              <div>Accuracy: {Math.round((totalEnemiesKilled / Math.max(1, totalMissilesFired)) * 100)}%</div>
            )}
          </div>
          <button className="hudBtn hudBtnPrimary" onClick={startGame}>PLAY AGAIN</button>
          <button className="hudBtn" onClick={returnToTitle} style={{ marginLeft: 8 }}>TITLE</button>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 8 }}>[R] Quick Restart</div>
        </div>
      </div>
    )
  }

  const hpPct = Math.max(0, (player.hp / player.maxHp) * 100)
  const energyPct = Math.max(0, (player.energy / player.maxEnergy) * 100)

  return (
    <div className="hud">
      {/* Wave pause announcement */}
      {phase === 'wave_pause' && (
        <div className="hudCenterOverlay">
          <div className="hudCenterTitle" style={{ color: '#22d3ee' }}>
            WAVE {currentWave + 1} IN {Math.ceil(waveTimer)}s
          </div>
        </div>
      )}

      {/* Top-left: stats */}
      <div className="hudTop">
        <div className="hudTitle">WAVE {currentWave}/{MAX_WAVE}</div>
        <div className="hudStat">Enemies: {enemies.length}</div>
        {/* HP bar */}
        <div style={{ marginTop: 4 }}>
          <div className="hudStat" style={{ marginBottom: 2 }}>HP</div>
          <div style={{ width: 140, height: 10, background: 'rgba(0,0,0,0.5)', borderRadius: 5 }}>
            <div style={{
              width: `${hpPct}%`, height: '100%', borderRadius: 5,
              background: hpPct > 30 ? '#ef4444' : '#dc2626',
              transition: 'width 0.15s',
            }} />
          </div>
        </div>
        {/* Energy bar */}
        <div>
          <div className="hudStat" style={{ marginBottom: 2 }}>ENERGY</div>
          <div style={{ width: 140, height: 10, background: 'rgba(0,0,0,0.5)', borderRadius: 5 }}>
            <div style={{
              width: `${energyPct}%`, height: '100%', borderRadius: 5,
              background: '#22d3ee',
              transition: 'width 0.15s',
            }} />
          </div>
        </div>
      </div>

      {/* Top-right: score */}
      <div style={{
        position: 'absolute', top: 14, right: 14,
        padding: '10px 14px',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 12,
        background: 'rgba(0,0,0,0.38)',
        backdropFilter: 'blur(6px)',
        textAlign: 'right',
      }}>
        <div className="hudTitle" style={{ color: '#22d3ee' }}>SCORE</div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>{score}</div>
        {highScore > 0 && <div style={{ fontSize: 10, opacity: 0.4 }}>Best: {highScore}</div>}
      </div>

      {newRecordFlash && (
        <div style={{
          position: 'absolute', top: '22%', left: '50%', transform: 'translateX(-50%)',
          fontSize: 24, fontWeight: 900, color: '#fbbf24',
          textShadow: '0 0 20px #f59e0b', pointerEvents: 'none',
          animation: 'pulse 0.5s ease-in-out infinite alternate',
        }}>NEW RECORD!</div>
      )}

      {/* Combo burst screen flash border */}
      {comboTimer > 0 && combo > 1 && comboTimer > 1.7 && (
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          border: '6px solid rgba(34, 211, 238, 0.7)',
          boxShadow: 'inset 0 0 60px rgba(34, 211, 238, 0.4), inset 0 0 120px rgba(34, 211, 238, 0.2)',
          opacity: Math.min(1, (comboTimer - 1.7) * 3.3),
          borderRadius: 0,
        }} />
      )}

      {/* Combo flash */}
      {comboTimer > 0 && combo > 1 && (
        <div style={{
          position: 'absolute',
          top: '35%', left: '50%', transform: 'translateX(-50%)',
          fontSize: 48, fontWeight: 900,
          color: '#22d3ee',
          textShadow: '0 0 20px #22d3ee, 0 0 40px #22d3ee, 0 0 60px #22d3ee',
          opacity: Math.min(1, comboTimer),
          pointerEvents: 'none',
        }}>
          x{combo} BURST!
        </div>
      )}

      {/* Controls */}
      <div className="hudHelp">
        <span>Click to lock mouse</span>
        <span className="hudKeysSep">|</span>
        <span>WASD: Move</span>
        <span className="hudKeysSep">|</span>
        <span>LClick: Shoot</span>
        <span className="hudKeysSep">|</span>
        <span>RDrag: Lock-On</span>
        <span className="hudKeysSep">|</span>
        <span>Space: Dash</span>
        <span className="hudKeysSep">|</span>
        <span>Esc: Pause</span>
      </div>
    </div>
  )
}
