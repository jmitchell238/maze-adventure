/**
 * Mutable run state for Maze Adventure.
 */

import { MOVE, W, H } from '../config/index.js';
import { generateValidatedMaze } from '../domain/maze/pipeline.js';
import { getProfile } from '../domain/difficulty.js';
import { getTheme, themeForRun } from '../domain/themes.js';
import { getCharacter } from '../domain/characters.js';
import {
  ADVENTURE_STAGES, stageRunConfig, isAdventureComplete,
  adventureStageCount,
} from '../domain/adventure.js';
import { buildFreePlayProfile, defaultFreePlayOptions } from '../domain/freeplay.js';
import {
  cellCenter, integrateFreeMove, layoutMazeToView, worldToCell,
} from '../domain/movement/free.js';
import {
  createGuidedState, integrateGuidedMove, GUIDED_CENTER_EPS,
} from '../domain/movement/guided.js';
import {
  isDeadEndCell, hintTrail, hintDirection,
} from '../domain/movement/assist.js';
import { resolveTapStep, dirToAxis } from '../domain/movement/tap.js';
import { cellIndex } from '../domain/maze/model.js';
import { dist, clamp } from '../core/math.js';
import { makeDailySeed, dateKey } from '../domain/modes.js';
import { sameCell } from '../domain/maze/gates.js';
import { bfsPath } from '../domain/pathfinding.js';

/**
 * @typedef {'menu'|'difficulty'|'settings'|'adventure'|'freeplay'|'play'|'pause'|'win'} SessionScreen
 * @typedef {'quick'|'daily'|'adventure'|'freeplay'} PlayMode
 */

export class GameSession {
  /**
   * @param {{ audio: object, save: object }} deps
   */
  constructor({ audio, save }) {
    this.audio = audio;
    this.save = save;
    /** @type {SessionScreen} */
    this.screen = 'menu';
    this.maze = null;
    this.layout = null;
    this.theme = getTheme('garden');
    this.characterId = 'explorer';
    this.difficultyId = 'easy';
    this.seed = '';
    /** @type {PlayMode} */
    this.mode = 'quick';
    this.movementMode = /** @type {'guided'|'free'} */ ('guided');
    this.player = { x: 0, y: 0, radius: MOVE.playerRadius, facing: 'south' };
    this.guided = null;
    /** @type {Set<string>} */
    this.collected = new Set();
    /** @type {Set<number>} */
    this.visited = new Set();
    this.elapsed = 0;
    this.won = false;
    this.hintsUsed = 0;
    this.hintTimer = 0;
    this.time = 0;
    this.moving = false;
    this.bumpCooldown = 0;
    this.runIndex = 0;
    this.stuckTimer = 0;
    this.deadEndAssist = false;
    this.assistPulse = 0;
    this.camX = 0;
    this.camY = 0;
    this.winFlash = 0;
    /** @type {import('../domain/adventure.js').AdventureStage | null} */
    this.adventureStage = null;
    this.adventureAttempt = 0;
    /** @type {import('../domain/difficulty.js').DifficultyProfile | null} */
    this.activeProfile = null;
    this.timerEnabled = false;
    this.unlockBanner = '';
    /** Gate open after switch stepped on. */
    this.gateOpen = true;
    this.justOpenedGate = false;
    /** @type {{ x: number, y: number, dir: import('../domain/maze/model.js').Dir } | null} */
    this.tapGoal = null;
  }

  get reducedMotion() {
    return !!(this.save && this.save.data && this.save.data.reducedMotion);
  }

  get highContrast() {
    return !!(this.save && this.save.data && this.save.data.highContrast);
  }

  get showSeed() {
    return !!(this.save && this.save.data && this.save.data.showSeed);
  }

  goMenu() {
    this.screen = 'menu';
    this.maze = null;
    this.won = false;
    this.unlockBanner = '';
  }

  openDifficulty() {
    this.screen = 'difficulty';
  }

  openSettings() {
    this.screen = 'settings';
  }

