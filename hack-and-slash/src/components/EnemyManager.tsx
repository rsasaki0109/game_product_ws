import { useGameStore } from '../store/gameStore.ts'
import Enemy from './Enemy.tsx'

export default function EnemyManager() {
  const enemies = useGameStore(s => s.enemies)

  return (
    <>
      {enemies.map(e => (
        <Enemy key={e.uid} enemy={e} />
      ))}
    </>
  )
}
