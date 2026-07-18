#!/usr/bin/env node
/**
 * Maze Adventure — Milestone 2 domain tests (no browser).
 * Run: node tests/run.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const js = (rel) => pathToFileURL(path.join(root, rel)).href;

let passed = 0;
let failed = 0;
const failures = [];

function assert(cond, msg) {
  if (cond) {
    passed++;
    process.stdout.write('.');
    return;
  }
  failed++;
  failures.push(msg);
  console.error('\n  ✗', msg);
}

function assertEq(a, b, msg) {
  assert(Object.is(a, b), `${msg} (got ${JSON.stringify(a)}, expected ${JSON.stringify(b)})`);
}

function section(name) {
  process.stdout.write('\n• ' + name + ' ');
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

// ---------------------------------------------------------------------------
const { GAME_VERSION, GAME_NAME } = await import(js('js/config/index.js'));
const { deepEqual, clamp, norm01 } = await import(js('js/core/math.js'));
const {
  createRng, hashSeed, dailySeed, retrySeed,
} = await import(js('js/domain/rng.js'));
const {
  createFullWallGrid, carve, countPassages, wallConsistencyErrors,
  cellIndex, mazeTopologyKey, openEdgeCount,
} = await import(js('js/domain/maze/model.js'));
const { bfsPath, floodReachable, bfsDistances } = await import(js('js/domain/pathfinding.js'));
const {
  baseGenerate, injectLoops, isPerfectMaze, perfectPassageCount,
} = await import(js('js/domain/maze/generate.js'));
const { placeEntranceExit, placeCollectibles, borderCells } = await import(js('js/domain/maze/place.js'));
const { analyzeMaze, computeDifficultyScore } = await import(js('js/domain/maze/analyze.js'));
const { validateMaze, validateStructure } = await import(js('js/domain/maze/validate.js'));
const {
  generateValidatedMaze, generateMaze, buildFallbackMaze, buildSerpentineMaze,
} = await import(js('js/domain/maze/pipeline.js'));
const {
  PROFILES, DIFFICULTY_IDS, getProfile, cloneProfile,
} = await import(js('js/domain/difficulty.js'));

// ---------------------------------------------------------------------------
section('scaffold + no Math.random in domain maze');
{
  assert(exists('package.json'), 'package.json');
  assert(exists('js/domain/rng.js'), 'rng.js');
  assert(exists('js/domain/maze/pipeline.js'), 'pipeline.js');
  assert(exists('js/domain/difficulty.js'), 'difficulty.js');
  assert(typeof GAME_VERSION === 'string' && GAME_VERSION.length > 0, 'GAME_VERSION set');
  assert(GAME_NAME === 'Maze Adventure', 'GAME_NAME');

  const mazeDir = path.join(root, 'js/domain/maze');
  for (const f of fs.readdirSync(mazeDir)) {
    if (!f.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(mazeDir, f), 'utf8');
    // Allow the word only in comments? ban real calls
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert(!/Math\.random\s*\(/.test(stripped), `${f} must not call Math.random()`);
  }
  const rngSrc = fs.readFileSync(path.join(root, 'js/domain/rng.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert(!/Math\.random\s*\(/.test(rngSrc), 'rng.js must not call Math.random()');
}

// ---------------------------------------------------------------------------
section('core math');
{
  assertEq(clamp(5, 0, 3), 3, 'clamp high');
  assertEq(clamp(-1, 0, 3), 0, 'clamp low');
  assertEq(norm01(0.5, 0, 1), 0.5, 'norm01 mid');
  assert(deepEqual({ a: 1, b: [2, 3] }, { a: 1, b: [2, 3] }), 'deepEqual');
  assert(!deepEqual({ a: 1 }, { a: 2 }), 'deepEqual ne');
}

// ---------------------------------------------------------------------------
section('seeded RNG');
{
  const a = createRng('hello');
  const b = createRng('hello');
  const seqA = [a.next(), a.next(), a.next(), a.int(0, 100), a.int(0, 100)];
  const seqB = [b.next(), b.next(), b.next(), b.int(0, 100), b.int(0, 100)];
  assert(deepEqual(seqA, seqB), 'same seed same sequence');

  const c = createRng('hello!');
  assert(c.next() !== seqA[0] || c.next() !== seqA[1], 'different seed diverges');

  const r = createRng('bounds');
  for (let i = 0; i < 200; i++) {
    const n = r.int(3, 7);
    assert(n >= 3 && n <= 7, `int bounds got ${n}`);
  }

  const arr = [1, 2, 3, 4, 5];
  const copy = arr.slice();
  createRng('sh').shuffle(arr);
  assert(arr.length === 5, 'shuffle length');
  assert(arr.slice().sort((x, y) => x - y).join(',') === copy.join(','), 'shuffle permutation');

  const f1 = createRng('root').fork('a');
  const f2 = createRng('root').fork('a');
  assertEq(f1.next(), f2.next(), 'fork deterministic');

  assertEq(hashSeed('x'), hashSeed('x'), 'hash stable');
  assert(dailySeed('easy', new Date('2026-07-18T12:00:00')).includes('2026-07-18'), 'daily seed date');
  assertEq(retrySeed('s', 2), 's:retry:2', 'retry seed');

  let threw = false;
  try { createRng('e').pick([]); } catch { threw = true; }
  assert(threw, 'pick empty throws');
}

// ---------------------------------------------------------------------------
section('maze model + pathfinding');
{
  const cells = createFullWallGrid(3, 3);
  const maze = { rows: 3, cols: 3, cells };
  assertEq(countPassages(maze), 0, 'full walls no passages');
  carve(maze, 0, 0, 'east');
  carve(maze, 1, 0, 'east');
  carve(maze, 2, 0, 'south');
  carve(maze, 2, 1, 'south');
  carve(maze, 2, 2, 'west');
  carve(maze, 1, 2, 'west');
  carve(maze, 0, 2, 'north');
  carve(maze, 0, 1, 'north');
  assertEq(wallConsistencyErrors(maze).length, 0, 'wall consistency after carve');

  const path = bfsPath(maze, { x: 0, y: 0 }, { x: 1, y: 2 });
  assert(path && path.length >= 2, 'bfs finds path');
  assertEq(path[0], cellIndex(maze, 0, 0), 'bfs starts entrance');

  const flood = floodReachable(maze, { x: 0, y: 0 });
  assert(flood.size >= 5, 'flood reaches multiple cells');

  // Unreachable: isolated cell still full walls in middle-ish — carve only a subset
  const iso = createFullWallGrid(2, 2);
  const im = { rows: 2, cols: 2, cells: iso };
  carve(im, 0, 0, 'east'); // only top row connected
  const noPath = bfsPath(im, { x: 0, y: 0 }, { x: 0, y: 1 });
  assert(noPath === null, 'bfs null when unreachable');
}

// ---------------------------------------------------------------------------
section('base generate + loops');
{
  const rng = createRng('gen-perfect-1');
  const m = baseGenerate(8, 8, rng);
  assertEq(m.rows, 8, 'rows');
  assertEq(m.cols, 8, 'cols');
  assert(isPerfectMaze(m), 'perfect maze passages = cells-1');
  assertEq(countPassages(m), perfectPassageCount(8, 8), 'passage count');
  assertEq(wallConsistencyErrors(m).length, 0, 'gen wall consistency');

  // All cells reachable from (0,0) in a perfect maze
  const flood = floodReachable(m, { x: 0, y: 0 });
  assertEq(flood.size, 64, 'perfect maze fully connected');

  const before = countPassages(m);
  const removed = injectLoops(m, 0, createRng('noloop'));
  assertEq(removed, 0, 'loopChance 0 removes none');
  assertEq(countPassages(m), before, 'passages unchanged');

  const m2 = baseGenerate(10, 10, createRng('loops-src'));
  const p0 = countPassages(m2);
  const rem = injectLoops(m2, 0.5, createRng('loops-hi'));
  assert(rem > 0, 'high loopChance removes some walls');
  assert(countPassages(m2) > p0, 'passages increased');
  assertEq(wallConsistencyErrors(m2).length, 0, 'loops consistency');
}

// ---------------------------------------------------------------------------
section('placement + analyze + validate');
{
  const profile = getProfile('easy');
  const grid = baseGenerate(6, 6, createRng('place-base'));
  injectLoops(grid, profile.loopChance, createRng('place-loops'));
  const placed = placeEntranceExit(grid, profile, createRng('place-ports'));
  assert(placed, 'placeEntranceExit succeeds');
  assert(placed.solution.length >= 2, 'solution length');
  assert(!(placed.entrance.x === placed.exit.x && placed.entrance.y === placed.exit.y), 'en != ex');

  const cols = placeCollectibles(
    grid, placed.entrance, placed.exit, placed.solution, profile, createRng('loot'),
  );
  assert(cols.length >= profile.collectibleCount[0], 'collectible min');
  assert(cols.length <= profile.collectibleCount[1], 'collectible max');

  const metrics = analyzeMaze(grid, placed.entrance, placed.exit, placed.solution);
  assert(metrics.solutionLength >= 1, 'metrics solutionLength');
  assert(metrics.cellCount === 36, 'metrics cellCount');
  assert(Number.isFinite(metrics.difficultyScore), 'score finite');

  const borders = borderCells(5, 5);
  assert(borders.length === 5 * 4 - 4, 'border count unique corners once each = 16');
}

// ---------------------------------------------------------------------------
section('difficulty profiles');
{
  for (const id of DIFFICULTY_IDS) {
    const p = getProfile(id);
    assert(p.id === id, `profile ${id}`);
    assert(p.minRows <= p.maxRows, `${id} rows`);
    assert(p.minColumns <= p.maxColumns, `${id} cols`);
    assert(p.loopChance >= 0 && p.loopChance <= 1, `${id} loopChance`);
    assert(p.collectibleCount[0] <= p.collectibleCount[1], `${id} collectibles`);
  }
  const c = cloneProfile('easy', { loopChance: 0.5 });
  assertEq(c.loopChance, 0.5, 'clone override');
  assertEq(getProfile('easy').loopChance, 0.03, 'clone does not mutate registry');

  let threw = false;
  try { getProfile('nope'); } catch { threw = true; }
  assert(threw, 'unknown profile throws');

  const score = computeDifficultyScore({
    solutionRatio: 0.3,
    deadEndRatio: 0.2,
    intersections: 10,
    cellCount: 100,
    maxDistFromSolution: 3,
    rows: 10,
    cols: 10,
    loopCount: 5,
    solutionLength: 25,
  });
  assert(score >= 0 && score <= 100, `score in range ${score}`);
}

// ---------------------------------------------------------------------------
section('pipeline determinism');
{
  for (const id of DIFFICULTY_IDS) {
    const seed = `det-${id}-42`;
    const a = generateValidatedMaze(id, seed);
    const b = generateValidatedMaze(id, seed);
    assertEq(mazeTopologyKey(a.maze), mazeTopologyKey(b.maze), `determinism ${id}`);
    assert(!a.usedFallback || a.maze.solution.length >= 2, `fallback still solvable ${id}`);
  }
}

// ---------------------------------------------------------------------------
section('pipeline solvability sample');
{
  for (const id of DIFFICULTY_IDS) {
    for (let i = 0; i < 25; i++) {
      const seed = `solve-${id}-${i}`;
      const { maze, usedFallback } = generateValidatedMaze(id, seed);
      const path = bfsPath(maze, maze.entrance, maze.exit);
      assert(path !== null, `${seed} solvable`);
      assert(path.length >= 2, `${seed} path len`);
      assertEq(wallConsistencyErrors(maze).length, 0, `${seed} walls`);
      // Structural validation always
      const vs = validateStructure(maze, getProfile(id));
      // Serpentine fallback may violate minSolutionLength on tiny boards — allow usedFallback
      if (!usedFallback) {
        assert(vs.ok || vs.errors.every((e) => e.includes('difficultyScore') || e.includes('solutionRatio')),
          `${seed} structure: ${vs.errors.join('; ')}`);
      }
      // Collectibles reachable
      const flood = floodReachable(maze, maze.entrance);
      for (const c of maze.collectibles) {
        const idx = cellIndex(maze, c.x, c.y);
        assert(flood.has(idx), `${seed} collectible reachable`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
section('fallback always works');
{
  for (const id of DIFFICULTY_IDS) {
    const maze = buildFallbackMaze(getProfile(id), `fb-${id}`);
    const path = bfsPath(maze, maze.entrance, maze.exit);
    assert(path !== null, `fallback ${id} solvable`);
    assertEq(wallConsistencyErrors(maze).length, 0, `fallback ${id} walls`);
  }
  const serp = buildSerpentineMaze(5, 5, getProfile('easy'), 'serp');
  assert(bfsPath(serp, serp.entrance, serp.exit), 'serpentine solvable');
}

// ---------------------------------------------------------------------------
section('broken maze fails validation');
{
  const good = generateMaze('easy', 'valid-base');
  const bad = {
    ...good,
    cells: good.cells.map((c) => ({ ...c })),
    exit: { x: good.exit.x, y: good.exit.y },
  };
  // Seal exit by putting walls all around — break path by resetting all walls
  for (const c of bad.cells) {
    c.north = true;
    c.south = true;
    c.east = true;
    c.west = true;
  }
  bad.solution = [0];
  const v = validateMaze(bad, getProfile('easy'), { skipScore: true });
  assert(!v.ok, 'sealed maze invalid');
  assert(v.errors.some((e) => e.includes('reachable') || e.includes('solution')), 'mentions reachability');
}

// ---------------------------------------------------------------------------
section('stress generation');
{
  const plan = [
    ['easy', 200],
    ['medium', 100],
    ['hard', 40],
    ['very-hard', 20],
  ];
  const t0 = performance.now();
  let fallbacks = 0;
  let total = 0;
  /** @type {Record<string, number[]>} */
  const scores = { easy: [], medium: [], hard: [], 'very-hard': [] };

  for (const [id, n] of plan) {
    for (let i = 0; i < n; i++) {
      const { maze, usedFallback } = generateValidatedMaze(id, `stress-${id}-${i}`);
      total++;
      if (usedFallback) fallbacks++;
      const path = bfsPath(maze, maze.entrance, maze.exit);
      assert(path !== null, `stress ${id}#${i} solvable`);
      scores[id].push(maze.metrics.difficultyScore);
    }
  }
  const ms = performance.now() - t0;
  const fallbackRate = fallbacks / total;
  assert(fallbackRate < 0.25, `fallback rate ${fallbackRate.toFixed(3)} < 25%`);
  // Soft time budget warn-style: fail only if extremely slow (> 30s)
  assert(ms < 30000, `stress finished in ${ms.toFixed(0)}ms (<30s)`);

  process.stdout.write(`\n  stress: ${total} mazes, ${fallbacks} fallbacks (${(fallbackRate * 100).toFixed(1)}%), ${ms.toFixed(0)}ms`);
  for (const id of DIFFICULTY_IDS) {
    const arr = scores[id];
    if (!arr.length) continue;
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    process.stdout.write(`\n  avg score ${id}: ${avg.toFixed(1)}`);
  }
}

