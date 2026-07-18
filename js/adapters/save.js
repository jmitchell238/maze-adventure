/** Adapter: localStorage persistence for Maze Adventure. */

const SAVE_KEY = 'maze-adventure-v1';

/**
 * @typedef {object} SaveData
 * @property {boolean} muted
 * @property {'auto'|'guided'|'free'} movementPref
 * @property {boolean} reducedMotion
 * @property {boolean} highContrast
 * @property {number} adventureProgress
 * @property {boolean} adventureComplete
 * @property {string[]} themesUnlocked
 * @property {string[]} charactersUnlocked
 * @property {Record<string, number>} bestByDifficulty
 * @property {{ dateKey: string, byDifficulty: Record<string, boolean> }} daily
 * @property {number} gamesCompleted
 * @property {number} totalCollectibles
 * @property {string} lastDifficulty
 * @property {string} lastMode
 * @property {boolean} showSeed
 * @property {boolean} voicePraise
 * @property {import('../domain/freeplay.js').FreePlayOptions} freePlay
 */

/** @returns {SaveData} */
export function defaultSave() {
  return {
    muted: false,
    movementPref: 'auto',
    reducedMotion: false,
    highContrast: false,
    adventureProgress: 0,
    adventureComplete: false,
    themesUnlocked: ['garden'],
    charactersUnlocked: ['explorer'],
    bestByDifficulty: { easy: 0, medium: 0, hard: 0, 'very-hard': 0 },
    daily: { dateKey: '', byDifficulty: {} },
    gamesCompleted: 0,
    totalCollectibles: 0,
    lastDifficulty: 'easy',
    lastMode: 'quick',
    showSeed: false,
    voicePraise: false,
    freePlay: {
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
    },
  };
}

/**
 * @param {Partial<SaveData>} [seed]
 */
export function createMemorySave(seed = {}) {
  const base = defaultSave();
  /** @type {SaveData} */
  const data = {
    ...base,
    ...seed,
    bestByDifficulty: {
      ...base.bestByDifficulty,
      ...(seed.bestByDifficulty || {}),
    },
    daily: {
      ...base.daily,
      ...(seed.daily || {}),
      byDifficulty: {
        ...base.daily.byDifficulty,
        ...((seed.daily && seed.daily.byDifficulty) || {}),
      },
    },
    themesUnlocked: seed.themesUnlocked || base.themesUnlocked,
    charactersUnlocked: seed.charactersUnlocked || base.charactersUnlocked,
    freePlay: { ...base.freePlay, ...(seed.freePlay || {}) },
  };
  return makeStore(data, () => {});
}

export function createSaveStore() {
  const data = readStorage();
  function persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch { /* private mode */ }
  }
  return makeStore(data, persist);
}

/**
 * @param {SaveData} data
 * @param {() => void} persist
 */
function makeStore(data, persist) {
  return {
    get data() { return data; },
    getMuted: () => data.muted,
    setMuted(v) {
      data.muted = !!v;
      persist();
    },
    setMovementPref(v) {
      if (v === 'auto' || v === 'guided' || v === 'free') {
        data.movementPref = v;
        persist();
      }
    },
    setReducedMotion(v) {
      data.reducedMotion = !!v;
      persist();
    },
    setHighContrast(v) {
      data.highContrast = !!v;
      persist();
    },
    setShowSeed(v) {
      data.showSeed = !!v;
      persist();
    },
    setVoicePraise(v) {
      data.voicePraise = !!v;
      persist();
    },
    setFreePlay(opts) {
      data.freePlay = { ...data.freePlay, ...opts };
      persist();
    },
    persist,
    /**
     * @param {string} difficultyId
     * @param {number} collectibles
     * @param {string} [mode]
     * @param {string} [dateKeyStr]
     * @param {{ adventureStageCleared?: boolean, unlockThemes?: string[], unlockCharacters?: string[] }} [extra]
     */
    recordWin(difficultyId, collectibles, mode = 'quick', dateKeyStr = '', extra = {}) {
      data.gamesCompleted += 1;
      data.totalCollectibles += collectibles | 0;
      data.lastDifficulty = difficultyId;
      data.lastMode = mode;
      const prev = data.bestByDifficulty[difficultyId] || 0;
      data.bestByDifficulty[difficultyId] = prev + 1;
      if (mode === 'daily' && dateKeyStr) {
        if (data.daily.dateKey !== dateKeyStr) {
          data.daily = { dateKey: dateKeyStr, byDifficulty: {} };
        }
        data.daily.byDifficulty[difficultyId] = true;
      }
      if (mode === 'adventure' && extra.adventureStageCleared) {
        data.adventureProgress = (data.adventureProgress | 0) + 1;
        for (const t of extra.unlockThemes || []) {
          if (!data.themesUnlocked.includes(t)) data.themesUnlocked.push(t);
        }
        for (const c of extra.unlockCharacters || []) {
          if (!data.charactersUnlocked.includes(c)) data.charactersUnlocked.push(c);
        }
      }
      persist();
    },
    markAdventureComplete() {
      data.adventureComplete = true;
      persist();
    },
    isDailyComplete(difficultyId, dateKeyStr) {
      return data.daily.dateKey === dateKeyStr && !!data.daily.byDifficulty[difficultyId];
    },
  };
}

function readStorage() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    const base = defaultSave();
    let daily = base.daily;
    if (parsed.daily) {
      if (parsed.daily.byDifficulty) {
        daily = {
          dateKey: parsed.daily.dateKey || '',
          byDifficulty: { ...parsed.daily.byDifficulty },
        };
      } else if (parsed.daily.completed && parsed.daily.dateKey) {
        daily = {
          dateKey: parsed.daily.dateKey,
          byDifficulty: parsed.daily.difficulty
            ? { [parsed.daily.difficulty]: true }
            : {},
        };
      }
    }
    // Migrate: older saves unlocked all three themes
    let themesUnlocked = parsed.themesUnlocked;
    if (!themesUnlocked) {
      themesUnlocked = parsed.gamesCompleted > 0
        ? ['garden', 'castle', 'candy']
        : ['garden'];
    }
    return {
      ...base,
      ...parsed,
      bestByDifficulty: { ...base.bestByDifficulty, ...(parsed.bestByDifficulty || {}) },
      themesUnlocked,
      charactersUnlocked: parsed.charactersUnlocked || base.charactersUnlocked,
      daily,
      freePlay: { ...base.freePlay, ...(parsed.freePlay || {}) },
      movementPref: ['auto', 'guided', 'free'].includes(parsed.movementPref)
        ? parsed.movementPref
        : 'auto',
      adventureProgress: parsed.adventureProgress | 0,
      adventureComplete: !!parsed.adventureComplete,
      showSeed: !!parsed.showSeed,
      voicePraise: !!parsed.voicePraise,
    };
  } catch {
    return defaultSave();
  }
}
