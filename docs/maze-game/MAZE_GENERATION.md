# Maze Adventure — Maze Generation

This document specifies the **actual** generation pipeline for Maze Adventure. Implementation lives under `js/domain/maze/` and `js/domain/rng.js`.

---

## 1. Goals

Every maze presented to a player must:

1. Be generated from a **seed** (reproducible)  
2. Have **one entrance** and **at least one reachable exit**  
3. Be **solvable** (BFS-proven)  
4. Place player and goal on **open cells**  
5. Place collectibles only on **reachable open cells**  
6. Match the active **DifficultyProfile** metrics window  
7. Fit the intended **camera / viewport** strategy for that difficulty  

Never use ambient `Math.random()` inside generation. All entropy comes from `SeededRng`.

---

## 2. Logical model

Use a **grid of cells** with walls on edges (or four wall-bits per cell). Rendering is free to round and extrude; logic stays discrete.

```js
/**
 * @typedef {object} MazeCell
 * @property {number} x
 * @property {number} y
 * @property {boolean} north  // wall present
 * @property {boolean} south
 * @property {boolean} east
 * @property {boolean} west
 * @property {boolean} open   // always true for in-bounds cells; reserved for future holes
 */

/**
 * @typedef {object} Maze
 * @property {number} rows
 * @property {number} cols
 * @property {MazeCell[]} cells          // row-major
 * @property {{x:number,y:number}} entrance
 * @property {{x:number,y:number}} exit
 * @property {{x:number,y:number,id:string}[]} collectibles
 * @property {string} seed
 * @property {string} difficultyId
 * @property {number[]} solution         // cell indices entrance→exit shortest
 * @property {object} metrics            // from analyzer
 */
```

**Coordinates:** `(0,0)` top-left; `+x` east; `+y` south. World pixels = `cell * cellSize + offset` in the renderer, never mixed into generation.

---

## 3. Seeded RNG

**Algorithm:** Mulberry32 (fast, adequate distribution for maze gen) seeded from a 32-bit hash of the string seed.

```js
// domain/rng.js (conceptual)
export function hashSeed(str) { /* FNV-1a or cyrb53 → uint32 */ }
export function createRng(seedStr) {
  let a = hashSeed(String(seedStr));
  return {
    next() { /* mulberry32 → [0,1) */ },
    int(min, max) { /* inclusive */ },
    pick(arr) { /* */ },
    shuffle(arr) { /* Fisher–Yates */ },
    fork(label) { return createRng(seedStr + ':' + label); },
  };
}
```

**Daily seeds:** `daily:${YYYY-MM-DD}:${difficultyId}` using **local** date.

**Reseed on failure:** `seed + ':retry:' + attemptIndex`.

**Debug:** store and optionally display raw seed string on win screen long-press or `?debug=1`.

---

## 4. Algorithm choice

| Stage | Algorithm | Why |
|-------|-----------|-----|
| Base maze | **Recursive backtracker** (randomized DFS) | Long winding corridors; classic “maze” feel; easy to implement; perfect maze (one path between any two cells) |
| Complexity | **Loop injection** | Knock down walls between adjacent cells with probability `loopChance` to add alternate routes |
| Entrance/exit | Farthest-ish pair on border with constraints | Ensures longer solutions when needed |
| Solver | **BFS** | Shortest path; unweighted grid |
| Fallback | Tiny hand-shaped guaranteed maze from constants | If max attempts fail (should be rare) |

**Why not Kruskal/Prim only?** They also produce perfect mazes; recursive backtracker tends toward longer corridors which feel better for exploration. Loops are added explicitly so difficulty profiles control braidiness.

**Why not Wilson’s as primary?** Excellent unbiased mazes but heavier; can be a Milestone 7 alternate generator flagged in profile later.

---

## 5. Pipeline

```
DifficultyProfile profile
string seed
        │
        ▼
┌───────────────────┐
│ createRng(seed)   │
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ choose rows/cols  │  rng.int(profile.minRows, profile.maxRows) etc.
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ baseGenerate()    │  recursive backtracker; all walls up, carve passages
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ injectLoops()     │  for each internal wall, maybe remove if rng < loopChance
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ placeEntranceExit │  border cells; maximize BFS distance within attempts
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ placeCollectibles │  sample open reachable cells; Easy bias to solution band
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ validate()        │  hard fail → retry
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ analyze()         │  metrics + difficultyScore
└─────────┬─────────┘
          ▼
   in range? ──no──► retry with derived seed (maxAttempts)
        │ yes
        ▼
   attach solution path + metrics → Maze
```

**maxAttempts:** profile-driven (e.g. 40). After exhaustion: `buildFallbackMaze(profile)` — simplified guaranteed layout still matching size band if possible.

---

## 6. Base generation (recursive backtracker)

1. Create `rows × cols` cells with all four walls true.  
2. Pick start cell (rng).  
3. Stack-based DFS: from current, list unvisited neighbors; carve wall between; visit; backtrack when stuck.  
4. Result: perfect maze (spanning tree of cells).

Neighbor order **must** be rng-shuffled each step for variety.

---

## 7. Loop injection

For each pair of adjacent cells that still share a wall:

- If `rng.next() < profile.loopChance`, remove the shared wall (both sides).  
- Optional cap: max loops = `floor(cells * loopChance * k)` to avoid near-open fields on Easy.

Easy: `loopChance ≈ 0.02–0.05` (almost perfect, few shortcuts).  
Very Hard: `loopChance ≈ 0.12–0.22` (more braids, more misdirection).

---

## 8. Entrance and exit placement

Constraints:

