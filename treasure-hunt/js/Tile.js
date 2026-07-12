/**
 * Tile — Represents a single excavation tile on the map.
 */
class Tile {
  /**
   * @param {number} index - Flat index in the grid
   * @param {Object} item
   */
  constructor(index, item) {
    this.index = index;
    this.item = item;
    this.revealed = false;
    this.highlighted = false;
    this.element = null;
  }

  /** Build the revealed-face HTML with a fixed layout */
  _buildBackFace(item) {
    const label = item.shortLabel || item.label;
    const hasPoints = item.points > 0;
    const pointsClass = hasPoints ? '' : ' is-empty';
    const pointsText = hasPoints ? `+${item.points}` : '';

    return `
      <div class="tile-icon-wrap">
        <span class="tile-icon">${item.icon}</span>
      </div>
      <div class="tile-footer">
        <span class="tile-label">${label}</span>
        <span class="tile-points${pointsClass}">${pointsText}</span>
      </div>
    `;
  }

  /** Create the DOM element for this tile */
  createElement(onClick) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.dataset.index = this.index;
    tile.dataset.itemId = this.item.id;

    tile.innerHTML = `
      <div class="tile-inner">
        <div class="tile-face tile-front">
          <span class="dirt-mark">?</span>
        </div>
        <div class="tile-face tile-back item-${this.item.id}">
          ${this._buildBackFace(this.item)}
        </div>
        <div class="effects-layer"></div>
      </div>
    `;

    tile.addEventListener('click', () => {
      if (!this.revealed) onClick(this);
    });

    this.element = tile;
    return tile;
  }

  /** Flip the tile to reveal its contents */
  reveal() {
    if (this.revealed) return;
    this.revealed = true;
    this.element.classList.add('flipped');
    this.element.classList.remove('selectable');

    if (this.item.isTreasure) {
      this.element.classList.add('treasure-glow');
    }
  }

  /** Highlight tile (Treasure Map effect) without revealing */
  setHighlight(active) {
    this.highlighted = active;
    if (active) {
      this.element.classList.add('map-highlight');
    } else {
      this.element.classList.remove('map-highlight');
    }
  }

  /** Enable or disable selection */
  setSelectable(active) {
    if (this.revealed) return;
    this.element.classList.toggle('selectable', active);
  }

  /** Replace item (used when shuffling unrevealed tiles) */
  setItem(item) {
    this.item = item;
    this.element.dataset.itemId = item.id;

    const back = this.element.querySelector('.tile-back');
    back.className = `tile-face tile-back item-${item.id}`;
    back.innerHTML = this._buildBackFace(item);
  }

  getEffectsLayer() {
    return this.element.querySelector('.effects-layer');
  }
}