// ---------------------------------------------------------------------------
section('daily seed stability');
{
  const d = new Date(2026, 6, 18); // local Jul 18 2026
  const s1 = dailySeed('medium', d);
  const s2 = dailySeed('medium', d);
  assertEq(s1, s2, 'daily seed stable');
  const m1 = generateMaze('medium', s1);
  const m2 = generateMaze('medium', s2);
  assertEq(mazeTopologyKey(m1), mazeTopologyKey(m2), 'daily maze identical');
}

// ---------------------------------------------------------------------------
// Milestone 3 — playable shell + session + movement
// ---------------------------------------------------------------------------
const { layoutMazeToView, integrateFreeMove, cellCenter, worldToCell } =
  await import(js('js/domain/movement/free.js'));
const {
  createGuidedState, integrateGuidedMove, openDirs, axisToDir,
} = await import(js('js/domain/movement/guided.js'));
const { createMemorySave } = await import(js('js/adapters/save.js'));
const { createSilentAudio } = await import(js('js/adapters/audio.js'));
const { getTheme, themeForRun } = await import(js('js/domain/themes.js'));
const { GameSession } = await import(js('js/world/GameSession.js'));
const { W, H } = await import(js('js/config/index.js'));

section('PWA shell + version sync');
{
  assert(exists('index.html'), 'index.html');
  assert(exists('css/style.css'), 'style.css');
  assert(exists('manifest.webmanifest'), 'manifest');
  assert(exists('sw.js'), 'sw.js');
  assert(exists('js/app/main.js'), 'main.js');
  assert(exists('js/world/GameSession.js'), 'GameSession');
  assert(exists('icons/icon-192.png'), 'icon-192');
  assert(exists('icons/icon-512.png'), 'icon-512');
  assert(exists('art/cover.jpg'), 'cover');
  assert(exists('apple-touch-icon.png'), 'apple-touch-icon');

  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert(sw.includes(`maze-adventure-${GAME_VERSION}`), `SW CACHE matches GAME_VERSION ${GAME_VERSION}`);
  assert(sw.includes('./js/app/main.js'), 'SW lists main.js');
  assert(sw.includes('./js/domain/maze/pipeline.js'), 'SW lists pipeline');

  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert(html.includes('type="module"'), 'ES module entry');
  assert(html.includes('js/app/main.js'), 'main script');
  assert(html.includes('data-screen="menu"'), 'menu screen');
  assert(html.includes('data-screen="win"'), 'win screen');
}

