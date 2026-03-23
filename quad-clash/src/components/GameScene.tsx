import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { useGameStore } from '../store/gameStore.ts'
import DashScene from './DashScene.tsx'
import JavelinScene from './JavelinScene.tsx'
import HighJumpScene from './HighJumpScene.tsx'
import MarathonScene from './MarathonScene.tsx'

const EVENT_SKY_COLORS: Record<string, string> = {
  dash: '#87ceeb',
  javelin: '#c8e6c9',
  highJump: '#e1bee7',
  marathon: '#ffe0b2',
}

function EventScene() {
  const eventType = useGameStore((s) => s.event.type)

  switch (eventType) {
    case 'dash':
      return <DashScene />
    case 'javelin':
      return <JavelinScene />
    case 'highJump':
      return <HighJumpScene />
    case 'marathon':
      return <MarathonScene />
  }
}

function SkyBackground() {
  const eventType = useGameStore((s) => s.event.type)
  const color = EVENT_SKY_COLORS[eventType] || '#87ceeb'
  return (
    <mesh position={[0, 20, -30]}>
      <planeGeometry args={[120, 60]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

function StartFlash() {
  const ref = useRef<Mesh>(null!)
  useFrame(() => {
    if (!ref.current) return
    const s = useGameStore.getState()
    if (s.event.phase === 'running' && s.event.elapsed < 0.3) {
      ref.current.visible = true
      const mat = ref.current.material as any
      if (mat) mat.opacity = Math.max(0, 0.3 - s.event.elapsed)
    } else {
      ref.current.visible = false
    }
  })
  return (
    <mesh ref={ref} position={[0, 5, 0]} visible={false}>
      <planeGeometry args={[40, 20]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthTest={false} />
    </mesh>
  )
}

export default function GameScene() {
  return (
    <Canvas
      camera={{ position: [0, 5, 12], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.0} />
      <SkyBackground />
      <StartFlash />
      <EventScene />
    </Canvas>
  )
}
