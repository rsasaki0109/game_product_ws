/**
 * Couch Chaos - Smoke Test
 * Simulates platform race mini-game: player runs right + jumps obstacles, AI races
 */

const FINISH_LINE = 130
const GRAVITY = -20
const JUMP_FORCE = 14
const RUN_SPEED = 5

function generateCourse() {
  const coins = []
  for (let i = 0; i < 30; i++) {
    coins.push({ x: 8 + i * 4 + Math.random() * 2, y: 1 + Math.random() * 3, collected: false })
  }
  const obstacles = []
  for (let i = 0; i < 15; i++) {
    obstacles.push({ x: 12 + i * 8 + Math.random() * 3, y: 0, width: 0.8, height: 0.8 + Math.random() * 0.5 })
  }
  return { coins, obstacles }
}

function tickPlayer(px, py, vy, onGround, moveRight, jump, stunned, delta) {
  if (stunned) return { x: px, y: py, vy, onGround }
  let dx = moveRight ? RUN_SPEED * delta : 0
  let newX = Math.max(0, px + dx)
  let newVy = vy + GRAVITY * delta
  let newY = py + newVy * delta
  let newOnGround = false
  if (newY <= 0) { newY = 0; newVy = 0; newOnGround = true }
  if (jump && onGround) { newVy = JUMP_FORCE; newOnGround = false }
  return { x: newX, y: newY, vy: newVy, onGround: newOnGround }
}

function checkCollision(px, py, obstacles) {
  for (const obs of obstacles) {
    if (px > obs.x - 0.4 && px < obs.x + obs.width + 0.4 && py < obs.y + obs.height && py >= obs.y) return true
  }
  return false
}

function checkCoins(px, py, coins) {
  let collected = 0
  for (const c of coins) {
    if (!c.collected && Math.abs(c.x - px) < 1 && Math.abs(c.y - py) < 1) { c.collected = true; collected++ }
  }
  return collected
}

function runOneRace() {
  const course = generateCourse()
  const DT = 0.05, MAX_TIME = 60

  // Player state
  let px = 0, py = 0, pvy = 0, pOnGround = true, pCoins = 0, pFinished = false, pTime = MAX_TIME
  // AI state
  let ax = 0, ay = 0, avy = 0, aOnGround = true, aCoins = 0, aFinished = false, aTime = MAX_TIME
  // AI has slightly variable speed
  const aiSpeedMult = 0.85 + Math.random() * 0.3

  let elapsed = 0

  for (let t = 0; t < MAX_TIME / DT; t++) {
    elapsed = t * DT

    if (!pFinished) {
      // Player strategy: always run right, jump when obstacle ahead
      const nearObs = course.obstacles.find(o => o.x > px && o.x - px < 2.5)
      const shouldJump = nearObs != null
      const res = tickPlayer(px, py, pvy, pOnGround, true, shouldJump, false, DT)
      px = res.x; py = res.y; pvy = res.vy; pOnGround = res.onGround

      // Collision stun (briefly stop)
      if (pOnGround && checkCollision(px, py, course.obstacles)) {
        px = Math.max(0, px - RUN_SPEED * DT) // bounce back
      }

      pCoins += checkCoins(px, py, course.coins)
      if (px >= FINISH_LINE) { pFinished = true; pTime = elapsed }
    }

    if (!aFinished) {
      // AI: run right at variable speed, jump obstacles with slight delay
      const aiNearObs = course.obstacles.find(o => o.x > ax && o.x - ax < 2.0)
      const aiJump = aiNearObs != null && Math.random() > 0.15 // 85% jump success
      const aRes = tickPlayer(ax, ay, avy, aOnGround, true, aiJump, false, DT)
      ax = aRes.x * aiSpeedMult + ax * (1 - aiSpeedMult) // blend for speed variation
      ax = Math.max(ax, ax + (aRes.x - ax) * aiSpeedMult)
      // Simplify: just use aRes with speed factor
      ax = aRes.x * (0.5 + aiSpeedMult * 0.5)
      ay = aRes.y; avy = aRes.vy; aOnGround = aRes.onGround

      if (ax >= FINISH_LINE) { aFinished = true; aTime = elapsed }
    }

    if (pFinished && aFinished) break
  }

  const playerWon = pTime <= aTime
  return { playerWon, pTime: pFinished ? pTime : MAX_TIME, aTime: aFinished ? aTime : MAX_TIME, pCoins }
}

// --- Run tests ---
const RUNS = 20
const results = []
for (let i = 0; i < RUNS; i++) results.push(runOneRace())

const winRate = results.filter(r => r.playerWon).length / RUNS
const avgTime = results.reduce((s, r) => s + r.pTime, 0) / RUNS
const avgCoins = results.reduce((s, r) => s + r.pCoins, 0) / RUNS
const racesFinish = results.filter(r => r.pTime < 60).length
const positiveScores = results.filter(r => r.pCoins > 0).length

const pass = racesFinish >= RUNS * 0.5 && positiveScores >= RUNS * 0.5

console.log(`\x1b[32m`)
console.log(`+===============================+`)
console.log(`|  COUCH CHAOS - Test Results    |`)
console.log(`+===============================+`)
console.log(`|  Runs: ${RUNS}                     |`)
console.log(`|  Win Rate: ${(winRate * 100).toFixed(0)}%${' '.repeat(Math.max(0, 17 - (winRate * 100).toFixed(0).length))}|`)
console.log(`|  Avg Finish Time: ${avgTime.toFixed(1)}s${' '.repeat(Math.max(0, 10 - avgTime.toFixed(1).length))}|`)
console.log(`|  Avg Coins: ${avgCoins.toFixed(1).padEnd(18)}|`)
console.log(`|  Races Finished: ${racesFinish}/${RUNS}         |`)
console.log(`|  Status: ${pass ? '\x1b[32mPASS' : '\x1b[31mFAIL\x1b[32m'}               |`)
console.log(`+===============================+`)
console.log(`\x1b[0m`)

if (!pass) process.exit(1)
