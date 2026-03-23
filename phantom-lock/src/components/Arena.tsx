import { useMemo } from 'react'

function Starfield() {
  const stars: React.JSX.Element[] = []
  for (let i = 0; i < 100; i++) {
    const x = (Math.random() - 0.5) * 80
    const y = Math.random() * 30 + 5
    const z = (Math.random() - 0.5) * 80
    stars.push(
      <mesh key={i} position={[x, y, z]}>
        <sphereGeometry args={[0.08, 4, 4]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    )
  }
  return <>{stars}</>
}

/** Floating hexagonal platforms at different heights */
function HexPlatforms() {
  const platforms = useMemo(() => [
    { pos: [-12, 1.5, -12] as [number, number, number], scale: 1.2 },
    { pos: [12, 2.5, -10] as [number, number, number], scale: 1.0 },
    { pos: [-10, 3.5, 10] as [number, number, number], scale: 0.8 },
    { pos: [10, 4.0, 12] as [number, number, number], scale: 1.1 },
    { pos: [0, 5.0, -15] as [number, number, number], scale: 0.9 },
    { pos: [-15, 2.0, 0] as [number, number, number], scale: 1.3 },
    { pos: [15, 3.0, 5] as [number, number, number], scale: 0.7 },
    { pos: [5, 6.0, -8] as [number, number, number], scale: 0.6 },
  ], [])

  return (
    <>
      {platforms.map((p, i) => (
        <group key={i} position={p.pos}>
          {/* Hex platform */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[p.scale * 1.5, p.scale * 1.5, 0.15, 6]} />
            <meshStandardMaterial
              color="#0f3460"
              emissive="#16213e"
              emissiveIntensity={0.4}
              transparent
              opacity={0.7}
            />
          </mesh>
          {/* Edge glow */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
            <cylinderGeometry args={[p.scale * 1.55, p.scale * 1.55, 0.05, 6]} />
            <meshStandardMaterial
              color="#22d3ee"
              emissive="#22d3ee"
              emissiveIntensity={0.8}
              transparent
              opacity={0.3}
            />
          </mesh>
        </group>
      ))}
    </>
  )
}

/** Distant city silhouette boxes on the horizon */
function CitySilhouette() {
  const buildings = useMemo(() => {
    const result: { pos: [number, number, number]; size: [number, number, number] }[] = []
    const radius = 35
    const count = 40
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const x = Math.cos(angle) * (radius + Math.random() * 5)
      const z = Math.sin(angle) * (radius + Math.random() * 5)
      const height = 2 + Math.random() * 8
      const width = 0.8 + Math.random() * 1.5
      const depth = 0.8 + Math.random() * 1.5
      result.push({
        pos: [x, height / 2, z],
        size: [width, height, depth],
      })
    }
    return result
  }, [])

  return (
    <>
      {buildings.map((b, i) => (
        <mesh key={i} position={b.pos}>
          <boxGeometry args={b.size} />
          <meshStandardMaterial
            color="#0a0a1a"
            emissive="#16213e"
            emissiveIntensity={0.15}
          />
        </mesh>
      ))}
      {/* Some buildings with window lights */}
      {buildings.filter((_, i) => i % 4 === 0).map((b, i) => (
        <mesh key={`light-${i}`} position={[b.pos[0], b.pos[1] + b.size[1] * 0.3, b.pos[2] + b.size[2] * 0.51]}>
          <boxGeometry args={[b.size[0] * 0.3, 0.15, 0.02]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#f59e0b"
            emissiveIntensity={0.5}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
    </>
  )
}

export default function Arena() {
  return (
    <>
      <Starfield />
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <gridHelper args={[40, 20, '#16213e', '#16213e']} position={[0, 0.01, 0]} />
      {/* Floating hexagonal platforms */}
      <HexPlatforms />
      {/* Original floating obstacles */}
      {[
        [-8, 2, -8], [8, 3, 8], [-10, 1.5, 6], [6, 2.5, -10], [0, 4, -12],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <boxGeometry args={[2, 0.3, 2]} />
          <meshStandardMaterial color="#0f3460" emissive="#16213e" emissiveIntensity={0.3} transparent opacity={0.6} />
        </mesh>
      ))}
      {/* Arena boundary glow */}
      {[
        [0, 0.5, -20, 40, 1, 0.1],
        [0, 0.5, 20, 40, 1, 0.1],
        [-20, 0.5, 0, 0.1, 1, 40],
        [20, 0.5, 0, 0.1, 1, 40],
      ].map(([x, y, z, w, h, d], i) => (
        <mesh key={`wall-${i}`} position={[x as number, y as number, z as number]}>
          <boxGeometry args={[w as number, h as number, d as number]} />
          <meshStandardMaterial color="#e94560" emissive="#e94560" emissiveIntensity={0.5} transparent opacity={0.15} />
        </mesh>
      ))}
      {/* City silhouette on horizon */}
      <CitySilhouette />
    </>
  )
}
