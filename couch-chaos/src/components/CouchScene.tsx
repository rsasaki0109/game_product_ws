import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Group, Mesh } from 'three'
import { useGameStore } from '../store/gameStore.ts'

/** Spiky star shape for comic-book impact effect */
function ImpactStar({ position, visible }: { position: [number, number, number]; visible: boolean }) {
  const ref = useRef<Mesh>(null!)
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    const spikes = 8
    const outerR = 0.5
    const innerR = 0.2
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2
      const r = i % 2 === 0 ? outerR : innerR
      const x = Math.cos(angle) * r
      const y = Math.sin(angle) * r
      if (i === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    }
    shape.closePath()
    return new THREE.ShapeGeometry(shape)
  }, [])

  useFrame((state) => {
    if (!ref.current) return
    ref.current.visible = visible
    if (visible) {
      const s = 0.8 + Math.sin(state.clock.elapsedTime * 15) * 0.3
      ref.current.scale.set(s, s, s)
      ref.current.rotation.z = state.clock.elapsedTime * 5
    }
  })

  return (
    <mesh ref={ref} position={position} geometry={geometry} visible={visible}>
      <meshStandardMaterial
        color="#fbbf24"
        emissive="#ff6600"
        emissiveIntensity={1.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

/** Popcorn bowl (hemisphere) */
function PopcornBowl({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Bowl */}
      <mesh rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#d97706" />
      </mesh>
      {/* Popcorn kernels on top */}
      {[[-0.08, 0.08, 0.05], [0.1, 0.06, -0.03], [0, 0.1, 0.08], [-0.05, 0.07, -0.06], [0.07, 0.09, 0.02]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <sphereGeometry args={[0.06, 6, 6]} />
          <meshStandardMaterial color="#fef3c7" emissive="#fde68a" emissiveIntensity={0.2} />
        </mesh>
      ))}
    </group>
  )
}

export default function CouchScene() {
  const playerRef = useRef<Group>(null!)
  const aiRef = useRef<Group>(null!)
  const playerArmRef = useRef<Mesh>(null!)
  const aiArmRef = useRef<Mesh>(null!)
  const playerLeftArmRef = useRef<Mesh>(null!)
  const aiRightArmRef = useRef<Mesh>(null!)

  useFrame((state) => {
    const s = useGameStore.getState()
    if (!playerRef.current || !aiRef.current) return

    const t = state.clock.elapsedTime

    // Player body on couch
    const pShake = s.player.pushTimer > 0 ? Math.sin(t * 20) * 0.3 : 0
    playerRef.current.position.set(-2 + pShake, -2.5, 2)

    // AI body on couch
    const aiShake = s.ai.pushTimer > 0 ? Math.sin(t * 20) * 0.3 : 0
    aiRef.current.position.set(2 + aiShake, -2.5, 2)

    // Player attack arm (right arm, toward AI)
    if (playerArmRef.current) {
      const anyPlayerAction = s.physicalLog.some(l => l.side === 'left' && l.timer > 1.0)
      if (anyPlayerAction) {
        playerArmRef.current.visible = true
        playerArmRef.current.position.set(0.4, 0.5, -0.1)
        playerArmRef.current.rotation.z = -0.5 + Math.sin(t * 10) * 0.1
      } else {
        playerArmRef.current.visible = false
      }
    }

    // AI attack arm (left arm, toward player)
    if (aiArmRef.current) {
      const anyAiAction = s.physicalLog.some(l => l.side === 'right' && l.timer > 1.0)
      if (anyAiAction) {
        aiArmRef.current.visible = true
        aiArmRef.current.position.set(-0.4, 0.5, -0.1)
        aiArmRef.current.rotation.z = 0.5 + Math.sin(t * 10) * 0.1
      } else {
        aiArmRef.current.visible = false
      }
    }

    // Idle wave arms - oscillate when running (game is playing)
    if (s.phase === 'playing') {
      const armSwing = Math.sin(t * 6) * 0.4
      if (playerLeftArmRef.current) {
        playerLeftArmRef.current.rotation.z = 0.3 + armSwing
        playerLeftArmRef.current.position.y = 0.4 + Math.sin(t * 6) * 0.05
      }
      if (aiRightArmRef.current) {
        aiRightArmRef.current.rotation.z = -0.3 - armSwing
        aiRightArmRef.current.position.y = 0.4 + Math.sin(t * 6 + 1) * 0.05
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
      {/* Couch cushion lines */}
      <mesh position={[-1.3, -2.45, 1.51]}>
        <boxGeometry args={[0.04, 0.8, 0.02]} />
        <meshStandardMaterial color="#5b21b6" />
      </mesh>
      <mesh position={[1.3, -2.45, 1.51]}>
        <boxGeometry args={[0.04, 0.8, 0.02]} />
        <meshStandardMaterial color="#5b21b6" />
      </mesh>

      {/* --- Lamp (right side of room) --- */}
      <group position={[6.5, -2.5, 1]}>
        {/* Lamp base */}
        <mesh position={[0, -1.2, 0]}>
          <cylinderGeometry args={[0.3, 0.4, 0.15, 12]} />
          <meshStandardMaterial color="#78716c" />
        </mesh>
        {/* Lamp pole */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 2.5, 8]} />
          <meshStandardMaterial color="#a8a29e" />
        </mesh>
        {/* Lamp shade (cone) */}
        <mesh position={[0, 1.3, 0]}>
          <coneGeometry args={[0.5, 0.6, 12, 1, true]} />
          <meshStandardMaterial color="#fef3c7" side={THREE.DoubleSide} />
        </mesh>
        {/* Lamp glow */}
        <pointLight position={[0, 1.0, 0]} intensity={0.4} color="#fde68a" distance={4} />
      </group>

      {/* --- Side table (left side) --- */}
      <group position={[-6, -3.2, 1.5]}>
        {/* Table top */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1.2, 0.08, 0.8]} />
          <meshStandardMaterial color="#92400e" />
        </mesh>
        {/* Table legs */}
        {[[-0.5, 0, -0.3], [0.5, 0, -0.3], [-0.5, 0, 0.3], [0.5, 0, 0.3]].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]}>
            <cylinderGeometry args={[0.03, 0.03, 0.5, 6]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
        ))}
        {/* Popcorn bowl on the table */}
        <PopcornBowl position={[0, 0.7, 0]} />
      </group>

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
        {/* Left arm (idle wave) */}
        <mesh ref={playerLeftArmRef} position={[-0.35, 0.4, -0.1]}>
          <capsuleGeometry args={[0.06, 0.35, 4, 8]} />
          <meshStandardMaterial color="#60a5fa" />
        </mesh>
        {/* Right arm for physical action animation */}
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
        {/* Right arm (idle wave) */}
        <mesh ref={aiRightArmRef} position={[0.35, 0.4, -0.1]}>
          <capsuleGeometry args={[0.06, 0.35, 4, 8]} />
          <meshStandardMaterial color="#f87171" />
        </mesh>
        {/* Left arm for physical action animation */}
        <mesh ref={aiArmRef} visible={false} position={[-0.4, 0.5, -0.1]}>
          <capsuleGeometry args={[0.08, 0.5, 4, 8]} />
          <meshStandardMaterial color="#f87171" />
        </mesh>
      </group>

      {/* Comic-book impact star between characters during physical actions */}
      <ImpactStar position={[0, -1.8, 1.8]} visible={playerActing || aiActing} />

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

      {/* Rug under the couch */}
      <mesh position={[0, -3.98, 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 4]} />
        <meshStandardMaterial color="#7e22ce" opacity={0.3} transparent />
      </mesh>
    </>
  )
}
