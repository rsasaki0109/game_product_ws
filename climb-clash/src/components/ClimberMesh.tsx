import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, MeshStandardMaterial, Group } from 'three'

interface ClimberMeshProps {
  position: [number, number]
  xOffset: number
  color: string
  freezeTimer: number
  shakeTimer: number
  fallFlash: number
}

export default function ClimberMesh({
  position,
  xOffset,
  color,
  freezeTimer,
  shakeTimer,
  fallFlash,
}: ClimberMeshProps) {
  const groupRef = useRef<Group>(null!)
  const meshRef = useRef<Mesh>(null!)
  const flashRef = useRef(0)

  useFrame((_, delta) => {
    if (!meshRef.current || !groupRef.current) return

    const targetX = xOffset + position[0]
    const targetY = position[1]

    // Shake animation
    let offsetX = 0
    if (shakeTimer > 0) {
      offsetX = Math.sin(Date.now() * 0.03) * 0.15
    }

    groupRef.current.position.x += (targetX + offsetX - groupRef.current.position.x) * 0.15
    groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.15
    groupRef.current.position.z = 0.3

    // Fall flash: red color and scale up briefly
    const mat = meshRef.current.material as MeshStandardMaterial
    if (fallFlash > 0) {
      const pulse = Math.sin(fallFlash * 15) > 0
      mat.color.set(pulse ? '#ff0000' : color)
      mat.emissive.set(pulse ? '#ff0000' : '#000000')
      mat.emissiveIntensity = pulse ? 0.6 : 0
      const s = 1 + fallFlash * 0.5
      meshRef.current.scale.set(s, s, s)
    } else if (freezeTimer > 0) {
      // Frozen: ice-blue color
      flashRef.current += delta * 10
      mat.color.set('#67e8f9')
      mat.emissive.set('#67e8f9')
      mat.emissiveIntensity = 0.3
      meshRef.current.scale.set(1, 1, 1)
    } else {
      flashRef.current = 0
      mat.color.set(color)
      mat.emissive.set('#000000')
      mat.emissiveIntensity = 0
      meshRef.current.scale.set(1, 1, 1)
    }
  })

  return (
    <group ref={groupRef} position={[xOffset + position[0], position[1], 0.3]}>
      <mesh ref={meshRef}>
        <capsuleGeometry args={[0.25, 0.5, 8, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Ice block when frozen */}
      {freezeTimer > 0 && (
        <mesh>
          <boxGeometry args={[0.8, 1.2, 0.8]} />
          <meshStandardMaterial
            color="#67e8f9"
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}
