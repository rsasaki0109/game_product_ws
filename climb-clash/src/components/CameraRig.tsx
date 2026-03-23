import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/gameStore.ts'

export default function CameraRig() {
  useFrame((state, delta) => {
    const store = useGameStore.getState()
    const cam = state.camera

    if (store.phase === 'title') {
      const t = state.clock.elapsedTime * 0.12
      cam.position.set(Math.sin(t) * 12, 14, Math.cos(t) * 8 + 16)
      cam.lookAt(0, 14, 0)
      return
    }

    if (!store.paused && !store.showTutorial) {
      store.tick(delta)
    }

    const playerY = store.player.position[1]
    const aiY = store.ai.position[1]
    const targetY = Math.max(playerY, aiY) + 5

    cam.position.x += (0 - cam.position.x) * 0.05
    cam.position.y += (targetY - cam.position.y) * 0.05
    cam.position.z = 20

    cam.lookAt(0, cam.position.y, 0)
  })

  return null
}
