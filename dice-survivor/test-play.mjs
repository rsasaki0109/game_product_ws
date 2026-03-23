/**
 * ダイスサバイバー テストプレイ
 * ゲームロジックを直接実行して1ラン分のプレイをシミュレーション
 */

// --- データ定義を直接埋め込み（ESMインポートの代わり） ---

const FACES = {
  'attack-1': { id: 'attack-1', symbol: 'attack', value: 1, label: '攻撃+1', emoji: '⚔️', rarity: 'common' },
  'attack-2': { id: 'attack-2', symbol: 'attack', value: 2, label: '攻撃+2', emoji: '⚔️', rarity: 'common' },
  'attack-3': { id: 'attack-3', symbol: 'attack', value: 3, label: '攻撃+3', emoji: '⚔️', rarity: 'uncommon' },
  'attack-5': { id: 'attack-5', symbol: 'attack', value: 5, label: '攻撃+5', emoji: '⚔️', rarity: 'rare' },
  'shield-1': { id: 'shield-1', symbol: 'shield', value: 1, label: '防御+1', emoji: '🛡️', rarity: 'common' },
  'shield-2': { id: 'shield-2', symbol: 'shield', value: 2, label: '防御+2', emoji: '🛡️', rarity: 'common' },
  'shield-3': { id: 'shield-3', symbol: 'shield', value: 3, label: '防御+3', emoji: '🛡️', rarity: 'uncommon' },
  'heal-1': { id: 'heal-1', symbol: 'heal', value: 1, label: '回復+1', emoji: '❤️', rarity: 'common' },
  'heal-2': { id: 'heal-2', symbol: 'heal', value: 2, label: '回復+2', emoji: '❤️', rarity: 'uncommon' },
  'fire-3': { id: 'fire-3', symbol: 'fire', value: 3, label: '炎+3', emoji: '🔥', rarity: 'uncommon' },
  'poison-2': { id: 'poison-2', symbol: 'poison', value: 2, label: '毒+2', emoji: '💀', rarity: 'uncommon' },
  'vampiric-2': { id: 'vampiric-2', symbol: 'vampiric', value: 2, label: '吸血+2', emoji: '🦇', rarity: 'rare' },
  'blank': { id: 'blank', symbol: 'blank', value: 0, label: '空白', emoji: '⬜', rarity: 'common' },
}

const f = FACES
const starterDice = [
  { id: 'die-0', color: '#e05555', faces: [f['attack-2'], f['attack-2'], f['attack-1'], f['shield-2'], f['shield-1'], f['heal-1']] },
  { id: 'die-1', color: '#4488dd', faces: [f['attack-2'], f['attack-1'], f['shield-2'], f['shield-1'], f['shield-1'], f['heal-1']] },
  { id: 'die-2', color: '#55bb55', faces: [f['attack-1'], f['attack-1'], f['shield-1'], f['heal-1'], f['heal-1'], f['attack-1']] },
]

const ENEMIES = [
  { id: 'slime', name: 'スライム', emoji: '🟢', baseHp: 12, baseAttack: 3, intentPattern: ['attack', 'attack', 'defend'], isBoss: false },
  { id: 'bat', name: 'コウモリ', emoji: '🦇', baseHp: 8, baseAttack: 4, intentPattern: ['attack', 'attack', 'attack'], isBoss: false },
  { id: 'skeleton', name: 'スケルトン', emoji: '💀', baseHp: 18, baseAttack: 4, intentPattern: ['attack', 'defend', 'attack', 'buff'], isBoss: false },
  { id: 'golem', name: 'ゴーレム', emoji: '🗿', baseHp: 22, baseAttack: 4, intentPattern: ['defend', 'defend', 'attack'], isBoss: false },
  { id: 'dark_mage', name: 'ダークメイジ', emoji: '🧙', baseHp: 14, baseAttack: 4, intentPattern: ['special', 'attack', 'buff', 'attack'], isBoss: false },
]
const BOSSES = [
  { id: 'king_slime', name: 'キングスライム', emoji: '👑', baseHp: 28, baseAttack: 4, intentPattern: ['attack', 'attack', 'buff', 'attack', 'defend', 'defend'], isBoss: true },
  { id: 'dragon', name: 'ドラゴン', emoji: '🐉', baseHp: 28, baseAttack: 5, intentPattern: ['attack', 'defend', 'special', 'defend', 'attack'], isBoss: true },
  { id: 'death_knight', name: 'デスナイト', emoji: '⚫', baseHp: 42, baseAttack: 6, intentPattern: ['attack', 'special', 'defend', 'attack', 'buff', 'attack'], isBoss: true },
]

