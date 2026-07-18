/**
 * Draw dimensional maze walls/floors from logical model + theme.
 * M5 polish: thicker walls, ambient, breadcrumbs, nicer characters.
 */

import { cellCenter } from '../../domain/movement/free.js';
import { STICK_BASE, STICK_R } from '../input.js';
import { indexToPos } from '../../domain/maze/model.js';

/**
 * @typedef {import('../../domain/maze/model.js').Maze} Maze
 * @typedef {import('../../domain/movement/free.js').MazeLayout} MazeLayout
 * @typedef {import('../../domain/themes.js').MazeTheme} MazeTheme
 */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} H
 * @param {MazeTheme} theme
 * @param {number} [time=0]
 * @param {boolean} [reducedMotion=false]
 */
export function drawBackground(ctx, W, H, theme, time = 0, reducedMotion = false) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, theme.bgTop);
  g.addColorStop(1, theme.bgBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Soft light blob
  const lx = W * 0.3;
  const ly = H * 0.2;
  const light = ctx.createRadialGradient(lx, ly, 10, lx, ly, H * 0.55);
  light.addColorStop(0, 'rgba(255,255,255,0.08)');
  light.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, W, H);

  // Ambient motes
  if (!reducedMotion) {
    const n = theme.ambient === 'sparkles' ? 18 : 12;
    for (let i = 0; i < n; i++) {
      const phase = time * (0.15 + (i % 5) * 0.03) + i * 1.7;
      const x = ((i * 97 + phase * 18) % (W + 30)) - 15;
      const y = 40 + ((i * 53) % (H - 80)) + Math.sin(phase) * 10;
      ctx.globalAlpha = 0.12 + (i % 4) * 0.04;
      ctx.fillStyle = theme.particleColors[i % theme.particleColors.length];
      if (theme.ambient === 'petals' || theme.ambient === 'leaves') {
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3, phase, 0, Math.PI * 2);
        ctx.fill();
      } else if (theme.ambient === 'blocks') {
        ctx.fillRect(x, y, 4, 4);
      } else if (theme.ambient === 'bubbles') {
        ctx.strokeStyle = theme.particleColors[i % theme.particleColors.length];
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 3 + (i % 4), 0, Math.PI * 2);
        ctx.stroke();
      } else if (theme.ambient === 'snow') {
        ctx.beginPath();
        ctx.arc(x, y, 1.5 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // vignette
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.8);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Maze} maze
 * @param {MazeLayout} layout
 * @param {MazeTheme} theme
 * @param {{ pathGlow?: boolean, solution?: number[], visited?: Set<number>, time?: number, reducedMotion?: boolean }} [opts]
 */
