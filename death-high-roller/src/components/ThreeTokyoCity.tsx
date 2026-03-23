import { Canvas, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

type Building = {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
  emissive: string;
  modelUrl?: string;
  modelScale?: number;
};

type Sign = {
  x: number;
  y: number;
  z: number;
  text: string;
  color: string;
};

type AssetPlacement = {
  id: string;
  fileName: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
  emissive: string;
  scale: number;
};

type AssetState = 'idle' | 'loading' | 'ready' | 'missing';

const WORLD_RADIUS = 90;
const CELL_SIZE = 10;
const ROAD_WIDTH = 4;
const BASE_Y = 0;
const SKY_BANDS = ['#1a2434', '#22324a', '#2b425d', '#384b64'];
const NEON_BANDS = ['#4bf3ff', '#ff5fd6', '#ffd36a', '#79ff80'];

const TokyoAssetCatalog: AssetPlacement[] = [
  {
    id: 'skytree',
    fileName: 'tokyo_tower.glb',
    x: -24,
    z: 2,
    w: 8,
    d: 8,
    h: 62,
    color: '#b6c8e8',
    emissive: '#21345a',
    scale: 0.7,
  },
  {
    id: 'crossing',
    fileName: 'shibuya_crossing.glb',
    x: 10,
    z: -20,
    w: 9,
    d: 9,
    h: 48,
    color: '#d8d3f7',
    emissive: '#5c4d84',
    scale: 0.8,
  },
  {
    id: 'train-station',
    fileName: 'tokyo_station.glb',
    x: 32,
    z: 14,
    w: 10,
    d: 10,
    h: 35,
    color: '#d8ddd5',
    emissive: '#454949',
    scale: 0.72,
  },
  {
    id: 'tower',
    fileName: 'tokyo_tower_small.glb',
    x: 20,
    z: 30,
    w: 7,
    d: 7,
    h: 36,
    color: '#ddd2f1',
    emissive: '#5c4d84',
    scale: 0.7,
  },
];

const CityPlacementPath = '/assets/tokyo';

function buildDistrict() {
  const buildings: Building[] = [];
  const signs: Sign[] = [];

  const maxCell = Math.floor(WORLD_RADIUS / CELL_SIZE);

  for (let gx = -maxCell; gx <= maxCell; gx += 1) {
    for (let gz = -maxCell; gz <= maxCell; gz += 1) {
      const wx = gx * CELL_SIZE;
      const wz = gz * CELL_SIZE;
      const roadX = gx % 4 === 0;
      const roadZ = gz % 4 === 0;

      if (roadX || roadZ) {
        continue;
      }

      const jitter = ((gx * 31 + gz * 17) % 7) - 3;
      if (Math.abs(jitter) > 2) {
        continue;
      }

      const seed = gx * 31 + gz * 17;
      const w = 5 + ((seed * 13) % 6) + 1;
      const d = 5 + ((seed * 11) % 5);
      const h = 8 + ((seed * 19) % 28) + 6;

      buildings.push({
        id: `${gx}-${gz}`,
        x: wx,
        z: wz,
        w,
        d,
        h,
        color: SKY_BANDS[Math.abs(seed) % SKY_BANDS.length],
        emissive: '#0c1425',
      });

      if ((gx + gz) % 5 === 0 && seed % 4 === 0) {
        signs.push({
          x: wx + w * 0.2,
          y: h + 1,
          z: wz + d * 0.2,
          text: `${['夜景', '渋谷', '新橋', '丸の内', '銀座'][Math.abs(seed) % 5]}`,
          color: NEON_BANDS[Math.abs(seed) % NEON_BANDS.length],
        });
      }
    }
  }

  for (const asset of TokyoAssetCatalog) {
    buildings.push({
      id: asset.id,
      x: asset.x,
      z: asset.z,
      w: asset.w,
      d: asset.d,
      h: asset.h,
      color: asset.color,
      emissive: asset.emissive,
      modelUrl: `${CityPlacementPath}/${asset.fileName}`,
      modelScale: asset.scale,
    });
  }

  return { buildings, signs };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function nearestTarget(buildings: Building[], playerX: number, playerZ: number) {
  let nearest: Sign | null = null;
  let best = 1e9;
  const landmarks: Sign[] = buildings
    .filter((building) => building.h > 25)
    .map((building) => ({
      x: building.x,
      y: building.h + 3,
      z: building.z,
      text: '高層ビル',
      color: '#9ad7ff',
    }));

  for (const sign of landmarks) {
    const dx = sign.x - playerX;
    const dz = sign.z - playerZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < best) {
      best = dist;
      nearest = sign;
    }
  }

  return nearest;
}

function makeSkyMesh() {
  return (
    <>
      <fog attach="fog" args={[0x050915, 25, 240]} />
      <mesh position={[0, 170, 0]}>
        <sphereGeometry args={[240, 24, 16]} />
        <meshBasicMaterial color="#090f20" side={2} />
      </mesh>
      <mesh position={[0, 100, 0]}>
        <sphereGeometry args={[230, 18, 10]} />
        <meshStandardMaterial color="#0e1728" />
      </mesh>
    </>
  );
}

function useSafeGltf(url: string | null) {
  const [state, setState] = useState<{ scene: THREE.Group | null; status: AssetState; url: string | null }>({
    scene: null,
    status: 'idle',
    url: null,
  });

  if (state.url !== url) {
    setState({ scene: null, status: url ? 'loading' : 'idle', url });
  }

  useEffect(() => {
    if (!url) {
      return;
    }

    let canceled = false;
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf: { scene: THREE.Group }) => {
        if (!canceled) {
          setState({ scene: gltf.scene, status: 'ready', url });
        }
      },
      undefined,
      () => {
        if (!canceled) {
          setState({ scene: null, status: 'missing', url });
        }
      },
    );

    return () => {
      canceled = true;
    };
  }, [url]);

  return { scene: state.scene, status: state.status };
}

