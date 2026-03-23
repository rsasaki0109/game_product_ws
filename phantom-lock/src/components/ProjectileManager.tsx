import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { useGameStore } from '../store/gameStore.ts'
import Projectile from './Projectile.tsx'
import type { QuickShotInstance } from '../types/game.ts'

function QuickShot({ shot }: { shot: QuickShotInstance }) {
  const meshRef = useRef<Mesh>(null!)
  useFrame(() => {
    if (!meshRef.current) return
    meshRef.current.position.set(shot.position[0], shot.position[1], shot.position[2])
  })
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.1, 6, 6]} />
      <meshStandardMaterial
        color={shot.isEnemy ? '#ef4444' : '#fbbf24'}
        emissive={shot.isEnemy ? '#dc2626' : '#f59e0b'}
        emissiveIntensity={2}
      />
    </mesh>
  )
}

export default function ProjectileManager() {
  const projectiles = useGameStore(s => s.projectiles)
  const quickShots = useGameStore(s => s.quickShots)
  return (
    <>
      {projectiles.map(p => <Projectile key={p.uid} proj={p} />)}
      {quickShots.map(s => <QuickShot key={s.uid} shot={s} />)}
    </>
  )
}
