/**
 * WordParser — Parse teacher word input.
 */
class WordParser {
  /**
   * @param {string} text
   * @returns {string[]}
   */
  static parse(text) {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }
}
