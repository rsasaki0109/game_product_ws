import { OrbitControls, Sparkles } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { MathUtils } from 'three';
import type { Mesh } from 'three';

type OrbitCubeProps = {
  index: number;
  speed: number;
  phase: number;
  color: string;
  size: number;
  radius: number;
};

function OrbitCube({ index, speed, phase, color, size, radius }: OrbitCubeProps) {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const t = state.clock.elapsedTime;
    const angle = t * speed + phase;
    const wave = Math.sin(t * 1.6 + phase) * 0.22;
    const y = Math.sin(t * 0.9 + phase) * 0.35;

    mesh.position.x = Math.cos(angle) * (radius + wave);
    mesh.position.z = Math.sin(angle) * (radius + wave);
    mesh.position.y = y + Math.sin(phase * 2.1) * 0.45;
    mesh.rotation.x = t * 1.2 + phase;
    mesh.rotation.y = t * 0.9 - phase;
    mesh.rotation.z = index * 0.1 + t * 0.35;
    mesh.scale.setScalar(0.7 + MathUtils.smoothstep(-1, 1, Math.sin(t + index * 0.2)) * 0.15 + size * 0.6);
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        roughness={0.25}
        metalness={0.45}
        emissive={color}
        emissiveIntensity={0.1}
      />
    </mesh>
  );
}

export function ThreeLabScene() {
  const cubes = useMemo(() => {
    const palette = ['#84d6ff', '#ff83c0', '#ffd166', '#7aff8b', '#c79cff', '#9be0ff', '#ff9f63'];
    return Array.from({ length: 20 }, (_, index) => ({
      index,
      speed: 0.4 + ((index % 7) + 1) * 0.08,
      phase: index * 0.65,
      color: palette[index % palette.length],
      size: 0.55 + (index % 4) * 0.08,
      radius: 3 + (index % 5) * 0.42,
    }));
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <Canvas
        camera={{ position: [0, 6, 12], fov: 56 }}
        gl={{ alpha: true }}
      >
        <color attach="background" args={['#090b14']} />
        <ambientLight intensity={0.7} />
        <spotLight position={[6, 10, 6]} angle={0.32} penumbra={0.7} intensity={1.2} castShadow />
        <pointLight position={[-8, 4, -4]} intensity={0.6} color="#6bb6ff" />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.9, 0]}>
          <planeGeometry args={[28, 28]} />
          <meshStandardMaterial color="#131723" metalness={0.8} roughness={0.1} />
        </mesh>

        {cubes.map((cube) => (
          <OrbitCube key={cube.index} {...cube} />
        ))}

        <Sparkles
          count={180}
          scale={[20, 10, 20]}
          size={5}
          speed={0.2}
          color="#8deeff"
        />
        <OrbitControls
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.3}
          minPolarAngle={Math.PI / 3.8}
          maxPolarAngle={Math.PI / 1.7}
        />
      </Canvas>
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          color: '#fff',
          background: 'rgba(0,0,0,.48)',
          border: '1px solid rgba(255,255,255,.2)',
          borderRadius: 12,
          padding: '12px 14px',
          fontFamily: 'Consolas, "Courier New", monospace',
          zIndex: 5,
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontWeight: 800, letterSpacing: '.05em' }}>Three.js + R3F Lab</div>
        <div style={{ opacity: 0.85, fontSize: 13, marginTop: 4 }}>
          Drag to rotate view / Scroll to zoom
        </div>
      </div>
    </div>
  );
}

