# Color Turf Clash Unity サマリー

更新日: 2026-03-06

## 何ができたか
- Unity `6000.3.10f1` の導入と起動確認
- Unity Personal license の有効化確認
- ルート Unity プロジェクト内に `Color Turf Clash` の試作実装を追加
- `2v2` のプレイアブルプロトタイプを構築

## 現在のゲーム内容
- 視点: トップダウン 3D
- チーム構成:
  - Solar: プレイヤー + 味方 bot
  - Tide: 敵 bot 2 体
- ルール:
  - 制限時間内に床を多く塗ったチームが勝利
  - 被弾すると一時退場し、一定時間後に復帰
- 操作:
  - `WASD` 移動
  - `LMB` または `F` で shoot
  - `Shift` / `Space` / `E` で dash
  - result 後に `R` で再試行

## 入っている実装
- 床タイルの陣取り処理
- プレイヤー移動・照準・ダッシュ
- bot の敵追跡と射撃
- 面積スコア計算
- splat カウント
- respawn
- 被弾フラッシュ
- result card
- scene 自動生成

## 主なファイル
- Scene: `Assets/Scenes/ColorTurfPrototype.unity`
- Scene builder: `Assets/Editor/ColorTurfSceneBuilder.cs`
- Build script: `Assets/Editor/ColorTurfBuild.cs`
- Bootstrap: `Assets/Scripts/ColorTurf/ColorTurfBootstrap.cs`
- Match: `Assets/Scripts/ColorTurf/MatchController.cs`
- HUD: `Assets/Scripts/ColorTurf/HudController.cs`
- Bot: `Assets/Scripts/ColorTurf/BotController.cs`

## 確認結果
- Unity batch compile: 成功
- Scene 生成: 成功
- Linux standalone build: 実施可能な構成に整理済み
- 自動デモ動画: `reports/media/color_turf_clash_demo_20260306.mp4`

## 現状の評価
- すでに「触れる原型」は完成している
- 自動デモ動画まで揃ったので、共有用の最低限の形にはなった
- ただし、見た目の派手さと動画映えはまだ弱い
- 次の価値は、演出強化と人間プレイの短い動画化

## 次の優先順
1. projectile / hit / paint burst の視覚演出を強化
2. bot の役割分担を入れて試合展開を荒くする
3. タイトル画面と post-match flow を整える
4. 録画素材を作って検証・共有に回す
