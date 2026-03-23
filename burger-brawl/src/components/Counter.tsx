import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { useGameStore } from '../store/gameStore.ts'

function LaneLabel({ lane }: { lane: number }) {
  const meshRef = useRef<Mesh>(null!)

  return (
    <mesh ref={meshRef} position={[(lane - 2) * 2.2, 2.5, -0.5]}>
      <boxGeometry args={[0.5, 0.5, 0.05]} />
      <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
      {/* Number indicator on top */}
      <mesh position={[0, 0, 0.03]}>
        {/* Represent lane number with stacked dots */}
        {Array.from({ length: lane + 1 }, (_, i) => (
          <mesh key={i} position={[(i - lane * 0.5) * 0.12, 0, 0]}>
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshBasicMaterial color="#1f2937" />
          </mesh>
        ))}
      </mesh>
    </mesh>
  )
}

function SelectionIndicator() {
  const meshRef = useRef<Mesh>(null!)
  const selectedLane = useGameStore(s => s.selectedLane)

  useFrame((state) => {
    if (!meshRef.current) return
    meshRef.current.position.set((selectedLane - 2) * 2.2, 0.01, -0.5)
    // Pulsing glow
    const pulse = 0.4 + Math.sin(state.clock.elapsedTime * 6) * 0.2
    const mat = meshRef.current.material as any
    if (mat) {
      mat.opacity = pulse
      mat.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 6) * 0.3
    }
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.2, 1.4]} />
      <meshStandardMaterial
        color="#22ff55"
        emissive="#22ff55"
        emissiveIntensity={0.5}
        transparent
        opacity={0.5}
      />
    </mesh>
  )
}

export default function Counter() {
  return (
    <>
      {/* Counter surface */}
      <mesh position={[0, 0.4, 0]} receiveShadow>
        <boxGeometry args={[12, 0.8, 1.5]} />
        <meshStandardMaterial color="#8b5c2a" />
      </mesh>
      {/* Lane dividers */}
      {[-4, -2, 0, 2, 4].map((x, i) => (
        <mesh key={i} position={[x, 0.85, 0]}>
          <boxGeometry args={[0.05, 0.1, 1.5]} />
          <meshStandardMaterial color="#6b4423" />
        </mesh>
      ))}
      {/* Lane number labels */}
      {[0, 1, 2, 3, 4].map(lane => (
        <LaneLabel key={lane} lane={lane} />
      ))}
      {/* Bright pulsing selection indicator */}
      <SelectionIndicator />
      {/* Back wall */}
      <mesh position={[0, 3, -2]}>
        <boxGeometry args={[14, 6, 0.3]} />
        <meshStandardMaterial color="#fef3c7" />
      </mesh>
      {/* Menu board */}
      <mesh position={[0, 4.5, -1.8]}>
        <boxGeometry args={[8, 1.5, 0.1]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      {/* Neon signs on back wall */}
      <mesh position={[-4.5, 4, -1.8]}>
        <boxGeometry args={[1.2, 0.5, 0.15]} />
        <meshStandardMaterial color="#ff6b6b" emissive="#ff6b6b" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[4.5, 4, -1.8]}>
        <boxGeometry args={[1.2, 0.5, 0.15]} />
        <meshStandardMaterial color="#4ecdc4" emissive="#4ecdc4" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0, 5.5, -1.8]}>
        <boxGeometry args={[2, 0.4, 0.15]} />
        <meshStandardMaterial color="#ffe66d" emissive="#ffe66d" emissiveIntensity={1.2} />
      </mesh>
      {/* Floor */}
      <mesh position={[0, 0, 4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color="#d4a574" />
      </mesh>
    </>
  )
}
