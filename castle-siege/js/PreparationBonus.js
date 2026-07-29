/**
 * PreparationBonus - Homework completion → bonus tier & shield calculation.
 */
class PreparationBonus {
  static MAX_ITEMS = 2;

  /** Normalize and clamp homework counts. */
  static normalizeHomework(completed, total) {
    total = Math.max(0, parseInt(total, 10) || 0);
    completed = Math.max(0, parseInt(completed, 10) || 0);

    if (total === 0) {
      return { completed: 0, total: 0, percent: 0 };
    }

    completed = Math.min(completed, total);
    const percent = Math.round((completed / total) * 100);
    return { completed, total, percent };
  }

  /** Bonus tier from completion percent. */
  static getBonusTier(percent) {
    if (percent >= 100) {
      return { itemSlots: 2, autoShield: 0, tierKey: 'twoItems' };
    }
    if (percent >= 80) {
      return { itemSlots: 1, autoShield: 10, tierKey: 'oneItemShield' };
    }
    if (percent >= 50) {
      return { itemSlots: 1, autoShield: 0, tierKey: 'oneItem' };
    }
    return { itemSlots: 0, autoShield: 0, tierKey: 'none' };
  }

  /** Localized tier label for UI display. */
  static tierLabel(tier) {
    return csT('prepTier.' + tier.tierKey);
  }

  /** Count selected items by type. */
  static countItems(selectedItems) {
    const list = selectedItems || [];
    return {
      shield: list.filter(i => i === 'shield').length,
      repairKit: list.filter(i => i === 'repairKit').length,
      charge: list.filter(i => i === 'charge').length
    };
  }

  /** Starting shield = auto bonus + Shield items (+20 each). */
  static calcStartShield(autoShield, shieldItemCount) {
    return autoShield + shieldItemCount * 20;
  }

  /** Build inventory from selected bonus items (non-shield). */
  static buildInventory(selectedItems) {
    const counts = PreparationBonus.countItems(selectedItems);
    return {
      repairKit: counts.repairKit,
      charge: counts.charge
    };
  }
}
