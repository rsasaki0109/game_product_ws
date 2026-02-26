import { useEffect, useCallback } from 'react'
import { useGameStore } from '../../store/gameStore.ts'
import { PlayerStatus } from './PlayerStatus.tsx'
import { EnemyDisplay } from './EnemyDisplay.tsx'
import { DiceArea } from './DiceArea.tsx'
import { ActionLog } from './ActionLog.tsx'

export function BattleScene() {
  const phase = useGameStore(s => s.phase)
  const floor = useGameStore(s => s.floor)
  const maxFloor = useGameStore(s => s.maxFloor)
  const enemy = useGameStore(s => s.enemy)
  const doEnemyTurn = useGameStore(s => s.doEnemyTurn)
  const setPhase = useGameStore(s => s.setPhase)

  // Auto-advance after resolving → enemy turn
  const advanceAfterResolve = useCallback(() => {
    if (phase === 'battle_resolving') {
      const timer = setTimeout(() => doEnemyTurn(), 800)
      return () => clearTimeout(timer)
    }
  }, [phase, doEnemyTurn])

  useEffect(() => {
    return advanceAfterResolve()
  }, [advanceAfterResolve])

  // Auto-advance enemy turn → back to player
  useEffect(() => {
    if (phase === 'battle_enemy_turn') {
      const timer = setTimeout(() => setPhase('battle_player_turn'), 1200)
      return () => clearTimeout(timer)
    }
  }, [phase, setPhase])

  const isBoss = enemy?.def.isBoss

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '12px 16px',
      gap: 8,
      maxWidth: 480,
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 13,
        color: 'var(--text-secondary)',
      }}>
        <span>
          {isBoss ? '⚠️ ボス戦' : `${floor}F / ${maxFloor}F`}
        </span>
        <span style={{
          fontSize: 11,
          padding: '2px 8px',
          borderRadius: 4,
          background: 'rgba(255,255,255,0.06)',
        }}>
          {phase === 'battle_player_turn' && 'あなたのターン'}
          {phase === 'battle_rolling' && 'ロール中...'}
          {phase === 'battle_resolving' && '効果発動中...'}
          {phase === 'battle_enemy_turn' && '敵のターン'}
        </span>
      </div>

      {/* Player Status */}
      <PlayerStatus />

      {/* Enemy */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <EnemyDisplay />
      </div>

      {/* Dice Area */}
      <DiceArea />

      {/* Action Log */}
      <ActionLog />
    </div>
  )
}
