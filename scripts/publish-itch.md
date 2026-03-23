# itch.io Publishing Guide

## ZIPファイルの場所
`publish/` フォルダに全8ゲームのZIPがあります。

## 公開手順（各ゲーム）

1. https://itch.io/game/new にアクセス
2. 以下を入力:
   - **Kind of project**: HTML
   - **Upload**: 該当ZIPファイル
   - **This file will be played in the browser**: チェック
   - **Viewport dimensions**: 960 x 540
   - **Pricing**: Free
3. **Publish** をクリック

---

## ゲーム別の情報

### 1. Hack & Slash
- **File**: `publish/hack-and-slash.zip`
- **Title**: Hack & Slash
- **Description**: Top-down hack & slash action! Slay enemies, collect loot, and conquer 10 dungeon floors. Features dodge-rolling, loot drops, and escalating difficulty.
- **Controls**: WASD: Move | Click: Attack | Space: Dodge | Esc: Pause
- **Tags**: action, hack-and-slash, rpg, 3d, browser

### 2. Burger Brawl
- **File**: `publish/burger-brawl.zip`
- **Title**: Burger Brawl
- **Description**: You're a burger shop employee. Serve normal customers their orders — but PUNCH the monsters! Wrong target = lost life. How long can you survive the shift?
- **Controls**: A/D: Lane | Q/W/E/R: Serve food | Space: Punch | F: Bazooka | Esc: Pause
- **Tags**: action, comedy, arcade, 3d, browser

### 3. Phantom Lock
- **File**: `publish/phantom-lock.zip`
- **Title**: Phantom Lock
- **Description**: Multi-lock-on arena shooter! Hold right mouse to sweep and lock up to 8 enemies, then release to fire homing missiles at all targets. Survive 15 waves!
- **Controls**: Click to lock mouse | WASD: Move | LMB: Quick shot | RMB hold+sweep: Lock-on | Space: Dash
- **Tags**: shooter, action, arena, 3d, browser, bullet-hell

### 4. Crystal Siege
- **File**: `publish/crystal-siege-rts.zip`
- **Title**: Crystal Siege
- **Description**: Tower defense meets RTS! Gather crystals, build barracks and towers, train soldiers. Survive 10 increasingly brutal enemy waves. Features minimap and unit management.
- **Controls**: Mouse: Select/Command | WASD: Pan | Scroll: Zoom | B: Build | 1-3: Train | Esc: Pause
- **Tags**: strategy, rts, tower-defense, 3d, browser

### 5. Iron Conquest
- **File**: `publish/iron-conquest.zip`
- **Title**: Iron Conquest
- **Description**: Offensive RTS! Build your base, gather iron, train an army, and destroy the enemy AI's headquarters. The AI builds and attacks back — race to conquer!
- **Controls**: Mouse: Select/Command | WASD: Pan | Scroll: Zoom | B: Build | 1-3: Train | Esc: Pause
- **Tags**: strategy, rts, war, 3d, browser

### 6. Couch Chaos
- **File**: `publish/couch-chaos.zip`
- **Title**: Couch Chaos
- **Description**: Split-screen racing game, but PHYSICAL INTERFERENCE IS ALLOWED! Push, blind, pillow-smack, and tickle your opponent while racing to the finish line!
- **Controls**: Arrows/WASD: Run & Jump | T: Push | Y: Cover Eyes | U: Pillow | I: Tickle
- **Tags**: party, racing, competitive, funny, 3d, browser, local-multiplayer

### 7. Climb Clash
- **File**: `publish/climb-clash.zip`
- **Title**: Climb Clash
- **Description**: Competitive bouldering battle! Race your rival to the top of the wall. Sabotage their holds, freeze them, or shake their wall. First to the summit wins!
- **Controls**: WASD: Move between holds | 1: Destroy Hold | 2: Freeze | 3: Shake | Esc: Pause
- **Tags**: competitive, climbing, sabotage, 3d, browser

### 8. Quad Clash
- **File**: `publish/quad-clash.zip`
- **Title**: Quad Clash
- **Description**: 4-event athletic competition with sabotage! Compete in 100m Dash, Javelin, High Jump, and Marathon. Use sabotage items to disrupt your AI opponent!
- **Controls**: Varies per event (shown on screen) | 1-2: Sabotage items | Esc: Pause
- **Tags**: sports, party, competitive, sabotage, 3d, browser

---

## butler（CLI）での一括アップロード

```bash
# Install butler
# https://itch.io/docs/butler/installing.html

# Login
butler login

# Upload each game (replace YOUR_USERNAME)
butler push publish/hack-and-slash.zip YOUR_USERNAME/hack-and-slash:html
butler push publish/burger-brawl.zip YOUR_USERNAME/burger-brawl:html
butler push publish/phantom-lock.zip YOUR_USERNAME/phantom-lock:html
butler push publish/crystal-siege-rts.zip YOUR_USERNAME/crystal-siege-rts:html
butler push publish/iron-conquest.zip YOUR_USERNAME/iron-conquest:html
butler push publish/couch-chaos.zip YOUR_USERNAME/couch-chaos:html
butler push publish/climb-clash.zip YOUR_USERNAME/climb-clash:html
butler push publish/quad-clash.zip YOUR_USERNAME/quad-clash:html
```
