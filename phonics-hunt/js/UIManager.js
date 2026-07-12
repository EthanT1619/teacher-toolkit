/**
 * UIManager — DOM updates for setup and game screens.
 */
class UIManager {
  constructor() {
    this.els = {
      setupScreen: document.getElementById('setup-screen'),
      gameScreen: document.getElementById('game-screen'),
      wordInput: document.getElementById('word-input'),
      wordCount: document.getElementById('word-count'),
      gridPreview: document.getElementById('grid-preview'),
      starCount: document.getElementById('star-count'),
      teamBlueName: document.getElementById('team-blue-name'),
      teamRedName: document.getElementById('team-red-name'),
      starPoints: document.getElementById('star-points'),
      btnStartGame: document.getElementById('btn-start-game'),
      blueScore: document.getElementById('blue-score'),
      redScore: document.getElementById('red-score'),
      bluePanel: document.getElementById('blue-score-panel'),
      redPanel: document.getElementById('red-score-panel'),
      blueTeamLabel: document.getElementById('blue-team-label'),
      redTeamLabel: document.getElementById('red-team-label'),
      btnBlueText: document.getElementById('btn-blue-text'),
      btnRedText: document.getElementById('btn-red-text'),
      statusText: document.getElementById('status-text'),
      toast: document.getElementById('toast'),
      victoryOverlay: document.getElementById('victory-overlay'),
      victoryTitle: document.getElementById('victory-title'),
      victoryMessage: document.getElementById('victory-message'),
      btnBlue: document.getElementById('btn-blue-excavate'),
      btnRed: document.getElementById('btn-red-excavate'),
      btnReset: document.getElementById('btn-reset'),
      btnBackSetup: document.getElementById('btn-back-setup'),
      btnBackSetupFooter: document.getElementById('btn-back-setup-footer'),
      btnMute: document.getElementById('btn-mute'),
      btnFullscreen: document.getElementById('btn-fullscreen'),
      btnVictoryDismiss: document.getElementById('victory-dismiss'),
      gridContainer: document.getElementById('grid-container'),
      gridInfo: document.getElementById('grid-info'),
    };

    this.toastTimer = null;
  }

  showSetup() {
    this.els.setupScreen.classList.add('active');
    this.els.gameScreen.classList.remove('active');
  }

  showGame() {
    this.els.setupScreen.classList.remove('active');
    this.els.gameScreen.classList.add('active');
  }

  updateWordPreview(words, starCount) {
    const count = words.length;

    this.els.wordCount.textContent = count;
    this.els.gridPreview.textContent = GridCalculator.formatPreview(count);
    this.els.starCount.max = count > 0 ? count : 64;
    if (count > 0 && parseInt(this.els.starCount.value, 10) > count) {
      this.els.starCount.value = count;
    } else if (count > 0 && parseInt(this.els.starCount.value, 10) < 1) {
      this.els.starCount.value = 1;
    }
  }

  getSetupData() {
    const words = WordParser.parse(this.els.wordInput.value);
    const maxStars = Math.max(1, words.length);
    let starCount = parseInt(this.els.starCount.value, 10) || 1;
    starCount = Math.max(1, Math.min(maxStars, starCount));

    return {
      wordText: this.els.wordInput.value,
      blueName: this.els.teamBlueName.value.trim() || 'Blue Team',
      redName: this.els.teamRedName.value.trim() || 'Red Team',
      starCount,
      starPoints: Math.max(1, Math.min(10, parseInt(this.els.starPoints.value, 10) || 1)),
    };
  }

  applyTeamNames(blueName, redName) {
    this.els.blueTeamLabel.textContent = blueName;
    this.els.redTeamLabel.textContent = redName;
    this.els.btnBlueText.textContent = blueName;
    this.els.btnRedText.textContent = redName;
  }

  setGridInfo(rows, cols, wordCount, starCount) {
    this.els.gridInfo.textContent = `${rows}×${cols} · ${wordCount}단어 · 별 ${starCount}개`;
  }

  updateScores(blue, red, scoringTeam = null) {
    this.els.blueScore.textContent = blue;
    this.els.redScore.textContent = red;

    if (scoringTeam === 'blue') {
      this.els.blueScore.classList.add('score-pop');
      setTimeout(() => this.els.blueScore.classList.remove('score-pop'), 400);
    } else if (scoringTeam === 'red') {
      this.els.redScore.classList.add('score-pop');
      setTimeout(() => this.els.redScore.classList.remove('score-pop'), 400);
    }
  }

  setActiveTeam(team) {
    this.els.bluePanel.classList.toggle('active', team === 'blue');
    this.els.redPanel.classList.toggle('active', team === 'red');
  }

  setStatus(text) {
    this.els.statusText.textContent = text;
  }

  showToast(message, duration = 2500) {
    clearTimeout(this.toastTimer);
    this.els.toast.textContent = message;
    this.els.toast.classList.remove('hidden');
    this.toastTimer = setTimeout(() => {
      this.els.toast.classList.add('hidden');
    }, duration);
  }

  showVictory(blueScore, redScore, blueName, redName) {
    let title;
    let message;

    if (blueScore > redScore) {
      title = `${blueName} 승리!`;
      message = `${blueName}: ${blueScore}점  ·  ${redName}: ${redScore}점`;
    } else if (redScore > blueScore) {
      title = `${redName} 승리!`;
      message = `${redName}: ${redScore}점  ·  ${blueName}: ${blueScore}점`;
    } else {
      title = '무승부!';
      message = `양 팀 모두 ${blueScore}점`;
    }

    this.els.victoryTitle.textContent = title;
    this.els.victoryMessage.textContent = message;
    this.els.victoryOverlay.classList.remove('hidden');
  }

  hideVictory() {
    this.els.victoryOverlay.classList.add('hidden');
  }

  setExcavateButtonsEnabled(enabled) {
    this.els.btnBlue.disabled = !enabled;
    this.els.btnRed.disabled = !enabled;
  }

  setMuteIcon(muted) {
    this.els.btnMute.textContent = muted ? '🔇' : '🔊';
  }

  bindSetup({ onInputChange, onStart }) {
    this.els.wordInput.addEventListener('input', onInputChange);
    this.els.starCount.addEventListener('input', onInputChange);
    this.els.btnStartGame.addEventListener('click', onStart);
  }

  bindControls({
    onBlueExcavate,
    onRedExcavate,
    onReset,
    onBackSetup,
    onMute,
    onFullscreen,
    onVictoryDismiss,
  }) {
    this.els.btnBlue.addEventListener('click', onBlueExcavate);
    this.els.btnRed.addEventListener('click', onRedExcavate);
    this.els.btnReset.addEventListener('click', onReset);
    this.els.btnBackSetup.addEventListener('click', onBackSetup);
    this.els.btnBackSetupFooter.addEventListener('click', onBackSetup);
    this.els.btnMute.addEventListener('click', onMute);
    this.els.btnFullscreen.addEventListener('click', onFullscreen);
    this.els.btnVictoryDismiss.addEventListener('click', onVictoryDismiss);
  }
}
