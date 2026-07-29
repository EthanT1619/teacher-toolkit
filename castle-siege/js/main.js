/**
 * Entry point — i18n bootstrap and Castle Siege init.
 */
import { initI18n, setLocale, getLocale, t, applyToDOM } from '../../shared/i18n.js';

window.csT = (k, p) => t('tool.castle-siege.' + k, p);

function updatePageTitle() {
  document.title = csT('title');
}

function updateLanguageButton() {
  document.querySelectorAll('.btn-language').forEach((btn) => {
    btn.textContent =
      getLocale() === 'en' ? csT('actions.switchToKo') : csT('actions.switchToEn');
  });
}

function refreshI18nUI() {
  applyToDOM();
  updatePageTitle();
  updateLanguageButton();
  if (window.castleSiege && typeof window.castleSiege.refreshI18n === 'function') {
    window.castleSiege.refreshI18n();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await initI18n({ applyDom: true });
  updatePageTitle();
  updateLanguageButton();

  document.querySelectorAll('.btn-language').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await setLocale(getLocale() === 'en' ? 'ko' : 'en');
      } catch (error) {
        console.error('Locale switch failed:', error);
      }
    });
  });

  window.addEventListener('toolkit:localechange', refreshI18nUI);

  window.castleSiege = new Game();
});
