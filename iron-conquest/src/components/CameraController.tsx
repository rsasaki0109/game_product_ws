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
      camera.position.set(40 + Math.sin(t) * 20, 35, 40 + Math.cos(t) * 20 + 17)
      camera.lookAt(40, 0, 40)
      return
    }

    store.tick(delta)

    // R: quick restart
    if (keys['KeyR']) {
      keys['KeyR'] = false
      if (store.phase === 'victory' || store.phase === 'defeat') {
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

    // Build mode shortcuts
    // (no single key shortcut for iron-conquest, uses HUD buttons)

    // Train shortcuts
    const selectedBldg = store.selectedBuildingUid !== null
      ? store.buildings.find(b => b.uid === store.selectedBuildingUid)
      : null
    if (selectedBldg && selectedBldg.isBuilt && selectedBldg.owner === 'player') {
      if (keys['Digit1']) {
        keys['Digit1'] = false
        if (selectedBldg.def.type === 'hq') store.trainUnit(selectedBldg.uid, 'worker')
        else if (selectedBldg.def.type === 'barracks') store.trainUnit(selectedBldg.uid, 'militia')
        else if (selectedBldg.def.type === 'factory') store.trainUnit(selectedBldg.uid, 'tank')
      }
      if (keys['Digit2']) {
        keys['Digit2'] = false
        if (selectedBldg.def.type === 'barracks') store.trainUnit(selectedBldg.uid, 'ranger')
        else if (selectedBldg.def.type === 'factory') store.trainUnit(selectedBldg.uid, 'artillery')
      }
    }

    // Update camera position
    const center = store.cameraCenter
    const zoom = store.cameraZoom
    camera.position.set(center[0], zoom, center[1] + zoom * 0.5)
    camera.lookAt(center[0], 0, center[1])
  })

  return null
}
