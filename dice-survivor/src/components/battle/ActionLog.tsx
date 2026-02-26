import { useGameStore } from '../../store/gameStore.ts'

export function ActionLog() {
  const log = useGameStore(s => s.turn.log)

  if (log.length === 0) return null

  return (
    <div style={{
      padding: '8px 12px',
      background: 'var(--bg-secondary)',
      borderRadius: 8,
      border: '1px solid var(--border)',
      maxHeight: 100,
      overflowY: 'auto',
    }}>
      {log.map((entry, i) => (
        <div key={i} style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          padding: '2px 0',
          animation: 'fadeInUp 0.3s ease',
          animationDelay: `${i * 0.05}s`,
          animationFillMode: 'both',
        }}>
          {entry}
        </div>
      ))}
    </div>
  )
}
