import { useGameStore } from './store/gameStore.ts'
import GameScene from './components/GameScene.tsx'
import HUD from './components/HUD.tsx'
import Crosshair from './components/Crosshair.tsx'

export default function App() {
  const phase = useGameStore(s => s.phase)

  return (
    <>
      <GameScene />
      {phase !== 'title' && <Crosshair />}
      <HUD />
    </>
  )
}
