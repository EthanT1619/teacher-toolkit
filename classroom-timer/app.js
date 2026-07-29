import { initI18n, setLocale, getLocale, t, applyToDOM } from '../shared/i18n.js';

var timerState = {
  inputBuffer: '',
  totalSeconds: 0,
  remainingSeconds: 0,
  isRunning: false,
  isPaused: false,
  isFinished: false,
  intervalId: null,
  soundEnabled: true,
};

var audioCtx = null;
var toastTimer = null;
var els = {};

function updatePageTitle() {
  document.title = t('tool.classroom-timer.title');
}

function updateLanguageButton() {
  if (!els.btnLanguage) return;
  els.btnLanguage.textContent =
    getLocale() === 'en'
      ? t('tool.classroom-timer.actions.switchToKo')
      : t('tool.classroom-timer.actions.switchToEn');
}

function refreshI18nUI() {
  applyToDOM();
  updatePageTitle();
  updateLanguageButton();
  render();
}

function initTimer() {
  els.timeDisplay = document.getElementById('timeDisplay');
  els.inputPreview = document.getElementById('inputPreview');
  els.timesUp = document.getElementById('timesUp');
  els.toast = document.getElementById('toast');
  els.btnStart = document.getElementById('btnStart');
  els.btnPause = document.getElementById('btnPause');
  els.btnResume = document.getElementById('btnResume');
  els.btnClear = document.getElementById('btnClear');
  els.btnResetTop = document.getElementById('btnResetTop');
  els.btnFullscreen = document.getElementById('btnFullscreen');
  els.btnSound = document.getElementById('btnSound');
  els.btnLanguage = document.getElementById('btnLanguage');
  els.helpWrap = document.getElementById('helpWrap');
  els.btnHelp = document.getElementById('btnHelp');
  els.digitButtons = document.querySelectorAll('.btn-digit');
  els.adjustButtons = document.querySelectorAll('[data-adjust]');

  els.btnStart.addEventListener('click', onStartClick);
  els.btnPause.addEventListener('click', pauseTimer);
  els.btnResume.addEventListener('click', resumeTimer);
  els.btnClear.addEventListener('click', clearInput);
  els.btnResetTop.addEventListener('click', resetTimer);
  els.btnFullscreen.addEventListener('click', toggleFullscreen);
  els.btnSound.addEventListener('click', toggleSound);

  els.btnLanguage.addEventListener('click', function () {
    setLocale(getLocale() === 'en' ? 'ko' : 'en');
  });

  els.btnHelp.addEventListener('click', function () {
    var open = els.helpWrap.classList.toggle('is-open');
    els.btnHelp.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  document.addEventListener('click', function (e) {
    if (!els.helpWrap.contains(e.target)) {
      els.helpWrap.classList.remove('is-open');
      els.btnHelp.setAttribute('aria-expanded', 'false');
    }
  });

  els.digitButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      handleDigit(btn.getAttribute('data-digit'));
    });
  });

  els.adjustButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      adjustTime(parseInt(btn.getAttribute('data-adjust'), 10));
    });
  });

  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('fullscreenchange', render);

  window.addEventListener('toolkit:localechange', refreshI18nUI);

  render();
}

function unlockAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function parseInputBuffer() {
  var buf = timerState.inputBuffer;
  if (!buf) {
    return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, valid: true };
  }

  var seconds = parseInt(buf.slice(-2), 10);
  var minutes = buf.length > 2 ? parseInt(buf.slice(-4, -2) || '0', 10) : 0;
  var hours = buf.length > 4 ? parseInt(buf.slice(0, -4) || '0', 10) : 0;

  var valid = seconds < 60 && minutes < 60;
  var totalSeconds = hours * 3600 + minutes * 60 + seconds;

  return {
    hours: hours,
    minutes: minutes,
    seconds: seconds,
    totalSeconds: totalSeconds,
    valid: valid,
  };
}

function formatTime(seconds) {
  var h = Math.floor(seconds / 3600);
  var m = Math.floor((seconds % 3600) / 60);
  var s = seconds % 60;
  return pad2(h) + ':' + pad2(m) + ':' + pad2(s);
}

function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}

function handleDigit(digit) {
  if (timerState.isRunning || timerState.isPaused || timerState.isFinished) return;
  if (timerState.inputBuffer.length >= 6) {
    showToast(t('tool.classroom-timer.toast.maxDigits'));
    return;
  }
  timerState.inputBuffer += digit;
  var parsed = parseInputBuffer();
  timerState.totalSeconds = parsed.totalSeconds;
  timerState.remainingSeconds = parsed.totalSeconds;
  render();
}

