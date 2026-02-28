import { useGameStore } from '../../store/gameStore.ts'

export function TitleScreen() {
  const startRun = useGameStore(s => s.startRun)

  const gameplayMoments = [
    { tag: '01', title: 'ルーレットじゃない、戦術', body: '3つのダイスを毎ターン再編成し、敵の行動を読んで組み合わせる。' },
    { tag: '02', title: '選んで強くなれる', body: '敗北や勝利で獲得する報酬を使い、面の改造・体力拡張を進める。' },
    { tag: '03', title: '逃げたくなる難易度', body: '階層が進むたび敵のパターンが変化し、短時間で盛り上がる。' },
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
