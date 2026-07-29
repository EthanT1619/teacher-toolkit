/**
 * main.js — Entry point for Phonics Hunt.
 */
document.addEventListener('DOMContentLoaded', async () => {
  await window.__phonicsHuntI18nReady;
  window.gameInstance = new Game();
});
