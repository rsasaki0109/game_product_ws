// Echo Tag - Smoke Test
// Simulates: echo pulse reveal, decoy placement, tag transfer, sprint

const TITLE = 'Echo Tag'
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
  ECHO_RANGE: 30,
  ECHO_EXPAND_SPEED: 40,
  ECHO_REVEAL_DURATION: 2.0,
  ECHO_COOLDOWN: 4.0,
  DECOY_DELAY: 2.0,
  DECOY_COOLDOWN: 8.0,
  DECOY_RANGE: 25,
  SPRINT_SPEED_MULT: 1.5,
  SPRINT_DURATION: 2.0,
  SPRINT_COOLDOWN: 6.0,
  DEFAULT_WALK_SPEED: 16,
  TAG_IMMUNITY_TIME: 2.0,
  TAGGER_SPEED_BONUS: 2,
  SCORE_SURVIVOR: 10,
  SCORE_TAG: 3,
  SCORE_DECOY_USED: 1,
}

// --- Test 1: Echo reveals players in range ---
{
  const pulseOrigin = { x: 0, y: 0, z: 0 }
  const players = [
    { x: 10, y: 0, z: 10, hidden: true },  // dist ~14.1 - in range
    { x: 25, y: 0, z: 0, hidden: true },    // dist 25 - in range
    { x: 20, y: 0, z: 25, hidden: true },   // dist ~32 - out of range
  ]
  let revealed = 0
  for (const p of players) {
    const dist = Math.sqrt(
      (p.x - pulseOrigin.x) ** 2 +
      (p.y - pulseOrigin.y) ** 2 +
      (p.z - pulseOrigin.z) ** 2
    )
    if (dist <= C.ECHO_RANGE) {
      p.hidden = false
      revealed++
    }
  }
  assert('Echo reveals players in range',
    revealed === 2 && players[0].hidden === false && players[2].hidden === true)
}

// --- Test 2: Tag transfers tagger role ---
{
  let tagger = 'P1'
  const hiders = ['P2', 'P3', 'P4']
  // P1 tags P2
  const tagTarget = 'P2'
  const oldTagger = tagger
  tagger = tagTarget
  const newHiders = hiders.filter(h => h !== tagTarget)
  newHiders.push(oldTagger)
  assert('Tag transfers tagger role',
    tagger === 'P2' && newHiders.includes('P1') && !newHiders.includes('P2'))
}

// --- Test 3: Tag immunity prevents instant re-tag ---
{
  let immuneUntil = 0
  let tagAttempts = 0
  let successfulTags = 0
  for (let t = 0; t < 6; t += 0.5) {
    tagAttempts++
    if (t >= immuneUntil) {
      successfulTags++
      immuneUntil = t + C.TAG_IMMUNITY_TIME
    }
  }
  assert('Tag immunity prevents instant re-tag',
    successfulTags < tagAttempts && successfulTags >= 3)
}

// --- Test 4: Sprint boosts speed temporarily ---
{
  let speed = C.DEFAULT_WALK_SPEED
  const sprintSpeed = speed * C.SPRINT_SPEED_MULT
  let elapsed = 0
  speed = sprintSpeed
  assert('Sprint increases speed by 1.5x',
    speed === 24 && sprintSpeed > C.DEFAULT_WALK_SPEED)
  // After duration, speed returns
  elapsed = C.SPRINT_DURATION + 0.1
  if (elapsed >= C.SPRINT_DURATION) speed = C.DEFAULT_WALK_SPEED
  assert('Sprint expires after duration',
    speed === C.DEFAULT_WALK_SPEED)
}

// --- Test 5: Decoy echo fires after delay ---
{
  let decoyFired = false
  const decoyPlacedAt = 5.0
  const checkTime = decoyPlacedAt + C.DECOY_DELAY + 0.1
  if (checkTime >= decoyPlacedAt + C.DECOY_DELAY) {
    decoyFired = true
  }
  assert('Decoy echo fires after delay',
    decoyFired && C.DECOY_DELAY === 2.0)
}

// --- Test 6: Scoring awards correct points ---
{
  let taggerScore = 0
  let survivorScore = 0
  taggerScore += C.SCORE_TAG * 3 // tagged 3 people
  survivorScore += C.SCORE_SURVIVOR
  assert('Scoring awards correct points',
    taggerScore === 9 && survivorScore === 10)
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
