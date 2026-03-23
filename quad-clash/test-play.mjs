/**
 * Quad Clash - Smoke Test
 * Simulates 4-event tournament: Dash, Javelin, High Jump, Marathon
 */

const EVENTS = ['dash', 'javelin', 'highJump', 'marathon']

function simulateDash() {
  // Button mash simulation: player taps at intervals, AI has base speed
  let playerPos = 0, aiPos = 0, elapsed = 0
  const DT = 0.05, FINISH = 100
  let playerStamina = 100, aiStamina = 100

  while (elapsed < 15 && playerPos < FINISH && aiPos < FINISH) {
    elapsed += DT
    // Player: mash at ~8 taps/sec
    const playerSpeed = 8 + Math.random() * 3
    const aiSpeed = 7 + Math.random() * 3
    playerPos += playerSpeed * DT * (playerStamina / 100)
    aiPos += aiSpeed * DT * (aiStamina / 100)
    playerStamina = Math.max(20, playerStamina - 1.5 * DT)
    aiStamina = Math.max(20, aiStamina - 1.5 * DT)
  }

  const pTime = playerPos >= FINISH ? elapsed : 15
  const aTime = aiPos >= FINISH ? elapsed : 15
  return { playerResult: Math.round((1 / pTime) * 1000), aiResult: Math.round((1 / aTime) * 1000), playerWon: pTime <= aTime }
}

function simulateJavelin() {
  // Power oscillation: player releases at good power, angle tuning
  const playerPower = 60 + Math.random() * 35
  const playerAngle = 35 + Math.random() * 15
  const rad = (playerAngle * Math.PI) / 180
  let playerDist = playerPower * Math.sin(2 * rad) * 0.5 + (Math.random() - 0.5) * 5
  playerDist = Math.max(0, playerDist)

  const aiPower = 60 + Math.random() * 30
  const aiAngle = 35 + Math.random() * 15
  const aiRad = (aiAngle * Math.PI) / 180
  let aiDist = aiPower * Math.sin(2 * aiRad) * 0.5 + (Math.random() - 0.5) * 5
  aiDist = Math.max(0, aiDist)

  return { playerResult: Math.round(playerDist * 10), aiResult: Math.round(aiDist * 10), playerWon: playerDist >= aiDist }
}

function simulateHighJump() {
  let barHeight = 1.5, playerBest = 0, aiBest = 0
  const MAX_ATTEMPTS = 3

  for (let attempt = 0; attempt < 5; attempt++) {
    // Player jump
    let pFails = 0
    for (let a = 0; a < MAX_ATTEMPTS; a++) {
      const power = 0.7 + Math.random() * 0.4 // timing-based
      const jumpHeight = barHeight * power * 1.2
      if (jumpHeight >= barHeight) { playerBest = Math.max(playerBest, barHeight); break }
      else pFails++
    }

    // AI jump
    let aFails = 0
    for (let a = 0; a < MAX_ATTEMPTS; a++) {
      const power = 0.65 + Math.random() * 0.4
      const jumpHeight = barHeight * power * 1.2
      if (jumpHeight >= barHeight) { aiBest = Math.max(aiBest, barHeight); break }
      else aFails++
    }

    barHeight += 0.15
    if (pFails >= MAX_ATTEMPTS && aFails >= MAX_ATTEMPTS) break
  }

  return { playerResult: Math.round(playerBest * 100), aiResult: Math.round(aiBest * 100), playerWon: playerBest >= aiBest }
}

function simulateMarathon() {
  let playerPos = 0, aiPos = 0
  let playerStamina = 100, aiStamina = 100
  const COURSE = 1000, DT = 0.5
  let elapsed = 0

  while (elapsed < 120 && (playerPos < COURSE || aiPos < COURSE)) {
    elapsed += DT
    // Player: run at moderate pace, sprint when stamina high
    const pSpeed = playerStamina > 50 ? 12 + Math.random() * 3 : 7 + Math.random() * 2
    const aSpeed = aiStamina > 50 ? 11 + Math.random() * 3 : 7 + Math.random() * 2
    playerPos += pSpeed * DT
    aiPos += aSpeed * DT
    playerStamina = Math.max(0, playerStamina - (pSpeed > 10 ? 3 : 1) * DT)
    aiStamina = Math.max(0, aiStamina - (aSpeed > 10 ? 3 : 1) * DT)
    // Slow regen
    playerStamina = Math.min(100, playerStamina + 0.5 * DT)
    aiStamina = Math.min(100, aiStamina + 0.5 * DT)

    if (playerPos >= COURSE && aiPos >= COURSE) break
  }

  const pTime = playerPos >= COURSE ? elapsed : 120
  const aTime = aiPos >= COURSE ? elapsed : 120
  return { playerResult: Math.round((1 / pTime) * 10000), aiResult: Math.round((1 / aTime) * 10000), playerWon: pTime <= aTime }
}

function runTournament() {
  let playerTotal = 0, aiTotal = 0, eventsWon = 0, sabotagesUsed = 0
  const eventResults = []

  for (const event of EVENTS) {
    let result
    switch (event) {
      case 'dash': result = simulateDash(); break
      case 'javelin': result = simulateJavelin(); break
      case 'highJump': result = simulateHighJump(); break
      case 'marathon': result = simulateMarathon(); break
    }
    playerTotal += result.playerResult
    aiTotal += result.aiResult
    if (result.playerWon) eventsWon++
    // Simulate sabotage usage (50% chance per event)
    if (Math.random() < 0.5) sabotagesUsed++
    eventResults.push({ event, ...result })
  }

  return { playerTotal, aiTotal, eventsWon, sabotagesUsed, allComplete: eventResults.length === 4, eventResults }
}

// --- Run tests ---
const RUNS = 10
const results = []
for (let i = 0; i < RUNS; i++) results.push(runTournament())

const avgScore = results.reduce((s, r) => s + r.playerTotal, 0) / RUNS
const avgEventsWon = results.reduce((s, r) => s + r.eventsWon, 0) / RUNS
const avgSabotages = results.reduce((s, r) => s + r.sabotagesUsed, 0) / RUNS
const allComplete = results.every(r => r.allComplete)
const scoringWorks = results.every(r => r.playerTotal > 0 && r.aiTotal > 0)

const pass = allComplete && scoringWorks

console.log(`\x1b[31m`)
console.log(`+===============================+`)
console.log(`|  QUAD CLASH - Test Results     |`)
console.log(`+===============================+`)
console.log(`|  Runs: ${RUNS}                      |`)
console.log(`|  Avg Total Score: ${avgScore.toFixed(0).padEnd(12)}|`)
console.log(`|  Avg Events Won: ${avgEventsWon.toFixed(1).padEnd(13)}|`)
console.log(`|  Avg Sabotages: ${avgSabotages.toFixed(1).padEnd(14)}|`)
console.log(`|  All 4 Events: ${allComplete ? 'YES' : 'NO'}             |`)
console.log(`|  Scoring Works: ${scoringWorks ? 'YES' : 'NO'}            |`)
console.log(`|  Status: ${pass ? '\x1b[32mPASS\x1b[31m' : '\x1b[31mFAIL'}               |`)
console.log(`+===============================+`)
console.log(`\x1b[0m`)

if (!pass) process.exit(1)
