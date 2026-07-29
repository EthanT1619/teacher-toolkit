import { initI18n, setLocale, getLocale, t, applyToDOM } from '../shared/i18n.js';

window.mbT = (k, p) => t('tool.mystery-box-picker.' + k, p);

var STORAGE_KEY = 'mysteryBoxPicker';

var state = {
  items: [],
  assignments: [],
  revealed: new Set(),
  shuffleEachRound: true,
  hideToolbar: true,
  presets: [],
};

var els = {};
var toastTimer = null;

function updatePageTitle() {
  document.title = '🎁 ' + mbT('title');
}

function updateLanguageButton() {
  if (!els.btnLanguage) return;
  els.btnLanguage.textContent =
    getLocale() === 'en'
      ? mbT('actions.switchToKo')
      : mbT('actions.switchToEn');
}

function refreshI18nUI() {
  applyToDOM();
  updatePageTitle();
  updateLanguageButton();
  renderPresets();
  if (els.playView && els.playView.classList.contains('active')) {
    renderBoxes();
  } else {
    updateStatus();
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function save() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      itemsText: els.itemsInput.value,
      shuffleEachRound: state.shuffleEachRound,
      hideToolbar: state.hideToolbar,
      presets: state.presets,
    })
  );
}

function load() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    var data = JSON.parse(raw);
    if (typeof data.itemsText === 'string') els.itemsInput.value = data.itemsText;
    if (typeof data.shuffleEachRound === 'boolean') state.shuffleEachRound = data.shuffleEachRound;
    if (typeof data.hideToolbar === 'boolean') state.hideToolbar = data.hideToolbar;
    if (Array.isArray(data.presets)) state.presets = data.presets;
  } catch (_error) {
    /* ignore */
  }
}

function showToast(key, params) {
  els.toast.textContent = mbT('toast.' + key, params);
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    els.toast.classList.remove('show');
  }, 2500);
}

