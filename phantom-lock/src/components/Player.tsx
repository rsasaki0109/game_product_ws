import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { useGameStore } from '../store/gameStore.ts'

export default function Player() {
  const groupRef = useRef<Group>(null!)

  useFrame(() => {
    const p = useGameStore.getState().player
    if (!groupRef.current) return
    groupRef.current.position.set(p.position[0], p.position[1], p.position[2])
  })

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[0.6, 0.8, 0.4]} />
        <meshStandardMaterial color="#3b82f6" emissive="#1d4ed8" emissiveIntensity={0.4} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={0.6} />
      </mesh>
      {/* Arms */}
      <mesh position={[-0.45, 0.1, 0]}>
        <boxGeometry args={[0.2, 0.6, 0.2]} />
        <meshStandardMaterial color="#2563eb" />
      </mesh>
      <mesh position={[0.45, 0.1, 0]}>
        <boxGeometry args={[0.2, 0.6, 0.2]} />
        <meshStandardMaterial color="#2563eb" />
      </mesh>
      {/* Thruster glow */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.15, 0.25, 0.3, 8]} />
        <meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={1} transparent opacity={0.7} />
      </mesh>
    </group>
  )
}
