/**
 * UIManager - DOM bindings for setup & battle screens.
 */
class UIManager {
  constructor() {
    this.elements = {
      setupScreen: document.getElementById('setup-screen'),
      battleScreen: document.getElementById('battle-screen'),
      roundLabel: document.getElementById('round-label'),
      roundName: document.getElementById('round-name'),
      blueTeamName: document.getElementById('blue-team-name'),
      redTeamName: document.getElementById('red-team-name'),
      blueHpBar: document.getElementById('blue-hp-bar'),
      redHpBar: document.getElementById('red-hp-bar'),
      blueHpText: document.getElementById('blue-hp-text'),
      redHpText: document.getElementById('red-hp-text'),
      blueShield: document.getElementById('blue-shield'),
      redShield: document.getElementById('red-shield'),
      blueShieldRow: document.getElementById('blue-shield-row'),
      redShieldRow: document.getElementById('red-shield-row'),
      blueCastle: document.getElementById('blue-castle'),
      redCastle: document.getElementById('red-castle'),
      blueCastleWrap: document.getElementById('blue-castle-wrap'),
      redCastleWrap: document.getElementById('red-castle-wrap'),
      blueChargeAura: document.getElementById('blue-charge-aura'),
      redChargeAura: document.getElementById('red-charge-aura'),
      blueShieldBarrier: document.getElementById('blue-shield-barrier'),
      redShieldBarrier: document.getElementById('red-shield-barrier'),
      blueFloat: document.getElementById('blue-float'),
      redFloat: document.getElementById('red-float'),
      projectileLayer: document.getElementById('projectile-layer'),
      blueActions: document.getElementById('blue-actions'),
      redActions: document.getElementById('red-actions'),
      bluePendingHint: document.getElementById('blue-pending-hint'),
      redPendingHint: document.getElementById('red-pending-hint'),
      blueActionButtons: document.querySelectorAll('[data-team="blue"][data-action]'),
      redActionButtons: document.querySelectorAll('[data-team="red"][data-action]'),
      blueItemButtons: document.querySelectorAll('[data-team="blue"][data-item]'),
      redItemButtons: document.querySelectorAll('[data-team="red"][data-item]'),
      blueItemRepair: document.getElementById('blue-item-repair'),
      blueItemCharge: document.getElementById('blue-item-charge'),
      redItemRepair: document.getElementById('red-item-repair'),
      redItemCharge: document.getElementById('red-item-charge'),
      btnMute: document.getElementById('btn-mute'),
      btnEndRound: document.getElementById('btn-end-round'),
      btnBackSetup: document.getElementById('btn-back-setup'),
      winnerModal: document.getElementById('winner-modal'),
      winnerTitle: document.getElementById('winner-title'),
      btnResetAfterWin: document.getElementById('btn-reset-after-win'),
      lessonCompleteModal: document.getElementById('lesson-complete-modal'),
      btnBackSetupComplete: document.getElementById('btn-back-setup-complete'),
      roundAdvanceBanner: document.getElementById('round-advance-banner')
    };
    this._roundAdvanceTimer = null;
    this._isLastRound = false;
  }

  showSetup() {
    this.elements.setupScreen.classList.remove('hidden');
  }

  hideSetup() {
    this.elements.setupScreen.classList.add('hidden');
  }

  showBattle() {
    this.elements.battleScreen.classList.remove('hidden');
  }

  hideBattle() {
    this.elements.battleScreen.classList.add('hidden');
  }

  updateRound(roundNum, totalRounds, roundName) {
    this.elements.roundLabel.textContent = csT('battle.roundLabel', {
      current: roundNum,
      total: totalRounds
    });
    this.elements.roundName.textContent = roundName;
  }

  updateEndRoundButton(isLastRound) {
    this._isLastRound = isLastRound;
    this.elements.btnEndRound.textContent = isLastRound
      ? csT('battle.finishLesson')
      : csT('battle.endRound');
  }

  updateTeamNames(blueName, redName) {
    this.elements.blueTeamName.textContent = blueName;
    this.elements.redTeamName.textContent = redName;
  }

