import type { CustomerDef, OrderItem } from '../types/game.ts'

export const NORMAL_CUSTOMERS: CustomerDef[] = [
  { type: 'normal', name: 'Customer', color: '#60a5fa', hp: 1, speed: 2, order: 'burger', patience: 10, score: 8, emoji: '👤' },
  { type: 'normal', name: 'Hungry Kid', color: '#a78bfa', hp: 1, speed: 2.5, order: 'fries', patience: 8, score: 12, emoji: '👦' },
  { type: 'normal', name: 'Office Worker', color: '#34d399', hp: 1, speed: 1.8, order: 'combo', patience: 12, score: 15, emoji: '👔' },
  { type: 'normal', name: 'Tourist', color: '#fbbf24', hp: 1, speed: 1.5, order: 'drink', patience: 14, score: 8, emoji: '🧳' },
]

export const MONSTERS: CustomerDef[] = [
  { type: 'monster', monsterKind: 'karenzilla', name: 'Karenzilla', color: '#ef4444', hp: 5, speed: 1.5, patience: 4.5, score: 30, emoji: '👹' },
  { type: 'monster', monsterKind: 'creamthrower', name: 'Cream Thrower', color: '#f97316', hp: 3, speed: 2.5, patience: 3.5, score: 25, emoji: '🤡' },
  { type: 'monster', monsterKind: 'tableflip', name: 'Table Flipper', color: '#dc2626', hp: 7, speed: 1, patience: 5.5, score: 40, emoji: '👺' },
  { type: 'monster', monsterKind: 'screamking', name: 'Scream King', color: '#7c3aed', hp: 6, speed: 1.8, patience: 2.5, score: 50, emoji: '😈' },
]

/** Golden customer: serving them gives +1 ammo or +1 life */
const GOLDEN_ORDERS: OrderItem[] = ['burger', 'fries', 'drink', 'combo']

export const GOLDEN_CUSTOMER: CustomerDef = {
  type: 'normal',
  name: 'Golden Customer',
  color: '#fbbf24',
  hp: 1,
  speed: 2.2,
  order: GOLDEN_ORDERS[Math.floor(Math.random() * GOLDEN_ORDERS.length)],
  patience: 8,
  score: 25,
  emoji: '⭐',
}

// Re-randomize golden customer order each time it's accessed via a function
export function getGoldenCustomer(): CustomerDef {
  return {
    ...GOLDEN_CUSTOMER,
    order: GOLDEN_ORDERS[Math.floor(Math.random() * GOLDEN_ORDERS.length)],
  }
}

export function randomNormal(): CustomerDef {
  return NORMAL_CUSTOMERS[Math.floor(Math.random() * NORMAL_CUSTOMERS.length)]
}

export function randomMonster(): CustomerDef {
  return MONSTERS[Math.floor(Math.random() * MONSTERS.length)]
}
