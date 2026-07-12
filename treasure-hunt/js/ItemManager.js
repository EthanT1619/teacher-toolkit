/**
 * ItemManager — Defines all excavatable items and their effects.
 * To add a new item, push another object into ITEM_DEFINITIONS.
 */

const ITEM_TYPES = {
  TREASURE: 'treasure',
  SPECIAL: 'special',
};

/** @type {Array<ItemDefinition>} */
const ITEM_DEFINITIONS = [
  {
    id: 'small_treasure',
    icon: '⭐',
    label: 'Small Treasure',
    shortLabel: 'STAR',
    type: ITEM_TYPES.TREASURE,
    points: 1,
    weight: 17,
    isTreasure: true,
  },
  {
    id: 'gem',
    icon: '💎',
    label: 'Gem',
    shortLabel: 'GEM',
    type: ITEM_TYPES.TREASURE,
    points: 2,
    weight: 10,
    isTreasure: true,
  },
  {
    id: 'crown',
    icon: '👑',
    label: 'Ancient Crown',
    shortLabel: 'CROWN',
    type: ITEM_TYPES.TREASURE,
    points: 3,
    weight: 5,
    isTreasure: true,
  },
  {
    id: 'treasure_map',
    icon: '🗺',
    label: 'Treasure Map',
    shortLabel: 'MAP',
    type: ITEM_TYPES.SPECIAL,
    points: 0,
    weight: 10,
    isTreasure: false,
    effect: 'revealTreasure',
  },
  {
    id: 'dynamite',
    icon: '💣',
    label: 'Dynamite',
    shortLabel: 'BOOM',
    type: ITEM_TYPES.SPECIAL,
    points: 0,
    weight: 8,
    isTreasure: false,
    effect: 'bonusExcavation',
  },
  {
    id: 'unstable_ground',
    icon: '⛏',
    label: 'Unstable Ground',
    shortLabel: 'SHAKE',
    type: ITEM_TYPES.SPECIAL,
    points: 0,
    weight: 8,
    isTreasure: false,
    effect: 'shuffleUnrevealed',
  },
];

class ItemManager {
  /**
   * Build a shuffled list of items for a grid of given size.
   * Ensures at least one treasure exists.
   */
  static generateItems(count) {
    const pool = [];
    const totalWeight = ITEM_DEFINITIONS.reduce((sum, item) => sum + item.weight, 0);

    for (let i = 0; i < count; i++) {
      pool.push(ItemManager._pickWeighted(totalWeight));
    }

    if (!pool.some((item) => item.isTreasure)) {
      pool[Math.floor(Math.random() * pool.length)] = ITEM_DEFINITIONS[0];
    }

    return ItemManager.shuffle(pool);
  }

  static getById(id) {
    return ITEM_DEFINITIONS.find((item) => item.id === id);
  }

  static _pickWeighted(totalWeight) {
    let roll = Math.random() * totalWeight;
    for (const item of ITEM_DEFINITIONS) {
      roll -= item.weight;
      if (roll <= 0) return { ...item };
    }
    return { ...ITEM_DEFINITIONS[0] };
  }

  /** Fisher-Yates shuffle — also used by Grid for unstable ground */
  static shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

/**
 * @typedef {Object} ItemDefinition
 * @property {string} id
 * @property {string} icon
 * @property {string} label
 * @property {string} type
 * @property {number} points
 * @property {number} weight
 * @property {boolean} isTreasure
 * @property {string} [effect]
 */
