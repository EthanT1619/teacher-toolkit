import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = __dirname;
const root = path.join(base, '..');
let html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(base, 'css', 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(base, 'js', 'app.js'), 'utf8');

const en = JSON.parse(fs.readFileSync(path.join(root, 'shared', 'locales', 'en.json'), 'utf8'));
const ko = JSON.parse(fs.readFileSync(path.join(root, 'shared', 'locales', 'ko.json'), 'utf8'));
const toolEn = en.tool['vocab-study-mobile'];
const toolKo = ko.tool['vocab-study-mobile'];

function buildStandaloneBoot() {
  return `(function() {
  var MESSAGES = { en: ${JSON.stringify(toolEn)}, ko: ${JSON.stringify(toolKo)} };
  var LEGACY_KEYS = ['vocab-study-mobile-presets','participation-tracker-v3','participation-tracker-v2','participation-tracker-v1','classTeamMaker','classRandomPicker','ladderGame','mysteryBoxPicker','diceChanceGame','juldarigiGame','tongAjossiGame','story-forge-presets','sentence-kitchen-presets','5w1h-factory-settings'];
  function resolveLocale() {
    try {
      var stored = localStorage.getItem('toolkit-language');
      if (stored === 'en' || stored === 'ko') return stored;
      for (var i = 0; i < LEGACY_KEYS.length; i++) {
        if (localStorage.getItem(LEGACY_KEYS[i]) !== null) return 'ko';
      }
    } catch (e) {}
    return 'en';
  }
  function lookup(obj, parts) {
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null || typeof cur !== 'object') return null;
      cur = cur[parts[i]];
    }
    return typeof cur === 'string' ? cur : null;
  }
  function interpolate(str, params) {
    if (!params) return str;
    return str.replace(/\\{([^}]+)\\}/g, function(_, key) {
      return params[key] != null ? String(params[key]) : '{' + key + '}';
    });
  }
  var locale = resolveLocale();
  document.documentElement.lang = locale;
  window.vsT = function(key, params) {
    var parts = key.split('.');
    var val = lookup(MESSAGES[locale], parts);
    if (val == null && locale !== 'en') val = lookup(MESSAGES.en, parts);
    if (val == null) return 'tool.vocab-study-mobile.' + key;
    return interpolate(val, params);
  };
  document.title = window.vsT('title');
})();`;
}

const standaloneBoot = buildStandaloneBoot();
const scriptBlock = `<script>\n${standaloneBoot}\n${js}\nwindow.vsInit = init;\ndocument.addEventListener('DOMContentLoaded', function() { if (window.vsInit) window.vsInit(); });\n</script>`;

html = html.replace(/\r\n/g, '\n');
html = html.replace('<link rel="stylesheet" href="../shared/toolkit-home.css">', '');
html = html.replace('<script src="../shared/toolkit-home.js" defer></script>', '');
html = html.replace('<link rel="stylesheet" href="css/style.css">', `<style>\n${css}\n</style>`);
html = html.replace(
  '<script src="js/app.js"></script>\n  <script type="module" src="js/i18n-boot.js"></script>',
  scriptBlock
);

fs.writeFileSync(path.join(base, 'standalone-bundled.html'), html, 'utf8');
console.log('standalone-bundled.html created:', html.length, 'bytes');
