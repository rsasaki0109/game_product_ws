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

/* Hat for normal customers - small box on top of head */
function CustomerHat({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group>
      {/* Brim */}
      <mesh position={[x, 2.0, z]}>
        <boxGeometry args={[0.45, 0.05, 0.45]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Crown */}
      <mesh position={[x, 2.15, z]}>
        <boxGeometry args={[0.3, 0.25, 0.3]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

/* Karenzilla: tall, thin, angry red */
function KarenzillaShape({ x, z }: { x: number; z: number }) {
  return (
    <group>
      {/* Tall thin body */}
      <mesh position={[x, 1.5, z]} castShadow>
        <boxGeometry args={[0.4, 2.0, 0.35]} />
        <meshStandardMaterial color="#dc2626" emissive="#b91c1c" emissiveIntensity={0.3} />
      </mesh>
      {/* Angry head - smaller */}
      <mesh position={[x, 2.7, z]}>
        <boxGeometry args={[0.35, 0.35, 0.3]} />
        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.4} />
      </mesh>
      {/* Angry eyebrows */}
      <mesh position={[x - 0.1, 2.8, z + 0.16]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.15, 0.04, 0.02]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh position={[x + 0.1, 2.8, z + 0.16]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.15, 0.04, 0.02]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* Hair spike */}
      <mesh position={[x, 3.05, z]}>
        <coneGeometry args={[0.15, 0.4, 4]} />
        <meshStandardMaterial color="#8b0000" />
      </mesh>
    </group>
  )
}

/* CreamThrower: round, white/pink */
function CreamThrowerShape({ x, z }: { x: number; z: number }) {
  return (
    <group>
      {/* Big round body */}
      <mesh position={[x, 1.3, z]} castShadow>
        <sphereGeometry args={[0.65, 12, 12]} />
        <meshStandardMaterial color="#fce7f3" emissive="#f9a8d4" emissiveIntensity={0.3} />
      </mesh>
      {/* Head */}
      <mesh position={[x, 2.1, z]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#fce7f3" emissiveIntensity={0.2} />
      </mesh>
      {/* Cream swirl on top */}
      <mesh position={[x, 2.45, z]}>
        <coneGeometry args={[0.15, 0.3, 8]} />
        <meshStandardMaterial color="#fde68a" emissive="#fde68a" emissiveIntensity={0.3} />
      </mesh>
      {/* Cream splat arms */}
      <mesh position={[x - 0.6, 1.4, z]}>
        <sphereGeometry args={[0.2, 6, 6]} />
        <meshStandardMaterial color="#fde68a" emissive="#fde68a" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[x + 0.6, 1.4, z]}>
        <sphereGeometry args={[0.2, 6, 6]} />
        <meshStandardMaterial color="#fde68a" emissive="#fde68a" emissiveIntensity={0.2} />
      </mesh>
    </group>
  )
}

/* TableFlipper: wide, brown/dark, big arms (side boxes) */
function TableFlipperShape({ x, z }: { x: number; z: number }) {
  return (
    <group>
      {/* Wide body */}
      <mesh position={[x, 1.2, z]} castShadow>
        <boxGeometry args={[1.0, 1.2, 0.6]} />
        <meshStandardMaterial color="#4a2c17" emissive="#3b1f0e" emissiveIntensity={0.2} />
      </mesh>
      {/* Head */}
      <mesh position={[x, 2.0, z]}>
        <boxGeometry args={[0.45, 0.4, 0.4]} />
        <meshStandardMaterial color="#5c3a1e" emissive="#4a2c17" emissiveIntensity={0.2} />
      </mesh>
      {/* BIG arms (side boxes) */}
      <mesh position={[x - 0.8, 1.3, z]}>
        <boxGeometry args={[0.5, 0.9, 0.4]} />
        <meshStandardMaterial color="#5c3a1e" emissive="#3b1f0e" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[x + 0.8, 1.3, z]}>
        <boxGeometry args={[0.5, 0.9, 0.4]} />
        <meshStandardMaterial color="#5c3a1e" emissive="#3b1f0e" emissiveIntensity={0.2} />
      </mesh>
      {/* Fists */}
      <mesh position={[x - 0.8, 0.75, z]}>
        <boxGeometry args={[0.35, 0.35, 0.35]} />
        <meshStandardMaterial color="#7c4f2a" emissive="#5c3a1e" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[x + 0.8, 0.75, z]}>
        <boxGeometry args={[0.35, 0.35, 0.35]} />
        <meshStandardMaterial color="#7c4f2a" emissive="#5c3a1e" emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}

