/**
 * Buddy — configuración general de la aplicación.
 */
window.BuddyConfig = window.BuddyConfig || {};
window.BuddyConfig = Object.assign({
  debug: false,
  debugMode: false,
  app: {
    siteId: 'statetty',
    email: 'statetty@gmail.com'
  },
  // Módulos del fallback de seguridad (solo cuando el endpoint de runtime no
  // responde o el sitio aún no tiene config en BD). archerySchool/archeryGame
  // quedan FUERA a propósito: su implementación pesa ~1,7 MB y su media se
  // precarga al init; si la BD no está, la verdad de activación de la arquería
  // se desconoce y lo seguro es no cargarla (fail-safe = menos carga).
  // Con BD presente esta lista no se usa: manda el runtime (runtime.js filtra
  // enabled=false / activo=false).
  modules: [
    'telemetry',
    'wa_listener',
    'user',
    'auth',
    'admin',
    'dashboard',
    'config',
    'says',
    'hablar',
    'chat',
    'menu'
  ]
}, window.BuddyConfig || {});
