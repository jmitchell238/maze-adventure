/**
 * Maze Adventure — tuning knobs and version.
 * Numbers only; difficulty tables live in domain/difficulty.js but size defaults here.
 */

// ---- Version (MAJOR.MINOR.PATCH) --------------------------------------------
// Keep CACHE in sw.js in sync when PWA ships: 'maze-adventure-' + GAME_VERSION
export const GAME_VERSION = '1.2.006';
export const GAME_VERSION_LABEL = 'v' + GAME_VERSION;
export const GAME_NAME = 'Maze Adventure';

/** Logical stage size (letterboxed to fit screen) — used from Milestone 3. */
export const W = 390;
export const H = 700;

/** Generation pipeline defaults */
export const GEN = {
  /** Absolute ceiling if a profile omits maxGenAttempts */
  defaultMaxGenAttempts: 40,
  /** Candidate entrance/exit pairs to sample when placing */
  entranceExitTrials: 16,
};

/** Movement (Milestone 3+; stored here for single config home) */
export const MOVE = {
  freeSpeed: 120,
  /** Slightly snappy so kids feel progress on short phone swipes */
  guidedSpeed: 160,
  playerRadius: 10,
};