function backspaceInput() {
  if (timerState.isRunning || timerState.isPaused || timerState.isFinished) return;
  if (!timerState.inputBuffer) return;
  timerState.inputBuffer = timerState.inputBuffer.slice(0, -1);
  var parsed = parseInputBuffer();
  timerState.totalSeconds = parsed.totalSeconds;
  timerState.remainingSeconds = parsed.totalSeconds;
  render();
}

function clearInput() {
  if (timerState.isRunning || timerState.isPaused) return;
  timerState.inputBuffer = '';
  timerState.totalSeconds = 0;
  timerState.remainingSeconds = 0;
  timerState.isFinished = false;
  document.body.classList.remove('flash-alarm');
  render();
}

function onStartClick() {
  unlockAudio();
  startTimer();
}

function startTimer() {
  if (timerState.isRunning) return;

  if (timerState.isFinished) {
    resetTimer();
  }

  if (timerState.isPaused) {
    resumeTimer();
    return;
  }

  var parsed = parseInputBuffer();
  if (!timerState.inputBuffer || parsed.totalSeconds === 0) {
    showToast(t('tool.classroom-timer.toast.enterTime'));
    return;
  }
  if (!parsed.valid) {
    showToast(t('tool.classroom-timer.toast.invalidTime'));
    return;
  }

  timerState.totalSeconds = parsed.totalSeconds;
  timerState.remainingSeconds = parsed.totalSeconds;
  timerState.isRunning = true;
  timerState.isPaused = false;
  timerState.isFinished = false;
  document.body.classList.remove('flash-alarm');
  els.timesUp.classList.remove('visible');

  clearInterval(timerState.intervalId);
  timerState.intervalId = setInterval(tick, 1000);
  render();
}

function tick() {
  if (!timerState.isRunning || timerState.isPaused) return;

  timerState.remainingSeconds -= 1;

  if (timerState.remainingSeconds <= 0) {
    timerState.remainingSeconds = 0;
    stopInterval();
    timerState.isRunning = false;
    timerState.isPaused = false;
    timerState.isFinished = true;
    document.body.classList.add('flash-alarm');
    els.timesUp.classList.add('visible');
    playAlarm();
  }

  render();
}

function pauseTimer() {
  if (!timerState.isRunning || timerState.isPaused) return;
  timerState.isPaused = true;
  render();
}

function resumeTimer() {
  if (!timerState.isRunning || !timerState.isPaused) return;
  unlockAudio();
  timerState.isPaused = false;
  render();
}

function stopInterval() {
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
    timerState.intervalId = null;
  }
}

function resetTimer() {
  stopInterval();
  timerState.inputBuffer = '';
  timerState.totalSeconds = 0;
  timerState.remainingSeconds = 0;
  timerState.isRunning = false;
  timerState.isPaused = false;
  timerState.isFinished = false;
  document.body.classList.remove('flash-alarm');
  els.timesUp.classList.remove('visible');
  render();
}

function adjustTime(secondsDelta) {
  if (!timerState.isRunning && !timerState.isPaused && !timerState.isFinished) return;

  timerState.remainingSeconds = Math.max(0, timerState.remainingSeconds + secondsDelta);

  if (timerState.remainingSeconds === 0 && timerState.isRunning && !timerState.isPaused) {
    stopInterval();
    timerState.isRunning = false;
    timerState.isPaused = false;
    timerState.isFinished = true;
    document.body.classList.add('flash-alarm');
    els.timesUp.classList.add('visible');
    playAlarm();
  } else if (timerState.isFinished && timerState.remainingSeconds > 0) {
    timerState.isFinished = false;
    document.body.classList.remove('flash-alarm');
    els.timesUp.classList.remove('visible');
    if (!timerState.isRunning) {
      timerState.isRunning = true;
      timerState.isPaused = false;
      clearInterval(timerState.intervalId);
      timerState.intervalId = setInterval(tick, 1000);
    }
  }

  render();
}

function playAlarm() {
  if (!timerState.soundEnabled) return;
  unlockAudio();
  if (!audioCtx) return;

  var now = audioCtx.currentTime;
  var beepInterval = 0.45;
  var beepDuration = 0.26;
  var groupGap = 0.5;
  var groups = 2;
  var beepsPerGroup = 3;
  var groupLength = (beepsPerGroup - 1) * beepInterval + beepDuration + groupGap;

  for (var g = 0; g < groups; g++) {
    var groupStart = g * groupLength;
    for (var i = 0; i < beepsPerGroup; i++) {
      var start = now + groupStart + i * beepInterval;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.26);
    }
  }
}

