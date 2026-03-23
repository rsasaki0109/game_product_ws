import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import type { EnemyInstance } from '../types/game.ts'

interface EnemyProps {
  enemy: EnemyInstance
}

export default function Enemy({ enemy }: EnemyProps) {
  const meshRef = useRef<Mesh>(null!)
  const ringRef = useRef<Mesh>(null!)

  useFrame((state) => {
    if (!meshRef.current) return
    meshRef.current.position.set(
      enemy.position[0],
      enemy.def.scale * 0.6,
      enemy.position[2],
    )

    // Hit flash: scale up briefly then back
    if (enemy.hitTimer > 0) {
      const hitT = enemy.hitTimer / 0.25
      const hitScale = 1 + 0.3 * hitT
      meshRef.current.scale.setScalar(hitScale)
    } else {
      meshRef.current.scale.setScalar(1.0)
    }

    // Wind-up flash: pulse red
    if (enemy.state === 'windUp') {
      const flash = Math.sin(state.clock.elapsedTime * 20) > 0
      const mat = meshRef.current.material as any
      if (mat) {
        mat.color.set(flash ? '#ff0000' : enemy.def.color)
        mat.emissive.set(flash ? '#ff0000' : '#000000')
        mat.emissiveIntensity = flash ? 0.6 : 0
      }
    } else if (enemy.hitTimer > 0) {
      const mat = meshRef.current.material as any
      if (mat) {
        mat.color.set('#ffffff')
        mat.emissive.set('#ffffff')
        mat.emissiveIntensity = 0.5
      }
    } else {
      const mat = meshRef.current.material as any
      if (mat) {
        mat.color.set(enemy.def.color)
        mat.emissive.set('#000000')
        mat.emissiveIntensity = 0
      }
    }

    // Expanding hit ring
    if (ringRef.current) {
      if (enemy.hitTimer > 0) {
        ringRef.current.visible = true
        const t = 1 - enemy.hitTimer / 0.25
        ringRef.current.scale.setScalar(1 + t * 3)
        const rmat = ringRef.current.material as any
        if (rmat) rmat.opacity = (1 - t) * 0.6
        ringRef.current.position.set(
          enemy.position[0],
          0.1,
          enemy.position[2],
        )
      } else {
        ringRef.current.visible = false
      }
    }
  })

  return (
    <>
      <mesh ref={meshRef} castShadow>
        <capsuleGeometry args={[enemy.def.scale * 0.3, enemy.def.scale * 0.6, 8, 16]} />
        <meshStandardMaterial
          color={enemy.def.color}
        />
        {/* HP bar */}
        <mesh position={[0, enemy.def.scale * 0.8 + 0.3, 0]}>
          <planeGeometry args={[1, 0.1]} />
          <meshBasicMaterial color="#333333" />
        </mesh>
        <mesh position={[-(1 - enemy.currentHp / enemy.maxHp) * 0.5, enemy.def.scale * 0.8 + 0.3, 0.001]}>
          <planeGeometry args={[Math.max(0.01, enemy.currentHp / enemy.maxHp), 0.08]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </mesh>
      {/* Hit ring effect */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.3, 0.5, 16]} />
        <meshBasicMaterial color="#ffaa00" transparent opacity={0.5} side={2} />
      </mesh>
    </>
  )
}
