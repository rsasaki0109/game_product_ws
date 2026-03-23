import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import { useGameStore } from '../store/gameStore.ts'

function ActionParticle({ position, emoji, visible }: { position: [number, number, number]; emoji: string; visible: boolean }) {
  // Render an emoji as a small colored sphere to indicate action
  if (!visible) return null
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshStandardMaterial
        color={emoji === 'fist' ? '#fbbf24' : emoji === 'pillow' ? '#a78bfa' : '#f87171'}
        emissive={emoji === 'fist' ? '#fbbf24' : emoji === 'pillow' ? '#a78bfa' : '#f87171'}
        emissiveIntensity={0.8}
      />
    </mesh>
  )
}

export default function CouchScene() {
  const playerRef = useRef<Group>(null!)
  const aiRef = useRef<Group>(null!)
  const playerArmRef = useRef<Mesh>(null!)
  const aiArmRef = useRef<Mesh>(null!)

  useFrame((state) => {
    const s = useGameStore.getState()
    if (!playerRef.current || !aiRef.current) return

    // Player body on couch
    const pShake = s.player.pushTimer > 0 ? Math.sin(state.clock.elapsedTime * 20) * 0.3 : 0
    playerRef.current.position.set(-2 + pShake, -2.5, 2)

    // AI body on couch
    const aiShake = s.ai.pushTimer > 0 ? Math.sin(state.clock.elapsedTime * 20) * 0.3 : 0
    aiRef.current.position.set(2 + aiShake, -2.5, 2)

    // Animate player arm extending toward AI when doing physical action
    if (playerArmRef.current) {
      const anyPlayerAction = s.physicalLog.some(l => l.side === 'left' && l.timer > 1.0)
      if (anyPlayerAction) {
        playerArmRef.current.visible = true
        playerArmRef.current.position.set(0.4, 0.5, -0.1)
        playerArmRef.current.rotation.z = -0.5 + Math.sin(state.clock.elapsedTime * 10) * 0.1
      } else {
        playerArmRef.current.visible = false
      }
    }

    // Animate AI arm extending toward player when doing physical action
    if (aiArmRef.current) {
      const anyAiAction = s.physicalLog.some(l => l.side === 'right' && l.timer > 1.0)
      if (anyAiAction) {
        aiArmRef.current.visible = true
        aiArmRef.current.position.set(-0.4, 0.5, -0.1)
        aiArmRef.current.rotation.z = 0.5 + Math.sin(state.clock.elapsedTime * 10) * 0.1
      } else {
        aiArmRef.current.visible = false
      }
    }
  })

  const s = useGameStore.getState()
  const playerActing = s.physicalLog.some(l => l.side === 'left' && l.timer > 0.5)
  const aiActing = s.physicalLog.some(l => l.side === 'right' && l.timer > 0.5)

  return (
    <>
      {/* Couch */}
      <mesh position={[0, -3.2, 2.5]}>
        <boxGeometry args={[8, 1.5, 2]} />
        <meshStandardMaterial color="#7c3aed" />
      </mesh>
      {/* Couch back */}
      <mesh position={[0, -2, 3.5]}>
        <boxGeometry args={[8, 2, 0.5]} />
        <meshStandardMaterial color="#6d28d9" />
      </mesh>
      {/* Couch armrests */}
      <mesh position={[-4, -2.5, 2.5]}>
        <boxGeometry args={[0.5, 1, 2]} />
        <meshStandardMaterial color="#6d28d9" />
      </mesh>
      <mesh position={[4, -2.5, 2.5]}>
        <boxGeometry args={[0.5, 1, 2]} />
        <meshStandardMaterial color="#6d28d9" />
      </mesh>

      {/* Player 1 body (left) */}
      <group ref={playerRef}>
        <mesh position={[0, 0.4, 0]}>
          <capsuleGeometry args={[0.3, 0.5, 8, 16]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
        <mesh position={[0, 0.95, 0]}>
          <sphereGeometry args={[0.22, 8, 8]} />
          <meshStandardMaterial color="#93c5fd" />
        </mesh>
        {/* Arm for physical action animation */}
        <mesh ref={playerArmRef} visible={false} position={[0.4, 0.5, -0.1]}>
          <capsuleGeometry args={[0.08, 0.5, 4, 8]} />
          <meshStandardMaterial color="#60a5fa" />
        </mesh>
      </group>

      {/* Player 2 / AI body (right) */}
      <group ref={aiRef}>
        <mesh position={[0, 0.4, 0]}>
          <capsuleGeometry args={[0.3, 0.5, 8, 16]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
        <mesh position={[0, 0.95, 0]}>
          <sphereGeometry args={[0.22, 8, 8]} />
          <meshStandardMaterial color="#fca5a5" />
        </mesh>
        {/* Arm for physical action animation */}
        <mesh ref={aiArmRef} visible={false} position={[-0.4, 0.5, -0.1]}>
          <capsuleGeometry args={[0.08, 0.5, 4, 8]} />
          <meshStandardMaterial color="#f87171" />
        </mesh>
      </group>

      {/* Action particle between characters */}
      <ActionParticle position={[0, -1.8, 2]} emoji="fist" visible={playerActing || aiActing} />

      {/* TV / Screen */}
      <mesh position={[0, 1, -3]}>
        <boxGeometry args={[10, 6, 0.3]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      {/* TV screen glow */}
      <mesh position={[0, 1, -2.83]}>
        <planeGeometry args={[9.5, 5.5]} />
        <meshStandardMaterial color="#1a2a3a" emissive="#4fc3f7" emissiveIntensity={0.15} />
      </mesh>
      {/* Screen divider */}
      <mesh position={[0, 1, -2.8]}>
        <boxGeometry args={[0.05, 5.5, 0.1]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Floor */}
      <mesh position={[0, -4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 12]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      {/* Room walls */}
      <mesh position={[0, 0, -4]}>
        <planeGeometry args={[20, 10]} />
        <meshStandardMaterial color="#4b5563" />
      </mesh>
    </>
  )
}
