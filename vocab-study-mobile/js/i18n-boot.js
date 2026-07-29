import { initI18n, setLocale, getLocale, t, applyToDOM } from '../../shared/i18n.js';

const PREFIX = 'tool.vocab-study-mobile.';

function updateLanguageButton() {
  const btn = document.getElementById('btn-language');
  if (!btn) return;
  btn.textContent =
    getLocale() === 'en'
      ? window.vsT('actions.switchToKo')
      : window.vsT('actions.switchToEn');
}

function onLocaleChange() {
  applyToDOM();
  document.title = window.vsT('title');
  updateLanguageButton();
  if (typeof window.vsRefreshI18n === 'function') {
    window.vsRefreshI18n();
  }
}

export default async function boot() {
  window.vsT = (key, params) => t(PREFIX + key, params);

  await initI18n({ applyDom: true });
  document.title = window.vsT('title');
  updateLanguageButton();

  window.addEventListener('toolkit:localechange', onLocaleChange);

  const btnLanguage = document.getElementById('btn-language');
  if (btnLanguage) {
    btnLanguage.addEventListener('click', () => {
      setLocale(getLocale() === 'en' ? 'ko' : 'en').catch(() => {});
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await boot();
  if (typeof window.vsInit === 'function') window.vsInit();
});
