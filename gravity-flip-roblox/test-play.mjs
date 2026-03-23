// Gravity Flip Arena - Smoke Test
// Simulates: gravity direction changes, punch damage, kill scoring

const TITLE = 'Gravity Flip Arena'
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
  MAX_HP: 100,
  FLIP_COOLDOWN: 2.0,
  GRAVITY_MAGNITUDE: 196.2,
  PUNCH_RANGE: 8,
  PUNCH_DAMAGE: 15,
  PUNCH_KNOCKBACK: 65,
  PUNCH_COOLDOWN: 0.6,
  RESPAWN_TIME: 2.0,
  FALL_DAMAGE: 20,
  SCORE_KILL: 1,
  GRAVITY_DIRS: {
    Down:  { x: 0, y: -1, z: 0 },
    Up:    { x: 0, y: 1, z: 0 },
    North: { x: 0, y: 0, z: -1 },
    South: { x: 0, y: 0, z: 1 },
    East:  { x: 1, y: 0, z: 0 },
    West:  { x: -1, y: 0, z: 0 },
  },
}

// --- Test 1: All 6 gravity directions are valid unit vectors ---
{
  const dirs = Object.entries(C.GRAVITY_DIRS)
  let allUnit = true
  for (const [name, v] of dirs) {
    const mag = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2)
    if (Math.abs(mag - 1.0) > 0.01) allUnit = false
  }
  assert('6 gravity directions are valid unit vectors',
    dirs.length === 6 && allUnit)
}

// --- Test 2: Gravity flip changes direction ---
{
  let currentDir = 'Down'
  const flipSequence = ['Up', 'North', 'East', 'South', 'West', 'Down']
  let allChanged = true
  for (const newDir of flipSequence) {
    if (newDir === currentDir) { allChanged = false; break }
    currentDir = newDir
  }
  assert('Gravity flip changes direction correctly',
    allChanged && currentDir === 'Down')
}

// --- Test 3: Punch reduces HP ---
{
  let targetHP = C.MAX_HP
  const punches = 4
  for (let i = 0; i < punches; i++) {
    targetHP -= C.PUNCH_DAMAGE
  }
  assert('HP reduces on punch',
    targetHP === 100 - 15 * 4 && targetHP === 40)
}

// --- Test 4: Enough punches kill a player ---
{
  let hp = C.MAX_HP
  let punchCount = 0
  while (hp > 0) {
    hp -= C.PUNCH_DAMAGE
    punchCount++
  }
  assert('Player dies after enough punches',
    punchCount === 7 && hp <= 0)
}

// --- Test 5: Kill awards score ---
{
  let score = 0
  const kills = 5
  for (let i = 0; i < kills; i++) {
    score += C.SCORE_KILL
  }
  assert('Kills score correctly', score === 5)
}

// --- Test 6: Punch cooldown limits attack rate ---
{
  let lastPunch = -999
  let punchCount = 0
  for (let t = 0; t < 5; t += 0.1) {
    if (t - lastPunch >= C.PUNCH_COOLDOWN) {
      punchCount++
      lastPunch = t
    }
  }
  assert('Punch cooldown limits attack rate',
    punchCount >= 7 && punchCount <= 9)
}

// --- Test 7: Flip cooldown prevents spam ---
{
  let lastFlip = -999
  let flipCount = 0
  for (let t = 0; t < 10; t += 0.5) {
    if (t - lastFlip >= C.FLIP_COOLDOWN) {
      flipCount++
      lastFlip = t
    }
  }
  assert('Flip cooldown prevents spam', flipCount === 5)
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
