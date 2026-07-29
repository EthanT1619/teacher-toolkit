import { initI18n, setLocale, getLocale, t, applyToDOM } from '../shared/i18n.js';

function playSound(_type) {
  // type: "move" | "storm" | "win"
}

var gameState = {
  teamA: { position: 0 },
  teamB: { position: 0 },
  goalDistance: 30,
  stormMode: false,
  treasureBonus: false,
  isAnimating: false,
  gameOver: false,
  winner: null,
};

var DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
var GOAL_VALUES = [20, 30, 50];

var els = {};

function updatePageTitle() {
  document.title = t('tool.pirate-race.title');
}

function updateLanguageButton() {
  if (!els.btnLanguage) return;
  els.btnLanguage.textContent =
    getLocale() === 'en'
      ? t('tool.pirate-race.actions.switchToKo')
      : t('tool.pirate-race.actions.switchToEn');
}

function updateFullscreenLabel() {
  if (!els.btnFullscreen) return;
  els.btnFullscreen.textContent = document.fullscreenElement
    ? t('tool.pirate-race.actions.exitFullscreen')
    : t('tool.pirate-race.actions.fullscreen');
}

function updateGoalChips() {
  GOAL_VALUES.forEach(function (value) {
    var chip = els.goalOptions.querySelector('[data-goal="' + value + '"]');
    if (chip) {
      chip.textContent = t('tool.pirate-race.settings.spaces', { n: value });
    }
  });
}

function renderWinnerOverlay() {
  if (!gameState.gameOver || !gameState.winner) return;

  var winner = gameState.winner;
  els.winnerTitle.textContent = t('tool.pirate-race.winner.foundTreasure', { team: winner });
  els.winnerSubtitle.textContent =
    winner === 'A'
      ? t('tool.pirate-race.winner.subtitleA')
      : t('tool.pirate-race.winner.subtitleB');
}

function updateTrackEndLabels() {
  document.querySelectorAll('[data-track-end]').forEach(function (el) {
    el.innerHTML = t('tool.pirate-race.track.treasureIslandHtml');
  });
}

function refreshI18nUI() {
  applyToDOM();
  updatePageTitle();
  updateLanguageButton();
  updateGoalChips();
  updateTrackEndLabels();
  render();
}

function initGame() {
  readSettings();
  gameState.teamA.position = 0;
  gameState.teamB.position = 0;
  gameState.isAnimating = false;
  gameState.gameOver = false;
  gameState.winner = null;

  els.winnerOverlay.classList.remove('show');
  els.treasureA.classList.remove('sparkle');
  els.treasureB.classList.remove('sparkle');
  els.shipA.classList.remove('winner');
  els.shipB.classList.remove('winner');

  setupShipImages();
  render();
  animateShip('A', false);
  animateShip('B', false);
}

function readSettings() {
  var selected = els.goalOptions.querySelector('input[name="goalDistance"]:checked');
  gameState.goalDistance = selected ? Number(selected.value) : 30;
  gameState.stormMode = els.stormMode.checked;
  gameState.treasureBonus = els.treasureBonus.checked;
}

function setupShipImages() {
  [els.shipA, els.shipB].forEach(function (shipEl) {
    var img = shipEl.querySelector('img');
    img.onerror = function () {
      shipEl.classList.add('use-fallback');
    };
    if (img.complete && img.naturalWidth === 0) {
      shipEl.classList.add('use-fallback');
    }
  });
}

function render() {
  updateFullscreenLabel();

  var teamA = gameState.teamA;
  var teamB = gameState.teamB;
  var goalDistance = gameState.goalDistance;
  var isAnimating = gameState.isAnimating;
  var gameOver = gameState.gameOver;
  var disabled = isAnimating || gameOver;

  function posText(pos) {
    return Math.min(pos, goalDistance) + ' / ' + goalDistance;
  }

  els.posBadgeA.textContent = posText(teamA.position);
  els.posBadgeB.textContent = posText(teamB.position);
  els.posTextA.textContent = posText(teamA.position);
  els.posTextB.textContent = posText(teamB.position);

  setButtonsDisabled(els.moveButtonsA, disabled);
  setButtonsDisabled(els.moveButtonsB, disabled);

  renderWinnerOverlay();
}

