/**
 * Grid — Build and manage the word grid.
 */
class Grid {
  /**
   * @param {HTMLElement} container
   * @param {string[]} words
   * @param {number} starCount
   * @param {number} starPoints
   * @param {function(Tile): void} onTileClick
   */
  constructor(container, words, starCount, starPoints, onTileClick) {
    this.container = container;
    this.words = words;
    this.starCount = starCount;
    this.starPoints = starPoints;
    this.onTileClick = onTileClick;
    this.tiles = [];
    this.gridElement = null;
    this._resizeObserver = null;
    this._layoutAttempts = 0;
    this._isInitialLayout = false;

    const layout = GridCalculator.calculate(words.length);
    this.rows = layout.rows;
    this.cols = layout.cols;
    this.totalCells = layout.totalCells;
  }

  build() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    if (this._onWindowResize) {
      window.removeEventListener('resize', this._onWindowResize);
    }

    this._layoutAttempts = 0;
    this._isInitialLayout = true;
    this.container.classList.add('is-sizing');
    this.container.innerHTML = '';
    this.tiles = [];

    const grid = document.createElement('div');
    grid.className = 'grid';
    grid.style.gridTemplateColumns = `repeat(${this.cols}, var(--tile-size))`;
    grid.style.gridTemplateRows = `repeat(${this.rows}, var(--tile-size))`;
    this.gridElement = grid;

    const shuffledWords = Grid._shuffle([...this.words]);
    const starIndices = Grid._pickStarIndices(shuffledWords.length, this.starCount);

    for (let i = 0; i < this.totalCells; i++) {
      let data;

      if (i < shuffledWords.length) {
        const isStar = starIndices.has(i);
        data = {
          word: shuffledWords[i],
          isStar,
          points: isStar ? this.starPoints : 0,
          isEmpty: false,
        };
      } else {
        data = { word: '', isStar: false, points: 0, isEmpty: true };
      }

      const tile = new Tile(i, data);
      grid.appendChild(tile.createElement((t) => this.onTileClick(t)));
      this.tiles.push(tile);
    }

    this.container.appendChild(grid);
    this._adjustTileSize();
    this._bindResize();
  }

  _bindResize() {
    let resizeTimer = null;
    this._resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this._isInitialLayout = false;
        this._adjustTileSize();
      }, 50);
    });
    this._resizeObserver.observe(this.container);

    const gameScreen = document.getElementById('game-screen');
    if (gameScreen) this._resizeObserver.observe(gameScreen);

    window.addEventListener('resize', this._onWindowResize = () => {
      this._isInitialLayout = false;
      this._adjustTileSize();
    });
  }

  _measurePlayArea() {
    const gameScreen = document.getElementById('game-screen');
    let availW = this.container.clientWidth - 16;
    let availH = this.container.clientHeight - 16;

    if (gameScreen && gameScreen.classList.contains('active')) {
      const scoreboard = gameScreen.querySelector('.scoreboard');
      const controls = gameScreen.querySelector('.controls');
      const chromeH = (scoreboard?.offsetHeight || 0) + (controls?.offsetHeight || 0) + 20;
      const fromScreen = gameScreen.clientHeight - chromeH - 16;
      availH = Math.max(availH, fromScreen);
      availW = Math.max(availW, gameScreen.clientWidth - 32);
    }

    return { availW, availH };
  }

  _adjustTileSize() {
    if (!this.gridElement) return;

    const gap = 10;
    const gridPad = 32;
    const { availW, availH } = this._measurePlayArea();

    if (availH < 80) {
      this._layoutAttempts += 1;
      if (this._layoutAttempts < 12) {
        requestAnimationFrame(() => this._adjustTileSize());
      } else if (this._isInitialLayout) {
        this._isInitialLayout = false;
        this.container.classList.remove('is-sizing');
      }
      return;
    }

    const tileW = (availW - gridPad - gap * (this.cols - 1)) / this.cols;
    const tileH = (availH - gridPad - gap * (this.rows - 1)) / this.rows;
    const size = Math.max(130, Math.min(Math.floor(Math.min(tileW, tileH) * 0.96), 480));

    this.container.style.setProperty('--tile-size', `${size}px`);
    this._fitAllWords();
  }

  _fitAllWords() {
    const finish = () => {
      if (this._isInitialLayout) {
        this._isInitialLayout = false;
        this.container.classList.remove('is-sizing');
      }
    };

    requestAnimationFrame(() => {
      this.getPlayableTiles().forEach((tile) => Tile.fitWord(tile.element));
      requestAnimationFrame(finish);
    });
  }

  getPlayableTiles() {
    return this.tiles.filter((t) => !t.isEmpty);
  }

  isFullyOpened() {
    return this.getPlayableTiles().every((t) => t.opened);
  }

  setAllSelectable(active) {
    this.getPlayableTiles().forEach((t) => t.setSelectable(active));
  }

  static _shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  static _pickStarIndices(wordCount, starCount) {
    const indices = Grid._shuffle(Array.from({ length: wordCount }, (_, i) => i));
    return new Set(indices.slice(0, starCount));
  }
}
