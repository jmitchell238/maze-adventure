/**
 * Maze Adventure — composition root.
 */

import {
  GAME_NAME, GAME_VERSION, GAME_VERSION_LABEL, W, H,
} from '../config/index.js';
import { resizeCanvas } from '../core/math.js';
import { DIFFICULTY_IDS, getProfile } from '../domain/difficulty.js';
import { dateKey } from '../domain/modes.js';
import {
  ADVENTURE_STAGES, adventureStageCount, isAdventureComplete,
} from '../domain/adventure.js';
import { THEME_IDS, getTheme } from '../domain/themes.js';
import { CHARACTERS, getCharacter } from '../domain/characters.js';
import { GameSession } from '../world/GameSession.js';
import { createSaveStore } from '../adapters/save.js';
import { createAudio } from '../adapters/audio.js';
import { createInput } from '../adapters/input.js';
import { drawSession } from '../adapters/render/session.js';
import { burst, updateParticles, clearParticles } from '../adapters/particles.js';
import { createSpeech } from '../adapters/speech.js';

const HUB_URL = 'https://jmitchell238.github.io/arcade-hub/';

const cv = document.getElementById('cv');
const stage = document.getElementById('stage');

const saveStore = createSaveStore();
const audio = createAudio(() => saveStore.data.muted);
const speech = createSpeech(() => !!saveStore.data.voicePraise);
const session = new GameSession({ audio, save: saveStore });

let ctx = null;
let last = performance.now();
/** @type {'quick'|'daily'} */
let pendingMode = 'quick';

const input = createInput(stage, cv, {});

function setScreen(name) {
  document.querySelectorAll('.screen').forEach((el) => {
    el.classList.toggle('hidden', el.dataset.screen !== name);
  });
  document.querySelectorAll('.play-chrome').forEach((el) => {
    el.classList.toggle('hidden', name !== 'play' && name !== 'pause');
  });
  const pauseEl = document.getElementById('screenPause');
  if (pauseEl) pauseEl.classList.toggle('hidden', name !== 'pause');
}

function applyVersionLabels() {
  const full = `${GAME_NAME} ${GAME_VERSION_LABEL}`;
  for (const id of [
    'versionTag', 'versionMenu', 'versionDiff', 'versionWin',
    'versionPause', 'versionSettings', 'versionAdv', 'versionFp',
  ]) {
    const el = document.getElementById(id);
    if (el) el.textContent = full;
  }
}

function updateMenuStats() {
  const d = saveStore.data;
  const elGames = document.getElementById('statGames');
  const elAdv = document.getElementById('statAdv');
  const elStars = document.getElementById('statStars');
  if (elGames) elGames.textContent = String(d.gamesCompleted);
  if (elAdv) {
    const p = d.adventureProgress | 0;
    const n = adventureStageCount();
    elAdv.textContent = isAdventureComplete(p) ? '✓' : `${Math.min(p + 1, n)}/${n}`;
  }
  if (elStars) elStars.textContent = String(d.totalCollectibles);
  const muteBtn = document.getElementById('muteBtn');
  if (muteBtn) muteBtn.textContent = d.muted ? '🔇 Sound off' : '🔊 Sound on';
  const tip = document.getElementById('firstTip');
  if (tip) tip.classList.toggle('hidden', (d.gamesCompleted | 0) > 0);
  syncSettingsUI();
}

function syncSettingsUI() {
  const d = saveStore.data;
  document.querySelectorAll('[data-move-pref]').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-move-pref') === d.movementPref);
  });
  const rm = document.getElementById('chkReducedMotion');
  const hc = document.getElementById('chkHighContrast');
  const ss = document.getElementById('chkShowSeed');
  const vp = document.getElementById('chkVoicePraise');
  if (rm) rm.checked = !!d.reducedMotion;
  if (hc) hc.checked = !!d.highContrast;
  if (ss) ss.checked = !!d.showSeed;
  if (vp) vp.checked = !!d.voicePraise;
}

function showMenu() {
  session.goMenu();
  input.resetStick();
  clearParticles();
  updateMenuStats();
  setScreen('menu');
  if (window.__pendingReload) {
    window.__pendingReload = false;
    window.__reloaded = true;
    location.reload();
  }
}

