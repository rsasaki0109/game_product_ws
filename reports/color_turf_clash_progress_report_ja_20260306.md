# Color Turf Clash Unity 進捗報告

更新日: 2026-03-06

## 目的
人気の陣取りシューター体験を、権利侵害を避けたオリジナル仕様で短期検証できる Unity プロトタイプとして成立させる。

## 今回の到達点
### 1. 開発基盤
- Unity Editor 導入完了
- Unity Personal license 有効化確認
- Linux 上で batch compile / scene 生成が回る状態を構築

### 2. プロトタイプ本体
- `Color Turf Clash` の playable scene を追加
- `2v2` マッチに拡張
- プレイヤー、味方 bot、敵 bot 2 体の構成
- 床塗り、被弾、退場、復帰、結果表示を実装
- 即時命中を projectile ベースに置換
- muzzle flash / paint burst / hit burst を追加
- splat 加算を攻撃側基準に修正

### 3. 検証状態
- headless scene build 成功
- compile エラー解消済み
- 再現用 build スクリプトを追加
- 録画用キャプチャスクリプトを追加
- standalone から自動デモ動画の生成まで確認

## 主要成果物
- Scene: `Assets/Scenes/ColorTurfPrototype.unity`
- Unity レポート: `color_turf_clash_unity_report_20260306.md`
- 日本語サマリー: `reports/color_turf_clash_unity_summary_ja_20260306.md`
- 録画スクリプト: `scripts/capture_color_turf_demo.sh`

## 動画
- 生成先: `reports/media/color_turf_clash_demo_20260306.mp4`
- 内容: bot 駆動の 8 秒デモ
- 用途: 現状の手触り確認、外部共有、次回改善前の比較基準

## 現在の課題
- bot は機能するが役割分化していない
- 音がない
- UI は必要十分だが、まだデモ向けの華が弱い
- title / menu 導線が無い

## 次アクション
1. bot の役割分担を追加する
2. タイトルと再戦導線を整える
3. 人間プレイの動画を追加する
4. 効果音を入れる
