/**
 * Theme data only — no draw code.
 */

/**
 * @typedef {object} MazeTheme
 * @property {string} id
 * @property {string} name
 * @property {string} bgTop
 * @property {string} bgBot
 * @property {string} floor
 * @property {string} floorAlt
 * @property {string} wallTop
 * @property {string} wallSide
 * @property {string} wallShadow
 * @property {string} pathGlow
 * @property {string} breadcrumb
 * @property {string} entrance
 * @property {string} goal
 * @property {string} player
 * @property {string} playerStroke
 * @property {string} playerAccent
 * @property {string} collectible
 * @property {string[]} particleColors
 * @property {string} accent
 * @property {string} decor
 * @property {'petals'|'sparkles'|'blocks'|'bubbles'|'snow'|'leaves'} ambient
 * @property {string} goalIcon
 * @property {string} character
 */

/** @type {Record<string, MazeTheme>} */
export const THEMES = {
  garden: {
    id: 'garden',
    name: 'Enchanted Garden',
    bgTop: '#1e4a32',
    bgBot: '#0a1810',
    floor: '#45a060',
    floorAlt: '#3d9558',
    wallTop: '#c48a4a',
    wallSide: '#7a4e24',
    wallShadow: 'rgba(0,0,0,0.4)',
    pathGlow: 'rgba(200, 255, 170, 0.28)',
    breadcrumb: 'rgba(255, 255, 200, 0.2)',
    entrance: '#ffe566',
    goal: '#ff6b9d',
    player: '#8dffb0',
    playerStroke: '#1a4d2e',
    playerAccent: '#ffb4d0',
    collectible: '#ffd56a',
    particleColors: ['#7dffa0', '#ffe066', '#ff9ecd', '#ffffff', '#a0e7e5'],
    accent: '#7dffa0',
    decor: '#6bcb77',
    ambient: 'petals',
    goalIcon: '✿',
    character: 'explorer',
  },
  castle: {
    id: 'castle',
    name: 'Toy Castle',
    bgTop: '#322848',
    bgBot: '#120e1a',
    floor: '#7a7a8c',
    floorAlt: '#6c6c7e',
    wallTop: '#e0c090',
    wallSide: '#9a7850',
    wallShadow: 'rgba(0,0,0,0.45)',
    pathGlow: 'rgba(190, 210, 255, 0.22)',
    breadcrumb: 'rgba(200, 220, 255, 0.18)',
    entrance: '#ffd56a',
    goal: '#e8b923',
    player: '#7ec8ff',
    playerStroke: '#1a3a5c',
    playerAccent: '#c9a227',
    collectible: '#ffd700',
    particleColors: ['#c9a227', '#6ec6ff', '#ffd56a', '#fff', '#e0c090'],
    accent: '#c9a227',
    decor: '#a89070',
    ambient: 'blocks',
    goalIcon: '♛',
    character: 'knight',
  },
  candy: {
    id: 'candy',
    name: 'Candy Kingdom',
    bgTop: '#4a2850',
    bgBot: '#1a1022',
    floor: '#ff9bb5',
    floorAlt: '#f58aaa',
    wallTop: '#c5fff0',
    wallSide: '#7ec8b8',
    wallShadow: 'rgba(80,0,40,0.35)',
    pathGlow: 'rgba(255, 255, 210, 0.3)',
    breadcrumb: 'rgba(255, 240, 250, 0.22)',
    entrance: '#a0e7e5',
    goal: '#ff5ec4',
    player: '#ffe0ea',
    playerStroke: '#8b2252',
    playerAccent: '#ff8fab',
    collectible: '#fff3b0',
    particleColors: ['#ff8fab', '#b8f2e6', '#ffd6e0', '#fff3b0', '#c5fff0'],
    accent: '#ff8fab',
    decor: '#ffb3c6',
    ambient: 'sparkles',
    goalIcon: '🍭',
    character: 'kitten',
  },
  dino: {
    id: 'dino',
    name: 'Dinosaur Valley',
    bgTop: '#3a4a20',
    bgBot: '#141a0c',
    floor: '#6b8f3c',
    floorAlt: '#5e8234',
    wallTop: '#a67c52',
    wallSide: '#6b4f32',
    wallShadow: 'rgba(0,0,0,0.4)',
    pathGlow: 'rgba(180, 220, 100, 0.25)',
    breadcrumb: 'rgba(220, 255, 150, 0.18)',
    entrance: '#f0c040',
    goal: '#e8a838',
    player: '#9be15d',
    playerStroke: '#2d5a1a',
    playerAccent: '#ff9f43',
    collectible: '#f4d35e',
    particleColors: ['#9be15d', '#f4d35e', '#a67c52', '#fff', '#6b8f3c'],
    accent: '#9be15d',
    decor: '#7a9e45',
    ambient: 'leaves',
    goalIcon: '🥚',
    character: 'dino',
  },
  snow: {
    id: 'snow',
    name: 'Snowy Wonderland',
    bgTop: '#2a3a50',
    bgBot: '#0e141c',
    floor: '#d8e6f0',
    floorAlt: '#c5d8e8',
    wallTop: '#f5faff',
    wallSide: '#8aa0b8',
    wallShadow: 'rgba(20,40,60,0.35)',
    pathGlow: 'rgba(180, 220, 255, 0.35)',
    breadcrumb: 'rgba(255, 255, 255, 0.35)',
    entrance: '#7ec8ff',
    goal: '#ff8fab',
    player: '#e8c39e',
    playerStroke: '#5c3a1a',
    playerAccent: '#ff6b6b',
    collectible: '#a0e7e5',
    particleColors: ['#ffffff', '#c5d8e8', '#7ec8ff', '#ffd56a', '#e8f4ff'],
    accent: '#7ec8ff',
    decor: '#ffffff',
    ambient: 'snow',
    goalIcon: '🦴',
    character: 'puppy',
  },
  reef: {
    id: 'reef',
    name: 'Underwater Reef',
    bgTop: '#0a3a4a',
    bgBot: '#041820',
    floor: '#1a8a9a',
    floorAlt: '#168090',
    wallTop: '#f0a0a8',
    wallSide: '#c07078',
    wallShadow: 'rgba(0,20,40,0.45)',
    pathGlow: 'rgba(100, 255, 230, 0.22)',
    breadcrumb: 'rgba(150, 255, 255, 0.18)',
    entrance: '#ffe066',
    goal: '#ff6bcb',
    player: '#8dffb0',
    playerStroke: '#0a4a40',
    playerAccent: '#ff9ecd',
    collectible: '#7ef9ff',
    particleColors: ['#7ef9ff', '#ff6bcb', '#ffe066', '#4fd1c5', '#fff'],
    accent: '#4fd1c5',
    decor: '#ff8fab',
    ambient: 'bubbles',
    goalIcon: '🐚',
    character: 'explorer',
  },
  pirate: {
    id: 'pirate',
    name: 'Pirate Island',
    bgTop: '#2a2018',
    bgBot: '#100c08',
    floor: '#c4a574',
    floorAlt: '#b89868',
    wallTop: '#5c4030',
    wallSide: '#3a2818',
    wallShadow: 'rgba(0,0,0,0.5)',
    pathGlow: 'rgba(255, 220, 120, 0.2)',
    breadcrumb: 'rgba(255, 200, 100, 0.15)',
    entrance: '#ffd56a',
    goal: '#e8b923',
    player: '#7ec8ff',
    playerStroke: '#1a3a5c',
    playerAccent: '#c9a227',
    collectible: '#ffd700',
    particleColors: ['#ffd700', '#c4a574', '#5c4030', '#fff', '#e8b923'],
    accent: '#e8b923',
    decor: '#8b6914',
    ambient: 'sparkles',
    goalIcon: '💎',
    character: 'knight',
  },
  space: {
    id: 'space',
    name: 'Space Station',
    bgTop: '#12122a',
    bgBot: '#060610',
    floor: '#2a2a48',
    floorAlt: '#242440',
    wallTop: '#6a8cff',
    wallSide: '#3a4a8a',
    wallShadow: 'rgba(0,0,40,0.55)',
    pathGlow: 'rgba(120, 180, 255, 0.25)',
    breadcrumb: 'rgba(180, 200, 255, 0.15)',
    entrance: '#5dade2',
    goal: '#ff4fd8',
    player: '#b0c4de',
    playerStroke: '#2f3e52',
    playerAccent: '#5dade2',
    collectible: '#a29bfe',
    particleColors: ['#6a8cff', '#ff4fd8', '#5dade2', '#fff', '#a29bfe'],
    accent: '#6a8cff',
    decor: '#7d8aff',
    ambient: 'sparkles',
    goalIcon: '🛸',
    character: 'robot',
  },
};

/**
 * @param {string} [id]
 * @returns {MazeTheme}
 */
export function getTheme(id = 'garden') {
  return THEMES[id] || THEMES.garden;
}

/** All theme ids in display order */
export const THEME_IDS = Object.keys(THEMES);

/**
 * @param {string} difficultyId
 * @param {number} [n=0]
 */
export function themeForRun(difficultyId, n = 0) {
  const ids = THEME_IDS;
  if (difficultyId === 'easy') return THEMES.garden;
  if (difficultyId === 'medium') return THEMES[ids[n % ids.length]];
  if (difficultyId === 'hard') return THEMES.castle;
  return THEMES[ids[n % ids.length]];
}

/**
 * @param {MazeTheme} theme
 * @returns {MazeTheme}
 */
export function highContrastTheme(theme) {
  return {
    ...theme,
    floor: '#5cb878',
    floorAlt: '#4eaa68',
    wallTop: '#f0d0a0',
    wallSide: '#3a2810',
    pathGlow: 'rgba(255, 255, 100, 0.4)',
    player: '#ffffff',
    playerStroke: '#000000',
    goal: '#ff2080',
    entrance: '#ffff00',
  };
}
