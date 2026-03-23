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

/* "BURGER BRAWL" neon sign made of individual letter-like boxes */
function NeonSign() {
  const groupRef = useRef<any>(null!)
  useFrame((state) => {
    if (!groupRef.current) return
    // Subtle pulsing glow
    const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.2
    groupRef.current.children.forEach((child: any) => {
      if (child.material && child.material.emissiveIntensity !== undefined) {
        child.material.emissiveIntensity = 1.5 * pulse
      }
    })
  })

  // Spell out "BURGER BRAWL" using blocks
  const letters = [
    // B
    { x: -5.0, w: 0.4, h: 0.8 }, { x: -4.65, y: 0.2, w: 0.3, h: 0.15 }, { x: -4.65, y: -0.2, w: 0.3, h: 0.15 },
    // U
    { x: -4.1, w: 0.15, h: 0.8 }, { x: -3.6, w: 0.15, h: 0.8 }, { x: -3.85, y: -0.35, w: 0.4, h: 0.15 },
    // R
    { x: -3.2, w: 0.15, h: 0.8 }, { x: -2.9, y: 0.2, w: 0.3, h: 0.15 }, { x: -2.85, y: 0.0, w: 0.2, h: 0.12 },
    // G
    { x: -2.35, w: 0.15, h: 0.8 }, { x: -2.1, y: 0.35, w: 0.35, h: 0.12 }, { x: -2.1, y: -0.35, w: 0.35, h: 0.12 },
    { x: -1.85, y: -0.15, w: 0.15, h: 0.3 },
    // E
    { x: -1.4, w: 0.15, h: 0.8 }, { x: -1.15, y: 0.35, w: 0.3, h: 0.12 }, { x: -1.15, y: 0, w: 0.25, h: 0.12 },
    { x: -1.15, y: -0.35, w: 0.3, h: 0.12 },
    // R
    { x: -0.55, w: 0.15, h: 0.8 }, { x: -0.25, y: 0.2, w: 0.3, h: 0.15 }, { x: -0.2, y: 0.0, w: 0.2, h: 0.12 },
    // gap
    // B
    { x: 0.6, w: 0.4, h: 0.8 }, { x: 0.95, y: 0.2, w: 0.3, h: 0.15 }, { x: 0.95, y: -0.2, w: 0.3, h: 0.15 },
    // R
    { x: 1.5, w: 0.15, h: 0.8 }, { x: 1.8, y: 0.2, w: 0.3, h: 0.15 }, { x: 1.75, y: 0.0, w: 0.2, h: 0.12 },
    // A
    { x: 2.3, w: 0.15, h: 0.8 }, { x: 2.7, w: 0.15, h: 0.8 }, { x: 2.5, y: 0.35, w: 0.3, h: 0.12 },
    { x: 2.5, y: 0.0, w: 0.3, h: 0.12 },
    // W
    { x: 3.1, w: 0.12, h: 0.8 }, { x: 3.35, y: -0.2, w: 0.12, h: 0.5 }, { x: 3.6, w: 0.12, h: 0.8 },
    { x: 3.85, y: -0.2, w: 0.12, h: 0.5 }, { x: 4.1, w: 0.12, h: 0.8 },
    // L
    { x: 4.5, w: 0.15, h: 0.8 }, { x: 4.75, y: -0.35, w: 0.35, h: 0.12 },
  ]

  return (
    <group ref={groupRef} position={[0, 5.2, -1.75]}>
      {letters.map((l, i) => (
        <mesh key={i} position={[l.x, l.y ?? 0, 0]}>
          <boxGeometry args={[l.w, l.h, 0.08]} />
          <meshStandardMaterial
            color="#ff6b35"
            emissive="#ff6b35"
            emissiveIntensity={1.5}
          />
        </mesh>
      ))}
    </group>
  )
}

/* Menu board with colored squares representing the 4 food items */
function MenuBoard() {
  const items = [
    { label: 'burger', color: '#f59e0b', x: -2.5 },
    { label: 'fries', color: '#fbbf24', x: -0.85 },
    { label: 'drink', color: '#3b82f6', x: 0.85 },
    { label: 'combo', color: '#22c55e', x: 2.5 },
  ]

  return (
    <group position={[0, 4.2, -1.78]}>
      {/* Board background */}
      <mesh>
        <boxGeometry args={[8.5, 1.2, 0.08]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Board border */}
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[8.7, 1.4, 0.06]} />
        <meshStandardMaterial color="#4a3728" />
      </mesh>
      {/* Food item squares */}
      {items.map((item, i) => (
        <group key={i} position={[item.x, 0, 0.05]}>
          {/* Colored square */}
          <mesh>
            <boxGeometry args={[0.6, 0.6, 0.05]} />
            <meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={0.4} />
          </mesh>
          {/* Key indicator below */}
          <mesh position={[0, -0.45, 0]}>
            <boxGeometry args={[0.35, 0.2, 0.04]} />
            <meshStandardMaterial color="#333" emissive="#555" emissiveIntensity={0.2} />
          </mesh>
          {/* Small dots showing key (Q=1, W=2, E=3, R=4) */}
          {Array.from({ length: i + 1 }, (_, d) => (
            <mesh key={d} position={[(d - i * 0.5) * 0.08, -0.45, 0.03]}>
              <sphereGeometry args={[0.025, 4, 4]} />
              <meshBasicMaterial color="#fbbf24" />
            </mesh>
          ))}
          {/* Price bar decoration */}
          <mesh position={[0.55, 0, 0]}>
            <boxGeometry args={[0.04, 0.8, 0.04]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* Wood grain counter surface with two-tone stripes */
function WoodGrainCounter() {
  const stripes: React.JSX.Element[] = []
  const numStripes = 24
  const totalWidth = 12
  const stripeWidth = totalWidth / numStripes

  for (let i = 0; i < numStripes; i++) {
    const x = -totalWidth / 2 + stripeWidth * i + stripeWidth / 2
    const isDark = i % 2 === 0
    stripes.push(
      <mesh key={i} position={[x, 0.81, 0]}>
        <boxGeometry args={[stripeWidth * 0.95, 0.02, 1.48]} />
        <meshStandardMaterial color={isDark ? '#7a4f1e' : '#a0692e'} />
      </mesh>
    )
  }

  return <>{stripes}</>
}

export default function Counter() {
  return (
    <>
      {/* Counter surface base */}
      <mesh position={[0, 0.4, 0]} receiveShadow>
        <boxGeometry args={[12, 0.8, 1.5]} />
        <meshStandardMaterial color="#8b5c2a" />
      </mesh>
      {/* Wood grain top */}
      <WoodGrainCounter />
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
      {/* BURGER BRAWL neon sign */}
      <NeonSign />
      {/* Menu board with food item colors */}
      <MenuBoard />
      {/* Side neon accents */}
      <mesh position={[-4.5, 3.2, -1.8]}>
        <boxGeometry args={[1.2, 0.5, 0.15]} />
        <meshStandardMaterial color="#ff6b6b" emissive="#ff6b6b" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[4.5, 3.2, -1.8]}>
        <boxGeometry args={[1.2, 0.5, 0.15]} />
        <meshStandardMaterial color="#4ecdc4" emissive="#4ecdc4" emissiveIntensity={1.5} />
      </mesh>
      {/* Floor */}
      <mesh position={[0, 0, 4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color="#d4a574" />
      </mesh>
    </>
  )
}
