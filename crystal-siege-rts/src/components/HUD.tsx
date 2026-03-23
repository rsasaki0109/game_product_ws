import { useGameStore } from '../store/gameStore.ts'
import { getUnitDef } from '../data/units.ts'
import { getBuildingDef } from '../data/buildings.ts'
import type { BuildingType, UnitType } from '../types/game.ts'
import Minimap from './Minimap.tsx'

const BUILD_OPTIONS: { type: BuildingType; key: string }[] = [
  { type: 'barracks', key: 'B→1' },
  { type: 'tower', key: 'B→2' },
  { type: 'mine', key: 'B→3' },
]

const TUTORIAL_STEPS = [
  'Select workers by clicking or dragging',
  'Right-click a crystal node to start gathering',
  'Press B to build: Barracks trains soldiers, Tower auto-attacks',
  'Select a Barracks, press 1-3 to train units',
  'Survive all 10 waves to win!',
]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function HUD() {
  const phase = useGameStore(s => s.phase)
  const crystals = useGameStore(s => s.crystals)
  const currentWave = useGameStore(s => s.currentWave)
  const waveTimer = useGameStore(s => s.waveTimer)
  const waveInProgress = useGameStore(s => s.waveInProgress)
  const units = useGameStore(s => s.units)
  const buildings = useGameStore(s => s.buildings)
  const selectedUnitUids = useGameStore(s => s.selectedUnitUids)
  const selectedBuildingUid = useGameStore(s => s.selectedBuildingUid)
  const buildMode = useGameStore(s => s.buildMode)
  const startGame = useGameStore(s => s.startGame)
  const returnToTitle = useGameStore(s => s.returnToTitle)
  const enterBuildMode = useGameStore(s => s.enterBuildMode)
  const cancelBuildMode = useGameStore(s => s.cancelBuildMode)
  const trainUnit = useGameStore(s => s.trainUnit)
  const dragRect = useGameStore(s => s.dragRect)
  const buildError = useGameStore(s => s.buildError)
  const buildErrorTimer = useGameStore(s => s.buildErrorTimer)
  const elapsed = useGameStore(s => s.elapsed)
  const paused = useGameStore(s => s.paused)
  const showTutorial = useGameStore(s => s.showTutorial)
  const tutorialStep = useGameStore(s => s.tutorialStep)
  const stats = useGameStore(s => s.stats)
  const togglePause = useGameStore(s => s.togglePause)
  const nextTutorialStep = useGameStore(s => s.nextTutorialStep)
  const dismissTutorial = useGameStore(s => s.dismissTutorial)
  const difficulty = useGameStore(s => s.difficulty)
  const setDifficulty = useGameStore(s => s.setDifficulty)
  const showTutorialOnTitle = useGameStore(s => s.showTutorialOnTitle)

  // Title screen
  if (phase === 'title') {
    const bestWave = localStorage.getItem('crystalSiegeBestWave')
    const bestTime = localStorage.getItem('crystalSiegeBestTime')
    return (
      <div className="hud">
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto' }}>
          <div style={{
            fontSize: 32, fontWeight: 900, letterSpacing: '0.12em',
            background: 'linear-gradient(180deg, #06b6d4 0%, #a855f7 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 12px rgba(6,182,212,0.6)) drop-shadow(0 0 24px rgba(168,85,247,0.3))',
            marginBottom: 8,
          }}>
            CRYSTAL SIEGE
          </div>
          <div className="hudCenterBody" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              Gather crystals, build defenses, and train an army to survive 10 increasingly brutal enemy waves.
            </div>
            {bestWave && (
              <div style={{ color: '#a855f7', fontSize: 12, marginTop: 4 }}>
                Best: Wave {bestWave}/10
                {bestTime && ` in ${formatTime(parseFloat(bestTime))}`}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
            {(['easy', 'normal', 'hard'] as const).map(d => (
              <button key={d} className="hudBtn" style={{
                padding: '4px 12px', fontSize: 11,
                background: difficulty === d ? 'rgba(6,182,212,0.4)' : undefined,
                border: difficulty === d ? '1px solid #06b6d4' : undefined,
                color: d === 'easy' ? '#86efac' : d === 'hard' ? '#fca5a5' : '#e2e8f0',
              }} onClick={() => setDifficulty(d)}>{d.toUpperCase()}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="hudBtn hudBtnPrimary" onClick={startGame}>START GAME</button>
            <button className="hudBtn" onClick={showTutorialOnTitle}>HOW TO PLAY</button>
          </div>
        </div>
      </div>
    )
  }

  // Game over
  if (phase === 'game_over') {
    return (
      <div className="hud">
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto' }}>
          <div className="hudCenterTitle" style={{ color: '#ef4444', fontSize: 18 }}>DEFEAT</div>
          <div className="hudCenterBody" style={{ marginBottom: 12 }}>
            <div>Wave {currentWave}/10 | Time: {formatTime(elapsed)}</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
              Enemies Killed: {stats.enemiesKilled} | Units Trained: {stats.unitsTrainedTotal}
            </div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>
              Buildings Built: {stats.buildingsBuilt} | Crystals Gathered: {Math.floor(stats.resourcesGathered)}
            </div>
          </div>
          <button className="hudBtn hudBtnPrimary" onClick={startGame}>RETRY</button>
          <button className="hudBtn" onClick={returnToTitle} style={{ marginLeft: 8 }}>TITLE</button>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 8 }}>[R] Quick Restart</div>
        </div>
      </div>
    )
  }

  // Victory
  if (phase === 'victory') {
    return (
      <div className="hud">
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto' }}>
          <div className="hudCenterTitle" style={{ color: '#22c55e', fontSize: 18 }}>VICTORY!</div>
          <div className="hudCenterBody" style={{ marginBottom: 12 }}>
            <div>All 10 waves defeated! Time: {formatTime(elapsed)}</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
              Enemies Killed: {stats.enemiesKilled} | Units Trained: {stats.unitsTrainedTotal}
            </div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>
              Buildings Built: {stats.buildingsBuilt} | Crystals Gathered: {Math.floor(stats.resourcesGathered)}
            </div>
          </div>
          <button className="hudBtn hudBtnPrimary" onClick={startGame}>PLAY AGAIN</button>
          <button className="hudBtn" onClick={returnToTitle} style={{ marginLeft: 8 }}>TITLE</button>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 8 }}>[R] Quick Restart</div>
        </div>
      </div>
    )
  }

  // Playing HUD
  const playerUnits = units.filter(u => u.owner === 'player')
  const enemyUnits = units.filter(u => u.owner === 'enemy')
  const selectedUnits = units.filter(u => selectedUnitUids.includes(u.uid))
  const selectedBuilding = buildings.find(b => b.uid === selectedBuildingUid)

  return (
    <div className="hud">
      {/* Tutorial overlay */}
      {showTutorial && (
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto', zIndex: 100 }}>
          <div className="hudCenterTitle" style={{ fontSize: 14, color: '#06b6d4' }}>
            TUTORIAL ({tutorialStep + 1}/{TUTORIAL_STEPS.length})
          </div>
          <div className="hudCenterBody" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>{TUTORIAL_STEPS[tutorialStep]}</div>
          </div>
          <button className="hudBtn hudBtnPrimary" onClick={nextTutorialStep}>
            {tutorialStep >= TUTORIAL_STEPS.length - 1 ? 'START PLAYING' : 'NEXT'}
          </button>
          <button className="hudBtn" onClick={dismissTutorial} style={{ marginLeft: 8 }}>SKIP</button>
        </div>
      )}

      {/* Pause overlay */}
      {paused && !showTutorial && (
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto', zIndex: 100 }}>
          <div className="hudCenterTitle" style={{ fontSize: 18 }}>PAUSED</div>
          <div style={{ marginTop: 12 }}>
            <button className="hudBtn hudBtnPrimary" onClick={togglePause}>RESUME</button>
            <button className="hudBtn" onClick={returnToTitle} style={{ marginLeft: 8 }}>QUIT</button>
          </div>
        </div>
      )}

      {/* Wave incoming announcement */}
      {phase === 'wave_incoming' && !paused && (
        <div className="hudCenterOverlay">
          <div className="hudCenterTitle" style={{ color: '#ef4444', fontSize: 18 }}>
            WAVE {currentWave} INCOMING!
          </div>
        </div>
      )}

      {/* Top-left: game stats */}
      <div className="hudTop">
        <div className="hudStat" style={{ color: '#a855f7', fontWeight: 900, fontSize: 11 }}>
          {formatTime(elapsed)}
        </div>
        <div className="hudTitle">WAVE {currentWave}/10</div>
        <div className="hudStat">
          {waveInProgress
            ? `Enemies: ${enemyUnits.length}`
            : `Next wave: ${Math.ceil(waveTimer)}s`
          }
        </div>
        <div className="hudStat" style={{ color: '#06b6d4' }}>
          Crystals: {Math.floor(crystals)}
        </div>
        <div className="hudStat">Units: {playerUnits.length}</div>
        <div className="hudStat" style={{ fontSize: 10, opacity: 0.8 }}>
          {(['worker', 'soldier', 'archer', 'knight'] as UnitType[])
            .map(t => {
              const c = playerUnits.filter(u => u.def.type === t).length
              return c > 0 ? `${t[0].toUpperCase() + t.slice(1)}s: ${c}` : null
            })
            .filter(Boolean)
            .join(' | ')
          }
        </div>
      </div>

      {/* Top-right: selection info */}
      {selectedUnits.length > 0 && (
        <div className="hudRight">
          <div className="hudTitle">
            {selectedUnits.length === 1
              ? selectedUnits[0].def.name
              : `${selectedUnits.length} units selected`
            }
          </div>
          {selectedUnits.length === 1 && (
            <>
              <div className="hudStat">
                HP: {selectedUnits[0].currentHp}/{selectedUnits[0].maxHp}
              </div>
              <div className="hudStat">ATK: {selectedUnits[0].attack} | SPD: {selectedUnits[0].speed}</div>
              <div className="hudStat">State: {selectedUnits[0].state}</div>
            </>
          )}
          {selectedUnits.length > 1 && (
            <div className="hudStat">
              {(['worker', 'soldier', 'archer', 'knight'] as UnitType[])
                .map(t => {
                  const c = selectedUnits.filter(u => u.def.type === t).length
                  return c > 0 ? `${t}: ${c}` : null
                })
                .filter(Boolean)
                .join(' | ')
              }
            </div>
          )}
        </div>
      )}

      {selectedBuilding && (
        <div className="hudRight">
          <div className="hudTitle">{selectedBuilding.def.name}</div>
          <div className="hudStat">HP: {selectedBuilding.currentHp}/{selectedBuilding.maxHp}</div>
          {!selectedBuilding.isBuilt && (
            <div className="hudStat">Building: {Math.floor(selectedBuilding.buildProgress * 100)}%</div>
          )}
          {selectedBuilding.isBuilt && selectedBuilding.trainingQueue.length > 0 && (
            <div className="hudStat">
              Training: {selectedBuilding.trainingQueue[0]} ({Math.floor(selectedBuilding.trainProgress * 100)}%)
              {selectedBuilding.trainingQueue.length > 1 && ` +${selectedBuilding.trainingQueue.length - 1} queued`}
            </div>
          )}
          {/* Train buttons */}
          {selectedBuilding.isBuilt && (selectedBuilding.def.type === 'hq' || selectedBuilding.def.type === 'barracks') && (
            <div className="hudTrainBar" style={{ pointerEvents: 'auto' }}>
              {getTrainOptions(selectedBuilding.def.type).map(({ type, key }) => {
                const def = getUnitDef(type)
                return (
                  <button
                    key={type}
                    className="hudBtn"
                    style={{ fontSize: 11, padding: '6px 8px', opacity: crystals >= def.cost ? 1 : 0.4 }}
                    onClick={() => trainUnit(selectedBuilding.uid, type)}
                    disabled={crystals < def.cost}
                  >
                    [{key}] {def.name} ({def.cost})
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Bottom: build bar */}
      <div className="hudBottom" style={{ pointerEvents: 'auto' }}>
        {buildMode ? (
          <>
            <span className="hudStat">Placing: {getBuildingDef(buildMode).name} | Click to place | ESC to cancel</span>
            <button className="hudBtn" onClick={cancelBuildMode} style={{ marginLeft: 8 }}>Cancel</button>
          </>
        ) : (
          BUILD_OPTIONS.map(({ type, key }) => {
            const def = getBuildingDef(type)
            return (
              <button
                key={type}
                className="hudBtn"
                style={{ opacity: crystals >= def.cost ? 1 : 0.4 }}
                onClick={() => enterBuildMode(type)}
                disabled={crystals < def.cost}
              >
                [{key}] {def.name} ({def.cost})
              </button>
            )
          })
        )}
      </div>

      {/* Build error */}
      {buildError && buildErrorTimer > 0 && (
        <div style={{
          position: 'absolute', bottom: 54, left: '50%', transform: 'translateX(-50%)',
          color: '#ef4444', fontWeight: 'bold', fontSize: 14,
          textShadow: '0 0 4px rgba(0,0,0,0.8)',
          opacity: Math.min(1, buildErrorTimer),
        }}>
          {buildError}
        </div>
      )}

      {/* Drag selection box */}
      {dragRect && (
        <div style={{
          position: 'fixed',
          left: dragRect.x, top: dragRect.y,
          width: dragRect.w, height: dragRect.h,
          border: '1px solid #22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          pointerEvents: 'none',
          zIndex: 999,
        }} />
      )}

      {/* Controls */}
      <div className="hudHelp">
        <span>WASD: Pan</span>
        <span className="hudKeysSep">|</span>
        <span>Scroll: Zoom</span>
        <span className="hudKeysSep">|</span>
        <span>LClick: Select</span>
        <span className="hudKeysSep">|</span>
        <span>RClick: Command</span>
        <span className="hudKeysSep">|</span>
        <span>B: Build</span>
        <span className="hudKeysSep">|</span>
        <span>ESC: Pause</span>
      </div>

      {/* Minimap */}
      <Minimap />
    </div>
  )
}

function getTrainOptions(buildingType: string): { type: UnitType; key: string }[] {
  if (buildingType === 'hq') {
    return [{ type: 'worker', key: '1' }]
  }
  return [
    { type: 'soldier', key: '1' },
    { type: 'archer', key: '2' },
    { type: 'knight', key: '3' },
  ]
}
