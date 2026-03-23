/**
 * ハクスラ 強化学習テストプレイ v2
 * 改良版: hit-and-run戦術, 敵状態認識, 報酬チューニング, 大量学習
 */

// ─── データ定義 ───────────────────────────────

const ENEMIES = [
  { id: 'goblin', name: 'Goblin', color: '#4a8c3f', baseHp: 15, baseAttack: 3, baseSpeed: 5, attackRange: 1.8, attackCooldown: 1.0, scale: 0.5 },
  { id: 'skeleton', name: 'Skeleton', color: '#c8c8c8', baseHp: 25, baseAttack: 5, baseSpeed: 4, attackRange: 2.0, attackCooldown: 1.2, scale: 0.6 },
  { id: 'orc', name: 'Orc', color: '#8b5c2a', baseHp: 40, baseAttack: 8, baseSpeed: 3, attackRange: 2.2, attackCooldown: 1.5, scale: 0.8 },
  { id: 'dark_knight', name: 'Dark Knight', color: '#4a1a6b', baseHp: 80, baseAttack: 10, baseSpeed: 4, attackRange: 2.5, attackCooldown: 1.0, scale: 1.0 },
]

const ITEMS = [
  { id: 'rusty_sword', name: 'Rusty Sword', emoji: '⚔️', stat: 'attack', value: 2 },
  { id: 'sharp_blade', name: 'Sharp Blade', emoji: '🗡️', stat: 'attack', value: 4 },
  { id: 'leather_boots', name: 'Leather Boots', emoji: '🥾', stat: 'speed', value: 0.5 },
  { id: 'swift_sandals', name: 'Swift Sandals', emoji: '👟', stat: 'speed', value: 1.0 },
  { id: 'health_ring', name: 'Health Ring', emoji: '💍', stat: 'maxHp', value: 10 },
  { id: 'vitality_amulet', name: 'Vitality Amulet', emoji: '💮', stat: 'maxHp', value: 20 },
]

// ─── ゲームロジック ──────────────────────────────

function getEnemyDef(id) { return ENEMIES.find(e => e.id === id) }

function getWavesForFloor(floor) {
  if (floor <= 2) return [[{ enemyId: 'goblin', count: 2 + floor }]]
  if (floor <= 4) return [[{ enemyId: 'goblin', count: 3 }], [{ enemyId: 'goblin', count: 2 }, { enemyId: 'skeleton', count: 1 }]]
  if (floor <= 6) return [[{ enemyId: 'skeleton', count: 3 }], [{ enemyId: 'skeleton', count: 2 }, { enemyId: 'goblin', count: 2 }]]
  if (floor <= 9) return [[{ enemyId: 'skeleton', count: 2 }, { enemyId: 'orc', count: 1 }], [{ enemyId: 'orc', count: 2 }, { enemyId: 'skeleton', count: 2 }]]
  return [[{ enemyId: 'dark_knight', count: 1 }]]
}

function dist2D(a, b) {
  const dx = a[0] - b[0], dz = a[2] - b[2]
  return Math.sqrt(dx * dx + dz * dz)
}

