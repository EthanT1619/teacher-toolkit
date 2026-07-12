/**
 * SetupManager - Lesson setup: teams, HP, rounds, Preparation Bonus.
 */
class SetupManager {
  static DEFAULT_ROUND_NAMES = [
    'Vocabulary', 'Reading', 'Speaking', 'Grammar', 'Free Talk',
    'Listening', 'Writing', 'Review'
  ];

  static ITEM_OPTIONS = [
    { id: 'shield', label: 'Shield +20' },
    { id: 'repairKit', label: 'Repair Kit' },
    { id: 'charge', label: 'Charge' }
  ];

  static MIN_ROUNDS = 1;
  static MAX_ROUNDS = 10;

  constructor(onStart) {
    this.onStart = onStart;
    this.elements = {
      screen: document.getElementById('setup-screen'),
      blueName: document.getElementById('setup-blue-name'),
      redName: document.getElementById('setup-red-name'),
      hp: document.getElementById('setup-hp'),
      roundCount: document.getElementById('setup-round-count'),
      roundNames: document.getElementById('setup-round-names'),
      btnMinus: document.getElementById('btn-rounds-minus'),
      btnPlus: document.getElementById('btn-rounds-plus'),
      btnStart: document.getElementById('btn-start-battle'),
      prepBlueTitle: document.getElementById('prep-blue-title'),
      prepRedTitle: document.getElementById('prep-red-title'),
      blueHwCompleted: document.getElementById('blue-hw-completed'),
      blueHwTotal: document.getElementById('blue-hw-total'),
      redHwCompleted: document.getElementById('red-hw-completed'),
      redHwTotal: document.getElementById('red-hw-total'),
      bluePrepSummary: document.getElementById('blue-prep-summary'),
      redPrepSummary: document.getElementById('red-prep-summary'),
      bluePrepItems: document.getElementById('blue-prep-items'),
      redPrepItems: document.getElementById('red-prep-items'),
      blueItemChoices: document.getElementById('blue-item-choices'),
      redItemChoices: document.getElementById('red-item-choices'),
      bluePrepSelected: document.getElementById('blue-prep-selected'),
      redPrepSelected: document.getElementById('red-prep-selected')
    };

    this.roundNames = ['Vocabulary', 'Reading', 'Speaking'];
    this.blueSelectedItems = [];
    this.redSelectedItems = [];

    this._bindEvents();
    this._renderRoundInputs();
    this._updatePrepUI('blue');
    this._updatePrepUI('red');
  }

  _bindEvents() {
    this.elements.btnMinus.addEventListener('click', () => {
      this._setRoundCount(this._getRoundCount() - 1);
    });

    this.elements.btnPlus.addEventListener('click', () => {
      this._setRoundCount(this._getRoundCount() + 1);
    });

    this.elements.roundCount.addEventListener('change', () => {
      this._setRoundCount(this._getRoundCount());
    });

    this.elements.roundCount.addEventListener('input', () => {
      this._setRoundCount(this._getRoundCount());
    });

    this.elements.btnStart.addEventListener('click', () => {
      const config = this.readConfig();
      if (config) this.onStart(config);
    });

    this.elements.blueName.addEventListener('input', () => {
      this.elements.prepBlueTitle.textContent = this.elements.blueName.value.trim() || 'Blue Team';
    });

    this.elements.redName.addEventListener('input', () => {
      this.elements.prepRedTitle.textContent = this.elements.redName.value.trim() || 'Red Team';
    });

    ['blue', 'red'].forEach(team => {
      const completed = team === 'blue' ? this.elements.blueHwCompleted : this.elements.redHwCompleted;
      const total = team === 'blue' ? this.elements.blueHwTotal : this.elements.redHwTotal;
      completed.addEventListener('input', () => this._updatePrepUI(team));
      total.addEventListener('input', () => this._updatePrepUI(team));
    });
  }

