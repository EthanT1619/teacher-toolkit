import { initI18n, setLocale, getLocale, t, applyToDOM } from '../shared/i18n.js';

function playSound(_type) {
  // type: "hit" | "miss" | "win"
}

var gameState = {
  teamA: { hp: 50, maxHp: 50 },
  teamB: { hp: 50, maxHp: 50 },
  currentTurn: 'A',
  isAnimating: false,
  gameOver: false,
  winner: null,
  startHp: 50,
  damageOptions: [0, 10, 20, 30],
};

var els = {};

function updatePageTitle() {
  document.title = t('tool.fortress-battle.title');
}

function updateLanguageButton() {
  if (!els.btnLanguage) return;
  els.btnLanguage.textContent =
    getLocale() === 'en'
      ? t('tool.fortress-battle.actions.switchToKo')
      : t('tool.fortress-battle.actions.switchToEn');
}

function updateFullscreenLabel() {
  if (!els.btnFullscreen) return;
  els.btnFullscreen.textContent = document.fullscreenElement
    ? t('tool.fortress-battle.actions.exitFullscreen')
    : t('tool.fortress-battle.actions.fullscreen');
}

function refreshI18nUI() {
  applyToDOM();
  updatePageTitle();
  updateLanguageButton();
  render();
}

function initGame() {
  readStartHpFromSettings();
  gameState.teamA.hp = gameState.startHp;
  gameState.teamA.maxHp = gameState.startHp;
  gameState.teamB.hp = gameState.startHp;
  gameState.teamB.maxHp = gameState.startHp;
  gameState.currentTurn = 'A';
  gameState.isAnimating = false;
  gameState.gameOver = false;
  gameState.winner = null;
  els.winnerOverlay.classList.remove('show');
  render();
}

function readStartHpFromSettings() {
  var selected = els.hpOptions.querySelector('input[name="startHp"]:checked');
  gameState.startHp = selected ? Number(selected.value) : 50;
}

function parseDamageOptions(text) {
  var values = text
    .split(',')
    .map(function (v) {
      return v.trim();
    })
    .filter(function (v) {
      return v !== '';
    })
    .map(Number)
    .filter(function (n) {
      return !Number.isNaN(n) && n >= 0;
    });

  return values.length ? values : [0, 10, 20, 30];
}

function applyDamageSettings() {
  gameState.damageOptions = parseDamageOptions(els.damageInput.value);
  els.damageInput.value = gameState.damageOptions.join(',');
}

function renderTurnBadge() {
  if (gameState.gameOver) {
    els.turnBadge.textContent = t('tool.fortress-battle.turn.gameOver');
    return;
  }

  els.turnBadge.textContent =
    gameState.currentTurn === 'A'
      ? t('tool.fortress-battle.turn.badgeA')
      : t('tool.fortress-battle.turn.badgeB');
}

function renderWinnerOverlay() {
  if (!gameState.gameOver) return;

  if (gameState.winner === 'Draw') {
    els.winnerTitle.textContent = t('tool.fortress-battle.winner.draw');
    els.winnerSubtitle.textContent = t('tool.fortress-battle.winner.subtitleDraw');
  } else if (gameState.winner === 'B') {
    els.winnerTitle.textContent = t('tool.fortress-battle.winner.teamBWins');
    els.winnerSubtitle.textContent = t('tool.fortress-battle.winner.subtitleTeamA');
  } else {
    els.winnerTitle.textContent = t('tool.fortress-battle.winner.teamAWins');
    els.winnerSubtitle.textContent = t('tool.fortress-battle.winner.subtitleTeamB');
  }
}

function render() {
  updateFullscreenLabel();

  var teamA = gameState.teamA;
  var teamB = gameState.teamB;
  var currentTurn = gameState.currentTurn;
  var isAnimating = gameState.isAnimating;
  var gameOver = gameState.gameOver;
  var disabled = isAnimating || gameOver;

  els.hpTextA.textContent = Math.max(teamA.hp, 0) + ' / ' + teamA.maxHp;
  els.hpTextB.textContent = Math.max(teamB.hp, 0) + ' / ' + teamB.maxHp;

  var pctA = Math.max(0, (teamA.hp / teamA.maxHp) * 100);
  var pctB = Math.max(0, (teamB.hp / teamB.maxHp) * 100);
  els.hpFillA.style.width = pctA + '%';
  els.hpFillB.style.width = pctB + '%';

  els.teamPanelA.classList.toggle('active', currentTurn === 'A' && !gameOver);
  els.teamPanelB.classList.toggle('active', currentTurn === 'B' && !gameOver);

  els.btnTurnA.classList.toggle('active-a', currentTurn === 'A');
  els.btnTurnB.classList.toggle('active-b', currentTurn === 'B');

  renderTurnBadge();
  renderWinnerOverlay();

  els.attackButtons.forEach(function (btn) {
    btn.disabled = disabled;
  });

  els.btnTurnA.disabled = disabled;
  els.btnTurnB.disabled = disabled;
}

function rollDamage() {
  var opts = gameState.damageOptions;
  return opts[Math.floor(Math.random() * opts.length)];
}

async function attack(powerIndex) {
  if (gameState.isAnimating || gameState.gameOver) return;

  gameState.isAnimating = true;
  render();

  var damage = rollDamage();
  var attacker = gameState.currentTurn;

  await animateProjectile(attacker, damage, powerIndex);

  var targetTeam = attacker === 'A' ? 'B' : 'A';
  applyDamage(targetTeam, damage);

  if (!checkWinner()) {
    switchTurn();
  }

  gameState.isAnimating = false;
  render();
}

