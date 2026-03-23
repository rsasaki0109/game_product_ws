import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import type { LootDrop as LootDropType } from '../types/game.ts'

interface LootDropProps {
  drop: LootDropType
}

const STAT_COLORS: Record<string, string> = {
  attack: '#ef4444',
  speed: '#3b82f6',
  maxHp: '#22c55e',
}

export default function LootDrop({ drop }: LootDropProps) {
  const meshRef = useRef<Mesh>(null!)

  useFrame((state) => {
    if (!meshRef.current) return
    meshRef.current.position.set(
      drop.position[0],
      0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.15,
      drop.position[2],
    )
    meshRef.current.rotation.y += 0.03
  })

  return (
    <mesh ref={meshRef} castShadow>
      <octahedronGeometry args={[0.25]} />
      <meshStandardMaterial
        color={STAT_COLORS[drop.item.stat] ?? '#ffffff'}
        emissive={STAT_COLORS[drop.item.stat] ?? '#ffffff'}
        emissiveIntensity={0.4}
      />
    </mesh>
  )
}
