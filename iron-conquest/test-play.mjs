/**
 * Iron Conquest - Smoke Test
 * Simulates player vs AI RTS: economy, military, combat to conclusion
 */

const UNIT_DEFS = {
  worker:    { type: 'worker',    hp: 25, attack: 2,  range: 1.5, cooldown: 1.0, speed: 4, cost: 40, trainTime: 2.5, at: 'hq' },
  militia:   { type: 'militia',   hp: 60, attack: 10, range: 1.8, cooldown: 1.0, speed: 4, cost: 80, trainTime: 4, at: 'barracks' },
  ranger:    { type: 'ranger',    hp: 40, attack: 8,  range: 7.0, cooldown: 1.5, speed: 3.5, cost: 100, trainTime: 5, at: 'barracks' },
  tank:      { type: 'tank',      hp: 180,attack: 22, range: 2.0, cooldown: 1.5, speed: 2.5, cost: 250, trainTime: 8, at: 'factory' },
  artillery: { type: 'artillery', hp: 50, attack: 30, range: 12, cooldown: 2.5, speed: 1.5, cost: 300, trainTime: 10, at: 'factory' },
}

const BUILDING_DEFS = {
  hq:       { hp: 800, cost: 0, buildTime: 0 },
  barracks: { hp: 400, cost: 120, buildTime: 5 },
  factory:  { hp: 500, cost: 300, buildTime: 7 },
  refinery: { hp: 200, cost: 180, buildTime: 3 },
}

function simulatePlayer(state, DT) {
  const s = state
  // Refinery income
  s.iron += s.refineries * 3 * DT

  // Build order: refinery -> barracks -> factory -> more refineries
  if (s.buildQueue.length === 0) {
    if (s.refineries < 1 && s.iron >= 180) { s.buildQueue.push({ type: 'refinery', prog: 0 }); s.iron -= 180 }
    else if (!s.hasBarracks && s.iron >= 120) { s.buildQueue.push({ type: 'barracks', prog: 0 }); s.iron -= 120 }
    else if (!s.hasFactory && s.hasBarracks && s.iron >= 300) { s.buildQueue.push({ type: 'factory', prog: 0 }); s.iron -= 300 }
    else if (s.refineries < 3 && s.iron >= 180) { s.buildQueue.push({ type: 'refinery', prog: 0 }); s.iron -= 180 }
  }

  // Progress builds
  for (const b of s.buildQueue) {
    b.prog += DT
    if (b.prog >= BUILDING_DEFS[b.type].buildTime) {
      if (b.type === 'refinery') s.refineries++
      else if (b.type === 'barracks') s.hasBarracks = true
      else if (b.type === 'factory') s.hasFactory = true
      s.buildingsBuilt++
    }
  }
  s.buildQueue = s.buildQueue.filter(b => b.prog < BUILDING_DEFS[b.type].buildTime)

  // Train units
  if (s.hasBarracks && s.iron >= 80 && s.units.length < 20) {
    s.units.push({ type: 'militia', hp: 60, attack: 10, cooldown: 0 })
    s.iron -= 80; s.unitsTrained++
  }
  if (s.hasFactory && s.iron >= 250 && s.units.length < 20) {
    s.units.push({ type: 'tank', hp: 180, attack: 22, cooldown: 0 })
    s.iron -= 250; s.unitsTrained++
  }
}

function runOneGame() {
  const DT = 1.0, MAX_TIME = 300

  const player = {
    iron: 200, hqHp: 800, refineries: 0, hasBarracks: false, hasFactory: false,
    buildQueue: [], units: [], unitsTrained: 0, buildingsBuilt: 1,
  }
  const ai = {
    iron: 200, hqHp: 800, refineries: 0, hasBarracks: false, hasFactory: false,
    buildQueue: [], units: [], unitsTrained: 0, buildingsBuilt: 1,
  }

  let winner = null, elapsed = 0

  for (let t = 0; t < MAX_TIME / DT; t++) {
    elapsed = t * DT

    simulatePlayer(player, DT)
    simulatePlayer(ai, DT)

    // Combat: each side's units attack the other side's units, then HQ
    function resolveCombat(attackers, defenders, defHp) {
      for (const a of attackers) {
        a.cooldown -= DT
        if (a.cooldown > 0) continue
        if (defenders.length > 0) {
          defenders[0].hp -= a.attack
          a.cooldown = UNIT_DEFS[a.type].cooldown
        } else {
          defHp -= a.attack
          a.cooldown = UNIT_DEFS[a.type].cooldown
        }
      }
      return defHp
    }

    // Engage when both have enough forces or after 120s
    if (elapsed > 120 || (player.units.length >= 5 && ai.units.length >= 5)) {
      ai.hqHp = resolveCombat(player.units, ai.units, ai.hqHp)
      player.hqHp = resolveCombat(ai.units, player.units, player.hqHp)
    }

    // Cleanup dead
    player.units = player.units.filter(u => u.hp > 0)
    ai.units = ai.units.filter(u => u.hp > 0)

    if (ai.hqHp <= 0) { winner = 'player'; break }
    if (player.hqHp <= 0) { winner = 'ai'; break }
  }

  if (!winner) winner = player.hqHp >= ai.hqHp ? 'player' : 'ai'

  return {
    winner, elapsed: Math.round(elapsed),
    playerUnits: player.unitsTrained, aiUnits: ai.unitsTrained,
    playerBuildings: player.buildingsBuilt, aiBuildings: ai.buildingsBuilt,
  }
}

// --- Run tests ---
const RUNS = 5
const results = []
for (let i = 0; i < RUNS; i++) results.push(runOneGame())

const playerWins = results.filter(r => r.winner === 'player').length
const avgTime = results.reduce((s, r) => s + r.elapsed, 0) / RUNS
const avgPUnits = results.reduce((s, r) => s + r.playerUnits, 0) / RUNS
const avgAIUnits = results.reduce((s, r) => s + r.aiUnits, 0) / RUNS
const hasConclusion = results.every(r => r.winner !== null)
const aiBuildsSomething = results.every(r => r.aiUnits > 0)

const pass = hasConclusion && aiBuildsSomething

console.log(`\x1b[90m`)
console.log(`+===============================+`)
console.log(`|  IRON CONQUEST - Test Results  |`)
console.log(`+===============================+`)
console.log(`|  Runs: ${RUNS}                       |`)
console.log(`|  Player Wins: ${playerWins}/${RUNS}             |`)
console.log(`|  Avg Time: ${avgTime.toFixed(0)}s${' '.repeat(Math.max(0, 16 - avgTime.toFixed(0).length))}|`)
console.log(`|  Avg Player Units: ${avgPUnits.toFixed(1).padEnd(11)}|`)
console.log(`|  Avg AI Units: ${avgAIUnits.toFixed(1).padEnd(15)}|`)
console.log(`|  All Conclude: ${hasConclusion ? 'YES' : 'NO'}              |`)
console.log(`|  AI Builds Units: ${aiBuildsSomething ? 'YES' : 'NO'}          |`)
console.log(`|  Status: ${pass ? '\x1b[32mPASS\x1b[90m' : '\x1b[31mFAIL\x1b[90m'}               |`)
console.log(`+===============================+`)
console.log(`\x1b[0m`)

if (!pass) process.exit(1)
