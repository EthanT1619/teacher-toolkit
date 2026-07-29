import { initI18n, setLocale, getLocale, t, applyToDOM } from '../../shared/i18n.js';

const PREFIX = 'tool.phonics-hunt.';

function updateLanguageButton() {
  const label =
    getLocale() === 'en'
      ? window.phT('actions.switchToKo')
      : window.phT('actions.switchToEn');

  document.querySelectorAll('#btn-language, #btn-language-setup').forEach((btn) => {
    btn.textContent = label;
  });
}

function onLocaleChange() {
  applyToDOM();
  document.title = window.phT('title');
  updateLanguageButton();
  if (window.gameInstance && typeof window.gameInstance.refreshI18n === 'function') {
    window.gameInstance.refreshI18n();
  }
}

export default async function boot() {
  window.phT = (key, params) => t(PREFIX + key, params);

  if (document.readyState === 'loading') {
    await new Promise((resolve) => {
      document.addEventListener('DOMContentLoaded', resolve, { once: true });
    });
  }

  await initI18n({ applyDom: true });
  document.title = window.phT('title');
  updateLanguageButton();

  window.addEventListener('toolkit:localechange', onLocaleChange);

  document.querySelectorAll('#btn-language, #btn-language-setup').forEach((btn) => {
    btn.addEventListener('click', () => {
      setLocale(getLocale() === 'en' ? 'ko' : 'en').catch(() => {});
    });
  });
}

window.__phonicsHuntI18nReady = boot();