function dir2D(from, to) {
  const dx = to[0] - from[0], dz = to[2] - from[2]
  const len = Math.sqrt(dx * dx + dz * dz)
  if (len < 0.001) return [0, 0]
  return [dx / len, dz / len]
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

function rollLoot(floor) {
  if (Math.random() > 0.4) return null
  const weighted = ITEMS.map((item, i) => {
    const tier = Math.floor(i / 2)
    return { item, weight: 1 + Math.max(0, floor - tier * 3) }
  })
  const total = weighted.reduce((s, w) => s + w.weight, 0)
  let roll = Math.random() * total
  for (const w of weighted) { roll -= w.weight; if (roll <= 0) return w.item }
  return weighted[0].item
}

let nextUid = 1
function spawnEnemy(enemyId, floor) {
  const def = getEnemyDef(enemyId)
  const scale = 1 + (floor - 1) * 0.12
  const angle = Math.random() * Math.PI * 2
  const radius = 10 + Math.random() * 3
  return {
    uid: nextUid++, def,
    currentHp: Math.round(def.baseHp * scale),
    maxHp: Math.round(def.baseHp * scale),
    attack: Math.round(def.baseAttack * scale),
    speed: def.baseSpeed * (1 + (floor - 1) * 0.04),
    position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
    state: 'chase', attackTimer: 0, hitTimer: 0,
  }
}

// ─── シミュレーション環境 ──────────────────────────

const DT = 0.1
const ATTACK_RANGE = 2.5
const ATTACK_CD = 0.35
const DODGE_CD = 1.0
const INVULN = 0.4         // v2: 無敵時間を延長 (0.3→0.4)
const STAGGER = 0.25
const MAX_STEPS = 3000
const FLOOR_HEAL_RATIO = 0.2  // v2: フロアクリア時にHP20%回復

// v2: アクション追加
// 0=approach, 1=retreat, 2=attack, 3=dodge_toward, 4=dodge_away,
// 5=hit_and_run (攻撃+後退), 6=circle_strafe (横移動), 7=dodge_sideways
const ACTIONS = [
  'approach', 'retreat', 'attack', 'dodge_toward', 'dodge_away',
  'hit_and_run', 'circle_strafe', 'dodge_sideways',
]
const NUM_ACTIONS = ACTIONS.length

function createGameState() {
  return {
    player: {
      maxHp: 50, currentHp: 50, attack: 5, speed: 6,
      position: [0, 0, 0], facing: 0,
      attackTimer: 0, dodgeTimer: 0, invulnTimer: 0,
    },
    enemies: [],
    lootDrops: [],
    collectedItems: [],
    enemiesKilled: 0,
    floor: 1,
    waveIndex: 0,
    waveDefs: [],
    spawnQueue: [],
    spawnTimer: 0,
    totalDamageTaken: 0,
    totalDamageDealt: 0,
    dodgesUsed: 0,
    dodgeSuccesses: 0,
  }
}

function findNearest(player, enemies) {
  let best = null, bestDist = Infinity
  for (const e of enemies) {
    const d = dist2D(player.position, e.position)
    if (d < bestDist) { bestDist = d; best = e }
  }
  return { enemy: best, dist: bestDist }
}

// v2: 危険度 - 攻撃レンジ内の敵のうち、攻撃準備中の数
function threatLevel(player, enemies) {
  let threats = 0
  for (const e of enemies) {
    const d = dist2D(player.position, e.position)
    if (d <= e.def.attackRange + 1 && e.hitTimer <= 0 && e.attackTimer <= 0) {
      threats++
    }
  }
  return threats
}

function stepEnv(state, action) {
  const p = state.player
  let reward = 0
  const prevHp = p.currentHp

  // タイマー更新
  if (p.attackTimer > 0) p.attackTimer = Math.max(0, p.attackTimer - DT)
  if (p.dodgeTimer > 0) p.dodgeTimer = Math.max(0, p.dodgeTimer - DT)
  if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - DT)

  const { enemy: nearest, dist: nearDist } = findNearest(p, state.enemies)

  // プレイヤーアクション実行
  if (nearest) {
    const [dx, dz] = dir2D(p.position, nearest.position)
    // 垂直方向 (strafe用)
    const sx = -dz, sz = dx

    function doMove(mx, mz, speedMul = 1) {
      const spd = p.speed * DT * speedMul
      p.position = [
        clamp(p.position[0] + mx * spd, -14, 14), 0,
        clamp(p.position[2] + mz * spd, -14, 14),
      ]
    }

    function doAttack() {
      if (p.attackTimer > 0) return false
      p.attackTimer = ATTACK_CD
      p.facing = Math.atan2(dx, dz)
      const atkPoint = [
        p.position[0] + Math.sin(p.facing) * 1.5, 0,
        p.position[2] + Math.cos(p.facing) * 1.5,
      ]
      let hits = 0
      for (const e of state.enemies) {
        if (dist2D(atkPoint, e.position) < ATTACK_RANGE) {
          const dmg = Math.max(1, Math.round(p.attack * (0.8 + Math.random() * 0.4)))
          e.currentHp -= dmg
          e.hitTimer = STAGGER
          e.state = 'stagger'
          state.totalDamageDealt += dmg
          hits++
        }
      }
      if (hits > 0) {
        reward += 2 * hits  // v2: ヒット報酬UP
      } else {
        reward -= 0.5       // v2: 空振りペナルティUP
      }
      return hits > 0
    }

    function doDodge(mx, mz) {
      if (p.dodgeTimer > 0) return
      const dashDist = 4
      p.position = [
        clamp(p.position[0] + mx * dashDist, -14, 14), 0,
        clamp(p.position[2] + mz * dashDist, -14, 14),
      ]
      p.dodgeTimer = DODGE_CD
      p.invulnTimer = INVULN
      state.dodgesUsed++
    }

    switch (action) {
      case 0: // approach
        doMove(dx, dz)
        p.facing = Math.atan2(dx, dz)
        // v2: 接近ボーナス (敵が遠いときのみ)
        if (nearDist > 3) reward += 0.1
        break

      case 1: // retreat
        doMove(-dx, -dz)
        // v2: 危険時の後退はボーナス
        if (nearDist < 2 && p.currentHp / p.maxHp < 0.4) reward += 0.3
        break

      case 2: // attack
        doAttack()
        break

      case 3: // dodge toward
        doDodge(dx, dz)
        break

      case 4: // dodge away
        doDodge(-dx, -dz)
        break

      case 5: // hit_and_run (v2新戦術: 攻撃してから後退)
        p.facing = Math.atan2(dx, dz)
        doAttack()
        doMove(-dx, -dz, 1.2) // 攻撃後に素早く後退
        break

      case 6: // circle_strafe (v2新戦術: 横移動しつつ接近)
        doMove(sx * 0.7 + dx * 0.3, sz * 0.7 + dz * 0.3)
        p.facing = Math.atan2(dx, dz)
        break

      case 7: // dodge_sideways (v2新戦術: 横回避)
        doDodge(sx, sz)
        break
    }
  }

  // v2: 時間ペナルティ (ダラダラ防止)
  reward -= 0.05

  // 死亡した敵を処理
  const alive = []
  for (const e of state.enemies) {
    if (e.currentHp <= 0) {
      state.enemiesKilled++
      reward += 15 // v2: キル報酬UP
      const item = rollLoot(state.floor)
      if (item) {
        state.lootDrops.push({ id: nextUid++, item, position: [...e.position], ttl: 15 })
      }
    } else {
      alive.push(e)
    }
  }
  state.enemies = alive

  // 敵AI更新
  for (const e of state.enemies) {
    if (e.hitTimer > 0) { e.hitTimer = Math.max(0, e.hitTimer - DT); continue }
    if (e.attackTimer > 0) { e.attackTimer = Math.max(0, e.attackTimer - DT); continue }

    const d = dist2D(e.position, p.position)
    if (d <= e.def.attackRange) {
      if (e.state !== 'attack') {
        e.state = 'attack'
        e.attackTimer = e.def.attackCooldown
        if (p.invulnTimer <= 0) {
          const dmg = Math.max(1, Math.round(e.attack * (0.8 + Math.random() * 0.4)))
          p.currentHp -= dmg
          state.totalDamageTaken += dmg
          // v2: HP割合に応じた被ダメペナルティ (体力低い時ほど重い)
          const hpRatio = p.currentHp / p.maxHp
          reward -= 3 + (hpRatio < 0.3 ? 5 : hpRatio < 0.5 ? 2 : 0)
        } else {
          state.dodgeSuccesses++
          reward += 4 // v2: 回避成功報酬UP
        }
      }
    } else {
      const [edx, edz] = dir2D(e.position, p.position)
      const ms = e.speed * DT
      e.position = [
        clamp(e.position[0] + edx * ms, -14, 14), 0,
        clamp(e.position[2] + edz * ms, -14, 14),
      ]
      e.state = 'chase'
    }
  }

  // ルート自動回収
  const newDrops = []
  for (const drop of state.lootDrops) {
    drop.ttl -= DT
    if (drop.ttl <= 0) continue
    if (dist2D(p.position, drop.position) < 1.5) {
      state.collectedItems.push(drop.item)
      if (drop.item.stat === 'attack') p.attack += drop.item.value
      else if (drop.item.stat === 'speed') p.speed += drop.item.value
      else if (drop.item.stat === 'maxHp') {
        p.maxHp += drop.item.value
        p.currentHp = Math.min(p.currentHp + drop.item.value, p.maxHp)
      }
      reward += 8 // v2: ルート報酬UP
    } else {
      newDrops.push(drop)
    }
  }
  state.lootDrops = newDrops

  // スポーン処理
  state.spawnTimer -= DT
  if (state.spawnTimer <= 0 && state.spawnQueue.length > 0) {
    const entry = state.spawnQueue[0]
    state.enemies.push(spawnEnemy(entry.enemyId, state.floor))
    entry.count--
    if (entry.count <= 0) state.spawnQueue.shift()
    state.spawnTimer = 0.6
  }

  // ウェーブ/フロア進行チェック
  let done = false
  let floorCleared = false
  if (state.enemies.length === 0 && state.spawnQueue.length === 0) {
    const nextWave = state.waveIndex + 1
    if (nextWave < state.waveDefs.length) {
      state.waveIndex = nextWave
      state.spawnQueue = state.waveDefs[nextWave].map(w => ({ ...w }))
      state.spawnTimer = 1.0
    } else {
      floorCleared = true
      // v2: フロアクリア報酬 = 残HP割合ボーナス
      const hpBonus = Math.round(20 * (p.currentHp / p.maxHp))
      reward += 25 + hpBonus
      // v2: フロア間で小回復
      p.currentHp = Math.min(p.maxHp, p.currentHp + Math.round(p.maxHp * FLOOR_HEAL_RATIO))
    }
  }

  if (p.currentHp <= 0) {
    // v2: 到達フロアに応じた死亡ペナルティ (早死にほど重い)
    reward -= 50 - state.floor * 3
    done = true
  }

  return { reward, done, floorCleared }
}

