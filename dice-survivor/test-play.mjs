/**
 * ダイスサバイバー テストプレイ
 * ゲームロジックを直接実行して1ラン分のプレイをシミュレーション
 */

// --- データ定義を直接埋め込み（ESMインポートの代わり） ---

const FACES = {
  'attack-1': { id: 'attack-1', symbol: 'attack', value: 1, label: '攻撃+1', emoji: '⚔️', rarity: 'common' },
  'attack-2': { id: 'attack-2', symbol: 'attack', value: 2, label: '攻撃+2', emoji: '⚔️', rarity: 'common' },
  'attack-1b': { id: 'attack-1', symbol: 'attack', value: 1, label: '攻撃+1', emoji: '⚔️', rarity: 'common' },
  'shield-2': { id: 'shield-2', symbol: 'shield', value: 2, label: '防御+2', emoji: '🛡️', rarity: 'common' },
  'shield-1': { id: 'shield-1', symbol: 'shield', value: 1, label: '防御+1', emoji: '🛡️', rarity: 'common' },
  'heal-1': { id: 'heal-1', symbol: 'heal', value: 1, label: '回復+1', emoji: '❤️', rarity: 'common' },
  'blank': { id: 'blank', symbol: 'blank', value: 0, label: '空白', emoji: '⬜', rarity: 'common' },
}

const f = FACES
const starterDice = [
  { id: 'die-0', color: '#e05555', faces: [f['attack-2'], f['attack-2'], f['attack-1b'], f['shield-2'], f['shield-1'], f['heal-1']] },
  { id: 'die-1', color: '#4488dd', faces: [f['attack-2'], f['attack-1b'], f['shield-2'], f['shield-1'], f['shield-1'], f['heal-1']] },
  { id: 'die-2', color: '#55bb55', faces: [f['attack-1b'], f['attack-1b'], f['shield-1'], f['heal-1'], f['heal-1'], f['blank']] },
]

const ENEMIES = [
  { id: 'slime', name: 'スライム', emoji: '🟢', baseHp: 12, baseAttack: 3, intentPattern: ['attack', 'attack', 'defend'], isBoss: false },
  { id: 'bat', name: 'コウモリ', emoji: '🦇', baseHp: 8, baseAttack: 4, intentPattern: ['attack', 'attack', 'attack'], isBoss: false },
  { id: 'skeleton', name: 'スケルトン', emoji: '💀', baseHp: 18, baseAttack: 4, intentPattern: ['attack', 'defend', 'attack', 'buff'], isBoss: false },
  { id: 'golem', name: 'ゴーレム', emoji: '🗿', baseHp: 30, baseAttack: 6, intentPattern: ['defend', 'defend', 'attack'], isBoss: false },
  { id: 'dark_mage', name: 'ダークメイジ', emoji: '🧙', baseHp: 15, baseAttack: 5, intentPattern: ['special', 'attack', 'buff', 'attack'], isBoss: false },
]
const BOSSES = [
  { id: 'king_slime', name: 'キングスライム', emoji: '👑', baseHp: 40, baseAttack: 5, intentPattern: ['attack', 'attack', 'buff', 'attack', 'attack', 'defend'], isBoss: true },
  { id: 'dragon', name: 'ドラゴン', emoji: '🐉', baseHp: 60, baseAttack: 7, intentPattern: ['attack', 'defend', 'special', 'attack', 'attack'], isBoss: true },
  { id: 'death_knight', name: 'デスナイト', emoji: '⚫', baseHp: 80, baseAttack: 8, intentPattern: ['attack', 'special', 'attack', 'buff', 'attack', 'attack'], isBoss: true },
]

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
  const scale = 1 + (floor - 1) * 0.15
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

console.log('═══════════════════════════════════════')
console.log('  🎲 ダイスサバイバー テストプレイ 🎲')
console.log('═══════════════════════════════════════\n')

