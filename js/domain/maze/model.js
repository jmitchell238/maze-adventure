/**
 * Logical maze grid model (walls per cell).
 * Coordinates: (0,0) top-left; +x east; +y south.
 */

/**
 * @typedef {object} CellPos
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {object} MazeCell
 * @property {number} x
 * @property {number} y
 * @property {boolean} north  // wall present
 * @property {boolean} south
 * @property {boolean} east
 * @property {boolean} west
 * @property {boolean} open
 */

/**
 * @typedef {object} Collectible
 * @property {number} x
 * @property {number} y
 * @property {string} id
 */

/**
 * @typedef {object} MazeMetrics
 * @property {number} solutionLength
 * @property {number} cellCount
 * @property {number} solutionRatio
 * @property {number} deadEnds
 * @property {number} deadEndRatio
 * @property {number} intersections
 * @property {number} decisionPoints
 * @property {number} loopCount
 * @property {number} avgCorridorLength
 * @property {number} maxDistFromSolution
 * @property {number} manhattanEntranceExit
 * @property {number} difficultyScore
 */

/**
 * @typedef {object} Maze
 * @property {number} rows
 * @property {number} cols
 * @property {MazeCell[]} cells
 * @property {CellPos} entrance
 * @property {CellPos} exit
 * @property {Collectible[]} collectibles
 * @property {{ x: number, y: number } | null} [switchPos]
 * @property {{ x: number, y: number } | null} [gatePos]
 * @property {string} seed
 * @property {string} difficultyId
 * @property {number[]} solution
 * @property {MazeMetrics} metrics
 */

/**
 * Minimal shape accepted by pathfinding / neighbors.
 * @typedef {{ rows: number, cols: number, cells: MazeCell[] }} MazeLike
 */

/**
 * Create a full-wall grid (not yet carved).
 * @param {number} rows
 * @param {number} cols
 * @returns {MazeCell[]}
 */
export function createFullWallGrid(rows, cols) {
  /** @type {MazeCell[]} */
  const cells = new Array(rows * cols);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      cells[y * cols + x] = {
        x,
        y,
        north: true,
        south: true,
        east: true,
        west: true,
        open: true,
      };
    }
  }
  return cells;
}

/**
 * @param {MazeLike} maze
 * @param {number} x
 * @param {number} y
 */
export function cellIndex(maze, x, y) {
  return y * maze.cols + x;
}

/**
 * @param {MazeLike} maze
 * @param {number} x
 * @param {number} y
 * @returns {MazeCell | null}
 */
export function getCell(maze, x, y) {
  if (x < 0 || y < 0 || x >= maze.cols || y >= maze.rows) return null;
  return maze.cells[cellIndex(maze, x, y)];
}

/**
 * @param {MazeLike} maze
 * @param {number} idx
 * @returns {CellPos}
 */
export function indexToPos(maze, idx) {
  return { x: idx % maze.cols, y: (idx / maze.cols) | 0 };
}

/** @typedef {'north'|'south'|'east'|'west'} Dir */

/**
 * Opposite direction name.
 * @param {Dir} dir
 * @returns {Dir}
 */
export function opposite(dir) {
  switch (dir) {
    case 'north': return 'south';
    case 'south': return 'north';
    case 'east': return 'west';
    case 'west': return 'east';
    default: return dir;
  }
}

/**
 * Delta for direction.
 * @param {Dir} dir
 * @returns {{ dx: number, dy: number }}
 */
export function dirDelta(dir) {
  switch (dir) {
    case 'north': return { dx: 0, dy: -1 };
    case 'south': return { dx: 0, dy: 1 };
    case 'east': return { dx: 1, dy: 0 };
    case 'west': return { dx: -1, dy: 0 };
    default: return { dx: 0, dy: 0 };
  }
}

/**
 * Remove wall between two adjacent cells (both sides).
 * @param {MazeLike} maze
 * @param {number} x
 * @param {number} y
 * @param {Dir} dir
 * @returns {boolean} true if carved
 */
export function carve(maze, x, y, dir) {
  const a = getCell(maze, x, y);
  if (!a) return false;
  const { dx, dy } = dirDelta(dir);
  const b = getCell(maze, x + dx, y + dy);
  if (!b) return false;
  a[dir] = false;
  b[opposite(dir)] = false;
  return true;
}

/**
 * Count open edges of a cell (0–4).
 * @param {MazeCell} cell
 */
export function openEdgeCount(cell) {
  let n = 0;
  if (!cell.north) n++;
  if (!cell.south) n++;
  if (!cell.east) n++;
  if (!cell.west) n++;
  return n;
}

/**
 * Count undirected passages (each shared open edge once).
 * For a perfect maze on C cells, passages = C - 1.
 * @param {MazeLike} maze
 */
export function countPassages(maze) {
  let edges = 0;
  const { rows, cols, cells } = maze;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = cells[y * cols + x];
      if (!c.east && x < cols - 1) edges++;
      if (!c.south && y < rows - 1) edges++;
    }
  }
  return edges;
}

/**
 * Verify neighboring wall bits agree.
 * @param {MazeLike} maze
 * @returns {string[]} error messages
 */
export function wallConsistencyErrors(maze) {
  /** @type {string[]} */
  const errors = [];
  const { rows, cols, cells } = maze;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = cells[y * cols + x];
      if (x < cols - 1) {
        const e = cells[y * cols + x + 1];
        if (c.east !== e.west) {
          errors.push(`wall mismatch east/west at (${x},${y})`);
        }
      }
      if (y < rows - 1) {
        const s = cells[(y + 1) * cols + x];
        if (c.south !== s.north) {
          errors.push(`wall mismatch south/north at (${x},${y})`);
        }
      }
    }
  }
  return errors;
}

/**
 * Shallow structural clone of maze cells (for tests / safe mutation).
 * @param {MazeCell[]} cells
 * @returns {MazeCell[]}
 */
export function cloneCells(cells) {
  return cells.map((c) => ({
    x: c.x,
    y: c.y,
    north: c.north,
    south: c.south,
    east: c.east,
    west: c.west,
    open: c.open,
  }));
}

/**
 * Serialize maze topology for determinism compares (ignores metrics object identity).
 * @param {Maze} maze
 */
export function mazeTopologyKey(maze) {
  const walls = maze.cells.map((c) =>
    `${c.north | 0}${c.south | 0}${c.east | 0}${c.west | 0}`
  ).join('');
  const cols = maze.collectibles
    .map((c) => `${c.id}:${c.x},${c.y}`)
    .join(';');
  return [
    maze.rows,
    maze.cols,
    maze.seed,
    maze.difficultyId,
    `${maze.entrance.x},${maze.entrance.y}`,
    `${maze.exit.x},${maze.exit.y}`,
    cols,
    maze.solution.join(','),
    walls,
  ].join('|');
}