function showDifficulty(mode = 'quick') {
  pendingMode = mode;
  session.openDifficulty();
  input.resetStick();
  const title = document.getElementById('diffTitle');
  const sub = document.getElementById('diffSub');
  if (title) title.textContent = mode === 'daily' ? 'Daily maze' : 'Quick maze';
  if (sub) {
    sub.textContent = mode === 'daily'
      ? `One maze for ${dateKey()} · offline`
      : 'Every maze is brand new';
  }
  refreshDailyBadges();
  setScreen('difficulty');
}

function showSettings() {
  session.openSettings();
  input.resetStick();
  syncSettingsUI();
  setScreen('settings');
}

function showAdventure() {
  session.openAdventure();
  input.resetStick();
  populateAdventure();
  setScreen('adventure');
}

function showFreePlay() {
  session.openFreePlay();
  input.resetStick();
  populateFreePlay();
  setScreen('freeplay');
}

function populateAdventure() {
  const list = document.getElementById('advList');
  const sub = document.getElementById('advSub');
  if (!list) return;
  const progress = saveStore.data.adventureProgress | 0;
  const complete = isAdventureComplete(progress);
  if (sub) {
    sub.textContent = complete
      ? 'Champion! Replay any stage'
      : `Stage ${Math.min(progress + 1, adventureStageCount())} of ${adventureStageCount()}`;
  }
  list.innerHTML = ADVENTURE_STAGES.map((s, i) => {
    const unlocked = i <= progress;
    const cleared = i < progress;
    const current = i === progress && !complete;
    const cls = [
      'adv-item',
      unlocked ? '' : 'locked',
      current ? 'current' : '',
    ].filter(Boolean).join(' ');
    const state = cleared ? '✓' : current ? '▶' : unlocked ? '' : '🔒';
    return `<button type="button" class="${cls}" data-adv-index="${i}" ${unlocked ? '' : 'disabled'}>
      <span class="adv-ico">${s.icon}</span>
      <span class="adv-meta">
        <strong>${s.order}. ${s.name}</strong>
        <small>${s.blurb}</small>
      </span>
      <span class="adv-state">${state}</span>
    </button>`;
  }).join('');

  const cont = document.getElementById('btnAdvContinue');
  if (cont) {
    cont.textContent = complete ? '▶  Replay finale' : '▶  Continue';
  }
}

function populateFreePlay() {
  const fp = saveStore.data.freePlay || {};
  const size = document.getElementById('fpSize');
  const collect = document.getElementById('fpCollect');
  const loops = document.getElementById('fpLoops');
  if (size) size.value = String(fp.size ?? 10);
  if (collect) collect.value = String(fp.collectibles ?? 3);
  if (loops) loops.value = String(Math.round((fp.loopChance ?? 0.1) * 100));
  syncFpLabels();
  document.getElementById('fpGuided').checked = !!fp.guided;
  document.getElementById('fpHints').checked = fp.hints !== false;
  document.getElementById('fpGlow').checked = !!fp.pathGlow;
  document.getElementById('fpTimer').checked = !!fp.timer;
  const fpGates = document.getElementById('fpGates');
  if (fpGates) fpGates.checked = !!fp.gates;
  document.getElementById('fpSeed').value = fp.seed || '';

  const unlockedThemes = new Set(saveStore.data.themesUnlocked || ['garden']);
  // Free play can use all known themes for parents (unlock gate only on locked chips dim)
  const themeRow = document.getElementById('fpThemes');
  themeRow.innerHTML = THEME_IDS.map((id) => {
    const t = getTheme(id);
    const locked = !unlockedThemes.has(id);
    return `<button type="button" class="mode-chip${fp.themeId === id ? ' active' : ''}${locked ? ' locked' : ''}"
      data-fp-theme="${id}" title="${locked ? 'Unlock in Adventure' : t.name}">${t.goalIcon} ${t.name.split(' ')[0]}</button>`;
  }).join('');

  const unlockedChars = new Set(saveStore.data.charactersUnlocked || ['explorer']);
  const charRow = document.getElementById('fpChars');
  charRow.innerHTML = Object.keys(CHARACTERS).map((id) => {
    const c = getCharacter(id);
    const locked = !unlockedChars.has(id);
    return `<button type="button" class="mode-chip${fp.characterId === id ? ' active' : ''}${locked ? ' locked' : ''}"
      data-fp-char="${id}">${c.emoji} ${c.name}</button>`;
  }).join('');
}

