import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/gameStore.ts'

export default function CameraRig() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const store = useGameStore.getState()
      if (e.code === 'Escape') {
        store.togglePause()
        return
      }
      if (store.phase !== 'playing' || store.paused) return

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          store.selectLane(store.selectedLane - 1)
          break
        case 'ArrowRight':
        case 'KeyD':
          store.selectLane(store.selectedLane + 1)
          break
        case 'KeyQ':
        case 'Digit1':
          store.doAction('serve_burger')
          break
        case 'KeyW':
        case 'Digit2':
          store.doAction('serve_fries')
          break
        case 'KeyE':
        case 'Digit3':
          store.doAction('serve_drink')
          break
        case 'KeyR':
        case 'Digit4':
          store.doAction('serve_combo')
          break
        case 'Space':
          store.doAction('punch')
          break
        case 'KeyF':
        case 'Digit5':
          store.doAction('bazooka')
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useFrame((state, delta) => {
    const store = useGameStore.getState()
    const cam = state.camera

    if (store.phase === 'title') {
      // Slow auto-rotation for title screen
      const t = state.clock.elapsedTime * 0.12
      cam.position.set(Math.sin(t) * 8, 6, Math.cos(t) * 4 - 3)
      cam.lookAt(0, 1.5, 5)
      return
    }

    const effectiveDelta = store.phase === ('game_over_transition' as string) ? delta * 0.25 : delta
    store.tick(effectiveDelta)

    // Camera position
    let cx = 0, cy = 6, cz = -3
    if (store.cameraShakeTimer > 0) {
      cx += (Math.random() - 0.5) * 0.2
      cy += (Math.random() - 0.5) * 0.2
    }

    // Warm light pulse when combo > 3
    cam.position.set(cx, cy, cz)
    cam.lookAt(0, 1.5, 5)
  })

  return null
}
