import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Group, Mesh } from 'three'
import type { PlayerState, MiniGameState } from '../types/game.ts'

interface InnerGameViewProps {
  player: PlayerState
  miniGame: MiniGameState
  offsetX: number  // -5 for left screen, +5 for right screen
  isBlind: boolean
  isShaking: boolean
}

/** Trail sphere that fades behind the player when moving fast */
function TrailSphere({ position, opacity, color }: { position: [number, number, number]; opacity: number; color: string }) {
  if (opacity <= 0) return null
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.15, 6, 6]} />
      <meshStandardMaterial color={color} transparent opacity={opacity} />
    </mesh>
  )
}

export default function InnerGameView({ player, miniGame, offsetX, isBlind, isShaking }: InnerGameViewProps) {
  const groupRef = useRef<Group>(null!)
  const coinRefs = useRef<(Mesh | null)[]>([])
  const obstacleRefs = useRef<(Mesh | null)[]>([])
  // Track player positions for trail
  const trailRef = useRef<{ x: number; y: number; t: number }[]>([])
  const parallaxRef = useRef<Group>(null!)

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const shake = isShaking ? Math.sin(state.clock.elapsedTime * 30) * 0.15 : 0
    groupRef.current.position.set(offsetX - miniGame.scrollX * 0.8, shake, 0)

    // Spin coins
    for (const ref of coinRefs.current) {
      if (ref) {
        ref.rotation.y += delta * 4
      }
    }

    // Pulse obstacles red
    const pulse = 0.7 + Math.sin(state.clock.elapsedTime * 3) * 0.3
    for (const ref of obstacleRefs.current) {
      if (ref) {
        const mat = ref.material as THREE.MeshStandardMaterial
        if (mat && mat.emissiveIntensity !== undefined) {
          mat.emissiveIntensity = pulse * 0.4
        }
      }
    }

    // Parallax background scroll
    if (parallaxRef.current) {
      // Move parallax group inversely to scroll for depth effect
      parallaxRef.current.position.x = miniGame.scrollX * 0.3
    }

    // Update trail
    const trail = trailRef.current
    const speed = Math.abs(player.x - (trail.length > 0 ? trail[trail.length - 1].x : player.x))
    if (speed > 0.01) {
      trail.push({ x: player.x, y: player.y, t: 0.4 })
      if (trail.length > 3) trail.shift()
    }
    // Decay trail timers
    for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].t -= delta * 2
      if (trail[i].t <= 0) trail.splice(i, 1)
    }
  })

  const viewWidth = 8
  const isLeft = offsetX <= 0
  const playerColor = isLeft ? '#3b82f6' : '#ef4444'
  const trailColor = isLeft ? '#93c5fd' : '#fca5a5'

  // Build parallax background boxes at different depths
  const parallaxBoxes = [
    { x: 20, y: 3, z: -2, scale: 1.5, color: '#1e293b' },
    { x: 50, y: 2.5, z: -3, scale: 2, color: '#1e1b4b' },
    { x: 80, y: 4, z: -2.5, scale: 1.8, color: '#172554' },
    { x: 110, y: 2, z: -3.5, scale: 2.5, color: '#1e1b4b' },
    { x: 35, y: 5, z: -4, scale: 3, color: '#0f172a' },
    { x: 70, y: 3.5, z: -3, scale: 1.2, color: '#172554' },
  ]

  return (
    <group ref={groupRef}>
      {/* Background gradient: dark at bottom, lighter at top */}
      <mesh position={[miniGame.scrollX + viewWidth / 2, 3, -5]}>
        <planeGeometry args={[200, 10]} />
        <meshBasicMaterial color="#0c1222" />
      </mesh>
      <mesh position={[miniGame.scrollX + viewWidth / 2, 6, -4.9]}>
        <planeGeometry args={[200, 4]} />
        <meshBasicMaterial color="#1e3a5f" transparent opacity={0.6} />
      </mesh>
      <mesh position={[miniGame.scrollX + viewWidth / 2, 8, -4.8]}>
        <planeGeometry args={[200, 3]} />
        <meshBasicMaterial color="#2d4a7a" transparent opacity={0.3} />
      </mesh>

      {/* Parallax background boxes */}
      <group ref={parallaxRef}>
        {parallaxBoxes.map((box, i) => (
          <mesh key={`pb${i}`} position={[box.x, box.y, box.z]}>
            <boxGeometry args={[box.scale, box.scale * 0.6, 0.5]} />
            <meshStandardMaterial color={box.color} transparent opacity={0.5} />
          </mesh>
        ))}
      </group>

      {/* Ground */}
      <mesh position={[miniGame.scrollX + viewWidth / 2, -0.5, 0]}>
        <boxGeometry args={[200, 1, 1]} />
        <meshStandardMaterial color="#4a3728" />
      </mesh>

      {/* Speed pads on ground */}
      {miniGame.speedPads.map((pad, i) => (
        <mesh key={`sp${i}`} position={[pad.x + pad.width / 2, 0.02, 0.15]}>
          <boxGeometry args={[pad.width, 0.08, 0.8]} />
          <meshStandardMaterial color="#06b6d4" emissive="#22d3ee" emissiveIntensity={0.8} />
        </mesh>
      ))}
      {/* Speed pad arrows */}
      {miniGame.speedPads.map((pad, i) => (
        <mesh key={`spa${i}`} position={[pad.x + pad.width / 2, 0.08, 0.2]}>
          <boxGeometry args={[0.3, 0.04, 0.3]} />
          <meshStandardMaterial color="#67e8f9" emissive="#67e8f9" emissiveIntensity={1} />
        </mesh>
      ))}

      {/* Player trail effect (3 fading spheres behind) */}
      {trailRef.current.map((tr, i) => (
        <TrailSphere
          key={`trail${i}`}
          position={[tr.x + offsetX * 0.0, tr.y + 0.4, 0.05]}
          opacity={tr.t * 0.5}
          color={trailColor}
        />
      ))}

      {/* Player character */}
      <mesh position={[player.x + offsetX * 0.0, player.y + 0.4, 0.1]} castShadow>
        <capsuleGeometry args={[0.2, 0.4, 8, 16]} />
        <meshStandardMaterial
          color={playerColor}
          emissive={player.stunTimer > 0 ? '#fbbf24' : player.speedBuffTimer > 0 ? '#22d3ee' : '#000000'}
          emissiveIntensity={player.stunTimer > 0 ? 1 : player.speedBuffTimer > 0 ? 0.6 : 0}
        />
      </mesh>
      {/* Shield indicator around player */}
      {player.shieldBuff && (
        <mesh position={[player.x + offsetX * 0.0, player.y + 0.4, 0.12]}>
          <sphereGeometry args={[0.35, 12, 12]} />
          <meshStandardMaterial color="#a78bfa" transparent opacity={0.25} emissive="#a78bfa" emissiveIntensity={0.5} />
        </mesh>
      )}

      {/* Coins (spinning) */}
      {miniGame.coins.map((coin, i) => (
        !coin.collected && (
          <mesh
            key={`c${i}`}
            position={[coin.x, coin.y + 0.3, 0.1]}
            ref={(el: Mesh | null) => { coinRefs.current[i] = el }}
          >
            <cylinderGeometry args={[0.15, 0.15, 0.04, 12]} />
            <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.5} />
          </mesh>
        )
      ))}

      {/* Power-ups */}
      {miniGame.powerUps.map((pu, i) => (
        !pu.collected && (
          <mesh key={`pu${i}`} position={[pu.x, pu.y + 0.3, 0.15]}>
            <octahedronGeometry args={[0.2, 0]} />
            <meshStandardMaterial
              color={pu.kind === 'speed' ? '#22d3ee' : pu.kind === 'shield' ? '#a78bfa' : '#f97316'}
              emissive={pu.kind === 'speed' ? '#06b6d4' : pu.kind === 'shield' ? '#7c3aed' : '#ea580c'}
              emissiveIntensity={0.8}
            />
          </mesh>
        )
      ))}

      {/* Obstacles */}
      {miniGame.obstacles.map((obs, i) => (
        <mesh
          key={`o${i}`}
          position={[obs.x + obs.width / 2, obs.y + obs.height / 2, 0.1]}
          ref={(el: Mesh | null) => { obstacleRefs.current[i] = el }}
          rotation={obs.isRamp ? [0, 0, -0.3] : [0, 0, 0]}
        >
          <boxGeometry args={[obs.width, obs.height, 0.5]} />
          <meshStandardMaterial
            color={obs.isRamp ? '#f59e0b' : '#dc2626'}
            emissive={obs.isRamp ? '#d97706' : '#dc2626'}
            emissiveIntensity={0.3}
          />
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
