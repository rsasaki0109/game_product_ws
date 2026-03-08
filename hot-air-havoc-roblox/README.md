# Hot Air Havoc Roblox

気球を上下させながら風を読んで進み、燃料を拾って最後まで落ちずに残る Roblox プロトタイプ。

## Hook
- 1秒で伝わる: `気球でふわふわ上がる`
- 事故が面白い: `燃料切れでそのまま落ちる`
- 友達と絡む: `同じ風を奪い合ってぶつかる`

## MVP Direction
- 6人まで
- 1ラウンド 90秒
- `Burn` と `Vent` の2軸だけ
- 燃料缶と風レイヤーだけで成立させる
- 先に落ちたら敗退

## Controls
- `Q`: Burn
- `E`: Vent
- `F`: Burst Boost
- Mobile: `BURN` / `VENT` / `BOOST`

## Directory
- `default.project.json`: Rojo マッピング
- `design.md`: 仕様メモ
- `src/server`: アリーナ生成とラウンドの土台
- `src/shared`: 設定値
- `src/gui`: HUD

## Current Status
- 新規企画の Rojo 雛形を追加
- ラウンド進行の土台を追加
- 気球アリーナと HUD の土台を追加
- まだ Burner / Fuel / Wind の実メカニクスは未実装
