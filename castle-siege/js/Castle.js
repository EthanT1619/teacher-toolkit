/**
 * Castle - Represents a team's castle with HP, shield, and charge state.
 */
class Castle {
  static TEAMS = { BLUE: 'blue', RED: 'red' };

  constructor(team, maxHp = 100) {
    this.team = team;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.shield = 0;
    this.hasCharge = false;
    this.destroyed = false;
    this.prepStartShield = 0;
    this.items = { repairKit: 0, charge: 0 };
  }

  /** Reset HP/shield/charge for a new round (keeps prep shield & item inventory). */
  reset() {
    this.hp = this.maxHp;
    this.shield = this.prepStartShield;
    this.hasCharge = false;
    this.destroyed = false;
  }

  /** Apply Preparation Bonus at game start. */
  applyPreparationBonuses(startShield, inventory) {
    this.prepStartShield = startShield;
    this.shield = startShield;
    this.items = {
      repairKit: inventory.repairKit || 0,
      charge: inventory.charge || 0
    };
  }

  /** Use inventory Repair Kit (+20 HP, capped at maxHp). */
  useRepairKit() {
    if (this.items.repairKit <= 0) return null;
    const healed = this.repair(20);
    this.items.repairKit -= 1;
    return { healed };
  }

  /** Use inventory Charge item (activates hasCharge). */
  useChargeItem() {
    if (this.items.charge <= 0) return null;
    if (this.hasCharge) return { alreadyActive: true };
    this.items.charge -= 1;
    this.activateCharge();
    return { activated: true };
  }

  /** Full reset including max HP. */
  setMaxHp(value) {
    this.maxHp = Math.max(10, value);
    this.hp = Math.min(this.hp, this.maxHp);
  }

  /** Apply incoming damage; shield absorbs first. Returns { hpLost, shieldLost, totalDamage }. */
  takeDamage(amount) {
    let remaining = amount;
    let shieldLost = 0;

    if (this.shield > 0) {
      shieldLost = Math.min(this.shield, remaining);
      this.shield -= shieldLost;
      remaining -= shieldLost;
    }

    const hpLost = Math.min(this.hp, remaining);
    this.hp -= hpLost;

    if (this.hp <= 0) {
      this.hp = 0;
      this.destroyed = true;
    }

    return { hpLost, shieldLost, totalDamage: amount };
  }

  /** Restore fixed HP, capped at maxHp. Returns actual amount healed. */
  repair(amount) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - before;
  }

  /** Add shield points (replaces or stacks - spec says stored separately, we add to existing). */
  addShield(amount) {
    this.shield += amount;
    return amount;
  }

  /** Activate charge buff (only one at a time, no stacking). */
  activateCharge() {
    if (this.hasCharge) return false;
    this.hasCharge = true;
    return true;
  }

  /** Consume charge buff after double-action round. */
  consumeCharge() {
    const had = this.hasCharge;
    this.hasCharge = false;
    return had;
  }

  getHpPercent() {
    return (this.hp / this.maxHp) * 100;
  }
}
