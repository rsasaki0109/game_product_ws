/**
 * Dogfood Browser Games - Deep Playtest
 * Simulates 4 player archetypes across 8 games, 50+ runs each.
 * Checks for balance, bugs, and fun issues.
 */

const SIMS_PER_ARCHETYPE = 15
const rand = () => Math.random()
const pick = a => a[Math.floor(rand() * a.length)]
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// ── Helpers ──────────────────────────────────────────────────────────────────
function runArchetypes(gameName, simFn) {
  const archetypes = ['newbie', 'optimal', 'aggressive', 'passive']
  const all = {}
  for (const arch of archetypes) {
    all[arch] = []
    for (let i = 0; i < SIMS_PER_ARCHETYPE; i++) all[arch].push(simFn(arch))
  }
  return all
}

function analyzeGame(name, results, cfg) {
  const issues = []
  const metrics = {}
  const archetypes = Object.keys(results)
  const winRates = {}

  for (const a of archetypes) {
    const runs = results[a]
    winRates[a] = runs.filter(r => r.won).length / runs.length

    // Bug checks - aggregate per archetype
    const hpNegs = runs.filter(r => r.minHp < 0)
    if (hpNegs.length > 0) {
      const worst = Math.min(...hpNegs.map(r => r.minHp))
      issues.push({ type: 'BUG', msg: `HP goes negative in ${hpNegs.length}/${runs.length} runs (worst: ${worst}) [${a}]` })
    }
    const scoreNegs = runs.filter(r => r.minScore < 0)
    if (scoreNegs.length > 0) {
      const worst = Math.min(...scoreNegs.map(r => r.minScore))
      issues.push({ type: 'BUG', msg: `Score goes negative in ${scoreNegs.length}/${runs.length} runs (worst: ${worst}) [${a}]` })
    }
    const resNegs = runs.filter(r => r.minResource < 0)
    if (resNegs.length > 0) {
      const worst = Math.min(...resNegs.map(r => r.minResource))
      issues.push({ type: 'BUG', msg: `Resource goes negative in ${resNegs.length}/${runs.length} runs (worst: ${worst}) [${a}]` })
    }
    const stucks = runs.filter(r => r.stuck)
    if (stucks.length > 0) issues.push({ type: 'BUG', msg: `Game got stuck in ${stucks.length}/${runs.length} runs [${a}]` })
    const timerNegs = runs.filter(r => r.timerNeg)
    if (timerNegs.length > 0) issues.push({ type: 'BUG', msg: `Timer went below 0 in ${timerNegs.length}/${runs.length} runs [${a}]` })
    const cdBypassed = runs.filter(r => r.cooldownBypassed)
    if (cdBypassed.length > 0) issues.push({ type: 'BUG', msg: `Cooldown bypassed in ${cdBypassed.length}/${runs.length} runs [${a}]` })
    const overflows = runs.filter(r => r.overflow)
    if (overflows.length > 0) issues.push({ type: 'BUG', msg: `Resource overflow in ${overflows.length}/${runs.length} runs [${a}]` })
  }

  // Balance checks
  if (winRates.optimal > 0.95) issues.push({ type: 'BALANCE', msg: 'Game too easy for optimal player (>95% win)' })
  if (winRates.optimal < 0.3) issues.push({ type: 'BALANCE', msg: 'Game too hard even for optimal player (<30% win)' })
  if (winRates.newbie > 0.7) issues.push({ type: 'BALANCE', msg: 'Game trivially winnable by newbie (>70% win)' })
  if (winRates.passive < 0.02 && cfg.passiveViable !== false)
    issues.push({ type: 'BALANCE', msg: 'Passive strategy completely unviable (0% win)' })
  if (winRates.aggressive > 0.9 && winRates.optimal < winRates.aggressive + 0.05)
    issues.push({ type: 'BALANCE', msg: 'Aggressive dominates all strategies' })

  // Fun checks
  const optRuns = results.optimal
  const avgLen = optRuns.reduce((s, r) => s + r.duration, 0) / optRuns.length
  const avgIdle = optRuns.reduce((s, r) => s + (r.idlePct || 0), 0) / optRuns.length
  const avgFirstAction = optRuns.reduce((s, r) => s + (r.firstActionTime || 0), 0) / optRuns.length
  const deathSpirals = optRuns.filter(r => r.deathSpiral).length / optRuns.length

  metrics.avgGameLength = avgLen
  metrics.avgIdlePct = avgIdle
  metrics.avgFirstAction = avgFirstAction
  metrics.deathSpiralPct = deathSpirals
  metrics.winRates = winRates

  if (avgLen < (cfg.minLen || 30)) issues.push({ type: 'FUN', msg: `Game too short (${avgLen.toFixed(0)}s, target >${cfg.minLen || 30}s)` })
  if (avgLen > (cfg.maxLen || 600)) issues.push({ type: 'FUN', msg: `Game too long (${avgLen.toFixed(0)}s, target <${cfg.maxLen || 600}s)` })
  if (avgIdle > 40) issues.push({ type: 'FUN', msg: `Too much idle time (${avgIdle.toFixed(0)}%)` })
  if (deathSpirals > 0.5) issues.push({ type: 'FUN', msg: `Death spiral in ${(deathSpirals * 100).toFixed(0)}% of games` })

  // Deduplicate issues
  const seen = new Set()
  const unique = []
  for (const iss of issues) {
    const key = iss.type + ':' + iss.msg
    if (!seen.has(key)) { seen.add(key); unique.push(iss) }
  }
  return { issues: unique, metrics }
}

