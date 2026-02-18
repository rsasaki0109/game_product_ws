import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Component, Suspense, type ReactElement, type ReactNode } from 'react';
import { GameScene } from './components/GameScene';
import { Player } from './components/Player';
import { HUD } from './components/HUD';
import { ThreeLabScene } from './components/ThreeLabScene';
import { ThreeFPSGame } from './components/ThreeFPSGame';
import { ThreeCollapseRace } from './components/ThreeCollapseRace';
import { ThreeGravityBearMode } from './components/ThreeGravityBearMode';
import { ThreeTokyoCity } from './components/ThreeTokyoCity.tsx';
import { useEffect, useRef } from 'react';
import type { RapierRigidBody } from '@react-three/rapier';
import { useStore } from './store';

class ModeCrashBoundary extends Component<
  { label: string; children: ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    // Keep diagnostics visible for capture runs / debug in environments with no console output.
    console.error('[ModeCrashBoundary]', this.props.label, error, info.componentStack);
  }

  render() {
    const { hasError, message } = this.state;
    if (hasError) {
      return (
        <div
          style={{
            width: '100vw',
            height: '100vh',
            background: '#0b1020',
            color: 'white',
            padding: '20px',
            fontFamily: 'monospace',
          }}
          onClick={() => {
            this.setState({ hasError: false, message: '' });
          }}
        >
          <h3>モード起動エラー</h3>
          <div>{this.props.label}</div>
          <pre>{message}</pre>
        </div>
      );
    }

    return this.props.children as ReactElement;
  }
}

function GameApp() {
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

function App() {
  const mode = new URLSearchParams(window.location.search).get('mode');
  const hasCapture = new URLSearchParams(window.location.search).has('capture');
  if (hasCapture) return <GameApp />;
  if (mode === 'lab') {
    return <ModeCrashBoundary label="mode=lab"><ThreeLabScene /></ModeCrashBoundary>;
  }
  if (mode === 'fps') {
    return <ModeCrashBoundary label="mode=fps"><ThreeFPSGame /></ModeCrashBoundary>;
  }
  if (mode === 'race') {
    return <ModeCrashBoundary label="mode=race"><ThreeCollapseRace /></ModeCrashBoundary>;
  }
  if (mode === 'gravity') {
    return <ModeCrashBoundary label="mode=gravity"><ThreeGravityBearMode /></ModeCrashBoundary>;
  }
  if (mode === 'tokyo') {
    return <ModeCrashBoundary label="mode=tokyo"><ThreeTokyoCity /></ModeCrashBoundary>;
  }
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(160deg, #0b1020, #09112a, #060f1d)',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1>three.js ミニゲーム選択</h1>
        <p>下からモードを選んで試す</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <a
            href="?mode=fps"
            style={{
              background: '#fff',
              color: '#111',
              textDecoration: 'none',
              padding: '12px 20px',
              borderRadius: 12,
              fontWeight: 700,
            }}
          >
            FPS
          </a>
          <a
            href="?mode=race"
            style={{
              background: '#fff',
              color: '#111',
              textDecoration: 'none',
              padding: '12px 20px',
              borderRadius: 12,
              fontWeight: 700,
            }}
          >
            1分地形崩壊レース
          </a>
          <a
            href="?mode=gravity"
            style={{
              background: '#fff',
              color: '#111',
              textDecoration: 'none',
              padding: '12px 20px',
              borderRadius: 12,
              fontWeight: 700,
            }}
          >
            重力反転（Crystal Bearer風）
          </a>
          <a
            href="?mode=tokyo"
            style={{
              background: '#fff',
              color: '#111',
              textDecoration: 'none',
              padding: '12px 20px',
              borderRadius: 12,
              fontWeight: 700,
            }}
          >
            東京サンドボックス（軽量版）
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;
