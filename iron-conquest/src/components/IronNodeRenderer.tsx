import { useGameStore } from '../store/gameStore.ts'
import IronNodeMesh from './IronNodeMesh.tsx'

export default function IronNodeRenderer() {
  const nodes = useGameStore(s => s.ironNodes)
  return (
    <>
      {nodes.map(n => <IronNodeMesh key={n.id} node={n} />)}
    </>
  )
}
