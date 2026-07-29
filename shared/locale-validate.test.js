import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseLocaleJson,
  findDuplicateJsonKeys,
  collectEmptyObjectPaths,
  validateToolRootKeys,
  validateRegisteredToolsPresent,
  validateRequiredToolStructure,
  compareLocaleKeyPaths,
  validateLocaleFiles,
} from './locale-validate.js';
import { REGISTERED_TOOL_IDS, TOOLS_WITH_HELP_I18N } from './tool-registry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EN_PATH = join(__dirname, 'locales', 'en.json');
const KO_PATH = join(__dirname, 'locales', 'ko.json');

describe('parseLocaleJson', function () {
  it('accepts valid JSON objects', function () {
    var result = parseLocaleJson('{"common":{"save":"Save"}}', 'test.json');
    assert.equal(result.error, null);
    assert.deepEqual(result.data, { common: { save: 'Save' } });
  });

  it('rejects invalid JSON with a clear label', function () {
    var result = parseLocaleJson('{bad', 'en.json');
    assert.equal(result.data, null);
    assert.match(result.error || '', /^en\.json: invalid JSON/);
  });

  it('rejects non-object roots', function () {
    var result = parseLocaleJson('[]', 'ko.json');
    assert.equal(result.data, null);
    assert.match(result.error || '', /root must be a JSON object/);
  });
});

describe('findDuplicateJsonKeys', function () {
  it('detects duplicate keys in the same object', function () {
    var json = '{\n  "tool": {\n    "title": "A",\n    "title": "B"\n  }\n}';
    var hits = findDuplicateJsonKeys(json);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].key, 'title');
    assert.match(hits[0].path, /\$\.tool$/);
  });

  it('returns no hits for valid locale-shaped JSON', function () {
    var json = readFileSync(EN_PATH, 'utf8');
    assert.deepEqual(findDuplicateJsonKeys(json), []);
  });
});

describe('collectEmptyObjectPaths', function () {
  it('flags empty nested objects', function () {
    var paths = collectEmptyObjectPaths({ tool: { empty: {} } });
    assert.deepEqual(paths, ['tool.empty']);
  });
});

describe('validateToolRootKeys (help-block wrapper guard)', function () {
  it('flags content leaked to tool root when tool-id wrapper is removed', function () {
    var broken = {
      home: { title: 'Home' },
      help: { title: 'Help Center' },
      'participation-tracker': { title: 'Participation Tracker', help: { menuLabel: 'PT' } },
      title: 'Random Picker',
      subtitle: 'Should be inside class-random-picker',
    };

    var errors = validateToolRootKeys(broken);
    assert.ok(errors.some(function (msg) {
      return msg.includes('tool.title') && msg.includes('missing tool-id wrapper');
    }));
    assert.ok(errors.some(function (msg) {
      return msg.includes('tool.subtitle');
    }));
  });

  it('allows registered tool ids and special home/help roots', function () {
    var toolSection = { home: {}, help: {} };
    REGISTERED_TOOL_IDS.forEach(function (id) {
      toolSection[id] = { title: id };
    });
    assert.deepEqual(validateToolRootKeys(toolSection), []);
  });
});

describe('validateRegisteredToolsPresent', function () {
  it('reports missing registered tool blocks', function () {
    var toolSection = { home: {}, help: {} };
    toolSection[REGISTERED_TOOL_IDS[0]] = { title: 'X' };

    var errors = validateRegisteredToolsPresent(toolSection);
    assert.ok(errors.length > 0);
    assert.ok(errors.some(function (msg) {
      return msg.includes('missing locale block');
    }));
  });
});

describe('validateRequiredToolStructure', function () {
  it('requires title on every registered tool', function () {
    var toolSection = { home: {}, help: {} };
    REGISTERED_TOOL_IDS.forEach(function (id) {
      toolSection[id] = id === 'makeup-scheduler' ? {} : { title: id };
    });

    var errors = validateRequiredToolStructure(toolSection, 'test.json');
    assert.ok(errors.some(function (msg) {
      return msg.includes('tool.makeup-scheduler.title');
    }));
  });

  it('requires help keys for tools with i18n help articles', function () {
    var toolSection = { home: {}, help: {} };
    REGISTERED_TOOL_IDS.forEach(function (id) {
      toolSection[id] = { title: id };
    });

    var errors = validateRequiredToolStructure(toolSection, 'test.json');
    TOOLS_WITH_HELP_I18N.forEach(function (id) {
      assert.ok(errors.some(function (msg) {
        return msg.includes('tool.' + id + '.help');
      }), 'expected missing help error for ' + id);
    });
  });
});

describe('compareLocaleKeyPaths', function () {
  it('reports keys missing from either locale bundle', function () {
    var errors = compareLocaleKeyPaths(
      { common: { save: 'Save', cancel: 'Cancel' } },
      { common: { save: 'Save' } },
      'ko.json',
      'en.json'
    );
    assert.deepEqual(errors, ['Missing in en.json: common.cancel']);
  });
});

describe('validateLocaleFiles (integration)', function () {
  it('en.json and ko.json pass the full locale integrity suite', function () {
    var result = validateLocaleFiles(EN_PATH, KO_PATH);
    if (!result.ok) {
      assert.fail(result.errors.join('\n'));
    }
    assert.deepEqual(result.warnings, []);
  });

  it('covers registry size aligned with home menu tool count', function () {
    assert.equal(REGISTERED_TOOL_IDS.length, 24);
  });
});

describe('simulated corruption regressions', function () {
  it('detects missing tool-id wrapper plus en/ko parity drift', function () {
    var en = JSON.parse(readFileSync(EN_PATH, 'utf8'));
    var ko = JSON.parse(readFileSync(KO_PATH, 'utf8'));

    delete en.tool['class-random-picker'];
    en.tool.title = 'Random Picker';
    en.tool.subtitle = 'Leaked';

    var rootErrors = validateToolRootKeys(en.tool);
    assert.ok(rootErrors.some(function (msg) {
      return msg.includes('tool.title');
    }));

    var parityErrors = compareLocaleKeyPaths(en, ko, 'ko.json', 'en.json');
    assert.ok(parityErrors.length > 0);
  });
});