- Prefer **border** cells (entrance west/south; exit opposite-ish).  
- Entrance ≠ exit.  
- Maximize shortest-path length among a sample of candidate pairs (e.g. 12 trials).  
- Reject pairs with solution length outside profile’s absolute min/max steps if set.

Easy: entrance and exit on opposite borders, relatively short path OK if metrics say so.  
Very Hard: push for long solution relative to size.

---

## 9. Collectible placement

```
count = rng.int(profile.collectibleCount[0], profile.collectibleCount[1])
reachable = BFS flood from entrance
candidates = reachable minus entrance minus exit
```

- Easy: weight cells by inverse distance to nearest solution-path cell (prefer near path).  
- Hard+: more uniform among reachable.  
- Never inside walls; never blocking entrance/exit cell.  
- IDs stable: `c0`, `c1`, … for save/debug.

---

## 10. Validation checklist

`validate(maze, profile)` returns `{ ok, errors[] }`:

| Check | Rule |
|-------|------|
| Dimensions | rows/cols within profile min/max |
| Entrance in bounds / open | yes |
| Exit in bounds / open | yes |
| Exit reachable from entrance | BFS path exists |
| All collectibles reachable | each in flood fill |
| No required area disconnected | N/A if only entrance flood used |
| Path width | corridorWidth ≥ 1 cell (v1 single-cell corridors; thicker is visual padding) |
| Player spawn clear | entrance cell open |
| Goal clear | exit cell open |
| Wall consistency | if A.east wall then B.west wall for neighbor B |
| Solution length | within analyzer soft bounds or hard min ≥ 2 |

On `ok === false`, pipeline retries.

---

## 11. Difficulty analysis

`analyze(maze)` computes:

| Metric | Definition |
|--------|------------|
| `solutionLength` | BFS steps entrance→exit |
| `cellCount` | rows * cols |
| `solutionRatio` | solutionLength / cellCount |
| `deadEnds` | cells with 3 walls (1 open edge), excluding entrance/exit |
| `deadEndRatio` | deadEnds / cellCount |
| `intersections` | cells with ≥ 3 open edges |
| `decisionPoints` | intersections + junctions with ≥ 2 forward choices on solution |
| `loopCount` | estimate: edges − (cells − 1) for planar grid graph |
| `avgCorridorLength` | mean run length between junctions |
| `maxDistFromSolution` | max over cells of dist to nearest solution cell |
| `manhattanEntranceExit` | |ex−en| + |ey−en| |

**difficultyScore** (0–100) — *implemented* in `analyze.js`:

```
score =
  34 * norm(sqrt(cellCount), 5..25) +   // size dominates
  28 * norm(solutionLength, 4..80) +    // absolute path length
  10 * norm(deadEndRatio) +
  10 * norm(intersections / cellCount) +
   8 * norm(loopCount / cellCount) +
   5 * norm(maxDistFromSolution / maxDim) +
   5 * norm(solutionRatio)
```

Measured averages after M2 stress (approx):

| id | score range (profile) | observed avg score | notes |
|----|----------------------|--------------------|-------|
| easy | 5–38 | ~26 | 5–7 grid |
| medium | 28–55 | ~39 | 8–11 grid |
| hard | 48–72 | ~53 | 12–17 grid |
| very-hard | 65–100 | ~69 | 18–25 grid |

Pipeline: enforce score for first ~55% of attempts, then relax score/ratio so rare outliers still succeed; serpentine fallback if all attempts fail.

If score outside range, reject (retry). Overlap at edges is OK; prefer center of band when choosing among candidates (optional multi-sample).

---

## 12. Difficulty profiles (initial numbers)

Tune after viewport testing. Starting guidelines:

| id | rows | cols | loopChance | collectibles | guided | camera | timer | pathGlow |
|----|------|------|------------|--------------|--------|--------|-------|----------|
| easy | 5–7 | 5–7 | 0.03 | 0–2 | yes | full | no | yes |
| medium | 8–11 | 8–11 | 0.08 | 2–4 | no* | full | no | no |
| hard | 12–17 | 12–17 | 0.14 | 3–6 | no | follow | optional | no |
| very-hard | 18–25 | 18–25 | 0.18 | 4–8 | no | follow/limited | optional | no |

\* Medium default free movement; guided available in settings.

`corridorWidth`: logical 1 cell for v1; visual thickness from theme wall padding.

---

## 13. Determinism contract

```
pipeline(profile, seed) → Maze
pipeline(profile, seed) → identical Maze (deep equal on cells, entrance, exit, collectibles)
```

Tests will assert equality across two runs and across process restarts (pure functions).

---

## 14. Separation from rendering

| Generation knows | Generation must not know |
|------------------|---------------------------|
| cells, walls, seed | colors, gradients, sprites |
| entrance/exit cells | pixel positions of goals |
| collectible cells | particle systems |
| solution indices | camera scroll |

Renderer reads `Maze` + `MazeTheme` + camera and produces pixels.

---

## 15. Performance budget

| Difficulty | Gen time target (mid-tier phone) |
|------------|----------------------------------|
| Easy–Medium | < 16ms |
| Hard | < 40ms |
| Very Hard | < 100ms (show brief “Making maze…” if over 50ms) |

Stress tests generate thousands of Easy mazes and hundreds of Very Hard offline in Node.

---

## 16. Future extensions (not Milestone 2)

- Multi-cell thick corridors (carve 2×2 rooms)  
- Rooms + maze hybrid  
- Locked doors + keys as graph edges with item gates  
- Moving walls as runtime modifiers, not static gen  
- Wilson’s algorithm alternate for braid control  

Architecture: swap `baseGenerate` implementation behind pipeline without touching renderer.
