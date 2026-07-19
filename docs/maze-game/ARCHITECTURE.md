# Maze Adventure — Architecture

**Status:** Milestone 6 complete — production ship  
**Game id:** `maze-adventure`  
**Title:** Maze Adventure  
**Audience:** Children ages 4–6 primary; harder difficulties for older kids and adults  
**Current version:** `1.2.000`  

---

## 1. Where the game lives

Arcade Hub is a **catalog launcher**, not a monorepo game host. Games are **sibling static web apps** deployed to GitHub Pages and listed in `arcade-hub/games.json`.

| Concern | Location |
|---------|----------|
| Game source | `/mnt/c/Users/jmitc/workspace/Games/maze-adventure/` |
| Planning docs | `maze-adventure/docs/maze-game/` |
| Hub catalog entry | `arcade-hub/games.json` (register at Milestone 3+) |
| Hub cover art | `arcade-hub/art/covers/maze-adventure.jpg` |
| Live URL (planned) | `https://jmitchell238.github.io/maze-adventure/` |

**Hub integration is link-out only.** The hub does not bundle game code. Playing opens the game’s Pages URL (same pattern as Bottle Sort, Ironvale, Drop & Fuse).

---

## 2. Framework and stack (decisions from repo inspection)

| Topic | Decision | Why |
|-------|----------|-----|
| Language | **ES modules, plain JavaScript** with JSDoc typedefs | Matches Ironvale; zero build step; GitHub Pages static deploy |
| Rendering | **Canvas 2D** (`getContext('2d')`) | Every Arcade Hub game uses Canvas 2D; no Phaser/Pixi/WebGL dependency in hub library |
| Module style | `import` / `export` (Ironvale pattern) | Pure domain testable under Node without browser |
| UI chrome | DOM overlays on `#stage` + canvas world | Same as Bottle Sort / Ironvale: large kid-friendly buttons in HTML |
| Audio | Web Audio API synthesised SFX (beeps / arps) | Same pattern as bottle-sort / ironvale `adapters/audio.js` |
| Save | `localStorage` key `maze-adventure-v1` | Per-game isolated save, no shared hub storage API |
| PWA | Own `manifest.webmanifest` + `sw.js` | Offline shell after first visit |
| Tests | `node tests/run.mjs` | No browser, no test framework dependency |
| TypeScript | **Not used for v1** | Hub games ship without Vite/tsc; JSDoc documents contracts. Revisit only if tooling is added hub-wide. |

**Not chosen:** Phaser, PixiJS, React, WebGL, TypeScript+Vite (code_quest_ts is outside the Arcade Hub set).

---

## 3. Best architectural example in the library

### Primary model: **Ironvale**

Layered ES modules with a strict dependency rule:

```
app → adapters → world (GameSession + systems) → domain → config / core
```

Domain never imports adapters or DOM. Render never mutates session state. This is the right shape for a non-trivial procedural game with validation, difficulty analysis, and multiple systems.

### Secondary model: **Bottle Sort**

Kid-facing UX patterns we will mirror:

- Logical stage size letterboxed to the viewport (`W` × `H`, e.g. 390×700)
- DOM screens: `menu` / `play` / `win` with huge primary buttons
- Web Audio beeps, particle confetti, mute toggle
- `GAME_VERSION` in `js/config` kept in sync with SW `CACHE`
- `node tests/run.mjs` for pure logic

### Tertiary reference: **Drop & Fuse**

- Canvas particles + continuous play loop
- Pointer / touch input mapped to stage coordinates

---

## 4. Shared systems to reuse (by pattern, not by package)

There is **no shared npm package** across Arcade Hub games. Reuse means **copy the proven pattern**, not import from another game repo.

| System | Source pattern | Maze Adventure module |
|--------|----------------|------------------------|
| Version + SW cache naming | bottle-sort / ironvale | `js/config/index.js`, `sw.js` |
| Canvas letterbox resize | bottle-sort `render.js` | `js/adapters/render/canvas.js` |
| Web Audio SFX | bottle-sort `audio.js` | `js/adapters/audio.js` |
| localStorage save + mute | bottle-sort / ironvale | `js/adapters/save.js` |
| Virtual stick + keyboard | ironvale `adapters/input.js` | `js/adapters/input.js` (adapted for 4-dir maze) |
| Particles | bottle-sort `particles.js` | `js/adapters/particles.js` |
| GameSession façade | ironvale `world/GameSession.js` | `js/world/GameSession.js` |
| Memory save for tests | ironvale `createMemorySave` | `js/adapters/save.js` |
| PWA install / auto-update | all hub games | `js/app/main.js` + `sw.js` |
| Hub catalog registration | arcade-hub README | `games.json` entry only |

