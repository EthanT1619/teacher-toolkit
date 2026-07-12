/**
 * UIManager — Handles DOM updates for scores, status, toasts, and overlays.
 */
class UIManager {
  constructor() {
    this.els = {
      blueScore: document.getElementById('blue-score'),
      redScore: document.getElementById('red-score'),
      bluePanel: document.getElementById('blue-score-panel'),
      redPanel: document.getElementById('red-score-panel'),
      statusText: document.getElementById('status-text'),
      toast: document.getElementById('toast'),
      victoryOverlay: document.getElementById('victory-overlay'),
      victoryTitle: document.getElementById('victory-title'),
      victoryMessage: document.getElementById('victory-message'),
      btnBlue: document.getElementById('btn-blue-excavate'),
      btnRed: document.getElementById('btn-red-excavate'),
      btnReset: document.getElementById('btn-reset'),
      btnNewMap: document.getElementById('btn-new-map'),
      btnMute: document.getElementById('btn-mute'),
      btnFullscreen: document.getElementById('btn-fullscreen'),
      btnVictoryDismiss: document.getElementById('victory-dismiss'),
      mapRows: document.getElementById('map-rows'),
      mapCols: document.getElementById('map-cols'),
      gridContainer: document.getElementById('grid-container'),
    };

    this.toastTimer = null;
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

  /** Show a brief notification toast */
  showToast(message, duration = 2500) {
    clearTimeout(this.toastTimer);
    this.els.toast.textContent = message;
    this.els.toast.classList.remove('hidden');
    this.toastTimer = setTimeout(() => {
      this.els.toast.classList.add('hidden');
    }, duration);
  }

  showVictory(blueScore, redScore) {
    let title, message;

    if (blueScore > redScore) {
      title = 'Blue Team Wins!';
      message = `Blue Team: ${blueScore} pts  ·  Red Team: ${redScore} pts`;
    } else if (redScore > blueScore) {
      title = 'Red Team Wins!';
      message = `Red Team: ${redScore} pts  ·  Blue Team: ${blueScore} pts`;
    } else {
      title = 'It\'s a Tie!';
      message = `Both teams scored ${blueScore} Treasure Points!`;
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

  getMapSize() {
    return {
      rows: parseInt(this.els.mapRows.value, 10) || 5,
      cols: parseInt(this.els.mapCols.value, 10) || 4,
    };
  }

  /** Bind control callbacks */
  bindControls({ onBlueExcavate, onRedExcavate, onReset, onNewMap, onMute, onFullscreen, onVictoryDismiss }) {
    this.els.btnBlue.addEventListener('click', onBlueExcavate);
    this.els.btnRed.addEventListener('click', onRedExcavate);
    this.els.btnReset.addEventListener('click', onReset);
    this.els.btnNewMap.addEventListener('click', onNewMap);
    this.els.btnMute.addEventListener('click', onMute);
    this.els.btnFullscreen.addEventListener('click', onFullscreen);
    this.els.btnVictoryDismiss.addEventListener('click', onVictoryDismiss);
  }
}
