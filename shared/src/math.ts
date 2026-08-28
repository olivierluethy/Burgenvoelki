/** Small, dependency-free vector/number helpers used across the simulation. */

import type { Vec2, Vec3 } from './types';

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const damp = (a: number, b: number, lambda: number, dt: number): number =>
  lerp(a, b, 1 - Math.exp(-lambda * dt));

// --- 2D (floor plane: x,z) ---

export const v2 = (x = 0, z = 0): Vec2 => ({ x, z });

export const add2 = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, z: a.z + b.z });
export const sub2 = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, z: a.z - b.z });
export const scale2 = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, z: a.z * s });
export const dot2 = (a: Vec2, b: Vec2): number => a.x * b.x + a.z * b.z;
export const len2 = (a: Vec2): number => Math.hypot(a.x, a.z);
export const dist2 = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.z - b.z);

export function norm2(a: Vec2): Vec2 {
  const l = len2(a);
  return l < 1e-6 ? { x: 0, z: 0 } : { x: a.x / l, z: a.z / l };
}

/** Rotate a floor vector by angle (radians, CCW around +y). */
export function rot2(a: Vec2, ang: number): Vec2 {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return { x: a.x * c - a.z * s, z: a.x * s + a.z * c };
}

export const angleOf2 = (a: Vec2): number => Math.atan2(a.z, a.x);

// --- 3D ---

export const v3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });
export const add3 = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub3 = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale3 = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const len3 = (a: Vec3): number => Math.hypot(a.x, a.y, a.z);
export const dist3 = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export const flat = (a: Vec3): Vec2 => ({ x: a.x, z: a.z });
export const lift = (a: Vec2, y = 0): Vec3 => ({ x: a.x, y, z: a.z });

/** Deterministic mulberry32 PRNG — reproducible sim/AI randomness. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Gaussian-ish noise in [-1,1] from a uniform rng (sum of two samples). */
export function gauss(rng: () => number): number {
  return (rng() + rng() - 1);
}
