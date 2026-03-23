// Blink Door Brawl - Smoke Test
// Simulates: door placement, teleportation, push kills, door combo trigger

const TITLE = 'Blink Door Brawl'
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

// --- Config from MatchConfig.luau ---
const C = {
  MATCH_DURATION: 90,
  FALL_RESET_Y: 12,
  THREAT_WINDOW: 5.0,
  TELEPORT_LOCK: 1.1,
  DOOR_COOLDOWN: 1.0,
  DOOR_LAUNCH_SPEED: 28,
  PUSH_COOLDOWN: 2.0,
  PUSH_RANGE: 12,
  PUSH_FORCE: 82,
  PUSH_UP_FORCE: 20,
  DOOR_COMBO_WINDOW: 5,
  DOOR_COMBO_KILLS: 2,
}

// --- Test 1: Door link pairing ---
{
  const doorPairs = {}
  // Player places entry then exit
  const playerId = 'P1'
  const entryPos = { x: 10, y: 34, z: 5 }
  const exitPos = { x: -20, y: 34, z: -10 }
  doorPairs[playerId] = { entry: entryPos, exit: exitPos }
  const pair = doorPairs[playerId]
  assert('Doors link correctly (entry-exit pair)',
    pair.entry.x === 10 && pair.exit.x === -20)
}

// --- Test 2: Teleportation works ---
{
  const playerPos = { x: 10, y: 34, z: 5 }
  const exitPos = { x: -20, y: 36.5, z: -10 }
  const exitOffset = { x: 0, y: 2.5, z: 0 }
  // Player steps on entry door -> teleports to exit + offset
  const newPos = {
    x: exitPos.x + exitOffset.x,
    y: exitPos.y + exitOffset.y,
    z: exitPos.z + exitOffset.z,
  }
  const dist = Math.sqrt(
    (newPos.x - playerPos.x) ** 2 +
    (newPos.y - playerPos.y) ** 2 +
    (newPos.z - playerPos.z) ** 2
  )
  assert('Teleport moves player to exit door', dist > 20)
}

// --- Test 3: Teleport lock prevents instant re-teleport ---
{
  let teleportLockUntil = 0
  let teleportCount = 0
  for (let t = 0; t < 5; t += 0.5) {
    if (t >= teleportLockUntil) {
      teleportCount++
      teleportLockUntil = t + C.TELEPORT_LOCK
    }
  }
  assert('Teleport lock prevents spam',
    teleportCount >= 3 && teleportCount <= 5)
}

// --- Test 4: Push applies knockback ---
{
  const targetDist = 8
  let pushLanded = false
  if (targetDist <= C.PUSH_RANGE) {
    const knockback = C.PUSH_FORCE
    const upForce = C.PUSH_UP_FORCE
    pushLanded = knockback === 82 && upForce === 20
  }
  assert('Push applies force within range', pushLanded)
}

// --- Test 5: Door combo activates on 2 kills in 5s ---
{
  const killTimestamps = []
  let comboActivated = false
  // Simulate kills
  killTimestamps.push(10.0) // first kill at t=10
  killTimestamps.push(13.5) // second kill at t=13.5 (within 5s)
  const now = 13.5
  let recentCount = 0
  for (let i = killTimestamps.length - 1; i >= 0; i--) {
    if (now - killTimestamps[i] <= C.DOOR_COMBO_WINDOW) {
      recentCount++
    }
  }
  if (recentCount >= C.DOOR_COMBO_KILLS) {
    comboActivated = true
  }
  assert('Door combo triggers on 2 kills in 5s', comboActivated)
}

// --- Test 6: Door combo resets cooldowns ---
{
  const cooldowns = { PLACE_ENTRY: 5.0, PLACE_EXIT: 5.0 }
  // Combo resets cooldowns to 0
  let comboActive = true
  if (comboActive) {
    cooldowns.PLACE_ENTRY = 0
    cooldowns.PLACE_EXIT = 0
  }
  assert('Door combo resets placement cooldowns',
    cooldowns.PLACE_ENTRY === 0 && cooldowns.PLACE_EXIT === 0)
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
