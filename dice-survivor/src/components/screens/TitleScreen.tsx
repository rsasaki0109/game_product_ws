import { useGameStore } from '../../store/gameStore.ts'

export function TitleScreen() {
  const startRun = useGameStore(s => s.startRun)

  const gameplayMoments = [
    { tag: '01', title: '戦術で振る', body: '3つのダイスを組み替えて、敵の行動を読む。' },
    { tag: '02', title: '報酬で育てる', body: '勝ちと敗北の報酬を使って、次の戦いで強くなる。' },
    { tag: '03', title: '階段を上る', body: '敗北しなければ15階まで進行、バズる瞬間は連打的に発生。' },
  ]

  const playGuide = [
    ['1. START', '敵のHP/状態を見て、ダイスの役割を決める'],
    ['2. ROLL', '3つのサイコロを振って、最大火力と生存を両立'],
    ['3. CHOOSE', '報酬で面を改造し、次の階層を加速する'],
  ]

  const coreAppeal = [
    { icon: '⚡', title: '高密度な1ゲーム', body: '平均2〜3分で1セットを完結できる短期で、SNS映えしやすい。' },
    { icon: '🧬', title: 'カード×ローグ', body: '運要素と戦術が交差するため「次の一手」を毎回考えたくなる。' },
    { icon: '🎮', title: 'ブラウザ即起動', body: '追加インストールなし。URLを開くだけで遊べる。' },
  ]

  return (
    <div className="landing">
      <div className="landing-bg" />
      <main className="landing-shell">
        <section className="landing-hero">
          <figure className="landing-hero-visual" aria-hidden="true">
            <img src="/dice-survivor-hero.svg" alt="" />
          </figure>
          <p className="landing-kicker">Dice Survivor Landing</p>
          <h1 className="landing-title">ダイスサバイバー</h1>
          <p className="landing-subtitle">
            サイコロを振って敵の攻撃を受け流し、15階を突破する<br />
            ブラウザ版ローグライクバトル。
          </p>
          <div className="landing-actions">
            <button className="landing-primary-button" onClick={startRun}>
              今すぐブラウザでプレイ
            </button>
            <a className="landing-link-button" href="#gameplay">
              3ステップでゲーム理解
            </a>
          </div>
          <div className="landing-stats">
            <span>難易度: 中</span>
            <span>プレイ時間: 10〜20分</span>
            <span>要素: 盤面戦略 / 成長 / 運要素</span>
          </div>
        </section>

        <section className="landing-grid">
          {coreAppeal.map((feature, idx) => (
            <article className="landing-card landing-card-animated" style={{ animationDelay: `${idx * 0.12}s` }} key={feature.title}>
              <div className="landing-card-icon">{feature.icon}</div>
              <h2>{feature.title}</h2>
              <p>{feature.body}</p>
            </article>
          ))}
        </section>

        <section className="landing-loop" id="gameplay">
          <h3>ゲームループ</h3>
          <div className="landing-flow">
            {gameplayMoments.map(step => (
              <div className="landing-step" key={step.tag}>
                <div className="landing-step-tag">{step.tag}</div>
                <div>
                  <h4>{step.title}</h4>
                  <p>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-quickguide">
          <h3>30秒で覚える</h3>
          <ul>
            {playGuide.map(([title, text]) => (
              <li key={title}>
                <span>{title}</span>
                <p>{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="landing-cta">
          <p>「短くても強い体験」。 1プレイで盛り上がる導線を作って、配信・SNS映えしやすい体験を優先。</p>
          <button className="landing-primary-button landing-primary-button--large" onClick={startRun}>
            挑戦を始める
          </button>
        </section>
      </main>
    </div>
  )
}
