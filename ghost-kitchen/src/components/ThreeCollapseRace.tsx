import { useFrame, useThree } from '@react-three/fiber';
import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Dispatch, SetStateAction } from 'react';

type TileState = {
  id: string;
  x: number;
  z: number;
  ttl: number;
  active: boolean;
};

const GRID_HALF = 6;
const TILE_SIZE = 2;
const START_TIME = 60;
const MOVE_SPEED = 10;
const PLAYER_RADIUS = 0.55;
const COLLAPSE_RATE = 1;

const tileId = (ix: number, iz: number) => `${ix},${iz}`;

function makeArenaTiles(): TileState[] {
  const tiles: TileState[] = [];
  for (let x = -GRID_HALF; x <= GRID_HALF; x++) {
    for (let z = -GRID_HALF; z <= GRID_HALF; z++) {
      const dist = Math.sqrt(x * x + z * z);
      if (dist > GRID_HALF + 0.2) continue;

      tiles.push({
        id: tileId(x, z),
        x: x * TILE_SIZE,
        z: z * TILE_SIZE,
        ttl: 4 + Math.random() * 8,
        active: true,
      });
    }
  }
  return tiles;
}

function tileIndexAt(x: number, z: number) {
  return {
    ix: Math.round(x / TILE_SIZE),
    iz: Math.round(z / TILE_SIZE),
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

type WorldProps = {
  running: boolean;
  setHud: (next: { timeLeft: number; distance: number; alive: number }) => void;
  setRunning: Dispatch<SetStateAction<boolean>>;
  resetToken: number;
};

function collapseColor(ttl: number) {
  if (ttl > 6) return '#4fd18a';
  if (ttl > 3) return '#e8b63d';
  return '#e04a4a';
}

function World({ running, setHud, setRunning, resetToken }: WorldProps) {
  const { camera } = useThree();
  const player = useRef(new THREE.Vector3(0, 0.8, 0));
  const keys = useRef({ forward: false, backward: false, left: false, right: false });
  const runningRef = useRef(true);
  const distanceStart = useRef(0);
  const tileMapRef = useRef<Map<string, TileState>>(new Map());
  const timeLeftRef = useRef(START_TIME);
  const tileCountRef = useRef(0);

  runningRef.current = running;

  const init = useCallback(() => {
    const map = new Map<string, TileState>();
    const tiles = makeArenaTiles();
    tiles.forEach((tile) => map.set(tile.id, tile));
    tileCountRef.current = tiles.length;
    tileMapRef.current = map;
    timeLeftRef.current = START_TIME;
    player.current.set(0, 0.8, 0);
    distanceStart.current = 0;
    keys.current = {
      forward: false,
      backward: false,
      left: false,
      right: false,
    };
    runningRef.current = true;
  }, []);

  useEffect(() => {
    init();
  }, [init, resetToken]);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (!runningRef.current) return;
    if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.current.forward = true;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.current.backward = true;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.current.left = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.current.right = true;
  }, []);

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.current.forward = false;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.current.backward = false;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.current.left = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.current.right = false;
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onKeyDown, onKeyUp]);

  useFrame((_, delta) => {
    if (!runningRef.current) return;

    timeLeftRef.current = Math.max(0, timeLeftRef.current - delta);
    if (timeLeftRef.current <= 0) {
      runningRef.current = false;
      setRunning(false);
      return;
    }

    const move = new THREE.Vector3();
    if (keys.current.forward) move.z -= 1;
    if (keys.current.backward) move.z += 1;
    if (keys.current.left) move.x -= 1;
    if (keys.current.right) move.x += 1;

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(MOVE_SPEED * delta);
      player.current.x = clamp(player.current.x + move.x, -GRID_HALF * TILE_SIZE, GRID_HALF * TILE_SIZE);
      player.current.z = clamp(player.current.z + move.z, -GRID_HALF * TILE_SIZE, GRID_HALF * TILE_SIZE);
    }

    const floor = tileIndexAt(player.current.x, player.current.z);
    const id = tileId(floor.ix, floor.iz);
    const tile = tileMapRef.current.get(id);
    if (!tile || !tile.active) {
      runningRef.current = false;
      setRunning(false);
      setHud({ timeLeft: timeLeftRef.current, distance: distanceStart.current, alive: 0 });
      return;
    }

    const nextTTL = Math.max(0, tile.ttl - delta * COLLAPSE_RATE);
    if (nextTTL !== tile.ttl) {
      tileMapRef.current.set(id, {
        ...tile,
        ttl: nextTTL,
      });
    }
    if (nextTTL === 0) {
      tileMapRef.current.set(id, {
        ...tile,
        active: false,
      });
    }

    const movedDist = player.current.x * player.current.x + player.current.z * player.current.z;
    distanceStart.current = Math.max(distanceStart.current, Math.sqrt(movedDist));
    let alive = 0;
    tileMapRef.current.forEach((tile) => {
      if (tile.active) alive += 1;
    });
    setHud({
      timeLeft: timeLeftRef.current,
      distance: distanceStart.current,
      alive: tileCountRef.current ? Math.round((alive / tileCountRef.current) * 100) : 0,
    });

    camera.position.set(player.current.x, 14, player.current.z + 16);
    camera.lookAt(player.current.x, 0, player.current.z);
  });

  const activeTiles = Array.from(tileMapRef.current.values());

  return (
    <>
      {activeTiles.map((tile) => (
        <mesh
          key={`${tile.id}-${resetToken}`}
          position={[tile.x, 0, tile.z]}
          rotation-x={-Math.PI / 2}
          visible={tile.active}
        >
          <planeGeometry args={[TILE_SIZE, TILE_SIZE]} />
          <meshStandardMaterial color={collapseColor(tile.ttl)} />
        </mesh>
      ))}
      <mesh position={[player.current.x, 0.8, player.current.z]}>
        <sphereGeometry args={[PLAYER_RADIUS, 24, 24]} />
        <meshStandardMaterial color="#5f9eff" emissive="#1f3f75" emissiveIntensity={0.5} />
      </mesh>
      <directionalLight position={[8, 12, 8]} intensity={1.1} />
      <ambientLight intensity={0.35} />
      <fog attach="fog" args={['#102033', 18, 40]} />
    </>
  );
}

