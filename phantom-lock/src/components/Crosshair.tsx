import { useGameStore } from '../store/gameStore.ts'

export default function Crosshair() {
  const active = useGameStore(s => s.lockOn.active)
  const lockCount = useGameStore(s => s.lockOn.lockedUids.length)

  const size = active ? 28 : 20
  const color = active ? (lockCount > 0 ? '#ef4444' : '#22d3ee') : 'rgba(255,255,255,0.7)'

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: 20,
    }}>
      {/* Crosshair lines */}
      <div style={{ position: 'absolute', left: -size, top: -1, width: size - 4, height: 2, background: color }} />
      <div style={{ position: 'absolute', right: -size, top: -1, width: size - 4, height: 2, background: color }} />
      <div style={{ position: 'absolute', top: -size, left: -1, height: size - 4, width: 2, background: color }} />
      <div style={{ position: 'absolute', bottom: -size, left: -1, height: size - 4, width: 2, background: color }} />
      {/* Center dot */}
      <div style={{
        position: 'absolute',
        top: -2, left: -2,
        width: 4, height: 4,
        borderRadius: '50%',
        background: color,
      }} />
      {/* Lock count */}
      {active && lockCount > 0 && (
        <div style={{
          position: 'absolute',
          top: size + 4, left: '50%', transform: 'translateX(-50%)',
          fontSize: 14, fontWeight: 900, color: '#ef4444',
          fontFamily: 'Consolas, monospace',
          textShadow: '0 0 8px #ef4444',
        }}>
          x{lockCount} LOCK
        </div>
      )}
    </div>
  )
}
