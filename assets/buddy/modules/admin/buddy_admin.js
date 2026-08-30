/**
 * Buddy Admin — módulo cliente.
 *
 * API pública:
 *
 *   Buddy.admin.get()
 *   Buddy.admin.add(email)
 *   Buddy.admin.enable(email)
 *   Buddy.admin.disable(email)
 *   Buddy.admin.open()
 *   Buddy.admin.close()
 *   Buddy.admin.isAdmin()
 *
 * La autorización real siempre pertenece al backend. Este módulo solamente
 * usa JWT para autenticar las llamadas y oculta el acceso de interfaz cuando
 * la API responde que el usuario no es administrador.
 */
window.Buddy = window.Buddy || {};

(function (window, document) {
  'use strict';

  var CONFIG = window.BuddyAdminConfig || {};
  var BUDDY_ADMIN_EMAIL = 'asosab@gmail.com';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

  var state = {
    initialized: false,
    isAdmin: false,
    loading: false,
    open: false,
    admins: []
  };

  var STYLE_ID = 'buddy-admin-style';
  var MODAL_ID = 'buddy-admin-toolbox';
  var MENU_EVENT = 'buddy:admin-visibility-changed';

  function debugLog() {
    if (!window.BuddyConfig ||
        (window.BuddyConfig.debug !== true && window.BuddyConfig.debugMode !== true)) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[Buddy Admin]');
    console.log.apply(console, args);
  }

  function normalizeEmail(value) {
    return String(value == null ? '' : value).trim().toLowerCase();
  }

  function isValidEmail(value) {
    return EMAIL_RE.test(normalizeEmail(value));
  }

  function getAccessToken() {
    if (window.Buddy.auth && typeof window.Buddy.auth.getAccessToken === 'function') {
      return window.Buddy.auth.getAccessToken();
    }
    return null;
  }

  function getSiteId() {
    return window.BuddyConfig &&
      window.BuddyConfig.app &&
      window.BuddyConfig.app.siteId
      ? String(window.BuddyConfig.app.siteId).trim().toLowerCase()
      : null;
  }

  function getTelemetry() {
    return window.Buddy.telemetry &&
      typeof window.Buddy.telemetry.request === 'function'
      ? window.Buddy.telemetry
      : null;
  }

  function getRequestContext() {
    return {
      app: {
        siteId: getSiteId()
      }
    };
  }

  function sendTelemetry(event, data) {
    if (!window.Buddy.telemetry || typeof window.Buddy.telemetry.send !== 'function') return;
    window.Buddy.telemetry.send({
      event: event,
      module: 'admin',
      data: data
    });
  }

  function configureApi() {
    var telemetry = getTelemetry();
    if (!telemetry || typeof telemetry.configureApi !== 'function') {
      throw new Error('Buddy Telemetry no está disponible.');
    }

    telemetry.configureApi(CONFIG.apiService || 'admin', {
      baseUrl: CONFIG.apiBaseUrl,
      get: CONFIG.endpoints && CONFIG.endpoints.get,
      post: CONFIG.endpoints && CONFIG.endpoints.post
    });

    return telemetry;
  }

  function request(endpoint, event, data) {
    var token = getAccessToken();
    if (!token) {
      state.isAdmin = false;
      notifyAdminVisibility();
      return Promise.reject(new Error('No hay token de autenticación.'));
    }

    var telemetry = configureApi();
    var path = CONFIG.endpoints && CONFIG.endpoints[endpoint];

    if (!path) return Promise.reject(new Error('Endpoint Admin no configurado.'));

    var payload = {
      event: event,
      module: 'admin',
      data: data,
      context: getRequestContext()
    };

    sendTelemetry(event, data);

    var options = {
      method: endpoint === 'get' ? 'GET' : 'POST',
      cache: 'no-store',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    };

    // GET no admite body. El contrato Buddy se transporta como query string;
    // POST mantiene el payload JSON en el body.
    if (endpoint === 'get') {
      var query = new URLSearchParams();
      query.set('event', payload.event);
      query.set('module', payload.module);
      query.set('data', JSON.stringify(payload.data == null ? {} : payload.data));
      query.set('context', JSON.stringify(payload.context || {}));
      path += (path.indexOf('?') === -1 ? '?' : '&') + query.toString();
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(payload);
    }

    return telemetry.request(CONFIG.apiService || 'admin', path, options).catch(function (error) {
      if (error && (error.status === 401 || error.status === 403)) {
        state.isAdmin = false;
        notifyAdminVisibility();
      }
      throw error;
    });
  }

  function normalizeAdmin(admin) {
    if (!admin || typeof admin !== 'object') return null;

    var email = normalizeEmail(admin.email);
    if (!email || email === BUDDY_ADMIN_EMAIL || String(admin.rol || '').toLowerCase() === 'buddy') {
      return null;
    }

    return {
      email: email,
      activo: admin.activo === true,
      rol: admin.rol || null
    };
  }

  function normalizeAdmins(data) {
    var source = data && Array.isArray(data.admins) ? data.admins : [];
    return source.map(normalizeAdmin).filter(Boolean);
  }

  function get() {
    return request('get', 'admin.get', {}).then(function (response) {
      state.admins = normalizeAdmins(response);
      state.isAdmin = true;
      notifyAdminVisibility();
      render();
      return state.admins.slice();
    }).catch(function (error) {
      if (error && (error.status === 401 || error.status === 403)) {
        state.admins = [];
        state.isAdmin = false;
        notifyAdminVisibility();
      }
      throw error;
    });
  }

  function post(actions) {
    var data = Array.isArray(actions) ? actions : [actions];
    return request('post', 'admin.post', data).then(function (response) {
      state.isAdmin = true;
      notifyAdminVisibility();
      return response;
    });
  }

  function updateAdmin(email, action) {
    email = normalizeEmail(email);

    if (!isValidEmail(email)) {
      return Promise.reject(new Error('Escribe un email válido.'));
    }

    if (email === BUDDY_ADMIN_EMAIL) {
      return Promise.reject(new Error('Ese administrador no puede modificarse.'));
    }

    return post([{
      accion: action,
      email: email
    }]).then(function (response) {
      return get().then(function () {
        return response;
      });
    });
  }

  function add(email) {
    return updateAdmin(email, 'add');
  }

  function enable(email) {
    return updateAdmin(email, 'enable');
  }

  function disable(email) {
    return updateAdmin(email, 'disable');
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '.buddy-admin-toolbox{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;background:rgba(0,0,0,.45)}' +
      '.buddy-admin-toolbox[hidden]{display:none}' +
      '.buddy-admin-toolbox__panel{width:min(680px,100%);max-height:min(760px,calc(100vh - 40px));overflow:auto;background:#fff;color:#222;border-radius:14px;box-shadow:0 16px 60px rgba(0,0,0,.25);padding:24px;box-sizing:border-box;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
      '.buddy-admin-toolbox__head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px}' +
      '.buddy-admin-toolbox__title{margin:0;font-size:1.35rem}' +
      '.buddy-admin-toolbox__close{border:0;background:transparent;font-size:1.5rem;cursor:pointer;padding:4px 8px}' +
      '.buddy-admin-toolbox__table{width:100%;border-collapse:collapse;margin-bottom:24px}' +
      '.buddy-admin-toolbox__table th,.buddy-admin-toolbox__table td{text-align:left;padding:10px 8px;border-bottom:1px solid #e7e7e7}' +
      '.buddy-admin-toolbox__table th{font-weight:600}' +
      '.buddy-admin-toolbox__table td:nth-child(2),.buddy-admin-toolbox__table th:nth-child(2){text-align:center;width:80px}' +
      '.buddy-admin-toolbox__table td:nth-child(3),.buddy-admin-toolbox__table th:nth-child(3){width:130px}' +
      '.buddy-admin-toolbox__form-title{font-weight:600;margin-bottom:10px}' +
      '.buddy-admin-toolbox__form{display:flex;gap:10px;align-items:center;flex-wrap:wrap}' +
      '.buddy-admin-toolbox__input{flex:1 1 280px;min-width:0;padding:10px 12px;border:1px solid #cfcfcf;border-radius:8px;font:inherit;box-sizing:border-box}' +
      '.buddy-admin-toolbox__button{padding:10px 16px;border:0;border-radius:8px;cursor:pointer;font:inherit}' +
      '.buddy-admin-toolbox__button--primary{background:#222;color:#fff}' +
      '.buddy-admin-toolbox__button--secondary{background:#eee;color:#222}' +
      '.buddy-admin-toolbox__button:disabled{opacity:.55;cursor:wait}' +
      '.buddy-admin-toolbox__message{min-height:1.4em;margin-top:10px;font-size:.92rem}' +
      '.buddy-admin-toolbox__empty{text-align:center;color:#777;padding:20px 8px}' +
      '@media(max-width:560px){.buddy-admin-toolbox{padding:10px}.buddy-admin-toolbox__panel{padding:18px}.buddy-admin-toolbox__form{display:grid;grid-template-columns:1fr 1fr}.buddy-admin-toolbox__input{grid-column:1/-1}.buddy-admin-toolbox__table td:first-child{word-break:break-word}}';

    document.head.appendChild(style);
  }

  function createModal() {
    var existing = document.getElementById(MODAL_ID);
    if (existing) return existing;

    injectStyles();

    var modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'buddy-admin-toolbox';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'buddy-admin-title');

    modal.innerHTML =
      '<div class="buddy-admin-toolbox__panel">' +
        '<div class="buddy-admin-toolbox__head">' +
          '<h2 class="buddy-admin-toolbox__title" id="buddy-admin-title">' +
            escapeHtml(CONFIG.labels.title || 'Administradores') +
          '</h2>' +
          '<button type="button" class="buddy-admin-toolbox__close" data-admin-close aria-label="' +
            escapeHtml(CONFIG.labels.close || 'Cerrar') + '">×</button>' +
        '</div>' +
        '<div data-admin-content></div>' +
      '</div>';

    document.body.appendChild(modal);

    modal.addEventListener('click', function (event) {
      if (event.target === modal || event.target.closest('[data-admin-close]')) {
        close();
      }
    });

    return modal;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function roleLabel(admin, index) {
    if (String(admin.rol || '').toLowerCase() === 'propietario' ||
        String(admin.rol || '').toLowerCase() === 'owner') {
      return CONFIG.labels.owner || 'Propietario';
    }

    // Compatibilidad con el contrato actual: si el backend todavía no
    // persiste "propietario", el primer administrador visible se presenta
    // como propietario y los siguientes como administradores.
    if (index === 0) return CONFIG.labels.owner || 'Propietario';

    return CONFIG.labels.administrator || 'Admin';
  }

  function render() {
    var modal = createModal();
    var content = modal.querySelector('[data-admin-content]');
    if (!content) return;

    var rows = state.admins.map(function (admin, index) {
      return '<tr>' +
        '<td>' + escapeHtml(admin.email) + '</td>' +
        '<td><input type="checkbox" data-admin-toggle="' + escapeHtml(admin.email) + '"' +
          (admin.activo ? ' checked' : '') + ' aria-label="Cambiar estado de ' +
          escapeHtml(admin.email) + '"></td>' +
        '<td>' + escapeHtml(roleLabel(admin, index)) + '</td>' +
        '</tr>';
    }).join('');

    if (!rows) {
      rows =
        '<tr><td colspan="3" class="buddy-admin-toolbox__empty">No hay administradores visibles.</td></tr>';
    }

    content.innerHTML =
      '<table class="buddy-admin-toolbox__table">' +
        '<thead><tr>' +
          '<th>' + escapeHtml(CONFIG.labels.email || 'correo') + '</th>' +
          '<th>' + escapeHtml(CONFIG.labels.active || 'activo') + '</th>' +
          '<th>' + escapeHtml(CONFIG.labels.role || 'rol') + '</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
      '<div class="buddy-admin-toolbox__form-title">' +
        escapeHtml(CONFIG.labels.newAdmin || 'Nuevo administrador') +
      '</div>' +
      '<form class="buddy-admin-toolbox__form" data-admin-form novalidate>' +
        '<input class="buddy-admin-toolbox__input" type="email" name="email" required ' +
          'placeholder="' + escapeHtml(CONFIG.labels.emailPlaceholder || 'Escribe un email válido') + '">' +
        '<button class="buddy-admin-toolbox__button buddy-admin-toolbox__button--primary" type="submit">' +
          escapeHtml(CONFIG.labels.send || 'enviar') +
        '</button>' +
        '<button class="buddy-admin-toolbox__button buddy-admin-toolbox__button--secondary" type="button" data-admin-cancel>' +
          escapeHtml(CONFIG.labels.cancel || 'cancelar') +
        '</button>' +
      '</form>' +
      '<div class="buddy-admin-toolbox__message" data-admin-message aria-live="polite"></div>';

    bindContentEvents(modal);
  }

  function bindContentEvents(modal) {
    var content = modal.querySelector('[data-admin-content]');
    if (!content) return;

    var form = content.querySelector('[data-admin-form]');
    var message = content.querySelector('[data-admin-message]');

    content.querySelectorAll('[data-admin-toggle]').forEach(function (checkbox) {
      checkbox.addEventListener('change', function () {
        var email = checkbox.getAttribute('data-admin-toggle');
        var enabled = checkbox.checked;
        checkbox.disabled = true;
        if (message) message.textContent = '';

        (enabled ? enable(email) : disable(email))
          .then(function () {
            render();
          })
          .catch(function (error) {
            checkbox.checked = !enabled;
            checkbox.disabled = false;
            if (message) {
              message.textContent = error && error.data && error.data.error
                ? error.data.error
                : 'No se pudo actualizar el administrador.';
            }
          });
      });
    });

    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();

        var input = form.querySelector('input[name="email"]');
        var sendButton = form.querySelector('button[type="submit"]');
        var cancelButton = form.querySelector('[data-admin-cancel]');
        var email = normalizeEmail(input && input.value);

        if (!isValidEmail(email)) {
          if (message) message.textContent = 'Escribe un email válido.';
          if (input) input.focus();
          return;
        }

        sendButton.disabled = true;
        if (cancelButton) cancelButton.disabled = true;
        if (message) message.textContent = '';

        add(email)
          .then(function (response) {
            var result = response && Array.isArray(response.results)
              ? response.results[0]
              : null;

            if (result && result.resultado === 'exists') {
              if (message) message.textContent = 'Ese administrador ya existe.';
              return get();
            }

            if (result && result.ok === false) {
              throw new Error(result.error || 'No se pudo agregar el administrador.');
            }

            return get();
          })
          .then(function () {
            if (input) input.value = '';
            render();
          })
          .catch(function (error) {
            if (message) {
              message.textContent = error && error.data && error.data.error
                ? error.data.error
                : (error.message || 'No se pudo agregar el administrador.');
            }
          })
          .then(function () {
            sendButton.disabled = false;
            if (cancelButton) cancelButton.disabled = false;
          });
      });
    }

    var cancel = content.querySelector('[data-admin-cancel]');
    if (cancel) {
      cancel.addEventListener('click', function () {
        close();
      });
    }
  }

  function notifyAdminVisibility() {
    window.dispatchEvent(new CustomEvent(MENU_EVENT, {
      detail: {
        isAdmin: state.isAdmin
      }
    }));
  }

  function open() {
    if (!state.isAdmin) {
      return get().then(function () {
        return open();
      });
    }

    render();
    var modal = createModal();
    modal.hidden = false;
    state.open = true;

    var input = modal.querySelector('input[name="email"]');
    if (input) input.focus();
  }

  function close() {
    var modal = document.getElementById(MODAL_ID);
    if (modal) modal.hidden = true;
    state.open = false;
  }

  function refresh() {
    return get();
  }

  function initialize() {
    if (state.initialized) return;
    state.initialized = true;

    // Auth es la autoridad sobre la sesión. Admin no debe consultar su API
    // mientras Auth todavía está restaurando/verificando el JWT: eso provoca
    // llamadas duplicadas durante la inicialización. Esperamos a auth-ready
    // y sólo después sincronizamos el acceso administrativo.
    var authReady = false;

    function check(detail) {
      detail = detail || {};

      if (!window.Buddy.auth || typeof window.Buddy.auth.getAccessToken !== 'function') {
        return;
      }

      if (!detail.authenticated || !getAccessToken()) {
        state.admins = [];
        state.isAdmin = false;
        notifyAdminVisibility();
        return;
      }

      get().catch(function (error) {
        debugLog('El usuario no tiene acceso administrativo o la API no está disponible.', error);
      });
    }

    // Durante el login inicial, Auth emite auth-state-changed antes de
    // auth-ready. Ignoramos ese primer evento para evitar un GET duplicado.
    window.addEventListener('buddy:auth-ready', function (event) {
      authReady = true;
      check(event && event.detail);
    });

    window.addEventListener('buddy:auth-state-changed', function (event) {
      if (!authReady) return;
      check(event && event.detail);
    });

    // Si Auth ya terminó antes de que Admin instalara los listeners, usamos
    // el estado público de Auth para sincronizar una sola vez.
    if (window.Buddy.auth &&
        typeof window.Buddy.auth.isAuthenticated === 'function' &&
        window.Buddy.auth.isAuthenticated()) {
      authReady = true;
      check({ authenticated: true });
    }
  }

  window.Buddy.admin = {
    config: CONFIG,
    get: get,
    refresh: refresh,
    add: add,
    enable: enable,
    disable: disable,
    open: open,
    close: close,
    isAdmin: function () { return state.isAdmin; },
    getAdmins: function () { return state.admins.slice(); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})(window, document);
