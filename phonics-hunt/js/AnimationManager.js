/**
 * AnimationManager — Visual effects when teacher opens a tile.
 */
class AnimationManager {
  static playDust(tile) {
    const layer = tile.getEffectsLayer();
    for (let i = 0; i < 6; i++) {
      const particle = document.createElement('div');
      particle.className = 'dust-particle';
      particle.style.left = `${20 + Math.random() * 60}%`;
      particle.style.top = `${50 + Math.random() * 30}%`;
      particle.style.animationDelay = `${Math.random() * 0.2}s`;
      layer.appendChild(particle);
      setTimeout(() => particle.remove(), 900);
    }
  }

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

  static playOpen(tile, isStar) {
    AnimationManager.playDust(tile);
    if (isStar) {
      setTimeout(() => AnimationManager.playSparkles(tile), 200);
    }
  }
}
