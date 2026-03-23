export function calculateDamage(attack: number): number {
  const variance = 0.8 + Math.random() * 0.4
  return Math.max(1, Math.round(attack * variance))
}

export function distance2D(
  a: [number, number, number],
  b: [number, number, number],
): number {
  const dx = a[0] - b[0]
  const dz = a[2] - b[2]
  return Math.sqrt(dx * dx + dz * dz)
}

export function direction2D(
  from: [number, number, number],
  to: [number, number, number],
): [number, number] {
  const dx = to[0] - from[0]
  const dz = to[2] - from[2]
  const len = Math.sqrt(dx * dx + dz * dz)
  if (len < 0.001) return [0, 0]
  return [dx / len, dz / len]
}
