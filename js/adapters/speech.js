/**
 * Optional spoken praise via Web Speech API (child-friendly, off by default).
 */

/**
 * @param {() => boolean} getEnabled
 */
export function createSpeech(getEnabled) {
  /** @type {SpeechSynthesisUtterance | null} */
  let last = null;

  function supported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /**
   * @param {string} text
   */
  function speak(text) {
    if (!getEnabled || !getEnabled()) return;
    if (!supported()) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.pitch = 1.15;
      u.volume = 0.9;
      // Prefer a higher/friendly voice when available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v) =>
        /en(-|_)?(US|GB)?/i.test(v.lang) && /female|samantha|google us english/i.test(v.name)
      ) || voices.find((v) => /^en/i.test(v.lang));
      if (preferred) u.voice = preferred;
      last = u;
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  }

  function praiseWin() {
    const lines = [
      'You did it! Great job!',
      'Amazing! You found the way!',
      'Wonderful exploring!',
      'Super job! High five!',
      'You are a maze star!',
    ];
    const i = Math.floor(Math.random() * lines.length);
    speak(lines[i]);
  }

  function cancel() {
    if (!supported()) return;
    try { window.speechSynthesis.cancel(); } catch { /* */ }
  }

  return { speak, praiseWin, cancel, supported };
}
