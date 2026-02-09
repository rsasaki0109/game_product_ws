import { create } from 'zustand';

interface GameState {
    hauntIntensity: number;
    triggerHaunt: () => void;
    stopHaunt: () => void;
}

export const useStore = create<GameState>((set) => ({
    hauntIntensity: 0,
    triggerHaunt: () => set({ hauntIntensity: 1 }),
    stopHaunt: () => set({ hauntIntensity: 0 }),
}));
