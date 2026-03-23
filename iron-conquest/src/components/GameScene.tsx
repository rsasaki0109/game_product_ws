import { Canvas } from '@react-three/fiber'
import CameraController from './CameraController.tsx'
import GameMap from './GameMap.tsx'
import UnitRenderer from './UnitRenderer.tsx'
import BuildingRenderer from './BuildingRenderer.tsx'
import IronNodeRenderer from './IronNodeRenderer.tsx'
import SelectionHandler from './SelectionHandler.tsx'
import BuildGhost from './BuildGhost.tsx'
import MoveMarker from './MoveMarker.tsx'

export default function GameScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [15, 35, 32], fov: 50 }}
      onContextMenu={(e) => e.preventDefault()}
      style={{ width: '100%', height: '100%' }}
    >
      <CameraController />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[50, 40, 50]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <GameMap />
      <IronNodeRenderer />
      <BuildingRenderer />
      <UnitRenderer />
      <BuildGhost />
      <SelectionHandler />
      <MoveMarker />
    </Canvas>
  )
}
