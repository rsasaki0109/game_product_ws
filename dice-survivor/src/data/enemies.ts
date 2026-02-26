import type { EnemyDef } from '../types/enemy.ts'

export const ENEMIES: EnemyDef[] = [
  {
    id: 'slime',
    name: 'スライム',
    emoji: '🟢',
    baseHp: 12,
    baseAttack: 3,
    intentPattern: ['attack', 'attack', 'defend'],
    isBoss: false,
    description: 'ぷるぷるした緑の塊',
  },
  {
    id: 'bat',
    name: 'コウモリ',
    emoji: '🦇',
    baseHp: 8,
    baseAttack: 4,
    intentPattern: ['attack', 'attack', 'attack'],
    isBoss: false,
    description: '素早く連続攻撃してくる',
  },
  {
    id: 'skeleton',
    name: 'スケルトン',
    emoji: '💀',
    baseHp: 18,
    baseAttack: 4,
    intentPattern: ['attack', 'defend', 'attack', 'buff'],
    isBoss: false,
    description: '骨の戦士。たまに強化する',
  },
  {
    id: 'golem',
    name: 'ゴーレム',
    emoji: '🗿',
    baseHp: 30,
    baseAttack: 6,
    intentPattern: ['defend', 'defend', 'attack'],
    isBoss: false,
    description: '硬い岩の巨人。防御が厚い',
  },
  {
    id: 'dark_mage',
    name: 'ダークメイジ',
    emoji: '🧙',
    baseHp: 15,
    baseAttack: 5,
    intentPattern: ['special', 'attack', 'buff', 'attack'],
    isBoss: false,
    description: '闇魔法を操る魔術師',
  },
]

export const BOSSES: EnemyDef[] = [
  {
    id: 'king_slime',
    name: 'キングスライム',
    emoji: '👑',
    baseHp: 40,
    baseAttack: 5,
    intentPattern: ['attack', 'attack', 'buff', 'attack', 'attack', 'defend'],
    isBoss: true,
    description: 'スライムの王。連打が痛い',
  },
  {
    id: 'dragon',
    name: 'ドラゴン',
    emoji: '🐉',
    baseHp: 60,
    baseAttack: 7,
    intentPattern: ['attack', 'defend', 'special', 'attack', 'attack'],
    isBoss: true,
    description: '火を吐く古竜',
  },
  {
    id: 'death_knight',
    name: 'デスナイト',
    emoji: '⚫',
    baseHp: 80,
    baseAttack: 8,
    intentPattern: ['attack', 'special', 'attack', 'buff', 'attack', 'attack'],
    isBoss: true,
    description: '最強の死の騎士。呪いで面を封じる',
  },
]

export function getEnemiesForFloor(floor: number): EnemyDef[] {
  if (floor <= 3) return ENEMIES.filter(e => e.id === 'slime' || e.id === 'bat')
  if (floor <= 6) return ENEMIES.filter(e => e.id !== 'dark_mage')
  if (floor <= 10) return ENEMIES
  return ENEMIES.filter(e => e.id === 'skeleton' || e.id === 'golem' || e.id === 'dark_mage')
}

export function getBossForFloor(floor: number): EnemyDef | null {
  if (floor === 5) return BOSSES[0]
  if (floor === 10) return BOSSES[1]
  if (floor === 15) return BOSSES[2]
  return null
}
