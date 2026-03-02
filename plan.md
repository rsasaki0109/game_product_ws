# ゲーム開発ワークスペース — 全体計画書

> **最終更新**: 2026-03-02
> **目的**: このドキュメントはAIコーディングアシスタント（Codex等）への引き継ぎ資料を兼ねる。
> プロジェクト全体の背景・設計思想・現在の進捗・残タスク・技術的な注意点を網羅する。

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [ビジョンと戦略](#2-ビジョンと戦略)
3. [市場調査サマリー](#3-市場調査サマリー)
4. [Project A: Gravity Obby Chaos（Roblox）](#4-project-a-gravity-obby-chaosroblox)
5. [Project B: Death High Roller（Web / Steam候補）](#5-project-b-death-high-rollerweb--steam候補)
6. [Project C: Baseball Brawl（ミニゲーム）](#6-project-c-baseball-brawlミニゲーム)
7. [削除済みプロジェクト: Ghost Kitchen](#7-削除済みプロジェクト-ghost-kitchen)
8. [全体ロードマップ](#8-全体ロードマップ)
9. [リポジトリ構成](#9-リポジトリ構成)
10. [CI/CD・インフラ](#10-cicdインフラ)
11. [開発環境セットアップ](#11-開発環境セットアップ)
12. [コーディング規約・設計方針](#12-コーディング規約設計方針)
13. [既知の課題・技術的負債](#13-既知の課題技術的負債)
14. [今後の開発で注意すべきこと](#14-今後の開発で注意すべきこと)

---

## 1. プロジェクト概要

このワークスペースは**バズるゲームを作って収益化する**という目標のもと、
複数のゲームプロトタイプと市場調査資料を管理するモノレポである。

### プロジェクト一覧

| プロジェクト | プラットフォーム | 状態 | ディレクトリ |
|---|---|---|---|
| Gravity Obby Chaos | Roblox (Luau) | コア実装済み・調整中 | `gravity-obby-chaos/` |
| Death High Roller | Web (React + Three.js) | POC完成・拡張中 | `death-high-roller/` |
| Baseball Brawl | Web (Canvas 2D) | スタンドアロンデモ完成 | `death-high-roller/src/App.tsx` |
| Ghost Kitchen | Web (React + Three.js) | **削除済み** (ピボット前の残骸) | ~~`ghost-kitchen/`~~ |

### ピボットの経緯

```
調理シミュレーター (Ghost Kitchen)
  → ポーカー × ホラー (Death High Roller)
    → 重力アクション (Gravity Obby Chaos) ← 現在のメインライン
```

当初は調理シミュレーターを作っていたが、市場調査の結果
「Co-op × ギャンブル × ホラー」と「重力操作アクション」に大きな市場機会があると判明。
Ghost Kitchenは開発中止し、Death High RollerとGravity Obby Chaosに注力している。

---

## 2. ビジョンと戦略

### コアビジョン

**「5秒で伝わる・失敗が派手・会話が生まれる」ゲームを作る。**

- ターゲット: 配信者・実況者（バイラル拡散のエンジン）
- セッション: 10〜20分で完結（配信の1コーナーに収まる）
- クリップ量産: 面白い瞬間が自然に生まれる設計

### 二軸戦略

1. **Roblox軸（Gravity Obby Chaos）**
   - 低コスト・高リーチ。Robloxの既存ユーザーベースを活用
   - 重力システムという独自メカニクスで差別化
   - 段階的に拡張（Obby → Brawl → City）

2. **Steam/Web軸（Death High Roller）**
   - 高品質・ニッチ。Co-opホラー×ギャンブルは完全ブルーオーシャン
   - Lethal Company + Balatro の交差点を狙う
   - 買い切り + スキンDLCで収益化

---

## 3. 市場調査サマリー

調査資料は `survey/` ディレクトリに格納。

### 調査ファイル一覧

| ファイル | 内容 |
|---|---|
| `survey/survey.md` | エグゼクティブサマリー |
| `survey/01_market_overview.md` | 2026年Q1インディーゲーム市場トレンド |
| `survey/02_competitor_analysis.md` | Balatro, Lethal Company, Buckshot Roulette分析 |
| `survey/03_gap_strategy.md` | 市場ギャップの特定 |
| `survey/04_social_sentiment.md` | Twitter/Redditトレンド分析 |
| `survey/05_flight_market_research.md` | フライトシム市場（参考調査） |
| `survey/06_gravity_style_market_research.md` | 重力メカニクス市場（グラビティデイズ等） |
| `survey/07_ip_platform_constraints.md` | 法的・プラットフォーム制約 |
| `survey/08_roblox_market_research.md` | Roblox市場（Gravity Obby Chaos向け） |
| `survey/09_roblox_obby_benchmark.md` | Roblox Obby競合の週次ベンチマーク |

### 主な発見

- **Co-op × ギャンブル × ホラー**は2026年時点で**完全なブルーオーシャン**
- Lethal Companyの「ギャンブルマシンMod」が爆発的人気 → プレイヤーはリスクテイク要素を求めている
- Balatro（500M+本）がポーカールールハックの広いアピールを証明
- 重力操作ゲームはグラビティデイズ以降ほぼ不在 → Robloxでは皆無

---

## 4. Project A: Gravity Obby Chaos（Roblox）

### コンセプト

**「足元が天井になる障害物レース」**

Roblox定番の障害物コース（Obby）に、ランダムな重力方向変化とプレイヤー妨害を加えた
カオスマルチプレイヤーレースゲーム。

### 技術スタック

- **エンジン**: Roblox Studio
- **言語**: Luau
- **外部ツール**: Rojo（ファイルシステムベースのスクリプト管理）
- **バージョン**: Rojo実行ファイルは `bin/rojo.exe` に同梱

### ディレクトリ構成

```
gravity-obby-chaos/
├── GravityObbyChaos.rbxl          # Roblox Studioプロジェクトファイル
├── Rojo.rbxm                      # Rojoモデルファイル
├── bin/
│   └── rojo.exe                   # Rojo実行ファイル（Windows）
├── default.project.json           # Rojo設定（ファイル→Robloxマッピング）
├── design.md                      # 詳細ゲーム設計書（必読）
└── src/
    ├── server/                    # ServerScriptService
    │   ├── GravityManager.server.luau    # 重力システムコア（328行）
    │   ├── RoundManager.server.luau      # ラウンド進行管理（275行）
    │   └── StageBuilder.server.luau      # ステージ自動生成（384行）
    ├── client/                    # StarterPlayerScripts
    │   ├── GravityCamera.client.luau     # カメラ制御（97行）
    │   ├── GravityEffects.client.luau    # 視覚エフェクト（172行）
    │   └── InputHandler.client.luau      # 入力処理（76行）
    ├── shared/                    # ReplicatedStorage
    │   ├── GravityConfig.luau            # 重力設定定数（74行）
    │   └── Types.luau                    # 型定義（34行）
    └── gui/                       # StarterGui
        ├── HUD.client.luau               # HUD表示（252行）
        └── Scoreboard.client.luau        # スコアボード（148行）
```

### 重力システム設計（最重要アーキテクチャ）

6方向の重力切り替えを実現する独自システム。

```
GravityDirection:
  Down  (0, -1, 0)  -- デフォルト
  Up    (0,  1, 0)
  North (0,  0, -1)
  South (0,  0,  1)
  East  (1,  0,  0)
  West  (-1, 0,  0)
```

**実装の仕組み**:

1. **VectorForce**: 各プレイヤーのHumanoidRootPartにアタッチ。
   デフォルトの`Workspace.Gravity`を打ち消し、任意の方向に重力を適用する。
2. **AlignOrientation**: キャラクターの「足元」が重力方向に追従するよう
   CFrame行列で自動回転。
3. **RemoteEvent**: サーバーが重力変更を決定し、全クライアントに通知。
   クライアント側でカメラ補間（0.3秒のlerp）を実行し、酔い防止。

**重力イベント**:

| イベント | 効果 | 発生条件 |
|---|---|---|
| Gravity Flip | 180°反転（上下入れ替え） | タイマー or ステージ進行 |
| Gravity Shift | 90°回転（壁が床になる） | タイマー or ステージ進行 |
| Zero-G | 3秒間の無重力 | ランダム |
| Gravity Storm | 2秒間隔で高速ランダム切替 | ボスステージ専用 |

### ゲームフロー（ラウンド制）

```
Lobby（15秒以上、プレイヤー待機）
  → Countdown（3秒、スポーン地点にテレポート）
    → Racing（60〜120秒、ステージ依存）
      → Result（10秒、ランキング・報酬表示）
        → Lobby に戻る
```

### ステージ一覧（MVP: 3ステージ）

| # | 名前 | コンセプト | 重力イベント | アイテム |
|---|---|---|---|---|
| 1 | はじめての無重力 | チュートリアル。単純Obby + 1回だけ重力反転 | Gravity Flip ×1 | なし |
| 2 | グラビティタワー | 4面タワー。Gravity Shift + 妨害アイテム | Shift + Flip | あり |
| 3 | カオスアリーナ | 浮遊プラットフォーム。Gravity Storm | 全種類 | あり |

### アイテムシステム（スケルトン実装）

| アイテム | 効果 | 実装状況 |
|---|---|---|
| Gravity Bomb | 周囲プレイヤーの重力をランダム変更 | 未完成 |
| Gravity Anchor | 5秒間重力変化の影響を受けない | 未完成 |
| Anti-Gravity Boost | 短時間浮遊（ショートカット用） | 未完成 |
| Gravity Reverse | 自分だけ重力反転 | 未完成 |

### 報酬・マネタイズ設計

**ゲーム内通貨（コイン）**:
- 1位: 100コイン / 2位: 70 / 3位: 50 / 完走: 30 / 途中離脱: 10

**Robux課金**:
- VIPゲームパス（追加ステージ、限定アイテム）
- スキン / トレイル / エフェクト
- コインブースト

### 実装進捗

- [x] 6方向重力物理
- [x] VectorForce + AlignOrientationによるキャラクター制御
- [x] カメラの重力追従（スムーズlerp）
- [x] 3ステージの自動生成
- [x] ラウンドステートマシン（Lobby → Countdown → Racing → Result）
- [x] HUD（リアルタイム順位、タイマー、アイテム表示）
- [x] スコアボード（ライブランキング）
- [x] 視覚エフェクト（警告テキスト、方向矢印、画面フラッシュ、Zero-G表示）
- [x] RemoteEventによるクライアント・サーバー同期
- [ ] アイテムシステムの完全実装
- [ ] オーディオ / BGM / SE
- [ ] コスメティックショップ（Robux課金）
- [ ] モバイル対応（タッチ入力）
- [ ] チュートリアルの改善
- [ ] アナリティクス / プレイヤーデータ収集
- [ ] ソーシャル機能（フレンド招待、パーティ）

### 将来拡張計画（Phase 2/3）

**Phase 2: Gravity Brawl（重力乱闘）**
- 非対称PvP: 1人の「重力マスター」vs 4〜8人の「逃走者」
- 重力マスターがエリア単位で重力を操作、プレイヤーを掴んで投げる
- 逃走者は壁走り・天井歩きで逃げる
- Phase 1の重力システムを流用。追加開発2〜3週間

**Phase 3: Gravity City（重力都市）**
- オープンワールド重力アクション（グラビティデイズをRobloxで）
- 空中都市探索 / ミッション / レース / PvPアリーナ / ハウジング
- Phase 1/2の技術とユーザーベースを活用。開発1〜2ヶ月

---

## 5. Project B: Death High Roller（Web / Steam候補）

### コンセプト

**「オールインした瞬間、部屋が暗転してハント開始」**

Co-opホラー × カジノ潜入。プレイヤーはカジノを探索してチップを集め、
テーブルでブラックジャックに全賭けし、負けると怪物に追われる。

### 技術スタック

| 項目 | 技術 |
|---|---|
| フレームワーク | React 19.2 |
| ビルドツール | Vite 7.3.1 |
| 3Dグラフィック | Three.js 0.182 + React Three Fiber 9.5 |
| 3Dヘルパー | @react-three/drei 10.7.7 |
| 物理エンジン | Rapier3D (@react-three/rapier 2.2) |
| 状態管理 | Zustand 5.0 |
| UIアイコン | Lucide React |
| 言語 | TypeScript 5.9 |
| リンター | ESLint 9.39 + TypeScript ESLint |

### ディレクトリ構成

```
death-high-roller/
├── package.json
├── package-lock.json
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── eslint.config.js
├── index.html
├── README.md
├── POC_MEDIA.md
├── play.md
├── dist/                              # ビルド済み出力
│   ├── index.html
│   └── assets/
├── docs/poc_media/                    # POCスクリーンショット
│   ├── 01_explore.png ... 08_dead.png
├── play-assets/                       # ゲームプレイ画像・GIF
│   ├── fps/ gravity/ race/ tokyo/     # 各モードのキャプチャ
│   └── test-*.png
├── public/
│   └── assets/tokyo/
└── src/
    ├── main.tsx                       # エントリーポイント
    ├── App.tsx                        # Baseball Brawlミニゲーム（546行）
    ├── App.css                        # スタイル
    ├── store.ts                       # Zustand状態管理（304行）
    ├── index.css                      # グローバルスタイル
    └── components/
        ├── GameScene.tsx              # 3Dシーンセットアップ
        ├── Player.tsx                 # プレイヤーキャラクター制御
        ├── HUD.tsx                    # UIオーバーレイ
        ├── HauntSystem.tsx            # ゴースト/ホーント機構
        ├── InteractionSystem.tsx      # オブジェクトインタラクション
        ├── ThreeCollapseRace.tsx      # ミニゲーム: 崩壊レース
        ├── ThreeFPSGame.tsx           # ミニゲーム: FPS
        ├── ThreeGravityBearMode.tsx   # ミニゲーム: 重力ベア
        ├── ThreeLabScene.tsx          # 研究室探索シーン
        ├── ThreeTokyoCity.jsx         # 東京シティ探索（JSX版）
        └── ThreeTokyoCity.tsx         # 東京シティ探索（TSX版）
```

### ゲームフェーズ（ステートマシン）

`store.ts`のZustandストアで以下の4フェーズを管理:

```
Explore（探索）
  → プレイヤーがカジノ内を歩き回り、チップを拾い集める
  → テーブルに近づくとインタラクション可能

Table（勝負）
  → ブラックジャックテーブルに着席
  → 全チップをオールイン（必ず全賭け）
  → Hit / Stand で勝負

Haunt（追跡）
  → 負けた場合 or イカサマ発覚でゴースト/取り立て屋が出現
  → 逃走・隠密・囮を駆使して生き延びる
  → セーフゾーンに到達すれば生存

Dead（死亡）
  → 捕まった場合のゲームオーバー
  → 死因表示 → リスタート
```

### ブラックジャックシステム詳細（store.ts）

- **完全なハンド評価**: エース処理（11 or 1の自動切替）
- **ディーラーAI**: 17以上まで自動ヒット
- **アクション**: Deal / Hit / Stand
- **結果判定**: Win / Push（引き分け） / Lose
- **ペイアウト**: 勝利時2倍、Push時返却、敗北時全没収
- **オールイン強制**: 賭け金は常に全額（緊張感の最大化）

### 3Dシーン一覧

| シーン | 内容 | 状態 |
|---|---|---|
| GameScene | メインカジノ探索 | POC完成 |
| ThreeTokyoCity | 東京シティ（大規模環境） | POC完成 |
| ThreeLabScene | 研究室探索 | POC完成 |
| ThreeFPSGame | FPSミニゲーム | POC完成 |
| ThreeGravityBearMode | 重力パズル | POC完成 |
| ThreeCollapseRace | 崩壊レース | POC完成 |

### 実装進捗

- [x] ブラックジャック完全ゲームループ
- [x] Zustandによるフェーズ管理
- [x] 3Dカジノ探索シーン
- [x] ゴースト/ホーントの基本AI
- [x] 複数の3Dシーン（Tokyo, Lab, FPS, Gravity, Race）
- [x] HUD（チップ数、フェーズ表示）
- [x] POCスクリーンショット / GIF生成
- [x] `dist/`にビルド済み出力
- [ ] ゴーストAIの洗練（パスファインディング、難易度調整）
- [ ] 全ミニゲームとメインフローの統合
- [ ] ネットワークマルチプレイ（WebSocket or WebRTC）
- [ ] オーディオ（BGM, SE, 環境音）
- [ ] セーフゾーンメカニクスの完全実装
- [ ] Steam向けElectronラッパー or ネイティブビルド
- [ ] 収益化実装（スキン、DLC）

---

## 6. Project C: Baseball Brawl（ミニゲーム）

### 概要

Death High Rollerの`App.tsx`に埋め込まれた**Canvas 2Dアクションゲーム**。
独立したデモとして完成している。

### ゲームプレイ

- **ジャンル**: 見下ろし型2Dアクション（ウェーブ制）
- **解像度**: 960×540
- **操作**: WASD / 矢印キーで移動、Jで近接攻撃、Spaceで野球ボール投げ
- **敵**: スコアに応じてHP・速度がスケーリング
- **システム**: HP制 + 無敵フレーム、ゲームオーバー後Rで再開

### 技術的特徴

- **純粋Canvas 2D**: Three.js不要、ブラウザネイティブ
- **衝突判定**: 矩形ベース
- **AI**: 基本的な追尾 + 射程内で遠距離攻撃
- **パフォーマンス**: requestAnimationFrameベースの60fpsゲームループ

---

## 7. 削除済みプロジェクト: Ghost Kitchen

### 経緯

最初のプロトタイプ。調理シミュレーター + ホラー要素。
市場調査の結果、方向転換してDeath High Rollerにピボット。
現在はgitの追跡から削除済み（`git status`でDeleted表示）。

技術スタック・コンポーネントの多くはDeath High Rollerに引き継がれた。
**復元の必要はない**。gitの履歴から参照可能。

---

## 8. 全体ロードマップ

### 短期（〜2週間）

```
[Gravity Obby Chaos]
  - アイテムシステムの完全実装
  - オーディオ追加（BGM + SE）
  - モバイルタッチ入力対応
  - Robloxへのパブリッシュ（テスト公開）

[Death High Roller]
  - ゴーストAIの改善
  - メインフローとミニゲームの統合
```

### 中期（2〜6週間）

```
[Gravity Obby Chaos]
  - コスメティックショップ実装
  - アナリティクス導入
  - Phase 2: Gravity Brawlの設計・プロトタイプ

[Death High Roller]
  - マルチプレイ基盤（WebSocket）
  - オーディオ / 環境演出
  - Steam Wishlistページ準備
```

### 長期（6週間〜）

```
[Gravity Obby Chaos]
  - Phase 2: Gravity Brawl リリース
  - Phase 3: Gravity City 設計開始

[Death High Roller]
  - Steam Early Accessリリース
  - DLC / シーズン制コンテンツ
```

---

## 9. リポジトリ構成

```
game_product_ws/                        # ルート（gitリポジトリ）
├── .claude/                            # Claude Code設定
│   └── settings.local.json             # ツール権限設定
├── .github/
│   └── workflows/
│       └── ghost-kitchen-pages.yml     # GitHub Pages自動デプロイ（旧）
├── death-high-roller/                  # Project B
│   ├── src/ dist/ public/ docs/
│   ├── node_modules/
│   └── package.json
├── gravity-obby-chaos/                 # Project A
│   ├── src/ bin/
│   ├── GravityObbyChaos.rbxl
│   └── default.project.json
├── survey/                             # 市場調査資料
│   ├── survey.md
│   ├── 01_market_overview.md
│   ├── 02_competitor_analysis.md
│   ├── 03_gap_strategy.md
│   ├── 04_social_sentiment.md
│   ├── 05_flight_market_research.md
│   ├── 06_gravity_style_market_research.md
│   ├── 07_ip_platform_constraints.md
│   ├── 08_roblox_market_research.md
│   └── 09_roblox_obby_benchmark.md
├── ideas.html                          # アイデア集（6案のインタラクティブ一覧）
├── memo.txt                            # 初期メモ
└── plan.md                             # ← このファイル
```

---

## 10. CI/CD・インフラ

### GitHub Actions

- **ワークフロー**: `.github/workflows/ghost-kitchen-pages.yml`
- **用途**: Ghost Kitchen POCのGitHub Pagesデプロイ（手動トリガー）
- **現状**: Ghost Kitchen削除済みのため**無効化が必要**
- **将来**: Death High RollerのPages/Vercelデプロイに書き換える想定

### デプロイ先

| プロジェクト | デプロイ先 | 方法 |
|---|---|---|
| Gravity Obby Chaos | Roblox | Roblox Studio から直接パブリッシュ |
| Death High Roller | GitHub Pages / Vercel / Steam | Viteビルド → 静的ホスティング or Electron |

---

## 11. 開発環境セットアップ

### 前提条件

- **OS**: Windows 11
- **シェル**: Git Bash（Unix構文使用）
- **Node.js**: v20+
- **Git**: 標準インストール

### Gravity Obby Chaos

```bash
# Roblox Studioで .rbxl を開く
# Rojoを使う場合:
cd gravity-obby-chaos
./bin/rojo.exe serve default.project.json
# Roblox StudioでRojoプラグインからConnect
```

### Death High Roller

```bash
cd death-high-roller
npm install
npm run dev          # Vite開発サーバー起動
# ブラウザで http://localhost:5173 を開く

npm run build        # プロダクションビルド → dist/
npm run lint         # ESLintチェック
```

---

## 12. コーディング規約・設計方針

### 全般

- **言語**: TypeScript（Web）/ Luau（Roblox）
- **スタイル**: ESLintのデフォルト設定に準拠
- **コミットメッセージ**: 英語、`feat:` / `fix:` / `docs:` 等のConventional Commits
- **ブランチ**: `master` が唯一のブランチ（小規模プロジェクトのため）

### React / Three.js（Death High Roller）

- **状態管理**: Zustand（軽量・ボイラープレート最小）
- **3D**: React Three Fiber（宣言的Three.js）
- **物理**: @react-three/rapier（Rapier3Dバインディング）
- **コンポーネント設計**: シーン単位でファイル分割（GameScene, ThreeXxx等）

### Luau（Gravity Obby Chaos）

- **ファイル命名**: `PascalCase.server.luau` / `PascalCase.client.luau` / `PascalCase.luau`
- **サーバー/クライアント分離**: ServerScriptService / StarterPlayerScripts / ReplicatedStorage
- **通信**: RemoteEvent（一方向通知）/ RemoteFunction（要応答通信）
- **型**: `Types.luau` に共有型定義を集約

---

## 13. 既知の課題・技術的負債

### Gravity Obby Chaos

1. **アイテムシステムが骨格のみ**: 4種類のアイテムが設計書にあるが、実装はスケルトン状態
2. **オーディオ完全不在**: 設計書にBGM・SE仕様があるが一切実装されていない
3. **モバイル入力未対応**: Robloxのモバイルユーザーが多いが、タッチ操作の最適化がない
4. **ステージ3のバランス**: Gravity Stormの頻度が高すぎてプレイテストが不十分

### Death High Roller

1. **App.tsxの二重用途**: メインエントリとBaseball Brawlが同居。分離が必要
2. **ThreeTokyoCity.jsx と .tsx の重複**: JSX版とTSX版が両方存在
3. **マルチプレイ基盤なし**: 現在完全にシングルプレイヤー
4. **ゴーストAIが原始的**: パスファインディングなし、単純追尾のみ
5. **node_modulesがリポジトリに含まれている可能性**: `.gitignore`の確認が必要

### インフラ

1. **GitHub Actionsが旧プロジェクト向け**: Ghost Kitchen用のワークフローが残存
2. **Ghost Kitchenの削除が未コミット**: `git status`でDeleted表示のまま

---

## 14. 今後の開発で注意すべきこと

### Codex（AIアシスタント）向けの注意事項

1. **Luauの文法**: Roblox独自のLua方言。`local`で変数宣言、`--`でコメント、
   型注釈は `:: Type` 形式。標準Luaとは微妙に異なる点に注意。

2. **Robloxのサービス構造**: `ServerScriptService`（サーバー専用）、
   `StarterPlayerScripts`（クライアント起動時コピー）、
   `ReplicatedStorage`（共有データ）の3層構造を理解すること。

3. **Rojo同期の注意**: `default.project.json`がファイルパスとRobloxサービスの
   マッピングを定義。ファイル名の`.server.luau`/`.client.luau`サフィックスが重要。

4. **Three.jsのバージョン**: 0.182を使用。破壊的変更が頻繁なライブラリなので、
   APIリファレンスはバージョンを確認すること。

5. **React 19**: Concurrent Featuresが完全有効。useEffect等の挙動が
   React 18以前と異なる場合がある。

6. **Zustandのパターン**: `set((state) => ({...}))` のイミュータブル更新パターンを
   一貫して使用。ストアの直接変更は禁止。

7. **ビルド確認**: Death High Rollerは `npm run lint` → `npm run build` で
   エラーがないことを確認してからコミット。

8. **ideas.html**: 6つのゲームアイデアがインタラクティブなHTMLカードで整理されている。
   新しいアイデアを追加する場合は `IDEAS` 配列に追加する。

### 優先度の指針

```
最優先: Gravity Obby Chaos のRobloxパブリッシュ
  → アイテム実装 + オーディオ + モバイル対応

次点: Death High Roller のマルチプレイ化
  → WebSocket基盤 + ゴーストAI改善

低優先: Baseball Brawlの独立化
  → App.tsxから分離、専用ページ化
```

---

## アイデア集（ideas.htmlより）

参考として、調査で生まれた6つのゲームアイデアを記載。

| 順位 | タイトル | コンセプト | タグ |
|---|---|---|---|
| 1 | Death High Roller | Co-opホラー × カジノ潜入 | Co-op, ホラー, ポーカー, 探索, 追跡 |
| 2 | Roulette Safehouse | ルーレットで生存場所を賭ける | Co-op, ホラー, ルーレット, タイムアタック, 裏切り |
| 3 | Devil's Dealer | 1人だけディーラー側の非対称 | 非対称, 心理戦, カード, Co-op, 裏切り |
| 4 | Auction of Souls | 戦利品をオークションで奪い合う | Co-op, 分配, ギャンブル, 裏切り, ドラマ |
| 5 | Bullet Poker | FPS × ポーカー役で弾が変わる | FPS, ローグライク, ポーカー, 派手, ソロ可 |
| 6 | House Rules From Hell | 毎ラウンド俺ルールを追加して破綻 | パーティ, UGC, カード, カオス, 配信向き |

---

*このドキュメントはプロジェクトの進行に合わせて継続的に更新すること。*
