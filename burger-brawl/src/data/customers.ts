import type { CustomerDef } from '../types/game.ts'

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

export function randomNormal(): CustomerDef {
  return NORMAL_CUSTOMERS[Math.floor(Math.random() * NORMAL_CUSTOMERS.length)]
}

export function randomMonster(): CustomerDef {
  return MONSTERS[Math.floor(Math.random() * MONSTERS.length)]
}
