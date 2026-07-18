# Maze Adventure — Testing Plan

Tests follow Arcade Hub game conventions: **`node tests/run.mjs`**, no browser, no Jest/Vitest dependency. Domain logic is pure ES modules (Ironvale pattern).

---

## 1. Philosophy

| Layer | How tested |
|-------|------------|
| Domain (maze, rng, difficulty, movement math) | Automated Node unit/stress tests |
| GameSession systems | Node with memory save + stub audio |
| Adapters (render, input DOM) | Smoke file-existence + manual; optional later canvas mocks |
| Child UX / touch | Manual tablet matrix |
| Hub integration | Catalog validation + manual launch |

**Golden rule:** If a maze can appear on screen, automated tests have already proven a statistically large sample of seeds for that profile is solvable and deterministic.

---

## 2. Tooling

```bash
cd maze-adventure
npm test
# or
node tests/run.mjs
```

- `package.json`: `"type": "module"`, `"test": "node tests/run.mjs"`  
- Import domain modules via `pathToFileURL` (Ironvale style)  
- Assert helpers: `assert`, `assertEq`, section printers, final exit code 1 on failure  

Optional later: `node --check` on all JS files; no TypeScript emit.

---

## 3. Automated suites by milestone

### Milestone 2 — Generation foundation (must ship with M2)

| Suite | Assertions |
|-------|------------|
| **RNG** | Same seed → same sequence; different seeds diverge; `int` bounds; shuffle permutation |
| **Model** | Wall consistency helpers; index/coord conversion |
| **Generate** | All cells visited; perfect-maze edge count before loops; no carve OOB |
| **Loops** | `loopChance=0` → no extra edges; high chance increases edge count |
| **Place** | Entrance ≠ exit; both open; on-grid |
| **BFS** | Known tiny maze path length; unreachable returns null |
| **Validate** | Good maze ok; broken exit not ok; collectible in wall not ok |
| **Analyze** | Metrics finite; score monotone-ish with size in samples |
| **Pipeline determinism** | `pipeline(p,s)` deep-equal twice |
| **Pipeline solvability** | 200 seeds × 4 difficulties → all accepted mazes BFS-solvable |
| **Reseed** | Forced invalid intermediate still yields ok maze or fallback |
| **Fallback** | `buildFallbackMaze` always validates |
| **Daily seed format** | Stable string for fixed date mock |

Stress (M2):

- 1000 easy seeds  
- 500 medium  
- 200 hard  
- 100 very-hard  
- Time budget log (warn, don’t fail, unless >5s total on CI laptop)  

### Milestone 3 — Playable integration

| Suite | Assertions |
|-------|------------|
| PWA shell files exist | index, manifest, sw, icons, css |
| Version sync | `GAME_VERSION` string appears in `sw.js` CACHE |
| Session start | `startQuick('easy')` sets play screen + maze |
| Movement blocked by wall | unit step into wall leaves position unchanged |
| Reach goal | teleport/simulate along solution → `won === true` |
| Pause | update does not advance player while paused |
| Save mute roundtrip | memory save |
| Hub catalog (in arcade-hub tests) | after registration: cover exists, https url |

### Milestone 4 — Child UX

| Suite | Assertions |
|-------|------------|
| Guided mode stays in corridor centers | property tests on simple hallway |
| Hint path subset of solution | active hint cells ⊆ solution |
| Collectible pickup | count increments; cell cleared |
| Easy profile flags | guided true, timer false, hints true |

### Milestone 5 — Themes / polish

| Suite | Assertions |
|-------|------------|
| Theme ids resolve | every profile can pick default theme |
| Theme swap no gen change | same seed + different theme → same cells |
| Particle cap | spawn storm ≤ maxActive |

---

## 4. Manual test matrix

### Devices

| Device | Priority |
|--------|----------|
| Desktop Chrome + keyboard | P0 |
| Desktop Firefox | P1 |
| iPad / Android tablet touch | P0 (kids) |
| Phone portrait | P0 |
| PWA installed standalone | P1 |

### Child scenarios (ages 4 and 6)

| # | Scenario | Pass criteria |
|---|----------|---------------|
| C1 | First open → Easy play | Understand goal without reading |
| C2 | Joystick drag wildly | Never leaves maze through walls |
| C3 | Dead end | Can recover; optional hint works |
| C4 | Reach goal | Celebration; can tap Next immediately |
| C5 | Accidental menu | Can resume or restart without data loss panic |
| C6 | Mute | Stays muted across reload |
| C7 | Medium after Easy | Noticeably harder, still fair |

### Difficulty acceptance

| Difficulty | Manual check |
|------------|--------------|
| Easy | Full maze visible; < ~60s for adult first try; kid completable with hints |
| Medium | Some wrong turns; still on one screen if possible |
| Hard | Camera follow OK; solution non-obvious |
| Very Hard | Long; performance ≥ 30 FPS on mid tablet |

### Accessibility

- High contrast readable  
- Reduced motion calmer  
- Keyboard-only full clear  

---

## 5. Regression checklist (every milestone)

- [ ] `node tests/run.mjs` exit 0  
- [ ] No `Math.random()` in `js/domain/maze/**`  
- [ ] No broken imports (`type: module`)  
- [ ] Serve via `python3 -m http.server` or `npm start` and click through Easy  
- [ ] Update ROADMAP statuses  
- [ ] Update ARCHITECTURE decisions if implementation diverged  

---

## 6. Hub integration tests

After catalog entry:

```bash
cd arcade-hub && node tests/run.mjs
```

Must validate:

- `games.json` entry shape  
- Cover file on disk  
- https URL  
- SW ASSETS includes new cover  
- At most one featured game  

---

## 7. Performance checks

| Metric | Target |
|--------|--------|
| Easy gen | < 16ms typical |
| Very Hard gen | < 100ms typical |
| Play rAF | ≥ 30 FPS on tablet; 60 preferred |
| Particle count | soft cap ~80 |

Log generation ms in debug builds; automated stress prints averages.

---

## 8. What we will not test automatically in v1

- Pixel-perfect canvas golden images  
- Real WebAudio sound waveforms  
- App Store / Play Store packaging  
- Multiplayer  

---

## 9. Bug triage priorities

| Priority | Examples |
|----------|----------|
| P0 | Unsolvable maze, soft-lock, crash on start, touch pass-through walls |
| P1 | Hint wrong path, save loss, broken pause, unreadable goal |
| P2 | Theme misalignment, particle pop-in, SFX timing |
| P3 | Cosmetics, copy typos |

P0 blocks milestone exit.
