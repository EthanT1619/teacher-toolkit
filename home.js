import { initI18n, setLocale, getLocale, t, applyToDOM } from './shared/i18n.js';

const STORAGE = {
  classes: 'teacherChecklistClasses',
  items: 'teacherChecklistItems',
  state: 'teacherChecklistState',
  currentClassId: 'teacherChecklistCurrentClassId',
};

const DEFAULT_CLASSES = [
  { id: 'class_1', name: '1교시' },
  { id: 'class_2', name: '2교시' },
  { id: 'class_3', name: '3교시' },
  { id: 'class_4', name: '4교시' },
  { id: 'class_5', name: '5교시' },
];

const DEFAULT_ITEMS = [
  { id: 'item_1', label: '교재' },
  { id: 'item_2', label: '유인물' },
  { id: 'item_3', label: '스탬프' },
  { id: 'item_4', label: 'NIE' },
  { id: 'item_5', label: 'Vocab Test' },
];

const MENU_COUNTS = { util: 6, study: 7, activity: 10 };

let checklistClasses = [];
let checklistItemsByClass = {};
let checklistState = {};
let currentClassId = '';

const els = {};

function updatePageMeta() {
  document.title = t('tool.home.title');
  var meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', t('tool.home.metaDescription'));
}

function updateLanguageButton() {
  if (!els.btnLanguage) return;
  els.btnLanguage.textContent =
    getLocale() === 'en'
      ? t('tool.home.language.switchToKo')
      : t('tool.home.language.switchToEn');
}

function applyExternalToolLinks() {
  var url =
    typeof window.MAKEUP_SCHEDULER_SYNC_URL === "string"
      ? window.MAKEUP_SCHEDULER_SYNC_URL
      : "https://ethant1619.github.io/mkup-scheduler-synced/";

  var makeupMenuLink = document.querySelector(
    '.dropdown--util a[data-i18n="tool.makeup-scheduler.title"]'
  );
  if (makeupMenuLink) {
    makeupMenuLink.href = url;
  }

  var makeupOpenBtn = document.querySelector(".makeup-widget__open-btn");
  if (makeupOpenBtn) {
    makeupOpenBtn.href = url;
  }
}

function renderHomeChrome() {
  updatePageMeta();
  updateLanguageButton();

  if (els.utilMenuCount) {
    els.utilMenuCount.textContent = t('tool.home.menu.count', { count: MENU_COUNTS.util });
  }
  if (els.studyMenuCount) {
    els.studyMenuCount.textContent = t('tool.home.menu.count', { count: MENU_COUNTS.study });
  }
  if (els.activityMenuCount) {
    els.activityMenuCount.textContent = t('tool.home.menu.count', { count: MENU_COUNTS.activity });
  }

  applyExternalToolLinks();
}

function refreshI18nUI() {
  applyToDOM();
  renderHomeChrome();
  renderChecklist();
}

function cloneDefaultItems() {
  return DEFAULT_ITEMS.map(function (item) {
    return { id: item.id, label: item.label };
  });
}

function getItemsForClass(classId) {
  return Array.isArray(checklistItemsByClass[classId]) ? checklistItemsByClass[classId] : [];
}

function ensureClassItems(classId) {
  if (!Array.isArray(checklistItemsByClass[classId]) || checklistItemsByClass[classId].length === 0) {
    checklistItemsByClass[classId] = cloneDefaultItems();
  }
}

