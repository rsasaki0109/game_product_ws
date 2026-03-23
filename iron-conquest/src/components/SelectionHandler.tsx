import { useCallback, useRef, useState } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/gameStore.ts'
import { distance2D } from '../logic/combat.ts'
import type { Vec2 } from '../types/game.ts'

export default function SelectionHandler() {
  const { camera, scene, gl } = useThree()
  const raycaster = useRef(new THREE.Raycaster())
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragRect, setDragRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  const getGroundPos = useCallback((clientX: number, clientY: number): Vec2 | null => {
    const rect = gl.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.current.setFromCamera(mouse, camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const target = new THREE.Vector3()
    raycaster.current.ray.intersectPlane(plane, target)
    if (target) return [target.x, target.z]
    return null
  }, [camera, gl])

  const findHitEntity = useCallback((clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.current.setFromCamera(mouse, camera)
    const intersects = raycaster.current.intersectObjects(scene.children, true)
    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object
      while (obj) {
        if (obj.userData?.type) return obj.userData as { type: string; uid: number; owner: string }
        obj = obj.parent
      }
    }
    return null
  }, [camera, gl, scene])

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (e.button === 0) {
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }, [])

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!dragStart) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      const rect = {
        x: Math.min(dragStart.x, e.clientX),
        y: Math.min(dragStart.y, e.clientY),
        w: Math.abs(dx),
        h: Math.abs(dy),
      }
      setDragRect(rect)
      useGameStore.getState().setDragRect(rect)
    }
  }, [dragStart])

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    const store = useGameStore.getState()

    if (e.button === 0) {
      // Build mode placement
      if (store.buildMode) {
        const pos = getGroundPos(e.clientX, e.clientY)
        if (pos) store.placeBuild(pos)
        setDragStart(null)
        setDragRect(null)
        return
      }

      if (dragRect && dragRect.w > 5 && dragRect.h > 5) {
        // Box select
        const rect = gl.domElement.getBoundingClientRect()
        const selected: number[] = []
        for (const u of store.units) {
          if (u.owner !== 'player') continue
          const pos3 = new THREE.Vector3(u.position[0], u.def.scale * 0.5, u.position[1])
          pos3.project(camera)
          const sx = ((pos3.x + 1) / 2) * rect.width + rect.left
          const sy = ((-pos3.y + 1) / 2) * rect.height + rect.top
          if (sx >= dragRect.x && sx <= dragRect.x + dragRect.w &&
              sy >= dragRect.y && sy <= dragRect.y + dragRect.h) {
            selected.push(u.uid)
          }
        }
        if (selected.length > 0) store.selectUnits(selected)
        else store.clearSelection()
      } else {
        // Click select
        const hit = findHitEntity(e.clientX, e.clientY)
        if (hit?.type === 'unit' && hit.owner === 'player') {
          store.selectUnits([hit.uid])
        } else if (hit?.type === 'building' && hit.owner === 'player') {
          store.selectBuilding(hit.uid)
        } else {
          store.clearSelection()
        }
      }
    }

    setDragStart(null)
    setDragRect(null)
    useGameStore.getState().setDragRect(null)
  }, [dragRect, camera, gl, findHitEntity, getGroundPos])

  const handleContextMenu = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.nativeEvent.preventDefault()
    const store = useGameStore.getState()
    if (store.selectedUnitUids.length === 0) return

    const hit = findHitEntity(e.clientX, e.clientY)
    if (hit?.type === 'unit' && hit.owner === 'enemy') {
      store.commandAttack(hit.uid)
      return
    }
    if (hit?.type === 'building' && hit.owner === 'enemy') {
      store.commandAttack(hit.uid)
      return
    }

    const groundPos = getGroundPos(e.clientX, e.clientY)
    if (groundPos) {
      for (const node of store.ironNodes) {
        if (distance2D(groundPos, node.position) < 2 && node.remaining > 0) {
          store.commandGather(node.id)
          return
        }
      }
      store.commandMove(groundPos)
    }
  }, [findHitEntity, getGroundPos])

  return (
    <mesh
      position={[40, -0.01, 40]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={handleContextMenu}
      visible={false}
    >
      <planeGeometry args={[80, 80]} />
      <meshBasicMaterial />
    </mesh>
  )
}
