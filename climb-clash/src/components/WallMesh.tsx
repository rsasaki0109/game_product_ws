import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Wall } from '../types/game.ts'
import type { Mesh, MeshStandardMaterial } from 'three'

const HOLD_COLORS: Record<string, string> = {
  normal: '#94a3b8',
  fragile: '#fbbf24',
  recovery: '#22c55e',
}

function FragileHold({ x, y }: { x: number; y: number }) {
  const meshRef = useRef<Mesh>(null!)

  useFrame(() => {
    if (!meshRef.current) return
    // Flicker effect for fragile holds
    const mat = meshRef.current.material as MeshStandardMaterial
    const flicker = Math.sin(Date.now() * 0.008 + x * 7 + y * 13) > 0.3
    mat.opacity = flicker ? 0.95 : 0.6
  })

  return (
    <group position={[x, y, 0]}>
      {/* Smaller fragile hold */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial color="#fbbf24" transparent opacity={0.9} />
      </mesh>
      {/* Crack line across the hold */}
      <mesh position={[0, 0, 0.15]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.25, 0.03, 0.02]} />
        <meshBasicMaterial color="#92400e" />
      </mesh>
      <mesh position={[0.05, -0.03, 0.15]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.15, 0.02, 0.02]} />
        <meshBasicMaterial color="#92400e" />
      </mesh>
    </group>
  )
}

function RecoveryHold({ x, y }: { x: number; y: number }) {
  const glowRef = useRef<Mesh>(null!)

  useFrame(() => {
    if (!glowRef.current) return
    const pulse = 0.8 + Math.sin(Date.now() * 0.004) * 0.2
    glowRef.current.scale.setScalar(pulse)
  })

  return (
    <group position={[x, y, 0]}>
      <mesh>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
      </mesh>
      {/* + symbol glow */}
      <mesh ref={glowRef} position={[0, 0, 0.2]}>
        <boxGeometry args={[0.2, 0.06, 0.02]} />
        <meshBasicMaterial color="#86efac" />
      </mesh>
      <mesh position={[0, 0, 0.2]}>
        <boxGeometry args={[0.06, 0.2, 0.02]} />
        <meshBasicMaterial color="#86efac" />
      </mesh>
    </group>
  )
}

/** Row number marker displayed at specific height intervals */
function RowMarker({ y, xOffset }: { y: number; xOffset: number }) {
  return (
    <group position={[xOffset - 0.5, y, 0.1]}>
      {/* Small background plate */}
      <mesh>
        <boxGeometry args={[0.8, 0.35, 0.05]} />
        <meshStandardMaterial color="#1e293b" opacity={0.85} transparent />
      </mesh>
      {/* Number indicator - row line */}
      <mesh position={[0, 0, 0.04]}>
        <boxGeometry args={[0.6, 0.08, 0.02]} />
        <meshBasicMaterial color="#94a3b8" />
      </mesh>
      {/* Tick mark */}
      <mesh position={[0.35, 0, 0.04]}>
        <boxGeometry args={[0.08, 0.25, 0.02]} />
        <meshBasicMaterial color="#94a3b8" />
      </mesh>
    </group>
  )
}

/** GOAL banner at the top of the wall */
function GoalBanner({ xCenter, y }: { xCenter: number; y: number }) {
  const glowRef = useRef<Mesh>(null!)

  useFrame(() => {
    if (!glowRef.current) return
    const mat = glowRef.current.material as MeshStandardMaterial
    mat.emissiveIntensity = 0.4 + Math.sin(Date.now() * 0.003) * 0.2
  })

  return (
    <group position={[xCenter, y, 0.2]}>
      {/* Banner background */}
      <mesh ref={glowRef}>
        <boxGeometry args={[4.5, 0.6, 0.1]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.4} />
      </mesh>
      {/* Banner stripe top */}
      <mesh position={[0, 0.35, 0.06]}>
        <boxGeometry args={[4.6, 0.08, 0.05]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
      {/* Banner stripe bottom */}
      <mesh position={[0, -0.35, 0.06]}>
        <boxGeometry args={[4.6, 0.08, 0.05]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
      {/* "GOAL" text indicator - 4 block letters */}
      {/* G */}
      <mesh position={[-1.2, 0, 0.08]}>
        <boxGeometry args={[0.5, 0.35, 0.04]} />
        <meshBasicMaterial color="#92400e" />
      </mesh>
      {/* O */}
      <mesh position={[-0.4, 0, 0.08]}>
        <boxGeometry args={[0.5, 0.35, 0.04]} />
        <meshBasicMaterial color="#92400e" />
      </mesh>
      {/* A */}
      <mesh position={[0.4, 0, 0.08]}>
        <boxGeometry args={[0.5, 0.35, 0.04]} />
        <meshBasicMaterial color="#92400e" />
      </mesh>
      {/* L */}
      <mesh position={[1.2, 0, 0.08]}>
        <boxGeometry args={[0.5, 0.35, 0.04]} />
        <meshBasicMaterial color="#92400e" />
      </mesh>
    </group>
  )
}

interface WallMeshProps {
  wall: Wall
  xOffset: number
}

const ROW_MARKER_HEIGHTS = [5, 10, 15, 20, 25]

export default function WallMesh({ wall, xOffset }: WallMeshProps) {
  return (
    <group position={[xOffset, 0, 0]}>
      {/* Wall background - gradient: dark at bottom, lighter at top */}
      <mesh position={[2, 7, -0.5]}>
        <boxGeometry args={[5.5, 15, 0.3]} />
        <meshStandardMaterial color="#1e293b" opacity={0.7} transparent />
      </mesh>
      <mesh position={[2, 15, -0.5]}>
        <boxGeometry args={[5.5, 8, 0.3]} />
        <meshStandardMaterial color="#334155" opacity={0.6} transparent />
      </mesh>
      <mesh position={[2, 23, -0.5]}>
        <boxGeometry args={[5.5, 8, 0.3]} />
        <meshStandardMaterial color="#475569" opacity={0.55} transparent />
      </mesh>

      {/* Grid lines */}
      {Array.from({ length: 30 }, (_, y) => (
        <mesh key={`row-${y}`} position={[2, y, -0.3]}>
          <boxGeometry args={[5.2, 0.02, 0.02]} />
          <meshBasicMaterial color="#4b5563" />
        </mesh>
      ))}

      {/* Row number markers every 5 rows */}
      {ROW_MARKER_HEIGHTS.map(y => (
        <RowMarker key={`marker-${y}`} y={y} xOffset={0} />
      ))}

      {/* GOAL banner at the top */}
      <GoalBanner xCenter={2} y={28} />

      {/* Holds */}
      {wall.holds
        .filter(h => !h.destroyed)
        .map((h, i) => {
          if (h.type === 'fragile') {
            return <FragileHold key={i} x={h.x} y={h.y} />
          }
          if (h.type === 'recovery') {
            return <RecoveryHold key={i} x={h.x} y={h.y} />
          }
          return (
            <mesh key={i} position={[h.x, h.y, 0]}>
              <sphereGeometry args={[0.25, 12, 12]} />
              <meshStandardMaterial color={HOLD_COLORS[h.type]} />
            </mesh>
          )
        })}
    </group>
  )
}
