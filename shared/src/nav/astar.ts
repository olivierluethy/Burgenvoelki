import type { Vec2 } from '../types';
import { cellToWorld, isBlocked, worldToCell, type NavGrid } from './grid';

/** 8-connected A* over the nav grid. Returns world-space waypoints or null. */

interface Node {
  c: number;
  r: number;
  g: number;
  f: number;
  parent: number; // index in cameFrom, encoded as r*cols+c
}

const DIRS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

function heuristic(c: number, r: number, gc: number, gr: number): number {
  // octile distance
  const dx = Math.abs(c - gc);
  const dy = Math.abs(r - gr);
  return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy);
}

export function findPathCells(
  grid: NavGrid,
  from: Vec2,
  to: Vec2,
): { c: number; r: number }[] | null {
  const s = worldToCell(grid, from.x, from.z);
  const g = worldToCell(grid, to.x, to.z);
  const { cols, rows } = grid;

  // If the goal cell is blocked, aim for the nearest walkable neighbour.
  let goalC = g.c;
  let goalR = g.r;
  if (isBlocked(grid, goalC, goalR)) {
    const near = nearestOpen(grid, goalC, goalR);
    if (!near) return null;
    goalC = near.c;
    goalR = near.r;
  }
  if (isBlocked(grid, s.c, s.r)) {
    const near = nearestOpen(grid, s.c, s.r);
    if (!near) return null;
    s.c = near.c;
    s.r = near.r;
  }

  const idx = (c: number, r: number) => r * cols + c;
  const open = new Map<number, Node>();
  const cameFrom = new Int32Array(cols * rows).fill(-1);
  const gScore = new Float32Array(cols * rows).fill(Infinity);
  const closed = new Uint8Array(cols * rows);

  const startIdx = idx(s.c, s.r);
  gScore[startIdx] = 0;
  open.set(startIdx, { c: s.c, r: s.r, g: 0, f: heuristic(s.c, s.r, goalC, goalR), parent: -1 });

  let guard = cols * rows * 4;
  while (open.size > 0 && guard-- > 0) {
    // pop lowest f
    let bestKey = -1;
    let bestF = Infinity;
    for (const [k, n] of open) {
      if (n.f < bestF) {
        bestF = n.f;
        bestKey = k;
      }
    }
    const cur = open.get(bestKey)!;
    open.delete(bestKey);
    const curIdx = idx(cur.c, cur.r);
    if (closed[curIdx]) continue;
    closed[curIdx] = 1;

    if (cur.c === goalC && cur.r === goalR) {
      return reconstruct(cameFrom, cols, goalC, goalR);
    }

    for (const [dc, dr] of DIRS) {
      const nc = cur.c + dc;
      const nr = cur.r + dr;
      if (isBlocked(grid, nc, nr)) continue;
      // prevent diagonal corner-cutting
      if (dc !== 0 && dr !== 0) {
        if (isBlocked(grid, cur.c + dc, cur.r) && isBlocked(grid, cur.c, cur.r + dr)) continue;
      }
      const nIdx = idx(nc, nr);
      if (closed[nIdx]) continue;
      const step = dc !== 0 && dr !== 0 ? Math.SQRT2 : 1;
      const tentative = gScore[curIdx] + step;
      if (tentative < gScore[nIdx]) {
        gScore[nIdx] = tentative;
        cameFrom[nIdx] = curIdx;
        open.set(nIdx, {
          c: nc,
          r: nr,
          g: tentative,
          f: tentative + heuristic(nc, nr, goalC, goalR),
          parent: curIdx,
        });
      }
    }
  }
  return null;
}

function reconstruct(
  cameFrom: Int32Array,
  cols: number,
  goalC: number,
  goalR: number,
): { c: number; r: number }[] {
  const path: { c: number; r: number }[] = [];
  let cur = goalR * cols + goalC;
  while (cur !== -1) {
    path.push({ c: cur % cols, r: Math.floor(cur / cols) });
    cur = cameFrom[cur];
  }
  return path.reverse();
}

function nearestOpen(grid: NavGrid, c: number, r: number, radius = 4): { c: number; r: number } | null {
  for (let rad = 1; rad <= radius; rad++) {
    for (let dc = -rad; dc <= rad; dc++) {
      for (let dr = -rad; dr <= rad; dr++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
        if (!isBlocked(grid, c + dc, r + dr)) return { c: c + dc, r: r + dr };
      }
    }
  }
  return null;
}

export function findPath(grid: NavGrid, from: Vec2, to: Vec2): Vec2[] | null {
  const cells = findPathCells(grid, from, to);
  if (!cells) return null;
  return cells.map((cell) => cellToWorld(grid, cell.c, cell.r));
}

/** Whether a path exists between two world points (used for Keule reachability). */
export function isReachable(grid: NavGrid, from: Vec2, to: Vec2): boolean {
  return findPathCells(grid, from, to) !== null;
}
