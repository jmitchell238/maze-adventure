/**
 * Guided movement: ease along corridor centers; pick next open direction at junctions.
 * Easier for ages 4–6 — reduces wall bumping.
 *
 * Contract (enforced by tests/run.mjs → "guided stuck regression"):
 * 1. Holding an open direction MUST leave the start cell at 30–240Hz.
 *    Never snap-to-center while a heading is already set (step can be < center
 *    epsilon on high-refresh phones — that was the stuck-on-first-cell bug).
 * 2. Once a heading is chosen, commit through the leg even if the stick blips
 *    to neutral (phone touch jitter). Re-evaluate mainly on arrival.
 * 3. Stick aimed into a wall may assist into the nearest open direction.
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

/** Distance from cell center considered "at rest / decision point" (px). */
export const GUIDED_CENTER_EPS = 1.25;

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
  if (Math.abs(ix) < 0.18 && Math.abs(iy) < 0.18) return null;
  if (Math.abs(ix) >= Math.abs(iy)) {
    return ix > 0 ? 'east' : 'west';
  }
  return iy > 0 ? 'south' : 'north';
}

/**
 * @param {Dir} dir
 */
function dirVec(dir) {
  if (dir === 'east') return { x: 1, y: 0 };
  if (dir === 'west') return { x: -1, y: 0 };
  if (dir === 'south') return { x: 0, y: 1 };
  return { x: 0, y: -1 };
}

/**
 * Pick best open direction for stick input (assist when aiming into a wall).
 * @param {Dir[]} opens
 * @param {number} ix
 * @param {number} iy
 * @returns {Dir | null}
 */
export function pickOpenDir(opens, ix, iy) {
  if (!opens.length) return null;
  if (Math.abs(ix) < 0.18 && Math.abs(iy) < 0.18) return null;

  const primary = axisToDir(ix, iy);
  if (primary && opens.includes(primary)) return primary;

  let best = null;
  let bestScore = 0.25;
  for (const dir of opens) {
    const v = dirVec(dir);
    const score = v.x * ix + v.y * iy;
    if (score > bestScore) {
      bestScore = score;
      best = dir;
    }
  }
  return best;
}

/**
 * Open directions from a cell that `canEnter` allows.
 * @param {Maze} maze
 * @param {number} cellX
 * @param {number} cellY
 * @param {(cx: number, cy: number) => boolean} allow
 * @returns {Dir[]}
 */
function allowedOpens(maze, cellX, cellY, allow) {
  return openDirs(maze, cellX, cellY).filter((dir) => {
    const { dx, dy } = dirDelta(dir);
    return allow(cellX + dx, cellY + dy);
  });
}

/**
 * Advance guided player one frame.
 * @param {Maze} maze
 * @param {MazeLayout} layout
 * @param {GuidedState} state
 * @param {{ x: number, y: number }} input axis
 * @param {number} speed world units/sec
 * @param {number} dt
 * @param {(cx: number, cy: number) => boolean} [canEnter]
 * @returns {GuidedState & { moved: boolean }}
 */
export function integrateGuidedMove(maze, layout, state, input, speed, dt, canEnter) {
  const allow = canEnter || (() => true);
  let { cellX, cellY, heading, x, y } = state;
  const step = Math.max(0, speed * dt);
  if (step <= 0) {
    return { cellX, cellY, heading, x, y, moved: false };
  }

  const center = cellCenter(layout, cellX, cellY);
  const distCenter = dist(x, y, center.x, center.y);
  const nearCenter = distCenter <= GUIDED_CENTER_EPS;
  const opensHere = allowedOpens(maze, cellX, cellY, allow);
  const want = pickOpenDir(opensHere, input.x, input.y);
  const rawWant = axisToDir(input.x, input.y);

  // --- Direction selection near a cell center --------------------------------
  // CRITICAL: never snap-to-center while a heading is already set and matches
  // the stick. At high refresh rates step < GUIDED_CENTER_EPS, so snapping every
  // frame traps the player at the origin (proven by tests/run.mjs regression).
  if (nearCenter && !heading) {
    x = center.x;
    y = center.y;
    if (want) heading = want;
  } else if (nearCenter && heading) {
    if (want && want !== heading) {
      // Redirect only while still near center — snap then take new heading
      x = center.x;
      y = center.y;
      heading = want;
    } else if (!rawWant && distCenter < 0.01) {
      // Truly parked on center with stick released
      heading = null;
      x = center.x;
      y = center.y;
    } else if (heading && !opensHere.includes(heading)) {
      heading = want || null;
      x = center.x;
      y = center.y;
    }
    // else: keep heading and DO NOT snap — fall through to travel
  } else if (heading) {
    // Mid-travel: commit to current leg. Only reverse is allowed mid-cell.
    if (rawWant && rawWant === opposite(heading) && opensHere.includes(rawWant)) {
      heading = rawWant;
    }
  } else if (distCenter > GUIDED_CENTER_EPS) {
    // Off-center with no heading (mode switch): pull back to center
    const pull = Math.min(step, distCenter);
    x += ((center.x - x) / distCenter) * pull;
    y += ((center.y - y) / distCenter) * pull;
    return { cellX, cellY, heading, x, y, moved: true };
  }

  if (!heading) {
    return { cellX, cellY, heading, x, y, moved: false };
  }

  if (!opensHere.includes(heading)) {
    return { cellX, cellY, heading: null, x: center.x, y: center.y, moved: false };
  }

  const { dx, dy } = dirDelta(heading);
  const targetCell = { x: cellX + dx, y: cellY + dy };
  if (!allow(targetCell.x, targetCell.y)) {
    return { cellX, cellY, heading: null, x: center.x, y: center.y, moved: false };
  }

  const target = cellCenter(layout, targetCell.x, targetCell.y);
  const ddx = target.x - x;
  const ddy = target.y - y;
  const len = Math.hypot(ddx, ddy);

  // Arrive at next cell
  if (len <= step || len <= GUIDED_CENTER_EPS) {
    cellX = targetCell.x;
    cellY = targetCell.y;
    x = target.x;
    y = target.y;

    const opens = allowedOpens(maze, cellX, cellY, allow);
    const nextWant = pickOpenDir(opens, input.x, input.y);

    if (nextWant) {
      heading = nextWant;
    } else if (opens.includes(heading) && opens.length === 2) {
      // Corridor: keep coasting if stick went soft
    } else {
      // Junction or dead-end: stop and wait for clear input
      heading = null;
    }
    return { cellX, cellY, heading, x, y, moved: true };
  }

  // Travel toward next center — never snap back to previous center
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
