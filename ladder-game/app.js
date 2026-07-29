import { initI18n, setLocale, getLocale, t, applyToDOM } from '../shared/i18n.js';

window.lgT = (k, p) => t('tool.ladder-game.' + k, p);

const setupView = document.getElementById('setupView');
const playView = document.getElementById('playView');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const messageEl = document.getElementById('message');
const btnLanguage = document.getElementById('btn-language');

const complexityPicker = document.getElementById('complexityPicker');
const resultsEl = document.getElementById('results');
const countEl = document.getElementById('count');
const presetSelect = document.getElementById('presetSelect');
const loadPresetBtn = document.getElementById('loadPresetBtn');
const presetNameInput = document.getElementById('presetNameInput');
const savePresetBtn = document.getElementById('savePresetBtn');
const deletePresetBtn = document.getElementById('deletePresetBtn');
const toastEl = document.getElementById('toast');

const STORAGE_KEY = 'ladderGame';
let presets = [];
let toastTimer = null;

let game = null;
let rawItems = [];
let complexity = 3;
let isCovered = true;
let pathAnimation = null;
let animatingStartIndex = null;
let lastResult = null;

const canvasStage = document.getElementById('canvasStage');
const ladderCover = document.getElementById('ladderCover');

function updatePageTitle() {
  document.title = lgT('title');
}

function updateLanguageButton() {
  if (!btnLanguage) return;
  btnLanguage.textContent =
    getLocale() === 'en' ? lgT('actions.switchToKo') : lgT('actions.switchToEn');
}

function updatePlayMessage() {
  if (!playView.classList.contains('view--active')) return;

  if (animatingStartIndex !== null && game) {
    messageEl.textContent = lgT('play.tracingPath', { number: game.labels[animatingStartIndex] });
  } else if (lastResult && game) {
    renderResultMessage();
  } else if (isCovered) {
    messageEl.textContent = lgT('play.clickCoverToReveal');
  } else {
    messageEl.textContent = lgT('play.clickTopNumber');
  }
}

function renderResultMessage() {
  const { startIndex, endIndex } = lastResult;
  messageEl.textContent = lgT('play.resultLine', {
    number: game.labels[startIndex],
    result: game.results[endIndex],
  });
}

function refreshI18nUI() {
  applyToDOM();
  updatePageTitle();
  updateLanguageButton();
  renderPresetSelect();
  updatePlayMessage();
}

function getPlayViewport() {
  return {
    width: window.innerWidth,
    height: window.innerHeight - 56,
  };
}

function fitCanvasDisplay() {
  if (!game) return;
  const maxW = window.innerWidth * 0.98;
  const maxH = window.innerHeight - 56;
  const scale = Math.min(maxW / game.canvasWidth, maxH / game.canvasHeight);
  const w = Math.round(game.canvasWidth * scale);
  const h = Math.round(game.canvasHeight * scale);
  canvasStage.style.width = `${w}px`;
  canvasStage.style.height = `${h}px`;
  updateCoverLayout();
}

function stopPathAnimation() {
  if (pathAnimation) {
    pathAnimation.cancel();
    pathAnimation = null;
  }
  animatingStartIndex = null;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function setComplexity(level) {
  complexity = level;
  complexityPicker.querySelectorAll('.complexity-btn').forEach((b) => {
    b.classList.toggle('complexity-btn--active', parseInt(b.dataset.level, 10) === level);
  });
}

function updateCountFromResults() {
  const n = resultsEl.value.trim().split('\n').filter(Boolean).length;
  countEl.value = n >= 2 ? n : 4;
}

function saveDraft() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      resultsText: resultsEl.value,
      complexity,
      presets,
    }),
  );
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.resultsText === 'string') resultsEl.value = data.resultsText;
    if (typeof data.complexity === 'number') setComplexity(data.complexity);
    if (Array.isArray(data.presets)) presets = data.presets;
    updateCountFromResults();
  } catch (_) {
    /* ignore */
  }
}

function renderPresetSelect() {
  const selected = presetSelect.value;
  presetSelect.innerHTML =
    `<option value="">${lgT('presets.selectPlaceholder')}</option>` +
    presets.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  if (selected && presets.some((p) => p.id === selected)) {
    presetSelect.value = selected;
  }
  const has = !!presetSelect.value;
  loadPresetBtn.disabled = !has;
  deletePresetBtn.disabled = !has;
}

function savePreset() {
  const name = presetNameInput.value.trim();
  const results = resultsEl.value
    .trim()
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!name) {
    showToast(lgT('toast.enterPresetName'));
    return;
  }
  if (results.length < 2) {
    showToast(lgT('toast.minTwoResults'));
    return;
  }

  const existing = presets.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    existing.results = results;
    existing.complexity = complexity;
    presetSelect.value = existing.id;
    showToast(lgT('toast.presetUpdated', { name }));
  } else {
    const preset = { id: generateId(), name, results, complexity };
    presets.push(preset);
    presetSelect.value = preset.id;
    showToast(lgT('toast.presetSaved', { name }));
  }

  renderPresetSelect();
  saveDraft();
}

function loadPreset() {
  const id = presetSelect.value;
  if (!id) return;
  const preset = presets.find((p) => p.id === id);
  if (!preset) return;

  resultsEl.value = preset.results.join('\n');
  setComplexity(preset.complexity);
  presetNameInput.value = preset.name;
  updateCountFromResults();
  saveDraft();
  showToast(lgT('toast.presetLoaded', { name: preset.name }));
}

