import { useGameStore } from '../store/gameStore.ts'
import CustomerMesh from './CustomerMesh.tsx'

export default function CustomerRenderer() {
  const customers = useGameStore(s => s.customers)
  return (
    <>
      {customers.map(c => <CustomerMesh key={c.uid} customer={c} />)}
    </>
  )
}
