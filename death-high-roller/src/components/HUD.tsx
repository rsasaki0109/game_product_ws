import { useStore, type Card } from '../store';
import { useEffect, useMemo, useState } from 'react';

function fmtSec(sec: number): string {
  if (!Number.isFinite(sec)) return '--';
  const s = Math.max(0, sec);
  return s.toFixed(1);
}

function handValue(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += c.value;
    if (c.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

export function HUD() {
  const isCapture = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).has('capture');
    } catch {
      return false;
    }
  }, []);

  const [pointerLocked, setPointerLocked] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    return !!document.pointerLockElement;
  });

  useEffect(() => {
    const onChange = () => setPointerLocked(!!document.pointerLockElement);
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, []);

  const [showGuide, setShowGuide] = useState<boolean>(true);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyT') setShowGuide((v) => !v);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const phase = useStore((s) => s.phase);
  const chips = useStore((s) => s.chips);
  const nearTable = useStore((s) => s.nearTable);
  const hauntRemaining = useStore((s) => s.hauntRemaining);
  const deathReason = useStore((s) => s.deathReason);
  const bj = useStore((s) => s.blackjack);
  const openTable = useStore((s) => s.openTable);
  const closeTable = useStore((s) => s.closeTable);
  const dealBlackjack = useStore((s) => s.dealBlackjack);
  const hitBlackjack = useStore((s) => s.hitBlackjack);
  const standBlackjack = useStore((s) => s.standBlackjack);
  const restart = useStore((s) => s.restart);

  const phaseLabel = useMemo(() => {
    switch (phase) {
      case 'explore': return '探索';
      case 'table': return 'テーブル';
      case 'haunt': return 'ハント';
      case 'dead': return '死亡';
      default: return phase;
    }
  }, [phase]);

  const showActionButtons = !isCapture && (
    (phase === 'explore' && nearTable) ||
    phase === 'table' ||
    phase === 'dead'
  );

  const guide = useMemo(() => {
    if (isCapture) return null;
    if (!showGuide) return null;

    if (phase === 'explore') {
      if (nearTable) {
        return { title: '次にやること', lines: ['テーブルに座る（E / 画面下のボタン）'] };
      }
      return { title: '次にやること', lines: ['緑の矢印の方向へ進んでテーブルを探す', '床のチップに近づくと自動で拾える'] };
    }

    if (phase === 'haunt') {
      return { title: '次にやること', lines: ['セーフゾーン（緑の輪）へ逃げる', '中で約1秒耐える'] };
    }

    if (phase === 'dead') {
      return { title: '次にやること', lines: ['R でリスタート'] };
    }

    if (phase === 'table') {
      if (bj.status === 'idle') return { title: '次にやること', lines: ['配る（Enter / 画面下のボタン）'] };
      if (bj.status === 'playing') return { title: '次にやること', lines: ['ヒット or スタンド（画面下のボタン）'] };
      if (bj.status === 'resolved') return { title: '次にやること', lines: ['席を立つ（E / 画面下のボタン）'] };
    }

    return null;
  }, [bj.status, isCapture, nearTable, phase, showGuide]);

  return (
    <div className="hud" aria-label="HUD">
      {!isCapture && !pointerLocked && (
        <div className="hudCenterOverlay" aria-label="Pointer Lock Prompt">
          <div className="hudCenterTitle">クリックして開始</div>
          <div className="hudCenterBody">
            <div><b>マウス</b>: 視点</div>
            <div><b>WASD</b>: 移動</div>
            <div><b>Esc</b>: カーソル解除</div>
          </div>
        </div>
      )}

      {guide && (
        <div className="hudObjective" aria-label="Objective">
          <div className="hudObjectiveTitle">{guide.title}</div>
          <div className="hudObjectiveBody">
            {guide.lines.map((l) => (
              <div key={l} className="hudObjectiveLine">{l}</div>
            ))}
            <div className="hudObjectiveHint"><b>T</b>: ガイド ON/OFF</div>
          </div>
        </div>
      )}

      {showActionButtons && (
        <div className="hudControls" data-ui="true" aria-label="On Screen Controls">
          {phase === 'explore' && nearTable && (
            <button type="button" className="hudBtn hudBtnPrimary" onClick={openTable}>
              座る
            </button>
          )}

          {phase === 'table' && bj.status === 'idle' && (
            <button type="button" className="hudBtn hudBtnPrimary" onClick={dealBlackjack}>
              配る
            </button>
          )}
          {phase === 'table' && bj.status === 'playing' && (
            <>
              <button type="button" className="hudBtn" onClick={hitBlackjack}>
                ヒット
              </button>
              <button type="button" className="hudBtn hudBtnPrimary" onClick={standBlackjack}>
                スタンド
              </button>
            </>
          )}
          {phase === 'table' && bj.status !== 'playing' && (
            <button type="button" className="hudBtn" onClick={closeTable}>
              席を立つ
            </button>
          )}

          {phase === 'dead' && (
            <button type="button" className="hudBtn hudBtnPrimary" onClick={restart}>
              リスタート
            </button>
          )}
        </div>
      )}

      <div className="hudTop">
        <div className="hudTitle">デス・ハイローラー（MVP）</div>
        <div className="hudStat">
          チップ: <b>{chips}</b>
        </div>
        <div className="hudStat">
          状態: <b>{phaseLabel}</b>
        </div>
      </div>

      <div className="hudHelp">
        <span>WASD 移動</span>
        <span>Space ジャンプ</span>
        <span>クリック 視点ON</span>
        <span>Esc 解除</span>
        <span>T ガイド</span>
      </div>

      {phase === 'explore' && nearTable && (
        <div className="hudPrompt">
          <b>座る</b>（E / 画面下のボタン）
        </div>
      )}

      {phase === 'table' && (
        <div className="hudPanel blackjack">
          <div className="hudPanelTitle">ブラックジャック（オールイン）</div>
          <div className="hudPanelBody">
            <BlackjackView bj={bj} chips={chips} />
            {bj.status === 'idle' && (
              <div className="hudKeys">
                <b>配る</b>（Enter / ボタン）
              </div>
            )}
            {bj.status === 'playing' && (
              <div className="hudKeys">
                <b>ヒット</b>: H / ← / 1 <span className="hudKeysSep">|</span> <b>スタンド</b>: S / → / 2
              </div>
            )}
            {bj.status === 'resolved' && (
              <div className="hudKeys">
                <b>席を立つ</b>（E / ボタン）
              </div>
            )}
          </div>
        </div>
      )}

      {phase === 'haunt' && (
        <div className="hudPanel haunt">
          <div className="hudPanelTitle">ハント</div>
          <div className="hudPanelBody">
            <div className="hudMsg">セーフゾーンへ走れ</div>
            <div className="hudMsg">反対側の壁の緑の輪</div>
            <div className="hudTimer">{fmtSec(hauntRemaining)}s</div>
          </div>
        </div>
      )}

      {phase === 'dead' && (
        <div className="hudPanel dead">
          <div className="hudPanelTitle">死亡</div>
          <div className="hudPanelBody">
            <div className="hudMsg">{deathReason || '死んだ'}</div>
            <div className="hudKeys">
              <b>R</b>: リスタート
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CardFace({ rank, hidden }: { rank: string; hidden?: boolean }) {
  return (
    <div className={hidden ? 'bjCard bjCardBack' : 'bjCard'} aria-label={hidden ? 'hidden card' : `card ${rank}`}>
      {hidden ? ' ' : rank}
    </div>
  );
}

function BlackjackView({
  bj,
  chips,
}: {
  bj: {
    status: 'idle' | 'playing' | 'resolved';
    bet: number;
    player: Card[];
    dealer: Card[];
    outcome: 'win' | 'lose' | 'push' | null;
    message: string;
  };
  chips: number;
}) {
  const playerTotal = bj.player.length > 0 ? handValue(bj.player) : null;
  const dealerTotal = (bj.status === 'resolved' && bj.dealer.length > 0) ? handValue(bj.dealer) : null;
  const hideDealerHole = bj.status === 'playing';

  const outcomeLabel = bj.outcome === 'win' ? '勝ち' : bj.outcome === 'lose' ? '負け' : bj.outcome === 'push' ? '引き分け' : null;
  const outcomeClass = bj.outcome ?? '';

  const betLabel = bj.status === 'idle' ? `賭け: オールイン（${chips}）` : `賭け: ${bj.bet}`;

  return (
    <div className="bjWrap" aria-label="Blackjack">
      <div className="bjMeta">
        <div className="bjMetaItem">{betLabel}</div>
        <div className="bjMetaItem">目標: 21</div>
      </div>

      <div className="bjHands">
        <div className="bjRow" aria-label="Player Hand">
          <div className="bjHeader">
            <div className="bjWho">あなた</div>
            <div className="bjTotal">{playerTotal == null ? '' : `合計 ${playerTotal}`}</div>
          </div>
          <div className="bjCards">
            {bj.player.length === 0 ? (
              <div className="bjEmpty">まだ配られていない</div>
            ) : (
              bj.player.map((c, i) => <CardFace key={`${c.rank}-${i}`} rank={c.rank} />)
            )}
          </div>
        </div>

        <div className="bjRow" aria-label="Dealer Hand">
          <div className="bjHeader">
            <div className="bjWho">ディーラー</div>
            <div className="bjTotal">{dealerTotal == null ? (hideDealerHole ? '合計 ?' : '') : `合計 ${dealerTotal}`}</div>
          </div>
          <div className="bjCards">
            {bj.dealer.length === 0 ? (
              <div className="bjEmpty">---</div>
            ) : (
              <>
                <CardFace rank={bj.dealer[0].rank} />
                {hideDealerHole ? <CardFace rank="?" hidden /> : bj.dealer.slice(1).map((c, i) => <CardFace key={`${c.rank}-${i}`} rank={c.rank} />)}
              </>
            )}
          </div>
        </div>
      </div>

      {outcomeLabel && (
        <div className={`bjOutcome ${outcomeClass}`} aria-label="Outcome">
          {outcomeLabel}
        </div>
      )}

      <div className="bjMessage">{bj.message}</div>
    </div>
  );
}
