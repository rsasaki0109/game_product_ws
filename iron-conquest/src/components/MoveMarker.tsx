import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { useGameStore } from '../store/gameStore.ts'

export default function MoveMarker() {
  const ringRef = useRef<Mesh>(null!)
  const moveMarker = useGameStore(s => s.moveMarker)

  useFrame(() => {
    if (!ringRef.current || !moveMarker) return
    const t = moveMarker.timer
    const scale = 1 + (1 - t) * 1.5
    ringRef.current.scale.set(scale, scale, 1)
    ;(ringRef.current.material as any).opacity = t * 0.6
    ringRef.current.position.set(moveMarker.position[0], 0.1, moveMarker.position[1])
    ringRef.current.visible = true
  })

  if (!moveMarker) return null

  return (
    <mesh
      ref={ringRef}
      position={[moveMarker.position[0], 0.1, moveMarker.position[1]]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[0.3, 0.5]} />
      <meshBasicMaterial color="#22c55e" transparent opacity={0.6} />
    </mesh>
  )
}