  _getTeamElements(team) {
    const isBlue = team === 'blue';
    return {
      completed: isBlue ? this.elements.blueHwCompleted : this.elements.redHwCompleted,
      total: isBlue ? this.elements.blueHwTotal : this.elements.redHwTotal,
      summary: isBlue ? this.elements.bluePrepSummary : this.elements.redPrepSummary,
      itemArea: isBlue ? this.elements.bluePrepItems : this.elements.redPrepItems,
      itemChoices: isBlue ? this.elements.blueItemChoices : this.elements.redItemChoices,
      selectedText: isBlue ? this.elements.bluePrepSelected : this.elements.redPrepSelected,
      get selected() { return isBlue ? this.blueSelectedItems : this.redSelectedItems; },
      set selected(v) {
        if (isBlue) this.blueSelectedItems = v;
        else this.redSelectedItems = v;
      }
    };
  }

  _readHomework(team) {
    const el = this._getTeamElements(team);
    return PreparationBonus.normalizeHomework(el.completed.value, el.total.value);
  }

  _updatePrepUI(team) {
    const el = this._getTeamElements(team);
    const hw = this._readHomework(team);
    const tier = PreparationBonus.getBonusTier(hw.percent);

    el.summary.textContent = hw.total === 0
      ? 'No Bonus (no students)'
      : `${hw.completed} / ${hw.total} (${hw.percent}%) — ${tier.label}`;

    // Trim selections if slots reduced
    let selected = team === 'blue' ? this.blueSelectedItems : this.redSelectedItems;
    if (selected.length > tier.itemSlots) {
      selected = selected.slice(0, tier.itemSlots);
      if (team === 'blue') this.blueSelectedItems = selected;
      else this.redSelectedItems = selected;
    }

    if (tier.itemSlots > 0) {
      el.itemArea.classList.remove('hidden');
      this._renderItemChoices(team, tier.itemSlots, selected);
      this._updateSelectedText(team, selected, tier.itemSlots);
    } else {
      el.itemArea.classList.add('hidden');
      if (team === 'blue') this.blueSelectedItems = [];
      else this.redSelectedItems = [];
    }
  }

