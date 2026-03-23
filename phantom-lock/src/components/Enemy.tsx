import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import type { EnemyInstance } from '../types/game.ts'

export default function Enemy({ enemy }: { enemy: EnemyInstance }) {
  const meshRef = useRef<Mesh>(null!)

  useFrame(() => {
    if (!meshRef.current) return
    meshRef.current.position.set(enemy.position[0], enemy.position[1], enemy.position[2])
    meshRef.current.rotation.y += 0.01
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
    </group>
  )
}
