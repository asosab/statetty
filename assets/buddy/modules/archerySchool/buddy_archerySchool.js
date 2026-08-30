/**
 * Buddy ArcherySchool — perfil, atributos y equipamiento de usuarios registrados.
 *
 * El módulo es transversal y opcional. No crea identidad ni autenticación.
 * El perfil de arquería se vincula a BuddyUser mediante buddyUserId.
 */
window.Buddy = window.Buddy || {};
(function (window, document) {
  'use strict';

  var CONFIG = window.BuddyArcherySchoolConfig || {};
  var state = {
    profile: null,
    users: [],
    attributes: [],
    equipment: [],
    equipmentRelations: []
  };

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }
  function siteId() {
    return CONFIG.siteId || (window.BuddyConfig && window.BuddyConfig.app && window.BuddyConfig.app.siteId) || null;
  }
  function assertSite() {
    if (!siteId()) throw new Error('ArcherySchool requiere BuddyConfig.app.siteId.');
  }
  function appName() {
    var id = siteId() || 'ArcherySchool';
    return '🏹 ' + id;
  }
  function getStateSnapshot() {
    return {
      profile: clone(state.profile),
      users: clone(state.users),
      attributes: clone(state.attributes),
      equipment: clone(state.equipment),
      equipmentRelations: clone(state.equipmentRelations)
    };
  }
  // El estado del módulo es un singleton por pestaña; SIEMPRE se descarta al
  // cambiar la sesión para no exponer datos de un usuario en el siguiente.
  function resetState() {
    state.profile = null;
    state.users = [];
    state.attributes = [];
    state.equipment = [];
    state.equipmentRelations = [];
  }
  function telemetry() {
    if (!window.Buddy.telemetry || typeof window.Buddy.telemetry.request !== 'function') {
      throw new Error('Buddy Telemetry no está disponible.');
    }
    return window.Buddy.telemetry;
  }
  function token() {
    return window.Buddy.auth && typeof window.Buddy.auth.getAccessToken === 'function'
      ? window.Buddy.auth.getAccessToken() : null;
  }
  function configureApi() {
    telemetry().configureApi(CONFIG.apiService || 'archerySchool', { baseUrl: CONFIG.apiBaseUrl });
  }
  function request(path, method, body) {
    var accessToken = token();
    if (!accessToken) return Promise.reject(new Error('No hay token de autenticación.'));
    configureApi();
    var headers = { Authorization: 'Bearer ' + accessToken };
    if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    return telemetry().request(CONFIG.apiService || 'archerySchool', path, {
      method: method || 'GET', headers: headers, body: body
    });
  }
  function withSite(data) {
    var result = Object.assign({}, data || {});
    if (!result.sitio) result.sitio = siteId();
    if (!result.siteId) result.siteId = siteId();
    return result;
  }
  function currentPersonaId() {
    return state.profile && (state.profile._id || state.profile.id);
  }

  function getUsers() {
    assertSite();
    // El sitio es intrínseco a la petición: se transporta en `context.app.siteId`
    // del envelope (mismo patrón que admin), NO como `?siteId=` en la query.
    var accessToken = token();
    if (!accessToken) return Promise.reject(new Error('No hay token de autenticación.'));
    configureApi();
    var query = new URLSearchParams();
    query.set('event', 'archerySchool.getUsers');
    query.set('module', CONFIG.apiService || 'archerySchool');
    query.set('data', JSON.stringify({}));
    query.set('context', JSON.stringify({ app: { siteId: siteId() } }));
    var path = CONFIG.endpoints.users + (CONFIG.endpoints.users.indexOf('?') === -1 ? '?' : '&') + query.toString();
    return telemetry().request(CONFIG.apiService || 'archerySchool', path, {
      method: 'GET', cache: 'no-store',
      headers: { 'Authorization': 'Bearer ' + accessToken }
    }).then(function (r) {
      return Array.isArray(r) ? r : (r && (r.users || r.data)) || [];
    });
  }

  function getProfile() {
    assertSite();
    return request(CONFIG.endpoints.profile + '?siteId=' + encodeURIComponent(siteId()), 'GET')
      .then(function (r) {
        state.profile = r && (r.profile || r.data || r);
        return state.profile;
      });
  }
  function createProfile(data) {
    assertSite();
    return request(CONFIG.endpoints.profile, 'POST', withSite(data)).then(function (r) {
      state.profile = r && (r.profile || r.data || r);
      return r;
    });
  }
  function updateProfile(data) {
    assertSite();
    return request(CONFIG.endpoints.profile, 'PUT', withSite(data)).then(function (r) {
      state.profile = r && (r.profile || r.data || r);
      return r;
    });
  }
  // Admin: garantiza un perfil de arquería para un usuario objetivo (BuddyUser).
  // Si no existe, lo crea con nombreCompleto/siteId; devuelve el perfil (con _id).
  function createProfileForUser(data) {
    assertSite();
    var payload = {
      buddyUserId: data.buddyUserId,
      nombreCompleto: data.nombreCompleto || data.name || '',
      siteId: data.siteId || siteId()
    };
    return request(CONFIG.endpoints.profile, 'POST', payload).then(function (r) {
      var profile = r && (r.profile || r.data || r);
      if (profile) state.profile = profile;
      return profile || r;
    });
  }

  function getAttributes(options) {
    assertSite();
    options = options || {};
    var query = '?siteId=' + encodeURIComponent(siteId());
    if (options.personaId) query += '&personaId=' + encodeURIComponent(options.personaId);
    if (options.scope) query += '&scope=' + encodeURIComponent(options.scope);
    return request(CONFIG.endpoints.attributes + query, 'GET')
      .then(function (r) {
        var list = Array.isArray(r) ? r : (r && (r.attributes || r.data)) || [];
        if (!options.personaId && (!options.scope || options.scope !== 'site')) state.attributes = list;
        return list;
      });
  }
  function setAttribute(data) {
    assertSite();
    var payload = withSite(data);
    if (!payload.personaId) payload.personaId = currentPersonaId();
    if (!payload.personaId) return Promise.reject(new Error('No existe un perfil de arquería para asociar el atributo.'));
    return request(CONFIG.endpoints.attributes, 'POST', payload);
  }
  function getAttributeHistory(type) {
    assertSite();
    var query = '?siteId=' + encodeURIComponent(siteId()) + '&tipo=' + encodeURIComponent(type);
    return request(CONFIG.endpoints.attributeHistory + query, 'GET');
  }

  function getEquipment(options) {
    assertSite();
    options = options || {};
    var query = '?siteId=' + encodeURIComponent(siteId());
    if (options.personaId) query += '&personaId=' + encodeURIComponent(options.personaId);
    if (options.empresa) query += '&empresa=' + encodeURIComponent(options.empresa);
    if (options.scope) query += '&scope=' + encodeURIComponent(options.scope);
    return request(CONFIG.endpoints.equipment + query, 'GET').then(function (r) {
      state.equipment = Array.isArray(r) ? r : (r && (r.equipment || r.data)) || [];
      return state.equipment;
    });
  }
  function createEquipment(data) {
    assertSite();
    return request(CONFIG.endpoints.equipment, 'POST', withSite(data));
  }
  function updateEquipment(data) {
    assertSite();
    return request(CONFIG.endpoints.equipment, 'PUT', withSite(data));
  }

  function getEquipmentRelations(equipoId, options) {
    assertSite();
    options = options || {};
    var query = '?siteId=' + encodeURIComponent(siteId());
    if (equipoId) query += '&equipoId=' + encodeURIComponent(equipoId);
    if (options.personaId) query += '&personaId=' + encodeURIComponent(options.personaId);
    if (options.empresa) query += '&empresa=' + encodeURIComponent(options.empresa);
    if (options.scope) query += '&scope=' + encodeURIComponent(options.scope);
    return request(CONFIG.endpoints.equipmentRelations + query, 'GET').then(function (r) {
      return Array.isArray(r) ? r : (r && (r.relations || r.data)) || [];
    });
  }
  function createEquipmentRelation(data) {
    assertSite();
    var payload = withSite(data);
    if (!payload.equipoId) return Promise.reject(new Error('Selecciona un equipo.'));
    if (payload.parteTipo === 'persona' && !payload.personaId) payload.personaId = currentPersonaId();
    return request(CONFIG.endpoints.equipmentRelations, 'POST', payload);
  }
  function closeEquipmentRelation(id, vigenteHasta) {
    assertSite();
    var date = vigenteHasta || new Date().toISOString();
    return request(CONFIG.endpoints.equipmentRelations + '/' + encodeURIComponent(id), 'PUT', withSite({ vigenteHasta: date }));
  }

  var MODULE_SCRIPT_URL = (function () {
    var currentScript = document.currentScript;
    if (currentScript && currentScript.src) return currentScript.src;
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (/(?:^|\/)buddy_archerySchool\.js(?:[?#]|$)/.test(scripts[i].src || '')) return scripts[i].src;
    }
    return null;
  })();

  function getViewLoader(viewId) {
    var views = window.BuddyArcherySchoolViews || {};
    var id = String(viewId || 'student').toLowerCase();
    return typeof views[id] === 'function' ? views[id] : null;
  }
  function loadView(viewId) {
    var id = String(viewId || 'student').toLowerCase();
    var existing = getViewLoader(id);
    if (existing) return Promise.resolve(existing);
    if (!MODULE_SCRIPT_URL) return Promise.reject(new Error('No se pudo determinar la ubicación del módulo ArcherySchool.'));
    var url = new URL('views/' + id + '.js', MODULE_SCRIPT_URL).href;
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = url;
      script.async = false;
      script.onload = function () {
        var view = getViewLoader(id);
        if (!view) return reject(new Error('La vista ArcherySchool "' + id + '" no registró su implementación.'));
        resolve(view);
      };
      script.onerror = function () { reject(new Error('No se pudo cargar la vista ArcherySchool "' + id + '".')); };
      document.head.appendChild(script);
    });
  }
  function render(options) {
    options = options || {};
    return loadView(options.view || 'student').then(function (view) {
      if (!options.target) throw new Error('ArcherySchool requiere un contenedor de destino.');
      return view({
        target: options.target,
        state: state,
        config: Object.assign({}, CONFIG, { appName: appName() }),
        api: window.Buddy.archerySchool,
        context: options.context || {},
        role: options.role || 'student'
      });
    });
  }

  window.Buddy.archerySchool = {
    config: CONFIG,
    appName: appName,
    getUsers: getUsers,
    getProfile: getProfile, createProfile: createProfile, updateProfile: updateProfile,
    createProfileForUser: createProfileForUser,
    getAttributes: getAttributes, setAttribute: setAttribute, getAttributeHistory: getAttributeHistory,
    getEquipment: getEquipment, createEquipment: createEquipment, updateEquipment: updateEquipment,
    getEquipmentRelations: getEquipmentRelations, createEquipmentRelation: createEquipmentRelation,
    closeEquipmentRelation: closeEquipmentRelation,
    render: render,
    renderProfile: function (container, options) { return render(Object.assign({}, options || {}, { target: container, view: 'student' })); },
    renderStudent: function (container, options) { return render(Object.assign({}, options || {}, { target: container, view: 'student' })); },
    renderAdmin: function (container, options) { return render(Object.assign({}, options || {}, { target: container, view: 'admin' })); },
    getState: function () { return getStateSnapshot(); }
  };

  window.addEventListener('buddy:auth-state-changed', resetState);
  window.addEventListener('buddy:auth-logout', resetState);
  window.addEventListener('buddy:auth-ready', resetState);
})(window, document);
