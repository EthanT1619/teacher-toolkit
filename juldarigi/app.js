import { initI18n, setLocale, getLocale, t, applyToDOM } from '../shared/i18n.js';

const STORAGE_KEY = 'juldarigiGame';

const state = {
  teamAName: '',
  teamBName: '',
  winPoints: 30,
  position: 0,
  round: 0,
  log: [],
  gameOver: false,
  winner: '',
  statusKind: 'idle',
  statusRound: 0,
  statusTeam: '',
  statusDelta: 0,
};

const els = {};

function defaultTeamA() {
  return t('tool.juldarigi.defaults.teamA');
}

function defaultTeamB() {
  return t('tool.juldarigi.defaults.teamB');
}

function updatePageTitle() {
  document.title = t('tool.juldarigi.title');
}

function updateLanguageButton() {
  if (!els.btnLanguage) return;
  els.btnLanguage.textContent =
    getLocale() === 'en'
      ? t('tool.juldarigi.actions.switchToKo')
      : t('tool.juldarigi.actions.switchToEn');
}

function renderStatus() {
  if (state.gameOver && state.winner) {
    els.statusText.textContent = t('tool.juldarigi.status.teamWins', { team: state.winner });
    return;
  }

  if (state.statusKind === 'round') {
    els.statusText.textContent = t('tool.juldarigi.status.roundTeamPlus', {
      round: state.statusRound,
      team: state.statusTeam,
      delta: state.statusDelta,
    });
    return;
  }

  if (state.statusKind === 'tie') {
    els.statusText.textContent = t('tool.juldarigi.status.roundTie', { round: state.statusRound });
    return;
  }

  els.statusText.textContent = t('tool.juldarigi.status.enterScores');
}

function renderWinOverlay() {
  if (!state.gameOver || !state.winner) return;

  els.winTitle.textContent = t('tool.juldarigi.win.title', { team: state.winner });
  els.winDesc.textContent = t('tool.juldarigi.win.desc', {
    round: state.round,
    wp: state.winPoints,
  });
}

function refreshI18nUI() {
  applyToDOM();
  updatePageTitle();
  updateLanguageButton();
  updateDisplay();
  renderLog();
  renderStatus();
  renderWinOverlay();
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.teamAName) els.teamAName.value = saved.teamAName;
    if (saved.teamBName) els.teamBName.value = saved.teamBName;
    if (saved.winPoints) els.winPoints.value = saved.winPoints;
  } catch {
    /* ignore */
  }
}

function saveSettings() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      teamAName: els.teamAName.value.trim() || defaultTeamA(),
      teamBName: els.teamBName.value.trim() || defaultTeamB(),
      winPoints: parseInt(els.winPoints.value, 10) || 30,
    })
  );
}

let toastTimer;
function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2200);
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function parseScore(input) {
  const raw = input.value.trim();
  if (raw === '') return 0;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return null;
  return clamp(n, 0, 9);
}

function updateDisplay() {
  const wp = state.winPoints;
  const pos = state.position;

  els.scoreAName.textContent = state.teamAName;
  els.scoreBName.textContent = state.teamBName;
  els.fieldAName.textContent = state.teamAName;
  els.fieldBName.textContent = state.teamBName;
  els.inputAName.textContent = t('tool.juldarigi.input.teamScore', { team: state.teamAName });
  els.inputBName.textContent = t('tool.juldarigi.input.teamScore', { team: state.teamBName });

  const aAdv = Math.max(0, pos);
  const bAdv = Math.max(0, -pos);
  els.scoreA.textContent = aAdv;
  els.scoreB.textContent = bAdv;

  const pct = 50 - (pos / wp) * 40;
  els.flag.style.left = `${clamp(pct, 8, 92)}%`;

  if (pos > 0) {
    els.positionLabel.innerHTML = t('tool.juldarigi.position.towardTeamHtml', {
      team: state.teamAName,
      pos,
      wp,
    });
  } else if (pos < 0) {
    els.positionLabel.innerHTML = t('tool.juldarigi.position.towardTeamHtml', {
      team: state.teamBName,
      pos: -pos,
      wp,
    });
  } else {
    els.positionLabel.textContent = t('tool.juldarigi.play.centerPosition', { wp });
  }
}

function renderLog() {
  if (state.log.length === 0) {
    els.logList.innerHTML = `<div class="log-item" style="color:var(--text-muted);justify-content:center;">${t('tool.juldarigi.log.empty')}</div>`;
    return;
  }

  els.logList.innerHTML = state.log
    .slice()
    .reverse()
    .map((entry) => {
      const delta = entry.a - entry.b;
      let result;
      if (delta > 0) {
        result = `<span class="delta-a">${t('tool.juldarigi.log.teamPlus', { team: state.teamAName, delta })}</span>`;
      } else if (delta < 0) {
        result = `<span class="delta-b">${t('tool.juldarigi.log.teamPlus', { team: state.teamBName, delta: -delta })}</span>`;
      } else {
        result = t('tool.juldarigi.log.tie');
      }

      const line = t('tool.juldarigi.log.roundLine', {
        round: entry.round,
        teamA: state.teamAName,
        a: entry.a,
        teamB: state.teamBName,
        b: entry.b,
      });

      return `<div class="log-item">
        <span>${line}</span>
        <span>${result}</span>
      </div>`;
    })
    .join('');
}

