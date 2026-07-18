/**
 * Optional switch + gate placement for Hard+ mazes.
 * Gate blocks a solution cell until the switch is stepped on.
 * Switch is always reachable without crossing the gate.
 */

import { cellIndex, indexToPos } from './model.js';
import { bfsPath } from '../pathfinding.js';

/**
 * @typedef {import('../rng.js').SeededRng} SeededRng
 * @typedef {import('./model.js').MazeLike} MazeLike
 * @typedef {import('./model.js').CellPos} CellPos
 * @typedef {import('../difficulty.js').DifficultyProfile} DifficultyProfile
 */

/**
 * @typedef {object} SwitchGate
 * @property {CellPos} switchPos
 * @property {CellPos} gatePos
 */

/**
 * BFS path avoiding a blocked cell index.
 * @param {MazeLike} maze
 * @param {CellPos} start
 * @param {CellPos} goal
 * @param {number} blockedIdx  -1 = none
 * @returns {number[] | null}
 */
export function bfsPathAvoiding(maze, start, goal, blockedIdx) {
  const { rows, cols } = maze;
  const startIdx = cellIndex(maze, start.x, start.y);
  const goalIdx = cellIndex(maze, goal.x, goal.y);
  if (startIdx < 0 || goalIdx < 0) return null;
  if (startIdx === blockedIdx || goalIdx === blockedIdx) return null;

  const n = rows * cols;
  const prev = new Int32Array(n);
  prev.fill(-1);
  const seen = new Uint8Array(n);
  /** @type {number[]} */
  const queue = [startIdx];
  seen[startIdx] = 1;
  let head = 0;

  while (head < queue.length) {
    const cur = queue[head++];
    if (cur === goalIdx) break;
    const cx = cur % cols;
    const cy = (cur / cols) | 0;
    const cell = maze.cells[cur];
    const tryN = (ni) => {
      if (ni === blockedIdx) return;
      if (!seen[ni]) {
        seen[ni] = 1;
        prev[ni] = cur;
        queue.push(ni);
      }
    };
    if (!cell.north && cy > 0) tryN(cur - cols);
    if (!cell.south && cy < rows - 1) tryN(cur + cols);
    if (!cell.west && cx > 0) tryN(cur - 1);
    if (!cell.east && cx < cols - 1) tryN(cur + 1);
  }

  if (!seen[goalIdx]) return null;
  /** @type {number[]} */
  const path = [];
  for (let at = goalIdx; at !== -1; at = prev[at]) {
    path.push(at);
    if (at === startIdx) break;
  }
  path.reverse();
  return path[0] === startIdx ? path : null;
}

/**
 * Flood reachable from start avoiding blocked cell.
 * @param {MazeLike} maze
 * @param {CellPos} start
 * @param {number} blockedIdx
 * @returns {Set<number>}
 */
export function floodAvoiding(maze, start, blockedIdx) {
  const { rows, cols } = maze;
  const startIdx = cellIndex(maze, start.x, start.y);
  /** @type {Set<number>} */
  const reached = new Set();
  if (startIdx < 0 || startIdx === blockedIdx) return reached;
  /** @type {number[]} */
  const queue = [startIdx];
  reached.add(startIdx);
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const cx = cur % cols;
    const cy = (cur / cols) | 0;
    const cell = maze.cells[cur];
    const tryN = (ni) => {
      if (ni === blockedIdx || reached.has(ni)) return;
      reached.add(ni);
      queue.push(ni);
    };
    if (!cell.north && cy > 0) tryN(cur - cols);
    if (!cell.south && cy < rows - 1) tryN(cur + cols);
    if (!cell.west && cx > 0) tryN(cur - 1);
    if (!cell.east && cx < cols - 1) tryN(cur + 1);
  }
  return reached;
}

/**
 * Place switch + gate or return null if not suitable.
 * @param {MazeLike} maze
 * @param {CellPos} entrance
 * @param {CellPos} exit
 * @param {number[]} solution
 * @param {DifficultyProfile} profile
 * @param {SeededRng} rng
 * @returns {SwitchGate | null}
 */
export function placeSwitchGate(maze, entrance, exit, solution, profile, rng) {
  const chance = profile.gateChance != null ? profile.gateChance : 0;
  if (chance <= 0 || rng.next() >= chance) return null;
  if (solution.length < 6) return null;

  // Candidate gate cells: middle portion of solution (not first/last 2)
  const lo = 2;
  const hi = solution.length - 3;
  if (hi < lo) return null;

  /** @type {number[]} */
  const gateCandidates = [];
  for (let i = lo; i <= hi; i++) gateCandidates.push(solution[i]);
  rng.shuffle(gateCandidates);

  const entranceIdx = cellIndex(maze, entrance.x, entrance.y);
  const exitIdx = cellIndex(maze, exit.x, exit.y);

  for (const gateIdx of gateCandidates.slice(0, 12)) {
    if (gateIdx === entranceIdx || gateIdx === exitIdx) continue;

    // Exit must NOT be reachable while gate is closed (forces switch use)
    const pathClosed = bfsPathAvoiding(maze, entrance, exit, gateIdx);
    if (pathClosed) continue; // alternate route exists — skip this gate

    // Switch: any cell reachable avoiding gate, not entrance/exit/gate, preferably off main path
    const reachable = floodAvoiding(maze, entrance, gateIdx);
    /** @type {number[]} */
    const switchPool = [];
    for (const idx of reachable) {
      if (idx === entranceIdx || idx === gateIdx || idx === exitIdx) continue;
      switchPool.push(idx);
    }
    if (!switchPool.length) continue;

    // Prefer cells not on solution (side branches) for exploration feel
    const solSet = new Set(solution);
    const side = switchPool.filter((i) => !solSet.has(i));
    const pool = side.length ? side : switchPool;
    const switchIdx = rng.pick(pool);

    // Sanity: from switch, with gate still closed, we stay on reachable side
    // Opening gate: full path exists
    const pathOpen = bfsPath(maze, entrance, exit);
    if (!pathOpen) continue;

    return {
      switchPos: indexToPos(maze, switchIdx),
      gatePos: indexToPos(maze, gateIdx),
    };
  }
  return null;
}

/**
 * @param {CellPos | null | undefined} a
 * @param {CellPos | null | undefined} b
 */
export function sameCell(a, b) {
  return !!(a && b && a.x === b.x && a.y === b.y);
}
