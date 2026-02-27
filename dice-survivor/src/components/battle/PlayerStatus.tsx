import { useGameStore } from '../../store/gameStore.ts'
import { HpBar } from '../shared/HpBar.tsx'

export function PlayerStatus() {
  const player = useGameStore(s => s.player)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 16px',
      background: 'var(--bg-secondary)',
      borderRadius: 8,
      border: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 24 }}>🧙‍♂️</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>
          あなた
          {player.statusEffects.length > 0 && (
            <span style={{ marginLeft: 8 }}>
              {player.statusEffects.map((se, i) => (
                <span key={i} style={{ marginLeft: 4, fontSize: 11 }}>
                  {se.type === 'burn' ? '🔥' : se.type === 'poison' ? '💀' : se.type === 'weakness' ? '⬇️' : '⬆️'}
                  {se.stacks}
                </span>
              ))}
            </span>
          )}
        </div>
        <HpBar current={player.currentHp} max={player.maxHp} shield={player.shield} />
      </div>
    </div>
  )
}
