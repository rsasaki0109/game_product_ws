import { useGameStore } from '../../store/gameStore.ts'

export function GameOverScreen() {
  const phase = useGameStore(s => s.phase)
  const stats = useGameStore(s => s.runStats)
  const floor = useGameStore(s => s.floor)
  const returnToTitle = useGameStore(s => s.returnToTitle)

  const isVictory = phase === 'victory'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 20,
      padding: 32,
      animation: 'fadeIn 0.6s ease',
    }}>
      <div style={{ fontSize: 64, lineHeight: 1 }}>
        {isVictory ? '🏆' : '💀'}
      </div>
      <h1 style={{
        fontSize: 32,
        fontWeight: 800,
        color: isVictory ? 'var(--neon-yellow)' : 'var(--neon-red)',
        textShadow: isVictory
          ? '0 0 20px var(--neon-yellow)'
          : '0 0 20px var(--neon-red)',
      }}>
        {isVictory ? 'ダンジョン制覇！' : 'ゲームオーバー'}
      </h1>

      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 12,
        padding: '16px 24px',
        border: '1px solid var(--border)',
        minWidth: 220,
      }}>
        <StatRow label="到達階層" value={`${floor}F`} />
        <StatRow label="撃破数" value={`${stats.enemiesDefeated}`} />
        <StatRow label="総ダメージ" value={`${stats.totalDamageDealt}`} />
        <StatRow label="ターン数" value={`${stats.turnsPlayed}`} />
      </div>

      <button
        onClick={returnToTitle}
        style={{
          marginTop: 8,
          padding: '14px 48px',
          fontSize: 18,
          fontWeight: 700,
          background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))',
          color: '#fff',
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(79, 195, 247, 0.4)',
        }}
      >
        もう一度
      </button>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '6px 0',
      fontSize: 14,
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  )
}