function generateChecklistId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function loadJson(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return fallback;
    var parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

function saveChecklistClasses() {
  localStorage.setItem(STORAGE.classes, JSON.stringify(checklistClasses));
}

function saveChecklistItems() {
  localStorage.setItem(STORAGE.items, JSON.stringify(checklistItemsByClass));
}

function saveChecklistState() {
  localStorage.setItem(STORAGE.state, JSON.stringify(checklistState));
}

function saveCurrentClassId() {
  localStorage.setItem(STORAGE.currentClassId, currentClassId);
}

function migrateItemsFromStorage(rawItems, classes) {
  if (Array.isArray(rawItems) && rawItems.length > 0) {
    var migrated = {};
    classes.forEach(function (cls) {
      migrated[cls.id] = rawItems.map(function (item) {
        return { id: item.id, label: item.label };
      });
    });
    return migrated;
  }

  if (rawItems && typeof rawItems === 'object' && !Array.isArray(rawItems)) {
    return rawItems;
  }

  var initial = {};
  classes.forEach(function (cls) {
    initial[cls.id] = cloneDefaultItems();
  });
  return initial;
}

function ensureClassState(classId) {
  if (!checklistState[classId]) checklistState[classId] = {};
  getItemsForClass(classId).forEach(function (item) {
    if (typeof checklistState[classId][item.id] !== 'boolean') {
      checklistState[classId][item.id] = false;
    }
  });
}

function pruneChecklistData() {
  var validClassIds = new Set(checklistClasses.map(function (c) {
    return c.id;
  }));

  Object.keys(checklistItemsByClass).forEach(function (classId) {
    if (!validClassIds.has(classId)) delete checklistItemsByClass[classId];
  });

  checklistClasses.forEach(function (cls) {
    ensureClassItems(cls.id);
  });

  Object.keys(checklistState).forEach(function (classId) {
    if (!validClassIds.has(classId)) {
      delete checklistState[classId];
      return;
    }
    var validItemIds = new Set(getItemsForClass(classId).map(function (i) {
      return i.id;
    }));
    Object.keys(checklistState[classId]).forEach(function (itemId) {
      if (!validItemIds.has(itemId)) delete checklistState[classId][itemId];
    });
  });

  checklistClasses.forEach(function (cls) {
    ensureClassState(cls.id);
  });
}

function loadChecklistData() {
  checklistClasses = loadJson(STORAGE.classes, null);
  checklistState = loadJson(STORAGE.state, {});
  currentClassId = localStorage.getItem(STORAGE.currentClassId) || '';

  if (!Array.isArray(checklistClasses) || checklistClasses.length === 0) {
    checklistClasses = DEFAULT_CLASSES.map(function (c) {
      return { id: c.id, name: c.name };
    });
  }

  var rawItems = loadJson(STORAGE.items, null);
  checklistItemsByClass = migrateItemsFromStorage(rawItems, checklistClasses);
  pruneChecklistData();

  if (!checklistClasses.some(function (c) {
    return c.id === currentClassId;
  })) {
    currentClassId = checklistClasses[0].id;
  }
}

function getCurrentClassIndex() {
  return checklistClasses.findIndex(function (c) {
    return c.id === currentClassId;
  });
}

function getCurrentClass() {
  return checklistClasses.find(function (c) {
    return c.id === currentClassId;
  }) || null;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderChecklistItems() {
  var current = getCurrentClass();
  if (!current) {
    els.currentClassName.textContent = '—';
    els.checklistItems.innerHTML =
      '<span class="prep-checklist__empty">' +
      escapeHtml(t('tool.home.checklist.emptyNoClasses')) +
      '</span>';
    els.checklistProgress.textContent = '';
    els.btnPrevClass.disabled = true;
    els.btnNextClass.disabled = true;
    return;
  }

  els.currentClassName.textContent = current.name;
  els.btnPrevClass.disabled = checklistClasses.length <= 1;
  els.btnNextClass.disabled = checklistClasses.length <= 1;

  ensureClassItems(current.id);
  ensureClassState(current.id);
  var classItems = getItemsForClass(current.id);
  var classState = checklistState[current.id];
  var checkedCount = 0;

  els.checklistItems.innerHTML = classItems
    .map(function (item) {
      var checked = !!classState[item.id];
      if (checked) checkedCount += 1;
      return (
        '<label class="prep-checklist__chip">' +
        '<input type="checkbox" data-item-id="' +
        item.id +
        '"' +
        (checked ? ' checked' : '') +
        '>' +
        '<span class="prep-checklist__chip-mark" aria-hidden="true">✓</span>' +
        '<span>' +
        escapeHtml(item.label) +
        '</span>' +
        '</label>'
      );
    })
    .join('');

  if (classItems.length === 0) {
    els.checklistItems.innerHTML =
      '<span class="prep-checklist__empty">' +
      escapeHtml(t('tool.home.checklist.emptyNoItems')) +
      '</span>';
    els.checklistProgress.textContent = '';
    return;
  }

  els.checklistProgress.textContent = t('tool.home.checklist.progress', {
    done: checkedCount,
    total: classItems.length,
  });

  els.checklistItems.querySelectorAll('input[type=checkbox]').forEach(function (input) {
    input.addEventListener('change', function () {
      toggleCheckItem(current.id, input.dataset.itemId, input.checked);
    });
  });
}

function renderChecklist() {
  renderChecklistItems();
  refreshDialogStaticLabels();
}

function refreshDialogStaticLabels() {
  if (els.itemSettingsHint) {
    if (els.itemSettingsDialog && els.itemSettingsDialog.open) {
      var current = getCurrentClass();
      if (current) {
        els.itemSettingsHint.textContent = t('tool.home.checklist.itemSettingsHint', {
          name: current.name,
        });
      }
    } else {
      els.itemSettingsHint.textContent = t('tool.home.checklist.itemSettingsHintClosed');
    }
  }

  els.classSettingsList.querySelectorAll('input[type=text]').forEach(function (input) {
    input.setAttribute('aria-label', t('tool.home.checklist.classNameAria'));
  });
  els.itemSettingsList.querySelectorAll('input[type=text]').forEach(function (input) {
    input.setAttribute('aria-label', t('tool.home.checklist.itemNameAria'));
  });
  els.classSettingsList.querySelectorAll('[data-action=delete-class]').forEach(function (btn) {
    btn.textContent = t('tool.home.checklist.delete');
  });
  els.itemSettingsList.querySelectorAll('[data-action=delete-item]').forEach(function (btn) {
    btn.textContent = t('tool.home.checklist.delete');
  });
}

function switchToPrevClass() {
  if (checklistClasses.length <= 1) return;
  var idx = getCurrentClassIndex();
  var nextIdx = (idx - 1 + checklistClasses.length) % checklistClasses.length;
  currentClassId = checklistClasses[nextIdx].id;
  saveCurrentClassId();
  renderChecklist();
}

function switchToNextClass() {
  if (checklistClasses.length <= 1) return;
  var idx = getCurrentClassIndex();
  var nextIdx = (idx + 1) % checklistClasses.length;
  currentClassId = checklistClasses[nextIdx].id;
  saveCurrentClassId();
  renderChecklist();
}

function toggleCheckItem(classId, itemId, checked) {
  ensureClassState(classId);
  checklistState[classId][itemId] = checked;
  saveChecklistState();
  renderChecklistItems();
}

function resetCurrentClassChecks() {
  var current = getCurrentClass();
  if (!current) return;
  if (!confirm(t('tool.home.checklist.confirmResetCurrent', { name: current.name }))) return;
  ensureClassState(current.id);
  getItemsForClass(current.id).forEach(function (item) {
    checklistState[current.id][item.id] = false;
  });
  saveChecklistState();
  renderChecklist();
}

function resetAllClassChecks() {
  if (!confirm(t('tool.home.checklist.confirmResetAll'))) return;
  checklistClasses.forEach(function (cls) {
    ensureClassState(cls.id);
    getItemsForClass(cls.id).forEach(function (item) {
      checklistState[cls.id][item.id] = false;
    });
  });
  saveChecklistState();
  renderChecklist();
}

function renderClassSettingsList() {
  els.classSettingsList.innerHTML = checklistClasses
    .map(function (cls) {
      return (
        '<div class="prep-checklist-dialog__row" data-class-id="' +
        cls.id +
        '">' +
        '<input type="text" value="' +
        escapeHtml(cls.name) +
        '" maxlength="30" aria-label="' +
        escapeHtml(t('tool.home.checklist.classNameAria')) +
        '">' +
        '<button type="button" class="prep-checklist__btn prep-checklist__btn--danger" data-action="delete-class">' +
        escapeHtml(t('tool.home.checklist.delete')) +
        '</button>' +
        '</div>'
      );
    })
    .join('');

  els.classSettingsList.querySelectorAll('[data-action=delete-class]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var row = btn.closest('[data-class-id]');
      if (!row) return;
      if (checklistClasses.length <= 1) {
        alert(t('tool.home.checklist.alertMinOneClass'));
        return;
      }
      row.remove();
    });
  });
}

