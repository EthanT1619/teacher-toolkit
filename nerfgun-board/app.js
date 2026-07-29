import { initI18n, setLocale, getLocale, t, applyToDOM } from '../shared/i18n.js';

var BOARDS = [
  '1 Hexagon Mission.png',
  '2 Circle Arena.png',
  '3 Diamond Path.png',
  '4 Star Burst.png',
  '5 Rocket Launcher.png',
  '6 Treasure Island.png',
  '7 Maze Explorer.png',
  '8 UFO Zone.png',
  '9 Cloud Kingdom.png',
  '10 Star Board.png',
  '11 Under the Sea.png',
  '12 Fantasy Board.png',
  '13 SF fantasy.png',
  '14 Cyberpunk world.png',
  '15 Wild West Saloon.png',
];

var ITEM_HEIGHT = 72;
var LOOP_COUNT = 3;
var SPIN_DURATION_MS = 3800;

var els = {};
var spinning = false;
var currentOffset = 0;
var pendingWinner = null;

function boardLabel(filename) {
  return filename.replace(/^\d+\s*/, '').replace(/\.png$/i, '');
}

function boardSrc(filename) {
  return 'assets/' + encodeURIComponent(filename);
}

function updatePageTitle() {
  document.title = t('tool.nerfgun-board.title');
}

function updateLanguageButton() {
  if (!els.btnLanguage) return;
  els.btnLanguage.textContent =
    getLocale() === 'en'
      ? t('tool.nerfgun-board.actions.switchToKo')
      : t('tool.nerfgun-board.actions.switchToEn');
}

function renderSpinStatus(key, params) {
  els.spinStatus.textContent = t('tool.nerfgun-board.spinStatus.' + key, params);
}

function render() {
  updateLanguageButton();
  if (!spinning && viewSpinActive()) {
    renderSpinStatus('idle');
  }
}

function refreshI18nUI() {
  applyToDOM();
  updatePageTitle();
  render();
}

function viewSpinActive() {
  return els.viewSpin.classList.contains('active');
}

function buildStrip() {
  els.reelStrip.innerHTML = '';
  els.reelStrip.classList.remove('spinning');
  els.reelStrip.style.transform = 'translateY(0)';

  for (var loop = 0; loop < LOOP_COUNT; loop++) {
    for (var i = 0; i < BOARDS.length; i++) {
      var file = BOARDS[i];
      var el = document.createElement('div');
      el.className = 'reel-item';
      el.textContent = boardLabel(file);
      els.reelStrip.appendChild(el);
    }
  }
}

function setOffset(index, animate) {
  els.reelStrip.classList.toggle('spinning', animate);
  els.reelStrip.style.setProperty('--spin-duration', SPIN_DURATION_MS + 'ms');
  els.reelStrip.style.transform = 'translateY(-' + index * ITEM_HEIGHT + 'px)';
  currentOffset = index;
}

function showSpinView() {
  els.viewResult.classList.remove('active');
  els.viewSpin.classList.add('active');
  els.reelWrap.classList.remove('is-winner');
  els.viewSpin.classList.remove('is-spinning');
  buildStrip();
  setOffset(0, false);
  renderSpinStatus('idle');
  els.btnSpin.disabled = false;
}

function showResultView(file, label) {
  els.boardImage.src = boardSrc(file);
  els.boardImage.alt = label;
  els.viewSpin.classList.remove('active');
  els.viewResult.classList.add('active');
}

function preloadImage(src) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () {
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

function spin() {
  if (spinning) return;
  spinning = true;
  pendingWinner = null;
  els.reelWrap.classList.remove('is-winner');
  els.viewSpin.classList.add('is-spinning');
  els.btnSpin.disabled = true;
  renderSpinStatus('spinning');

  var winnerIndex = Math.floor(Math.random() * BOARDS.length);
  var extraLoops = 1 + Math.floor(Math.random() * 2);
  var targetIndex = BOARDS.length * extraLoops + winnerIndex;
  var winnerFile = BOARDS[winnerIndex];
  var label = boardLabel(winnerFile);

  pendingWinner = { file: winnerFile, label: label };
  preloadImage(boardSrc(winnerFile)).catch(function () {});

  buildStrip();
  setOffset(0, false);

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      setOffset(targetIndex, true);
    });
  });

  els.reelStrip.addEventListener('transitionend', onSpinEnd, { once: true });
}

function onSpinEnd() {
  spinning = false;
  els.viewSpin.classList.remove('is-spinning');
  els.reelWrap.classList.add('is-winner');
  els.btnSpin.disabled = false;

  if (!pendingWinner) return;

  renderSpinStatus('winner', { label: pendingWinner.label });

  setTimeout(function () {
    showResultView(pendingWinner.file, pendingWinner.label);
    pendingWinner = null;
  }, 600);
}

function cacheElements() {
  els.viewSpin = document.getElementById('viewSpin');
  els.viewResult = document.getElementById('viewResult');
  els.reelWrap = document.getElementById('reelWrap');
  els.reelStrip = document.getElementById('reelStrip');
  els.spinStatus = document.getElementById('spinStatus');
  els.btnSpin = document.getElementById('btnSpin');
  els.btnBackFab = document.getElementById('btnBackFab');
  els.boardImage = document.getElementById('boardImage');
  els.btnLanguage = document.getElementById('btn-language');
}

function bindEvents() {
  els.btnSpin.addEventListener('click', spin);
  els.btnBackFab.addEventListener('click', showSpinView);

  els.btnLanguage.addEventListener('click', async function () {
    try {
      await setLocale(getLocale() === 'en' ? 'ko' : 'en');
    } catch (error) {
      console.error('Locale switch failed:', error);
    }
  });

  window.addEventListener('resize', function () {
    if (!spinning && viewSpinActive()) {
      setOffset(currentOffset, false);
    }
  });

  window.addEventListener('toolkit:localechange', refreshI18nUI);
}

async function boot() {
  cacheElements();
  document.documentElement.style.setProperty('--item-h', ITEM_HEIGHT + 'px');
  await initI18n({ applyDom: true });
  updatePageTitle();
  buildStrip();
  bindEvents();
  render();
}

boot();
