/**
 * GridCalculator — Compute grid dimensions from word count.
 */
class GridCalculator {
  static MIN = 2;
  static MAX = 8;

  /**
   * @param {number} count
   * @returns {{ rows: number, cols: number, totalCells: number, emptyCells: number }}
   */
  static calculate(count) {
    if (count <= 0) {
      return { rows: 0, cols: 0, totalCells: 0, emptyCells: 0 };
    }

    let cols = Math.ceil(Math.sqrt(count * 1.35));
    cols = Math.max(GridCalculator.MIN, Math.min(GridCalculator.MAX, cols));

    let rows = Math.ceil(count / cols);
    rows = Math.max(GridCalculator.MIN, Math.min(GridCalculator.MAX, rows));

    while (rows > GridCalculator.MIN && (rows - 1) * cols >= count) {
      rows -= 1;
    }

    while (cols > GridCalculator.MIN && rows * (cols - 1) >= count) {
      cols -= 1;
      rows = Math.ceil(count / cols);
    }

    const totalCells = rows * cols;

    return {
      rows,
      cols,
      totalCells,
      emptyCells: totalCells - count,
    };
  }

  static formatPreview(count) {
    const { rows, cols, emptyCells } = GridCalculator.calculate(count);
    if (count === 0) return '그리드: —';

    let text = `${rows}×${cols} (${count}칸)`;
    if (emptyCells > 0) {
      text += ` · 빈 칸 ${emptyCells}개`;
    }
    return text;
  }
}
