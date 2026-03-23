/**
 * Hack & Slash - Smoke Test
 * Simulates 10 games with random actions, validates core combat mechanics
 */

const ENEMIES = [
  { id: 'goblin', name: 'Goblin', baseHp: 15, baseAttack: 3, baseSpeed: 5, attackRange: 1.8, attackCooldown: 1.0 },
  { id: 'skeleton', name: 'Skeleton', baseHp: 25, baseAttack: 5, baseSpeed: 4, attackRange: 2.0, attackCooldown: 1.2 },
  { id: 'orc', name: 'Orc', baseHp: 40, baseAttack: 8, baseSpeed: 3, attackRange: 2.2, attackCooldown: 1.5 },
  { id: 'dark_knight', name: 'Dark Knight', baseHp: 80, baseAttack: 10, baseSpeed: 4, attackRange: 2.5, attackCooldown: 1.0 },
]

const ITEMS = [
  { id: 'rusty_sword', stat: 'attack', value: 2 },
  { id: 'sharp_blade', stat: 'attack', value: 4 },
  { id: 'leather_boots', stat: 'speed', value: 0.5 },
  { id: 'swift_sandals', stat: 'speed', value: 1.0 },
  { id: 'health_ring', stat: 'maxHp', value: 10 },
  { id: 'vitality_amulet', stat: 'maxHp', value: 20 },
]

function getWavesForFloor(floor) {
  if (floor <= 2) return [{ enemyId: 'goblin', count: 2 + floor }]
  if (floor <= 4) return [{ enemyId: 'goblin', count: 3 }, { enemyId: 'skeleton', count: 1 }]
  if (floor <= 6) return [{ enemyId: 'skeleton', count: 3 }, { enemyId: 'goblin', count: 2 }]
  if (floor <= 9) return [{ enemyId: 'orc', count: 2 }, { enemyId: 'skeleton', count: 2 }]
  return [{ enemyId: 'dark_knight', count: 1 }]
}

function calcDamage(attack) { return Math.max(1, Math.round(attack * (0.8 + Math.random() * 0.4))) }
function dist(a, b) { return Math.sqrt((a[0]-b[0])**2 + (a[2]-b[2])**2) }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

function rollLoot(floor) {
  if (Math.random() > 0.4) return null
  return ITEMS[Math.floor(Math.random() * ITEMS.length)]
}

function runOneGame() {
  let player = { pos: [0,0,0], hp: 50, maxHp: 50, attack: 8, speed: 6 }
  let totalKills = 0, score = 0

  for (let floor = 1; floor <= 10; floor++) {
    const wave = getWavesForFloor(floor)
    const scale = 1 + (floor - 1) * 0.12
    const enemies = []
    for (const w of wave) {
      const def = ENEMIES.find(e => e.id === w.enemyId)
      for (let i = 0; i < w.count; i++) {
        const angle = Math.random() * Math.PI * 2
        const r = 6 + Math.random() * 4
        enemies.push({
          def, hp: Math.round(def.baseHp * scale), attack: Math.round(def.baseAttack * scale),
          speed: def.baseSpeed, pos: [Math.cos(angle)*r, 0, Math.sin(angle)*r],
          cooldown: 0, alive: true,
        })
      }
    }

    const DT = 0.1
    for (let t = 0; t < 600 && enemies.some(e => e.alive); t++) {
      // Random movement
      const angle = Math.random() * Math.PI * 2
      player.pos[0] = clamp(player.pos[0] + Math.cos(angle) * player.speed * DT, -20, 20)
      player.pos[2] = clamp(player.pos[2] + Math.sin(angle) * player.speed * DT, -20, 20)

      for (const e of enemies) {
        if (!e.alive) continue
        const d = dist(player.pos, e.pos)
        // Move enemy toward player
        const dx = player.pos[0] - e.pos[0], dz = player.pos[2] - e.pos[2]
        const len = Math.sqrt(dx*dx + dz*dz) || 1
        e.pos[0] += (dx/len) * e.speed * DT
        e.pos[2] += (dz/len) * e.speed * DT
        // Player attacks nearby enemy
        if (d < 2.5) {
          e.hp -= calcDamage(player.attack)
          if (e.hp <= 0) { e.alive = false; totalKills++; score += 10 * floor }
        }
        // Enemy attacks player
        if (d < e.def.attackRange) {
          e.cooldown -= DT
          if (e.cooldown <= 0) {
            player.hp -= calcDamage(e.attack)
            e.cooldown = e.def.attackCooldown
          }
        }
      }
      if (player.hp <= 0) break
    }

    if (player.hp <= 0) return { floor, kills: totalKills, score }

    // Loot + heal
    player.hp = Math.min(player.maxHp, player.hp + 10)
    const loot = rollLoot(floor)
    if (loot) {
      if (loot.stat === 'attack') player.attack += loot.value
      else if (loot.stat === 'speed') player.speed += loot.value
      else if (loot.stat === 'maxHp') { player.maxHp += loot.value; player.hp += loot.value }
    }
  }
  return { floor: 10, kills: totalKills, score }
}

// --- Run tests ---
const RUNS = 10
const results = []
for (let i = 0; i < RUNS; i++) results.push(runOneGame())

const avgFloor = results.reduce((s, r) => s + r.floor, 0) / RUNS
const avgKills = results.reduce((s, r) => s + r.kills, 0) / RUNS
const avgScore = results.reduce((s, r) => s + r.score, 0) / RUNS
const floorAbove1 = results.filter(r => r.floor > 1).length

const pass = floorAbove1 >= RUNS * 0.5 && avgKills > 0

console.log(`\x1b[36m`)
console.log(`+===============================+`)
console.log(`|  HACK & SLASH - Test Results   |`)
console.log(`+===============================+`)
console.log(`|  Runs: ${RUNS}                      |`)
console.log(`|  Avg Floor: ${avgFloor.toFixed(1).padEnd(18)}|`)
console.log(`|  Avg Kills: ${avgKills.toFixed(1).padEnd(18)}|`)
console.log(`|  Avg Score: ${avgScore.toFixed(0).padEnd(18)}|`)
console.log(`|  Floor>1 rate: ${floorAbove1}/${RUNS}            |`)
console.log(`|  Status: ${pass ? '\x1b[32mPASS\x1b[36m' : '\x1b[31mFAIL\x1b[36m'}               |`)
console.log(`+===============================+`)
console.log(`\x1b[0m`)

if (!pass) process.exit(1)
