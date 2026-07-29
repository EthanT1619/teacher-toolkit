import { initI18n, setLocale, getLocale, t, applyToDOM } from '../shared/i18n.js';

const STORAGE_KEY = 'tongAjossiGame';

const state = {
  slotCount: 10,
  triggerIndex: -1,
  used: new Set(),
  gameOver: false,
  soundEnabled: true,
  animating: false,
  statusKind: 'idle',
  statusIndex: 0,
  statusRemaining: 0,
};

const els = {};

let toastTimer = null;
let audioCtx = null;

function updatePageTitle() {
  document.title = t('tool.barrel-game.title');
}

function updateLanguageButton() {
  if (!els.btnLanguage) return;
  els.btnLanguage.textContent =
    getLocale() === 'en'
      ? t('tool.barrel-game.actions.switchToKo')
      : t('tool.barrel-game.actions.switchToEn');
}

function renderStatus() {
  if (state.gameOver) {
    els.statusText.textContent = t('tool.barrel-game.status.pirateAppears', {
      n: state.statusIndex + 1,
    });
    return;
  }

  if (state.statusKind === 'safe') {
    els.statusText.textContent = t('tool.barrel-game.status.safe', {
      n: state.statusIndex + 1,
      remaining: state.statusRemaining,
    });
    return;
  }

  els.statusText.textContent = t('tool.barrel-game.status.pickSword');
}

function refreshI18nUI() {
  applyToDOM();
  updatePageTitle();
  updateLanguageButton();
  renderSwords();
  updateBoards();
  renderStatus();
}

function getSlotPositions(count) {
  const positions = [];
  const cx = 50;
  const cy = 55;
  const rx = 46;
  const ry = 38;
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    positions.push({
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
      angleDeg: (angle * 180) / Math.PI + 90,
    });
  }
  return positions;
}

function swordSvg() {
  return `<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
      <rect x="27" y="10" width="6" height="30" rx="2" fill="#c0c0c0"/>
      <rect x="22" y="38" width="16" height="5" rx="1" fill="#ffd700"/>
      <rect x="28" y="42" width="4" height="28" rx="1" fill="#8b6914"/>
      <polygon points="30,70 26,80 34,80" fill="#6b5010"/>
      <ellipse cx="30" cy="8" rx="8" ry="4" fill="#d0d0d0"/>
    </svg>`;
}

function save() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      slotCount: state.slotCount,
      soundEnabled: state.soundEnabled,
    })
  );
}

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (data.slotCount) {
      state.slotCount = data.slotCount;
      els.slotCount.value = data.slotCount;
    }
    if (typeof data.soundEnabled === 'boolean') {
      state.soundEnabled = data.soundEnabled;
      els.soundEnabled.checked = data.soundEnabled;
    }
  } catch {
    /* ignore */
  }
}

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2500);
}

function playSound(type) {
  if (!state.soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'insert') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'pop') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.5);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
      osc.start(now);
      osc.stop(now + 0.55);
    }
  } catch {
    /* ignore */
  }
}

function renderSwords() {
  const usedIndices = [...state.used];
  els.swordRow.innerHTML = Array.from({ length: state.slotCount }, (_, i) => {
    const label = t('tool.barrel-game.aria.sword', { n: i + 1 });
    return `
      <button class="sword-btn" data-index="${i}" aria-label="${label}">
        <span class="sword-num">${i + 1}</span>
        ${swordSvg()}
      </button>
    `;
  }).join('');

  usedIndices.forEach((index) => {
    const btn = els.swordRow.querySelector(`[data-index="${index}"]`);
    if (btn) {
      btn.classList.add('used');
      btn.disabled = true;
    }
  });
}

function renderBarrelSlots() {
  const positions = getSlotPositions(state.slotCount);
  els.barrelSlots.innerHTML = positions
    .map(
      (pos, i) =>
        `<div class="slot-marker" data-slot="${i}" style="left:${pos.x}%;top:${pos.y}%;"></div>`
    )
    .join('');
}

function updateBoards() {
  const safe = state.used.size;
  const total = state.slotCount;
  els.safeBoard.textContent = state.gameOver
    ? t('tool.barrel-game.status.safeBoardTotal', { safe })
    : t('tool.barrel-game.status.safeBoardProgress', { safe, total: total - 1 });
  els.safeList.innerHTML = [...state.used]
    .filter((i) => i !== state.triggerIndex)
    .sort((a, b) => a - b)
    .map((i) => `<span class="safe-chip">${i + 1}</span>`)
    .join('');
  els.bombBoard.textContent = state.gameOver
    ? t('tool.barrel-game.status.bombReveal', { n: state.triggerIndex + 1 })
    : '???';
}

function resetPirate() {
  els.pirateWrap.classList.remove('pop');
  void els.pirateWrap.offsetWidth;
}

function newRound() {
  state.triggerIndex = Math.floor(Math.random() * state.slotCount);
  state.used = new Set();
  state.gameOver = false;
  state.animating = false;
  state.statusKind = 'idle';

  resetPirate();
  renderSwords();
  renderBarrelSlots();
  els.nextBtn.classList.remove('visible');
  updateBoards();
  renderStatus();
}

function startGame() {
  state.slotCount = Math.min(12, Math.max(4, parseInt(els.slotCount.value, 10) || 10));
  state.soundEnabled = els.soundEnabled.checked;
  save();

  els.setupView.classList.remove('active');
  els.playView.classList.add('active');
  newRound();
  showToast(t('tool.barrel-game.toast.startHint'));
}