export function drawMaze(ctx, maze, layout, theme, opts = {}) {
  const { cellSize, originX, originY, wallThickness } = layout;
  const t = wallThickness;

  // Board shadow (toy playset)
  const boardL = originX - 6;
  const boardT = originY - 6;
  const boardW = maze.cols * cellSize + 12;
  const boardH = maze.rows * cellSize + 12;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, boardL + 4, boardT + 8, boardW, boardH, 14);
  ctx.fill();
  ctx.fillStyle = theme.bgTop;
  roundRect(ctx, boardL, boardT, boardW, boardH, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  roundRect(ctx, boardL, boardT, boardW, boardH, 14);
  ctx.stroke();

  // Floor tiles
  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      const px = originX + x * cellSize;
      const py = originY + y * cellSize;
      ctx.fillStyle = (x + y) % 2 === 0 ? theme.floor : theme.floorAlt;
      roundRect(ctx, px + 1, py + 1, cellSize - 2, cellSize - 2, Math.min(8, cellSize * 0.18));
      ctx.fill();
      // subtle inner highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      roundRect(ctx, px + 3, py + 3, cellSize - 6, cellSize - 6, 4);
      ctx.stroke();
    }
  }

  // Breadcrumbs (visited)
  if (opts.visited && opts.visited.size) {
    ctx.fillStyle = theme.breadcrumb || 'rgba(255,255,255,0.15)';
    for (const idx of opts.visited) {
      const c = indexToPos(maze, idx);
      const px = originX + c.x * cellSize + cellSize * 0.35;
      const py = originY + c.y * cellSize + cellSize * 0.35;
      ctx.beginPath();
      ctx.arc(px + cellSize * 0.15, py + cellSize * 0.15, Math.max(2, cellSize * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Path glow (Easy)
  if (opts.pathGlow && opts.solution && opts.solution.length) {
    ctx.fillStyle = theme.pathGlow;
    for (const idx of opts.solution) {
      const cx = idx % maze.cols;
      const cy = (idx / maze.cols) | 0;
      const px = originX + cx * cellSize;
      const py = originY + cy * cellSize;
      roundRect(ctx, px + cellSize * 0.18, py + cellSize * 0.18, cellSize * 0.64, cellSize * 0.64, 6);
      ctx.fill();
    }
  }

  // Wall shadows + bodies
  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      const cell = maze.cells[y * maze.cols + x];
      const px = originX + x * cellSize;
      const py = originY + y * cellSize;
      if (cell.north) drawWallSeg(ctx, px, py, cellSize, t, 'h', theme);
      if (cell.west) drawWallSeg(ctx, px, py, cellSize, t, 'v', theme);
      if (x === maze.cols - 1 && cell.east) {
        drawWallSeg(ctx, px + cellSize, py, cellSize, t, 'v', theme);
      }
      if (y === maze.rows - 1 && cell.south) {
        drawWallSeg(ctx, px, py + cellSize, cellSize, t, 'h', theme);
      }
    }
  }

  // Corner posts
  for (let y = 0; y <= maze.rows; y++) {
    for (let x = 0; x <= maze.cols; x++) {
      if (!hasCornerWall(maze, x, y)) continue;
      const cx = originX + x * cellSize;
      const cy = originY + y * cellSize;
      const r = t * 0.72;
      ctx.fillStyle = theme.wallShadow;
      ctx.beginPath();
      ctx.ellipse(cx + 1.5, cy + 2.5, r, r * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      // side
      ctx.fillStyle = theme.wallSide;
      ctx.beginPath();
      ctx.arc(cx, cy + 1, r, 0, Math.PI * 2);
      ctx.fill();
      // top cap
      const topG = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
      topG.addColorStop(0, lighten(theme.wallTop, 30));
      topG.addColorStop(1, theme.wallTop);
      ctx.fillStyle = topG;
      ctx.beginPath();
      ctx.arc(cx, cy - 1, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Sparse decorations on wall tops (corners only — stay out of paths)
  if (!opts.reducedMotion) {
    drawCornerDecor(ctx, maze, layout, theme, opts.time || 0);
  }
}

/**
 * @param {Maze} maze
 * @param {number} x
 * @param {number} y
 */
function hasCornerWall(maze, x, y) {
  const checks = [
    [x, y, 'north'], [x, y, 'west'],
    [x - 1, y, 'north'], [x - 1, y, 'east'],
    [x, y - 1, 'south'], [x, y - 1, 'west'],
    [x - 1, y - 1, 'south'], [x - 1, y - 1, 'east'],
  ];
  for (const [cx, cy, dir] of checks) {
    if (cx < 0 || cy < 0 || cx >= maze.cols || cy >= maze.rows) {
      if (x === 0 || y === 0 || x === maze.cols || y === maze.rows) return true;
      continue;
    }
    if (maze.cells[cy * maze.cols + cx][dir]) return true;
  }
  return false;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Maze} maze
 * @param {MazeLayout} layout
 * @param {MazeTheme} theme
 * @param {number} time
 */
function drawCornerDecor(ctx, maze, layout, theme, time) {
  let n = 0;
  for (let y = 0; y <= maze.rows; y++) {
    for (let x = 0; x <= maze.cols; x++) {
      if (!hasCornerWall(maze, x, y)) continue;
      if ((x + y + Math.floor(time)) % 5 !== 0) continue;
      n++;
      if (n > 12) return;
      const cx = layout.originX + x * layout.cellSize;
      const cy = layout.originY + y * layout.cellSize - 4;
      ctx.fillStyle = theme.decor;
      ctx.globalAlpha = 0.75;
      if (theme.ambient === 'petals') {
        ctx.beginPath();
        ctx.ellipse(cx, cy, 4, 2.5, time + x, 0, Math.PI * 2);
        ctx.fill();
      } else if (theme.ambient === 'blocks') {
        ctx.fillRect(cx - 3, cy - 5, 6, 5);
      } else {
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} px
 * @param {number} py
 * @param {number} cellSize
 * @param {number} t
 * @param {'h'|'v'} orient
 * @param {MazeTheme} theme
 */
function drawWallSeg(ctx, px, py, cellSize, t, orient, theme) {
  if (orient === 'h') {
    const x = px;
    const y = py - t / 2;
    const w = cellSize;
    const h = t;
    ctx.fillStyle = theme.wallShadow;
    roundRect(ctx, x + 2, y + 4, w, h, t / 2);
    ctx.fill();
    ctx.fillStyle = theme.wallSide;
    roundRect(ctx, x, y + 3, w, h, t / 2);
    ctx.fill();
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, lighten(theme.wallTop, 25));
    g.addColorStop(0.55, theme.wallTop);
    g.addColorStop(1, theme.wallSide);
    ctx.fillStyle = g;
    roundRect(ctx, x, y, w, h * 0.78, t / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 2);
    ctx.lineTo(x + w - 5, y + 2);
    ctx.stroke();
  } else {
    const x = px - t / 2;
    const y = py;
    const w = t;
    const h = cellSize;
    ctx.fillStyle = theme.wallShadow;
    roundRect(ctx, x + 3, y + 2, w, h, t / 2);
    ctx.fill();
    ctx.fillStyle = theme.wallSide;
    roundRect(ctx, x + 1, y, w, h, t / 2);
    ctx.fill();
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, lighten(theme.wallTop, 20));
    g.addColorStop(1, theme.wallSide);
    ctx.fillStyle = g;
    roundRect(ctx, x, y, w * 0.78, h, t / 2);
    ctx.fill();
  }
}

/**
 * @param {string} hex
 * @param {number} amt
 */
function lighten(hex, amt) {
  const n = hex.replace('#', '');
  const full = n.length === 3 ? n.split('').map((c) => c + c).join('') : n;
  const num = parseInt(full, 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0xff) + amt;
  let b = (num & 0xff) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Maze} maze
 * @param {MazeLayout} layout
 * @param {MazeTheme} theme
 * @param {number} time
 * @param {boolean} [reducedMotion]
 */
export function drawEntranceGoal(ctx, maze, layout, theme, time, reducedMotion = false) {
  const en = cellCenter(layout, maze.entrance.x, maze.entrance.y);
  const ex = cellCenter(layout, maze.exit.x, maze.exit.y);
  const r = layout.cellSize * 0.3;
  const pulse = reducedMotion ? 1 : 1 + Math.sin(time * 3) * 0.1;

  // Entrance
  ctx.save();
  ctx.shadowColor = theme.entrance;
  ctx.shadowBlur = 12;
  ctx.fillStyle = theme.entrance;
  ctx.beginPath();
  ctx.arc(en.x, en.y, r * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.font = `bold ${Math.max(14, layout.cellSize * 0.38)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('▶', en.x + 1, en.y + 1);

  // Goal
  ctx.save();
  ctx.shadowColor = theme.goal;
  ctx.shadowBlur = 16;
  const gr = r * 1.2 * pulse;
  const gg = ctx.createRadialGradient(ex.x - gr * 0.2, ex.y - gr * 0.2, 0, ex.x, ex.y, gr);
  gg.addColorStop(0, lighten(theme.goal, 40));
  gg.addColorStop(1, theme.goal);
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.arc(ex.x, ex.y, gr, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.max(16, layout.cellSize * 0.42)}px system-ui`;
  ctx.fillText(theme.goalIcon || '★', ex.x, ex.y + 1);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Maze} maze
 * @param {MazeLayout} layout
 * @param {MazeTheme} theme
 * @param {Set<string>} collectedIds
 * @param {number} time
 * @param {boolean} [reducedMotion]
 */
/**
 * Draw switch (button) and gate (locked door).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Maze} maze
 * @param {MazeLayout} layout
 * @param {MazeTheme} theme
 * @param {boolean} gateOpen
 * @param {number} time
 * @param {boolean} [reducedMotion]
 */
export function drawSwitchGate(ctx, maze, layout, theme, gateOpen, time, reducedMotion = false) {
  if (!maze.switchPos && !maze.gatePos) return;
  const pulse = reducedMotion ? 1 : 1 + Math.sin(time * 4) * 0.08;

  if (maze.switchPos) {
    const p = cellCenter(layout, maze.switchPos.x, maze.switchPos.y);
    const r = layout.cellSize * 0.22 * (gateOpen ? 0.85 : pulse);
    ctx.fillStyle = gateOpen ? 'rgba(125,255,160,0.5)' : '#ffd56a';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = gateOpen ? theme.accent : '#b8860b';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.font = `bold ${Math.max(11, layout.cellSize * 0.28)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(gateOpen ? '✓' : '⏻', p.x, p.y + 1);
  }

  if (maze.gatePos && !gateOpen) {
    const p = cellCenter(layout, maze.gatePos.x, maze.gatePos.y);
    const s = layout.cellSize * 0.55;
    ctx.fillStyle = 'rgba(40,20,60,0.75)';
    roundRect(ctx, p.x - s / 2, p.y - s / 2, s, s, 6);
    ctx.fill();
    ctx.strokeStyle = '#ff6b9d';
    ctx.lineWidth = 2.5;
    roundRect(ctx, p.x - s / 2, p.y - s / 2, s, s, 6);
    ctx.stroke();
    ctx.fillStyle = '#ffd56a';
    ctx.font = `bold ${Math.max(14, layout.cellSize * 0.32)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔒', p.x, p.y + 1);
  } else if (maze.gatePos && gateOpen) {
    const p = cellCenter(layout, maze.gatePos.x, maze.gatePos.y);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(p.x, p.y, layout.cellSize * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function drawCollectibles(ctx, maze, layout, theme, collectedIds, time, reducedMotion = false) {
  for (const c of maze.collectibles) {
    if (collectedIds.has(c.id)) continue;
    const p = cellCenter(layout, c.x, c.y);
    const bob = reducedMotion ? 0 : Math.sin(time * 4 + c.x) * 3;
    const r = layout.cellSize * 0.17;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + r + 3, r * 0.85, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = theme.collectible;
    ctx.shadowBlur = 8;
    const g = ctx.createRadialGradient(p.x - r * 0.3, p.y + bob - r * 0.3, 0, p.x, p.y + bob, r);
    g.addColorStop(0, '#fff8d0');
    g.addColorStop(1, theme.collectible);
    ctx.fillStyle = g;
    // star-ish
    ctx.beginPath();
    ctx.arc(p.x, p.y + bob, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.arc(p.x - r * 0.3, p.y + bob - r * 0.3, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number, facing?: string }} player
 * @param {MazeLayout} layout
 * @param {MazeTheme} theme
 * @param {number} radius
 * @param {number} time
 * @param {boolean} moving
 * @param {boolean} [reducedMotion]
 */
export function drawPlayer(ctx, player, layout, theme, radius, time, moving, reducedMotion = false) {
  const bob = reducedMotion ? 0 : (moving ? Math.sin(time * 14) * 2 : Math.sin(time * 2.2) * 1);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + radius * 0.75, radius * 0.9, radius * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();

  // body gradient
  const g = ctx.createRadialGradient(
    player.x - radius * 0.25, player.y + bob - radius * 0.3, radius * 0.1,
    player.x, player.y + bob, radius,
  );
  g.addColorStop(0, lighten(theme.player, 35));
  g.addColorStop(1, theme.player);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = theme.playerStroke;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // cheeks
  ctx.fillStyle = theme.playerAccent || 'rgba(255,150,180,0.5)';
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.ellipse(player.x - radius * 0.45, player.y + bob + radius * 0.15, radius * 0.18, radius * 0.12, 0, 0, Math.PI * 2);
  ctx.ellipse(player.x + radius * 0.45, player.y + bob + radius * 0.15, radius * 0.18, radius * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // eyes look toward facing
  let ox = 0;
  let oy = 0;
  if (player.facing === 'east') ox = radius * 0.08;
  if (player.facing === 'west') ox = -radius * 0.08;
  if (player.facing === 'south') oy = radius * 0.06;
  if (player.facing === 'north') oy = -radius * 0.08;

  const eyeY = player.y + bob - radius * 0.12 + oy;
  ctx.fillStyle = theme.playerStroke;
  ctx.beginPath();
  ctx.arc(player.x - radius * 0.28 + ox, eyeY, radius * 0.15, 0, Math.PI * 2);
  ctx.arc(player.x + radius * 0.28 + ox, eyeY, radius * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(player.x - radius * 0.24 + ox, eyeY - radius * 0.06, radius * 0.06, 0, Math.PI * 2);
  ctx.arc(player.x + radius * 0.32 + ox, eyeY - radius * 0.06, radius * 0.06, 0, Math.PI * 2);
  ctx.fill();

  // smile
  ctx.strokeStyle = theme.playerStroke;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(player.x + ox * 0.5, player.y + bob + radius * 0.18, radius * 0.32, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ active: boolean, dx: number, dy: number }} stick
 */
export function drawStick(ctx, stick) {
  const { x, y } = STICK_BASE;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(x, y, STICK_R + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.arc(x, y, STICK_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  const kx = x + stick.dx * STICK_R * 0.65;
  const ky = y + stick.dy * STICK_R * 0.65;
  const kg = ctx.createRadialGradient(kx - 4, ky - 4, 2, kx, ky, STICK_R * 0.45);
  kg.addColorStop(0, stick.active ? '#b8ffd0' : '#ffffff');
  kg.addColorStop(1, stick.active ? '#4fd68a' : 'rgba(255,255,255,0.5)');
  ctx.fillStyle = kg;
  ctx.beginPath();
  ctx.arc(kx, ky, STICK_R * 0.44, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {object} hud
 */
export function drawHud(ctx, W, hud) {
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  roundRect(ctx, 10, 10, W - 20, 30, 12);
  ctx.fill();
  ctx.fillStyle = '#eef2ff';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(hud.line, 20, 25);
  if (hud.right) {
    ctx.textAlign = 'right';
    ctx.fillStyle = hud.rightColor || '#ffd56a';
    ctx.fillText(hud.right, W - 20, 25);
  }
}

/**
 * Footprint / sparkle trail along solution.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Maze} maze
 * @param {MazeLayout} layout
 * @param {number[]} trail
 * @param {number} time
 * @param {string} color
 * @param {import('../../maze/model.js').Dir | null} [dir]
 */
export function drawHint(ctx, maze, layout, trail, time, color, dir = null) {
  ctx.save();
  for (let i = 0; i < trail.length; i++) {
    const idx = trail[i];
    const c = indexToPos(maze, idx);
    const p = cellCenter(layout, c.x, c.y);
    const a = 0.55 - i * 0.06 + Math.sin(time * 6 + i) * 0.08;
    ctx.globalAlpha = Math.max(0.15, a);
    ctx.fillStyle = color;
    // footprint oval
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, layout.cellSize * 0.12, layout.cellSize * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    if (i === 1 && dir) {
      ctx.globalAlpha = 0.7;
      ctx.font = `bold ${Math.max(16, layout.cellSize * 0.35)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const arrow = dir === 'east' ? '→' : dir === 'west' ? '←' : dir === 'north' ? '↑' : '↓';
      ctx.fillText(arrow, p.x, p.y);
    }
  }
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r
 */
export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} H
 * @param {number} time
 * @param {MazeTheme} theme
 * @param {boolean} [reducedMotion]
 */
export function drawMenuDecor(ctx, W, H, time, theme, reducedMotion = false) {
  drawBackground(ctx, W, H, theme, time, reducedMotion);
  // floating toy rings
  if (!reducedMotion) {
    for (let i = 0; i < 5; i++) {
      const x = W * 0.15 + i * 60;
      const y = H * 0.25 + Math.sin(time + i) * 20;
      ctx.strokeStyle = theme.particleColors[i % theme.particleColors.length];
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 18 + i * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
