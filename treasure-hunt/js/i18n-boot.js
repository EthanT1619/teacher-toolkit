import { initI18n, setLocale, getLocale, t, applyToDOM } from '../../shared/i18n.js';

const PREFIX = 'tool.treasure-hunt.';

function updateLanguageButton() {
  const btn = document.getElementById('btn-language');
  if (!btn) return;
  btn.textContent =
    getLocale() === 'en'
      ? window.thT('actions.switchToKo')
      : window.thT('actions.switchToEn');
}

function onLocaleChange() {
  applyToDOM();
  document.title = window.thT('title');
  updateLanguageButton();
  if (window.gameInstance && typeof window.gameInstance.refreshI18n === 'function') {
    window.gameInstance.refreshI18n();
  }
}

export default async function boot() {
  window.thT = (key, params) => t(PREFIX + key, params);

  await initI18n({ applyDom: true });
  document.title = window.thT('title');
  updateLanguageButton();

  window.addEventListener('toolkit:localechange', onLocaleChange);

  const btnLanguage = document.getElementById('btn-language');
  if (btnLanguage) {
    btnLanguage.addEventListener('click', () => {
      setLocale(getLocale() === 'en' ? 'ko' : 'en').catch(() => {});
    });
  }
}
