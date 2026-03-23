import { useRef, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Mesh } from 'three'
import { useGameStore } from '../store/gameStore.ts'
import { getBuildingDef } from '../data/buildings.ts'

export default function BuildGhost() {
  const buildMode = useGameStore(s => s.buildMode)
  const meshRef = useRef<Mesh>(null!)
  const [ghostPos, setGhostPos] = useState<[number, number, number]>([30, 0, 30])
  const { camera, gl } = useThree()

  const updateGhostPos = useCallback((e: PointerEvent) => {
    const rect = gl.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const target = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, target)
    if (target) {
      setGhostPos([target.x, 0, target.z])
    }
  }, [camera, gl])

  useFrame(() => {
    if (!buildMode) return
    gl.domElement.onpointermove = buildMode ? updateGhostPos : null
  })

  if (!buildMode) return null

  const def = getBuildingDef(buildMode)
  const size = def.size
  const height = buildMode === 'tower' ? size * 2 : size

  return (
    <mesh
      ref={meshRef}
      position={[ghostPos[0], height / 2, ghostPos[2]]}
    >
      <boxGeometry args={[size * 1.4, height, size * 1.4]} />
      <meshStandardMaterial color={def.color} transparent opacity={0.4} />
    </mesh>
  )
}
