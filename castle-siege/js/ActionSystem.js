/**
 * ActionSystem - Resolves battle actions: Attack, Repair, Shield, Charge.
 */
class ActionSystem {
  static ATTACK_DAMAGES = [10, 20, 30, 40];
  static SHIELD_VALUES = [20, 30, 40, 50];
  static REPAIR_AMOUNT = 20;

  constructor(sound, animations) {
    this.sound = sound;
    this.animations = animations;
  }

  randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Execute an action and return result metadata for UI updates.
   * @param {string} action - attack | repair | shield | charge
   * @param {Castle} actor - team performing the action
   * @param {Castle} opponent - enemy castle (for attack)
   */
  execute(action, actor, opponent) {
    switch (action) {
      case 'attack':
        return this._attack(actor, opponent);
      case 'repair':
        return this._repair(actor);
      case 'shield':
        return this._shield(actor);
      case 'charge':
        return this._charge(actor);
      default:
        return null;
    }
  }

  _attack(actor, opponent) {
    const damage = this.randomFrom(ActionSystem.ATTACK_DAMAGES);
    const defender = opponent.team;

    this.sound.playAttack();
    this.animations.playProjectile(actor.team, defender);

    return new Promise(resolve => {
      setTimeout(() => {
        const result = opponent.takeDamage(damage);
        this.animations.shakeCastle(defender);

        let floatText = `-${result.totalDamage}`;
        if (result.shieldLost > 0 && result.hpLost > 0) {
          floatText = `-${result.totalDamage}`;
        }
        this.animations.showFloatNumber(defender, floatText, 'damage');

        resolve({
          action: 'attack',
          actor: actor.team,
          defender,
          damage: result.totalDamage,
          hpLost: result.hpLost,
          shieldLost: result.shieldLost,
          destroyed: opponent.destroyed
        });
      }, 600);
    });
  }

  _repair(actor) {
    const healed = actor.repair(ActionSystem.REPAIR_AMOUNT);
    this.sound.playRepair();
    this.animations.repairGlow(actor.team);
    this.animations.showFloatNumber(actor.team, `+${healed}`, 'heal');

    return Promise.resolve({
      action: 'repair',
      actor: actor.team,
      healed
    });
  }

  _shield(actor) {
    const amount = this.randomFrom(ActionSystem.SHIELD_VALUES);
    actor.addShield(amount);
    this.sound.playShield();
    this.animations.showShieldBarrier(actor.team, true);
    this.animations.showFloatNumber(actor.team, `+${amount} 🛡`, 'shield');

    return Promise.resolve({
      action: 'shield',
      actor: actor.team,
      shieldAdded: amount
    });
  }

  _charge(actor) {
    const activated = actor.activateCharge();
    this.sound.playCharge();
    this.animations.showChargeAura(actor.team, activated);

    return Promise.resolve({
      action: 'charge',
      actor: actor.team,
      activated
    });
  }
}
