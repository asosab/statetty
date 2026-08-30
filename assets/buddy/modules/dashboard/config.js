/**
 * Buddy Dashboard — configuración del módulo cliente.
 *
 * El dashboard consume una API cross-domain mediante Buddy Telemetry.
 * El frontend define aquí el contrato que posteriormente implementará el backend.
 */
window.BuddyDashboardConfig = window.BuddyDashboardConfig || {};
window.BuddyDashboardConfig = Object.assign({
  enabled: true,
  localization: { enabled: false },

  apiBaseUrl: 'https://api.statetty.com',
  apiService: 'dashboard',

  endpoints: {
    get: '/api/buddy/dashboard'
  },

  request: {
    method: 'GET',
    event: 'dashboard.get',
    timeoutMs: 15000
  },

  period: {
    days: 30
  },

  mount: {
    enabled: true,
    id: 'buddy-dashboard-root',
    className: 'buddy-dashboard-root'
  },

  view: {
    defaultView: 'admin',
    selector: '[data-buddy-dashboard]'
  },

  cache: {
    enabled: true,
    storageKey: 'buddy.dashboard.daily.v1',
    ttlDays: 1
  },

  labels: {
    loading: 'Cargando dashboard…',
    empty: 'Todavía no hay suficiente actividad para mostrar este período.',
    error: 'No pudimos actualizar las métricas.',
    retry: 'Intentar nuevamente',
    refresh: 'Actualizar',
    period: 'Últimos {days} días',
    previous: 'Comparado con: {from} — {to}',
    site: 'Mi sitio',
    summary: 'Resumen',
    audience: 'Audiencia',
    engagement: 'Engagement',
    intent: 'Acciones de valor',
    funnel: 'Embudo',
    activities: 'Actividades',
    acquisition: 'Adquisición',
    technology: 'Tecnología',
    whatsapp: 'WhatsApp',
    identified: 'Identificados',
    visitors: 'Visitantes',
    active: 'Activos',
    engaged: 'Comprometidos',
    conversions: 'Conversiones'
  }
}, window.BuddyDashboardConfig || {});