function setButtonsDisabled(container, disabled) {
  container.querySelectorAll('button').forEach(function (btn) {
    btn.disabled = disabled;
  });
}

function getShipLeftPercent(team) {
  var pos = team === 'A' ? gameState.teamA.position : gameState.teamB.position;
  var goal = gameState.goalDistance;
  var progress = goal > 0 ? Math.min(pos / goal, 1) : 0;
  return progress * 88;
}

function animateShip(team, useTransition) {
  if (useTransition === undefined) useTransition = true;
  var ship = els['ship' + team];
  if (!useTransition) {
    ship.style.transition = 'none';
  } else {
    ship.style.transition = '';
  }

  var leftPct = getShipLeftPercent(team);
  ship.style.left = leftPct + '%';

  if (!useTransition) {
    void ship.offsetWidth;
    ship.style.transition = '';
  }
}

function showToast(message, type, duration) {
  if (type === undefined) type = '';
  if (duration === undefined) duration = 1800;

  els.toast.textContent = message;
  els.toast.className = 'toast show' + (type ? ' ' + type : '');

  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(function () {
    els.toast.classList.remove('show');
  }, duration);
}

function rollDiceAnimation() {
  return new Promise(function (resolve) {
    var roll = Math.floor(Math.random() * 6) + 1;
    var diceEl = els.diceDisplay;
    var ticks = 0;
    var maxTicks = 14;
    var interval = 70;

    diceEl.classList.add('rolling');
    diceEl.setAttribute('aria-hidden', 'false');

    var timer = setInterval(function () {
      var face = Math.floor(Math.random() * 6);
      diceEl.textContent = DICE_FACES[face];
      ticks += 1;

      if (ticks >= maxTicks) {
        clearInterval(timer);
        diceEl.textContent = DICE_FACES[roll - 1];
        diceEl.classList.remove('rolling');

        setTimeout(function () {
          diceEl.textContent = '';
          diceEl.setAttribute('aria-hidden', 'true');
          resolve(roll);
        }, 450);
      }
    }, interval);
  });
}

async function moveTeam(team, steps) {
  if (gameState.isAnimating || gameState.gameOver || steps <= 0) return;

  gameState.isAnimating = true;
  render();

  var teamKey = team === 'A' ? 'teamA' : 'teamB';
  var previousPos = gameState[teamKey].position;
  gameState[teamKey].position = Math.min(previousPos + steps, gameState.goalDistance + 5);

  playSound('move');
  animateShip(team);

  await waitForTransition(els['ship' + team], 700);

  var finalPos = gameState[teamKey].position;
  var exactLanding = finalPos === gameState.goalDistance;
  var reachedGoal = finalPos >= gameState.goalDistance;

  if (gameState.treasureBonus && exactLanding) {
    showToast(t('tool.pirate-race.toast.perfectLanding'), 'bonus', 2200);
  }

  if (reachedGoal) {
    els['treasure' + team].classList.add('sparkle');
    els['ship' + team].classList.add('winner');
  }

  checkWinner();

  gameState.isAnimating = false;
  render();
}

async function randomMove(team) {
  if (gameState.isAnimating || gameState.gameOver) return;

  gameState.isAnimating = true;
  render();

  var roll = await rollDiceAnimation();

  if (gameState.stormMode && roll === 1) {
    showToast(t('tool.pirate-race.toast.storm'), 'storm', 2200);
    playSound('storm');
    gameState.isAnimating = false;
    render();
    return;
  }

  gameState.isAnimating = false;
  await moveTeam(team, roll);
}

