import { useGameStore } from './store/gameStore.ts'
import { TitleScreen } from './components/screens/TitleScreen.tsx'
import { GameOverScreen } from './components/screens/GameOverScreen.tsx'
import { FloorTransition } from './components/screens/FloorTransition.tsx'
import { BattleScene } from './components/battle/BattleScene.tsx'
import { RewardScreen } from './components/reward/RewardScreen.tsx'

export default function App() {
  const phase = useGameStore(s => s.phase)

  return (
    <div className="dice-app">
      {phase === 'title' && <TitleScreen />}
      {phase === 'battle_start' && <FloorTransition />}
      {(phase === 'battle_player_turn' ||
        phase === 'battle_rolling' ||
        phase === 'battle_resolving' ||
        phase === 'battle_enemy_turn') && <BattleScene />}
      {phase === 'reward' && <RewardScreen />}
      {(phase === 'game_over' || phase === 'victory') && <GameOverScreen />}
    </div>
  )
}
