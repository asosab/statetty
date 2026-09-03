/**
 * Buddy Hablar — configuración del módulo Text-to-Speech.
 *
 * Convierte en voz los mensajes del globo (says) y deja decir al personaje
 * lo que el usuario quiera desde el chat o desde la API pública
 * window.Buddy.hablar.
 *
 * Este módulo es completamente configurable desde el toolbox (schema.json).
 */
window.BuddyHablarConfig = window.BuddyHablarConfig || {};
window.BuddyHablarConfig = Object.assign({
  enabled: true,
  localization: { enabled: false },

  /*
   * Comportamiento por defecto al cargar.
   *  - `autoSpeak` habilita que todo mensaje nuevo mostrado por says se
   *    pronuncie en voz alta automáticamente.
   *  - `persistState` guarda en localStorage enable/disable para recordarlo
   *    entre sesiones del navegador.
   */
  autoSpeak: false,
  persistState: true,
  storageKey: 'buddy.hablar.state.v1',

  /*
   * Voces. `lang` es el código de idioma BCP-47 (es-ES, es-US, en-US...).
   * Si `voiceName` se deja vacío se usa la voz por defecto del navegador
   * para el idioma indicado.
   */
  voice: {
    language: 'es-ES',
    voiceName: '',
    rate: 1,    // velocidad (0.1 a 10)
    pitch: 1,   // tono (0 a 2)
    volume: 1   // volumen (0 a 1)
  },

  /*
   * Omitir la pronunciación de mensajes interactivos (formularios,
   * elecciones rápidas). Estos suelen contener instrucciones largas que
   * conviene no leer en voz alta.
   */
  skipInteractive: true,

  /*
   * Comandos del chat. `on` activa la lectura en voz alta automática de
   * los mensajes de says; `off` la desactiva (calla). Los patrones se
   * comparan normalizados (minúsculas, sin acentos).
   */
  commands: {
    on: ['habla', 'hablame', 'dilo', 'dilo en voz alta'],
    off: ['calla', 'no hables mas', 'has silencio', 'silencio', 'deja de hablar']
  },

  /*
   * Mensajes de confirmación que dice/escribe el personaje al activar o
   * desactivar la lectura en voz alta. Si se deja vacío no se muestra
   * ningún globo de confirmación.
   */
  messages: {
    on: 'Está bien, desde ahora leeré en voz alta lo que diga.',
    off: 'De acuerdo, guardaré silencio.'
  }
}, window.BuddyHablarConfig || {});
