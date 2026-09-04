/**
 * Buddy Config Toolbox — configuración del módulo cliente.
 *
 * Herramienta para que el superusuario edite la configuración centralizada
 * de Buddy por página y sus módulos. Se renderiza un formulario (no JSON)
 * interpretando el schema.json de cada módulo.
 */
window.BuddyConfigToolboxConfig = window.BuddyConfigToolboxConfig || {};
window.BuddyConfigToolboxConfig = Object.assign({
  enabled: true,
  localization: { enabled: false },
  apiBaseUrl: 'https://api.statetty.com',
  apiService: 'config',
  endpoints: {
    modulesMeta: '/api/buddy/configs/modules/meta',
    listConfigs: '/api/buddy/configs/list',
    getConfig: '/api/buddy/configs/get',
    saveConfig: '/api/buddy/configs/save',
    deleteConfig: '/api/buddy/configs/delete',
    listModules: '/api/buddy/modules/list',
    getModule: '/api/buddy/modules/get',
    saveModule: '/api/buddy/modules/save',
    syncModuleDefaults: '/api/buddy/modules/sync-defaults',
    deleteModule: '/api/buddy/modules/delete'
  },
  superuserEmail: 'asosab@gmail.com',
  labels: {
    title: 'Configuración de Buddy',
    site: 'Sitio / URL',
    newSite: 'Nueva configuración de página',
    load: 'Cargar',
    create: 'Crear',
    save: 'Guardar',
    cancel: 'Cancelar',
    close: 'Cerrar',
    delete: 'Eliminar',
    modules: 'Módulos',
    addModule: 'Agregar módulo',
    editModule: 'Editar módulo',
    active: 'Activo',
    enabled: 'Habilitado',
    global: 'Configuración de página',
    google: 'Cuenta de Google',
    character: 'Personaje',
    noConfigSelected: 'Seleccioná o creá una configuración de página.',
    noModules: 'Todavía no hay módulos configurados para esta página.',
    noAccess: 'No tenés permisos para administrar la configuración.',
    saved: 'Configuración guardada correctamente.',
    error: 'No se pudo completar la operación.'
  },

  /*
   * Elementos de menú que este módulo ofrece al módulo `menu`.
   * Ver contrato en modules/menu/buddy_menu.js.
   */
  menu: [
    {
      id: 'configToolbox',
      label: 'Toolbox de configuración',
      icon: '⚙️',
      roles: 'superadmin',
      enabled: true,
      action: 'open'
    }
  ]
}, window.BuddyConfigToolboxConfig || {});
