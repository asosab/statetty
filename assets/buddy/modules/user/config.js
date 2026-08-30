/** Buddy User — configuración universal del perfil Buddy. */
window.BuddyUserConfig = window.BuddyUserConfig || {};
window.BuddyUserConfig = Object.assign({
  enabled: true,
  localization: { enabled: false },
  apiBaseUrl: 'https://api.statetty.com',
  apiService: 'user',
  endpoints: {
    current: '/api/buddy/user',
    update: '/api/buddy/user',
    uploadPhoto: '/api/buddy/user/photo'
  },
  fields: {
    email: true,
    firstName: true,
    lastName: true,
    name: true,
    phone: true,
    locale: true
  },
  /*
   * User es la autoridad sobre la completitud del perfil. Auth sólo autentica.
   * phone es el nombre canónico de API/modelo; la etiqueta visible puede
   * explicar que actualmente se utiliza principalmente para WhatsApp.
   */
  requiredProfileFields: ['name', 'phone'],
  onboarding: {
    enabled: true,
    emocion: 'sereno',
    emailLabel: 'Correo:',
    nameLabel: 'Nombre:',
    phoneLabel: 'Número celular que usa en WhatsApp',
    namePlaceholder: 'Escribe tu nombre',
    phonePlaceholder: 'Escribe tu número celular',
    submitText: 'enviar',
    cancelText: 'cancelar'
  },
  locales: [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' },
    { value: 'pt', label: 'Português' }
  ],
  /*
   * Elementos de menú que este módulo ofrece al módulo `menu`.
   * Ver contrato en modules/menu/buddy_menu.js.
   */
  menu: [
    {
      id: 'myData',
      label: 'Mis datos',
      icon: '👤',
      roles: 'auth,admin,superadmin',
      enabled: true,
      action: 'renderProfile'
    }
  ]
}, window.BuddyUserConfig || {});
