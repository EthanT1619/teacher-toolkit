import { initI18n, setLocale, getLocale, t, applyToDOM } from '../shared/i18n.js';

window.tmT = (k, p) => t('tool.team-maker.' + k, p);

const STORAGE_KEY = 'classTeamMaker';
const TEAM_COLORS = [
  '#4f46e5',
  '#0891b2',
  '#059669',
  '#d97706',
  '#db2777',
  '#7c3aed',
  '#dc2626',
  '#0d9488',
  '#ca8a04',
  '#6366f1',
];

const state = {
  students: [],
  teams: null,
  assignMode: 'count',
  teamCount: 4,
  teamSize: 5,
  presets: [],
  activePresetId: null,
};

const els = {};
let isAssigning = false;
let toastTimer = null;

function updatePageTitle() {
  document.title = '👥 ' + tmT('title');
}

function updateLanguageButton() {
  if (!els.btnLanguage) return;
  els.btnLanguage.textContent =
    getLocale() === 'en' ? tmT('actions.switchToKo') : tmT('actions.switchToEn');
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
      teams: state.teams,
      assignMode: state.assignMode,
      teamCount: state.teamCount,
      teamSize: state.teamSize,
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
    if (data.teams) state.teams = data.teams;
    if (data.assignMode === 'count' || data.assignMode === 'size') state.assignMode = data.assignMode;
    if (typeof data.teamCount === 'number') state.teamCount = data.teamCount;
    if (typeof data.teamSize === 'number') state.teamSize = data.teamSize;
    if (Array.isArray(data.presets)) state.presets = data.presets;
    if (data.activePresetId) state.activePresetId = data.activePresetId;
  } catch {
    /* ignore corrupt data */
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function distributeEvenly(total, groupCount) {
  const base = Math.floor(total / groupCount);
  const remainder = total % groupCount;
  const sizes = [];
  for (let i = 0; i < groupCount; i++) {
    sizes.push(base + (i < remainder ? 1 : 0));
  }
  return sizes;
}

function resolveTeamPlan() {
  const total = state.students.length;
  if (total === 0) return null;

  if (state.assignMode === 'count') {
    const count = Math.max(2, Math.min(state.teamCount, total));
    const sizes = distributeEvenly(total, count);
    return { groupCount: count, sizes };
  }

  const targetSize = Math.max(2, state.teamSize);
  const groupCount = Math.max(1, Math.ceil(total / targetSize));
  const sizes = distributeEvenly(total, groupCount);
  return { groupCount, sizes };
}

function buildTeams(students) {
  const plan = resolveTeamPlan();
  if (!plan) return null;

  const shuffled = shuffle(students);
  const teams = [];
  let idx = 0;

  for (let i = 0; i < plan.groupCount; i++) {
    const size = plan.sizes[i];
    teams.push({
      id: i + 1,
      name: `Team ${i + 1}`,
      members: shuffled.slice(idx, idx + size),
    });
    idx += size;
  }

  return teams;
}

function formatPreview() {
  const total = state.students.length;
  if (total === 0) {
    return { text: tmT('preview.empty'), warn: false };
  }

  const plan = resolveTeamPlan();
  if (!plan) return { text: '', warn: false };

  const sizeStr = plan.sizes.join(', ');
  const min = Math.min(...plan.sizes);
  const max = Math.max(...plan.sizes);
  const evenNote =
    min === max
      ? tmT('preview.evenFixed', { count: min })
      : tmT('preview.evenRange', { min: min, max: max });

  if (state.assignMode === 'count') {
    return {
      text: tmT('preview.byCount', {
        total: total,
        teams: plan.groupCount,
        sizes: sizeStr,
        evenNote: evenNote,
      }),
      warn: false,
    };
  }

  return {
    text: tmT('preview.bySize', {
      total: total,
      size: state.teamSize,
      teams: plan.groupCount,
      sizes: sizeStr,
      evenNote: evenNote,
    }),
    warn: false,
  };
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

function applyPresetStudents(students) {
  state.students = cloneStudents(students);
  state.teams = null;
}

function showToast(key, params) {
  els.toast.textContent = tmT('toast.' + key, params);
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderPresets() {
  const selectedId = els.presetSelect.value;
  els.presetSelect.innerHTML =
    '<option value="">' + tmT('preset.selectPlaceholder') + '</option>' +
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
          tmT('preset.optionMeta', { count: count }) +
          ')</option>'
        );
      })
      .join('');

  const active = state.activePresetId ? getPresetById(state.activePresetId) : null;
  if (active) {
    els.activePresetLabel.textContent = tmT('preset.activeNamed', {
      name: active.name,
      count: active.students.length,
    });
    els.activePresetLabel.classList.remove('muted');
    els.presetNameInput.value = active.name;
  } else {
    els.activePresetLabel.textContent = tmT('preset.activeNone');
    els.activePresetLabel.classList.add('muted');
  }

  const hasSelection = !!els.presetSelect.value;
  els.loadPresetBtn.disabled = !hasSelection || isAssigning;
  els.deletePresetBtn.disabled = !hasSelection || isAssigning;
  els.updatePresetBtn.disabled = !state.activePresetId || isAssigning;
}

