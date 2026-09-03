/**
 * assets/buddy/modules/hablar/buddy_hablar.js
 * ---------------------------------------------------------------------------
 * Buddy Hablar — módulo Text-to-Speech.
 *
 * Convierte en voz (Web Speech API, speechSynthesis) lo que el personaje
 * muestra en el globo de says y permite mandarle al personaje cualquier
 * texto para que lo pronuncie, tanto desde la API pública window.Buddy.hablar
 * como desde los comandos del chat.
 *
 * Comandos del chat:
 *   - "habla|hablame|dilo|dilo en voz alta"  -> activa la lectura automática
 *     de todo mensaje nuevo que muestre says.
 *   - "calla|no hables más|has silencio|silencio|deja de hablar" -> la
 *     desactiva (silencia la voz).
 *
 * API pública (window.Buddy.hablar):
 *   - hablar(texto, opciones)
 *   - decir(texto, opciones)        (alias de hablar)
 *   - setEnabled(bool) / enable() / disable()
 *   - isEnabled() / isDisabled()
 *   - setAutoSpeak(bool) / isAutoSpeak()
 *   - hablarEnable() / hablarDisable()  (activar/desactivar lectura automática)
 *   - isSpeaking() / speaking()
 *   - stop() / silenciar() / callar()
 *   - getVoices()
 *   - getVoice() / getState() / getConfig()
 * ---------------------------------------------------------------------------
 */
window.Buddy = window.Buddy || {};

