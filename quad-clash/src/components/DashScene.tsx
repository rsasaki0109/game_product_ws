import { useGameStore } from '../store/gameStore.ts'
import Athlete from './Athlete.tsx'
import SabotageEffect from './SabotageEffect.tsx'

const TRACK_LENGTH = 20 // visual length representing 100m
const SCALE = TRACK_LENGTH / 100

export default function DashScene() {
  const player = useGameStore((s) => s.player)
  const ai = useGameStore((s) => s.ai)

  const playerX = Math.min(player.position * SCALE, TRACK_LENGTH) - 10
  const aiX = Math.min(ai.position * SCALE, TRACK_LENGTH) - 10

  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[25, 6]} />
        <meshStandardMaterial color="#3a7d44" />
      </mesh>

      {/* Track lanes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, -0.8]}>
        <planeGeometry args={[25, 1.2]} />
        <meshStandardMaterial color="#cc6633" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0.8]}>
        <planeGeometry args={[25, 1.2]} />
        <meshStandardMaterial color="#cc6633" />
      </mesh>

      {/* Lane lines */}
      {[-1.4, -0.2, 0.2, 1.4].map((z, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, z]}>
          <planeGeometry args={[25, 0.03]} />
          <meshStandardMaterial color="white" />
        </mesh>
      ))}

      {/* Finish line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10, -0.03, 0]}>
        <planeGeometry args={[0.15, 3]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Distance markers */}
      {[0, 25, 50, 75].map((m) => (
        <mesh key={m} rotation={[-Math.PI / 2, 0, 0]} position={[m * SCALE - 10, -0.03, 2]}>
          <planeGeometry args={[0.05, 0.5]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* Athletes */}
      <Athlete
        position={[playerX, 0, -0.8]}
        color="#4488ff"
        stunned={player.stunTimer > 0}
      />
      <Athlete
        position={[aiX, 0, 0.8]}
        color="#ff4444"
        stunned={ai.stunTimer > 0}
      />

      {/* Sabotage effects */}
      <SabotageEffect
        position={[playerX, 1, -0.8]}
        active={player.debuffTimer > 0}
        type={player.debuffType}
      />
      <SabotageEffect
        position={[aiX, 1, 0.8]}
        active={ai.debuffTimer > 0}
        type={ai.debuffType}
      />
    </group>
  )
}