  openAdventure() {
    this.screen = 'adventure';
  }

  openFreePlay() {
    this.screen = 'freeplay';
  }

  /**
   * @param {string} difficultyId
   * @param {string} [seed]
   * @param {PlayMode} [mode]
   */
  startQuick(difficultyId, seed, mode = 'quick') {
    const profile = getProfile(difficultyId);
    this.adventureStage = null;
    this._startRun({
      difficultyId: profile.id,
      seed: seed != null ? String(seed) : `quick-${profile.id}-${Date.now()}-${this.runIndex++}`,
      mode,
      profile,
      themeId: themeForRun(profile.id, this.runIndex).id,
      characterId: themeForRun(profile.id, this.runIndex).character || 'explorer',
    });
  }

  /**
   * @param {string} difficultyId
   */
  startDaily(difficultyId) {
    this.adventureStage = null;
    const profile = getProfile(difficultyId);
    this._startRun({
      difficultyId: profile.id,
      seed: makeDailySeed(difficultyId),
      mode: 'daily',
      profile,
      themeId: themeForRun(profile.id, this.runIndex).id,
      characterId: themeForRun(profile.id, this.runIndex).character || 'explorer',
    });
  }

  /**
   * Continue adventure at current progress (or specific stage index).
   * @param {number} [stageIndex] 0-based; default = next uncleared (progress)
   */
  startAdventure(stageIndex) {
    const progress = this.save.data.adventureProgress | 0;
    const idx = stageIndex != null ? stageIndex : progress;
    if (idx > progress) return false;
    if (idx < 0 || idx >= ADVENTURE_STAGES.length) return false;
    const runStage = ADVENTURE_STAGES[idx];

    this.adventureStage = runStage;
    this.adventureAttempt = (this.adventureAttempt + 1) | 0;
    const { profile, seed, themeId, characterId } = stageRunConfig(
      runStage,
      this.adventureAttempt,
      progress,
    );
    this._startRun({
      difficultyId: runStage.difficultyId,
      seed,
      mode: 'adventure',
      profile,
      themeId,
      characterId,
    });
    return true;
  }

  /**
   * @param {import('../domain/freeplay.js').FreePlayOptions} [opts]
   */
  startFreePlay(opts) {
    const o = { ...defaultFreePlayOptions(), ...(this.save.data.freePlay || {}), ...(opts || {}) };
    if (this.save.setFreePlay) this.save.setFreePlay(o);
    const profile = buildFreePlayProfile(o);
    const seed = (o.seed && String(o.seed).trim())
      ? String(o.seed).trim()
      : `free-${Date.now()}-${this.runIndex++}`;
    this.adventureStage = null;
    this._startRun({
      difficultyId: profile.id,
      seed,
      mode: 'freeplay',
      profile,
      themeId: o.themeId || 'garden',
      characterId: o.characterId || 'explorer',
      forceMovement: o.guided ? 'guided' : 'free',
      timerEnabled: !!o.timer,
    });
  }

