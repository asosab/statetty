/**
 * Buddy WhatsApp Listener
 * ---------------------------------------------------------------------------
 * Registra clicks sobre enlaces wa.me mediante Buddy Telemetry.
 *
 * El módulo es transversal y es cargado directamente por buddy.js.
 * ---------------------------------------------------------------------------
 */
window.Buddy = window.Buddy || {};

(function (window, document) {
  'use strict';

  var CONFIG = window.BuddyWaListenerConfig || {};
  var initialized = false;

  function debugLog() {
    if (!window.BuddyConfig || window.BuddyConfig.debug !== true) return;

    var args = Array.prototype.slice.call(arguments);
    args.unshift('[Buddy WA Listener]');
    console.log.apply(console, args);
  }

  function isWhatsAppUrl(url) {
    try {
      var parsed = new URL(url, document.baseURI);
      return parsed.hostname.toLowerCase() === 'wa.me';
    } catch (error) {
      debugLog('No se pudo analizar la URL del enlace.', url, error);
      return false;
    }
  }

  function findLink(target) {
    if (!target) return null;

    if (typeof target.closest === 'function') {
      return target.closest('a[href]');
    }

    while (target && target !== document) {
      if (String(target.tagName || '').toLowerCase() === 'a' && target.getAttribute('href')) {
        return target;
      }
      target = target.parentNode;
    }

    return null;
  }

  function trackClick(link) {
    if (!window.Buddy.telemetry || typeof window.Buddy.telemetry.send !== 'function') {
      debugLog('Click WA detectado, pero Buddy Telemetry todavía no está disponible.');
      return false;
    }

    var url = link.href;
    var evento = {
      event: 'telemetry.wa',
      module: 'telemetry',
      data: {
        wa: {
          date: new Date().toISOString(),
          URL: url
        }
      }
    };

    debugLog('Click WA detectado.', {
      URL: url,
      event: evento.event,
      module: evento.module
    });

    var sent = window.Buddy.telemetry.send(evento);

    debugLog('Evento telemetry.wa enviado a Buddy Telemetry.', {
      sent: sent,
      URL: url
    });

    return sent;
  }

  function handleClick(event) {
    var link = findLink(event && event.target);
    if (!link || !isWhatsAppUrl(link.href)) return;

    trackClick(link);
  }

  function init() {
    if (initialized || CONFIG.enabled === false) {
      if (CONFIG.enabled === false) debugLog('Módulo deshabilitado por configuración.');
      return false;
    }

    initialized = true;
    document.addEventListener('click', handleClick, true);

    debugLog('Módulo inicializado.', {
      enabled: CONFIG.enabled === true
    });

    return true;
  }

  window.Buddy.wa_listener = {
    init: init,
    config: CONFIG
  };

  init();
})(window, document);
