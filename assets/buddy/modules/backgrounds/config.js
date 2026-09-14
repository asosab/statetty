/**
 * Buddy Backgrounds — configuración del módulo.
 *
 * Activa/desactiva el módulo. La configuración de layers viene de BD
 * (BuddyConfig.backgrounds.defaultLayers y .pageOverrides).
 */
window.BuddyBackgroundsConfig = window.BuddyBackgroundsConfig || {};
window.BuddyBackgroundsConfig = Object.assign({
  enabled: true
}, window.BuddyBackgroundsConfig || {});
