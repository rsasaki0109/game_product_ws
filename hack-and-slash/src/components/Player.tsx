import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, Group } from 'three'
import { useGameStore } from '../store/gameStore.ts'

const keys: Record<string, boolean> = {}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true
    if (e.code === 'Escape') {
      useGameStore.getState().togglePause()
    }
  })
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false
  })
}

export default function Player() {
  const meshRef = useRef<Mesh>(null!)
  const swordRef = useRef<Mesh>(null!)
  const arcRef = useRef<Mesh>(null!)
  const groupRef = useRef<Group>(null!)

  useFrame((_, delta) => {
    const store = useGameStore.getState()
    if (store.phase !== 'playing' || store.paused) return

    // Movement
    let dx = 0
    let dz = 0
    if (keys['KeyW'] || keys['ArrowUp']) dz -= 1
    if (keys['KeyS'] || keys['ArrowDown']) dz += 1
    if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1
    if (keys['KeyD'] || keys['ArrowRight']) dx += 1

    // Dodge
    if (keys['Space']) {
      store.playerDodge(dx, dz)
      keys['Space'] = false
    }

    const len = Math.sqrt(dx * dx + dz * dz)
    if (len > 0.01 && !store.player.isDodging) {
      dx /= len
      dz /= len
      const speed = store.player.speed * delta
      const newX = clamp(store.player.position[0] + dx * speed, -14, 14)
      const newZ = clamp(store.player.position[2] + dz * speed, -14, 14)
      const facing = Math.atan2(dx, dz)
      store.updatePlayer({
        position: [newX, 0, newZ],
        facing,
      })
    }

    // Sync mesh
    const pos = store.player.position
    groupRef.current.position.set(pos[0], 0.6, pos[2])
    groupRef.current.rotation.y = store.player.facing

    // Attack animation - full swing + scale pulse
    if (swordRef.current) {
      if (store.player.isAttacking) {
        swordRef.current.rotation.x = -Math.PI / 2
        meshRef.current.scale.setScalar(1.1)
      } else {
        swordRef.current.rotation.x = 0
        meshRef.current.scale.setScalar(1.0)
      }
    }

    // Attack arc visibility
    if (arcRef.current) {
      arcRef.current.visible = store.player.isAttacking
      if (store.player.isAttacking) {
        const t = store.player.attackTimer / 0.35
        arcRef.current.scale.setScalar(0.5 + (1 - t) * 1.5)
        const mat = arcRef.current.material as any
        if (mat) mat.opacity = t * 0.5
      }
    }

    // Invuln flash - turn white and shrink instead of toggling visibility
    if (store.player.invulnTimer > 0) {
      const flash = Math.floor(store.player.invulnTimer * 20) % 2 === 0
      const mat = meshRef.current.material as any
      if (mat) {
        mat.color.set(flash ? '#ffffff' : '#3b82f6')
        mat.emissive.set(flash ? '#ffffff' : '#000000')
        mat.emissiveIntensity = flash ? 0.5 : 0
      }
      meshRef.current.scale.setScalar(flash ? 0.8 : 1.0)
    } else {
      const mat = meshRef.current.material as any
      if (mat) {
        mat.color.set('#3b82f6')
        mat.emissive.set('#000000')
        mat.emissiveIntensity = 0
      }
      if (!store.player.isAttacking) {
        meshRef.current.scale.setScalar(1.0)
      }
    }
  })

  return (
    <group ref={groupRef} position={[0, 0.6, 0]}>
      <mesh ref={meshRef} castShadow>
        <capsuleGeometry args={[0.3, 0.6, 8, 16]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      {/* Sword */}
      <mesh ref={swordRef} position={[0.5, 0.3, 0]} castShadow>
        <boxGeometry args={[0.08, 0.08, 1.2]} />
        <meshStandardMaterial color="#d4d4d8" />
      </mesh>
      {/* Attack arc */}
      <mesh ref={arcRef} position={[0, 0, -1]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.8, 2.0, 16, 1, 0, Math.PI]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.4} side={2} />
      </mesh>
    </group>
  )
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}
