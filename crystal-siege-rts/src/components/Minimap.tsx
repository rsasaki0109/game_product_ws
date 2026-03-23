import { useRef, useEffect, useCallback } from 'react'
import { useGameStore } from '../store/gameStore.ts'

const MAP_SIZE = 60
const CANVAS_SIZE = 150
const SCALE = CANVAS_SIZE / MAP_SIZE // 2.5

function worldToMinimap(x: number, z: number): [number, number] {
  return [x * SCALE, z * SCALE]
}

export default function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let animId = 0
    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) { animId = requestAnimationFrame(draw); return }
      const ctx = canvas.getContext('2d')
      if (!ctx) { animId = requestAnimationFrame(draw); return }

      const store = useGameStore.getState()

      // Clear - dark green background
      ctx.fillStyle = 'rgba(15, 35, 15, 0.9)'
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

      // Crystal nodes as cyan dots
      for (const node of store.crystalNodes) {
        if (node.remaining <= 0) continue
        const [mx, mz] = worldToMinimap(node.position[0], node.position[1])
        ctx.fillStyle = '#06b6d4'
        ctx.beginPath()
        ctx.arc(mx, mz, 3, 0, Math.PI * 2)
        ctx.fill()
      }

      // Player buildings as green squares
      for (const b of store.buildings) {
        const [mx, mz] = worldToMinimap(b.position[0], b.position[1])
        ctx.fillStyle = b.owner === 'player' ? '#22c55e' : '#ef4444'
        const s = b.def.type === 'hq' ? 5 : 3
        ctx.fillRect(mx - s / 2, mz - s / 2, s, s)
      }

      // Units as dots
      for (const u of store.units) {
        const [mx, mz] = worldToMinimap(u.position[0], u.position[1])
        ctx.fillStyle = u.owner === 'player' ? '#22c55e' : '#ef4444'
        ctx.beginPath()
        ctx.arc(mx, mz, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }

      // Camera viewport rectangle as white outline
      const cx = store.cameraCenter[0]
      const cz = store.cameraCenter[1]
      const halfW = store.cameraZoom * 0.8
      const halfH = store.cameraZoom * 0.5
      const [vx, vz] = worldToMinimap(cx - halfW, cz - halfH)
      const vw = halfW * 2 * SCALE
      const vh = halfH * 2 * SCALE
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.lineWidth = 1
      ctx.strokeRect(vx, vz, vw, vh)

      animId = requestAnimationFrame(draw)
    }
    animId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animId)
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const mz = e.clientY - rect.top
    const worldX = (mx / CANVAS_SIZE) * MAP_SIZE
    const worldZ = (mz / CANVAS_SIZE) * MAP_SIZE
    const store = useGameStore.getState()
    store.panCamera(worldX - store.cameraCenter[0], worldZ - store.cameraCenter[1])
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="minimap"
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      onClick={handleClick}
    />
  )
}
