/**
 * Tap-to-move: resolve a tapped cell into a single adjacent step.
 * Kids tap the next square; fat-finger taps farther along a corridor still move one step.
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
 * Resolve a maze-cell tap into the next step cell (one square only).
 * - Same cell → null
 * - Adjacent open → that cell
 * - Farther / diagonal → one step in the dominant open direction toward the tap
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

  // Exact adjacent open cell
  const adjDx = tapX - playerX;
  const adjDy = tapY - playerY;
  if (Math.abs(adjDx) + Math.abs(adjDy) === 1) {
    /** @type {Dir} */
    let dir;
    if (adjDx === 1) dir = 'east';
    else if (adjDx === -1) dir = 'west';
    else if (adjDy === 1) dir = 'south';
    else dir = 'north';
    if (canStep(maze, playerX, playerY, dir, canEnter)) {
      return { x: tapX, y: tapY, dir };
    }
    return null;
  }

  // Directional assist: one step toward the tapped area if that door is open
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
