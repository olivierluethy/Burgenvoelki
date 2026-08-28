import type { AABB } from '../nav/grid';
import type { Vec2 } from '../types';

/**
 * Static gym equipment. Defined once here so the nav grid, physics colliders
 * and renderer all agree. The layout is point-symmetric (x,z) -> (-x,-z) so
 * both halves are tactically fair for capture-the-flag.
 */
export type PropKind =
  | 'tower' // tall wooden climbing tower — hard cover, blocks sight
  | 'wall' // wooden wall segment — hard cover
  | 'box' // vaulting/wooden box — medium cover
  | 'crashmat' // large soft mat — low cover (throws pass over)
  | 'bench' // wooden bench — low cover
  | 'goal' // portable goal — tall but see-through-ish
  | 'barrier'; // barrier — medium cover

export interface PropDef {
  id: string;
  kind: PropKind;
  /** Centre on the floor plane. */
  x: number;
  z: number;
  /** Footprint size along x and z, and height. */
  w: number;
  d: number;
  h: number;
  /** Rotation around y (radians) for rendering; footprint stays axis-aligned. */
  rot?: number;
  pushable?: boolean;
}

/** Heights at/above which a prop blocks line of sight for the AI. */
export const LOS_BLOCK_HEIGHT = 1.2;

/** Base props on the blue half; each is mirrored to the red half. */
const BASE: Omit<PropDef, 'id'>[] = [
  { kind: 'tower', x: -4.5, z: -3.5, w: 1.4, d: 1.4, h: 2.5 },
  { kind: 'wall', x: -1.8, z: 3.2, w: 0.5, d: 3.2, h: 1.8 },
  { kind: 'box', x: -7.5, z: 4.8, w: 1.5, d: 1.1, h: 1.1, pushable: true },
  { kind: 'box', x: -9.5, z: -5.5, w: 1.2, d: 1.2, h: 1.0, pushable: true },
  { kind: 'crashmat', x: -5.5, z: 0.6, w: 2.4, d: 3.0, h: 0.45 },
  { kind: 'barrier', x: -3.0, z: 6.5, w: 2.2, d: 0.4, h: 1.3 },
  { kind: 'goal', x: -13.2, z: 3.4, w: 2.0, d: 0.5, h: 2.0 },
];

let cachedProps: PropDef[] | null = null;

export function arenaProps(): PropDef[] {
  if (cachedProps) return cachedProps;
  const props: PropDef[] = [];
  BASE.forEach((p, i) => {
    props.push({ ...p, id: `blue_${p.kind}_${i}` });
    props.push({ ...p, id: `red_${p.kind}_${i}`, x: -p.x, z: -p.z });
  });
  cachedProps = props;
  return props;
}

/** Footprints for the nav grid. Crash mats are low enough to path over? No —
 *  they still block movement, so all solid props contribute a footprint. */
export function propAABBs(props: PropDef[] = arenaProps()): AABB[] {
  return props.map((p) => ({
    minX: p.x - p.w / 2,
    maxX: p.x + p.w / 2,
    minZ: p.z - p.d / 2,
    maxZ: p.z + p.d / 2,
  }));
}

/** Tall props that block line of sight (for AI perception in M5). */
export function losBlockers(props: PropDef[] = arenaProps()): AABB[] {
  return props.filter((p) => p.h >= LOS_BLOCK_HEIGHT).map((p) => ({
    minX: p.x - p.w / 2,
    maxX: p.x + p.w / 2,
    minZ: p.z - p.d / 2,
    maxZ: p.z + p.d / 2,
  }));
}

export interface CoverPoint {
  pos: Vec2;
  /** Outward direction the cover faces (the exposed side). */
  normal: Vec2;
}

/**
 * Cover spots hugging each solid prop, one per side, offset outward. The AI
 * picks the point whose prop sits between it and the current threat.
 */
export function coverPoints(props: PropDef[] = arenaProps()): CoverPoint[] {
  const pts: CoverPoint[] = [];
  const offset = 0.9;
  for (const p of props) {
    if (p.h < 0.8) continue; // too low to hide behind
    const hw = p.w / 2 + offset;
    const hd = p.d / 2 + offset;
    pts.push({ pos: { x: p.x + hw, z: p.z }, normal: { x: 1, z: 0 } });
    pts.push({ pos: { x: p.x - hw, z: p.z }, normal: { x: -1, z: 0 } });
    pts.push({ pos: { x: p.x, z: p.z + hd }, normal: { x: 0, z: 1 } });
    pts.push({ pos: { x: p.x, z: p.z - hd }, normal: { x: 0, z: -1 } });
  }
  return pts;
}
