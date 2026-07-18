/**
 * Free movement: continuous velocity through open corridors with wall collision.
 * Works in world pixels; maze provides wall geometry via helpers.
 */

import { clamp } from '../../core/math.js';
import { getCell } from '../maze/model.js';

/**
 * @typedef {import('../maze/model.js').MazeLike} MazeLike
 * @typedef {import('../maze/model.js').Maze} Maze
 */

/**
 * Layout metrics for converting cell grid ↔ world pixels.
 * @typedef {object} MazeLayout
 * @property {number} originX  top-left of cell (0,0) in world space
 * @property {number} originY
 * @property {number} cellSize
 * @property {number} wallThickness  visual/collision half-gap (0..0.5 of cell)
 */

/**
 * Center of a cell in world pixels.
 * @param {MazeLayout} layout
 * @param {number} cx
 * @param {number} cy
 */
export function cellCenter(layout, cx, cy) {
  return {
    x: layout.originX + (cx + 0.5) * layout.cellSize,
    y: layout.originY + (cy + 0.5) * layout.cellSize,
  };
}

/**
 * Which cell contains a world point (clamped to grid).
 * @param {MazeLayout} layout
 * @param {MazeLike} maze
 * @param {number} wx
 * @param {number} wy
 */
export function worldToCell(layout, maze, wx, wy) {
  const gx = Math.floor((wx - layout.originX) / layout.cellSize);
  const gy = Math.floor((wy - layout.originY) / layout.cellSize);
  return {
    x: clamp(gx, 0, maze.cols - 1),
    y: clamp(gy, 0, maze.rows - 1),
  };
}

/**
 * Move a circular player with continuous collision against maze walls.
 * Walls sit on cell edges; open edges allow passage.
 *
 * @param {Maze} maze
 * @param {MazeLayout} layout
 * @param {{ x: number, y: number }} pos
 * @param {{ x: number, y: number }} vel  world units / second
 * @param {number} dt
 * @param {number} radius
 * @returns {{ x: number, y: number, blocked: boolean }}
 */
export function integrateFreeMove(maze, layout, pos, vel, dt, radius) {
  let x = pos.x;
  let y = pos.y;
  let blocked = false;

  const steps = Math.max(1, Math.ceil((Math.hypot(vel.x, vel.y) * dt) / Math.max(layout.cellSize * 0.2, 1)));
  const sdt = dt / steps;

  for (let s = 0; s < steps; s++) {
    const nx = x + vel.x * sdt;
    const hitX = resolveAxis(maze, layout, nx, y, radius, 'x');
    if (hitX.blocked) blocked = true;
    x = hitX.x;
    y = hitX.y;

    const ny = y + vel.y * sdt;
    const hitY = resolveAxis(maze, layout, x, ny, radius, 'y');
    if (hitY.blocked) blocked = true;
    x = hitY.x;
    y = hitY.y;
  }

  return { x, y, blocked };
}

/**
 * @param {Maze} maze
 * @param {MazeLayout} layout
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 * @param {'x'|'y'} axis
 */
