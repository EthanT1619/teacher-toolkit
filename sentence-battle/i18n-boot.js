import { initI18n, setLocale, getLocale, t, applyToDOM } from '../shared/i18n.js';

window.sbT = (k, p) => t('tool.sentence-battle.' + k, p);

function updateLanguageButton() {
  const btn = document.getElementById('btn-language');
  if (!btn) return;
  btn.textContent =
    getLocale() === 'en'
      ? window.sbT('actions.switchToKo')
      : window.sbT('actions.switchToEn');
}

function onLocaleChange() {
  applyToDOM();
  document.title = window.sbT('title');
  updateLanguageButton();
  if (typeof window.refreshI18n === 'function') {
    window.refreshI18n();
  }
}

async function boot() {
  await initI18n({ applyDom: true });
  document.title = window.sbT('title');
  updateLanguageButton();

  window.addEventListener('toolkit:localechange', onLocaleChange);

  const btnLanguage = document.getElementById('btn-language');
  if (btnLanguage) {
    btnLanguage.addEventListener('click', () => {
      setLocale(getLocale() === 'en' ? 'ko' : 'en').catch(() => {});
    });
  }

  window.__sbI18nReady = true;
  window.dispatchEvent(new Event('sentence-battle:i18nready'));
}

boot();