function parseItems(text) {
  return text
    .split('\n')
    .map(function (line) {
      return line.trim();
    })
    .filter(Boolean);
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

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function cubeSvg(index) {
  var uid = 'cube-' + index;
  return (
    '<svg class="cube-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' +
    '<linearGradient id="' +
    uid +
    '-top" x1="0%" y1="0%" x2="100%" y2="100%">' +
    '<stop offset="0%" stop-color="#fda4af"/>' +
    '<stop offset="50%" stop-color="#fde047"/>' +
    '<stop offset="100%" stop-color="#86efac"/>' +
    '</linearGradient>' +
    '<linearGradient id="' +
    uid +
    '-front" x1="0%" y1="0%" x2="100%" y2="100%">' +
    '<stop offset="0%" stop-color="#f472b6"/>' +
    '<stop offset="40%" stop-color="#fbbf24"/>' +
    '<stop offset="100%" stop-color="#34d399"/>' +
    '</linearGradient>' +
    '<linearGradient id="' +
    uid +
    '-side" x1="0%" y1="0%" x2="100%" y2="0%">' +
    '<stop offset="0%" stop-color="#c084fc"/>' +
    '<stop offset="100%" stop-color="#60a5fa"/>' +
    '</linearGradient>' +
    '<pattern id="' +
    uid +
    '-dots" width="12" height="12" patternUnits="userSpaceOnUse">' +
    '<circle cx="3" cy="3" r="1.5" fill="white" opacity="0.45"/>' +
    '</pattern>' +
    '</defs>' +
    '<rect x="32" y="32" width="136" height="148" fill="#f472b6"/>' +
    '<polygon points="40,70 100,40 160,70 100,100" fill="url(#' +
    uid +
    '-top)"/>' +
    '<polygon points="40,70 100,100 100,170 40,140" fill="url(#' +
    uid +
    '-front)"/>' +
    '<polygon points="100,100 160,70 160,140 100,170" fill="url(#' +
    uid +
    '-side)"/>' +
    '<polygon points="40,70 100,100 100,170 40,140" fill="url(#' +
    uid +
    '-dots)"/>' +
    '<text x="58" y="132" font-size="68" font-weight="900" fill="white" stroke="#2563eb" stroke-width="5" paint-order="stroke">?</text>' +
    '</svg>'
  );
}

function boxAriaLabel(index, revealed, item) {
  var number = index + 1;
  if (revealed) {
    return mbT('aria.boxRevealed', { number: number, item: item });
  }
  return mbT('aria.boxHidden', { number: number });
}

function renderPresets() {
  var selected = els.presetSelect.value;
  els.presetSelect.innerHTML =
    '<option value="">' +
    mbT('preset.selectPlaceholder') +
    '</option>' +
    state.presets
      .map(function (p) {
        return (
          '<option value="' +
          p.id +
          '"' +
          (p.id === selected ? ' selected' : '') +
          '>' +
          escapeHtml(p.name) +
          ' (' +
          mbT('preset.optionMeta', { count: p.items.length }) +
          ')</option>'
        );
      })
      .join('');
  var has = !!els.presetSelect.value;
  els.loadPresetBtn.disabled = !has;
  els.deletePresetBtn.disabled = !has;
}

function updateStatus() {
  var total = state.items.length;
  var revealed = state.revealed.size;
  if (revealed === 0) {
    els.statusText.textContent = mbT('status.initial', { total: total });
  } else if (revealed < total) {
    els.statusText.textContent = mbT('status.partial', {
      revealed: revealed,
      total: total,
    });
  } else {
    els.statusText.textContent = mbT('status.allRevealed');
  }
  els.playHint.classList.toggle('hidden', revealed > 0);
}

function renderBoxes() {
  els.boxesStage.dataset.count = state.assignments.length;
  els.boxesStage.innerHTML = state.assignments
    .map(function (item, i) {
      var revealed = state.revealed.has(i);
      return (
        '<div class="box-slot' +
        (revealed ? ' revealed' : '') +
        '" data-index="' +
        i +
        '" role="button" tabindex="0" aria-label="' +
        escapeHtml(boxAriaLabel(i, revealed, item)) +
        '">' +
        '<div class="prize-circle color-' +
        (i % 5) +
        (revealed ? ' reveal-pop' : '') +
        '">' +
        escapeHtml(item) +
        '</div>' +
        '<div class="mystery-cube">' +
        cubeSvg(i) +
        '</div>' +
        '<span class="box-number">' +
        (i + 1) +
        '</span></div>'
      );
    })
    .join('');

  updateStatus();
}

function startRound() {
  var items = parseItems(els.itemsInput.value);
  if (items.length === 0) {
    showToast('needItems');
    els.itemsInput.focus();
    return;
  }

  state.items = items;
  state.assignments = shuffle(items);
  state.revealed = new Set();

  state.shuffleEachRound = els.shuffleEachRound.checked;
  state.hideToolbar = els.hideToolbar.checked;
  save();

  els.setupView.classList.remove('active');
  els.playView.classList.add('active');
  els.playToolbar.classList.toggle('visible', !state.hideToolbar);

  renderBoxes();
  showToast('gameReady', { count: items.length });
}

function resetRound() {
  if (state.shuffleEachRound) {
    state.assignments = shuffle(state.items);
  }
  state.revealed = new Set();
  renderBoxes();
  showToast('newRound');
}

function revealBox(index) {
  if (state.revealed.has(index)) return;
  state.revealed.add(index);
  var slot = els.boxesStage.querySelector('[data-index="' + index + '"]');
  if (slot) {
    slot.classList.add('revealed');
    slot.querySelector('.prize-circle')?.classList.add('reveal-pop');
    slot.setAttribute('aria-label', boxAriaLabel(index, true, state.assignments[index]));
  }
  updateStatus();
  if (navigator.vibrate) navigator.vibrate(30);
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

function savePreset() {
  var name = els.presetNameInput.value.trim();
  if (!name) {
    showToast('presetNameRequired');
    return;
  }
  var items = parseItems(els.itemsInput.value);
  if (items.length === 0) {
    showToast('noItemsToSave');
    return;
  }

  var existing = state.presets.find(function (p) {
    return p.name.toLowerCase() === name.toLowerCase();
  });
  if (existing) {
    if (!confirm(mbT('confirm.overwritePreset', { name: name }))) return;
    existing.items = items;
  } else {
    state.presets.push({ id: generateId(), name: name, items: items });
  }
  save();
  renderPresets();
  showToast('presetSaved', { name: name });
}

function loadPreset() {
  var id = els.presetSelect.value;
  if (!id) return;
  var preset = state.presets.find(function (p) {
    return p.id === id;
  });
  if (!preset) return;
  els.itemsInput.value = preset.items.join('\n');
  els.presetNameInput.value = preset.name;
  save();
  showToast('presetLoaded', { name: preset.name });
}

function deletePreset() {
  var id = els.presetSelect.value;
  if (!id) return;
  var preset = state.presets.find(function (p) {
    return p.id === id;
  });
  if (!preset || !confirm(mbT('confirm.deletePreset', { name: preset.name }))) return;
  state.presets = state.presets.filter(function (p) {
    return p.id !== id;
  });
  els.presetSelect.value = '';
  save();
  renderPresets();
  showToast('presetDeleted');
}

function cacheElements() {
  els.setupView = document.getElementById('setupView');
  els.playView = document.getElementById('playView');
  els.itemsInput = document.getElementById('itemsInput');
  els.shuffleEachRound = document.getElementById('shuffleEachRound');
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
  els.boxesStage = document.getElementById('boxesStage');
  els.playHint = document.getElementById('playHint');
  els.toast = document.getElementById('toast');
  els.btnLanguage = document.getElementById('btn-language');
}

function bindEvents() {
  els.startBtn.addEventListener('click', startRound);
  els.sampleBtn.addEventListener('click', function () {
    els.itemsInput.value = 'Switch points\n+6\n+1\n꽝\n×2';
    showToast('sampleLoaded');
  });

  els.backBtn.addEventListener('click', goSetup);
  els.resetRoundBtn.addEventListener('click', resetRound);
  els.fullscreenBtn.addEventListener('click', toggleFullscreen);

  els.boxesStage.addEventListener('click', function (e) {
    var slot = e.target.closest('.box-slot');
    if (!slot || slot.classList.contains('revealed')) return;
    revealBox(Number(slot.dataset.index));
  });

  els.boxesStage.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var slot = e.target.closest('.box-slot');
    if (!slot || slot.classList.contains('revealed')) return;
    e.preventDefault();
    revealBox(Number(slot.dataset.index));
  });

  els.presetSelect.addEventListener('change', function () {
    var has = !!els.presetSelect.value;
    els.loadPresetBtn.disabled = !has;
    els.deletePresetBtn.disabled = !has;
  });
  els.loadPresetBtn.addEventListener('click', loadPreset);
  els.savePresetBtn.addEventListener('click', savePreset);
  els.deletePresetBtn.addEventListener('click', deletePreset);

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

async function boot() {
  cacheElements();
  await initI18n({ applyDom: true });
  load();
  els.shuffleEachRound.checked = state.shuffleEachRound;
  els.hideToolbar.checked = state.hideToolbar;
  updatePageTitle();
  updateLanguageButton();
  renderPresets();
  bindEvents();
}

boot();
