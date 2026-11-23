// Statetty WhatsApp Direct — interceptación directa en páginas de Statetty.
//
// Atrapa clicks sobre enlaces de conversación de WhatsApp (wa.me o
// api.whatsapp.com/send), tanto en el href como dentro de onclick — Statetty
// usa openWsRedirect('trackUrl','waUrl') que abre con window.open, así que el
// href del anchor suele ser "#". En vez de dejar que se abra una pestaña
// nueva, pide al background que abra el chat dentro de la pestaña viva de
// WhatsApp Web. Si no hay pestaña de WhatsApp Web (o falla el enrutado), cae
// al comportamiento original: window.open(waUrl).
//
// La telemetría de Statetty se preserva: si el waUrl venía de un
// openWsRedirect(...) se dispara el fetch de trackUrl igual que antes, y para
// anchors con href wa.me no se detiene la propagación (wa_listener de Buddy
// sigue viendo el click).

(function () {
  'use strict';

  // Marca para que statetty.com detecte la extensión y no pida instalarla.
  document.documentElement.setAttribute('data-stt-wa-ext', '0.1.0');

  var api = globalThis.browser ?? globalThis.chrome;
  var WA_HOST = /^https?:\/\/(wa\.me|api\.whatsapp\.com|www\.whatsapp\.com)\//i;
  var REDIRECT_CALL = /openWsRedirect\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/;

  function linkFromAnchor(a) {
    // Devuelve {url, track, inOnclick} o null.
    var href = a.getAttribute('href') || '';
    if (WA_HOST.test(href)) return { url: href, track: null, inOnclick: false };

    var onclick = a.getAttribute('onclick') || '';
    var call = onclick.match(REDIRECT_CALL);
    if (call && WA_HOST.test(call[2])) {
      return { url: call[2], track: call[1], inOnclick: true };
    }
    var generic = onclick.match(/['"](https?:\/\/(?:wa\.me|(?:api|www)\.whatsapp\.com)\/[^'"]+)['"]/i);
    if (generic && WA_HOST.test(generic[1])) {
      return { url: generic[1], track: null, inOnclick: true };
    }
    return null;
  }

  function fallback(url) {
    try { window.open(url, '_blank'); } catch (e) { /* sin gesto, nada que hacer */ }
  }

  function handleClick(ev) {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    var a = ev.target && typeof ev.target.closest === 'function' ? ev.target.closest('a') : null;
    if (!a) return;
    var link = linkFromAnchor(a);
    if (!link) return;

    ev.preventDefault();
    if (link.inOnclick) {
      // Hay que frenar el onclick inline o openWsRedirect abriría la pestaña.
      ev.stopImmediatePropagation();
    }
    if (link.track) {
      try { fetch(link.track).catch(function () {}); } catch (e) {}
    }

    var url = link.url;
    try {
      api.runtime.sendMessage({ type: 'stt-route', url: url }, function (resp) {
        if (api.runtime.lastError || !resp || !resp.ok) fallback(url);
      });
    } catch (e) {
      fallback(url);
    }
  }

  document.addEventListener('click', handleClick, true);
})();
