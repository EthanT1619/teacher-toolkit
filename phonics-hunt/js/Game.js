/**
 * Game — Core game logic for Word Star Hunt.
 */
class Game {
  constructor() {
    this.ui = new UIManager();
    this.sound = new SoundManager();
    this.grid = null;

    this.entries = [];
    this.starCount = 1;
    this.blueName = 'Blue Team';
    this.redName = 'Red Team';
    this.starPoints = 1;

    this.blueScore = 0;
    this.redScore = 0;
    this.activeTeam = null;
    this.awaitingTile = false;
    this.gameOver = false;
    this.processing = false;

    this._init();
  }

  _init() {
    this._bindSetup();
    this._bindControls();
    this._refreshPreview();
  }

  _bindSetup() {
    this.ui.bindSetup({
      onInputChange: () => this._refreshPreview(),
      onStart: () => this._startGame(),
    });
  }

  _bindControls() {
    this.ui.bindControls({
      onBlueExcavate: () => this._startTurn('blue'),
      onRedExcavate: () => this._startTurn('red'),
      onReset: () => this._resetScores(),
      onBackSetup: () => this._backToSetup(),
      onMute: () => {
        const muted = this.sound.toggleMute();
        this.ui.setMuteIcon(muted);
      },
      onFullscreen: () => this._toggleFullscreen(),
      onVictoryDismiss: () => this.ui.hideVictory(),
    });
  }

  _refreshPreview() {
    const setup = this.ui.getSetupData();
    const words = WordParser.parse(setup.wordText);
    this.ui.updateWordPreview(words, setup.starCount);
  }

  _startGame() {
    const setup = this.ui.getSetupData();
    this.entries = WordParser.parse(setup.wordText);
    this.starCount = setup.starCount;

    if (this.entries.length < 2) {
      this.ui.showToast('단어를 2개 이상 입력해 주세요.');
      return;
    }

    if (this.starCount < 1 || this.starCount > this.entries.length) {
      this.ui.showToast(`별 개수는 1~${this.entries.length} 사이로 설정해 주세요.`);
      return;
    }

    this.blueName = setup.blueName;
    this.redName = setup.redName;
    this.starPoints = setup.starPoints;

    this.blueScore = 0;
    this.redScore = 0;
    this.activeTeam = null;
    this.awaitingTile = false;
    this.gameOver = false;
    this.processing = false;

    this.ui.applyTeamNames(this.blueName, this.redName);
    this.ui.updateScores(0, 0);
    this.ui.setActiveTeam(null);
    this.ui.setExcavateButtonsEnabled(true);
    this.ui.hideVictory();
    this.ui.showGame();

    this._createGrid();
    this.ui.setStatus('팀을 선택하세요');
  }

  _createGrid() {
    this.grid = new Grid(
      this.ui.els.gridContainer,
      this.entries,
      this.starCount,
      this.starPoints,
      (tile) => this._onTileClick(tile)
    );
    this.grid.build();

    this.ui.setGridInfo(this.grid.rows, this.grid.cols, this.entries.length, this.starCount);
  }

  _startTurn(team) {
    if (this.gameOver || this.processing) return;

    this.activeTeam = team;
    this.awaitingTile = true;
    this.ui.setActiveTeam(team);
    this.ui.setExcavateButtonsEnabled(false);

    const teamName = team === 'blue' ? this.blueName : this.redName;
    this.ui.setStatus(`${teamName} — 학생이 단어를 말하면 해당 칸을 열어 주세요`);
    this.grid.setAllSelectable(true);
  }

  async _onTileClick(tile) {
    if (!this.awaitingTile || this.processing || tile.opened) return;

    this.processing = true;
    this.awaitingTile = false;
    this.grid.setAllSelectable(false);

    this.sound.playDig();
    tile.open();
    AnimationManager.playOpen(tile, tile.isStar);

    await this._delay(550);

    if (tile.isStar) {
      this._awardPoints(tile.points);
      this.sound.playTreasure();
      this.ui.showToast(`⭐ "${tile.word}" — 별 발견! +${tile.points}점`);
    } else {
      this.ui.showToast(`"${tile.word}" — 칸을 열었습니다`);
    }

    this.processing = false;

    if (this.grid.isFullyOpened()) {
      this._endGame();
    } else {
      this._finishTurn();
    }
  }

  _awardPoints(points) {
    if (this.activeTeam === 'blue') {
      this.blueScore += points;
    } else {
      this.redScore += points;
    }
    this.ui.updateScores(this.blueScore, this.redScore, this.activeTeam);
  }

  _finishTurn() {
    this.activeTeam = null;
    this.ui.setActiveTeam(null);
    this.ui.setExcavateButtonsEnabled(true);
    this.ui.setStatus('팀을 선택하세요');
  }

  _endGame() {
    this.gameOver = true;
    this.awaitingTile = false;
    this.ui.setActiveTeam(null);
    this.ui.setExcavateButtonsEnabled(false);
    this.ui.setStatus('게임 종료!');
    this.sound.playVictory();

    setTimeout(() => {
      this.ui.showVictory(this.blueScore, this.redScore, this.blueName, this.redName);
    }, 800);
  }

  _resetScores() {
    if (this.processing) return;

    this.blueScore = 0;
    this.redScore = 0;
    this.activeTeam = null;
    this.awaitingTile = false;
    this.gameOver = false;
    this.processing = false;

    this.ui.updateScores(0, 0);
    this.ui.setActiveTeam(null);
    this.ui.setExcavateButtonsEnabled(true);
    this.ui.setStatus('팀을 선택하세요');
    this.ui.hideVictory();

    this.grid.build();
  }

  _backToSetup() {
    if (this.processing) return;
    this.ui.hideVictory();
    this.ui.showSetup();
    this._refreshPreview();
  }

  _toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