// ─── v2: 状態の離散化 (拡張版) ──────────────────────

function discretizeState(state) {
  const p = state.player
  const { enemy: nearest, dist: nearDist } = findNearest(p, state.enemies)

  // v2: より細かいバケット + 新特徴量
  const hpBucket = Math.min(5, Math.floor((p.currentHp / p.maxHp) * 6))   // 0-5
  const distBucket = nearest
    ? (nearDist < 1.5 ? 0 : nearDist < 3 ? 1 : nearDist < 5 ? 2 : nearDist < 8 ? 3 : 4)
    : 4
  const enemyCount = Math.min(4, state.enemies.length)                      // 0-4
  const canAttack = p.attackTimer <= 0 ? 1 : 0
  const canDodge = p.dodgeTimer <= 0 ? 1 : 0
  // v2: 脅威度 (近くに攻撃可能な敵がいるか)
  const threat = Math.min(2, threatLevel(p, state.enemies))                  // 0-2
  // v2: 最寄り敵がスタガー中か
  const nearStagger = (nearest && nearest.hitTimer > 0) ? 1 : 0
  // v2: フロアを3区間に
  const floorBucket = state.floor <= 3 ? 0 : state.floor <= 7 ? 1 : 2

  return `${hpBucket}_${distBucket}_${enemyCount}_${canAttack}_${canDodge}_${threat}_${nearStagger}_${floorBucket}`
}

