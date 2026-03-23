import { useGameStore } from '../store/gameStore.ts'
import BuildingMesh from './BuildingMesh.tsx'

export default function BuildingRenderer() {
  const buildings = useGameStore(s => s.buildings)
  return (
    <>
      {buildings.map(b => <BuildingMesh key={b.uid} building={b} />)}
    </>
  )
}
