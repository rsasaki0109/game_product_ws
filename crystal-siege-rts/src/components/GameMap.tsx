export default function GameMap() {
  return (
    <>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[30, 0, 30]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#4a7c3f" />
      </mesh>
      <gridHelper args={[60, 30, '#3d6b34', '#3d6b34']} position={[30, 0.01, 30]} />
    </>
  )
}
