# Color Turf Clash — 実装メモ

## 目的
- 既存の人気ジャンル（陣取りシューター）を、短期間で Roblox 向けに検証できる形で実装する。
- 版権依存の要素を避け、ゲームループの面白さを優先する。

## コアループ
1. 移動しながら `Shoot` で地面を塗る
2. 相手を削って一時退場させる
3. `Dash` で距離を詰める/逃げる
4. `COLOR SURGE` で局面が揺れる
5. 時間終了時の塗り面積で勝敗

## サーバー構成
- `ArenaBuilder.luau`: フィールド/壁/スポーン生成
- `TurfManager.luau`: タイル生成、塗り管理、カバレッジ計算
- `MatchManager.server.luau`: 進行、アクション処理、スコア同期

## 主要RemoteEvent
- `ShootRequest`, `DashRequest`
- `MatchStateChanged`, `MatchCountdown`, `ScoreChanged`
- `FeedEvent`, `HitFeedback`, `PaintBurst`, `ActionCooldown`

## MVPで確認したい指標
- 初見でルール理解できるか（5秒以内）
- 1試合あたりの逆転回数
- フィードに出る「盛り上がりイベント」発生頻度
- 途中離脱率

## 次フェーズ候補
1. 武器差分（連射型/チャージ型/範囲型）
2. マップ2種（縦長/高低差）
3. パーティクル・SEの強化
4. 進行要素（ランク/報酬/コスメ）
5. リプレイ切り出し導線