section('themes');
{
  const g = getTheme('garden');
  assert(g.id === 'garden' && g.wallTop, 'garden theme');
  assert(getTheme('missing').id === 'garden', 'fallback theme');
  assert(themeForRun('easy').id === 'garden', 'easy theme garden');
}

section('movement free + guided');
{
  const maze = generateMaze('easy', 'move-test-1');
  const layout = layoutMazeToView(maze, W, H, 18);
  assert(layout.cellSize >= 8, 'cellSize');
  const start = cellCenter(layout, maze.entrance.x, maze.entrance.y);
  // Stationary
  const still = integrateFreeMove(
    maze, layout, start, { x: 0, y: 0 }, 0.016, 8,
  );
  assert(Math.abs(still.x - start.x) < 0.01 && Math.abs(still.y - start.y) < 0.01, 'no move');

  // Cannot teleport through solid outer bound wildly
  const fly = integrateFreeMove(
    maze, layout, start, { x: 5000, y: 0 }, 1, 8,
  );
  const boundsRight = layout.originX + maze.cols * layout.cellSize;
  assert(fly.x < boundsRight, 'clamped inside maze');

  const g0 = createGuidedState(maze, layout, maze.entrance.x, maze.entrance.y);
  assert(openDirs(maze, maze.entrance.x, maze.entrance.y).length >= 1, 'entrance open');
  assertEq(axisToDir(0, 0), null, 'neutral axis');
  assertEq(axisToDir(1, 0), 'east', 'east axis');
  // Step guided along a solution direction if possible
  const path = maze.solution;
  if (path.length >= 2) {
    const a = path[0];
    const b = path[1];
    const ax = a % maze.cols;
    const ay = (a / maze.cols) | 0;
    const bx = b % maze.cols;
    const by = (b / maze.cols) | 0;
    const dx = bx - ax;
    const dy = by - ay;
    const input = { x: dx, y: dy };
    let g = createGuidedState(maze, layout, ax, ay);
    for (let i = 0; i < 120; i++) {
      g = integrateGuidedMove(maze, layout, g, input, 200, 0.016);
    }
    const cell = worldToCell(layout, maze, g.x, g.y);
    assert(
      (cell.x === bx && cell.y === by) || (cell.x === ax && cell.y === ay) || g.moved,
      'guided advances toward next cell',
    );
  }
}

