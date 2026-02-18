import { useFrame, useThree } from '@react-three/fiber';
import { Canvas } from '@react-three/fiber';
import { useCallback, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

type Enemy = {
  id: number;
  x: number;
  z: number;
  speed: number;
};

const ARENA_LIMIT = 24;
const MOVE_SPEED = 8;
const ENEMY_SPAWN_INTERVAL = 0.8;
const MAX_ENEMIES = 20;
const MAX_HEALTH = 100;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function spawnEnemy(id: number, playerX: number, playerZ: number): Enemy {
  let x = 0;
  let z = 0;
  do {
    const angle = Math.random() * Math.PI * 2;
    const dist = 18 + Math.random() * 10;
    x = Math.cos(angle) * dist + playerX;
    z = Math.sin(angle) * dist + playerZ;
  } while (Math.hypot(x - playerX, z - playerZ) < 12);

  return {
    id,
    x,
    z,
    speed: 1.8 + Math.random() * 1.3,
  };
}

function FPSWorld({
  running,
  enemies,
  setEnemies,
  setScore,
  setHealth,
  setTimeLeft,
  setRunning,
  resetToken,
  setPointerLocked,
}: {
  running: boolean;
  enemies: Enemy[];
  setEnemies: React.Dispatch<React.SetStateAction<Enemy[]>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setHealth: React.Dispatch<React.SetStateAction<number>>;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  setRunning: React.Dispatch<React.SetStateAction<boolean>>;
  resetToken: number;
  setPointerLocked: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { camera, gl } = useThree();
  const enemyMap = useRef(new Map<number, THREE.Object3D>());
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });
  const yaw = useRef(0);
  const pitch = useRef(0);
  const pointerLocked = useRef(false);
  const lastShot = useRef(0);
  const lastSpawn = useRef(0);
  const nextEnemyId = useRef(0);
  const raycaster = useRef(new THREE.Raycaster());
  const runningRef = useRef(true);
  const [, forceTick] = useState(0);

  runningRef.current = running;

  const shoot = useCallback(() => {
    if (!runningRef.current || !pointerLocked.current) {
      return;
    }

    const now = performance.now();
    if (now - lastShot.current < 120) {
      return;
    }
    lastShot.current = now;

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const origin = new THREE.Vector3(
      camera.position.x,
      camera.position.y,
      camera.position.z,
    );
    raycaster.current.set(origin, direction);

    const candidates = Array.from(enemyMap.current.values());
    const hit = raycaster.current.intersectObjects(candidates, false)[0];
    if (!hit || typeof hit.object.userData?.enemyId !== 'number') {
      return;
    }

    const hitId = hit.object.userData.enemyId as number;
    setEnemies((prev) => prev.filter((enemy) => enemy.id !== hitId));
    setScore((prev) => prev + 1);
  }, [camera, setEnemies, setScore]);

  useEffect(() => {
    const onPointerLockChange = () => {
      const isLocked = document.pointerLockElement === gl.domElement;
      pointerLocked.current = isLocked;
      setPointerLocked(isLocked);
      forceTick((prev) => prev + 1);
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!pointerLocked.current || !runningRef.current) {
        return;
      }
      yaw.current -= event.movementX * 0.0025;
      pitch.current -= event.movementY * 0.0025;
      pitch.current = clamp(pitch.current, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);
    };

    const keyDown = (event: KeyboardEvent) => {
      if (!runningRef.current || !pointerLocked.current) {
        return;
      }
      if (event.code === 'KeyW' || event.code === 'ArrowUp') keys.current.forward = true;
      if (event.code === 'KeyS' || event.code === 'ArrowDown') keys.current.backward = true;
      if (event.code === 'KeyA' || event.code === 'ArrowLeft') keys.current.left = true;
      if (event.code === 'KeyD' || event.code === 'ArrowRight') keys.current.right = true;
      if (event.code === 'Space') {
        event.preventDefault();
        shoot();
      }
    };

    const keyUp = (event: KeyboardEvent) => {
      if (event.code === 'KeyW' || event.code === 'ArrowUp') keys.current.forward = false;
      if (event.code === 'KeyS' || event.code === 'ArrowDown') keys.current.backward = false;
      if (event.code === 'KeyA' || event.code === 'ArrowLeft') keys.current.left = false;
      if (event.code === 'KeyD' || event.code === 'ArrowRight') keys.current.right = false;
    };

    const onMouseDown = (event: MouseEvent) => {
      if (!runningRef.current) {
        return;
      }
      if (!pointerLocked.current) {
        if (event.button === 0) {
          gl.domElement.requestPointerLock();
        }
        return;
      }
      if (event.button === 0) {
        shoot();
      }
    };

    const onContext = (event: MouseEvent) => event.preventDefault();

    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', keyDown);
    document.addEventListener('keyup', keyUp);
    gl.domElement.addEventListener('mousedown', onMouseDown);
    gl.domElement.addEventListener('contextmenu', onContext);

    return () => {
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('keydown', keyDown);
      document.removeEventListener('keyup', keyUp);
      gl.domElement.removeEventListener('mousedown', onMouseDown);
      gl.domElement.removeEventListener('contextmenu', onContext);
    };
  }, [gl.domElement, shoot, setPointerLocked]);

  useEffect(() => {
    runningRef.current = true;
    yaw.current = 0;
    pitch.current = 0;
    camera.position.set(0, 1.6, 14);
    camera.rotation.set(0, Math.PI, 0, 'YXZ');
    enemyMap.current.clear();
    keys.current = {
      forward: false,
      backward: false,
      left: false,
      right: false,
    };
  }, [camera, resetToken]);

  useFrame((_, delta) => {
    if (!runningRef.current) {
      return;
    }

    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ');

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    if (direction.lengthSq() > 0.00001) {
      direction.normalize();
    }

    const right = direction.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
    const movement = new THREE.Vector3();
    if (keys.current.forward) movement.add(direction);
    if (keys.current.backward) movement.addScaledVector(direction, -1);
    if (keys.current.right) movement.add(right);
    if (keys.current.left) movement.addScaledVector(right, -1);

    if (movement.lengthSq() > 0.001) {
      movement.normalize();
      movement.multiplyScalar(MOVE_SPEED * delta);
      camera.position.add(movement);
      camera.position.x = clamp(camera.position.x, -ARENA_LIMIT, ARENA_LIMIT);
      camera.position.z = clamp(camera.position.z, -ARENA_LIMIT, ARENA_LIMIT);
    }

    setTimeLeft((prev) => {
      const next = prev - delta;
      if (next <= 0 && runningRef.current) {
        runningRef.current = false;
        setRunning(false);
        return 0;
      }
      return next;
    });

    setEnemies((prev) => {
      let damage = 0;
      const player = new THREE.Vector3(camera.position.x, 0, camera.position.z);
      const next = prev
        .map((enemy) => {
          const pos = new THREE.Vector3(enemy.x, 0, enemy.z);
          const toPlayer = new THREE.Vector3().subVectors(player, pos);
          const dist = toPlayer.length();
          if (dist < 1.1) {
            damage += 1;
            return null;
          }
          if (dist > 90) {
            return null;
          }
          toPlayer.y = 0;
          toPlayer.normalize();
          const nextPos = pos.addScaledVector(toPlayer, enemy.speed * delta);
          return {
            ...enemy,
            x: nextPos.x,
            z: nextPos.z,
          };
        })
        .filter((enemy): enemy is Enemy => enemy !== null);

      if (damage > 0) {
        setHealth((prevHealth) => {
          const nextHealth = Math.max(0, prevHealth - damage * 18);
          if (nextHealth <= 0 && runningRef.current) {
            runningRef.current = false;
            setRunning(false);
          }
          return nextHealth;
        });
      }
      return next;
    });

    lastSpawn.current += delta;
    if (lastSpawn.current >= ENEMY_SPAWN_INTERVAL) {
      lastSpawn.current = 0;
      setEnemies((prev) => {
        if (prev.length >= MAX_ENEMIES) {
          return prev;
        }
        const spawn = spawnEnemy(nextEnemyId.current++, camera.position.x, camera.position.z);
        return [...prev, spawn];
      });
    }
  });

  return (
    <>
      <mesh position={[0, -1, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#1a2336" />
      </mesh>

      {enemies.map((enemy) => (
        <mesh
          key={enemy.id}
          position={[enemy.x, 1.1, enemy.z]}
          userData={{ enemyId: enemy.id }}
          ref={(mesh) => {
            if (!mesh) {
              enemyMap.current.delete(enemy.id);
            } else {
              enemyMap.current.set(enemy.id, mesh);
            }
          }}
        >
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshStandardMaterial
            color="#ff4f4f"
            emissive="#400000"
            emissiveIntensity={0.35}
          />
        </mesh>
      ))}
    </>
  );
}

export function ThreeFPSGame() {
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [health, setHealth] = useState(MAX_HEALTH);
  const [running, setRunning] = useState(true);
  const [locked, setLocked] = useState(false);
  const [round, setRound] = useState(0);

  const restart = () => {
    setEnemies([]);
    setScore(0);
    setTimeLeft(60);
    setHealth(MAX_HEALTH);
    setRunning(true);
    setLocked(false);
    setRound((prev) => prev + 1);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(180deg, #101624 0%, #0a1220 100%)',
      }}
    >
      <Canvas camera={{ position: [0, 1.6, 14], fov: 75 }}>
        <color attach="background" args={['#101624']} />
        <ambientLight intensity={0.45} />
        <directionalLight
          castShadow={false}
          intensity={1.1}
          position={[6, 12, 3]}
          color="#90c8ff"
        />
    <FPSWorld
          running={running}
          enemies={enemies}
          setEnemies={setEnemies}
          setScore={setScore}
          setHealth={setHealth}
      setTimeLeft={setTimeLeft}
      setRunning={setRunning}
      setPointerLocked={setLocked}
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
          userSelect: 'none',
        }}
      >
        <div style={{ position: 'absolute', top: 16, left: 16 }}>
          <div>Score: {score}</div>
          <div>HP: {health}</div>
          <div>Time: {Math.max(0, Math.ceil(timeLeft))}</div>
          <div>WASD:移動 / 左クリック:射撃 / クリック:マウスロック</div>
        </div>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <div style={{ fontSize: 48, color: '#fff', opacity: locked ? 0.5 : 1 }}>
            +
          </div>
        </div>

        {!running && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 24,
              transform: 'translateX(-50%)',
              textAlign: 'center',
              pointerEvents: 'auto',
            }}
          >
            <div style={{ marginBottom: 10 }}>
              {health <= 0 ? 'Game Over' : 'Time Up'}
            </div>
            <button
              type="button"
              onClick={restart}
              style={{
                border: '0',
                borderRadius: 999,
                padding: '12px 20px',
                fontWeight: 700,
                background: '#fff',
                color: '#111',
              }}
            >
              もう一度
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
