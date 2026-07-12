/**
 * Game - Orchestrates setup → battle flow, rounds, preparation bonus, and items.
 */
class Game {
  constructor() {
    this.ui = new UIManager();
    this.sound = new SoundManager();
    this.animations = new AnimationManager(this.ui);
    this.actions = new ActionSystem(this.sound, this.animations);
    this.setup = new SetupManager((config) => this.startBattle(config));

    this.lessonConfig = null;
    this.currentRoundIndex = 0;

    this.blueCastle = new Castle(Castle.TEAMS.BLUE, 100);
    this.redCastle = new Castle(Castle.TEAMS.RED, 100);

    this.gameOver = false;
    this.busy = false;
    this.actionQueue = null;

    this._bindEvents();
    this.ui.showSetup();
  }

  _bindEvents() {
    const { ui } = this;

    [...ui.elements.blueActionButtons, ...ui.elements.redActionButtons].forEach(btn => {
      btn.addEventListener('click', () => {
        this.onTeamAction(btn.dataset.team, btn.dataset.action);
      });
    });

    [...ui.elements.blueItemButtons, ...ui.elements.redItemButtons].forEach(btn => {
      btn.addEventListener('click', () => {
        this.onUseItem(btn.dataset.team, btn.dataset.item);
      });
    });

    ui.elements.btnMute.addEventListener('click', () => {
      ui.updateMuteButton(this.sound.toggleMute());
    });

    ui.elements.btnEndRound.addEventListener('click', () => this.endRound());
    ui.elements.btnBackSetup.addEventListener('click', () => this.backToSetup());
    ui.elements.btnResetAfterWin.addEventListener('click', () => this.backToSetup());
    ui.elements.btnBackSetupComplete.addEventListener('click', () => this.backToSetup());
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getCastle(team) {
    return team === Castle.TEAMS.BLUE ? this.blueCastle : this.redCastle;
  }

  getOpponent(team) {
    return team === Castle.TEAMS.BLUE ? this.redCastle : this.blueCastle;
  }

  get currentRoundNum() {
    return this.currentRoundIndex + 1;
  }

  get totalRounds() {
    return this.lessonConfig ? this.lessonConfig.rounds.length : 0;
  }

  get currentRoundName() {
    return this.lessonConfig
      ? this.lessonConfig.rounds[this.currentRoundIndex]
      : '';
  }

  get isLastRound() {
    if (!this.lessonConfig || this.totalRounds < 1) return true;
    return this.currentRoundIndex >= this.totalRounds - 1;
  }

  getWinnerName(team) {
    return team === Castle.TEAMS.BLUE
      ? this.lessonConfig.blueName
      : this.lessonConfig.redName;
  }

  /** Apply Preparation Bonus shields & inventory at game start. */
  _applyPreparationBonuses(config) {
    const blueTier = PreparationBonus.getBonusTier(config.blueHomework.percent);
    const redTier = PreparationBonus.getBonusTier(config.redHomework.percent);

    const blueCounts = PreparationBonus.countItems(config.bluePrepItems);
    const redCounts = PreparationBonus.countItems(config.redPrepItems);

    const blueShield = PreparationBonus.calcStartShield(blueTier.autoShield, blueCounts.shield);
    const redShield = PreparationBonus.calcStartShield(redTier.autoShield, redCounts.shield);

    this.blueCastle.applyPreparationBonuses(
      blueShield,
      PreparationBonus.buildInventory(config.bluePrepItems)
    );
    this.redCastle.applyPreparationBonuses(
      redShield,
      PreparationBonus.buildInventory(config.redPrepItems)
    );
  }

  startBattle(config) {
    if (!config.rounds || config.rounds.length < 1) {
      alert('Please configure at least one round.');
      return;
    }

    this.lessonConfig = {
      blueName: config.blueName,
      redName: config.redName,
      maxHp: config.maxHp,
      rounds: [...config.rounds],
      blueHomework: { ...config.blueHomework },
      redHomework: { ...config.redHomework },
      bluePrepItems: [...config.bluePrepItems],
      redPrepItems: [...config.redPrepItems]
    };
    this.currentRoundIndex = 0;

    this.blueCastle = new Castle(Castle.TEAMS.BLUE, config.maxHp);
    this.redCastle = new Castle(Castle.TEAMS.RED, config.maxHp);
    this._applyPreparationBonuses(config);

    this.gameOver = false;
    this.busy = false;
    this.actionQueue = null;

    this.ui.hideSetup();
    this.ui.showBattle();
    this.ui.hideWinner();
    this.ui.hideLessonComplete();
    this.ui.hideRoundAdvance();
    this.ui.hidePendingHints();
    this.animations.resetCastleVisuals();
    this.ui.setControlsEnabled(true);
    this._render();
  }

  /** Use a preparation bonus inventory item. */
  onUseItem(team, itemType) {
    if (this.gameOver || this.busy || !this.lessonConfig) return;

    const castle = this.getCastle(team);

    if (itemType === 'repairKit') {
      const result = castle.useRepairKit();
      if (!result) return;

      this.sound.playRepair();
      this.animations.repairGlow(team);
      this.animations.showFloatNumber(team, `+${result.healed}`, 'heal');
      this._render();
      return;
    }

    if (itemType === 'charge') {
      const result = castle.useChargeItem();
      if (!result) return;

      if (result.alreadyActive) {
        alert('Charge is already active for this team!');
        return;
      }

      this.sound.playCharge();
      this.animations.showChargeAura(team, true);
      this._render();
    }
  }

  async onTeamAction(team, actionType) {
    if (this.gameOver || !this.lessonConfig) return;

    const pendingForTeam = this.actionQueue &&
      this.actionQueue.team === team &&
      this.actionQueue.remaining > 0;

    if (this.busy && !pendingForTeam) return;

    if (!pendingForTeam) {
      const castle = this.getCastle(team);
      const actionCount = castle.hasCharge ? 2 : 1;
      if (castle.hasCharge) castle.consumeCharge();
      this.actionQueue = { team, remaining: actionCount };
    }

    this.busy = true;
    this.ui.setControlsEnabled(false);

    const actor = this.getCastle(team);
    const opponent = this.getOpponent(team);
    const result = await this.actions.execute(actionType, actor, opponent);

    this.actionQueue.remaining -= 1;
    this._render();

    if (result && result.destroyed) {
      await this._handleCastleDestroyed(team);
      return;
    }

    if (this.actionQueue.remaining > 0) {
      this.ui.setTeamControlsEnabled(team, true);
      this._render();
      this.ui.showPendingHint(team, this.actionQueue.remaining);
    } else {
      this.actionQueue = null;
      this.busy = false;
      this.ui.hidePendingHints();
      this.ui.setControlsEnabled(true);
      this._render();
    }
  }

  async _handleCastleDestroyed(winnerTeam) {
    this.busy = true;
    this.actionQueue = null;
    this.ui.hidePendingHints();
    this.ui.setControlsEnabled(false);

    const loser = this.getOpponent(winnerTeam);
    const winnerName = this.getWinnerName(winnerTeam);
    const wonRoundNum = this.currentRoundNum;
    const wonRoundName = this.currentRoundName;

    this.animations.explodeCastle(loser.team);
    this.sound.playExplosion();
    await this._delay(900);
    this.sound.playVictory();

    if (this.isLastRound) {
      this.gameOver = true;
      this.busy = false;
      this.ui.showWinner(winnerName);
      return;
    }

    this.ui.showRoundWin(winnerName, wonRoundNum, wonRoundName);
    await this.ui.hideRoundWinAfter(2200);
    this._advanceToNextRound();
  }

  endRound() {
    if (!this.lessonConfig || this.gameOver || this.busy) return;

    if (this.isLastRound) {
      this.gameOver = true;
      this.ui.showLessonComplete();
      this.ui.setControlsEnabled(false);
      return;
    }

    this._advanceToNextRound();
  }

  _advanceToNextRound() {
    this.currentRoundIndex += 1;
    this._restartRoundState();
    this._render();
    this.ui.showRoundAdvance(this.currentRoundNum, this.currentRoundName);
  }

  _restartRoundState() {
    this.gameOver = false;
    this.busy = false;
    this.actionQueue = null;

    this.blueCastle.reset();
    this.redCastle.reset();
    this.blueCastle.setMaxHp(this.lessonConfig.maxHp);
    this.redCastle.setMaxHp(this.lessonConfig.maxHp);

    this.animations.resetCastleVisuals();
    this.ui.hidePendingHints();
    this.ui.hideWinner();
    this.ui.hideLessonComplete();
    this.ui.hideRoundAdvance();
    this.ui.setControlsEnabled(true);
  }

  backToSetup() {
    if (this.lessonConfig) {
      this.setup.populate(this.lessonConfig);
    }
    this.ui.hideBattle();
    this.ui.hideWinner();
    this.ui.hideLessonComplete();
    this.ui.hideRoundAdvance();
    this.ui.showSetup();
    this.lessonConfig = null;
    this.gameOver = false;
    this.busy = false;
  }

  _render() {
    if (!this.lessonConfig) return;

    this.ui.updateRound(
      this.currentRoundNum,
      this.totalRounds,
      this.currentRoundName
    );
    this.ui.updateTeamNames(this.lessonConfig.blueName, this.lessonConfig.redName);
    this.ui.updateEndRoundButton(this.isLastRound);
    this.ui.updateAllCastles(this.blueCastle, this.redCastle);
    this.ui.updateInventory(this.blueCastle);
    this.ui.updateInventory(this.redCastle);
  }
}
