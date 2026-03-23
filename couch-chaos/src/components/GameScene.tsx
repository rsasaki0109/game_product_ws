import { useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/gameStore.ts'
import CouchScene from './CouchScene.tsx'
import InnerGameView from './InnerGameView.tsx'

const keys: Record<string, boolean> = {}

function CameraSetup() {
  const { camera } = useThree()
  useEffect(() => {
    camera.lookAt(new THREE.Vector3(0, 1, -1))
  }, [camera])
  return null
}

function GameLoop() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys[e.code] = true
      const store = useGameStore.getState()
      if (e.code === 'KeyR' && store.phase === 'result') { store.startGame(); return }
      if (store.phase !== 'playing' || store.paused || store.showTutorial) return
      if (e.code === 'KeyT') store.doPhysical('push')
      if (e.code === 'KeyY') store.doPhysical('cover')
      if (e.code === 'KeyU') store.doPhysical('pillow')
      if (e.code === 'KeyI') store.doPhysical('tickle')
    }
    const up = (e: KeyboardEvent) => { keys[e.code] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useFrame((state, delta) => {
    const store = useGameStore.getState()
    if (store.phase === 'title') {
      // Slow camera orbit for title
      const t = state.clock.elapsedTime * 0.15
      state.camera.position.set(Math.sin(t) * 7, 2.5, Math.cos(t) * 5 + 3)
      state.camera.lookAt(0, 1, -1)
      return
    }
    if (store.paused || store.showTutorial) return
    store.tick(delta, keys)
  })

  return null
}

function InnerGames() {
  const player = useGameStore(s => s.player)
  const ai = useGameStore(s => s.ai)
  const mg1 = useGameStore(s => s.miniGame1)
  const mg2 = useGameStore(s => s.miniGame2)

  return (
    <group position={[0, 1.5, -2.5]}>
      {/* Player's screen (left) */}
      <group position={[-2.2, 0, 0]} scale={[0.5, 0.5, 0.5]}>
        <InnerGameView
          player={player}
          miniGame={mg1}
          offsetX={0}
          isBlind={player.blindTimer > 0}
          isShaking={player.shakeTimer > 0 || player.pushTimer > 0}
        />
      </group>
      {/* AI's screen (right) */}
      <group position={[2.2, 0, 0]} scale={[0.5, 0.5, 0.5]}>
        <InnerGameView
          player={ai}
          miniGame={mg2}
          offsetX={0}
          isBlind={ai.blindTimer > 0}
          isShaking={ai.shakeTimer > 0 || ai.pushTimer > 0}
        />
      </group>
    </group>
  )
}

export default function GameScene() {
  return (
    <Canvas
      camera={{ position: [0, 2, 6], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
    >
      <CameraSetup />
      <GameLoop />
      <ambientLight intensity={0.35} color="#fff5e6" />
      <pointLight position={[0, 4, 2]} intensity={0.9} color="#fbbf24" />
      <directionalLight position={[3, 5, 2]} intensity={0.4} color="#ffe0b2" />
      <pointLight position={[-3, 3, 0]} intensity={0.3} color="#ff8a65" />
      <pointLight position={[3, 3, 0]} intensity={0.3} color="#ff8a65" />
      <CouchScene />
      <InnerGames />
    </Canvas>
  )
}
