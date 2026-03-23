import { useFrame, useThree } from '@react-three/fiber'
import { useGameStore } from '../store/gameStore.ts'

const keys: Record<string, boolean> = {}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => { keys[e.code] = true })
  window.addEventListener('keyup', (e) => { keys[e.code] = false })
  window.addEventListener('wheel', (e) => {
    useGameStore.getState().zoomCamera(e.deltaY * 0.02)
  }, { passive: true })
}

export default function CameraController() {
  const { camera } = useThree()

  useFrame((state, delta) => {
    const store = useGameStore.getState()

    if (store.phase === 'title') {
      const t = state.clock.elapsedTime * 0.1
      camera.position.set(30 + Math.sin(t) * 15, 35, 30 + Math.cos(t) * 15 + 17)
      camera.lookAt(30, 0, 30)
      return
    }

    store.tick(delta)

    // R: quick restart
    if (keys['KeyR']) {
      keys['KeyR'] = false
      if (store.phase === 'game_over' || store.phase === 'victory') {
        store.startGame()
        return
      }
    }

    // Escape: toggle pause (or cancel build mode)
    if (keys['Escape']) {
      keys['Escape'] = false
      if (store.buildMode) {
        store.cancelBuildMode()
      } else {
        store.togglePause()
      }
    }

    // Don't process gameplay keys while paused
    if (store.paused) {
      // Still update camera position
      const center = store.cameraCenter
      const zoom = store.cameraZoom
      camera.position.set(center[0], zoom, center[1] + zoom * 0.5)
      camera.lookAt(center[0], 0, center[1])
      return
    }

    // WASD camera pan
    const panSpeed = 20 * delta
    let dx = 0, dz = 0
    if (keys['KeyW'] || keys['ArrowUp']) dz -= panSpeed
    if (keys['KeyS'] || keys['ArrowDown']) dz += panSpeed
    if (keys['KeyA'] || keys['ArrowLeft']) dx -= panSpeed
    if (keys['KeyD'] || keys['ArrowRight']) dx += panSpeed
    if (dx !== 0 || dz !== 0) store.panCamera(dx, dz)

    // Build mode shortcut
    if (keys['KeyB']) {
      keys['KeyB'] = false
      if (!store.buildMode) store.enterBuildMode('barracks')
    }

    // Train shortcuts
    const selectedBldg = store.selectedBuildingUid !== null
      ? store.buildings.find(b => b.uid === store.selectedBuildingUid)
      : null
    if (selectedBldg && selectedBldg.isBuilt) {
      if (keys['Digit1']) { keys['Digit1'] = false; store.trainUnit(selectedBldg.uid, selectedBldg.def.type === 'hq' ? 'worker' : 'soldier') }
      if (keys['Digit2']) { keys['Digit2'] = false; store.trainUnit(selectedBldg.uid, 'soldier') }
      if (keys['Digit3']) { keys['Digit3'] = false; store.trainUnit(selectedBldg.uid, 'archer') }
      if (keys['Digit4']) { keys['Digit4'] = false; store.trainUnit(selectedBldg.uid, 'knight') }
    }

    // Update camera position
    const center = store.cameraCenter
    const zoom = store.cameraZoom
    camera.position.set(center[0], zoom, center[1] + zoom * 0.5)
    camera.lookAt(center[0], 0, center[1])
  })

  return null
}
