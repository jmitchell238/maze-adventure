/**
 * Grid pathfinding over maze wall model (BFS).
 */

/**
 * @typedef {import('./maze/model.js').MazeLike} MazeLike
 * @typedef {import('./maze/model.js').CellPos} CellPos
 */

/**
 * @param {MazeLike} maze
 * @param {CellPos} start
 * @param {CellPos} goal
 * @returns {number[] | null} cell indices entrance→exit, or null if unreachable
 */
export function bfsPath(maze, start, goal) {
  const { rows, cols } = maze;
  const startIdx = indexOf(maze, start.x, start.y);
  const goalIdx = indexOf(maze, goal.x, goal.y);
  if (startIdx < 0 || goalIdx < 0) return null;

  const n = rows * cols;
  /** @type {Int32Array} */
  const prev = new Int32Array(n);
  prev.fill(-1);
  /** @type {Uint8Array} */
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
    // North
    if (!cell.north && cy > 0) {
      const ni = cur - cols;
      if (!seen[ni]) { seen[ni] = 1; prev[ni] = cur; queue.push(ni); }
    }
    // South
    if (!cell.south && cy < rows - 1) {
      const ni = cur + cols;
      if (!seen[ni]) { seen[ni] = 1; prev[ni] = cur; queue.push(ni); }
    }
    // West
    if (!cell.west && cx > 0) {
      const ni = cur - 1;
      if (!seen[ni]) { seen[ni] = 1; prev[ni] = cur; queue.push(ni); }
    }
    // East
    if (!cell.east && cx < cols - 1) {
      const ni = cur + 1;
      if (!seen[ni]) { seen[ni] = 1; prev[ni] = cur; queue.push(ni); }
    }
  }

  if (!seen[goalIdx]) return null;

  /** @type {number[]} */
  const path = [];
  for (let at = goalIdx; at !== -1; at = prev[at]) {
    path.push(at);
    if (at === startIdx) break;
  }
  path.reverse();
  if (path[0] !== startIdx) return null;
  return path;
}

/**
 * Flood-fill all cells reachable from start.
 * @param {MazeLike} maze
 * @param {CellPos} start
 * @returns {Set<number>} cell indices
 */
export function floodReachable(maze, start) {
  const { rows, cols } = maze;
  const startIdx = indexOf(maze, start.x, start.y);
  /** @type {Set<number>} */
  const reached = new Set();
  if (startIdx < 0) return reached;

  /** @type {number[]} */
  const queue = [startIdx];
  reached.add(startIdx);
  let head = 0;

  while (head < queue.length) {
    const cur = queue[head++];
    const cx = cur % cols;
    const cy = (cur / cols) | 0;
    const cell = maze.cells[cur];
    if (!cell.north && cy > 0) {
      const ni = cur - cols;
      if (!reached.has(ni)) { reached.add(ni); queue.push(ni); }
    }
    if (!cell.south && cy < rows - 1) {
      const ni = cur + cols;
      if (!reached.has(ni)) { reached.add(ni); queue.push(ni); }
    }
    if (!cell.west && cx > 0) {
      const ni = cur - 1;
      if (!reached.has(ni)) { reached.add(ni); queue.push(ni); }
    }
    if (!cell.east && cx < cols - 1) {
      const ni = cur + 1;
      if (!reached.has(ni)) { reached.add(ni); queue.push(ni); }
    }
  }
  return reached;
}

/**
 * BFS distances from start to every reachable cell.
 * @param {MazeLike} maze
 * @param {CellPos} start
 * @returns {Int32Array} distance per cell index; -1 unreachable
 */
export function bfsDistances(maze, start) {
  const { rows, cols } = maze;
  const n = rows * cols;
  const distArr = new Int32Array(n);
  distArr.fill(-1);
  const startIdx = indexOf(maze, start.x, start.y);
  if (startIdx < 0) return distArr;

  /** @type {number[]} */
  const queue = [startIdx];
  distArr[startIdx] = 0;
  let head = 0;

  while (head < queue.length) {
    const cur = queue[head++];
    const d = distArr[cur];
    const cx = cur % cols;
    const cy = (cur / cols) | 0;
    const cell = maze.cells[cur];
    const tryN = (ni) => {
      if (distArr[ni] === -1) {
        distArr[ni] = d + 1;
        queue.push(ni);
      }
    };
    if (!cell.north && cy > 0) tryN(cur - cols);
    if (!cell.south && cy < rows - 1) tryN(cur + cols);
    if (!cell.west && cx > 0) tryN(cur - 1);
    if (!cell.east && cx < cols - 1) tryN(cur + 1);
  }
  return distArr;
}

/**
 * @param {MazeLike} maze
 * @param {number} x
 * @param {number} y
 */
function indexOf(maze, x, y) {
  if (x < 0 || y < 0 || x >= maze.cols || y >= maze.rows) return -1;
  return y * maze.cols + x;
}
