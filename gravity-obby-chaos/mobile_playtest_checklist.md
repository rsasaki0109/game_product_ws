# Gravity Obby Chaos 実機チェックリスト（PC / モバイル）

対象日: 2026-03-02  
対象変更:
- モバイル `Use Item` ボタン追加
- モバイル `Gravity Flip` ボタン追加
- キーボード `Q` で重力切替
- Stage 3 の `GravityStorm` 段階解放（初回2回は `GravityShift`）

## 0. 起動手順
1. `cd gravity-obby-chaos`
2. `./bin/rojo.exe serve default.project.json`
3. Roblox Studioで `GravityObbyChaos.rbxl` を開く
4. Rojoプラグインで `Connect`
5. `Play` を開始

## 1. PCチェック
1. ラウンド中に `Q` を押す
   - 期待: 自分のみ重力が180度反転
2. `Q` を連打する
   - 期待: クールダウン中は再反転しない
3. `E` でアイテム使用（所持時）
   - 期待: 使用でき、HUD表示が `---` に戻る
4. ラウンド遷移（Result→次ラウンド）
   - 期待: 次ラウンドでも重力システムが正常動作

## 2. モバイルチェック
1. 画面右下に `Use Item` と `Gravity Flip` ボタンが表示される
   - 期待: 2ボタンが重ならず表示される
2. `Gravity Flip` をタップ
   - 期待: 自分のみ重力が反転
3. `Gravity Flip` を連打
   - 期待: クールダウン中は再反転しない
4. アイテム取得後に `Use Item` をタップ
   - 期待: アイテム使用成功、ボタンラベルが `Use Item` に戻る
5. HUDのアイテム表示
   - 期待: `[Tap]` プレフィックスで表示される

## 3. Stage 3 難易度解放チェック
1. Stage 3を1回目プレイ
   - 期待: `GravityShift` が動く（Stormではない）
2. Stage 3を2回目プレイ
   - 期待: まだ `GravityShift`
3. Stage 3を3回目プレイ
   - 期待: `GravityStorm` に切り替わる

## 4. 不具合ログ最低項目
- 端末: PC / iOS / Android
- 発生時刻
- ステージ番号
- ラウンド状態（Lobby/Countdown/Racing/Result）
- 操作内容（Q / Tap）
- 期待結果と実結果
- 再現率（毎回 / ときどき / 1回のみ）
