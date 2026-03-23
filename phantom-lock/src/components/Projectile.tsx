import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, Group } from 'three'
import type { ProjectileInstance } from '../types/game.ts'

const TRAIL_COUNT = 5

export default function Projectile({ proj }: { proj: ProjectileInstance }) {
  const groupRef = useRef<Group>(null!)
  const trailRefs = useRef<(Mesh | null)[]>([])
  const history = useRef<[number, number, number][]>([])

  useFrame(() => {
    if (!groupRef.current) return
    groupRef.current.position.set(proj.position[0], proj.position[1], proj.position[2])

    // Record trail positions
    history.current.unshift([...proj.position] as [number, number, number])
    if (history.current.length > TRAIL_COUNT) history.current.length = TRAIL_COUNT

    for (let i = 0; i < TRAIL_COUNT; i++) {
      const m = trailRefs.current[i]
      if (!m) continue
      const pos = history.current[i]
      if (pos) {
        m.visible = true
        m.position.set(
          pos[0] - proj.position[0],
          pos[1] - proj.position[1],
          pos[2] - proj.position[2],
        )
        const scale = 1 - (i + 1) / (TRAIL_COUNT + 1)
        m.scale.setScalar(scale)
        const mat = m.material as any
        if (mat) mat.opacity = scale * 0.6
      } else {
        m.visible = false
      }
    }
  })

  return (
    <group ref={groupRef}>
      {/* Main missile head */}
      <mesh>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={2} />
      </mesh>
      {/* Point light for glow */}
      <pointLight color="#22d3ee" intensity={2} distance={3} />
      {/* Trail particles */}
      {Array.from({ length: TRAIL_COUNT }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { trailRefs.current[i] = el }}
          visible={false}
        >
          <sphereGeometry args={[0.12, 6, 6]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  )
}
