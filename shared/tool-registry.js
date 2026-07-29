/**
 * Official tool-id registry (home menu source of truth).
 * Folder slugs match locale keys under tool.* except where noted.
 */

/** Keys allowed directly under locale `tool` besides registered product ids. */
export const SPECIAL_TOOL_ROOT_KEYS = ['home', 'help'];

/**
 * All product tool-ids listed on the home menu.
 * @type {readonly string[]}
 */
export const REGISTERED_TOOL_IDS = Object.freeze([
  // Utilities (A–Z by menu title)
  'classroom-timer',
  'makeup-scheduler',
  'participation-tracker',
  'class-random-picker',
  'edu-scoreboard',
  'student-achievement-tracker',
  'team-maker',
  // Study tools (A–Z by menu title)
  'grammar-checkpoint',
  'phonics-hunt',
  'sentence-battle',
  'sentence-kitchen',
  'story-forge',
  'vocab-study-mobile',
  '5w1h-factory',
  // Activities (A–Z by menu title)
  'barrel-game',
  'castle-siege',
  'dice-chance',
  'fortress-battle',
  'ladder-game',
  'mystery-box-picker',
  'nerfgun-board',
  'pirate-race',
  'treasure-hunt',
  'juldarigi',
]);

/**
 * Tools whose help articles use data-i18n (help center).
 * @type {readonly string[]}
 */
export const TOOLS_WITH_HELP_I18N = Object.freeze([
  'participation-tracker',
  'class-random-picker',
  'team-maker',
  'edu-scoreboard',
  'grammar-checkpoint',
  '5w1h-factory',
  'barrel-game',
  'castle-siege',
  'dice-chance',
  'fortress-battle',
  'ladder-game',
  'mystery-box-picker',
  'nerfgun-board',
  'pirate-race',
  'treasure-hunt',
  'juldarigi',
  'phonics-hunt',
  'sentence-battle',
  'vocab-study-mobile',
]);

/** Required on every registered tool block. */
export const REQUIRED_TOOL_KEYS = Object.freeze(['title']);

/** Required on tool.help when the tool has i18n help content. */
export const REQUIRED_HELP_KEYS = Object.freeze([
  'menuLabel',
  'title',
  'introHeading',
  'intro',
  'usageHeading',
  'usage1',
  'notesHeading',
  'notes',
]);

/**
 * @returns {Set<string>}
 */
export function allowedToolRootKeys() {
  return new Set([...SPECIAL_TOOL_ROOT_KEYS, ...REGISTERED_TOOL_IDS]);
}
