/** Adapter: procedural Web Audio SFX. */

/**
 * @param {() => boolean} getMuted
 */
export function createAudio(getMuted) {
  let audioCtx = null;

  function ensure() {
    if (getMuted && getMuted()) return null;
    if (typeof window === 'undefined') return null;
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function beep({ freq = 440, dur = 0.08, type = 'sine', gain = 0.04, slide = 0 } = {}) {
    const ctx = ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  return {
    ensure,
    click() { beep({ freq: 520, dur: 0.04, type: 'square', gain: 0.02 }); },
    move() { beep({ freq: 380, dur: 0.03, type: 'sine', gain: 0.012, slide: 20 }); },
    bump() { beep({ freq: 160, dur: 0.05, type: 'triangle', gain: 0.018, slide: -20 }); },
    collect() {
      beep({ freq: 660, dur: 0.06, type: 'sine', gain: 0.03, slide: 120 });
      setTimeout(() => beep({ freq: 880, dur: 0.07, type: 'triangle', gain: 0.025 }), 50);
    },
    win() {
      beep({ freq: 440, dur: 0.1, type: 'sine', gain: 0.04, slide: 80 });
      setTimeout(() => beep({ freq: 554, dur: 0.1, type: 'sine', gain: 0.04 }), 90);
      setTimeout(() => beep({ freq: 659, dur: 0.16, type: 'sine', gain: 0.045, slide: 40 }), 180);
    },
    hint() { beep({ freq: 520, dur: 0.08, type: 'sine', gain: 0.03, slide: 100 }); },
  };
}

/** No-op audio for tests */
export function createSilentAudio() {
  const noop = () => {};
  return {
    ensure: noop,
    click: noop,
    move: noop,
    bump: noop,
    collect: noop,
    win: noop,
    hint: noop,
  };
}
