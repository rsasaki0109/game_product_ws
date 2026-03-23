import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { PointLight as PL } from 'three'
import CameraRig from './CameraRig.tsx'
import Counter from './Counter.tsx'
import CustomerRenderer from './CustomerRenderer.tsx'
import ProjectileRenderer from './ProjectileRenderer.tsx'
import { useGameStore } from '../store/gameStore.ts'

function ComboPulseLight() {
  const ref = useRef<PL>(null!)
  useFrame((state) => {
    if (!ref.current) return
    const combo = useGameStore.getState().combo
    if (combo > 3) {
      ref.current.intensity = 0.6 + Math.sin(state.clock.elapsedTime * 6) * 0.3
      ref.current.visible = true
    } else {
      ref.current.visible = false
    }
  })
  return <pointLight ref={ref} position={[0, 4, 4]} color="#f59e0b" intensity={0.6} distance={20} visible={false} />
}

export default function GameScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 6, -3], fov: 55 }}
      style={{ width: '100%', height: '100%' }}
    >
      <CameraRig />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, -5]} intensity={0.8} castShadow />
      <pointLight position={[0, 5, 2]} intensity={0.4} color="#fbbf24" />
      <ComboPulseLight />
      <Counter />
      <CustomerRenderer />
      <ProjectileRenderer />
    </Canvas>
  )
}