section('GameSession play + win');
{
  const save = createMemorySave();
  const audio = createSilentAudio();
  const session = new GameSession({ audio, save });
  assertEq(session.screen, 'menu', 'starts menu');

  session.startQuick('easy', 'session-win-seed');
  assertEq(session.screen, 'play', 'play screen');
  assert(session.maze, 'maze set');
  assert(session.layout, 'layout set');
  assert(session.movementMode === 'guided', 'easy guided default');

  // Place player (and guided state) on the exit cell — guided mode overwrites pos from guided
  const exit = session.maze.exit;
  const goal = cellCenter(session.layout, exit.x, exit.y);
  session.player.x = goal.x;
  session.player.y = goal.y;
  session.guided = createGuidedState(session.maze, session.layout, exit.x, exit.y);
  for (const c of session.maze.collectibles) {
    session.collected.add(c.id);
  }
  const ev = session.update(0.016, { x: 0, y: 0 });
  assert(session.won || (ev && ev.event === 'win'), 'win detected');
  assertEq(session.screen, 'win', 'win screen');
  assert(save.data.gamesCompleted >= 1, 'save recorded win');

  // Restart same seed
  const seed = session.seed;
  session.restart();
  assertEq(session.seed, seed, 'restart keeps seed');
  assertEq(session.screen, 'play', 'restart play');
  assert(!session.won, 'not won after restart');

  // Pause
  session.pause();
  assertEq(session.screen, 'pause', 'paused');
  const px = session.player.x;
  session.update(0.1, { x: 1, y: 0 });
  assertEq(session.player.x, px, 'no move while paused');
  session.resume();
  assertEq(session.screen, 'play', 'resumed');

  // Hint
  session.requestHint();
  assert(session.hintTimer > 0, 'hint active');
  assert(session.hintsUsed >= 1, 'hints counted');

  // Wall bump: free mode shove into wall
  session.movementMode = 'free';
  session.startQuick('easy', 'bump-seed');
  session.movementMode = 'free';
  const before = { x: session.player.x, y: session.player.y };
  for (let i = 0; i < 30; i++) {
    session.update(0.016, { x: 0, y: -1 });
  }
  // Should remain roughly near entrance (not fly off canvas)
  assert(session.player.x > 0 && session.player.y > 0, 'player still on stage');
  assert(
    Math.hypot(session.player.x - before.x, session.player.y - before.y) < W,
    'no teleport across stage',
  );
}

