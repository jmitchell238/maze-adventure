/**
 * Base maze generation: recursive backtracker + optional loop injection.
 */

import { createFullWallGrid, carve, countPassages, cellIndex } from './model.js';

/**
 * @typedef {import('../rng.js').SeededRng} SeededRng
 * @typedef {import('./model.js').MazeLike} MazeLike
 * @typedef {import('./model.js').Dir} Dir
 */

/** @type {Dir[]} */
const DIRS = ['north', 'south', 'east', 'west'];

/**
 * Recursive backtracker (randomized DFS) — produces a perfect maze.
 * @param {number} rows
 * @param {number} cols
 * @param {SeededRng} rng
 * @returns {MazeLike}
 */
export function baseGenerate(rows, cols, rng) {
  if (rows < 2 || cols < 2) {
    throw new Error(`baseGenerate: invalid size ${rows}x${cols}`);
  }
  const cells = createFullWallGrid(rows, cols);
  const maze = { rows, cols, cells };

  const total = rows * cols;
  /** @type {Uint8Array} */
  const visited = new Uint8Array(total);
  const startX = rng.int(0, cols - 1);
  const startY = rng.int(0, rows - 1);
  const startIdx = cellIndex(maze, startX, startY);

  /** @type {number[]} */
  const stack = [startIdx];
  visited[startIdx] = 1;
  let visitedCount = 1;

  while (stack.length > 0 && visitedCount < total) {
    const cur = stack[stack.length - 1];
    const cx = cur % cols;
    const cy = (cur / cols) | 0;

    /** @type {{ dir: Dir, nx: number, ny: number, ni: number }[]} */
    const neighbors = [];
    for (const dir of DIRS) {
      let nx = cx;
      let ny = cy;
      if (dir === 'north') ny--;
      else if (dir === 'south') ny++;
      else if (dir === 'east') nx++;
      else if (dir === 'west') nx--;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const ni = cellIndex(maze, nx, ny);
      if (!visited[ni]) neighbors.push({ dir, nx, ny, ni });
    }

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    rng.shuffle(neighbors);
    const pick = neighbors[0];
    carve(maze, cx, cy, pick.dir);
    visited[pick.ni] = 1;
    visitedCount++;
    stack.push(pick.ni);
  }

  return maze;
}

/**
 * Knock down walls between adjacent cells with probability loopChance.
 * Caps extra loops to avoid open fields on low difficulties.
 * @param {MazeLike} maze
 * @param {number} loopChance 0..1
 * @param {SeededRng} rng
 * @returns {number} number of walls removed
 */
export function injectLoops(maze, loopChance, rng) {
  if (loopChance <= 0) return 0;
  const { rows, cols } = maze;
  const cellCount = rows * cols;
  // Cap extra edges relative to chance so Easy stays maze-like
  const maxExtra = Math.max(1, Math.floor(cellCount * loopChance * 1.5));
  let removed = 0;

  /** @type {{ x: number, y: number, dir: Dir }[]} */
  const candidates = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = maze.cells[y * cols + x];
      if (c.east && x < cols - 1) candidates.push({ x, y, dir: 'east' });
      if (c.south && y < rows - 1) candidates.push({ x, y, dir: 'south' });
    }
  }
  rng.shuffle(candidates);

  for (const cand of candidates) {
    if (removed >= maxExtra) break;
    if (rng.next() >= loopChance) continue;
    const cell = maze.cells[cand.y * cols + cand.x];
    // Still walled? (another iteration might have opened)
    if (cand.dir === 'east' && !cell.east) continue;
    if (cand.dir === 'south' && !cell.south) continue;
    if (carve(maze, cand.x, cand.y, cand.dir)) removed++;
  }
  return removed;
}

/**
 * Edge count expected for a perfect maze.
 * @param {number} rows
 * @param {number} cols
 */
export function perfectPassageCount(rows, cols) {
  return rows * cols - 1;
}

/**
 * True if maze has exactly the spanning-tree passage count (before loops).
 * @param {MazeLike} maze
 */
export function isPerfectMaze(maze) {
  return countPassages(maze) === perfectPassageCount(maze.rows, maze.cols);
}