function syncFpLabels() {
  const size = document.getElementById('fpSize');
  const collect = document.getElementById('fpCollect');
  const loops = document.getElementById('fpLoops');
  const sv = document.getElementById('fpSizeVal');
  const cv = document.getElementById('fpCollectVal');
  const lv = document.getElementById('fpLoopsVal');
  if (sv && size) sv.textContent = size.value;
  if (cv && collect) cv.textContent = collect.value;
  if (lv && loops) lv.textContent = `${loops.value}%`;
}

function readFreePlayForm() {
  const themeBtn = document.querySelector('#fpThemes .mode-chip.active');
  const charBtn = document.querySelector('#fpChars .mode-chip.active');
  return {
    size: Number(document.getElementById('fpSize').value) || 10,
    collectibles: Number(document.getElementById('fpCollect').value) || 0,
    loopChance: (Number(document.getElementById('fpLoops').value) || 0) / 100,
    guided: document.getElementById('fpGuided').checked,
    hints: document.getElementById('fpHints').checked,
    pathGlow: document.getElementById('fpGlow').checked,
    timer: document.getElementById('fpTimer').checked,
    gates: !!document.getElementById('fpGates')?.checked,
    seed: document.getElementById('fpSeed').value.trim(),
    themeId: themeBtn?.getAttribute('data-fp-theme') || 'garden',
    characterId: charBtn?.getAttribute('data-fp-char') || 'explorer',
    baseDifficulty: Number(document.getElementById('fpSize').value) >= 16
      ? 'hard'
      : Number(document.getElementById('fpSize').value) >= 12
        ? 'medium'
        : 'easy',
    camera: Number(document.getElementById('fpSize').value) >= 14 ? 'follow' : 'full',
  };
}

function refreshDailyBadges() {
  const key = dateKey();
  document.querySelectorAll('[data-difficulty]').forEach((btn) => {
    const id = btn.getAttribute('data-difficulty');
    let badge = btn.querySelector('.daily-done');
    if (pendingMode === 'daily' && saveStore.isDailyComplete(id, key)) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'daily-done';
        badge.textContent = '✓';
        btn.appendChild(badge);
      }
    } else if (badge) {
      badge.remove();
    }
  });
}

function beginPlay() {
  input.resetStick();
  setScreen('play');
  const hint = document.getElementById('playHint');
  if (hint) {
    const ch = session.character();
    hint.textContent = session.movementMode === 'guided'
      ? `${ch.emoji} ${ch.goalHint} · drag the stick`
      : `${ch.emoji} ${ch.goalHint}`;
  }
}

function showPlay(difficultyId) {
  audio.ensure();
  clearParticles();
  if (pendingMode === 'daily') session.startDaily(difficultyId);
  else session.startQuick(difficultyId);
  beginPlay();
}

function showPause() {
  session.pause();
  const seedEl = document.getElementById('pauseSeed');
  if (seedEl) {
    if (session.showSeed || saveStore.data.showSeed) {
      seedEl.textContent = `seed: ${session.seed}`;
      seedEl.classList.remove('hidden');
    } else {
      seedEl.classList.add('hidden');
    }
  }
  setScreen('pause');
}