function deletePreset() {
  const id = presetSelect.value;
  if (!id) return;
  const preset = presets.find((p) => p.id === id);
  if (!preset || !confirm(lgT('confirm.deletePreset', { name: preset.name }))) return;

  presets = presets.filter((p) => p.id !== id);
  presetSelect.value = '';
  presetNameInput.value = '';
  renderPresetSelect();
  saveDraft();
  showToast(lgT('toast.presetDeleted'));
}

complexityPicker.addEventListener('click', (e) => {
  const btn = e.target.closest('.complexity-btn');
  if (!btn) return;
  setComplexity(parseInt(btn.dataset.level, 10));
  saveDraft();
});

resultsEl.addEventListener('input', () => {
  updateCountFromResults();
  saveDraft();
});

presetSelect.addEventListener('change', () => {
  const has = !!presetSelect.value;
  loadPresetBtn.disabled = !has;
  deletePresetBtn.disabled = !has;
  if (presetSelect.value) {
    const preset = presets.find((p) => p.id === presetSelect.value);
    if (preset) presetNameInput.value = preset.name;
  }
});

loadPresetBtn.addEventListener('click', loadPreset);
savePresetBtn.addEventListener('click', savePreset);
deletePresetBtn.addEventListener('click', deletePreset);

function showView(name) {
  setupView.classList.toggle('view--active', name === 'setup');
  playView.classList.toggle('view--active', name === 'play');
}

function updateCoverLayout() {
  if (!game) return;
  const topPct = (game.topY / game.canvasHeight) * 100;
  const heightPct = ((game.bottomY - game.topY) / game.canvasHeight) * 100;
  ladderCover.style.top = `${topPct}%`;
  ladderCover.style.height = `${heightPct}%`;
}

function setCovered(covered) {
  isCovered = covered;
  ladderCover.classList.toggle('ladder-cover--hidden', !covered);
  canvas.classList.toggle('canvas--covered', covered);
  if (covered) lastResult = null;
  updatePlayMessage();
}

function revealLadder() {
  setCovered(false);
  renderLadder();
}

function startGame() {
  rawItems = resultsEl.value
    .trim()
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  if (rawItems.length < 2) {
    alert(lgT('alert.minTwoResults'));
    return;
  }

  game = LadderGame.createGame(rawItems, complexity, getPlayViewport());
  lastResult = null;
  renderLadder();
  setCovered(true);
  showView('play');
  requestAnimationFrame(fitCanvasDisplay);
}

function renderLadder() {
  canvas.width = game.canvasWidth;
  canvas.height = game.canvasHeight;
  LadderGame.drawLadder(ctx, game);
  fitCanvasDisplay();
}

function playPathAnimation(startIndex) {
  stopPathAnimation();
  lastResult = null;
  animatingStartIndex = startIndex;
  updatePlayMessage();

  pathAnimation = LadderGame.animateTrace(ctx, game, startIndex, {
    onComplete(endIndex) {
      pathAnimation = null;
      animatingStartIndex = null;
      lastResult = { startIndex, endIndex };
      renderResultMessage();
    },
  });
  pathAnimation.start();
}

ladderCover.addEventListener('click', () => {
  if (!game || !isCovered) return;
  revealLadder();
});

document.getElementById('startBtn').addEventListener('click', startGame);

document.getElementById('resetBtn').addEventListener('click', () => {
  resultsEl.value = '';
  setComplexity(3);
  updateCountFromResults();
  presetSelect.value = '';
  presetNameInput.value = '';
  renderPresetSelect();
  saveDraft();
});

document.getElementById('backBtn').addEventListener('click', () => {
  stopPathAnimation();
  lastResult = null;
  showView('setup');
});

function startNewRound() {
  if (!rawItems.length) return;
  stopPathAnimation();
  lastResult = null;
  game = LadderGame.createGame(rawItems, complexity, getPlayViewport());
  setCovered(true);
  renderLadder();
}

document.getElementById('regenerateBtn').addEventListener('click', startNewRound);

document.addEventListener('keydown', (e) => {
  if (!playView.classList.contains('view--active')) return;
  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    startNewRound();
  }
});

canvas.addEventListener('click', (e) => {
  if (!game || isCovered || pathAnimation) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const clickX = (e.clientX - rect.left) * scaleX;

  let closest = 0;
  let minDist = Infinity;
  for (let i = 0; i < game.lineXs.length; i++) {
    const dist = Math.abs(clickX - game.lineXs[i]);
    if (dist < minDist) {
      minDist = dist;
      closest = i;
    }
  }

  if (minDist > LadderGame.perColumnWidth(game.lineXs) / 2) return;

  playPathAnimation(closest);
});

window.addEventListener('resize', fitCanvasDisplay);

async function boot() {
  await initI18n({ applyDom: true });
  updatePageTitle();
  updateLanguageButton();
  loadDraft();
  renderPresetSelect();

  btnLanguage.addEventListener('click', async () => {
    try {
      await setLocale(getLocale() === 'en' ? 'ko' : 'en');
    } catch (error) {
      console.error('Locale switch failed:', error);
    }
  });

  window.addEventListener('toolkit:localechange', refreshI18nUI);
}

boot();
