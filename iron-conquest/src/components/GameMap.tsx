export default function GameMap() {
  return (
    <>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[40, 0, 40]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#4a7c3f" />
      </mesh>
      <gridHelper args={[80, 40, '#3d6b34', '#3d6b34']} position={[40, 0.01, 40]} />
    </>
  )
}
