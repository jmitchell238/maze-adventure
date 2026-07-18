/**
 * Seeded random-number utilities for deterministic maze generation.
 * Never use Math.random() in generation — always createRng(seed).
 */

/**
 * cyrb53-inspired string hash → uint32.
 * @param {string} str
 * @param {number} [seed=0]
 * @returns {number} unsigned 32-bit
 */
export function hashSeed(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0) + 4294967296 * (h1 >>> 0) >>> 0;
}

/**
 * @typedef {object} SeededRng
 * @property {() => number} next          // [0, 1)
 * @property {(min: number, max: number) => number} int  // inclusive integers
 * @property {<T>(arr: T[]) => T} pick
 * @property {<T>(arr: T[]) => T[]} shuffle  // mutates and returns arr
 * @property {(label: string) => SeededRng} fork
 * @property {string} seedStr
 */

/**
 * Mulberry32 PRNG factory.
 * @param {string|number} seed
 * @returns {SeededRng}
 */
export function createRng(seed) {
  const seedStr = String(seed);
  let a = typeof seed === 'number' && Number.isFinite(seed)
    ? (seed >>> 0)
    : hashSeed(seedStr);

  // Avoid zero-ish degenerate state
  if (a === 0) a = 0x9e3779b9;

  function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Inclusive integer in [min, max].
   * @param {number} min
   * @param {number} max
   */
  function int(min, max) {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    if (hi < lo) return lo;
    return lo + Math.floor(next() * (hi - lo + 1));
  }

  /**
   * @template T
   * @param {T[]} arr
   * @returns {T}
   */
  function pick(arr) {
    if (!arr.length) {
      throw new Error('rng.pick: empty array');
    }
    return arr[int(0, arr.length - 1)];
  }

  /**
   * Fisher–Yates in place.
   * @template T
   * @param {T[]} arr
   * @returns {T[]}
   */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = int(0, i);
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  /**
   * @param {string} label
   * @returns {SeededRng}
   */
  function fork(label) {
    return createRng(seedStr + ':' + label);
  }

  return { next, int, pick, shuffle, fork, seedStr };
}

/**
 * Deterministic daily seed string (local calendar date).
 * @param {DifficultyIdLike} difficultyId
 * @param {Date} [date]
 * @returns {string}
 */
/**
 * @typedef {string} DifficultyIdLike
 */

/**
 * @param {DifficultyIdLike} difficultyId
 * @param {Date} [date]
 */
export function dailySeed(difficultyId, date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `daily:${y}-${m}-${d}:${difficultyId}`;
}

/**
 * Derive retry seed for failed generation attempts.
 * @param {string} seed
 * @param {number} attemptIndex
 */
export function retrySeed(seed, attemptIndex) {
  return `${seed}:retry:${attemptIndex}`;
}
