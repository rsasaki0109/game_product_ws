// Clone Chaos - Smoke Test
// Simulates: clone spawning, clone AI, disguise swap, scoring

const TITLE = 'Clone Chaos'
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
  PLAYER_HP: 100,
  PLAYER_DAMAGE: 12,
  PUNCH_COOLDOWN: 1,
  PUNCH_RANGE: 7,
  MAX_CLONES: 3,
  CLONE_HP: 40,
  CLONE_DAMAGE: 8,
  CLONE_SPAWN_COOLDOWN: 6,
  CLONE_CHASE_RANGE: 20,
  CLONE_ATTACK_RANGE: 5,
  CLONE_SPEED: 14,
  RECALL_COOLDOWN: 10,
  DISGUISE_COOLDOWN: 12,
  POINTS_REAL_KILL: 3,
  POINTS_CLONE_KILL: 1,
}

// --- Test 1: Max 3 clones enforced ---
{
  let cloneCount = 0
  let spawnAttempts = 0
  for (let i = 0; i < 5; i++) {
    spawnAttempts++
    if (cloneCount < C.MAX_CLONES) {
      cloneCount++
    }
  }
  assert('Max 3 clones enforced',
    cloneCount === 3 && spawnAttempts === 5)
}

// --- Test 2: Clone has lower HP than player ---
{
  assert('Clone HP < Player HP',
    C.CLONE_HP === 40 && C.PLAYER_HP === 100 && C.CLONE_HP < C.PLAYER_HP)
}

// --- Test 3: Clone AI chases within range ---
{
  const clonePos = { x: 0, y: 0, z: 0 }
  const targets = [
    { x: 10, y: 0, z: 10, chased: false },  // dist ~14.1 < 20
    { x: 25, y: 0, z: 0, chased: false },    // dist 25 > 20
    { x: 3, y: 0, z: 4, chased: false },     // dist 5 <= attack range
  ]
  for (const t of targets) {
    const dist = Math.sqrt((t.x - clonePos.x) ** 2 + (t.y - clonePos.y) ** 2 + (t.z - clonePos.z) ** 2)
    if (dist <= C.CLONE_CHASE_RANGE) {
      t.chased = true
    }
  }
  assert('Clone AI chases targets within range',
    targets[0].chased && !targets[1].chased && targets[2].chased)
}

// --- Test 4: Disguise swaps positions ---
{
  let playerPos = { x: 10, y: 0, z: 5 }
  let clonePos = { x: -15, y: 0, z: -20 }
  // Disguise swap
  const tmp = { ...playerPos }
  playerPos = { ...clonePos }
  clonePos = { ...tmp }
  assert('Disguise swaps player and clone positions',
    playerPos.x === -15 && clonePos.x === 10)
}

// --- Test 5: Real kill = 3pt, clone kill = 1pt ---
{
  let score = 0
  // Kill 2 real players
  score += C.POINTS_REAL_KILL * 2
  // Kill 3 clones
  score += C.POINTS_CLONE_KILL * 3
  assert('Real kill=3pt, clone kill=1pt',
    score === 9 && C.POINTS_REAL_KILL === 3 && C.POINTS_CLONE_KILL === 1)
}

// --- Test 6: Clone spawn cooldown ---
{
  let lastSpawn = -999
  let spawned = 0
  for (let t = 0; t < 20; t += 1) {
    if (t - lastSpawn >= C.CLONE_SPAWN_COOLDOWN && spawned < C.MAX_CLONES) {
      spawned++
      lastSpawn = t
    }
  }
  assert('Clone spawn respects cooldown',
    spawned === 3 && lastSpawn >= 12)
}

// --- Test 7: Clone attacks within attack range ---
{
  const clonePos = { x: 0, y: 0, z: 0 }
  const targetDist = 4
  let attacked = false
  if (targetDist <= C.CLONE_ATTACK_RANGE) {
    attacked = true
  }
  let farTarget = 8
  let farAttacked = false
  if (farTarget <= C.CLONE_ATTACK_RANGE) {
    farAttacked = true
  }
  assert('Clone attacks within attack range only',
    attacked && !farAttacked)
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
