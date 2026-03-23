import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGameStore } from '../store/gameStore.ts'
import CameraRig from './CameraRig.tsx'
import WallMesh from './WallMesh.tsx'
import ClimberMesh from './ClimberMesh.tsx'
import SkillEffect from './SkillEffect.tsx'

const PLAYER_WALL_X = -4
const AI_WALL_X = 4
const WIN_HEIGHT = 28

function GoalBanner() {
  return (
    <group position={[0, WIN_HEIGHT, 0]}>
      {/* Banner pole left */}
      <mesh position={[PLAYER_WALL_X - 1.5, 0, 0.5]}>
        <cylinderGeometry args={[0.05, 0.05, 2, 8]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
      {/* Banner pole right */}
      <mesh position={[AI_WALL_X + 1.5, 0, 0.5]}>
        <cylinderGeometry args={[0.05, 0.05, 2, 8]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
      {/* Banner ribbon */}
      <mesh position={[0, 0.5, 0.5]}>
        <planeGeometry args={[AI_WALL_X - PLAYER_WALL_X + 3, 0.8]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={0.4}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Checkered pattern line */}
      <mesh position={[0, -0.1, 0.5]}>
        <planeGeometry args={[AI_WALL_X - PLAYER_WALL_X + 3, 0.15]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.6} />
      </mesh>
    </group>
  )
}

function KeyHandler() {
  const movePlayer = useGameStore(s => s.movePlayer)
  const useSkill = useGameStore(s => s.useSkill)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const store = useGameStore.getState()
      if (e.code === 'KeyR' && (store.phase === 'victory' || store.phase === 'defeat')) {
        store.startGame()
        return
      }
      if (store.phase !== 'playing' || store.paused || store.showTutorial) return

      switch (e.code) {
        case 'KeyW':
          movePlayer('up')
          break
        case 'KeyS':
          movePlayer('down')
          break
        case 'KeyA':
          movePlayer('left')
          break
        case 'KeyD':
          movePlayer('right')
          break
        case 'Digit1':
          useSkill('destroy')
          break
        case 'Digit2':
          useSkill('freeze')
          break
        case 'Digit3':
          useSkill('shake')
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [movePlayer, useSkill])

  return null
}

function SceneContent() {
  const playerWall = useGameStore(s => s.playerWall)
  const aiWall = useGameStore(s => s.aiWall)
  const player = useGameStore(s => s.player)
  const ai = useGameStore(s => s.ai)

  return (
    <>
      <CameraRig />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 20, 10]} intensity={1} />

      {/* Goal banner at the top */}
      <GoalBanner />

      {/* Player wall and climber */}
      <WallMesh wall={playerWall} xOffset={PLAYER_WALL_X} />
      <ClimberMesh
        position={player.position}
        xOffset={PLAYER_WALL_X}
        color="#3b82f6"
        freezeTimer={player.freezeTimer}
        shakeTimer={player.shakeTimer}
        fallFlash={player.fallFlash}
      />
      <SkillEffect
        position={[PLAYER_WALL_X + player.position[0], player.position[1], 0.5]}
        color="#93c5fd"
        active={player.freezeTimer > 0}
      />

      {/* AI wall and climber */}
      <WallMesh wall={aiWall} xOffset={AI_WALL_X} />
      <ClimberMesh
        position={ai.position}
        xOffset={AI_WALL_X}
        color="#ef4444"
        freezeTimer={ai.freezeTimer}
        shakeTimer={ai.shakeTimer}
        fallFlash={ai.fallFlash}
      />
      <SkillEffect
        position={[AI_WALL_X + ai.position[0], ai.position[1], 0.5]}
        color="#fca5a5"
        active={ai.freezeTimer > 0}
      />

      <KeyHandler />
    </>
  )
}

export default function GameScene() {
  return (
    <Canvas
      camera={{ position: [0, 10, 20], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContent />
    </Canvas>
  )
}
