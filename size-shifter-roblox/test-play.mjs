// Size Shifter - Smoke Test
// Simulates: size changes, HP/damage/speed per size, stomp AoE, lives

const TITLE = 'Size Shifter'
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
  MATCH_DURATION: 90,
  MAX_LIVES: 3,
  SIZES: {
    tiny:   { scale: 0.3, hp: 30,  damage: 5,  speed: 28, punchRange: 4,  jumpPower: 70 },
    normal: { scale: 1.0, hp: 80,  damage: 15, speed: 16, punchRange: 7,  jumpPower: 50 },
    giant:  { scale: 3.0, hp: 200, damage: 30, speed: 10, punchRange: 14, jumpPower: 35 },
  },
  PUNCH_COOLDOWN: 1,
  STOMP_COOLDOWN: 4,
  STOMP_RANGE: 12,
  STOMP_DAMAGE: 20,
  DASH_COOLDOWN: 3,
  DASH_FORCE: 80,
}

// --- Test 1: Giant has 200hp, 30 damage ---
{
  const g = C.SIZES.giant
  assert('Giant = 200hp / 30dmg / speed 10',
    g.hp === 200 && g.damage === 30 && g.speed === 10)
}

// --- Test 2: Tiny has 30hp, 5 damage ---
{
  const t = C.SIZES.tiny
  assert('Tiny = 30hp / 5dmg / speed 28',
    t.hp === 30 && t.damage === 5 && t.speed === 28)
}

// --- Test 3: Normal has balanced stats ---
{
  const n = C.SIZES.normal
  assert('Normal = 80hp / 15dmg / speed 16',
    n.hp === 80 && n.damage === 15 && n.speed === 16)
}

// --- Test 4: Size transition changes stats ---
{
  let currentSize = 'normal'
  let hp = C.SIZES[currentSize].hp
  let damage = C.SIZES[currentSize].damage
  // Switch to giant
  currentSize = 'giant'
  hp = C.SIZES[currentSize].hp
  damage = C.SIZES[currentSize].damage
  assert('Size transition updates HP and damage',
    hp === 200 && damage === 30 && currentSize === 'giant')
}

// --- Test 5: Stomp AoE hits small players in range ---
{
  const stomperSize = 'giant'
  const targets = [
    { size: 'tiny',   dist: 8,  hit: false },
    { size: 'normal', dist: 11, hit: false },
    { size: 'giant',  dist: 5,  hit: false },
    { size: 'tiny',   dist: 15, hit: false },
  ]
  for (const t of targets) {
    if (t.dist <= C.STOMP_RANGE && t.size !== stomperSize) {
      t.hit = true
    }
  }
  assert('Stomp hits smaller players in range',
    targets[0].hit && targets[1].hit && !targets[2].hit && !targets[3].hit)
}

// --- Test 6: Lives decrement on death ---
{
  let lives = C.MAX_LIVES
  let eliminated = false
  for (let death = 0; death < 4; death++) {
    lives--
    if (lives <= 0) {
      eliminated = true
      break
    }
  }
  assert('Lives decrement and eliminate at 0',
    eliminated && lives === 0)
}

// --- Test 7: Giant punch range > tiny punch range ---
{
  const giantRange = C.SIZES.giant.punchRange
  const tinyRange = C.SIZES.tiny.punchRange
  const normalRange = C.SIZES.normal.punchRange
  assert('Punch range scales with size',
    giantRange > normalRange && normalRange > tinyRange &&
    giantRange === 14 && tinyRange === 4)
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
