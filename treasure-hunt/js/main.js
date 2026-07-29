/**
 * main.js — Entry point for Treasure Hunt.
 */
import boot from './i18n-boot.js';

document.addEventListener('DOMContentLoaded', async () => {
  await boot();
  window.gameInstance = new Game();
});
