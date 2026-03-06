# Word Step Run (Roblox)

`STEP` や `BRIDGE` を押すと、文字そのものが足場になって空中コースを進むレースゲーム。

## Hook
- 1秒で伝わる: `言葉が足場になる`
- マイク不要: 固定コマンドだけで遊べる
- 友達と荒らし合える: 自分の足場を他人も使える

## Core Loop
1. カウントダウン後に空中コースを走り始める
2. ギャップや段差に合わせてコマンドを押す
3. 出した文字ブロックを足場にして前進する
4. 先にゴールしたプレイヤーが勝ち

## Controls
- `Q`: `STEP`
- `E`: `BRIDGE`
- `R`: `UP`
- Mobile: 3ボタン UI

## MVP Direction
- 8人まで
- 1ラウンド 75秒
- 3コマンドのみ
- 文字ブロックは短時間で消える
- PvPダメージなし
- 押し出しだけ残す

詳しい仕様は [design.md](C:/Users/ryohe/workspace/game_product_ws/word-step-run-roblox/design.md)。
