/*
 * Grammar Checkpoint
 * Ethan's Teacher Toolkit
 * Learning Tool
 */

(function () {
  'use strict';

  /* ── Word Banks ── */
  var SUBJECTS_3RD = ['He', 'She', 'Tom', 'My father', 'The girl'];
  var SUBJECTS_OTHER = ['I', 'You', 'We', 'They', 'The boys'];
  var VERBS = ['play', 'watch', 'eat', 'go', 'study', 'read', 'like', 'wash'];
  var VERB_OBJECTS = {
    play: ['soccer'],
    watch: ['TV'],
    eat: ['dinner', 'breakfast'],
    go: ['school', 'home'],
    study: ['English'],
    read: ['books'],
    like: ['music'],
    wash: ['the dishes']
  };

  var VERB_THIRD_PERSON = {
    play: 'plays',
    watch: 'watches',
    eat: 'eats',
    go: 'goes',
    study: 'studies',
    read: 'reads',
    like: 'likes',
    wash: 'washes',
    have: 'has'
  };

  var BE_COMPLEMENTS_SINGULAR = [
    'happy', 'sad', 'tall', 'short', 'ready', 'busy',
    'at home', 'at school', 'hungry', 'fine', 'a student'
  ];

  var BE_COMPLEMENTS_PLURAL = [
    'happy', 'sad', 'ready', 'busy', 'students', 'friends',
    'at home', 'at school', 'hungry', 'fine'
  ];

  var HAVE_OBJECTS = ['a book', 'a pen', 'homework', 'lunch', 'a dog', 'two cats', 'a bike'];

  var QUESTION_COUNTS = [10, 20, 30, 50];

  /* ── Rule Definitions (extensible) ── */
  var RULES = {
    sva: {
      id: 'sva',
      name: 'Subject-Verb Agreement',
      day: 1,
      number: 1,
      display: {
        top: 'He / She / Tom',
        bottom: 'Verb + S'
      },
      example: 'He plays soccer. ✓\nHe play soccer. ✗'
    },
    be: {
      id: 'be',
      name: 'Be Verb',
      day: 2,
      number: 2,
      display: {
        top: 'I / You / He / They',
        bottom: 'am / is / are'
      },
      example: 'He is tall. ✓\nHe are tall. ✗'
    },
    doDoes: {
      id: 'doDoes',
      name: 'Do / Does',
      day: 3,
      number: 3,
      display: {
        top: 'He / She → Does',
        bottom: 'I / You / They → Do'
      },
      example: 'Does he play? ✓\nDo he play? ✗'
    },
    haveHas: {
      id: 'haveHas',
      name: 'Have / Has',
      day: 4,
      number: 4,
      display: {
        top: 'He / She / Tom',
        bottom: 'Has'
      },
      example: 'He has a book. ✓\nHe have a book. ✗'
    },
    mixed: {
      id: 'mixed',
      name: 'Mixed',
      day: 5,
      number: 5,
      display: {
        top: 'All Rules',
        bottom: 'Check Carefully!'
      },
      example: 'Review all grammar rules.'
    }
  };

  var DAY_MAP = {
    1: 'sva',
    2: 'be',
    3: 'doDoes',
    4: 'haveHas',
    5: 'mixed'
  };

  /* ── State ── */
  var state = {
    score: 0,
    currentRule: 'sva',
    day: 1,
    questionCount: 10,
    currentIndex: 0,
    sentences: [],
    currentSentence: null,
    phase: 'menu',
    awaitingFix: false,
    inputLocked: false,
    correctCount: 0,
    wrongCount: 0
  };

  /* ── DOM refs ── */
  var els = {};

  /* ── Utility ── */
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function hasConsonantBeforeY(verb) {
    if (!verb.endsWith('y') || verb.length < 2) return false;
    return 'aeiou'.indexOf(verb.charAt(verb.length - 2)) === -1;
  }

  function needsEsEnding(verb) {
    return /(?:s|sh|ch|x|z|o)$/.test(verb);
  }

  function thirdPersonForm(verb) {
    if (VERB_THIRD_PERSON[verb]) {
      return VERB_THIRD_PERSON[verb];
    }
    if (needsEsEnding(verb)) {
      return verb + 'es';
    }
    if (hasConsonantBeforeY(verb)) {
      return verb.slice(0, -1) + 'ies';
    }
    return verb + 's';
  }

  function isPluralSubject(subject) {
    return subject === 'We' || subject === 'They' || subject === 'The boys';
  }

  function isThirdSingular(subject) {
    return SUBJECTS_3RD.indexOf(subject) !== -1;
  }

  function beForm(subject) {
    if (subject === 'I') return 'am';
    if (subject === 'You' || subject === 'We' || subject === 'They' || subject === 'The boys') return 'are';
    return 'is';
  }

  function doForm(subject) {
    return isThirdSingular(subject) ? 'does' : 'do';
  }

  function haveForm(subject) {
    return isThirdSingular(subject) ? 'has' : 'have';
  }

  function objectPhrase(verb, obj) {
    if (verb === 'go' && obj === 'school') return 'to school';
    return obj;
  }

  function buildSvaSentence(isCorrect) {
    var useThird = Math.random() < 0.5;
    var subject = useThird ? pick(SUBJECTS_3RD) : pick(SUBJECTS_OTHER);
    var verb = pick(VERBS);
    var obj = pick(VERB_OBJECTS[verb]);
    var phrase = objectPhrase(verb, obj);
    var correctVerb = isThirdSingular(subject) ? thirdPersonForm(verb) : verb;
    var wrongVerb;

    if (isThirdSingular(subject)) {
      wrongVerb = verb;
    } else {
      wrongVerb = thirdPersonForm(verb);
    }

    var usedVerb = isCorrect ? correctVerb : wrongVerb;
    var text = subject + ' ' + usedVerb + ' ' + phrase + '.';

    return {
      text: text,
      isCorrect: isCorrect,
      ruleId: 'sva',
      fixOptions: shuffle([correctVerb, wrongVerb]),
      correctFix: correctVerb,
      wrongPart: usedVerb
    };
  }

  function buildBeSentence(isCorrect) {
    var allSubjects = SUBJECTS_3RD.concat(SUBJECTS_OTHER);
    var subject = pick(allSubjects);
    var complements = isPluralSubject(subject)
      ? BE_COMPLEMENTS_PLURAL
      : BE_COMPLEMENTS_SINGULAR;
    var complement = pick(complements);
    var correctBe = beForm(subject);
    var wrongBe;

    var alternatives = ['am', 'is', 'are'].filter(function (b) { return b !== correctBe; });
    wrongBe = pick(alternatives);

    var usedBe = isCorrect ? correctBe : wrongBe;
    var text = subject + ' ' + usedBe + ' ' + complement + '.';

    return {
      text: text,
      isCorrect: isCorrect,
      ruleId: 'be',
      fixOptions: shuffle([correctBe, wrongBe]),
      correctFix: correctBe,
      wrongPart: usedBe
    };
  }

  function buildDoDoesSentence(isCorrect) {
    var useQuestion = Math.random() < 0.5;
    var subject = Math.random() < 0.5 ? pick(SUBJECTS_3RD) : pick(SUBJECTS_OTHER);
    var verb = pick(VERBS.filter(function (v) { return v !== 'go'; }));
    var obj = pick(VERB_OBJECTS[verb]);
    var phrase = objectPhrase(verb, obj);
    var correctDo = doForm(subject);
    var wrongDo = isThirdSingular(subject) ? 'do' : 'does';
    var usedDo = isCorrect ? correctDo : wrongDo;
    var text;

    if (useQuestion) {
      text = capitalize(usedDo) + ' ' + subject.toLowerCase() + ' ' + verb + ' ' + phrase + '?';
    } else {
      text = subject + ' ' + usedDo + ' not ' + verb + ' ' + phrase + '.';
    }

    return {
      text: text,
      isCorrect: isCorrect,
      ruleId: 'doDoes',
      fixOptions: shuffle([correctDo, wrongDo]),
      correctFix: correctDo,
      wrongPart: usedDo
    };
  }

  function buildHaveHasSentence(isCorrect) {
    var subject = Math.random() < 0.5 ? pick(SUBJECTS_3RD) : pick(SUBJECTS_OTHER);
    var obj = pick(HAVE_OBJECTS);
    var correctHave = haveForm(subject);
    var wrongHave = isThirdSingular(subject) ? 'have' : 'has';
    var usedHave = isCorrect ? correctHave : wrongHave;
    var text = subject + ' ' + usedHave + ' ' + obj + '.';

    return {
      text: text,
      isCorrect: isCorrect,
      ruleId: 'haveHas',
      fixOptions: shuffle([correctHave, wrongHave]),
      correctFix: correctHave,
      wrongPart: usedHave
    };
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function generateForRule(ruleId) {
    var isCorrect = Math.random() < 0.5;
    switch (ruleId) {
      case 'sva': return buildSvaSentence(isCorrect);
      case 'be': return buildBeSentence(isCorrect);
      case 'doDoes': return buildDoDoesSentence(isCorrect);
      case 'haveHas': return buildHaveHasSentence(isCorrect);
      default: return buildSvaSentence(isCorrect);
    }
  }

  function generateSentence() {
    if (state.currentRule === 'mixed') {
      var pool = ['sva', 'be', 'doDoes', 'haveHas'];
      return generateForRule(pick(pool));
    }
    return generateForRule(state.currentRule);
  }

  function generateAllSentences() {
    var list = [];
    for (var i = 0; i < state.questionCount; i++) {
      list.push(generateSentence());
    }
    state.sentences = list;
  }

  /* ── UI Updates ── */
  function updateScore(delta) {
    state.score += delta;
    var scoreEl = els.headerScore;
    scoreEl.textContent = state.score;
    scoreEl.className = 'value score-flash' + (state.score >= 0 ? ' score-positive' : ' score-negative');
    setTimeout(function () {
      scoreEl.classList.remove('score-flash');
    }, 500);
  }

  function updateRule() {
    var rule = RULES[state.currentRule];
    if (!rule) return;

    els.headerRule.textContent = rule.name;
    els.headerDay.textContent = state.day;
    els.ruleNumber.textContent = 'Rule #' + rule.number;
    els.ruleTop.textContent = rule.display.top;
    els.ruleBottom.textContent = rule.display.bottom;
    els.ruleExample.textContent = rule.example;
  }

  function updateProgress() {
    var pct = state.questionCount > 0
      ? (state.currentIndex / state.questionCount) * 100
      : 0;
    els.progressFill.style.width = pct + '%';
  }

  function setInputLocked(locked) {
    state.inputLocked = locked;
    els.btnApprove.disabled = locked;
    els.btnReject.disabled = locked;
  }

  function clearFeedback() {
    els.feedbackMsg.textContent = '';
    els.feedbackMsg.className = 'feedback-msg';
  }

  /* ── Game Flow ── */
  function showSentence() {
    if (state.currentIndex >= state.sentences.length) {
      showResult();
      return;
    }

    state.currentSentence = state.sentences[state.currentIndex];
    state.phase = 'play';
    state.awaitingFix = false;

    els.sentenceText.textContent = state.currentSentence.text;
    els.stamp.className = 'stamp';
    els.stamp.textContent = '';
    els.fixPanel.classList.remove('active');
    els.fixOptions.innerHTML = '';
    els.actionButtons.hidden = false;
    clearFeedback();
    setInputLocked(false);

    els.sentenceCard.classList.remove('visible', 'pass-through');
    void els.sentenceCard.offsetWidth;
    els.sentenceCard.classList.add('visible');

    updateProgress();
  }

  function showStamp(type, callback) {
    els.stamp.textContent = type === 'approved' ? 'APPROVED' : 'REJECTED';
    els.stamp.className = 'stamp ' + type + ' show';
    setInputLocked(true);
    els.actionButtons.hidden = true;

    setTimeout(function () {
      if (callback) callback();
    }, 900);
  }

  function approve() {
    if (state.inputLocked || state.phase !== 'play') return;
    handleDecision(true);
  }

  function reject() {
    if (state.inputLocked || state.phase !== 'play') return;
    handleDecision(false);
  }

  function handleDecision(approved) {
    var sentence = state.currentSentence;
    var shouldApprove = sentence.isCorrect;

    if (approved === shouldApprove) {
      state.correctCount++;
      updateScore(5);

      if (approved) {
        showStamp('approved', function () {
          if (!sentence.isCorrect) {
            showFixQuestion();
          } else {
            setTimeout(function () {
              els.sentenceCard.classList.add('pass-through');
              setTimeout(nextSentence, 700);
            }, 300);
          }
        });
      } else {
        showStamp('rejected', function () {
          showFixQuestion();
        });
      }
    } else {
      state.wrongCount++;
      updateScore(-5);
      els.feedbackMsg.textContent = approved ? 'Wrong! This sentence has an error.' : 'Wrong! This sentence is correct.';
      els.feedbackMsg.className = 'feedback-msg error';
      setInputLocked(true);

      setTimeout(function () {
        nextSentence();
      }, 1500);
    }
  }

  function showFixQuestion() {
    state.phase = 'fix';
    state.awaitingFix = true;
    els.fixPanel.classList.add('active');
    els.fixOptions.innerHTML = '';

    var sentence = state.currentSentence;
    sentence.fixOptions.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-fix';
      btn.textContent = opt;
      btn.addEventListener('click', function () {
        checkFixAnswer(opt, btn);
      });
      els.fixOptions.appendChild(btn);
    });
  }

  function checkFixAnswer(chosen, btn) {
    if (!state.awaitingFix) return;
    state.awaitingFix = false;

    var sentence = state.currentSentence;
    var fixButtons = els.fixOptions.querySelectorAll('.btn-fix');
    fixButtons.forEach(function (b) { b.disabled = true; });

    if (chosen === sentence.correctFix) {
      btn.classList.add('correct-flash');
      updateScore(5);
      els.feedbackMsg.textContent = 'Correct!';
      els.feedbackMsg.className = 'feedback-msg success';

      setTimeout(function () {
        els.sentenceCard.classList.add('pass-through');
        setTimeout(nextSentence, 700);
      }, 800);
    } else {
      btn.classList.add('wrong-flash');
      updateScore(-5);
      state.wrongCount++;
      els.feedbackMsg.textContent = 'Not quite. The answer is "' + sentence.correctFix + '".';
      els.feedbackMsg.className = 'feedback-msg error';

      setTimeout(nextSentence, 1500);
    }
  }

  function nextSentence() {
    state.currentIndex++;
    if (state.currentIndex >= state.sentences.length) {
      showResult();
    } else {
      showSentence();
    }
  }

  function showResult() {
    state.phase = 'result';
    els.resultScore.textContent = state.score;
    els.resultDetail.textContent =
      state.correctCount + ' correct · ' + state.wrongCount + ' wrong · ' +
      state.questionCount + ' documents inspected';
    els.resultOverlay.classList.add('active');
  }

  function startGame() {
    state.score = 0;
    state.currentIndex = 0;
    state.correctCount = 0;
    state.wrongCount = 0;
    state.phase = 'play';

    els.headerScore.textContent = '0';
    els.welcome.hidden = true;
    els.gameArea.hidden = false;
    els.mainArea.classList.add('game-only');
    els.teacherPanel.classList.add('hidden');
    els.resultOverlay.classList.remove('active');

    generateAllSentences();
    updateRule();
    updateProgress();
    showSentence();
  }

  function resetGame() {
    state.score = 0;
    state.currentIndex = 0;
    state.correctCount = 0;
    state.wrongCount = 0;
    state.sentences = [];
    state.currentSentence = null;
    state.phase = 'menu';
    state.awaitingFix = false;

    els.headerScore.textContent = '0';
    els.welcome.hidden = false;
    els.gameArea.hidden = true;
    els.mainArea.classList.remove('game-only');
    els.teacherPanel.classList.remove('hidden');
    els.resultOverlay.classList.remove('active');
    els.progressFill.style.width = '0%';
    clearFeedback();
    setInputLocked(false);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function () {});
    } else {
      document.exitFullscreen().catch(function () {});
    }
  }

  /* ── Teacher Panel Setup ── */
  function buildTeacherPanel() {
    for (var d = 1; d <= 5; d++) {
      var dayBtn = document.createElement('button');
      dayBtn.type = 'button';
      dayBtn.className = 'day-btn' + (d === 1 ? ' selected' : '');
      dayBtn.textContent = 'Day ' + d;
      dayBtn.dataset.day = d;
      dayBtn.addEventListener('click', function () {
        var day = parseInt(this.dataset.day, 10);
        selectDay(day);
      });
      els.dayOptions.appendChild(dayBtn);
    }

    Object.keys(RULES).forEach(function (key) {
      var rule = RULES[key];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn' + (key === 'sva' ? ' selected' : '');
      btn.textContent = rule.name;
      btn.dataset.rule = key;
      btn.addEventListener('click', function () {
        selectRule(key);
      });
      els.ruleOptions.appendChild(btn);
    });

    QUESTION_COUNTS.forEach(function (count) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn' + (count === 10 ? ' selected' : '');
      btn.textContent = count;
      btn.dataset.count = count;
      btn.addEventListener('click', function () {
        selectCount(count);
      });
      els.countOptions.appendChild(btn);
    });
  }

  function selectDay(day) {
    state.day = day;
    state.currentRule = DAY_MAP[day] || 'sva';

    els.dayOptions.querySelectorAll('.day-btn').forEach(function (btn) {
      btn.classList.toggle('selected', parseInt(btn.dataset.day, 10) === day);
    });

    els.ruleOptions.querySelectorAll('.option-btn').forEach(function (btn) {
      btn.classList.toggle('selected', btn.dataset.rule === state.currentRule);
    });

    updateRule();
  }

  function selectRule(ruleId) {
    state.currentRule = ruleId;
    var rule = RULES[ruleId];
    if (rule) state.day = rule.day;

    els.ruleOptions.querySelectorAll('.option-btn').forEach(function (btn) {
      btn.classList.toggle('selected', btn.dataset.rule === ruleId);
    });

    els.dayOptions.querySelectorAll('.day-btn').forEach(function (btn) {
      btn.classList.toggle('selected', parseInt(btn.dataset.day, 10) === state.day);
    });

    updateRule();
  }

  function selectCount(count) {
    state.questionCount = count;
    els.countOptions.querySelectorAll('.option-btn').forEach(function (btn) {
      btn.classList.toggle('selected', parseInt(btn.dataset.count, 10) === count);
    });
  }

  /* ── Init ── */
  function init() {
    els = {
      headerScore: document.getElementById('header-score'),
      headerRule: document.getElementById('header-rule'),
      headerDay: document.getElementById('header-day'),
      ruleNumber: document.getElementById('rule-number'),
      ruleTop: document.getElementById('rule-top'),
      ruleBottom: document.getElementById('rule-bottom'),
      ruleExample: document.getElementById('rule-example'),
      progressFill: document.getElementById('progress-fill'),
      welcome: document.getElementById('welcome'),
      gameArea: document.getElementById('game-area'),
      sentenceCard: document.getElementById('sentence-card'),
      sentenceText: document.getElementById('sentence-text'),
      stamp: document.getElementById('stamp'),
      feedbackMsg: document.getElementById('feedback-msg'),
      actionButtons: document.getElementById('action-buttons'),
      btnApprove: document.getElementById('btn-approve'),
      btnReject: document.getElementById('btn-reject'),
      fixPanel: document.getElementById('fix-panel'),
      fixOptions: document.getElementById('fix-options'),
      mainArea: document.getElementById('main-area'),
      teacherPanel: document.getElementById('teacher-panel'),
      dayOptions: document.getElementById('day-options'),
      ruleOptions: document.getElementById('rule-options'),
      countOptions: document.getElementById('count-options'),
      resultOverlay: document.getElementById('result-overlay'),
      resultScore: document.getElementById('result-score'),
      resultDetail: document.getElementById('result-detail')
    };

    buildTeacherPanel();
    updateRule();

    document.getElementById('btn-start').addEventListener('click', startGame);
    document.getElementById('btn-reset').addEventListener('click', resetGame);
    document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);
    document.getElementById('btn-play-again').addEventListener('click', function () {
      els.resultOverlay.classList.remove('active');
      startGame();
    });
    document.getElementById('btn-back-menu').addEventListener('click', resetGame);
    els.btnApprove.addEventListener('click', approve);
    els.btnReject.addEventListener('click', reject);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
