import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, useRapier, RapierRigidBody } from '@react-three/rapier';
import { useRef, useEffect, useState } from 'react';
import * as ONE from 'three';

const SPEED = 5;
const JUMP_FORCE = 4;
const INTERACTION_DISTANCE = 3;

export function Player() {
    const { rapier, world } = useRapier();
    const rigidBodyRef = useRef<RapierRigidBody>(null);

    // Input State
    const [movement, setMovement] = useState({ forward: false, backward: false, left: false, right: false, jump: false });
    const [holding, setHolding] = useState<RapierRigidBody | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.code) {
                case 'KeyW': setMovement(m => ({ ...m, forward: true })); break;
                case 'KeyS': setMovement(m => ({ ...m, backward: true })); break;
                case 'KeyA': setMovement(m => ({ ...m, left: true })); break;
                case 'KeyD': setMovement(m => ({ ...m, right: true })); break;
                case 'Space': setMovement(m => ({ ...m, jump: true })); break;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            switch (e.code) {
                case 'KeyW': setMovement(m => ({ ...m, forward: false })); break;
                case 'KeyS': setMovement(m => ({ ...m, backward: false })); break;
                case 'KeyA': setMovement(m => ({ ...m, left: false })); break;
                case 'KeyD': setMovement(m => ({ ...m, right: false })); break;
                case 'Space': setMovement(m => ({ ...m, jump: false })); break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        // Pointer Lock
        const handleClick = () => {
            document.body.requestPointerLock();
        };
        // We attach click listener for Interaction in PlayerController or here?
        // Let's do it in PlayerController to access camera easily or pass a ref. 
        // Actually, we can do it here if we have access to camera, but specific click logic is better in the component that handles the loop.
        document.addEventListener('click', handleClick);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            document.removeEventListener('click', handleClick);
        };
    }, []);

    return (
        <group>
            <RigidBody
                ref={rigidBodyRef}
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
                rigidBodyRef={rigidBodyRef}
                movement={movement}
                world={world}
                rapier={rapier}
                holding={holding}
                setHolding={setHolding}
            />
        </group>
    );
}

function PlayerController({
    rigidBodyRef,
    movement,
    world,
    rapier,
    holding,
    setHolding
}: {
    rigidBodyRef: any,
    movement: any,
    world: any,
    rapier: any,
    holding: RapierRigidBody | null,
    setHolding: (b: RapierRigidBody | null) => void
}) {
    const { camera } = useThree();
    const locked = useRef(false);

    // Interaction Click Handler
    useEffect(() => {
        const onMouseDown = (e: MouseEvent) => {
            if (!locked.current) return;
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
                        if (body && body.userData && (body.userData as any).interactable) {
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