function renderItemSettingsList() {
  var current = getCurrentClass();
  if (!current) return;

  ensureClassItems(current.id);
  var classItems = getItemsForClass(current.id);

  els.itemSettingsList.innerHTML = classItems
    .map(function (item) {
      return (
        '<div class="prep-checklist-dialog__row" data-item-id="' +
        item.id +
        '">' +
        '<input type="text" value="' +
        escapeHtml(item.label) +
        '" maxlength="40" aria-label="' +
        escapeHtml(t('tool.home.checklist.itemNameAria')) +
        '">' +
        '<button type="button" class="prep-checklist__btn prep-checklist__btn--danger" data-action="delete-item">' +
        escapeHtml(t('tool.home.checklist.delete')) +
        '</button>' +
        '</div>'
      );
    })
    .join('');

  els.itemSettingsList.querySelectorAll('[data-action=delete-item]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var row = btn.closest('[data-item-id]');
      if (!row) return;
      if (els.itemSettingsList.children.length <= 1) {
        alert(t('tool.home.checklist.alertMinOneItem'));
        return;
      }
      row.remove();
    });
  });
}

function openClassSettingsModal() {
  renderClassSettingsList();
  els.classSettingsDialog.showModal();
}

function openItemSettingsModal() {
  var current = getCurrentClass();
  if (!current) {
    alert(t('tool.home.checklist.alertSelectClassFirst'));
    return;
  }
  if (els.itemSettingsHint) {
    els.itemSettingsHint.textContent = t('tool.home.checklist.itemSettingsHint', {
      name: current.name,
    });
  }
  renderItemSettingsList();
  els.itemSettingsDialog.showModal();
}