---

## 5. Layer diagram

```
┌──────────────────────────────────────────────────────────────┐
│  app/main.js          Boot, screens, rAF loop, hub back link │
└───────────────────────────────┬──────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────┐
│  adapters/            Outside world                          │
│    input · audio · save · particles · render/* · sprites     │
└───────────────────────────────┬──────────────────────────────┘
                                │ drives / reads
┌───────────────────────────────▼──────────────────────────────┐
│  world/GameSession.js   Mutable run + screen state           │
│  world/systems/         player · camera · collectibles ·     │
│                         hints · victory · hud                │
└───────────────────────────────┬──────────────────────────────┘
                                │ pure calls
┌───────────────────────────────▼──────────────────────────────┐
│  domain/                  No DOM, no Math.random             │
│    maze/*  (model, gen, validate, solve, analyze, place)     │
│    movement/* · difficulty · themes (data) · modes · scoring │
│    rng.js · pathfinding.js                                   │
└───────────────────────────────┬──────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────┐
│  config/                  Numbers + DifficultyProfile tables │
│  core/                    clamp, lerp, grid math, seeds      │
└──────────────────────────────────────────────────────────────┘
```

**Dependency rule:** arrows only point **down**. Domain never imports adapters or app.

---

## 6. Proposed file tree

```
maze-adventure/
├── index.html
├── manifest.webmanifest
├── sw.js
├── package.json                 # { "type": "module", "scripts": { "test": "node tests/run.mjs" } }
├── README.md
├── ARCHITECTURE.md              # short pointer → docs/maze-game/ARCHITECTURE.md
├── apple-touch-icon.png
├── art/
│   └── cover.jpg                # 3:4 hub cover (also copied into arcade-hub)
├── icons/
│   ├── icon-180.png
│   ├── icon-192.png
│   └── icon-512.png
├── css/
│   └── style.css                # neon-arcade + kid-scale buttons (hub family look)
├── docs/
│   └── maze-game/
│       ├── ARCHITECTURE.md      # this file
│       ├── GAME_DESIGN.md
│       ├── ROADMAP.md
│       ├── MAZE_GENERATION.md
│       ├── ART_DIRECTION.md
│       └── TESTING_PLAN.md
├── assets/                      # optional sprite sheets (Milestone 5+)
│   ├── characters/
│   ├── themes/
│   └── ui/
├── js/
│   ├── app/
│   │   └── main.js
│   ├── adapters/
│   │   ├── audio.js
│   │   ├── input.js
│   │   ├── save.js
│   │   ├── particles.js
│   │   ├── sprites.js
│   │   └── render/
│   │       ├── canvas.js        # resize, letterbox
│   │       ├── maze.js          # walls, floors, decorations
│   │       ├── entities.js      # player, goal, collectibles
│   │       ├── effects.js       # shadows, ambient, victory FX
│   │       └── ui-canvas.js     # optional HUD paint
│   ├── world/
│   │   ├── GameSession.js
│   │   └── systems/
│   │       ├── player.js
│   │       ├── camera.js
│   │       ├── collectibles.js
│   │       ├── hints.js
│   │       ├── victory.js
│   │       └── hud.js
│   ├── domain/
│   │   ├── rng.js               # seeded PRNG (mulberry32 or xorshift32)
│   │   ├── pathfinding.js       # BFS / A*
│   │   ├── maze/
│   │   │   ├── model.js         # grid cells, walls, entrance/exit
│   │   │   ├── generate.js      # recursive backtracker + loops
│   │   │   ├── place.js         # entrance, exit, collectibles
│   │   │   ├── validate.js
│   │   │   ├── analyze.js       # difficulty metrics
│   │   │   └── pipeline.js      # full generate → validate → accept
│   │   ├── movement/
│   │   │   ├── free.js
│   │   │   └── guided.js
│   │   ├── difficulty.js        # DifficultyProfile registry
│   │   ├── themes.js            # theme data (no draw code)
│   │   ├── characters.js
│   │   ├── modes.js             # quick / daily / adventure / freeplay
│   │   └── scoring.js
│   ├── config/
│   │   └── index.js             # W, H, speeds, profiles, version
│   └── core/
│       └── math.js
└── tests/
    └── run.mjs
```

---

## 7. Module responsibilities

