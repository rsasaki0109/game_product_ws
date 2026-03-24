import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import { useGameStore } from '../store/gameStore.ts'

export default function Player() {
  const groupRef = useRef<Group>(null!)
  const thrusterRef = useRef<Mesh>(null!)
  const thrusterGlowRef = useRef<Mesh>(null!)
  const prevPos = useRef<[number, number, number]>([0, 1, 0])

  useFrame((state) => {
    const p = useGameStore.getState().player
    if (!groupRef.current) return
    groupRef.current.position.set(p.position[0], p.position[1], p.position[2])

    // Calculate movement speed for thruster pulse
    const dx = p.position[0] - prevPos.current[0]
    const dz = p.position[2] - prevPos.current[2]
    const speed = Math.sqrt(dx * dx + dz * dz) * 60 // approximate per-second
    prevPos.current = [...p.position]

    // Thruster pulse based on movement speed
    if (thrusterRef.current) {
      const basePulse = 0.5 + Math.sin(state.clock.elapsedTime * 12) * 0.15
      const speedFactor = Math.min(1, speed / 15)
      const scale = 0.6 + speedFactor * 0.8
      thrusterRef.current.scale.set(scale, 0.5 + speedFactor * 1.0, scale)
      const mat = thrusterRef.current.material as any
      if (mat) {
        mat.emissiveIntensity = basePulse + speedFactor * 1.5
        mat.opacity = 0.5 + speedFactor * 0.4
      }
    }

    // Thruster glow ring
    if (thrusterGlowRef.current) {
      const speedFactor = Math.min(1, speed / 15)
      thrusterGlowRef.current.scale.setScalar(0.8 + speedFactor * 0.6 + Math.sin(state.clock.elapsedTime * 8) * 0.1)
      const mat = thrusterGlowRef.current.material as any
      if (mat) {
        mat.opacity = 0.2 + speedFactor * 0.4
      }
    }
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
      {/* Visor - emissive thin box in front of head */}
      <mesh position={[0, 0.55, 0.18]}>
        <boxGeometry args={[0.3, 0.08, 0.04]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2.0} />
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
      {/* Wing-like protrusions - left */}
      <mesh position={[-0.6, 0.3, -0.1]} rotation={[0, 0, -0.4]}>
        <boxGeometry args={[0.5, 0.06, 0.3]} />
        <meshStandardMaterial color="#1e40af" emissive="#1d4ed8" emissiveIntensity={0.3} />
      </mesh>
      {/* Wing tip - left */}
      <mesh position={[-0.9, 0.18, -0.1]} rotation={[0, 0, -0.6]}>
        <boxGeometry args={[0.2, 0.04, 0.15]} />
        <meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={0.8} />
      </mesh>
      {/* Wing-like protrusions - right */}
      <mesh position={[0.6, 0.3, -0.1]} rotation={[0, 0, 0.4]}>
        <boxGeometry args={[0.5, 0.06, 0.3]} />
        <meshStandardMaterial color="#1e40af" emissive="#1d4ed8" emissiveIntensity={0.3} />
      </mesh>
      {/* Wing tip - right */}
      <mesh position={[0.9, 0.18, -0.1]} rotation={[0, 0, 0.6]}>
        <boxGeometry args={[0.2, 0.04, 0.15]} />
        <meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={0.8} />
      </mesh>
      {/* Shoulder pads */}
      <mesh position={[-0.4, 0.4, 0]}>
        <boxGeometry args={[0.15, 0.1, 0.3]} />
        <meshStandardMaterial color="#1e40af" emissive="#1d4ed8" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0.4, 0.4, 0]}>
        <boxGeometry args={[0.15, 0.1, 0.3]} />
        <meshStandardMaterial color="#1e40af" emissive="#1d4ed8" emissiveIntensity={0.2} />
      </mesh>
      {/* Thruster glow - pulses with speed */}
      <mesh ref={thrusterRef} position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.15, 0.25, 0.3, 8]} />
        <meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={1} transparent opacity={0.7} />
      </mesh>
      {/* Thruster glow ring */}
      <mesh ref={thrusterGlowRef} position={[0, -0.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.25, 8]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.5} transparent opacity={0.3} side={2} />
      </mesh>
    </group>
  )
}
