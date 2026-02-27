import type { LootOption } from '../types/loot.ts'
import type { DieFace } from '../types/dice.ts'
import { LOOT_POOL, getFacesByRarity } from '../data/faces.ts'

let lootId = 0

export function generateLootOptions(floor: number): LootOption[] {
  const options: LootOption[] = []

  // Always offer a face upgrade
  options.push(generateFaceUpgrade(floor))

  // Second: face upgrade or heal
  if (Math.random() < 0.5) {
    options.push(generateFaceUpgrade(floor))
  } else {
    options.push(generateHeal(floor))
  }

  // Third: heal or max HP up
  if (Math.random() < 0.6) {
    options.push(generateHeal(floor))
  } else {
    options.push(generateMaxHpUp())
  }

  return options
}

function generateFaceUpgrade(floor: number): LootOption {
  const face = pickFaceByFloor(floor)
  return {
    id: `loot-${++lootId}`,
    type: 'face_upgrade',
    label: face.label,
    description: `サイコロの面を「${face.label}」に入れ替える`,
    emoji: face.emoji,
    face,
  }
}

function generateHeal(floor: number): LootOption {
  const amount = Math.round(8 + floor * 2)
  return {
    id: `loot-${++lootId}`,
    type: 'heal',
    label: `HP回復 +${amount}`,
    description: `HPを${amount}回復する`,
    emoji: '💚',
    healAmount: amount,
  }
}

function generateMaxHpUp(): LootOption {
  return {
    id: `loot-${++lootId}`,
    type: 'max_hp_up',
    label: '最大HP +5',
    description: '最大HPが5増加する',
    emoji: '💖',
    hpIncrease: 5,
  }
}

function pickFaceByFloor(floor: number): DieFace {
  const roll = Math.random()
  let rarity: DieFace['rarity']

  if (floor >= 12 && roll < 0.15) rarity = 'legendary'
  else if (floor >= 7 && roll < 0.30) rarity = 'rare'
  else if (floor >= 3 && roll < 0.55) rarity = 'uncommon'
  else rarity = 'common'

  let pool = getFacesByRarity(rarity)
  if (pool.length === 0) pool = LOOT_POOL

  return pool[Math.floor(Math.random() * pool.length)]
}
