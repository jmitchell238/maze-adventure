/**
 * Draw a GameSession snapshot — presentation only.
 */

import { W, H } from '../../config/index.js';
import { getProfile } from '../../domain/difficulty.js';
import { highContrastTheme } from '../../domain/themes.js';
import {
  drawBackground, drawMaze, drawEntranceGoal, drawCollectibles, drawSwitchGate,
  drawPlayer, drawStick, drawHud, drawHint, drawMenuDecor,
} from './maze.js';
import { drawParticles } from '../particles.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../../world/GameSession.js').GameSession} session
 * @param {object} inputPoll stick state
 */
export function drawSession(ctx, session, inputPoll) {
  let theme = session.theme;
  if (session.highContrast) theme = highContrastTheme(theme);
  const reduced = session.reducedMotion;

  if (
    session.screen === 'menu' || session.screen === 'difficulty' ||
    session.screen === 'settings' || session.screen === 'adventure' ||
    session.screen === 'freeplay'
  ) {
    drawMenuDecor(ctx, W, H, session.time, theme, reduced);
    return;
  }

  if (!session.maze || !session.layout) {
    drawBackground(ctx, W, H, theme, session.time, reduced);
    return;
  }

  ctx.save();
  // Camera
  ctx.translate(-session.camX, -session.camY);

  drawBackground(ctx, W + Math.abs(session.camX) * 2 + 40, H + Math.abs(session.camY) * 2 + 40, theme, session.time, reduced);
  // Actually draw background in screen space for vignette — redo:
  ctx.restore();
  drawBackground(ctx, W, H, theme, session.time, reduced);
  ctx.save();
  ctx.translate(-session.camX, -session.camY);

  const profile = getProfile(session.difficultyId);
  drawMaze(ctx, session.maze, session.layout, theme, {
    pathGlow: session.showPathGlow(),
    solution: session.maze.solution,
    visited: profile.id === 'easy' || profile.id === 'medium' ? session.visited : null,
    time: session.time,
    reducedMotion: reduced,
  });

  drawEntranceGoal(ctx, session.maze, session.layout, theme, session.time, reduced);
  drawSwitchGate(
    ctx, session.maze, session.layout, theme, session.gateOpen, session.time, reduced,
  );
  drawCollectibles(
    ctx, session.maze, session.layout, theme, session.collected, session.time, reduced,
  );

  const trail = session.activeHintTrail();
  if (trail.length) {
    drawHint(
      ctx,
      session.maze,
      session.layout,
      trail,
      session.time,
      theme.entrance,
      session.activeHintDir(),
    );
  }

  drawPlayer(
    ctx,
    session.player,
    session.layout,
    theme,
    session.player.radius,
    session.time,
    session.moving,
    reduced,
  );

  // particles in world space
  drawParticles(ctx);

  ctx.restore();

  // Screen-space HUD + stick
  if (session.screen === 'play' || session.screen === 'pause') {
    drawStick(ctx, inputPoll.stick || { active: false, dx: 0, dy: 0 });
    let right = '';
    if (session.screen === 'pause') right = 'PAUSED';
    else if (session.hasGate() && !session.gateOpen) right = '⏻ open gate';
    else if (session.deadEndAssist) right = '✨ this way';
    else if (session.timerEnabled) {
      right = `${Math.floor(session.elapsed)}s`;
    }
    drawHud(ctx, W, {
      line: session.hudLine(),
      right,
      rightColor: session.deadEndAssist ? theme.entrance : '#ffd56a',
    });
    // Debug / parent seed line
    if (session.showSeed && session.seed) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`seed: ${session.seed}`.slice(0, 48), 14, H - 10);
    }
  }

  if (session.screen === 'pause') {
    ctx.fillStyle = 'rgba(7,11,22,0.45)';
    ctx.fillRect(0, 0, W, H);
  }

  if (session.screen === 'win' && session.winFlash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${0.12 * session.winFlash})`;
    ctx.fillRect(0, 0, W, H);
  }
}
