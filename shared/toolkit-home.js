(function () {
  if (document.querySelector('.toolkit-home, .btn-home, [data-toolkit-home]')) return;

  var link = document.createElement('a');
  link.className = 'toolkit-home';
  link.href = '../index.html';
  link.textContent = '\u2190 Tool Kit';
  link.setAttribute('data-toolkit-home', 'true');

  function refreshHomeLink() {
    var i18n = window.toolkitI18n;
    if (i18n && typeof i18n.t === 'function') {
      link.textContent = i18n.t('navigation.homeLink');
      link.setAttribute('aria-label', i18n.t('navigation.homeAriaLabel'));
      return;
    }
    link.textContent = '\u2190 Tool Kit';
    link.setAttribute('aria-label', 'Back to Tool Kit for JLS Teachers');
  }

  refreshHomeLink();
  document.body.insertBefore(link, document.body.firstChild);

  window.addEventListener('toolkit:localechange', refreshHomeLink);
})();