  /**
   * @param {object} cfg
   * @param {string} cfg.difficultyId
   * @param {string} cfg.seed
   * @param {PlayMode} cfg.mode
   * @param {import('../domain/difficulty.js').DifficultyProfile} cfg.profile
   * @param {string} cfg.themeId
   * @param {string} cfg.characterId
   * @param {'guided'|'free'} [cfg.forceMovement]
   * @param {boolean} [cfg.timerEnabled]
   */
  _startRun(cfg) {
    const profile = cfg.profile;
    this.activeProfile = profile;
    this.difficultyId = cfg.difficultyId;
    this.mode = cfg.mode;
    this.seed = cfg.seed;
    this.timerEnabled = !!cfg.timerEnabled || !!profile.optionalTimer;
    this.characterId = cfg.characterId || 'explorer';

    const result = generateValidatedMaze(profile.id, this.seed, { profile });
    this.maze = result.maze;

    let theme = getTheme(cfg.themeId);
    const ch = getCharacter(this.characterId);
    // Tint player from character
    this.theme = {
      ...theme,
      player: ch.body,
      playerStroke: ch.stroke,
      playerAccent: ch.accent,
      character: ch.id,
    };

    this.layout = layoutMazeToView(this.maze, W, H, 18);

    if (cfg.forceMovement) {
      this.movementMode = cfg.forceMovement;
    } else {
      const pref = this.save.data.movementPref || 'auto';
      if (pref === 'guided') this.movementMode = 'guided';
      else if (pref === 'free') this.movementMode = 'free';
      else this.movementMode = profile.guidedMovement ? 'guided' : 'free';
    }

    this.player.radius = Math.min(MOVE.playerRadius, this.layout.cellSize * 0.22);
    const start = cellCenter(this.layout, this.maze.entrance.x, this.maze.entrance.y);
    this.player.x = start.x;
    this.player.y = start.y;
    this.player.facing = 'south';
    this.guided = createGuidedState(
      this.maze, this.layout, this.maze.entrance.x, this.maze.entrance.y,
    );
    this.collected = new Set();
    this.visited = new Set([
      cellIndex(this.maze, this.maze.entrance.x, this.maze.entrance.y),
    ]);
    this.elapsed = 0;
    this.won = false;
    this.hintsUsed = 0;
    this.hintTimer = 0;
    this.time = 0;
    this.moving = false;
    this.stuckTimer = 0;
    this.deadEndAssist = false;
    this.assistPulse = 0;
    this.winFlash = 0;
    this.unlockBanner = '';
    this.justOpenedGate = false;
    // Closed only if maze has a gate
    this.gateOpen = !(this.maze.gatePos && this.maze.switchPos);
    this.tapGoal = null;
    this.camX = 0;
    this.camY = 0;
    this._updateCamera(1);
    this.screen = 'play';
    this.runIndex += 1;

    if (this.save.data) {
      this.save.data.lastDifficulty = this.difficultyId;
      this.save.data.lastMode = this.mode;
      if (typeof this.save.persist === 'function') this.save.persist();
    }
  }

  restart() {
    if (this.mode === 'daily') this.startDaily(this.difficultyId);
    else if (this.mode === 'adventure' && this.adventureStage) {
      const progress = this.save.data.adventureProgress | 0;
      // replay current stage index
      const idx = Math.min(progress, adventureStageCount() - 1);
      // If we already cleared, adventureStage is the one we just played
      const orderIdx = (this.adventureStage.order - 1);
      this.startAdventure(orderIdx);
    } else if (this.mode === 'freeplay') {
      // Keep the same seed so restart is fair for kids / parents
      this.startFreePlay({ ...(this.save.data.freePlay || {}), seed: this.seed });
    } else {
      this.startQuick(this.difficultyId, this.seed, this.mode);
    }
  }

  nextMaze() {
    if (this.mode === 'adventure') {
      if (isAdventureComplete(this.save.data.adventureProgress)) {
        this.goMenu();
        return;
      }
      this.startAdventure();
      return;
    }
    if (this.mode === 'daily') {
      this.startQuick(this.difficultyId);
      return;
    }
    if (this.mode === 'freeplay') {
      // new seed same options
      const o = { ...(this.save.data.freePlay || {}) };
      o.seed = '';
      this.startFreePlay(o);
      return;
    }
    this.startQuick(this.difficultyId);
  }

  pause() {
    if (this.screen === 'play') this.screen = 'pause';
  }

  resume() {
    if (this.screen === 'pause') this.screen = 'play';
  }

  togglePause() {
    if (this.screen === 'play') this.pause();
    else if (this.screen === 'pause') this.resume();
  }

