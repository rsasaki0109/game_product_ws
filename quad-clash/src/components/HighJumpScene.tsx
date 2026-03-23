import { useGameStore } from '../store/gameStore.ts'
import Athlete from './Athlete.tsx'

export default function HighJumpScene() {
  const player = useGameStore((s) => s.player)
  const event = useGameStore((s) => s.event)

  // Calculate athlete visual position based on jump phase
  let athleteX = -5
  let athleteY = 0

  switch (event.jumpPhase) {
    case 'approach':
      athleteX = -5 + player.position * 0.5
      break
    case 'takeoff':
      athleteX = 0
      break
    case 'flight': {
      athleteX = 0.5
      // Arc: go up then down
      const t = Math.min(event.elapsed / 1.5, 1)
      athleteY = Math.sin(t * Math.PI) * (event.jumpPower / 100) * 3
      break
    }
    case 'done':
      athleteX = 1
      break
  }

  const barVisualHeight = (event.barHeight - 1.0) * 3 + 0.5

  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[20, 10]} />
        <meshStandardMaterial color="#3a7d44" />
      </mesh>

      {/* Approach runway */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3, -0.05, 0]}>
        <planeGeometry args={[8, 1.5]} />
        <meshStandardMaterial color="#cc6633" />
      </mesh>

      {/* Landing mat */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2, -0.05, 0]}>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial color="#4466aa" />
      </mesh>

      {/* Bar supports */}
      <mesh position={[0.5, barVisualHeight / 2, -1.2]}>
        <boxGeometry args={[0.1, barVisualHeight + 0.5, 0.1]} />
        <meshStandardMaterial color="#888888" />
      </mesh>
      <mesh position={[0.5, barVisualHeight / 2, 1.2]}>
        <boxGeometry args={[0.1, barVisualHeight + 0.5, 0.1]} />
        <meshStandardMaterial color="#888888" />
      </mesh>

      {/* Bar */}
      <mesh position={[0.5, barVisualHeight, 0]}>
        <boxGeometry args={[0.05, 0.05, 2.4]} />
        <meshStandardMaterial color="#ffcc00" />
      </mesh>

      {/* Height label area */}
      <mesh position={[0.5, barVisualHeight + 0.4, 0]}>
        <boxGeometry args={[0.6, 0.25, 0.05]} />
        <meshStandardMaterial color="#222222" />
      </mesh>

      {/* Athlete */}
      <Athlete
        position={[athleteX, athleteY, 0]}
        color="#4488ff"
        stunned={player.stunTimer > 0}
      />

      {/* Timing indicator during takeoff */}
      {event.jumpPhase === 'takeoff' && (
        <group position={[0, 4, 0]}>
          {/* Timing bar background */}
          <mesh>
            <boxGeometry args={[3, 0.3, 0.1]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
          {/* Perfect zone */}
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[0.5, 0.25, 0.05]} />
            <meshStandardMaterial color="#44ff44" opacity={0.5} transparent />
          </mesh>
          {/* Cursor */}
          <mesh position={[(event.elapsed - 0.5) * 3, 0, 0.1]}>
            <boxGeometry args={[0.08, 0.35, 0.05]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </group>
      )}
    </group>
  )
}
