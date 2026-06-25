/* Sentence Kitchen — MVP */

const STORAGE_KEY = 'sentence-kitchen-presets';

const BIN_META = {
  subject: { label: '주어', short: 'S' },
  verb: { label: '동사', short: 'V' },
  object: { label: '목적어', short: 'O' },
  time: { label: '시간', short: 'Time' },
  reason: { label: '이유', short: 'Because' },
};

const SLOT_ORDER = ['subject', 'verb', 'object', 'time', 'reason'];

const ORDER_TYPES = [
  {
    id: 'sv',
    label: 'S + V',
    required: ['subject', 'verb'],
    bonus: [],
    desc: '주어와 동사를 골라 간단한 문장을 만드세요.',
  },
  {
    id: 'svo',
    label: 'S + V + O',
    required: ['subject', 'verb', 'object'],
    bonus: [],
    desc: '주어, 동사, 목적어를 모두 넣어 문장을 완성하세요.',
  },
  {
    id: 'svot',
    label: 'S + V + O + Time',
    required: ['subject', 'verb', 'object'],
    bonus: ['time'],
    desc: 'SVO 문장을 만든 뒤 시간 표현을 넣으면 보너스!',
  },
  {
    id: 'svor',
    label: 'S + V + O + Because',
    required: ['subject', 'verb', 'object'],
    bonus: ['reason'],
    desc: 'SVO 문장에 because 절을 추가하면 보너스!',
  },
  {
    id: 'svotr',
    label: 'S + V + O + Time + Because',
    required: ['subject', 'verb', 'object'],
    bonus: ['time', 'reason'],
    desc: 'SVO + 시간 + 이유까지 넣으면 최고 점수!',
  },
];

const $ = (id) => document.getElementById(id);

const state = {
  bins: {},
  enabledOrderIds: [],
  currentOrder: null,
  selection: {},
  totalScore: 0,
  orderCount: 0,
  submitted: false,
};

