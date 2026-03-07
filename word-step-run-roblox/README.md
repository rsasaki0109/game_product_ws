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

## Studio Debug
Studio では `ReplicatedStorage/WordStepDebug/Command` を Command Bar から叩ける。

```lua
local HttpService = game:GetService("HttpService")
local command = game:GetService("ReplicatedStorage"):WaitForChild("WordStepDebug"):WaitForChild("Command")

print(HttpService:JSONEncode(command:Invoke("snapshot")))
print(HttpService:JSONEncode(command:Invoke("clear_word_blocks")))
print(HttpService:JSONEncode(command:Invoke("teleport_part", {
    player = game.Players:GetPlayers()[1],
    partName = "StartIsland",
    offset = { x = 0, y = 6, z = 0 },
    lookAtPartName = "FinishIsland",
})))
print(HttpService:JSONEncode(command:Invoke("force_command", {
    player = game.Players:GetPlayers()[1],
    commandName = "BRIDGE",
    skipCooldown = true,
})))
print(HttpService:JSONEncode(command:Invoke("set_checkpoint", {
    player = game.Players:GetPlayers()[1],
    checkpointIndex = 2,
})))
print(HttpService:JSONEncode(command:Invoke("drop_player", {
    player = game.Players:GetPlayers()[1],
    y = -10,
})))
print(HttpService:JSONEncode(command:Invoke("respawn_check")))
```

Available commands:
- `snapshot`
- `clear_word_blocks`
- `teleport_part`
- `force_command`
- `set_checkpoint`
- `drop_player`
- `respawn_check`

詳しい仕様は [design.md](C:/Users/ryohe/workspace/game_product_ws/word-step-run-roblox/design.md)。
