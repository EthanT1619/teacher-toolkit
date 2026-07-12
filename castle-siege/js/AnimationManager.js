/**
 * AnimationManager - Handles visual effects: projectiles, shakes, glows, floating numbers.
 */
class AnimationManager {
  constructor(ui) {
    this.ui = ui;
  }

  /** Launch projectile from attacker team toward defender team. */
  playProjectile(fromTeam, toTeam) {
    const layer = this.ui.elements.projectileLayer;
    const fromEl = fromTeam === Castle.TEAMS.BLUE
      ? this.ui.elements.blueCastleWrap
      : this.ui.elements.redCastleWrap;
    const toEl = toTeam === Castle.TEAMS.BLUE
      ? this.ui.elements.blueCastleWrap
      : this.ui.elements.redCastleWrap;

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const layerRect = layer.getBoundingClientRect();

    const startX = fromRect.left + fromRect.width / 2 - layerRect.left;
    const startY = fromRect.top + fromRect.height / 2 - layerRect.top;
    const endX = toRect.left + toRect.width / 2 - layerRect.left;
    const endY = toRect.top + toRect.height / 2 - layerRect.top;

    const projectile = document.createElement('div');
    projectile.className = `projectile ${fromTeam}`;
    projectile.style.left = `${startX}px`;
    projectile.style.top = `${startY}px`;
    layer.appendChild(projectile);

    const dx = endX - startX;
    const dy = endY - startY;

    projectile.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(1.3)`, opacity: 0.9 }
    ], { duration: 600, easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
      projectile.remove();
    };
  }

  shakeCastle(team) {
    const el = team === Castle.TEAMS.BLUE
      ? this.ui.elements.blueCastle
      : this.ui.elements.redCastle;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 500);
  }

  repairGlow(team) {
    const el = team === Castle.TEAMS.BLUE
      ? this.ui.elements.blueCastle
      : this.ui.elements.redCastle;
    el.classList.add('repair-glow');
    setTimeout(() => el.classList.remove('repair-glow'), 800);
  }

  explodeCastle(team) {
    const el = team === Castle.TEAMS.BLUE
      ? this.ui.elements.blueCastle
      : this.ui.elements.redCastle;
    el.classList.add('exploding');
    setTimeout(() => {
      el.classList.remove('exploding');
      el.classList.add('destroyed');
    }, 800);
  }

  resetCastleVisuals() {
    [this.ui.elements.blueCastle, this.ui.elements.redCastle].forEach(el => {
      el.classList.remove('shake', 'repair-glow', 'exploding', 'destroyed');
    });
  }

  /** Show floating +/− number on a castle panel. */
  showFloatNumber(team, text, type) {
    const layer = team === Castle.TEAMS.BLUE
      ? this.ui.elements.blueFloat
      : this.ui.elements.redFloat;

    const num = document.createElement('div');
    num.className = `float-num ${type}`;
    num.textContent = text;
    layer.appendChild(num);
    setTimeout(() => num.remove(), 1200);
  }

  showShieldBarrier(team, active) {
    const el = team === Castle.TEAMS.BLUE
      ? this.ui.elements.blueShieldBarrier
      : this.ui.elements.redShieldBarrier;
    el.classList.toggle('active', active);
  }

  showChargeAura(team, active) {
    const el = team === Castle.TEAMS.BLUE
      ? this.ui.elements.blueChargeAura
      : this.ui.elements.redChargeAura;
    el.classList.toggle('active', active);
  }
}
