interface HpBarProps {
  current: number
  max: number
  shield?: number
  height?: number
  showLabel?: boolean
}

export function HpBar({ current, max, shield = 0, height = 12, showLabel = true }: HpBarProps) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const color = pct > 60 ? 'var(--hp-green)' : pct > 30 ? 'var(--hp-yellow)' : 'var(--hp-red)'

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        width: '100%',
        height,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: height / 2,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: height / 2,
          transition: 'width 0.4s ease, background 0.4s ease',
          boxShadow: `0 0 8px ${color}44`,
        }} />
        {shield > 0 && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${Math.min(100, ((current + shield) / max) * 100)}%`,
            height: '100%',
            background: 'rgba(79, 195, 247, 0.3)',
            borderRadius: height / 2,
            border: '1px solid var(--neon-blue)',
          }} />
        )}
      </div>
      {showLabel && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: 'var(--text-secondary)',
          marginTop: 2,
        }}>
          <span>{current}/{max}</span>
          {shield > 0 && <span style={{ color: 'var(--neon-blue)' }}>🛡️{shield}</span>}
        </div>
      )}
    </div>
  )
}