function insertSwordAtSlot(index) {
  const positions = getSlotPositions(state.slotCount);
  const pos = positions[index];
  const marker = els.barrelSlots.querySelector(`[data-slot="${index}"]`);
  if (!marker) return;

  marker.classList.add('filled');
  const sword = document.createElement('div');
  sword.className = 'inserted-sword';
  sword.style.cssText = `left:${pos.x}%;top:${pos.y}%;--angle:${pos.angleDeg}deg;`;
  sword.innerHTML = swordSvg();
  els.barrelSlots.appendChild(sword);
}

function flySword(fromBtn, index, callback) {
  const positions = getSlotPositions(state.slotCount);
  const pos = positions[index];
  const barrelRect = document.getElementById('barrelWrap').getBoundingClientRect();
  const targetX = barrelRect.left + (barrelRect.width * pos.x) / 100;
  const targetY = barrelRect.top + (barrelRect.height * pos.y) / 100;

  const btnRect = fromBtn.getBoundingClientRect();
  const flyer = document.createElement('div');
  flyer.className = 'flying-sword';
  flyer.innerHTML = swordSvg();
  flyer.style.left = `${btnRect.left + btnRect.width / 2 - 20}px`;
  flyer.style.top = `${btnRect.top + btnRect.height / 2 - 30}px`;
  document.body.appendChild(flyer);

  requestAnimationFrame(() => {
    flyer.style.left = `${targetX - 20}px`;
    flyer.style.top = `${targetY - 30}px`;
    flyer.style.transform = `rotate(${pos.angleDeg}deg)`;
  });

  setTimeout(() => {
    flyer.remove();
    callback();
  }, 480);
}

function pickSword(index) {
  if (state.gameOver || state.animating || state.used.has(index)) return;

  const btn = els.swordRow.querySelector(`[data-index="${index}"]`);
  if (!btn) return;

  state.animating = true;
  btn.classList.add('used');
  btn.disabled = true;

  flySword(btn, index, () => {
    state.used.add(index);
    insertSwordAtSlot(index);
    playSound('insert');

    const isTrigger = index === state.triggerIndex;

    if (isTrigger) {
      state.gameOver = true;
      state.statusKind = 'pirate';
      state.statusIndex = index;
      renderStatus();
      setTimeout(() => {
        playSound('pop');
        els.pirateWrap.classList.add('pop');
        document.body.classList.add('shake');
        if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 150]);
        setTimeout(() => document.body.classList.remove('shake'), 500);
        els.nextBtn.classList.add('visible');
        updateBoards();
        renderStatus();
      }, 200);
    } else {
      state.statusKind = 'safe';
      state.statusIndex = index;
      state.statusRemaining = state.slotCount - state.used.size;
      updateBoards();
      renderStatus();
    }

    state.animating = false;
  });
}

function cacheElements() {
  els.setupView = document.getElementById('setupView');
  els.playView = document.getElementById('playView');
  els.slotCount = document.getElementById('slotCount');
  els.soundEnabled = document.getElementById('soundEnabled');
  els.startBtn = document.getElementById('startBtn');
  els.backBtn = document.getElementById('backBtn');
  els.resetBtn = document.getElementById('resetBtn');
  els.statusText = document.getElementById('statusText');
  els.swordRow = document.getElementById('swordRow');
  els.barrelSlots = document.getElementById('barrelSlots');
  els.pirateWrap = document.getElementById('pirateWrap');
  els.bombBoard = document.getElementById('bombBoard');
  els.safeBoard = document.getElementById('safeBoard');
  els.safeList = document.getElementById('safeList');
  els.nextBtn = document.getElementById('nextBtn');
  els.toast = document.getElementById('toast');
  els.btnLanguage = document.getElementById('btn-language');
}

function bindEvents() {
  els.startBtn.addEventListener('click', startGame);
  els.backBtn.addEventListener('click', () => {
    els.playView.classList.remove('active');
    els.setupView.classList.add('active');
  });
  els.resetBtn.addEventListener('click', () => {
    newRound();
    showToast(t('tool.barrel-game.toast.reshuffled'));
  });
  els.nextBtn.addEventListener('click', () => {
    newRound();
    showToast(t('tool.barrel-game.toast.newRound'));
  });

  els.btnLanguage.addEventListener('click', async () => {
    try {
      await setLocale(getLocale() === 'en' ? 'ko' : 'en');
    } catch (error) {
      console.error('Locale switch failed:', error);
    }
  });

  els.swordRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.sword-btn');
    if (!btn || btn.disabled) return;
    pickSword(Number(btn.dataset.index));
  });

  document.addEventListener('keydown', (e) => {
    if (!els.playView.classList.contains('active')) return;
    if (e.key === 'Escape') {
      els.playView.classList.remove('active');
      els.setupView.classList.add('active');
    }
    if ((e.key === 'r' || e.key === 'R') && !state.animating) {
      newRound();
      showToast(t('tool.barrel-game.toast.reshuffled'));
    }
    if (e.key === 'Enter' && state.gameOver) newRound();
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= state.slotCount) pickSword(num - 1);
  });

  window.addEventListener('toolkit:localechange', refreshI18nUI);
}

async function boot() {
  cacheElements();
  await initI18n({ applyDom: true });
  updatePageTitle();
  updateLanguageButton();
  bindEvents();
  load();
}

boot();
