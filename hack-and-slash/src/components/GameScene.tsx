import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { PerspectiveCamera as PCamera } from 'three'
import { useGameStore } from '../store/gameStore.ts'
import Player from './Player.tsx'
import EnemyManager from './EnemyManager.tsx'
import LootDrop from './LootDrop.tsx'

function CameraRig() {
  const camRef = useRef<PCamera>(null!)

  useFrame((state, delta) => {
    const store = useGameStore.getState()
    const cam = state.camera

    if (store.phase === 'title') {
      // Slow auto-rotation for title screen
      const t = state.clock.elapsedTime * 0.15
      cam.position.x = Math.sin(t) * 20
      cam.position.y = 18
      cam.position.z = Math.cos(t) * 20
      cam.lookAt(0, 0, 0)
      return
    }

    // Apply slow-mo during game over transition
    const effectiveDelta = store.phase === 'game_over_transition' ? delta * 0.25 : delta
    store.tick(effectiveDelta)

    const pos = store.player.position
    const targetX = pos[0]
    const targetZ = pos[2] + 12
    const targetY = 18

    cam.position.x += (targetX - cam.position.x) * 0.08
    cam.position.y += (targetY - cam.position.y) * 0.08
    cam.position.z += (targetZ - cam.position.z) * 0.08

    // Screen shake
    if (store.shakeTimer > 0) {
      cam.position.x += (Math.random() - 0.5) * 0.3
      cam.position.y += (Math.random() - 0.5) * 0.3
    }

    cam.lookAt(pos[0], 0, pos[2])
  })

  return <perspectiveCamera ref={camRef} />
}

function ArenaTiles() {
  const tiles: React.JSX.Element[] = []
  for (let x = -7; x < 8; x++) {
    for (let z = -7; z < 8; z++) {
      const isDark = (x + z) % 2 === 0
      tiles.push(
        <mesh key={`${x}-${z}`} position={[x * 2, -0.01, z * 2]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2, 2]} />
          <meshStandardMaterial color={isDark ? '#3a6b35' : '#2d5a28'} />
        </mesh>
      )
    }
  }
  return <>{tiles}</>
}

function DeathEffects() {
  const effects = useGameStore(s => s.deathEffects)
  return (
    <>
      {effects.map((e, i) => {
        const scale = (0.5 - e.timer) * 6
        return (
          <mesh key={i} position={[e.x, 0.05, e.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[scale * 0.8, scale, 24]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={e.timer * 2} />
          </mesh>
        )
      })}
    </>
  )
}

function Arena() {
  return (
    <>
      {/* Checkerboard floor */}
      <ArenaTiles />
      {/* Walls (invisible colliders, visible edges) */}
      {[
        [0, 0.5, -15, 30, 1, 0.2],
        [0, 0.5, 15, 30, 1, 0.2],
        [-15, 0.5, 0, 0.2, 1, 30],
        [15, 0.5, 0, 0.2, 1, 30],
      ].map(([x, y, z, w, h, d], i) => (
        <mesh key={i} position={[x as number, y as number, z as number]}>
          <boxGeometry args={[w as number, h as number, d as number]} />
          <meshStandardMaterial color="#555" opacity={0.3} transparent />
        </mesh>
      ))}
    </>
  )
}

function ClickHandler() {
  const handleClick = () => {
    const store = useGameStore.getState()
    if (store.phase === 'playing') {
      store.playerAttack()
    }
  }

  return (
    <mesh
      position={[0, -1, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={handleClick}
      visible={false}
    >
      <planeGeometry args={[60, 60]} />
      <meshBasicMaterial />
    </mesh>
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
    </>
  )
}

function LootDrops() {
  const drops = useGameStore(s => s.lootDrops)
  return (
    <>
      {drops.map(d => (
        <LootDrop key={d.id} drop={d} />
      ))}
    </>
  )
}

function GameOverFlash() {
  const phase = useGameStore(s => s.phase)
  const transition = useGameStore(s => s.gameOverTransition)
  if (phase !== 'game_over_transition') return null
  return (
    <mesh position={[0, 20, 0]}>
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial color="#ff0000" transparent opacity={transition * 0.3} depthTest={false} />
    </mesh>
  )
}

export default function GameScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 18, 12], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
    >
      <CameraRig />
      <Lights />
      <Arena />
      <Player />
      <EnemyManager />
      <LootDrops />
      <DeathEffects />
      <ClickHandler />
      <GameOverFlash />
    </Canvas>
  )
}