function parseLines(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function getBinsFromInputs() {
  return {
    subject: parseLines($('input-subject').value),
    verb: parseLines($('input-verb').value),
    object: parseLines($('input-object').value),
    time: parseLines($('input-time').value),
    reason: parseLines($('input-reason').value),
  };
}

function setInputsFromBins(bins) {
  $('input-subject').value = (bins.subject || []).join('\n');
  $('input-verb').value = (bins.verb || []).join('\n');
  $('input-object').value = (bins.object || []).join('\n');
  $('input-time').value = (bins.time || []).join('\n');
  $('input-reason').value = (bins.reason || []).join('\n');
}

function showPhase(name) {
  document.querySelectorAll('.phase').forEach((el) => el.classList.remove('active'));
  $(`phase-${name}`).classList.add('active');
}

function setMessage(text, type = 'info') {
  const el = $('game-message');
  el.textContent = text;
  el.className = `game-message ${type}`;
}

function emptySelection() {
  return {
    subject: null,
    verb: null,
    object: null,
    time: null,
    reason: null,
  };
}

function getActiveSlots(order) {
  const slots = [...order.required];
  order.bonus.forEach((slot) => {
    if (!slots.includes(slot)) slots.push(slot);
  });
  return SLOT_ORDER.filter((slot) => slots.includes(slot));
}

function buildSentence(selection) {
  const parts = SLOT_ORDER.map((slot) => selection[slot]).filter(Boolean);
  if (parts.length === 0) return '';
  return `${parts.join(' ')}.`;
}

function validateSelection(selection, order) {
  const missing = order.required.filter((slot) => !selection[slot]);
  if (missing.length > 0) {
    const labels = missing.map((slot) => BIN_META[slot].label).join(', ');
    return { ok: false, message: `${labels} 칸을 채워주세요.` };
  }
  return { ok: true };
}

function calculateScore(selection, order) {
  let score = 20;
  order.required.forEach((slot) => {
    if (selection[slot]) score += 10;
  });
  order.bonus.forEach((slot) => {
    if (selection[slot]) score += 10;
  });
  return score;
}

function pickRandomOrder() {
  const pool = ORDER_TYPES.filter((order) => state.enabledOrderIds.includes(order.id));
  return pool[Math.floor(Math.random() * pool.length)];
}

function renderOrderCheckboxes() {
  const container = $('order-checkboxes');
  container.innerHTML = '';
  ORDER_TYPES.forEach((order) => {
    const label = document.createElement('label');
    label.className = 'order-check';
    const checked = order.id === 'svo' ? 'checked' : '';
    label.innerHTML = `<input type="checkbox" value="${order.id}" ${checked}> ${order.label}`;
    container.appendChild(label);
  });
}

function getEnabledOrderIds() {
  return [...document.querySelectorAll('#order-checkboxes input:checked')].map((el) => el.value);
}

function validateSetup() {
  const bins = getBinsFromInputs();
  const enabled = getEnabledOrderIds();

  if (enabled.length === 0) {
    alert('주문서를 하나 이상 선택해주세요.');
    return null;
  }

  const needsSubject = enabled.some((id) => ORDER_TYPES.find((o) => o.id === id).required.includes('subject'));
  const needsVerb = enabled.some((id) => ORDER_TYPES.find((o) => o.id === id).required.includes('verb'));
  const needsObject = enabled.some((id) => ORDER_TYPES.find((o) => o.id === id).required.includes('object'));

  if (needsSubject && bins.subject.length === 0) {
    alert('주어 재료가 필요합니다.');
    return null;
  }
  if (needsVerb && bins.verb.length === 0) {
    alert('동사 재료가 필요합니다.');
    return null;
  }
  if (needsObject && bins.object.length === 0) {
    alert('목적어 재료가 필요합니다.');
    return null;
  }

  return { bins, enabledOrderIds: enabled };
}

function renderOrderHeader() {
  const order = state.currentOrder;
  $('order-title').textContent = order.label;
  $('order-desc').textContent = order.desc;
  $('total-score').textContent = state.totalScore;
  $('order-count').textContent = state.orderCount;
}

function renderAssemblyLine() {
  const order = state.currentOrder;
  const line = $('assembly-line');
  line.innerHTML = '';
  const activeSlots = getActiveSlots(order);

  activeSlots.forEach((slot) => {
    const isRequired = order.required.includes(slot);
    const value = state.selection[slot];
    const chip = document.createElement('div');
    chip.className = 'slot-chip';
    if (value) chip.classList.add('filled');
    else if (isRequired) chip.classList.add('required-empty');

    const typeSpan = document.createElement('span');
    typeSpan.className = 'slot-type';
    typeSpan.textContent = `${BIN_META[slot].label}${isRequired ? '' : ' (보너스)'}`;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'slot-value';
    if (value) {
      valueSpan.textContent = value;
    } else {
      valueSpan.innerHTML = '<span class="slot-placeholder">—</span>';
    }

    chip.append(typeSpan, valueSpan);
    line.appendChild(chip);
  });

  const sentence = buildSentence(state.selection);
  $('preview-sentence').textContent = sentence || '재료를 골라 문장을 조립하세요.';
}

function renderBins() {
  const order = state.currentOrder;
  const area = $('bins-area');
  area.innerHTML = '';
  const activeSlots = getActiveSlots(order);

  activeSlots.forEach((slot) => {
    const items = state.bins[slot] || [];
    const bin = document.createElement('div');
    bin.className = 'bin';
    if (order.required.includes(slot)) bin.classList.add('required');
    if (order.bonus.includes(slot)) bin.classList.add('bonus');
    if (items.length === 0) bin.classList.add('disabled');

    bin.innerHTML = `<p class="bin-title">${BIN_META[slot].label}</p><div class="bin-items"></div>`;
    const itemsEl = bin.querySelector('.bin-items');

    items.forEach((word) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bin-item';
      btn.textContent = word;
      if (state.selection[slot] === word) btn.classList.add('selected');
      btn.addEventListener('click', () => selectItem(slot, word));
      itemsEl.appendChild(btn);
    });

    area.appendChild(bin);
  });
}

function selectItem(slot, word) {
  if (state.submitted) return;
  state.selection[slot] = state.selection[slot] === word ? null : word;
  renderAssemblyLine();
  renderBins();
  setMessage('재료를 선택했습니다.', 'info');
}

function resetSelection() {
  state.selection = emptySelection();
  state.submitted = false;
  $('submit-btn').disabled = false;
  $('next-order-btn').disabled = true;
  renderAssemblyLine();
  renderBins();
  setMessage('선택을 초기화했습니다.', 'info');
}

function startNewOrder() {
  state.currentOrder = pickRandomOrder();
  state.selection = emptySelection();
  state.submitted = false;
  $('submit-btn').disabled = false;
  $('next-order-btn').disabled = true;
  renderOrderHeader();
  renderAssemblyLine();
  renderBins();
  setMessage(`새 주문: ${state.currentOrder.label}`, 'info');
}

