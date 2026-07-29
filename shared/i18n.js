/**
 * Teacher Toolkit shared i18n (ES module).
 * Locale JSON paths resolve from this file via import.meta.url.
 */

import {
  STORAGE_KEY,
  isSupportedLocale,
  pickLocaleMessages,
  resolveInitialLocale,
  translate,
} from './i18n-core.js';

var currentLocale = 'en';
var messages = {};
var enMessages = {};
var initialized = false;

function publishToolkitI18n() {
  if (typeof window === 'undefined') return;

  window.toolkitI18n = {
    initI18n: initI18n,
    getLocale: getLocale,
    setLocale: setLocale,
    t: t,
    applyToDOM: applyToDOM,
  };
}

/**
 * @param {'en' | 'ko'} locale
 * @returns {Promise<Record<string, unknown>>}
 */
async function fetchLocaleFile(locale) {
  var url = new URL('./locales/' + locale + '.json', import.meta.url);

  try {
    var response = await fetch(url);
    if (response.ok) {
      return response.json();
    }
    return null;
  } catch (_error) {
    // Node test runner: fetch may fail on file:// URLs; load sibling JSON from disk.
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        var fs = await import('node:fs');
        var path = await import('node:url');
        var filePath = path.fileURLToPath(url);
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (_readError) {
        return null;
      }
    }
    return null;
  }
}

/**
 * @param {'en' | 'ko'} locale
 */
function syncDocumentLang(locale) {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = locale;
  }
}

/**
 * @param {'en' | 'ko'} locale
 */
function persistLocale(locale) {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch (_error) {
    // Storage blocked or quota exceeded — locale still applies for this session.
  }
}

function createGetItem(storage) {
  if (!storage) {
    return function () {
      return null;
    };
  }

  return function (key) {
    try {
      return storage.getItem(key);
    } catch (_error) {
      return null;
    }
  };
}

/**
 * @param {Record<string, unknown>} nextMessages
 * @param {'en' | 'ko'} locale
 */
function setMessages(nextMessages, locale) {
  messages = nextMessages;
  currentLocale = locale;
}

/**
 * @param {Record<string, unknown>} nextEnMessages
 */
function setEnMessages(nextEnMessages) {
  enMessages = nextEnMessages;
}

/**
 * @returns {'en' | 'ko'}
 */
export function getLocale() {
  return currentLocale;
}

/**
 * @param {string} key
 * @param {Record<string, string | number> | undefined} [params]
 * @returns {string}
 */
export function t(key, params) {
  return translate(messages, enMessages, key, params, currentLocale);
}

/**
 * @param {ParentNode | Document | undefined} root
 */
export function applyToDOM(root) {
  if (typeof document === 'undefined') return;

  var scope = root || document;

  scope.querySelectorAll('[data-i18n]').forEach(function (el) {
    var key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  scope.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
    var key = el.getAttribute('data-i18n-placeholder');
    if (key && 'placeholder' in el) el.placeholder = t(key);
  });

  scope.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
    var key = el.getAttribute('data-i18n-aria');
    if (key) el.setAttribute('aria-label', t(key));
  });

  scope.querySelectorAll('[data-i18n-title]').forEach(function (el) {
    var key = el.getAttribute('data-i18n-title');
    if (key) el.setAttribute('title', t(key));
  });
}

/**
 * @param {'en' | 'ko'} locale
 * @param {{ applyDom?: boolean, root?: ParentNode | Document }} [options]
 * @returns {Promise<void>}
 */
export async function setLocale(locale, options) {
  if (!isSupportedLocale(locale)) {
    throw new Error('Unsupported locale: ' + locale);
  }

  if (!initialized) {
    throw new Error('initI18n() must be called before setLocale()');
  }

  persistLocale(locale);

  if (locale === 'en') {
    setMessages(enMessages, locale);
  } else {
    var koMessages = await fetchLocaleFile('ko');
    setMessages(pickLocaleMessages('ko', enMessages, koMessages), locale);
  }

  syncDocumentLang(locale);
  applyToDOM(options && options.root);

  publishToolkitI18n();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('toolkit:localechange', { detail: { locale: locale } })
    );
  }
}

/**
 * @param {{ applyDom?: boolean, root?: ParentNode | Document, storage?: Storage }} [options]
 * @returns {Promise<'en' | 'ko'>}
 */
export async function initI18n(options) {
  var storage = (options && options.storage) || (typeof localStorage !== 'undefined' ? localStorage : null);
  var getItem = createGetItem(storage);

  var resolved = resolveInitialLocale(getItem);

  if (resolved.persist) {
    persistLocale(resolved.locale);
  }

  enMessages = (await fetchLocaleFile('en')) || {};
  messages = pickLocaleMessages(
    resolved.locale,
    enMessages,
    resolved.locale === 'ko' ? await fetchLocaleFile('ko') : null
  );

  currentLocale = resolved.locale;
  initialized = true;

  syncDocumentLang(resolved.locale);

  if (!options || options.applyDom !== false) {
    applyToDOM(options && options.root);
  }

  publishToolkitI18n();

  return resolved.locale;
}

export { STORAGE_KEY, lookupMessage, resolveInitialLocale } from './i18n-core.js';
