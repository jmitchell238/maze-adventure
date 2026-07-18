/**
 * Parent / Free Play — build a custom DifficultyProfile from UI options.
 */

import { cloneProfile, DIFFICULTY_IDS } from './difficulty.js';

/**
 * @typedef {object} FreePlayOptions
 * @property {string} [baseDifficulty='medium']
 * @property {number} [size=10]           // rows ≈ cols
 * @property {number} [loopChance]
 * @property {number} [collectibles=3]
 * @property {boolean} [hints=true]
 * @property {boolean} [guided]
 * @property {boolean} [timer=false]
 * @property {boolean} [pathGlow]
 * @property {'full'|'follow'} [camera]
 * @property {string} [themeId='garden']
 * @property {string} [characterId='explorer']
 * @property {string} [seed]
 * @property {boolean} [gates]
 */

/**
 * Clamp free-play size into a sane band.
 * @param {number} size
 */
export function clampSize(size) {
  const n = Math.round(Number(size) || 10);
  return Math.max(5, Math.min(22, n));
}

/**
 * @param {FreePlayOptions} opts
 */
export function buildFreePlayProfile(opts = {}) {
  const baseId = DIFFICULTY_IDS.includes(/** @type {*} */ (opts.baseDifficulty))
    ? opts.baseDifficulty
    : 'medium';
  const size = clampSize(opts.size ?? 10);
  const guided = opts.guided != null
    ? !!opts.guided
    : baseId === 'easy';
  const pathGlow = opts.pathGlow != null ? !!opts.pathGlow : guided;
  const camera = opts.camera || (size >= 14 ? 'follow' : 'full');
  const collectibles = Math.max(0, Math.min(10, opts.collectibles ?? 3));
  const loopChance = opts.loopChance != null
    ? Math.max(0, Math.min(0.35, opts.loopChance))
    : baseId === 'easy' ? 0.03 : baseId === 'very-hard' ? 0.16 : 0.1;

  // min solution scales lightly with size
  const minSolutionLength = Math.max(3, Math.floor(size * 0.7));

  return cloneProfile(/** @type {import('./difficulty.js').DifficultyId} */ (baseId), {
    minRows: size,
    maxRows: size,
    minColumns: size,
    maxColumns: size,
    loopChance,
    collectibleCount: [collectibles, collectibles],
    hintsEnabled: opts.hints !== false,
    guidedMovement: guided,
    cameraMode: camera,
    optionalTimer: !!opts.timer,
    pathGlowDefault: pathGlow,
    minSolutionLength,
    // Wide score band so free-play always accepts
    scoreRange: [0, 100],
    targetSolutionRatio: [0.02, 0.9],
    maxDeadEndRatio: 0.7,
    maxGenAttempts: 40,
    gateChance: opts.gates ? 1 : 0,
  });
}

/**
 * Default free-play form state.
 * @returns {FreePlayOptions}
 */
export function defaultFreePlayOptions() {
  return {
    baseDifficulty: 'medium',
    size: 10,
    loopChance: 0.1,
    collectibles: 3,
    hints: true,
    guided: false,
    timer: false,
    pathGlow: false,
    camera: 'full',
    themeId: 'garden',
    characterId: 'explorer',
    seed: '',
    gates: false,
  };
}
