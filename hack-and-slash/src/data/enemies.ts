import type { EnemyDef } from '../types/game.ts'

export const ENEMIES: EnemyDef[] = [
  {
    id: 'goblin',
    name: 'Goblin',
    color: '#4a8c3f',
    baseHp: 15,
    baseAttack: 3,
    baseSpeed: 5,
    attackRange: 1.8,
    attackCooldown: 1.0,
    scale: 0.5,
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    color: '#c8c8c8',
    baseHp: 25,
    baseAttack: 5,
    baseSpeed: 4,
    attackRange: 2.0,
    attackCooldown: 1.2,
    scale: 0.6,
  },
  {
    id: 'orc',
    name: 'Orc',
    color: '#8b5c2a',
    baseHp: 40,
    baseAttack: 8,
    baseSpeed: 3,
    attackRange: 2.2,
    attackCooldown: 1.5,
    scale: 0.8,
  },
  {
    id: 'dark_knight',
    name: 'Dark Knight',
    color: '#4a1a6b',
    baseHp: 80,
    baseAttack: 10,
    baseSpeed: 4,
    attackRange: 2.5,
    attackCooldown: 1.0,
    scale: 1.0,
  },
]

export function getEnemyDef(id: string): EnemyDef {
  const def = ENEMIES.find(e => e.id === id)
  if (!def) throw new Error(`Unknown enemy: ${id}`)
  return def
}
