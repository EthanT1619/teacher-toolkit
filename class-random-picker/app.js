import { initI18n, setLocale, getLocale, t, applyToDOM } from '../shared/i18n.js';

window.crT = (k, p) => t('tool.class-random-picker.' + k, p);

const STORAGE_KEY = 'classRandomPicker';

const state = {
  students: [],
  pickedIds: [],
  history: [],
  lastPickedId: null,
  excludePicked: true,
  presets: [],
  activePresetId: null,
};

const els = {};
let isSpinning = false;
let toastTimer = null;

function updatePageTitle() {
  document.title = '🎲 ' + crT('title');
}

function updateLanguageButton() {
  if (!els.btnLanguage) return;
  els.btnLanguage.textContent =
    getLocale() === 'en' ? crT('actions.switchToKo') : crT('actions.switchToEn');
}

function refreshI18nUI() {
  applyToDOM();
  updatePageTitle();
  updateLanguageButton();
  render();
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function save() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      students: state.students,
      pickedIds: state.pickedIds,
      history: state.history,
      lastPickedId: state.lastPickedId,
      excludePicked: state.excludePicked,
      presets: state.presets,
      activePresetId: state.activePresetId,
    })
  );
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.students)) state.students = data.students;
    if (Array.isArray(data.pickedIds)) state.pickedIds = data.pickedIds;
    if (Array.isArray(data.history)) state.history = data.history;
    if (data.lastPickedId) state.lastPickedId = data.lastPickedId;
    if (typeof data.excludePicked === 'boolean') state.excludePicked = data.excludePicked;
    if (Array.isArray(data.presets)) state.presets = data.presets;
    if (data.activePresetId) state.activePresetId = data.activePresetId;
  } catch {
    /* ignore corrupt data */
  }
}

function getPresetById(id) {
  return state.presets.find((p) => p.id === id);
}

function getPresetByName(name) {
  const n = normalizeName(name).toLowerCase();
  return state.presets.find((p) => p.name.toLowerCase() === n);
}

function cloneStudents(students) {
  return students.map((s) => ({ id: s.id, name: s.name }));
}

function resetPickState() {
  state.pickedIds = [];
  state.history = [];
  state.lastPickedId = null;
  els.pickerZone.classList.remove('winner');
}

function applyPresetStudents(students) {
  state.students = cloneStudents(students);
  resetPickState();
}

function showToast(key, params) {
  els.toast.textContent = crT('toast.' + key, params);
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2500);
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, ' ');
}

function isDuplicateName(name, excludeId = null) {
  const n = normalizeName(name).toLowerCase();
  return state.students.some((s) => s.id !== excludeId && s.name.toLowerCase() === n);
}

function getAvailablePool() {
  if (!state.excludePicked) return [...state.students];
  return state.students.filter((s) => !state.pickedIds.includes(s.id));
}