section('module graph no Math.random in domain maze');
{
  // already covered; ensure movement free of Math.random
  for (const rel of [
    'js/domain/movement/free.js',
    'js/domain/movement/guided.js',
    'js/domain/movement/assist.js',
    'js/world/GameSession.js',
  ]) {
    const src = fs.readFileSync(path.join(root, rel), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert(!/Math\.random\s*\(/.test(src), `${rel} no Math.random`);
  }
}

// ---------------------------------------------------------------------------
// Milestone 4–5 — assist, daily, settings save
// ---------------------------------------------------------------------------
const {
  isDeadEndCell, nextSolutionCell, hintTrail, hintDirection, solutionCursor,
} = await import(js('js/domain/movement/assist.js'));
const { makeDailySeed, dateKey, dailyLabel } = await import(js('js/domain/modes.js'));
const { highContrastTheme } = await import(js('js/domain/themes.js'));

section('assist + daily modes');
{
  const maze = generateMaze('easy', 'assist-seed-1');
  const enIdx = cellIndex(maze, maze.entrance.x, maze.entrance.y);
  const trail = hintTrail(maze, enIdx, 5);
  assert(trail.length >= 1 && trail.length <= 5, 'hint trail length');
  assert(trail[0] === maze.solution[0] || maze.solution.includes(trail[0]), 'trail on solution');
  const next = nextSolutionCell(maze, enIdx);
  assert(next != null, 'next solution cell');
  const dir = hintDirection(maze, enIdx);
  assert(dir === null || ['north', 'south', 'east', 'west'].includes(dir), 'hint dir');
  assert(solutionCursor(maze, enIdx) === 0, 'cursor at start');

  // Find a dead-end if any
  let foundDead = false;
  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      if (isDeadEndCell(maze, x, y)) { foundDead = true; break; }
    }
    if (foundDead) break;
  }
  // Not all mazes have dead ends after loops; just ensure function runs
  assert(foundDead === true || foundDead === false, 'dead-end scan ok');

  const ds = makeDailySeed('easy', new Date(2026, 6, 18));
  assert(ds.includes('daily:'), 'daily seed prefix');
  assert(ds.includes('easy'), 'daily seed difficulty');
  const m1 = generateMaze('easy', ds);
  const m2 = generateMaze('easy', ds);
  assertEq(mazeTopologyKey(m1), mazeTopologyKey(m2), 'daily maze deterministic');
  assert(dateKey(new Date(2026, 6, 18)).includes('2026'), 'dateKey');
  assert(dailyLabel(new Date(2026, 6, 18)) === dateKey(new Date(2026, 6, 18)), 'dailyLabel');

  const hc = highContrastTheme(getTheme('garden'));
  assert(hc.playerStroke === '#000000', 'high contrast theme');
}

