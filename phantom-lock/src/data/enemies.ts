import type { EnemyDef, EnemyType } from '../types/game.ts'

export const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  drone:  { type: 'drone',  name: 'Drone',  hp: 12,  speed: 8,  damage: 5,  attackCooldown: 3.0, attackRange: 6,  scale: 0.4, color: '#22d3ee', emissive: '#0891b2', lockPoints: 1, score: 100 },
  turret: { type: 'turret', name: 'Turret', hp: 25,  speed: 0,  damage: 5,  attackCooldown: 1.2, attackRange: 16, scale: 0.6, color: '#f97316', emissive: '#ea580c', lockPoints: 1, score: 200 },
  heavy:  { type: 'heavy',  name: 'Heavy',  hp: 45,  speed: 3,  damage: 8,  attackCooldown: 3.0, attackRange: 12, scale: 0.9, color: '#a855f7', emissive: '#7c3aed', lockPoints: 1, score: 350 },
  boss:   { type: 'boss',   name: 'Boss',   hp: 120, speed: 2,  damage: 15, attackCooldown: 2.5, attackRange: 15, scale: 1.5, color: '#ef4444', emissive: '#dc2626', lockPoints: 3, score: 1000 },
}

export function getEnemyDef(type: EnemyType): EnemyDef { return ENEMY_DEFS[type] }
