# Game Product Workspace — Codex引き継ぎ計画書

> **最終更新**: 2026-03-26
> **目的**: このドキュメントはAIコーディングアシスタント（Codex等）への引き継ぎ資料。
> プロジェクト全体の背景・設計思想・現在の進捗・残タスク・技術的な注意点を網羅する。

---

## 目次
1. [プロジェクト概要](#1-プロジェクト概要)
2. [ワークスペース構成](#2-ワークスペース構成)
3. [技術スタック](#3-技術スタック)
4. [ブラウザゲーム 8本 — 詳細](#4-ブラウザゲーム-8本--詳細)
5. [Robloxゲーム 11本 — 詳細](#5-robloxゲーム-11本--詳細)
6. [インフラ・ツール](#6-インフラツール)
7. [品質状態・既知の問題](#7-品質状態既知の問題)
8. [公開状態](#8-公開状態)
9. [今後やるべきこと（優先順位付き）](#9-今後やるべきこと優先順位付き)
10. [各ゲームの改善ロードマップ](#10-各ゲームの改善ロードマップ)
11. [コード規約・パターン](#11-コード規約パターン)
12. [開発コマンド集](#12-開発コマンド集)

---

## 1. プロジェクト概要

### ミッション
ブラウザとRobloxの2プラットフォームでオリジナルゲームを開発・公開し、ユーザーを獲得する。

### 現状サマリー
- **ブラウザゲーム 8本**: 全て公開済み（GitHub Pages）
- **Robloxゲーム 11本**: コード完成済み、Roblox Studio でのテスト待ち
- **公開URL**: https://rsasaki0109.github.io/game_product_ws/
- **GitHubリポジトリ**: https://github.com/rsasaki0109/game_product_ws (public)
- **自動テスト**: 全19ゲーム分のテストスイート完備
- **ドッグフーディング**: 5ラウンド実施、41→12問題に削減

### 最重要課題
**ユーザー獲得がゼロ。** ゲームは作ったが誰にも遊んでもらっていない。技術的な品質向上より、マーケティング・配信・フィードバックループの構築が最優先。

### 重点ゲーム（6本に絞り込み済み）
- ブラウザ: **Burger Brawl**, **Phantom Lock**, **Couch Chaos**
- Roblox: **Gravity Flip Arena**, **Clone Chaos**, **Size Shifter**

---

## 2. ワークスペース構成

```
C:\Users\rsasa\Workspace\game_product_ws\
│
├── README.md                      # GitHub表示用（ゲーム一覧+プレイリンク）
├── plan.md                        # ← この文書
├── .gitignore
├── .github/workflows/deploy-pages.yml  # GitHub Actions自動デプロイ
│
├── ── ブラウザゲーム（8本）────────
├── hack-and-slash/                # 見下ろしハクスラ
├── burger-brawl/                  # バーガー店員バトル ★重点
├── phantom-lock/                  # マルチロックオンシューター ★重点
├── crystal-siege-rts/             # 防衛型RTS
├── iron-conquest/                 # 攻撃型RTS
├── couch-chaos/                   # ソファ対戦レース ★重点
├── climb-clash/                   # ボルダリング妨害バトル
├── quad-clash/                    # 4種競技妨害バトル
│
├── ── Robloxゲーム（既存改修6本）──
├── baseball-brawl-roblox/         # カオス野球 (+RAGE MODE)
├── blink-door-brawl-roblox/       # ドアテレポPvP (+DOOR COMBO)
├── bubble-drifter-roblox/         # バブルレース (+BUBBLE MERGE)
├── hot-air-havoc-roblox/          # 熱気球サバイバル (+GRAPPLE HOOK)
├── roll-ball-rush-roblox/         # ボールレース (+POWER-UPS)
├── word-step-run-roblox/          # パルクール (+PUSH/TRAP)
│
├── ── Robloxゲーム（新作5本）─────
├── gravity-flip-roblox/           # 重力反転PvP ★重点
├── magnet-wars-roblox/            # 磁石PvP
├── size-shifter-roblox/           # サイズ変更バトル ★重点
├── clone-chaos-roblox/            # クローン分身バトル ★重点
├── echo-tag-roblox/               # ソナー暗闘鬼ごっこ
│
├── ── インフラ ──────────────────
├── portal/index.html              # ゲームポータルサイト
├── docs/                          # GitHub Pages デプロイ先
├── publish/                       # itch.io用ZIPアーカイブ
├── scripts/
│   ├── test-all-browser.mjs       # ブラウザ8本テスト
│   ├── test-all-roblox.mjs        # Roblox11本テスト
│   ├── dogfood-browser.mjs        # ドッグフーディング
│   ├── serve-portal.mjs           # ローカルポータルサーバー
│   └── publish-itch.md            # itch.io公開ガイド
│
├── ── その他（既存/未使用）───────
├── dice-survivor/                 # 既存（ダイスサバイバー）
├── death-high-roller/             # 既存（ブラックジャック+ホラー）
├── color-turf-clash/              # 既存Roblox
└── Assets/, Packages/, ProjectSettings/  # Unity（未使用）
```

---

## 3. 技術スタック

### ブラウザゲーム共通
| 技術 | バージョン | 用途 |
|------|-----------|------|
| React | 19.2.0 | UI + コンポーネント |
| Three.js | 0.182.0 | 3Dレンダリング |
| React Three Fiber | 9.5.0 | React-Three.js統合 |
| @react-three/drei | 10.7.7 | Three.jsヘルパー |
| Zustand | 5.0.11 | 状態管理（シングルストア） |
| Vite | 7.3.1 | ビルドツール |
| TypeScript | 5.9.3 | 型付き言語 |
| Web Audio API | ブラウザ内蔵 | 音声合成（外部ファイル不要） |

### Robloxゲーム共通
| 技術 | 用途 |
|------|------|
| Luau | Roblox スクリプト言語 |
| Rojo | ファイルシステム⇔Studio同期 |
| Selene | Luau リンター |
| RemoteEvent | クライアント-サーバー通信 |
| RunService.Heartbeat | ゲームループ |

### ブラウザゲーム プロジェクト構成（全8本統一）
```
game-name/
├── package.json
├── vite.config.ts          # base: './' でビルド
├── tsconfig.json, tsconfig.app.json, tsconfig.node.json
├── eslint.config.js
├── index.html
├── test-play.mjs           # 自動テスト
└── src/
    ├── main.tsx, App.tsx, index.css
    ├── types/game.ts        # 全型定義 (GamePhase, Difficulty 含む)
    ├── data/                # 静的データ
    ├── logic/               # 純粋関数
    │   └── sound.ts         # Web Audio API 合成音
    ├── store/gameStore.ts   # Zustand（全状態 + tick() + 全アクション）
    └── components/          # R3Fコンポーネント + HUD
```

### Robloxゲーム プロジェクト構成（全11本統一）
```
game-name-roblox/
├── default.project.json, selene.toml, test-play.mjs
└── src/
    ├── server/
    │   ├── Boot.server.luau       # ラウンド状態マシン
    │   ├── MatchManager.server.luau # 全メカニクス
    │   └── ArenaBuilder.luau      # アリーナ生成
    ├── shared/GameConfig.luau     # 定数
    └── gui/HUD.client.luau        # クライアントUI+入力+エフェクト
```

---

## 4. ブラウザゲーム 8本 — 詳細

### 4.1 Burger Brawl 🍔 ★重点
- **コンセプト**: バーガー店員。普通客に接客、モンスター客をパンチ/バズーカで撃退
- **操作**: A/D レーン、QWER 料理、Space パンチ、F バズーカ
- **差別化**: 「接客+戦闘」の組合せはユニーク。SNS映え
- **独自メカニクス**: ラッシュ制(30秒毎)、速度ボーナス(2秒以内提供2x)、ゴールデン客(+ライフ/弾薬)、ストリーク
- **4種モンスター**: Karenzilla(赤,怒り眉), CreamThrower(ピンク丸), TableFlipper(茶,巨大腕), ScreamKing(紫,スパイク王冠)
- **バランス**: ライフ3、パンチCD0.2s、弾薬5発(6秒リジェネ)、モンスター15秒後出現開始
- **完成度**: 92%

### 4.2 Phantom Lock 🎯 ★重点
- **コンセプト**: ZOE/パンドラ風マルチロックオン。最大8体ロック→ホーミング一斉発射
- **操作**: WASD移動、マウスカメラ、LMBクイック、RMB長押しロックオン、Space回避
- **差別化**: マルチロックオンブラウザゲームはほぼ無い
- **独自メカニクス**: ロック円錐0.35rad、ホーミング旋回制限、QUAD/MAX LOCKボーナス、CHAIN KILL、ウェーブサマリー
- **敵4種**: Drone(回転ブレード,HP12), Turret(砲身,HP25), Heavy(装甲板,HP45), Boss(5目+王冠,HP120)
- **バランス**: HP200、エネルギー150(回復16/s)、ロック消費3/体、ミサイルdmg24
- **完成度**: 93%

### 4.3 Couch Chaos 🛋️ ★重点
- **コンセプト**: ソファで2人レース。物理妨害（押す/目隠し/枕/くすぐり）OK
- **操作**: 矢印/WASD 走り+ジャンプ、TYUI 物理妨害
- **差別化**: 「ゲーム内ゲーム+物理妨害」はユニーク
- **独自メカニクス**: パワーアップ3種(速度/シールド/スタン)、スピードパッド、ランプ、カムバック機能、フォトフィニッシュ
- **ビジュアル**: リビングルーム(ランプ,テーブル,ポップコーン)、TVスキャンライン+VS、コミック衝撃星、トレイル、パララックス背景
- **バランス**: 押し0.6s、目隠し1s、枕1.2s、くすぐり2s
- **完成度**: 90%

### 4.4 Hack & Slash ⚔️
- **コンセプト**: 見下ろしハクスラ。10フロア踏破
- **独自要素**: RL AI (Q-learning) が自動プレイ可能 (`test-play-rl.mjs`)
- **完成度**: 85%、差別化: 低（ハクスラは飽和）

### 4.5 Crystal Siege RTS 🏰
- **コンセプト**: 防衛型RTS。10ウェーブ防衛
- **独自要素**: ミニマップ、ドラッグ選択、移動マーカー
- **完成度**: 88%、差別化: 低

### 4.6 Iron Conquest ⚙️
- **コンセプト**: 攻撃型RTS。敵HQ破壊で勝利
- **独自要素**: 敵AI司令官（経済→軍備→ラッシュ）、UNDER ATTACK警報
- **完成度**: 85%、差別化: 低

### 4.7 Climb Clash 🧗
- **コンセプト**: ボルダリング対戦。妨害スキルで相手を邪魔
- **完成度**: 83%、差別化: 中

### 4.8 Quad Clash 🏅
- **コンセプト**: 4種陸上競技+妨害アイテム
- **完成度**: 82%、差別化: 中

### 全ブラウザゲーム共通機能
- 音声SE (Web Audio API合成、各7-11種)
- チュートリアル (初回のみ、localStorage保存)
- ハイスコア / ベストタイム (localStorage)
- ポーズ (Escキー)
- 難易度選択 (Easy/Normal/Hard)
- ゲームオーバー統計
- 即リスタート (Rキー)
- ゲームオーバー時スローモ→赤フラッシュ演出
- タイトル画面: 3D背景回転、グロー、HOW TO PLAYボタン

---

## 5. Robloxゲーム 11本 — 詳細

### 重点3本（深磨き済み）

#### 5.1 Gravity Flip Arena 🔄 ★重点
- **コンセプト**: 重力を6方向に反転するPvP。40x40x40立方体アリーナ
- **差別化**: 最高。Robloxに重力反転PvPは存在しない
- **メカニクス**: Q=天井、E=地面、F=最寄壁、クリック=パンチ(15dmg)
- **深磨き内容**: キルストリーク(3/5/7段階)、重力トレイル、20秒毎プラットフォーム動的回転、アナウンサー、ダブルキル、重力コンパス、リーダーボード

#### 5.2 Clone Chaos 👥 ★重点
- **コンセプト**: クローン3体召喚+変装で本体を隠す。本体撃破3pt/クローン1pt
- **差別化**: 最高。Among Us的心理戦+アクション
- **メカニクス**: Q=クローン召喚、E=リコール、F=マーク、R=ディスガイズ(クローンと位置交換)
- **深磨き内容**: 3モード(AGG/DEF/DECOY)、フェイクデス(30%自動入替)、クローン爆発(AoE15)、偽装ネームタグ、「Was it real?」、騙し成功カウンター

#### 5.3 Size Shifter 📏 ★重点
- **コンセプト**: 巨大(3x)/通常/極小(0.3x) PvP。サイズのじゃんけん
- **差別化**: 高。サイズ変更バトルはユニーク
- **メカニクス**: Q=巨大化、E=極小化、R=通常、F=ストンプ(巨人のみ)
- **深磨き内容**: 衝撃波、環境破壊(壁壊し5秒再建)、DAVID'S REVENGE/TITAN RAGEコンボ、極小トンネル+ヘルスピックアップ、カメラFOV連動、極小レーダー

### 既存改修6本

| ゲーム | 元完成度 | 追加メカニクス | 現完成度 |
|--------|---------|---------------|---------|
| Baseball Brawl | 80% | RAGE MODE (3ストリーク→パワーアップ) | 95% |
| Blink Door Brawl | 75% | DOOR COMBO (2キル→巨大ドア) | 90% |
| Bubble Drifter | 65% | BUBBLE MERGE (合体→爆発) | 85% |
| Hot Air Havoc | 15% | フル実装+GRAPPLE HOOK | 85% |
| Roll Ball Rush | 70% | 4種POWER-UPS | 88% |
| Word Step Run | 75% | PUSH+TRAPブロック | 88% |

### その他新作2本
| ゲーム | 差別化 | 完成度 |
|--------|--------|--------|
| Magnet Wars | 高（磁石PvP） | 85% |
| Echo Tag | 中（暗闇+ソナー） | 85% |

### 全Robloxゲーム共通機能
- ラウンド状態マシン (Lobby→Countdown→Playing→Result)
- モバイルタッチボタン
- セッションベスト記録
- Rキー即リスタート
- ドラマチックカウントダウン (色変化+スケール+ゲーム固有テキスト)
- 被ダメ画面端赤フラッシュ
- タイマー緊迫感 (<15秒で赤パルス)
- ゲーム固有実績ポップアップ

---

## 6. インフラ・ツール

### テストコマンド
```bash
node scripts/test-all-browser.mjs    # ブラウザ8本スモークテスト
node scripts/test-all-roblox.mjs     # Roblox11本(73アサーション)
node scripts/dogfood-browser.mjs     # 4アーキタイプ×8ゲーム×15回=480シミュ
node burger-brawl/test-play.mjs      # 個別テスト
```

### ポータル
```bash
node scripts/serve-portal.mjs  # → http://localhost:8080
```

### GitHub Pages
- `docs/` フォルダからデプロイ（master, /docs）
- `.github/workflows/deploy-pages.yml` で自動デプロイも可

### itch.io
- `publish/` にZIP、`scripts/publish-itch.md` にガイド

---

## 7. 品質状態・既知の問題

### ドッグフーディング最終結果（5ラウンド、41→12問題）
| ゲーム | 問題 | 状態 |
|--------|------|------|
| hack-and-slash | 2 | パッシブ不可（想定内） |
| burger-brawl | 3 | シミュでは簡単（実プレイでは適度の可能性） |
| phantom-lock | 2 | アイドル高い（シミュ限界） |
| crystal-siege-rts | 1 | 良好 |
| iron-conquest | 3 | RTS特性でアイドル高い |
| couch-chaos | 1 | パッシブ不可（当然） |
| climb-clash | 1 | AI若干弱い |
| quad-clash | 1 | パッシブ不可（当然） |

**バグ: 0件**

### 未検証
- 実際の人間プレイテスト: 未実施
- モバイルタッチ操作: 未テスト
- Chrome以外のブラウザ: 未テスト
- Three.js 50体以上のFPS: 未計測

---

## 8. 公開状態

| プラットフォーム | 状態 | URL |
|----------------|------|-----|
| GitHub Pages | ✅ 公開中 | https://rsasaki0109.github.io/game_product_ws/ |
| GitHub Repo | ✅ public | https://github.com/rsasaki0109/game_product_ws |
| itch.io | ❌ 未公開 | ZIP準備済み |
| Roblox | ❌ 未公開 | Studio テスト待ち |
| SNS | ❌ 未投稿 | テンプレ準備済み |

---

## 9. 今後やるべきこと（優先順位付き）

### P0: 最優先（バリュー直結）
1. **実プレイテスト** — 5人以上に遊んでもらう
2. **SNS投稿** — X/Twitter, Reddit r/WebGames, r/indiegames
3. **アクセス解析導入** — Google Analytics / Simple Analytics

### P1: 高優先
4. **Roblox Studio テスト** — 重点3本をRojo→Studio→テストプレイ
5. **itch.io 公開** — 重点3本を先行
6. **見た目の向上** — テクスチャ、パーティクル、ローポリモデル

### P2: 中優先
7. **マルチプレイヤー** — Couch Chaos の2P対戦(WebRTC)
8. **収益化** — Robloxゲームパス/スキン、itch.io課金
9. **コンテンツ追加** — 新ステージ、新敵、デイリーチャレンジ

### P3: 低優先
10. **PWA化** — オフラインプレイ
11. **リーダーボード** — オンラインハイスコア
12. **ゲーム間統合** — 共通アカウント、実績

---

## 10. 各ゲームの改善ロードマップ

### Burger Brawl（最優先）
```
実プレイテスト → フィードバック反映 → itch.io公開 → SNS宣伝
↓
見た目改善(2Dスプライト?) → 新モンスター → ステージ変化 → 実績
```

### Phantom Lock
```
実プレイテスト → ロックオン手触り確認 → itch.io公開
↓
ボス演出強化 → 新敵 → タイムアタックモード
```

### Couch Chaos
```
実プレイテスト → 2P対戦実装(WebRTC) → itch.io公開
↓
ステージバリエーション → 新妨害 → 観戦モード
```

### Gravity Flip Arena (Roblox)
```
Rojo→Studio → テストプレイ → バグ修正 → 公開
↓
マップ追加 → スキン → ランク
```

### Clone Chaos (Roblox)
```
Rojo→Studio → テストプレイ → バグ修正 → 公開
↓
新スキル → チーム戦 → リプレイ
```

### Size Shifter (Roblox)
```
Rojo→Studio → テストプレイ → バグ修正 → 公開
↓
新サイズ → ギミック追加 → ランク
```

---

## 11. コード規約・パターン

### ストア設計（全ブラウザゲーム共通）
```typescript
export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'title' as GamePhase,
  difficulty: 'normal' as Difficulty,
  // ... state
  tick: (delta: number) => {
    if (s.phase !== 'playing' || s.paused) return
    // 1. タイマー更新 2. 入力処理 3. AI 4. 衝突 5. ダメージ 6. 判定
    set({ ...updated })
  },
}))
```

### コンポーネント構成（共通）
```
App.tsx → <GameScene /> (常時レンダリング) + <HUD /> (DOM overlay)
```

### HUD CSSクラス（共通）
`.hud`, `.hudTop`, `.hudRight`, `.hudBottom`, `.hudHelp`, `.hudTitle`, `.hudStat`, `.hudBtn`, `.hudBtnPrimary`, `.hudCenterOverlay`, `.hudCenterTitle`, `.hudCenterBody`, `.hudKeysSep`

### 音声パターン（共通）
```typescript
// src/logic/sound.ts — Web Audio API合成、外部ファイル不要
let ctx: AudioContext | null = null
function getCtx() { if (!ctx) ctx = new AudioContext(); return ctx }
function playTone(freq, duration, type, volume) { /* ... */ }
export function hitSound() { playTone(200, 0.08); playNoise(0.05) }
```

### Roblox Boot パターン（共通）
```lua
while true do
  state.Value = "Lobby" -- プレイヤー待機
  state.Value = "Countdown" -- 3-2-1
  state.Value = "Playing" -- MatchManager処理
  state.Value = "Result" -- 結果表示
end
```

---

## 12. 開発コマンド集

```bash
# ── ブラウザゲーム ──
cd burger-brawl && npm run dev              # 開発サーバー
cd burger-brawl && npx tsc -b               # 型チェック
cd burger-brawl && npx vite build           # ビルド

# 全ゲーム一括ビルド+docs更新
for g in hack-and-slash burger-brawl phantom-lock crystal-siege-rts iron-conquest couch-chaos climb-clash quad-clash; do
  cd $g && npx vite build && cd .. && rm -rf docs/$g && mkdir -p docs/$g && cp -r $g/dist/* docs/$g/
done

# テスト
node scripts/test-all-browser.mjs
node scripts/test-all-roblox.mjs
node scripts/dogfood-browser.mjs

# デプロイ
git add -A && git commit -m "Update" && git push origin master

# ポータル
node scripts/serve-portal.mjs  # → http://localhost:8080

# ── Roblox ──
cd gravity-flip-roblox && rojo serve        # Studio同期

# ── GitHub CLI ──
gh auth switch --user rsasaki0109
gh repo view rsasaki0109/game_product_ws
```

---

**作成**: Claude Opus 4.6 (1M context)
**状態**: 全19ゲーム完成、8本公開中、ユーザー獲得待ち
