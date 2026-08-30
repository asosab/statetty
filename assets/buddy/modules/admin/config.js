/**
 * Buddy Admin — configuración del módulo cliente.
 *
 * La API administrativa utiliza JWT Bearer y el contexto Buddy del sitio.
 * El módulo no usa cookies ni credenciales de sesión del navegador.
 */
window.BuddyAdminConfig = window.BuddyAdminConfig || {};
window.BuddyAdminConfig = Object.assign({
  enabled: true,
  localization: { enabled: false },
  apiBaseUrl: 'https://api.statetty.com',
  apiService: 'admin',
  endpoints: {
    get: '/api/buddy/admins/get',
    post: '/api/buddy/admins/post'
  },
  labels: {
    menu: 'admin',
    title: 'Administradores',
    email: 'correo',
    active: 'activo',
    role: 'rol',
    owner: 'Propietario',
    administrator: 'Admin',
    newAdmin: 'Nuevo administrador',
    emailPlaceholder: 'Escribe un email válido',
    send: 'enviar',
    cancel: 'cancelar',
    close: 'Cerrar'
  },

  /*
   * Elementos de menú que este módulo ofrece al módulo `menu`.
   * Ver contrato en modules/menu/buddy_menu.js.
   */
  menu: [
    {
      id: 'siteAdmin',
      label: 'Administrador del sitio',
      icon: '🛡️',
      roles: 'admin,superadmin',
      enabled: true,
      action: 'open'
    }
  ]
}, window.BuddyAdminConfig || {});
