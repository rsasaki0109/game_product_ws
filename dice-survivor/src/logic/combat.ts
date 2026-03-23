import type { DiceRollResult, ComboResult } from '../types/dice.ts'
import type { EnemyInstance, StatusEffect } from '../types/enemy.ts'
import type { PlayerState } from '../types/player.ts'
import type { TurnState } from '../types/game.ts'

export interface ResolveResult {
  player: PlayerState
  enemy: EnemyInstance
  turn: TurnState
}

export function resolvePlayerTurn(
  results: DiceRollResult[],
  combos: ComboResult[],
  player: PlayerState,
  enemy: EnemyInstance,
): ResolveResult {
  const log: string[] = []
  let totalDamage = 0
  let totalShield = 0
  let totalHeal = 0
  let thornsValue = 0

  const newPlayer = { ...player, statusEffects: [...player.statusEffects] }
  const newEnemy: EnemyInstance = {
    ...enemy,
    statusEffects: [...enemy.statusEffects],
  }

  // Decay enemy shield at the start of each player turn
  newEnemy.shield = Math.floor(newEnemy.shield * 0.5)

  // Sum base face values
  for (const r of results) {
    const { face } = r
    switch (face.symbol) {
      case 'attack':
        totalDamage += face.value
        break
      case 'shield':
        totalShield += face.value
        break
      case 'heal':
        totalHeal += face.value
        break
      case 'fire':
        totalDamage += face.value
        addStatus(newEnemy.statusEffects, 'burn', face.value > 3 ? 2 : 1)
        break
      case 'lightning':
        totalDamage += face.value // ignores shield, handled below
        break
      case 'poison':
        addStatus(newEnemy.statusEffects, 'poison', face.value)
        log.push(`💀 毒を${face.value}付与！`)
        break
      case 'doubleStrike':
        totalDamage += face.value * 2
        break
      case 'vampiric':
        totalDamage += face.value
        totalHeal += face.value
        break
      case 'thorns':
        thornsValue += face.value
        totalShield += 1
        break
      case 'blank':
        break
    }
  }

  // Add combo bonuses
  for (const c of combos) {
    totalDamage += c.bonusDamage
    totalShield += c.bonusShield
    totalHeal += c.bonusHeal
    if (c.bonusLabel) {
      log.push(`✨ ${c.bonusLabel}`)
    }
  }

  // Apply shield to player
  newPlayer.shield = totalShield
  if (totalShield > 0) log.push(`🛡️ 防御+${totalShield}`)

  // Apply heal
  if (totalHeal > 0) {
    const actualHeal = Math.min(totalHeal, newPlayer.maxHp - newPlayer.currentHp)
    newPlayer.currentHp += actualHeal
    if (actualHeal > 0) log.push(`❤️ HP${actualHeal}回復`)
  }

  // Apply damage to enemy
  if (totalDamage > 0) {
    // Lightning ignores shield
    const lightningDmg = results
      .filter(r => r.face.symbol === 'lightning')
      .reduce((s, r) => s + r.face.value, 0)
    const normalDmg = totalDamage - lightningDmg

    const blockedDmg = Math.max(0, normalDmg - newEnemy.shield)
    const actualDmg = blockedDmg + lightningDmg
    newEnemy.shield = Math.max(0, newEnemy.shield - normalDmg)
    newEnemy.currentHp = Math.max(0, newEnemy.currentHp - actualDmg)
    log.push(`⚔️ ${actualDmg}ダメージ！`)
  }

  // Apply enemy status effects (poison/burn tick)
  let statusDmg = 0
  newEnemy.statusEffects = newEnemy.statusEffects
    .map(se => {
      if (se.type === 'poison' || se.type === 'burn') {
        statusDmg += se.stacks
        return { ...se, turnsRemaining: se.turnsRemaining - 1 }
      }
      return { ...se, turnsRemaining: se.turnsRemaining - 1 }
    })
    .filter(se => se.turnsRemaining > 0)

  if (statusDmg > 0) {
    newEnemy.currentHp = Math.max(0, newEnemy.currentHp - statusDmg)
    log.push(`🔥 状態異常で${statusDmg}ダメージ！`)
  }

  // Store thorns for enemy turn
  if (thornsValue > 0) {
    addStatus(newPlayer.statusEffects, 'strength', thornsValue, 1)
  }

  return {
    player: newPlayer,
    enemy: newEnemy,
    turn: {
      rollResults: results,
      combos,
      totalDamage,
      totalShield,
      totalHeal,
      log,
    },
  }
}

