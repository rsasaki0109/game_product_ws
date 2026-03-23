import { useGameStore } from '../store/gameStore.ts'
import Athlete from './Athlete.tsx'
import SabotageEffect from './SabotageEffect.tsx'

const VISUAL_SCALE = 20 / 3000 // 20 units for 3000m

export default function MarathonScene() {
  const player = useGameStore((s) => s.player)
  const ai = useGameStore((s) => s.ai)

  // Camera-relative positions: keep player centered, scroll background
  const cameraOffset = player.position * VISUAL_SCALE
  const playerX = 0
  const aiX = (ai.position - player.position) * VISUAL_SCALE

  return (
    <group position={[-cameraOffset % 10, 0, 0]}>
      {/* Scrolling ground tiles */}
      {Array.from({ length: 5 }, (_, i) => {
        const baseX = Math.floor(cameraOffset / 10) * 10 + i * 10 - 10
        return (
          <group key={i}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[baseX, -0.1, 0]}>
              <planeGeometry args={[10, 8]} />
              <meshStandardMaterial color={i % 2 === 0 ? '#3a7d44' : '#2e6b38'} />
            </mesh>
            {/* Road */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[baseX, -0.05, 0]}>
              <planeGeometry args={[10, 3]} />
              <meshStandardMaterial color="#666666" />
            </mesh>
            {/* Lane divider */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[baseX, -0.04, 0]}>
              <planeGeometry args={[10, 0.05]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          </group>
        )
      })}

      {/* Distance markers every 500m */}
      {[500, 1000, 1500, 2000, 2500, 3000].map((m) => {
        const x = m * VISUAL_SCALE
        return (
          <group key={m}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.03, 2]}>
              <planeGeometry args={[0.08, 0.8]} />
              <meshStandardMaterial color="white" />
            </mesh>
          </group>
        )
      })}

      {/* Finish line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3000 * VISUAL_SCALE, -0.03, 0]}>
        <planeGeometry args={[0.15, 3]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Athletes at camera-relative positions */}
      <group position={[cameraOffset, 0, 0]}>
        <Athlete
          position={[playerX, 0, -0.6]}
          color="#4488ff"
          stunned={player.stunTimer > 0}
        />
        <Athlete
          position={[aiX, 0, 0.6]}
          color="#ff4444"
          stunned={ai.stunTimer > 0}
        />
        <SabotageEffect
          position={[playerX, 1, -0.6]}
          active={player.debuffTimer > 0}
          type={player.debuffType}
        />
        <SabotageEffect
          position={[aiX, 1, 0.6]}
          active={ai.debuffTimer > 0}
          type={ai.debuffType}
        />
      </group>
    </group>
  )
}
