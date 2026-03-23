import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, MeshBasicMaterial } from 'three'

interface SabotageEffectProps {
  position: [number, number, number]
  active: boolean
  type: string | null
}

export default function SabotageEffect({ position, active, type }: SabotageEffectProps) {
  const ref = useRef<Mesh>(null)

  useFrame(() => {
    if (!ref.current) return
    if (active) {
      ref.current.visible = true
      ;(ref.current.material as MeshBasicMaterial).opacity = 0.3 + Math.sin(Date.now() * 0.01) * 0.2
    } else {
      ref.current.visible = false
    }
  })

  const color = type === 'smokescreen' ? '#333333'
    : type === 'headwind' ? '#88ccff'
    : type === 'reverse' ? '#ff4444'
    : '#ffaa00'

  return (
    <mesh ref={ref} position={position} visible={false}>
      <planeGeometry args={[2, 3]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} />
    </mesh>
  )
}
