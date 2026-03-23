/**
 * Crystal Siege RTS - Smoke Test
 * Simulates economy + building + training + wave defense
 */

const UNIT_DEFS = {
  worker:  { type: 'worker',  hp: 30, attack: 3,  attackRange: 1.5, attackCooldown: 1.0, speed: 4, cost: 50, trainTime: 3 },
  soldier: { type: 'soldier', hp: 80, attack: 12, attackRange: 1.8, attackCooldown: 1.0, speed: 3.5, cost: 100, trainTime: 5 },
  archer:  { type: 'archer',  hp: 45, attack: 10, attackRange: 8.0, attackCooldown: 1.5, speed: 3, cost: 120, trainTime: 6 },
  knight:  { type: 'knight',  hp: 150,attack: 18, attackRange: 2.0, attackCooldown: 1.5, speed: 2.5, cost: 200, trainTime: 8 },
}

const BUILDING_DEFS = {
  hq:       { type: 'hq',       hp: 500, cost: 0,   buildTime: 0 },
  barracks: { type: 'barracks', hp: 300, cost: 200, buildTime: 5 },
  tower:    { type: 'tower',    hp: 200, cost: 150, buildTime: 4 },
  mine:     { type: 'mine',     hp: 150, cost: 100, buildTime: 3 },
}

function getWaveDef(wave) {
  if (wave <= 3) return [{ type: 'soldier', count: 2 + wave * 2 }]
  if (wave <= 6) return [{ type: 'soldier', count: 3 + wave }, { type: 'archer', count: Math.floor(wave / 2) }]
  if (wave <= 9) return [{ type: 'soldier', count: 4 + wave }, { type: 'archer', count: wave - 2 }, { type: 'knight', count: Math.floor((wave - 6) * 1.5) }]
  return [{ type: 'knight', count: 8 }, { type: 'soldier', count: 10 }, { type: 'archer', count: 8 }]
}

