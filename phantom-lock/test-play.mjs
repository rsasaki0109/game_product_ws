/**
 * Phantom Lock - Smoke Test
 * Simulates lock-on shooter: player stays center, locks enemies, fires bursts
 */

const ENEMY_DEFS = {
  drone:  { type: 'drone',  hp: 20, speed: 3, damage: 5,  attackCooldown: 2.0, attackRange: 15, lockPoints: 1, score: 100 },
  turret: { type: 'turret', hp: 40, speed: 0, damage: 8,  attackCooldown: 1.5, attackRange: 20, lockPoints: 2, score: 200 },
  heavy:  { type: 'heavy',  hp: 80, speed: 2, damage: 10, attackCooldown: 2.0, attackRange: 12, lockPoints: 3, score: 300 },
  boss:   { type: 'boss',   hp: 200,speed: 1.5,damage: 15,attackCooldown: 1.5, attackRange: 15, lockPoints: 5, score: 1000 },
}

const WAVES = [
  [{ type: 'drone', count: 3 }],
  [{ type: 'drone', count: 5 }],
  [{ type: 'drone', count: 6 }, { type: 'turret', count: 1 }],
  [{ type: 'drone', count: 4 }, { type: 'turret', count: 2 }],
  [{ type: 'drone', count: 6 }, { type: 'turret', count: 2 }],
  [{ type: 'drone', count: 5 }, { type: 'turret', count: 2 }, { type: 'heavy', count: 1 }],
  [{ type: 'drone', count: 6 }, { type: 'heavy', count: 2 }],
  [{ type: 'turret', count: 3 }, { type: 'heavy', count: 2 }],
  [{ type: 'drone', count: 8 }, { type: 'heavy', count: 2 }, { type: 'turret', count: 2 }],
  [{ type: 'drone', count: 6 }, { type: 'heavy', count: 3 }, { type: 'turret', count: 3 }],
]

let uid = 1
function dist3(a, b) { return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2) }
function comboMultiplier(n) { return 1 + (n - 1) * 0.15 }

function spawnEnemies(waveIdx) {
  const waveDef = WAVES[Math.min(waveIdx, WAVES.length - 1)]
  const enemies = []
  for (const spawn of waveDef) {
    const def = ENEMY_DEFS[spawn.type]
    for (let i = 0; i < spawn.count; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = 12 + Math.random() * 8
      enemies.push({
        uid: uid++, def, hp: def.hp, maxHp: def.hp, alive: true,
        pos: [Math.cos(angle) * r, 1 + Math.random() * 2, Math.sin(angle) * r],
        attackTimer: def.attackCooldown, orbitAngle: angle,
      })
    }
  }
  return enemies
}

function runOneGame() {
  const playerPos = [0, 0, 0]
  let playerHp = 100, maxHp = 100, energy = 100, maxEnergy = 100
  let totalScore = 0, totalKills = 0, missilesFired = 0, wavesCleared = 0
  const DT = 0.1, LOCK_RANGE = 18, MISSILE_DMG = 15

  for (let wave = 0; wave < 10; wave++) {
    let enemies = spawnEnemies(wave)
    let lockCooldown = 0, burstCooldown = 0

    for (let t = 0; t < 600 && enemies.some(e => e.alive) && playerHp > 0; t++) {
      lockCooldown = Math.max(0, lockCooldown - DT)
      burstCooldown = Math.max(0, burstCooldown - DT)
      energy = Math.min(maxEnergy, energy + 5 * DT)

      // Lock all enemies in range
      const inRange = enemies.filter(e => e.alive && dist3(playerPos, e.pos) < LOCK_RANGE)
      const locked = inRange.slice(0, 6) // max 6 locks

      // Fire burst at locked targets
      if (burstCooldown <= 0 && locked.length > 0 && energy >= 10) {
        const mult = comboMultiplier(locked.length)
        for (const e of locked) {
          const dmg = Math.round(MISSILE_DMG * mult)
          e.hp -= dmg
          missilesFired++
          if (e.hp <= 0 && e.alive) {
            e.alive = false; totalKills++; totalScore += e.def.score
          }
        }
        energy -= 10
        burstCooldown = 0.8
      }

      // Enemy actions
      for (const e of enemies) {
        if (!e.alive) continue
        e.attackTimer -= DT
        // Drones orbit
        if (e.def.type === 'drone') {
          e.orbitAngle += 1.5 * DT
          const r = 10 + Math.sin(t * 0.07) * 3
          e.pos = [Math.cos(e.orbitAngle) * r, 1.5, Math.sin(e.orbitAngle) * r]
        }
        // Heavy/boss approach
        if (e.def.type === 'heavy' || e.def.type === 'boss') {
          const d = dist3(playerPos, e.pos)
          if (d > 2) {
            const dx = -e.pos[0]/d, dz = -e.pos[2]/d
            e.pos[0] += dx * e.def.speed * DT
            e.pos[2] += dz * e.def.speed * DT
          }
        }
        // Enemies shoot
        if (e.attackTimer <= 0) {
          playerHp -= e.def.damage
          e.attackTimer = e.def.attackCooldown
        }
      }

      if (playerHp <= 0) break
    }

    if (playerHp <= 0) break
    if (!enemies.some(e => e.alive)) wavesCleared++
    // Regen between waves
    playerHp = Math.min(maxHp, playerHp + 20)
    energy = maxEnergy
  }

  return { wavesCleared, totalScore, totalKills, missilesFired }
}

// --- Run tests ---
const RUNS = 10
const results = []
for (let i = 0; i < RUNS; i++) { uid = 1; results.push(runOneGame()) }

const avgWaves = results.reduce((s, r) => s + r.wavesCleared, 0) / RUNS
const avgScore = results.reduce((s, r) => s + r.totalScore, 0) / RUNS
const avgKills = results.reduce((s, r) => s + r.totalKills, 0) / RUNS
const avgMissiles = results.reduce((s, r) => s + r.missilesFired, 0) / RUNS
const cleared3 = results.filter(r => r.wavesCleared >= 3).length

const pass = cleared3 >= RUNS * 0.5 && avgKills > 0

console.log(`\x1b[35m`)
console.log(`+===============================+`)
console.log(`|  PHANTOM LOCK - Test Results   |`)
console.log(`+===============================+`)
console.log(`|  Runs: ${RUNS}                      |`)
console.log(`|  Avg Waves Cleared: ${avgWaves.toFixed(1).padEnd(10)}|`)
console.log(`|  Avg Score: ${avgScore.toFixed(0).padEnd(18)}|`)
console.log(`|  Avg Kills: ${avgKills.toFixed(1).padEnd(18)}|`)
console.log(`|  Avg Missiles: ${avgMissiles.toFixed(0).padEnd(15)}|`)
console.log(`|  Cleared 3+ waves: ${cleared3}/${RUNS}       |`)
console.log(`|  Status: ${pass ? '\x1b[32mPASS\x1b[35m' : '\x1b[31mFAIL\x1b[35m'}               |`)
console.log(`+===============================+`)
console.log(`\x1b[0m`)

if (!pass) process.exit(1)
