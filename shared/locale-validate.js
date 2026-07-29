import { readFileSync } from 'node:fs';
import { collectLocaleKeyPaths } from './i18n-core.js';
import {
  REGISTERED_TOOL_IDS,
  TOOLS_WITH_HELP_I18N,
  REQUIRED_TOOL_KEYS,
  REQUIRED_HELP_KEYS,
  SPECIAL_TOOL_ROOT_KEYS,
  allowedToolRootKeys,
} from './tool-registry.js';

/**
 * @typedef {{ path: string, key: string }} DuplicateKeyHit
 * @typedef {{ ok: boolean, errors: string[], warnings: string[] }} LocaleValidationResult
 */

/**
 * Parse locale JSON text. Unlike JSON.parse alone, also records syntax errors clearly.
 *
 * @param {string} text
 * @param {string} label
 * @returns {{ data: Record<string, unknown> | null, error: string | null }}
 */
export function parseLocaleJson(text, label) {
  if (typeof text !== 'string' || text.trim() === '') {
    return { data: null, error: label + ': file is empty' };
  }

  try {
    var data = JSON.parse(text);
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return { data: null, error: label + ': root must be a JSON object' };
    }
    return { data: /** @type {Record<string, unknown>} */ (data), error: null };
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return { data: null, error: label + ': invalid JSON — ' + message };
  }
}

/**
 * Detect duplicate keys in JSON object literals (JSON.parse keeps the last value silently).
 *
 * @param {string} source
 * @returns {DuplicateKeyHit[]}
 */
export function findDuplicateJsonKeys(source) {
  /** @type {DuplicateKeyHit[]} */
  var duplicates = [];
  /** @type {Map<string, number>[]} */
  var keyStack = [new Map()];
  /** @type {string[]} */
  var pathStack = ['$'];

  var i = 0;
  var len = source.length;

  function skipWhitespace() {
    while (i < len && /\s/.test(source.charAt(i))) {
      i += 1;
    }
  }

  /**
   * @returns {string | null}
   */
  function readString() {
    if (source.charAt(i) !== '"') return null;
    i += 1;
    while (i < len) {
      var ch = source.charAt(i);
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === '"') {
        i += 1;
        return 'ok';
      }
      i += 1;
    }
    return null;
  }

  function readKeyword(word) {
    if (source.slice(i, i + word.length) === word) {
      i += word.length;
      return true;
    }
    return false;
  }

  function readNumberOrLiteral() {
    while (i < len && /[^,\]\}\s]/.test(source.charAt(i))) {
      i += 1;
    }
  }

  function parseValue(pathSuffix) {
    skipWhitespace();
    var ch = source.charAt(i);

    if (ch === '{') {
      parseObject(pathSuffix);
      return;
    }
    if (ch === '[') {
      parseArray(pathSuffix);
      return;
    }
    if (ch === '"') {
      readString();
      return;
    }
    if (readKeyword('true') || readKeyword('false') || readKeyword('null')) {
      return;
    }
    readNumberOrLiteral();
  }

  function parseArray(pathSuffix) {
    i += 1;
    skipWhitespace();
    if (source.charAt(i) === ']') {
      i += 1;
      return;
    }

    while (i < len) {
      parseValue(pathSuffix + '[]');
      skipWhitespace();
      if (source.charAt(i) === ',') {
        i += 1;
        skipWhitespace();
        continue;
      }
      if (source.charAt(i) === ']') {
        i += 1;
        return;
      }
      break;
    }
  }

  function parseObject(pathSuffix) {
    i += 1;
    skipWhitespace();

    keyStack.push(new Map());
    pathStack.push(pathSuffix);

    if (source.charAt(i) === '}') {
      i += 1;
      keyStack.pop();
      pathStack.pop();
      return;
    }

    while (i < len) {
      skipWhitespace();
      var keyStart = i;
      if (readString() === null) break;

      var keyText = extractJsonString(source, keyStart);
      skipWhitespace();
      if (source.charAt(i) !== ':') break;
      i += 1;

      var map = keyStack[keyStack.length - 1];
      var currentPath = pathStack[pathStack.length - 1];
      if (map.has(keyText)) {
        duplicates.push({ path: currentPath, key: keyText });
      } else {
        map.set(keyText, 1);
      }

      parseValue(currentPath + '.' + keyText);
      skipWhitespace();

      if (source.charAt(i) === ',') {
        i += 1;
        continue;
      }
      if (source.charAt(i) === '}') {
        i += 1;
        break;
      }
      break;
    }

    keyStack.pop();
    pathStack.pop();
  }

  skipWhitespace();
  if (source.charAt(i) === '{') {
    parseObject('$');
  }

  return duplicates;
}

