import { NAV, PLAYABLE } from '../config';
import type { Vec2 } from '../types';

/** Axis-aligned box on the floor plane (obstacle footprint). */
export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * A coarse nav grid regenerated from static obstacles — the pragmatic choice
 * over a full recast navmesh for browser + server parity (plan M3/M4). Cells
 * are blocked when out of the playable rectangle or covered by an obstacle.
 */
export interface NavGrid {
  cols: number;
  rows: number;
  cellSize: number;
  originX: number;
  originZ: number;
  blocked: Uint8Array;
}

export function buildNavGrid(obstacles: AABB[] = [], pad = 0.5): NavGrid {
  const cellSize = NAV.cellSize;
  const originX = PLAYABLE.xMin;
  const originZ = PLAYABLE.zMin;
  const cols = Math.ceil((PLAYABLE.xMax - PLAYABLE.xMin) / cellSize);
  const rows = Math.ceil((PLAYABLE.zMax - PLAYABLE.zMin) / cellSize);
  const blocked = new Uint8Array(cols * rows);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = originX + (c + 0.5) * cellSize;
      const z = originZ + (r + 0.5) * cellSize;
      let block = 0;
      for (const o of obstacles) {
        if (x >= o.minX - pad && x <= o.maxX + pad && z >= o.minZ - pad && z <= o.maxZ + pad) {
          block = 1;
          break;
        }
      }
      blocked[r * cols + c] = block;
    }
  }
  return { cols, rows, cellSize, originX, originZ, blocked };
}

export function worldToCell(grid: NavGrid, x: number, z: number): { c: number; r: number } {
  const c = Math.floor((x - grid.originX) / grid.cellSize);
  const r = Math.floor((z - grid.originZ) / grid.cellSize);
  return {
    c: Math.max(0, Math.min(grid.cols - 1, c)),
    r: Math.max(0, Math.min(grid.rows - 1, r)),
  };
}

export function cellToWorld(grid: NavGrid, c: number, r: number): Vec2 {
  return {
    x: grid.originX + (c + 0.5) * grid.cellSize,
    z: grid.originZ + (r + 0.5) * grid.cellSize,
  };
}

export function isBlocked(grid: NavGrid, c: number, r: number): boolean {
  if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows) return true;
  return grid.blocked[r * grid.cols + c] === 1;
}

export function isWalkableWorld(grid: NavGrid, x: number, z: number): boolean {
  const { c, r } = worldToCell(grid, x, z);
  return !isBlocked(grid, c, r);
}