  requestHint() {
    if (this.screen !== 'play' || !this.maze) return;
    const profile = this.activeProfile || getProfile(this.difficultyId);
    if (!profile.hintsEnabled) return;
    const id = profile.id;
    const dur = id === 'easy' ? 5 : id === 'medium' ? 3.5 : 2.5;
    this.hintTimer = dur;
    this.hintsUsed += 1;
    this.deadEndAssist = false;
    this.stuckTimer = 0;
    if (this.audio && this.audio.hint) this.audio.hint();
  }

  /**
   * @param {number} dt
   * @param {{
   *   x: number, y: number,
   *   pause?: boolean, hint?: boolean, restart?: boolean,
   *   tap?: { x: number, y: number } | null,
   * }} input
   */
  update(dt, input) {
    this.time += dt;
    if (this.bumpCooldown > 0) this.bumpCooldown -= dt;
    if (this.assistPulse > 0) this.assistPulse -= dt;
    if (this.winFlash > 0) this.winFlash -= dt;

    if (this.screen === 'pause') {
      if (input.pause) this.resume();
      return null;
    }

    if (this.screen === 'win') return null;

    if (this.screen !== 'play' || !this.maze || !this.layout) return null;

    if (input.pause) {
      this.pause();
      return null;
    }
    if (input.hint) this.requestHint();
    if (input.restart) {
      this.restart();
      return null;
    }

    if (this.hintTimer > 0) this.hintTimer -= dt;

    this.elapsed += dt;
    this.justOpenedGate = false;
    const speed = this.movementMode === 'guided' ? MOVE.guidedSpeed : MOVE.freeSpeed;
    let moved = false;
    let blocked = false;
    const canEnter = (cx, cy) => this.canEnterCell(cx, cy);
    const prevX = this.player.x;
    const prevY = this.player.y;

    // Stick/keys/gamepad take priority and cancel a pending tap goal
    const stickMag = Math.hypot(input.x, input.y);
    if (stickMag > 0.18) {
      this.tapGoal = null;
    }

    // Fresh screen-space tap → walk open straight corridor to that cell
    if (input.tap && stickMag <= 0.18) {
      this._applyTap(input.tap, canEnter);
    }

    // While walking to a tapped square, keep feeding direction until arrival
    // (multi-cell runs: same heading through intermediate corridor cells)
    let moveInput = { x: input.x, y: input.y };
    if (this.tapGoal && stickMag <= 0.18) {
      // Re-aim from current cell in case of mid-run retarget; stay on goal dir
      const here = this.guided
        ? { x: this.guided.cellX, y: this.guided.cellY }
        : worldToCell(this.layout, this.maze, this.player.x, this.player.y);
      if (here.x === this.tapGoal.x && here.y === this.tapGoal.y) {
        // At goal cell — settle will clear; hold still if already centered
        moveInput = { x: 0, y: 0 };
      } else {
        const axis = dirToAxis(this.tapGoal.dir);
        moveInput = { x: axis.x, y: axis.y };
      }
    }

    if (this.movementMode === 'guided') {
      const g = integrateGuidedMove(
        this.maze, this.layout, this.guided, moveInput, speed, dt, canEnter,
      );
      this.guided = g;
      this.player.x = g.x;
      this.player.y = g.y;
      moved = g.moved;
      if (g.heading === 'east') this.player.facing = 'east';
      else if (g.heading === 'west') this.player.facing = 'west';
      else if (g.heading === 'north') this.player.facing = 'north';
      else if (g.heading === 'south') this.player.facing = 'south';
      else if (Math.hypot(moveInput.x, moveInput.y) > 0.18) {
        // Face the stick even when blocked so kids see their intent
        if (Math.abs(moveInput.x) >= Math.abs(moveInput.y)) {
          this.player.facing = moveInput.x >= 0 ? 'east' : 'west';
        } else {
          this.player.facing = moveInput.y >= 0 ? 'south' : 'north';
        }
        if (!moved && this.bumpCooldown <= 0) blocked = true;
      }
      // Stop on the tapped square (don't coast past it in corridors)
      this._settleTapGoal();
    } else {
      const vel = { x: moveInput.x * speed, y: moveInput.y * speed };
      const next = integrateFreeMove(
        this.maze, this.layout, this.player, vel, dt, this.player.radius,
      );
      if (Math.hypot(moveInput.x, moveInput.y) > 0.1) {
        moved = Math.hypot(next.x - this.player.x, next.y - this.player.y) > 0.15;
        blocked = next.blocked && !moved;
        if (Math.abs(moveInput.x) >= Math.abs(moveInput.y)) {
          this.player.facing = moveInput.x >= 0 ? 'east' : 'west';
        } else {
          this.player.facing = moveInput.y >= 0 ? 'south' : 'north';
        }
      }
      // Gate cell block for free movement
      const tryCell = worldToCell(this.layout, this.maze, next.x, next.y);
      if (!this.canEnterCell(tryCell.x, tryCell.y)) {
        this.player.x = prevX;
        this.player.y = prevY;
        blocked = true;
        moved = false;
      } else {
        this.player.x = next.x;
        this.player.y = next.y;
      }
      const cell = worldToCell(this.layout, this.maze, this.player.x, this.player.y);
      this.guided = createGuidedState(this.maze, this.layout, cell.x, cell.y);
      this.guided.x = this.player.x;
      this.guided.y = this.player.y;
      this._settleTapGoal();
    }

    this.moving = moved;
    if (blocked && this.bumpCooldown <= 0) {
      this.bumpCooldown = 0.28;
      if (this.audio && this.audio.bump) this.audio.bump();
    }

    const pCell = worldToCell(this.layout, this.maze, this.player.x, this.player.y);
    const pIdx = cellIndex(this.maze, pCell.x, pCell.y);
    this.visited.add(pIdx);

    // Switch activation
    if (!this.gateOpen && this.maze.switchPos && sameCell(pCell, this.maze.switchPos)) {
      this.gateOpen = true;
      this.justOpenedGate = true;
      if (this.audio && this.audio.collect) this.audio.collect();
    }

    const profile = this.activeProfile || getProfile(this.difficultyId);
    const inputMag = Math.hypot(moveInput.x, moveInput.y);
    if (profile.id === 'easy' || profile.id === 'medium' || profile.guidedMovement) {
      if (isDeadEndCell(this.maze, pCell.x, pCell.y)) {
        this.stuckTimer += dt;
        if (this.stuckTimer > 2.2 && !this.deadEndAssist && this.hintTimer <= 0) {
          this.deadEndAssist = true;
          this.assistPulse = 4;
          this.hintTimer = profile.id === 'easy' ? 4 : 2.5;
          if (this.audio && this.audio.hint) this.audio.hint();
        }
      } else if (moved || inputMag < 0.1) {
        if (!isDeadEndCell(this.maze, pCell.x, pCell.y)) {
          this.stuckTimer = Math.max(0, this.stuckTimer - dt * 0.5);
          if (this.stuckTimer < 1) this.deadEndAssist = false;
        }
      }
    }

    this._updateCamera(dt);

    for (const c of this.maze.collectibles) {
      if (this.collected.has(c.id)) continue;
      const p = cellCenter(this.layout, c.x, c.y);
      if (dist(this.player.x, this.player.y, p.x, p.y) < this.layout.cellSize * 0.34) {
        this.collected.add(c.id);
        if (this.audio && this.audio.collect) this.audio.collect();
        return { event: 'collect', x: p.x, y: p.y };
      }
    }

    const goal = cellCenter(this.layout, this.maze.exit.x, this.maze.exit.y);
    if (dist(this.player.x, this.player.y, goal.x, goal.y) < this.layout.cellSize * 0.4) {
      this.triggerWin();
      return { event: 'win', x: goal.x, y: goal.y };
    }

    return null;
  }

