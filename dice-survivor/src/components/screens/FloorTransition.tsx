import { useEffect } from 'react'
import { useGameStore } from '../../store/gameStore.ts'
import { isBossFloor } from '../../logic/dungeon.ts'

export function FloorTransition() {
  const floor = useGameStore(s => s.floor)
  const startBattle = useGameStore(s => s.startBattle)
  const isBoss = isBossFloor(floor)

  useEffect(() => {
    const timer = setTimeout(() => startBattle(), 1500)
    return () => clearTimeout(timer)
  }, [startBattle])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 16,
      animation: 'slideDown 0.5s ease',
    }}>
      <div style={{
        fontSize: 48,
        fontWeight: 800,
        color: isBoss ? 'var(--neon-red)' : 'var(--neon-blue)',
        textShadow: isBoss
          ? '0 0 30px var(--neon-red), 0 0 60px var(--neon-red)'
          : '0 0 20px var(--neon-blue)',
      }}>
        {isBoss ? '⚠️ BOSS ⚠️' : `${floor}F`}
      </div>
      {isBoss && (
        <div style={{
          fontSize: 16,
          color: 'var(--neon-yellow)',
          animation: 'pulse 1s infinite',
        }}>
          ボス出現！
        </div>
      )}
    </div>
  )
}
