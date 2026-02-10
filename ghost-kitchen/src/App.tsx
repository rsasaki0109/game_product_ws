import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense } from 'react';
import { GameScene } from './components/GameScene';
import { Player } from './components/Player';

function App() {
  return (
    <>
      <div className="ui-layer">
        <h1>Ghost Kitchen</h1>
        <p>WASD to Move | Click to Lock Cursor</p>
      </div>
      <div className="reticle" />

      <Canvas shadows camera={{ fov: 75 }}>
        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]}>
            <Player />
            <GameScene />
          </Physics>
        </Suspense>
      </Canvas>
    </>
  );
}

export default App;
