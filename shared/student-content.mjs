/**
 * Student content contract.
 * Manifest metadata is separate from each app's runtime JSON.
 * Curriculum is not cached in localStorage.
 */

export const STUDENT_PLAYGROUND_HREF = '../../student-playground/index.html';

export const STUDENT_COPY = {
  loading: '연습 문제를 불러오고 있어요...',
  empty: '아직 준비된 연습 문제가 없어요.',
  error: '연습 문제를 불러오지 못했어요.\n선생님께 알려 주세요.',
  soon: '준비 중',
  start: 'Start Practice',
  levels: 'Level',
  lessons: 'Lesson',
};

export const WH_TYPES = ['who', 'what', 'when', 'where', 'why', 'how'];

export const GRAMMAR_ACTIVITY_TYPES = [
  'identify',
  'choose',
  'check-fix',
  'fill',
  'transform',
  'build',
];

/** activityType -> engine ids the current Grammar Checkpoint can run. */
export const GRAMMAR_RUNNABLE_ENGINES = {
  'check-fix': ['sva'],
};

export function isStudentEntry(search) {
  const params = new URLSearchParams(search == null ? '' : search);
  return params.get('entry') === 'student';
}

export function validateManifest(data, checkPack) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return ['manifest must be an object'];
  }
  if (data.version !== 1) errors.push('version must be 1');
  if (!Array.isArray(data.levels)) return errors.concat('levels must be an array');

  const levelIds = new Set();
  const packIds = new Set();

  data.levels.forEach((level, levelIndex) => {
    if (!level || typeof level !== 'object') {
      errors.push(`levels[${levelIndex}] must be an object`);
      return;
    }
    if (!level.id || typeof level.id !== 'string') {
      errors.push(`levels[${levelIndex}].id is required`);
    } else if (levelIds.has(level.id)) {
      errors.push(`duplicate level id ${level.id}`);
    } else {
      levelIds.add(level.id);
    }
    if (!Array.isArray(level.packs)) {
      errors.push(`level ${level.id || levelIndex} packs must be an array`);
      return;
    }
    level.packs.forEach((pack) => {
      errors.push(...validatePackMeta(pack, packIds));
      if (typeof checkPack === 'function') {
        checkPack(pack).forEach((message) => {
          errors.push(`${pack && pack.id ? pack.id : 'pack'}: ${message}`);
        });
      }
    });
  });

  return errors;
}

function validatePackMeta(pack, packIds) {
  const errors = [];
  if (!pack || typeof pack !== 'object') return ['pack must be an object'];
  if (!pack.id || typeof pack.id !== 'string') {
    errors.push('pack id is required');
  } else if (packIds.has(pack.id)) {
    errors.push(`duplicate pack id ${pack.id}`);
  } else {
    packIds.add(pack.id);
  }
  if (typeof pack.title !== 'string' || pack.title.trim() === '') {
    errors.push(`${pack.id || 'pack'} title is required`);
  }
  if (pack.status !== 'available' && pack.status !== 'coming-soon') {
    errors.push(`${pack.id || 'pack'} status must be available or coming-soon`);
  }
  if (pack.status === 'available' && (typeof pack.file !== 'string' || pack.file.trim() === '')) {
    errors.push(`${pack.id || 'pack'} available pack requires file`);
  }
  return errors;
}

export function validateWhPack(pack) {
  const errors = [];
  if (!pack || !Array.isArray(pack.questions) || pack.questions.length === 0) {
    return ['questions must be a non-empty array'];
  }
  const ids = new Set();
  pack.questions.forEach((question, index) => {
    const label = `questions[${index}]`;
    if (!question || typeof question !== 'object') {
      errors.push(`${label} must be an object`);
      return;
    }
    if (!question.id || typeof question.id !== 'string') {
      errors.push(`${label} id is required`);
    } else if (ids.has(question.id)) {
      errors.push(`duplicate question id ${question.id}`);
    } else {
      ids.add(question.id);
    }
    const whType = typeof question.whType === 'string' ? question.whType.toLowerCase() : '';
    if (!WH_TYPES.includes(whType)) errors.push(`${label} whType is invalid`);
    if (typeof question.sentence !== 'string' || question.sentence.trim() === '') {
      errors.push(`${label} sentence is required`);
    }
    if (question.segments != null) {
      errors.push(...validateSegments(question.segments, label));
    }
  });
  return errors;
}

function validateSegments(segments, label) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return [`${label} segments must be a non-empty array`];
  }
  const errors = [];
  segments.forEach((segment, index) => {
    if (!segment || typeof segment !== 'object') {
      errors.push(`${label} segments[${index}] must be an object`);
      return;
    }
    if (typeof segment.text !== 'string') {
      errors.push(`${label} segments[${index}].text must be a string`);
    }
    if (typeof segment.highlight !== 'boolean') {
      errors.push(`${label} segments[${index}].highlight must be a boolean`);
    }
  });
  return errors;
}

