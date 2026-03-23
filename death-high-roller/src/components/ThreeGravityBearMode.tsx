import { Canvas, useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

type TileState = {
  key: string;
  x: number;
  z: number;
  ttl: number;
  broken: boolean;
};

type Crystal = {
  id: number;
  x: number;
  z: number;
  picked: boolean;
};

type LocalAxes = {
  axisX: THREE.Vector3;
  axisY: THREE.Vector3;
  axisZ: THREE.Vector3;
  basisQuat: THREE.Quaternion;
};

const GRID_RADIUS = 7;
const TILE_SIZE = 2;
const START_SECONDS = 75;
const MOVE_SPEED = 8;
const COLLAPSE_RATE = 1.25;
const CRYSTAL_COUNT = 12;
const GRAVITY_ROT_SPEED = 1.6; // rad/s

function tileKey(ix: number, iz: number) {
  return `${ix},${iz}`;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function buildAxesFromGravityDown(gravityDown: THREE.Vector3): LocalAxes {
  const axisY = gravityDown.clone().normalize();
  const up = axisY.clone().negate();

  let guide = new THREE.Vector3(0, 1, 0);
  if (Math.abs(up.dot(guide)) > 0.96) {
    guide = new THREE.Vector3(0, 0, 1);
  }

  const axisX = new THREE.Vector3().crossVectors(up, guide).normalize();
  const axisZ = new THREE.Vector3().crossVectors(axisX, up).normalize();

  const basis = new THREE.Matrix4().makeBasis(axisX, up, axisZ);

  return {
    axisX,
    axisY: up,
    axisZ,
    basisQuat: new THREE.Quaternion().setFromRotationMatrix(basis),
  };
}

function localToWorld(x: number, z: number, axes: LocalAxes): THREE.Vector3 {
  return new THREE.Vector3()
    .addScaledVector(axes.axisX, x)
    .addScaledVector(axes.axisZ, z);
}

function gravityFromAngles(yaw: number, theta: number): THREE.Vector3 {
  const s = Math.sin(theta);
  return new THREE.Vector3(s * Math.sin(yaw), Math.cos(theta), s * Math.cos(yaw));
}

function makeArenaTiles(): Map<string, TileState> {
  const map = new Map<string, TileState>();
  for (let ix = -GRID_RADIUS; ix <= GRID_RADIUS; ix += 1) {
    for (let iz = -GRID_RADIUS; iz <= GRID_RADIUS; iz += 1) {
      if (Math.sqrt(ix * ix + iz * iz) > GRID_RADIUS + 0.001) {
        continue;
      }
      map.set(tileKey(ix, iz), {
        key: tileKey(ix, iz),
        x: ix * TILE_SIZE,
        z: iz * TILE_SIZE,
        ttl: 4 + Math.random() * 8,
        broken: false,
      });
    }
  }

  const origin = map.get(tileKey(0, 0));
  if (origin) {
    origin.ttl = 99;
  }

  return map;
}

function makeCrystals(tiles: Map<string, TileState>, count: number): Crystal[] {
  const candidates = Array.from(tiles.values()).filter((tile) => tile.x !== 0 || tile.z !== 0);
  const selected = new Set<string>();
  const result: Crystal[] = [];
  let id = 0;

  while (result.length < count && selected.size < candidates.length) {
    const tile = candidates[Math.floor(Math.random() * candidates.length)];
    if (!tile || selected.has(tile.key)) {
      continue;
    }
    selected.add(tile.key);
    result.push({
      id: id++,
      x: tile.x + (Math.random() - 0.5) * TILE_SIZE * 0.45,
      z: tile.z + (Math.random() - 0.5) * TILE_SIZE * 0.45,
      picked: false,
    });
  }

  if (result.length === 0) {
    result.push({ id: 0, x: TILE_SIZE * 2, z: 0, picked: false });
  }

  return result;
}

function tileFromLocal(x: number, z: number) {
  return tileKey(Math.round(x / TILE_SIZE), Math.round(z / TILE_SIZE));
}

function ThreeGravityBearModeScene() {
  const runningRef = useRef(true);
  const demoQuery = useMemo(() => new URLSearchParams(window.location.search), []);
  const demoMode = demoQuery.get('demo') === '1';
  const demoFrame = Number(demoQuery.get('t') ?? '0');

  const timeLeftRef = useRef(START_SECONDS);
  const scoreRef = useRef(0);
  const collectedRef = useRef(0);
  const totalCrystalsRef = useRef(CRYSTAL_COUNT);
  const [round, setRound] = useState(0);
  const [renderAxes, setRenderAxes] = useState<LocalAxes>(() => buildAxesFromGravityDown(new THREE.Vector3(0, -1, 0)));
  const [renderTiles, setRenderTiles] = useState<TileState[]>([]);
  const [renderCrystals, setRenderCrystals] = useState<Crystal[]>([]);
  const [renderPlayerWorld, setRenderPlayerWorld] = useState<THREE.Vector3>(() => new THREE.Vector3());
  const yawRef = useRef(0);
  const thetaRef = useRef(Math.PI);

  const gravityDirRef = useRef<THREE.Vector3>(new THREE.Vector3(0, -1, 0));
  const keysRef = useRef({
    moveW: false,
    moveS: false,
    moveA: false,
    moveD: false,
    gLeft: false,
    gRight: false,
    gUp: false,
    gDown: false,
  });

  const playerPosRef = useRef(new THREE.Vector2(0, 0));
  const tilesRef = useRef<Map<string, TileState>>(new Map());
  const crystalsRef = useRef<Crystal[]>([]);
  const worldBound = useRef(GRID_RADIUS * TILE_SIZE - 0.25);

  const lose = useCallback(() => {
    if (!runningRef.current) {
      return;
    }
    runningRef.current = false;
  }, []);

  const win = useCallback(() => {
    if (!runningRef.current) {
      return;
    }
    runningRef.current = false;
  }, []);

  const initRound = useCallback(() => {
    playerPosRef.current.set(0, 0);
    const tiles = makeArenaTiles();
    tilesRef.current = tiles;
    const crystals = makeCrystals(tiles, CRYSTAL_COUNT);
    crystalsRef.current = crystals;

    yawRef.current = 0;
    thetaRef.current = Math.PI;
    const nextGravity = gravityFromAngles(yawRef.current, thetaRef.current);
    gravityDirRef.current.copy(nextGravity);

    timeLeftRef.current = START_SECONDS;
    scoreRef.current = 0;
    collectedRef.current = 0;
    runningRef.current = true;

    totalCrystalsRef.current = crystals.length;
    const nextAxes = buildAxesFromGravityDown(gravityDirRef.current);
    setRenderAxes(nextAxes);
    setRenderTiles(Array.from(tiles.values()));
    setRenderCrystals(crystals.filter((c) => !c.picked));
    setRenderPlayerWorld(localToWorld(playerPosRef.current.x, playerPosRef.current.y, nextAxes));
    setRound((value) => value + 1);
  }, []);

  useEffect(() => {
    initRound();
  }, [initRound]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (demoMode) {
        return;
      }
      if (!runningRef.current && event.code === 'Space') {
        initRound();
      }

      if (event.code === 'KeyW') keysRef.current.moveW = true;
      if (event.code === 'KeyS') keysRef.current.moveS = true;
      if (event.code === 'KeyA') keysRef.current.moveA = true;
      if (event.code === 'KeyD') keysRef.current.moveD = true;

      if (event.code === 'ArrowLeft') keysRef.current.gLeft = true;
      if (event.code === 'ArrowRight') keysRef.current.gRight = true;
      if (event.code === 'ArrowUp') keysRef.current.gUp = true;
      if (event.code === 'ArrowDown') keysRef.current.gDown = true;

      if (event.code.startsWith('Arrow')) {
        event.preventDefault();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (demoMode) {
        return;
      }
      if (event.code === 'KeyW') keysRef.current.moveW = false;
      if (event.code === 'KeyS') keysRef.current.moveS = false;
      if (event.code === 'KeyA') keysRef.current.moveA = false;
      if (event.code === 'KeyD') keysRef.current.moveD = false;

      if (event.code === 'ArrowLeft') {
        keysRef.current.gLeft = false;
      }
      if (event.code === 'ArrowRight') {
        keysRef.current.gRight = false;
      }
      if (event.code === 'ArrowUp') {
        keysRef.current.gUp = false;
      }
      if (event.code === 'ArrowDown') {
        keysRef.current.gDown = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [initRound, demoMode]);

  useEffect(() => {
    if (!demoMode) {
      return;
    }
    runningRef.current = true;
  }, [demoMode]);

  useFrame((state, delta) => {
    const axes = buildAxesFromGravityDown(gravityDirRef.current);

    if (demoMode) {
      const t = demoFrame;
      const worldX = Math.sin(t * 0.48) * (GRID_RADIUS * TILE_SIZE * 0.45);
      const worldZ = Math.cos(t * 0.42) * (GRID_RADIUS * TILE_SIZE * 0.45);
      playerPosRef.current.set(
        clamp(worldX, -worldBound.current, worldBound.current),
        clamp(worldZ, -worldBound.current, worldBound.current),
      );

      const yaw = t * 0.9;
      const theta = Math.PI / 2 + Math.sin(t * 0.35) * 0.9;
      const clampedTheta = clamp(theta, 0.22, Math.PI - 0.22);
      const wrappedYaw = ((yaw + Math.PI * 2) % (Math.PI * 2));
      yawRef.current = wrappedYaw;
      thetaRef.current = clampedTheta;

      const nextGravity = gravityFromAngles(wrappedYaw, clampedTheta);
      gravityDirRef.current.copy(nextGravity);

      const follow = new THREE.Vector3()
        .addScaledVector(axes.axisX, -9)
        .addScaledVector(axes.axisZ, 3.6)
        .addScaledVector(axes.axisY, 4.6);
      const playerWorldPos = localToWorld(playerPosRef.current.x, playerPosRef.current.y, axes);
      const target = playerWorldPos.clone().add(follow);
      state.camera.position.lerp(target, 0.25);
      state.camera.up.copy(axes.axisY);
      state.camera.lookAt(playerWorldPos);

      setRenderAxes(axes);
      setRenderTiles(Array.from(tilesRef.current.values()));
      setRenderCrystals(crystalsRef.current.filter((c) => !c.picked));
      setRenderPlayerWorld(playerWorldPos);
      return;
    }

    if (!runningRef.current) {
      return;
    }

    if (keysRef.current.gLeft) {
      yawRef.current -= GRAVITY_ROT_SPEED * delta;
    }
    if (keysRef.current.gRight) {
      yawRef.current += GRAVITY_ROT_SPEED * delta;
    }
    if (keysRef.current.gUp) {
      thetaRef.current -= GRAVITY_ROT_SPEED * delta;
    }
    if (keysRef.current.gDown) {
      thetaRef.current += GRAVITY_ROT_SPEED * delta;
    }

    const clampedTheta = clamp(thetaRef.current, 0.12, Math.PI - 0.12);
    const wrappedYaw = ((yawRef.current + Math.PI * 2) % (Math.PI * 2));
    if (yawRef.current !== wrappedYaw) {
      yawRef.current = wrappedYaw;
    }
    thetaRef.current = clampedTheta;

    const nextGravity = gravityFromAngles(wrappedYaw, clampedTheta);
    if (!nextGravity.equals(gravityDirRef.current)) {
      gravityDirRef.current.copy(nextGravity);
    }

    const move = new THREE.Vector2(0, 0);
    if (keysRef.current.moveW) move.y -= 1;
    if (keysRef.current.moveS) move.y += 1;
    if (keysRef.current.moveA) move.x -= 1;
    if (keysRef.current.moveD) move.x += 1;

    if (move.lengthSq() > 0.001) {
      move.normalize().multiplyScalar(MOVE_SPEED * delta);
      playerPosRef.current.add(move);
      playerPosRef.current.x = clamp(playerPosRef.current.x, -worldBound.current, worldBound.current);
      playerPosRef.current.y = clamp(playerPosRef.current.y, -worldBound.current, worldBound.current);
    }

    const tile = tilesRef.current.get(tileFromLocal(playerPosRef.current.x, playerPosRef.current.y));
    if (!tile || tile.broken) {
      lose();
      return;
    }

    tile.ttl -= delta * COLLAPSE_RATE;
    if (tile.ttl <= 0) {
      tile.broken = true;
      lose();
      setRenderAxes(axes);
      setRenderTiles(Array.from(tilesRef.current.values()));
      setRenderCrystals(crystalsRef.current.filter((c) => !c.picked));
      setRenderPlayerWorld(localToWorld(playerPosRef.current.x, playerPosRef.current.y, axes));
      return;
    }

    let pickedIndex = -1;
    for (let i = 0; i < crystalsRef.current.length; i++) {
      const crystal = crystalsRef.current[i];
      if (crystal.picked) {
        continue;
      }
      const dx = crystal.x - playerPosRef.current.x;
      const dz = crystal.z - playerPosRef.current.y;
      const dist2 = dx * dx + dz * dz;
      if (dist2 <= 1.4) {
        pickedIndex = i;
        break;
      }
    }
    if (pickedIndex >= 0) {
      crystalsRef.current = crystalsRef.current.map((c, i) =>
        i === pickedIndex ? { ...c, picked: true } : c,
      );
      collectedRef.current += 1;
      scoreRef.current += 110;
    }

    if (collectedRef.current >= totalCrystalsRef.current) {
      win();
      return;
    }

    timeLeftRef.current -= delta;
    if (timeLeftRef.current <= 0) {
      lose();
      return;
    }

    const worldPos = localToWorld(playerPosRef.current.x, playerPosRef.current.y, axes);
    const follow = new THREE.Vector3()
      .addScaledVector(axes.axisX, -9)
      .addScaledVector(axes.axisZ, 3.6)
      .addScaledVector(axes.axisY, 4.6);
    const target = worldPos.clone().add(follow);
    state.camera.position.lerp(target, 0.16);
    state.camera.up.copy(axes.axisY);
    state.camera.lookAt(worldPos);

    setRenderAxes(axes);
    setRenderTiles(Array.from(tilesRef.current.values()));
    setRenderCrystals(crystalsRef.current.filter((c) => !c.picked));
    setRenderPlayerWorld(worldPos);
  });

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[8, 10, 6]} intensity={1.1} />
      <pointLight position={[-8, 10, -2]} intensity={0.65} color="#89adff" />

      {renderTiles.map((tile) => {
        const worldPos = localToWorld(tile.x, tile.z, renderAxes);
        const color = tile.broken
          ? '#2c2f3e'
          : tile.ttl > 7
            ? '#4ed08e'
            : tile.ttl > 4
              ? '#e7b44f'
              : '#e15b63';

        return (
          <mesh
            key={`${tile.key}-${round}`}
            position={worldPos}
            quaternion={renderAxes.basisQuat}
            castShadow
          >
            <boxGeometry args={[TILE_SIZE * 0.98, 0.55, TILE_SIZE * 0.98]} />
            <meshStandardMaterial
              color={color}
              roughness={0.2}
              metalness={0.15}
              emissive={tile.broken ? '#171c2a' : '#1d2830'}
              emissiveIntensity={0.15}
            />
          </mesh>
        );
      })}

      {renderCrystals.map((crystal) => {
        const worldPos = localToWorld(crystal.x, crystal.z, renderAxes).addScaledVector(renderAxes.axisY, 0.82);
        return (
          <mesh
            key={`${crystal.id}-${round}`}
            position={worldPos}
            quaternion={renderAxes.basisQuat}
          >
            <icosahedronGeometry args={[0.45, 1]} />
            <meshStandardMaterial
              color="#5ff9ff"
              emissive="#00ddff"
              emissiveIntensity={0.4}
              roughness={0.22}
            />
          </mesh>
        );
      })}

      <mesh position={renderPlayerWorld.clone().addScaledVector(renderAxes.axisY, 0.55)} quaternion={renderAxes.basisQuat}>
        <sphereGeometry args={[0.45, 24, 24]} />
        <meshStandardMaterial color="#ff8a5b" emissive="#7a2a16" emissiveIntensity={0.35} />
      </mesh>
    </>
  );
}

export function ThreeGravityBearMode() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(160deg, #070b13, #0d1422)' }}>
      <Canvas camera={{ fov: 60, position: [0, 16, 16] }}>
        <ThreeGravityBearModeScene />
      </Canvas>
    </div>
  );
}
