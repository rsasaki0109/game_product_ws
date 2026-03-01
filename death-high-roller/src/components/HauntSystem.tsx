import { useFrame } from '@react-three/fiber';
import type { RapierRigidBody } from '@react-three/rapier';
import { useRef, type RefObject } from 'react';
import { useStore } from '../store';

export interface SafeZoneSpec {
  x: number;
  y: number;
  z: number;
  r: number;
}

export function HauntSystem({
  playerBodyRef,
  safeZone,
  safeHoldSec = 0.9,
}: {
  playerBodyRef: RefObject<RapierRigidBody | null>;
  safeZone: SafeZoneSpec;
  safeHoldSec?: number;
}) {
  const phase = useStore((s) => s.phase);
  const hauntEndsAt = useStore((s) => s.hauntEndsAt);
  const stopHaunt = useStore((s) => s.stopHaunt);
  const die = useStore((s) => s.die);
  const setHauntRemaining = useStore((s) => s.setHauntRemaining);

  const insideSince = useRef<number | null>(null);
  const lastUiUpdateAt = useRef<number>(0);

  useFrame(({ clock }) => {
    if (phase !== 'haunt') {
      insideSince.current = null;
      return;
    }

    const now = clock.getElapsedTime();
    const end = hauntEndsAt;
    if (end == null) return;

    const remaining = Math.max(0, end - now);
    // Update UI at ~10Hz to avoid rerendering every frame.
    if (now - lastUiUpdateAt.current >= 0.1) {
      lastUiUpdateAt.current = now;
      setHauntRemaining(remaining);
    }

    const rb = playerBodyRef.current;
    if (rb) {
      const p = rb.translation();
      const dx = p.x - safeZone.x;
      const dz = p.z - safeZone.z;
      const inside = (dx * dx + dz * dz) <= (safeZone.r * safeZone.r);

      if (inside) {
        if (insideSince.current == null) insideSince.current = now;
        if (now - insideSince.current >= safeHoldSec) {
          stopHaunt();
          insideSince.current = null;
          return;
        }
      } else {
        insideSince.current = null;
      }
    }

    if (now >= end) {
      die('時間切れ');
    }
  });

  return null;
}
