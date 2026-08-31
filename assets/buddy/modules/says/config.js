/**
 * Buddy Says — configuración estructural mínima del módulo.
 *
 * IMPORTANTE:
 * - Este archivo es compartido por todos los sitios que cargan Buddy.
 * - NO contiene fuentes de mensajes específicas de ningún sitio.
 * - La lista de fuentes y sus parámetros se obtiene desde la configuración
 *   del sitio almacenada en BD.
 *
 * `sources: []` es deliberado: sirve únicamente como valor mínimo seguro
 * mientras el sitio todavía no tenga fuentes configuradas en BD.
 */
window.BuddySaysConfig = window.BuddySaysConfig || {};

window.BuddySaysConfig.enabled =
  window.BuddySaysConfig.enabled !== false;

window.BuddySaysConfig.localization = {
  enabled: true
};

// Tiempo visible del globo. Se calcula automáticamente según el largo del texto.
window.BuddySaysConfig.display = {
  baseMs: 2800,
  minMs: 2800,
  maxMs: 9000,
  charsPerSecond: 10,
  extraMs: 500
};

// Las fuentes son específicas de cada sitio y llegan desde BD.
// NO agregar aquí nombres de archivos .js.
window.BuddySaysConfig.sources = [];
