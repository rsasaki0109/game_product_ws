import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'

interface SkillEffectProps {
  position: [number, number, number]
  color: string
  active: boolean
}

export default function SkillEffect({ position, color, active }: SkillEffectProps) {
  const meshRef = useRef<Mesh>(null!)

  useFrame(() => {
    if (!meshRef.current) return
    if (active) {
      meshRef.current.visible = true
      meshRef.current.scale.x = 1 + Math.sin(Date.now() * 0.01) * 0.3
      meshRef.current.scale.y = 1 + Math.sin(Date.now() * 0.01) * 0.3
      meshRef.current.rotation.z += 0.05
    } else {
      meshRef.current.visible = false
    }
  })

  return (
    <mesh ref={meshRef} position={position} visible={false}>
      <ringGeometry args={[0.6, 0.8, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} />
    </mesh>
  )
}
