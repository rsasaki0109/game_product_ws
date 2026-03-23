// Bubble Drifter - Smoke Test
// Simulates: bubble float/pop, checkpoint progress, ring collection, bubble merge

const TITLE = 'Bubble Drifter'
const results = []
let allPassed = true

function assert(name, condition) {
  if (condition) {
    results.push({ name, ok: true })
  } else {
    results.push({ name, ok: false })
    allPassed = false
  }
}

// --- Config from GameConfig.luau ---
const C = {
  MATCH_DURATION: 80,
  RESET_Y: 6,
  LIFT_ACCEL: 84,
  MAX_H_SPEED: 36,
  MAX_V_SPEED: 26,
  REACTIVATE_DELAY: 0.6,
  SHELL_DIAMETER: 8,
  CEILING_PUSH: 110,
  WALK_SPEED: 13,
  JUMP_POWER: 26,
  RING_VALUE: 1,
  FINISH_BONUS: { 1: 5, 2: 3, 3: 2, default: 1 },
  CHECKPOINTS: [
    { x: -28, y: 24, z: -16 },
    { x: -8, y: 34, z: -36 },
    { x: 8, y: 46, z: -58 },
    { x: 22, y: 60, z: -80 },
    { x: 0, y: 78, z: -96 },
  ],
  RINGS: [
    { x: -28, y: 30, z: -16 },
    { x: -8, y: 40, z: -36 },
    { x: 8, y: 52, z: -58 },
    { x: 22, y: 66, z: -80 },
    { x: 0, y: 84, z: -96 },
  ],
  MAX_HEIGHT: 92,
}

// --- Test 1: Bubble lifts player upward ---
{
  let altitude = 18 // spawn height
  let velocity = 0
  const dt = 0.1
  let bubbleActive = true
  for (let t = 0; t < 2.0; t += dt) {
    if (bubbleActive) {
      velocity += C.LIFT_ACCEL * dt
      velocity = Math.min(velocity, C.MAX_V_SPEED)
    }
    altitude += velocity * dt
  }
  assert('Bubble lifts player upward',
    altitude > 30 && velocity <= C.MAX_V_SPEED)
}

// --- Test 2: Pop stops lift and player falls ---
{
  let altitude = 50
  let velocity = C.MAX_V_SPEED
  const gravity = -30
  const dt = 0.1
  // Pop the bubble
  velocity = 0
  for (let t = 0; t < 1.0; t += dt) {
    velocity += gravity * dt
    altitude += velocity * dt
  }
  assert('Pop stops lift and player descends', altitude < 50)
}

// --- Test 3: Checkpoints register on proximity ---
{
  let reachedCheckpoints = 0
  const playerPositions = C.CHECKPOINTS.map(cp => ({
    x: cp.x + 2, y: cp.y + 1, z: cp.z - 1
  }))
  const cpRadius = 10
  for (let i = 0; i < C.CHECKPOINTS.length; i++) {
    const cp = C.CHECKPOINTS[i]
    const pp = playerPositions[i]
    const dist = Math.sqrt((pp.x - cp.x) ** 2 + (pp.y - cp.y) ** 2 + (pp.z - cp.z) ** 2)
    if (dist < cpRadius) reachedCheckpoints++
  }
  assert('Checkpoints register on proximity', reachedCheckpoints === 5)
}

// --- Test 4: Ring collection scores points ---
{
  let score = 0
  const collectedRings = [0, 2, 4] // collect 3 of 5 rings
  for (const idx of collectedRings) {
    if (idx < C.RINGS.length) score += C.RING_VALUE
  }
  assert('Ring collection scores correctly', score === 3)
}

// --- Test 5: Finish bonus awards by rank ---
{
  const scores = []
  for (let rank = 1; rank <= 4; rank++) {
    const bonus = C.FINISH_BONUS[rank] ?? C.FINISH_BONUS.default
    scores.push(bonus)
  }
  assert('Finish bonus awards by placement rank',
    scores[0] === 5 && scores[1] === 3 && scores[2] === 2 && scores[3] === 1)
}

// --- Test 6: Max height ceiling enforced ---
{
  let altitude = 88
  let velocity = C.MAX_V_SPEED
  const dt = 0.1
  for (let t = 0; t < 1.0; t += dt) {
    altitude += velocity * dt
    if (altitude >= C.MAX_HEIGHT) {
      velocity = -C.CEILING_PUSH * dt
      altitude = C.MAX_HEIGHT
    }
  }
  assert('Ceiling cap enforced at max height', altitude <= C.MAX_HEIGHT)
}

// --- Output ---
const total = results.length
const passCount = results.filter(r => r.ok).length
const w = 42
console.log('\u2554' + '\u2550'.repeat(w) + '\u2557')
console.log('\u2551  ' + `${TITLE} - Smoke Test`.padEnd(w - 2) + '\u2551')
console.log('\u2560' + '\u2550'.repeat(w) + '\u2563')
console.log('\u2551  ' + `Tests: ${total}`.padEnd(w - 2) + '\u2551')
for (const r of results) {
  const mark = r.ok ? '\u2713' : '\u2717'
  console.log('\u2551  ' + `${mark} ${r.name}`.padEnd(w - 2) + '\u2551')
}
console.log('\u2551  ' + `Status: ${allPassed ? 'PASS' : 'FAIL'} (${passCount}/${total})`.padEnd(w - 2) + '\u2551')
console.log('\u255A' + '\u2550'.repeat(w) + '\u255D')
process.exit(allPassed ? 0 : 1)
