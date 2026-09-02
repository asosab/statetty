/**
 * Buddy Auth — configuración del módulo cliente.
 *
 * Autenticación basada en JWT (accessToken + refreshToken).
 * Sin cookies.
 */
window.BuddyAuthConfig = window.BuddyAuthConfig || {};
window.BuddyAuthConfig = Object.assign({
  enabled: true,
  localization: { enabled: true },
  apiBaseUrl: 'https://api.statetty.com',
  apiService: 'auth',
  endpoints: {
    session: '/api/buddy/auth/session',
    login: '/api/buddy/auth/login',
    verify: '/api/buddy/auth/verify',
    logout: '/api/buddy/auth/logout',
    refresh: '/api/buddy/auth/refresh'
  },
  verificationParameter: 'auth',

  userFields: ['id', 'email', 'name', 'firstName', 'lastName', 'phone', 'locale', 'createdAt'],

  loginButtonText: 'Iniciar sesión',
  logoutButtonText: 'Cerrar sesión',

  emailPlaceholder: 'Escribe tu dirección de correo',
  namePlaceholder: 'Escribe tu nombre',
  logoutPlaceholder: 'Escribe Sí para cerrar tu sesión',

  loginMessage: 'Escribe tu correo y te enviaremos un enlace de acceso a esa dirección.',
  emailSentMessage: 'Revisa tu correo y haz clic en el enlace para iniciar sesión.',
  existingWelcomeTemplate: '¡Hola {name}!',
  newUserWelcomeMessage: '¡Bienvenido! Para continuar, necesitamos algunos datos.',
  nameSavedTemplate: '¡Mucho gusto, {name}!' ,
  logoutQuestion: '¿Deseas cerrar tu sesión en este navegador?',
  logoutYesText: 'Sí',
  logoutNoText: 'No',

  requestTimeoutMs: 15000
}, window.BuddyAuthConfig || {});
