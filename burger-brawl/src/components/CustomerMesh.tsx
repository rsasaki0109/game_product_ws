import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, Group } from 'three'
import type { CustomerInstance } from '../types/game.ts'

function OrderShape({ order, x, z }: { order: string; x: number; z: number }) {
  // Distinct shapes per food type
  switch (order) {
    case 'burger':
      return (
        <mesh position={[x, 2.2, z]}>
          <boxGeometry args={[0.3, 0.2, 0.3]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
        </mesh>
      )
    case 'fries':
      return (
        <mesh position={[x, 2.2, z]}>
          <cylinderGeometry args={[0.1, 0.15, 0.35, 6]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
        </mesh>
      )
    case 'drink':
      return (
        <mesh position={[x, 2.2, z]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} />
        </mesh>
      )
    case 'combo':
      return (
        <group position={[x, 2.2, z]}>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.3, 0.3, 0.1]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.3, 0.3, 0.1]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
          </mesh>
        </group>
      )
    default:
      return null
  }
}

export default function CustomerMesh({ customer }: { customer: CustomerInstance }) {
  const meshRef = useRef<Mesh>(null!)
  const glowRef = useRef<Mesh>(null!)
  const groupRef = useRef<Group>(null!)

  useFrame((state) => {
    if (!meshRef.current) return
    const x = (customer.position - 2) * 2.2
    const z = customer.distance
    meshRef.current.position.set(x, 1.2, z)

    // Shake for monsters waiting
    if (customer.def.type === 'monster' && customer.state === 'waiting') {
      meshRef.current.position.x += Math.sin(state.clock.elapsedTime * 15) * 0.05
    }

    // Monster pulsing red glow
    if (glowRef.current && customer.def.type === 'monster') {
      glowRef.current.position.set(x, 1.2, z)
      const pulse = 0.3 + Math.sin(state.clock.elapsedTime * 4) * 0.3
      const mat = glowRef.current.material as any
      if (mat) {
        mat.emissiveIntensity = pulse
        mat.opacity = 0.3 + pulse * 0.3
      }
      glowRef.current.scale.setScalar(1.05 + Math.sin(state.clock.elapsedTime * 4) * 0.1)
    }

    // Low patience color change
    if (customer.state === 'waiting' && customer.def.type === 'normal') {
      const patienceRatio = customer.patienceTimer / customer.def.patience
      const mat = meshRef.current.material as any
      if (mat) {
        if (patienceRatio < 0.3) {
          // Pulse toward red
          const urgency = Math.sin(state.clock.elapsedTime * 12) > 0
          mat.color.set(urgency ? '#ff4444' : customer.def.color)
          mat.emissive.set(urgency ? '#ff0000' : '#000000')
          mat.emissiveIntensity = urgency ? 0.3 : 0
        } else {
          mat.color.set(customer.hitFlash > 0 ? '#ffffff' : customer.def.color)
          mat.emissive.set('#000000')
          mat.emissiveIntensity = 0
        }
      }
    } else if (customer.hitFlash > 0) {
      const mat = meshRef.current.material as any
      if (mat) {
        mat.color.set('#ffffff')
        mat.emissive.set('#ffffff')
        mat.emissiveIntensity = 0.5
      }
    } else if (customer.def.type !== 'monster') {
      const mat = meshRef.current.material as any
      if (mat) {
        mat.color.set(customer.def.color)
        mat.emissive.set('#000000')
        mat.emissiveIntensity = 0
      }
    }
  })

  const isMonster = customer.def.type === 'monster'
  const isFlashing = customer.hitFlash > 0
  const color = isFlashing ? '#ffffff' : customer.def.color
  const scale = isMonster ? 1.5 : 0.9
  const isDead = customer.state === 'dead'
  const x = (customer.position - 2) * 2.2

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} castShadow>
        {/* Body */}
        <capsuleGeometry args={[0.3 * scale, 0.5 * scale, 8, 16]} />
        <meshStandardMaterial
          color={color}
          transparent={isDead}
          opacity={isDead ? 0.4 : 1}
        />
      </mesh>
      {/* Monster glow sphere */}
      {isMonster && !isDead && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[0.6, 12, 12]} />
          <meshStandardMaterial
            color="#ff0000"
            emissive="#ff0000"
            emissiveIntensity={0.5}
            transparent
            opacity={0.3}
          />
        </mesh>
      )}
      {/* Monster horns - BIGGER */}
      {isMonster && !isDead && (
        <>
          <mesh position={[x - 0.3, 2.3, customer.distance]}>
            <coneGeometry args={[0.15, 0.5, 6]} />
            <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[x + 0.3, 2.3, customer.distance]}>
            <coneGeometry args={[0.15, 0.5, 6]} />
            <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.3} />
          </mesh>
        </>
      )}
      {/* Order shape for normal customers */}
      {!isMonster && customer.state === 'waiting' && customer.def.order && (
        <OrderShape order={customer.def.order} x={x} z={customer.distance} />
      )}
      {/* Patience bar */}
      {customer.state === 'waiting' && (
        <>
          <mesh position={[x, 2.5, customer.distance]}>
            <planeGeometry args={[0.8, 0.08]} />
            <meshBasicMaterial color="#333" />
          </mesh>
          <mesh position={[
            x - (1 - customer.patienceTimer / customer.def.patience) * 0.4,
            2.5, customer.distance + 0.001,
          ]}>
            <planeGeometry args={[Math.max(0.01, (customer.patienceTimer / customer.def.patience) * 0.78), 0.06]} />
            <meshBasicMaterial color={customer.patienceTimer / customer.def.patience > 0.3 ? '#22c55e' : '#ef4444'} />
          </mesh>
        </>
      )}
      {/* Monster danger zone indicator */}
      {isMonster && customer.state === 'approaching' && customer.distance < 4 && (
        <mesh position={[x, 0.02, customer.distance]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.8, 12]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.4} side={2} />
        </mesh>
      )}
    </group>
  )
}
