/**
 * Pure i18n logic (no DOM). Used by shared/i18n.js and Node tests.
 */

export const STORAGE_KEY = 'toolkit-language';

export const SUPPORTED_LOCALES = ['en', 'ko'];

/**
 * Toolkit-related localStorage keys used to detect returning users.
 * Does not include toolkit-language itself.
 */
export const LEGACY_STORAGE_KEYS = [
  'teacherChecklistClasses',
  'teacherChecklistItems',
  'teacherChecklistState',
  'teacherChecklistCurrentClassId',
  'helpLastSeenDate',
  'makeup-scheduler-schedules',
  'makeup-scheduler-panel-collapse',
  '5w1h-factory-settings',
  'diceChanceGame',
  'participation-tracker-v3',
  'participation-tracker-v2',
  'participation-tracker-v1',
  'classTeamMaker',
  'classRandomPicker',
  'ladderGame',
  'mysteryBoxPicker',
  'juldarigiGame',
  'tongAjossiGame',
  'vocab-study-mobile-presets',
  'story-forge-presets',
  'sentence-kitchen-presets',
];

/**
 * @param {(key: string) => string | null} getItem
 * @returns {boolean}
 */
export function hasLegacyToolkitStorage(getItem) {
  return LEGACY_STORAGE_KEYS.some(function (key) {
    var value = getItem(key);
    return value !== null && value !== undefined && value !== '';
  });
}

/**
 * Resolve locale on first init or when stored value is invalid.
 *
 * Policy:
 * - Valid toolkit-language → use as-is (no rewrite).
 * - No valid toolkit-language + any legacy key → ko (existing user).
 * - No valid toolkit-language + no legacy keys → en (new user).
 * - Once resolved without a valid stored value, persist is true.
 *
 * @param {(key: string) => string | null} getItem
 * @returns {{ locale: 'en' | 'ko', persist: boolean }}
 */
export function resolveInitialLocale(getItem) {
  var stored = getItem(STORAGE_KEY);

  if (stored === 'en' || stored === 'ko') {
    return { locale: stored, persist: false };
  }

  var locale = hasLegacyToolkitStorage(getItem) ? 'ko' : 'en';
  return { locale: locale, persist: true };
}

/**
 * Walk nested messages using bracket access per dot segment.
 * Supports tool-ids such as "5w1h-factory".
 *
 * @param {Record<string, unknown> | null | undefined} messages
 * @param {string} key
 * @returns {unknown}
 */
export function lookupMessage(messages, key) {
  if (!messages || !key) return undefined;

  var parts = key.split('.');
  var current = messages;

  for (var i = 0; i < parts.length; i++) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[parts[i]];
  }

  return current;
}

/**
 * @param {string} template
 * @param {Record<string, string | number> | undefined} params
 * @returns {string}
 */
export function interpolate(template, params) {
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, function (_match, name) {
    if (Object.prototype.hasOwnProperty.call(params, name)) {
      return String(params[name]);
    }
    return '{' + name + '}';
  });
}

/**
 * @param {Record<string, unknown>} messages
 * @param {Record<string, unknown>} enMessages
 * @param {string} key
 * @param {Record<string, string | number> | undefined} params
 * @param {'en' | 'ko'} locale
 * @returns {string}
 */
export function translate(messages, enMessages, key, params, locale) {
  var value = lookupMessage(messages, key);

  if (typeof value !== 'string') {
    var fallback = lookupMessage(enMessages, key);
    if (typeof fallback === 'string') {
      value = fallback;
    } else if (locale !== 'en') {
      return translate(enMessages, enMessages, key, params, 'en');
    } else {
      return key;
    }
  }

  return interpolate(value, params);
}

/**
 * @param {unknown} locale
 * @returns {locale is 'en' | 'ko'}
 */
export function isSupportedLocale(locale) {
  return locale === 'en' || locale === 'ko';
}

/**
 * Choose active messages with English fallback when Korean bundle is missing.
 *
 * @param {'en' | 'ko'} locale
 * @param {Record<string, unknown> | null | undefined} enMessages
 * @param {Record<string, unknown> | null | undefined} koMessages
 * @returns {Record<string, unknown>}
 */
export function pickLocaleMessages(locale, enMessages, koMessages) {
  var en = enMessages && typeof enMessages === 'object' ? enMessages : {};

  if (locale === 'en') {
    return en;
  }

  if (koMessages && typeof koMessages === 'object') {
    return koMessages;
  }

  return en;
}

/**
 * Collect dot-path leaf keys from nested locale JSON (structure only).
 *
 * @param {unknown} value
 * @param {string} [prefix]
 * @returns {string[]}
 */
export function collectLocaleKeyPaths(value, prefix) {
  var paths = [];
  var base = prefix || '';

  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    if (base) paths.push(base);
    return paths;
  }

  var keys = Object.keys(value);
  if (keys.length === 0 && base) {
    paths.push(base);
    return paths;
  }

  keys.forEach(function (key) {
    var next = base ? base + '.' + key : key;
    paths = paths.concat(collectLocaleKeyPaths(value[key], next));
  });

  return paths;
}