function showWin() {
  setScreen('win');
  const m = session.maze;
  const label = session.mode === 'adventure' && session.adventureStage
    ? session.adventureStage.name
    : getProfile(session.difficultyId).label;
  document.getElementById('winDiff').textContent = label;
  document.getElementById('winStars').textContent =
    `${session.collected.size}/${m ? m.collectibles.length : 0}`;
  document.getElementById('winTime').textContent = formatTime(session.elapsed);
  const praise = document.getElementById('winPraise');
  if (praise) {
    const lines = ['Great exploring!', 'You found it!', 'Amazing!', 'Super job!', 'Way to go!'];
    praise.textContent = lines[session.hintsUsed % lines.length];
  }
  const unlock = document.getElementById('winUnlock');
  if (unlock) {
    if (session.unlockBanner) {
      unlock.textContent = session.unlockBanner;
      unlock.classList.remove('hidden');
    } else {
      unlock.classList.add('hidden');
    }
  }
  const seedEl = document.getElementById('winSeed');
  const copyBtn = document.getElementById('btnCopySeed');
  if (seedEl) {
    if (session.showSeed || saveStore.data.showSeed) {
      seedEl.textContent = `seed: ${session.seed}`;
      seedEl.classList.remove('hidden');
      if (copyBtn) copyBtn.classList.remove('hidden');
    } else {
      seedEl.classList.add('hidden');
      if (copyBtn) copyBtn.classList.add('hidden');
    }
  }
  const next = document.getElementById('btnNext');
  if (next) {
    if (session.mode === 'adventure' && isAdventureComplete(saveStore.data.adventureProgress)) {
      next.textContent = '✓  Adventure done';
    } else if (session.mode === 'adventure') {
      next.textContent = '▶  Next stage';
    } else {
      next.textContent = '▶  Next maze';
    }
  }
  setTimeout(() => document.getElementById('btnNext')?.focus(), 50);
  speech.praiseWin();
  if (window.__pendingReload) {
    window.__pendingReload = false;
    window.__reloaded = true;
    location.reload();
  }
}

function formatTime(sec) {
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `${r}s`;
}

function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  if (!ctx) {
    ({ ctx } = resizeCanvas(cv, W, H));
  }

  const poll = input.poll();

  if (session.screen === 'play') {
    const ev = session.update(dt, poll);
    if (ev && ev.event === 'collect') {
      burst(ev.x, ev.y, session.theme.particleColors, session.reducedMotion ? 6 : 16);
    }
    if (session.justOpenedGate) {
      burst(session.player.x, session.player.y, session.theme.particleColors, 12);
    }
    if (ev && ev.event === 'win') {
      burst(ev.x, ev.y, session.theme.particleColors, session.reducedMotion ? 20 : 55);
      showWin();
    }
    if (session.screen === 'pause') setScreen('pause');
  } else if (session.screen === 'pause') {
    session.update(dt, poll);
    if (session.screen === 'play') setScreen('play');
  } else {
    session.time += dt;
  }

  updateParticles(dt);
  drawSession(ctx, session, poll);
  requestAnimationFrame(frame);
}