function toggleSound() {
  timerState.soundEnabled = !timerState.soundEnabled;
  render();
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(function () {
      showToast(t('tool.classroom-timer.toast.fullscreenUnavailable'));
    });
  } else {
    document.exitFullscreen();
  }
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    els.toast.classList.remove('visible');
  }, 2500);
}

function canEditInput() {
  return !timerState.isRunning && !timerState.isPaused && !timerState.isFinished;
}

function render() {
  var displaySeconds;

  if (timerState.isRunning || timerState.isPaused || timerState.isFinished) {
    displaySeconds = timerState.remainingSeconds;
  } else {
    displaySeconds = parseInputBuffer().totalSeconds;
  }

  els.timeDisplay.textContent = formatTime(displaySeconds);
  els.timeDisplay.classList.toggle('paused', timerState.isPaused);
  els.timeDisplay.classList.toggle('finished', timerState.isFinished);

  if (canEditInput() && timerState.inputBuffer) {
    els.inputPreview.textContent = t('tool.classroom-timer.status.inputPrefix', {
      value: timerState.inputBuffer,
    });
  } else if (timerState.isRunning && !timerState.isPaused) {
    els.inputPreview.textContent = t('tool.classroom-timer.status.running');
  } else if (timerState.isPaused) {
    els.inputPreview.textContent = t('tool.classroom-timer.status.paused');
  } else if (timerState.isFinished) {
    els.inputPreview.textContent = '';
  } else {
    els.inputPreview.textContent = t('tool.classroom-timer.status.enterDigitsHint');
  }

  els.digitButtons.forEach(function (btn) {
    btn.disabled = !canEditInput();
  });

  els.btnClear.disabled = !canEditInput();

  els.btnStart.disabled = timerState.isRunning && !timerState.isPaused;
  els.btnPause.disabled = !timerState.isRunning || timerState.isPaused;
  els.btnResume.disabled = !timerState.isRunning || !timerState.isPaused;

  var canAdjust = timerState.isRunning || timerState.isPaused || timerState.isFinished;
  els.adjustButtons.forEach(function (btn) {
    btn.disabled = !canAdjust;
  });

  els.btnSound.textContent = timerState.soundEnabled
    ? t('tool.classroom-timer.actions.soundOn')
    : t('tool.classroom-timer.actions.soundOff');
  els.btnSound.classList.toggle('btn-top--sound-on', timerState.soundEnabled);
  els.btnSound.classList.toggle('btn-top--sound-off', !timerState.soundEnabled);
  els.btnSound.setAttribute('aria-pressed', timerState.soundEnabled ? 'true' : 'false');

  els.btnFullscreen.textContent = document.fullscreenElement
    ? t('tool.classroom-timer.actions.exitFullscreen')
    : t('tool.classroom-timer.actions.fullscreen');
}

function handleKeydown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  var key = e.key;

  if (key >= '0' && key <= '9') {
    e.preventDefault();
    handleDigit(key);
    return;
  }

  if (key === 'Enter') {
    e.preventDefault();
    if (timerState.isRunning && timerState.isPaused) {
      unlockAudio();
      resumeTimer();
    } else if (!timerState.isRunning) {
      onStartClick();
    }
    return;
  }

  if (key === ' ') {
    e.preventDefault();
    if (timerState.isRunning && timerState.isPaused) {
      unlockAudio();
      resumeTimer();
    } else if (timerState.isRunning) {
      pauseTimer();
    } else if (!timerState.isRunning) {
      onStartClick();
    }
    return;
  }

  if (key === 'Backspace') {
    e.preventDefault();
    backspaceInput();
    return;
  }

  if (key === 'c' || key === 'C') {
    e.preventDefault();
    clearInput();
    return;
  }

  if (key === 'r' || key === 'R') {
    e.preventDefault();
    resetTimer();
    return;
  }

  if (key === 'f' || key === 'F') {
    e.preventDefault();
    toggleFullscreen();
    return;
  }

  if (key === 'Escape') {
    if (document.fullscreenElement) {
      e.preventDefault();
      document.exitFullscreen();
    } else if (canEditInput() && timerState.inputBuffer) {
      e.preventDefault();
      clearInput();
    }
  }
}

async function boot() {
  await initI18n({ applyDom: true });
  updatePageTitle();
  initTimer();
  updateLanguageButton();
}

boot();
