# Baseball Brawl Roblox

Roblox向けの2チーム乱闘スポーツプロトタイプです。

## 現在の実装
- ラウンド制: `Lobby -> Countdown -> Playing -> Result`
- 物理ボール + ゴール判定 + スコア管理
- アクション
  - `Swing`: ボール打撃 + ノックバック
  - `Dash`: 突進タックル
- カオス演出
  - 定期 `CHAOS PULSE`
  - `Bumper` で打ち上げ
  - イベントフィード（MONSTER SHOT等）
- HUD
  - 状態 / タイマー / スコア / ボール支配
  - クールダウン表示
  - モバイル操作ボタン

## ディレクトリ
- `default.project.json`: Rojoマッピング
- `src/server`: アリーナ生成 / マッチ進行 / 物理
- `src/client`: 入力 / カメラ
- `src/shared`: 設定値 / 型
- `src/gui`: HUD

## 起動手順（Rojo）
1. `baseball-brawl-roblox/default.project.json` を対象に Rojo サーバー起動
2. Roblox Studio から Rojo プラグインで接続
3. Play して挙動確認

## 操作
- PC: `LMB` or `F` で Swing / `E` `Q` `Shift` で Dash
- Gamepad: `R2` で Swing / `B` で Dash
- Mobile: 画面右下の `SWING` / `DASH`
