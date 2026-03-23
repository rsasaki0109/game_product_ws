import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, Group } from 'three'
import type { EnemyInstance } from '../types/game.ts'

function DroneBlade({ offset, speed }: { offset: number; speed: number }) {
  const ref = useRef<Mesh>(null!)
  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.y = state.clock.elapsedTime * speed + offset
  })
  return (
    <mesh ref={ref}>
      <boxGeometry args={[0.8, 0.03, 0.08]} />
      <meshStandardMaterial color="#67e8f9" emissive="#22d3ee" emissiveIntensity={0.8} transparent opacity={0.7} />
    </mesh>
  )
}

function DroneDetails({ s }: { s: number }) {
  return (
    <group>
      {/* Rotating blades */}
      <group position={[0, s * 0.35, 0]}>
        <DroneBlade offset={0} speed={12} />
        <DroneBlade offset={Math.PI / 2} speed={12} />
      </group>
      {/* Blade hub */}
      <mesh position={[0, s * 0.35, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.06, 6]} />
        <meshStandardMaterial color="#0891b2" emissive="#06b6d4" emissiveIntensity={0.5} />
      </mesh>
      {/* Eye/sensor */}
      <mesh position={[0, 0, s * 0.35]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} />
      </mesh>
    </group>
  )
}

function TurretDetails({ s }: { s: number }) {
  return (
    <group>
      {/* Barrel pointing forward (will track player via parent rotation) */}
      <mesh position={[0, 0, s * 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[s * 0.08, s * 0.1, s * 0.6, 8]} />
        <meshStandardMaterial color="#ea580c" emissive="#dc2626" emissiveIntensity={0.4} />
      </mesh>
      {/* Barrel tip glow */}
      <mesh position={[0, 0, s * 0.8]}>
        <sphereGeometry args={[s * 0.06, 6, 6]} />
        <meshStandardMaterial color="#ff6b35" emissive="#ff6b35" emissiveIntensity={1.5} />
      </mesh>
      {/* Base ring */}
      <mesh position={[0, -s * 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[s * 0.35, s * 0.05, 6, 12]} />
        <meshStandardMaterial color="#7c2d12" emissive="#ea580c" emissiveIntensity={0.2} />
      </mesh>
    </group>
  )
}

function HeavyDetails({ s }: { s: number }) {
  return (
    <group>
      {/* Armor plate - left */}
      <mesh position={[-s * 0.45, 0, 0]}>
        <boxGeometry args={[s * 0.12, s * 0.6, s * 0.5]} />
        <meshStandardMaterial color="#6d28d9" emissive="#7c3aed" emissiveIntensity={0.3} />
      </mesh>
      {/* Armor plate - right */}
      <mesh position={[s * 0.45, 0, 0]}>
        <boxGeometry args={[s * 0.12, s * 0.6, s * 0.5]} />
        <meshStandardMaterial color="#6d28d9" emissive="#7c3aed" emissiveIntensity={0.3} />
      </mesh>
      {/* Top armor */}
      <mesh position={[0, s * 0.4, 0]}>
        <boxGeometry args={[s * 0.5, s * 0.08, s * 0.5]} />
        <meshStandardMaterial color="#581c87" emissive="#7c3aed" emissiveIntensity={0.2} />
      </mesh>
      {/* Visor */}
      <mesh position={[0, s * 0.1, s * 0.36]}>
        <boxGeometry args={[s * 0.4, s * 0.08, s * 0.04]} />
        <meshStandardMaterial color="#c084fc" emissive="#a855f7" emissiveIntensity={1.0} />
      </mesh>
    </group>
  )
}

function BossDetails({ s, elapsed }: { s: number; elapsed: number }) {
  // Multiple emissive eyes arranged around the front
  const eyePositions: [number, number, number][] = [
    [0, s * 0.15, s * 0.5],
    [-s * 0.2, s * 0.25, s * 0.45],
    [s * 0.2, s * 0.25, s * 0.45],
    [-s * 0.1, s * 0.0, s * 0.48],
    [s * 0.1, s * 0.0, s * 0.48],
  ]

  return (
    <group>
      {/* Multiple eyes */}
      {eyePositions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[s * 0.06, 6, 6]} />
          <meshStandardMaterial
            color="#ff0000"
            emissive="#ff0000"
            emissiveIntensity={1.5 + Math.sin(elapsed * 3 + i * 1.2) * 0.5}
          />
        </mesh>
      ))}
      {/* Crown - cone on top */}
      <mesh position={[0, s * 0.55, 0]}>
        <coneGeometry args={[s * 0.25, s * 0.4, 6]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} />
      </mesh>
      {/* Crown jewels */}
      {[0, Math.PI * 0.666, Math.PI * 1.333].map((angle, i) => (
        <mesh key={i} position={[
          Math.cos(angle) * s * 0.2,
          s * 0.45,
          Math.sin(angle) * s * 0.2,
        ]}>
          <sphereGeometry args={[s * 0.05, 6, 6]} />
          <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={1.5} />
        </mesh>
      ))}
      {/* Shoulder spikes */}
      <mesh position={[-s * 0.4, s * 0.1, 0]} rotation={[0, 0, -0.5]}>
        <coneGeometry args={[s * 0.08, s * 0.3, 4]} />
        <meshStandardMaterial color="#dc2626" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[s * 0.4, s * 0.1, 0]} rotation={[0, 0, 0.5]}>
        <coneGeometry args={[s * 0.08, s * 0.3, 4]} />
        <meshStandardMaterial color="#dc2626" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

