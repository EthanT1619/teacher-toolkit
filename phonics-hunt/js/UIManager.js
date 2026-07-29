/**
 * UIManager — DOM updates for setup and game screens.
 */
class UIManager {
  constructor() {
    this.els = {
      setupScreen: document.getElementById('setup-screen'),
      gameScreen: document.getElementById('game-screen'),
      wordInput: document.getElementById('word-input'),
      wordCountLabel: document.getElementById('word-count-label'),
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
    this._victoryState = null;
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

    this.els.wordCountLabel.textContent = window.phT('setup.wordCount', { count });
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
    this.els.gridInfo.textContent = window.phT('grid.info', {
      rows,
      cols,
      wordCount,
      starCount,
    });
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
    this._victoryState = { blueScore, redScore, blueName, redName };
    this._renderVictory();
    this.els.victoryOverlay.classList.remove('hidden');
  }

  refreshVictory() {
    if (!this._victoryState) return;
    this._renderVictory();
  }

  _renderVictory() {
    const { blueScore, redScore, blueName, redName } = this._victoryState;
    let title;
    let message;

    if (blueScore > redScore) {
      title = window.phT('victory.teamWins', { team: blueName });
      message = window.phT('victory.scoreLine', {
        teamA: blueName,
        scoreA: blueScore,
        teamB: redName,
        scoreB: redScore,
      });
    } else if (redScore > blueScore) {
      title = window.phT('victory.teamWins', { team: redName });
      message = window.phT('victory.scoreLine', {
        teamA: redName,
        scoreA: redScore,
        teamB: blueName,
        scoreB: blueScore,
      });
    } else {
      title = window.phT('victory.tie');
      message = window.phT('victory.tieMessage', { score: blueScore });
    }

    this.els.victoryTitle.textContent = title;
    this.els.victoryMessage.textContent = message;
  }

  hideVictory() {
    this.els.victoryOverlay.classList.add('hidden');
    this._victoryState = null;
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
