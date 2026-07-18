/**
 * Adventure Mode — linear stages with unlocks.
 * Progress index = highest stage cleared (0-based next to play).
 */

import { getProfile, cloneProfile } from './difficulty.js';

/**
 * @typedef {object} AdventureStage
 * @property {number} order          // 1-based display
 * @property {string} id
 * @property {string} name
 * @property {string} blurb
 * @property {string} icon
 * @property {string} difficultyId   // base profile
 * @property {string} themeId
 * @property {string} characterId
 * @property {string} [seedPrefix]   // fixed prefix for reproducibility per stage slot
 * @property {Partial<import('./difficulty.js').DifficultyProfile>} [profileOverrides]
 * @property {string[]} unlockThemes
 * @property {string[]} unlockCharacters
 */

/** @type {AdventureStage[]} */
export const ADVENTURE_STAGES = [
  {
    order: 1,
    id: 'garden-path',
    name: 'Sunny Path',
    blurb: 'A tiny garden maze',
    icon: '🌱',
    difficultyId: 'easy',
    themeId: 'garden',
    characterId: 'explorer',
    seedPrefix: 'adv-1',
    unlockThemes: ['garden'],
    unlockCharacters: ['explorer'],
  },
  {
    order: 2,
    id: 'flower-loop',
    name: 'Flower Loop',
    blurb: 'A little longer',
    icon: '✿',
    difficultyId: 'easy',
    themeId: 'garden',
    characterId: 'explorer',
    seedPrefix: 'adv-2',
    profileOverrides: { minRows: 6, maxRows: 7, minColumns: 6, maxColumns: 7 },
    unlockThemes: [],
    unlockCharacters: [],
  },
  {
    order: 3,
    id: 'candy-lane',
    name: 'Candy Lane',
    blurb: 'Sweet new colors',
    icon: '🍭',
    difficultyId: 'easy',
    themeId: 'candy',
    characterId: 'kitten',
    seedPrefix: 'adv-3',
    unlockThemes: ['candy'],
    unlockCharacters: ['kitten'],
  },
  {
    order: 4,
    id: 'toy-courtyard',
    name: 'Toy Courtyard',
    blurb: 'Castle practice',
    icon: '🏰',
    difficultyId: 'medium',
    themeId: 'castle',
    characterId: 'knight',
    seedPrefix: 'adv-4',
    unlockThemes: ['castle'],
    unlockCharacters: ['knight'],
  },
  {
    order: 5,
    id: 'hedge-twist',
    name: 'Hedge Twist',
    blurb: 'More branches',
    icon: '🌿',
    difficultyId: 'medium',
    themeId: 'garden',
    characterId: 'explorer',
    seedPrefix: 'adv-5',
    unlockThemes: [],
    unlockCharacters: [],
  },
  {
    order: 6,
    id: 'dino-valley',
    name: 'Dino Valley',
    blurb: 'Find the egg!',
    icon: '🦕',
    difficultyId: 'medium',
    themeId: 'dino',
    characterId: 'dino',
    seedPrefix: 'adv-6',
    unlockThemes: ['dino'],
    unlockCharacters: ['dino'],
  },
  {
    order: 7,
    id: 'snow-trail',
    name: 'Snow Trail',
    blurb: 'Chilly paths',
    icon: '❄️',
    difficultyId: 'medium',
    themeId: 'snow',
    characterId: 'puppy',
    seedPrefix: 'adv-7',
    profileOverrides: { minRows: 10, maxRows: 11, minColumns: 10, maxColumns: 11 },
    unlockThemes: ['snow'],
    unlockCharacters: ['puppy'],
  },
  {
    order: 8,
    id: 'reef-run',
    name: 'Reef Run',
    blurb: 'Under the waves',
    icon: '🐠',
    difficultyId: 'hard',
    themeId: 'reef',
    characterId: 'explorer',
    seedPrefix: 'adv-8',
    unlockThemes: ['reef'],
    unlockCharacters: [],
  },
  {
    order: 9,
    id: 'pirate-cove',
    name: 'Pirate Cove',
    blurb: 'Treasure ahead',
    icon: '🏴‍☠️',
    difficultyId: 'hard',
    themeId: 'pirate',
    characterId: 'knight',
    seedPrefix: 'adv-9',
    unlockThemes: ['pirate'],
    unlockCharacters: [],
  },
  {
    order: 10,
    id: 'space-dock',
    name: 'Space Dock',
    blurb: 'Final frontier',
    icon: '🚀',
    difficultyId: 'hard',
    themeId: 'space',
    characterId: 'robot',
    seedPrefix: 'adv-10',
    unlockThemes: ['space'],
    unlockCharacters: ['robot'],
  },
  {
    order: 11,
    id: 'star-labyrinth',
    name: 'Star Labyrinth',
    blurb: 'Very hard!',
    icon: '⭐',
    difficultyId: 'very-hard',
    themeId: 'space',
    characterId: 'robot',
    seedPrefix: 'adv-11',
    unlockThemes: [],
    unlockCharacters: [],
  },
  {
    order: 12,
    id: 'grand-finale',
    name: 'Grand Finale',
    blurb: 'Champion maze',
    icon: '👑',
    difficultyId: 'very-hard',
    themeId: 'castle',
    characterId: 'knight',
    seedPrefix: 'adv-12',
    unlockThemes: [],
    unlockCharacters: [],
  },
];