function getStudentById(id) {
  return state.students.find((s) => s.id === id);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderPresets() {
  const selectedId = els.presetSelect.value;
  els.presetSelect.innerHTML =
    '<option value="">' + crT('preset.selectPlaceholder') + '</option>' +
    state.presets
      .map((p) => {
        const count = p.students.length;
        const selected = p.id === selectedId ? ' selected' : '';
        return (
          '<option value="' +
          p.id +
          '"' +
          selected +
          '>' +
          escapeHtml(p.name) +
          ' (' +
          crT('preset.optionMeta', { count: count }) +
          ')</option>'
        );
      })
      .join('');

  const active = state.activePresetId ? getPresetById(state.activePresetId) : null;
  if (active) {
    els.activePresetLabel.textContent = crT('preset.activeNamed', {
      name: active.name,
      count: active.students.length,
    });
    els.activePresetLabel.classList.remove('muted');
    els.presetNameInput.value = active.name;
  } else {
    els.activePresetLabel.textContent = crT('preset.activeNone');
    els.activePresetLabel.classList.add('muted');
  }

  const hasSelection = !!els.presetSelect.value;
  els.loadPresetBtn.disabled = !hasSelection || isSpinning;
  els.deletePresetBtn.disabled = !hasSelection || isSpinning;
  els.updatePresetBtn.disabled = !state.activePresetId || isSpinning;
}

function saveNewPreset(name) {
  const normalized = normalizeName(name);
  if (!normalized) {
    showToast('presetNameRequired');
    els.presetNameInput.focus();
    return;
  }
  if (state.students.length === 0) {
    showToast('noStudentsToSave');
    return;
  }

  const existing = getPresetByName(normalized);
  if (existing) {
    if (!confirm(crT('confirm.overwritePreset', { name: normalized }))) return;
    existing.students = cloneStudents(state.students);
    existing.updatedAt = new Date().toISOString();
    state.activePresetId = existing.id;
  } else {
    const preset = {
      id: generateId(),
      name: normalized,
      students: cloneStudents(state.students),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.presets.push(preset);
    state.activePresetId = preset.id;
  }

  save();
  render();
  showToast('presetSaved', { name: normalized });
}

function loadSelectedPreset() {
  const id = els.presetSelect.value;
  if (!id) return;
  const preset = getPresetById(id);
  if (!preset) return;

  if (state.students.length > 0 && !state.activePresetId) {
    if (
      !confirm(
        crT('confirm.replaceTempList', {
          count: state.students.length,
          name: preset.name,
        })
      )
    ) {
      return;
    }
  } else if (state.activePresetId && state.activePresetId !== id) {
    const current = getPresetById(state.activePresetId);
    if (
      current &&
      !confirm(
        crT('confirm.switchPreset', {
          from: current.name,
          to: preset.name,
        })
      )
    ) {
      return;
    }
  }

  applyPresetStudents(preset.students);
  state.activePresetId = preset.id;
  save();
  render();
  showToast('presetLoaded', { name: preset.name });
}

function updateActivePreset() {
  const preset = getPresetById(state.activePresetId);
  if (!preset) return;
  if (state.students.length === 0) {
    showToast('noStudentsToSave');
    return;
  }
  if (
    !confirm(
      crT('confirm.updatePreset', {
        name: preset.name,
        count: state.students.length,
      })
    )
  ) {
    return;
  }

  preset.students = cloneStudents(state.students);
  preset.updatedAt = new Date().toISOString();
  save();
  renderPresets();
  showToast('presetUpdated', { name: preset.name });
}

function deleteSelectedPreset() {
  const id = els.presetSelect.value;
  if (!id) return;
  const preset = getPresetById(id);
  if (!preset) return;
  if (!confirm(crT('confirm.deletePreset', { name: preset.name }))) return;

  state.presets = state.presets.filter((p) => p.id !== id);
  if (state.activePresetId === id) state.activePresetId = null;
  els.presetSelect.value = '';
  save();
  render();
  showToast('presetDeleted');
}

function updatePoolStats() {
  const pool = getAvailablePool();
  const total = state.students.length;
  els.poolStats.textContent = state.excludePicked
    ? crT('stats.poolExcluded', { available: pool.length, total: total })
    : crT('stats.poolAllowDup', { total: total });
  els.pickBtn.disabled = isSpinning || pool.length === 0;
}

function renderPickerDisplay() {
  if (state.lastPickedId) {
    const student = getStudentById(state.lastPickedId);
    els.pickerName.textContent = student ? student.name : crT('display.dash');
  } else {
    els.pickerName.textContent =
      state.students.length === 0 ? crT('display.addStudentsFirst') : crT('display.dash');
  }
  els.pickAgainBtn.disabled = isSpinning || state.students.length === 0;
}

function renderHistory() {
  if (state.history.length === 0) {
    els.historyList.innerHTML =
      '<span class="history-empty">' + escapeHtml(crT('empty.history')) + '</span>';
    return;
  }
  els.historyList.innerHTML = state.history
    .slice()
    .reverse()
    .map((entry, i) => {
      const cls = i === 0 ? 'history-chip latest' : 'history-chip';
      return '<span class="' + cls + '">' + escapeHtml(entry.name) + '</span>';
    })
    .join('');
}

function renderStudentList() {
  els.studentListTitle.textContent = crT('labels.studentListCount', {
    count: state.students.length,
  });

  if (state.students.length === 0) {
    els.studentList.innerHTML =
      '<li class="empty-state">' +
      '<div class="emoji">👋</div>' +
      '<p>' +
      escapeHtml(crT('empty.students')) +
      '<br>' +
      escapeHtml(crT('empty.studentsHint')) +
      '</p></li>';
    return;
  }

  els.studentList.innerHTML = state.students
    .map((s, i) => {
      const picked = state.pickedIds.includes(s.id);
      const isLast = s.id === state.lastPickedId;
      return (
        '<li class="student-item' +
        (picked ? ' picked' : '') +
        (isLast ? ' highlight' : '') +
        '" data-id="' +
        s.id +
        '">' +
        '<span class="student-number">' +
        (i + 1) +
        '</span>' +
        '<span class="student-name" data-name="' +
        escapeHtml(s.name) +
        '">' +
        escapeHtml(s.name) +
        '</span>' +
        '<div class="student-actions">' +
        '<button class="btn btn-secondary btn-sm btn-icon edit-btn" title="' +
        escapeHtml(crT('aria.editStudent')) +
        '">✏️</button>' +
        '<button class="btn btn-danger btn-sm btn-icon delete-btn" title="' +
        escapeHtml(crT('aria.deleteStudent')) +
        '">🗑️</button>' +
        '</div></li>'
      );
    })
    .join('');
}

function render() {
  els.excludePicked.checked = state.excludePicked;
  renderPresets();
  renderStudentList();
  renderPickerDisplay();
  renderHistory();
  updatePoolStats();
}

function addStudent(name) {
  const normalized = normalizeName(name);
  if (!normalized) {
    els.formHint.textContent = crT('errors.nameRequired');
    els.nameInput.classList.add('error');
    return false;
  }
  if (isDuplicateName(normalized)) {
    els.formHint.textContent = crT('errors.duplicateName');
    els.nameInput.classList.add('error');
    return false;
  }
  state.students.push({ id: generateId(), name: normalized });
  els.formHint.textContent = '';
  els.nameInput.classList.remove('error');
  els.nameInput.value = '';
  save();
  render();
  showToast('studentAdded', { name: normalized });
  els.nameInput.focus();
  return true;
}

function deleteStudent(id) {
  const student = getStudentById(id);
  if (!student) return;
  if (!confirm(crT('confirm.deleteStudent', { name: student.name }))) return;

  state.students = state.students.filter((s) => s.id !== id);
  state.pickedIds = state.pickedIds.filter((pid) => pid !== id);
  state.history = state.history.filter((h) => h.id !== id);
  if (state.lastPickedId === id) state.lastPickedId = null;

  save();
  render();
  showToast('studentDeleted');
}

function startEdit(id) {
  const item = els.studentList.querySelector('[data-id="' + id + '"]');
  if (!item) return;
  const nameEl = item.querySelector('.student-name');
  const currentName = nameEl.dataset.name;
  nameEl.innerHTML =
    '<input type="text" value="' + escapeHtml(currentName) + '" maxlength="20">';
  const input = nameEl.querySelector('input');
  input.focus();
  input.select();

  function finishEdit(saveEdit) {
    if (saveEdit) {
      const newName = normalizeName(input.value);
      if (!newName) {
        showToast('nameEmpty');
        render();
        return;
      }
      if (isDuplicateName(newName, id)) {
        showToast('duplicateName');
        input.focus();
        return;
      }
      const student = getStudentById(id);
      if (student) {
        const oldName = student.name;
        student.name = newName;
        state.history.forEach((h) => {
          if (h.id === id) h.name = newName;
        });
        save();
        render();
        if (oldName !== newName) showToast('nameUpdated');
      }
    } else {
      render();
    }
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEdit(true);
    }
    if (e.key === 'Escape') finishEdit(false);
  });
  input.addEventListener('blur', () => finishEdit(true));
}

