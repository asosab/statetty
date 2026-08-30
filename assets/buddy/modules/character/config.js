/**
 * Buddy Character — configuración del personaje.
 *
 * el personaje que debe utilizar y aplica fallback cuando sea necesario.
 */
window.BuddyCharacterConfig = window.BuddyCharacterConfig || {};
window.BuddyCharacterConfig = Object.assign({
  enabled: true,
  defaultCharacter: 'alejito',
  fallbackCharacter: 'alejito'
}, window.BuddyCharacterConfig || {});
