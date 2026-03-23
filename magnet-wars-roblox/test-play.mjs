// Magnet Wars - Smoke Test
// Simulates: pole switching, magnetic forces, pulse knockback, arena shrink

const TITLE = 'Magnet Wars'
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
  MATCH_DURATION: 60,
  ARENA_RADIUS: 50,
  ARENA_SHRINK_INTERVAL: 20,
  ARENA_SHRINK_AMOUNT: 8,
  ELIMINATION_Y: -10,
  MAGNET_RANGE: 15,
  REPEL_FORCE: 800,
  ATTRACT_FORCE: 600,
  PULSE_COOLDOWN: 3,
  PULSE_RANGE: 20,
  PULSE_FORCE: 60,
}

function magnetForce(poleSelf, poleOther, dist) {
  if (dist > C.MAGNET_RANGE) return 0
  if (poleSelf === poleOther) return C.REPEL_FORCE   // same = repel
  return -C.ATTRACT_FORCE  // opposite = attract (negative = pull)
}

// --- Test 1: Same poles repel ---
{
  const force = magnetForce('N', 'N', 10)
  assert('Same poles repel', force === C.REPEL_FORCE && force > 0)
}

// --- Test 2: Opposite poles attract ---
{
  const force = magnetForce('N', 'S', 10)
  assert('Opposite poles attract', force === -C.ATTRACT_FORCE && force < 0)
}

// --- Test 3: No force beyond magnet range ---
{
  const force = magnetForce('N', 'N', 20)
  assert('No magnetic force beyond range', force === 0)
}

// --- Test 4: Pole switching works ---
{
  let pole = 'N'
  pole = pole === 'N' ? 'S' : 'N'
  assert('Pole switching toggles N/S', pole === 'S')
  pole = pole === 'N' ? 'S' : 'N'
  assert('Pole switches back', pole === 'N')
}

// --- Test 5: Arena shrinks over time ---
{
  let radius = C.ARENA_RADIUS
  const shrinkTimes = []
  for (let t = C.ARENA_SHRINK_INTERVAL; t <= C.MATCH_DURATION; t += C.ARENA_SHRINK_INTERVAL) {
    radius -= C.ARENA_SHRINK_AMOUNT
    shrinkTimes.push(t)
  }
  assert('Arena shrinks at correct intervals',
    shrinkTimes.length === 3 && radius === 50 - 8 * 3 && radius === 26)
}

// --- Test 6: Pulse knockback within range ---
{
  const targets = [
    { dist: 10, knocked: false },
    { dist: 19, knocked: false },
    { dist: 25, knocked: false },
  ]
  for (const t of targets) {
    if (t.dist <= C.PULSE_RANGE) {
      t.knocked = true
    }
  }
  assert('Pulse knockback applies within range',
    targets[0].knocked && targets[1].knocked && !targets[2].knocked)
}

// --- Test 7: Elimination below arena ---
{
  let posY = 5
  let eliminated = false
  for (let t = 0; t < 3; t += 0.1) {
    posY -= 5 * 0.1
    if (posY <= C.ELIMINATION_Y) {
      eliminated = true
      break
    }
  }
  assert('Elimination triggers below arena', eliminated)
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
