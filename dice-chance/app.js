import { initI18n, setLocale, getLocale, t, applyToDOM } from '../shared/i18n.js';

window.dcT = (k, p) => t('tool.dice-chance.' + k, p);

var STORAGE_KEY = 'diceChanceGame';

var gameState = {
  optionsText: '',
  options: [],
  diceMode: 1,
  slotCount: 6,
  roundRewards: [],
  revealed: new Set(),
  hideToolbar: true,
  presets: [],
};

var els = {};
var toastTimer = null;

function updatePageTitle() {
  document.title = '🎲 ' + dcT('title');
}

function updateLanguageButton() {
  if (!els.btnLanguage) return;
  els.btnLanguage.textContent =
    getLocale() === 'en'
      ? dcT('actions.switchToKo')
      : dcT('actions.switchToEn');
}

function refreshI18nUI() {
  applyToDOM();
  updatePageTitle();
  updateLanguageButton();
  renderPresets();
  if (els.playView && els.playView.classList.contains('active')) {
    els.modeLabel.textContent = getModeLabelText();
    renderBoard();
  } else {
    updateStatus();
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function getDiceMode() {
  var checked = document.querySelector('input[name="diceMode"]:checked');
  return checked ? Number(checked.value) : 1;
}

function setDiceMode(mode) {
  var input = document.querySelector('input[name="diceMode"][value="' + mode + '"]');
  if (input) input.checked = true;
}

function getSlotCount() {
  return 6;
}

function getDiceLabel(index) {
  if (gameState.diceMode === 2) {
    var low = index * 2 + 1;
    return low + '~' + (low + 1);
  }
  return String(index + 1);
}

function getModeLabelText() {
  return gameState.diceMode === 2
    ? dcT('modeLabel.twoDice')
    : dcT('modeLabel.oneDice');
}

function getPresetModeLabel(mode) {
  return mode === 2 ? dcT('preset.modeTwoDice') : dcT('preset.modeOneDice');
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      optionsText: els.optionsInput.value,
      diceMode: gameState.diceMode,
      hideToolbar: gameState.hideToolbar,
      presets: gameState.presets,
    })
  );
}

function showToast(key, params) {
  els.toast.textContent = dcT('toast.' + key, params);
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    els.toast.classList.remove('show');
  }, 2500);
}

function parseOptions() {
  gameState.options = els.optionsInput.value
    .split('\n')
    .map(function (line) {
      return line.trim();
    })
    .filter(Boolean);
  gameState.optionsText = els.optionsInput.value;
  return gameState.options;
}

function pickRandomRewards(options, count) {
  if (options.length < count) return null;
  return shuffle(options).slice(0, count);
}

function generateRound() {
  var rewards = pickRandomRewards(gameState.options, gameState.slotCount);
  if (!rewards) return false;
  gameState.roundRewards = rewards;
  gameState.revealed = new Set();
  return true;
}

function updateStatus() {
  var total = gameState.slotCount;
  var revealed = gameState.revealed.size;
  var modeKey = gameState.diceMode === 2 ? 'twoDiceShort' : 'oneDiceShort';

  if (revealed === 0) {
    els.statusText.textContent = dcT('status.initial', {
      mode: dcT('status.' + modeKey),
      total: total,
    });
  } else if (revealed < total) {
    els.statusText.textContent = dcT('status.partial', {
      revealed: revealed,
      total: total,
    });
  } else {
    els.statusText.textContent = dcT('status.allRevealed');
  }

  els.playHint.classList.toggle('hidden', revealed > 0);
}

function diceRowAriaLabel(index, revealed, reward) {
  var label = getDiceLabel(index);
  if (revealed) {
    return dcT('aria.diceRowRevealed', { label: label, reward: reward });
  }
  return dcT('aria.diceRowHidden', { label: label });
}

function renderBoard() {
  els.diceBoard.className = 'dice-board';
  els.modeLabel.textContent = getModeLabelText();

  els.diceBoard.innerHTML = gameState.roundRewards
    .map(function (reward, i) {
      var label = getDiceLabel(i);
      var isRange = gameState.diceMode === 2;
      var revealed = gameState.revealed.has(i);
      return (
        '<div class="dice-row' +
        (revealed ? ' revealed' : '') +
        '" data-index="' +
        i +
        '" role="button" tabindex="0" aria-label="' +
        escapeHtml(diceRowAriaLabel(i, revealed, reward)) +
        '">' +
        '<div class="dice-number' +
        (isRange ? ' range' : '') +
        '" aria-hidden="true">' +
        label +
        '</div>' +
        '<div class="reward-cell' +
        (revealed ? ' revealed' : '') +
        '">' +
        '<div class="reward-text' +
        (revealed ? ' reveal-pop' : '') +
        '">' +
        escapeHtml(reward) +
        '</div>' +
        '<div class="reward-cover" aria-hidden="true"><span class="cover-text">' +
        dcT('cover.hidden') +
        '</span></div>' +
        '</div></div>'
      );
    })
    .join('');

  updateStatus();
}

