/**
 * Buddy Auth — autenticación JWT (accessToken + refreshToken).
 * Sin cookies. Todo por Authorization: Bearer y body JSON.
 */
window.Buddy = window.Buddy || {};

(function (window, document) {
  'use strict';

  var CONFIG = window.BuddyAuthConfig || {};
  var REFRESH_KEY = 'buddy_refresh_token';
  var ACCESS_KEY = 'buddy_access_token';

  var state = {
    enabled: CONFIG.enabled !== false,
    initialized: false,
    checking: false,
    busy: false,
    authenticated: false,
    user: null,
    needsName: false,
    mode: 'idle',
    welcomePending: false,
    welcomeType: null,
    accessToken: null,
    refreshToken: null
  };

  function debugLog() {
    if (!window.BuddyConfig || (window.BuddyConfig.debug !== true && window.BuddyConfig.debugMode !== true)) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[Buddy Auth]');
    console.log.apply(console, args);
  }

  function emitEvent(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
    } catch (e) {}
  }

  function normalizeEmail(email) {
    return String(email == null ? '' : email).trim().toLowerCase();
  }

  function normalizeText(value) {
    return String(value == null ? '' : value).trim();
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
  }

  // --- Token persistence ---

  function storeRefreshToken(token) {
    try {
      if (token) localStorage.setItem(REFRESH_KEY, token);
      else localStorage.removeItem(REFRESH_KEY);
    } catch (e) {}
  }

  function getStoredRefreshToken() {
    try { return localStorage.getItem(REFRESH_KEY) || null; } catch (e) { return null; }
  }

  function storeAccessToken(token) {
    try {
      if (token) sessionStorage.setItem(ACCESS_KEY, token);
      else sessionStorage.removeItem(ACCESS_KEY);
    } catch (e) {}
  }

  function getStoredAccessToken() {
    try { return sessionStorage.getItem(ACCESS_KEY) || null; } catch (e) { return null; }
  }

  function saveTokens(accessToken, refreshToken) {
    state.accessToken = accessToken || null;
    state.refreshToken = refreshToken || null;
    storeAccessToken(accessToken);
    storeRefreshToken(refreshToken);
  }

  function clearTokens() {
    state.accessToken = null;
    state.refreshToken = null;
    storeAccessToken(null);
    storeRefreshToken(null);
  }

  function restoreTokens() {
    if (!state.accessToken) state.accessToken = getStoredAccessToken();
    if (!state.refreshToken) state.refreshToken = getStoredRefreshToken();
  }

  // --- API client ---

  function getAuthApi() {
    if (!window.Buddy.telemetry || typeof window.Buddy.telemetry.request !== 'function') {
      throw new Error('Buddy Telemetry no está disponible.');
    }
    return window.Buddy.telemetry;
  }

  function configureTelemetryApi() {
    var telemetry = getAuthApi();
    if (typeof telemetry.configureApi === 'function') {
      telemetry.configureApi(CONFIG.apiService || 'auth', {
        baseUrl: CONFIG.apiBaseUrl,
        session: CONFIG.endpoints.session,
        login: CONFIG.endpoints.login,
        verify: CONFIG.endpoints.verify,
        logout: CONFIG.endpoints.logout,
        refresh: CONFIG.endpoints.refresh
      });
    }
  }

  function buildHeaders(extra) {
    var headers = Object.assign({}, extra || {});
    if (state.accessToken) {
      headers['Authorization'] = 'Bearer ' + state.accessToken;
    }
    return headers;
  }

  function apiRequest(endpointKey, options) {
    options = options || {};
    var telemetry = getAuthApi();
    var endpoint = CONFIG.endpoints[endpointKey];
    if (!endpoint) return Promise.reject(new Error('Endpoint Auth no configurado: ' + endpointKey));

    var service = CONFIG.apiService || 'auth';
    var method = String(options.method || 'GET').toUpperCase();
    var requestOptions = {
      method: method,
      cache: 'no-store',
      headers: buildHeaders(options.headers)
    };

    if (options.body !== undefined) requestOptions.body = options.body;
    if (options.signal) requestOptions.signal = options.signal;

    debugLog('apiRequest:', endpointKey, method, endpoint);
    return telemetry.request(service, endpoint, requestOptions);
  }

  // --- Refresh flow ---

  function tryRefreshToken() {
    if (!state.refreshToken) return Promise.reject(new Error('No hay refreshToken.'));

    debugLog('tryRefreshToken: refrescando...');

    var body = JSON.stringify({ refreshToken: state.refreshToken });
    var telemetry = getAuthApi();
    var endpoint = CONFIG.endpoints.refresh;
    if (!endpoint) return Promise.reject(new Error('Endpoint refresh no configurado.'));

    return telemetry.request(CONFIG.apiService || 'auth', endpoint, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: body
    }).then(function (data) {
      if (!data || !data.ok) throw new Error('Refresh falló.');

      saveTokens(data.accessToken, data.refreshToken);
      if (data.user) updateLocalUser(data.user);
      debugLog('tryRefreshToken: OK');
      return data;
    }).catch(function (error) {
      debugLog('tryRefreshToken: fallo', error);
      clearTokens();
      setUnauthenticated();
      throw error;
    });
  }

  function apiRequestWithRefresh(endpointKey, options) {
    return apiRequest(endpointKey, options).then(function (response) {
      return response;
    }).catch(function (error) {
      // Si el error indica token expirado, intentar refresh una vez
      if (state.refreshToken && error && (error.status === 401 || (error.message && error.message.indexOf('token') !== -1))) {
        debugLog('apiRequestWithRefresh: token posiblemente expirado, intentando refresh...');
        return tryRefreshToken().then(function () {
          return apiRequest(endpointKey, options);
        });
      }
      throw error;
    });
  }

  // --- URL helpers ---

  function getRedirectUrl() {
    try {
      var url = new URL(window.location.href);
      url.searchParams.delete(CONFIG.verificationParameter);
      return url.toString();
    } catch (e) {
      return window.location.href;
    }
  }

  function getVerificationHash() {
    try {
      return new URL(window.location.href).searchParams.get(CONFIG.verificationParameter);
    } catch (e) {
      return null;
    }
  }

  function removeVerificationParameter() {
    try {
      var url = new URL(window.location.href);
      url.searchParams.delete(CONFIG.verificationParameter);
      window.history.replaceState({}, document.title, url.href);
    } catch (e) {}
  }

  // --- State management ---

  function clearLocalState() {
    state.authenticated = false;
    state.user = null;
    state.needsName = false;
    state.mode = 'idle';
    state.welcomePending = false;
    state.welcomeType = null;
    clearTokens();
    if (window.Buddy.telemetry && typeof window.Buddy.telemetry.clearUserId === 'function') {
      window.Buddy.telemetry.clearUserId();
    }
  }

  function updateLocalUser(user) {
    var normalized = normalizeUser({ user: user });
    if (!normalized) return null;
    state.user = normalized;
    return normalized;
  }

  /*
   * La foto de perfil puede llegar como ruta relativa (p. ej.
   * "buddy/avatar/<hash>.webp"). Se completa contra apiBaseUrl para que no se
   * resuelva contra el origen del sitio (404) y expuesta como photoUrl/fotoUrl
   * absoluta. URLs absolutas y data/blob URIs se conservan tal cual.
   */
  function resolveMediaUrl(url) {
    if (url == null || String(url).trim() === '') return null;
    var value = String(url).trim();
    if (/^(?:https?:|data:|blob:)/i.test(value)) return value;
    var base = String(CONFIG.apiBaseUrl || '').replace(/\/+$/, '');
    return base ? base + '/' + value.replace(/^\/+/, '') : value;
  }

  /*
   * Auth necesita una representación suficientemente rica del usuario para
   * eventos de sesión y bienvenida, pero no decide qué campos del perfil son
   * obligatorios. Esa responsabilidad pertenece al módulo User.
   *
   * Conservamos todos los campos devueltos por el servidor y normalizamos
   * únicamente los alias históricos necesarios para la identidad básica.
   */
  function normalizeUser(data) {
    if (!data || typeof data !== 'object') return null;
    var user = data.user;
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
    normalized.createdAt = user.createdAt || user.creadoEn || null;
    normalized.fotoUrl = resolveMediaUrl(fotoUrl);
    normalized.photoUrl = resolveMediaUrl(user.photoUrl || fotoUrl);
    return normalized;
  }

  function getResponseUser(data) {
    return normalizeUser(data) || normalizeUser({ user: data });
  }

  function setAuthenticated(user, authNeedsName, welcomeType) {
    state.authenticated = true;
    state.user = user || null;

    /*
     * needsName se conserva únicamente como metadato de compatibilidad con
     * respuestas antiguas del backend. Auth ya no abre ni procesa formularios
     * de perfil a partir de este valor.
     */
    state.needsName = authNeedsName === true;
    state.mode = 'idle';
    state.welcomePending = true;
    state.welcomeType = welcomeType || (state.needsName ? 'new' : 'existing');

    if (window.Buddy.telemetry && typeof window.Buddy.telemetry.setUserId === 'function') {
      var userId = state.user && (state.user.id || state.user._id || state.user.email);
      window.Buddy.telemetry.setUserId(userId || null);
    }

    emitEvent('buddy:auth-state-changed', {
      authenticated: state.authenticated,
      user: state.user,
      needsName: state.needsName,
      welcomeType: state.welcomeType
    });
  }

  function setUnauthenticated() {
    clearLocalState();
    emitEvent('buddy:auth-state-changed', {
      authenticated: false,
      user: null,
      needsName: false,
      welcomeType: null
    });
  }

  // --- Auth actions ---

  function checkSession() {
    if (!state.enabled || state.checking) return Promise.resolve(state.authenticated);
    state.checking = true;
    configureTelemetryApi();

    restoreTokens();

    // Si no hay tokens almacenados, no hay sesión
    if (!state.accessToken && !state.refreshToken) {
      state.checking = false;
      setUnauthenticated();
      emitEvent('buddy:auth-ready', {
        authenticated: false,
        user: null,
        needsName: false,
        welcomeType: null,
        sessionOk: false
      });
      return Promise.resolve(false);
    }

    // Si hay refreshToken pero no accessToken, intentar refresh primero
    if (!state.accessToken && state.refreshToken) {
      return tryRefreshToken().then(function () {
        return checkSessionAfterRefresh();
      }).catch(function () {
        state.checking = false;
        setUnauthenticated();
        emitEvent('buddy:auth-ready', {
          authenticated: false,
          user: null,
          needsName: false,
          welcomeType: null,
          sessionOk: false
        });
        return false;
      });
    }

    // Hay accessToken — verificar con el servidor
    return apiRequest('session', { method: 'GET' })
      .then(function (data) {
        if (data && data.code === 'TOKEN_EXPIRED' && state.refreshToken) {
          return tryRefreshToken().then(function () {
            return checkSessionAfterRefresh();
          });
        }
        applySessionResponse(data, data && data.newUser ? 'new' : 'existing');
        return Promise.resolve(state.authenticated);
      })
      .catch(function (error) {
        debugLog('No se pudo consultar la sesión.', error);
        if (state.refreshToken) {
          return tryRefreshToken().then(function () {
            return checkSessionAfterRefresh();
          });
        }
        setUnauthenticated();
        return false;
      })
      .then(function (result) {
        state.checking = false;
        emitEvent('buddy:auth-ready', {
          authenticated: state.authenticated,
          user: state.user,
          needsName: state.needsName,
          welcomeType: state.welcomeType,
          sessionOk: result
        });
        return result;
      });
  }

  function checkSessionAfterRefresh() {
    return apiRequest('session', { method: 'GET' })
      .then(function (data) {
        applySessionResponse(data, data && data.newUser ? 'new' : 'existing');
        return Promise.resolve(state.authenticated);
      })
      .catch(function () {
        setUnauthenticated();
        return false;
      });
  }

  function applySessionResponse(data, welcomeType) {
    var authenticated = !!(data && (data.authenticated === true || data.active === true));
    if (!authenticated) {
      setUnauthenticated();
      return false;
    }

    var user = normalizeUser(data);
    var authNeedsName = data.needsName === true;
    var isNewUser = data.newUser === true || data.isNewUser === true;
    setAuthenticated(user, authNeedsName, welcomeType || ((isNewUser || authNeedsName) ? 'new' : 'existing'));
    return true;
  }

  function requestLogin(email) {
    var normalized = normalizeEmail(email);
    debugLog('requestLogin: solicitud iniciada', { email: normalized });
    if (!isValidEmail(normalized)) {
      return Promise.reject(new Error('Dirección de correo inválida.'));
    }
    if (state.busy) return Promise.reject(new Error('Auth ocupado.'));

    state.busy = true;
    state.mode = 'waiting-email';
    var params = new URLSearchParams();
    params.set('email', normalized);
    params.set('appID', window.BuddyConfig &&
      window.BuddyConfig.app &&
      window.BuddyConfig.app.siteId
      ? window.BuddyConfig.app.siteId
      : '');
    params.set('redirectUrl', getRedirectUrl());
    debugLog('requestLogin: payload', Object.fromEntries(params.entries()));
    return apiRequest('login', {
      method: 'POST',
      body: params
    }).then(function (data) {
      debugLog('requestLogin: respuesta del servidor', data);
      emitEvent('buddy:auth-login-sent', { email: normalized });
      return data;
    }).finally(function () {
      state.busy = false;
    });
  }

  function verifyHash(hash) {
    var value = normalizeText(hash);
    if (!value || state.busy) return Promise.resolve(false);

    state.busy = true;
    state.mode = 'verifying';
    configureTelemetryApi();

    var endpoint = CONFIG.endpoints.verify;
    var separator = endpoint.indexOf('?') === -1 ? '?' : '&';
    var path = endpoint + separator + encodeURIComponent(CONFIG.verificationParameter) + '=' + encodeURIComponent(value);

    return getAuthApi().request(CONFIG.apiService || 'auth', path, {
      method: 'GET',
      cache: 'no-store'
    }).then(function (data) {
      if (!data || data.ok === false || data.authenticated === false) {
        throw new Error('El enlace de autenticación no pudo validarse.');
      }

      if (data.accessToken && data.refreshToken) {
        saveTokens(data.accessToken, data.refreshToken);
      }

      var user = normalizeUser(data);
      var authNeedsName = data.needsName === true;
      var isNewUser = data.newUser === true || data.isNewUser === true;
      setAuthenticated(user, authNeedsName, (isNewUser || authNeedsName) ? 'new' : 'existing');

      emitEvent('buddy:auth-verified', {
        authenticated: true,
        user: state.user,
        needsName: state.needsName
      });
      return true;
    }).catch(function (error) {
      debugLog('No se pudo verificar el enlace.', error);
      setUnauthenticated();
      emitEvent('buddy:auth-verify-failed', { error: error });
      return false;
    }).finally(function () {
      state.busy = false;
      removeVerificationParameter();
    });
  }

  function logout() {
    if (!state.authenticated || state.busy) return Promise.resolve(false);
    state.busy = true;
    state.mode = 'logging-out';

    // Informar al servidor para revocar refresh tokens
    var body = state.refreshToken ? JSON.stringify({ refreshToken: state.refreshToken }) : undefined;
    var endpoint = CONFIG.endpoints.logout;
    var telemetry = getAuthApi();

    var logoutPromise = telemetry.request(CONFIG.apiService || 'auth', endpoint, {
      method: 'POST',
      cache: 'no-store',
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        state.accessToken ? { 'Authorization': 'Bearer ' + state.accessToken } : {}
      ),
      body: body
    }).catch(function () {
      // Responder OK aunque el servidor falle — localmente siempre se limpia
    });

    return logoutPromise.then(function () {
      setUnauthenticated();
      emitEvent('buddy:auth-logout', { ok: true });
      window.location.reload();
      return true;
    }).finally(function () {
      state.busy = false;
    });
  }

  // --- UI prompts ---

  function startAuthenticationPrompt() {
    if (!state.enabled || state.authenticated || state.busy) return false;
    if (!window.Buddy.says || typeof window.Buddy.says.frmUsr !== 'function') {
      debugLog('No se puede mostrar el formulario de login: Buddy.says.frmUsr no está disponible.');
      return false;
    }

    state.mode = 'login-email';
    emitEvent('buddy:auth-mode-changed', { mode: state.mode });

    var config = {
      emocion: 'sereno',
      fields: {
        email: {
          value: '',
          readonly: false,
          required: true,
          label: 'Correo:',
          placeholder: CONFIG.emailPlaceholder || ''
        },
        name: { value: '', readonly: true, required: false, hidden: true, label: 'Nombre:' },
        whatsapp: { value: '', readonly: true, required: false, hidden: true, label: 'Teléfono:' }
      },
      submitText: 'enviar',
      cancelText: 'cancelar',
      onSubmit: function (data) {
        return requestLogin(data.email).then(function () {
          if (typeof window.buddy_says === 'function') {
            window.buddy_says(
              CONFIG.emailSentMessage || 'Revisa tu correo y haz clic en el enlace para iniciar sesión.',
              { emocion: 'sereno' }
            );
          }
          return true;
        });
      },
      onCancel: function () {
        state.mode = 'idle';
        emitEvent('buddy:auth-mode-changed', { mode: state.mode });
      }
    };

    setTimeout(function () {
      if (!state.authenticated && window.Buddy.says && typeof window.Buddy.says.frmUsr === 'function') {
        window.Buddy.says.frmUsr(config);
      }
    }, 220);

    return true;
  }

  function enterLoginMode() {
    state.mode = 'login-email';
    emitEvent('buddy:auth-mode-changed', { mode: state.mode });
  }

  function enterLogoutMode() {
    state.mode = 'logout-confirmation';
    emitEvent('buddy:auth-mode-changed', { mode: state.mode });
  }

  function cancelFlow() {
    state.mode = 'idle';
    emitEvent('buddy:auth-mode-changed', { mode: state.mode });
  }

  function consumeWelcome() {
    state.welcomePending = false;
    state.welcomeType = null;
  }

  function getState() {
    return {
      enabled: state.enabled,
      initialized: state.initialized,
      checking: state.checking,
      busy: state.busy,
      authenticated: state.authenticated,
      user: state.user,
      needsName: state.needsName,
      mode: state.mode,
      welcomePending: state.welcomePending,
      welcomeType: state.welcomeType
    };
  }

  function init() {
    if (state.initialized || !state.enabled) return;
    state.initialized = true;

    if (!window.Buddy.telemetry || typeof window.Buddy.telemetry.request !== 'function') {
      debugLog('Auth no puede inicializarse porque Telemetry no está disponible.');
      return;
    }

    configureTelemetryApi();

    var hash = getVerificationHash();
    if (hash) {
      verifyHash(hash);
    } else {
      checkSession();
    }
  }

  window.Buddy.auth = {
    enabled: state.enabled,
    config: CONFIG,
    isAuthenticated: function () { return state.authenticated; },
    getUser: function () { return state.user; },
    getState: getState,
    getAccessToken: function () { return state.accessToken || null; },
    getRefreshToken: function () { return state.refreshToken || null; },
    checkSession: checkSession,
    requestLogin: requestLogin,
    startAuthenticationPrompt: startAuthenticationPrompt,
    verifyHash: verifyHash,
    logout: logout,
    enterLoginMode: enterLoginMode,
    enterLogoutMode: enterLogoutMode,
    cancelFlow: cancelFlow,
    consumeWelcome: consumeWelcome,
    init: init
  };

  init();
})(window, document);
