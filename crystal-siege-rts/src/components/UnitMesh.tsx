import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import type { UnitInstance } from '../types/game.ts'
import { useGameStore } from '../store/gameStore.ts'

export default function UnitMesh({ unit }: { unit: UnitInstance }) {
  const meshRef = useRef<Mesh>(null!)
  const ringRef = useRef<Mesh>(null!)
  const expandRingRef = useRef<Mesh>(null!)
  const selectedUids = useGameStore(s => s.selectedUnitUids)
  const isSelected = selectedUids.includes(unit.uid)
  const wasSelected = useRef(false)
  const selectAnim = useRef(0)
  const expandAnim = useRef(0)

  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.position.set(unit.position[0], unit.def.scale * 0.5, unit.position[1])

    // Selection pop animation
    if (isSelected && !wasSelected.current) {
      selectAnim.current = 0.2
      expandAnim.current = 0.3
    }
    wasSelected.current = isSelected

    if (selectAnim.current > 0) {
      selectAnim.current = Math.max(0, selectAnim.current - delta)
      const t = selectAnim.current / 0.2
      const scale = 1 + t * 0.2
      meshRef.current.scale.set(scale, scale, scale)
    } else {
      meshRef.current.scale.set(1, 1, 1)
    }

    // Expanding ring animation
    if (expandRingRef.current) {
      if (expandAnim.current > 0) {
        expandAnim.current = Math.max(0, expandAnim.current - delta)
        const t = 1 - expandAnim.current / 0.3
        const ringScale = 1 + t * 2
        expandRingRef.current.scale.set(ringScale, ringScale, 1)
        ;(expandRingRef.current.material as any).opacity = 0.5 * (1 - t)
        expandRingRef.current.visible = true
      } else {
        expandRingRef.current.visible = false
      }
    }

    // Pulse selection ring
    if (ringRef.current && isSelected) {
      const pulse = 0.7 + Math.sin(Date.now() * 0.005) * 0.15
      ;(ringRef.current.material as any).opacity = pulse
      ringRef.current.position.set(unit.position[0], 0.05, unit.position[1])
    }
  })

  const baseColor = unit.owner === 'enemy' ? '#dc2626' : unit.def.color

  return (
    <group>
      <mesh
        ref={meshRef}
        castShadow
        userData={{ type: 'unit', uid: unit.uid, owner: unit.owner }}
      >
        <capsuleGeometry args={[unit.def.scale * 0.25, unit.def.scale * 0.5, 8, 16]} />
        <meshStandardMaterial color={baseColor} />
        {/* HP bar */}
        <mesh position={[0, unit.def.scale * 0.6, 0]}>
          <planeGeometry args={[0.8, 0.08]} />
          <meshBasicMaterial color="#333" />
        </mesh>
        <mesh position={[-(1 - unit.currentHp / unit.maxHp) * 0.4, unit.def.scale * 0.6, 0.001]}>
          <planeGeometry args={[Math.max(0.01, (unit.currentHp / unit.maxHp) * 0.78), 0.06]} />
          <meshBasicMaterial color={unit.owner === 'enemy' ? '#ef4444' : '#22c55e'} />
        </mesh>
        {/* Carrying crystals indicator */}
        {unit.carryingCrystals > 0 && (
          <mesh position={[0, unit.def.scale * 0.8, 0]}>
            <octahedronGeometry args={[0.12]} />
            <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.5} />
          </mesh>
        )}
      </mesh>
      {/* Selection ring */}
      {isSelected && (
        <mesh ref={ringRef} position={[unit.position[0], 0.05, unit.position[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.7]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.7} />
        </mesh>
      )}
      {/* Expanding selection feedback ring */}
      <mesh ref={expandRingRef} position={[unit.position[0], 0.06, unit.position[1]]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.4, 0.55]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.5} />
      </mesh>
    </group>
  )
}