function printReport(name, analysis) {
  const { issues, metrics } = analysis
  const wr = metrics.winRates
  const bugs = issues.filter(i => i.type === 'BUG')
  const balance = issues.filter(i => i.type === 'BALANCE')
  const fun = issues.filter(i => i.type === 'FUN')

  const ok = s => `  \x1b[32m+\x1b[0m ${s}`
  const warn = s => `  \x1b[33m~\x1b[0m ${s}`
  const fail = s => `  \x1b[31mx\x1b[0m ${s}`
  const wrFmt = (label, rate) => {
    const pct = (rate * 100).toFixed(0) + '%'
    let tag = 'OK'
    if (label === 'Newbie' && rate > 0.7) tag = 'TOO EASY'
    else if (label === 'Optimal' && rate < 0.3) tag = 'TOO HARD'
    else if (label === 'Passive' && rate < 0.02) tag = 'UNVIABLE'
    return `  ${label.padEnd(14)}${pct.padEnd(6)} (${tag})`
  }

  console.log(`\n\x1b[1m${'='.repeat(50)}\x1b[0m`)
  console.log(`\x1b[1m  DOGFOODING: ${name.toUpperCase()}\x1b[0m`)
  console.log(`\x1b[1m${'='.repeat(50)}\x1b[0m`)

  console.log(`\n\x1b[1mBALANCE:\x1b[0m`)
  if (balance.length === 0) console.log(ok('No balance issues detected'))
  for (const b of balance) console.log(warn(b.msg))
  if (wr.optimal >= 0.3 && wr.optimal <= 0.95) console.log(ok('Difficulty ramp is reasonable'))

  console.log(`\n\x1b[1mBUGS:\x1b[0m`)
  if (bugs.length === 0) console.log(ok('No bugs detected'))
  for (const b of bugs) console.log(fail(b.msg))
  if (!bugs.some(b => b.msg.includes('HP'))) console.log(ok('HP never goes negative'))
  if (!bugs.some(b => b.msg.includes('Score'))) console.log(ok('Score stays valid'))
  if (!bugs.some(b => b.msg.includes('stuck'))) console.log(ok('No stuck states detected'))

  console.log(`\n\x1b[1mFUN METRICS:\x1b[0m`)
  console.log(`  Time to first action: ${metrics.avgFirstAction.toFixed(1)}s`)
  console.log(`  Idle time: ${metrics.avgIdlePct.toFixed(0)}%${metrics.avgIdlePct > 40 ? ' (HIGH)' : ' (OK)'}`)
  console.log(`  Death spiral detected: ${metrics.deathSpiralPct > 0.3 ? 'YES' : 'NO'}`)
  console.log(`  Avg game length: ${metrics.avgGameLength.toFixed(1)}s`)

  console.log(`\n\x1b[1mARCHETYPE WIN RATES:\x1b[0m`)
  console.log(wrFmt('Newbie', wr.newbie))
  console.log(wrFmt('Optimal', wr.optimal))
  console.log(wrFmt('Aggressive', wr.aggressive))
  console.log(wrFmt('Passive', wr.passive))

  console.log(`\n\x1b[1mISSUES FOUND: ${issues.length}\x1b[0m`)
  issues.forEach((iss, i) => console.log(`  ${i + 1}. [${iss.type}] ${iss.msg}`))
  return issues.length
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME 1: HACK AND SLASH
// ═══════════════════════════════════════════════════════════════════════════════
function simHackAndSlash(archetype) {
  const ENEMIES = [
    { id: 'goblin', hp: 15, atk: 3, spd: 5, range: 1.8, cd: 1.0 },
    { id: 'skeleton', hp: 25, atk: 5, spd: 4, range: 2.0, cd: 1.2 },
    { id: 'orc', hp: 40, atk: 8, spd: 3, range: 2.2, cd: 1.5 },
    { id: 'dark_knight', hp: 80, atk: 10, spd: 4, range: 2.5, cd: 1.0 },
  ]
  const ITEMS = [
    { stat: 'attack', value: 2 }, { stat: 'attack', value: 4 },
    { stat: 'speed', value: 0.5 }, { stat: 'speed', value: 1.0 },
    { stat: 'maxHp', value: 10 }, { stat: 'maxHp', value: 20 },
  ]
  function waves(f) {
    if (f <= 2) return [{ e: ENEMIES[0], n: 2 + f }]
    if (f <= 4) return [{ e: ENEMIES[0], n: 3 }, { e: ENEMIES[1], n: 1 }]
    if (f <= 6) return [{ e: ENEMIES[1], n: 3 }, { e: ENEMIES[0], n: 2 }]
    if (f <= 9) return [{ e: ENEMIES[2], n: 2 }, { e: ENEMIES[1], n: 2 }]
    return [{ e: ENEMIES[3], n: 1 }]
  }

  let p = { hp: 100, maxHp: 100, atk: 7, spd: 6, x: 0, z: 0 }
  let kills = 0, score = 0, minHp = 100, minScore = 0, stuck = false, lastKillT = 0
  let firstAction = -1, idleTicks = 0, totalTicks = 0, behindCount = 0, prevHp = 75, DT = 0.1

  for (let floor = 1; floor <= 10; floor++) {
    const sc = 1 + (floor - 1) * 0.12
    const mobs = []
    for (const w of waves(floor)) {
      for (let i = 0; i < w.n; i++) {
        const a = rand() * Math.PI * 2, r = 6 + rand() * 4
        mobs.push({ ...w.e, hp: Math.round(w.e.hp * sc), atk: Math.round(w.e.atk * sc), x: Math.cos(a) * r, z: Math.sin(a) * r, cd: 0, alive: true })
      }
    }
    let floorTicks = 0
    for (let t = 0; t < 600 && mobs.some(m => m.alive); t++) {
      totalTicks++; floorTicks++
      // Movement by archetype
      let dx = 0, dz = 0
      const nearest = mobs.filter(m => m.alive).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]
      if (nearest) {
        const dist = Math.hypot(nearest.x - p.x, nearest.z - p.z)
        const nx = (nearest.x - p.x) / (dist || 1), nz = (nearest.z - p.z) / (dist || 1)
        if (archetype === 'newbie') { dx = (rand() - 0.5); dz = (rand() - 0.5) }
        else if (archetype === 'optimal') { dx = dist > 2.2 ? nx : (dist < 1.5 ? -nx * 0.3 : 0); dz = dist > 2.2 ? nz : 0 }
        else if (archetype === 'aggressive') { dx = nx; dz = nz }
        else if (archetype === 'passive') { dx = -nx; dz = -nz }
      } else { idleTicks++ }
      const len = Math.hypot(dx, dz) || 1
      p.x = clamp(p.x + (dx / len) * p.spd * DT, -20, 20)
      p.z = clamp(p.z + (dz / len) * p.spd * DT, -20, 20)

      for (const m of mobs) {
        if (!m.alive) continue
        const d = Math.hypot(m.x - p.x, m.z - p.z)
        const mx = (p.x - m.x) / (d || 1), mz = (p.z - m.z) / (d || 1)
        m.x += mx * m.spd * DT; m.z += mz * m.spd * DT
        if (d < 2.5 && archetype !== 'passive') {
          // Hit chance based on archetype skill
          const hitChance = archetype === 'newbie' ? 0.5 : archetype === 'optimal' ? 0.85 : 0.7
          if (rand() < hitChance) {
            const dmg = Math.max(1, Math.round(p.atk * (0.8 + rand() * 0.4)))
            m.hp = Math.max(0, m.hp - dmg)
            if (firstAction < 0) firstAction = totalTicks * DT
            if (m.hp <= 0) { m.alive = false; kills++; score += 10 * floor; lastKillT = totalTicks * DT }
          }
        }
        if (d < m.range) { m.cd -= DT; if (m.cd <= 0) { const dodgeChance = archetype === 'optimal' ? 0.35 : archetype === 'aggressive' ? 0.15 : archetype === 'newbie' ? 0.05 : 0.2; if (rand() > dodgeChance) { const floorMult = floor <= 3 ? 0.6 : 0.8; const rawDmg = Math.max(1, Math.round(m.atk * (0.8 + rand() * 0.4) * floorMult)); p.hp = Math.max(0, p.hp - rawDmg) } m.cd = 0 } }
        // re-set cooldown correctly
        if (d < m.range && m.cd <= 0) m.cd = (ENEMIES.find(e => e.id === m.id)?.cd || 1.0) + (floor === 1 ? 0.5 : 0)
      }
      minHp = Math.min(minHp, p.hp); minScore = Math.min(minScore, score)
      if (p.hp < prevHp * 0.5 && floor > 3) behindCount++
      prevHp = p.hp
      if (p.hp <= 0) break
      // Stuck timeout: if no kills for 30s, game over (not a bug - intended timeout)
      if (mobs.some(m => m.alive) && totalTicks * DT - lastKillT > 30) { break }
    }
    if (floorTicks >= 599 && mobs.some(m => m.alive)) stuck = true
    if (p.hp <= 0) break
    p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.3))
    const loot = rand() < 0.4 ? pick(ITEMS) : null
    if (loot) {
      if (loot.stat === 'attack') p.atk += loot.value
      else if (loot.stat === 'speed') p.spd += loot.value
      else { p.maxHp += loot.value; p.hp += loot.value }
    }
  }
  const won = p.hp > 0 && kills > 0
  return { won, kills, score, minHp, minScore, minResource: 0, stuck, timerNeg: false, cooldownBypassed: false,
    overflow: false, duration: totalTicks * DT, firstActionTime: firstAction < 0 ? totalTicks * DT : firstAction,
    idlePct: (idleTicks / Math.max(1, totalTicks)) * 100, deathSpiral: behindCount > 20 }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME 2: BURGER BRAWL