/* ScreamKing: spiky with spike meshes on top */
function ScreamKingShape({ x, z, elapsed }: { x: number; z: number; elapsed: number }) {
  const spikeAngles = [0, Math.PI * 0.4, Math.PI * 0.8, Math.PI * 1.2, Math.PI * 1.6]
  return (
    <group>
      {/* Body */}
      <mesh position={[x, 1.3, z]} castShadow>
        <boxGeometry args={[0.6, 1.4, 0.5]} />
        <meshStandardMaterial color="#7c3aed" emissive="#6d28d9" emissiveIntensity={0.4} />
      </mesh>
      {/* Head */}
      <mesh position={[x, 2.2, z]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#7c3aed" emissiveIntensity={0.5} />
      </mesh>
      {/* Open mouth */}
      <mesh position={[x, 2.1, z + 0.3]}>
        <boxGeometry args={[0.2, 0.15, 0.05]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* Crown of spikes */}
      {spikeAngles.map((angle, i) => (
        <mesh
          key={i}
          position={[
            x + Math.cos(angle) * 0.2,
            2.55 + Math.sin(elapsed * 3 + i) * 0.05,
            z + Math.sin(angle) * 0.2,
          ]}
          rotation={[
            Math.sin(angle) * 0.3,
            0,
            Math.cos(angle) * 0.3,
          ]}
        >
          <coneGeometry args={[0.08, 0.4, 4]} />
          <meshStandardMaterial
            color="#a855f7"
            emissive="#c084fc"
            emissiveIntensity={0.8}
          />
        </mesh>
      ))}
      {/* Extra large center spike */}
      <mesh position={[x, 2.75, z]}>
        <coneGeometry args={[0.1, 0.5, 4]} />
        <meshStandardMaterial color="#c084fc" emissive="#a855f7" emissiveIntensity={1.0} />
      </mesh>
    </group>
  )
}

export default function CustomerMesh({ customer }: { customer: CustomerInstance }) {
  const meshRef = useRef<Mesh>(null!)
  const glowRef = useRef<Mesh>(null!)
  const groupRef = useRef<Group>(null!)
  const elapsedRef = useRef(0)

  useFrame((state, delta) => {
    elapsedRef.current += delta
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
  const monsterKind = customer.def.monsterKind

  // Golden customer glow
  const isGolden = customer.def.name === 'Golden Customer'

  return (
    <group ref={groupRef}>
      {/* Use distinct monster shapes based on monsterKind */}
      {isMonster && monsterKind === 'karenzilla' && !isDead && (
        <KarenzillaShape x={x} z={customer.distance} />
      )}
      {isMonster && monsterKind === 'creamthrower' && !isDead && (
        <CreamThrowerShape x={x} z={customer.distance} />
      )}
      {isMonster && monsterKind === 'tableflip' && !isDead && (
        <TableFlipperShape x={x} z={customer.distance} />
      )}
      {isMonster && monsterKind === 'screamking' && !isDead && (
        <ScreamKingShape x={x} z={customer.distance} elapsed={elapsedRef.current} />
      )}
      {/* Default body for normal customers and dead/fallback monsters */}
      {(!isMonster || isDead || (!monsterKind && isMonster)) && (
        <mesh ref={meshRef} castShadow>
          <capsuleGeometry args={[0.3 * scale, 0.5 * scale, 8, 16]} />
          <meshStandardMaterial
            color={color}
            transparent={isDead}
            opacity={isDead ? 0.4 : 1}
          />
        </mesh>
      )}
      {/* Invisible ref tracker for monsters with custom shapes */}
      {isMonster && !isDead && monsterKind && (
        <mesh ref={meshRef} visible={false}>
          <boxGeometry args={[0.01, 0.01, 0.01]} />
          <meshBasicMaterial />
        </mesh>
      )}
      {/* Hat for normal customers */}
      {!isMonster && !isDead && (
        <CustomerHat
          x={x}
          z={customer.distance}
          color={customer.def.color === '#60a5fa' ? '#2563eb'
            : customer.def.color === '#a78bfa' ? '#7c3aed'
            : customer.def.color === '#34d399' ? '#059669'
            : '#b45309'}
        />
      )}
      {/* Golden customer sparkle */}
      {isGolden && !isDead && (
        <mesh position={[x, 2.5, customer.distance]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={2.0} transparent opacity={0.8} />
        </mesh>
      )}
      {/* Monster glow sphere */}
      {isMonster && !isDead && (
        <mesh ref={isMonster && monsterKind ? glowRef : glowRef}>
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
