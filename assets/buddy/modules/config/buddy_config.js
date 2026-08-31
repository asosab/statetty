/**
 * Buddy Config — módulo cliente de administración de configuración (superusuario).
 *
 * API pública:
 *
 *   Buddy.configToolbox.open()
 *   Buddy.configToolbox.close()
 *   Buddy.configToolbox.refresh()
 *   Buddy.configToolbox.listConfigs()
 *   Buddy.configToolbox.getConfig(url)
 *   Buddy.configToolbox.saveConfig(payload)
 *   Buddy.configToolbox.modulesList(payload)
 *   Buddy.configToolbox.saveModule(payload)
 *   Buddy.configToolbox.isSuperuser()
 *
 * Renderiza un formulario (no se llena JSON a mano) interpretando el
 * schema.json de cada módulo. Solo el superusuario (asosab@gmail.com) puede
 * abrir y editar.
 */
window.Buddy = window.Buddy || {};

(function (window, document) {
  'use strict';

  var CONFIG = window.BuddyConfigToolboxConfig || {};
  var SUPERUSER = (CONFIG.superuserEmail || 'asosab@gmail.com').toLowerCase();

  // Base de este módulo, derivada de la URL con la que buddy.js lo cargó.
  var MODULE_BASE = (function () {
    var script = document.currentScript;
    if (script && script.src) {
      var href = script.src.split('?')[0];
      return href.slice(0, href.lastIndexOf('/') + 1);
    }
    return '';
  })();

  // Base absoluta de los assets de Buddy (https://statetty.com/assets/buddy/).
  // Buddy puede cargarse y ejecutarse en dominios ajenos, así que los assets
  // (schemas incluidos) deben resolverse contra ESTE host, NO contra el origin
  // de la página embebedora. Se prioriza el valor que expone buddy.js y, si no
  // está disponible, se deriva de MODULE_BASE (…/modules/config/ -> …/).
  var ASSET_BASE = (function () {
    var exposed = window.Buddy && window.Buddy.assetBase;
    if (exposed) return exposed.charAt(exposed.length - 1) === '/' ? exposed : exposed + '/';
    var idx = MODULE_BASE.indexOf('/modules/');
    return idx !== -1 ? MODULE_BASE.slice(0, idx + 1) : 'https://statetty.com/assets/buddy/';
  })();

  var state = {
    initialized: false,
    open: false,
    loading: false,
    isSuperuser: false,
    catalog: [],          // módulos disponibles (meta público)
    configs: [],          // lista de configs por página
    currentConfig: null,  // config seleccionada ({_id, url, ...})
    editingModule: null,   // módulo en edición ({module, schema, values})
    lastModules: []        // lista de módulos cargada para la config actual
  };

  var STYLE_ID = 'buddy-config-style';
  var MODAL_ID = 'buddy-config-toolbox';
  // Misma máscara que el backend: marca de "no toques este campo" (input password en blanco).
  var SECRET_MASK = '\u2022\u2022\u2022\u2022\u2022\u2022';

  function buildModulePayload(schema, collected) {
    var out = {};
    (schema.fields || []).forEach(function (f) {
      if (!(f.key in collected)) return;
      if (f.type === 'secret') {
        var v = collected[f.key];
        // Si quedó vacío, enviamos la máscara para que el backend conserve el
        // valor guardado en lugar de pisarlo.
        out[f.key] = (v === '' || v == null) ? SECRET_MASK : v;
      } else {
        out[f.key] = collected[f.key];
      }
    });
    return out;
  }

  function debugLog() {
    if (!window.BuddyConfig ||
        (window.BuddyConfig.debug !== true && window.BuddyConfig.debugMode !== true)) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[Buddy Config]');
    console.log.apply(console, args);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
    return { app: { siteId: getSiteId() } };
  }

  // URL por defecto para crear/relacionar la config del sitio actual: el
  // origin del documento (p. ej. https://statetty.com), en minúsculas tal como
  // el backend normaliza las URLs.
  function currentSiteUrl() {
    var origin = null;
    try {
      origin = window.location.origin;
    } catch (_) { /* sin window.location (smoke) */ }
    origin = origin || (window.location && window.location.protocol ? window.location.protocol + '//' + window.location.host : '');
    return String(origin || '').trim().toLowerCase().replace(/\/+$/, '');
  }

  function configureApi() {
    var telemetry = getTelemetry();
    if (!telemetry || typeof telemetry.configureApi !== 'function') {
      throw new Error('Buddy Telemetry no está disponible.');
    }
    telemetry.configureApi(CONFIG.apiService || 'config', {
      baseUrl: CONFIG.apiBaseUrl,
      get: CONFIG.endpoints && CONFIG.endpoints.getConfig,
      post: CONFIG.endpoints && CONFIG.endpoints.saveConfig
    });
    return telemetry;
  }

  // request(endpoint, {method, data, context}) — GET transporta el contrato
  // Buddy por query string; POST por body JSON. DELETE por query con JWT.
  function request(endpoint, opts) {
    opts = opts || {};
    var method = opts.method || (CONFIG.endpoints && opts.endpointMethod) || 'GET';
    var token = getAccessToken();
    if (!token) return Promise.reject(new Error('No hay token de autenticación.'));

    var telemetry = configureApi();
    var path = CONFIG.endpoints && CONFIG.endpoints[endpoint];
    if (!path) return Promise.reject(new Error('Endpoint de configuración no configurado.'));

    var payload = {
      event: 'config.' + endpoint,
      module: CONFIG.apiService,
      data: opts.data || {},
      context: opts.context || getRequestContext()
    };

    var options = {
      method: method,
      cache: 'no-store',
      headers: { 'Authorization': 'Bearer ' + token }
    };

    if (method === 'GET' || method === 'DELETE') {
      var query = new URLSearchParams();
      query.set('event', payload.event);
      query.set('module', payload.module);
      query.set('data', JSON.stringify(payload.data));
      query.set('context', JSON.stringify(payload.context || {}));
      // El backend lee url/id/configId/module también como query params sueltos
      // (en GET y sobre todo en DELETE, donde getData() no parsea query).
      Object.keys(payload.data || {}).forEach(function (k) {
        var v = payload.data[k];
        if (v === undefined || v === null) return;
        query.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      });
      // Algunos endpoints usan path con :id o query directo; los oficiales van
      // por query string del contrato Buddy.
      path += (path.indexOf('?') === -1 ? '?' : '&') + query.toString();
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(payload);
    }

    return telemetry.request(CONFIG.apiService || 'config', path, options);
  }

  // --- API pública (voids vs. promesas) ------------------------------------

  // Endpoint público: catálogo de módulos disponibles (sin token).
  function fetchCatalog() {
    var telemetry = getTelemetry();
    if (telemetry && typeof telemetry.request === 'function') {
      // Registrar el servicio 'config' antes del request (igual que request()),
      // si no telemetry lanza "API no configurada" porque 'config' no está en apis.
      configureApi();
      return telemetry.request(CONFIG.apiService || 'config',
        (CONFIG.endpoints && CONFIG.endpoints.modulesMeta) || '/api/buddy/configs/modules/meta',
        { method: 'GET', cache: 'no-store' });
    }
    return fetch((CONFIG.apiBaseUrl || '') + (CONFIG.endpoints && CONFIG.endpoints.modulesMeta || '/api/buddy/configs/modules/meta'))
      .then(function (r) { return r.json(); });
  }

  function listConfigs() {
    return request('listConfigs', { data: {} }).then(function (r) {
      state.configs = (r && Array.isArray(r.configs)) ? r.configs : [];
      return state.configs.slice();
    });
  }

  function getConfig(url) {
    return request('getConfig', { data: { url: url } }).then(function (r) {
      state.currentConfig = r && r.config ? r.config : null;
      return state.currentConfig;
    });
  }

  function saveConfig(payload) {
    return request('saveConfig', { method: 'POST', data: payload }).then(function (r) {
      return r && r.config ? r.config : null;
    });
  }

  function deleteConfig(url) {
    return request('deleteConfig', { method: 'DELETE', data: { url: url } });
  }

  // Resuelve la config del SITIO ACTUAL (dominio/origin) automáticamente:
  //  - usa window.location.origin como URL objetivo;
  //  - si ya existe, la carga;
  //  - si no existe, la CREA de inmediato (activo:true + siteId del app) usando
  //    la plantilla que devuelve el backend para URLs nuevas (superusuario).
  function getCurrentSiteConfig() {
    var url = currentSiteUrl();
    if (!url) return Promise.reject(new Error('No se pudo determinar el dominio del sitio actual.'));

    return getConfig(url).then(function (cfg) {
      if (cfg && cfg._id) return cfg; // ya registrada
      // Nueva: crear desde la plantilla que devuelve get (template, _id:null).
      var siteId = getSiteId() || (cfg && cfg.siteId) || '';
      return saveConfig({
        url: url,
        siteId: siteId,
        activo: true,
        character: (cfg && cfg.character) || { defaultCharacter: 'alejito', fallbackCharacter: 'alejito' },
        google: (cfg && cfg.google) || { email: '', timezone: 'America/La_Paz', calendarId: '' },
        override: {}
      }).then(function (saved) {
        state.currentConfig = saved || cfg || { url: url, siteId: siteId, activo: true };
        return state.currentConfig;
      });
    });
  }

  function modulesList(configId) {
    return request('listModules', { data: { configId: configId } }).then(function (r) {
      return (r && Array.isArray(r.modules)) ? r.modules : [];
    });
  }

  function saveModule(payload) {
    return request('saveModule', { method: 'POST', data: payload });
  }

  function deleteModule(configId, module) {
    return request('deleteModule', { method: 'DELETE', data: { configId: configId, module: module } });
  }

  // --- Carga de schema.json de un módulo -----------------------------------

  // URL del schema.json de un módulo, SIEMPRE contra la base de assets remota
  // (statetty.com), aunque Buddy corra en otro dominio. Si el catálogo trae un
  // `schemaUrl` relativo (/assets/buddy/...), se antepone el host de ASSET_BASE;
  // si el módulo no está en el catálogo, se deriva por convención
  // `modules/<moduleId>/schema.json`. Antes se resolvía contra el origin de la
  // página (`window.location.origin`), lo que rompía el editor en dominios
  // ajenos, y se caía al schema del propio módulo `config` cuando el módulo
  // ausente del catálogo.
  function resolveSchemaUrl(moduleId) {
    var meta = (state.catalog || []).filter(function (m) { return m.id === moduleId; })[0];
    if (meta && meta.schemaUrl) return schemaUrlToAbsolute(meta.schemaUrl);
    try { return new URL('modules/' + moduleId + '/schema.json', ASSET_BASE).href; }
    catch (_) { return ASSET_BASE + 'modules/' + moduleId + '/schema.json'; }
  }

  function loadSchema(moduleId) {
    return fetch(resolveSchemaUrl(moduleId), { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('No se pudo cargar el schema de ' + moduleId);
      return r.json();
    });
  }

  // Convierte un schemaUrl (absoluto, o relativo a la raíz del host
  // /assets/buddy/...) a una URL absoluta contra el host de los assets de
  // Buddy, no contra el origin de la página embebedora.
  function schemaUrlToAbsolute(url) {
    if (/^https?:\/\//i.test(url)) return url;
    try { return new URL(url, new URL(ASSET_BASE).origin).href; }
    catch (_) {
      var clean = String(url);
      if (clean.charAt(0) === '/') clean = clean.slice(1);
      return ASSET_BASE + clean;
    }
  }

  // --- Carga dinámica del view (renderizador de formularios) ---------------

  var viewReady = null;
  function loadView() {
    if (window.BuddyConfigView) return Promise.resolve();
    if (viewReady) return viewReady;
    viewReady = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = MODULE_BASE + 'views/configView.js';
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('No se pudo cargar el renderizador de formularios.')); };
      document.head.appendChild(script);
    });
    return viewReady;
  }

  // --- UI: modal ------------------------------------------------------------

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '.buddy-config-toolbox{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;background:rgba(0,0,0,.45)}' +
      '.buddy-config-toolbox[hidden]{display:none}' +
      '.buddy-config-toolbox__panel{width:min(860px,100%);max-height:min(820px,calc(100vh - 40px));overflow:auto;background:#fff;color:#222;border-radius:14px;box-shadow:0 16px 60px rgba(0,0,0,.25);padding:24px;box-sizing:border-box;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
      '.buddy-config-toolbox__head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}' +
      '.buddy-config-toolbox__title{margin:0;font-size:1.35rem}' +
      '.buddy-config-toolbox__close{border:0;background:transparent;font-size:1.5rem;cursor:pointer;padding:4px 8px}' +
      '.buddy-config-toolbox__row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px}' +
      '.buddy-config-toolbox__input{flex:1 1 260px;min-width:0;padding:10px 12px;border:1px solid #cfcfcf;border-radius:8px;font:inherit;box-sizing:border-box}' +
      '.buddy-config-toolbox__button{padding:10px 16px;border:0;border-radius:8px;cursor:pointer;font:inherit}' +
      '.buddy-config-toolbox__button--primary{background:#222;color:#fff}' +
      '.buddy-config-toolbox__button--secondary{background:#eee;color:#222}' +
      '.buddy-config-toolbox__button--danger{background:#d9534f;color:#fff}' +
      '.buddy-config-toolbox__button:disabled{opacity:.55;cursor:wait}' +
      '.buddy-config-toolbox__message{min-height:1.4em;margin-top:10px;font-size:.92rem}' +
      '.buddy-config-toolbox__section{margin-top:20px;padding-top:16px;border-top:1px solid #eee}' +
      '.buddy-config-toolbox__section-title{font-weight:600;margin:0 0 12px}' +
      '.buddy-config-toolbox__module{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid #e7e7e7;border-radius:8px;margin-bottom:8px}' +
      '.buddy-config-toolbox__empty{text-align:center;color:#777;padding:16px 8px}' +
      '.buddy-config-toolbox .buddy-cfg-form{padding:4px 0}' +
      '.buddy-config-toolbox .buddy-cfg-desc{font-size:.9em;color:#555;margin:0 0 12px}' +
      '.buddy-config-toolbox .buddy-cfg-field{margin-bottom:12px}' +
      '.buddy-config-toolbox .buddy-cfg-field label{display:block;font-weight:600;margin-bottom:4px;font-size:.9rem}' +
      '.buddy-config-toolbox .buddy-cfg-field input[type="text"],.buddy-config-toolbox .buddy-cfg-field input[type="password"],.buddy-config-toolbox .buddy-cfg-field input[type="number"],.buddy-config-toolbox .buddy-cfg-field select,.buddy-config-toolbox .buddy-cfg-field textarea{width:100%;padding:8px 10px;border:1px solid #cfcfcf;border-radius:8px;font:inherit;box-sizing:border-box}' +
      '.buddy-config-toolbox .buddy-cfg-field input[type="checkbox"]{width:auto}' +
      '.buddy-config-toolbox .buddy-cfg-group{margin:0 0 12px;padding:10px;border:1px solid #e7e7e7;border-radius:8px}' +
      '.buddy-config-toolbox .buddy-cfg-group legend{font-weight:600;padding:0 6px}' +
      '.buddy-config-toolbox .buddy-cfg-array-item{margin-bottom:8px}' +
      '.buddy-config-toolbox .buddy-cfg-remove{border:0;background:transparent;color:#d9534f;font-size:1.1rem;cursor:pointer}' +
      '.buddy-config-toolbox .buddy-cfg-add{border:1px dashed #999;background:transparent;padding:6px 10px;border-radius:8px;cursor:pointer}' +
      '.buddy-config-toolbox .buddy-cfg-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:16px}' +
      '.buddy-config-toolbox .buddy-cfg-cancel{border:0;background:#eee;color:#222;padding:10px 16px;border-radius:8px;cursor:pointer}' +
      '@media(max-width:560px){.buddy-config-toolbox{padding:10px}.buddy-config-toolbox__panel{padding:18px}}';
    document.head.appendChild(style);
  }

  function createModal() {
    var existing = document.getElementById(MODAL_ID);
    if (existing) return existing;
    injectStyles();
    var modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'buddy-config-toolbox';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'buddy-config-title');
    modal.innerHTML =
      '<div class="buddy-config-toolbox__panel">' +
        '<div class="buddy-config-toolbox__head">' +
          '<h2 class="buddy-config-toolbox__title" id="buddy-config-title">' +
            escapeHtml(CONFIG.labels.title || 'Configuración de Buddy') +
          '</h2>' +
          '<button type="button" class="buddy-config-toolbox__close" data-config-close aria-label="Cerrar">×</button>' +
        '</div>' +
        '<div data-config-content></div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (event) {
      if (event.target === modal || event.target.closest('[data-config-close]')) {
        close();
      }
    });
    return modal;
  }

  function setMessage(text, isError) {
    var modal = document.getElementById(MODAL_ID);
    var el = modal && modal.querySelector('[data-config-message]');
    if (!el) return;
    el.textContent = text || '';
    el.style.color = isError ? '#d9534f' : '#2a7d2a';
  }

  // --- Render principal -----------------------------------------------------

  function renderPageConfigForm() {
    if (!state.currentConfig) {
      return '<div class="buddy-config-toolbox__empty">' +
        escapeHtml(CONFIG.labels.noConfigSelected || 'Seleccioná o creá una configuración de página.') +
        '</div>';
    }

    var c = state.currentConfig;
    var global = (c.global && typeof c.global === 'object') ? c.global : {};
    var app = (global.app && typeof global.app === 'object') ? global.app : {};
    var goog = c.google && typeof c.google === 'object' ? c.google : {};
    var char = c.character && typeof c.character === 'object' ? c.character : {};

    return '' +
      '<div class="buddy-config-toolbox__section">' +
        '<h3 class="buddy-config-toolbox__section-title">' + escapeHtml(CONFIG.labels.global || 'Configuración de página') + '</h3>' +
        '<div class="buddy-cfg-field" data-field-key="url"><label>URL</label>' +
          '<input type="text" value="' + escapeHtml(c.url || '') + '" data-cfg-url readonly required></div>' +
        '<div class="buddy-cfg-field" data-field-key="siteId"><label>SiteId</label>' +
          '<input type="text" value="' + escapeHtml(c.siteId || '') + '" data-cfg-site-id></div>' +
        '<div class="buddy-cfg-field"><label>Activo</label>' +
          '<input type="checkbox" data-cfg-activo' + (c.activo !== false ? ' checked' : '') + '></div>' +
      '</div>' +
      '<div class="buddy-config-toolbox__section">' +
        '<h3 class="buddy-config-toolbox__section-title">' + escapeHtml(CONFIG.labels.character || 'Personaje') + '</h3>' +
        '<div class="buddy-cfg-field"><label>Personaje por defecto</label>' +
          '<select data-cfg-char>' +
            '<option value="alejito"' + (char.defaultCharacter === 'alejito' ? ' selected' : '') + '>alejito</option>' +
            '<option value="raulito"' + (char.defaultCharacter === 'raulito' ? ' selected' : '') + '>raulito</option>' +
          '</select></div>' +
        '<div class="buddy-cfg-field"><label>Personaje de respaldo</label>' +
          '<select data-cfg-char-fallback>' +
            '<option value="alejito"' + (char.fallbackCharacter === 'alejito' ? ' selected' : '') + '>alejito</option>' +
            '<option value="raulito"' + (char.fallbackCharacter === 'raulito' ? ' selected' : '') + '>raulito</option>' +
          '</select></div>' +
      '</div>' +
      '<div class="buddy-config-toolbox__section">' +
        '<h3 class="buddy-config-toolbox__section-title">' + escapeHtml(CONFIG.labels.google || 'Cuenta de Google') + '</h3>' +
        '<div class="buddy-cfg-field"><label>Email</label>' +
          '<input type="text" value="' + escapeHtml(goog.email || '') + '" data-cfg-google-email></div>' +
        '<div class="buddy-cfg-field"><label>Timezone</label>' +
          '<input type="text" value="' + escapeHtml(goog.timezone || 'America/La_Paz') + '" data-cfg-google-tz></div>' +
        '<div class="buddy-cfg-field"><label>CalendarId</label>' +
          '<input type="text" value="' + escapeHtml(goog.calendarId || '') + '" data-cfg-google-cal></div>' +
        '<div class="buddy-cfg-field"><label>API Key (se conserva si se deja vacío)</label>' +
          '<input type="password" value="" data-cfg-google-key placeholder="••••••"></div>' +
        '<div class="buddy-cfg-field"><label>Password (se conserva si se deja vacío)</label>' +
          '<input type="password" value="" data-cfg-google-pass placeholder="••••••"></div>' +
        '<div class="buddy-cfg-actions">' +
          '<button type="button" class="buddy-config-toolbox__button buddy-config-toolbox__button--primary" data-cfg-save>' +
            escapeHtml(CONFIG.labels.save || 'Guardar') + '</button>' +
          (state.currentConfig._id
            ? '<button type="button" class="buddy-config-toolbox__button buddy-config-toolbox__button--danger" data-cfg-delete>' +
                escapeHtml(CONFIG.labels.delete || 'Eliminar') + '</button>'
            : '') +
        '</div>' +
      '</div>';
  }

  function renderModulesSection() {
    var html = '<div class="buddy-config-toolbox__section">' +
      '<h3 class="buddy-config-toolbox__section-title">' + escapeHtml(CONFIG.labels.modules || 'Módulos') + '</h3>' +
      '<div class="buddy-config-toolbox__row">' +
        '<select class="buddy-config-toolbox__input" data-module-add-select>' +
          '<option value="">' + escapeHtml(CONFIG.labels.addModule || 'Agregar módulo…') + '</option>';

    (state.catalog || []).forEach(function (m) {
      html += '<option value="' + escapeHtml(m.id) + '">' + escapeHtml(m.name || m.id) + '</option>';
    });

    html += '</select>' +
      '<button type="button" class="buddy-config-toolbox__button buddy-config-toolbox__button--secondary" data-module-add>' +
        escapeHtml(CONFIG.labels.addModule || 'Agregar módulo') + '</button>' +
      '</div>' +
      '<div data-modules-list></div>' +
      '</div>';
    return html;
  }

  function renderModules(items) {
    var host = document.querySelector('[' + 'data-config-content] [data-modules-list]');
    if (!host) return;

    var rows = (items || []).map(function (m) {
      var name = m.module;
      var meta = (state.catalog || []).filter(function (c) { return c.id === m.module; })[0];
      if (meta && meta.name) name = meta.name + ' (' + m.module + ')';
      return '<div class="buddy-config-toolbox__module">' +
        '<div>' +
          '<strong>' + escapeHtml(name) + '</strong>' +
          ' <span style="color:#888;font-size:.85em">' +
            (m.enabled !== false ? '✓ activo' : '✗ inactivo') +
          '</span>' +
        '</div>' +
        '<button type="button" class="buddy-config-toolbox__button buddy-config-toolbox__button--secondary" data-module-edit="' + escapeHtml(m.module) + '">' +
          escapeHtml(CONFIG.labels.editModule || 'Editar') + '</button>' +
      '</div>';
    });

    host.innerHTML = rows.length
      ? rows.join('')
      : '<div class="buddy-config-toolbox__empty">' +
          escapeHtml(CONFIG.labels.noModules || 'Todavía no hay módulos configurados para esta página.') +
        '</div>';
  }

  function render() {
    var modal = createModal();
    var content = modal.querySelector('[data-config-content]');
    if (!content) return;

    content.innerHTML =
      '<div data-config-message class="buddy-config-toolbox__message" aria-live="polite"></div>' +
      renderPageConfigForm() +
      (state.currentConfig && state.currentConfig._id
        ? renderModulesSection()
        : '') +
      '<div data-module-editor></div>';

    bindEvents(content);
  }

  function bindEvents(content) {
    var saveBtn = content.querySelector('[data-cfg-save]');
    if (saveBtn) saveBtn.addEventListener('click', function () { savePageConfig(); });

    var delBtn = content.querySelector('[data-cfg-delete]');
    if (delBtn) delBtn.addEventListener('click', function () { deletePageConfig(); });

    var addBtn = content.querySelector('[data-module-add]');
    if (addBtn) addBtn.addEventListener('click', function () {
      var sel = content.querySelector('[data-module-add-select]');
      var moduleId = sel ? sel.value : '';
      if (!moduleId || !state.currentConfig) return;
      openModuleEditor(moduleId, null);
    });

    // Delegación para editar módulos renderizados
    content.addEventListener('click', function (event) {
      var edit = event.target.closest('[data-module-edit]');
      if (edit) openModuleEditor(edit.getAttribute('data-module-edit'), null);
    });
  }

  function savePageConfig() {
    if (!state.currentConfig) return;
    var content = document.querySelector('[data-config-content]');
    var url = (content.querySelector('[data-cfg-url]') || {}).value || '';
    var payload = {
      url: url,
      siteId: (content.querySelector('[data-cfg-site-id]') || {}).value || state.currentConfig.siteId || '',
      activo: !!content.querySelector('[data-cfg-activo]').checked,
      character: {
        defaultCharacter: (content.querySelector('[data-cfg-char]') || {}).value || 'alejito',
        fallbackCharacter: (content.querySelector('[data-cfg-char-fallback]') || {}).value || 'alejito'
      },
      google: {
        email: (content.querySelector('[data-cfg-google-email]') || {}).value || '',
        timezone: (content.querySelector('[data-cfg-google-tz]') || {}).value || 'America/La_Paz',
        calendarId: (content.querySelector('[data-cfg-google-cal]') || {}).value || '',
        apiKey: (content.querySelector('[data-cfg-google-key]') || {}).value || '',
        password: (content.querySelector('[data-cfg-google-pass]') || {}).value || ''
      }
    };

    saveConfig(payload)
      .then(function (cfg) {
        setMessage(CONFIG.labels.saved || 'Configuración guardada correctamente.', false);
        return listConfigs().then(function () {
          state.currentConfig = cfg;
          render();
          return loadModules();
        });
      })
      .catch(function (e) {
        setMessage(e && e.data && e.data.error || e.message || 'No se pudo guardar.', true);
      });
  }

  function deletePageConfig() {
    if (!state.currentConfig || !confirm('¿Eliminar esta configuración y sus módulos?')) return;
    deleteConfig(state.currentConfig.url)
      .then(function () {
        state.currentConfig = null;
        return listConfigs();
      })
      .then(function () { render(); })
      .catch(function (e) { setMessage(e && e.data && e.data.error || e.message || 'No se pudo eliminar.', true); });
  }

  function loadModules() {
    if (!state.currentConfig || !state.currentConfig._id) return Promise.resolve([]);
    return modulesList(state.currentConfig._id)
      .then(function (items) {
        state.lastModules = items;
        renderModules(items);
        return items;
      })
      .catch(function (e) { setMessage(e && e.data && e.error || e.message || 'No se pudieron cargar los módulos.', true); return []; });
  }

  // --- Editor de módulo (formulario interpretando el schema) ----------------

  function openModuleEditor(moduleId, existingValue) {
    if (!state.currentConfig || !state.currentConfig._id) return;

    // Si el catálogo todavía no conoce el módulo (estado stale o carga a
    // medias), refrescarlo una vez para que names/select y schema estén al día.
    var catalogPromise = (state.catalog || []).some(function (m) { return m.id === moduleId; })
      ? Promise.resolve()
      : fetchCatalog().then(function (r) {
          state.catalog = (r && Array.isArray(r.modules)) ? r.modules : [];
        }).catch(function () { /* se resuelve igual por convención */ });

    catalogPromise
      .then(function () { return loadView(); })
      .then(function () {
        return loadSchema(moduleId);
      })
      .then(function (schema) {
        // Si existe un valor guardado, cargarlo. state no guarda el modulo
        // actual; lo obtenemos desde loadModules (items).
        var current = (state.lastModules || []).filter(function (m) { return m.module === moduleId; })[0];
        var values = (current && current.config) ? current.config : (existingValue || {});

        state.editingModule = { module: moduleId, schema: schema, values: values };

        var content = document.querySelector('[data-config-content]');
        var editor = content.querySelector('[data-module-editor]');
        if (!editor) return;

        var form = window.BuddyConfigView.renderForm(schema, values);
        var editorId = 'module-editor-' + Date.now();

        editor.innerHTML =
          '<div class="buddy-config-toolbox__section">' +
            '<h3 class="buddy-config-toolbox__section-title">' +
              escapeHtml(CONFIG.labels.editModule || 'Editar módulo') + ': ' + escapeHtml(schema.name || moduleId) +
            '</h3>' +
            '<div id="' + editorId + '"></div>' +
            '<div class="buddy-config-toolbox__row"><label><input type="checkbox" data-module-enabled' + (current ? (current.enabled !== false ? ' checked' : '') : ' checked') + '> ' +
              escapeHtml(CONFIG.labels.enabled || 'Habilitado') + '</label></div>' +
            '<div class="buddy-cfg-actions">' +
              '<button type="button" class="buddy-config-toolbox__button buddy-config-toolbox__button--primary" data-module-save>Guardar</button>' +
              '<button type="button" class="buddy-cfg-cancel" data-module-cancel>Cancelar</button>' +
            '</div>' +
          '</div>';

        document.getElementById(editorId).appendChild(form);
        editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        editor.querySelector('[data-module-save]').addEventListener('click', function () {
          var collected = window.BuddyConfigView.collect(schema, form);
          var clean = buildModulePayload(schema, collected);

          saveModule({
            configId: state.currentConfig._id,
            module: moduleId,
            enabled: !!editor.querySelector('[data-module-enabled]').checked,
            config: clean
          }).then(function () {
            editor.innerHTML = '';
            setMessage('Módulo guardado correctamente.', false);
            return loadModules();
          }).catch(function (e) {
            setMessage(e && e.data && e.data.error || e.message || 'No se pudo guardar el módulo.', true);
          });
        });

        editor.querySelector('[data-module-cancel]').addEventListener('click', function () {
          editor.innerHTML = '';
          state.editingModule = null;
        });
      })
      .catch(function (err) {
        setMessage('No se pudo abrir el editor del módulo: ' + (err.message || err), true);
      });
  }

  // --- Apertura / cierre ----------------------------------------------------

  function open() {
    if (!state.isSuperuser) {
      setMessage('', false);
      return Promise.reject(new Error(CONFIG.labels.noAccess || 'No tenés permisos para administrar la configuración.'));
    }

    return getCurrentSiteConfig().then(function () {
      render();
      return loadModules().then(function () {
        var modal = createModal();
        modal.hidden = false;
        state.open = true;
      });
    }).catch(function (e) {
      setMessage(e && e.data && e.data.error || e.message || 'No se pudo cargar la configuración del sitio.', true);
      render();
      var modal = createModal();
      modal.hidden = false;
      state.open = true;
    });
  }

  function close() {
    var modal = document.getElementById(MODAL_ID);
    if (modal) modal.hidden = true;
    state.open = false;
  }

  function refresh() {
    return listConfigs().then(function () { render(); return loadModules(); });
  }

  // --- Inicialización -------------------------------------------------------

  function isSuperuserFromAuth() {
    var user = null;
    if (window.Buddy.auth && typeof window.Buddy.auth.getUser === 'function') {
      user = window.Buddy.auth.getUser();
    }
    if (user && user.email) return String(user.email).toLowerCase() === SUPERUSER;
    // Fallback: en caso de no poder leer el user, confiamos en que alguien que
    // llegó aquí sabe la API; el backend autoriza igual. La UI se gating con el
    // email.
    var access = getAccessToken();
    return !!access; // el backend es la autoridad; la UI se abre si hay sesión
  }

  function initialize() {
    if (state.initialized) return;

    var authReady = false;
    function mark(detail) {
      detail = detail || {};
      if (!window.Buddy.auth) return;
      if (!detail.authenticated && !(window.Buddy.auth.isAuthenticated && window.Buddy.auth.isAuthenticated())) {
        state.isSuperuser = false;
        return;
      }
      state.isSuperuser = isSuperuserFromAuth();
      // Cargar el catálogo público de módulos (para el toolbox).
      fetchCatalog().then(function (r) {
        state.catalog = (r && Array.isArray(r.modules)) ? r.modules : [];
      }).catch(function () { state.catalog = []; });
    }

    window.addEventListener('buddy:auth-ready', function (event) {
      authReady = true;
      mark(event && event.detail);
    });
    window.addEventListener('buddy:auth-state-changed', function (event) {
      if (!authReady) return;
      mark(event && event.detail);
    });

    if (window.Buddy.auth &&
        typeof window.Buddy.auth.isAuthenticated === 'function' &&
        window.Buddy.auth.isAuthenticated()) {
      authReady = true;
      mark({ authenticated: true });
    }

    state.initialized = true;
  }

  window.Buddy.configToolbox = {
    config: CONFIG,
    open: open,
    close: close,
    refresh: refresh,
    listConfigs: listConfigs,
    getConfig: getConfig,
    saveConfig: saveConfig,
    modulesList: modulesList,
    saveModule: saveModule,
    isSuperuser: function () { return state.isSuperuser; },
    getCatalog: function () { return state.catalog.slice(); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})(window, document);