function submitOrder() {
  if (state.submitted) return;

  const result = validateSelection(state.selection, state.currentOrder);
  if (!result.ok) {
    setMessage(result.message, 'error');
    return;
  }

  const score = calculateScore(state.selection, state.currentOrder);
  const sentence = buildSentence(state.selection);
  state.totalScore += score;
  state.orderCount += 1;
  state.submitted = true;

  $('submit-btn').disabled = true;
  $('next-order-btn').disabled = false;
  renderOrderHeader();

  const bonusParts = state.currentOrder.bonus.filter((slot) => state.selection[slot]);
  const bonusText = bonusParts.length > 0 ? ` (보너스 +${bonusParts.length * 10})` : '';
  setMessage(`출고 완료! +${score}점${bonusText} — ${sentence}`, 'success');
}

function startGame() {
  const setup = validateSetup();
  if (!setup) return;

  state.bins = setup.bins;
  state.enabledOrderIds = setup.enabledOrderIds;
  state.totalScore = 0;
  state.orderCount = 0;
  showPhase('game');
  startNewOrder();
}

function loadPresets() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function savePresets(presets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function refreshPresetSelect() {
  const select = $('preset-select');
  const current = select.value;
  select.innerHTML = '<option value="">— 불러올 프리셋 선택 —</option>';
  loadPresets().forEach((preset) => {
    const opt = document.createElement('option');
    opt.value = preset.name;
    opt.textContent = preset.name;
    select.appendChild(opt);
  });
  if (current && [...select.options].some((o) => o.value === current)) {
    select.value = current;
  }
}

function savePreset() {
  const name = $('preset-name').value.trim();
  if (!name) {
    alert('프리셋 이름을 입력해주세요.');
    return;
  }

  const preset = {
    name,
    bins: getBinsFromInputs(),
    enabledOrderIds: getEnabledOrderIds(),
  };

  const presets = loadPresets().filter((p) => p.name !== name);
  presets.push(preset);
  savePresets(presets);
  refreshPresetSelect();
  $('preset-name').value = name;
  $('preset-select').value = name;
  alert(`"${name}" 프리셋을 저장했습니다.`);
}

function loadPreset() {
  const name = $('preset-select').value;
  if (!name) {
    alert('불러올 프리셋을 선택해주세요.');
    return;
  }

  const preset = loadPresets().find((p) => p.name === name);
  if (!preset) {
    alert('프리셋을 찾을 수 없습니다.');
    refreshPresetSelect();
    return;
  }

  setInputsFromBins(preset.bins);
  document.querySelectorAll('#order-checkboxes input').forEach((input) => {
    input.checked = (preset.enabledOrderIds || []).includes(input.value);
  });
  $('preset-name').value = preset.name;
  alert(`"${name}" 프리셋을 불러왔습니다.`);
}

function deletePreset() {
  const name = $('preset-select').value;
  if (!name) {
    alert('삭제할 프리셋을 선택해주세요.');
    return;
  }
  if (!confirm(`"${name}" 프리셋을 삭제할까요?`)) return;

  const presets = loadPresets().filter((p) => p.name !== name);
  savePresets(presets);
  refreshPresetSelect();
  $('preset-name').value = '';
  alert('삭제했습니다.');
}

function initDefaults() {
  if (!$('input-subject').value.trim()) {
    setInputsFromBins({
      subject: ['I', 'Kevin', 'The teacher', 'Steve'],
      verb: ['eat', 'eats', 'likes', 'finds', 'throws'],
      object: ['rice', 'a book', 'bread', 'the ball'],
      time: ['after school', 'every day', 'in the morning'],
      reason: ['because he is hungry', 'because she likes it', 'because it is fun'],
    });
  }
}

function bindEvents() {
  $('start-btn').addEventListener('click', startGame);
  $('submit-btn').addEventListener('click', submitOrder);
  $('next-order-btn').addEventListener('click', startNewOrder);
  $('reset-selection-btn').addEventListener('click', resetSelection);
  $('back-setup-btn').addEventListener('click', () => showPhase('setup'));
  $('save-preset-btn').addEventListener('click', savePreset);
  $('load-preset-btn').addEventListener('click', loadPreset);
  $('delete-preset-btn').addEventListener('click', deletePreset);
}

function showBuildMeta() {
  const now = new Date();
  const formatted = now.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  $('build-meta').textContent = `v0.1 MVP · 작업 완료 ${formatted} · 바트 선택 · 주문서 · 출고 · 프리셋 저장`;
}

function init() {
  renderOrderCheckboxes();
  initDefaults();
  refreshPresetSelect();
  bindEvents();
  showBuildMeta();
}

init();
