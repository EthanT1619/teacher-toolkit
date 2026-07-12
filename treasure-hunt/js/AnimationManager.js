/**
 * AnimationManager — Handles visual effects on tiles and grid.
 */
class AnimationManager {
  /** Dust particles when a tile is excavated */
  static playDust(tile) {
    const layer = tile.getEffectsLayer();
    for (let i = 0; i < 8; i++) {
      const particle = document.createElement('div');
      particle.className = 'dust-particle';
      particle.style.left = `${20 + Math.random() * 60}%`;
      particle.style.top = `${50 + Math.random() * 30}%`;
      particle.style.animationDelay = `${Math.random() * 0.2}s`;
      layer.appendChild(particle);
      setTimeout(() => particle.remove(), 900);
    }
  }

  /** Sparkles for treasure discovery */
  static playSparkles(tile) {
    const layer = tile.getEffectsLayer();
    for (let i = 0; i < 6; i++) {
      const sparkle = document.createElement('div');
      sparkle.className = 'sparkle';
      sparkle.style.left = `${15 + Math.random() * 70}%`;
      sparkle.style.top = `${15 + Math.random() * 70}%`;
      sparkle.style.animationDelay = `${Math.random() * 0.3}s`;
      layer.appendChild(sparkle);
      setTimeout(() => sparkle.remove(), 700);
    }
  }

  /** Explosion ring for dynamite */
  static playExplosion(tile) {
    const layer = tile.getEffectsLayer();
    const ring = document.createElement('div');
    ring.className = 'explosion-ring';
    layer.appendChild(ring);
    setTimeout(() => ring.remove(), 800);
  }

  /** Combined excavation reveal animation */
  static playReveal(tile, isTreasure) {
    AnimationManager.playDust(tile);
    if (isTreasure) {
      setTimeout(() => AnimationManager.playSparkles(tile), 300);
    }
  }
}
