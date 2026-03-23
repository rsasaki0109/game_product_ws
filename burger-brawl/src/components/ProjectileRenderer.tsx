import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { useGameStore } from '../store/gameStore.ts'
import type { ProjectileInstance } from '../types/game.ts'

function BazookaShot({ proj }: { proj: ProjectileInstance }) {
  const meshRef = useRef<Mesh>(null!)
  const trailRef = useRef<Mesh>(null!)

  useFrame((state) => {
    if (!meshRef.current) return
    const x = (proj.position[0] - 2) * 2.2
    const z = proj.position[1]
    meshRef.current.position.set(x, 1, z)

    // Pulsing glow
    const pulse = 1.5 + Math.sin(state.clock.elapsedTime * 20) * 0.5
    const mat = meshRef.current.material as any
    if (mat) mat.emissiveIntensity = pulse

    // Trail
    if (trailRef.current) {
      trailRef.current.position.set(x, 1, z - 0.6)
      trailRef.current.scale.set(1, 1, 1 + Math.sin(state.clock.elapsedTime * 15) * 0.3)
    }
  })

  return (
    <>
      {/* Main projectile - larger */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.35, 10, 10]} />
        <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={2} />
      </mesh>
      {/* Trail glow */}
      <mesh ref={trailRef}>
        <capsuleGeometry args={[0.15, 0.8, 6, 8]} />
        <meshStandardMaterial
          color="#ff6600"
          emissive="#ff4400"
          emissiveIntensity={1.5}
          transparent
          opacity={0.5}
        />
      </mesh>
    </>
  )
}

function PunchImpact() {
  const meshRef = useRef<Mesh>(null!)
  const punchFlashTimer = useGameStore(s => s.punchFlashTimer)
  const selectedLane = useGameStore(s => s.selectedLane)

  useFrame(() => {
    if (!meshRef.current) return
    meshRef.current.visible = punchFlashTimer > 0
    if (punchFlashTimer > 0) {
      meshRef.current.position.set((selectedLane - 2) * 2.2, 1.2, 2)
      const t = punchFlashTimer / 0.2
      meshRef.current.scale.setScalar(1 + (1 - t) * 2)
      const mat = meshRef.current.material as any
      if (mat) mat.opacity = t * 0.6
    }
  })

  return (
    <mesh ref={meshRef} visible={false}>
      <ringGeometry args={[0.3, 0.6, 12]} />
      <meshBasicMaterial color="#fbbf24" transparent opacity={0.5} side={2} />
    </mesh>
  )
}

export default function ProjectileRenderer() {
  const projectiles = useGameStore(s => s.projectiles)
  return (
    <>
      {projectiles.map(p => <BazookaShot key={p.uid} proj={p} />)}
      <PunchImpact />
    </>
  )
}
