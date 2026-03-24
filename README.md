# 🎮 Game Arcade — 8 Browser Games + 11 Roblox Games

**Play now:** [**https://rsasaki0109.github.io/game_product_ws/**](https://rsasaki0109.github.io/game_product_ws/)

No install. No login. Just click and play.

---

## 🕹️ Browser Games (8 titles)

| Game | Genre | Description | Play |
|------|-------|-------------|------|
| **🍔 Burger Brawl** | Action/Comedy | Serve customers, PUNCH monsters. Wrong target = you lose! | [▶ Play](https://rsasaki0109.github.io/game_product_ws/burger-brawl/) |
| **🎯 Phantom Lock** | Shooter | Lock onto 8 enemies at once, unleash homing missiles! | [▶ Play](https://rsasaki0109.github.io/game_product_ws/phantom-lock/) |
| **🛋️ Couch Chaos** | Party/Racing | Race to finish, but physical sabotage is ALLOWED! | [▶ Play](https://rsasaki0109.github.io/game_product_ws/couch-chaos/) |
| **⚔️ Hack & Slash** | Action/RPG | Slay enemies, grab loot, conquer 10 dungeon floors | [▶ Play](https://rsasaki0109.github.io/game_product_ws/hack-and-slash/) |
| **🏰 Crystal Siege** | Tower Defense | Gather crystals, build army, survive 10 waves | [▶ Play](https://rsasaki0109.github.io/game_product_ws/crystal-siege-rts/) |
| **⚙️ Iron Conquest** | RTS | Build base, train army, destroy enemy HQ | [▶ Play](https://rsasaki0109.github.io/game_product_ws/iron-conquest/) |
| **🧗 Climb Clash** | Competitive | Race to the top, sabotage rival's wall | [▶ Play](https://rsasaki0109.github.io/game_product_ws/climb-clash/) |
| **🏅 Quad Clash** | Sports/Party | 4 athletic events with sabotage items | [▶ Play](https://rsasaki0109.github.io/game_product_ws/quad-clash/) |

### Features (all games)
- 🎵 Sound effects (Web Audio API, no files needed)
- 📖 Tutorial on first play
- 🏆 High score / personal best (saved locally)
- ⏸️ Pause (Esc key)
- 🎚️ Difficulty selection (Easy / Normal / Hard)
- 📊 Game-over statistics
- 🔄 Quick restart (R key)

---

## 🟥 Roblox Games (11 titles)

| Game | Concept | Unique Mechanic |
|------|---------|----------------|
| **⚾ Baseball Brawl** | Chaos sport brawl | RAGE MODE at 3-kill streak |
| **🚪 Blink Door Brawl** | Portal teleport PvP | DOOR COMBO for mega portals |
| **🫧 Bubble Drifter** | Sky race in bubbles | BUBBLE MERGE on collision |
| **🎈 Hot Air Havoc** | Aerial balloon survival | GRAPPLE HOOK to steal fuel |
| **⚽ Roll Ball Rush** | Downhill ball race | 4 POWER-UP types |
| **📝 Word Step Run** | Platform creation race | PUSH & TRAP spell blocks |
| **🔄 Gravity Flip Arena** | Gravity-reversing PvP | Walk on walls & ceilings! |
| **🧲 Magnet Wars** | Polarity-based sumo | N/S pole attract/repel |
| **📏 Size Shifter** | Size-changing battle | Giant/Tiny rock-paper-scissors |
| **👥 Clone Chaos** | Clone army deception | DISGUISE swap with clones |
| **👻 Echo Tag** | Dark sonar tag | Echo pulses reveal players |

---

## 🛠️ Tech Stack

- **Browser games:** React 19 + Three.js (R3F) + Zustand + Vite + TypeScript
- **Roblox games:** Luau + Rojo
- **Testing:** Automated test suites for all 19 games
- **Dogfooding:** Balance tuning across 5 rounds (41→12 issues)

## 🧪 Run Tests

```bash
# Browser games (8)
node scripts/test-all-browser.mjs

# Roblox games (11)
node scripts/test-all-roblox.mjs

# Deep dogfooding
node scripts/dogfood-browser.mjs
```

## 📦 Local Development

```bash
# Play any browser game locally
cd burger-brawl && npm install && npm run dev

# Run the game portal
node scripts/serve-portal.mjs
# → http://localhost:8080
```

---

**Made with Claude Code** 🤖
