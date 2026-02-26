import type { Die, DiceRollResult } from '../types/dice.ts'

export function rollDice(dice: Die[]): DiceRollResult[] {
  return dice.map(die => {
    const idx = Math.floor(Math.random() * 6)
    return {
      dieId: die.id,
      rolledFaceIndex: idx,
      face: die.faces[idx],
    }
  })
}
