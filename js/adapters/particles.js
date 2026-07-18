/** Lightweight particle system for collect / win juice. */

/**
 * @typedef {object} Particle
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 * @property {number} life
 * @property {number} maxLife
 * @property {string} color
 * @property {number} size
 */

/** @type {Particle[]} */
let particles = [];

const MAX = 120;

export function clearParticles() {
  particles = [];
}

/**
 * @param {number} x
 * @param {number} y
 * @param {string[]} colors
 * @param {number} [count=12]
 */
export function burst(x, y, colors, count = 12) {
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX) particles.shift();
    const ang = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 120;
    particles.push({
      x,
      y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - 30,
      life: 0.5 + Math.random() * 0.5,
      maxLife: 0.7,
      color: colors[i % colors.length],
      size: 2 + Math.random() * 3,
    });
  }
}

/**
 * @param {number} dt
 */
export function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 180 * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawParticles(ctx) {
  for (const p of particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function particleCount() {
  return particles.length;
}