function waitForTransition(element, fallbackMs) {
  return new Promise(function (resolve) {
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      element.removeEventListener('transitionend', onEnd);
      resolve();
    }

    function onEnd(e) {
      if (e.target === element && e.propertyName === 'left') finish();
    }

    element.addEventListener('transitionend', onEnd);
    setTimeout(finish, fallbackMs);
  });
}

function checkWinner() {
  var teamA = gameState.teamA;
  var teamB = gameState.teamB;
  var goalDistance = gameState.goalDistance;
  var winner = null;

  if (teamA.position >= goalDistance) winner = 'A';
  else if (teamB.position >= goalDistance) winner = 'B';

  if (!winner) return false;

  gameState.gameOver = true;
  gameState.winner = winner;

  renderWinnerOverlay();
  playSound('win');
  els.winnerOverlay.classList.add('show');
  return true;
}

function resetGame() {
  readSettings();
  initGame();
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function bindMoveButtons(container, team) {
  container.querySelectorAll('.btn-move').forEach(function (btn) {
    btn.addEventListener('click', function () {
      moveTeam(team, Number(btn.dataset.steps));
    });
  });
}

function cacheElements() {
  els.shipA = document.getElementById('shipA');
  els.shipB = document.getElementById('shipB');
  els.trackA = document.getElementById('trackA');
  els.trackB = document.getElementById('trackB');
  els.treasureA = document.getElementById('treasureA');
  els.treasureB = document.getElementById('treasureB');
  els.posBadgeA = document.getElementById('posBadgeA');
  els.posBadgeB = document.getElementById('posBadgeB');
  els.posTextA = document.getElementById('posTextA');
  els.posTextB = document.getElementById('posTextB');
  els.moveButtonsA = document.getElementById('moveButtonsA');
  els.moveButtonsB = document.getElementById('moveButtonsB');
  els.randomA = document.getElementById('randomA');
  els.randomB = document.getElementById('randomB');
  els.goalOptions = document.getElementById('goalOptions');
  els.stormMode = document.getElementById('stormMode');
  els.treasureBonus = document.getElementById('treasureBonus');
  els.toast = document.getElementById('toast');
  els.diceDisplay = document.getElementById('diceDisplay');
  els.winnerOverlay = document.getElementById('winnerOverlay');
  els.winnerTitle = document.getElementById('winnerTitle');
  els.winnerSubtitle = document.getElementById('winnerSubtitle');
  els.btnNewGame = document.getElementById('btnNewGame');
  els.btnPlayAgain = document.getElementById('btnPlayAgain');
  els.btnFullscreen = document.getElementById('btnFullscreen');
  els.btnLanguage = document.getElementById('btn-language');
}

function bindEvents() {
  bindMoveButtons(els.moveButtonsA, 'A');
  bindMoveButtons(els.moveButtonsB, 'B');
  els.randomA.addEventListener('click', function () {
    randomMove('A');
  });
  els.randomB.addEventListener('click', function () {
    randomMove('B');
  });
  els.btnNewGame.addEventListener('click', resetGame);
  els.btnPlayAgain.addEventListener('click', resetGame);
  els.btnFullscreen.addEventListener('click', toggleFullscreen);

  els.goalOptions.addEventListener('change', readSettings);
  els.stormMode.addEventListener('change', readSettings);
  els.treasureBonus.addEventListener('change', readSettings);

  els.btnLanguage.addEventListener('click', async function () {
    try {
      await setLocale(getLocale() === 'en' ? 'ko' : 'en');
    } catch (error) {
      console.error('Locale switch failed:', error);
    }
  });

  document.addEventListener('fullscreenchange', updateFullscreenLabel);
  window.addEventListener('resize', function () {
    animateShip('A', false);
    animateShip('B', false);
  });
  window.addEventListener('toolkit:localechange', refreshI18nUI);
}

async function boot() {
  cacheElements();
  await initI18n({ applyDom: true });
  updatePageTitle();
  updateGoalChips();
  updateTrackEndLabels();
  bindEvents();
  initGame();
}

boot();
