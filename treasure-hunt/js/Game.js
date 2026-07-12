/**
 * Game — Core game logic and state management.
 */
class Game {
  constructor() {
    this.ui = new UIManager();
    this.sound = new SoundManager();
    this.grid = null;

    this.blueScore = 0;
    this.redScore = 0;
    this.activeTeam = null;
    this.awaitingTile = false;
    this.bonusExcavation = false;
    this.gameOver = false;
    this.processing = false;

    this.rows = 5;
    this.cols = 4;

    this._init();
  }

  _init() {
    this._createGrid();
    this._bindControls();
    this.ui.setStatus('Select a team to excavate');
  }

  _createGrid() {
    this.grid = new Grid(
      this.ui.els.gridContainer,
      this.rows,
      this.cols,
      (tile) => this._onTileClick(tile)
    );
    this.grid.build();
  }

  _bindControls() {
    this.ui.bindControls({
      onBlueExcavate: () => this._startExcavation('blue'),
      onRedExcavate: () => this._startExcavation('red'),
      onReset: () => this._resetGame(),
      onNewMap: () => this._newMap(),
      onMute: () => {
        const muted = this.sound.toggleMute();
        this.ui.setMuteIcon(muted);
      },
      onFullscreen: () => this._toggleFullscreen(),
      onVictoryDismiss: () => this.ui.hideVictory(),
    });
  }

  /** Teacher selects a team to excavate */
  _startExcavation(team) {
    if (this.gameOver || this.processing) return;

    this.activeTeam = team;
    this.awaitingTile = true;
    this.ui.setActiveTeam(team);
    this.ui.setExcavateButtonsEnabled(false);

    const teamName = team === 'blue' ? 'Blue Team' : 'Red Team';
    this.ui.setStatus(`${teamName} — choose a tile to excavate!`);
    this.grid.setAllSelectable(true);
  }

  /** Handle tile selection during excavation */
  async _onTileClick(tile) {
    if (!this.awaitingTile || this.processing || tile.revealed) return;

    this.processing = true;
    this.awaitingTile = false;
    this.grid.setAllSelectable(false);

    this.sound.playDig();
    tile.reveal();
    AnimationManager.playReveal(tile, tile.item.isTreasure);

    await this._delay(400);

    await this._applyItemEffect(tile);

    this.processing = false;

    if (this.grid.isFullyExcavated()) {
      this._endGame();
    } else if (!this.bonusExcavation) {
      this._finishTurn();
    } else {
      this.bonusExcavation = false;
      this.awaitingTile = true;
      const teamName = this.activeTeam === 'blue' ? 'Blue Team' : 'Red Team';
      this.ui.setStatus(`💣 Bonus dig! ${teamName} — choose another tile!`);
      this.grid.setAllSelectable(true);
    }
  }

  /** Apply the revealed item's effect immediately */
  async _applyItemEffect(tile) {
    const item = tile.item;

    if (item.isTreasure) {
      this._awardPoints(item.points);
      this.sound.playTreasure();
      return;
    }

    switch (item.effect) {
      case 'revealTreasure':
        await this._effectTreasureMap();
        break;
      case 'bonusExcavation':
        await this._effectDynamite(tile);
        break;
      case 'shuffleUnrevealed':
        await this._effectUnstableGround();
        break;
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

  /** Treasure Map: highlight one random hidden treasure */
  async _effectTreasureMap() {
    this.sound.playMagic();
    this.grid.clearHighlights();

    const treasures = this.grid.getHiddenTreasures();
    if (treasures.length === 0) {
      this.ui.showToast('🗺 No hidden treasures remain!');
      return;
    }

    const target = treasures[Math.floor(Math.random() * treasures.length)];
    target.setHighlight(true);
    this.ui.showToast(`🗺 A treasure is hidden nearby!`);

    await this._delay(1500);
  }

  /** Dynamite: grant one bonus excavation for the active team */
  async _effectDynamite(tile) {
    this.sound.playExplosion();
    AnimationManager.playExplosion(tile);
    this.bonusExcavation = true;
    this.ui.showToast('💣 Dynamite! Excavate one more tile!');
    await this._delay(600);
  }

  /** Unstable Ground: shuffle unrevealed tile contents */
  async _effectUnstableGround() {
    this.sound.playRumble();
    this.grid.clearHighlights();
    this.grid.shake();
    this.grid.shuffleUnrevealed();
    this.ui.showToast('⛏ The ground shifts! Hidden tiles reshuffled!');
    await this._delay(700);
  }

  _finishTurn() {
    this.activeTeam = null;
    this.ui.setActiveTeam(null);
    this.ui.setExcavateButtonsEnabled(true);
    this.ui.setStatus('Select a team to excavate');
  }

  _endGame() {
    this.gameOver = true;
    this.awaitingTile = false;
    this.ui.setActiveTeam(null);
    this.ui.setExcavateButtonsEnabled(false);
    this.ui.setStatus('Expedition complete!');
    this.sound.playVictory();

    setTimeout(() => {
      this.ui.showVictory(this.blueScore, this.redScore);
    }, 800);
  }

  _resetGame() {
    this.blueScore = 0;
    this.redScore = 0;
    this.activeTeam = null;
    this.awaitingTile = false;
    this.bonusExcavation = false;
    this.gameOver = false;
    this.processing = false;

    this.ui.updateScores(0, 0);
    this.ui.setActiveTeam(null);
    this.ui.setExcavateButtonsEnabled(true);
    this.ui.setStatus('Select a team to excavate');
    this.ui.hideVictory();

    this.grid.build();
  }

  _newMap() {
    const { rows, cols } = this.ui.getMapSize();
    this.rows = Math.max(3, Math.min(8, rows));
    this.cols = Math.max(3, Math.min(8, cols));

    this.blueScore = 0;
    this.redScore = 0;
    this.activeTeam = null;
    this.awaitingTile = false;
    this.bonusExcavation = false;
    this.gameOver = false;
    this.processing = false;

    this.ui.updateScores(0, 0);
    this.ui.setActiveTeam(null);
    this.ui.setExcavateButtonsEnabled(true);
    this.ui.setStatus('New map ready — select a team to excavate');
    this.ui.hideVictory();

    this.grid.resize(this.rows, this.cols);
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