function addClassSettingRow() {
  var id = generateChecklistId('class');
  var row = document.createElement('div');
  row.className = 'prep-checklist-dialog__row';
  row.dataset.classId = id;
  row.innerHTML =
    '<input type="text" value="" placeholder="' +
    escapeHtml(t('tool.home.checklist.newClassPlaceholder')) +
    '" maxlength="30" aria-label="' +
    escapeHtml(t('tool.home.checklist.classNameAria')) +
    '">' +
    '<button type="button" class="prep-checklist__btn prep-checklist__btn--danger" data-action="delete-class">' +
    escapeHtml(t('tool.home.checklist.delete')) +
    '</button>';
  row.querySelector('[data-action=delete-class]').addEventListener('click', function () {
    if (els.classSettingsList.children.length <= 1) {
      alert(t('tool.home.checklist.alertMinOneClass'));
      return;
    }
    row.remove();
  });
  els.classSettingsList.appendChild(row);
  row.querySelector('input').focus();
}

function addItemSettingRow() {
  var id = generateChecklistId('item');
  var row = document.createElement('div');
  row.className = 'prep-checklist-dialog__row';
  row.dataset.itemId = id;
  row.innerHTML =
    '<input type="text" value="" placeholder="' +
    escapeHtml(t('tool.home.checklist.newItemPlaceholder')) +
    '" maxlength="40" aria-label="' +
    escapeHtml(t('tool.home.checklist.itemNameAria')) +
    '">' +
    '<button type="button" class="prep-checklist__btn prep-checklist__btn--danger" data-action="delete-item">' +
    escapeHtml(t('tool.home.checklist.delete')) +
    '</button>';
  row.querySelector('[data-action=delete-item]').addEventListener('click', function () {
    if (els.itemSettingsList.children.length <= 1) {
      alert(t('tool.home.checklist.alertMinOneItem'));
      return;
    }
    row.remove();
  });
  els.itemSettingsList.appendChild(row);
  row.querySelector('input').focus();
}

