import type { Vec2 } from '../types/game.ts'

export function distance2D(a: Vec2, b: Vec2): number {
  const dx = a[0] - b[0]
  const dz = a[1] - b[1]
  return Math.sqrt(dx * dx + dz * dz)
}

export function direction2D(from: Vec2, to: Vec2): Vec2 {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const len = Math.sqrt(dx * dx + dz * dz)
  if (len < 0.001) return [0, 0]
  return [dx / len, dz / len]
}

export function calculateDamage(attack: number): number {
  return Math.max(1, Math.round(attack * (0.8 + Math.random() * 0.4)))
}

export function clampToMap(v: number): number {
  return Math.max(1, Math.min(79, v))
}

export function moveToward(from: Vec2, to: Vec2, speed: number, delta: number): Vec2 {
  const [dx, dz] = direction2D(from, to)
  const step = speed * delta
  return [
    clampToMap(from[0] + dx * step),
    clampToMap(from[1] + dz * step),
  ]
}