  updateCastle(castle) {
    const team = castle.team;
    const isBlue = team === Castle.TEAMS.BLUE;

    const hpBar = isBlue ? this.elements.blueHpBar : this.elements.redHpBar;
    const hpText = isBlue ? this.elements.blueHpText : this.elements.redHpText;
    const shieldEl = isBlue ? this.elements.blueShield : this.elements.redShield;
    const shieldRow = isBlue ? this.elements.blueShieldRow : this.elements.redShieldRow;
    const chargeAura = isBlue ? this.elements.blueChargeAura : this.elements.redChargeAura;
    const shieldBarrier = isBlue ? this.elements.blueShieldBarrier : this.elements.redShieldBarrier;

    hpBar.style.width = `${castle.getHpPercent()}%`;
    hpText.textContent = `${castle.hp} / ${castle.maxHp}`;
    shieldEl.textContent = castle.shield;
    shieldRow.classList.toggle('active', castle.shield > 0);
    shieldBarrier.classList.toggle('active', castle.shield > 0);
    chargeAura.classList.toggle('active', castle.hasCharge);
  }

  updateAllCastles(blueCastle, redCastle) {
    this.updateCastle(blueCastle);
    this.updateCastle(redCastle);
    this.updateChargeButtons(blueCastle, redCastle);
  }

  updateInventory(castle) {
    const isBlue = castle.team === Castle.TEAMS.BLUE;
    const repairBtn = isBlue ? this.elements.blueItemRepair : this.elements.redItemRepair;
    const chargeBtn = isBlue ? this.elements.blueItemCharge : this.elements.redItemCharge;

    const repairCount = castle.items.repairKit;
    const chargeCount = castle.items.charge;
    const repairLabel = csT('items.repairKit');
    const chargeLabel = csT('items.charge');

    repairBtn.querySelector('.item-icon-badge').textContent = repairCount;
    chargeBtn.querySelector('.item-icon-badge').textContent = chargeCount;
    repairBtn.title = csT('battle.repairKitTitle', { count: repairCount });
    chargeBtn.title = csT('battle.chargeTitle', { count: chargeCount });
    repairBtn.setAttribute('aria-label', repairLabel);
    chargeBtn.setAttribute('aria-label', chargeLabel);

    repairBtn.classList.toggle('hidden', repairCount <= 0);
    chargeBtn.classList.toggle('hidden', chargeCount <= 0);

    repairBtn.disabled = repairCount <= 0;
    chargeBtn.disabled = chargeCount <= 0 || castle.hasCharge;
  }

  updateChargeButtons(blueCastle, redCastle) {
    this.elements.blueActionButtons.forEach(btn => {
      if (btn.dataset.action === 'charge') {
        btn.disabled = blueCastle.hasCharge;
      }
    });
    this.elements.redActionButtons.forEach(btn => {
      if (btn.dataset.action === 'charge') {
        btn.disabled = redCastle.hasCharge;
      }
    });
  }

  showWinner(winnerName) {
    this.elements.winnerTitle.textContent = csT('battle.winnerTitle', { team: winnerName });
    this.elements.winnerModal.classList.remove('hidden');
  }

  hideWinner() {
    this.elements.winnerModal.classList.add('hidden');
  }

  showLessonComplete() {
    this.elements.lessonCompleteModal.classList.remove('hidden');
  }

  hideLessonComplete() {
    this.elements.lessonCompleteModal.classList.add('hidden');
  }

  /** Brief banner: team won this round (castle destroyed). */
  showRoundWin(winnerName, roundNum, roundName) {
    const banner = this.elements.roundAdvanceBanner;
    banner.replaceChildren();
    banner.className = 'round-advance-banner round-win';

    const win = document.createElement('span');
    win.className = 'round-win-text';
    win.textContent = csT('battle.roundWin', { team: winnerName, num: roundNum });

    const name = document.createElement('span');
    name.className = 'round-advance-name';
    name.textContent = roundName;

    banner.append(win, name);
    banner.classList.remove('hidden');
  }