| Boundary | Module(s) | Responsibility |
|----------|-----------|----------------|
| **Game shell** | `app/main.js`, `index.html`, screens in CSS | Boot, rAF, screen routing, DOM buttons, hub return link |
| **Maze generator** | `domain/maze/generate.js`, `pipeline.js` | Seeded base maze + optional loops |
| **Maze validator** | `domain/maze/validate.js` | Solvability, placement rules, size bounds |
| **Maze renderer** | `adapters/render/maze.js` | Draw walls/floors from logical model + theme |
| **Player controller** | `world/systems/player.js` + `domain/movement/*` | Input → motion; free vs guided |
| **Goal & collectibles** | `domain/maze/place.js` + `world/systems/collectibles.js` | Placement rules + pickup runtime |
| **Difficulty system** | `domain/difficulty.js` + `domain/maze/analyze.js` | Profiles + measured difficulty score |
| **Theme system** | `domain/themes.js` + render theme reads | Skin data only; no generation branching |
| **UI / overlays** | DOM screens + `world/systems/hud.js` | Menu, pause, win, difficulty pick, free-play |
| **Audio** | `adapters/audio.js` | SFX / optional soft loops; mute from save |
| **Persistence** | `adapters/save.js` | Progress, settings, daily completion flags |
| **Arcade Hub adapter** | catalog fields + back button URL | External only; no hub code imported |

---

## 8. Game-state architecture

`GameSession` owns mutable runtime state. Screens:

```
'menu' | 'mode-select' | 'difficulty' | 'freeplay' | 'play' | 'pause' | 'win'
```

Core run fields (conceptual):

```js
/** @typedef {'easy'|'medium'|'hard'|'very-hard'} DifficultyId */

/**
 * @typedef {object} RunState
 * @property {string} seed
 * @property {DifficultyId} difficulty
 * @property {string} themeId
 * @property {string} characterId
 * @property {string} mode            // 'quick' | 'daily' | 'adventure' | 'freeplay'
 * @property {import('./maze/model.js').Maze} maze
 * @property {{ x:number, y:number, cellX:number, cellY:number, facing:string }} player
 * @property {{ collected:number, total:number, ids:string[] }} collectibles
 * @property {number[]} solutionPath  // cell indices along shortest path
 * @property {'guided'|'free'} movementMode
 * @property {boolean} timerEnabled
 * @property {number} elapsed
 * @property {number} hintsUsed
 * @property {object|null} activeHint
 * @property {boolean} won
 */
```

- **Start run:** `session.startQuick(difficulty)` / `startDaily()` / `startAdventure()` / `startFreeplay(options)`
- **Update:** `session.update(dt, input)` — systems mutate `RunState`
- **Render:** adapters read a snapshot or live session fields; never write score/win flags

---

## 9. Rendering architecture

1. **Logical coordinates** in maze cells (integers) and world pixels (floats) independent of screen CSS size.
2. **Stage letterbox** maps logical `W`×`H` to device with DPR cap (match bottle-sort: `devicePixelRatio` ≤ 2.5).
3. **Camera modes** (from difficulty profile):
   - `full` — entire maze fits in view (Easy / Medium default)
   - `follow` — camera tracks player with soft lerp (Hard+)
   - `limited` — follow with fog/edge dim (Very Hard optional)
4. **Draw order (play):**
   1. Theme background / ambient
   2. Floor tiles / path fill
   3. Wall shadows
   4. Wall bodies (thick, rounded, lit)
   5. Decorations (behind player)
   6. Collectibles
   7. Entrance / exit markers
   8. Player + trail
   9. Hint overlays
   10. Particles / celebration
   11. Canvas HUD accents (optional; primary chrome is DOM)

Walls are **not** CSS grid borders. They are filled rounded prisms with highlight + shadow gradients. Temporary Milestone 3 art may use simple rounded fills, replaced by theme polish in Milestone 5.

---

## 10. Input architecture

`adapters/input.js` produces a normalized poll each frame:

```js
/** @typedef {{ x:number, y:number, pause:boolean, hint:boolean, restart:boolean }} GameInput */
```

| Device | Mapping |
|--------|---------|
| Keyboard | Arrow keys / WASD → axis; Esc → pause; H → hint; R → restart |
| Pointer / mouse | **Tap a cell** to step; drag for virtual stick; or keyboard |
| Touch | **Tap next square** (default); drag past threshold for stick |
| Gamepad | If `navigator.getGamepads` present: left stick + face button for hint; Start = pause |

**Default Easy touch:** tap adjacent open cell + **guided movement** so motion stays on corridor centers.

**Collision safety:** movement systems integrate velocity with continuous segment vs wall tests (or cell-step with center snap in guided mode). Never teleport to raw pointer position through walls.

---