// ─── v2: Double Q-Learning エージェント ──────────────

class DoubleQLearningAgent {
  constructor(lr = 0.15, gamma = 0.97, epsilon = 1.0, epsilonDecay = 0.99985, epsilonMin = 0.03) {
    this.q1 = new Map()
    this.q2 = new Map()
    this.lr = lr
    this.gamma = gamma
    this.epsilon = epsilon
    this.epsilonDecay = epsilonDecay
    this.epsilonMin = epsilonMin
    this.totalUpdates = 0
  }

  _getQ(table, state, action) { return table.get(`${state}|${action}`) || 0 }
  _setQ(table, state, action, value) { table.set(`${state}|${action}`, value) }

  getQ(state, action) {
    return (this._getQ(this.q1, state, action) + this._getQ(this.q2, state, action)) / 2
  }

  get qTableSize() { return new Set([...this.q1.keys(), ...this.q2.keys()]).size }

  chooseAction(state) {
    if (Math.random() < this.epsilon) {
      return Math.floor(Math.random() * NUM_ACTIONS)
    }
    return this.chooseBestAction(state)
  }

  chooseBestAction(state) {
    let bestAction = 0, bestQ = -Infinity
    for (let a = 0; a < NUM_ACTIONS; a++) {
      const q = this.getQ(state, a)
      if (q > bestQ) { bestQ = q; bestAction = a }
    }
    return bestAction
  }