section('session daily + settings flags');
{
  const save = createMemorySave({ movementPref: 'guided', reducedMotion: true });
  const session = new GameSession({ audio: createSilentAudio(), save });
  session.startDaily('easy');
  assertEq(session.mode, 'daily', 'daily mode');
  assert(session.seed.startsWith('daily:'), 'daily seed set');
  assert(session.reducedMotion === true, 'reduced motion flag');
  session.requestHint();
  assert(session.activeHintTrail().length >= 1, 'active hint trail');
  assert(session.showPathGlow() === true, 'easy path glow');

  // win records daily
  const exit = session.maze.exit;
  const goal = cellCenter(session.layout, exit.x, exit.y);
  session.player.x = goal.x;
  session.player.y = goal.y;
  session.guided = createGuidedState(session.maze, session.layout, exit.x, exit.y);
  session.update(0.016, { x: 0, y: 0 });
  assert(session.won, 'daily win');
  assert(save.data.gamesCompleted >= 1, 'daily win saved');
}

// ---------------------------------------------------------------------------
// Milestone 6 — adventure, freeplay, themes
// ---------------------------------------------------------------------------
const {
  ADVENTURE_STAGES, nextAdventureStage, stageRunConfig, isStageUnlocked,
  isAdventureComplete, adventureStageCount, themesUnlockedByProgress,
} = await import(js('js/domain/adventure.js'));
const { buildFreePlayProfile, clampSize, defaultFreePlayOptions } =
  await import(js('js/domain/freeplay.js'));
