import type { DiceRollResult, ComboResult, FaceSymbol } from '../types/dice.ts'

export function detectCombos(results: DiceRollResult[]): ComboResult[] {
  const counts = new Map<FaceSymbol, number>()
  for (const r of results) {
    if (r.face.symbol === 'blank') continue
    counts.set(r.face.symbol, (counts.get(r.face.symbol) ?? 0) + 1)
  }

  const combos: ComboResult[] = []
  for (const [symbol, count] of counts) {
    if (count < 2) continue

    if (count === 2) {
      combos.push(makeTwoCombo(symbol))
    } else {
      combos.push(makeTripleCombo(symbol))
    }
  }
  return combos
}

function makeTwoCombo(symbol: FaceSymbol): ComboResult {
  const base: ComboResult = { symbol, count: 2, bonusLabel: '', bonusDamage: 0, bonusShield: 0, bonusHeal: 0 }
  switch (symbol) {
    case 'attack':
    case 'doubleStrike':
      base.bonusLabel = '連撃ボーナス'
      base.bonusDamage = 2
      break
    case 'shield':
      base.bonusLabel = '堅守ボーナス'
      base.bonusShield = 2
      break
    case 'heal':
    case 'vampiric':
      base.bonusLabel = '治癒ボーナス'
      base.bonusHeal = 2
      break
    case 'fire':
      base.bonusLabel = '炎上ボーナス'
      base.bonusDamage = 3
      break
    case 'lightning':
      base.bonusLabel = '帯電ボーナス'
      base.bonusDamage = 3
      break
    case 'poison':
      base.bonusLabel = '猛毒ボーナス'
      base.bonusDamage = 2
      break
    case 'thorns':
      base.bonusLabel = '棘鎧ボーナス'
      base.bonusShield = 2
      break
    default:
      break
  }
  return base
}

function makeTripleCombo(symbol: FaceSymbol): ComboResult {
  const base: ComboResult = { symbol, count: 3, bonusLabel: '', bonusDamage: 0, bonusShield: 0, bonusHeal: 0 }
  switch (symbol) {
    case 'attack':
    case 'doubleStrike':
      base.bonusLabel = '必殺一撃！'
      base.bonusDamage = 8
      break
    case 'shield':
      base.bonusLabel = '鉄壁！'
      base.bonusShield = 8
      break
    case 'heal':
      base.bonusLabel = '完全回復！'
      base.bonusHeal = 99
      break
    case 'vampiric':
      base.bonusLabel = '血の宴！'
      base.bonusDamage = 6
      base.bonusHeal = 6
      break
    case 'fire':
      base.bonusLabel = '業火！'
      base.bonusDamage = 10
      break
    case 'lightning':
      base.bonusLabel = '雷神！'
      base.bonusDamage = 12
      break
    case 'poison':
      base.bonusLabel = '死の毒霧！'
      base.bonusDamage = 8
      break
    case 'thorns':
      base.bonusLabel = '茨の鎧！'
      base.bonusShield = 6
      base.bonusDamage = 4
      break
    default:
      break
  }
  return base
}