function onClick(e) {
  const t = e.target;
  if (!(t instanceof Element)) return;

  if (t.id === 'btnAdventure' || t.closest('#btnAdventure')) {
    audio.ensure();
    audio.click();
    showAdventure();
    return;
  }
  if (t.id === 'btnPlay' || t.closest('#btnPlay')) {
    audio.ensure();
    audio.click();
    showDifficulty('quick');
    return;
  }
  if (t.id === 'btnDaily' || t.closest('#btnDaily')) {
    audio.ensure();
    audio.click();
    showDifficulty('daily');
    return;
  }
  if (t.id === 'btnFreePlay' || t.closest('#btnFreePlay')) {
    audio.ensure();
    audio.click();
    showFreePlay();
    return;
  }
  if (t.id === 'btnSettings' || t.closest('#btnSettings')) {
    audio.click();
    showSettings();
    return;
  }
  if (t.id === 'btnHow' || t.closest('#btnHow')) {
    audio.click();
    document.getElementById('howPanel')?.classList.toggle('hidden');
    return;
  }
  if (t.id === 'muteBtn' || t.closest('#muteBtn')) {
    saveStore.setMuted(!saveStore.data.muted);
    updateMenuStats();
    audio.click();
    return;
  }
  if (t.id === 'btnHub' || t.closest('#btnHub')) {
    audio.click();
    window.location.href = HUB_URL;
    return;
  }
  if (t.id === 'btnDiffBack' || t.closest('#btnDiffBack') ||
      t.id === 'btnAdvBack' || t.closest('#btnAdvBack') ||
      t.id === 'btnFpBack' || t.closest('#btnFpBack') ||
      t.id === 'btnSettingsBack' || t.closest('#btnSettingsBack')) {
    audio.click();
    showMenu();
    return;
  }

  if (t.id === 'btnAdvContinue' || t.closest('#btnAdvContinue')) {
    audio.ensure();
    audio.click();
    clearParticles();
    const progress = saveStore.data.adventureProgress | 0;
    const idx = isAdventureComplete(progress)
      ? adventureStageCount() - 1
      : progress;
    session.startAdventure(idx);
    beginPlay();
    return;
  }

  const advItem = t.closest('[data-adv-index]');
  if (advItem && !advItem.disabled) {
    audio.ensure();
    audio.click();
    clearParticles();
    session.startAdventure(Number(advItem.getAttribute('data-adv-index')));
    beginPlay();
    return;
  }

  if (t.id === 'btnFpStart' || t.closest('#btnFpStart')) {
    audio.ensure();
    audio.click();
    clearParticles();
    const opts = readFreePlayForm();
    // Allow locked themes only if unlocked; else garden
    if (!(saveStore.data.themesUnlocked || []).includes(opts.themeId)) {
      opts.themeId = 'garden';
    }
    if (!(saveStore.data.charactersUnlocked || []).includes(opts.characterId)) {
      opts.characterId = 'explorer';
    }
    session.startFreePlay(opts);
    beginPlay();
    return;
  }

  const fpTheme = t.closest('[data-fp-theme]');
  if (fpTheme) {
    const id = fpTheme.getAttribute('data-fp-theme');
    if ((saveStore.data.themesUnlocked || []).includes(id) || !fpTheme.classList.contains('locked')) {
      // allow click on unlocked only
      if (!(saveStore.data.themesUnlocked || []).includes(id)) {
        audio.bump?.();
        return;
      }
      document.querySelectorAll('[data-fp-theme]').forEach((b) => b.classList.remove('active'));
      fpTheme.classList.add('active');
      audio.click();
    }
    return;
  }
  const fpChar = t.closest('[data-fp-char]');
  if (fpChar) {
    const id = fpChar.getAttribute('data-fp-char');
    if (!(saveStore.data.charactersUnlocked || []).includes(id)) {
      if (audio.bump) audio.bump();
      return;
    }
    document.querySelectorAll('[data-fp-char]').forEach((b) => b.classList.remove('active'));
    fpChar.classList.add('active');
    audio.click();
    return;
  }

  const movePref = t.closest('[data-move-pref]');
  if (movePref) {
    audio.click();
    saveStore.setMovementPref(movePref.getAttribute('data-move-pref'));
    syncSettingsUI();
    return;
  }

  const diffBtn = t.closest('[data-difficulty]');
  if (diffBtn) {
    audio.ensure();
    audio.click();
    showPlay(diffBtn.getAttribute('data-difficulty'));
    return;
  }

  if (t.id === 'btnPauseMenu' || t.closest('#btnPauseMenu')) {
    audio.click();
    showPause();
    return;
  }
  if (t.id === 'btnHint' || t.closest('#btnHint')) {
    audio.ensure();
    session.requestHint();
    return;
  }
  if (t.id === 'btnRestartPlay' || t.closest('#btnRestartPlay')) {
    audio.click();
    session.restart();
    beginPlay();
    return;
  }
  if (t.id === 'btnResume' || t.closest('#btnResume')) {
    audio.click();
    session.resume();
    setScreen('play');
    return;
  }
  if (t.id === 'btnPauseRestart' || t.closest('#btnPauseRestart')) {
    audio.click();
    session.restart();
    beginPlay();
    return;
  }
  if (t.id === 'btnPauseMenuHome' || t.closest('#btnPauseMenuHome')) {
    audio.click();
    showMenu();
    return;
  }
  if (t.id === 'btnNext' || t.closest('#btnNext')) {
    audio.ensure();
    audio.click();
    clearParticles();
    if (session.mode === 'adventure' && isAdventureComplete(saveStore.data.adventureProgress)) {
      showMenu();
      return;
    }
    session.nextMaze();
    if (session.screen === 'menu') {
      showMenu();
      return;
    }
    beginPlay();
    return;
  }
  if (t.id === 'btnReplay' || t.closest('#btnReplay')) {
    audio.click();
    clearParticles();
    session.restart();
    beginPlay();
    return;
  }
  if (t.id === 'btnMenuWin' || t.closest('#btnMenuWin')) {
    audio.click();
    showMenu();
    return;
  }
  if (t.id === 'btnHubWin' || t.closest('#btnHubWin')) {
    audio.click();
    window.location.href = HUB_URL;
    return;
  }
  if (t.id === 'btnCopySeed' || t.closest('#btnCopySeed')) {
    audio.click();
    const seed = session.seed || '';
    if (seed && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(seed).then(() => {
        const btn = document.getElementById('btnCopySeed');
        if (btn) {
          btn.textContent = '✓ Copied';
          setTimeout(() => { btn.textContent = '📋 Copy seed'; }, 1200);
        }
      }).catch(() => {});
    }
  }
}

