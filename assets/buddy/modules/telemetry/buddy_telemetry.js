/**
 * Buddy Telemetry
 * ---------------------------------------------------------------------------
 * Capa común para comunicar eventos de uso de todos los módulos de Buddy.
 *
 * Los módulos producen eventos mediante:
 *
 *   Buddy.telemetry.send({
 *     event: '...',
 *     module: '...',
 *     data: { ... }
 *   });
 *
 * Telemetry no interpreta ni valida los datos particulares del evento.
 * Solamente agrega contexto común de Buddy, sesión y página y los envía a
 * POST /telemetry de forma fire-and-forget.
 * ---------------------------------------------------------------------------
 */
window.Buddy = window.Buddy || {};

(function (window, document) {
  'use strict';

  var CONFIG = window.BuddyTelemetryConfig || {};
  var initialized = false;
  var sessionId = null;
  var userId = null;

  function debugLog() {
    if (!window.BuddyConfig || (window.BuddyConfig.debug !== true && window.BuddyConfig.debugMode !== true)) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[Buddy]');
    console.log.apply(console, args);
  }

  function createSessionId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch (error) {}

    return 's-' + Date.now().toString(36) + '-' +
      Math.random().toString(36).slice(2) + '-' +
      Math.random().toString(36).slice(2);
  }

  function getSessionId() {
    if (sessionId) return sessionId;

    try {
      sessionId = window.sessionStorage.getItem('buddyTelemetrySessionId');
      if (!sessionId) {
        sessionId = createSessionId();
        window.sessionStorage.setItem('buddyTelemetrySessionId', sessionId);
      }
    } catch (error) {
      sessionId = createSessionId();
    }

    return sessionId;
  }

  function getPageContext() {
    return {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer || null,
      language: navigator.language,
      userAgent: navigator.userAgent,
      screen: window.screen ? window.screen.width + 'x' + window.screen.height : null,
      viewport: window.innerWidth + 'x' + window.innerHeight,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  function getContext() {
    var buddyConfig = window.BuddyConfig || {};
    var characterId = window.Buddy.characterId || null;

    return {
      app: {
        siteId: buddyConfig.app && buddyConfig.app.siteId
          ? buddyConfig.app.siteId
          : null
      },
      buddy: {
        character: characterId
      },
      session: {
        sessionId: getSessionId(),
        userId: userId
      },
      page: getPageContext(),
      timestamp: new Date().toISOString()
    };
  }

  function normalizeEvent(data) {
    if (!data || typeof data !== 'object') return null;

    return {
      event: data.event || null,
      module: data.module || null,
      data: data.data !== undefined ? data.data : data
    };
  }

  function send(data) {
    if (!CONFIG || CONFIG.enabled === false) {
      debugLog('Telemetry deshabilitado.');
      return false;
    }

    var evento = normalizeEvent(data);
    if (!evento) {
      debugLog('Telemetry recibió un evento inválido.', data);
      return false;
    }

    var payload = {
      event: evento.event,
      module: evento.module,
      data: evento.data,
      context: getContext()
    };

    debugLog('Enviando evento de telemetry:', payload);

    try {
      fetch(CONFIG.apiUrl || (CONFIG.apis && CONFIG.apis.telemetry) || '/telemetry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).then(function (response) {
        if (!response.ok) {
          debugLog('Telemetry respondió HTTP ' + response.status + '.');
        }
      }).catch(function (error) {
        debugLog('Error al enviar telemetry:', error);
      });
    } catch (error) {
      debugLog('Error al iniciar el envío de telemetry:', error);
    }

    return true;
  }



  function resolveApi(service, path) {
    var apis = CONFIG.apis || {};
    var entry = apis[service];
    if (!entry) throw new Error('[Buddy Telemetry] API no configurada: ' + service);

    var baseUrl = typeof entry === 'string'
      ? entry
      : (entry.baseUrl || (CONFIG.apiBaseUrls && CONFIG.apiBaseUrls[service]) || '');
    if (!baseUrl) throw new Error('[Buddy Telemetry] Falta baseUrl para API: ' + service);

    var target = String(path || '');
    if (/^https?:\/\//i.test(target)) return target;
    if (target.charAt(0) !== '/') target = '/' + target;
    return baseUrl.replace(/\/$/, '') + target;
  }

  function getApiConfig(service) {
    var entry = CONFIG.apis && CONFIG.apis[service];
    if (!entry) return null;
    return typeof entry === 'string' ? { baseUrl: entry } : entry;
  }

  function configureApi(service, config) {
    if (!service || !config) return false;
    CONFIG.apis = CONFIG.apis || {};
    var current = getApiConfig(service) || {};
    CONFIG.apis[service] = Object.assign({}, current, config);
    return true;
  }

  function sanitizeDebugUrl(url) {
    try {
      var parsed = new URL(url, document.baseURI);
      ['auth', 'token'].forEach(function (key) {
        if (parsed.searchParams.has(key)) parsed.searchParams.set(key, '***MASKED***');
      });
      return parsed.href;
    } catch (e) {
      return String(url || '').replace(/([?&](?:auth|token)=)[^&]*/gi, '$1***MASKED***');
    }
  }

  function debugBody(body) {
    if (body == null) return null;
    if (body instanceof URLSearchParams) {
      var obj = {};
      body.forEach(function (value, key) {
        obj[key] = value;
      });
      return obj;
    }
    if (body instanceof FormData) {
      var form = {};
      body.forEach(function (value, key) {
        form[key] = value instanceof File ? '[File ' + value.name + ']' : value;
      });
      return form;
    }
    if (typeof body === 'object') return body;
    return String(body);
  }

  function request(service, path, options) {
    options = options || {};
    if (!CONFIG || CONFIG.enabled === false) {
      return Promise.reject(new Error('Telemetry deshabilitado.'));
    }

    var url = resolveApi(service, path);
    var method = String(options.method || 'GET').toUpperCase();
    var headers = Object.assign({}, options.headers || {});
    var fetchOptions = {
      method: method,
      headers: headers,
      credentials: options.credentials || 'omit',
      cache: options.cache || 'no-store'
    };

    if (options.signal) fetchOptions.signal = options.signal;

    debugLog('HTTP REQUEST', { service: service, method: method, url: sanitizeDebugUrl(url), credentials: fetchOptions.credentials, body: debugBody(options.body) });
    if (options.keepalive !== undefined) fetchOptions.keepalive = !!options.keepalive;

    if (options.body !== undefined && options.body !== null) {
      if (options.body instanceof URLSearchParams || options.body instanceof FormData) {
        fetchOptions.body = options.body;
      } else if (typeof options.body === 'object') {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        fetchOptions.body = JSON.stringify(options.body);
      } else {
        fetchOptions.body = options.body;
      }
    }

    return fetch(url, fetchOptions).then(function (response) {
      return response.text().then(function (raw) {
        var data = null;
        if (raw) {
          try { data = JSON.parse(raw); } catch (e) { data = raw; }
        }
        debugLog('HTTP RESPONSE', {
          service: service,
          method: method,
          url: sanitizeDebugUrl(url),
          status: response.status,
          ok: response.ok,
          contentType: response.headers.get('content-type'),
          body: data
        });
        if (!response.ok) {
          var error = new Error('HTTP ' + response.status);
          error.status = response.status;
          error.data = data;
          throw error;
        }
        return data;
      });
    }).catch(function (error) {
      debugLog('HTTP ERROR', {
        service: service,
        method: method,
        url: sanitizeDebugUrl(url),
        message: error && error.message ? error.message : String(error),
        status: error && error.status,
        data: error && error.data
      });
      throw error;
    });
  }

  function get(service, path, options) {
    return request(service, path, Object.assign({}, options || {}, { method: 'GET' }));
  }

  function post(service, path, body, options) {
    return request(service, path, Object.assign({}, options || {}, {
      method: 'POST',
      body: body
    }));
  }

  function setUserId(value) {
    userId = value == null || value === '' ? null : String(value);
  }

  function clearUserId() {
    userId = null;
  }

  function init() {
    if (initialized) return;
    initialized = true;
    getSessionId();
    debugLog('Telemetry inicializado.', {
      siteId: window.BuddyConfig &&
        window.BuddyConfig.app &&
        window.BuddyConfig.app.siteId,
      enabled: CONFIG.enabled !== false
    });
  }

  window.Buddy.telemetry = {
    send: send,
    setUserId: setUserId,
    clearUserId: clearUserId,
    request: request,
    get: get,
    post: post,
    configureApi: configureApi,
    getApiConfig: getApiConfig,
    getSessionId: getSessionId,
    init: init,
    config: CONFIG
  };

  init();
})(window, document);
