# Color Turf Clash (Roblox)

人気の「陣取りシューター」体験を、権利侵害にならないオリジナル仕様で再設計した Roblox プロトタイプです。

## 何ができるか
- 2チーム（Red/Blue）のラウンド制対戦
- 地面タイルを塗って面積を奪う
- `Shoot` で遠距離ペイント + 相手ダメージ
- `Dash` で突進 + 近距離圧力
- `COLOR SURGE` で定期的に試合が荒れる
- HUDで状態/タイマー/面積/クールダウン/イベント表示
- PC・ゲームパッド・モバイル入力対応

## ルール
- `Lobby -> Countdown -> Playing -> Result`
- 制限時間終了時に塗り面積が高いチームが勝利
- 被弾でインクHPが減り、0で一時離脱→リスポーン

## 操作
- PC: `LMB` or `F` = Shoot, `E/Q/Shift` = Dash
- Gamepad: `R2` = Shoot, `B` = Dash
- Mobile: 画面右下の `SHOOT` / `DASH`

## 構成
- `default.project.json`: Rojoマッピング
- `src/server`: アリーナ、ターフ管理、マッチ進行
- `src/client`: 入力、カメラ、演出
- `src/gui`: HUD
- `src/shared`: 設定、型

## 起動手順
1. `rojo serve color-turf-clash/default.project.json`
2. Roblox Studio 側で Rojo プラグイン接続
3. Play で確認

## IP配慮
- 既存IPの固有キャラ・名称・意匠・UI構図は不使用
- オリジナル名称/配色/ルールで構築
