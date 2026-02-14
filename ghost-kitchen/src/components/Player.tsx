import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, useRapier, RapierRigidBody } from '@react-three/rapier';
import { useRef, useEffect, useState, type RefObject } from 'react';
import * as ONE from 'three';
import { useStore } from '../store';

const SPEED = 5;
const JUMP_FORCE = 4;
const INTERACTION_DISTANCE = 3;

type Movement = {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    jump: boolean;
};

export function Player({ bodyRef }: { bodyRef: RefObject<RapierRigidBody | null> }) {
    // Input State
    const [movement, setMovement] = useState<Movement>(() => ({ forward: false, backward: false, left: false, right: false, jump: false }));
    const [holding, setHolding] = useState<RapierRigidBody | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const st = useStore.getState();
            const k = (typeof e.key === 'string') ? e.key.toLowerCase() : '';

            if (st.phase === 'dead') {
                if (e.code === 'KeyR' || k === 'r') st.restart();
                return;
            }

            if (st.phase === 'table') {
                switch (e.code) {
                    case 'Enter': {
                        e.preventDefault();
                        if (st.blackjack.status === 'idle') st.dealBlackjack();
                        break;
                    }
                    case 'KeyH': if (st.blackjack.status === 'playing') st.hitBlackjack(); break;
                    case 'KeyF': if (st.blackjack.status === 'playing') st.standBlackjack(); break;
                    case 'KeyS': if (st.blackjack.status === 'playing') st.standBlackjack(); break; // Stand (more intuitive)
                    case 'ArrowLeft': if (st.blackjack.status === 'playing') st.hitBlackjack(); break;
                    case 'ArrowRight': if (st.blackjack.status === 'playing') st.standBlackjack(); break;
                    case 'Digit1': if (st.blackjack.status === 'playing') st.hitBlackjack(); break;
                    case 'Digit2': if (st.blackjack.status === 'playing') st.standBlackjack(); break;
                    case 'KeyE': if (st.blackjack.status !== 'playing' && st.blackjack.outcome !== 'lose') st.closeTable(); break;
                }
                // Fallback for on-screen keyboards (some browsers report code as "Unidentified").
                if (e.code === 'Unidentified' || e.code === '') {
                    if (k === 'enter') {
                        e.preventDefault();
                        if (st.blackjack.status === 'idle') st.dealBlackjack();
                    }
                    if (k === 'h' && st.blackjack.status === 'playing') st.hitBlackjack();
                    if (k === 'f' && st.blackjack.status === 'playing') st.standBlackjack();
                    if (k === 's' && st.blackjack.status === 'playing') st.standBlackjack();
                    if (k === 'arrowleft' && st.blackjack.status === 'playing') st.hitBlackjack();
                    if (k === 'arrowright' && st.blackjack.status === 'playing') st.standBlackjack();
                    if (k === '1' && st.blackjack.status === 'playing') st.hitBlackjack();
                    if (k === '2' && st.blackjack.status === 'playing') st.standBlackjack();
                    if (k === 'e' && st.blackjack.status !== 'playing' && st.blackjack.outcome !== 'lose') st.closeTable();
                }
                return;
            }

            switch (e.code) {
                case 'KeyW': setMovement(m => ({ ...m, forward: true })); break;
                case 'KeyS': setMovement(m => ({ ...m, backward: true })); break;
                case 'KeyA': setMovement(m => ({ ...m, left: true })); break;
                case 'KeyD': setMovement(m => ({ ...m, right: true })); break;
                case 'Space': setMovement(m => ({ ...m, jump: true })); break;
                case 'KeyE': if (st.phase === 'explore' && st.nearTable) st.openTable(); break;
            }

            if (e.code === 'Unidentified' || e.code === '') {
                if (k === 'w') setMovement(m => ({ ...m, forward: true }));
                if (k === 's') setMovement(m => ({ ...m, backward: true }));
                if (k === 'a') setMovement(m => ({ ...m, left: true }));
                if (k === 'd') setMovement(m => ({ ...m, right: true }));
                if (k === ' ' || k === 'spacebar') setMovement(m => ({ ...m, jump: true }));
                if (k === 'e' && st.phase === 'explore' && st.nearTable) st.openTable();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const k = (typeof e.key === 'string') ? e.key.toLowerCase() : '';
            switch (e.code) {
                case 'KeyW': setMovement(m => ({ ...m, forward: false })); break;
                case 'KeyS': setMovement(m => ({ ...m, backward: false })); break;
                case 'KeyA': setMovement(m => ({ ...m, left: false })); break;
                case 'KeyD': setMovement(m => ({ ...m, right: false })); break;
                case 'Space': setMovement(m => ({ ...m, jump: false })); break;
            }

            if (e.code === 'Unidentified' || e.code === '') {
                if (k === 'w') setMovement(m => ({ ...m, forward: false }));
                if (k === 's') setMovement(m => ({ ...m, backward: false }));
                if (k === 'a') setMovement(m => ({ ...m, left: false }));
                if (k === 'd') setMovement(m => ({ ...m, right: false }));
                if (k === ' ' || k === 'spacebar') setMovement(m => ({ ...m, jump: false }));
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    return (
        <group>
            <RigidBody
                ref={bodyRef}
                colliders={false}
                mass={1}
                type="dynamic"
                position={[0, 2, 0]}
                enabledRotations={[false, false, false]}
                lockRotations
            >
                <CapsuleCollider args={[0.75, 0.5]} />
            </RigidBody>
            <PlayerController
                rigidBodyRef={bodyRef}
                movement={movement}
                holding={holding}
                setHolding={setHolding}
            />
        </group>
    );
}

function PlayerController({
    rigidBodyRef,
    movement,
    holding,
    setHolding
}: {
    rigidBodyRef: RefObject<RapierRigidBody | null>,
    movement: Movement,
    holding: RapierRigidBody | null,
    setHolding: (b: RapierRigidBody | null) => void
}) {
    const { rapier, world } = useRapier();
    const { camera } = useThree();
    const locked = useRef(false);
    const phase = useStore(state => state.phase);

    // Interaction Click Handler
    useEffect(() => {
        const onMouseDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            // Don't steal clicks from HUD buttons (mobile / unlocked-cursor play).
            if (target && target.closest('[data-ui="true"]')) return;
            if (!locked.current) {
                // Re-acquire pointer lock on click.
                document.body.requestPointerLock();
                return;
            }
            const st = useStore.getState();
            if (st.phase === 'table' || st.phase === 'dead') return;
            if (e.button === 0) { // Left Click
                if (holding) {
                    // Drop
                    holding.setBodyType(rapier.RigidBodyType.Dynamic, true);
                    holding.wakeUp();
                    // Add a little throw force
                    const forward = new ONE.Vector3(0, 0, -1).applyEuler(camera.rotation).normalize();
                    holding.applyImpulse(forward.multiplyScalar(2), true);
                    setHolding(null);
                } else {
                    // Try Pickup
                    const origin = camera.position;
                    const direction = new ONE.Vector3(0, 0, -1).applyEuler(camera.rotation);
                    const ray = new rapier.Ray(origin, direction);
                    // Cast ray
                    const hit = world.castRay(ray, INTERACTION_DISTANCE, true);
                    if (hit && hit.collider) {
                        const body = hit.collider.parent();
                        const ud = body?.userData as { interactable?: boolean } | undefined;
                        if (body && ud?.interactable) {
                            body.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true);
                            setHolding(body);
                        }
                    }
                }
            }
        };
        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, [holding, camera, rapier, world, setHolding]);

    useEffect(() => {
        const onLock = () => { locked.current = true; };
        const onUnlock = () => { locked.current = false; };
        const onPointerLockChange = () => {
            if (document.pointerLockElement) onLock();
            else onUnlock();
        };
        document.addEventListener('pointerlockchange', onPointerLockChange);
        return () => {
            document.removeEventListener('pointerlockchange', onPointerLockChange);
        };
    }, []);

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!locked.current) return;
            camera.rotation.order = 'YXZ';
            camera.rotation.y -= e.movementX * 0.002;
            camera.rotation.x -= e.movementY * 0.002;
            camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
        };
        document.addEventListener('mousemove', onMouseMove);
        return () => document.removeEventListener('mousemove', onMouseMove);
    }, [camera]);

    useFrame(() => {
        if (!rigidBodyRef.current) return;

        // Sync camera position to body
        const pos = rigidBodyRef.current.translation();
        camera.position.set(pos.x, pos.y + 0.75, pos.z);

        // Freeze player during table/death UI.
        if (phase === 'table' || phase === 'dead') {
            const velocity = rigidBodyRef.current.linvel();
            rigidBodyRef.current.setLinvel({ x: 0, y: velocity.y, z: 0 }, true);
            return;
        }

        // Update Holding Item Position
        if (holding) {
            const holdPos = new ONE.Vector3(0, 0, -1.5).applyEuler(camera.rotation).add(camera.position);
            holding.setNextKinematicTranslation(holdPos);
            holding.setNextKinematicRotation(camera.quaternion);
        }

        // Movement logic
        const front = new ONE.Vector3(0, 0, -1).applyEuler(camera.rotation);
        const side = new ONE.Vector3(1, 0, 0).applyEuler(camera.rotation);

        // flattened direction
        front.y = 0; front.normalize();
        side.y = 0; side.normalize();

        const direction = new ONE.Vector3();
        if (movement.forward) direction.add(front);
        if (movement.backward) direction.sub(front);
        if (movement.left) direction.sub(side);
        if (movement.right) direction.add(side);

        if (direction.lengthSq() > 0) {
            direction.normalize().multiplyScalar(SPEED);
        }

        const velocity = rigidBodyRef.current.linvel();
        rigidBodyRef.current.setLinvel({ x: direction.x, y: velocity.y, z: direction.z }, true);

        if (movement.jump && Math.abs(velocity.y) < 0.1) {
            rigidBodyRef.current.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
        }
    });

    return null;
}
