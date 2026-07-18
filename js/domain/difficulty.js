/**
 * DifficultyProfile registry for Maze Adventure.
 */

/**
 * @typedef {'easy'|'medium'|'hard'|'very-hard'} DifficultyId
 */

/**
 * @typedef {object} DifficultyProfile
 * @property {DifficultyId} id
 * @property {string} label
 * @property {number} minRows
 * @property {number} maxRows
 * @property {number} minColumns
 * @property {number} maxColumns
 * @property {number} corridorWidth
 * @property {number} loopChance
 * @property {[number, number]} targetSolutionRatio
 * @property {number} maxDeadEndRatio
 * @property {[number, number]} collectibleCount
 * @property {[number, number]} scoreRange  // difficultyScore accept band
 * @property {number} minSolutionLength
 * @property {boolean} hintsEnabled
 * @property {boolean} guidedMovement
 * @property {'full'|'follow'|'limited'} cameraMode
 * @property {boolean} optionalTimer
 * @property {boolean} pathGlowDefault
 * @property {number} maxGenAttempts
 * @property {number} [gateChance]  // 0..1 chance to place switch+gate
 */

/** @type {Record<DifficultyId, DifficultyProfile>} */
export const PROFILES = {
  easy: {
    id: 'easy',
    label: 'Easy',
    minRows: 5,
    maxRows: 7,
    minColumns: 5,
    maxColumns: 7,
    corridorWidth: 1,
    loopChance: 0.03,
    targetSolutionRatio: [0.08, 0.55],
    maxDeadEndRatio: 0.55,
    collectibleCount: [0, 2],
    scoreRange: [5, 38],
    minSolutionLength: 4,
    hintsEnabled: true,
    guidedMovement: true,
    cameraMode: 'full',
    optionalTimer: false,
    pathGlowDefault: true,
    maxGenAttempts: 48,
    gateChance: 0,
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    minRows: 8,
    maxRows: 11,
    minColumns: 8,
    maxColumns: 11,
    corridorWidth: 1,
    loopChance: 0.08,
    targetSolutionRatio: [0.1, 0.55],
    maxDeadEndRatio: 0.5,
    collectibleCount: [2, 4],
    scoreRange: [28, 55],
    minSolutionLength: 10,
    hintsEnabled: true,
    guidedMovement: false,
    cameraMode: 'full',
    optionalTimer: false,
    pathGlowDefault: false,
    maxGenAttempts: 48,
    gateChance: 0,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    minRows: 12,
    maxRows: 17,
    minColumns: 12,
    maxColumns: 17,
    corridorWidth: 1,
    loopChance: 0.14,
    targetSolutionRatio: [0.1, 0.6],
    maxDeadEndRatio: 0.48,
    collectibleCount: [3, 6],
    scoreRange: [48, 72],
    minSolutionLength: 18,
    hintsEnabled: true,
    guidedMovement: false,
    cameraMode: 'follow',
    optionalTimer: true,
    pathGlowDefault: false,
    maxGenAttempts: 56,
    gateChance: 0.55,
  },
  'very-hard': {
    id: 'very-hard',
    label: 'Very Hard',
    minRows: 18,
    maxRows: 25,
    minColumns: 18,
    maxColumns: 25,
    corridorWidth: 1,
    loopChance: 0.18,
    targetSolutionRatio: [0.08, 0.65],
    maxDeadEndRatio: 0.45,
    collectibleCount: [4, 8],
    scoreRange: [65, 100],
    minSolutionLength: 30,
    hintsEnabled: true,
    guidedMovement: false,
    cameraMode: 'follow',
    optionalTimer: true,
    pathGlowDefault: false,
    maxGenAttempts: 64,
    gateChance: 0.75,
  },
};

/** @type {DifficultyId[]} */
export const DIFFICULTY_IDS = ['easy', 'medium', 'hard', 'very-hard'];

/**
 * @param {string} id
 * @returns {DifficultyProfile}
 */
export function getProfile(id) {
  const p = PROFILES[/** @type {DifficultyId} */ (id)];
  if (!p) {
    throw new Error(`Unknown difficulty: ${id}`);
  }
  return p;
}

/**
 * Clone profile with optional Free Play overrides.
 * @param {DifficultyId} id
 * @param {Partial<DifficultyProfile>} [overrides]
 * @returns {DifficultyProfile}
 */
export function cloneProfile(id, overrides = {}) {
  const base = getProfile(id);
  return { ...base, ...overrides, id: overrides.id || base.id };
}
