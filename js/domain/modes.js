/**
 * Game mode helpers: quick, daily, seed formatting.
 */

import { dailySeed } from './rng.js';

/**
 * @typedef {'quick'|'daily'} PlayMode
 */

/**
 * Seed for a daily maze (local calendar).
 * @param {string} difficultyId
 * @param {Date} [date]
 */
export function makeDailySeed(difficultyId, date = new Date()) {
  return dailySeed(difficultyId, date);
}

/**
 * Human-readable daily label.
 * @param {Date} [date]
 */
export function dailyLabel(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Local date key YYYY-MM-DD.
 * @param {Date} [date]
 */
export function dateKey(date = new Date()) {
  return dailyLabel(date);
}
