import { useGameStore } from '../store/gameStore.ts'
import UnitMesh from './UnitMesh.tsx'

export default function UnitRenderer() {
  const units = useGameStore(s => s.units)
  return (
    <>
      {units.map(u => <UnitMesh key={u.uid} unit={u} />)}
    </>
  )
}
