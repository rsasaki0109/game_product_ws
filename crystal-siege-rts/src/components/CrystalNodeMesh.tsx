import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { CrystalNode } from '../types/game.ts'

export default function CrystalNodeMesh({ node }: { node: CrystalNode }) {
  const groupRef = useRef<Group>(null!)

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005
    }
  })

  const scale = Math.max(0.3, node.remaining / 800)
  const color = node.remaining > 0 ? '#06b6d4' : '#666666'

  return (
    <group ref={groupRef} position={[node.position[0], 0.5 * scale, node.position[1]]}>
      {[0, 1, 2].map(i => {
        const angle = (i / 3) * Math.PI * 2
        const r = 0.4 * scale
        return (
          <mesh key={i} position={[Math.cos(angle) * r, Math.sin(i) * 0.3, Math.sin(angle) * r]}>
            <octahedronGeometry args={[0.4 * scale]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
          </mesh>
        )
      })}
    </group>
  )
}