/**
 * @param {string} source
 * @param {number} start
 * @returns {string}
 */
function extractJsonString(source, start) {
  var i = start + 1;
  var out = '';
  while (i < source.length) {
    var ch = source.charAt(i);
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === '"') {
      return out;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/**
 * @param {unknown} value
 * @param {string} [prefix]
 * @returns {string[]}
 */
export function collectEmptyObjectPaths(value, prefix) {
  var paths = [];
  var base = prefix || '';

  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return paths;
  }

  var keys = Object.keys(value);
  if (keys.length === 0 && base) {
    paths.push(base);
    return paths;
  }

  keys.forEach(function (key) {
    var next = base ? base + '.' + key : key;
    paths = paths.concat(collectEmptyObjectPaths(value[key], next));
  });

  return paths;
}

/**
 * Guard against help-block edits that drop the tool wrapper key
 * (e.g. `"class-random-picker": {` accidentally removed).
 *
 * @param {Record<string, unknown>} toolSection
 * @returns {string[]}
 */
export function validateToolRootKeys(toolSection) {
  var errors = [];
  var allowed = allowedToolRootKeys();

  Object.keys(toolSection).forEach(function (key) {
    if (!allowed.has(key)) {
      errors.push(
        'tool.' + key + ': invalid root key under tool — likely missing tool-id wrapper ' +
          '(content leaked to tool root). Allowed roots: registered tool-ids plus ' +
          SPECIAL_TOOL_ROOT_KEYS.join(', ') + '.'
      );
    }
  });

  return errors;
}

/**
 * @param {Record<string, unknown>} toolSection
 * @returns {string[]}
 */
export function validateRegisteredToolsPresent(toolSection) {
  var errors = [];

  REGISTERED_TOOL_IDS.forEach(function (toolId) {
    if (!Object.prototype.hasOwnProperty.call(toolSection, toolId)) {
      errors.push('tool.' + toolId + ': missing locale block for registered tool-id');
    }
  });

  return errors;
}

/**
 * @param {Record<string, unknown>} toolSection
 * @param {string} label
 * @returns {string[]}
 */
export function validateRequiredToolStructure(toolSection, label) {
  var errors = [];

  REGISTERED_TOOL_IDS.forEach(function (toolId) {
    var block = toolSection[toolId];
    var path = label + '.tool.' + toolId;

    if (block === null || block === undefined) {
      return;
    }

    if (typeof block !== 'object' || Array.isArray(block)) {
      errors.push(path + ': tool block must be a JSON object');
      return;
    }

    REQUIRED_TOOL_KEYS.forEach(function (requiredKey) {
      var value = block[requiredKey];
      if (typeof value !== 'string' || value.trim() === '') {
        errors.push(path + '.' + requiredKey + ': required non-empty string');
      }
    });

    if (TOOLS_WITH_HELP_I18N.includes(toolId)) {
      var helpBlock = block.help;
      if (helpBlock === null || helpBlock === undefined) {
        errors.push(path + '.help: required help block for i18n help article');
        return;
      }
      if (typeof helpBlock !== 'object' || Array.isArray(helpBlock)) {
        errors.push(path + '.help: must be a JSON object');
        return;
      }

      REQUIRED_HELP_KEYS.forEach(function (helpKey) {
        var helpValue = helpBlock[helpKey];
        if (typeof helpValue !== 'string' || helpValue.trim() === '') {
          errors.push(path + '.help.' + helpKey + ': required non-empty string');
        }
      });
    }
  });

  return errors;
}

/**
 * @param {unknown} left
 * @param {unknown} right
 * @param {string} leftLabel
 * @param {string} rightLabel
 * @returns {string[]}
 */
export function compareLocaleKeyPaths(left, right, leftLabel, rightLabel) {
  var leftKeys = collectLocaleKeyPaths(left).sort();
  var rightKeys = collectLocaleKeyPaths(right).sort();
  var errors = [];

  var leftSet = new Set(leftKeys);
  var rightSet = new Set(rightKeys);

  leftKeys.forEach(function (key) {
    if (!rightSet.has(key)) {
      errors.push('Missing in ' + rightLabel + ': ' + key);
    }
  });

  rightKeys.forEach(function (key) {
    if (!leftSet.has(key)) {
      errors.push('Missing in ' + leftLabel + ': ' + key);
    }
  });

  return errors;
}

/**
 * @param {string} enPath
 * @param {string} koPath
 * @returns {LocaleValidationResult}
 */
export function validateLocaleFiles(enPath, koPath) {
  /** @type {string[]} */
  var errors = [];
  /** @type {string[]} */
  var warnings = [];

  var enText = readFileSync(enPath, 'utf8');
  var koText = readFileSync(koPath, 'utf8');

  var enParsed = parseLocaleJson(enText, 'en.json');
  var koParsed = parseLocaleJson(koText, 'ko.json');

  if (enParsed.error) errors.push(enParsed.error);
  if (koParsed.error) errors.push(koParsed.error);

  findDuplicateJsonKeys(enText).forEach(function (hit) {
    errors.push('en.json duplicate key "' + hit.key + '" at ' + hit.path);
  });
  findDuplicateJsonKeys(koText).forEach(function (hit) {
    errors.push('ko.json duplicate key "' + hit.key + '" at ' + hit.path);
  });

  if (!enParsed.data || !koParsed.data) {
    return { ok: false, errors: errors, warnings: warnings };
  }

  errors = errors.concat(compareLocaleKeyPaths(enParsed.data, koParsed.data, 'ko.json', 'en.json'));

  collectEmptyObjectPaths(enParsed.data).forEach(function (path) {
    errors.push('en.json empty object at ' + path);
  });
  collectEmptyObjectPaths(koParsed.data).forEach(function (path) {
    errors.push('ko.json empty object at ' + path);
  });

  var enTool = enParsed.data.tool;
  var koTool = koParsed.data.tool;

  if (enTool === null || enTool === undefined || typeof enTool !== 'object' || Array.isArray(enTool)) {
    errors.push('en.json: missing tool section object');
  } else {
    errors = errors.concat(validateToolRootKeys(/** @type {Record<string, unknown>} */ (enTool)));
    errors = errors.concat(validateRegisteredToolsPresent(/** @type {Record<string, unknown>} */ (enTool)));
    errors = errors.concat(
      validateRequiredToolStructure(/** @type {Record<string, unknown>} */ (enTool), 'en.json')
    );
  }

  if (koTool === null || koTool === undefined || typeof koTool !== 'object' || Array.isArray(koTool)) {
    errors.push('ko.json: missing tool section object');
  } else {
    errors = errors.concat(validateToolRootKeys(/** @type {Record<string, unknown>} */ (koTool)));
    errors = errors.concat(validateRegisteredToolsPresent(/** @type {Record<string, unknown>} */ (koTool)));
    errors = errors.concat(
      validateRequiredToolStructure(/** @type {Record<string, unknown>} */ (koTool), 'ko.json')
    );
  }

  return {
    ok: errors.length === 0,
    errors: errors,
    warnings: warnings,
  };
}
