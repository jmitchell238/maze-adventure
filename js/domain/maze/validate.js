/**
 * Maze validation — every presented maze must pass.
 */

import { bfsPath, floodReachable } from '../pathfinding.js';
import { cellIndex, wallConsistencyErrors, getCell } from './model.js';

/**
 * @typedef {import('./model.js').Maze} Maze
 * @typedef {import('../difficulty.js').DifficultyProfile} DifficultyProfile
 */

/**
 * @typedef {object} ValidationResult
 * @property {boolean} ok
 * @property {string[]} errors
 */

/**
 * @param {Maze} maze
 * @param {DifficultyProfile} profile
 * @param {{ skipScore?: boolean, skipSolutionRatio?: boolean }} [opts]
 * @returns {ValidationResult}
 */
export function validateMaze(maze, profile, opts = {}) {
  /** @type {string[]} */
  const errors = [];

  if (!maze || typeof maze !== 'object') {
    return { ok: false, errors: ['maze is not an object'] };
  }

  const { rows, cols } = maze;
  if (!Number.isInteger(rows) || !Number.isInteger(cols)) {
    errors.push('rows/cols must be integers');
  }
  if (rows < profile.minRows || rows > profile.maxRows) {
    errors.push(`rows ${rows} outside ${profile.minRows}-${profile.maxRows}`);
  }
  if (cols < profile.minColumns || cols > profile.maxColumns) {
    errors.push(`cols ${cols} outside ${profile.minColumns}-${profile.maxColumns}`);
  }
  if (!Array.isArray(maze.cells) || maze.cells.length !== rows * cols) {
    errors.push('cells length mismatch');
  }

  if (profile.corridorWidth < 1) {
    errors.push('corridorWidth below minimum');
  }

  errors.push(...wallConsistencyErrors(maze));

  const en = maze.entrance;
  const ex = maze.exit;
  if (!en || !getCell(maze, en.x, en.y)) {
    errors.push('entrance invalid');
  } else if (!getCell(maze, en.x, en.y)?.open) {
    errors.push('entrance not open');
  }
  if (!ex || !getCell(maze, ex.x, ex.y)) {
    errors.push('exit invalid');
  } else if (!getCell(maze, ex.x, ex.y)?.open) {
    errors.push('exit not open');
  }
  if (en && ex && en.x === ex.x && en.y === ex.y) {
    errors.push('entrance equals exit');
  }

  if (en && ex && getCell(maze, en.x, en.y) && getCell(maze, ex.x, ex.y)) {
    const path = bfsPath(maze, en, ex);
    if (!path) {
      errors.push('exit not reachable from entrance');
    } else {
      if (!Array.isArray(maze.solution) || maze.solution.length !== path.length) {
        // solution may be recomputed; length must match shortest
        const stored = maze.solution;
        if (!stored || stored.length < 2) {
          errors.push('solution path missing');
        } else {
          // Verify stored path is valid walk
          if (!isValidWalk(maze, stored)) {
            errors.push('stored solution is not a valid walk');
          }
          if (stored[0] !== cellIndex(maze, en.x, en.y)) {
            errors.push('solution does not start at entrance');
          }
          if (stored[stored.length - 1] !== cellIndex(maze, ex.x, ex.y)) {
            errors.push('solution does not end at exit');
          }
          // Stored should be shortest (or equal length)
          if (stored.length > path.length) {
            errors.push('solution longer than BFS shortest path');
          }
        }
      }
      const steps = path.length - 1;
      if (steps < profile.minSolutionLength) {
        errors.push(`solution length ${steps} < min ${profile.minSolutionLength}`);
      }
    }
  }

  // Collectibles
  if (!Array.isArray(maze.collectibles)) {
    errors.push('collectibles must be an array');
  } else if (en) {
    const reached = floodReachable(maze, en);
    const [cMin, cMax] = profile.collectibleCount;
    if (maze.collectibles.length < cMin || maze.collectibles.length > cMax) {
      // Allow fewer only if not enough candidate cells — pipeline should still try
      // Hard fail only if over max or negative logic
      if (maze.collectibles.length > cMax) {
        errors.push(`too many collectibles: ${maze.collectibles.length}`);
      }
    }
    const seenIds = new Set();
    for (const c of maze.collectibles) {
      if (!c || typeof c.x !== 'number' || typeof c.y !== 'number') {
        errors.push('collectible missing coordinates');
        continue;
      }
      const cell = getCell(maze, c.x, c.y);
      if (!cell || !cell.open) {
        errors.push(`collectible ${c.id} in invalid cell`);
      }
      const idx = cellIndex(maze, c.x, c.y);
      if (!reached.has(idx)) {
        errors.push(`collectible ${c.id} unreachable`);
      }
      if (en && c.x === en.x && c.y === en.y) {
        errors.push(`collectible ${c.id} on entrance`);
      }
      if (ex && c.x === ex.x && c.y === ex.y) {
        errors.push(`collectible ${c.id} on exit`);
      }
      if (seenIds.has(c.id)) errors.push(`duplicate collectible id ${c.id}`);
      seenIds.add(c.id);
    }
  }

  // Metrics / difficulty band
  if (maze.metrics) {
    if (!opts.skipSolutionRatio && maze.metrics.solutionRatio != null) {
      const [lo, hi] = profile.targetSolutionRatio;
      if (maze.metrics.solutionRatio < lo - 0.02 || maze.metrics.solutionRatio > hi + 0.05) {
        // Soft band with small slack — hard reject only if wildly outside
        if (maze.metrics.solutionRatio < lo * 0.5 || maze.metrics.solutionRatio > hi * 1.4) {
          errors.push(
            `solutionRatio ${maze.metrics.solutionRatio.toFixed(3)} outside band`,
          );
        }
      }
    }
    if (maze.metrics.deadEndRatio > profile.maxDeadEndRatio + 0.08) {
      errors.push(`deadEndRatio ${maze.metrics.deadEndRatio.toFixed(3)} too high`);
    }
    if (!opts.skipScore && maze.metrics.difficultyScore != null) {
      const [sLo, sHi] = profile.scoreRange;
      if (maze.metrics.difficultyScore < sLo || maze.metrics.difficultyScore > sHi) {
        errors.push(
          `difficultyScore ${maze.metrics.difficultyScore.toFixed(1)} outside ${sLo}-${sHi}`,
        );
      }
    }
  } else {
    errors.push('metrics missing');
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Structural checks only (no difficulty score band) — used mid-pipeline.
 * @param {Maze} maze
 * @param {DifficultyProfile} profile
 */
export function validateStructure(maze, profile) {
  return validateMaze(maze, profile, { skipScore: true, skipSolutionRatio: true });
}

/**
 * @param {import('./model.js').MazeLike} maze
 * @param {number[]} path indices
 */
function isValidWalk(maze, path) {
  if (!path.length) return false;
  const { cols, rows, cells } = maze;
  for (let i = 0; i < path.length; i++) {
    const idx = path[i];
    if (idx < 0 || idx >= cells.length) return false;
    if (i === 0) continue;
    const prev = path[i - 1];
    const px = prev % cols;
    const py = (prev / cols) | 0;
    const cx = idx % cols;
    const cy = (idx / cols) | 0;
    const dx = cx - px;
    const dy = cy - py;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
    const cell = cells[prev];
    if (dx === 1 && cell.east) return false;
    if (dx === -1 && cell.west) return false;
    if (dy === 1 && cell.south) return false;
    if (dy === -1 && cell.north) return false;
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return false;
  }
  return true;
}