## 11. Maze-generation architecture

See **MAZE_GENERATION.md** for algorithms and metrics.

Pipeline entry: `domain/maze/pipeline.js`

```
DifficultyProfile + seed
  → SeededRng
  → baseGenerate (recursive backtracker on cell grid)
  → addLoops (profile.loopChance)
  → placeEntranceExit
  → placeCollectibles
  → validate (BFS solvability + rules)
  → analyze difficulty score
  → accept or reseed (maxAttempts, then fallback easy-safe maze)
  → attach render hints (solution path, dead-end list)
```

Logical model is wall-bit or edge-adjacency grid; renderer interprets theme.

---

## 12. Collision and movement

| Mode | Behavior | Default for |
|------|----------|-------------|
| **Guided** | Player eases along corridor centerline; input chooses next junction direction | Easy |
| **Free** | Continuous velocity in open cells; circle vs wall AABB / thick edges | Medium+ optional |

- Player radius smaller than corridor half-width.
- Goal trigger: distance to goal center under threshold **or** cell equality.
- Collectible pickup: same distance rule; only on path cells.

---

## 13. Animation architecture

- rAF loop with `dt` clamped (~33ms).
- Player: bob / walk cycle parameter from speed.
- Goal: pulse scale + sparkle spawn rate.
- Collectibles: float sine + spin.
- Ambient: theme particles (petals, sparkles, bubbles) budgeted by device.
- Victory: short particle burst + character hop; skippable via Next.

No separate animation engine — parametric + particle system only for v1.

---

## 14. Audio architecture

`adapters/audio.js`:

- Lazy `AudioContext` on first gesture
- Respect `save.muted`
- Functions: `sfxMove`, `sfxCollect`, `sfxHint`, `sfxWin`, `sfxClick`, `sfxWallBump` (soft, never harsh)
- Optional simple looping pad per theme later; not required for Milestone 3

---

## 15. Save-data architecture

Key: `maze-adventure-v1`

```js
{
  muted: false,
  movementPref: 'auto',       // auto | guided | free
  reducedMotion: false,
  highContrast: false,
  adventureProgress: 0,       // stages cleared
  themesUnlocked: ['garden'],
  charactersUnlocked: ['explorer'],
  bestByDifficulty: { easy: 0, medium: 0, hard: 0, 'very-hard': 0 },
  daily: { dateKey: '', difficulty: '', completed: false },
  gamesCompleted: 0,
  totalCollectibles: 0,
  lastDifficulty: 'easy'
}
```

Export `createMemorySave(seed)` for tests (Ironvale pattern).

---

## 16. Difficulty configuration

Central registry in `domain/difficulty.js` + numeric defaults in `config/index.js`.

```js
/**
 * @typedef {object} DifficultyProfile
 * @property {DifficultyId} id
 * @property {number} minRows
 * @property {number} maxRows
 * @property {number} minColumns
 * @property {number} maxColumns
 * @property {number} corridorWidth      // logical units; 1 = standard cell
 * @property {number} loopChance         // 0..1 extra edges after spanning tree
 * @property {[number, number]} targetSolutionRatio  // solutionLen / cells
 * @property {number} maxDeadEndRatio
 * @property {[number, number]} collectibleCount
 * @property {boolean} hintsEnabled
 * @property {boolean} guidedMovement
 * @property {'full'|'follow'|'limited'} cameraMode
 * @property {boolean} optionalTimer
 * @property {boolean} pathGlowDefault   // soft solution glow for Easy
 * @property {number} maxGenAttempts
 */
```

Profiles: `easy`, `medium`, `hard`, `very-hard`. Free Play may override fields via a cloned profile.

---

## 17. Theme configuration

`domain/themes.js` exports pure data:

```js
/**
 * @typedef {object} MazeTheme
 * @property {string} id
 * @property {string} name
 * @property {object} floorStyle
 * @property {object} wallStyle
 * @property {object} backgroundStyle
 * @property {object} decorations
 * @property {object} collectibles
 * @property {object} audio
 * @property {object} effects
 * @property {string} goalLabel   // visual objective id
 */
```

Initial three themes for ship:

1. **Enchanted Garden** (`garden`) — default unlock  
2. **Toy Castle** (`castle`)  
3. **Candy Kingdom** (`candy`)  

Additional themes (Dinosaur Valley, Space Station, …) are data-only expansions; generation never branches on theme id.

---

## 18. Arcade Hub integration

When the game is playable (Milestone 3+):

1. Deploy `maze-adventure` to GitHub Pages.
2. Add cover `arcade-hub/art/covers/maze-adventure.jpg` (3:4).
3. Append catalog entry:

