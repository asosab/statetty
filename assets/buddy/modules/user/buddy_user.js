/**
 * Buddy User — perfil universal de cuenta Buddy.
 *
 * No contiene datos específicos de arquería ni campos de autenticación.
 * La API concreta se configura en modules/user/config.js.
 */
window.Buddy = window.Buddy || {};

(function (window, document) {
  'use strict';

  var CONFIG = window.BuddyUserConfig || {};
  var state = { user: null, loading: false, saving: false, profilePrompted: false };

  function debugLog() {
    if (!window.BuddyConfig || (window.BuddyConfig.debug !== true && window.BuddyConfig.debugMode !== true)) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[Buddy User]');
    console.log.apply(console, args);
  }

  function telemetry() {
    if (!window.Buddy.telemetry || typeof window.Buddy.telemetry.request !== 'function') {
      throw new Error('Buddy Telemetry no está disponible.');
    }
    return window.Buddy.telemetry;
  }

  function token() {
    return window.Buddy.auth && typeof window.Buddy.auth.getAccessToken === 'function'
      ? window.Buddy.auth.getAccessToken()
      : null;
  }

  function configureApi() {
    telemetry().configureApi(CONFIG.apiService || 'user', {
      baseUrl: CONFIG.apiBaseUrl,
      current: CONFIG.endpoints && CONFIG.endpoints.current,
      update: CONFIG.endpoints && CONFIG.endpoints.update,
      uploadPhoto: CONFIG.endpoints && CONFIG.endpoints.uploadPhoto
    });
  }

  function request(path, options) {
    if (CONFIG.enabled === false) return Promise.reject(new Error('Servicio User deshabilitado.'));
    var accessToken = token();
    if (!accessToken) return Promise.reject(new Error('No hay token de autenticación.'));
    configureApi();
    options = options || {};
    options.headers = Object.assign({}, options.headers || {}, {
      Authorization: 'Bearer ' + accessToken
    });
    return telemetry().request(CONFIG.apiService || 'user', path, options);
  }

  /*
   * El servidor puede devolver fotoUrl como ruta relativa (p. ej.
   * "buddy/avatar/<hash>.webp"). Resolverla contra apiBaseUrl evita que el
   * navegador la interprete contra el origen del sitio (404) en vez de contra
   * api.statetty.com. Las URLs absolutas (http/https) y los data/blob URIs
   * se conservan tal cual.
   */
  function resolveMediaUrl(url) {
    if (url == null || String(url).trim() === '') return null;
    var value = String(url).trim();
    if (/^(?:https?:|data:|blob:)/i.test(value)) return value;
    var base = String(CONFIG.apiBaseUrl || '').replace(/\/+$/, '');
    return base ? base + '/' + value.replace(/^\/+/, '') : value;
  }

  function normalizeUser(data) {
    if (!data || typeof data !== 'object') return null;
    var user = data.user || data.data || data;
    if (!user || typeof user !== 'object') return null;

    var fotoUrl = user.fotoUrl != null && user.fotoUrl !== '' ? user.fotoUrl
      : (user.fotoPerfil && (user.fotoPerfil.url || user.fotoPerfil.archivo))
        ? (user.fotoPerfil.url || user.fotoPerfil.archivo) : null;

    var normalized = Object.assign({}, user);
    normalized.id = user.id != null ? user.id : (user._id != null ? user._id : null);
    normalized.email = user.email || null;
    normalized.name = user.name || user.nombre || user.firstName || user.nombrePila || null;
    normalized.firstName = user.firstName || user.nombre || user.name || null;
    normalized.lastName = user.lastName || user.apellido || user.apellidos || null;
    normalized.phone = user.phone || user.telefono || user.mobile || user.celular || user.whatsapp || null;
    normalized.locale = user.locale || user.idioma || null;
    normalized.fotoUrl = resolveMediaUrl(fotoUrl);
    return normalized;
  }

  function requiredProfileFields() {
    return Array.isArray(CONFIG.requiredProfileFields) && CONFIG.requiredProfileFields.length
      ? CONFIG.requiredProfileFields.slice()
      : ['name', 'phone'];
  }

  function missingProfileFields(user) {
    user = user || {};
    return requiredProfileFields().filter(function (field) {
      return user[field] == null || String(user[field]).trim() === '';
    });
  }

  function getCurrent() {
    if (state.loading) return Promise.resolve(state.user);
    state.loading = true;
    return request(CONFIG.endpoints.current, { method: 'GET' }).then(function (response) {
      state.user = normalizeUser(response);
      emitEvent('buddy:user-loaded', {
        user: state.user,
        missingFields: missingProfileFields(state.user)
      });
      return state.user;
    }).finally(function () {
      state.loading = false;
    });
  }

  function emitEvent(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
    } catch (e) {}
  }

  function requestProfileCompletion() {
    if (CONFIG.onboarding && CONFIG.onboarding.enabled === false) return false;
    if (!state.user || !missingProfileFields(state.user).length) return false;
    if (state.profilePrompted) return true;

    if (!window.Buddy.says || typeof window.Buddy.says.frmUsr !== 'function') {
      emitEvent('buddy:user-profile-incomplete', {
        user: state.user,
        missingFields: missingProfileFields(state.user)
      });
      debugLog('No se puede mostrar el formulario User todavía: Buddy.says.frmUsr no está disponible.');
      return false;
    }

    state.profilePrompted = true;
    var user = state.user;
    var onboarding = CONFIG.onboarding || {};

    window.Buddy.says.frmUsr({
      emocion: onboarding.emocion || 'sereno',
      fields: {
        email: {
          value: user.email || '',
          readonly: true,
          required: false,
          label: onboarding.emailLabel || 'Correo:'
        },
        name: {
          value: user.name || '',
          readonly: false,
          required: missingProfileFields(user).indexOf('name') !== -1,
          label: onboarding.nameLabel || 'Nombre:',
          placeholder: onboarding.namePlaceholder || ''
        },
        whatsapp: {
          value: user.phone || '',
          readonly: false,
          required: missingProfileFields(user).indexOf('phone') !== -1,
          label: onboarding.phoneLabel || 'Número celular que usa en WhatsApp',
          placeholder: onboarding.phonePlaceholder || ''
        }
      },
      submitText: onboarding.submitText || 'enviar',
      cancelText: onboarding.cancelText || 'cancelar',
      onSubmit: function (data) {
        var payload = {
          name: data.name,
          phone: data.whatsapp
        };

        return updateProfile(payload).then(function (response) {
          var returnedUser = normalizeUser(response);
          if (returnedUser) state.user = returnedUser;
          state.profilePrompted = false;
          emitEvent('buddy:user-updated', {
            user: state.user,
            source: 'onboarding'
          });
          emitEvent('buddy:user-profile-complete', {
            user: state.user,
            missingFields: missingProfileFields(state.user)
          });
          return true;
        }).catch(function (error) {
          state.profilePrompted = false;
          throw error;
        });
      },
      onCancel: function () {
        state.profilePrompted = false;
        emitEvent('buddy:user-profile-deferred', {
          user: state.user,
          missingFields: missingProfileFields(state.user)
        });
      }
    });

    emitEvent('buddy:user-profile-incomplete', {
      user: state.user,
      missingFields: missingProfileFields(state.user)
    });
    return true;
  }

  function updateProfile(data) {
    data = data || {};
    var params = new URLSearchParams();
    var normalizedData = Object.assign({}, data);
    if (normalizedData.phone == null && normalizedData.whatsapp != null) {
      normalizedData.phone = normalizedData.whatsapp;
    }
    ['name', 'firstName', 'lastName', 'email', 'phone', 'locale'].forEach(function (key) {
      if (normalizedData[key] !== undefined && normalizedData[key] !== null) {
        params.set(key, String(normalizedData[key]).trim());
      }
    });
    if (Array.isArray(normalizedData.condicionesFisicasPermanentes)) {
      params.set('condicionesFisicasPermanentes', JSON.stringify(normalizedData.condicionesFisicasPermanentes));
    }
    if (!params.toString()) return Promise.reject(new Error('No hay datos de usuario para actualizar.'));

    return request(CONFIG.endpoints.update, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    }).then(function (response) {
      state.user = normalizeUser(response) || Object.assign({}, state.user || {}, normalizedData);
      return response;
    });
  }

  function uploadPhoto(file) {
    if (!file) return Promise.reject(new Error('Selecciona una imagen.'));
    var form = new FormData();
    form.append('fotoPerfil', file);
    return request(CONFIG.endpoints.uploadPhoto, {
      method: 'POST',
      cache: 'no-store',
      body: form
    }).then(function (response) {
      var user = normalizeUser(response);
      if (user) state.user = user;
      return response;
    });
  }

  function initials(user) {
    user = user || {};
    var source = String(user.name || '').trim() || [user.firstName, user.lastName].filter(Boolean).join(' ');
    var parts = source.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
  }

  function photoUrl(user) {
    return resolveMediaUrl(user && user.fotoUrl != null && user.fotoUrl !== '' ? user.fotoUrl : null);
  }

  function avatar(user, className) {
    var el = document.createElement('div');
    el.className = className || 'buddy-user-avatar';
    var url = photoUrl(user);
    if (url) {
      var img = document.createElement('img');
      img.alt = String(user && (user.name || user.firstName || 'Usuario') || 'Usuario');
      img.src = url;
      img.addEventListener('error', function () {
        el.textContent = initials(user);
      });
      el.appendChild(img);
    } else {
      el.textContent = initials(user);
    }
    return el;
  }

  function injectStyles() {
    if (document.getElementById('buddy-user-styles')) return;
    var style = document.createElement('style');
    style.id = 'buddy-user-styles';
    style.textContent = '.buddy-user-form{font:inherit;display:grid;gap:14px;max-width:560px}.buddy-user-form label{display:grid;gap:6px}.buddy-user-form input,.buddy-user-form select{font:inherit;padding:9px;border:1px solid #ccc;border-radius:8px}.buddy-user-avatar{width:96px;height:96px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#eee;font-weight:700;font-size:28px}.buddy-user-avatar img{width:100%;height:100%;object-fit:cover}.buddy-user-photo{display:flex;gap:12px;align-items:center}.buddy-user-actions{display:flex;gap:8px;flex-wrap:wrap}.buddy-user-status{min-height:1.3em}';
    document.head.appendChild(style);
  }

  var MODULE_SCRIPT_URL = (function () {
    var currentScript = document.currentScript;
    if (currentScript && currentScript.src) return currentScript.src;
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (/(?:^|\/)buddy_user\.js(?:[?#]|$)/.test(scripts[i].src || '')) return scripts[i].src;
    }
    return null;
  })();

  function getViewLoader(viewId) {
    var views = window.BuddyUserViews || {};
    var id = String(viewId || 'profile').toLowerCase();
    return typeof views[id] === 'function' ? views[id] : null;
  }

  function loadView(viewId) {
    var id = String(viewId || 'profile').toLowerCase();
    var existing = getViewLoader(id);
    if (existing) return Promise.resolve(existing);
    if (!MODULE_SCRIPT_URL) return Promise.reject(new Error('No se pudo determinar la ubicación del módulo User.'));
    var url = new URL('views/' + id + '.js', MODULE_SCRIPT_URL).href;
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = url;
      script.async = false;
      script.onload = function () {
        var view = getViewLoader(id);
        if (!view) return reject(new Error('La vista User "' + id + '" no registró su implementación.'));
        resolve(view);
      };
      script.onerror = function () { reject(new Error('No se pudo cargar la vista User "' + id + '".')); };
      document.head.appendChild(script);
    });
  }

  function render(options) {
    options = options || {};
    return loadView(options.view || 'profile').then(function (view) {
      if (!options.target) throw new Error('User requiere un contenedor de destino.');
      return view({ target: options.target, user: state.user, state: state, config: CONFIG, api: window.Buddy.user });
    });
  }

  window.Buddy.user = {
    config: CONFIG,
    getCurrent: getCurrent,
    requestProfileCompletion: requestProfileCompletion,
    getMissingProfileFields: function () { return missingProfileFields(state.user); },
    update: updateProfile,
    updateProfile: updateProfile,
    uploadPhoto: uploadPhoto,
    avatar: avatar,
    render: render,
    renderProfile: function (container, options) { return render(Object.assign({}, options || {}, { target: container, view: 'profile' })); },
    renderAdmin: function (container, options) { return render(Object.assign({}, options || {}, { target: container, view: 'admin' })); },
    getState: function () { return { user: state.user, loading: state.loading, saving: state.saving, profilePrompted: state.profilePrompted, missingFields: missingProfileFields(state.user) }; }
  };

  function handleAuthenticatedState() {
    if (!window.Buddy.auth ||
        typeof window.Buddy.auth.isAuthenticated !== 'function' ||
        !window.Buddy.auth.isAuthenticated()) {
      state.user = null;
      state.profilePrompted = false;
      return;
    }

    getCurrent().then(function (user) {
      if (user && missingProfileFields(user).length) {
        requestProfileCompletion();
      }
    }).catch(function (error) {
      /*
       * Un 404 es esperado mientras el backend User todavía no tenga
       * controller/ruta. No convertimos esa ausencia en un error funcional
       * de Buddy; el módulo queda listo para reintentar cuando exista la API.
       */
      if (error && error.status === 404) {
        debugLog('API User todavía no disponible (HTTP 404).');
        return;
      }
      debugLog('No se pudo cargar el usuario actual.', error);
    });
  }

  window.addEventListener('buddy:auth-state-changed', handleAuthenticatedState);
  window.addEventListener('buddy:ready', handleAuthenticatedState);

  if (window.Buddy.auth &&
      typeof window.Buddy.auth.isAuthenticated === 'function' &&
      window.Buddy.auth.isAuthenticated()) {
    handleAuthenticatedState();
  }
})(window, document);
