import { initI18n } from '../shared/i18n.js';

try {
  await initI18n({ applyDom: true });
  if (typeof window.charadesRefreshI18n === 'function') {
    window.charadesRefreshI18n();
  }
} catch (_error) {
  // file:// or blocked locale fetch — the activity still runs from app.js
}
