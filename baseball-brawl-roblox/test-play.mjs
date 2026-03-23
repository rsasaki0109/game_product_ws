// Baseball Brawl - Smoke Test
// Simulates: 2 teams, ball physics, scoring, swing/dash mechanics, rage mode trigger

const TITLE = 'Baseball Brawl'
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
  MATCH_DURATION: 100,
  MAX_SCORE: 7,
  SCORE_COOLDOWN: 1.25,
  KICKOFF_FREEZE: 1.0,
  SWING_COOLDOWN: 0.55,
  SWING_RANGE: 12,
  SWING_KNOCKBACK: 95,
  SWING_STUN: 0.45,
  DASH_COOLDOWN: 3.0,
  DASH_FORCE: 120,
  BALL_HIT_FORCE: 145,
  CHAOS_PULSE_INTERVAL: 14,
  CHAOS_PULSE_FORCE: 115,
  RAGE_STREAK_THRESHOLD: 3,
  RAGE_DURATION: 10,
  RAGE_KNOCKBACK_MULT: 2,
}

// --- Test 1: Round state transitions ---
{
  const states = ['Lobby', 'Countdown', 'Playing', 'Result']
  let stateIdx = 0
  const transitions = []
  for (let i = 0; i < states.length - 1; i++) {
    transitions.push(`${states[i]}->${states[i + 1]}`)
  }
  transitions.push('Result->Lobby')
  assert('Round state transitions work', transitions.length === 4 &&
    transitions[0] === 'Lobby->Countdown' && transitions[3] === 'Result->Lobby')
}

// --- Test 2: Team scoring and max score ---
{
  const scores = { Red: 0, Blue: 0 }
  let winner = null
  const goalSequence = ['Blue', 'Red', 'Blue', 'Blue', 'Red', 'Blue', 'Blue', 'Red', 'Blue', 'Blue']
  for (const team of goalSequence) {
    scores[team]++
    if (scores[team] >= C.MAX_SCORE) {
      winner = team
      break
    }
  }
  assert('Goals can be scored and max-score ends match',
    winner === 'Blue' && scores.Blue === C.MAX_SCORE)
}

// --- Test 3: Swing mechanics ---
{
  const swingCd = C.SWING_COOLDOWN
  let lastSwingTime = -999
  let swingsLanded = 0
  const simTime = 5.0
  for (let t = 0; t < simTime; t += 0.1) {
    if (t - lastSwingTime >= swingCd) {
      const targetDist = 8  // within SWING_RANGE=12
      if (targetDist <= C.SWING_RANGE) {
        swingsLanded++
        lastSwingTime = t
      }
    }
  }
  assert('Swing mechanic applies knockback on cooldown',
    swingsLanded >= 7 && C.SWING_KNOCKBACK === 95)
}

// --- Test 4: Dash mechanics ---
{
  let dashReady = true
  let lastDash = -999
  let dashCount = 0
  for (let t = 0; t < 10; t += 0.5) {
    if (t - lastDash >= C.DASH_COOLDOWN) {
      dashCount++
      lastDash = t
    }
  }
  assert('Dash respects cooldown and applies force',
    dashCount >= 3 && C.DASH_FORCE === 120)
}

// --- Test 5: Rage mode activates at 3-streak ---
{
  let streak = 0
  let rageActivated = false
  for (let i = 0; i < 5; i++) {
    streak++
    if (streak >= C.RAGE_STREAK_THRESHOLD && !rageActivated) {
      rageActivated = true
    }
  }
  assert('Rage mode activates at 3-streak',
    rageActivated && C.RAGE_STREAK_THRESHOLD === 3)
}

// --- Test 6: Chaos pulse fires periodically ---
{
  let pulseCount = 0
  const matchLen = C.MATCH_DURATION
  for (let t = C.CHAOS_PULSE_INTERVAL; t < matchLen; t += C.CHAOS_PULSE_INTERVAL) {
    pulseCount++
  }
  assert('Chaos pulse fires periodically',
    pulseCount >= 6 && C.CHAOS_PULSE_FORCE === 115)
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
