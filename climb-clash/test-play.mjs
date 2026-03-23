/**
 * Climb Clash - Smoke Test
 * Simulates wall climbing: player moves up optimally, AI competes
 */

const WALL_WIDTH = 5
const WALL_HEIGHT = 30

function randomHoldType() {
  const r = Math.random()
  if (r < 0.7) return 'normal'
  if (r < 0.9) return 'fragile'
  return 'recovery'
}

function generateWall() {
  const holds = []
  const occupied = new Set()
  for (let y = 0; y < WALL_HEIGHT; y++) {
    const count = 2 + Math.floor(Math.random() * 3)
    const xs = [0, 1, 2, 3, 4]
    for (let i = xs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[xs[i], xs[j]] = [xs[j], xs[i]]
    }
    for (let i = 0; i < count; i++) {
      const key = `${xs[i]},${y}`
      if (!occupied.has(key)) {
        occupied.add(key)
        holds.push({ x: xs[i], y, type: randomHoldType(), destroyed: false })
      }
    }
  }
  // Ensure reachability
  for (let y = 0; y < WALL_HEIGHT; y += 2) {
    const has = holds.some(h => (h.y === y || h.y === y + 1) && !h.destroyed)
    if (!has) holds.push({ x: Math.floor(Math.random() * WALL_WIDTH), y, type: 'normal', destroyed: false })
  }
  return holds
}

function findReachable(holds, pos) {
  return holds.filter(h => {
    if (h.destroyed) return false
    const dx = Math.abs(h.x - pos[0])
    const dy = h.y - pos[1]
    return dx <= 2 && dy <= 2 && dy >= -1
  })
}

function climbOptimal(holds, pos) {
  const reachable = findReachable(holds, pos)
  if (reachable.length === 0) return null
  // Prefer highest y, then recovery type
  reachable.sort((a, b) => {
    if (b.y !== a.y) return b.y - a.y
    if (a.type === 'recovery') return -1
    if (b.type === 'recovery') return 1
    return 0
  })
  return reachable[0]
}

function runOneGame() {
  const playerWall = generateWall()
  const aiWall = generateWall()

  let player = { pos: [2, 0], stamina: 100, height: 0, moves: 0 }
  let ai = { pos: [2, 0], stamina: 100, height: 0, moves: 0 }
  const MAX_MOVES = 200

  for (let m = 0; m < MAX_MOVES; m++) {
    // Player move
    if (player.stamina > 0 && player.height < WALL_HEIGHT - 1) {
      const target = climbOptimal(playerWall, player.pos)
      if (target) {
        player.pos = [target.x, target.y]
        player.stamina -= 2
        player.moves++
        if (target.type === 'recovery') player.stamina = Math.min(100, player.stamina + 15)
        if (target.y > player.height) player.height = target.y
        // Fragile hold may break
        if (target.type === 'fragile' && Math.random() < 0.5) {
          target.destroyed = true
        }
      } else {
        // Fall
        player.pos[1] = Math.max(0, player.pos[1] - 5)
        player.stamina -= 20
      }
    }

    // AI move (slightly worse)
    if (ai.stamina > 0 && ai.height < WALL_HEIGHT - 1) {
      const reachable = findReachable(aiWall, ai.pos)
      if (reachable.length > 0) {
        // AI picks randomly from top 3
        reachable.sort((a, b) => b.y - a.y)
        const pick = reachable[Math.min(Math.floor(Math.random() * 3), reachable.length - 1)]
        ai.pos = [pick.x, pick.y]
        ai.stamina -= 2
        ai.moves++
        if (pick.type === 'recovery') ai.stamina = Math.min(100, ai.stamina + 15)
        if (pick.y > ai.height) ai.height = pick.y
        if (pick.type === 'fragile' && Math.random() < 0.5) pick.destroyed = true
      } else {
        ai.pos[1] = Math.max(0, ai.pos[1] - 5)
        ai.stamina -= 20
      }
    }

    // Energy regen
    player.stamina = Math.min(100, player.stamina + 0.5)
    ai.stamina = Math.min(100, ai.stamina + 0.5)

    if (player.height >= WALL_HEIGHT - 1 && ai.height >= WALL_HEIGHT - 1) break
    if (player.height >= WALL_HEIGHT - 1 || ai.height >= WALL_HEIGHT - 1) {
      // Give a few more turns for the other
      if (m > MAX_MOVES - 10) break
    }
  }

  const playerWon = player.height >= ai.height
  return {
    playerWon,
    playerHeight: player.height,
    aiHeight: ai.height,
    playerStamina: player.stamina,
    moves: player.moves,
    reachedTop: player.height >= WALL_HEIGHT - 1,
  }
}

// --- Run tests ---
const RUNS = 20
const results = []
for (let i = 0; i < RUNS; i++) results.push(runOneGame())

const winRate = results.filter(r => r.playerWon).length / RUNS
const avgHeight = results.reduce((s, r) => s + r.playerHeight, 0) / RUNS
const avgMoves = results.reduce((s, r) => s + r.moves, 0) / RUNS
const reachedTop = results.filter(r => r.reachedTop).length
const staminaWorks = results.every(r => r.playerStamina >= 0 && r.playerStamina <= 100)

const pass = reachedTop >= RUNS * 0.3 && staminaWorks && avgHeight > 10

console.log(`\x1b[33m`)
console.log(`+===============================+`)
console.log(`|  CLIMB CLASH - Test Results    |`)
console.log(`+===============================+`)
console.log(`|  Runs: ${RUNS}                     |`)
console.log(`|  Win Rate: ${(winRate * 100).toFixed(0)}%${' '.repeat(Math.max(0, 17 - (winRate * 100).toFixed(0).length))}|`)
console.log(`|  Avg Height: ${avgHeight.toFixed(1).padEnd(17)}|`)
console.log(`|  Avg Moves: ${avgMoves.toFixed(0).padEnd(18)}|`)
console.log(`|  Reached Top: ${reachedTop}/${RUNS}           |`)
console.log(`|  Stamina Valid: ${staminaWorks ? 'YES' : 'NO'}            |`)
console.log(`|  Status: ${pass ? '\x1b[32mPASS\x1b[33m' : '\x1b[31mFAIL\x1b[33m'}               |`)
console.log(`+===============================+`)
console.log(`\x1b[0m`)

if (!pass) process.exit(1)
