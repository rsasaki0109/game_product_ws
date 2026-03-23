import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/gameStore.ts'
import type { Vec3 } from '../types/game.ts'

const keys: Record<string, boolean> = {}

export default function CameraRig() {
  const { camera, gl } = useThree()
  const yawRef = useRef(0)
  const pitchRef = useRef(0.3)
  const raycaster = useRef(new THREE.Raycaster())
  const pointerLockFailed = useRef(false)
  const lastMouseX = useRef(0)
  const lastMouseY = useRef(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      keys[e.code] = down
      if (down && e.code === 'Escape') {
        useGameStore.getState().togglePause()
        if (document.pointerLockElement) {
          document.exitPointerLock()
        }
        return
      }
      if (down && e.code === 'Space') {
        const s = useGameStore.getState()
        const mx = (keys['KeyA'] ? -1 : 0) + (keys['KeyD'] ? 1 : 0)
        const mz = (keys['KeyW'] ? -1 : 0) + (keys['KeyS'] ? 1 : 0)
        const yaw = yawRef.current
        const cosY = Math.cos(yaw), sinY = Math.sin(yaw)
        s.triggerDash([mx * cosY + mz * sinY, 0, -mx * sinY + mz * cosY])
      }
    }
    const onKeyDown = (e: KeyboardEvent) => onKey(e, true)
    const onKeyUp = (e: KeyboardEvent) => onKey(e, false)

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        const s = useGameStore.getState()
        const aimDir: Vec3 = [
          Math.sin(yawRef.current), 0, Math.cos(yawRef.current),
        ]
        s.fireQuickShot(aimDir)
      }
      if (e.button === 2) {
        useGameStore.getState().setRightMouse(true)
      }
    }
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        useGameStore.getState().setRightMouse(false)
      }
    }
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        yawRef.current -= e.movementX * 0.003
        pitchRef.current = Math.max(-0.5, Math.min(1.0, pitchRef.current + e.movementY * 0.002))
        useGameStore.getState().setCameraYaw(yawRef.current)
      } else if (pointerLockFailed.current) {
        // Fallback: use absolute mouse position for yaw/pitch
        const rect = gl.domElement.getBoundingClientRect()
        const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2
        const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2
        yawRef.current = -nx * Math.PI * 0.5
        pitchRef.current = Math.max(-0.5, Math.min(1.0, 0.3 + ny * 0.4))
        useGameStore.getState().setCameraYaw(yawRef.current)
        lastMouseX.current = e.clientX
        lastMouseY.current = e.clientY
      }
    }
    const onClick = () => {
      try {
        gl.domElement.requestPointerLock()
      } catch {
        pointerLockFailed.current = true
      }
    }
    const onPointerLockError = () => {
      pointerLockFailed.current = true
    }
    const onContext = (e: Event) => e.preventDefault()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    gl.domElement.addEventListener('mousedown', onMouseDown)
    gl.domElement.addEventListener('mouseup', onMouseUp)
    gl.domElement.addEventListener('mousemove', onMouseMove)
    gl.domElement.addEventListener('click', onClick)
    gl.domElement.addEventListener('contextmenu', onContext)
    document.addEventListener('pointerlockerror', onPointerLockError)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      gl.domElement.removeEventListener('mousedown', onMouseDown)
      gl.domElement.removeEventListener('mouseup', onMouseUp)
      gl.domElement.removeEventListener('mousemove', onMouseMove)
      gl.domElement.removeEventListener('click', onClick)
      gl.domElement.removeEventListener('contextmenu', onContext)
      document.removeEventListener('pointerlockerror', onPointerLockError)
    }
  }, [gl])

  useFrame((state, delta) => {
    const store = useGameStore.getState()

    if (store.phase === 'title') {
      const t = state.clock.elapsedTime * 0.15
      const cam = state.camera
      cam.position.set(Math.sin(t) * 18, 10, Math.cos(t) * 18)
      cam.lookAt(0, 1, 0)
      return
    }

    const effectiveDelta = store.phase === ('game_over_transition' as string) ? delta * 0.25 : delta
    store.tick(effectiveDelta, keys)

    const p = store.player.position
    const yaw = yawRef.current
    const pitch = pitchRef.current
    const dist = 12
    const camX = p[0] - Math.sin(yaw) * dist * Math.cos(pitch)
    const camY = p[1] + 4 + dist * Math.sin(pitch)
    const camZ = p[2] - Math.cos(yaw) * dist * Math.cos(pitch)

    camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.1)
    camera.lookAt(p[0], p[1] + 1, p[2])

    // Raycast crosshair to world (center of screen)
    raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1)
    const target = new THREE.Vector3()
    raycaster.current.ray.intersectPlane(plane, target)
    if (target) {
      store.setCrosshairWorldPos([target.x, target.y, target.z])
    }
  })

  return null
}
