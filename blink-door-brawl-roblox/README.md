# Blink Door Brawl (Roblox)

`Q` で入口ドア、`E` で出口ドアを置いて、相手を別の場所へ飛ばして落とすリングアウト PvP。

## Hook
- 1秒で伝わる: `ドアを置くとワープする`
- クリップが作りやすい: 急に横や背後から相手が出てくる
- ふざけても成立する: 自分のドアを他人にも使われる

## Controls
- `Q`: 入口ドアを置く
- `E`: 出口ドアを置く
- `F`: 前方プッシュ
- Mobile: 3ボタン UI

## MVP
- 1マップ
- 4?8人 FFA
- 90秒ラウンド
- 落下キル数で勝敗
- 入口と出口は各1枚ずつ
- 自分のドアは相手も使える

## Studio Debug
Studio で起動すると `ReplicatedStorage/BlinkDoorDebug` が作られる。

- `SnapshotJson`: 現在の状態スナップショット
- `LastEventJson`: 直近イベント
- `SmokeTestJson`: 自動スモークテスト結果
- `Command`: `BindableFunction`

Command Bar からはこう叩ける。

```lua
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")
local debugFolder = ReplicatedStorage:WaitForChild("BlinkDoorDebug")
local command = debugFolder:WaitForChild("Command")

print(HttpService:JSONEncode(command:Invoke("snapshot")))
print(HttpService:JSONEncode(command:Invoke("place_pair", {
    player = game.Players:GetPlayers()[1],
    entryPartName = "CenterIsland",
    entryFacePartName = "NorthIsland",
    exitPartName = "NorthIsland",
    exitFacePartName = "CenterIsland",
})))
print(HttpService:JSONEncode(command:Invoke("teleport_owner", {
    player = game.Players:GetPlayers()[1],
})))
```

使えるコマンド:
- `snapshot`
- `teleport_spawn`
- `place_entry`
- `place_exit`
- `place_pair`
- `teleport_owner`
- `push`
- `respawn_check`

詳しい仕様は [design.md](C:/Users/ryohe/workspace/game_product_ws/blink-door-brawl-roblox/design.md)。
