import { RigidBody } from '@react-three/rapier';
import { useStore } from '../store';
import { HauntSystem } from './HauntSystem';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function GameScene() {
    const hauntIntensity = useStore(state => state.hauntIntensity);
    const pointLightRef = useRef<THREE.PointLight>(null);

    useFrame(() => {
        if (pointLightRef.current) {
            if (hauntIntensity > 0) {
                // Flicker
                pointLightRef.current.intensity = Math.random() * 2;
                pointLightRef.current.color.setHSL(Math.random(), 1, 0.5);
            } else {
                // Reset
                pointLightRef.current.intensity = THREE.MathUtils.lerp(pointLightRef.current.intensity, 0.5, 0.1);
                pointLightRef.current.color.setHex(0xffffff);
            }
        }
    });

    return (
        <>
            <HauntSystem />
            <ambientLight intensity={0.3} />
            <pointLight ref={pointLightRef} position={[10, 10, 10]} castShadow intensity={0.5} />
            <directionalLight position={[-5, 5, 5]} castShadow intensity={0.5} />

            {/* Floor */}
            <RigidBody type="fixed" friction={1}>
                <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[50, 50]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
            </RigidBody>

            {/* Walls (Simple Box Room) */}
            <RigidBody type="fixed">
                <mesh position={[0, 2.5, -10]} receiveShadow>
                    <boxGeometry args={[20, 5, 1]} />
                    <meshStandardMaterial color="#555" />
                </mesh>
                <mesh position={[0, 2.5, 10]} receiveShadow>
                    <boxGeometry args={[20, 5, 1]} />
                    <meshStandardMaterial color="#555" />
                </mesh>
                <mesh position={[-10, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                    <boxGeometry args={[20, 5, 1]} />
                    <meshStandardMaterial color="#555" />
                </mesh>
                <mesh position={[10, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                    <boxGeometry args={[20, 5, 1]} />
                    <meshStandardMaterial color="#555" />
                </mesh>
            </RigidBody>

            {/* Tables/Counters */}
            <RigidBody type="fixed">
                <mesh position={[0, 1, -8]} castShadow receiveShadow>
                    <boxGeometry args={[4, 2, 2]} />
                    <meshStandardMaterial color="#8B4513" />
                </mesh>
            </RigidBody>

            {/* Interactable Items */}
            <RigidBody type="dynamic" position={[0, 3, -8]} userData={{ interactable: true }} colliders="cuboid">
                <mesh castShadow>
                    <boxGeometry args={[0.5, 0.5, 0.5]} />
                    <meshStandardMaterial color="red" />
                </mesh>
            </RigidBody>
            <RigidBody type="dynamic" position={[1, 3, -8]} userData={{ interactable: true }} colliders="cuboid">
                <mesh castShadow>
                    <boxGeometry args={[0.5, 0.5, 0.5]} />
                    <meshStandardMaterial color="green" />
                </mesh>
            </RigidBody>
        </>
    );
}