(function (window, document) {
  'use strict';

  var CONFIG = window.BuddyHablarConfig || {};
  var initialized = false;
  var autoSpeak = CONFIG.autoSpeak === true;
  var stateKey = CONFIG.storageKey || 'buddy.hablar.state.v1';
  var pendingSpeech = [];

  function debugLog() {
    if (!window.BuddyConfig || (window.BuddyConfig.debug !== true && window.BuddyConfig.debugMode !== true)) return;

    var args = Array.prototype.slice.call(arguments);
    args.unshift('[Buddy Hablar]');
    console.log.apply(console, args);
  }

  function voiceConfig() {
    return CONFIG.voice || {};
  }

  function supported() {
    return !!(window && window.speechSynthesis &&
      window.SpeechSynthesisUtterance);
  }

  // -------------------------------------------------------------------
  // Estado persistido (enable/disable) en localStorage.
  // -------------------------------------------------------------------
  function readState() {
    if (CONFIG.persistState === false) return null;
    try {
      var raw = window.localStorage.getItem(stateKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeState() {
    if (CONFIG.persistState === false) return;
    try {
      window.localStorage.setItem(stateKey, JSON.stringify({ enabled: autoSpeak }));
    } catch (e) {
      debugLog('No se pudo guardar el estado en localStorage.', e);
    }
  }

  // -------------------------------------------------------------------
  // Voz.
  // -------------------------------------------------------------------
  function pickVoice(lang) {
    if (!supported()) return null;

    var name = voiceConfig().voiceName;
    if (name) {
      var voices = getVoices();
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].name === name) return voices[i];
      }
    }

    var language = lang || voiceConfig().language || 'es-ES';
    var voices = getVoices();
    var fallback = null;
    var base = String(language).toLowerCase().split('-')[0];
    for (var j = 0; j < voices.length; j++) {
      var vlang = String(voices[j].lang || '').toLowerCase();
      if (!vlang) continue;
      if (vlang === language.toLowerCase()) return voices[j];
      if (!fallback && vlang.split('-')[0] === base) fallback = voices[j];
    }
    return fallback;
  }

  function getVoices() {
    if (!supported()) return [];
    return window.speechSynthesis.getVoices() || [];
  }

  // -------------------------------------------------------------------
  // Núcleo de habla.
  // -------------------------------------------------------------------
  function buildUtterance(texto, opciones) {
    var o = Object.assign({}, opciones || {});
    var lang = o.language || o.lang || voiceConfig().language || 'es-ES';

    var utterance = new SpeechSynthesisUtterance(String(texto == null ? '' : texto));
    utterance.lang = lang;
    utterance.rate = clamp(Number(o.rate != null ? o.rate : voiceConfig().rate), 0.1, 10, 1);
    utterance.pitch = clamp(Number(o.pitch != null ? o.pitch : voiceConfig().pitch), 0, 2, 1);
    utterance.volume = clamp(Number(o.volume != null ? o.volume : voiceConfig().volume), 0, 1, 1);

    var voice = pickVoice(lang);
    if (voice) utterance.voice = voice;

    if (typeof o.onstart === 'function') utterance.onstart = o.onstart;
    if (typeof o.onend === 'function') utterance.onend = o.onend;
    if (typeof o.onerror === 'function') utterance.onerror = o.onerror;

    return utterance;
  }

  function clamp(value, min, max, fb) {
    value = Number(value);
    if (!isFinite(value)) return fb;
    return Math.max(min, Math.min(max, value));
  }

  function speakUtterance(utterance) {
    if (!supported()) return false;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  // Lee un texto sin importar el estado autoSpeak (forzado desde la API).
  // Devuelve true si pudo encolar la pronunciación.
  function hablar(texto, opciones) {
    if (!supported()) {
      debugLog('Web Speech API no disponible en este navegador.');
      return false;
    }

    // Forzar start de la síntesis en algunos navegadores.
    if (window.speechSynthesis.paused) {
      try { window.speechSynthesis.resume(); } catch (e) {}
    }

    var utterance = buildUtterance(texto, opciones);

    // Las opciones onstart/onend/onerror ya quedaron adjuntas al utterance
    // en buildUtterance.
    var speech = speakUtterance(utterance);
    if (speech) pendingSpeech.push(utterance);
    return speech;
  }

  // -------------------------------------------------------------------
  // Auto lectura de los mensajes del globo (says).
  // -------------------------------------------------------------------
  function notifyStateChanged() {
    try {
      window.dispatchEvent(new CustomEvent('buddy:hablar-state', {
        detail: {
          enabled: autoSpeak,
          speaking: isSpeaking(),
          autoSpeak: autoSpeak
        }
      }));
    } catch (e) {
      // Compatibilidad con navegadores antiguos.
    }
  }

  function setAutoSpeak(value, silent) {
    var previous = autoSpeak;
    autoSpeak = value === true;
    if (CONFIG.persistState !== false) writeState();
    if (previous !== autoSpeak) notifyStateChanged();
    if (!autoSpeak) cancelPending();
    return autoSpeak;
  }

  // -------------------------------------------------------------------
  // Cancelación.
  // -------------------------------------------------------------------
  function stop() {
    if (!supported()) return false;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    cancelPending();
    return true;
  }

  function silenciar() {
    return stop();
  }

  function callar() {
    return setAutoSpeak(false);
  }

  function cancelPending() {
    pendingSpeech = [];
  }

  function isSpeaking() {
    if (!supported()) return false;
    return !!window.speechSynthesis.speaking;
  }

  // -------------------------------------------------------------------
  // Interceptores del chat.
  // -------------------------------------------------------------------
  function normalize(texto) {
    return String(texto == null ? '' : texto)
      .trim()
      .toLocaleLowerCase()
      .replace(/[áàä]/g, 'a')
      .replace(/[éèë]/g, 'e')
      .replace(/[íìï]/g, 'i')
      .replace(/[óòö]/g, 'o')
      .replace(/[úùü]/g, 'u')
      .replace(/ñ/g, 'n');
  }

  function matchesAny(texto, patterns) {
    for (var i = 0; i < patterns.length; i++) {
      if (texto === normalize(patterns[i])) return true;
    }
    return false;
  }

  function interceptor(texto) {
    var limpio = normalize(texto);
    if (!limpio) return false;

    var on = CONFIG.commands && Array.isArray(CONFIG.commands.on) ? CONFIG.commands.on : [];
    var off = CONFIG.commands && Array.isArray(CONFIG.commands.off) ? CONFIG.commands.off : [];

    if (matchesAny(limpio, on)) {
      setAutoSpeak(true);
      confirmMessage('on', texto);
      return true;
    }

    if (matchesAny(limpio, off)) {
      setAutoSpeak(false);
      stop();
      confirmMessage('off', texto);
      return true;
    }

    return false;
  }

  function confirmMessage(kind, texto) {
    var message = CONFIG.messages && CONFIG.messages[kind];
    if (!message || !message.trim()) return;

    var mucro = kind === 'off' ? false : autoSpeak;

    if (window.Buddy.says && typeof window.Buddy.says.decirSiLibre === 'function') {
      window.Buddy.says.decirSiLibre(message, { emocion: 'sereno' });
    } else if (typeof window.buddy_says === 'function') {
      window.buddy_says(message, { emocion: 'sereno' });
    }

    // Pronunciar la confirmación explícitamente: si acabamos de activar la
    // voz ("habla"), el usuario espera escuchar la respuesta.
    if (mucro && supported()) {
      hablar(message, { language: voiceConfig().language });
    }
  }

  // -------------------------------------------------------------------
  // Integración con says (auto lectura de los mensajes del globo).
  //
  // says (buddy_says) llama a window.Buddy.hablar.__onSaysMessage(texto,
  // opciones, interactivo) cada vez que muestra un mensaje en el globo.
  // Este hook respeta el estado autoSpeak: si está desactivado no se
  // pronuncia nada.
  // -------------------------------------------------------------------
  function onSaysMessage(texto, opciones, interactivo) {
    if (!autoSpeak) return false;
    if (!supported()) return false;

    opciones = opciones || {};
    if (CONFIG.skipInteractive === true && (interactivo === true || opciones.form === true)) {
      return false;
    }

    return hablar(texto, { language: voiceConfig().language });
  }

  // -------------------------------------------------------------------
  // Inicialización.
  // -------------------------------------------------------------------
  function init() {
    if (initialized || CONFIG.enabled === false) {
      if (CONFIG.enabled === false) debugLog('Módulo deshabilitado por configuración.');
      return false;
    }
    initialized = true;

    // Precargar las voces disponibles (en algunos navegadores la lista se
    // llena de forma asíncrona tras el primer getVoices()).
    if (supported()) window.speechSynthesis.getVoices();

    // Restaurar estado persistido (enable/disable) sobre el valor por
    // defecto de config.
    if (CONFIG.persistState !== false) {
      var stored = readState();
      if (stored && typeof stored.enabled === 'boolean') {
        autoSpeak = stored.enabled;
      }
    }

    // Registrar interceptor de chat y el hook de says. says se carga antes
    // que este módulo (ver MODULE_LOAD_ORDER en buddy.js), así que ya está
    // disponible; se incluye el evento buddy:ready como resguardo por si un
    // futuro orden de carga lo mueve.
    function connect() {
      if (window.Buddy.says && typeof window.Buddy.says.registrarInterceptor === 'function') {
        window.Buddy.says.registrarInterceptor('hablar', interceptor);
      }
    }
    connect();
    window.addEventListener('buddy:ready', connect);

    debugLog('Módulo inicializado.', { enabled: CONFIG.enabled !== false, autoSpeak: autoSpeak });

    return true;
  }

  // -------------------------------------------------------------------
  // API pública.
  // -------------------------------------------------------------------
  window.Buddy.hablar = {
    hablar: hablar,
    decir: hablar,
    setEnabled: function (value) { return setAutoSpeak(value === true); },
    enable: function () { return setAutoSpeak(true); },
    disable: function () { return setAutoSpeak(false); },
    isEnabled: function () { return autoSpeak === true; },
    isDisabled: function () { return autoSpeak !== true; },
    hablarEnable: function () { return setAutoSpeak(true); },
    hablarDisable: function () { return setAutoSpeak(false); },
    setAutoSpeak: function (value) { return setAutoSpeak(value === true); },
    isAutoSpeak: function () { return autoSpeak === true; },
    isSpeaking: isSpeaking,
    speaking: isSpeaking,
    stop: stop,
    silenciar: silenciar,
    callar: callar,
    getVoices: getVoices,
    getVoice: function (lang) { return pickVoice(lang); },
    getState: function () {
      return {
        enabled: autoSpeak === true,
        disabled: autoSpeak !== true,
        autoSpeak: autoSpeak === true,
        speaking: isSpeaking()
      };
    },
    getConfig: function () { return CONFIG; },
    supportsTTS: supported,
    __onSaysMessage: onSaysMessage,
    config: CONFIG,
    init: init
  };

  init();
})(window, document);