export function executeEnemyTurn(
  player: PlayerState,
  enemy: EnemyInstance,
): { player: PlayerState; enemy: EnemyInstance; log: string[] } {
  const log: string[] = []
  const newPlayer = { ...player, statusEffects: [...player.statusEffects] }
  const newEnemy = { ...enemy }

  const intent = enemy.currentIntent

  switch (intent.type) {
    case 'attack': {
      const dmg = intent.value
      const blocked = Math.min(dmg, newPlayer.shield)
      const actual = dmg - blocked
      newPlayer.shield = Math.max(0, newPlayer.shield - dmg)
      newPlayer.currentHp = Math.max(0, newPlayer.currentHp - actual)
      log.push(`${enemy.def.emoji} ${enemy.def.name}の攻撃！ ${actual}ダメージ${blocked > 0 ? `（${blocked}ブロック）` : ''}`)

      // thorns reflect (stored as strength status)
      const thorns = newPlayer.statusEffects.find(s => s.type === 'strength')
      if (thorns && thorns.stacks > 0) {
        newEnemy.currentHp = Math.max(0, newEnemy.currentHp - thorns.stacks)
        log.push(`🌿 棘で${thorns.stacks}反射ダメージ！`)
      }
      break
    }
    case 'defend':
      newEnemy.shield += intent.value
      log.push(`${enemy.def.emoji} ${enemy.def.name}は防御態勢（+${intent.value}）`)
      break
    case 'buff':
      newEnemy.attack = Math.round(newEnemy.attack * 1.15)
      log.push(`${enemy.def.emoji} ${enemy.def.name}の攻撃力が上がった！`)
      break
    case 'special':
      if (enemy.def.id === 'dragon') {
        const dmg = Math.round(intent.value * 1.5)
        const actual = Math.max(0, dmg - newPlayer.shield)
        newPlayer.shield = Math.max(0, newPlayer.shield - dmg)
        newPlayer.currentHp = Math.max(0, newPlayer.currentHp - actual)
        addStatus(newPlayer.statusEffects, 'burn', 2, 2)
        log.push(`🐉 ドラゴンブレス！${actual}ダメージ+燃焼！`)
      } else if (enemy.def.id === 'death_knight') {
        // Curse: set a random die face to blank
        log.push(`⚫ デスナイトの呪い！ サイコロの面が封じられた！`)
      } else {
        const dmg = intent.value
        const actual = Math.max(0, dmg - newPlayer.shield)
        newPlayer.shield = Math.max(0, newPlayer.shield - dmg)
        newPlayer.currentHp = Math.max(0, newPlayer.currentHp - actual)
        log.push(`✨ ${enemy.def.name}の特殊攻撃！${actual}ダメージ`)
      }
      break
  }

  // Reset player shield after enemy turn
  newPlayer.shield = 0

  // Decrement player status effects
  newPlayer.statusEffects = newPlayer.statusEffects
    .map(se => ({ ...se, turnsRemaining: se.turnsRemaining - 1 }))
    .filter(se => se.turnsRemaining > 0)

  // Advance enemy intent
  const nextIndex = (enemy.intentIndex + 1) % enemy.def.intentPattern.length
  newEnemy.intentIndex = nextIndex
  newEnemy.currentIntent = resolveEnemyIntent(enemy.def.intentPattern[nextIndex], newEnemy.attack)

  return { player: newPlayer, enemy: newEnemy, log }
}

function resolveEnemyIntent(type: string, attack: number) {
  switch (type) {
    case 'attack':
      return { type: 'attack' as const, value: attack, label: `攻撃 ${attack}`, emoji: '⚔️' }
    case 'defend':
      return { type: 'defend' as const, value: Math.round(attack * 0.8), label: `防御`, emoji: '🛡️' }
    case 'buff':
      return { type: 'buff' as const, value: 0, label: '強化', emoji: '💪' }
    case 'special':
      return { type: 'special' as const, value: attack, label: '特殊攻撃', emoji: '⭐' }
    default:
      return { type: 'attack' as const, value: attack, label: `攻撃 ${attack}`, emoji: '⚔️' }
  }
}

function addStatus(effects: StatusEffect[], type: StatusEffect['type'], stacks: number, turns = 3) {
  const existing = effects.find(e => e.type === type)
  if (existing) {
    existing.stacks += stacks
    existing.turnsRemaining = Math.max(existing.turnsRemaining, turns)
  } else {
    effects.push({ type, stacks, turnsRemaining: turns })
  }
}

export { resolveEnemyIntent }
