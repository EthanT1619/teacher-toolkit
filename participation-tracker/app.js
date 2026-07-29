import { initI18n, setLocale, getLocale, t, applyToDOM } from '../shared/i18n.js';

window.ptT = (k, p) => t('tool.participation-tracker.' + k, p);

const STORAGE_KEY = 'participation-tracker-v3';

const LONG_PRESS_MS = 450;
const MOVE_THRESHOLD = 12;
const UNDO_LIMIT = 30;

const undoStack = [];

const state = {
  students: [],
  counts: {},
  presets: [],
  activePresetId: null,
  sortQuietFirst: true,
};

const $ = (sel) => document.querySelector(sel);

let els = {};

function updatePageTitle() {
  document.title = ptT('title');
}

function updateLanguageButton() {
  if (!els.btnLanguage) return;
  els.btnLanguage.textContent =
    getLocale() === 'en'
      ? ptT('actions.switchToKo')
      : ptT('actions.switchToEn');
}

function refreshI18nUI() {
  applyToDOM();
  updatePageTitle();
  updateLanguageButton();
  updateStudentCountLabel();
  renderPresets();
  if ($('#tracker').classList.contains('active')) {
    renderTracker();
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function parseNames(text) {
  return text
    .split(/[\n,]+/)
    .flatMap((line) => line.trim().split(/\s+/).filter(Boolean))
    .filter((name, i, arr) => name && arr.indexOf(name) === i);
}

function showScreen(name) {
  document.querySelectorAll('.screen').forEach((el) => {
    el.classList.toggle('active', el.id === name);
  });
}

function showToast(msg) {
  const toast = $('#toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    students: state.students,
    counts: state.counts,
    presets: state.presets,
    activePresetId: state.activePresetId,
    sortQuietFirst: state.sortQuietFirst,
    studentInputText: $('#studentInput').value,
  }));
}

function loadState() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    let data;

    if (!raw) {
      raw = localStorage.getItem('participation-tracker-v2');
      if (raw) {
        data = JSON.parse(raw);
        if (Array.isArray(data.presets)) state.presets = data.presets;
        if (typeof data.sortQuietFirst === 'boolean') state.sortQuietFirst = data.sortQuietFirst;
        return;
      }
      raw = localStorage.getItem('participation-tracker-v1');
    }

    if (!raw) return;
    data = JSON.parse(raw);
    if (Array.isArray(data.students)) state.students = data.students;
    if (data.counts && typeof data.counts === 'object') {
      state.counts = migrateCounts(data.counts);
    }
    if (Array.isArray(data.presets)) state.presets = data.presets;
    if (data.activePresetId) state.activePresetId = data.activePresetId;
    if (typeof data.sortQuietFirst === 'boolean') state.sortQuietFirst = data.sortQuietFirst;
    if (typeof data.studentInputText === 'string') $('#studentInput').value = data.studentInputText;
  } catch {
    /* ignore */
  }
}

function migrateCounts(counts) {
  const migrated = {};
  Object.entries(counts).forEach(([name, val]) => {
    if (typeof val === 'number') {
      migrated[name] = val;
    } else if (val && typeof val === 'object') {
      migrated[name] = (val.presentation || 0) + (val.question || 0);
    } else {
      migrated[name] = 0;
    }
  });
  return migrated;
}

function ensureCounts() {
  state.students.forEach((name) => {
    if (typeof state.counts[name] !== 'number') {
      state.counts[name] = 0;
    }
  });
  Object.keys(state.counts).forEach((name) => {
    if (!state.students.includes(name)) delete state.counts[name];
  });
}

function isQuiet(name) {
  return state.counts[name] === 0;
}

function updateUndoButton() {
  $('#btnUndo').disabled = undoStack.length === 0;
}

function pushUndo(name, prev) {
  undoStack.push({ name, prev });
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  updateUndoButton();
}

function changeCount(name, delta, recordUndo = true) {
  const prev = getHandCount(name);
  const next = Math.max(0, prev + delta);
  if (next === prev) return false;
  state.counts[name] = next;
  if (recordUndo) pushUndo(name, prev);
  save();
  return true;
}

function undoLast() {
  const action = undoStack.pop();
  if (!action) return;
  state.counts[action.name] = action.prev;
  save();
  updateUndoButton();
  renderTracker();
  showToast(ptT('toast.undone', { name: action.name }));
}

function clearUndo() {
  undoStack.length = 0;
  updateUndoButton();
}

function pulseCard(card, className = 'tapped') {
  card.classList.remove(className);
  void card.offsetWidth;
  card.classList.add(className);
}

