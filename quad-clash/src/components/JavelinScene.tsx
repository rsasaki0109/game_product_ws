import { useMemo } from 'react'
import { useGameStore } from '../store/gameStore.ts'
import Athlete from './Athlete.tsx'

export default function JavelinScene() {
  const event = useGameStore((s) => s.event)
  const player = useGameStore((s) => s.player)

  // Generate javelin trajectory points
  const trajectoryPoints = useMemo(() => {
    if (!event.thrown) return []
    const distance = event.playerResult
    const points: [number, number, number][] = []
    const steps = 30
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = t * distance * 0.2 - 5 // scale to visual
      const y = 4 * t * (1 - t) * 3 + 0.5 // parabola
      points.push([x, y, 0])
    }
    return points
  }, [event.thrown, event.playerResult])

  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[30, 10]} />
        <meshStandardMaterial color="#3a7d44" />
      </mesh>

      {/* Runway */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-5, -0.05, 0]}>
        <planeGeometry args={[8, 1.5]} />
        <meshStandardMaterial color="#cc6633" />
      </mesh>

      {/* Landing area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, -0.05, 0]}>
        <planeGeometry args={[18, 6]} />
        <meshStandardMaterial color="#5a9d5a" />
      </mesh>

      {/* Distance markers */}
      {[10, 20, 30, 40, 50].map((m) => (
        <mesh key={m} rotation={[-Math.PI / 2, 0, 0]} position={[m * 0.2 - 5, -0.03, 2.5]}>
          <planeGeometry args={[0.05, 0.5]} />
          <meshStandardMaterial color="white" />
        </mesh>
      ))}

      {/* Athlete */}
      <Athlete
        position={[-7, 0, 0]}
        color="#4488ff"
        stunned={false}
      />

      {/* Power meter background */}
      {!event.thrown && (
        <group position={[-7, 3, 0]}>
          <mesh>
            <boxGeometry args={[0.3, 2.5, 0.1]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
          {/* Power fill */}
          <mesh position={[0, -1.25 + (event.power / 100) * 1.25, 0.06]}>
            <boxGeometry args={[0.25, (event.power / 100) * 2.5, 0.05]} />
            <meshStandardMaterial color={event.power > 80 ? '#ff4444' : event.power > 50 ? '#ffaa00' : '#44ff44'} />
          </mesh>
        </group>
      )}

      {/* Angle indicator */}
      {!event.thrown && (
        <mesh position={[-6, 1.5, 0]} rotation={[0, 0, (event.angle * Math.PI) / 180]}>
          <boxGeometry args={[1, 0.05, 0.05]} />
          <meshStandardMaterial color="#ffff00" />
        </mesh>
      )}

      {/* Trajectory visualization */}
      {trajectoryPoints.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.05, 4, 4]} />
          <meshStandardMaterial color="#ffaa00" />
        </mesh>
      ))}

      {/* Javelin landing marker */}
      {event.thrown && (
        <mesh position={[event.playerResult * 0.2 - 5, 0.1, 0]}>
          <coneGeometry args={[0.15, 0.4, 6]} />
          <meshStandardMaterial color="#ff6600" />
        </mesh>
      )}

      {/* AI landing marker */}
      {event.thrown && event.aiResult > 0 && (
        <mesh position={[event.aiResult * 0.2 - 5, 0.1, 1.5]}>
          <coneGeometry args={[0.15, 0.4, 6]} />
          <meshStandardMaterial color="#ff4444" />
        </mesh>
      )}

      {/* Debuff indicator */}
      {player.debuffType && (
        <mesh position={[-7, 4.5, 0]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  )
}
