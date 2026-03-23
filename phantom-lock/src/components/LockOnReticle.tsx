import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/gameStore.ts'

function LockLine({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame(() => {
    if (!meshRef.current) return
    const fx = from[0], fy = from[1], fz = from[2]
    const tx = to[0], ty = to[1], tz = to[2]
    const mx = (fx + tx) / 2, my = (fy + ty) / 2, mz = (fz + tz) / 2
    meshRef.current.position.set(mx, my, mz)
    const dx = tx - fx, dy = ty - fy, dz = tz - fz
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
    meshRef.current.scale.set(1, len, 1)
    meshRef.current.lookAt(tx, ty, tz)
    meshRef.current.rotateX(Math.PI / 2)
  })

  return (
    <mesh ref={meshRef}>
      <cylinderGeometry args={[0.02, 0.02, 1, 4]} />
      <meshBasicMaterial color="#ef4444" transparent opacity={0.5} />
    </mesh>
  )
}

function Reticle({ position, playerPos }: { position: [number, number, number]; playerPos: [number, number, number] }) {
  const outerRef = useRef<THREE.Mesh>(null!)
  const innerRef = useRef<THREE.Mesh>(null!)
  const { camera } = useThree()

  useFrame(() => {
    if (!outerRef.current || !innerRef.current) return
    outerRef.current.position.set(position[0], position[1], position[2])
    outerRef.current.quaternion.copy(camera.quaternion)
    outerRef.current.rotation.z += 0.04

    innerRef.current.position.set(position[0], position[1], position[2])
    innerRef.current.quaternion.copy(camera.quaternion)
    innerRef.current.rotation.z -= 0.06 // counter-rotate
  })

  return (
    <>
      {/* Outer ring - larger and bright red */}
      <mesh ref={outerRef}>
        <ringGeometry args={[0.9, 1.0, 4]} />
        <meshBasicMaterial color="#ff2222" transparent opacity={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* Inner counter-rotating ring */}
      <mesh ref={innerRef}>
        <ringGeometry args={[0.5, 0.6, 6]} />
        <meshBasicMaterial color="#ff4444" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* Lock line from player to enemy */}
      <LockLine from={playerPos} to={position} />
    </>
  )
}

export default function LockOnReticle() {
  const lockedUids = useGameStore(s => s.lockOn.lockedUids)
  const enemies = useGameStore(s => s.enemies)
  const playerPos = useGameStore(s => s.player.position)

  const locked = enemies.filter(e => lockedUids.includes(e.uid))

  return (
    <>
      {locked.map(e => (
        <Reticle key={e.uid} position={e.position} playerPos={playerPos} />
      ))}
    </>
  )
}