export function whQuestionsForEngine(pack) {
  return pack.questions.map((question) => {
    const raw = question.whType.toLowerCase();
    const category = raw.charAt(0).toUpperCase() + raw.slice(1);
    const card = { category, sentence: question.sentence.trim() };
    if (Array.isArray(question.segments)) card.segments = question.segments;
    return card;
  });
}

export function validateStoryPack(pack) {
  const errors = [];
  if (!pack || !Array.isArray(pack.words)) return ['words must be an array'];
  const words = pack.words.filter((word) => typeof word === 'string' && word.trim() !== '');
  if (words.length !== pack.words.length) errors.push('words must be non-empty strings');
  if (words.length < 3) errors.push('words need at least 3 items');
  if (!Number.isInteger(pack.roundCount) || pack.roundCount < 1 || pack.roundCount > 10) {
    errors.push('roundCount must be an integer from 1 to 10');
  }
  if (!Number.isInteger(pack.minWords) || pack.minWords < 1 || pack.minWords > words.length) {
    errors.push('minWords must be an integer within the word pool');
  }
  return errors;
}

export function validateKitchenPack(pack) {
  const errors = [];
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) return ['pack must be an object'];
  if (pack.activityType != null && pack.activityType !== 'recipe') {
    errors.push('activityType must be recipe');
  }
  if (pack.contentVersion != null && pack.contentVersion !== 1) {
    errors.push('unsupported contentVersion');
  }
  if (pack.content != null && (typeof pack.content !== 'object' || Array.isArray(pack.content))) {
    errors.push('content must be an object');
  }
  return errors;
}

/** Recipe runtime is intentionally not connected to the teacher 5-bin setup. */
export function kitchenCanRun() {
  return false;
}

export function validateGrammarPack(pack) {
  const errors = [];
  if (!pack || typeof pack !== 'object') return ['pack must be an object'];
  if (!GRAMMAR_ACTIVITY_TYPES.includes(pack.activityType)) {
    errors.push('activityType is not a known value');
  }
  if (pack.status === 'available' || pack.engine != null) {
    const engines = GRAMMAR_RUNNABLE_ENGINES[pack.activityType] || [];
    if (pack.engine != null && !engines.includes(pack.engine)) {
      errors.push('engine is not runnable for this activityType');
    }
  }
  return errors;
}

export function grammarCanRun(pack) {
  if (!pack) return false;
  const engines = GRAMMAR_RUNNABLE_ENGINES[pack.activityType] || [];
  return engines.includes(pack.engine);
}

export function grammarManifestPack(pack) {
  const errors = [];
  if (!pack || !GRAMMAR_ACTIVITY_TYPES.includes(pack.activityType)) {
    errors.push('activityType is not a known value');
  }
  if (pack && pack.status === 'available' && pack.activityType !== 'check-fix') {
    errors.push('this activityType cannot be available on the current engine');
  }
  return errors;
}

export function kitchenManifestPack(pack) {
  if (pack && pack.activityType != null && pack.activityType !== 'recipe') {
    return ['activityType must be recipe'];
  }
  if (pack && pack.status === 'available') {
    return ['recipe runtime is not connected yet'];
  }
  return [];
}

export function createContentSession() {
  const cache = new Map();
  return {
    async loadManifest(contentBase) {
      const url = joinBase(contentBase, 'manifest.json');
      const response = await fetch(url);
      if (!response.ok) throw new Error(`manifest ${response.status}`);
      return response.json();
    },
    async loadPack(contentBase, file) {
      if (cache.has(file)) return cache.get(file);
      const response = await fetch(joinBase(contentBase, file));
      if (!response.ok) throw new Error(`pack ${response.status}`);
      const data = await response.json();
      cache.set(file, data);
      return data;
    },
  };
}

function joinBase(contentBase, file) {
  const base = contentBase.endsWith('/') ? contentBase : `${contentBase}/`;
  return `${base}${file}`;
}

