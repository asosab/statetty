/**
 * Buddy — configuración general de la aplicación.
 */
window.BuddyConfig = window.BuddyConfig || {};
window.BuddyConfig = Object.assign({
  debug: true,
  debugMode: false,
  app: {
    siteId: 'statetty',
    email: 'statetty@gmail.com'
  },
  modules: [
    'telemetry',
    'wa_listener',
    'user',
    'auth',
    'admin',
    'dashboard',
    'says',
    'chat',
    'archeryGame'
  ]
}, window.BuddyConfig || {});
