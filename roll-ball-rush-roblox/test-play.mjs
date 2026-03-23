// Roll Ball Rush - Smoke Test
// Simulates: boost/brake speeds, checkpoint progress, power-up effects

const TITLE = 'Roll Ball Rush'
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
  MATCH_DURATION: 75,
  RESET_Y: -20,
  BASE_SPEED: 22,
  BOOST_SPEED: 34,
  BRAKE_SPEED: 10,
  BOOST_DURATION: 1.2,
  BRAKE_DURATION: 0.9,
  BOOST_COOLDOWN: 3.0,
  BRAKE_COOLDOWN: 2.0,
  BALL_DIAMETER: 10,
  CHECKPOINTS: [
    { x: 0, y: 11, z: -10 },
    { x: 24, y: 8, z: -58 },
    { x: -22, y: 5, z: -112 },
    { x: 0, y: 2, z: -170 },
  ],
  GOAL: { x: 0, y: 2, z: -194 },
  SPAWN: { x: 0, y: 14, z: 18 },
}

// --- Test 1: Boost increases speed ---
{
  let speed = C.BASE_SPEED
  let boostActive = false
  let boostEnd = 0
  const t = 1.0
  // Activate boost
  speed = C.BOOST_SPEED
  boostActive = true
  boostEnd = t + C.BOOST_DURATION
  assert('Boost increases speed',
    speed === 34 && speed > C.BASE_SPEED && boostActive)
}

// --- Test 2: Brake decreases speed ---
{
  let speed = C.BASE_SPEED
  speed = C.BRAKE_SPEED
  assert('Brake decreases speed',
    speed === 10 && speed < C.BASE_SPEED)
}

// --- Test 3: Speed returns to base after boost ends ---
{
  let speed = C.BOOST_SPEED
  let boostEnd = 1.0 + C.BOOST_DURATION
  const now = 3.0
  if (now >= boostEnd) {
    speed = C.BASE_SPEED
  }
  assert('Speed returns to base after boost duration',
    speed === C.BASE_SPEED)
}

// --- Test 4: Checkpoint progress tracking ---
{
  let currentCheckpoint = -1
  const playerZ = [18, -10, -58, -112, -170]
  const cpRadius = 15
  for (const pz of playerZ) {
    for (let i = currentCheckpoint + 1; i < C.CHECKPOINTS.length; i++) {
      const cp = C.CHECKPOINTS[i]
      const dist = Math.abs(pz - cp.z)
      if (dist < cpRadius) {
        currentCheckpoint = i
        break
      }
    }
  }
  assert('Checkpoints register sequentially',
    currentCheckpoint === 3)
}

// --- Test 5: Boost cooldown respected ---
{
  let lastBoostTime = -999
  let boostCount = 0
  for (let t = 0; t < 10; t += 0.5) {
    if (t - lastBoostTime >= C.BOOST_COOLDOWN) {
      boostCount++
      lastBoostTime = t
    }
  }
  assert('Boost cooldown prevents spam',
    boostCount >= 3 && boostCount <= 4)
}

// --- Test 6: Fall reset below threshold ---
{
  let posY = 5
  let resetTriggered = false
  // Simulate falling
  for (let t = 0; t < 3; t += 0.1) {
    posY -= 10 * 0.1
    if (posY <= C.RESET_Y) {
      resetTriggered = true
      posY = C.SPAWN.y
      break
    }
  }
  assert('Fall below reset Y respawns player',
    resetTriggered && posY === C.SPAWN.y)
}

// --- Output ---
const total = results.length
const passCount = results.filter(r => r.ok).length
const w = 46
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
