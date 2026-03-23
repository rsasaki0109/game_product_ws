// Master runner for all 11 Roblox game smoke tests
import { execSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const games = [
  'baseball-brawl-roblox',
  'blink-door-brawl-roblox',
  'bubble-drifter-roblox',
  'hot-air-havoc-roblox',
  'roll-ball-rush-roblox',
  'word-step-run-roblox',
  'gravity-flip-roblox',
  'echo-tag-roblox',
  'magnet-wars-roblox',
  'size-shifter-roblox',
  'clone-chaos-roblox',
]

let passed = 0
let failed = 0
const failures = []

for (const game of games) {
  console.log(`\n=== Testing ${game} ===`)
  try {
    execSync(`node ${game}/test-play.mjs`, { stdio: 'inherit', cwd: root })
    passed++
  } catch {
    failed++
    failures.push(game)
  }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED out of ${games.length}`)
if (failures.length > 0) {
  console.log(`FAILURES: ${failures.join(', ')}`)
}
process.exit(failed > 0 ? 1 : 0)
