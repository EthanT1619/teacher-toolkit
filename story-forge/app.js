/* Story Forge — Word Pool MVP */

const STORAGE_KEY = 'story-forge-presets';

const ROUND_PROMPTS = [
  '첫 문장을 만들어 보세요!',
  '이전 문장을 이어서 한 문장 더!',
  '이야기를 마무리할 문장을 만들어 보세요!',
  '다음 장면을 상상해 보세요!',
  '이야기에 반전을 넣어 볼까요?',
];

const $ = (id) => document.getElementById(id);

const state = {
  wordPool: [],
  roundCount: 3,
  minWords: 2,
  currentRound: 0,
  storyLines: [],
  selectedIds: [],
  entries: [],
};

function parseLines(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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

function buildEntries(words) {
  return words.map((text, index) => ({
    id: `w-${index}`,
    text,
  }));
}

function getSelectedEntries() {
  return state.selectedIds
    .map((id) => state.entries.find((entry) => entry.id === id))
    .filter(Boolean);
}

function buildSentenceFromSelection() {
  const words = getSelectedEntries().map((entry) => entry.text);
  if (words.length === 0) return '';
  const body = words.join(' ');
  const first = body.charAt(0).toUpperCase() + body.slice(1);
  return `${first}.`;
}

function getRoundPrompt(roundIndex, totalRounds) {
  if (roundIndex === 0) return ROUND_PROMPTS[0];
  if (roundIndex === totalRounds - 1) return ROUND_PROMPTS[2];
  return ROUND_PROMPTS[1];
}

function renderStorySoFar() {
  const box = $('story-so-far');
  if (state.storyLines.length === 0) {
    box.classList.add('empty');
    box.textContent = '아직 문장이 없습니다.';
    return;
  }

  box.classList.remove('empty');
  box.innerHTML = state.storyLines
    .map((line, index) => `<p class="story-line">${index + 1}. ${line}</p>`)
    .join('');
}

function renderRoundHeader() {
  $('round-label').textContent = `라운드 ${state.currentRound + 1} / ${state.roundCount}`;
  $('round-prompt').textContent = getRoundPrompt(state.currentRound, state.roundCount);
  renderStorySoFar();
}

function renderSentenceStrip() {
  const strip = $('sentence-strip');
  const selected = getSelectedEntries();

  if (selected.length === 0) {
    strip.classList.add('empty');
    strip.innerHTML = '<span class="strip-placeholder">단어 더미에서 골라 보세요</span>';
  } else {
    strip.classList.remove('empty');
    strip.innerHTML = selected
      .map(
        (entry) =>
          `<button type="button" class="strip-chip" data-id="${entry.id}" title="클릭하면 취소">${entry.text}</button>`
      )
      .join('');
  }

  const preview = buildSentenceFromSelection();
  $('preview-sentence').textContent = preview || '';
}

function renderWordPool() {
  const area = $('word-pool');
  const displayOrder = shuffle(state.entries);

  area.innerHTML = '';
  displayOrder.forEach((entry) => {
    const used = state.selectedIds.includes(entry.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `pool-chip${used ? ' used' : ''}`;
    btn.textContent = entry.text;
    btn.disabled = used;
    btn.dataset.id = entry.id;
    btn.title = used ? '이미 사용한 단어' : '클릭해서 문장에 추가';
    btn.addEventListener('click', () => selectWord(entry.id));
    area.appendChild(btn);
  });

  const available = state.entries.length - state.selectedIds.length;
  $('pool-count').textContent = `남은 단어 ${available} / ${state.entries.length}개`;
}

function selectWord(id) {
  if (state.selectedIds.includes(id)) return;
  state.selectedIds.push(id);
  renderSentenceStrip();
  renderWordPool();
  setMessage('단어를 문장에 추가했습니다.', 'info');
}

function removeWord(id) {
  state.selectedIds = state.selectedIds.filter((selectedId) => selectedId !== id);
  renderSentenceStrip();
  renderWordPool();
  setMessage('단어를 다시 더미로 돌렸습니다.', 'info');
}

function clearSentence() {
  state.selectedIds = [];
  renderSentenceStrip();
  renderWordPool();
  setMessage('문장을 비웠습니다.', 'info');
}

function beginRound() {
  state.selectedIds = [];
  renderRoundHeader();
  renderSentenceStrip();
  renderWordPool();
  setMessage('단어 더미에서 골라 문장을 만들어 보세요.', 'info');
}

function submitSentence() {
  const count = state.selectedIds.length;
  if (count < state.minWords) {
    setMessage(`최소 ${state.minWords}개의 단어를 골라 주세요. (현재 ${count}개)`, 'error');
    return;
  }

  const sentence = buildSentenceFromSelection();
  state.storyLines.push(sentence);
  state.currentRound += 1;

  if (state.currentRound >= state.roundCount) {
    showFinalStory();
    return;
  }

  beginRound();
  setMessage(`문장 추가 완료! 다음 라운드로 이어 가세요.`, 'success');
}

function showFinalStory() {
  const box = $('final-story');
  box.innerHTML = state.storyLines.map((line) => `<p>${line}</p>`).join('');
  showPhase('result');
}

function validateSetup() {
  const words = parseLines($('input-pool').value);
  const roundCount = parseInt($('input-rounds').value, 10) || 3;
  const minWords = parseInt($('input-min-words').value, 10) || 2;

  if (words.length < 3) {
    alert('단어 더미에 최소 3개 이상의 단어를 넣어 주세요.');
    return null;
  }
  if (roundCount < 1 || roundCount > 10) {
    alert('라운드 수는 1~10 사이로 설정해 주세요.');
    return null;
  }
  if (minWords < 1 || minWords > words.length) {
    alert('문장 최소 단어 수를 확인해 주세요.');
    return null;
  }

  return { words, roundCount, minWords };
}

function startGame() {
  const setup = validateSetup();
  if (!setup) return;

  state.wordPool = setup.words;
  state.roundCount = setup.roundCount;
  state.minWords = setup.minWords;
  state.currentRound = 0;
  state.storyLines = [];
  state.entries = buildEntries(state.wordPool);
  state.selectedIds = [];

  showPhase('game');
  beginRound();
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
  loadPresets().forEach((preset, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = preset.name;
    select.appendChild(option);
  });
  if ([...select.options].some((opt) => opt.value === current)) {
    select.value = current;
  }
}

function savePreset() {
  const name = $('preset-name').value.trim();
  if (!name) {
    alert('프리셋 이름을 입력해 주세요.');
    return;
  }

  const setup = validateSetup();
  if (!setup) return;

  const presets = loadPresets();
  const existing = presets.findIndex((p) => p.name === name);
  const payload = {
    name,
    pool: setup.words.join('\n'),
    roundCount: setup.roundCount,
    minWords: setup.minWords,
  };

  if (existing >= 0) {
    if (!confirm(`"${name}" 프리셋을 덮어쓸까요?`)) return;
    presets[existing] = payload;
  } else {
    presets.push(payload);
  }

  savePresets(presets);
  refreshPresetSelect();
  $('preset-name').value = '';
  alert(`"${name}" 프리셋을 저장했습니다.`);
}

function loadPreset() {
  const index = parseInt($('preset-select').value, 10);
  if (Number.isNaN(index)) {
    alert('불러올 프리셋을 선택해 주세요.');
    return;
  }

  const preset = loadPresets()[index];
  if (!preset) return;

  $('input-pool').value = preset.pool || '';
  $('input-rounds').value = preset.roundCount || 3;
  $('input-min-words').value = preset.minWords || 2;
  setMessage('', 'info');
  alert(`"${preset.name}" 프리셋을 불러왔습니다.`);
}

function deletePreset() {
  const index = parseInt($('preset-select').value, 10);
  if (Number.isNaN(index)) {
    alert('삭제할 프리셋을 선택해 주세요.');
    return;
  }

  const presets = loadPresets();
  const preset = presets[index];
  if (!preset) return;
  if (!confirm(`"${preset.name}" 프리셋을 삭제할까요?`)) return;

  presets.splice(index, 1);
  savePresets(presets);
  refreshPresetSelect();
  alert('프리셋을 삭제했습니다.');
}

async function copyStory() {
  const text = state.storyLines.join('\n');
  try {
    await navigator.clipboard.writeText(text);
    alert('이야기를 클립보드에 복사했습니다.');
  } catch {
    alert(text);
  }
}

function init() {
  $('start-btn').addEventListener('click', startGame);
  $('submit-sentence-btn').addEventListener('click', submitSentence);
  $('clear-sentence-btn').addEventListener('click', clearSentence);
  $('back-setup-btn').addEventListener('click', () => showPhase('setup'));
  $('back-setup-btn-2').addEventListener('click', () => showPhase('setup'));
  $('play-again-btn').addEventListener('click', startGame);
  $('copy-story-btn').addEventListener('click', copyStory);
  $('save-preset-btn').addEventListener('click', savePreset);
  $('load-preset-btn').addEventListener('click', loadPreset);
  $('delete-preset-btn').addEventListener('click', deletePreset);

  $('sentence-strip').addEventListener('click', (event) => {
    const btn = event.target.closest('.strip-chip');
    if (!btn) return;
    removeWord(btn.dataset.id);
  });

  refreshPresetSelect();
}

init();