  /**
   * Map a stage-space tap to a walk goal (full open straight corridor).
   * @param {{ x: number, y: number }} stageTap
   * @param {(cx: number, cy: number) => boolean} canEnter
   */
  _applyTap(stageTap, canEnter) {
    if (!this.maze || !this.layout) return;
    const worldX = stageTap.x + this.camX;
    const worldY = stageTap.y + this.camY;
    const tapCell = worldToCell(this.layout, this.maze, worldX, worldY);
    const playerCell = worldToCell(this.layout, this.maze, this.player.x, this.player.y);
    // Prefer guided cell when parked (more accurate mid-animation)
    const fromX = this.guided ? this.guided.cellX : playerCell.x;
    const fromY = this.guided ? this.guided.cellY : playerCell.y;

    const step = resolveTapStep(
      this.maze, fromX, fromY, tapCell.x, tapCell.y, canEnter,
    );
    if (!step) {
      // Soft bump feedback if they tapped a wall / blocked cell
      if (this.bumpCooldown <= 0) {
        const dx = tapCell.x - fromX;
        const dy = tapCell.y - fromY;
        if (dx !== 0 || dy !== 0) {
          this.bumpCooldown = 0.2;
          if (this.audio && this.audio.bump) this.audio.bump();
        }
      }
      return;
    }
    // Already there (or goal is current cell after partial resolve)
    if (step.x === fromX && step.y === fromY) {
      this.tapGoal = null;
      return;
    }
    this.tapGoal = step;
    this.player.facing = step.dir;
  }