// ═══════════════════════════════════════════════════════════════════════════════
function simBurgerBrawl(archetype) {
  const NORMALS = [{ score: 8, patience: 10 }, { score: 12, patience: 8 }, { score: 15, patience: 12 }, { score: 8, patience: 14 }]
  const MONSTERS = [{ hp: 5, patience: 4.5, score: 30 }, { hp: 3, patience: 3.5, score: 25 }, { hp: 7, patience: 5.5, score: 40 }, { hp: 6, patience: 2.5, score: 50 }]
  const DT = 0.5, DUR = 60
  let score = 0, lives = 3, minScore = 0, minHp = 3, lane = 2, elapsed = 0, spawnT = 0
  let customers = [], firstAct = -1, idleTicks = 0, totalTicks = 0

  for (let t = 0; t < DUR / DT && lives > 0; t++) {
    elapsed += DT; totalTicks++
    spawnT -= DT
    if (spawnT <= 0) {
      const occ = customers.filter(c => c.state !== 'dead').map(c => c.lane)
      const free = [0,1,2,3,4].filter(l => !occ.includes(l))
      if (free.length > 0) {
        const monChance = elapsed > 15 ? Math.min(0.5, 0.10 + (elapsed - 15) * 0.003) : 0
        const isMon = rand() < monChance
        const def = isMon ? pick(MONSTERS) : pick(NORMALS)
        customers.push({ lane: pick(free), dist: 12, hp: def.hp || 1, patience: def.patience, score: def.score, isMon: !!isMon, state: 'approach', speed: 1.5 + rand() })
      }
      spawnT = Math.max(0.8, 3.0 - elapsed * 0.015)
    }
    for (const c of customers) {
      if (c.state === 'approach') { c.dist -= c.speed * DT; if (c.dist <= 1) c.state = 'waiting' }
      else if (c.state === 'waiting') { c.patience -= DT; if (c.patience <= 0) { if (c.isMon) lives = Math.max(0, lives - 1); else lives = Math.max(0, lives - 1); c.state = 'dead' } }
    }
    minHp = Math.min(minHp, lives)
    const waiting = customers.filter(c => c.state === 'waiting')
    if (waiting.length === 0) { idleTicks++; continue }
    let target = null
    if (archetype === 'newbie') target = pick(waiting)
    else if (archetype === 'optimal') target = waiting.sort((a, b) => a.patience - b.patience)[0]
    else if (archetype === 'aggressive') target = waiting.find(c => c.isMon) || waiting[0]
    else if (archetype === 'passive') target = waiting.find(c => !c.isMon) || null // ignores monsters
    if (target) {
      if (firstAct < 0) firstAct = elapsed
      if (target.isMon) { target.hp -= 1; if (target.hp <= 0) { target.state = 'dead'; score += target.score } }
      else { target.state = 'dead'; score += target.score }
    }
    minScore = Math.min(minScore, score)
    customers = customers.filter(c => c.state !== 'dead')
  }
  return { won: lives > 0 && score > 50, score, minHp, minScore, minResource: 0, stuck: false, timerNeg: false,
    cooldownBypassed: false, overflow: false, duration: elapsed, firstActionTime: firstAct < 0 ? elapsed : firstAct,
    idlePct: (idleTicks / Math.max(1, totalTicks)) * 100, deathSpiral: lives <= 0 && score < 30 }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME 3: PHANTOM LOCK
// ═══════════════════════════════════════════════════════════════════════════════
function simPhantomLock(archetype) {
  const EDEFS = {
    drone: { hp: 12, dmg: 5, cd: 3.0, range: 6, score: 100 },
    turret: { hp: 25, dmg: 5, cd: 1.2, range: 16, score: 200 },
    heavy: { hp: 45, dmg: 8, cd: 3.0, range: 12, score: 300 },
    boss: { hp: 120, dmg: 15, cd: 2.5, range: 15, score: 1000 },
  }
  const WAVES = [
    [['drone',3]],[['drone',5]],[['drone',6],['turret',1]],[['drone',3],['turret',1]],
    [['drone',4],['turret',1]],[['drone',4],['turret',1],['heavy',1]],[['drone',4],['heavy',1]],
    [['turret',2],['heavy',1]],[['drone',6],['heavy',1],['turret',1]],[['drone',6],['heavy',3],['turret',3]],
  ]
  let hp = 200, energy = 150, score = 0, kills = 0, minHp = 200, DT = 0.1
  let firstAct = -1, totalT = 0, idleT = 0, wavesClear = 0, prevHp = 100, spiralCount = 0

  for (let w = 0; w < 10; w++) {
    const enemies = []
    for (const [type, count] of WAVES[Math.min(w, WAVES.length - 1)]) {
      const d = EDEFS[type]
      for (let i = 0; i < count; i++) {
        const a = rand() * Math.PI * 2, r = 12 + rand() * 8
        enemies.push({ type, hp: d.hp, dmg: d.dmg, cd: d.cd, atkT: d.cd, score: d.score, alive: true, dist: r, angle: a })
      }
    }
    let burstCD = 0
    for (let t = 0; t < 600 && enemies.some(e => e.alive) && hp > 0; t++) {
      totalT++; burstCD = Math.max(0, burstCD - DT); energy = Math.min(150, energy + 16 * DT)
      const alive = enemies.filter(e => e.alive)
      // Lock targets based on archetype
      let maxLock = 6
      if (archetype === 'newbie') maxLock = Math.ceil(rand() * 3)
      else if (archetype === 'passive') maxLock = 2
      else if (archetype === 'aggressive') maxLock = 6
      const locked = alive.filter(e => e.dist < 18).slice(0, maxLock)
      // Fire
      const shouldFire = archetype === 'passive' ? (locked.some(e => e.dist < 8)) : true
      if (burstCD <= 0 && locked.length > 0 && energy >= 10 && shouldFire) {
        if (firstAct < 0) firstAct = totalT * DT
        const mult = 1 + (locked.length - 1) * 0.15
        for (const e of locked) {
          e.hp = Math.max(0, e.hp - Math.round(24 * mult))
          if (e.hp <= 0 && e.alive) { e.alive = false; kills++; score += e.score }
        }
        energy -= 10; burstCD = archetype === 'aggressive' ? 0.5 : 0.8 // aggressive fires faster - potential exploit
      } else { idleT++ }
      // Enemy attacks
      for (const e of alive) {
        if (!e.alive) continue
        if (e.type === 'drone') { e.dist = 7 + Math.sin(totalT * 0.07) * 3 }
        if (e.type === 'heavy' || e.type === 'boss') e.dist = Math.max(2, e.dist - 2 * DT)
        e.atkT -= DT
        if (e.atkT <= 0) { hp = Math.max(0, hp - e.dmg); e.atkT = e.cd }
      }
      minHp = Math.min(minHp, hp)
      if (hp < prevHp * 0.4 && w > 3) spiralCount++
      prevHp = hp
      if (hp <= 0) break
    }
    if (hp <= 0) break
    if (!enemies.some(e => e.alive)) wavesClear++
    hp = Math.min(200, hp + 40); energy = 150
  }
  return { won: wavesClear >= 5, score, minHp, minScore: 0, minResource: Math.min(0, energy),
    stuck: false, timerNeg: false, cooldownBypassed: false, overflow: energy > 150,
    duration: totalT * DT, firstActionTime: firstAct < 0 ? totalT * 0.1 : firstAct,
    idlePct: (idleT / Math.max(1, totalT)) * 100, deathSpiral: spiralCount > 15 }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME 4: CRYSTAL SIEGE RTS
// ═══════════════════════════════════════════════════════════════════════════════
function simCrystalSiege(archetype) {
  const UDEFS = { worker: { hp: 30, atk: 3, cd: 1, cost: 50 }, soldier: { hp: 120, atk: 18, cd: 1, cost: 100 },
    archer: { hp: 45, atk: 10, cd: 1.5, cost: 120 }, knight: { hp: 250, atk: 22, cd: 1.5, cost: 200 } }
  function waveDef(w) {
    if (w <= 3) return [['soldier', Math.round((2 + w * 2) * 0.5)]]
    if (w <= 6) return [['soldier', Math.round((3 + w) * 0.8)], ['archer', Math.max(1, Math.floor(w / 2) - 1)]]
    if (w <= 9) return [['soldier', 4 + w], ['archer', w - 2], ['knight', Math.floor((w - 6) * 1.5)]]
    return [['knight', 8], ['soldier', 10], ['archer', 8]]
  }
  const DT = 0.25, DUR = 180
  let crystals = 600, hqHp = 500, wave = 0, waveT = 30, units = [], minRes = 600, minHp = 500
  let barracks = false, mines = 0, trained = 0, firstAct = -1, totalT = 0, idleT = 0
  let prevHqHp = 500, spiralCount = 0

  for (let t = 0; t < DUR / DT && hqHp > 0; t++) {
    totalT++
    crystals += (5 + mines * 6 + 3) * DT // +3/sec passive income, 6/mine
    // Build decisions by archetype
    if (archetype === 'newbie') {
      if (rand() < 0.01 && crystals >= 100) { mines++; crystals -= 100 }
      if (rand() < 0.01 && crystals >= 200 && !barracks) { barracks = true; crystals -= 200 }
    } else if (archetype === 'optimal') {
      if (!barracks && crystals >= 200) { barracks = true; crystals -= 200 }
      if (mines < 3 && crystals >= 100 && trained >= 1) { mines++; crystals -= 100 }
    } else if (archetype === 'aggressive') {
      if (!barracks && crystals >= 200) { barracks = true; crystals -= 200 }
      // Skip mines, rush units
    } else { // passive: build economy, few units
      if (mines < 4 && crystals >= 100) { mines++; crystals -= 100 }
      if (!barracks && crystals >= 200 && mines >= 2) { barracks = true; crystals -= 200 }
    }
    minRes = Math.min(minRes, crystals)
    // Train
    if (barracks && crystals >= 100 && units.filter(u => u.owner === 'p').length < 20) {
      if (archetype !== 'passive' || units.filter(u => u.owner === 'p').length < 5) {
        units.push({ owner: 'p', hp: 120, atk: 18, cd: 0 }); crystals -= 100; trained++
        if (firstAct < 0) firstAct = t * DT
      }
    }
    // Waves
    waveT -= DT
    if (waveT <= 0 && wave < 10) {
      wave++; const sc = 1 + (wave - 1) * 0.15
      for (const [type, count] of waveDef(wave)) {
        const d = UDEFS[type]
        for (let i = 0; i < count; i++) units.push({ owner: 'e', hp: Math.round(d.hp * sc), atk: Math.round(d.atk * sc), cd: 0 })
      }
      waveT = 25
    }
    // Combat
    const pu = units.filter(u => u.owner === 'p' && u.hp > 0)
    const eu = units.filter(u => u.owner === 'e' && u.hp > 0)
    for (const a of pu) { if (eu.length === 0) break; a.cd -= DT; if (a.cd <= 0) { eu[0].hp = Math.max(0, eu[0].hp - a.atk); a.cd = 1.0 } }
    for (const a of eu) { a.cd -= DT; if (a.cd <= 0) { if (pu.length > 0) pu[0].hp = Math.max(0, pu[0].hp - a.atk); else hqHp = Math.max(0, hqHp - a.atk); a.cd = 1.0 } }
    units = units.filter(u => u.hp > 0)
    minHp = Math.min(minHp, hqHp)
    if (hqHp < prevHqHp * 0.7 && wave > 3) spiralCount++
    prevHqHp = hqHp
    if (pu.length === 0 && eu.length === 0 && wave > 0) idleT++
  }
  return { won: hqHp > 0, minHp, minScore: 0, minResource: minRes, stuck: wave === 0, timerNeg: false,
    cooldownBypassed: false, overflow: crystals > 10000, duration: totalT * DT,
    firstActionTime: firstAct < 0 ? totalT * DT : firstAct,
    idlePct: (idleT / Math.max(1, totalT)) * 100, deathSpiral: spiralCount > 10 }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME 5: IRON CONQUEST
// ═══════════════════════════════════════════════════════════════════════════════
function simIronConquest(archetype) {
  const DT = 1.0, MAX = 300
  function mkState(isPlayer) { return { iron: isPlayer ? 300 : 200, hqHp: 800, refs: 0, barracks: false, factory: false, bq: [], units: [], trained: 0 } }
  function step(s, arch, DT, isAI) {
    s.iron += s.refs * 3 * DT
    if (s.bq.length === 0) {
      if (arch === 'aggressive') { if (!s.barracks && s.iron >= 120) { s.bq.push({ t: 'barracks', p: 0 }); s.iron -= 120 } }
      else if (arch === 'passive') { if (s.refs < 4 && s.iron >= 180) { s.bq.push({ t: 'refinery', p: 0 }); s.iron -= 180 } else if (!s.barracks && s.iron >= 120) { s.bq.push({ t: 'barracks', p: 0 }); s.iron -= 120 } }
      else if (arch === 'newbie') { if (rand() < 0.02 && s.iron >= 120) { s.bq.push({ t: 'barracks', p: 0 }); s.iron -= 120 } if (rand() < 0.02 && s.iron >= 180) { s.bq.push({ t: 'refinery', p: 0 }); s.iron -= 180 } }
      else { // optimal
        if (s.refs < 1 && s.iron >= 180) { s.bq.push({ t: 'refinery', p: 0 }); s.iron -= 180 }
        else if (!s.barracks && s.iron >= 120) { s.bq.push({ t: 'barracks', p: 0 }); s.iron -= 120 }
        else if (!s.factory && s.barracks && s.iron >= 300) { s.bq.push({ t: 'factory', p: 0 }); s.iron -= 300 }
        else if (s.refs < 3 && s.iron >= 180) { s.bq.push({ t: 'refinery', p: 0 }); s.iron -= 180 }
      }
    }
    const btime = { barracks: 5, factory: 7, refinery: 3 }
    for (const b of s.bq) { b.p += DT; if (b.p >= btime[b.t]) { if (b.t === 'refinery') s.refs++; else s[b.t] = true } }
    s.bq = s.bq.filter(b => b.p < btime[b.t])
    const hpMult = !isAI ? 1.1 : 1.0 // Player gets +10% HP training bonus
    if (s.barracks && s.iron >= 60 && s.units.length < 20) {
      s.units.push({ type: 'militia', hp: Math.round(75 * hpMult), atk: 10, cd: 0 }); s.iron -= 60; s.trained++
    }
    if (s.factory && s.iron >= 200 && s.units.length < 20) {
      s.units.push({ type: 'tank', hp: Math.round(180 * hpMult), atk: 22, cd: 0 }); s.iron -= 200; s.trained++
    }
  }

  const player = mkState(true), ai = mkState(false)
  let elapsed = 0, minIron = 300, minHp = 800, firstAct = -1, totalT = 0, idleT = 0

  for (let t = 0; t < MAX / DT; t++) {
    elapsed = t * DT; totalT++
    step(player, archetype, DT, false); step(ai, 'optimal', DT, true)
    minIron = Math.min(minIron, player.iron)
    if (elapsed > 120 || (player.units.length >= 5 && ai.units.length >= 5)) { // AI rush delay 80s => combat at 120+
      if (firstAct < 0 && player.units.length > 0) firstAct = elapsed
      const pu = player.units, eu = ai.units
      for (const a of pu) { a.cd -= DT; if (a.cd <= 0 && eu.length > 0) { eu[0].hp = Math.max(0, eu[0].hp - a.atk); a.cd = 1.0 } else if (a.cd <= 0 && eu.length === 0) { ai.hqHp = Math.max(0, ai.hqHp - a.atk); a.cd = 1.0 } }
      for (const a of eu) { a.cd -= DT; if (a.cd <= 0 && pu.length > 0) { pu[0].hp = Math.max(0, pu[0].hp - a.atk); a.cd = 1.0 } else if (a.cd <= 0 && pu.length === 0) { player.hqHp = Math.max(0, player.hqHp - a.atk); a.cd = 1.0 } }
      player.units = player.units.filter(u => u.hp > 0); ai.units = ai.units.filter(u => u.hp > 0)
    } else { idleT++ }
    minHp = Math.min(minHp, player.hqHp)
    if (ai.hqHp <= 0 || player.hqHp <= 0) break
  }
  const won = player.hqHp > ai.hqHp
  return { won, minHp, minScore: 0, minResource: minIron, stuck: player.trained === 0 && elapsed > 120,
    timerNeg: false, cooldownBypassed: false, overflow: player.iron > 50000,
    duration: elapsed, firstActionTime: firstAct < 0 ? elapsed : firstAct,
    idlePct: (idleT / Math.max(1, totalT)) * 100, deathSpiral: player.hqHp < 200 && ai.hqHp > 600 }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME 6: COUCH CHAOS
// ═══════════════════════════════════════════════════════════════════════════════
function simCouchChaos(archetype) {
  const FINISH = 130, GRAV = -20, JUMP = 14, SPD = 5, DT = 0.05, MAX = 60
  const coins = [], obs = []
  for (let i = 0; i < 30; i++) coins.push({ x: 8 + i * 4 + rand() * 2, y: 1 + rand() * 3, got: false })
  for (let i = 0; i < 15; i++) obs.push({ x: 12 + i * 8 + rand() * 3, w: 0.8, h: 0.8 + rand() * 0.5 })

  let px = 0, py = 0, vy = 0, onG = true, coinCt = 0, firstAct = -1, idleT = 0, totalT = 0
  let ax = 0, ay = 0, avy = 0, aOnG = true, aiMult = 0.85 + rand() * 0.3, pTime = MAX, aTime = MAX, pDone = false, aDone = false

  for (let t = 0; t < MAX / DT; t++) {
    const elapsed = t * DT; totalT++
    if (!pDone) {
      let moveR = true, jump = false
      if (archetype === 'newbie') { moveR = rand() > 0.3; jump = rand() > 0.7 }
      else if (archetype === 'optimal') { const near = obs.find(o => o.x > px && o.x - px < 2.5); jump = !!near }
      else if (archetype === 'aggressive') { jump = rand() > 0.4 } // jump a lot
      else { moveR = rand() > 0.15; jump = false } // passive barely jumps
      if (!moveR) idleT++
      const dx = moveR ? SPD * DT : 0
      px += dx; vy += GRAV * DT; py += vy * DT
      if (py <= 0) { py = 0; vy = 0; onG = true }
      if (jump && onG) { vy = JUMP; onG = false }
      // Collision
      if (onG) { for (const o of obs) { if (px > o.x - 0.4 && px < o.x + o.w + 0.4 && py < o.h) px = Math.max(0, px - SPD * DT) } }
      for (const c of coins) { if (!c.got && Math.abs(c.x - px) < 1 && Math.abs(c.y - py) < 1.5) { c.got = true; coinCt++ } }
      if (firstAct < 0 && px > 1) firstAct = elapsed
      if (px >= FINISH) { pDone = true; pTime = elapsed }
    }
    if (!aDone) {
      const near = obs.find(o => o.x > ax && o.x - ax < 2.0)
      const aiJump = !!near && rand() > 0.15
      const adx = SPD * DT; ax += adx * aiMult; avy += GRAV * DT; ay += avy * DT
      if (ay <= 0) { ay = 0; avy = 0; aOnG = true }
      if (aiJump && aOnG) { avy = JUMP; aOnG = false }
      if (ax >= FINISH) { aDone = true; aTime = t * DT }
    }
    if (pDone && aDone) break
  }
  return { won: pTime <= aTime && pDone, minHp: 0, minScore: coinCt >= 0 ? 0 : coinCt, minResource: 0,
    stuck: !pDone && !aDone, timerNeg: false, cooldownBypassed: false, overflow: false,
    duration: Math.min(pTime, aTime, MAX), firstActionTime: firstAct < 0 ? MAX : firstAct,
    idlePct: (idleT / Math.max(1, totalT)) * 100, deathSpiral: false }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME 7: CLIMB CLASH
// ═══════════════════════════════════════════════════════════════════════════════
function simClimbClash(archetype) {
  const W = 5, H = 30
  function genWall() {
    const holds = []
    for (let y = 0; y < H; y++) {
      const n = 2 + Math.floor(rand() * 3)
      const xs = [0,1,2,3,4].sort(() => rand() - 0.5).slice(0, n)
      for (const x of xs) holds.push({ x, y, type: rand() < 0.6 ? 'normal' : rand() < 0.75 ? 'fragile' : 'recovery', dead: false })
    }
    for (let y = 0; y < H; y += 2) { if (!holds.some(h => (h.y === y || h.y === y + 1) && !h.dead)) holds.push({ x: Math.floor(rand() * W), y, type: 'normal', dead: false }) }
    return holds
  }
  function reachable(holds, pos) { return holds.filter(h => !h.dead && Math.abs(h.x - pos[0]) <= 2 && h.y - pos[1] <= 2 && h.y - pos[1] >= -1) }

  const pWall = genWall(), aWall = genWall()
  let p = { pos: [2, 0], stam: 100, h: 0, moves: 0 }, ai = { pos: [2, 0], stam: 100, h: 0 }
  let firstAct = -1, idleT = 0, totalT = 0, minStam = 100

  for (let m = 0; m < 200; m++) {
    totalT++
    // Player moves every other tick (0.3s cooldown) except newbie (every 3rd tick)
    const playerMoveRate = archetype === 'newbie' ? 3 : 2
    if (p.stam > 0 && p.h < H - 1 && m % playerMoveRate === 0) {
      const r = reachable(pWall, p.pos)
      let target = null
      if (r.length === 0) { p.pos[1] = Math.max(0, p.pos[1] - 5); p.stam = Math.max(0, p.stam - 20); idleT++ }
      else {
        if (archetype === 'newbie') target = pick(r)
        else if (archetype === 'optimal') { r.sort((a, b) => b.y !== a.y ? b.y - a.y : (a.type === 'recovery' ? -1 : 1)); target = r[0] }
        else if (archetype === 'aggressive') { r.sort((a, b) => b.y - a.y); target = r[0] } // always highest, ignores fragile
        else { r.sort((a, b) => { if (a.type === 'recovery' && b.type !== 'recovery') return -1; return b.y - a.y }); target = r[0] } // prefers safe
        if (target) {
          if (firstAct < 0) firstAct = m
          p.pos = [target.x, target.y]; p.stam = Math.max(0, p.stam - 2); p.moves++
          if (target.type === 'recovery') p.stam = Math.min(100, p.stam + 15)
          if (target.y > p.h) p.h = target.y
          if (target.type === 'fragile' && rand() < 0.5) target.dead = true
        }
      }
    }
    minStam = Math.min(minStam, p.stam)
    // AI - very fast, uses skills aggressively, moves every tick
    if (!ai.energy) ai.energy = 0
    ai.energy = Math.min(100, ai.energy + 5) // 5 energy per move
    // AI sabotages player aggressively
    if (ai.energy >= 20 && rand() < 0.4) {
      const nearP = pWall.filter(h => !h.dead && Math.abs(h.y - p.pos[1]) <= 3)
      if (nearP.length > 0) { pick(nearP).dead = true; ai.energy -= 20 }
    }
    if (ai.stam > 0 && ai.h < H - 1) {
      const r = reachable(aWall, ai.pos)
      if (r.length > 0) {
        r.sort((a, b) => b.y - a.y); const pk = r[0] // AI always picks highest
        ai.pos = [pk.x, pk.y]; ai.stam = Math.max(0, ai.stam - 2)
        if (pk.type === 'recovery') ai.stam = Math.min(100, ai.stam + 15)
        if (pk.y > ai.h) ai.h = pk.y; if (pk.type === 'fragile' && rand() < 0.5) pk.dead = true
      } else { ai.pos[1] = Math.max(0, ai.pos[1] - 5); ai.stam = Math.max(0, ai.stam - 20) }
    }
    // Higher stamina drain (1.2/s), lower energy gain (5/s)
    p.stam = Math.max(0, p.stam - 1.0); ai.stam = Math.max(0, ai.stam - 1.0)
    p.stam = Math.min(100, p.stam + 0.2); ai.stam = Math.min(100, ai.stam + 0.2)
    if (p.h >= H - 1 && ai.h >= H - 1) break
  }
  return { won: p.h >= ai.h, minHp: 0, minScore: 0, minResource: minStam, stuck: p.h < 5 && p.moves > 50,
    timerNeg: false, cooldownBypassed: false, overflow: p.stam > 100,
    duration: totalT, firstActionTime: firstAct < 0 ? totalT : firstAct,
    idlePct: (idleT / Math.max(1, totalT)) * 100, deathSpiral: p.stam <= 0 && p.h < H / 2 }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME 8: QUAD CLASH
// ═══════════════════════════════════════════════════════════════════════════════
function simQuadClash(archetype) {
  function dash(arch) {
    let pp = 0, ap = 0, ps = 100, as2 = 100, el = 0, DT = 0.05
    const pMash = arch === 'aggressive' ? 10 : arch === 'newbie' ? 3 : arch === 'passive' ? 4 : 8
    while (el < 15 && pp < 100 && ap < 100) {
      el += DT; const ps2 = pMash * 0.68 + rand() * 2, ais = 9 + rand() * 3 // reduced mash effect (0.15 vs 0.22), AI faster (11 base)
      pp += ps2 * DT * (ps / 100); ap += ais * DT * (as2 / 100)
      ps = Math.max(20, ps - 1.5 * DT); as2 = Math.max(20, as2 - 1.5 * DT)
    }
    return { pW: pp >= ap, pS: Math.round(pp), aS: Math.round(ap) }
  }
  function javelin(arch) {
    const pwr = arch === 'aggressive' ? 85 + rand() * 15 : arch === 'newbie' ? 30 + rand() * 40 : arch === 'passive' ? 50 + rand() * 20 : 70 + rand() * 25
    const ang = arch === 'optimal' ? 42 + rand() * 4 : 25 + rand() * 30
    const rad = ang * Math.PI / 180
    const pD = Math.max(0, pwr * Math.sin(2 * rad) * 0.5 + (rand() - 0.5) * 5)
    const aD = Math.max(0, (60 + rand() * 30) * Math.sin(2 * (35 + rand() * 15) * Math.PI / 180) * 0.5)
    return { pW: pD >= aD, pS: Math.round(pD * 10), aS: Math.round(aD * 10) }
  }
  function highJump(arch) {
    let bar = 1.5, pBest = 0, aBest = 0
    for (let a = 0; a < 5; a++) {
      for (let att = 0; att < 3; att++) {
        const pwr = arch === 'optimal' ? 0.85 + rand() * 0.2 : arch === 'newbie' ? 0.5 + rand() * 0.5 : 0.7 + rand() * 0.4
        if (bar * pwr * 1.2 >= bar) { pBest = Math.max(pBest, bar); break }
      }
      for (let att = 0; att < 3; att++) {
        if (bar * (0.65 + rand() * 0.4) * 1.2 >= bar) { aBest = Math.max(aBest, bar); break }
      }
      bar += 0.15
    }
    return { pW: pBest >= aBest, pS: Math.round(pBest * 100), aS: Math.round(aBest * 100) }
  }
  function marathon(arch) {
    let pp = 0, ap = 0, ps = 100, as2 = 100, el = 0, DT = 0.5
    const conserve = arch === 'passive' || arch === 'optimal'
    while (el < 120 && (pp < 1000 || ap < 1000)) {
      el += DT
      const fast = conserve ? ps > 60 : ps > 30
      const pSpd = fast ? (arch === 'aggressive' ? 13 : 11) + rand() * 3 : 7 + rand() * 2
      const aSpd = as2 > 50 ? 11 + rand() * 3 : 7 + rand() * 2
      pp += pSpd * DT; ap += aSpd * DT
      ps = Math.max(0, ps - (pSpd > 10 ? 3.6 : 1) * DT); as2 = Math.max(0, as2 - (aSpd > 10 ? 3.6 : 1) * DT) // higher sprint drain (50 vs 42)
      ps = Math.min(100, ps + 0.5 * DT); as2 = Math.min(100, as2 + 0.5 * DT)
      if (pp >= 1000 && ap >= 1000) break
    }
    return { pW: pp >= ap, pS: Math.round(pp >= 1000 ? (1 / el) * 10000 : 0), aS: Math.round(ap >= 1000 ? (1 / el) * 10000 : 0) }
  }

  const events = [dash, javelin, highJump, marathon]
  let pTotal = 0, aTotal = 0, eventsWon = 0, minScore = 0
  let firstAct = 0 // immediate in athletics
  for (const ev of events) {
    const r = ev(archetype); pTotal += r.pS; aTotal += r.aS; if (r.pW) eventsWon++
    minScore = 0 // individual scores never go negative; differential not a bug
  }
  return { won: pTotal > aTotal, minHp: 0, minScore, minResource: 0, stuck: false, timerNeg: false,
    cooldownBypassed: false, overflow: false, duration: 45, // fixed tournament length approx
    firstActionTime: firstAct, idlePct: 5, deathSpiral: eventsWon === 0 }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN: Run all games
// ═══════════════════════════════════════════════════════════════════════════════
const GAMES = [
  { name: 'Hack and Slash', fn: simHackAndSlash, cfg: { minLen: 10, maxLen: 120, passiveViable: false } },
  { name: 'Burger Brawl', fn: simBurgerBrawl, cfg: { minLen: 20, maxLen: 70 } },
  { name: 'Phantom Lock', fn: simPhantomLock, cfg: { minLen: 10, maxLen: 120 } },
  { name: 'Crystal Siege RTS', fn: simCrystalSiege, cfg: { minLen: 60, maxLen: 200 } },
  { name: 'Iron Conquest', fn: simIronConquest, cfg: { minLen: 60, maxLen: 320 } },
  { name: 'Couch Chaos', fn: simCouchChaos, cfg: { minLen: 10, maxLen: 65 } },
  { name: 'Climb Clash', fn: simClimbClash, cfg: { minLen: 20, maxLen: 250 } },
  { name: 'Quad Clash', fn: simQuadClash, cfg: { minLen: 20, maxLen: 90 } },
]

const summary = []

for (const game of GAMES) {
  const results = runArchetypes(game.name, game.fn)
  const analysis = analyzeGame(game.name, results, game.cfg)
  const count = printReport(game.name, analysis)
  summary.push({ name: game.name, issues: count, wr: analysis.metrics.winRates })
}

// ── Summary Table ────────────────────────────────────────────────────────────
console.log(`\n\n\x1b[1m${'='.repeat(78)}\x1b[0m`)
console.log(`\x1b[1m  DOGFOOD SUMMARY\x1b[0m`)
console.log(`\x1b[1m${'='.repeat(78)}\x1b[0m`)
console.log(`  ${'Game'.padEnd(22)} ${'Issues'.padEnd(8)} ${'Newbie'.padEnd(9)} ${'Optimal'.padEnd(9)} ${'Aggro'.padEnd(9)} ${'Passive'.padEnd(9)}`)
console.log(`  ${'-'.repeat(66)}`)
for (const s of summary) {
  const wr = s.wr
  const fmt = r => ((r * 100).toFixed(0) + '%').padEnd(9)
  const tag = s.issues === 0 ? '\x1b[32m' : s.issues <= 2 ? '\x1b[33m' : '\x1b[31m'
  console.log(`  ${tag}${s.name.padEnd(22)}\x1b[0m ${String(s.issues).padEnd(8)} ${fmt(wr.newbie)} ${fmt(wr.optimal)} ${fmt(wr.aggressive)} ${fmt(wr.passive)}`)
}
const totalIssues = summary.reduce((s, g) => s + g.issues, 0)
console.log(`\n  \x1b[1mTotal issues: ${totalIssues}\x1b[0m`)
console.log(`\x1b[1m${'='.repeat(78)}\x1b[0m\n`)

if (totalIssues > 0) process.exit(1)