// --- Upgrade pools by floor range (simulates loot rewards) ---
const UPGRADE_POOL_EARLY = [f['attack-2'], f['attack-3'], f['shield-2'], f['shield-3'], f['heal-2'], f['fire-3']]
const UPGRADE_POOL_MID = [f['attack-3'], f['attack-5'], f['shield-3'], f['heal-2'], f['fire-3'], f['poison-2'], f['vampiric-2']]
const UPGRADE_POOL_LATE = [f['attack-5'], f['shield-3'], f['heal-2'], f['fire-3'], f['vampiric-2']]

function pickUpgradeForFloor(floor) {
  const pool = floor <= 5 ? UPGRADE_POOL_EARLY : floor <= 10 ? UPGRADE_POOL_MID : UPGRADE_POOL_LATE
  return pool[Math.floor(Math.random() * pool.length)]
}

function applyDiceUpgrade(dice) {
  // Replace the weakest face on a random die with an upgrade
  const dieIdx = Math.floor(Math.random() * dice.length)
  const die = dice[dieIdx]
  // Find the weakest non-blank face (or blank if it exists)
  let worstIdx = 0
  let worstVal = Infinity
  for (let i = 0; i < die.faces.length; i++) {
    const fv = die.faces[i].symbol === 'blank' ? -1 : die.faces[i].value
    if (fv < worstVal) {
      worstVal = fv
      worstIdx = i
    }
  }
  const floor = dice._floor || 1
  die.faces[worstIdx] = pickUpgradeForFloor(floor)
}

// --- ゲームロジック ---

function resolveIntent(type, attack) {
  switch (type) {
    case 'attack': return { type: 'attack', value: attack, label: `攻撃 ${attack}`, emoji: '⚔️' }
    case 'defend': return { type: 'defend', value: Math.round(attack * 0.8), label: '防御', emoji: '🛡️' }
    case 'buff': return { type: 'buff', value: 0, label: '強化', emoji: '💪' }
    case 'special': return { type: 'special', value: attack, label: '特殊攻撃', emoji: '⭐' }
    default: return { type: 'attack', value: attack, label: `攻撃 ${attack}`, emoji: '⚔️' }
  }
}

function generateEnemy(floor) {
  const boss = floor === 5 ? BOSSES[0] : floor === 10 ? BOSSES[1] : floor === 15 ? BOSSES[2] : null
  let def
  if (boss) {
    def = boss
  } else {
    const pool = floor <= 3 ? ENEMIES.filter(e => e.id === 'slime' || e.id === 'bat')
      : floor <= 6 ? ENEMIES.filter(e => e.id !== 'dark_mage')
      : ENEMIES
    def = pool[Math.floor(Math.random() * pool.length)]
  }
  const scale = 1 + Math.sqrt(floor - 1) * 0.15
  const attack = Math.round(def.baseAttack * scale)
  return {
    def, currentHp: Math.round(def.baseHp * scale), maxHp: Math.round(def.baseHp * scale),
    shield: 0, attack, intentIndex: 0,
    currentIntent: resolveIntent(def.intentPattern[0], attack),
    statusEffects: [],
  }
}

function rollDice(dice) {
  return dice.map(die => {
    const idx = Math.floor(Math.random() * 6)
    return { dieId: die.id, rolledFaceIndex: idx, face: die.faces[idx] }
  })
}

