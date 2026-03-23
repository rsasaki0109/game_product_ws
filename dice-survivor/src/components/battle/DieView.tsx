import { useState, useEffect } from 'react'
import type { Die, DieFace } from '../../types/dice.ts'

interface DieViewProps {
  die: Die
  rolledFaceIndex?: number
  rolling: boolean
  delay?: number
  onLanded?: () => void
}

const FACE_ROTATIONS: Record<number, { rx: number; ry: number }> = {
  0: { rx: 0, ry: 0 },       // front
  1: { rx: 0, ry: 180 },     // back
  2: { rx: 0, ry: -90 },     // right
  3: { rx: 0, ry: 90 },      // left
  4: { rx: -90, ry: 0 },     // top
  5: { rx: 90, ry: 0 },      // bottom
}

const SIZE = 80

export function DieView({ die, rolledFaceIndex, rolling, delay = 0, onLanded }: DieViewProps) {
  const [animState, setAnimState] = useState<'idle' | 'spinning' | 'landed'>('idle')
  const [finalRotation, setFinalRotation] = useState({ rx: 0, ry: 0 })

  // Derive idle state from props rather than calling setState synchronously
  const state = rolling ? animState : 'idle'

  useEffect(() => {
    if (!rolling) {
      return
    }

    // Start spinning after delay
    const spinTimer = setTimeout(() => {
      setAnimState('spinning')
    }, delay)

    // Land on the result
    const landTimer = setTimeout(() => {
      const idx = rolledFaceIndex ?? 0
      const rot = FACE_ROTATIONS[idx]
      setFinalRotation(rot)
      setAnimState('landed')
      onLanded?.()
    }, delay + 800)

    return () => {
      clearTimeout(spinTimer)
      clearTimeout(landTimer)
    }
  }, [rolling, rolledFaceIndex, delay, onLanded])

  const cubeTransform = state === 'spinning'
    ? undefined // handled by CSS animation
    : `rotateX(${finalRotation.rx}deg) rotateY(${finalRotation.ry}deg)`

  return (
    <div style={{
      width: SIZE,
      height: SIZE,
      perspective: 300,
      margin: '0 8px',
    }}>
      <div style={{
        width: SIZE,
        height: SIZE,
        position: 'relative',
        transformStyle: 'preserve-3d',
        transform: cubeTransform,
        animation: state === 'spinning'
          ? 'diceRoll 0.8s ease-out forwards'
          : state === 'landed'
            ? 'diceLand 0.3s ease-out'
            : undefined,
        // @ts-expect-error CSS custom properties
        '--final-rx': `${finalRotation.rx + 720}deg`,
        '--final-ry': `${finalRotation.ry + 720}deg`,
        transition: state === 'idle' ? 'transform 0.3s ease' : undefined,
      }}>
        {die.faces.map((face, i) => (
          <CubeFace key={i} face={face} index={i} size={SIZE} dieColor={die.color} />
        ))}
      </div>
    </div>
  )
}

function CubeFace({ face, index, size, dieColor }: { face: DieFace; index: number; size: number; dieColor: string }) {
  const half = size / 2

  const transforms: Record<number, string> = {
    0: `rotateY(0deg) translateZ(${half}px)`,
    1: `rotateY(180deg) translateZ(${half}px)`,
    2: `rotateY(90deg) translateZ(${half}px)`,
    3: `rotateY(-90deg) translateZ(${half}px)`,
    4: `rotateX(90deg) translateZ(${half}px)`,
    5: `rotateX(-90deg) translateZ(${half}px)`,
  }

  return (
    <div style={{
      position: 'absolute',
      width: size,
      height: size,
      transform: transforms[index],
      backfaceVisibility: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(135deg, ${dieColor}dd, ${dieColor}99)`,
      border: '2px solid rgba(255,255,255,0.15)',
      borderRadius: 8,
      gap: 2,
    }}>
      <span style={{ fontSize: 28, lineHeight: 1 }}>{face.emoji}</span>
      <span style={{
        fontSize: 10,
        color: 'rgba(255,255,255,0.85)',
        fontWeight: 600,
      }}>
        {face.symbol !== 'blank' ? `+${face.value}` : ''}
      </span>
    </div>
  )
}
