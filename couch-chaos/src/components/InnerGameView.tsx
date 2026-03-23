import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { PlayerState, MiniGameState } from '../types/game.ts'

interface InnerGameViewProps {
  player: PlayerState
  miniGame: MiniGameState
  offsetX: number  // -5 for left screen, +5 for right screen
  isBlind: boolean
  isShaking: boolean
}

export default function InnerGameView({ player, miniGame, offsetX, isBlind, isShaking }: InnerGameViewProps) {
  const groupRef = useRef<Group>(null!)

  useFrame((state) => {
    if (!groupRef.current) return
    const shake = isShaking ? Math.sin(state.clock.elapsedTime * 30) * 0.15 : 0
    groupRef.current.position.set(offsetX - miniGame.scrollX * 0.8, shake, 0)
  })

  const viewWidth = 8

  return (
    <group ref={groupRef}>
      {/* Ground */}
      <mesh position={[miniGame.scrollX + viewWidth / 2, -0.5, 0]}>
        <boxGeometry args={[200, 1, 1]} />
        <meshStandardMaterial color="#4a3728" />
      </mesh>

      {/* Player character */}
      <mesh position={[player.x + offsetX * 0.0, player.y + 0.4, 0.1]} castShadow>
        <capsuleGeometry args={[0.2, 0.4, 8, 16]} />
        <meshStandardMaterial
          color={offsetX < 0 ? '#3b82f6' : '#ef4444'}
          emissive={player.stunTimer > 0 ? '#fbbf24' : '#000000'}
          emissiveIntensity={player.stunTimer > 0 ? 1 : 0}
        />
      </mesh>

      {/* Coins */}
      {miniGame.coins.map((coin, i) => (
        !coin.collected && (
          <mesh key={`c${i}`} position={[coin.x, coin.y + 0.3, 0.1]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.5} />
          </mesh>
        )
      ))}

      {/* Obstacles */}
      {miniGame.obstacles.map((obs, i) => (
        <mesh key={`o${i}`} position={[obs.x + obs.width / 2, obs.y + obs.height / 2, 0.1]}>
          <boxGeometry args={[obs.width, obs.height, 0.5]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
      ))}

      {/* Finish line */}
      <mesh position={[130, 2, 0]}>
        <boxGeometry args={[0.2, 4, 0.5]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
      </mesh>

      {/* Blind overlay */}
      {isBlind && (
        <mesh position={[miniGame.scrollX + viewWidth / 2, 2, 0.3]}>
          <planeGeometry args={[12, 8]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  )
}