  update(state, action, reward, nextState, done) {
    // Double Q-Learning: ランダムにどちらのテーブルを更新するか選ぶ
    const updateFirst = Math.random() < 0.5
    const primary = updateFirst ? this.q1 : this.q2
    const secondary = updateFirst ? this.q2 : this.q1

    const currentQ = this._getQ(primary, state, action)
    let target
    if (done) {
      target = reward
    } else {
      // primaryで最良アクションを選び、secondaryでその価値を評価
      let bestA = 0, bestQ = -Infinity
      for (let a = 0; a < NUM_ACTIONS; a++) {
        const q = this._getQ(primary, nextState, a)
        if (q > bestQ) { bestQ = q; bestA = a }
      }
      target = reward + this.gamma * this._getQ(secondary, nextState, bestA)
    }
    this._setQ(primary, state, action, currentQ + this.lr * (target - currentQ))
    this.totalUpdates++
  }

  decayEpsilon() {
    this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay)
  }
}

// ─── エピソード実行 ──────────────────────────────

function runEpisode(agent, greedy = false) {
  nextUid = 1
  const state = createGameState()
  let totalReward = 0
  let maxFloor = 1

  for (let floor = 1; floor <= 10; floor++) {
    state.floor = floor
    state.waveIndex = 0
    state.waveDefs = getWavesForFloor(floor)
    state.spawnQueue = state.waveDefs[0].map(w => ({ ...w }))
    state.spawnTimer = 0
    state.lootDrops = []

    for (let step = 0; step < MAX_STEPS; step++) {
      const sKey = discretizeState(state)
      const action = greedy ? agent.chooseBestAction(sKey) : agent.chooseAction(sKey)

      const { reward, done, floorCleared } = stepEnv(state, action)
      totalReward += reward

      const nextSKey = discretizeState(state)
      if (!greedy) {
        agent.update(sKey, action, reward, nextSKey, done)
      }

      if (done) return {
        floor, totalReward, killed: state.enemiesKilled,
        items: state.collectedItems.length, won: false,
        dmgTaken: state.totalDamageTaken, dmgDealt: state.totalDamageDealt,
        dodges: state.dodgesUsed, dodgeSuccesses: state.dodgeSuccesses,
      }
      if (floorCleared) { maxFloor = floor; break }
    }
  }

  return {
    floor: maxFloor, totalReward, killed: state.enemiesKilled,
    items: state.collectedItems.length, won: maxFloor >= 10,
    dmgTaken: state.totalDamageTaken, dmgDealt: state.totalDamageDealt,
    dodges: state.dodgesUsed, dodgeSuccesses: state.dodgeSuccesses,
  }
}

// ─── メイン ──────────────────────────────────

const TRAIN_EPISODES = 10000
const EVAL_EPISODES = 200
const PROGRESS_INTERVAL = 1000

console.log('═══════════════════════════════════════════════')
console.log('  ⚔️  ハクスラ 強化学習 v2 (Double Q-Learning)')
console.log('═══════════════════════════════════════════════')
console.log(`\n改良点:`)
console.log(`  - Double Q-Learning (過大評価防止)`)
console.log(`  - 新アクション: hit_and_run, circle_strafe, dodge_sideways`)
console.log(`  - 状態空間拡張: 脅威度, スタガー検知`)
console.log(`  - 報酬再設計: HP残量連動, 回避成功重視`)
console.log(`  - フロア間HP回復 (20%)`)
console.log(`  - 学習量 3倍 (${TRAIN_EPISODES}エピソード)`)
console.log(`\nアクション: ${ACTIONS.join(', ')}`)

const agent = new DoubleQLearningAgent()

// ─── 学習フェーズ ─────────────────────────────

console.log('\n── 学習フェーズ ──────────────────────────')

let batchWins = 0, batchFloors = 0, batchReward = 0

for (let ep = 1; ep <= TRAIN_EPISODES; ep++) {
  const result = runEpisode(agent)
  agent.decayEpsilon()

  batchWins += result.won ? 1 : 0
  batchFloors += result.floor
  batchReward += result.totalReward

  if (ep % PROGRESS_INTERVAL === 0) {
    const wr = ((batchWins / PROGRESS_INTERVAL) * 100).toFixed(1)
    const avgF = (batchFloors / PROGRESS_INTERVAL).toFixed(1)
    const avgR = (batchReward / PROGRESS_INTERVAL).toFixed(0)
    console.log(
      `  EP ${ep.toString().padStart(5)}  |  ε=${agent.epsilon.toFixed(3)}  |  勝率: ${wr.padStart(5)}%  |  平均Floor: ${avgF.padStart(5)}  |  平均報酬: ${avgR.padStart(7)}  |  Q-table: ${agent.qTableSize}`
    )
    batchWins = 0; batchFloors = 0; batchReward = 0
  }
}

