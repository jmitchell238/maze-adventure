/**
 * Guided movement: ease along corridor centers; pick next open direction at junctions.
 * Easier for ages 4–6 — reduces wall bumping.
 */

import { cellCenter, worldToCell } from './free.js';
import { getCell, dirDelta, opposite } from '../maze/model.js';
import { dist } from '../../core/math.js';

/**
 * @typedef {import('../maze/model.js').Maze} Maze
 * @typedef {import('../maze/model.js').Dir} Dir
 * @typedef {import('./free.js').MazeLayout} MazeLayout
 */

/**
 * @typedef {object} GuidedState
 * @property {number} cellX
 * @property {number} cellY
 * @property {Dir | null} heading
 * @property {number} x
 * @property {number} y
 */

/**
 * @param {Maze} maze
 * @param {MazeLayout} layout
 * @param {number} cellX
 * @param {number} cellY
 * @returns {GuidedState}
 */
export function createGuidedState(maze, layout, cellX, cellY) {
  const c = cellCenter(layout, cellX, cellY);
  return { cellX, cellY, heading: null, x: c.x, y: c.y };
}

/**
 * @param {Maze} maze
 * @param {number} cx
 * @param {number} cy
 * @returns {Dir[]}
 */
export function openDirs(maze, cx, cy) {
  const cell = getCell(maze, cx, cy);
  /** @type {Dir[]} */
  const dirs = [];
  if (!cell) return dirs;
  if (!cell.north) dirs.push('north');
  if (!cell.south) dirs.push('south');
  if (!cell.east) dirs.push('east');
  if (!cell.west) dirs.push('west');
  return dirs;
}

/**
 * Map input axis (-1..1) to preferred direction (null if neutral).
 * @param {number} ix
 * @param {number} iy
 * @returns {Dir | null}
 */
export function axisToDir(ix, iy) {
  if (Math.abs(ix) < 0.25 && Math.abs(iy) < 0.25) return null;
  if (Math.abs(ix) >= Math.abs(iy)) {
    return ix > 0 ? 'east' : 'west';
  }
  return iy > 0 ? 'south' : 'north';
}

/**
 * Advance guided player.
 * @param {Maze} maze
 * @param {MazeLayout} layout
 * @param {GuidedState} state
 * @param {{ x: number, y: number }} input axis
 * @param {number} speed world units/sec
 * @param {number} dt
 * @param {(cx: number, cy: number) => boolean} [canEnter]  default: always true
 * @returns {GuidedState & { moved: boolean }}
 */
export function integrateGuidedMove(maze, layout, state, input, speed, dt, canEnter) {
  const allow = canEnter || (() => true);
  let { cellX, cellY, heading, x, y } = state;
  const want = axisToDir(input.x, input.y);
  const center = cellCenter(layout, cellX, cellY);
  const nearCenter = dist(x, y, center.x, center.y) < Math.max(2, layout.cellSize * 0.12);

  // At center: choose / change heading
  if (nearCenter) {
    x = center.x;
    y = center.y;
    const opens = openDirs(maze, cellX, cellY).filter((dir) => {
      const { dx, dy } = dirDelta(dir);
      return allow(cellX + dx, cellY + dy);
    });
    if (want && opens.includes(want)) {
      heading = want;
    } else if (heading && !opens.includes(heading)) {
      heading = null;
    } else if (!heading && want) {
      heading = opens.includes(want) ? want : null;
    }
  } else if (want && heading && want === opposite(heading)) {
    heading = want;
  }

  if (!heading) {
    return { cellX, cellY, heading, x, y, moved: false };
  }

  const { dx, dy } = dirDelta(heading);
  const targetCell = { x: cellX + dx, y: cellY + dy };
  if (!allow(targetCell.x, targetCell.y)) {
    return { cellX, cellY, heading: null, x, y, moved: false };
  }
  const target = cellCenter(layout, targetCell.x, targetCell.y);
  const step = speed * dt;
  const ddx = target.x - x;
  const ddy = target.y - y;
  const len = Math.hypot(ddx, ddy);

  if (len <= step || len < 0.5) {
    // Arrive at next cell center
    cellX = targetCell.x;
    cellY = targetCell.y;
    x = target.x;
    y = target.y;
    // Continue if input holds, else stop at junction with >2 ways unless input
    const opens = openDirs(maze, cellX, cellY);
    if (want && opens.includes(want)) {
      heading = want;
    } else if (opens.includes(heading) && opens.length === 2) {
      // corridor: keep going
    } else if (!want || !opens.includes(heading)) {
      // stop at junction unless continuing straight is only non-back option and input held
      if (!(want && opens.includes(want))) {
        heading = opens.includes(heading) && want ? heading : null;
        if (!want) heading = null;
      }
    }
    return { cellX, cellY, heading, x, y, moved: true };
  }

  x += (ddx / len) * step;
  y += (ddy / len) * step;
  return { cellX, cellY, heading, x, y, moved: true };
}

/**
 * Sync guided cell from free world position (mode switch).
 * @param {Maze} maze
 * @param {MazeLayout} layout
 * @param {number} wx
 * @param {number} wy
 */
export function guidedFromWorld(maze, layout, wx, wy) {
  const cell = worldToCell(layout, maze, wx, wy);
  return createGuidedState(maze, layout, cell.x, cell.y);
}
