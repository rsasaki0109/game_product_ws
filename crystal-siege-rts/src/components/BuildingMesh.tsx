import type { BuildingInstance } from '../types/game.ts'
import { useGameStore } from '../store/gameStore.ts'

export default function BuildingMesh({ building }: { building: BuildingInstance }) {
  const selectedUid = useGameStore(s => s.selectedBuildingUid)
  const isSelected = selectedUid === building.uid
  const s = building.def.size
  const height = building.def.type === 'tower' ? s * 2 : s

  return (
    <group position={[building.position[0], 0, building.position[1]]}>
      {/* Main body */}
      <mesh
        castShadow
        position={[0, height / 2, 0]}
        userData={{ type: 'building', uid: building.uid, owner: building.owner }}
      >
        <boxGeometry args={[s * 1.4, height, s * 1.4]} />
        <meshStandardMaterial
          color={building.def.color}
          wireframe={!building.isBuilt}
          transparent={!building.isBuilt}
          opacity={building.isBuilt ? 1 : 0.6}
        />
      </mesh>
      {/* Tower top */}
      {building.def.type === 'tower' && building.isBuilt && (
        <mesh position={[0, height + 0.4, 0]}>
          <coneGeometry args={[0.6, 0.8, 8]} />
          <meshStandardMaterial color="#b91c1c" />
        </mesh>
      )}
      {/* Build progress bar */}
      {!building.isBuilt && (
        <mesh position={[0, height + 0.5, 0]}>
          <planeGeometry args={[s * 1.4, 0.15]} />
          <meshBasicMaterial color="#333" />
        </mesh>
      )}
      {!building.isBuilt && (
        <mesh position={[-(1 - building.buildProgress) * s * 0.7, height + 0.5, 0.001]}>
          <planeGeometry args={[Math.max(0.01, building.buildProgress * s * 1.38), 0.12]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
      )}
      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[s, s + 0.3]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  )
}