  /**
   * Clear tap goal when the player has entered the target cell; park on center.
   * Guided mode waits until near center so we don't cut a mid-leg short.
   */
  _settleTapGoal() {
    if (!this.tapGoal || !this.layout || !this.maze) return;
    const cell = worldToCell(this.layout, this.maze, this.player.x, this.player.y);
    if (cell.x !== this.tapGoal.x || cell.y !== this.tapGoal.y) return;
    const center = cellCenter(this.layout, cell.x, cell.y);
    if (this.movementMode === 'guided') {
      if (dist(this.player.x, this.player.y, center.x, center.y) > GUIDED_CENTER_EPS * 2) {
        return;
      }
    }
    this.player.x = center.x;
    this.player.y = center.y;
    this.tapGoal = null;
    if (this.guided) {
      this.guided.cellX = cell.x;
      this.guided.cellY = cell.y;
      this.guided.x = center.x;
      this.guided.y = center.y;
      this.guided.heading = null;
    }
  }

  /**
   * @param {number} dt
   */
  _updateCamera(dt) {
    if (!this.maze || !this.layout) return;
    const profile = this.activeProfile || getProfile(this.difficultyId);
    if (profile.cameraMode === 'full') {
      this.camX = 0;
      this.camY = 0;
      return;
    }
    const targetX = this.player.x - W / 2;
    const targetY = this.player.y - H / 2;
    const minX = Math.min(0, this.layout.originX - 20);
    const minY = Math.min(0, this.layout.originY - 20);
    const maxX = Math.max(0, this.layout.originX + this.maze.cols * this.layout.cellSize - W + 20);
    const maxY = Math.max(0, this.layout.originY + this.maze.rows * this.layout.cellSize - H + 20);
    const tx = clamp(targetX, minX, maxX);
    const ty = clamp(targetY, minY, maxY);
    const k = this.reducedMotion ? 1 : Math.min(1, 6 * dt);
    this.camX += (tx - this.camX) * k;
    this.camY += (ty - this.camY) * k;
  }

