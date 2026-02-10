import { useFrame } from '@react-three/fiber';
import { useStore } from '../store';
import { useRef } from 'react';

export function HauntSystem() {
    const { triggerHaunt, stopHaunt } = useStore();
    const nextHauntTime = useRef(5); // First haunt after 5 seconds

    useFrame(({ clock }) => {
        const time = clock.getElapsedTime();

        if (time > nextHauntTime.current) {
            triggerHaunt();

            // Stop haunting after 2 seconds
            if (time > nextHauntTime.current + 2) {
                stopHaunt();
                nextHauntTime.current = time + Math.random() * 10 + 5; // Next haunt in 5-15 seconds
            }
        }
    });

    return null;
}
