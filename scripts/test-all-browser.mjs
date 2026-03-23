/**
 * Master Test Runner - All 8 Browser Games
 * Runs each game's test-play.mjs sequentially and reports results
 */

import { execSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const games = [
  'hack-and-slash',
  'burger-brawl',
  'phantom-lock',
  'crystal-siege-rts',
  'iron-conquest',
  'couch-chaos',
  'climb-clash',
  'quad-clash',
]

console.log('\x1b[1m')
console.log('+===========================================+')
console.log('|   BROWSER GAME TEST SUITE                 |')
console.log('|   Testing all 8 games headlessly           |')
console.log('+===========================================+')
console.log('\x1b[0m')

let passed = 0
let failed = 0
const results = []

for (const game of games) {
  const script = join(root, game, 'test-play.mjs')
  console.log(`\n--- Running: ${game} ---`)

  try {
    execSync(`node "${script}"`, { stdio: 'inherit', cwd: join(root, game), timeout: 30000 })
    passed++
    results.push({ game, status: 'PASS' })
  } catch (err) {
    failed++
    results.push({ game, status: 'FAIL' })
    console.log(`\x1b[31m  [FAILED] ${game}\x1b[0m`)
  }
}

console.log('\n\x1b[1m')
console.log('+===========================================+')
console.log('|           FINAL SUMMARY                    |')
console.log('+===========================================+')
for (const r of results) {
  const icon = r.status === 'PASS' ? '\x1b[32m[PASS]' : '\x1b[31m[FAIL]'
  console.log(`|  ${icon}\x1b[1m ${r.game.padEnd(25)}       |`)
}
console.log('+-------------------------------------------+')
console.log(`|  Total: ${passed} passed, ${failed} failed${' '.repeat(Math.max(0, 17 - `${passed}${failed}`.length))}|`)
console.log('+===========================================+')
console.log('\x1b[0m')

if (failed > 0) process.exit(1)