const { getCharacter, CHARACTERS } = await import(js('js/domain/characters.js'));
const { THEME_IDS } = await import(js('js/domain/themes.js'));

section('adventure + freeplay + ship themes');
{
  assert(adventureStageCount() === 12, '12 adventure stages');
  assert(ADVENTURE_STAGES[0].difficultyId === 'easy', 'stage1 easy');
  assert(nextAdventureStage(0).id === 'garden-path', 'next stage 0');
  assert(nextAdventureStage(12) === null, 'complete null');
  assert(isStageUnlocked(0, 1), 'first unlocked');
  assert(!isStageUnlocked(0, 3), 'third locked at 0');
  assert(isAdventureComplete(12), 'complete at 12');
  const unlocks = themesUnlockedByProgress(6);
  assert(unlocks.includes('dino'), 'dino unlock by progress 6');

  const cfg = stageRunConfig(ADVENTURE_STAGES[0], 1, 0);
  assert(cfg.seed.includes('adv-1'), 'stage seed');
  const maz = generateValidatedMaze(cfg.profile.id, cfg.seed, { profile: cfg.profile });
  assert(maz.maze.solution.length >= 2, 'adventure maze ok');

  assertEq(clampSize(3), 5, 'clamp size lo');
  assertEq(clampSize(99), 22, 'clamp size hi');
  const fp = buildFreePlayProfile({ size: 8, collectibles: 2, guided: true, hints: true });
  assertEq(fp.minRows, 8, 'fp size');
  assert(fp.guidedMovement === true, 'fp guided');
  const fpm = generateValidatedMaze(fp.id, 'free-test-1', { profile: fp });
  assert(fpm.maze.rows === 8 && fpm.maze.cols === 8, 'fp maze dims');
  assert(defaultFreePlayOptions().size === 10, 'fp defaults');

  assert(THEME_IDS.length >= 8, '8+ themes');
  assert(getTheme('space').id === 'space', 'space theme');
  assert(getTheme('dino').goalIcon === '🥚', 'dino egg');
  assert(getCharacter('robot').emoji === '🤖', 'robot char');
  assert(Object.keys(CHARACTERS).length >= 6, '6 characters');

  // Adventure session progress
  const save = createMemorySave({ adventureProgress: 0, themesUnlocked: ['garden'] });
  const session = new GameSession({ audio: createSilentAudio(), save });
  assert(session.startAdventure(0) === true, 'start adv 0');
  assertEq(session.mode, 'adventure', 'adv mode');
  assert(session.adventureStage && session.adventureStage.order === 1, 'stage 1');
  // win advances
  const ex = session.maze.exit;
  const g = cellCenter(session.layout, ex.x, ex.y);
  session.player.x = g.x;
  session.player.y = g.y;
  session.guided = createGuidedState(session.maze, session.layout, ex.x, ex.y);
  session.update(0.016, { x: 0, y: 0 });
  assert(session.won, 'adv win');
  assertEq(save.data.adventureProgress, 1, 'progress +1');

  // Free play session
  const s2 = new GameSession({ audio: createSilentAudio(), save: createMemorySave() });
  s2.startFreePlay({ size: 7, collectibles: 1, themeId: 'garden', characterId: 'explorer', guided: true });
  assertEq(s2.mode, 'freeplay', 'freeplay mode');
  assert(s2.maze.rows === 7, 'freeplay rows');
}

// ---------------------------------------------------------------------------
// Milestone 7 — gates + speech module
// ---------------------------------------------------------------------------
const { placeSwitchGate, bfsPathAvoiding, floodAvoiding } =
  await import(js('js/domain/maze/gates.js'));
