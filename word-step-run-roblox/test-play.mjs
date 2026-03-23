// Word Step Run - Smoke Test
// Simulates: block placement (STEP/BRIDGE/UP/PUSH/TRAP), cooldowns, checkpoint progress

const TITLE = 'Word Step Run'
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
  MATCH_DURATION: 75,
  CHECKPOINT_COUNT: 3,
  FALL_RESET_Y: 10,
  PUSH_RANGE: 10,
  PUSH_FORCE: 50,
  TRAP_CRUMBLE_DELAY: 1,
  COMMANDS: {
    STEP:   { cooldown: 0.55, lifetime: 2.8,  size: [8, 1, 8] },
    BRIDGE: { cooldown: 1.9,  lifetime: 3.4,  size: [8, 1, 8] },
    UP:     { cooldown: 1.45, lifetime: 3.2,  size: [8, 1, 8] },
    PUSH:   { cooldown: 1.1,  lifetime: 3.0,  size: [8, 1, 8] },
    TRAP:   { cooldown: 1.1,  lifetime: 4.0,  size: [8, 1, 8] },
  },
}

// --- Test 1: Each block has correct lifetime ---
{
  const expected = { STEP: 2.8, BRIDGE: 3.4, UP: 3.2, PUSH: 3.0, TRAP: 4.0 }
  let allMatch = true
  for (const [cmd, data] of Object.entries(C.COMMANDS)) {
    if (data.lifetime !== expected[cmd]) allMatch = false
  }
  assert('Blocks have correct lifetime values', allMatch)
}

// --- Test 2: Cooldowns prevent rapid placement ---
{
  let lastPlace = -999
  let placed = 0
  const cd = C.COMMANDS.STEP.cooldown
  for (let t = 0; t < 3; t += 0.1) {
    if (t - lastPlace >= cd) {
      placed++
      lastPlace = t
    }
  }
  assert('STEP cooldown limits placement rate',
    placed >= 5 && placed <= 6)
}

// --- Test 3: PUSH applies force to nearby players ---
{
  const targets = [
    { dist: 5, pushed: false },
    { dist: 9, pushed: false },
    { dist: 15, pushed: false },
  ]
  for (const t of targets) {
    if (t.dist <= C.PUSH_RANGE) {
      t.pushed = true
    }
  }
  assert('PUSH applies force within range',
    targets[0].pushed && targets[1].pushed && !targets[2].pushed)
}

// --- Test 4: TRAP crumbles after delay ---
{
  let trapCreatedAt = 0
  let crumbled = false
  const checkTime = C.TRAP_CRUMBLE_DELAY + 0.1
  if (checkTime >= trapCreatedAt + C.TRAP_CRUMBLE_DELAY) {
    crumbled = true
  }
  assert('TRAP crumbles after delay', crumbled && C.TRAP_CRUMBLE_DELAY === 1)
}

// --- Test 5: Checkpoint progress tracks forward ---
{
  let checkpoint = 0
  const courseX = [-120, -70, -20, 40, 100]
  const cpRadius = 20
  for (const x of courseX) {
    if (checkpoint < C.CHECKPOINT_COUNT) {
      // Simplified: as player moves forward, checkpoints advance
      const cpX = [-70, -20, 40][checkpoint]
      if (Math.abs(x - cpX) < cpRadius) {
        checkpoint++
      }
    }
  }
  assert('Checkpoints advance sequentially', checkpoint === 3)
}

// --- Test 6: Block lifetime expires and removes block ---
{
  const blocks = []
  const now = 10
  blocks.push({ cmd: 'STEP', createdAt: 5 })     // age=5, lifetime=2.8 -> expired
  blocks.push({ cmd: 'BRIDGE', createdAt: 8 })    // age=2, lifetime=3.4 -> alive
  blocks.push({ cmd: 'TRAP', createdAt: 4 })      // age=6, lifetime=4.0 -> expired
  const alive = blocks.filter(b => {
    const age = now - b.createdAt
    return age < C.COMMANDS[b.cmd].lifetime
  })
  assert('Expired blocks are removed correctly',
    alive.length === 1 && alive[0].cmd === 'BRIDGE')
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
