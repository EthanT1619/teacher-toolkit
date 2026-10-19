(function () {
  var META = window.LETTER_SENSE_META || {
    ACTIVITY_ID: 'letter-sense',
    ACTIVITY_TITLE: 'Letter Sense',
  };
  var PREFIX = 'tool.' + META.ACTIVITY_ID + '.';
  var COUNTDOWN_MS = 650;
  var ALWAYS_STEP_MS = 1500;
  var FLASH_SEQUENCE = ['blank', 'word', 'blank', 'word', 'blank'];
  var FALLBACK = {
    'setup.wordCount': '{count} words',
    'setup.needWords': 'Enter at least one word.',
    'setup.needDuration': 'Enter a flash time between 0.1 and 30 seconds.',
    'play.roundLabel': 'ROUND {current} / {total}',
    'actions.switchToKo': '한국어',
    'actions.switchToEn': 'English',
  };

  var STATE = {
    SETUP: 'SETUP',
    READY: 'READY',
    COUNTDOWN: 'COUNTDOWN',
    FLASH: 'FLASH',
    RECALL: 'RECALL',
    REVEAL: 'REVEAL',
    COMPLETE: 'COMPLETE',
  };

  var els = {
    setupView: document.getElementById('setupView'),
    playView: document.getElementById('playView'),
    wordInput: document.getElementById('wordInput'),
    wordCount: document.getElementById('wordCount'),
    shuffleWords: document.getElementById('shuffleWords'),
    durationCustom: document.getElementById('durationCustom'),
    customDuration: document.getElementById('customDuration'),
    btnStart: document.getElementById('btnStart'),
    setupError: document.getElementById('setupError'),
    playToolbar: document.getElementById('playToolbar'),
    playRoundLabel: document.getElementById('playRoundLabel'),
    readyRoundLabel: document.getElementById('readyRoundLabel'),
    btnStartRound: document.getElementById('btnStartRound'),
    btnBackSetup: document.getElementById('btnBackSetup'),
    countdownNum: document.getElementById('countdownNum'),
    flashWord: document.getElementById('flashWord'),
    btnOneMoreTime: document.getElementById('btnOneMoreTime'),
    btnReveal: document.getElementById('btnReveal'),
    letterRow: document.getElementById('letterRow'),
    btnPrevious: document.getElementById('btnPrevious'),
    btnNextRound: document.getElementById('btnNextRound'),
    btnPlayAgain: document.getElementById('btnPlayAgain'),
    btnCompleteSetup: document.getElementById('btnCompleteSetup'),
  };

  var panels = {
    READY: document.getElementById('panelReady'),
    COUNTDOWN: document.getElementById('panelCountdown'),
    FLASH: document.getElementById('panelFlash'),
    RECALL: document.getElementById('panelRecall'),
    REVEAL: document.getElementById('panelReveal'),
    COMPLETE: document.getElementById('panelComplete'),
  };

  var session = {
    state: STATE.SETUP,
    words: [],
    index: 0,
    checkedByRound: [],
    shuffle: false,
    duration: '0.5',
  };

  var flashTimer = null;
  var countdownTimer = null;
  var flashStep = 0;

  function interpolate(template, params) {
    if (!params) return template;
    return String(template).replace(/\{(\w+)\}/g, function (_match, name) {
      return params[name] != null ? String(params[name]) : '{' + name + '}';
    });
  }

  function lsT(key, params) {
    var i18n = window.toolkitI18n;
    if (i18n && typeof i18n.t === 'function') {
      return i18n.t(PREFIX + key, params);
    }
    return interpolate(FALLBACK[key] || key, params);
  }

  function applyActivityTitle() {
    document.title = META.ACTIVITY_TITLE;
    document.querySelectorAll('[data-activity-title]').forEach(function (el) {
      el.textContent = META.ACTIVITY_TITLE;
    });
  }

  function currentLocale() {
    var i18n = window.toolkitI18n;
    if (i18n && typeof i18n.getLocale === 'function') return i18n.getLocale();
    return 'en';
  }

  function updateLanguageButtons() {
    var label = currentLocale() === 'en' ? lsT('actions.switchToKo') : lsT('actions.switchToEn');
    document.querySelectorAll('#btn-language, #btn-language-play').forEach(function (btn) {
      btn.textContent = label;
    });
  }

  function parseWords(text) {
    return String(text || '')
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim();
      })
      .filter(function (line) {
        return line.length > 0;
      });
  }

  function shuffle(list) {
    var next = list.slice();
    for (var i = next.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = next[i];
      next[i] = next[j];
      next[j] = tmp;
    }
    return next;
  }

  function letterKey(ch) {
    return String(ch).toLocaleUpperCase('en-US');
  }

  function currentWord() {
    return session.words[session.index] || '';
  }

  function parseCustomSeconds(raw) {
    var n = Number(String(raw || '').trim().replace(',', '.'));
    if (!isFinite(n) || n < 0.1 || n > 30) return null;
    return String(n);
  }

  function selectedDuration() {
    var checked = document.querySelector('input[name="flashDuration"]:checked');
    if (!checked) return '0.5';
    if (checked.value === 'always') return 'always';
    if (checked.value === 'custom') return parseCustomSeconds(els.customDuration.value);
    return checked.value;
  }

  function clearTimers() {
    clearTimeout(flashTimer);
    clearTimeout(countdownTimer);
    flashTimer = null;
    countdownTimer = null;
  }

  function updateWordCount() {
    if (!els.wordCount) return;
    var count = parseWords(els.wordInput.value).length;
    els.wordCount.textContent = lsT('setup.wordCount', { count: count });
  }

  function showSetupError(message, focusEl) {
    els.setupError.hidden = !message;
    els.setupError.textContent = message || '';
    if (message) {
      var target = focusEl || els.wordInput;
      if (target && typeof target.focus === 'function') target.focus();
      els.setupError.scrollIntoView({ block: 'nearest' });
    }
  }

  function showView(name) {
    els.setupView.classList.toggle('active', name === 'setup');
    els.playView.classList.toggle('active', name === 'play');
  }

  function setState(next) {
    session.state = next;
    render();
  }

  function roundLabel() {
    return lsT('play.roundLabel', {
      current: session.index + 1,
      total: session.words.length,
    });
  }

  function renderLetterTiles() {
    var word = currentWord();
    var checked = session.checkedByRound[session.index] || new Set();
    els.letterRow.innerHTML = '';

    Array.from(word).forEach(function (ch) {
      var key = letterKey(ch);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'letter-tile' + (checked.has(key) ? ' is-checked' : '');
      btn.dataset.letter = key;
      btn.setAttribute('aria-pressed', checked.has(key) ? 'true' : 'false');
      btn.innerHTML =
        '<span class="letter-tile__mark" aria-hidden="true">O</span>' +
        '<span class="letter-tile__char"></span>';
      btn.querySelector('.letter-tile__char').textContent = key;
      els.letterRow.appendChild(btn);
    });
  }

  function render() {
    var onPlay = session.state !== STATE.SETUP;
    showView(onPlay ? 'play' : 'setup');
    els.playView.classList.toggle(
      'play-view--focus',
      session.state === STATE.COUNTDOWN || session.state === STATE.FLASH
    );

    Object.keys(panels).forEach(function (key) {
      panels[key].classList.toggle('active', key === session.state);
    });

    if (!onPlay) return;

    els.playRoundLabel.textContent = session.state === STATE.COMPLETE ? '' : roundLabel();
    els.readyRoundLabel.textContent = roundLabel();
    els.btnPrevious.disabled = session.index <= 0;

    if (session.state === STATE.FLASH) {
      renderFlashFrame();
    } else {
      els.flashWord.textContent = letterKey(currentWord());
    }

    if (session.state === STATE.REVEAL) {
      renderLetterTiles();
    }
  }

  function startActivity() {
    var words = parseWords(els.wordInput.value);
    if (words.length < 1) {
      showSetupError(lsT('setup.needWords'));
      return;
    }

    var duration = selectedDuration();
    if (!duration) {
      showSetupError(lsT('setup.needDuration'), els.customDuration);
      return;
    }

    showSetupError('');
    session.shuffle = els.shuffleWords.checked;
    session.duration = duration;
    session.words = session.shuffle ? shuffle(words) : words.slice();
    session.index = 0;
    session.checkedByRound = session.words.map(function () {
      return new Set();
    });
    clearTimers();
    setState(STATE.READY);
  }

  function startCountdown() {
    clearTimers();
    setState(STATE.COUNTDOWN);
    var n = 3;
    var tick = function () {
      els.countdownNum.textContent = String(n);
      countdownTimer = setTimeout(function () {
        n -= 1;
        if (n < 1) {
          startFlash();
          return;
        }
        tick();
      }, COUNTDOWN_MS);
    };
    tick();
  }

  function flashStepKind() {
    return FLASH_SEQUENCE[flashStep] || 'blank';
  }

  function stepDurationMs() {
    if (session.duration === 'always') return ALWAYS_STEP_MS;
    return Math.round(Number(session.duration) * 1000);
  }

  function renderFlashFrame() {
    var showWord = flashStepKind() === 'word';
    els.flashWord.textContent = showWord ? letterKey(currentWord()) : '';
    els.flashWord.hidden = !showWord;
  }

  function advanceFlashStep() {
    if (flashStep >= FLASH_SEQUENCE.length) {
      setState(STATE.RECALL);
      return;
    }

    renderFlashFrame();
    flashTimer = setTimeout(function () {
      flashStep += 1;
      advanceFlashStep();
    }, stepDurationMs());
  }

  function startFlash() {
    clearTimers();
    flashStep = 0;
    setState(STATE.FLASH);
    advanceFlashStep();
  }

  function goToRound(index) {
    if (index < 0 || index >= session.words.length) return;
    clearTimers();
    session.index = index;
    setState(STATE.READY);
  }

  function nextRound() {
    if (session.index >= session.words.length - 1) {
      clearTimers();
      setState(STATE.COMPLETE);
      return;
    }
    goToRound(session.index + 1);
  }

  function playAgain() {
    var source = parseWords(els.wordInput.value);
    session.words = session.shuffle ? shuffle(source) : source.slice();
    session.index = 0;
    session.checkedByRound = session.words.map(function () {
      return new Set();
    });
    clearTimers();
    setState(STATE.READY);
  }

  function backToSetup() {
    clearTimers();
    session.state = STATE.SETUP;
    render();
  }

  function toggleLetter(key) {
    var checked = session.checkedByRound[session.index];
    if (!checked) return;
    if (checked.has(key)) checked.delete(key);
    else checked.add(key);
    renderLetterTiles();
  }

  function refreshI18nUI() {
    var i18n = window.toolkitI18n;
    if (i18n && typeof i18n.applyToDOM === 'function') i18n.applyToDOM();
    applyActivityTitle();
    updateLanguageButtons();
    updateWordCount();
    if (session.state !== STATE.SETUP) render();
  }

  function switchLanguage() {
    var i18n = window.toolkitI18n;
    if (!i18n || typeof i18n.setLocale !== 'function' || typeof i18n.getLocale !== 'function') {
      return;
    }
    i18n.setLocale(i18n.getLocale() === 'en' ? 'ko' : 'en').catch(function () {});
  }

  function bind() {
    els.wordInput.addEventListener('input', function () {
      showSetupError('');
      updateWordCount();
    });
    function selectCustomDuration() {
      if (els.durationCustom) els.durationCustom.checked = true;
      showSetupError('');
    }
    if (els.customDuration) {
      els.customDuration.addEventListener('focus', selectCustomDuration);
      els.customDuration.addEventListener('input', selectCustomDuration);
    }
    els.btnStart.addEventListener('click', startActivity);
    els.btnStartRound.addEventListener('click', startCountdown);
    els.btnOneMoreTime.addEventListener('click', startFlash);
    els.btnReveal.addEventListener('click', function () {
      setState(STATE.REVEAL);
    });
    els.btnPrevious.addEventListener('click', function () {
      goToRound(session.index - 1);
    });
    els.btnNextRound.addEventListener('click', nextRound);
    els.btnPlayAgain.addEventListener('click', playAgain);
    els.btnBackSetup.addEventListener('click', backToSetup);
    els.btnCompleteSetup.addEventListener('click', backToSetup);

    els.letterRow.addEventListener('click', function (event) {
      var tile = event.target.closest('.letter-tile');
      if (!tile) return;
      toggleLetter(tile.dataset.letter);
    });

    document.querySelectorAll('#btn-language, #btn-language-play').forEach(function (btn) {
      btn.addEventListener('click', switchLanguage);
    });

    window.addEventListener('toolkit:localechange', refreshI18nUI);
  }

  bind();
  applyActivityTitle();
  updateLanguageButtons();
  updateWordCount();
  window.letterSenseRefreshI18n = refreshI18nUI;
})();