function getFortressPoint(team) {
  var panel = team === 'A' ? els.teamPanelA : els.teamPanelB;
  var fortress = panel.querySelector('.fortress');
  var rect = fortress.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function animateProjectile(attacker, _damage, powerIndex) {
  return new Promise(function (resolve) {
    var target = attacker === 'A' ? 'B' : 'A';
    var start = getFortressPoint(attacker);
    var end = getFortressPoint(target);

    var projectile = document.createElement('div');
    projectile.className = 'projectile';
    if (powerIndex % 2 === 0) {
      projectile.textContent = '💣';
    } else {
      projectile.classList.add('ball');
    }

    els.arenaLayer.appendChild(projectile);

    var duration = 850;
    var arcHeight = Math.min(160, Math.abs(end.x - start.x) * 0.18 + 80);
    var startTime = null;

    function frame(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);

      var x = start.x + (end.x - start.x) * progress;
      var linearY = start.y + (end.y - start.y) * progress;
      var y = linearY - arcHeight * 4 * progress * (1 - progress);

      projectile.style.left = x + 'px';
      projectile.style.top = y + 'px';

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        projectile.remove();
        showExplosion(end.x, end.y, resolve);
      }
    }

    requestAnimationFrame(frame);
  });
}

function showExplosion(x, y, onDone) {
  var boom = document.createElement('div');
  boom.className = 'explosion boom';
  boom.style.left = x + 'px';
  boom.style.top = y + 'px';
  els.arenaLayer.appendChild(boom);

  boom.addEventListener(
    'animationend',
    function () {
      boom.remove();
      if (onDone) onDone();
    },
    { once: true }
  );
}

function applyDamage(targetTeam, damage) {
  var teamKey = targetTeam === 'A' ? 'teamA' : 'teamB';
  gameState[teamKey].hp -= damage;

  var popup = targetTeam === 'A' ? els.damagePopupA : els.damagePopupB;
  popup.classList.remove('show', 'miss', 'hit');

  if (damage === 0) {
    popup.textContent = t('tool.fortress-battle.damage.miss');
    popup.classList.add('miss');
    playSound('miss');
  } else {
    popup.textContent = '-' + damage;
    popup.classList.add('hit');
    playSound('hit');
  }

  void popup.offsetWidth;
  popup.classList.add('show');
}

function switchTurn() {
  gameState.currentTurn = gameState.currentTurn === 'A' ? 'B' : 'A';
}

function checkWinner() {
  var teamA = gameState.teamA;
  var teamB = gameState.teamB;

  if (teamA.hp <= 0 || teamB.hp <= 0) {
    gameState.gameOver = true;

    if (teamA.hp <= 0 && teamB.hp <= 0) {
      gameState.winner = 'Draw';
    } else if (teamA.hp <= 0) {
      gameState.winner = 'B';
    } else {
      gameState.winner = 'A';
    }

    playSound('win');
    renderWinnerOverlay();
    els.winnerOverlay.classList.add('show');
    return true;
  }

  return false;
}

function resetGame() {
  applyDamageSettings();
  readStartHpFromSettings();
  initGame();
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function setTurn(team) {
  if (gameState.isAnimating || gameState.gameOver) return;
  gameState.currentTurn = team;
  render();
}

function cacheElements() {
  els.hpTextA = document.getElementById('hpTextA');
  els.hpTextB = document.getElementById('hpTextB');
  els.hpFillA = document.getElementById('hpFillA');
  els.hpFillB = document.getElementById('hpFillB');
  els.teamPanelA = document.getElementById('teamPanelA');
  els.teamPanelB = document.getElementById('teamPanelB');
  els.turnBadge = document.getElementById('turnBadge');
  els.btnTurnA = document.getElementById('btnTurnA');
  els.btnTurnB = document.getElementById('btnTurnB');
  els.attackButtons = document.querySelectorAll('.btn-attack');
  els.btnNewGame = document.getElementById('btnNewGame');
  els.btnPlayAgain = document.getElementById('btnPlayAgain');
  els.btnFullscreen = document.getElementById('btnFullscreen');
  els.btnLanguage = document.getElementById('btn-language');
  els.winnerOverlay = document.getElementById('winnerOverlay');
  els.winnerTitle = document.getElementById('winnerTitle');
  els.winnerSubtitle = document.getElementById('winnerSubtitle');
  els.damagePopupA = document.getElementById('damagePopupA');
  els.damagePopupB = document.getElementById('damagePopupB');
  els.arenaLayer = document.getElementById('arenaLayer');
  els.damageInput = document.getElementById('damageInput');
  els.btnApplyDamage = document.getElementById('btnApplyDamage');
  els.hpOptions = document.getElementById('hpOptions');
}

function bindEvents() {
  els.attackButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      attack(Number(btn.dataset.attack));
    });
  });

  els.btnTurnA.addEventListener('click', function () {
    setTurn('A');
  });
  els.btnTurnB.addEventListener('click', function () {
    setTurn('B');
  });
  els.btnNewGame.addEventListener('click', resetGame);
  els.btnPlayAgain.addEventListener('click', resetGame);
  els.btnFullscreen.addEventListener('click', toggleFullscreen);
  els.btnApplyDamage.addEventListener('click', applyDamageSettings);

  els.hpOptions.addEventListener('change', function () {
    readStartHpFromSettings();
  });

  els.btnLanguage.addEventListener('click', async function () {
    try {
      await setLocale(getLocale() === 'en' ? 'ko' : 'en');
    } catch (error) {
      console.error('Locale switch failed:', error);
    }
  });

  document.addEventListener('fullscreenchange', updateFullscreenLabel);
  window.addEventListener('toolkit:localechange', refreshI18nUI);
}

async function boot() {
  cacheElements();
  await initI18n({ applyDom: true });
  updatePageTitle();
  bindEvents();
  applyDamageSettings();
  initGame();
}

boot();
