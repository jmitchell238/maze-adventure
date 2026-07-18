/**
 * Child-friendly assist: dead-end detection, next correct step from solution.
 */

import { openEdgeCount, cellIndex, indexToPos, dirDelta } from '../maze/model.js';
import { openDirs } from './guided.js';

/**
 * @typedef {import('../maze/model.js').Maze} Maze
 * @typedef {import('../maze/model.js').Dir} Dir
 * @typedef {import('../maze/model.js').CellPos} CellPos
 */

/**
 * True if cell is a dead end (exactly one open edge), excluding entrance/exit.
 * @param {Maze} maze
 * @param {number} cx
 * @param {number} cy
 */
export function isDeadEndCell(maze, cx, cy) {
  const idx = cellIndex(maze, cx, cy);
  const en = cellIndex(maze, maze.entrance.x, maze.entrance.y);
  const ex = cellIndex(maze, maze.exit.x, maze.exit.y);
  if (idx === en || idx === ex) return false;
  return openEdgeCount(maze.cells[idx]) === 1;
}

/**
 * Index of player cell on solution path, or nearest solution index if off-path.
 * @param {Maze} maze
 * @param {number} playerIdx
 * @returns {number} index into maze.solution (0..len-1)
 */
export function solutionCursor(maze, playerIdx) {
  const sol = maze.solution;
  const direct = sol.indexOf(playerIdx);
  if (direct >= 0) return direct;
  // nearest by path index distance using BFS order approximation: scan
  let best = 0;
  let bestD = Infinity;
  const pc = indexToPos(maze, playerIdx);
  for (let i = 0; i < sol.length; i++) {
    const c = indexToPos(maze, sol[i]);
    const d = Math.abs(c.x - pc.x) + Math.abs(c.y - pc.y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/**
 * Next cell index along solution after player's position.
 * @param {Maze} maze
 * @param {number} playerIdx
 * @returns {number | null}
 */
export function nextSolutionCell(maze, playerIdx) {
  const cur = solutionCursor(maze, playerIdx);
  if (cur >= maze.solution.length - 1) return maze.solution[maze.solution.length - 1];
  // If player is on path, next step; if off path, nearest then next
  if (maze.solution[cur] === playerIdx) {
    return maze.solution[cur + 1];
  }
  return maze.solution[cur];
}

/**
 * Preferred direction toward next solution step (for arrow / pulse).
 * @param {Maze} maze
 * @param {number} playerIdx
 * @returns {Dir | null}
 */
export function hintDirection(maze, playerIdx) {
  const next = nextSolutionCell(maze, playerIdx);
  if (next == null) return null;
  const a = indexToPos(maze, playerIdx);
  const b = indexToPos(maze, next);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) + Math.abs(dy) !== 1) {
    // not adjacent — pick open dir reducing manhattan to next
    const opens = openDirs(maze, a.x, a.y);
    let best = null;
    let bestScore = Infinity;
    for (const dir of opens) {
      const { dx: ddx, dy: ddy } = dirDelta(dir);
      const nx = a.x + ddx;
      const ny = a.y + ddy;
      const score = Math.abs(nx - b.x) + Math.abs(ny - b.y);
      if (score < bestScore) {
        bestScore = score;
        best = dir;
      }
    }
    return best;
  }
  if (dx === 1) return 'east';
  if (dx === -1) return 'west';
  if (dy === 1) return 'south';
  if (dy === -1) return 'north';
  return null;
}

/**
 * Slice of solution indices to show for a hint (footprints).
 * @param {Maze} maze
 * @param {number} playerIdx
 * @param {number} [count=5]
 * @returns {number[]}
 */
export function hintTrail(maze, playerIdx, count = 5) {
  const cur = solutionCursor(maze, playerIdx);
  const start = maze.solution[cur] === playerIdx ? cur : cur;
  return maze.solution.slice(start, Math.min(maze.solution.length, start + count));
}