function resetGame() {
  state.position = 0;
  state.round = 0;
  state.log = [];
  state.gameOver = false;
  state.winner = '';
  state.statusKind = 'idle';
  els.inputA.value = '';
  els.inputB.value = '';
  els.winOverlay.classList.remove('show');
  els.pullBtn.disabled = false;
  els.inputA.disabled = false;
  els.inputB.disabled = false;
  updateDisplay();
  renderLog();
  renderStatus();
  els.inputA.focus();
}

function startGame() {
  state.teamAName = els.teamAName.value.trim() || defaultTeamA();
  state.teamBName = els.teamBName.value.trim() || defaultTeamB();
  state.winPoints = clamp(parseInt(els.winPoints.value, 10) || 30, 5, 100);
  saveSettings();

  els.setupView.classList.remove('active');
  els.playView.classList.add('active');
  resetGame();
  showToast(t('tool.juldarigi.toast.started'));
}

function goSetup() {
  els.playView.classList.remove('active');
  els.setupView.classList.add('active');
  els.winOverlay.classList.remove('show');
}

function showWin(winner) {
  state.gameOver = true;
  state.winner = winner;
  els.pullBtn.disabled = true;
  els.inputA.disabled = true;
  els.inputB.disabled = true;
  renderWinOverlay();
  els.winOverlay.classList.add('show');
  renderStatus();
}

function applyPull() {
  if (state.gameOver) return;

  const a = parseScore(els.inputA);
  const b = parseScore(els.inputB);

  if (a === null || b === null) {
    showToast(t('tool.juldarigi.toast.invalidScore'));
    return;
  }

  if (a === 0 && b === 0) {
    showToast(t('tool.juldarigi.toast.minOneScore'));
    return;
  }

  state.round += 1;
  state.position += a - b;
  state.log.push({ round: state.round, a, b });

  els.inputA.value = '';
  els.inputB.value = '';
  updateDisplay();
  renderLog();

  const wp = state.winPoints;

  if (state.position >= wp) {
    showWin(state.teamAName);
  } else if (state.position <= -wp) {
    showWin(state.teamBName);
  } else {
    const delta = a - b;
    if (delta > 0) {
      showToast(t('tool.juldarigi.toast.teamPulled', { team: state.teamAName, delta }));
      state.statusKind = 'round';
      state.statusRound = state.round;
      state.statusTeam = state.teamAName;
      state.statusDelta = delta;
    } else if (delta < 0) {
      showToast(t('tool.juldarigi.toast.teamPulled', { team: state.teamBName, delta: -delta }));
      state.statusKind = 'round';
      state.statusRound = state.round;
      state.statusTeam = state.teamBName;
      state.statusDelta = -delta;
    } else {
      showToast(t('tool.juldarigi.toast.stalemate'));
      state.statusKind = 'tie';
      state.statusRound = state.round;
    }
    renderStatus();
    els.inputA.focus();
  }
}

function cacheElements() {
  els.setupView = document.getElementById('setupView');
  els.playView = document.getElementById('playView');
  els.teamAName = document.getElementById('teamAName');
  els.teamBName = document.getElementById('teamBName');
  els.winPoints = document.getElementById('winPoints');
  els.startBtn = document.getElementById('startBtn');
  els.backBtn = document.getElementById('backBtn');
  els.resetBtn = document.getElementById('resetBtn');
  els.statusText = document.getElementById('statusText');
  els.scoreAName = document.getElementById('scoreAName');
  els.scoreBName = document.getElementById('scoreBName');
  els.scoreA = document.getElementById('scoreA');
  els.scoreB = document.getElementById('scoreB');
  els.fieldAName = document.getElementById('fieldAName');
  els.fieldBName = document.getElementById('fieldBName');
  els.flag = document.getElementById('flag');
  els.positionLabel = document.getElementById('positionLabel');
  els.inputAName = document.getElementById('inputAName');
  els.inputBName = document.getElementById('inputBName');
  els.inputA = document.getElementById('inputA');
  els.inputB = document.getElementById('inputB');
  els.pullBtn = document.getElementById('pullBtn');
  els.logList = document.getElementById('logList');
  els.winOverlay = document.getElementById('winOverlay');
  els.winTitle = document.getElementById('winTitle');
  els.winDesc = document.getElementById('winDesc');
  els.winBackBtn = document.getElementById('winBackBtn');
  els.winRematchBtn = document.getElementById('winRematchBtn');
  els.toast = document.getElementById('toast');
  els.btnLanguage = document.getElementById('btn-language');
}

function bindEvents() {
  els.startBtn.addEventListener('click', startGame);
  els.backBtn.addEventListener('click', goSetup);
  els.resetBtn.addEventListener('click', () => {
    resetGame();
    showToast(t('tool.juldarigi.toast.reset'));
  });
  els.pullBtn.addEventListener('click', applyPull);
  els.winBackBtn.addEventListener('click', goSetup);
  els.winRematchBtn.addEventListener('click', resetGame);

  els.btnLanguage.addEventListener('click', async () => {
    try {
      await setLocale(getLocale() === 'en' ? 'ko' : 'en');
    } catch (error) {
      console.error('Locale switch failed:', error);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!els.playView.classList.contains('active')) return;
    if (e.key === 'Enter' && !state.gameOver) {
      e.preventDefault();
      applyPull();
    }
    if (e.key === 'Escape') goSetup();
  });

  [els.inputA, els.inputB].forEach((input) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyPull();
      }
    });
  });

  window.addEventListener('toolkit:localechange', refreshI18nUI);
}

async function boot() {
  cacheElements();
  await initI18n({ applyDom: true });
  updatePageTitle();
  updateLanguageButton();
  bindEvents();
  loadSettings();
}

boot();