export default function Enemy({ enemy }: { enemy: EnemyInstance }) {
  const meshRef = useRef<Mesh>(null!)
  const groupRef = useRef<Group>(null!)
  const elapsedRef = useRef(0)

  useFrame((_state, delta) => {
    elapsedRef.current += delta
    if (!meshRef.current) return
    meshRef.current.position.set(enemy.position[0], enemy.position[1], enemy.position[2])
    meshRef.current.rotation.y += 0.01

    // Make group follow for detail meshes
    if (groupRef.current) {
      groupRef.current.position.set(enemy.position[0], enemy.position[1], enemy.position[2])
      groupRef.current.rotation.y = meshRef.current.rotation.y
    }
  })

  const s = enemy.def.scale
  const hpRatio = enemy.currentHp / enemy.maxHp

  return (
    <group>
      <mesh ref={meshRef} castShadow>
        {enemy.def.type === 'drone' && <octahedronGeometry args={[s * 0.5]} />}
        {enemy.def.type === 'turret' && <cylinderGeometry args={[s * 0.3, s * 0.4, s * 0.8, 8]} />}
        {enemy.def.type === 'heavy' && <boxGeometry args={[s * 0.7, s * 0.7, s * 0.7]} />}
        {enemy.def.type === 'boss' && <icosahedronGeometry args={[s * 0.6, 1]} />}
        <meshStandardMaterial
          color={enemy.def.color}
          emissive={enemy.def.emissive}
          emissiveIntensity={0.5}
        />
        {/* HP bar */}
        <mesh position={[0, s * 0.6, 0]}>
          <planeGeometry args={[1, 0.08]} />
          <meshBasicMaterial color="#333" />
        </mesh>
        <mesh position={[-(1 - hpRatio) * 0.5, s * 0.6, 0.001]}>
          <planeGeometry args={[Math.max(0.01, hpRatio * 0.98), 0.06]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </mesh>
      {/* Type-specific details */}
      <group ref={groupRef}>
        {enemy.def.type === 'drone' && <DroneDetails s={s} />}
        {enemy.def.type === 'turret' && <TurretDetails s={s} />}
        {enemy.def.type === 'heavy' && <HeavyDetails s={s} />}
        {enemy.def.type === 'boss' && <BossDetails s={s} elapsed={elapsedRef.current} />}
      </group>
    </group>
  )
}