  /** Brief banner when advancing to the next round. */
  showRoundAdvance(roundNum, roundName) {
    const banner = this.elements.roundAdvanceBanner;
    banner.replaceChildren();
    banner.className = 'round-advance-banner';

    const label = document.createElement('span');
    label.className = 'round-advance-label';
    label.textContent = csT('battle.roundAdvance', { num: roundNum });

    const name = document.createElement('span');
    name.className = 'round-advance-name';
    name.textContent = roundName;

    banner.append(label, name);
    banner.classList.remove('hidden');

    if (this._roundAdvanceTimer) clearTimeout(this._roundAdvanceTimer);
    this._roundAdvanceTimer = setTimeout(() => {
      banner.classList.add('hidden');
      this._roundAdvanceTimer = null;
    }, 1800);
  }

  /** Wait for round-win banner, then hide. */
  hideRoundWinAfter(ms = 2200) {
    return new Promise(resolve => {
      if (this._roundAdvanceTimer) clearTimeout(this._roundAdvanceTimer);
      this._roundAdvanceTimer = setTimeout(() => {
        this.elements.roundAdvanceBanner.classList.add('hidden');
        this._roundAdvanceTimer = null;
        resolve();
      }, ms);
    });
  }

  hideRoundAdvance() {
    if (this._roundAdvanceTimer) {
      clearTimeout(this._roundAdvanceTimer);
      this._roundAdvanceTimer = null;
    }
    this.elements.roundAdvanceBanner.classList.add('hidden');
  }

  setControlsEnabled(enabled) {
    [...this.elements.blueActionButtons, ...this.elements.redActionButtons].forEach(btn => {
      btn.disabled = !enabled;
    });
    [...this.elements.blueItemButtons, ...this.elements.redItemButtons].forEach(btn => {
      if (!enabled) btn.disabled = true;
    });
    this.elements.btnEndRound.disabled = !enabled;
  }

  setTeamControlsEnabled(team, enabled) {
    const buttons = team === Castle.TEAMS.BLUE
      ? this.elements.blueActionButtons
      : this.elements.redActionButtons;
    const otherButtons = team === Castle.TEAMS.BLUE
      ? this.elements.redActionButtons
      : this.elements.blueActionButtons;
    const itemButtons = team === Castle.TEAMS.BLUE
      ? this.elements.blueItemButtons
      : this.elements.redItemButtons;
    const otherItems = team === Castle.TEAMS.BLUE
      ? this.elements.redItemButtons
      : this.elements.blueItemButtons;

    buttons.forEach(btn => { btn.disabled = !enabled; });
    otherButtons.forEach(btn => { btn.disabled = true; });
    itemButtons.forEach(btn => { if (!enabled) btn.disabled = true; });
    otherItems.forEach(btn => { btn.disabled = true; });
    this.elements.btnEndRound.disabled = true;
  }

  showPendingHint(team, remaining) {
    const isBlue = team === Castle.TEAMS.BLUE;
    const hint = isBlue ? this.elements.bluePendingHint : this.elements.redPendingHint;
    const panel = isBlue ? this.elements.blueActions : this.elements.redActions;
    const otherHint = isBlue ? this.elements.redPendingHint : this.elements.bluePendingHint;
    const otherPanel = isBlue ? this.elements.redActions : this.elements.blueActions;

    hint.textContent = remaining > 1
      ? csT('battle.pendingActions', { count: remaining })
      : csT('battle.pendingAction');
    hint.classList.remove('hidden');
    panel.classList.add('pending');
    otherHint.classList.add('hidden');
    otherPanel.classList.remove('pending');
  }

  hidePendingHints() {
    this.elements.bluePendingHint.classList.add('hidden');
    this.elements.redPendingHint.classList.add('hidden');
    this.elements.blueActions.classList.remove('pending');
    this.elements.redActions.classList.remove('pending');
  }

  updateMuteButton(muted) {
    this.elements.btnMute.textContent = muted ? '🔇' : '🔊';
  }

  refreshI18n() {
    this.updateEndRoundButton(this._isLastRound);
  }
}
