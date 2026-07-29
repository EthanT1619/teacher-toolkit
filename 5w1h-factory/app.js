import { initI18n, setLocale, getLocale, t, applyToDOM } from '../shared/i18n.js';

const STORAGE_KEY = '5w1h-factory-settings';
const VALID_CATEGORIES = ['Who', 'What', 'When', 'Where', 'Why', 'How'];

const SAMPLE_TEXT = `Who: The girl is reading a book.
What: I want to eat pizza.
When: We have English class on Monday.
Where: They play soccer at the park.
Why: He is happy because he got a gift.
How: She goes to school by bus.
Who: My father cooks dinner.
What: Tom bought a new pencil.
When: I wake up at seven.
Where: The cat is under the table.
Why: She studies hard because she wants a good score.
How: He opened the box with a key.`;

const state = {
  questions: [],
  currentIndex: 0,
  score: 0,
  correctCount: 0,
  currentCard: null,
  isDragging: false,
  selectedMode: 'setup',
};

let dragOffsetX = 0;
let dragOffsetY = 0;
let activePointerId = null;
let toastTimer = null;
let processingDrop = false;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {};

function updatePageTitle() {
  document.title = t('tool.5w1h-factory.title');
}

function updateLanguageButton() {
  if (!els.btnLanguage) return;
  els.btnLanguage.textContent =
    getLocale() === 'en'
      ? t('tool.5w1h-factory.actions.switchToKo')
      : t('tool.5w1h-factory.actions.switchToEn');
}

function updateFullscreenLabel() {
  if (!els.btnFullscreen) return;
  els.btnFullscreen.textContent = document.fullscreenElement
    ? t('tool.5w1h-factory.actions.exitFullscreen')
    : t('tool.5w1h-factory.actions.fullscreen');
}

function updateSetupHintHtml() {
  if (!els.setupHint) return;
  els.setupHint.innerHTML = t('tool.5w1h-factory.setup.hintHtml');
}

function render() {
  updateHeader();
  updateFullscreenLabel();

  if (state.selectedMode === 'result') {
    renderResult();
  }
}

function refreshI18nUI() {
  applyToDOM();
  updatePageTitle();
  updateLanguageButton();
  updateSetupHintHtml();
  render();
}

function cacheElements() {
  els.setupView = $('#setup-view');
  els.gameView = $('#game-view');
  els.resultView = $('#result-view');
  els.questionsInput = $('#questions-input');
  els.parseError = $('#parse-error');
  els.setupHint = $('#setup-hint');
  els.scoreDisplay = $('#score-display');
  els.cardsDisplay = $('#cards-display');
  els.sentenceCard = $('#sentence-card');
  els.cardSlot = $('#card-slot');
  els.dropZones = $('#drop-zones');
  els.toast = $('#toast');
  els.finalScore = $('#final-score');
  els.finalDetail = $('#final-detail');
  els.resultHeading = $('#result-heading');
  els.btnLanguage = $('#btn-language');
  els.btnFullscreen = $('#btn-fullscreen');
  els.btnReset = $('#btn-reset');
  els.btnLoadSample = $('#btn-load-sample');
  els.btnStart = $('#btn-start');
  els.btnRestart = $('#btn-restart');
  els.btnBackSetup = $('#btn-back-setup');
}

function bindEvents() {
  els.btnLoadSample.addEventListener('click', loadSample);
  els.btnStart.addEventListener('click', startGame);
  els.btnFullscreen.addEventListener('click', toggleFullscreen);
  els.btnReset.addEventListener('click', resetGame);
  els.btnRestart.addEventListener('click', function () {
    startGame();
  });
  els.btnBackSetup.addEventListener('click', function () {
    showView('setup');
    state.selectedMode = 'setup';
    render();
  });

  els.btnLanguage.addEventListener('click', async function () {
    try {
      await setLocale(getLocale() === 'en' ? 'ko' : 'en');
    } catch (error) {
      console.error('Locale switch failed:', error);
    }
  });

  els.questionsInput.addEventListener('input', function () {
    saveSettings();
    els.parseError.textContent = '';
  });

  document.addEventListener('fullscreenchange', function () {
    updateFullscreenLabel();
  });

  window.addEventListener('toolkit:localechange', refreshI18nUI);
  setupDrag();
}

