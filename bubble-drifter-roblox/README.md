# Bubble Drifter Roblox

シャボン玉の中に入って空をふわふわ流れながら、リングを抜けて上空を目指す Roblox プロトタイプ。

## Hook
- 1秒で伝わる: `自分がシャボン玉の中に入る`
- 失敗が派手: `割るタイミングを間違えるとそのまま落ちる`
- 会話が生まれる: `みんなで同じ風に流されて事故る`

## MVP Direction
- 8人まで
- 1ラウンド 80秒
- `Bubble` と `Pop` の2操作だけ
- 風レーンとリングだけで成立させる
- PvPダメージなし
- まずはレース寄り

## Controls
- `Q`: Bubble
- `E`: Pop
- Mobile: `BUBBLE` / `POP`

## Directory
- `default.project.json`: Rojo マッピング
- `design.md`: 仕様メモ
- `src/server`: アリーナ生成 / ラウンド / Bubble 制御
- `src/client`: 入力
- `src/shared`: 設定値
- `src/gui`: HUD

## Current Status
- Bubble / Pop の基本挙動を追加
- 風レーンによる横流れを追加
- リング通過とゴール順位を追加
- 落下復帰と HUD を追加
- まだ Bubble の見た目・気持ちよさ調整は未完