function resetPicked() {
  if (state.pickedIds.length === 0 && !state.lastPickedId) {
    showToast('nothingToReset');
    return;
  }
  if (!confirm(crT('confirm.resetPicked'))) return;
  state.pickedIds = [];
  state.lastPickedId = null;
  els.pickerZone.classList.remove('winner');
  save();
  render();
  showToast('pickReset');
}

function clearAll() {
  if (state.students.length === 0) return;
  if (!confirm(crT('confirm.clearAll', { count: state.students.length }))) return;
  state.students = [];
  state.pickedIds = [];
  state.history = [];
  state.lastPickedId = null;
  save();
  render();
  showToast('allStudentsCleared');
}

function pickRandom() {
  const pool = getAvailablePool();
  if (pool.length === 0) {
    if (state.excludePicked && state.students.length > 0) {
      showToast('allPicked');
    }
    return;
  }

  isSpinning = true;
  els.pickBtn.disabled = true;
  els.pickAgainBtn.disabled = true;
  els.pickerZone.classList.remove('winner');
  els.pickerZone.classList.add('spinning');

  const duration = 1800;
  const interval = 60;
  let elapsed = 0;
  let lastShown = null;

  const spinTimer = setInterval(() => {
    const candidates = pool.filter((s) => s.id !== lastShown?.id || pool.length === 1);
    const random = candidates[Math.floor(Math.random() * candidates.length)];
    lastShown = random;
    els.pickerName.textContent = random.name;
    elapsed += interval;

    els.studentList.querySelectorAll('.student-item').forEach((el) => {
      el.classList.toggle('highlight', el.dataset.id === random.id);
    });

    if (elapsed >= duration) {
      clearInterval(spinTimer);
      finishPick(pool);
    }
  }, interval);
}