function populateDifficulty() {
  const row = document.getElementById('diffRow');
  if (!row) return;
  const labels = {
    easy: { title: 'Easy', stars: '★', blurb: 'Ages 4–6', icon: '🌱' },
    medium: { title: 'Medium', stars: '★★', blurb: 'More twists', icon: '🌿' },
    hard: { title: 'Hard', stars: '★★★', blurb: 'Big maze', icon: '🏰' },
    'very-hard': { title: 'Very Hard', stars: '★★★★', blurb: 'Challenge', icon: '🚀' },
  };
  row.innerHTML = DIFFICULTY_IDS.map((id) => {
    const L = labels[id];
    return `<button type="button" class="diff-card" data-difficulty="${id}">
      <span class="diff-icon">${L.icon}</span>
      <span class="diff-stars">${L.stars}</span>
      <strong>${L.title}</strong>
      <small>${L.blurb}</small>
    </button>`;
  }).join('');
}

function safeReloadForUpdate() {
  if (window.__reloaded) return;
  if (session.screen === 'play' || session.screen === 'pause') {
    window.__pendingReload = true;
    return;
  }
  window.__reloaded = true;
  location.reload();
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (!(location.protocol === 'https:' || location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1')) return;

  navigator.serviceWorker.register('./sw.js').then((reg) => {
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) {
          w.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      safeReloadForUpdate();
    });
    const check = () => { reg.update().catch(() => {}); };
    check();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    setInterval(check, 60 * 1000);
  }).catch((err) => console.warn('[sw]', err));

  function checkRemoteVersion() {
    fetch('js/config/index.js', { cache: 'no-store' })
      .then((r) => (r.ok ? r.text() : ''))
      .then((text) => {
        const m = text.match(/GAME_VERSION\s*=\s*['"]([^'"]+)['"]/);
        if (m && m[1] && m[1] !== GAME_VERSION) safeReloadForUpdate();
      })
      .catch(() => {});
  }
  checkRemoteVersion();
  setInterval(checkRemoteVersion, 2 * 60 * 1000);
}

function onResize() {
  if (cv) ({ ctx } = resizeCanvas(cv, W, H));
}

function boot() {
  applyVersionLabels();
  populateDifficulty();
  updateMenuStats();
  document.addEventListener('click', onClick);
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t instanceof HTMLInputElement && (t.id === 'fpSize' || t.id === 'fpCollect' || t.id === 'fpLoops')) {
      syncFpLabels();
    }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (t.id === 'chkReducedMotion') saveStore.setReducedMotion(t.checked);
    if (t.id === 'chkHighContrast') saveStore.setHighContrast(t.checked);
    if (t.id === 'chkShowSeed') saveStore.setShowSeed(t.checked);
    if (t.id === 'chkVoicePraise') saveStore.setVoicePraise(t.checked);
  });
  window.addEventListener('resize', onResize);
  registerSW();
  showMenu();
  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
