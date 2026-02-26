import { useGameStore } from '../../store/gameStore.ts'
import { HpBar } from '../shared/HpBar.tsx'

export function EnemyDisplay() {
  const enemy = useGameStore(s => s.enemy)
  const phase = useGameStore(s => s.phase)

  if (!enemy) return null

  const isDead = enemy.currentHp <= 0
  const isShaking = phase === 'battle_resolving' && !isDead

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      padding: 16,
      animation: isShaking ? 'shake 0.3s ease' : undefined,
    }}>
      <div style={{
        fontSize: 64,
        lineHeight: 1,
        filter: isDead ? 'grayscale(1) opacity(0.4)' : undefined,
        transition: 'filter 0.5s',
      }}>
        {enemy.def.emoji}
      </div>

      <div style={{
        fontSize: 16,
        fontWeight: 600,
        color: enemy.def.isBoss ? 'var(--neon-yellow)' : 'var(--text-primary)',
        textShadow: enemy.def.isBoss ? '0 0 10px var(--neon-yellow)' : undefined,
      }}>
        {enemy.def.isBoss && '👑 '}{enemy.def.name}
      </div>

      <div style={{ width: '60%', minWidth: 120, maxWidth: 200 }}>
        <HpBar current={enemy.currentHp} max={enemy.maxHp} shield={enemy.shield} />
      </div>

      {enemy.statusEffects.length > 0 && (
        <div style={{ display: 'flex', gap: 6, fontSize: 12 }}>
          {enemy.statusEffects.map((se, i) => (
            <span key={i} style={{
              padding: '2px 6px',
              borderRadius: 4,
              background: 'rgba(255,255,255,0.08)',
            }}>
              {se.type === 'burn' ? '🔥' : se.type === 'poison' ? '💀' : ''}
              {se.stacks} ({se.turnsRemaining}t)
            </span>
          ))}
        </div>
      )}

      {!isDead && (
        <div style={{
          marginTop: 4,
          padding: '4px 12px',
          borderRadius: 6,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid var(--border)',
          fontSize: 13,
          color: 'var(--text-secondary)',
          animation: 'pulse 2s infinite',
        }}>
          次の行動: {enemy.currentIntent.emoji} {enemy.currentIntent.label}
        </div>
      )}
    </div>
  )
}