  triggerWin() {
    if (this.won) return;
    this.won = true;
    this.screen = 'win';
    this.winFlash = 0.6;
    if (this.audio && this.audio.win) this.audio.win();

    /** @type {{ adventureStageCleared?: boolean, unlockThemes?: string[], unlockCharacters?: string[] }} */
    const extra = {};
    if (this.mode === 'adventure' && this.adventureStage) {
      const progress = this.save.data.adventureProgress | 0;
      // Only advance if this was the next uncleared stage
      if (this.adventureStage.order === progress + 1) {
        extra.adventureStageCleared = true;
        extra.unlockThemes = this.adventureStage.unlockThemes || [];
        extra.unlockCharacters = this.adventureStage.unlockCharacters || [];
        const names = [
          ...(extra.unlockThemes || []).map((t) => getTheme(t).name),
          ...(extra.unlockCharacters || []).map((c) => getCharacter(c).name),
        ];
        if (names.length) this.unlockBanner = `Unlocked: ${names.join(', ')}`;
        if (progress + 1 >= adventureStageCount()) {
          if (this.save.markAdventureComplete) this.save.markAdventureComplete();
          this.unlockBanner = (this.unlockBanner ? this.unlockBanner + ' · ' : '') + 'Adventure complete!';
        }
      }
    }

    if (this.save && typeof this.save.recordWin === 'function') {
      this.save.recordWin(
        this.difficultyId,
        this.collected.size,
        this.mode,
        this.mode === 'daily' ? dateKey() : '',
        extra,
      );
    }
  }

  playerCellIndex() {
    if (!this.maze || !this.layout) return 0;
    const c = worldToCell(this.layout, this.maze, this.player.x, this.player.y);
    return cellIndex(this.maze, c.x, c.y);
  }

  activeHintTrail() {
    if (!this.maze || this.hintTimer <= 0) return [];
    // If gate locked, trail toward switch first
    if (!this.gateOpen && this.maze.switchPos) {
      const from = this.playerCellIndex();
      const pos = { x: from % this.maze.cols, y: (from / this.maze.cols) | 0 };
      const path = bfsPath(this.maze, pos, this.maze.switchPos);
      if (path) return path.slice(0, 6);
    }
    const profile = this.activeProfile || getProfile(this.difficultyId);
    const n = profile.id === 'easy' ? 7 : 5;
    return hintTrail(this.maze, this.playerCellIndex(), n);
  }

  activeHintDir() {
    if (!this.maze || (this.hintTimer <= 0 && !this.deadEndAssist)) return null;
    if (!this.gateOpen && this.maze.switchPos) {
      const from = this.playerCellIndex();
      const pos = { x: from % this.maze.cols, y: (from / this.maze.cols) | 0 };
      const path = bfsPath(this.maze, pos, this.maze.switchPos);
      if (path && path.length >= 2) {
        const a = path[0];
        const b = path[1];
        const dx = (b % this.maze.cols) - (a % this.maze.cols);
        const dy = ((b / this.maze.cols) | 0) - ((a / this.maze.cols) | 0);
        if (dx === 1) return 'east';
        if (dx === -1) return 'west';
        if (dy === 1) return 'south';
        if (dy === -1) return 'north';
      }
      return null;
    }
    return hintDirection(this.maze, this.playerCellIndex());
  }

  hudLine() {
    const profile = this.activeProfile || getProfile(this.difficultyId);
    const stars = this.collected.size;
    const total = this.maze ? this.maze.collectibles.length : 0;
    const starPart = total > 0 ? ` · ★ ${stars}/${total}` : '';
    if (this.mode === 'adventure' && this.adventureStage) {
      return `${this.adventureStage.icon} ${this.adventureStage.name}${starPart}`;
    }
    const modeTag = this.mode === 'daily' ? '📅 ' : this.mode === 'freeplay' ? '🛠 ' : '';
    return `${modeTag}${profile.label}${starPart}`;
  }

  showPathGlow() {
    const profile = this.activeProfile || getProfile(this.difficultyId);
    return profile.pathGlowDefault || this.highContrast;
  }

  character() {
    return getCharacter(this.characterId);
  }

  /**
   * Whether player may enter cell (gate closed blocks gate cell).
   * @param {number} cx
   * @param {number} cy
   */
  canEnterCell(cx, cy) {
    if (this.gateOpen || !this.maze || !this.maze.gatePos) return true;
    return !(cx === this.maze.gatePos.x && cy === this.maze.gatePos.y);
  }

  hasGate() {
    return !!(this.maze && this.maze.gatePos && this.maze.switchPos);
  }
}