function resolveAxis(maze, layout, x, y, radius, axis) {
  // Sample nearby cells and push out of solid wall slabs
  let px = x;
  let py = y;
  let blocked = false;

  const cell = worldToCell(layout, maze, px, py);
  // Check walls of current + neighbors
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = cell.x + dx;
      const cy = cell.y + dy;
      const c = getCell(maze, cx, cy);
      if (!c) {
        // Out of bounds treated as solid — clamp later
        continue;
      }
      const bounds = cellBounds(layout, cx, cy);
      // Solid wall segments as thin AABBs along edges that are walled
      const t = Math.max(2, layout.wallThickness);
      if (c.north) {
        const r = pushCircleFromAabb(px, py, radius, bounds.left, bounds.top - t, bounds.right, bounds.top + t);
        if (r.hit) { px = r.x; py = r.y; if (axis === 'y') blocked = true; }
      }
      if (c.south) {
        const r = pushCircleFromAabb(px, py, radius, bounds.left, bounds.bottom - t, bounds.right, bounds.bottom + t);
        if (r.hit) { px = r.x; py = r.y; if (axis === 'y') blocked = true; }
      }
      if (c.west) {
        const r = pushCircleFromAabb(px, py, radius, bounds.left - t, bounds.top, bounds.left + t, bounds.bottom);
        if (r.hit) { px = r.x; py = r.y; if (axis === 'x') blocked = true; }
      }
      if (c.east) {
        const r = pushCircleFromAabb(px, py, radius, bounds.right - t, bounds.top, bounds.right + t, bounds.bottom);
        if (r.hit) { px = r.x; py = r.y; if (axis === 'x') blocked = true; }
      }
    }
  }

  // Keep inside overall maze outer bounds (inset by radius)
  const outer = mazeWorldBounds(layout, maze);
  const minX = outer.left + radius;
  const maxX = outer.right - radius;
  const minY = outer.top + radius;
  const maxY = outer.bottom - radius;
  if (px < minX) { px = minX; blocked = true; }
  if (px > maxX) { px = maxX; blocked = true; }
  if (py < minY) { py = minY; blocked = true; }
  if (py > maxY) { py = maxY; blocked = true; }

  return { x: px, y: py, blocked };
}

/**
 * @param {MazeLayout} layout
 * @param {number} cx
 * @param {number} cy
 */
function cellBounds(layout, cx, cy) {
  const left = layout.originX + cx * layout.cellSize;
  const top = layout.originY + cy * layout.cellSize;
  return {
    left,
    top,
    right: left + layout.cellSize,
    bottom: top + layout.cellSize,
  };
}

/**
 * @param {MazeLayout} layout
 * @param {MazeLike} maze
 */
export function mazeWorldBounds(layout, maze) {
  return {
    left: layout.originX,
    top: layout.originY,
    right: layout.originX + maze.cols * layout.cellSize,
    bottom: layout.originY + maze.rows * layout.cellSize,
  };
}

/**
 * Push circle center out of AABB if overlapping.
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @param {number} l
 * @param {number} t
 * @param {number} right
 * @param {number} b
 */
function pushCircleFromAabb(cx, cy, r, l, t, right, b) {
  // Closest point on AABB to circle center
  const qx = clamp(cx, l, right);
  const qy = clamp(cy, t, b);
  let dx = cx - qx;
  let dy = cy - qy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) {
    // If center is inside AABB, d2 can be 0 — still need push
    if (cx >= l && cx <= right && cy >= t && cy <= b) {
      // Push out along smallest penetration
      const penL = cx - l + r;
      const penR = right - cx + r;
      const penT = cy - t + r;
      const penB = b - cy + r;
      const m = Math.min(penL, penR, penT, penB);
      if (m === penL) return { x: l - r, y: cy, hit: true };
      if (m === penR) return { x: right + r, y: cy, hit: true };
      if (m === penT) return { x: cx, y: t - r, hit: true };
      return { x: cx, y: b + r, hit: true };
    }
    return { x: cx, y: cy, hit: false };
  }
  if (d2 < 1e-8) {
    return { x: cx, y: cy - r, hit: true };
  }
  const d = Math.sqrt(d2);
  const push = (r - d) / d;
  return { x: cx + dx * push, y: cy + dy * push, hit: true };
}

/**
 * Compute layout that fits maze into a rect (full-maze camera).
 * @param {MazeLike} maze
 * @param {number} viewW
 * @param {number} viewH
 * @param {number} [padding=16]
 * @returns {MazeLayout}
 */
export function layoutMazeToView(maze, viewW, viewH, padding = 16) {
  const availW = viewW - padding * 2;
  const availH = viewH - padding * 2 - 36; // leave HUD band
  const cellSize = Math.floor(Math.min(availW / maze.cols, availH / maze.rows));
  const gridW = cellSize * maze.cols;
  const gridH = cellSize * maze.rows;
  const originX = Math.floor((viewW - gridW) / 2);
  const originY = Math.floor((viewH - gridH) / 2) + 8;
  return {
    originX,
    originY,
    cellSize: Math.max(cellSize, 8),
    wallThickness: Math.max(3, Math.round(cellSize * 0.14)),
  };
}
