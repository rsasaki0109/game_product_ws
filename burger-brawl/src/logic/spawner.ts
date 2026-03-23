import type { CustomerInstance, CustomerDef } from '../types/game.ts'
import { randomNormal, randomMonster, getGoldenCustomer } from '../data/customers.ts'
import { getNextUid } from './ids.ts'

export function spawnCustomer(elapsed: number, occupiedLanes: number[], forceMonster = false, forceGolden = false): CustomerInstance | null {
  // Monster chance: 0% for first 15s, then 10% ramping to 50%
  let monsterChance = 0
  if (elapsed > 15) {
    monsterChance = Math.min(0.5, 0.10 + (elapsed - 15) * 0.003)
  }
  const isMonster = forceMonster || (!forceGolden && Math.random() < monsterChance)
  let def: CustomerDef
  if (forceGolden && !isMonster) {
    def = getGoldenCustomer()
  } else if (isMonster) {
    def = randomMonster()
  } else {
    def = randomNormal()
  }

  // Pick a free lane (0-4)
  const freeLanes = [0, 1, 2, 3, 4].filter(l => !occupiedLanes.includes(l))
  if (freeLanes.length === 0) return null
  const lane = freeLanes[Math.floor(Math.random() * freeLanes.length)]

  return {
    uid: getNextUid(),
    def,
    position: lane,
    distance: 12,
    currentHp: def.hp,
    patienceTimer: def.patience,
    state: 'approaching',
    serveTimer: 0,
    hitFlash: 0,
  }
}
