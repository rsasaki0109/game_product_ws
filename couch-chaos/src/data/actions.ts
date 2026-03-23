import type { PhysicalAction } from '../types/game.ts'

// Player 1 (left side) physical actions against Player 2
export const P1_ACTIONS: PhysicalAction[] = [
  { id: 'push', name: 'Push', emoji: '👋', key: 'KeyT', cooldown: 3, description: 'Shove opponent - their character stumbles' },
  { id: 'cover', name: 'Cover Eyes', emoji: '🙈', key: 'KeyY', cooldown: 5, description: 'Block their screen for 1s' },
  { id: 'pillow', name: 'Pillow Smack', emoji: '🛋️', key: 'KeyU', cooldown: 4, description: 'Stun opponent for 1s' },
  { id: 'tickle', name: 'Tickle', emoji: '🤣', key: 'KeyI', cooldown: 6, description: 'Reverse their controls for 2s' },
]

// Player 2 (right side, AI) actions
export const P2_ACTIONS: PhysicalAction[] = [
  { id: 'push', name: 'Push', emoji: '👋', key: '', cooldown: 3, description: 'Shove' },
  { id: 'cover', name: 'Cover Eyes', emoji: '🙈', key: '', cooldown: 5, description: 'Blind' },
  { id: 'pillow', name: 'Pillow Smack', emoji: '🛋️', key: '', cooldown: 4, description: 'Stun' },
  { id: 'tickle', name: 'Tickle', emoji: '🤣', key: '', cooldown: 6, description: 'Reverse' },
]
