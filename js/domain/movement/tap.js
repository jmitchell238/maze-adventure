/**
 * Tap-to-move: resolve a tapped cell into a walk goal along an open straight corridor.
 * Kids tap the end of a clear row/column run (1–N cells) and walk all the way there.
 */

import { getCell, dirDelta } from '../maze/model.js';
import { openDirs } from './guided.js';

/**
 * @typedef {import('../maze/model.js').Maze} Maze
 * @typedef {import('../maze/model.js').Dir} Dir
 */

/**
 * Whether an open passage exists from (fromX,fromY) into the neighbor in `dir`.
 * @param {Maze} maze
 * @param {number} fromX
 * @param {number} fromY
 * @param {Dir} dir
 * @param {(cx: number, cy: number) => boolean} [canEnter]
 */
export function canStep(maze, fromX, fromY, dir, canEnter) {
  const opens = openDirs(maze, fromX, fromY);
  if (!opens.includes(dir)) return false;
  const { dx, dy } = dirDelta(dir);
  const nx = fromX + dx;
  const ny = fromY + dy;
  if (!getCell(maze, nx, ny)) return false;
  if (canEnter && !canEnter(nx, ny)) return false;
  return true;
}

/**
 * Dominant cardinal direction from player cell toward a tap cell (null if same).
 * @param {number} fromX
 * @param {number} fromY
 * @param {number} toX
 * @param {number} toY
 * @returns {Dir | null}
 */
export function dirTowardCell(fromX, fromY, toX, toY) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? 'east' : 'west';
  }
  return dy > 0 ? 'south' : 'north';
}

/**
 * Walk as far as an open straight corridor allows from the player toward (tapX,tapY).
 * Only axis-aligned (same row or column). Stops at the tapped cell if fully open,
 * or at the last reachable cell before a wall/gate.
 *
 * @param {Maze} maze
 * @param {number} playerX
 * @param {number} playerY
 * @param {number} tapX
 * @param {number} tapY
 * @param {(cx: number, cy: number) => boolean} [canEnter]
 * @returns {{ x: number, y: number, dir: Dir } | null}
 */
export function resolveStraightTap(maze, playerX, playerY, tapX, tapY, canEnter) {
  const dx = tapX - playerX;
  const dy = tapY - playerY;
  if (dx === 0 && dy === 0) return null;
  // Must be a straight line (row or column)
  if (dx !== 0 && dy !== 0) return null;

  /** @type {Dir} */
  const dir = dx > 0 ? 'east' : dx < 0 ? 'west' : dy > 0 ? 'south' : 'north';
  const { dx: sdx, dy: sdy } = dirDelta(dir);
  const steps = Math.abs(dx) + Math.abs(dy);

  let x = playerX;
  let y = playerY;
  let reached = 0;
  for (let i = 0; i < steps; i++) {
    if (!canStep(maze, x, y, dir, canEnter)) break;
    x += sdx;
    y += sdy;
    reached += 1;
  }
  if (reached === 0) return null;
  return { x, y, dir };
}

/**
 * Resolve a maze-cell tap into a walk goal.
 * - Same cell → null
 * - Straight open corridor (1–N cells) → go all the way to the tapped cell (or last open)
 * - Off-axis (diagonal / fat finger) → one step in the dominant open direction, if any
 *
 * @param {Maze} maze
 * @param {number} playerX
 * @param {number} playerY
 * @param {number} tapX
 * @param {number} tapY
 * @param {(cx: number, cy: number) => boolean} [canEnter]
 * @returns {{ x: number, y: number, dir: Dir } | null}
 */
export function resolveTapStep(maze, playerX, playerY, tapX, tapY, canEnter) {
  if (tapX === playerX && tapY === playerY) return null;

  // Preferred: full straight-line run to the tapped square
  const straight = resolveStraightTap(maze, playerX, playerY, tapX, tapY, canEnter);
  if (straight) return straight;

  // Off-axis fat finger: one step toward the tap if that door is open
  const dir = dirTowardCell(playerX, playerY, tapX, tapY);
  if (!dir) return null;
  if (!canStep(maze, playerX, playerY, dir, canEnter)) return null;
  const { dx, dy } = dirDelta(dir);
  return { x: playerX + dx, y: playerY + dy, dir };
}

/**
 * Axis vector for a direction (unit stick input).
 * @param {Dir} dir
 * @returns {{ x: number, y: number }}
 */
export function dirToAxis(dir) {
  if (dir === 'east') return { x: 1, y: 0 };
  if (dir === 'west') return { x: -1, y: 0 };
  if (dir === 'south') return { x: 0, y: 1 };
  return { x: 0, y: -1 };
}
