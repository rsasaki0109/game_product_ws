import { create } from 'zustand';

export type Phase = 'explore' | 'table' | 'haunt' | 'dead';

type BlackjackStatus = 'idle' | 'playing' | 'resolved';
type BlackjackOutcome = 'win' | 'lose' | 'push' | null;

export interface Card {
    rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
    value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
}

export interface BlackjackState {
    status: BlackjackStatus;
    bet: number;
    player: Card[];
    dealer: Card[];
    outcome: BlackjackOutcome;
    message: string;
}

interface GameState {
    phase: Phase;

    chips: number;
    nearTable: boolean;

    hauntIntensity: number; // 0..1 (visual)
    hauntEndsAt: number | null; // seconds (r3f clock time)
    hauntRemaining: number; // seconds (for UI)

    deathReason: string;
    restartId: number;

    blackjack: BlackjackState;

    addChips: (amount: number) => void;
    setNearTable: (v: boolean) => void;

    openTable: () => void;
    closeTable: () => void;

    dealBlackjack: () => void;
    hitBlackjack: () => void;
    standBlackjack: () => void;

    startHaunt: (nowSec: number, durationSec: number) => void;
    stopHaunt: () => void;
    setHauntRemaining: (sec: number) => void;

    die: (reason: string) => void;
    restart: () => void;
}

function drawCard(): Card {
    const ranks: Card['rank'][] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const r = ranks[Math.floor(Math.random() * ranks.length)];
    const value: Card['value'] =
        r === 'A' ? 11 :
            (r === 'J' || r === 'Q' || r === 'K') ? 10 :
                (Number(r) as Card['value']);
    return { rank: r, value };
}