function bindCardInteractions(card) {
  let pressTimer = null;
  let longPressFired = false;
  let startX = 0;
  let startY = 0;

  function clearPress() {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    card.classList.remove('holding');
  }

  function onLongPress() {
    pressTimer = null;
    const name = card.dataset.name;
    const prev = getHandCount(name);
    if (prev <= 0) {
      showToast(ptT('toast.alreadyZero'));
      return;
    }
    longPressFired = true;
    if (changeCount(name, -1)) {
      const countEl = card.querySelector('.hand-count');
      if (countEl) countEl.textContent = getHandCount(name);
      card.classList.toggle('quiet', isQuiet(name));
      pulseCard(card, 'long-pressed');
      showToast(ptT('toast.decremented', { name }));
    }
  }

  card.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    longPressFired = false;
    startX = e.clientX;
    startY = e.clientY;
    clearPress();
    card.classList.add('holding');
    pressTimer = setTimeout(onLongPress, LONG_PRESS_MS);
    card.setPointerCapture(e.pointerId);
  });

  card.addEventListener('pointermove', (e) => {
    if (!pressTimer) return;
    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);
    if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) clearPress();
  });

  card.addEventListener('pointerup', (e) => {
    clearPress();
    try { card.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (longPressFired) {
      renderTracker();
      return;
    }
    const name = card.dataset.name;
    if (changeCount(name, 1)) {
      pulseCard(card);
      renderTracker();
    }
  });

  card.addEventListener('pointercancel', clearPress);
  card.addEventListener('contextmenu', (e) => e.preventDefault());
}

function getHandCount(name) {
  return state.counts[name] || 0;
}

function getPresetById(id) {
  return state.presets.find((p) => p.id === id);
}

function getPresetByName(name) {
  const n = name.trim().toLowerCase();
  return state.presets.find((p) => p.name.toLowerCase() === n);
}

function cloneStudents(students) {
  return students.map((name) => name);
}

function updateStudentCountLabel() {
  const names = parseNames($('#studentInput').value);
  $('#studentCountLabel').textContent = ptT('status.studentCount', { count: names.length });
}