function renderPreview() {
  const preview = formatPreview();
  els.previewBox.textContent = preview.text;
  els.previewBox.classList.toggle('warn', preview.warn);
}

function renderResults() {
  if (isAssigning) return;

  if (!state.teams || state.teams.length === 0) {
    els.resultsZone.className = 'results-zone empty';
    if (state.students.length === 0) {
      els.resultsZone.innerHTML =
        '<div class="emoji">🎯</div><p>' +
        escapeHtml(tmT('results.emptyNoStudents')) +
        '</p>';
    } else {
      els.resultsZone.innerHTML =
        '<div class="emoji">🎯</div><p>' +
        escapeHtml(tmT('results.emptyReady', { count: state.students.length })) +
        '</p>';
    }
    els.reassignBtn.disabled = true;
    els.clearTeamsBtn.disabled = true;
    return;
  }

  els.resultsZone.className = 'results-zone done';
  els.resultsZone.innerHTML =
    '<div class="teams-grid">' +
    state.teams
      .map((team, i) => {
        const color = TEAM_COLORS[i % TEAM_COLORS.length];
        return (
          '<div class="team-card">' +
          '<div class="team-card-header" style="background:' +
          color +
          '">' +
          '<span>' +
          escapeHtml(team.name) +
          '</span>' +
          '<span class="team-card-count">' +
          team.members.length +
          '</span>' +
          '</div>' +
          '<ul class="team-members">' +
          team.members
            .map(
              (m) =>
                '<li class="team-member">' + escapeHtml(m.name) + '</li>'
            )
            .join('') +
          '</ul></div>'
        );
      })
      .join('') +
    '</div>';

  els.reassignBtn.disabled = isAssigning || state.students.length === 0;
  els.clearTeamsBtn.disabled = isAssigning;
}

function renderStudentList() {
  els.studentListTitle.textContent = tmT('labels.studentListCount', {
    count: state.students.length,
  });

  if (state.students.length === 0) {
    els.studentList.innerHTML =
      '<li class="empty-state">' +
      '<div class="emoji">👋</div>' +
      '<p>' +
      escapeHtml(tmT('empty.students')) +
      '<br>' +
      escapeHtml(tmT('empty.studentsHint')) +
      '</p></li>';
    return;
  }

  els.studentList.innerHTML = state.students
    .map(
      (s, i) =>
        '<li class="student-item" data-id="' +
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
        escapeHtml(tmT('aria.editStudent')) +
        '">✏️</button>' +
        '<button class="btn btn-danger btn-sm btn-icon delete-btn" title="' +
        escapeHtml(tmT('aria.deleteStudent')) +
        '">🗑️</button>' +
        '</div></li>'
    )
    .join('');
}

function updateButtons() {
  const canAssign = state.students.length >= 2 && !isAssigning;
  els.assignBtn.disabled = !canAssign;
  if (state.students.length < 2) {
    els.reassignBtn.disabled = true;
  }
}

function renderSettings() {
  els.modeByCount.checked = state.assignMode === 'count';
  els.modeBySize.checked = state.assignMode === 'size';
  els.teamCountInput.value = state.teamCount;
  els.teamSizeInput.value = state.teamSize;

  const byCount = state.assignMode === 'count';
  els.teamCountInput.disabled = !byCount;
  els.teamSizeInput.disabled = byCount;
}

function render() {
  renderSettings();
  renderPresets();
  renderPreview();
  renderStudentList();
  renderResults();
  updateButtons();
}