export function mountStudentSelector(root, options) {
  const session = createContentSession();
  const surface = document.createElement('section');
  surface.className = 'student-surface';
  surface.setAttribute('aria-label', options.title);

  const home = document.createElement('a');
  home.className = 'student-home-link';
  home.href = options.playgroundHref || STUDENT_PLAYGROUND_HREF;
  home.textContent = '← Student Playground';
  document.body.appendChild(home);

  const title = document.createElement('h1');
  title.className = 'student-app-title';
  title.textContent = options.title;

  const description = document.createElement('p');
  description.className = 'student-app-desc';
  description.textContent = options.description;

  const status = document.createElement('p');
  status.className = 'student-status';
  status.setAttribute('role', 'status');

  const levelLabel = document.createElement('p');
  levelLabel.className = 'student-kicker';
  levelLabel.textContent = STUDENT_COPY.levels;

  const levelsEl = document.createElement('div');
  levelsEl.className = 'student-levels';

  const lessonLabel = document.createElement('p');
  lessonLabel.className = 'student-kicker';
  lessonLabel.textContent = STUDENT_COPY.lessons;

  const packsEl = document.createElement('div');
  packsEl.className = 'student-packs';

  const start = document.createElement('button');
  start.type = 'button';
  start.className = 'student-start';
  start.textContent = STUDENT_COPY.start;
  start.disabled = true;

  surface.append(title, description, status, levelLabel, levelsEl, lessonLabel, packsEl, start);
  root.replaceChildren(surface);

  let manifest = null;
  let activeLevel = null;
  let selectedPack = null;
  let readyPayload = null;

  function setStatus(message) {
    status.textContent = message || '';
  }

  function showSelector() {
    document.documentElement.classList.add('student-picking');
  }

  function hideSelector() {
    document.documentElement.classList.remove('student-picking');
  }

  function renderLevels() {
    levelsEl.replaceChildren();
    (manifest.levels || []).forEach((level) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'student-level';
      button.textContent = level.label || level.id;
      button.setAttribute('aria-pressed', String(level === activeLevel));
      if (level === activeLevel) button.classList.add('is-selected');
      button.addEventListener('click', () => {
        activeLevel = level;
        selectedPack = null;
        readyPayload = null;
        start.disabled = true;
        renderLevels();
        renderPacks();
      });
      levelsEl.appendChild(button);
    });
  }

  function renderPacks() {
    packsEl.replaceChildren();
    const packs = activeLevel ? activeLevel.packs || [] : [];
    if (packs.length === 0) {
      setStatus(STUDENT_COPY.empty);
      return;
    }
    packs.forEach((pack) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'student-pack';
      button.setAttribute('aria-pressed', String(pack === selectedPack));
      if (pack === selectedPack) button.classList.add('is-selected');

      const name = document.createElement('span');
      name.className = 'student-pack-title';
      name.textContent = pack.title;

      button.appendChild(name);
      if (pack.subtitle) {
        const sub = document.createElement('span');
        sub.className = 'student-pack-sub';
        sub.textContent = pack.subtitle;
        button.appendChild(sub);
      }
      if (pack.status === 'coming-soon') {
        const badge = document.createElement('span');
        badge.className = 'student-badge';
        badge.textContent = STUDENT_COPY.soon;
        button.appendChild(badge);
      }
      button.addEventListener('click', () => selectPack(pack));
      packsEl.appendChild(button);
    });
  }

  async function selectPack(pack) {
    selectedPack = pack;
    readyPayload = null;
    start.disabled = true;
    renderPacks();
    if (pack.status !== 'available' || !pack.file) {
      setStatus(STUDENT_COPY.soon);
      return;
    }
    setStatus(STUDENT_COPY.loading);
    try {
      const json = await session.loadPack(options.contentBase, pack.file);
      const result = options.preparePack(pack, json);
      if (!result || result.errors?.length || !result.runnable) {
        console.error('Student pack is not runnable', pack.id, result && result.errors);
        setStatus(STUDENT_COPY.soon);
        return;
      }
      if (selectedPack !== pack) return;
      readyPayload = result.payload;
      start.disabled = false;
      setStatus('');
    } catch (error) {
      console.error('Student pack fetch failed', error);
      if (selectedPack === pack) setStatus(STUDENT_COPY.error);
    }
  }

  start.addEventListener('click', () => {
    if (!readyPayload || start.disabled) return;
    hideSelector();
    options.onStart(readyPayload, { showSelector, hideSelector });
  });

  showSelector();
  setStatus(STUDENT_COPY.loading);
  session.loadManifest(options.contentBase).then((data) => {
    const errors = validateManifest(data, options.checkManifestPack);
    if (errors.length) {
      console.error('Student manifest invalid', errors);
      setStatus(STUDENT_COPY.error);
      return;
    }
    manifest = data;
    if (!manifest.levels.length || manifest.levels.every((level) => !(level.packs || []).length)) {
      setStatus(STUDENT_COPY.empty);
      return;
    }
    activeLevel = manifest.levels[0];
    setStatus('');
    renderLevels();
    renderPacks();
  }).catch((error) => {
    console.error('Student manifest fetch failed', error);
    setStatus(STUDENT_COPY.error);
  });

  return { showSelector, hideSelector };
}
