/**
 * Difficulty metrics and score for a generated maze.
 */

import { norm01 } from '../../core/math.js';
import { bfsDistances } from '../pathfinding.js';
import { countPassages, openEdgeCount, cellIndex } from './model.js';

/**
 * @typedef {import('./model.js').Maze} Maze
 * @typedef {import('./model.js').MazeLike} MazeLike
 * @typedef {import('./model.js').MazeMetrics} MazeMetrics
 * @typedef {import('./model.js').CellPos} CellPos
 */

/**
 * Analyze maze topology + solution.
 * @param {MazeLike} maze
 * @param {CellPos} entrance
 * @param {CellPos} exit
 * @param {number[]} solution cell indices
 * @returns {MazeMetrics}
 */
export function analyzeMaze(maze, entrance, exit, solution) {
  const cellCount = maze.rows * maze.cols;
  const solutionLength = Math.max(0, solution.length - 1);
  const solutionRatio = cellCount > 0 ? solutionLength / cellCount : 0;

  const entranceIdx = cellIndex(maze, entrance.x, entrance.y);
  const exitIdx = cellIndex(maze, exit.x, exit.y);

  let deadEnds = 0;
  let intersections = 0;
  for (let i = 0; i < maze.cells.length; i++) {
    const edges = openEdgeCount(maze.cells[i]);
    if (edges === 1 && i !== entranceIdx && i !== exitIdx) deadEnds++;
    if (edges >= 3) intersections++;
  }
  const deadEndRatio = cellCount > 0 ? deadEnds / cellCount : 0;

  // Decision points: junctions on the solution path with a branch
  let decisionPoints = 0;
  for (const idx of solution) {
    if (openEdgeCount(maze.cells[idx]) >= 3) decisionPoints++;
  }

  const passages = countPassages(maze);
  const perfect = cellCount - 1;
  const loopCount = Math.max(0, passages - perfect);

  // Average corridor length between junctions
  const avgCorridorLength = estimateAvgCorridorLength(maze);

  // Max graph distance from any cell to nearest solution cell
  let maxDistFromSolution = 0;
  if (solution.length) {
    const dist = new Int32Array(cellCount);
    dist.fill(-1);
    /** @type {number[]} */
    const q = [];
    for (const si of solution) {
      dist[si] = 0;
      q.push(si);
    }
    let head = 0;
    const { rows, cols, cells } = maze;
    while (head < q.length) {
      const cur = q[head++];
      const d = dist[cur];
      const cx = cur % cols;
      const cy = (cur / cols) | 0;
      const cell = cells[cur];
      const tryN = (ni) => {
        if (dist[ni] === -1) {
          dist[ni] = d + 1;
          q.push(ni);
        }
      };
      if (!cell.north && cy > 0) tryN(cur - cols);
      if (!cell.south && cy < rows - 1) tryN(cur + cols);
      if (!cell.west && cx > 0) tryN(cur - 1);
      if (!cell.east && cx < cols - 1) tryN(cur + 1);
    }
    for (let i = 0; i < cellCount; i++) {
      if (dist[i] > maxDistFromSolution) maxDistFromSolution = dist[i];
    }
  }

  const manhattanEntranceExit =
    Math.abs(exit.x - entrance.x) + Math.abs(exit.y - entrance.y);

  const difficultyScore = computeDifficultyScore({
    solutionRatio,
    deadEndRatio,
    intersections,
    cellCount,
    maxDistFromSolution,
    rows: maze.rows,
    cols: maze.cols,
    loopCount,
    solutionLength,
  });

  return {
    solutionLength,
    cellCount,
    solutionRatio,
    deadEnds,
    deadEndRatio,
    intersections,
    decisionPoints,
    loopCount,
    avgCorridorLength,
    maxDistFromSolution,
    manhattanEntranceExit,
    difficultyScore,
  };
}

/**
 * Weighted 0–100 difficulty score.
 * Size and absolute solution length dominate so Easy (small) and Very Hard (large)
 * separate cleanly; topology metrics fine-tune within a size band.
 *
 * @param {object} p
 * @param {number} p.solutionRatio
 * @param {number} p.deadEndRatio
 * @param {number} p.intersections
 * @param {number} p.cellCount
 * @param {number} p.maxDistFromSolution
 * @param {number} p.rows
 * @param {number} p.cols
 * @param {number} p.loopCount
 * @param {number} p.solutionLength
 */
export function computeDifficultyScore(p) {
  // Primary: grid scale (5×5≈25 cells → ~0; 25×25=625 → ~1)
  const sizeN = norm01(Math.sqrt(p.cellCount), 5, 25);
  // Absolute shortest path length (kids short, challenge long)
  const pathN = norm01(p.solutionLength, 4, 80);
  // Topology fine-tune
  const deadN = norm01(p.deadEndRatio, 0.05, 0.35);
  const juncN = norm01(p.intersections / Math.max(p.cellCount, 1), 0.02, 0.22);
  const loopN = norm01(p.loopCount / Math.max(p.cellCount, 1), 0, 0.15);
  const branchN = norm01(
    p.maxDistFromSolution / Math.max(p.rows, p.cols, 1),
    0,
    0.5,
  );
  const ratioN = norm01(p.solutionRatio, 0.08, 0.5);

  const score =
    34 * sizeN +
    28 * pathN +
    10 * deadN +
    10 * juncN +
    8 * loopN +
    5 * branchN +
    5 * ratioN;

  return Math.round(clampScore(score) * 10) / 10;
}

/** @param {number} s */
function clampScore(s) {
  return s < 0 ? 0 : s > 100 ? 100 : s;
}

/**
 * Mean run length of corridors between cells with degree ≠ 2.
 * @param {MazeLike} maze
 */
function estimateAvgCorridorLength(maze) {
  const { rows, cols, cells } = maze;
  let runs = 0;
  let totalLen = 0;

  // Horizontal runs
  for (let y = 0; y < rows; y++) {
    let len = 0;
    for (let x = 0; x < cols; x++) {
      const c = cells[y * cols + x];
      const openE = !c.east && x < cols - 1;
      if (openE) {
        len++;
      } else {
        if (len > 0) {
          runs++;
          totalLen += len;
          len = 0;
        }
      }
    }
  }
  // Vertical runs
  for (let x = 0; x < cols; x++) {
    let len = 0;
    for (let y = 0; y < rows; y++) {
      const c = cells[y * cols + x];
      const openS = !c.south && y < rows - 1;
      if (openS) {
        len++;
      } else {
        if (len > 0) {
          runs++;
          totalLen += len;
          len = 0;
        }
      }
    }
  }

  return runs > 0 ? totalLen / runs : 0;
}

/**
 * Recompute solution length via distances (sanity).
 * @param {MazeLike} maze
 * @param {CellPos} entrance
 * @param {CellPos} exit
 */
export function solutionLengthBetween(maze, entrance, exit) {
  const dist = bfsDistances(maze, entrance);
  const idx = cellIndex(maze, exit.x, exit.y);
  return dist[idx];
}