function addStudent(name) {
  const normalized = normalizeName(name);
  if (!normalized) {
    els.formHint.textContent = tmT('errors.nameRequired');
    els.nameInput.classList.add('error');
    return false;
  }
  if (isDuplicateName(normalized)) {
    els.formHint.textContent = tmT('errors.duplicateName');
    els.nameInput.classList.add('error');
    return false;
  }
  state.students.push({ id: generateId(), name: normalized });
  state.teams = null;
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
  const student = state.students.find((s) => s.id === id);
  if (!student) return;
  if (!confirm(tmT('confirm.deleteStudent', { name: student.name }))) return;

  state.students = state.students.filter((s) => s.id !== id);
  state.teams = null;
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
      const student = state.students.find((s) => s.id === id);
      if (student) {
        student.name = newName;
        if (state.teams) {
          state.teams.forEach((team) => {
            team.members.forEach((m) => {
              if (m.id === id) m.name = newName;
            });
          });
        }
        save();
        render();
        showToast('nameUpdated');
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

function clearAll() {
  if (state.students.length === 0) return;
  if (!confirm(tmT('confirm.clearAll', { count: state.students.length }))) return;
  state.students = [];
  state.teams = null;
  save();
  render();
  showToast('allStudentsCleared');
}

function clearTeams() {
  if (!state.teams) {
    showToast('noResultToClear');
    return;
  }
  if (!confirm(tmT('confirm.clearTeams'))) return;
  state.teams = null;
  save();
  render();
  showToast('resultCleared');
}

function assignTeams() {
  if (state.students.length < 2) {
    showToast('needTwoStudents');
    return;
  }

  isAssigning = true;
  els.assignBtn.disabled = true;
  els.reassignBtn.disabled = true;
  els.clearTeamsBtn.disabled = true;

  els.resultsZone.className = 'results-zone forming';
  els.resultsZone.innerHTML =
    '<div class="forming-text">' + escapeHtml(tmT('results.forming')) + '</div>';

  const duration = 1200;
  const interval = 80;
  let elapsed = 0;
  const names = state.students.map((s) => s.name);

  const spinTimer = setInterval(() => {
    const randomName = names[Math.floor(Math.random() * names.length)];
    els.resultsZone.innerHTML =
      '<div class="forming-text">' + escapeHtml(randomName) + '</div>';
    elapsed += interval;

    if (elapsed >= duration) {
      clearInterval(spinTimer);
      finishAssign();
    }
  }, interval);
}

function finishAssign() {
  state.teams = buildTeams(state.students);
  isAssigning = false;

  save();
  render();

  const plan = resolveTeamPlan();
  const sizeInfo = plan.sizes.join(', ');
  showToast('teamsAssigned', { count: plan.groupCount, sizes: sizeInfo });

  if (navigator.vibrate) navigator.vibrate(100);
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
    if (!confirm(tmT('confirm.overwritePreset', { name: normalized }))) return;
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
        tmT('confirm.replaceTempList', {
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
        tmT('confirm.switchPreset', {
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
      tmT('confirm.updatePreset', {
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
  if (!confirm(tmT('confirm.deletePreset', { name: preset.name }))) return;

  state.presets = state.presets.filter((p) => p.id !== id);
  if (state.activePresetId === id) state.activePresetId = null;
  els.presetSelect.value = '';
  save();
  render();
  showToast('presetDeleted');
}

function cacheElements() {
  els.resultsZone = document.getElementById('resultsZone');
  els.assignBtn = document.getElementById('assignBtn');
  els.reassignBtn = document.getElementById('reassignBtn');
  els.clearTeamsBtn = document.getElementById('clearTeamsBtn');
  els.modeByCount = document.getElementById('modeByCount');
  els.modeBySize = document.getElementById('modeBySize');
  els.teamCountInput = document.getElementById('teamCountInput');
  els.teamSizeInput = document.getElementById('teamSizeInput');
  els.previewBox = document.getElementById('previewBox');
  els.studentListTitle = document.getElementById('studentListTitle');
  els.addForm = document.getElementById('addForm');
  els.nameInput = document.getElementById('nameInput');
  els.formHint = document.getElementById('formHint');
  els.studentList = document.getElementById('studentList');
  els.clearAllBtn = document.getElementById('clearAllBtn');
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

  els.assignBtn.addEventListener('click', assignTeams);
  els.reassignBtn.addEventListener('click', assignTeams);
  els.clearTeamsBtn.addEventListener('click', clearTeams);
  els.clearAllBtn.addEventListener('click', clearAll);

  els.modeByCount.addEventListener('change', () => {
    if (els.modeByCount.checked) {
      state.assignMode = 'count';
      save();
      render();
    }
  });

  els.modeBySize.addEventListener('change', () => {
    if (els.modeBySize.checked) {
      state.assignMode = 'size';
      save();
      render();
    }
  });

  els.teamCountInput.addEventListener('change', () => {
    state.teamCount = Math.max(2, Math.min(20, parseInt(els.teamCountInput.value, 10) || 2));
    els.teamCountInput.value = state.teamCount;
    state.teams = null;
    save();
    render();
  });

  els.teamSizeInput.addEventListener('change', () => {
    state.teamSize = Math.max(2, Math.min(15, parseInt(els.teamSizeInput.value, 10) || 2));
    els.teamSizeInput.value = state.teamSize;
    state.teams = null;
    save();
    render();
  });

  els.presetSelect.addEventListener('change', () => {
    els.loadPresetBtn.disabled = !els.presetSelect.value || isAssigning;
    els.deletePresetBtn.disabled = !els.presetSelect.value || isAssigning;
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