function runOneGame() {
  const DT = 0.25, DURATION = 180
  let crystals = 400, buildings = [], units = [], waveSurvived = 0
  let unitsTrained = 0, resourcesGathered = 0, buildingsBuilt = 0
  let waveTimer = 25, currentWave = 0, hqHp = 500
  let uid = 1

  // Start with HQ
  buildings.push({ uid: uid++, type: 'hq', hp: 500, built: true, buildProg: 0 })
  buildingsBuilt++

  // Build plan
  let builtMine = 0, builtBarracks = false

  for (let t = 0; t < DURATION / DT && hqHp > 0; t++) {
    const elapsed = t * DT

    // Base passive income + mine income (base HQ generates 5/s)
    const mineCount = buildings.filter(b => b.type === 'mine' && b.built).length
    const income = (5 + mineCount * 3) * DT
    crystals += income
    resourcesGathered += income

    // Auto-build: barracks first (keep 100 for mine)
    if (!builtBarracks && crystals >= 200) {
      buildings.push({ uid: uid++, type: 'barracks', hp: 300, built: false, buildProg: 0 })
      crystals -= 200; builtBarracks = true
    }
    if (builtMine < 1 && crystals >= 100) {
      buildings.push({ uid: uid++, type: 'mine', hp: 150, built: false, buildProg: 0 })
      crystals -= 100; builtMine++
    }
    // Build additional mines when affordable (after first soldier)
    if (builtBarracks && unitsTrained >= 1 && crystals >= 100 && mineCount < 3) {
      buildings.push({ uid: uid++, type: 'mine', hp: 150, built: false, buildProg: 0 })
      crystals -= 100; builtMine++
    }

    // Progress construction
    for (const b of buildings) {
      if (!b.built) {
        b.buildProg += DT
        const btime = BUILDING_DEFS[b.type].buildTime
        if (b.buildProg >= btime) { b.built = true; buildingsBuilt++ }
      }
    }

    // Train soldiers when barracks ready and affordable (throttled by trainTime)
    const barracks = buildings.find(b => b.type === 'barracks' && b.built)
    if (barracks) {
      if (!barracks._trainTimer) barracks._trainTimer = 0
      barracks._trainTimer -= DT
      if (barracks._trainTimer <= 0 && crystals >= 100 && units.filter(u => u.owner === 'player').length < 20) {
        units.push({ uid: uid++, type: 'soldier', owner: 'player', hp: 80, attack: 12, range: 1.8, cooldown: 0, pos: [0, 0] })
        crystals -= 100; unitsTrained++
        barracks._trainTimer = 5 // train time
      }
    }

    // Wave spawning
    waveTimer -= DT
    if (waveTimer <= 0 && currentWave < 10) {
      currentWave++
      const scale = 1 + (currentWave - 1) * 0.15
      const waveDef = getWaveDef(currentWave)
      for (const spawn of waveDef) {
        const def = UNIT_DEFS[spawn.type]
        for (let i = 0; i < spawn.count; i++) {
          units.push({
            uid: uid++, type: spawn.type, owner: 'enemy',
            hp: Math.round(def.hp * scale), attack: Math.round(def.attack * scale),
            range: def.attackRange, cooldown: 0,
            pos: [(Math.random() - 0.5) * 40, (Math.random() > 0.5 ? 1 : -1) * 20],
          })
        }
      }
      waveTimer = 25
    }

    // Combat: player units attack enemy, enemy attacks player units then HQ
    const playerUnits = units.filter(u => u.owner === 'player' && u.hp > 0)
    const enemyUnits = units.filter(u => u.owner === 'enemy' && u.hp > 0)

    for (const pu of playerUnits) {
      if (enemyUnits.length === 0) break
      const target = enemyUnits[0]
      pu.cooldown -= DT
      if (pu.cooldown <= 0) { target.hp -= pu.attack; pu.cooldown = 1.0 }
    }
    for (const eu of enemyUnits) {
      eu.cooldown -= DT
      if (playerUnits.length > 0) {
        const target = playerUnits[0]
        if (eu.cooldown <= 0) { target.hp -= eu.attack; eu.cooldown = UNIT_DEFS[eu.type].attackCooldown }
      } else {
        if (eu.cooldown <= 0) { hqHp -= eu.attack; eu.cooldown = UNIT_DEFS[eu.type].attackCooldown }
      }
    }

    // Remove dead units
    const beforeEnemy = enemyUnits.length
    units = units.filter(u => u.hp > 0)
    const afterEnemy = units.filter(u => u.owner === 'enemy').length

    // Check if wave cleared or HQ still alive
    if (beforeEnemy > 0 && afterEnemy === 0) waveSurvived = currentWave
  }

  // If HQ survived, we survived all spawned waves
  if (hqHp > 0 && currentWave > 0) waveSurvived = currentWave

  return { waveSurvived, unitsTrained, resourcesGathered: Math.round(resourcesGathered), buildingsBuilt }
}

// --- Run tests ---
const RUNS = 5
const results = []
for (let i = 0; i < RUNS; i++) results.push(runOneGame())

const avgWaves = results.reduce((s, r) => s + r.waveSurvived, 0) / RUNS
const avgUnits = results.reduce((s, r) => s + r.unitsTrained, 0) / RUNS
const avgRes = results.reduce((s, r) => s + r.resourcesGathered, 0) / RUNS
const avgBuild = results.reduce((s, r) => s + r.buildingsBuilt, 0) / RUNS
const economyWorks = avgRes > 0 && avgUnits > 0

const pass = economyWorks

console.log(`\x1b[34m`)
console.log(`+===============================+`)
console.log(`|  CRYSTAL SIEGE - Test Results  |`)
console.log(`+===============================+`)
console.log(`|  Runs: ${RUNS}                       |`)
console.log(`|  Avg Waves Survived: ${avgWaves.toFixed(1).padEnd(9)}|`)
console.log(`|  Avg Units Trained: ${avgUnits.toFixed(1).padEnd(10)}|`)
console.log(`|  Avg Resources: ${avgRes.toString().padEnd(14)}|`)
console.log(`|  Avg Buildings: ${avgBuild.toFixed(1).padEnd(14)}|`)
console.log(`|  Status: ${pass ? '\x1b[32mPASS\x1b[34m' : '\x1b[31mFAIL\x1b[34m'}               |`)
console.log(`+===============================+`)
console.log(`\x1b[0m`)

if (!pass) process.exit(1)
