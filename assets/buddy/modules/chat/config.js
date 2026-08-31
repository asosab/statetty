/**
 * Buddy Chat — configuración del módulo.
 *
 * El módulo se carga automáticamente cuando enabled=true.
 */
window.BuddyChatConfig = window.BuddyChatConfig || {};
window.BuddyChatConfig = Object.assign({
  enabled: true,
  localization: { enabled: false },
  keyboardKey: 't',
  urlParameter: 'chat',
  sendWithEnter: true,
  placeholder: 'Escribe un comando…',
  buttonText: 'Enviar',
  checkboxText: 'Enviar con Enter'
}, window.BuddyChatConfig || {});