/**
 * @param {number} progress  stages cleared (0 = none)
 * @returns {AdventureStage | null} next playable stage, or null if complete
 */
export function nextAdventureStage(progress) {
  const p = Math.max(0, progress | 0);
  if (p >= ADVENTURE_STAGES.length) return null;
  return ADVENTURE_STAGES[p];
}

/**
 * @param {number} progress
 * @param {number} order 1-based
 */
export function isStageUnlocked(progress, order) {
  return order <= (progress | 0) + 1;
}

/**
 * @param {number} progress
 */
export function isAdventureComplete(progress) {
  return (progress | 0) >= ADVENTURE_STAGES.length;
}

/**
 * Build profile + seed for a stage run.
 * @param {AdventureStage} stage
 * @param {number} [attempt=0]  for restarts with variety after clear? same stage keeps seedPrefix+progress
 * @param {number} [runSalt=0]
 */
export function stageRunConfig(stage, attempt = 0, runSalt = 0) {
  const base = getProfile(stage.difficultyId);
  const profile = cloneProfile(stage.difficultyId, {
    ...stage.profileOverrides,
    id: stage.difficultyId,
  });
  const seed = `${stage.seedPrefix || stage.id}:a${attempt}:s${runSalt}`;
  return { profile, seed, themeId: stage.themeId, characterId: stage.characterId, base };
}

/**
 * Themes unlocked after clearing `progress` stages (cumulative).
 * @param {number} progress
 * @returns {string[]}
 */
export function themesUnlockedByProgress(progress) {
  /** @type {Set<string>} */
  const set = new Set(['garden']);
  const n = Math.min(progress | 0, ADVENTURE_STAGES.length);
  for (let i = 0; i < n; i++) {
    for (const t of ADVENTURE_STAGES[i].unlockThemes) set.add(t);
  }
  return [...set];
}

/**
 * @param {number} progress
 * @returns {string[]}
 */
export function charactersUnlockedByProgress(progress) {
  /** @type {Set<string>} */
  const set = new Set(['explorer']);
  const n = Math.min(progress | 0, ADVENTURE_STAGES.length);
  for (let i = 0; i < n; i++) {
    for (const c of ADVENTURE_STAGES[i].unlockCharacters) set.add(c);
  }
  return [...set];
}

export function adventureStageCount() {
  return ADVENTURE_STAGES.length;
}

/**
 * @param {string} id
 * @returns {AdventureStage | undefined}
 */
export function getStageById(id) {
  return ADVENTURE_STAGES.find((s) => s.id === id);
}