function revealResult(index) {
  if (gameState.revealed.has(index)) return;
  gameState.revealed.add(index);

  var row = els.diceBoard.querySelector('[data-index="' + index + '"]');
  if (row) {
    row.classList.add('revealed');
    row.querySelector('.reward-cell')?.classList.add('revealed');
    row.querySelector('.reward-text')?.classList.add('reveal-pop');
    row.setAttribute(
      'aria-label',
      diceRowAriaLabel(index, true, gameState.roundRewards[index])
    );
  }

  updateStatus();
  if (navigator.vibrate) navigator.vibrate(30);
}

function startGame() {
  gameState.diceMode = getDiceMode();
  gameState.slotCount = getSlotCount();
  gameState.hideToolbar = els.hideToolbar.checked;

  var options = parseOptions();
  if (options.length === 0) {
    showToast('needOptions');
    els.optionsInput.focus();
    return;
  }

  if (options.length < gameState.slotCount) {
    showToast('needMoreOptions', {
      required: gameState.slotCount,
      current: options.length,
    });
    els.optionsInput.focus();
    return;
  }

  if (!generateRound()) {
    showToast('cannotGenerateRound');
    return;
  }

  persist();

  els.setupView.classList.remove('active');
  els.playView.classList.add('active');
  els.playToolbar.classList.toggle('visible', !gameState.hideToolbar);

  renderBoard();
  showToast('gameReady', { count: gameState.slotCount });
}

function resetRound() {
  if (!generateRound()) {
    showToast('needMoreOptions', {
      required: gameState.slotCount,
      current: gameState.options.length,
    });
    return;
  }
  renderBoard();
  showToast('newRound');
}

function goSetup() {
  els.playView.classList.remove('active');
  els.setupView.classList.add('active');
  if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(function () {});
  } else {
    document.documentElement.requestFullscreen().catch(function () {
      showToast('fullscreenUnavailable');
    });
  }
}

function renderPresets() {
  var selected = els.presetSelect.value;
  els.presetSelect.innerHTML =
    '<option value="">' +
    dcT('preset.selectPlaceholder') +
    '</option>' +
    gameState.presets
      .map(function (p) {
        var mode = getPresetModeLabel(p.diceMode || 1);
        return (
          '<option value="' +
          p.id +
          '"' +
          (p.id === selected ? ' selected' : '') +
          '>' +
          escapeHtml(p.name) +
          ' (' +
          dcT('preset.optionMeta', {
            count: p.options.length,
            mode: mode,
          }) +
          ')</option>'
        );
      })
      .join('');
  var has = !!els.presetSelect.value;
  els.loadPresetBtn.disabled = !has;
  els.deletePresetBtn.disabled = !has;
}

function savePreset() {
  var name = els.presetNameInput.value.trim();
  if (!name) {
    showToast('presetNameRequired');
    return;
  }

  var options = parseOptions();
  if (options.length === 0) {
    showToast('noOptionsToSave');
    return;
  }

  var diceMode = getDiceMode();
  var existing = gameState.presets.find(function (p) {
    return p.name.toLowerCase() === name.toLowerCase();
  });

  if (existing) {
    if (!confirm(dcT('confirm.overwritePreset', { name: name }))) return;
    existing.options = options;
    existing.diceMode = diceMode;
  } else {
    gameState.presets.push({ id: generateId(), name: name, options: options, diceMode: diceMode });
  }

  persist();
  renderPresets();
  showToast('presetSaved', { name: name });
}

function loadPreset() {
  var id = els.presetSelect.value;
  if (!id) return;
  var preset = gameState.presets.find(function (p) {
    return p.id === id;
  });
  if (!preset) return;

  els.optionsInput.value = preset.options.join('\n');
  els.presetNameInput.value = preset.name;
  setDiceMode(preset.diceMode || 1);
  gameState.diceMode = preset.diceMode || 1;

  persist();
  showToast('presetLoaded', { name: preset.name });
}

function deletePreset() {
  var id = els.presetSelect.value;
  if (!id) return;
  var preset = gameState.presets.find(function (p) {
    return p.id === id;
  });
  if (!preset || !confirm(dcT('confirm.deletePreset', { name: preset.name }))) return;

  gameState.presets = gameState.presets.filter(function (p) {
    return p.id !== id;
  });
  els.presetSelect.value = '';
  persist();
  renderPresets();
  showToast('presetDeleted');
}

