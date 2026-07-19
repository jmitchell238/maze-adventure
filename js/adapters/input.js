/**
 * Keyboard + large virtual stick + gamepad for maze movement.
 */

import { W, H } from '../config/index.js';
import { clamp } from '../core/math.js';

export const STICK_R = 48;
export const STICK_BASE = { x: 72, y: H - 72 };

/**
 * @param {HTMLElement} stageEl
 * @param {HTMLCanvasElement} canvasEl
 * @param {{
 *   onPause?: () => void,
 *   onHint?: () => void,
 *   onRestart?: () => void,
 *   isPlay?: () => boolean,
 * }} [hooks]
 */
export function createInput(stageEl, canvasEl, hooks = {}) {
  const stick = {
    active: false,
    dx: 0,
    dy: 0,
    id: null,
    ox: STICK_BASE.x,
    oy: STICK_BASE.y,
  };
  /** @type {Record<string, boolean>} */
  const keys = Object.create(null);
  let pauseQueued = false;
  let hintQueued = false;
  let restartQueued = false;

  // Gamepad edge detection
  let prevPad = { pause: false, hint: false, restart: false };

  function canvasRect() {
    return canvasEl.getBoundingClientRect();
  }

  function clientToStage(cx, cy) {
    const rect = canvasRect();
    return {
      x: (cx - rect.left) / (rect.width / W),
      y: (cy - rect.top) / (rect.height / H),
    };
  }

  function resetStick() {
    stick.active = false;
    stick.dx = 0;
    stick.dy = 0;
    stick.id = null;
    stick.ox = STICK_BASE.x;
    stick.oy = STICK_BASE.y;
  }

  function updateStick(sx, sy) {
    let dx = (sx - stick.ox) / STICK_R;
    let dy = (sy - stick.oy) / STICK_R;
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    stick.dx = dx;
    stick.dy = dy;
  }

  function keyboardAxis() {
    let x = 0;
    let y = 0;
    if (keys.ArrowLeft || keys.a || keys.A) x -= 1;
    if (keys.ArrowRight || keys.d || keys.D) x += 1;
    if (keys.ArrowUp || keys.w || keys.W) y -= 1;
    if (keys.ArrowDown || keys.s || keys.S) y += 1;
    if (x && y) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  /**
   * Read first connected gamepad.
   * @returns {{ x: number, y: number, pause: boolean, hint: boolean, restart: boolean }}
   */
  function gamepadState() {
    const empty = { x: 0, y: 0, pause: false, hint: false, restart: false };
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return empty;
    const pads = navigator.getGamepads();
    if (!pads) return empty;
    let pad = null;
    for (let i = 0; i < pads.length; i++) {
      if (pads[i] && pads[i].connected) {
        pad = pads[i];
        break;
      }
    }
    if (!pad) return empty;

    // Left stick axes 0,1 + D-pad buttons 12-15 (standard mapping)
    let x = pad.axes[0] || 0;
    let y = pad.axes[1] || 0;
    const dead = 0.22;
    if (Math.abs(x) < dead) x = 0;
    if (Math.abs(y) < dead) y = 0;
    if (pad.buttons[14]?.pressed) x = -1; // left
    if (pad.buttons[15]?.pressed) x = 1; // right
    if (pad.buttons[12]?.pressed) y = -1; // up
    if (pad.buttons[13]?.pressed) y = 1; // down
    // Normalize diagonal
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }

    const pause = !!(pad.buttons[9]?.pressed || pad.buttons[8]?.pressed); // start/select
    const hint = !!(pad.buttons[0]?.pressed || pad.buttons[2]?.pressed); // A / X
    const restart = !!(pad.buttons[3]?.pressed); // Y

    return { x, y, pause, hint, restart };
  }

  function axis() {
    const k = keyboardAxis();
    const g = gamepadState();
    let x = k.x;
    let y = k.y;
    if (stick.active && (Math.abs(stick.dx) > 0.05 || Math.abs(stick.dy) > 0.05)) {
      x = clamp(stick.dx + k.x * 0.35, -1, 1);
      y = clamp(stick.dy + k.y * 0.35, -1, 1);
    }
    // Gamepad overlays if stronger
    if (Math.abs(g.x) > 0.08 || Math.abs(g.y) > 0.08) {
      x = clamp(x + g.x, -1, 1);
      y = clamp(y + g.y, -1, 1);
      const len = Math.hypot(x, y);
      if (len > 1) {
        x /= len;
        y /= len;
      }
    }
    return { x, y };
  }

  function poll() {
    const a = axis();
    const g = gamepadState();

    // Edge-trigger gamepad buttons
    if (g.pause && !prevPad.pause) pauseQueued = true;
    if (g.hint && !prevPad.hint) hintQueued = true;
    if (g.restart && !prevPad.restart) restartQueued = true;
    prevPad = { pause: g.pause, hint: g.hint, restart: g.restart };

    const out = {
      x: a.x,
      y: a.y,
      pause: pauseQueued,
      hint: hintQueued,
      restart: restartQueued,
      stick: { ...stick },
    };
    pauseQueued = false;
    hintQueued = false;
    restartQueued = false;
    return out;
  }

  function onKeyDown(e) {
    keys[e.key] = true;
    if (e.key === 'Escape') {
      pauseQueued = true;
      if (hooks.onPause) hooks.onPause();
      e.preventDefault();
    }
    if (e.key === 'h' || e.key === 'H') {
      hintQueued = true;
      if (hooks.onHint) hooks.onHint();
    }
    if (e.key === 'r' || e.key === 'R') {
      restartQueued = true;
      if (hooks.onRestart) hooks.onRestart();
    }
  }

  function onKeyUp(e) {
    keys[e.key] = false;
  }

  function clampStickOrigin(sx, sy) {
    // Keep floating stick fully on-screen
    return {
      x: clamp(sx, STICK_R + 10, W - STICK_R - 10),
      y: clamp(sy, STICK_R + 10, H - STICK_R - 10),
    };
  }

  const ptrOpts = { passive: false };

  function pointerDown(e) {
    // Never steal menu / form / scroll interactions
    if (e.target && e.target.closest &&
        e.target.closest('button, a, input, label, .menu-card, .screen, .adv-list, .how')) {
      return;
    }
    if (hooks.isPlay && !hooks.isPlay()) return;
    const p = clientToStage(e.clientX, e.clientY);
    stick.active = true;
    stick.id = e.pointerId;
    // Floating stick: anchor under the finger so drag always starts neutral
    // (fixed base made phone play feel broken when kids touch the maze itself).
    const origin = clampStickOrigin(p.x, p.y);
    stick.ox = origin.x;
    stick.oy = origin.y;
    // Start neutral — direction comes from the drag, not the touch point
    stick.dx = 0;
    stick.dy = 0;
    try {
      (stageEl || canvasEl).setPointerCapture(e.pointerId);
    } catch { /* */ }
    e.preventDefault();
  }

  function pointerMove(e) {
    if (!stick.active || (stick.id != null && e.pointerId !== stick.id)) return;
    if (hooks.isPlay && !hooks.isPlay()) {
      resetStick();
      return;
    }
    const p = clientToStage(e.clientX, e.clientY);
    updateStick(p.x, p.y);
    e.preventDefault();
  }

  function pointerUp(e) {
    if (stick.id != null && e.pointerId !== stick.id) return;
    resetStick();
  }

  function bind() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    // Prefer the stage so letterbox / chrome edge cases still get moves on phones
    const el = stageEl || canvasEl;
    el.addEventListener('pointerdown', pointerDown, ptrOpts);
    el.addEventListener('pointermove', pointerMove, ptrOpts);
    el.addEventListener('pointerup', pointerUp, ptrOpts);
    el.addEventListener('pointercancel', pointerUp, ptrOpts);
    el.addEventListener('lostpointercapture', pointerUp, ptrOpts);
  }

  function unbind() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    const el = stageEl || canvasEl;
    el.removeEventListener('pointerdown', pointerDown, ptrOpts);
    el.removeEventListener('pointermove', pointerMove, ptrOpts);
    el.removeEventListener('pointerup', pointerUp, ptrOpts);
    el.removeEventListener('pointercancel', pointerUp, ptrOpts);
    el.removeEventListener('lostpointercapture', pointerUp, ptrOpts);
  }

  bind();

  return {
    poll,
    resetStick,
    unbind,
    STICK_BASE,
    STICK_R,
  };
}
