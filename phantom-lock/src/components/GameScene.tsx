import { useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import CameraRig from './CameraRig.tsx'
import Arena from './Arena.tsx'
import Player from './Player.tsx'
import EnemyManager from './EnemyManager.tsx'
import ProjectileManager from './ProjectileManager.tsx'
import LockOnReticle from './LockOnReticle.tsx'
import { useGameStore } from '../store/gameStore.ts'

function LockConeIndicator() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const { camera } = useThree()

  useFrame(() => {
    if (!meshRef.current) return
    const s = useGameStore.getState()
    meshRef.current.visible = s.rightMouseDown && s.lockOn.active

    if (meshRef.current.visible) {
      // Position cone at crosshair world pos, facing away from camera
      const p = s.player.position
      meshRef.current.position.set(p[0], p[1] + 1, p[2])
      meshRef.current.quaternion.copy(camera.quaternion)
      // Rotate to point forward (cone opens toward where player aims)
      meshRef.current.rotateX(Math.PI / 2)
    }
  })

  return (
    <mesh ref={meshRef} visible={false}>
      <coneGeometry args={[3, 8, 16, 1, true]} />
      <meshBasicMaterial
        color="#22d3ee"
        transparent
        opacity={0.08}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

export default function GameScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 12, 16], fov: 60 }}
      onContextMenu={(e) => e.preventDefault()}
      style={{ width: '100%', height: '100%' }}
    >
      <CameraRig />
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <pointLight position={[0, 10, 0]} intensity={0.4} color="#22d3ee" />
      <fog attach="fog" args={['#0a0a1a', 25, 50]} />
      <Arena />
      <Player />
      <EnemyManager />
      <ProjectileManager />
      <LockOnReticle />
      <LockConeIndicator />
    </Canvas>
  )
}
