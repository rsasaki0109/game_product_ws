import type { Die } from '../types/dice.ts'
import { FACES } from './faces.ts'

const f = FACES

export function createStarterDice(): [Die, Die, Die] {
  return [
    {
      id: 'die-0',
      color: '#e05555',
      faces: [f['attack-2'], f['attack-2'], f['attack-1'], f['shield-2'], f['shield-1'], f['heal-1']],
    },
    {
      id: 'die-1',
      color: '#4488dd',
      faces: [f['attack-2'], f['attack-1'], f['shield-2'], f['shield-1'], f['shield-1'], f['heal-1']],
    },
    {
      id: 'die-2',
      color: '#55bb55',
      faces: [f['attack-1'], f['attack-1'], f['shield-1'], f['heal-1'], f['heal-1'], f['blank']],
    },
  ]
}
