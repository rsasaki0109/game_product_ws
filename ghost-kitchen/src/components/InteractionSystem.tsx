import { useFrame } from '@react-three/fiber';
import type { RapierRigidBody } from '@react-three/rapier';
import { useRef, type RefObject } from 'react';
import { useStore } from '../store';

export function InteractionSystem({
  playerBodyRef,
  tablePos,
  nearDist = 3.6,
  farDist = 4.2,
}: {
  playerBodyRef: RefObject<RapierRigidBody | null>;
  tablePos: { x: number; y: number; z: number };
  nearDist?: number;
  farDist?: number;
}) {
  const phase = useStore((s) => s.phase);
  const setNearTable = useStore((s) => s.setNearTable);
  const last = useRef<boolean>(false);

  useFrame(() => {
    if (phase !== 'explore') {
      if (last.current) {
        last.current = false;
        setNearTable(false);
      }
      return;
    }

    const rb = playerBodyRef.current;
    if (!rb) return;

    const p = rb.translation();
    const dx = p.x - tablePos.x;
    const dz = p.z - tablePos.z;
    const d = Math.sqrt(dx * dx + dz * dz);

    // Hysteresis: once "near", stay near until a slightly larger distance.
    const next = last.current ? (d <= farDist) : (d <= nearDist);
    if (next !== last.current) {
      last.current = next;
      setNearTable(next);
    }
  });

  return null;
}
