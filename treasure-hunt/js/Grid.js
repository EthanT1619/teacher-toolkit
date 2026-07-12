/**
 * Grid — Manages the excavation map and tile layout.
 */
class Grid {
  /**
   * @param {HTMLElement} container
   * @param {number} rows
   * @param {number} cols
   * @param {function(Tile): void} onTileClick
   */
  constructor(container, rows, cols, onTileClick) {
    this.container = container;
    this.rows = rows;
    this.cols = cols;
    this.onTileClick = onTileClick;
    /** @type {Tile[]} */
    this.tiles = [];
    this.gridElement = null;
    this._resizeHandler = () => this._fitTileSize();

    window.addEventListener('resize', this._resizeHandler);
  }

  /** Build a fresh grid with randomly placed items */
  build() {
    this.container.innerHTML = '';
    this.tiles = [];

    const grid = document.createElement('div');
    grid.className = 'grid';
    this.gridElement = grid;

    const items = ItemManager.generateItems(this.rows * this.cols);

    items.forEach((item, index) => {
      const tile = new Tile(index, item);
      grid.appendChild(tile.createElement((t) => this.onTileClick(t)));
      this.tiles.push(tile);
    });

    this.container.appendChild(grid);
    requestAnimationFrame(() => {
      this._fitTileSize();
      requestAnimationFrame(() => this._fitTileSize());
    });
  }

  /** Scale tiles to fit the available grid area */
  _fitTileSize() {
    if (!this.gridElement) return;

    const rect = this.container.getBoundingClientRect();
    const gap = 12;
    const gridPadding = 40;
    const gridBorder = 10;

    const availW = rect.width - gridPadding - gridBorder;
    const availH = rect.height - gridPadding - gridBorder;

    const cellW = (availW - gap * (this.cols - 1)) / this.cols;
    const cellH = (availH - gap * (this.rows - 1)) / this.rows;
    const size = Math.floor(Math.min(cellW, cellH, 160));
    const tileSize = Math.max(size, 64);

    this.gridElement.style.setProperty('--tile-size', `${tileSize}px`);
    this.gridElement.style.gridTemplateColumns = `repeat(${this.cols}, ${tileSize}px)`;
    this.gridElement.style.gridTemplateRows = `repeat(${this.rows}, ${tileSize}px)`;
  }

  /** Get all unrevealed tiles */
  getHiddenTiles() {
    return this.tiles.filter((t) => !t.revealed);
  }

  /** Get all hidden treasure tiles */
  getHiddenTreasures() {
    return this.tiles.filter((t) => !t.revealed && t.item.isTreasure);
  }

  /** Check if every tile has been excavated */
  isFullyExcavated() {
    return this.tiles.every((t) => t.revealed);
  }

  /** Shuffle contents of unrevealed tiles only */
  shuffleUnrevealed() {
    const hidden = this.getHiddenTiles();
    const items = hidden.map((t) => t.item);

    const shuffled = ItemManager.shuffle(items);
    hidden.forEach((tile, i) => tile.setItem(shuffled[i]));
  }

  /** Enable selection on all hidden tiles */
  setAllSelectable(active) {
    this.tiles.forEach((t) => t.setSelectable(active));
  }

  /** Clear all map highlights */
  clearHighlights() {
    this.tiles.forEach((t) => t.setHighlight(false));
  }

  /** Trigger ground shake animation on the grid */
  shake() {
    this.gridElement.classList.add('shaking');
    setTimeout(() => this.gridElement.classList.remove('shaking'), 600);
  }

  resize(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.build();
  }
}