function detectCombos(results) {
  const counts = new Map()
  for (const r of results) {
    if (r.face.symbol === 'blank') continue
    counts.set(r.face.symbol, (counts.get(r.face.symbol) || 0) + 1)
  }
  const combos = []
  for (const [symbol, count] of counts) {
    if (count >= 2) {
      if (count === 2) combos.push({ symbol, count: 2, bonusLabel: '2xボーナス', bonusDamage: symbol === 'attack' ? 2 : 0, bonusShield: symbol === 'shield' ? 2 : 0, bonusHeal: symbol === 'heal' ? 2 : 0 })
      else combos.push({ symbol, count: 3, bonusLabel: '3x必殺！', bonusDamage: symbol === 'attack' ? 8 : 0, bonusShield: symbol === 'shield' ? 8 : 0, bonusHeal: symbol === 'heal' ? 99 : 0 })
    }
  }
  return combos
}

// --- シミュレーション実行 ---

function runOneGame(verbose) {
  let player = { maxHp: 50, currentHp: 50, shield: 0, dice: JSON.parse(JSON.stringify(starterDice)) }
  let totalTurns = 0
  let enemiesDefeated = 0

  for (let floor = 1; floor <= 15; floor++) {
    const enemy = generateEnemy(floor)
    const isBoss = enemy.def.isBoss
    if (verbose) {
      console.log(`\n${'─'.repeat(40)}`)
      console.log(`📍 ${floor}F ${isBoss ? '⚠️ BOSS' : ''} — ${enemy.def.emoji} ${enemy.def.name} (HP:${enemy.maxHp} ATK:${enemy.attack})`)
      console.log(`   プレイヤー HP: ${player.currentHp}/${player.maxHp}`)
    }

    let turnCount = 0

    while (enemy.currentHp > 0 && player.currentHp > 0 && turnCount < 50) {
      turnCount++
      totalTurns++

      // Enemy shield decays each turn (halved, like a natural fade)
      enemy.shield = Math.floor(enemy.shield * 0.5)

      // Player rolls
      const results = rollDice(player.dice)
      const combos = detectCombos(results)

      let dmg = 0, shld = 0, heal = 0
      for (const r of results) {
        if (r.face.symbol === 'attack') dmg += r.face.value
        else if (r.face.symbol === 'shield') shld += r.face.value
        else if (r.face.symbol === 'heal') heal += r.face.value
        else if (r.face.symbol === 'fire') dmg += r.face.value
        else if (r.face.symbol === 'vampiric') { dmg += r.face.value; heal += r.face.value }
      }
      for (const c of combos) { dmg += c.bonusDamage; shld += c.bonusShield; heal += c.bonusHeal }

      player.shield = shld
      player.currentHp = Math.min(player.maxHp, player.currentHp + heal)

      const actualDmg = Math.max(0, dmg - enemy.shield)
      enemy.currentHp = Math.max(0, enemy.currentHp - actualDmg)
      enemy.shield = Math.max(0, enemy.shield - dmg)

      if (verbose) {
        const rollStr = results.map(r => `${r.face.emoji}${r.face.value || ''}`).join(' ')
        const comboStr = combos.length > 0 ? ` 💥${combos.map(c => c.bonusLabel).join(',')}` : ''
        process.stdout.write(`   T${turnCount}: [${rollStr}]${comboStr} → ${actualDmg}dmg`)
      }

      if (enemy.currentHp <= 0) {
        if (verbose) console.log(` 💀 撃破！`)
        break
      }

      // Enemy turn
      const intent = enemy.currentIntent
      let eDmg = 0
      if (intent.type === 'attack') {
        eDmg = Math.max(0, intent.value - player.shield)
        player.currentHp = Math.max(0, player.currentHp - eDmg)
        player.shield = Math.max(0, player.shield - intent.value)
      } else if (intent.type === 'defend') {
        enemy.shield += intent.value
      } else if (intent.type === 'buff') {
        enemy.attack = Math.round(enemy.attack * 1.15)
      } else if (intent.type === 'special') {
        eDmg = Math.max(0, Math.round(intent.value * 1.5) - player.shield)
        player.currentHp = Math.max(0, player.currentHp - eDmg)
      }
      player.shield = 0

      const nextIdx = (enemy.intentIndex + 1) % enemy.def.intentPattern.length
      enemy.intentIndex = nextIdx
      enemy.currentIntent = resolveIntent(enemy.def.intentPattern[nextIdx], enemy.attack)

      if (verbose) console.log(` | 敵:${intent.emoji}${eDmg > 0 ? eDmg + 'dmg' : intent.type} | HP:${player.currentHp}/${player.maxHp}`)

      if (player.currentHp <= 0) {
        if (verbose) console.log(`   💀 プレイヤー死亡...`)
        break
      }
    }

    if (player.currentHp <= 0) {
      if (verbose) {
        console.log(`\n╔═══════════════════════════════════════╗`)
        console.log(`║   💀 GAME OVER  at ${floor}F                ║`)
        console.log(`║   撃破数: ${enemiesDefeated}  ターン数: ${totalTurns}          ║`)
        console.log(`╚═══════════════════════════════════════╝`)
      }
      return { won: false, floor, enemiesDefeated, totalTurns }
    }

    enemiesDefeated++

    // 報酬: HPを少し回復 + ダイスアップグレード
    const healAmt = Math.round(5 + floor * 1.5)
    player.currentHp = Math.min(player.maxHp, player.currentHp + healAmt)

    // Simulate dice upgrade reward (replace weakest face)
    player.dice._floor = floor
    applyDiceUpgrade(player.dice)

    // 50% chance of maxHP+5 every other floor
    if (floor % 3 === 0 && Math.random() < 0.5) {
      player.maxHp += 5
      player.currentHp += 5
    }

    if (verbose) {
      console.log(`   🎁 報酬: HP+${healAmt}回復 + ダイス強化 → HP:${player.currentHp}/${player.maxHp}`)
    }

    if (floor === 15) {
      if (verbose) {
        console.log(`\n╔═══════════════════════════════════════╗`)
        console.log(`║   🏆 VICTORY! ダンジョン制覇！        ║`)
        console.log(`║   撃破数: ${enemiesDefeated}  ターン数: ${totalTurns}          ║`)
        console.log(`╚═══════════════════════════════════════╝`)
      }
      return { won: true, floor, enemiesDefeated, totalTurns }
    }
  }
  return { won: false, floor: 15, enemiesDefeated, totalTurns }
}

