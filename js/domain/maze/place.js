/**
 * Entrance, exit, and collectible placement.
 */

import { GEN } from '../../config/index.js';
import { bfsPath, bfsDistances, floodReachable } from '../pathfinding.js';
import { cellIndex, indexToPos, openEdgeCount } from './model.js';

/**
 * @typedef {import('../rng.js').SeededRng} SeededRng
 * @typedef {import('./model.js').MazeLike} MazeLike
 * @typedef {import('./model.js').CellPos} CellPos
 * @typedef {import('./model.js').Collectible} Collectible
 * @typedef {import('../difficulty.js').DifficultyProfile} DifficultyProfile
 */

/**
 * Border cell positions (perimeter).
 * @param {number} rows
 * @param {number} cols
 * @returns {CellPos[]}
 */
export function borderCells(rows, cols) {
  /** @type {CellPos[]} */
  const out = [];
  for (let x = 0; x < cols; x++) {
    out.push({ x, y: 0 });
    if (rows > 1) out.push({ x, y: rows - 1 });
  }
  for (let y = 1; y < rows - 1; y++) {
    out.push({ x: 0, y });
    if (cols > 1) out.push({ x: cols - 1, y });
  }
  return out;
}

/**
 * Place entrance and exit: sample border pairs, prefer longer shortest paths.
 * @param {MazeLike} maze
 * @param {DifficultyProfile} profile
 * @param {SeededRng} rng
 * @returns {{ entrance: CellPos, exit: CellPos, solution: number[] } | null}
 */
export function placeEntranceExit(maze, profile, rng) {
  const borders = borderCells(maze.rows, maze.cols);
  if (borders.length < 2) return null;

  const trials = GEN.entranceExitTrials;
  /** @type {{ entrance: CellPos, exit: CellPos, solution: number[], len: number } | null} */
  let best = null;

  for (let t = 0; t < trials; t++) {
    const a = rng.pick(borders);
    let b = rng.pick(borders);
    let guard = 0;
    while (a.x === b.x && a.y === b.y && guard++ < 20) {
      b = rng.pick(borders);
    }
    if (a.x === b.x && a.y === b.y) continue;

    const solution = bfsPath(maze, a, b);
    if (!solution || solution.length < 2) continue;
    const len = solution.length - 1; // steps
    if (len < profile.minSolutionLength) continue;

    if (!best || len > best.len) {
      best = { entrance: { x: a.x, y: a.y }, exit: { x: b.x, y: b.y }, solution, len };
    }
  }

  // Fallback: farthest cell from a fixed border start via distances
  if (!best) {
    const start = rng.pick(borders);
    const dist = bfsDistances(maze, start);
    let farIdx = cellIndex(maze, start.x, start.y);
    let farD = -1;
    for (let i = 0; i < dist.length; i++) {
      if (dist[i] > farD) {
        farD = dist[i];
        farIdx = i;
      }
    }
    if (farD < 1) return null;
    const exit = indexToPos(maze, farIdx);
    const solution = bfsPath(maze, start, exit);
    if (!solution) return null;
    best = {
      entrance: { x: start.x, y: start.y },
      exit,
      solution,
      len: solution.length - 1,
    };
  }

  return {
    entrance: best.entrance,
    exit: best.exit,
    solution: best.solution.slice(),
  };
}

/**
 * Place collectibles on reachable open cells (not entrance/exit).
 * Easy: bias toward solution path neighborhood.
 * @param {MazeLike} maze
 * @param {CellPos} entrance
 * @param {CellPos} exit
 * @param {number[]} solution
 * @param {DifficultyProfile} profile
 * @param {SeededRng} rng
 * @param {number[]} [forbiddenIdx]  extra cells to skip (switch/gate)
 * @returns {Collectible[]}
 */
export function placeCollectibles(maze, entrance, exit, solution, profile, rng, forbiddenIdx = []) {
  const [minC, maxC] = profile.collectibleCount;
  const count = rng.int(minC, maxC);
  if (count <= 0) return [];

  const reachable = floodReachable(maze, entrance);
  const entranceIdx = cellIndex(maze, entrance.x, entrance.y);
  const exitIdx = cellIndex(maze, exit.x, exit.y);
  const banned = new Set(forbiddenIdx);
  banned.add(entranceIdx);
  banned.add(exitIdx);
  const solutionSet = new Set(solution);

  // Distance to nearest solution cell (for Easy weighting)
  const solDist = new Int32Array(maze.rows * maze.cols);
  solDist.fill(9999);
  {
    /** @type {number[]} */
    const q = [];
    for (const si of solution) {
      solDist[si] = 0;
      q.push(si);
    }
    let head = 0;
    const { rows, cols, cells } = maze;
    while (head < q.length) {
      const cur = q[head++];
      const d = solDist[cur];
      const cx = cur % cols;
      const cy = (cur / cols) | 0;
      const cell = cells[cur];
      const tryN = (ni) => {
        if (solDist[ni] > d + 1) {
          solDist[ni] = d + 1;
          q.push(ni);
        }
      };
      if (!cell.north && cy > 0) tryN(cur - cols);
      if (!cell.south && cy < rows - 1) tryN(cur + cols);
      if (!cell.west && cx > 0) tryN(cur - 1);
      if (!cell.east && cx < cols - 1) tryN(cur + 1);
    }
  }

  /** @type {number[]} */
  const candidates = [];
  for (const idx of reachable) {
    if (banned.has(idx)) continue;
    candidates.push(idx);
  }
  if (!candidates.length) return [];

  /** @type {Collectible[]} */
  const out = [];
  const used = new Set();

  // Weighted sampling without replacement
  for (let n = 0; n < count && candidates.length > used.size; n++) {
    /** @type {number[]} */
    const pool = [];
    /** @type {number[]} */
    const weights = [];
    for (const idx of candidates) {
      if (used.has(idx)) continue;
      pool.push(idx);
      // Easy / pathGlow: prefer near solution; harder: flatter
      const preferPath = profile.pathGlowDefault || profile.id === 'easy';
      let w = 1;
      if (preferPath) {
        const d = solDist[idx];
        w = d <= 1 ? 8 : d <= 2 ? 4 : d <= 4 ? 2 : 1;
        if (solutionSet.has(idx) && d === 0) w = 6;
      } else {
        // Slight preference for junctions (interesting) on hard
        const cell = maze.cells[idx];
        const edges = openEdgeCount(cell);
        w = edges >= 3 ? 2 : 1;
      }
      weights.push(w);
    }
    if (!pool.length) break;

    let total = 0;
    for (const w of weights) total += w;
    let r = rng.next() * total;
    let chosen = pool[0];
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        chosen = pool[i];
        break;
      }
    }
    used.add(chosen);
    const pos = indexToPos(maze, chosen);
    out.push({ x: pos.x, y: pos.y, id: `c${n}` });
  }

  return out;
}
