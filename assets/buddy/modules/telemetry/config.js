/**
 * Buddy Telemetry — configuración central de comunicación con APIs.
 *
 * Todos los módulos que necesiten comunicarse con un servidor deben hacerlo
 * mediante la API pública de Buddy Telemetry. Los módulos no deben llamar
 * fetch() directamente contra sus propios endpoints.
 */
window.BuddyTelemetryConfig = window.BuddyTelemetryConfig || {};
window.BuddyTelemetryConfig = Object.assign({
  enabled: true,
  localization: { enabled: false },
  apiBaseUrls: { buddy: 'https://api.statetty.com'},
  apis: {
    telemetry: '/api/buddy/telemetry',
    auth: {
      baseUrl: 'https://api.statetty.com',
      session: '/api/buddy/auth/session',
      login: '/api/buddy/auth/login',
      verify: '/api/buddy/auth/verify',
      logout: '/api/buddy/auth/logout'
    },
    archeryGame: {
      baseUrl: 'https://api.statetty.com',
      top10: '/api/buddy/archeryGame/top10'
    }
  },
  apiUrl: 'https://api.statetty.com/api/buddy/telemetry'
}, window.BuddyTelemetryConfig || {});