function renderPresets() {
  const selectedId = $('#presetSelect').value;
  $('#presetSelect').innerHTML =
    '<option value="">' + escapeHtml(ptT('preset.selectPlaceholder')) + '</option>' +
    state.presets
      .map((p) => {
        const selected = p.id === selectedId ? ' selected' : '';
        const label = ptT('preset.optionMeta', { name: p.name, count: p.students.length });
        return `<option value="${p.id}"${selected}>${escapeHtml(label)}</option>`;
      })
      .join('');

  const active = getPresetById(state.activePresetId);
  const label = $('#activePresetLabel');
  if (active) {
    label.textContent = ptT('preset.activeWithName', {
      name: active.name,
      count: active.students.length,
    });
    label.classList.remove('muted');
    $('#presetNameInput').value = active.name;
  } else {
    label.textContent = ptT('preset.activeNone');
    label.classList.add('muted');
  }

  const hasSelection = !!$('#presetSelect').value;
  $('#loadPresetBtn').disabled = !hasSelection;
  $('#deletePresetBtn').disabled = !hasSelection;
  $('#updatePresetBtn').disabled = !state.activePresetId;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function applyStudents(names, resetCounts = false) {
  state.students = names;
  if (resetCounts) {
    state.counts = {};
  }
  ensureCounts();
  $('#studentInput').value = names.join('\n');
  updateStudentCountLabel();
  save();
}

function saveNewPreset(name) {
  const normalized = name.trim();
  if (!normalized) {
    showToast(ptT('toast.presetNameRequired'));
    $('#presetNameInput').focus();
    return;
  }

  const names = parseNames($('#studentInput').value);
  if (names.length === 0) {
    showToast(ptT('toast.noStudentsToSave'));
    return;
  }

  const existing = getPresetByName(normalized);
  if (existing) {
    if (!confirm(ptT('confirm.overwritePreset', { name: normalized }))) return;
    existing.students = cloneStudents(names);
    existing.updatedAt = new Date().toISOString();
    state.activePresetId = existing.id;
  } else {
    const preset = {
      id: generateId(),
      name: normalized,
      students: cloneStudents(names),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.presets.push(preset);
    state.activePresetId = preset.id;
  }

  save();
  renderPresets();
  showToast(ptT('toast.presetSaved', { name: normalized }));
}

function loadSelectedPreset() {
  const id = $('#presetSelect').value;
  if (!id) return;
  const preset = getPresetById(id);
  if (!preset) return;

  const currentNames = parseNames($('#studentInput').value);
  if (currentNames.length > 0 && !state.activePresetId) {
    if (!confirm(ptT('confirm.replaceTempList', {
      count: currentNames.length,
      name: preset.name,
    }))) return;
  } else if (state.activePresetId && state.activePresetId !== id) {
    const current = getPresetById(state.activePresetId);
    if (current && !confirm(ptT('confirm.switchPreset', {
      from: current.name,
      to: preset.name,
    }))) return;
  }

  applyStudents(cloneStudents(preset.students), false);
  state.activePresetId = preset.id;
  save();
  renderPresets();
  showToast(ptT('toast.presetLoaded', { name: preset.name }));
}

function updateActivePreset() {
  const preset = getPresetById(state.activePresetId);
  if (!preset) return;

  const names = parseNames($('#studentInput').value);
  if (names.length === 0) {
    showToast(ptT('toast.noStudentsToSave'));
    return;
  }
  if (!confirm(ptT('confirm.updatePreset', { name: preset.name, count: names.length }))) return;

  preset.students = cloneStudents(names);
  preset.updatedAt = new Date().toISOString();
  state.students = names;
  ensureCounts();
  save();
  renderPresets();
  showToast(ptT('toast.presetUpdated', { name: preset.name }));
}

function deleteSelectedPreset() {
  const id = $('#presetSelect').value;
  if (!id) return;
  const preset = getPresetById(id);
  if (!preset) return;
  if (!confirm(ptT('confirm.deletePreset', { name: preset.name }))) return;

  state.presets = state.presets.filter((p) => p.id !== id);
  if (state.activePresetId === id) state.activePresetId = null;
  $('#presetSelect').value = '';
  save();
  renderPresets();
  showToast(ptT('toast.presetDeleted'));
}

function startTracker() {
  const names = parseNames($('#studentInput').value);
  if (names.length === 0) {
    showToast(ptT('toast.enterStudentNames'));
    $('#studentInput').focus();
    return;
  }

  applyStudents(names, false);
  renderTracker();
  showScreen('tracker');
}

function sortedStudents() {
  const list = [...state.students];
  if (!state.sortQuietFirst) return list;
  return list.sort((a, b) => {
    const qa = isQuiet(a) ? 0 : 1;
    const qb = isQuiet(b) ? 0 : 1;
    if (qa !== qb) return qa - qb;
    return getHandCount(a) - getHandCount(b);
  });
}

function updateSummaryBar() {
  const quiet = state.students.filter(isQuiet).length;
  const active = state.students.length - quiet;
  $('#quietSummary').textContent = ptT('summary.handsNotRaised', { count: quiet });
  $('#activeSummary').textContent = ptT('summary.handsRaised', { count: active });
}

function renderTracker() {
  ensureCounts();

  updateSummaryBar();
  $('#sortQuietFirst').checked = state.sortQuietFirst;
  updateUndoButton();

  const grid = $('#studentGrid');
  const students = sortedStudents();

  if (students.length === 0) {
    grid.innerHTML =
      '<div class="empty-state">' +
      escapeHtml(ptT('empty.line1')) +
      '<br>' +
      escapeHtml(ptT('empty.line2')) +
      '</div>';
    return;
  }

  grid.innerHTML = students
    .map((name) => {
      const count = getHandCount(name);
      const quietClass = isQuiet(name) ? ' quiet' : '';
      const ariaLabel = ptT('aria.studentCard', { name, count });
      return `
            <button type="button" class="student-card${quietClass}" data-name="${escapeHtml(name)}" aria-label="${escapeHtml(ariaLabel)}">
              <div class="quiet-badge">${escapeHtml(ptT('labels.quietBadge'))}</div>
              <div class="student-name">${escapeHtml(name)}</div>
              <div class="hand-count">${count}</div>
              <div class="hand-count-label">${escapeHtml(ptT('labels.handCount'))}</div>
            </button>`;
    })
    .join('');

  grid.querySelectorAll('.student-card').forEach(bindCardInteractions);
}

function resetSession() {
  if (!confirm(ptT('confirm.resetSession'))) return;
  state.students.forEach((name) => {
    state.counts[name] = 0;
  });
  clearUndo();
  save();
  renderTracker();
  showToast(ptT('toast.sessionReset'));
}

function cacheElements() {
  els.btnLanguage = document.getElementById('btn-language');
}

function bindEvents() {
  $('#studentInput').addEventListener('input', () => {
    updateStudentCountLabel();
    save();
  });

  $('#btnStart').addEventListener('click', startTracker);

  $('#btnBack').addEventListener('click', () => {
    const names = parseNames($('#studentInput').value);
    state.students = names.length ? names : state.students;
    $('#studentInput').value = state.students.join('\n');
    updateStudentCountLabel();
    save();
    renderPresets();
    showScreen('settings');
  });

  $('#btnReset').addEventListener('click', resetSession);
  $('#btnUndo').addEventListener('click', undoLast);

  $('#sortQuietFirst').addEventListener('change', (e) => {
    state.sortQuietFirst = e.target.checked;
    save();
    renderTracker();
  });

  $('#presetSelect').addEventListener('change', () => {
    const hasSelection = !!$('#presetSelect').value;
    $('#loadPresetBtn').disabled = !hasSelection;
    $('#deletePresetBtn').disabled = !hasSelection;
  });

  $('#loadPresetBtn').addEventListener('click', loadSelectedPreset);
  $('#savePresetBtn').addEventListener('click', () => saveNewPreset($('#presetNameInput').value));
  $('#updatePresetBtn').addEventListener('click', updateActivePreset);
  $('#deletePresetBtn').addEventListener('click', deleteSelectedPreset);

  $('#presetNameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveNewPreset($('#presetNameInput').value);
    }
  });

  els.btnLanguage.addEventListener('click', async () => {
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
  loadState();
  updatePageTitle();
  updateLanguageButton();
  updateStudentCountLabel();
  renderPresets();
  updateUndoButton();
  bindEvents();
}

boot();