function saveClassSettingsFromModal() {
  var rows = els.classSettingsList.querySelectorAll('.prep-checklist-dialog__row');
  var nextClasses = [];
  var usedNames = new Set();
  var prevClassIds = new Set(
    checklistClasses.map(function (c) {
      return c.id;
    })
  );

  for (var i = 0; i < rows.length; i += 1) {
    var row = rows[i];
    var name = row.querySelector('input').value.trim();
    if (!name) {
      alert(t('tool.home.checklist.alertEmptyClassName'));
      return;
    }
    if (usedNames.has(name)) {
      alert(t('tool.home.checklist.alertDuplicateClassName', { name: name }));
      return;
    }
    usedNames.add(name);
    nextClasses.push({
      id: row.dataset.classId || generateChecklistId('class'),
      name: name,
    });
  }

  var nextClassIds = new Set(
    nextClasses.map(function (c) {
      return c.id;
    })
  );
  prevClassIds.forEach(function (classId) {
    if (!nextClassIds.has(classId)) {
      delete checklistItemsByClass[classId];
      delete checklistState[classId];
    }
  });

  nextClasses.forEach(function (cls) {
    if (!checklistItemsByClass[cls.id]) {
      checklistItemsByClass[cls.id] = cloneDefaultItems();
    }
  });

  checklistClasses = nextClasses;
  pruneChecklistData();
  if (
    !checklistClasses.some(function (c) {
      return c.id === currentClassId;
    })
  ) {
    currentClassId = checklistClasses[0].id;
  }
  saveChecklistClasses();
  saveChecklistItems();
  saveChecklistState();
  saveCurrentClassId();
  els.classSettingsDialog.close();
  renderChecklist();
}

function saveItemSettingsFromModal() {
  var current = getCurrentClass();
  if (!current) return;

  var rows = els.itemSettingsList.querySelectorAll('.prep-checklist-dialog__row');
  var nextItems = [];
  var usedLabels = new Set();

  for (var i = 0; i < rows.length; i += 1) {
    var row = rows[i];
    var label = row.querySelector('input').value.trim();
    if (!label) {
      alert(t('tool.home.checklist.alertEmptyItemName'));
      return;
    }
    if (usedLabels.has(label)) {
      alert(t('tool.home.checklist.alertDuplicateItemLabel', { label: label }));
      return;
    }
    usedLabels.add(label);
    nextItems.push({
      id: row.dataset.itemId || generateChecklistId('item'),
      label: label,
    });
  }

  checklistItemsByClass[current.id] = nextItems;
  pruneChecklistData();
  saveChecklistItems();
  saveChecklistState();
  els.itemSettingsDialog.close();
  renderChecklist();
}

function closeChecklistSettingsMenu() {
  if (!els.checklistSettingsMenu || !els.btnChecklistSettings) return;
  els.checklistSettingsMenu.hidden = true;
  els.btnChecklistSettings.setAttribute('aria-expanded', 'false');
}

function toggleChecklistSettingsMenu() {
  if (!els.checklistSettingsMenu || !els.btnChecklistSettings) return;
  var willOpen = els.checklistSettingsMenu.hidden;
  if (willOpen) {
    els.checklistSettingsMenu.hidden = false;
    els.btnChecklistSettings.setAttribute('aria-expanded', 'true');
  } else {
    closeChecklistSettingsMenu();
  }
}

