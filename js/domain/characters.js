/**
 * Playable character presentation data.
 */

/**
 * @typedef {object} CharacterDef
 * @property {string} id
 * @property {string} name
 * @property {string} body
 * @property {string} stroke
 * @property {string} accent
 * @property {string} goalHint  // short visual goal story
 * @property {string} emoji
 */

/** @type {Record<string, CharacterDef>} */
export const CHARACTERS = {
  explorer: {
    id: 'explorer',
    name: 'Explorer',
    body: '#8dffb0',
    stroke: '#1a4d2e',
    accent: '#ffb4d0',
    goalHint: 'Find the treasure',
    emoji: '🧭',
  },
  knight: {
    id: 'knight',
    name: 'Knight',
    body: '#7ec8ff',
    stroke: '#1a3a5c',
    accent: '#c9a227',
    goalHint: 'Reach the castle',
    emoji: '🛡️',
  },
  kitten: {
    id: 'kitten',
    name: 'Kitten',
    body: '#ffe0ea',
    stroke: '#8b2252',
    accent: '#ff8fab',
    goalHint: 'Find the yarn',
    emoji: '🐱',
  },
  dino: {
    id: 'dino',
    name: 'Dino',
    body: '#9be15d',
    stroke: '#2d5a1a',
    accent: '#ff9f43',
    goalHint: 'Find the egg',
    emoji: '🦕',
  },
  puppy: {
    id: 'puppy',
    name: 'Puppy',
    body: '#e8c39e',
    stroke: '#5c3a1a',
    accent: '#ff6b6b',
    goalHint: 'Find the bone',
    emoji: '🐶',
  },
  robot: {
    id: 'robot',
    name: 'Robot',
    body: '#b0c4de',
    stroke: '#2f3e52',
    accent: '#5dade2',
    goalHint: 'Reach the ship',
    emoji: '🤖',
  },
};

/**
 * @param {string} [id]
 * @returns {CharacterDef}
 */
export function getCharacter(id = 'explorer') {
  return CHARACTERS[id] || CHARACTERS.explorer;
}
