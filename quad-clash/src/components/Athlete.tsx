import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'

interface AthleteProps {
  position: [number, number, number]
  color: string
  stunned: boolean
}

export default function Athlete({ position, color, stunned }: AthleteProps) {
  const bodyRef = useRef<Mesh>(null)

  useFrame((_, delta) => {
    if (!bodyRef.current) return
    if (stunned) {
      // Flash effect
      bodyRef.current.visible = Math.sin(Date.now() * 0.02) > 0
    } else {
      bodyRef.current.visible = true
      // Subtle bobbing
      bodyRef.current.rotation.z = Math.sin(Date.now() * 0.005) * 0.05
    }
    void delta
  })

  return (
    <group position={position}>
      {/* Body - capsule */}
      <mesh ref={bodyRef} position={[0, 0.6, 0]}>
        <capsuleGeometry args={[0.2, 0.6, 4, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.1, 0.1, 0]}>
        <boxGeometry args={[0.08, 0.3, 0.08]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.1, 0.1, 0]}>
        <boxGeometry args={[0.08, 0.3, 0.08]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}