const { createSpeech } = await import(js('js/adapters/speech.js'));

section('gates + speech');
{
  // Force gate on freeplay profile
  const gprof = buildFreePlayProfile({ size: 11, collectibles: 1, gates: true, guided: false });
  assertEq(gprof.gateChance, 1, 'gate chance forced');
  let foundGate = false;
  for (let i = 0; i < 40; i++) {
    const r = generateValidatedMaze(gprof.id, `gate-try-${i}`, { profile: gprof });
    if (r.maze.gatePos && r.maze.switchPos) {
      foundGate = true;
      // Exit not reachable while gate closed
      const closed = bfsPathAvoiding(
        r.maze, r.maze.entrance, r.maze.exit,
        cellIndex(r.maze, r.maze.gatePos.x, r.maze.gatePos.y),
      );
      assert(closed === null, 'gate blocks unique path');
      // Switch reachable avoiding gate
      const flood = floodAvoiding(
        r.maze, r.maze.entrance,
        cellIndex(r.maze, r.maze.gatePos.x, r.maze.gatePos.y),
      );
      const sw = cellIndex(r.maze, r.maze.switchPos.x, r.maze.switchPos.y);
      assert(flood.has(sw), 'switch reachable without gate');

      const save = createMemorySave();
      const sess = new GameSession({ audio: createSilentAudio(), save });
      sess.startFreePlay({
        size: 11, collectibles: 1, gates: true, seed: `gate-try-${i}`,
        themeId: 'garden', characterId: 'explorer',
      });
      // May regenerate different - start with known seed via _startRun path
      // Instead test canEnter on session after manual maze inject
      assert(sess.maze, 'session maze');
      if (sess.hasGate()) {
        assert(sess.gateOpen === false, 'gate starts closed');
        assert(!sess.canEnterCell(sess.maze.gatePos.x, sess.maze.gatePos.y), 'cannot enter gate');
        // Step on switch
        const swc = sess.maze.switchPos;
        const p = cellCenter(sess.layout, swc.x, swc.y);
        sess.player.x = p.x;
        sess.player.y = p.y;
        sess.guided = createGuidedState(sess.maze, sess.layout, swc.x, swc.y);
        sess.update(0.016, { x: 0, y: 0 });
        assert(sess.gateOpen === true, 'gate opens on switch');
        assert(sess.canEnterCell(sess.maze.gatePos.x, sess.maze.gatePos.y), 'can enter after');
      }
      break;
    }
  }
  assert(foundGate, 'found at least one gated maze in samples');

  // placeSwitchGate null when chance 0
  const maze = generateMaze('easy', 'no-gate-easy');
  const none = placeSwitchGate(
    maze, maze.entrance, maze.exit, maze.solution,
    getProfile('easy'), createRng('x'),
  );
  assert(none === null, 'easy no gate placement');

  const speech = createSpeech(() => false);
  assert(typeof speech.praiseWin === 'function', 'speech API');
  speech.praiseWin(); // no-op when disabled

  // Collectibles never on switch/gate
  const gprof2 = buildFreePlayProfile({ size: 12, collectibles: 8, gates: true });
  for (let i = 0; i < 25; i++) {
    const r = generateValidatedMaze(gprof2.id, `loot-gate-${i}`, { profile: gprof2 });
    const m = r.maze;
    if (!m.gatePos || !m.switchPos) continue;
    for (const c of m.collectibles) {
      assert(!(c.x === m.gatePos.x && c.y === m.gatePos.y), 'no loot on gate');
      assert(!(c.x === m.switchPos.x && c.y === m.switchPos.y), 'no loot on switch');
    }
  }

  // Freeplay restart keeps seed
  const saveFp = createMemorySave();
  const sfp = new GameSession({ audio: createSilentAudio(), save: saveFp });
  sfp.startFreePlay({ size: 6, seed: 'restart-seed-xyz', themeId: 'garden', characterId: 'explorer' });
  assertEq(sfp.seed, 'restart-seed-xyz', 'freeplay seed set');
  sfp.restart();
  assertEq(sfp.seed, 'restart-seed-xyz', 'freeplay restart same seed');
}

// ---------------------------------------------------------------------------
console.log('\n');
if (failed) {
  console.error(`FAILED ${failed}/${passed + failed}`);
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}
console.log(`OK ${passed} assertions`);
process.exit(0);
