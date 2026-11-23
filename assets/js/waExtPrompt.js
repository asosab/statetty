/**
 * waExtPrompt — aviso para instalar «Statetty WhatsApp Direct»
 * ---------------------------------------------------------------------------
 * Al hacer click en un enlace de contacto de WhatsApp desde una compu, si la
 * extensión no está instalada (no hay data-stt-wa-ext en <html>) muestra una
 * tarjeta invitando a instalarla: con ella el chat abre dentro de la pestaña
 * de WhatsApp Web ya cargada, sin pestañas nuevas ni pantalla de instalación.
 *
 * No intercepta el click: wa.me sigue su curso normal. Se muestra una vez por
 * sesión, y «No mostrar más» lo apaga para siempre.
 */
(function () {
  'use strict';

  var PROMPT_URL = '/ext/';
  var WA_HOST = /^https?:\/\/(wa\.me|api\.whatsapp\.com|www\.whatsapp\.com)\//i;
  var WA_IN_ONCLICK = /['"](https?:\/\/(?:wa\.me|(?:api|www)\.whatsapp\.com)\/[^'"]+)['"]/i;
  var SHOWN_KEY = 'stt_waext_shown';
  var HIDE_KEY = 'stt_waext_hide';

  function isMobile() {
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') {
      return navigator.userAgentData.mobile;
    }
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }

  function extInstalled() {
    return Boolean(document.documentElement.getAttribute('data-stt-wa-ext'));
  }

  function isWaLink(a) {
    var href = a.getAttribute('href') || '';
    if (WA_HOST.test(href)) return true;
    var onclick = a.getAttribute('onclick') || '';
    return WA_IN_ONCLICK.test(onclick);
  }

  // El propio acceso a window.localStorage puede lanzar SecurityError en
  // orígenes opacos; por eso se referencia dentro del try.
  function storageGet(storeName, key) {
    try { return window[storeName].getItem(key); } catch (e) { return null; }
  }
  function storageSet(storeName, key, val) {
    try { window[storeName].setItem(key, val); } catch (e) {}
  }

  function removeCard(card) {
    if (card && card.parentNode) card.parentNode.removeChild(card);
  }

  function showCard() {
    if (document.getElementById('stt-waext-card')) return;

    var card = document.createElement('div');
    card.id = 'stt-waext-card';
    card.setAttribute('role', 'dialog');
    card.style.cssText = [
      'position:fixed', 'left:50%', 'bottom:1.2rem', 'transform:translateX(-50%)',
      'z-index:100000', 'max-width:26rem', 'width:calc(100% - 2rem)',
      'background:#ffffff', 'color:#111b21', 'border-radius:12px',
      'box-shadow:0 8px 30px rgba(0,0,0,.35)', 'padding:1rem 1.1rem',
      'font-family:"Segoe UI",Roboto,Helvetica,Arial,sans-serif', 'font-size:.95rem',
      'line-height:1.4', 'box-sizing:border-box'
    ].join(';');

    var text = document.createElement('p');
    text.style.cssText = 'margin:0 0 .8rem';
    text.textContent = '¿Usás WhatsApp Web en esta compu? Con la extensión gratuita de Statetty, los contactos se abren dentro de tu pestaña de WhatsApp Web, sin pestañas nuevas ni pantallas de instalación.';
    card.appendChild(text);

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:.5rem;flex-wrap:wrap;align-items:center';

    var install = document.createElement('a');
    install.href = PROMPT_URL;
    install.target = '_blank';
    install.rel = 'noopener';
    install.textContent = 'Ver cómo instalarla';
    install.style.cssText = 'background:#00a884;color:#fff;text-decoration:none;padding:.5rem 1rem;border-radius:999px;font-weight:600';
    row.appendChild(install);

    var later = document.createElement('button');
    later.type = 'button';
    later.textContent = 'Después';
    later.style.cssText = 'background:none;border:0;color:#54656f;padding:.5rem .6rem;cursor:pointer;font-size:.95rem';
    later.addEventListener('click', function () { removeCard(card); });
    row.appendChild(later);

    var never = document.createElement('button');
    never.type = 'button';
    never.textContent = 'No mostrar más';
    never.style.cssText = 'background:none;border:0;color:#8696a0;padding:.5rem .6rem;cursor:pointer;font-size:.85rem;text-decoration:underline';
    never.addEventListener('click', function () {
      storageSet('localStorage', HIDE_KEY, '1');
      removeCard(card);
    });
    row.appendChild(never);

    card.appendChild(row);
    document.body.appendChild(card);
  }

  function maybePrompt() {
    if (extInstalled() || isMobile()) return;
    if (storageGet('localStorage', HIDE_KEY) || storageGet('sessionStorage', SHOWN_KEY)) return;
    storageSet('sessionStorage', SHOWN_KEY, '1');
    // Sin bloquear nada: el enlace abre como siempre; el aviso queda en esta pestaña.
    setTimeout(showCard, 300);
  }

  function onClick(ev) {
    if (ev.defaultPrevented || ev.button !== 0) return;
    var a = ev.target && typeof ev.target.closest === 'function' ? ev.target.closest('a') : null;
    if (!a || !isWaLink(a)) return;
    maybePrompt();
  }

  document.addEventListener('click', onClick, true);

  // Vías programáticas: muchos links de WhatsApp se arman en el cliente o
  // llegan desde la API y se abren con window.open, sin anchor de por medio.
  var origOpen = window.open;
  if (typeof origOpen === 'function') {
    window.open = function (url) {
      try {
        if (typeof url === 'string' && WA_HOST.test(url)) maybePrompt();
      } catch (e) {}
      return origOpen.apply(window, arguments);
    };
  }
})();
