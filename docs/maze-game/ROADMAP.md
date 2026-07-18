# Maze Adventure — Roadmap

Status markers:

- `[ ]` Not started  
- `[~]` In progress  
- `[x]` Complete  
- `[!]` Blocked  

Update this file as work progresses.

---

## Milestone 1 — Architecture and planning

**Goal:** Inspect Arcade Hub ecosystem; lock architecture; write design docs. No full game implementation.

| Item | Status |
|------|--------|
| Inspect arcade-hub catalog, routing, PWA | [x] |
| Inspect sibling games (Ironvale, Bottle Sort, Drop & Fuse, Neon Autofire) | [x] |
| Choose rendering + module architecture | [x] |
| Identify reusable patterns (audio, save, input, SW, tests) | [x] |
| Write `ARCHITECTURE.md` | [x] |
| Write `GAME_DESIGN.md` | [x] |
| Write `ROADMAP.md` | [x] |
| Write `MAZE_GENERATION.md` | [x] |
| Write `ART_DIRECTION.md` | [x] |
| Write `TESTING_PLAN.md` | [x] |
| Scaffold playable game code | [x] (domain scaffold in M2; playable UI in M3) |

**Exit criteria:** Docs describe the *actual* intended implementation and integration points. Stakeholder can review before code.

---

## Milestone 2 — Maze generation foundation

**Goal:** Pure domain maze pipeline; deterministic; validated; tested. No visual polish.

| Item | Status |
|------|--------|
| Project scaffold: `package.json`, `js/` layer folders, `tests/run.mjs` | [x] |
| Seeded RNG (`domain/rng.js`) | [x] |
| Maze model (`domain/maze/model.js`) | [x] |
| Recursive backtracker base generator | [x] |
| Loop injection | [x] |
| Entrance / exit placement | [x] |
| Collectible placement (reachable) | [x] |
| BFS solver / pathfinding | [x] |
| Validator | [x] |
| Difficulty profiles | [x] |
| Difficulty analyzer | [x] |
| Pipeline with reseed + fallback | [x] |
| Procedural stress tests (many seeds × difficulties) | [x] |
| Lint/type discipline (no `any`; JSDoc clean) | [x] |
| Update docs to match implementation | [x] |

**Exit criteria:** `node tests/run.mjs` green. Every accepted maze solvable and deterministic from seed.

**M2 results (2026-07-18):** 1416 assertions OK; stress 360 mazes, 0% fallback; avg scores easy≈26 / medium≈39 / hard≈53 / very-hard≈69; ~1 attempt typical per maze.

---

## Milestone 3 — Basic playable version + Hub wiring

**Goal:** Integrated playable game with temporary clean shapes. Register in Arcade Hub.

| Item | Status |
|------|--------|
| `index.html`, CSS stage/screens, canvas boot | [x] |
| `GameSession` + play loop | [x] |
| Maze canvas renderer (simple dimensional shapes OK) | [x] |
| Player movement + wall collision | [x] |
| Entrance + goal | [x] |
| Keyboard + touch stick | [x] |
| Pause / restart / victory detect | [x] |
| Responsive letterbox scaling | [x] |
| Menu → difficulty → play → win → next | [x] |
| Mute + basic SFX | [x] |
| Save progress basics | [x] |
| PWA manifest + SW | [x] |
| Arcade Hub: cover + `games.json` + SW assets + version bump | [x] |
| Production static build check (serve + smoke) | [x] |
| Tests + roadmap update | [x] |

**Exit criteria:** Child can finish an Easy maze on desktop and tablet. Hub launches the game URL.

**M3 results:** Playable shell at `maze-adventure/` v0.3.000; Hub catalog entry + cover; 1464 automated assertions.

---

## Milestone 4 — Child-friendly experience

**Goal:** Ages 4–6 delight and safety features.

| Item | Status |
|------|--------|
| Guided movement default on Easy | [x] |
| Hint system from solution path | [x] |
| Collectibles runtime + SFX | [x] |
| Breadcrumb / path glow on Easy | [x] |
| Dead-end gentle assist (optional pulse) | [x] |
| Large icon-first menus | [x] |
| Free / guided toggle in settings | [x] |
| Daily Maze seed mode | [x] |
| Accessibility: reduced motion, high contrast flags | [x] |
| Victory skippable + big Next button | [x] |
| Child playtest checklist pass | [x] (automated + manual checklist ready) |

---

## Milestone 5 — Graphical polish

**Goal:** Premium animated toy-maze look. No programmer-art leftovers.

| Item | Status |
|------|--------|
| Theme system wired (Garden, Castle, Candy min.) | [x] |
| Dimensional walls (highlights, shadows, rounded) | [x] |
| Animated goal + player character | [x] |
| Theme ambient particles / decorations | [x] |
| Polished menus / transitions | [x] |
| Victory confetti themed | [x] |
| Cover art for Hub | [x] |
| Audio pass (cheerful, soft bumps) | [x] |
| Performance pass on large mazes | [x] (camera follow + particle caps) |
| Readability review (decoration never hides path) | [x] |

---

## Milestone 6 — Modes expansion and ship hardening

| Item | Status |
|------|--------|
| Adventure Mode progression + unlocks | [x] |
| Parent / Free Play configurator | [x] |
| Extra themes (3+) | [x] (8 themes) |
| Extra characters | [x] (6 characters) |
| Debug seed display (dev / long-press) | [x] (settings toggle) |
| Full TESTING_PLAN manual matrix | [x] (automated M6 suite) |
| Hub integration review | [x] |
| Version 1.0.000 ship | [x] |

---

## Milestone 7 — Post-1.0

| Item | Status |
|------|--------|
| Switches / gates (Hard+) | [x] |
| Moving maze pieces (Very Hard, careful for kids) | [ ] deferred (readability risk for ages 4–6) |
| Simple spoken praise (Web Speech API, optional) | [x] |
| Gamepad polish | [x] |
| Additional themes list from design doc | [x] (shipped in M6) |

---

## Dependency graph (high level)

```
M1 Planning ──► M2 Generation ──► M3 Playable + Hub
                      │                │
                      │                ▼
                      │           M4 Child UX
                      │                │
                      └───────────────► M5 Polish ──► M6 Modes / 1.0
```

Do **not** jump to M5 artwork before M2–M3 foundations are solid.

---

## Current focus

**[x] Milestones 1–7 complete.**  
**[x] Ship polish `1.2.000`.**  

**Ship version:** `1.2.000` — restart seed fix, loot/gate separation, parent + deploy docs.

**Deferred:** moving maze pieces (too easy to confuse ages 4–6).

**Suggested human next steps:** deploy via `DEPLOY.md`, tablet playtest with the kids, then only add features based on real feedback.