```json
{
  "id": "maze-adventure",
  "title": "Maze Adventure",
  "subtitle": "Find the way. Have fun.",
  "description": "Guide a cute explorer through colorful toy mazes. Procedural levels from Easy for little kids to Very Hard for big challenges.",
  "url": "https://jmitchell238.github.io/maze-adventure/",
  "cover": "art/covers/maze-adventure.jpg",
  "accent": "#7dffa0",
  "tags": ["Puzzle", "Kids", "Maze"],
  "featured": false,
  "repo": "maze-adventure"
}
```

4. List cover in `arcade-hub/sw.js` `ASSETS` and bump `HUB_VERSION`.

In-game: secondary button **Arcade Hub** → `https://jmitchell238.github.io/arcade-hub/` (or relative if ever co-hosted).

---

## 19. Testing strategy

See **TESTING_PLAN.md**.

- Pure domain tests: RNG determinism, generation, BFS, validation, difficulty analysis, stress seeds.
- Session tests with memory save + no-op audio.
- Shell tests: required files exist, version/SW string sync.
- Manual tablet / child playtests before polish ship.

---

## 20. Performance considerations

| Concern | Approach |
|---------|----------|
| Large mazes (25×25) | Draw only visible cells under follow camera; cache wall path layer to offscreen canvas when maze loads |
| Particles | Cap active particles; reduce ambient on low DPR / reduced motion |
| Generation | Offline of rAF critical path; regenerate synchronously only for small mazes; yield if needed for very-hard |
| DPR | Cap at 2–2.5 |
| Shadows | Soft gradient fills, not multi-pass blur filters |

---

## 21. Accessibility considerations

- Large touch targets (≥48 CSS px, prefer 64+ for primary actions)
- High-contrast mode: stronger wall/path separation
- Reduced motion: disable ambient float / confetti density drop
- Color not sole cue for goal (shape + pulse)
- Hints unlimited on Easy; never shaming copy
- Mute always available
- Keyboard fully playable without touch
- No seizure-prone full-screen strobe

---

## 22. Key architectural decisions log

| # | Decision | Rationale |
|---|----------|-----------|
| A1 | Sibling game repo, not code inside arcade-hub | Hub design is link catalog only |
| A2 | Canvas 2D, not WebGL/Phaser | Consistency + simplicity for kids PWA |
| A3 | Ironvale layers + Bottle Sort UX | Best of structure + kid polish |
| A4 | ES modules + JSDoc, not TypeScript | No build step in hub ecosystem |
| A5 | Recursive backtracker + loop injection | Controllable dead-ends; classic perfect maze base |
| A6 | Guided movement default on Easy | Ages 4–6 wall-bump frustration |
| A7 | Theme data ≠ generation | One pipeline, many skins |
| A8 | Validate every maze or reseed | No broken levels reach players |
| A9 | Seeded RNG only in domain gen | Determinism for daily + debug |
| A10 | Difficulty score: size + path length primary | Separates Easy≈26 vs Very Hard≈69 cleanly |
| A11 | Pipeline relaxes score band after ~55% attempts | Prevents rare hard-reject loops; serpentine fallback last |

---

## 23. Milestone 2 implementation map (actual files)

| File | Role |
|------|------|
| `js/config/index.js` | `GAME_VERSION` `0.2.000`, `W`/`H`, `GEN`, `MOVE` |
| `js/core/math.js` | clamp, lerp, dist, norm01, deepEqual |
| `js/domain/rng.js` | hashSeed, createRng (mulberry32), dailySeed, retrySeed |
| `js/domain/pathfinding.js` | bfsPath, floodReachable, bfsDistances |
| `js/domain/difficulty.js` | PROFILES, getProfile, cloneProfile |
| `js/domain/maze/model.js` | grid, carve, wall checks, topology key |
| `js/domain/maze/generate.js` | recursive backtracker, injectLoops |
| `js/domain/maze/place.js` | entrance/exit, collectibles |
| `js/domain/maze/analyze.js` | metrics + difficultyScore |
| `js/domain/maze/validate.js` | validateMaze / validateStructure |
| `js/domain/maze/pipeline.js` | generateValidatedMaze, fallbacks |
| `tests/run.mjs` | 1400+ assertions incl. stress |

**Not yet implemented (M3+):** adapters, GameSession, canvas, PWA shell, hub catalog.

---

## 24. Out of scope for remaining work

- Final artwork production (M5)
- Hub catalog registration before playable build (M3)
- Multiplayer, accounts, ads, IAP
