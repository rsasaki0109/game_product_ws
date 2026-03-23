import { useGameStore } from '../store/gameStore.ts'
import { getUnitDef } from '../data/units.ts'
import { getBuildingDef } from '../data/buildings.ts'
import type { BuildingType, UnitType } from '../types/game.ts'
import Minimap from './Minimap.tsx'

const BUILD_OPTIONS: { type: BuildingType; key: string }[] = [
  { type: 'barracks', key: '1' },
  { type: 'factory', key: '2' },
  { type: 'tower', key: '3' },
  { type: 'refinery', key: '4' },
]

const TUTORIAL_STEPS = [
  'Your HQ is bottom-left. Enemy HQ is top-right. Destroy it to win!',
  'Select workers and right-click iron nodes to gather',
  'Press B to build: Barracks(120), Factory(300), Tower(120), Refinery(180)',
  'Select a building and press 1-3 to train combat units',
  'Send your army to the enemy base! Right-click to attack',
]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function HUD() {
  const phase = useGameStore(s => s.phase)
  const iron = useGameStore(s => s.iron)
  const elapsed = useGameStore(s => s.elapsed)
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
  const underAttack = useGameStore(s => s.underAttack)
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
    const bestTime = localStorage.getItem('ironConquestBestTime')
    return (
      <div className="hud">
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto' }}>
          <div style={{
            fontSize: 32, fontWeight: 900, letterSpacing: '0.12em',
            background: 'linear-gradient(180deg, #f97316 0%, #ef4444 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 12px rgba(249,115,22,0.6)) drop-shadow(0 0 24px rgba(239,68,68,0.3))',
            marginBottom: 8,
          }}>
            IRON CONQUEST
          </div>
          <div className="hudCenterBody" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              Gather iron, build your army, and destroy the enemy headquarters to achieve victory.
            </div>
            {bestTime && (
              <div style={{ color: '#f97316', fontSize: 12, marginTop: 4 }}>
                Best Victory Time: {formatTime(parseFloat(bestTime))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
            {(['easy', 'normal', 'hard'] as const).map(d => (
              <button key={d} className="hudBtn" style={{
                padding: '4px 12px', fontSize: 11,
                background: difficulty === d ? 'rgba(249,115,22,0.4)' : undefined,
                border: difficulty === d ? '1px solid #f97316' : undefined,
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

  // Victory
  if (phase === 'victory') {
    return (
      <div className="hud">
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto' }}>
          <div className="hudCenterTitle" style={{ color: '#22c55e', fontSize: 18 }}>VICTORY!</div>
          <div className="hudCenterBody" style={{ marginBottom: 12 }}>
            <div>Enemy HQ destroyed! Time: {formatTime(elapsed)}</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
              Enemy Units Killed: {stats.enemyUnitsKilled} | Units Trained: {stats.unitsTrainedTotal}
            </div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>
              Buildings Built: {stats.buildingsBuilt} | Iron Gathered: {Math.floor(stats.resourcesGathered)}
            </div>
          </div>
          <button className="hudBtn hudBtnPrimary" onClick={startGame}>PLAY AGAIN</button>
          <button className="hudBtn" onClick={returnToTitle} style={{ marginLeft: 8 }}>TITLE</button>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 8 }}>[R] Quick Restart</div>
        </div>
      </div>
    )
  }

  // Defeat
  if (phase === 'defeat') {
    return (
      <div className="hud">
        <div className="hudCenterOverlay" style={{ pointerEvents: 'auto' }}>
          <div className="hudCenterTitle" style={{ color: '#ef4444', fontSize: 18 }}>DEFEAT</div>
          <div className="hudCenterBody" style={{ marginBottom: 12 }}>
            <div>Your HQ was destroyed! Time survived: {formatTime(elapsed)}</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
              Enemy Units Killed: {stats.enemyUnitsKilled} | Units Trained: {stats.unitsTrainedTotal}
            </div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>
              Buildings Built: {stats.buildingsBuilt} | Iron Gathered: {Math.floor(stats.resourcesGathered)}
            </div>
          </div>
          <button className="hudBtn hudBtnPrimary" onClick={startGame}>RETRY</button>
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
          <div className="hudCenterTitle" style={{ fontSize: 14, color: '#f97316' }}>
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

      {/* Top-left: game stats */}
      <div className="hudTop">
        <div className="hudStat" style={{ color: '#f97316', fontWeight: 900, fontSize: 11 }}>
          {formatTime(elapsed)}
        </div>
        <div className="hudTitle">IRON CONQUEST</div>
        <div className="hudStat" style={{ color: '#06b6d4' }}>
          Iron: {Math.floor(iron)}
        </div>
        <div className="hudStat">Units: {playerUnits.length}</div>
        <div className="hudStat" style={{ fontSize: 10, opacity: 0.8 }}>
          {(['worker', 'militia', 'ranger', 'tank', 'artillery'] as UnitType[])
            .map(t => {
              const c = playerUnits.filter(u => u.def.type === t).length
              return c > 0 ? `${t[0].toUpperCase() + t.slice(1)}s: ${c}` : null
            })
            .filter(Boolean)
            .join(' | ')
          }
        </div>
        <div className="hudStat" style={{ color: '#ef4444', fontSize: 10 }}>
          Enemy: {enemyUnits.filter(u => u.def.type !== 'worker').length} combat / {enemyUnits.filter(u => u.def.type === 'worker').length} workers
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
              {(['worker', 'militia', 'ranger', 'tank', 'artillery'] as UnitType[])
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
          {selectedBuilding.isBuilt && selectedBuilding.owner === 'player' && (
            <div className="hudTrainBar" style={{ pointerEvents: 'auto' }}>
              {getTrainOptions(selectedBuilding.def.type).map(({ type, key }) => {
                const def = getUnitDef(type)
                return (
                  <button
                    key={type}
                    className="hudBtn"
                    style={{ fontSize: 11, padding: '6px 8px', opacity: iron >= def.cost ? 1 : 0.4 }}
                    onClick={() => trainUnit(selectedBuilding.uid, type)}
                    disabled={iron < def.cost}
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
                style={{ opacity: iron >= def.cost ? 1 : 0.4 }}
                onClick={() => enterBuildMode(type)}
                disabled={iron < def.cost}
              >
                [{key}] {def.name} ({def.cost})
              </button>
            )
          })
        )}
      </div>

      {/* Under Attack alert */}
      {underAttack && !paused && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#ef4444', fontWeight: 'bold', fontSize: 24,
          textShadow: '0 0 8px rgba(239,68,68,0.8)',
          animation: 'pulse-flash 0.5s infinite alternate',
          pointerEvents: 'none',
        }}>
          UNDER ATTACK!
        </div>
      )}

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
  if (buildingType === 'barracks') {
    return [
      { type: 'militia', key: '1' },
      { type: 'ranger', key: '2' },
    ]
  }
  if (buildingType === 'factory') {
    return [
      { type: 'tank', key: '1' },
      { type: 'artillery', key: '2' },
    ]
  }
  return []
}