export function ThreeCollapseRace() {
  const [timeLeft, setTimeLeft] = useState(START_TIME);
  const [distance, setDistance] = useState(0);
  const [alivePercent, setAlivePercent] = useState(100);
  const [running, setRunning] = useState(true);
  const [round, setRound] = useState(0);

  const restart = () => {
    setTimeLeft(START_TIME);
    setDistance(0);
    setAlivePercent(100);
    setRunning(true);
    setRound((prev) => prev + 1);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(180deg, #091221 0%, #050910 100%)',
      }}
    >
      <Canvas camera={{ fov: 55, position: [0, 14, 16] }}>
        <World
          running={running}
          setHud={(next) => {
            setTimeLeft(next.timeLeft);
            setDistance(next.distance);
            setAlivePercent(next.alive);
          }}
          setRunning={setRunning}
          resetToken={round}
        />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          color: 'white',
          fontFamily: 'monospace',
          padding: 16,
          userSelect: 'none',
        }}
      >
        <div>Time: {Math.ceil(timeLeft)}s</div>
        <div>Distance: {Math.floor(distance * 10) / 10}m</div>
        <div>Tiles alive: {alivePercent}%</div>
        <div>WASDで移動 / 崩れた床に乗らない</div>
      </div>

      {!running && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.66)',
            padding: 14,
            borderRadius: 12,
            textAlign: 'center',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ color: '#fff', marginBottom: 10 }}>
            {timeLeft <= 0 ? 'TIME CLEAR' : 'CRASHED'}
          </div>
          <button
            type="button"
            onClick={restart}
            style={{
              border: 0,
              borderRadius: 999,
              padding: '10px 14px',
              fontWeight: 700,
            }}
          >
            リトライ
          </button>
        </div>
      )}
    </div>
  );
}
