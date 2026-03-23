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

export default function Arena() {
  return (
    <>
      <Starfield />
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <gridHelper args={[40, 20, '#16213e', '#16213e']} position={[0, 0.01, 0]} />
      {/* Floating obstacles */}
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
    </>
  )
}