function parseQuestions(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const questions = [];

  for (let i = 0; i < lines.length; i++) {
    const parsed = parseQuestionLine(lines[i]);
    if (!parsed) {
      return {
        error: t('tool.5w1h-factory.parse.lineFormat', { line: i + 1 }),
        questions: [],
      };
    }
    const { category, sentence } = parsed;
    if (!VALID_CATEGORIES.includes(category)) {
      return {
        error: t('tool.5w1h-factory.parse.invalidCategory', {
          line: i + 1,
          category: category,
        }),
        questions: [],
      };
    }
    if (!sentence) {
      return {
        error: t('tool.5w1h-factory.parse.emptySentence', { line: i + 1 }),
        questions: [],
      };
    }
    questions.push({ category, sentence });
  }

  if (questions.length === 0) {
    return {
      error: t('tool.5w1h-factory.parse.noQuestions'),
      questions: [],
    };
  }

  return { error: null, questions };
}

function parseQuestionLine(line) {
  const match = line.match(/^(Who|What|When|Where|Why|How)\s*(?:[:：]|\||\t)\s*(.+)$/i);
  if (!match) return null;
  const raw = match[1].toLowerCase();
  const category = raw.charAt(0).toUpperCase() + raw.slice(1);
  return { category, sentence: match[2].trim() };
}

function getDropBoxAt(x, y) {
  const boxes = els.dropZones.querySelectorAll('.drop-box');
  for (const box of boxes) {
    const r = box.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
      return box;
    }
  }
  return null;
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, els.questionsInput.value);
}

function loadSettings() {
  const saved = localStorage.getItem(STORAGE_KEY);
  els.questionsInput.value = saved !== null ? saved : '';
}

function loadSample() {
  els.questionsInput.value = SAMPLE_TEXT;
  saveSettings();
  els.parseError.textContent = '';
}

function showView(mode) {
  state.selectedMode = mode;
  els.setupView.classList.toggle('active', mode === 'setup');
  els.gameView.classList.toggle('active', mode === 'game');
  els.resultView.classList.toggle('active', mode === 'result');
}

function updateHeader() {
  els.scoreDisplay.textContent = state.score;
  const remaining = state.questions.length
    ? Math.max(0, state.questions.length - state.currentIndex)
    : 0;
  els.cardsDisplay.textContent =
    state.selectedMode === 'game' ? remaining : state.questions.length || 0;
}

function startGame() {
  saveSettings();
  const { error, questions } = parseQuestions(els.questionsInput.value);
  if (error) {
    els.parseError.textContent = error;
    return;
  }

  els.parseError.textContent = '';
  state.questions = questions;
  state.currentIndex = 0;
  state.score = 0;
  state.correctCount = 0;
  state.currentCard = null;
  state.isDragging = false;
  processingDrop = false;

  showView('game');
  renderGame();
}

function renderGame() {
  updateHeader();
  showCurrentCard();
}

function showCurrentCard() {
  const card = els.sentenceCard;
  resetCardStyles();

  if (state.currentIndex >= state.questions.length) {
    showResult();
    return;
  }

  const q = state.questions[state.currentIndex];
  state.currentCard = q;
  card.textContent = q.sentence;
  card.classList.remove('hidden');
  card.classList.add('on-belt');
  updateHeader();
}

function resetCardStyles() {
  const card = els.sentenceCard;
  card.className = 'sentence-card on-belt hidden';
  card.style.position = '';
  card.style.left = '';
  card.style.top = '';
  card.style.width = '';
  card.style.transform = '';
  card.style.transition = '';
  card.style.opacity = '';
  card.style.zIndex = '';
}

function setupDrag() {
  const card = els.sentenceCard;

  card.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);
}

function onPointerDown(e) {
  if (state.selectedMode !== 'game' || processingDrop) return;
  if (state.currentIndex >= state.questions.length) return;
  if (els.sentenceCard.classList.contains('hidden')) return;

  e.preventDefault();
  const card = els.sentenceCard;
  const rect = card.getBoundingClientRect();

  activePointerId = e.pointerId;
  state.isDragging = true;
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;

  card.setPointerCapture(e.pointerId);
  card.classList.add('dragging');
  card.classList.remove('on-belt', 'shaking', 'returning', 'absorbing');

  card.style.position = 'fixed';
  card.style.width = rect.width + 'px';
  card.style.left = rect.left + 'px';
  card.style.top = rect.top + 'px';
  card.style.transform = 'none';
  card.style.zIndex = '1000';
}

function onPointerMove(e) {
  if (!state.isDragging || e.pointerId !== activePointerId) return;

  const card = els.sentenceCard;
  card.style.left = e.clientX - dragOffsetX + 'px';
  card.style.top = e.clientY - dragOffsetY + 'px';

  highlightDropZone(e.clientX, e.clientY);
}

