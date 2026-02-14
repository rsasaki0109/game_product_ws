import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense } from 'react';
import { GameScene } from './components/GameScene';
import { Player } from './components/Player';
import { HUD } from './components/HUD';
import { useEffect, useRef } from 'react';
import type { RapierRigidBody } from '@react-three/rapier';
import { useStore } from './store';

function App() {
  const playerBodyRef = useRef<RapierRigidBody | null>(null);
  const restartId = useStore((s) => s.restartId);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const capture = params.get('capture');
    if (!capture) return;

    // Reset to a known baseline without bumping restartId (keeps the scene stable).
    useStore.setState({
      phase: 'explore',
      chips: 10,
      nearTable: false,
      hauntIntensity: 0,
      hauntEndsAt: null,
      hauntRemaining: 0,
      deathReason: '',
      blackjack: {
        status: 'idle',
        bet: 0,
        player: [],
        dealer: [],
        outcome: null,
        message: 'テーブルの近くで E: 着席',
      },
    });

    const now = performance.now() / 1000;

    const st = useStore.getState();
    const teleport = (x: number, y: number, z: number) => {
      let tries = 0;
      const tick = () => {
        const rb = playerBodyRef.current;
        if (rb) {
          rb.setTranslation({ x, y, z }, true);
          rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
          rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
          return;
        }
        tries++;
        if (tries < 60) window.requestAnimationFrame(tick);
      };
      tick();
    };

    switch (capture) {
      case 'explore': {
        // Avoid auto-picking the center chip spawn so the screenshot stays stable.
        teleport(0, 2, -2);
        break;
      }
      case 'near-table': {
        teleport(0, 2, -6.2);
        // Force prompt on for capture; the proximity system may override in real gameplay.
        useStore.setState({ nearTable: true });
        break;
      }
      case 'table-idle': {
        teleport(0, 2, -6.2);
        st.openTable();
        break;
      }
      case 'table-playing': {
        teleport(0, 2, -6.2);
        useStore.setState({
          phase: 'table',
          chips: 0,
          blackjack: {
            status: 'playing',
            bet: 10,
            player: [{ rank: '10', value: 10 }, { rank: '6', value: 6 }],
            dealer: [{ rank: '9', value: 9 }, { rank: '7', value: 7 }],
            outcome: null,
            message: 'あなた: 10 6 (16) / ディーラー: 9 ?',
          },
        });
        break;
      }
      case 'table-lose': {
        teleport(0, 2, -6.2);
        useStore.setState({
          phase: 'table',
          chips: 0,
          blackjack: {
            status: 'resolved',
            bet: 10,
            player: [{ rank: '10', value: 10 }, { rank: '8', value: 8 }],
            dealer: [{ rank: '9', value: 9 }, { rank: 'K', value: 10 }],
            outcome: 'lose',
            message: '負け！ あなた: 10 8 (18) / ディーラー: 9 K (19)',
          },
        });
        break;
      }
      case 'haunt-chase': {
        teleport(0, 2, -2);
        useStore.setState({
          phase: 'haunt',
          hauntIntensity: 1,
          hauntEndsAt: now + 9.9,
          hauntRemaining: 9.9,
        });
        break;
      }
      case 'haunt-safezone': {
        teleport(0, 2, 9.0);
        useStore.setState({
          phase: 'haunt',
          hauntIntensity: 1,
          hauntEndsAt: now + 9.9,
          hauntRemaining: 9.9,
        });
        break;
      }
      case 'dead': {
        teleport(0, 2, -2);
        st.die('捕まった');
        break;
      }
      default:
        break;
    }
  }, []);

  return (
    <>
      <HUD />
      <div className="reticle" />

      <Canvas shadows camera={{ fov: 75 }}>
        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]}>
            <Player key={restartId} bodyRef={playerBodyRef} />
            <GameScene key={restartId} playerBodyRef={playerBodyRef} />
          </Physics>
        </Suspense>
      </Canvas>
    </>
  );
}

export default App;
