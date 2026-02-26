import { useCallback, useRef } from 'react'
import { useGameStore } from '../../store/gameStore.ts'
import { DieView } from './DieView.tsx'

export function DiceArea() {
  const player = useGameStore(s => s.player)
  const phase = useGameStore(s => s.phase)
  const turn = useGameStore(s => s.turn)
  const rollDice = useGameStore(s => s.rollDice)
  const resolveRoll = useGameStore(s => s.resolveRoll)
  const landedCount = useRef(0)

  const isRolling = phase === 'battle_rolling'
  const canRoll = phase === 'battle_player_turn'

  const handleRoll = useCallback(() => {
    if (!canRoll) return
    landedCount.current = 0
    rollDice()
  }, [canRoll, rollDice])

  const handleLanded = useCallback(() => {
    landedCount.current += 1
    if (landedCount.current >= 3) {
      setTimeout(() => resolveRoll(), 300)
    }
  }, [resolveRoll])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      padding: '16px 0',
    }}>
      {/* Dice */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {player.dice.map((die, i) => {
          const result = turn.rollResults.find(r => r.dieId === die.id)
          return (
            <DieView
              key={die.id}
              die={die}
              rolledFaceIndex={result?.rolledFaceIndex}
              rolling={isRolling}
              delay={i * 200}
              onLanded={handleLanded}
            />
          )
        })}
      </div>

      {/* Roll summary */}
      {turn.rollResults.length > 0 && phase !== 'battle_rolling' && (
        <div style={{
          display: 'flex',
          gap: 16,
          fontSize: 14,
          animation: 'fadeInUp 0.3s ease',
        }}>
          {turn.totalDamage > 0 && (
            <span style={{ color: 'var(--neon-red)' }}>⚔️ {turn.totalDamage}</span>
          )}
          {turn.totalShield > 0 && (
            <span style={{ color: 'var(--neon-blue)' }}>🛡️ {turn.totalShield}</span>
          )}
          {turn.totalHeal > 0 && (
            <span style={{ color: 'var(--neon-green)' }}>❤️ {turn.totalHeal}</span>
          )}
        </div>
      )}

      {/* Combo indicator */}
      {turn.combos.length > 0 && phase !== 'battle_rolling' && (
        <div style={{
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--neon-yellow)',
          animation: 'comboFlash 0.6s ease infinite',
        }}>
          {turn.combos.map(c => c.bonusLabel).join(' ')}
        </div>
      )}

      {/* Roll button */}
      <button
        onClick={handleRoll}
        disabled={!canRoll}
        style={{
          padding: '14px 48px',
          fontSize: 18,
          fontWeight: 700,
          background: canRoll
            ? 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))'
            : 'rgba(255,255,255,0.1)',
          color: canRoll ? '#fff' : 'var(--text-secondary)',
          borderRadius: 12,
          boxShadow: canRoll ? '0 4px 20px rgba(79, 195, 247, 0.4)' : 'none',
          transition: 'all 0.2s',
          transform: canRoll ? 'scale(1)' : 'scale(0.95)',
          minWidth: 160,
        }}
      >
        🎲 ロール
      </button>
    </div>
  )
}
