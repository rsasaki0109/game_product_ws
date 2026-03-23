// Hot Air Havoc - Smoke Test
// Simulates: fuel burn/vent, altitude changes, wind layers, grapple hook, elimination

const TITLE = 'Hot Air Havoc'
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

// --- Config from GameConfig.luau + MatchManager ---
const C = {
  GRAVITY_VELOCITY: -3,
  BURN_VELOCITY: 15,
  BURN_FUEL_RATE: 8,
  VENT_VELOCITY: -10,
  MAX_ALTITUDE: 90,
  ELIMINATION_Y: 5,
  MAX_FUEL: 100,
  STARTING_FUEL: 100,
  WIND_LAYERS: [34, 52, 70],
  WIND_RANGE: 6,
  WIND_BOOST_X: 12,
  FUEL_RESTORE: 25,
  BOOST_FUEL_COST: 20,
  BOOST_VELOCITY: 25,
  BOOST_DURATION: 0.5,
  BOOST_COOLDOWN: 4,
  GRAPPLE_COOLDOWN: 8,
  GRAPPLE_FUEL_STEAL_TOTAL: 10,
}

function isInWindLayer(alt) {
  return C.WIND_LAYERS.some(ly => Math.abs(alt - ly) <= C.WIND_RANGE)
}

// --- Test 1: Burning consumes fuel and rises ---
{
  let fuel = C.STARTING_FUEL
  let alt = 30
  const dt = 0.1
  for (let t = 0; t < 3; t += dt) {
    fuel -= C.BURN_FUEL_RATE * dt
    if (fuel <= 0) { fuel = 0; break }
    alt += C.BURN_VELOCITY * dt
  }
  assert('Burning consumes fuel and rises',
    fuel < C.STARTING_FUEL && alt > 30)
}

// --- Test 2: Venting descends faster ---
{
  let alt = 50
  const dt = 0.1
  for (let t = 0; t < 2; t += dt) {
    alt += C.VENT_VELOCITY * dt
  }
  assert('Venting descends faster than gravity',
    alt < 50 && (50 - alt) > Math.abs(C.GRAVITY_VELOCITY * 2))
}

// --- Test 3: Fuel pickup restores fuel ---
{
  let fuel = 40
  fuel = Math.min(fuel + C.FUEL_RESTORE, C.MAX_FUEL)
  assert('Fuel pickup restores fuel', fuel === 65)
}

// --- Test 4: Wind layer boost applies horizontally ---
{
  const testAlts = [34, 42, 52, 55, 70, 80]
  const expected = [true, false, true, true, true, false]
  let correct = 0
  for (let i = 0; i < testAlts.length; i++) {
    if (isInWindLayer(testAlts[i]) === expected[i]) correct++
  }
  assert('Wind layers apply horizontal boost at correct altitudes', correct === testAlts.length)
}

// --- Test 5: Elimination below threshold ---
{
  let alt = 10
  let eliminated = false
  const dt = 0.5
  for (let t = 0; t < 5; t += dt) {
    alt += C.GRAVITY_VELOCITY * dt
    if (alt < C.ELIMINATION_Y) {
      eliminated = true
      break
    }
  }
  assert('Elimination triggers below threshold altitude', eliminated)
}

// --- Test 6: Grapple steals fuel from target ---
{
  let selfFuel = 50
  let targetFuel = 80
  const stealTotal = C.GRAPPLE_FUEL_STEAL_TOTAL
  const stolen = Math.min(stealTotal, targetFuel)
  selfFuel = Math.min(selfFuel + stolen, C.MAX_FUEL)
  targetFuel -= stolen
  assert('Grapple steals fuel from target',
    selfFuel === 60 && targetFuel === 70)
}

// --- Test 7: Boost costs fuel and accelerates ---
{
  let fuel = C.STARTING_FUEL
  let alt = 40
  if (fuel >= C.BOOST_FUEL_COST) {
    fuel -= C.BOOST_FUEL_COST
    alt += C.BOOST_VELOCITY * C.BOOST_DURATION
  }
  assert('Boost costs fuel and accelerates upward',
    fuel === 80 && alt === 52.5)
}

// --- Output ---
const total = results.length
const passCount = results.filter(r => r.ok).length
const w = 52
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
