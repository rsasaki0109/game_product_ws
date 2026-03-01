import { useFrame } from '@react-three/fiber';
import { RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { useMemo, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { useStore } from '../store';
import { HauntSystem, type SafeZoneSpec } from './HauntSystem';
import { InteractionSystem } from './InteractionSystem';

const TABLE_POS = { x: 0, y: 0, z: -8 };
const SAFE_ZONE: SafeZoneSpec = { x: 0, y: 0, z: 8, r: 2.7 };

export function GameScene({ playerBodyRef }: { playerBodyRef: RefObject<RapierRigidBody | null> }) {
    const phase = useStore(state => state.phase);
    const hauntIntensity = useStore(state => state.hauntIntensity);
    const bj = useStore(state => state.blackjack);
    const startHaunt = useStore(state => state.startHaunt);
    const addChips = useStore(state => state.addChips);
    const die = useStore(state => state.die);

    const pointLightRef = useRef<THREE.PointLight>(null);
    const hauntStartGuard = useRef(false);
    const ghostRef = useRef<THREE.Mesh>(null);
    const ghostArmed = useRef(false);
    const tableBeaconRef = useRef<THREE.Group>(null);

    const capture = useMemo(() => {
        if (typeof window === 'undefined') return null;
        return new URLSearchParams(window.location.search).get('capture');
    }, []);
    const freezeAutoHauntOnLose = capture === 'table-lose';

    const chipSpawns = useMemo(() => ([
        { x: -6, y: 0.25, z: -4, v: 1 },
        { x: 6, y: 0.25, z: -4, v: 1 },
        { x: -6, y: 0.25, z: 0, v: 1 },
        { x: 6, y: 0.25, z: 0, v: 1 },
        { x: -6, y: 0.25, z: 4, v: 1 },
        { x: 6, y: 0.25, z: 4, v: 1 },
        { x: 0, y: 0.25, z: 0, v: 2 },
        { x: 0, y: 0.25, z: 6, v: 2 },
    ]), []);

    const [chipTaken, setChipTaken] = useState<boolean[]>(() => chipSpawns.map(() => false));

    useFrame(({ clock }, dt) => {
        // A simple beacon to help players find the table during exploration.
        if (tableBeaconRef.current) {
            const t = clock.getElapsedTime();
            tableBeaconRef.current.position.y = 3.2 + Math.sin(t * 2.2) * 0.12;
            tableBeaconRef.current.rotation.y += dt * 0.6;
        }

        // Light flicker during haunt.
        if (pointLightRef.current) {
            if (hauntIntensity > 0) {
                pointLightRef.current.intensity = Math.random() * 2;
                pointLightRef.current.color.setHSL(Math.random(), 1, 0.5);
            } else {
                pointLightRef.current.intensity = THREE.MathUtils.lerp(pointLightRef.current.intensity, 0.6, 0.08);
                pointLightRef.current.color.setHex(0xffffff);
            }
        }

        // Table resolution -> lose triggers haunt (instant clip moment).
        if (!freezeAutoHauntOnLose && phase === 'table' && bj.status === 'resolved' && bj.outcome === 'lose') {
            if (!hauntStartGuard.current) {
                hauntStartGuard.current = true;
                startHaunt(clock.getElapsedTime(), 12);
            }
        } else if (phase !== 'table') {
            hauntStartGuard.current = false;
        }

        // Chip auto-pickup (distance-based).
        const rb = playerBodyRef.current;
        if (rb) {
            const p = rb.translation();
            let changed = false;
            const next = chipTaken.slice();
            for (let i = 0; i < chipSpawns.length; i++) {
                if (next[i]) continue;
                const c = chipSpawns[i];
                const dx = p.x - c.x;
                const dz = p.z - c.z;
                if ((dx * dx + dz * dz) <= 0.85 * 0.85) {
                    next[i] = true;
                    addChips(c.v);
                    changed = true;
                }
            }
            if (changed) setChipTaken(next);
        }

        // Minimal "debt collector" chase during haunt.
        if (phase === 'haunt') {
            const rb2 = playerBodyRef.current;
            const g = ghostRef.current;
            if (rb2 && g) {
                const p = rb2.translation();
                if (!ghostArmed.current) {
                    ghostArmed.current = true;
                    g.position.set(TABLE_POS.x, 0.9, TABLE_POS.z);
                }

                const target = new THREE.Vector3(p.x, 0.9, p.z);
                const dir = target.sub(g.position);
                const dist = dir.length();
                if (dist > 0.0001) {
                    dir.normalize();
                    const speed = 2.4; // m/s
                    g.position.addScaledVector(dir, speed * dt);
                }

                const dx = g.position.x - p.x;
                const dz = g.position.z - p.z;
                if ((dx * dx + dz * dz) <= 0.55 * 0.55) {
                    die('捕まった');
                }
            }
        } else {
            ghostArmed.current = false;
        }
    });

    const safeGlow = phase === 'haunt' ? 1.7 : 0.5;

    return (
        <>
            <InteractionSystem playerBodyRef={playerBodyRef} tablePos={TABLE_POS} />
            <HauntSystem playerBodyRef={playerBodyRef} safeZone={SAFE_ZONE} />

            <ambientLight intensity={0.22} />
            <pointLight ref={pointLightRef} position={[10, 10, 10]} castShadow intensity={0.6} />
            <directionalLight position={[-5, 8, 5]} castShadow intensity={0.55} />

            {/* Floor */}
            <RigidBody type="fixed" friction={1}>
                <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[50, 50]} />
                    <meshStandardMaterial color="#2a2a2a" />
                </mesh>
            </RigidBody>

            {/* Walls (simple box room) */}
            <RigidBody type="fixed">
                <mesh position={[0, 2.5, -10]} receiveShadow>
                    <boxGeometry args={[20, 5, 1]} />
                    <meshStandardMaterial color="#4a4a4a" />
                </mesh>
                <mesh position={[0, 2.5, 10]} receiveShadow>
                    <boxGeometry args={[20, 5, 1]} />
                    <meshStandardMaterial color="#4a4a4a" />
                </mesh>
                <mesh position={[-10, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                    <boxGeometry args={[20, 5, 1]} />
                    <meshStandardMaterial color="#404040" />
                </mesh>
                <mesh position={[10, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                    <boxGeometry args={[20, 5, 1]} />
                    <meshStandardMaterial color="#404040" />
                </mesh>
            </RigidBody>

            {/* Table */}
            <RigidBody type="fixed">
                <mesh position={[TABLE_POS.x, 1, TABLE_POS.z]} castShadow receiveShadow>
                    <boxGeometry args={[4, 2, 2]} />
                    <meshStandardMaterial color="#7a4b22" />
                </mesh>
                <mesh position={[TABLE_POS.x, 2.05, TABLE_POS.z]} castShadow receiveShadow>
                    <boxGeometry args={[4.2, 0.12, 2.2]} />
                    <meshStandardMaterial color="#123a2b" emissive="#123a2b" emissiveIntensity={0.4} />
                </mesh>
            </RigidBody>

            {/* Table Beacon (Explore Only) */}
            {phase === 'explore' && (
                <group ref={tableBeaconRef} position={[TABLE_POS.x, 3.2, TABLE_POS.z]}>
                    <mesh position={[0, 0.35, 0]}>
                        <coneGeometry args={[0.26, 0.58, 18]} />
                        <meshStandardMaterial color="#2dff8a" emissive="#2dff8a" emissiveIntensity={2.6} />
                    </mesh>
                    <mesh position={[0, -0.8, 0]}>
                        <cylinderGeometry args={[0.05, 0.05, 2.4, 12]} />
                        <meshStandardMaterial
                            color="#2dff8a"
                            emissive="#2dff8a"
                            emissiveIntensity={1.8}
                            transparent
                            opacity={0.20}
                        />
                    </mesh>
                </group>
            )}

            {/* Safe Zone Marker */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[SAFE_ZONE.x, 0.02, SAFE_ZONE.z]}>
                <ringGeometry args={[SAFE_ZONE.r * 0.62, SAFE_ZONE.r, 48]} />
                <meshStandardMaterial
                    color="#2dff8a"
                    emissive="#2dff8a"
                    emissiveIntensity={safeGlow}
                    transparent
                    opacity={0.35}
                />
            </mesh>
            <mesh position={[SAFE_ZONE.x, 0.85, SAFE_ZONE.z]}>
                <cylinderGeometry args={[0.12, 0.12, 1.7, 18]} />
                <meshStandardMaterial color="#2dff8a" emissive="#2dff8a" emissiveIntensity={safeGlow} />
            </mesh>
            {phase === 'haunt' && (
                <mesh position={[SAFE_ZONE.x, 2.5, SAFE_ZONE.z]}>
                    <cylinderGeometry args={[0.75, 0.75, 5, 24]} />
                    <meshStandardMaterial
                        color="#2dff8a"
                        emissive="#2dff8a"
                        emissiveIntensity={2.2}
                        transparent
                        opacity={0.12}
                    />
                </mesh>
            )}

            {/* Chips */}
            {chipSpawns.map((c, i) => chipTaken[i] ? null : (
                <mesh key={i} position={[c.x, c.y, c.z]} castShadow>
                    <cylinderGeometry args={[0.22, 0.22, 0.08, 16]} />
                    <meshStandardMaterial
                        color={c.v >= 2 ? '#e6c25a' : '#b51f1f'}
                        emissive={c.v >= 2 ? '#6a560f' : '#3a0000'}
                        emissiveIntensity={0.8}
                        metalness={0.2}
                        roughness={0.4}
                    />
                </mesh>
            ))}

            {/* Debt Collector (visual only) */}
            {phase === 'haunt' && (
                <mesh ref={ghostRef} position={[TABLE_POS.x, 0.9, TABLE_POS.z]}>
                    <sphereGeometry args={[0.32, 18, 18]} />
                    <meshStandardMaterial color="#ff2b2b" emissive="#ff2b2b" emissiveIntensity={2.1} />
                </mesh>
            )}
        </>
    );
}
