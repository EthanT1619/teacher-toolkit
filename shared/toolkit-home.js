(function () {
  if (document.querySelector('.toolkit-home, .btn-home, [data-toolkit-home]')) return;

  var link = document.createElement('a');
  link.className = 'toolkit-home';
  link.href = '../index.html';
  link.textContent = '\u2190 Tool Kit';
  link.setAttribute('aria-label', 'Tool Kit for JLS Teacher\uB85C \uB3CC\uC544\uAC00\uAE30');

  document.body.insertBefore(link, document.body.firstChild);
})();