// --- バッチ実行 ---

const RUNS = 30

console.log('═══════════════════════════════════════')
console.log('  🎲 ダイスサバイバー テストプレイ 🎲')
console.log('═══════════════════════════════════════')
console.log(`\n${RUNS}回のシミュレーションを実行中...\n`)

let wins = 0
let totalFloors = 0
const deathFloors = {}

for (let i = 0; i < RUNS; i++) {
  const result = runOneGame(false)
  if (result.won) wins++
  totalFloors += result.floor
  if (!result.won) {
    deathFloors[result.floor] = (deathFloors[result.floor] || 0) + 1
  }
}

console.log(`╔═══════════════════════════════════════╗`)
console.log(`║         バッチ結果 (${RUNS}回)            ║`)
console.log(`╠═══════════════════════════════════════╣`)
console.log(`║   勝率: ${wins}/${RUNS} (${Math.round(wins / RUNS * 100)}%)                   ║`)
console.log(`║   平均到達階: ${(totalFloors / RUNS).toFixed(1)}F                  ║`)
console.log(`╠═══════════════════════════════════════╣`)
console.log(`║   死亡階分布:                         ║`)
for (const [fl, count] of Object.entries(deathFloors).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  const bar = '█'.repeat(count)
  console.log(`║     ${fl}F: ${bar} (${count})`)
}
console.log(`╚═══════════════════════════════════════╝`)

// 詳細ログ付き1回プレイ
console.log('\n\n--- 詳細ログ (1回分) ---')
runOneGame(true)
