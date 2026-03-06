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

## Studio Debug
Studio では `ReplicatedStorage/BaseballBrawlDebug/Command` を Command Bar から叩ける。

```lua
local HttpService = game:GetService("HttpService")
local command = game:GetService("ReplicatedStorage"):WaitForChild("BaseballBrawlDebug"):WaitForChild("Command")

print(HttpService:JSONEncode(command:Invoke("snapshot")))
print(HttpService:JSONEncode(command:Invoke("teleport_spawn", {
    player = game.Players:GetPlayers()[1],
})))
print(HttpService:JSONEncode(command:Invoke("place_ball_ahead", {
    player = game.Players:GetPlayers()[1],
    distance = 10,
    height = 1.5,
})))
print(HttpService:JSONEncode(command:Invoke("force_swing", {
    player = game.Players:GetPlayers()[1],
    skipCooldown = true,
})))
print(HttpService:JSONEncode(command:Invoke("force_dash", {
    player = game.Players:GetPlayers()[1],
    skipCooldown = true,
})))
print(HttpService:JSONEncode(command:Invoke("trigger_pulse")))
print(HttpService:JSONEncode(command:Invoke("score_goal", {
    player = game.Players:GetPlayers()[1],
})))
```

Available commands:
- `snapshot`
- `teleport_spawn`
- `teleport_part`
- `place_ball_ahead`
- `set_ball_position`
- `force_swing`
- `force_dash`
- `trigger_pulse`
- `score_goal`
