/** Pure math helpers — no Math.random (use domain/rng for seeded entropy). */

/**
 * @param {number} v
 * @param {number} a
 * @param {number} b
 */
export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} t
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * @param {number} ax
 * @param {number} ay
 * @param {number} bx
 * @param {number} by
 */
export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

/**
 * Normalize value into 0..1 given approximate min/max.
 * @param {number} v
 * @param {number} min
 * @param {number} max
 */
export function norm01(v, min, max) {
  if (max <= min) return 0;
  return clamp((v - min) / (max - min), 0, 1);
}

/**
 * Letterbox canvas to logical size (browser only).
 * @param {HTMLCanvasElement} cv
 * @param {number} logicalW
 * @param {number} logicalH
 */
export function resizeCanvas(cv, logicalW, logicalH) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const scale = Math.min(window.innerWidth / logicalW, window.innerHeight / logicalH);
  cv.style.width = Math.floor(logicalW * scale) + 'px';
  cv.style.height = Math.floor(logicalH * scale) + 'px';
  cv.width = Math.floor(logicalW * dpr);
  cv.height = Math.floor(logicalH * dpr);
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  return { ctx, scale, dpr };
}

/**
 * Deep-ish equality for plain JSON-like structures used in maze tests.
 * @param {unknown} a
 * @param {unknown} b
 */
export function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a == null || b == null) return a === b;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === 'object') {
    if (typeof b !== 'object') return false;
    const ak = Object.keys(/** @type {object} */ (a)).sort();
    const bk = Object.keys(/** @type {object} */ (b)).sort();
    if (ak.length !== bk.length) return false;
    for (let i = 0; i < ak.length; i++) {
      if (ak[i] !== bk[i]) return false;
      if (!deepEqual(
        /** @type {Record<string, unknown>} */ (a)[ak[i]],
        /** @type {Record<string, unknown>} */ (b)[bk[i]],
      )) return false;
    }
    return true;
  }
  return false;
}