function LandmarkBuilding({
  building,
  useAssets,
}: {
  building: Building;
  useAssets: boolean;
}) {
  const { scene, status } = useSafeGltf(useAssets ? (building.modelUrl ?? null) : null);
  const loadedModel = useMemo(() => {
    if (!scene) {
      return null;
    }
    const copy = scene.clone(true);
    const scale = building.modelScale ?? 1;
    copy.scale.setScalar(scale);
    return copy;
  }, [scene, building.modelScale]);

  if (scene && loadedModel && useAssets) {
    return (
      <group key={building.id} position={[building.x, 0, building.z]}>
        <primitive object={loadedModel} />
      </group>
    );
  }

  return (
    <mesh key={building.id} position={[building.x, building.h / 2, building.z]}>
      <boxGeometry args={[building.w, building.h, building.d]} />
      <meshStandardMaterial
        color={status === 'missing' ? '#a64c5a' : building.color}
        roughness={0.22}
        metalness={0.12}
        emissive={building.emissive}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

function ThreeTokyoCityScene() {
  const runningRef = useRef(true);
  const hudTickRef = useRef(0);
  const [assetMode, setAssetMode] = useState(
    () => new URLSearchParams(window.location.search).get('asset') === '1',
  );

  const playerPos = useRef(new THREE.Vector3(0, 8, 0));
  const playerVel = useRef(new THREE.Vector3(0, 0, 0));
  const playerMeshRef = useRef<THREE.Mesh | null>(null);
  const playerRingRef = useRef<THREE.Mesh | null>(null);
  const targetMarkerRef = useRef<THREE.Mesh | null>(null);
  const nearestMarkerRef = useRef(new THREE.Vector3(6, 28, 0));
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const demoMode = query.get('demo') === '1';
  const demoFrame = Number(query.get('t') ?? '0');
  const roadLineCount = Math.floor((WORLD_RADIUS * 2) / (CELL_SIZE * 0.5));
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    fly: false,
  });
  const city = useMemo(() => buildDistrict(), []);

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (demoMode) {
      return;
    }

    if (event.code === 'KeyW') keys.current.forward = true;
    if (event.code === 'KeyS') keys.current.backward = true;
    if (event.code === 'KeyA') keys.current.left = true;
    if (event.code === 'KeyD') keys.current.right = true;
    if (event.code === 'Space') keys.current.up = true;
    if (event.code === 'ShiftLeft') keys.current.down = true;

    if (event.code === 'KeyF' && !event.repeat) {
      keys.current.fly = !keys.current.fly;
      event.preventDefault();
    }

    if (event.code === 'KeyM' && !event.repeat) {
      setAssetMode((value) => !value);
      event.preventDefault();
    }

    if (event.code === 'KeyP' && !event.repeat) {
      runningRef.current = !runningRef.current;
      event.preventDefault();
    }
  }, [demoMode]);

  const onKeyUp = useCallback((event: KeyboardEvent) => {
    if (demoMode) {
      return;
    }

    if (event.code === 'KeyW') keys.current.forward = false;
    if (event.code === 'KeyS') keys.current.backward = false;
    if (event.code === 'KeyA') keys.current.left = false;
    if (event.code === 'KeyD') keys.current.right = false;
    if (event.code === 'Space') keys.current.up = false;
    if (event.code === 'ShiftLeft') keys.current.down = false;
  }, [demoMode]);

  useEffect(() => {
    runningRef.current = true;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onKeyDown, onKeyUp]);

  useFrame((state, delta) => {
    if (!runningRef.current) {
      return;
    }

    if (demoMode) {
      const t = demoFrame;
      playerPos.current.x = Math.sin(t * 0.32) * 42;
      playerPos.current.z = Math.cos(t * 0.29) * 38;
      playerPos.current.y = 10 + Math.sin(t * 0.86) * 8;
      playerPos.current.x = clamp(playerPos.current.x, -WORLD_RADIUS, WORLD_RADIUS);
      playerPos.current.z = clamp(playerPos.current.z, -WORLD_RADIUS, WORLD_RADIUS);

      const nearest = nearestTarget(city.buildings, playerPos.current.x, playerPos.current.z);
      if (nearest) {
        nearestMarkerRef.current.set(nearest.x, nearest.y, nearest.z);
      } else {
        nearestMarkerRef.current.set(playerPos.current.x + 6, 28, playerPos.current.z);
      }

      const cameraOffset = new THREE.Vector3(Math.sin(t * 0.2) * 3, 20, 28 + Math.cos(t * 0.18) * 5);
      const targetCam = playerPos.current.clone().add(cameraOffset);
      state.camera.position.lerp(targetCam, 0.55);
      state.camera.lookAt(
        playerPos.current.x,
        playerPos.current.y + 3,
        playerPos.current.z,
      );

      if (playerMeshRef.current) {
        playerMeshRef.current.position.copy(playerPos.current);
      }
      if (playerRingRef.current) {
        playerRingRef.current.position.copy(
          new THREE.Vector3(playerPos.current.x, playerPos.current.y + 0.8, playerPos.current.z),
        );
      }
      if (targetMarkerRef.current) {
        targetMarkerRef.current.position.copy(nearestMarkerRef.current);
      }

      hudTickRef.current += delta;
      if (hudTickRef.current > 0.1) {
        hudTickRef.current = 0;
      }

      return;
    }

    const input = new THREE.Vector3(0, 0, 0);
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    state.camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() > 0) {
      forward.normalize();
    }
    right.copy(forward).cross(new THREE.Vector3(0, 1, 0)).normalize();

    if (keys.current.forward) input.add(forward);
    if (keys.current.backward) input.addScaledVector(forward, -1);
    if (keys.current.right) input.add(right);
    if (keys.current.left) input.addScaledVector(right, -1);

    if (input.lengthSq() > 0.001) {
      input.normalize().multiplyScalar(keys.current.fly ? 22 : 14);
      playerVel.current.x = THREE.MathUtils.lerp(playerVel.current.x, input.x, 0.14);
      playerVel.current.z = THREE.MathUtils.lerp(playerVel.current.z, input.z, 0.14);
    } else {
      playerVel.current.x = THREE.MathUtils.lerp(playerVel.current.x, 0, 0.08);
      playerVel.current.z = THREE.MathUtils.lerp(playerVel.current.z, 0, 0.08);
    }

    if (keys.current.fly) {
      playerVel.current.y = 0;
      if (keys.current.up) playerPos.current.y += delta * 18;
      if (keys.current.down) playerPos.current.y -= delta * 18;
      playerPos.current.y = clamp(playerPos.current.y, 3, 120);
      playerPos.current.set(
        clamp(playerPos.current.x + playerVel.current.x * delta, -WORLD_RADIUS, WORLD_RADIUS),
        playerPos.current.y,
        clamp(playerPos.current.z + playerVel.current.z * delta, -WORLD_RADIUS, WORLD_RADIUS),
      );
    } else {
      playerVel.current.y += -20 * delta;
      if (keys.current.up) {
        playerVel.current.y = Math.max(playerVel.current.y, 11);
      }
      if (keys.current.down) {
        playerVel.current.y = Math.min(playerVel.current.y, -8);
      }
      playerPos.current.addScaledVector(playerVel.current, delta);
      if (playerPos.current.y < BASE_Y + 2.8) {
        playerPos.current.y = BASE_Y + 2.8;
        playerVel.current.y = 0;
      }
    }

    playerPos.current.x = clamp(playerPos.current.x, -WORLD_RADIUS, WORLD_RADIUS);
    playerPos.current.z = clamp(playerPos.current.z, -WORLD_RADIUS, WORLD_RADIUS);

    const cameraOffset = new THREE.Vector3(0, 18, 30);
    const targetCam = playerPos.current.clone().add(cameraOffset);
    state.camera.position.lerp(targetCam, 0.1);
    state.camera.lookAt(
      playerPos.current.x,
      playerPos.current.y + 3,
      playerPos.current.z,
    );

    const nearest = nearestTarget(city.buildings, playerPos.current.x, playerPos.current.z);
    if (nearest) {
      nearestMarkerRef.current.set(nearest.x, nearest.y, nearest.z);
    } else {
      nearestMarkerRef.current.set(
        playerPos.current.x + 6,
        28,
        playerPos.current.z,
      );
    }

    if (playerMeshRef.current) {
      playerMeshRef.current.position.copy(playerPos.current);
    }
    if (playerRingRef.current) {
      playerRingRef.current.position.copy(
        new THREE.Vector3(playerPos.current.x, playerPos.current.y + 0.8, playerPos.current.z),
      );
    }
    if (targetMarkerRef.current) {
      targetMarkerRef.current.position.copy(nearestMarkerRef.current);
    }

    hudTickRef.current += delta;
    if (hudTickRef.current > 0.1) {
      hudTickRef.current = 0;
    }
  });

  return (
    <>
      <ambientLight intensity={0.42} />
      <directionalLight position={[22, 48, 12]} intensity={1.2} />
      <pointLight position={[0, 60, 0]} intensity={0.45} color="#6ad7ff" />
      <pointLight position={[-22, 30, 18]} intensity={0.65} color="#ffe67b" />
      <pointLight position={[28, 28, -28]} intensity={0.6} color="#ff79ad" />

      {makeSkyMesh()}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, BASE_Y - 0.5, 0]}>
        <planeGeometry args={[WORLD_RADIUS * 2, WORLD_RADIUS * 2]} />
        <meshStandardMaterial color="#0b111e" roughness={1} metalness={0} />
      </mesh>

      {city.buildings.map((building) => (
        <LandmarkBuilding key={building.id} building={building} useAssets={assetMode} />
      ))}

      {Array.from({ length: roadLineCount }).map((_, idx) => {
        const px = -WORLD_RADIUS + idx * CELL_SIZE * 0.5;
        return (
          <mesh key={`road-x-${idx}`} position={[px, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[WORLD_RADIUS * 2, ROAD_WIDTH]} />
            <meshStandardMaterial color="#1f2d3f" />
          </mesh>
        );
      })}

      {Array.from({ length: roadLineCount }).map((_, idx) => {
        const pz = -WORLD_RADIUS + idx * CELL_SIZE * 0.5;
        return (
          <mesh
            key={`road-z-${idx}`}
            position={[0, 0.01, pz]}
            rotation={[-Math.PI / 2, 0, Math.PI / 2]}
          >
            <planeGeometry args={[WORLD_RADIUS * 2, ROAD_WIDTH]} />
            <meshStandardMaterial color="#1f2d3f" />
          </mesh>
        );
      })}

      {city.signs.map((sign, index) => (
        <mesh key={`${sign.text}-${index}`} position={[sign.x, sign.y, sign.z]}>
          <planeGeometry args={[2.8, 1]} />
          <meshStandardMaterial
            color={sign.color}
            emissive={sign.color}
            emissiveIntensity={0.8}
            side={2}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}

      <mesh ref={playerMeshRef} position={[0, 8, 0]}>
        <sphereGeometry args={[0.9, 18, 18]} />
        <meshStandardMaterial color="#f15f3a" emissive="#6b1f09" emissiveIntensity={0.45} />
      </mesh>

      <mesh ref={targetMarkerRef} position={[6, 28, 0]}>
        <boxGeometry args={[0.35, 0.35, 0.35]} />
        <meshStandardMaterial color="#5ce1ff" emissive="#3fc5ff" emissiveIntensity={0.8} />
      </mesh>

      <mesh ref={playerRingRef} position={[0, 8.8, 0]}>
        <ringGeometry args={[0.7, 1.05, 24]} />
        <meshBasicMaterial color="#9ff4ff" transparent opacity={0.45} />
      </mesh>
    </>
  );
}

export function ThreeTokyoCity() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(1200px 900px at 60% 40%, #1a2740, #060d19)',
      }}
    >
      <Canvas camera={{ fov: 65, position: [0, 20, 35] }} onCreated={(state) => {
        state.gl.setPixelRatio(window.devicePixelRatio);
      }}>
        <ThreeTokyoCityScene />
      </Canvas>
    </div>
  );
}
