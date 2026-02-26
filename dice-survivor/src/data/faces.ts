import type { DieFace } from '../types/dice.ts'

export const FACES: Record<string, DieFace> = {
  'attack-1': { id: 'attack-1', symbol: 'attack', value: 1, label: '攻撃+1', emoji: '⚔️', rarity: 'common', description: '1ダメージを与える' },
  'attack-2': { id: 'attack-2', symbol: 'attack', value: 2, label: '攻撃+2', emoji: '⚔️', rarity: 'common', description: '2ダメージを与える' },
  'attack-3': { id: 'attack-3', symbol: 'attack', value: 3, label: '攻撃+3', emoji: '⚔️', rarity: 'uncommon', description: '3ダメージを与える' },
  'attack-5': { id: 'attack-5', symbol: 'attack', value: 5, label: '攻撃+5', emoji: '⚔️', rarity: 'rare', description: '5ダメージを与える' },
  'attack-7': { id: 'attack-7', symbol: 'attack', value: 7, label: '攻撃+7', emoji: '⚔️', rarity: 'legendary', description: '7ダメージを与える' },

  'shield-1': { id: 'shield-1', symbol: 'shield', value: 1, label: '防御+1', emoji: '🛡️', rarity: 'common', description: '1ブロックを得る' },
  'shield-2': { id: 'shield-2', symbol: 'shield', value: 2, label: '防御+2', emoji: '🛡️', rarity: 'common', description: '2ブロックを得る' },
  'shield-3': { id: 'shield-3', symbol: 'shield', value: 3, label: '防御+3', emoji: '🛡️', rarity: 'uncommon', description: '3ブロックを得る' },
  'shield-5': { id: 'shield-5', symbol: 'shield', value: 5, label: '防御+5', emoji: '🛡️', rarity: 'rare', description: '5ブロックを得る' },

  'heal-1': { id: 'heal-1', symbol: 'heal', value: 1, label: '回復+1', emoji: '❤️', rarity: 'common', description: 'HPを1回復' },
  'heal-2': { id: 'heal-2', symbol: 'heal', value: 2, label: '回復+2', emoji: '❤️', rarity: 'uncommon', description: 'HPを2回復' },
  'heal-3': { id: 'heal-3', symbol: 'heal', value: 3, label: '回復+3', emoji: '❤️', rarity: 'rare', description: 'HPを3回復' },

  'poison-2': { id: 'poison-2', symbol: 'poison', value: 2, label: '毒+2', emoji: '💀', rarity: 'uncommon', description: '2ターンの間、毎ターン2ダメージ' },
  'poison-3': { id: 'poison-3', symbol: 'poison', value: 3, label: '毒+3', emoji: '💀', rarity: 'rare', description: '3ターンの間、毎ターン3ダメージ' },

  'fire-3': { id: 'fire-3', symbol: 'fire', value: 3, label: '炎+3', emoji: '🔥', rarity: 'uncommon', description: '3ダメージ+1ターン燃焼' },
  'fire-5': { id: 'fire-5', symbol: 'fire', value: 5, label: '炎+5', emoji: '🔥', rarity: 'rare', description: '5ダメージ+2ターン燃焼' },

  'lightning-4': { id: 'lightning-4', symbol: 'lightning', value: 4, label: '雷+4', emoji: '⚡', rarity: 'rare', description: '4ダメージ（防御無視）' },
  'lightning-6': { id: 'lightning-6', symbol: 'lightning', value: 6, label: '雷+6', emoji: '⚡', rarity: 'legendary', description: '6ダメージ（防御無視）' },

  'doubleStrike-3': { id: 'doubleStrike-3', symbol: 'doubleStrike', value: 3, label: '二連撃+3', emoji: '⚔️⚔️', rarity: 'rare', description: '3ダメージを2回与える' },

  'vampiric-2': { id: 'vampiric-2', symbol: 'vampiric', value: 2, label: '吸血+2', emoji: '🦇', rarity: 'rare', description: '2ダメージ+HP2回復' },
  'vampiric-4': { id: 'vampiric-4', symbol: 'vampiric', value: 4, label: '吸血+4', emoji: '🦇', rarity: 'legendary', description: '4ダメージ+HP4回復' },

  'thorns-2': { id: 'thorns-2', symbol: 'thorns', value: 2, label: '棘+2', emoji: '🌿', rarity: 'uncommon', description: '敵が攻撃時に2反射ダメージ' },

  'blank': { id: 'blank', symbol: 'blank', value: 0, label: '空白', emoji: '⬜', rarity: 'common', description: '何も起きない' },
}

export const LOOT_POOL = Object.values(FACES).filter(f => f.id !== 'blank')

export function getFacesByRarity(rarity: DieFace['rarity']): DieFace[] {
  return LOOT_POOL.filter(f => f.rarity === rarity)
}
