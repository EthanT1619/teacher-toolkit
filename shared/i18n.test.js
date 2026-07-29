import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import {
  STORAGE_KEY,
  LEGACY_STORAGE_KEYS,
  hasLegacyToolkitStorage,
  resolveInitialLocale,
  lookupMessage,
  interpolate,
  translate,
  isSupportedLocale,
  pickLocaleMessages,
} from './i18n-core.js';
import { initI18n, getLocale, t } from './i18n.js';
import { validateLocaleFiles } from './locale-validate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('resolveInitialLocale', function () {
  it('defaults new users to English and persists', function () {
    var result = resolveInitialLocale(function () {
      return null;
    });
    assert.equal(result.locale, 'en');
    assert.equal(result.persist, true);
  });

  it('detects existing users with legacy storage as Korean', function () {
    var store = { ladderGame: '{"results":[]}' };
    var result = resolveInitialLocale(function (key) {
      return store[key] || null;
    });
    assert.equal(result.locale, 'ko');
    assert.equal(result.persist, true);
  });

  it('does not treat empty legacy values as existing user', function () {
    var store = { ladderGame: '' };
    var result = resolveInitialLocale(function (key) {
      return store[key] || null;
    });
    assert.equal(result.locale, 'en');
    assert.equal(result.persist, true);
  });

  it('respects valid stored toolkit-language without persisting', function () {
    var store = { [STORAGE_KEY]: 'en', ladderGame: '{}' };
    var result = resolveInitialLocale(function (key) {
      return store[key] || null;
    });
    assert.equal(result.locale, 'en');
    assert.equal(result.persist, false);
  });

  it('re-resolves invalid stored value using legacy detection', function () {
    var store = { [STORAGE_KEY]: 'fr', 'participation-tracker-v3': '[]' };
    var result = resolveInitialLocale(function (key) {
      return store[key] || null;
    });
    assert.equal(result.locale, 'ko');
    assert.equal(result.persist, true);
  });

  it('re-resolves invalid stored value without legacy keys to English', function () {
    var store = { [STORAGE_KEY]: 'fr' };
    var result = resolveInitialLocale(function (key) {
      return store[key] || null;
    });
    assert.equal(result.locale, 'en');
    assert.equal(result.persist, true);
  });
});

describe('hasLegacyToolkitStorage', function () {
  it('includes participation tracker v1/v2 keys', function () {
    assert.ok(LEGACY_STORAGE_KEYS.includes('participation-tracker-v1'));
    assert.ok(LEGACY_STORAGE_KEYS.includes('participation-tracker-v2'));
  });
});

describe('lookupMessage (bracket access parser)', function () {
  var messages = {
    common: { save: 'Save' },
    tool: {
      '5w1h-factory': { title: 'WH Factory' },
      'classroom-timer': { title: 'Classroom Timer' },
    },
  };

  it('resolves nested common keys', function () {
    assert.equal(lookupMessage(messages, 'common.save'), 'Save');
  });

  it('resolves numeric-prefixed tool-id keys', function () {
    assert.equal(lookupMessage(messages, 'tool.5w1h-factory.title'), 'WH Factory');
  });

  it('resolves hyphenated tool-id keys', function () {
    assert.equal(lookupMessage(messages, 'tool.classroom-timer.title'), 'Classroom Timer');
  });

  it('returns undefined for missing keys', function () {
    assert.equal(lookupMessage(messages, 'tool.missing.title'), undefined);
  });
});

describe('translate', function () {
  var en = {
    common: { save: 'Save' },
    tool: { '5w1h-factory': { title: 'WH Factory', note: 'Only EN' } },
  };
  var ko = {
    common: { save: '저장' },
    tool: { '5w1h-factory': { title: 'WH Factory' } },
  };

  it('falls back to English when Korean key is missing', function () {
    assert.equal(
      translate(ko, en, 'tool.5w1h-factory.note', undefined, 'ko'),
      'Only EN'
    );
  });

  it('interpolates params', function () {
    var messages = { feedback: { presetSaved: 'Preset "{name}" saved.' } };
    assert.equal(
      translate(messages, messages, 'feedback.presetSaved', { name: 'A' }, 'en'),
      'Preset "A" saved.'
    );
  });
});

describe('interpolate', function () {
  it('leaves unknown placeholders intact', function () {
    assert.equal(interpolate('Hi {name}', {}), 'Hi {name}');
  });
});

describe('isSupportedLocale', function () {
  it('accepts en and ko only', function () {
    assert.equal(isSupportedLocale('en'), true);
    assert.equal(isSupportedLocale('ko'), true);
    assert.equal(isSupportedLocale('ja'), false);
  });
});

describe('pickLocaleMessages', function () {
  var en = { common: { save: 'Save' } };

  it('uses English bundle for en locale', function () {
    assert.deepEqual(pickLocaleMessages('en', en, null), en);
  });

  it('falls back to English when Korean bundle failed to load', function () {
    assert.deepEqual(pickLocaleMessages('ko', en, null), en);
  });

  it('uses Korean bundle when available', function () {
    var ko = { common: { save: '저장' } };
    assert.deepEqual(pickLocaleMessages('ko', en, ko), ko);
  });
});

describe('locale file integrity', function () {
  it('en.json and ko.json pass shared locale validation suite', function () {
    var result = validateLocaleFiles(join(__dirname, 'locales', 'en.json'), join(__dirname, 'locales', 'ko.json'));
    if (!result.ok) {
      assert.fail(result.errors.join('\n'));
    }
  });
});

describe('initI18n integration', function () {
  it('loads locale files via import.meta.url and translates', async function () {
    var locale = await initI18n({ applyDom: false, storage: null });
    assert.equal(locale, 'en');
    assert.equal(getLocale(), 'en');
    assert.equal(t('common.save'), 'Save');
    assert.equal(t('tool.5w1h-factory.title'), 'WH Factory');
  });

  it('treats blocked storage as new user English', async function () {
    var locale = await initI18n({
      applyDom: false,
      storage: {
        getItem: function () {
          throw new Error('SecurityError');
        },
        setItem: function () {
          throw new Error('SecurityError');
        },
      },
    });
    assert.equal(locale, 'en');
    assert.equal(t('common.cancel'), 'Cancel');
  });

  it('falls back to English messages when Korean bundle load fails', async function () {
    var originalFetch = globalThis.fetch;
    var calls = 0;

    globalThis.fetch = function (input) {
      var href = String(input);
      calls += 1;
      if (href.includes('ko.json')) {
        return Promise.resolve({ ok: false, status: 404 });
      }
      return originalFetch(input);
    };

    try {
      var locale = await initI18n({
        applyDom: false,
        storage: {
          getItem: function (key) {
            return key === STORAGE_KEY ? 'ko' : null;
          },
          setItem: function () {},
        },
      });
      assert.equal(locale, 'ko');
      assert.equal(t('common.save'), 'Save');
      assert.ok(calls >= 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('import.meta.url locale resolution', function () {
  it('resolves locale JSON beside i18n.js (subpath-safe relative URL)', function () {
    var i18nModuleUrl = pathToFileURL(join(__dirname, 'i18n.js')).href;
    var localeUrl = new URL('./locales/en.json', i18nModuleUrl);
    var pathname = fileURLToPath(localeUrl);

    assert.match(pathname, /shared[\\/]+locales[\\/]+en\.json$/);
  });
});
