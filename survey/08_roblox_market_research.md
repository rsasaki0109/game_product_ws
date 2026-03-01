# 8. Roblox市場調査（Gravity Obby Chaos向け / 2026-03-02時点）

## 結論（短文化）
- Robloxは2025年時点で**DAU 97.8M（前年比+26%）**まで拡大しており、配信先として十分大きい。
- Discover配信の実務では、**短時間の満足度（qPTR）**と**翌日継続（D1）**が初速の鍵。
- 公式データ上、モバイル利用が強く、検索ワードでも「obby」系が目立つため、  
  `Gravity Obby Chaos` は**モバイル最適化 + 協力プレイ導線 + クリップ演出**を優先すると勝ち筋が明確。

---

## 1) 市場規模と成長（公式IRベース）

| 指標 | 数値 | 出典 |
|---|---:|---|
| DAU（2025年Q4） | 97.8M（+26% YoY） | Roblox 2025 Q4 Shareholder Letter |
| Bookings（2025年通期） | $4.36B（+Bookings/DAU で収益密度改善） | 同上 |
| Monthly Unique Payers（2025年Q4） | 20.2M（+28% YoY） | Roblox Q4 2025 Supplemental |
| 平均月間体験数（1ユーザー） | 24以上（2025年） | 2025 Q4 Shareholder Letter |

### 含意
- ユーザー母数は十分大きく、かつ課金者数も増加しているため、  
  無課金拡散→後追い課金（スキン/VIP）の設計と相性が良い。
- 1ユーザーが複数体験を横断する前提なので、  
  **「1回遊んで理解できる差別化」**が流入初期の最重要項目になる。

---

## 2) Discoverで伸ばすための実務ポイント（Roblox公式説明）

Robloxの推薦は、ホーム推薦を中心に以下の指標を重視。

- `qPTR`（qualified play-through rate）: クリック後に一定時間プレイを継続した率
- `D1 retention`: 翌日継続率
- 長時間離脱の回避（クラッシュ率・離脱率）

補足:
- 2024年のDiscover更新では、推薦対象をセッション冒頭60分に最適化する説明あり。
- 同更新時点では、ホーム推薦が流入の大半で、Discoverタブ経由は限定的という説明あり。

### 含意（Gravity Obby Chaos）
- 最初の5分で「重力が気持ちいい」「笑える事故が起こる」体験を確実に作る。
- 初回離脱を防ぐため、チュートリアルは短く、1ラウンド目の勝敗演出を強くする。
- ステージ3（Gravity Storm）は学習コストが高いため、初心者帯では頻度を下げる。

---

## 3) Roblox内でのObby機会

公式情報から確認できる事実:
- 2025年の年次振り返りで、モバイルユーザーは「obby」系コンテンツを好む傾向が言及。
- ジャンル体系でも、`Obstacle Courses and Platformer` が独立カテゴリ化され、  
  `Classic Obby / Runner / Tower` などサブジャンルが明示。

### 含意
- `Gravity Obby Chaos` は「Obby文法」に乗せつつ、  
  **重力反転**を差別化要素として追加する設計が妥当。
- ただし完全新規文法に寄せすぎると学習コストが上がるため、  
  「見た目はObby、体験の核心だけ新しい」を守るべき。

---

## 4) 収益化と拡散設計（2025-2026仕様）

### 4-1. 収益機会
- Roblox公式公表では、2024-03〜2025-03にクリエイターへのDevEx支払いが$923M超。
- Creator Rewards（2025-07-24開始）で、
  - 新規連れ込みユーザーの消費に対する還元
  - デイリーエンゲージメント還元
  が追加。

### 4-2. 拡散導線
- Friend Referral Reward（招待報酬）は、  
  招待成立条件として「友達との一定時間プレイ（例: 5分以上）」を要求する仕様がある。

### 含意（Gravity Obby Chaos）
- **短い協力セッション（5〜10分）**を成立させると、招待導線と噛み合う。
- 課金は機能優位より見た目優位（スキン/トレイル/エフェクト）を先に作る。

---

## 5) Gravity Obby Chaos向け実行優先度（2週間）

1. **モバイル最適化（最優先）**
   - タッチUIで重力切替・アイテム使用を1タップ化
   - 低スペック端末向けにエフェクト品質を段階設定

2. **初回5分体験の改善**
   - 初心者ラウンドでは`Gravity Flip`中心に限定
   - `Gravity Shift/Storm`は段階解放
   - 初回完走ボーナスを強化して離脱率を抑制

3. **協力・招待導線**
   - 2人以上で開始時のボーナス（コイン/演出）を追加
   - 「友達と1レース完走」で即報酬のタスクを実装

4. **課金導線の初期実装**
   - スキン・トレイル・勝利エフェクトを先行投入
   - VIPは勝敗バランスに影響しない範囲で提供

5. **計測（必須）**
   - `qPTR`相当の初回継続率
   - D1継続率
   - ステージ別離脱率
   - 端末別（mobile/pc/console）クラッシュ率

---

## 6) 追加調査タスク（次の一手）

- Roblox Chartsを**デバイス/国フィルタ付き**で週次観測し、  
  Obby上位体験の「ラウンド長」「導入速度」「課金UI」を比較記録する。
- 競合ベンチマーク表（10本）を作成し、  
  `Gravity Obby Chaos` の差分を定点更新する。

---

## 参照（一次情報中心）
- Roblox Investor Relations - Q4 2025 Shareholder Letter (PDF): https://s28.q4cdn.com/656992979/files/doc_financials/2025/q4/Roblox-Q4-2025-Shareholder-Letter_FINAL.pdf
- Roblox Investor Relations - Q4 2025 Supplemental Materials: https://s28.q4cdn.com/656992979/files/doc_financials/2025/q4/Roblox-Q4-2025-Supplemental-Materials_FINAL.pdf
- Roblox Corporate - 2025 Economic Impact Report: https://corp.roblox.com/newsroom/2025/07/roblox-2025-economic-impact-report
- DevForum - Introducing Creator Rewards: https://devforum.roblox.com/t/introducing-creator-rewards-earn-more-by-growing-the-community/3902073
- DevForum - About discovery on Roblox and charts: https://devforum.roblox.com/t/about-discovery-on-roblox-and-charts/2930843
- DevForum - Discovery updates for September (2024): https://devforum.roblox.com/t/discovery-updates-for-september-2024/3156356
- DevForum - Introducing updates to genres and subgenres: https://devforum.roblox.com/t/introducing-updates-to-genres-and-subgenres/3820080
- Roblox 2025 Replay: https://www.roblox.com/year/2025
- Roblox Support - Friend Referral Reward: https://en.help.roblox.com/hc/en-us/articles/24125517642644-Friend-Referral-Reward