function bindChecklistEvents() {
  els.btnPrevClass.addEventListener('click', switchToPrevClass);
  els.btnNextClass.addEventListener('click', switchToNextClass);
  els.btnChecklistSettings.addEventListener('click', function (e) {
    e.stopPropagation();
    toggleChecklistSettingsMenu();
  });
  els.checklistSettingsMenu.addEventListener('click', function (e) {
    var item = e.target.closest('[data-action]');
    if (!item) return;
    closeChecklistSettingsMenu();
    var action = item.dataset.action;
    if (action === 'class-settings') openClassSettingsModal();
    else if (action === 'item-settings') openItemSettingsModal();
    else if (action === 'reset-current') resetCurrentClassChecks();
    else if (action === 'reset-all') resetAllClassChecks();
  });
  document.addEventListener('click', function (e) {
    if (!els.checklistSettingsMenu || els.checklistSettingsMenu.hidden) return;
    if (e.target.closest('.prep-checklist__toolbar')) return;
    closeChecklistSettingsMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeChecklistSettingsMenu();
  });
  els.btnAddClass.addEventListener('click', addClassSettingRow);
  els.btnSaveClasses.addEventListener('click', saveClassSettingsFromModal);
  els.btnCloseClassDialog.addEventListener('click', function () {
    els.classSettingsDialog.close();
  });
  els.btnAddItem.addEventListener('click', addItemSettingRow);
  els.btnSaveItems.addEventListener('click', saveItemSettingsFromModal);
  els.btnCloseItemDialog.addEventListener('click', function () {
    els.itemSettingsDialog.close();
  });
}

function cacheElements() {
  els.btnLanguage = document.getElementById('btnLanguage');
  els.utilMenuCount = document.getElementById('utilMenuCount');
  els.studyMenuCount = document.getElementById('studyMenuCount');
  els.activityMenuCount = document.getElementById('activityMenuCount');
  els.currentClassName = document.getElementById('currentClassName');
  els.checklistItems = document.getElementById('checklistItems');
  els.checklistProgress = document.getElementById('checklistProgress');
  els.btnPrevClass = document.getElementById('btnPrevClass');
  els.btnNextClass = document.getElementById('btnNextClass');
  els.btnChecklistSettings = document.getElementById('btnChecklistSettings');
  els.checklistSettingsMenu = document.getElementById('checklistSettingsMenu');
  els.classSettingsDialog = document.getElementById('classSettingsDialog');
  els.itemSettingsDialog = document.getElementById('itemSettingsDialog');
  els.classSettingsList = document.getElementById('classSettingsList');
  els.itemSettingsList = document.getElementById('itemSettingsList');
  els.itemSettingsHint = document.getElementById('itemSettingsHint');
  els.btnAddClass = document.getElementById('btnAddClass');
  els.btnSaveClasses = document.getElementById('btnSaveClasses');
  els.btnCloseClassDialog = document.getElementById('btnCloseClassDialog');
  els.btnAddItem = document.getElementById('btnAddItem');
  els.btnSaveItems = document.getElementById('btnSaveItems');
  els.btnCloseItemDialog = document.getElementById('btnCloseItemDialog');
}

function bindHomeEvents() {
  els.btnLanguage.addEventListener('click', async function () {
    try {
      await setLocale(getLocale() === 'en' ? 'ko' : 'en');
    } catch (error) {
      console.error('Locale switch failed:', error);
    }
  });

  window.addEventListener('toolkit:localechange', refreshI18nUI);
}

function initHelpFabBadge() {
  var badge = document.getElementById('helpNewBadge');
  if (!badge || typeof window.hasUnreadHelpUpdates !== 'function') return;
  if (window.hasUnreadHelpUpdates()) {
    badge.classList.remove('help-fab__badge--hidden');
  }
}

async function boot() {
  cacheElements();
  await initI18n({ applyDom: true });
  renderHomeChrome();
  bindHomeEvents();

  loadChecklistData();
  bindChecklistEvents();
  renderChecklist();

  initHelpFabBadge();
  window.dispatchEvent(new CustomEvent('toolkit:i18n-ready'));
}

boot();