function onPointerUp(e) {
  if (!state.isDragging || e.pointerId !== activePointerId) return;

  state.isDragging = false;
  activePointerId = null;

  const card = els.sentenceCard;
  try {
    card.releasePointerCapture(e.pointerId);
  } catch (_error) {}

  clearDropHighlights();

  const box = getDropBoxAt(e.clientX, e.clientY);

  if (box) {
    handleDrop(box.dataset.category, box);
  } else {
    returnCardToBelt();
  }

  card.classList.remove('dragging');
}

function highlightDropZone(x, y) {
  clearDropHighlights();
  const box = getDropBoxAt(x, y);
  if (box) box.classList.add('drop-hover');
}

function clearDropHighlights() {
  $$('.drop-box').forEach((b) => b.classList.remove('drop-hover'));
}

function returnCardToBelt() {
  const card = els.sentenceCard;
  card.classList.add('returning');
  card.style.position = '';
  card.style.left = '';
  card.style.top = '';
  card.style.width = '';
  card.style.transform = '';
  card.style.zIndex = '';

  setTimeout(function () {
    card.classList.remove('returning');
    card.classList.add('on-belt');
  }, 400);
}

function handleDrop(category, boxEl) {
  if (processingDrop || !state.currentCard) return;

  if (category === state.currentCard.category) {
    handleCorrect(boxEl);
  } else {
    handleWrong();
  }
}

function handleCorrect(boxEl) {
  processingDrop = true;
  state.score += 10;
  state.correctCount += 1;
  updateHeader();
  showToast(t('tool.5w1h-factory.toast.correct'), 'correct');

  boxEl.classList.add('correct-flash');
  setTimeout(function () {
    boxEl.classList.remove('correct-flash');
  }, 500);

  const card = els.sentenceCard;
  const cardRect = card.getBoundingClientRect();
  const boxRect = boxEl.getBoundingClientRect();
  const dx = boxRect.left + boxRect.width / 2 - (cardRect.left + cardRect.width / 2);
  const dy = boxRect.top + boxRect.height / 2 - (cardRect.top + cardRect.height / 2);

  card.classList.add('absorbing');
  card.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) scale(0.15)';
  card.style.opacity = '0';

  setTimeout(function () {
    nextQuestion();
    processingDrop = false;
  }, 580);
}

function handleWrong() {
  state.score -= 5;
  updateHeader();
  showToast(t('tool.5w1h-factory.toast.tryAgain'), 'wrong');

  const card = els.sentenceCard;
  card.style.position = '';
  card.style.left = '';
  card.style.top = '';
  card.style.width = '';
  card.style.zIndex = '';
  card.style.transform = '';
  card.style.transition = '';
  card.style.opacity = '';
  card.classList.remove('dragging', 'absorbing', 'returning');
  card.classList.add('shaking', 'on-belt');

  setTimeout(function () {
    card.classList.remove('shaking');
  }, 560);
}

function nextQuestion() {
  state.currentIndex += 1;
  state.currentCard = null;

  if (state.currentIndex >= state.questions.length) {
    showResult();
  } else {
    showCurrentCard();
  }
}

function renderResult() {
  els.finalScore.textContent = state.score;
  els.finalDetail.textContent = t('tool.5w1h-factory.result.detail', {
    correct: state.correctCount,
    total: state.questions.length,
  });
}

function showResult() {
  state.selectedMode = 'result';
  renderResult();
  showView('result');
  updateHeader();
}

function resetGame() {
  if (state.selectedMode === 'setup') {
    els.questionsInput.value = '';
    saveSettings();
    els.parseError.textContent = '';
    return;
  }

  processingDrop = false;
  state.currentIndex = 0;
  state.score = 0;
  state.correctCount = 0;
  state.currentCard = null;
  state.isDragging = false;
  activePointerId = null;
  clearDropHighlights();

  if (state.questions.length > 0) {
    showView('game');
    renderGame();
  } else {
    showView('setup');
    render();
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(function () {});
  } else {
    document.exitFullscreen();
  }
}

function showToast(message, type) {
  const toast = els.toast;
  toast.textContent = message;
  toast.className = 'toast ' + type + ' show';

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.remove('show');
  }, 1400);
}

async function boot() {
  cacheElements();
  await initI18n({ applyDom: true });
  updatePageTitle();
  updateLanguageButton();
  updateSetupHintHtml();
  loadSettings();
  bindEvents();
  render();
  showView('setup');
}

boot();
