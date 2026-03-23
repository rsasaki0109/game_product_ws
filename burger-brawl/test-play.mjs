/**
 * Burger Brawl - Smoke Test
 * Simulates lane-based food serving + monster punching
 */

const NORMALS = [
  { type: 'normal', name: 'Customer', hp: 1, speed: 2, order: 'burger', patience: 10, score: 10 },
  { type: 'normal', name: 'Hungry Kid', hp: 1, speed: 2.5, order: 'fries', patience: 8, score: 15 },
  { type: 'normal', name: 'Office Worker', hp: 1, speed: 1.8, order: 'combo', patience: 12, score: 20 },
  { type: 'normal', name: 'Tourist', hp: 1, speed: 1.5, order: 'drink', patience: 14, score: 10 },
]

const MONSTERS = [
  { type: 'monster', kind: 'karenzilla', name: 'Karenzilla', hp: 3, speed: 1.5, patience: 6, score: 30 },
  { type: 'monster', kind: 'creamthrower', name: 'Cream Thrower', hp: 2, speed: 2.5, patience: 5, score: 25 },
  { type: 'monster', kind: 'tableflip', name: 'Table Flipper', hp: 5, speed: 1, patience: 7, score: 40 },
  { type: 'monster', kind: 'screamking', name: 'Scream King', hp: 4, speed: 1.8, patience: 4, score: 50 },
]

let nextUid = 1

function spawnCustomer(elapsed, occupiedLanes) {
  let monsterChance = 0
  if (elapsed > 15) monsterChance = Math.min(0.5, 0.10 + (elapsed - 15) * 0.003)
  const isMonster = Math.random() < monsterChance
  const pool = isMonster ? MONSTERS : NORMALS
  const def = pool[Math.floor(Math.random() * pool.length)]
  const freeLanes = [0,1,2,3,4].filter(l => !occupiedLanes.includes(l))
  if (freeLanes.length === 0) return null
  const lane = freeLanes[Math.floor(Math.random() * freeLanes.length)]
  return { uid: nextUid++, def, lane, distance: 12, hp: def.hp, patience: def.patience, state: 'approaching' }
}

function runOneGame() {
  const DT = 0.5, DURATION = 60
  let score = 0, lives = 3, customersServed = 0, monstersDefeated = 0
  let customers = [], elapsed = 0, spawnTimer = 0, playerLane = 2

  for (let t = 0; t < DURATION / DT && lives > 0; t++) {
    elapsed += DT

    // Spawn
    spawnTimer -= DT
    if (spawnTimer <= 0) {
      const occ = customers.filter(c => c.state === 'approaching' || c.state === 'waiting').map(c => c.lane)
      const c = spawnCustomer(elapsed, occ)
      if (c) customers.push(c)
      spawnTimer = 1.5 + Math.random() * 1.5
    }

    // Update customers
    for (const c of customers) {
      if (c.state === 'approaching') {
        c.distance -= c.def.speed * DT
        if (c.distance <= 1) { c.state = 'waiting'; c.distance = 1 }
      } else if (c.state === 'waiting') {
        c.patience -= DT
        if (c.patience <= 0) {
          if (c.def.type === 'monster') { lives--; c.state = 'dead' }
          else { c.state = 'dead' }
        }
      }
    }

    // Player AI: serve normals in own lane, punch monsters
    const waitingInLane = customers.filter(c => c.state === 'waiting')
    if (waitingInLane.length > 0) {
      // Prioritize monsters (punch) then normals (serve)
      const monster = waitingInLane.find(c => c.def.type === 'monster')
      const normal = waitingInLane.find(c => c.def.type === 'normal')
      const target = monster || normal
      if (target) {
        playerLane = target.lane
        if (target.def.type === 'monster') {
          target.hp -= 1
          if (target.hp <= 0) { target.state = 'dead'; monstersDefeated++; score += target.def.score }
        } else {
          target.state = 'dead'; customersServed++; score += target.def.score
        }
      }
    }

    // Cleanup
    customers = customers.filter(c => c.state !== 'dead')
  }

  return { score, lives, customersServed, monstersDefeated, survived: elapsed }
}

// --- Run tests ---
const RUNS = 20
const results = []
for (let i = 0; i < RUNS; i++) { nextUid = 1; results.push(runOneGame()) }

const avgScore = results.reduce((s, r) => s + r.score, 0) / RUNS
const avgLives = results.reduce((s, r) => s + r.lives, 0) / RUNS
const avgServed = results.reduce((s, r) => s + r.customersServed, 0) / RUNS
const avgMonsters = results.reduce((s, r) => s + r.monstersDefeated, 0) / RUNS
const survived30 = results.filter(r => r.survived >= 30).length

const pass = avgScore > 0 && survived30 >= RUNS * 0.5

console.log(`\x1b[33m`)
console.log(`+===============================+`)
console.log(`|  BURGER BRAWL - Test Results   |`)
console.log(`+===============================+`)
console.log(`|  Runs: ${RUNS}                     |`)
console.log(`|  Avg Score: ${avgScore.toFixed(0).padEnd(18)}|`)
console.log(`|  Avg Lives Left: ${avgLives.toFixed(1).padEnd(13)}|`)
console.log(`|  Avg Served: ${avgServed.toFixed(1).padEnd(17)}|`)
console.log(`|  Avg Monsters KO: ${avgMonsters.toFixed(1).padEnd(12)}|`)
console.log(`|  Survived>30s: ${survived30}/${RUNS}          |`)
console.log(`|  Status: ${pass ? '\x1b[32mPASS\x1b[33m' : '\x1b[31mFAIL\x1b[33m'}               |`)
console.log(`+===============================+`)
console.log(`\x1b[0m`)

if (!pass) process.exit(1)