console.log(`\n学習完了! Q-table エントリ数: ${agent.qTableSize}`)
console.log(`総更新回数: ${agent.totalUpdates.toLocaleString()}`)

// ─── 評価フェーズ ───────────────────────────────

console.log('\n── 評価フェーズ (greedy, 200回) ──────────────')

let evalWins = 0, evalFloors = 0, evalKills = 0, evalDmgTaken = 0, evalDmgDealt = 0
let evalDodges = 0, evalDodgeSuccesses = 0
const deathFloors = {}

for (let ep = 0; ep < EVAL_EPISODES; ep++) {
  const result = runEpisode(agent, true)
  if (result.won) evalWins++
  evalFloors += result.floor
  evalKills += result.killed
  evalDmgTaken += result.dmgTaken
  evalDmgDealt += result.dmgDealt
  evalDodges += result.dodges
  evalDodgeSuccesses += result.dodgeSuccesses
  if (!result.won) {
    deathFloors[result.floor] = (deathFloors[result.floor] || 0) + 1
  }
}

const avgFloor = (evalFloors / EVAL_EPISODES).toFixed(1)
const avgKills = (evalKills / EVAL_EPISODES).toFixed(1)
const avgDmgTaken = (evalDmgTaken / EVAL_EPISODES).toFixed(0)
const avgDmgDealt = (evalDmgDealt / EVAL_EPISODES).toFixed(0)
const dodgeRate = evalDodges > 0 ? ((evalDodgeSuccesses / evalDodges) * 100).toFixed(1) : '0'

console.log(`\n╔════════════════════════════════════════════════╗`)
console.log(`║            評価結果 (${EVAL_EPISODES}回)                   ║`)
console.log(`╠════════════════════════════════════════════════╣`)
console.log(`║   勝率:         ${evalWins}/${EVAL_EPISODES} (${Math.round(evalWins / EVAL_EPISODES * 100)}%)`)
console.log(`║   平均到達階:   ${avgFloor}F`)
console.log(`║   平均撃破数:   ${avgKills}`)
console.log(`║   平均与ダメ:   ${avgDmgDealt}`)
console.log(`║   平均被ダメ:   ${avgDmgTaken}`)
console.log(`║   回避成功率:   ${dodgeRate}% (${evalDodgeSuccesses}/${evalDodges})`)
console.log(`╠════════════════════════════════════════════════╣`)
console.log(`║   死亡階分布:`)
for (const [fl, count] of Object.entries(deathFloors).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  const bar = '█'.repeat(Math.ceil(count * 40 / EVAL_EPISODES))
  console.log(`║     ${fl.toString().padStart(2)}F: ${bar} (${count})`)
}
console.log(`╚════════════════════════════════════════════════╝`)

// ─── 学習済みポリシー可視化 ─────────────────────

console.log('\n── 学習済みポリシー (代表状態) ──────────────')
console.log('  HP/距離/敵数/攻撃/回避/脅威/ｽﾀｶﾞｰ/階層')

const sampleStates = [
  ['5_0_1_1_1_1_0_0', '満タン, 密着, 1体, 全可, 脅威1, 序盤'],
  ['5_1_1_1_1_0_0_0', '満タン, 近距離, 1体, 脅威なし, 序盤'],
  ['5_3_1_1_1_0_0_0', '満タン, 遠距離, 1体, 全可, 序盤'],
  ['3_0_2_1_1_2_0_1', '半分, 密着, 2体, 脅威2, 中盤'],
  ['1_0_1_1_1_1_0_1', '瀕死, 密着, 1体, 脅威1, 中盤'],
  ['5_0_1_1_1_0_1_0', '満タン, 密着, スタガー中, 序盤'],
  ['5_0_1_0_1_1_0_0', '満タン, 密着, 攻撃CD中, 脅威1, 序盤'],
  ['2_0_1_1_0_1_0_2', 'HP低, 密着, 回避CD中, 脅威1, 終盤'],
  ['5_2_1_1_1_0_0_2', '満タン, 中距離, 脅威なし, 終盤'],
  ['4_1_3_1_1_2_0_1', 'やや減, 近距離, 3体, 脅威2, 中盤'],
]