function handValue(cards: Card[]): number {
    // A is 11 unless it busts, then it becomes 1.
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

function fmtHand(cards: Card[]): string {
    return cards.map(c => c.rank).join(' ');
}

export const useStore = create<GameState>((set) => ({
    phase: 'explore',

    chips: 10,
    nearTable: false,

    hauntIntensity: 0,
    hauntEndsAt: null,
    hauntRemaining: 0,

    deathReason: '',
    restartId: 0,

    blackjack: {
        status: 'idle',
        bet: 0,
        player: [],
        dealer: [],
        outcome: null,
        message: 'テーブルの近くで E: 着席',
    },

    addChips: (amount) => set((s) => ({ chips: Math.max(0, s.chips + amount) })),
    setNearTable: (v) => set(() => ({ nearTable: v })),

    openTable: () => set((s) => {
        if (s.phase !== 'explore') return s;
        return {
            phase: 'table',
            blackjack: {
                status: 'idle',
                bet: 0,
                player: [],
                dealer: [],
                outcome: null,
                message: s.chips > 0 ? 'オールインで勝負' : 'チップがない。床のチップを拾おう。',
            },
        };
    }),

    closeTable: () => set((s) => {
        if (s.phase !== 'table') return s;
        return {
            phase: 'explore',
            blackjack: {
                status: 'idle',
                bet: 0,
                player: [],
                dealer: [],
                outcome: null,
                message: '探索に戻る',
            },
        };
    }),

    dealBlackjack: () => set((s) => {
        if (s.phase !== 'table') return s;
        if (s.chips <= 0) {
            return { blackjack: { ...s.blackjack, message: 'チップがない。床のチップを拾おう。' } };
        }
        const bet = s.chips; // ALL-IN
        const player = [drawCard(), drawCard()];
        const dealer = [drawCard(), drawCard()];

        const pv = handValue(player);
        const dv = handValue(dealer);

        let status: BlackjackStatus = 'playing';
        let outcome: BlackjackOutcome = null;
        let message = `あなた: ${fmtHand(player)} (${pv}) / ディーラー: ${dealer[0].rank} ?`;

        // Immediate resolution on blackjack
        if (pv === 21 && dv === 21) {
            status = 'resolved';
            outcome = 'push';
            message = `引き分け！ あなた: ${fmtHand(player)} / ディーラー: ${fmtHand(dealer)}`;
        } else if (pv === 21) {
            status = 'resolved';
            outcome = 'win';
            message = `勝ち！ あなた: ${fmtHand(player)} / ディーラー: ${fmtHand(dealer)}`;
        } else if (dv === 21) {
            status = 'resolved';
            outcome = 'lose';
            message = `負け！ あなた: ${fmtHand(player)} / ディーラー: ${fmtHand(dealer)}`;
        }

        // We "place" bet by removing chips immediately
        const next: Partial<GameState> = {
            chips: 0,
            blackjack: {
                status,
                bet,
                player,
                dealer,
                outcome,
                message,
            },
        };

        // Payout if already resolved
        if (status === 'resolved') {
            if (outcome === 'win') next.chips = bet * 2;
            if (outcome === 'push') next.chips = bet;
        }

        return next;
    }),

    hitBlackjack: () => set((s) => {
        if (s.phase !== 'table') return s;
        if (s.blackjack.status !== 'playing') return s;

        const player = [...s.blackjack.player, drawCard()];
        const pv = handValue(player);

        if (pv > 21) {
            return {
                blackjack: {
                    ...s.blackjack,
                    status: 'resolved',
                    player,
                    outcome: 'lose',
                    message: `バースト！ あなた: ${fmtHand(player)} (${pv}) / ディーラー: ${fmtHand(s.blackjack.dealer)} (${handValue(s.blackjack.dealer)})`,
                },
            };
        }

        return {
            blackjack: {
                ...s.blackjack,
                player,
                message: `あなた: ${fmtHand(player)} (${pv}) / ディーラー: ${s.blackjack.dealer[0].rank} ?`,
            },
        };
    }),

    standBlackjack: () => set((s) => {
        if (s.phase !== 'table') return s;
        if (s.blackjack.status !== 'playing') return s;

        const player = s.blackjack.player;
        const dealer = [...s.blackjack.dealer];

        const pv = handValue(player);
        while (handValue(dealer) < 17) dealer.push(drawCard());
        const dv = handValue(dealer);

        let outcome: BlackjackOutcome;
        if (dv > 21) outcome = 'win';
        else if (pv > dv) outcome = 'win';
        else if (pv < dv) outcome = 'lose';
        else outcome = 'push';

        let chips = s.chips; // already 0 after bet
        if (outcome === 'win') chips = s.blackjack.bet * 2;
        if (outcome === 'push') chips = s.blackjack.bet;

        const outcomeLabel = outcome === 'win' ? '勝ち' : outcome === 'lose' ? '負け' : '引き分け';
        const message = `${outcomeLabel}！ あなた: ${fmtHand(player)} (${pv}) / ディーラー: ${fmtHand(dealer)} (${dv})`;

        return {
            chips,
            blackjack: {
                ...s.blackjack,
                status: 'resolved',
                dealer,
                outcome,
                message,
            },
        };
    }),

    startHaunt: (nowSec, durationSec) => set((s) => ({
        phase: 'haunt',
        nearTable: false,
        hauntIntensity: 1,
        hauntEndsAt: nowSec + durationSec,
        hauntRemaining: durationSec,
        blackjack: { ...s.blackjack, message: '借金取りが来た' },
    })),

    stopHaunt: () => set(() => ({
        phase: 'explore',
        hauntIntensity: 0,
        hauntEndsAt: null,
        hauntRemaining: 0,
    })),

    setHauntRemaining: (sec) => set(() => ({ hauntRemaining: sec })),

    die: (reason) => set(() => ({
        phase: 'dead',
        hauntIntensity: 0,
        hauntEndsAt: null,
        hauntRemaining: 0,
        deathReason: reason,
    })),

    restart: () => set((s) => ({
        phase: 'explore',
        chips: 10,
        nearTable: false,

        hauntIntensity: 0,
        hauntEndsAt: null,
        hauntRemaining: 0,

        deathReason: '',
        restartId: s.restartId + 1,

        blackjack: {
            status: 'idle',
            bet: 0,
            player: [],
            dealer: [],
            outcome: null,
            message: 'テーブルの近くで E: 着席',
        },
    })),
}));
