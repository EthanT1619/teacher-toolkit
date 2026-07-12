/**
 * Tile — Word on front; flip reveals star or check on back.
 */
class Tile {
  /**
   * @param {number} index
   * @param {{ word: string, isStar: boolean, points: number, isEmpty?: boolean }} data
   */
  constructor(index, data) {
    this.index = index;
    this.word = data.word;
    this.isStar = data.isStar;
    this.points = data.points;
    this.isEmpty = data.isEmpty || false;
    this.opened = false;
    this.element = null;
  }

  createElement(onClick) {
    const tile = document.createElement('div');
    tile.className = 'tile tile-closed';
    if (this.isEmpty) tile.classList.add('empty-tile');
    tile.dataset.index = this.index;

    const backLabel = this.isEmpty ? '' : `<span class="tile-back-word">${this.word}</span>`;

    const backContent = this.isStar
      ? `${backLabel}
         <div class="tile-reward">
           <span class="tile-star">⭐</span>
           <span class="tile-points">+${this.points}</span>
         </div>`
      : `${backLabel}<span class="tile-back-icon">✓</span>`;

    tile.innerHTML = `
      <div class="tile-inner">
        <div class="tile-face tile-front">
          <span class="tile-word">${this.isEmpty ? '' : this.word}</span>
        </div>
        <div class="tile-face tile-back ${this.isStar ? 'tile-back-star' : 'tile-back-plain'}">
          ${this.isEmpty ? '' : backContent}
        </div>
        <span class="tile-status closed-status" aria-hidden="true">🔒</span>
        <div class="effects-layer"></div>
      </div>
    `;

    if (!this.isEmpty) {
      tile.addEventListener('click', () => {
        if (!this.opened) onClick(this);
      });
    }

    this.element = tile;
    return tile;
  }

  open() {
    if (this.opened || this.isEmpty) return;
    this.opened = true;

    this.element.classList.remove('tile-closed', 'selectable');
    this.element.classList.add('tile-opened', 'flipped');

    if (this.isStar) {
      this.element.classList.add('treasure-glow');
    }
  }

  setSelectable(active) {
    if (this.opened || this.isEmpty) return;
    this.element.classList.toggle('selectable', active);
  }

  getEffectsLayer() {
    return this.element.querySelector('.effects-layer');
  }

  /** Only shrink text when it overflows — default size comes from CSS */
  static fitWord(tileElement) {
    const tileSize = tileElement.clientWidth;
    if (tileSize < 40) return;

    const front = tileElement.querySelector('.tile-front');
    const frontWord = front?.querySelector('.tile-word');
    if (front && frontWord && frontWord.textContent.trim()) {
      Tile._shrinkToFit(frontWord, front.clientWidth * 0.9, front.clientHeight * 0.82, 20);
    }

    const back = tileElement.querySelector('.tile-back');
    const backWord = back?.querySelector('.tile-back-word');
    if (back && backWord && backWord.textContent.trim()) {
      Tile._shrinkToFit(backWord, back.clientWidth * 0.9, back.clientHeight * 0.22, 10);
    }
  }

  static _shrinkToFit(wordEl, maxWidth, maxHeight, minSize) {
    wordEl.style.fontSize = '';
    wordEl.style.maxWidth = `${Math.floor(maxWidth)}px`;

    let size = Math.floor(parseFloat(getComputedStyle(wordEl).fontSize));
    if (!size || Number.isNaN(size)) {
      size = Math.floor(maxHeight * 0.85);
    }
    wordEl.style.fontSize = `${size}px`;

    while (size > minSize && (wordEl.scrollWidth > maxWidth || wordEl.offsetHeight > maxHeight)) {
      size -= 1;
      wordEl.style.fontSize = `${size}px`;
    }
  }
}