function finishPick(pool) {
  const winner = pool[Math.floor(Math.random() * pool.length)];
  state.lastPickedId = winner.id;

  if (state.excludePicked && !state.pickedIds.includes(winner.id)) {
    state.pickedIds.push(winner.id);
  }

  state.history.push({
    id: winner.id,
    name: winner.name,
    time: new Date().toISOString(),
  });

  isSpinning = false;
  els.pickerZone.classList.remove('spinning');
  els.pickerZone.classList.add('winner');
  els.pickerName.textContent = winner.name;

  save();
  render();

  els.studentList.querySelectorAll('.student-item').forEach((el) => {
    el.classList.toggle('highlight', el.dataset.id === winner.id);
  });

  showToast('picked', { name: winner.name });

  if (navigator.vibrate) navigator.vibrate(100);
}

function cacheElements() {
  els.pickerZone = document.getElementById('pickerZone');
  els.pickerName = document.getElementById('pickerName');
  els.pickBtn = document.getElementById('pickBtn');
  els.pickAgainBtn = document.getElementById('pickAgainBtn');
  els.resetPickedBtn = document.getElementById('resetPickedBtn');
  els.excludePicked = document.getElementById('excludePicked');
  els.poolStats = document.getElementById('poolStats');
  els.studentListTitle = document.getElementById('studentListTitle');
  els.addForm = document.getElementById('addForm');
  els.nameInput = document.getElementById('nameInput');
  els.formHint = document.getElementById('formHint');
  els.studentList = document.getElementById('studentList');
  els.clearAllBtn = document.getElementById('clearAllBtn');
  els.historyList = document.getElementById('historyList');
  els.toast = document.getElementById('toast');
  els.activePresetLabel = document.getElementById('activePresetLabel');
  els.presetSelect = document.getElementById('presetSelect');
  els.loadPresetBtn = document.getElementById('loadPresetBtn');
  els.presetNameInput = document.getElementById('presetNameInput');
  els.savePresetBtn = document.getElementById('savePresetBtn');
  els.updatePresetBtn = document.getElementById('updatePresetBtn');
  els.deletePresetBtn = document.getElementById('deletePresetBtn');
  els.btnLanguage = document.getElementById('btn-language');
}

function bindEvents() {
  els.addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addStudent(els.nameInput.value);
  });

  els.nameInput.addEventListener('input', () => {
    els.formHint.textContent = '';
    els.nameInput.classList.remove('error');
  });

  els.pickBtn.addEventListener('click', pickRandom);
  els.pickAgainBtn.addEventListener('click', pickRandom);
  els.resetPickedBtn.addEventListener('click', resetPicked);
  els.clearAllBtn.addEventListener('click', clearAll);

  els.excludePicked.addEventListener('change', () => {
    state.excludePicked = els.excludePicked.checked;
    save();
    updatePoolStats();
  });

  els.presetSelect.addEventListener('change', () => {
    els.loadPresetBtn.disabled = !els.presetSelect.value || isSpinning;
    els.deletePresetBtn.disabled = !els.presetSelect.value || isSpinning;
  });

  els.loadPresetBtn.addEventListener('click', loadSelectedPreset);
  els.savePresetBtn.addEventListener('click', () => saveNewPreset(els.presetNameInput.value));
  els.updatePresetBtn.addEventListener('click', updateActivePreset);
  els.deletePresetBtn.addEventListener('click', deleteSelectedPreset);

  els.presetNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveNewPreset(els.presetNameInput.value);
    }
  });

  els.studentList.addEventListener('click', (e) => {
    const item = e.target.closest('.student-item');
    if (!item) return;
    const id = item.dataset.id;
    if (e.target.closest('.edit-btn')) startEdit(id);
    if (e.target.closest('.delete-btn')) deleteStudent(id);
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
  updatePageTitle();
  updateLanguageButton();
  render();
  bindEvents();
}

boot();
