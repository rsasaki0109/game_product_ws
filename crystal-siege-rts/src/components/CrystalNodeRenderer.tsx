import { useGameStore } from '../store/gameStore.ts'
import CrystalNodeMesh from './CrystalNodeMesh.tsx'

export default function CrystalNodeRenderer() {
  const nodes = useGameStore(s => s.crystalNodes)
  return (
    <>
      {nodes.map(n => <CrystalNodeMesh key={n.id} node={n} />)}
    </>
  )
}
