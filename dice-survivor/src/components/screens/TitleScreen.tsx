import { useGameStore } from '../../store/gameStore.ts'

export function TitleScreen() {
  const startRun = useGameStore(s => s.startRun)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 24,
      padding: 32,
      animation: 'fadeIn 0.6s ease',
    }}>
      <div style={{ fontSize: 72, lineHeight: 1 }}>🎲</div>
      <h1 style={{
        fontSize: 36,
        fontWeight: 800,
        background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textAlign: 'center',
      }}>
        ダイスサバイバー
      </h1>
      <p style={{
        fontSize: 14,
        color: 'var(--text-secondary)',
        textAlign: 'center',
        maxWidth: 300,
        lineHeight: 1.6,
      }}>
        サイコロを振って敵を倒せ。<br />
        面をカスタマイズして最強のビルドを作り、<br />
        ダンジョン15階を突破しろ。
      </p>
      <button
        onClick={startRun}
        style={{
          marginTop: 16,
          padding: '16px 56px',
          fontSize: 20,
          fontWeight: 700,
          background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))',
          color: '#fff',
          borderRadius: 14,
          boxShadow: '0 4px 24px rgba(79, 195, 247, 0.4)',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        はじめる
      </button>
    </div>
  )
}