let player = { maxHp: 40, currentHp: 40, shield: 0, dice: JSON.parse(JSON.stringify(starterDice)) }
let totalTurns = 0
let enemiesDefeated = 0

for (let floor = 1; floor <= 15; floor++) {
  const enemy = generateEnemy(floor)
  const isBoss = enemy.def.isBoss
  console.log(`\n${'─'.repeat(40)}`)
  console.log(`📍 ${floor}F ${isBoss ? '⚠️ BOSS' : ''} — ${enemy.def.emoji} ${enemy.def.name} (HP:${enemy.maxHp} ATK:${enemy.attack})`)
  console.log(`   プレイヤー HP: ${player.currentHp}/${player.maxHp}`)

  let turnCount = 0

  while (enemy.currentHp > 0 && player.currentHp > 0) {
    turnCount++
    totalTurns++

    // Player rolls
    const results = rollDice(player.dice)
    const combos = detectCombos(results)

    let dmg = 0, shld = 0, heal = 0
    for (const r of results) {
      if (r.face.symbol === 'attack') dmg += r.face.value
      else if (r.face.symbol === 'shield') shld += r.face.value
      else if (r.face.symbol === 'heal') heal += r.face.value
    }
    for (const c of combos) { dmg += c.bonusDamage; shld += c.bonusShield; heal += c.bonusHeal }

    player.shield = shld
    player.currentHp = Math.min(player.maxHp, player.currentHp + heal)

    const actualDmg = Math.max(0, dmg - enemy.shield)
    enemy.currentHp = Math.max(0, enemy.currentHp - actualDmg)
    enemy.shield = Math.max(0, enemy.shield - dmg)

    const rollStr = results.map(r => `${r.face.emoji}${r.face.value || ''}`).join(' ')
    const comboStr = combos.length > 0 ? ` 💥${combos.map(c => c.bonusLabel).join(',')}` : ''
    process.stdout.write(`   T${turnCount}: [${rollStr}]${comboStr} → ${actualDmg}dmg`)

    if (enemy.currentHp <= 0) {
      console.log(` 💀 撃破！`)
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
      enemy.attack = Math.round(enemy.attack * 1.3)
    } else if (intent.type === 'special') {
      eDmg = Math.max(0, Math.round(intent.value * 1.5) - player.shield)
      player.currentHp = Math.max(0, player.currentHp - eDmg)
    }
    player.shield = 0

    const nextIdx = (enemy.intentIndex + 1) % enemy.def.intentPattern.length
    enemy.intentIndex = nextIdx
    enemy.currentIntent = resolveIntent(enemy.def.intentPattern[nextIdx], enemy.attack)

    console.log(` | 敵:${intent.emoji}${eDmg > 0 ? eDmg + 'dmg' : intent.type} | HP:${player.currentHp}/${player.maxHp}`)

    if (player.currentHp <= 0) {
      console.log(`   💀 プレイヤー死亡...`)
      break
    }
  }

  if (player.currentHp <= 0) {
    console.log(`\n╔═══════════════════════════════╗`)
    console.log(`║   💀 GAME OVER  at ${floor}F       ║`)
    console.log(`║   撃破数: ${enemiesDefeated}  ターン数: ${totalTurns}  ║`)
    console.log(`╚═══════════════════════════════╝`)
    break
  }

  enemiesDefeated++

  // 報酬: HPを少し回復
  const healAmt = Math.round(5 + floor * 1.5)
  player.currentHp = Math.min(player.maxHp, player.currentHp + healAmt)
  console.log(`   🎁 報酬: HP+${healAmt}回復 → HP:${player.currentHp}/${player.maxHp}`)

  if (floor === 15) {
    console.log(`\n╔═══════════════════════════════╗`)
    console.log(`║   🏆 VICTORY! ダンジョン制覇！ ║`)
    console.log(`║   撃破数: ${enemiesDefeated}  ターン数: ${totalTurns}  ║`)
    console.log(`╚═══════════════════════════════╝`)
  }
}
