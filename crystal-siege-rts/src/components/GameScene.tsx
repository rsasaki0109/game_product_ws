import { Canvas } from '@react-three/fiber'
import CameraController from './CameraController.tsx'
import GameMap from './GameMap.tsx'
import UnitRenderer from './UnitRenderer.tsx'
import BuildingRenderer from './BuildingRenderer.tsx'
import CrystalNodeRenderer from './CrystalNodeRenderer.tsx'
import SelectionHandler from './SelectionHandler.tsx'
import BuildGhost from './BuildGhost.tsx'
import MoveMarker from './MoveMarker.tsx'

export default function GameScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [30, 35, 47], fov: 50 }}
      onContextMenu={(e) => e.preventDefault()}
      style={{ width: '100%', height: '100%' }}
    >
      <CameraController />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[40, 30, 40]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <GameMap />
      <CrystalNodeRenderer />
      <BuildingRenderer />
      <UnitRenderer />
      <BuildGhost />
      <SelectionHandler />
      <MoveMarker />
    </Canvas>
  )
}
