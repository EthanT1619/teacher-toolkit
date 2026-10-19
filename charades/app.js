(function () {
  var META = window.CHARADES_META || {
    ACTIVITY_ID: 'charades',
    ACTIVITY_TITLE: 'Charades',
  };
  var PREFIX = 'tool.' + META.ACTIVITY_ID + '.';
  var FALLBACK = {
    'setup.wordCount': '{count} words',
    'setup.needWords': 'Enter at least one word.',
    'play.roundLabel': 'ROUND {current} / {total}',
    'actions.switchToKo': '한국어',
    'actions.switchToEn': 'English',
  };

  var STATE = {
    SETUP: 'SETUP',
    ROUND: 'ROUND',
    COMPLETE: 'COMPLETE',
  };

  var els = {
    setupView: document.getElementById('setupView'),
    playView: document.getElementById('playView'),
    wordInput: document.getElementById('wordInput'),
    wordCount: document.getElementById('wordCount'),
    shuffleWords: document.getElementById('shuffleWords'),
    btnStart: document.getElementById('btnStart'),
    setupError: document.getElementById('setupError'),
    playRoundLabel: document.getElementById('playRoundLabel'),
    readyRoundLabel: document.getElementById('readyRoundLabel'),
    hiddenLabel: document.getElementById('hiddenLabel'),
    flashWord: document.getElementById('flashWord'),
    btnShowWord: document.getElementById('btnShowWord'),
    btnHideWord: document.getElementById('btnHideWord'),
    btnPrevious: document.getElementById('btnPrevious'),
    btnNextRound: document.getElementById('btnNextRound'),
    btnBackSetup: document.getElementById('btnBackSetup'),
    btnPlayAgain: document.getElementById('btnPlayAgain'),
    btnCompleteSetup: document.getElementById('btnCompleteSetup'),
  };

  var panels = {
    ROUND: document.getElementById('panelRound'),
    COMPLETE: document.getElementById('panelComplete'),
  };

  var session = {
    state: STATE.SETUP,
    words: [],
    index: 0,
    shuffle: false,
    wordVisible: false,
  };

  function interpolate(template, params) {
    if (!params) return template;
    return String(template).replace(/\{(\w+)\}/g, function (_match, name) {
      return params[name] != null ? String(params[name]) : '{' + name + '}';
    });
  }

  function chT(key, params) {
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
    var label = currentLocale() === 'en' ? chT('actions.switchToKo') : chT('actions.switchToEn');
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

  function currentWord() {
    return session.words[session.index] || '';
  }

  function updateWordCount() {
    if (!els.wordCount) return;
    var count = parseWords(els.wordInput.value).length;
    els.wordCount.textContent = chT('setup.wordCount', { count: count });
  }

  function showSetupError(message) {
    els.setupError.hidden = !message;
    els.setupError.textContent = message || '';
    if (message) {
      els.wordInput.focus();
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
    return chT('play.roundLabel', {
      current: session.index + 1,
      total: session.words.length,
    });
  }

  function render() {
    var onPlay = session.state !== STATE.SETUP;
    showView(onPlay ? 'play' : 'setup');

    Object.keys(panels).forEach(function (key) {
      panels[key].classList.toggle('active', key === session.state);
    });

    if (!onPlay) return;

    els.playRoundLabel.textContent = session.state === STATE.COMPLETE ? '' : roundLabel();
    els.readyRoundLabel.textContent = roundLabel();
    els.btnPrevious.disabled = session.index <= 0;
    els.flashWord.textContent = currentWord();
    els.flashWord.hidden = !session.wordVisible;
    els.hiddenLabel.hidden = session.wordVisible;
    els.btnShowWord.hidden = session.wordVisible;
    els.btnHideWord.hidden = !session.wordVisible;
  }

  function startActivity() {
    var words = parseWords(els.wordInput.value);
    if (words.length < 1) {
      showSetupError(chT('setup.needWords'));
      return;
    }

    showSetupError('');
    session.shuffle = els.shuffleWords.checked;
    session.words = session.shuffle ? shuffle(words) : words.slice();
    session.index = 0;
    session.wordVisible = false;
    setState(STATE.ROUND);
  }

  function goToRound(index) {
    if (index < 0 || index >= session.words.length) return;
    session.index = index;
    session.wordVisible = false;
    setState(STATE.ROUND);
  }

  function nextRound() {
    if (session.index >= session.words.length - 1) {
      session.wordVisible = false;
      setState(STATE.COMPLETE);
      return;
    }
    goToRound(session.index + 1);
  }

  function playAgain() {
    var source = parseWords(els.wordInput.value);
    session.words = session.shuffle ? shuffle(source) : source.slice();
    session.index = 0;
    session.wordVisible = false;
    setState(STATE.ROUND);
  }

  function backToSetup() {
    session.state = STATE.SETUP;
    session.wordVisible = false;
    render();
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
    els.btnStart.addEventListener('click', startActivity);
    els.btnShowWord.addEventListener('click', function () {
      session.wordVisible = true;
      render();
    });
    els.btnHideWord.addEventListener('click', function () {
      session.wordVisible = false;
      render();
    });
    els.btnPrevious.addEventListener('click', function () {
      goToRound(session.index - 1);
    });
    els.btnNextRound.addEventListener('click', nextRound);
    els.btnPlayAgain.addEventListener('click', playAgain);
    els.btnBackSetup.addEventListener('click', backToSetup);
    els.btnCompleteSetup.addEventListener('click', backToSetup);

    document.querySelectorAll('#btn-language, #btn-language-play').forEach(function (btn) {
      btn.addEventListener('click', switchLanguage);
    });

    window.addEventListener('toolkit:localechange', refreshI18nUI);
  }

  bind();
  applyActivityTitle();
  updateLanguageButtons();
  updateWordCount();
  window.charadesRefreshI18n = refreshI18nUI;
})();
