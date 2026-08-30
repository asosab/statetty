/**
 * Buddy Menu — configuración del módulo cliente.
 *
 * Coloca a la izquierda del área de texto del chat (módulo chat activo) un
 * trigger que hace las veces de botón de autenticación cuando no hay usuario
 * (etiqueta "login") y de avatar circular del usuario cuando sí lo hay. Al
 * abrirse despliega un menú flotante con los elementos que cada módulo activo
 * declara en su propia configuración (CAMPO `menu`), filtrados por el tipo de
 * usuario actual.
 */
window.BuddyMenuConfig = window.BuddyMenuConfig || {};
window.BuddyMenuConfig = Object.assign({
  enabled: true,
  localization: { enabled: false },

  // Etiqueta del trigger cuando NO hay usuario autenticado.
  anonLabel: 'login',

  // Etiqueta del botón "Cerrar sesión" al pie del menú (solo autenticado).
  logoutLabel: 'Cerrar sesión',

  // El menú sólo tiene sentido si el chat está activo.
  condition: function (ctx) {
    return !!(ctx.Buddy && ctx.Buddy.modules && ctx.Buddy.modules.isActive &&
      ctx.Buddy.modules.isActive('chat'));
  },

  labels: {
    menu: 'Menú de usuario',
    login: 'Iniciar sesión',
    close: 'Cerrar'
  }
}, window.BuddyMenuConfig || {});