  _renderItemChoices(team, maxSlots, selected) {
    const el = this._getTeamElements(team);
    el.itemChoices.innerHTML = '';

    SetupManager.ITEM_OPTIONS.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-prep-item';
      btn.textContent = opt.label;
      btn.dataset.team = team;
      btn.dataset.item = opt.id;

      const count = selected.filter(i => i === opt.id).length;
      const atMax = selected.length >= maxSlots;

      if (count > 0) {
        btn.classList.add('selected');
        btn.textContent = `${opt.label} ✓`;
      }
      if (atMax && count === 0) {
        btn.disabled = true;
      }

      btn.addEventListener('click', () => this._toggleItem(team, opt.id, maxSlots));
      el.itemChoices.appendChild(btn);
    });
  }

  _toggleItem(team, itemId, maxSlots) {
    let selected = team === 'blue' ? [...this.blueSelectedItems] : [...this.redSelectedItems];
    const idx = selected.indexOf(itemId);

    if (idx >= 0) {
      selected.splice(idx, 1);
    } else if (selected.length < maxSlots) {
      selected.push(itemId);
    }

    if (team === 'blue') this.blueSelectedItems = selected;
    else this.redSelectedItems = selected;

    this._updatePrepUI(team);
  }

  _updateSelectedText(team, selected, maxSlots) {
    const el = this._getTeamElements(team);
    if (selected.length === 0) {
      el.selectedText.textContent = `Selected: (none) — ${selected.length}/${maxSlots}`;
      return;
    }
    const labels = selected.map(id => {
      const opt = SetupManager.ITEM_OPTIONS.find(o => o.id === id);
      return opt ? opt.label : id;
    });
    el.selectedText.textContent = `Selected: ${labels.join(', ')} (${selected.length}/${maxSlots})`;
  }

  _getRoundCount() {
    return parseInt(this.elements.roundCount.value, 10) || 1;
  }

  _setRoundCount(count) {
    const clamped = Math.max(
      SetupManager.MIN_ROUNDS,
      Math.min(SetupManager.MAX_ROUNDS, count)
    );
    this.elements.roundCount.value = clamped;

    while (this.roundNames.length < clamped) {
      const i = this.roundNames.length;
      this.roundNames.push(
        SetupManager.DEFAULT_ROUND_NAMES[i] || `Round ${i + 1}`
      );
    }
    while (this.roundNames.length > clamped) {
      this.roundNames.pop();
    }

    this._renderRoundInputs();
  }

  _renderRoundInputs() {
    const container = this.elements.roundNames;
    container.innerHTML = '';

    this.roundNames.forEach((name, i) => {
      const label = document.createElement('label');
      label.className = 'setup-round-label';
      label.innerHTML = `Round ${i + 1} Name<input type="text" class="setup-round-input" data-index="${i}" value="${this._escapeAttr(name)}" />`;
      container.appendChild(label);

      label.querySelector('input').addEventListener('input', (e) => {
        this.roundNames[i] = e.target.value;
      });
    });
  }

  _escapeAttr(str) {
    return str.replace(/"/g, '&quot;');
  }

  _syncRoundNamesFromInputs() {
    const count = this._getRoundCount();
    const inputs = this.elements.roundNames.querySelectorAll('.setup-round-input');
    this.roundNames = [];

    for (let i = 0; i < count; i++) {
      const value = inputs[i] ? inputs[i].value.trim() : '';
      this.roundNames.push(
        value || SetupManager.DEFAULT_ROUND_NAMES[i] || `Round ${i + 1}`
      );
    }
  }

  readConfig() {
    const count = Math.max(
      SetupManager.MIN_ROUNDS,
      Math.min(SetupManager.MAX_ROUNDS, this._getRoundCount())
    );
    this._setRoundCount(count);
    this._syncRoundNamesFromInputs();

    const blueName = this.elements.blueName.value.trim() || 'Blue Team';
    const redName = this.elements.redName.value.trim() || 'Red Team';
    const maxHp = parseInt(this.elements.hp.value, 10);

    if (!maxHp || maxHp < 10 || maxHp > 500) {
      alert('Castle HP must be between 10 and 500.');
      return null;
    }

    if (this.roundNames.length === 0) {
      alert('Add at least one round.');
      return null;
    }

    const blueHomework = this._readHomework('blue');
    const redHomework = this._readHomework('red');
    const blueTier = PreparationBonus.getBonusTier(blueHomework.percent);
    const redTier = PreparationBonus.getBonusTier(redHomework.percent);

    if (this.blueSelectedItems.length > blueTier.itemSlots) {
      alert(`${blueName}: select at most ${blueTier.itemSlots} Bonus Item(s).`);
      return null;
    }
    if (this.redSelectedItems.length > redTier.itemSlots) {
      alert(`${redName}: select at most ${redTier.itemSlots} Bonus Item(s).`);
      return null;
    }

    return {
      blueName,
      redName,
      maxHp,
      rounds: [...this.roundNames],
      blueHomework,
      redHomework,
      bluePrepItems: [...this.blueSelectedItems],
      redPrepItems: [...this.redSelectedItems]
    };
  }

  populate(config) {
    this.elements.blueName.value = config.blueName;
    this.elements.redName.value = config.redName;
    this.elements.hp.value = config.maxHp;
    this.roundNames = [...config.rounds];
    this.elements.roundCount.value = this.roundNames.length;
    this._renderRoundInputs();

    if (config.blueHomework) {
      this.elements.blueHwCompleted.value = config.blueHomework.completed;
      this.elements.blueHwTotal.value = config.blueHomework.total;
    }
    if (config.redHomework) {
      this.elements.redHwCompleted.value = config.redHomework.completed;
      this.elements.redHwTotal.value = config.redHomework.total;
    }
    this.blueSelectedItems = config.bluePrepItems ? [...config.bluePrepItems] : [];
    this.redSelectedItems = config.redPrepItems ? [...config.redPrepItems] : [];

    this.elements.prepBlueTitle.textContent = config.blueName;
    this.elements.prepRedTitle.textContent = config.redName;
    this._updatePrepUI('blue');
    this._updatePrepUI('red');
  }
}