for (const [sKey, desc] of sampleStates) {
  const bestA = agent.chooseBestAction(sKey)
  const qVals = []
  for (let a = 0; a < NUM_ACTIONS; a++) {
    const q = agent.getQ(sKey, a)
    qVals.push(`${ACTIONS[a].slice(0, 6)}:${q.toFixed(1)}`)
  }
  console.log(`  ${desc}`)
  console.log(`    → ${ACTIONS[bestA].toUpperCase()}`)
  console.log(`      [${qVals.join(', ')}]`)
}

// ─── 詳細ログ付き1ゲーム ─────────────────────────

console.log('\n\n── 詳細プレイログ (1ゲーム分) ─────────────')

{
  nextUid = 1
  const state = createGameState()

  for (let floor = 1; floor <= 10; floor++) {
    state.floor = floor
    state.waveIndex = 0
    state.waveDefs = getWavesForFloor(floor)
    state.spawnQueue = state.waveDefs[0].map(w => ({ ...w }))
    state.spawnTimer = 0
    state.lootDrops = []

    const p = state.player
    const startHp = p.currentHp
    console.log(`\n${'─'.repeat(55)}`)
    console.log(`📍 ${floor}F  | HP: ${p.currentHp}/${p.maxHp} | ATK: ${p.attack} | SPD: ${p.speed.toFixed(1)}`)

    let stepCount = 0
    let floorDone = false
    const actionCounts = {}
    let floorDmgTaken = 0
    let floorDmgDealt = 0
    const prevDealt = state.totalDamageDealt
    const prevTaken = state.totalDamageTaken

    for (let step = 0; step < MAX_STEPS && !floorDone; step++) {
      stepCount++
      const sKey = discretizeState(state)
      const action = agent.chooseBestAction(sKey)
      actionCounts[ACTIONS[action]] = (actionCounts[ACTIONS[action]] || 0) + 1

      const { done, floorCleared } = stepEnv(state, action)

      if (done) {
        floorDmgDealt = state.totalDamageDealt - prevDealt
        floorDmgTaken = state.totalDamageTaken - prevTaken
        console.log(`   💀 死亡! (${stepCount}step, ${state.enemiesKilled}体撃破, 与${floorDmgDealt}/被${floorDmgTaken})`)
        const sorted = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])
        console.log(`   行動: ${sorted.map(([a, c]) => `${a}:${c}`).join(' ')}`)
        floorDone = true
        break
      }
      if (floorCleared) {
        floorDmgDealt = state.totalDamageDealt - prevDealt
        floorDmgTaken = state.totalDamageTaken - prevTaken
        const hpDelta = p.currentHp - startHp
        const hpSign = hpDelta >= 0 ? '+' : ''
        console.log(`   ✅ クリア! (${stepCount}step, HP${hpSign}${hpDelta}, 与${floorDmgDealt}/被${floorDmgTaken})`)
        const sorted = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])
        console.log(`   行動: ${sorted.map(([a, c]) => `${a}:${c}`).join(' ')}`)
        if (state.collectedItems.length > 0) {
          const recent = state.collectedItems.slice(-3)
          console.log(`   戦利品: ${recent.map(i => `${i.emoji}${i.name}`).join(' ')}`)
        }
        floorDone = true
      }
    }

    if (p.currentHp <= 0) break
    if (floor === 10 && p.currentHp > 0) {
      console.log(`\n╔═══════════════════════════════════════════════╗`)
      console.log(`║   🏆 VICTORY! 全10フロア制覇！                ║`)
      console.log(`║   撃破数: ${state.enemiesKilled}  アイテム: ${state.collectedItems.length}`)
      console.log(`║   総与ダメ: ${state.totalDamageDealt}  総被ダメ: ${state.totalDamageTaken}`)
      console.log(`║   回避: ${state.dodgeSuccesses}/${state.dodgesUsed}`)
      console.log(`╚═══════════════════════════════════════════════╝`)
    }
  }
}
