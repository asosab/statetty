/**
 * Buddy Dashboard — servicio y orquestador de datos.
 *
 * No utiliza fetch() directamente. Todas las peticiones cross-domain pasan
 * por Buddy Telemetry, igual que los demás módulos Buddy.
 *
 * API pública:
 *   Buddy.dashboard.get(options)
 *   Buddy.dashboard.refresh()
 *   Buddy.dashboard.render(options)
 *   Buddy.dashboard.setView(viewId, options)
 *   Buddy.dashboard.getState()
 */
window.Buddy = window.Buddy || {};

(function (window, document) {
  'use strict';

  var CONFIG = window.BuddyDashboardConfig || {};

  var state = {
    initialized: false,
    loading: false,
    error: null,
    data: null,
    period: null,
    view: CONFIG.view && CONFIG.view.defaultView || 'admin',
    target: null,
    requestId: 0,
    memoryCache: {}
  };

  function debugLog() {
    if (!window.BuddyConfig ||
        (window.BuddyConfig.debug !== true && window.BuddyConfig.debugMode !== true)) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[Buddy Dashboard]');
    console.log.apply(console, args);
  }

  function getSiteId() {
    var siteId = window.BuddyConfig &&
      window.BuddyConfig.app &&
      window.BuddyConfig.app.siteId;
    return siteId ? String(siteId).trim().toLowerCase() : null;
  }

  function getAccessToken() {
    if (window.Buddy.auth && typeof window.Buddy.auth.getAccessToken === 'function') {
      return window.Buddy.auth.getAccessToken();
    }
    return null;
  }

  function getTelemetry() {
    if (!window.Buddy.telemetry ||
        typeof window.Buddy.telemetry.request !== 'function') {
      throw new Error('Buddy Telemetry no está disponible.');
    }
    return window.Buddy.telemetry;
  }

  function configureApi() {
    var telemetry = getTelemetry();

    if (typeof telemetry.configureApi !== 'function') {
      throw new Error('Buddy Telemetry no permite configurar APIs.');
    }

    telemetry.configureApi(CONFIG.apiService || 'dashboard', {
      baseUrl: CONFIG.apiBaseUrl,
      get: CONFIG.endpoints && CONFIG.endpoints.get
    });

    return telemetry;
  }

  function pad(number) {
    return String(number).padStart(2, '0');
  }

  function formatDate(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function addDays(date, amount) {
    var result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    result.setDate(result.getDate() + amount);
    return result;
  }

  /**
   * Construye el período solicitado por el frontend.
   *
   * "Últimos 30 días" se representa como 30 días calendario incluyendo hoy.
   * El backend debe usar estas fechas para filtrar primero por siteId y período.
   */
  function buildPeriod(days) {
    days = Math.max(1, Number(days || (CONFIG.period && CONFIG.period.days) || 30));

    var today = new Date();
    var currentFrom = addDays(today, -(days - 1));
    var currentTo = today;

    var previousTo = addDays(currentFrom, -1);
    var previousFrom = addDays(previousTo, -(days - 1));

    return {
      current: {
        from: formatDate(currentFrom),
        to: formatDate(currentTo),
        days: days
      },
      previous: {
        from: formatDate(previousFrom),
        to: formatDate(previousTo),
        days: days
      }
    };
  }

  function getRequestContext(siteId) {
    return {
      app: {
        siteId: siteId
      }
    };
  }

  function buildRequestData(period, extra) {
    return Object.assign({
      siteId: getSiteId(),
      period: period
    }, extra || {});
  }

  function buildGetUrl(path, payload) {
    var query = new URLSearchParams();
    query.set('event', payload.event);
    query.set('module', payload.module);
    query.set('data', JSON.stringify(payload.data || {}));
    query.set('context', JSON.stringify(payload.context || {}));

    return path + (path.indexOf('?') === -1 ? '?' : '&') + query.toString();
  }


  function getCacheStorageKey(siteId, period, viewId) {
    var configured = CONFIG.cache && CONFIG.cache.storageKey || 'buddy.dashboard.daily.v1';
    var today = formatDate(new Date());
    var current = period && period.current || {};
    return [
      configured,
      siteId || 'unknown-site',
      today,
      current.from || '',
      current.to || '',
      current.days || '',
      String(viewId || state.view || 'admin').toLowerCase()
    ].join(':');
  }

  function readDailyCache(siteId, period, viewId) {
    if (!CONFIG.cache || CONFIG.cache.enabled === false) return null;

    var key = getCacheStorageKey(siteId, period, viewId);
    if (Object.prototype.hasOwnProperty.call(state.memoryCache, key)) {
      return state.memoryCache[key];
    }

    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return null;
      var entry = JSON.parse(raw);
      if (!entry || !entry.savedAt || !entry.data) return null;

      // La fecha forma parte de la clave. ttlDays queda además como guardia
      // contra entradas antiguas que hayan sobrevivido a un cambio de reloj.
      var ttlDays = Number(CONFIG.cache.ttlDays || 1);
      if ((Date.now() - Number(entry.savedAt)) > ttlDays * 86400000) {
        window.localStorage.removeItem(key);
        return null;
      }

      state.memoryCache[key] = entry.data;
      return entry.data;
    } catch (error) {
      debugLog('No se pudo leer el caché local del dashboard:', error);
      return null;
    }
  }

  function writeDailyCache(siteId, period, viewId, data) {
    if (!CONFIG.cache || CONFIG.cache.enabled === false || !data) return;

    var key = getCacheStorageKey(siteId, period, viewId);
    var entry = { savedAt: Date.now(), data: data };
    state.memoryCache[key] = data;

    try {
      window.localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      // localStorage puede estar bloqueado o lleno. La caché en memoria sigue
      // funcionando durante la vida de la página.
      debugLog('No se pudo persistir el caché local del dashboard:', error);
    }
  }

  function requestDashboard(options) {
    options = options || {};

    var siteId = getSiteId();
    if (!siteId) {
      return Promise.reject(new Error('Buddy Dashboard requiere un siteId autorizado.'));
    }

    var token = getAccessToken();
    if (!token) {
      return Promise.reject(new Error('No hay token de autenticación.'));
    }

    var period = options.period || buildPeriod(options.days);
    var data = buildRequestData(period, options.data);

    var payload = {
      event: CONFIG.request && CONFIG.request.event || 'dashboard.get',
      module: 'dashboard',
      data: data,
      context: getRequestContext(siteId)
    };

    var telemetry = configureApi();
    var endpoint = CONFIG.endpoints && CONFIG.endpoints.get;

    if (!endpoint) {
      return Promise.reject(new Error('Endpoint Dashboard no configurado.'));
    }

    var requestOptions = {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    };

    var url = buildGetUrl(endpoint, payload);

    debugLog('Solicitando dashboard:', {
      siteId: siteId,
      period: period,
      endpoint: endpoint
    });

    return telemetry.request(CONFIG.apiService || 'dashboard', url, requestOptions)
      .then(function (response) {
        if (!response || typeof response !== 'object') {
          throw new Error('La API Dashboard devolvió una respuesta inválida.');
        }

        if (response.ok === false || response.authenticated === false) {
          throw new Error(response.error || 'La API no autorizó el dashboard.');
        }

        return response;
      });
  }

  function emptyMetric() {
    return {
      value: 0,
      previous: 0,
      change: 0,
      projection: 0
    };
  }

  function normalizeMetric(metric) {
    if (metric == null) return emptyMetric();

    if (typeof metric === 'number') {
      return {
        value: metric,
        previous: 0,
        change: 0,
        projection: metric
      };
    }

    return Object.assign(emptyMetric(), metric);
  }

  function normalizeDimension(dimension) {
    if (!dimension || typeof dimension !== 'object') return {};
    var result = Object.assign({}, dimension);

    if (result.metrics && typeof result.metrics === 'object') {
      Object.keys(result.metrics).forEach(function (key) {
        result.metrics[key] = normalizeMetric(result.metrics[key]);
      });
    }

    return result;
  }

  /**
   * Normaliza solamente la forma necesaria para que la vista sea estable.
   * No calcula KPIs en el cliente ni reconstruye journeys a partir de eventos.
   */
  function normalizeResponse(response, period) {
    var source = response.dashboard && typeof response.dashboard === 'object'
      ? response.dashboard
      : response;

    var result = Object.assign({
      site: {
        siteId: getSiteId(),
        name: getSiteId()
      },
      period: period,
      audience: {},
      engagement: {},
      intent: {},
      journeys: {},
      funnel: {},
      activities: [],
      acquisition: {
        topReferrers: [],
        topIntentPages: [],
        pagePerformance: []
      },
      technology: {
        devices: [],
        browsers: [],
        operatingSystems: []
      }
    }, source);

    result.audience = result.audience || {};
    Object.keys(result.audience).forEach(function (key) {
      result.audience[key] = normalizeMetric(result.audience[key]);
    });

    result.engagement = result.engagement || {};
    Object.keys(result.engagement).forEach(function (key) {
      result.engagement[key] = normalizeMetric(result.engagement[key]);
    });

    result.intent = result.intent || {};
    if (result.intent.whatsapp) {
      Object.keys(result.intent.whatsapp).forEach(function (key) {
        if (key !== 'byPage' && key !== 'assistedByModule') {
          result.intent.whatsapp[key] = normalizeMetric(result.intent.whatsapp[key]);
        }
      });
    }

    result.funnel = result.funnel || {};
    Object.keys(result.funnel).forEach(function (key) {
      result.funnel[key] = normalizeMetric(result.funnel[key]);
    });

    return result;
  }

  function findTarget(options) {
    options = options || {};
    if (options.target) {
      if (typeof options.target === 'string') return document.querySelector(options.target);
      if (options.target.nodeType === 1) return options.target;
    }

    if (state.target && document.documentElement.contains(state.target)) {
      return state.target;
    }

    var selector = CONFIG.view && CONFIG.view.selector || '[data-buddy-dashboard]';
    var existing = document.querySelector(selector);
    if (existing) return existing;

    // Buddy sólo tiene un punto de anclaje: buddy.js. El dashboard crea su
    // propio nodo de montaje; la página anfitriona no necesita HTML adicional.
    if (CONFIG.mount && CONFIG.mount.enabled !== false) {
      var id = CONFIG.mount.id || 'buddy-dashboard-root';
      var created = document.getElementById(id);
      if (created) return created;

      if (!document.body) return null;

      created = document.createElement('div');
      created.id = id;
      created.className = CONFIG.mount.className || 'buddy-dashboard-root';
      created.setAttribute('data-buddy-dashboard', '');
      document.body.appendChild(created);
      return created;
    }

    return null;
  }

  function getViewLoader(viewId) {
    var id = String(viewId || 'admin').trim().toLowerCase();
    var loader = window.BuddyDashboardViews && window.BuddyDashboardViews[id];
    return typeof loader === 'function' ? loader : null;
  }

  /*
   * La vista pertenece al módulo Dashboard, por lo que su ubicación debe
   * resolverse respecto de este propio script y no respecto de la instalación
   * global de Buddy.
   *
   * Se captura durante la evaluación del módulo porque document.currentScript
   * deja de apuntar a buddy_dashboard.js cuando loadView() se ejecuta de forma
   * asíncrona.
   */
  var MODULE_SCRIPT_URL = (function () {
    var currentScript = document.currentScript;

    // buddy.js proporciona explícitamente la URL con la que cargó el módulo.
    // Preferimos ese valor porque conserva la identidad exacta del recurso
    // incluso cuando la ejecución del módulo ocurre mediante carga dinámica.
    if (currentScript) {
      if (currentScript.dataset && currentScript.dataset.buddyModuleScriptUrl) {
        return currentScript.dataset.buddyModuleScriptUrl;
      }
      if (currentScript.src) {
        return currentScript.src;
      }
    }

    // Fallback limitado al propio recurso Dashboard. Nunca se deriva la base
    // desde buddy.js ni desde una ruta absoluta de la instalación.
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var script = scripts[i];
      var src = script.src || '';
      if (script.dataset && script.dataset.buddyModuleId === 'dashboard' && src) {
        return src;
      }
      if (/(?:^|\/)buddy_dashboard\.js(?:[?#]|$)/.test(src)) {
        return src;
      }
    }

    return null;
  })();

  function loadView(viewId) {
    var id = String(viewId || 'admin').trim().toLowerCase();
    var existing = getViewLoader(id);
    if (existing) return Promise.resolve(existing);

    if (!MODULE_SCRIPT_URL) {
      return Promise.reject(new Error(
        'No se pudo determinar la ubicación del módulo Dashboard.'
      ));
    }

    var url;
    try {
      url = new URL('views/' + id + '.js', MODULE_SCRIPT_URL).href;
    } catch (error) {
      return Promise.reject(new Error(
        'No se pudo resolver la ubicación de la vista Dashboard "' + id + '".'
      ));
    }
    debugLog('Cargando vista:', { id: id, url: url, moduleScriptUrl: MODULE_SCRIPT_URL });

    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = url;
      script.async = false;
      script.onload = function () {
        debugLog('Vista cargada:', { id: id, url: url });
        var view = getViewLoader(id);
        if (!view) {
          reject(new Error('La vista Dashboard "' + id + '" no registró su implementación.'));
          return;
        }
        resolve(view);
      };
      script.onerror = function () {
        debugLog('Error cargando vista:', { id: id, url: url });
        reject(new Error('No se pudo cargar la vista Dashboard "' + id + '".'));
      };
      document.head.appendChild(script);
    });
  }

  function render(options) {
    options = options || {};

    return loadView(options.view || state.view).then(function (view) {
      var target = findTarget(options);

      if (!target) {
        throw new Error(
          'No se encontró el contenedor del Dashboard. ' +
          'Usa ' + (CONFIG.view && CONFIG.view.selector || '[data-buddy-dashboard]') + '.'
        );
      }

      state.target = target;
      state.view = String(options.view || state.view || 'admin').toLowerCase();

      return view({
        target: target,
        data: state.data,
        period: state.period,
        state: state,
        config: CONFIG,
        refresh: refresh,
        setView: setView
      });
    });
  }

  function get(options) {
    options = options || {};

    var requestId = ++state.requestId;
    state.loading = true;
    state.error = null;
    state.period = options.period || buildPeriod(options.days);
    state.view = String(options.view || state.view || 'admin').toLowerCase();

    var siteId = getSiteId();
    var cached = options.force !== true
      ? readDailyCache(siteId, state.period, state.view)
      : null;

    // Render inicial para que la vista pueda mostrar skeleton/loading.
    return render(options).catch(function (error) {
      debugLog('No se pudo renderizar el estado inicial:', error);
      return undefined;
    }).then(function () {
      if (cached) {
        if (requestId !== state.requestId) return state.data;
        state.data = cached;
        state.loading = false;
        state.error = null;
        debugLog('Dashboard servido desde caché local:', getCacheStorageKey(siteId, state.period, state.view));
        return render(options).then(function () { return state.data; });
      }

      return requestDashboard({
        period: state.period,
        data: options.data
      }).then(function (response) {
        if (requestId !== state.requestId) return state.data;

        state.data = normalizeResponse(response, state.period);
        state.loading = false;
        state.error = null;
        writeDailyCache(siteId, state.period, state.view, state.data);

        return render(options).then(function () {
          return state.data;
        });
      });
    }).catch(function (error) {
      if (requestId !== state.requestId) throw error;

      state.loading = false;
      state.error = error;
      render(options).catch(function (renderError) {
        debugLog('No se pudo renderizar el error del dashboard:', renderError);
      });

      throw error;
    });
  }

  function refresh() {
    return get({
      period: state.period,
      view: state.view,
      target: state.target,
      force: true
    });
  }

  function setView(viewId, options) {
    options = Object.assign({}, options || {}, {
      view: String(viewId || 'admin').toLowerCase(),
      target: options && options.target ? options.target : state.target
    });
    state.view = options.view;
    return render(options);
  }

  function getState() {
    return {
      initialized: state.initialized,
      loading: state.loading,
      error: state.error,
      data: state.data,
      period: state.period,
      view: state.view,
      target: state.target
    };
  }

  function initialize() {
    if (state.initialized) return;
    state.initialized = true;

    // Dashboard es una sección navegable del menú. No se abre ni consulta la
    // API durante la inicialización de Buddy: el menú decide cuándo abrirlo.
    // Esto evita una petición/renderizado invisible antes de que exista un
    // destino de interfaz.
  }

  var DASHBOARD_MODAL_ID = 'buddy-dashboard-toolbox';
  var DASHBOARD_STYLE_ID = 'buddy-dashboard-toolbox-style';

  function ensureDashboardModal() {
    var existing = document.getElementById(DASHBOARD_MODAL_ID);
    if (existing) {
      ensurePdfButton(existing);
      return {
        modal: existing,
        target: existing.querySelector('[data-buddy-dashboard]')
      };
    }

    if (!document.body) {
      throw new Error('No se puede abrir el Dashboard antes de que exista document.body.');
    }

    if (!document.getElementById(DASHBOARD_STYLE_ID)) {
      var style = document.createElement('style');
      style.id = DASHBOARD_STYLE_ID;
      style.textContent =
        '.buddy-dashboard-toolbox{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;background:rgba(0,0,0,.45)}' +
        '.buddy-dashboard-toolbox[hidden]{display:none}' +
        '.buddy-dashboard-toolbox__panel{width:min(1280px,100%);height:min(900px,calc(100vh - 40px));overflow:auto;background:#fff;color:#202124;border-radius:14px;box-shadow:0 16px 60px rgba(0,0,0,.25);box-sizing:border-box}' +
        '.buddy-dashboard-toolbox__head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:14px 20px;background:#fff;border-bottom:1px solid #e5e7eb}' +
        '.buddy-dashboard-toolbox__title{margin:0 auto 0 0;font:600 1.15rem system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
        '.buddy-dashboard-toolbox__pdf{border:1px solid #d0d4d9;background:#fff;border-radius:8px;padding:8px 12px;font:inherit;cursor:pointer;color:#202124}' +
        '.buddy-dashboard-toolbox__pdf:hover{background:#f6f7f8}' +
        '.buddy-dashboard-toolbox__close{border:0;background:transparent;font-size:1.5rem;line-height:1;cursor:pointer;padding:4px 8px;color:#444}' +
        '.buddy-dashboard-toolbox__body{min-height:100%;box-sizing:border-box}' +
        '@media(max-width:600px){.buddy-dashboard-toolbox{padding:8px}.buddy-dashboard-toolbox__panel{height:calc(100vh - 16px);border-radius:10px}}';
      document.head.appendChild(style);
    }

    var modal = document.createElement('div');
    modal.id = DASHBOARD_MODAL_ID;
    modal.className = 'buddy-dashboard-toolbox';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'buddy-dashboard-toolbox-title');

    modal.innerHTML =
      '<div class="buddy-dashboard-toolbox__panel">' +
        '<div class="buddy-dashboard-toolbox__head">' +
          '<h2 class="buddy-dashboard-toolbox__title" id="buddy-dashboard-toolbox-title">Dashboard</h2>' +
          '<button type="button" class="buddy-dashboard-toolbox__close" data-dashboard-close aria-label="Cerrar Dashboard">×</button>' +
        '</div>' +
        '<div class="buddy-dashboard-toolbox__body" data-buddy-dashboard></div>' +
      '</div>';

    document.body.appendChild(modal);

    var closeButton = modal.querySelector('[data-dashboard-close]');
    if (closeButton) {
      closeButton.addEventListener('click', close);
    }

    modal.addEventListener('click', function (event) {
      if (event.target === modal) close();
    });

    ensurePdfButton(modal);

    return {
      modal: modal,
      target: modal.querySelector('[data-buddy-dashboard]')
    };
  }

  function ensurePdfButton(dialog) {
    if (!dialog || dialog.querySelector('[data-dashboard-pdf]')) return;

    var header = dialog.querySelector('.buddy-dashboard-toolbox__head');
    if (!header) return;

    var closeButton = header.querySelector('[data-dashboard-close]');
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'buddy-dashboard-toolbox__pdf';
    button.setAttribute('data-dashboard-pdf', '');
    button.textContent = 'Mostrar como PDF';
    button.setAttribute('aria-label', 'Mostrar Dashboard como PDF');

    if (closeButton) {
      header.insertBefore(button, closeButton);
    } else {
      header.appendChild(button);
    }

    button.addEventListener('click', function () {
      var root = dialog.querySelector('[data-buddy-dashboard]');
      if (!root) return;

      var printWindow = window.open('', '_blank');
      if (!printWindow) {
        debugLog('No se pudo abrir la ventana para PDF. El navegador puede estar bloqueando ventanas emergentes.');
        return;
      }

      var styles = '';
      document.querySelectorAll('link[rel="stylesheet"], style').forEach(function (node) {
        styles += node.outerHTML;
      });

      printWindow.document.open();
      printWindow.document.write(
        '<!doctype html><html><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1">' +
        '<title>Buddy Dashboard</title>' + styles +
        '<style>' +
        '@page{size:A4;margin:12mm}' +
        'html,body{margin:0!important;padding:0!important;background:#fff!important}' +
        'body{width:auto!important;overflow:visible!important}' +
        '.buddy-dashboard-toolbox,.buddy-dashboard-toolbox__panel,.buddy-dashboard-toolbox__body{' +
          'position:static!important;width:auto!important;height:auto!important;max-height:none!important;' +
          'min-height:0!important;overflow:visible!important;display:block!important;' +
          'background:#fff!important;box-shadow:none!important;border-radius:0!important;padding:0!important;margin:0!important' +
        '}' +
        '.buddy-dashboard{max-width:none!important;width:100%!important;overflow:visible!important}' +
        '.buddy-dashboard__pdf,.buddy-dashboard-toolbox__pdf,.buddy-dashboard-toolbox__close,.buddy-dashboard__actions{display:none!important}' +
        '.buddy-dashboard table{page-break-inside:auto}' +
        '.buddy-dashboard tr,.buddy-dashboard-card,.buddy-dashboard-panel,.buddy-dashboard-section{break-inside:avoid;page-break-inside:avoid}' +
        '.buddy-dashboard-section{break-before:auto;page-break-before:auto}' +
        '</style></head><body>' +
        root.innerHTML +
        '</body></html>'
      );
      printWindow.document.close();

      setTimeout(function () {
        printWindow.focus();
        printWindow.print();
      }, 700);
    });
  }


  function open(options) {
    options = options || {};

    if (!window.Buddy.admin ||
        typeof window.Buddy.admin.isAdmin !== 'function' ||
        !window.Buddy.admin.isAdmin()) {
      return Promise.reject(new Error('El Dashboard requiere permisos de administrador.'));
    }

    var ui;
    try {
      ui = ensureDashboardModal();
    } catch (error) {
      return Promise.reject(error);
    }

    ui.modal.hidden = false;

    var requestOptions = Object.assign({}, options, {
      view: options.view || 'admin',
      target: ui.target,
      force: options.force === true
    });

    debugLog('Abriendo Dashboard desde el menú:', {
      target: ui.target,
      view: requestOptions.view
    });

    return get(requestOptions).catch(function (error) {
      // get() ya intenta renderizar el error en el target. Propagamos el
      // rechazo para que el menú pueda registrar el fallo.
      throw error;
    });
  }

  function close() {
    var modal = document.getElementById(DASHBOARD_MODAL_ID);
    if (modal) modal.hidden = true;
  }


  window.Buddy.dashboard = {
    config: CONFIG,
    get: get,
    open: open,
    close: close,
    refresh: refresh,
    render: render,
    setView: setView,
    getState: getState,
    buildPeriod: buildPeriod,
    clearCache: function () {
      var prefix = (CONFIG.cache && CONFIG.cache.storageKey || 'buddy.dashboard.daily.v1') + ':';
      try {
        for (var i = window.localStorage.length - 1; i >= 0; i--) {
          var key = window.localStorage.key(i);
          if (key && key.indexOf(prefix) === 0) window.localStorage.removeItem(key);
        }
      } catch (error) {
        debugLog('No se pudo limpiar el caché local:', error);
      }
      state.memoryCache = {};
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})(window, document);