function loadSample() {
  els.optionsInput.value = [
    '+10 POINTS',
    '+20 POINTS',
    'BOMB',
    'SHIELD',
    'SWITCH POINT',
    'THROW AGAIN',
    'STEAL 10',
    'DOUBLE POINTS',
    'MISS',
    'CHANGE SCORE',
  ].join('\n');
  showToast('sampleLoaded');
}

function tryLoadDiceImage() {
  var img = els.setupDiceImg;
  img.onload = function () {
    els.setupDiceIcon.classList.add('has-img');
  };
  img.onerror = function () {
    els.setupDiceIcon.classList.remove('has-img');
  };
  if (img.complete && img.naturalWidth > 0) {
    els.setupDiceIcon.classList.add('has-img');
  }
}

function cacheElements() {
  els.setupView = document.getElementById('setupView');
  els.playView = document.getElementById('playView');
  els.optionsInput = document.getElementById('optionsInput');
  els.hideToolbar = document.getElementById('hideToolbar');
  els.startBtn = document.getElementById('startBtn');
  els.sampleBtn = document.getElementById('sampleBtn');
  els.presetSelect = document.getElementById('presetSelect');
  els.loadPresetBtn = document.getElementById('loadPresetBtn');
  els.presetNameInput = document.getElementById('presetNameInput');
  els.savePresetBtn = document.getElementById('savePresetBtn');
  els.deletePresetBtn = document.getElementById('deletePresetBtn');
  els.playToolbar = document.getElementById('playToolbar');
  els.backBtn = document.getElementById('backBtn');
  els.statusText = document.getElementById('statusText');
  els.resetRoundBtn = document.getElementById('resetRoundBtn');
  els.fullscreenBtn = document.getElementById('fullscreenBtn');
  els.diceBoard = document.getElementById('diceBoard');
  els.modeLabel = document.getElementById('modeLabel');
  els.playHint = document.getElementById('playHint');
  els.toast = document.getElementById('toast');
  els.setupDiceImg = document.getElementById('setupDiceImg');
  els.setupDiceIcon = document.getElementById('setupDiceIcon');
  els.btnLanguage = document.getElementById('btn-language');
}

function bindEvents() {
  els.startBtn.addEventListener('click', startGame);
  els.sampleBtn.addEventListener('click', loadSample);
  els.backBtn.addEventListener('click', goSetup);
  els.resetRoundBtn.addEventListener('click', resetRound);
  els.fullscreenBtn.addEventListener('click', toggleFullscreen);
  els.savePresetBtn.addEventListener('click', savePreset);
  els.loadPresetBtn.addEventListener('click', loadPreset);
  els.deletePresetBtn.addEventListener('click', deletePreset);

  els.presetSelect.addEventListener('change', function () {
    var has = !!els.presetSelect.value;
    els.loadPresetBtn.disabled = !has;
    els.deletePresetBtn.disabled = !has;
  });

  els.diceBoard.addEventListener('click', function (e) {
    var row = e.target.closest('.dice-row');
    if (!row || row.classList.contains('revealed')) return;
    revealResult(Number(row.dataset.index));
  });

  els.diceBoard.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var row = e.target.closest('.dice-row');
    if (!row || row.classList.contains('revealed')) return;
    e.preventDefault();
    revealResult(Number(row.dataset.index));
  });

  document.addEventListener('keydown', function (e) {
    if (!els.playView.classList.contains('active')) return;
    if (e.key === 'Escape') {
      goSetup();
      return;
    }
    if (e.key === 'r' || e.key === 'R') {
      resetRound();
      return;
    }
    if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    }
  });

  els.btnLanguage.addEventListener('click', async function () {
    try {
      await setLocale(getLocale() === 'en' ? 'ko' : 'en');
    } catch (error) {
      console.error('Locale switch failed:', error);
    }
  });

  window.addEventListener('toolkit:localechange', refreshI18nUI);
}

function loadSavedState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var data = JSON.parse(raw);
      if (typeof data.optionsText === 'string') els.optionsInput.value = data.optionsText;
      if (typeof data.diceMode === 'number') {
        gameState.diceMode = data.diceMode;
        setDiceMode(data.diceMode);
      }
      if (typeof data.hideToolbar === 'boolean') gameState.hideToolbar = data.hideToolbar;
      if (Array.isArray(data.presets)) gameState.presets = data.presets;
    }
  } catch (_error) {
    /* ignore */
  }

  els.hideToolbar.checked = gameState.hideToolbar;
}

async function boot() {
  cacheElements();
  await initI18n({ applyDom: true });
  loadSavedState();
  updatePageTitle();
  updateLanguageButton();
  renderPresets();
  tryLoadDiceImage();
  bindEvents();
}

boot();
