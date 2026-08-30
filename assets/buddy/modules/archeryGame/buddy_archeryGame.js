/**
 * assets/buddy/modules/archeryGame/buddy_archeryGame.js
 * ---------------------------------------------------------------------------
 * Fase 5 — mecánica del minijuego de puntería para la arquitectura "buddy".
 *
 * El personaje se resuelve/renderiza mediante Buddy y los globos mediante
 * buddy_says. Este módulo no implementa posicionamiento del personaje,
 * CSS/DOM del globo, fuentes de mensajes ni política común de ocupado.
 * ---------------------------------------------------------------------------
 */
(function () {
  'use strict';

  var CONFIG = window.BuddyArcheryGameConfig;
  if (!CONFIG) {
    throw new Error('Buddy ArcheryGame: no se encontró window.BuddyArcheryGameConfig. Carga modules/archeryGame/config.js antes de buddy_archeryGame.js.');
  }

  var TOP10_STORAGE_KEY = 'buddy.archeryGame.top10';

  function guardarTop10Local(top10) {
    try {
      window.localStorage.setItem(TOP10_STORAGE_KEY, JSON.stringify(top10));
    } catch (error) {
      if (window.BuddyConfig && window.BuddyConfig.debugMode === true) {
        console.warn('[Buddy] No se pudo guardar archeryGame/top10 en localStorage.', error);
      }
    }
    return top10;
  }

  function obtenerTop10() {
    var telemetry = window.Buddy && window.Buddy.telemetry;
    if (!telemetry || typeof telemetry.get !== 'function') {
      return Promise.reject(new Error('Buddy Telemetry no está disponible.'));
    }

    return telemetry.get('archeryGame', (telemetry.getApiConfig('archeryGame') || {}).top10 || '/api/buddy/archeryGame/top10')
      .then(function (top10) {
        if (!Array.isArray(top10)) {
          throw new Error('La API archeryGame/top10 no devolvió un array.');
        }

        return guardarTop10Local(top10);
      });
  }

  function mostrarTop10(top10) {
    var datos = Array.isArray(top10) ? Promise.resolve(top10) : obtenerTop10();

    return datos.then(function (resultado) {
      if (typeof window.buddy_says !== 'function') {
        throw new Error('window.buddy_says no está disponible.');
      }

      window.buddy_says(textoTop10(resultado), {
        html: true,
        emocion: 'sereno'
      });

      return resultado;
    });
  }

  function obtenerTop10Local() {
    try {
      var raw = window.localStorage.getItem(TOP10_STORAGE_KEY);
      if (!raw) return null;
      var top10 = JSON.parse(raw);
      return Array.isArray(top10) ? top10 : null;
    } catch (error) {
      return null;
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function textoTop10(top10) {
    var texto = 'Los mejores puntajes con flechas virtuales:<br><br>';

    if (!Array.isArray(top10) || top10.length === 0) {
      return texto + 'Todavía no hay puntajes registrados.';
    }

    return texto + top10.map(function (item, index) {
      var nombre = item && item.nombre ? String(item.nombre) : 'Sin nombre';
      var puntos = Number(item && item.puntos);
      var tiempo = Number(item && item.tiempo);
      var puntosTexto = Number.isFinite(puntos) ? String(puntos) : '0';
      var tiempoTexto = Number.isFinite(tiempo) ? tiempo.toFixed(3) : '—';

      return '<strong>' + (index + 1) + '. ' + escapeHtml(nombre) + '</strong> — ' +
        puntosTexto + ' puntos — ' + tiempoTexto + ' segundos';
    }).join('<br>');
  }

  // ---------------------------------------------------------------------
    // Estado interno
    // ---------------------------------------------------------------------
    var state = 'hidden'; // hidden | idle | pending | aiming | resolved | exhausted
    var charEl = null;
    var miraEl = null;
    var targetEl = null;  // fallback gráfico; puede no existir si target está disabled
    var debugEl = null;
    var aimFocusEl = null;
    var aimFocusActive = false;
    var aimBlurRuntimeEnabled = true;
    var aimFocusTargetEl = null;
    var aimFocusTargetOriginalZ = null;

    // Estado visual de la diana DOM de página. Se conserva la geometría
    // original para poder devolverla exactamente a su lugar y tamaño.
    var pageTargetVisualState = null;
    var pageTargetRestoreTimer = null;
    var pageTargetBlurSyncRunning = false;
    var pageTargetLastScoreSumAt = 0;
    var pageTargetAnimationToken = 0;
  
    var activePointerId = null;
    var startX = 0;
    var startY = 0;
    var longPressTimer = null;
    var maxHoldTimer = null;
    var resolveTimer = null;
    var hitTimer = null; // delay entre disparo.mp3/pose02 y golpe.mp3/flecha clavada
    var aimStartedAt = 0;
    var currentCharPoseKey = 'idle';
  
    // v1.0: pedido de apuntado en cola — true si el jugador ya hizo
    // click/touch-and-drag sobre Buddy mientras la flecha anterior
    // todavía estaba resolviéndose (pose02, esperando hitTimer/resolveTimer).
    // No cancela esa resolución: sólo queda anotado para, apenas termine,
    // pasar derecho a pose01 en vez de volver a pose03 (ver el resolveTimer
    // dentro de resolve()).
    var pendingAimRequest = false;
    var pendingAimStartX = 0;
    var pendingAimStartY = 0;

    // Triple-click de prueba para invocar/ocultar a Buddy.
    // Mantener este estado privado dentro del módulo; no depende de variables
    // globales del script original.
    var testTriggerClickCount = 0;
    var testTriggerClickTimer = null;
  
    // Precarga: dimensiones naturales cacheadas por nombre de archivo, para
    // poder posicionar/dimensionar una flecha clavada al instante, sin
    // esperar un nuevo evento 'load'.
    var assetDimsCache = {};
    var shotAudio = null;
    var hitAudio = null;
    var tensAudio = null;
  
    // Flechas ya clavadas en pantalla (para la lógica de agrupamiento). Cada
    // entrada es { el, x, y, score }. Se acumulan entre disparos; no se
    // limpian solas (salvo por el cooldown de v0.4, ver más abajo).
    var stuckArrows = [];
    var repositionArrowsRAF = null; // id de requestAnimationFrame para reposicionar flechas clavadas
  
    // -------------------------------------------------------------------
    // Temblor de la mira mientras se apunta: latidos (v0.4) + cansancio
    // (v0.5) — ver CONFIG.heartbeat y CONFIG.fatigue. Ambas fuentes
    // comparten el mismo loop de animación (aimTremorTick).
    // -------------------------------------------------------------------
    var aimTremorRAF = null;         // id de requestAnimationFrame en curso
    var heartbeatIntensity = 0;      // valor mostrado (suavizado), 0..1
    var heartbeatTargetIntensity = 0; // objetivo, fijado por la velocidad real del puntero
    var heartbeatPhase = 0;          // fase acumulada del pulso de latido (radianes)
    var lastPointerMoveAt = 0;       // performance.now() del último pointermove
    var lastPointerX = 0;
    var lastPointerY = 0;
    var lastTremorFrameAt = 0;       // performance.now() del último frame pintado
    var fatiguePhase = 0;            // fase acumulada de la sacudida de cansancio (radianes)
    var vaivenPhase = 0;             // fase acumulada del vaivén en forma de 8 (radianes)
    var lastVaivenRadiusPx = 0;      // último radio de 8 pintado (para el panel de debug)
    var sostenidoPhase = 0;          // fase acumulada de la sacudida de "sostener la mira" (v2.0, radianes)
    var lastSostenidoIntensity = 0;  // último valor 0..1 calculado (para el panel de debug)
    // Posición base de la mira (SIN los temblores): lo que antes se
    // escribía directo en miraEl.style.transform en cada pointermove. Ahora
    // solo aimTremorTick escribe el transform final (base + temblores),
    // para no pelear por la escritura del estilo entre el handler de
    // pointermove y el loop de animación.
    var miraBaseDx = 0;
    var miraBaseDy = 0;
  
    // -------------------------------------------------------------------
    // Cansancio muscular (v0.5) — ver CONFIG.fatigue.
    // -------------------------------------------------------------------
    var fatigueLevel = 0;      // nivel de temblor "consumido" al momento del último disparo (0..maxLevel), sin decaer todavía por el descanso posterior — ver currentFatigueLevel()
    var lastShotAt = 0;        // performance.now() del último disparo (0 = todavía no se disparó ninguna flecha en la sesión)
    var lateShotStreak = 0;    // flechas seguidas disparadas sin respetar fatigue.expectedCooldownMs
    var exhausted = false;     // true mientras Buddy está forzado a pose04 por agotamiento total
    var exhaustionRecoveryTimer = null; // dispara la vuelta a pose03 tras fatigue.exhaustionRestMs de descanso
  
    // -------------------------------------------------------------------
    // Límite de flechas / cooldown del carcaj (v0.4) — ver CONFIG.arrowLimit.
    // -------------------------------------------------------------------
    var arrowsInBatch = 0;    // flechas disparadas desde el último cooldown
    var andanadaStartedAt = null; // timestamp del primer disparo de la andanada actual
    var cooldownUntil = 0;    // performance.now() hasta el que hay que esperar; 0 = sin cooldown
    var fadeTimer = null;     // dispara el desvanecimiento de la tanda actual
  
    // -------------------------------------------------------------------
    // Puntaje total de la andanada (v1.5) — ver CONFIG.andanada.
    // -------------------------------------------------------------------
    var batchScoreSum = 0;        // suma de puntos de la tanda en curso (miss cuenta 0); se reinicia junto con arrowsInBatch
    var andanadaBubbleTimer = null; // delay del globo con la suma de la tanda, tras el de la última flecha
    // Flujo post-andanada: si el jugador no estaba autenticado, primero debe
    // autenticarse. Solo después de una autenticación válida se solicita el nombre.
    var pendingAuthForName = false;
    var pendingAndanadaNameGreeting = false;
    // Pose a la que Buddy vuelve entre disparos cuando no hay nada más
    // puntual que mostrar (fuego/apuntado/fallo de ESE tiro/agotamiento).
    // Arranca en 'idle' (pose03) y narrateAndanadaTotal() la actualiza al
    // completar cada tanda de seis flechas según CONFIG.andanada
    // .lowScorePoseThreshold. A propósito NO se reinicia en resetArrows()
    // ni en hideCharacter() — es "cómo quedó Buddy" tras la última tanda
    // jugada, no algo que dependa de las flechas que estén dibujadas en
    // pantalla en este momento.
    var defaultIdlePoseKey = 'idle';
  
    // -------------------------------------------------------------------
    // Mira sin calibrar (v0.8) — ver CONFIG.calibracion. Desvío (px) entre
    // el centro visual de la mira y el punto de impacto real, sorteado una
    // vez al cargar la página (initCalibration) y corregido de a poco al
    // completar cada andanada (recalibrateMira). Se aplica sólo al momento
    // de resolver un disparo (ver resolve() -> hitTimer) — nunca a la
    // posición dibujada de la mira mientras se apunta.
    var calibOffsetX = 0;
    var calibOffsetY = 0;
    var calibrationBubbleTimer = null; // delay del globo "Voy a calibrar..." tras el de puntaje
  // Flujo de registro de nombre al completar una andanada. Solo se activa
  // cuando el usuario ya está autenticado pero todavía no tiene nombre.
  var nameCaptureActive = false;
  
    // -------------------------------------------------------------------
    // Registro de flechas de la sesión (v0.5) — ver CONFIG.arrowLog.
    // -------------------------------------------------------------------
    // Cada entrada: { index, timestamp, score, andanada }.
    //   - index: número de flecha dentro de la sesión (arranca en 1).
    //   - timestamp: Date.now() (epoch ms) del momento del disparo.
    //   - score: 5 a 10, 0 si fue un miss.
    //   - andanada: número de andanada a la que pertenece esta flecha.
    //   - andanada: número de andanada (grupo de arrowLog.arrowsPerAndanada
    //     flechas) a la que pertenece esta flecha, arranca en 1.
    // Vive sólo en memoria: "sesión del explorador" acá se interpreta como
    // "mientras la página siga cargada en la pestaña", no como algo que
    // sobreviva a un F5 — no se usó sessionStorage porque no se pidió que
    // sobreviva a una recarga; si hiciera falta, es cuestión de serializar
    // este arreglo a sessionStorage en logArrowShot() y restaurarlo en
    // init().
    var sessionArrowLog = [];
    var arrowsFiredTotal = 0; // total de flechas disparadas en la sesión (para gatillar fatigue.startAfterArrow)


  // ---------------------------------------------------------------------
  // Utilidades de tamaño para elementos propios del módulo (mira/flechas/
  // diana de fallback). El personaje se escala y posiciona exclusivamente
  // mediante window.Buddy.showCharacterImage().
  // ---------------------------------------------------------------------
  function viewportLongSide() {
    return Math.max(window.innerWidth, window.innerHeight);
  }

  function applyLongSideFit(imgEl, nw, nh, targetPx) {
    if (!nw || !nh) return;
    if (nw >= nh) {
      imgEl.style.width = targetPx + 'px';
      imgEl.style.height = 'auto';
    } else {
      imgEl.style.height = targetPx + 'px';
      imgEl.style.width = 'auto';
    }
  }

  function fitLongSide(imgEl, targetPx) {
    applyLongSideFit(imgEl, imgEl.naturalWidth, imgEl.naturalHeight, targetPx);
  }


  // ---------------------------------------------------------------------
  // Diálogos del módulo: el contenido vive en buddy_archery_zen.js.
  // La mecánica solo conoce claves de diálogo y categorías emocionales.
  // ---------------------------------------------------------------------
  var dialogueLastIndex = {};

  function getDialogue(key) {
    var data = window.BuddyTexts &&
      window.BuddyTexts.archeryGame &&
      window.BuddyTexts.archeryGame.es &&
      window.BuddyTexts.archeryGame.es.zen;

    if (!data || !data.dialogues || !data.dialogues[key]) return null;

    var variants = data.dialogues[key];
    if (!Array.isArray(variants) || !variants.length) return null;
    if (variants.length === 1) return variants[0];

    var lastIndex = dialogueLastIndex[key];
    var index;
    do {
      index = Math.floor(Math.random() * variants.length);
    } while (index === lastIndex);

    dialogueLastIndex[key] = index;
    return variants[index];
  }

  function say(texto, emocion, opciones) {
    if (!texto || typeof window.buddy_says !== 'function') return;
    opciones = opciones || {};
    opciones.emocion = emocion || opciones.emocion || 'neutral';
    window.buddy_says(texto, opciones);
  }


function pickRandom(variants, memoKey) {
    if (!variants || variants.length === 0) return null;
    if (variants.length === 1) return variants[0];

    var lastIndex = dialogueLastIndex[memoKey];
    var index;
    do {
      index = Math.floor(Math.random() * variants.length);
    } while (index === lastIndex);

    dialogueLastIndex[memoKey] = index;
    return variants[index];
  }

function getResourceMode(resourceName) {
    var resource = CONFIG.resources && CONFIG.resources[resourceName];
    return resource && resource.mode ? resource.mode : 'auto';
  }

function getModuleImage(key) {
    var meta = CONFIG.images && CONFIG.images[key];
    var asset = window.Buddy.resolveAssetDefault('archeryGame', 'images', key);
    if (!asset || !asset.archivo) return null;
    if (!meta) return asset;
    return {
      archivo: asset.archivo,
      ancho: meta.ancho,
      alto: meta.alto,
      escala: meta.escala,
      anclas: meta.anclas,
      // v2.1: centro real del peep sight (px a escala 1:1). Si el módulo
      // no lo define para esta imagen, queda undefined y
      // miraCentroOffsetPx() cae al fallback (centro geométrico).
      centro: meta.centro
    };
  }

function resolveArcheryImage(resourceName, key) {
    var mode = getResourceMode(resourceName);
    if (mode === 'disabled') return null;
    if (mode === 'module') return getModuleImage(key);
    return window.Buddy.resolveAsset('archeryGame', 'images', key);
  }

function targetMode() {
    return getResourceMode('target');
  }

function targetDisabled() {
    return targetMode() === 'disabled';
  }

function getConfiguredTargetDom() {
    var target = CONFIG.target || {};
    if (target.type !== 'dom' || !target.selector) return null;
    return document.querySelector(target.selector);
  }

function getDefaultTargetConfig() {
    return CONFIG.defaultTarget || {};
  }

function normalizeTargetRings(rings) {
    return Array.isArray(rings) ? rings : [];
  }

function getDefaultTargetRings() {
    return normalizeTargetRings(getDefaultTargetConfig().rings);
  }

function getCharacterTargetAsset() {
    if (typeof window.Buddy.hasAssetOverride !== 'function' ||
        !window.Buddy.hasAssetOverride('archeryGame', 'images', 'diana')) {
      return null;
    }
    return window.Buddy.resolveAsset('archeryGame', 'images', 'diana');
  }

function getDefaultTargetAsset() {
    var defaultConfig = getDefaultTargetConfig();
    var imageName = defaultConfig.image || 'diana.png';
    var key = imageName.replace(/\.[^.]+$/, '');
    var asset = getModuleImage(key);
    if (!asset) return null;

    return {
      archivo: asset.archivo,
      ancho: asset.ancho,
      alto: asset.alto,
      escala: typeof defaultConfig.scale === 'number' ? defaultConfig.scale : asset.escala,
      anclas: asset.anclas,
      rings: defaultConfig.rings
    };
  }

function getPageFallbackTargetAsset() {
    var target = CONFIG.target || {};
    var fallback = target.fallback || {};
    var image = fallback.image;
    if (!image) return null;

    // Los fallbacks declarados con un nombre simple (p. ej. diana.png) se
    // resuelven como imágenes del módulo Archery. Se aceptan además URLs o
    // rutas explícitas para no limitar la configuración de una página.
    if (/^(?:https?:|data:|blob:|\/)/i.test(image) || image.indexOf('/') !== -1) {
      return {
        archivo: image,
        escala: typeof target.scale === 'number' ? target.scale : CONFIG.scales.target,
        rings: target.rings
      };
    }

    var key = image.replace(/\.[^.]+$/, '');
    var asset = getModuleImage(key);
    if (!asset) return null;
    return {
      archivo: asset.archivo,
      ancho: asset.ancho,
      alto: asset.alto,
      escala: typeof target.scale === 'number' ? target.scale : asset.escala,
      anclas: asset.anclas,
      rings: target.rings
    };
  }

function getTargetResolution() {
    if (targetDisabled()) return null;

    // PRIORIDAD 1: diana específica de la página.
    // Si el DOM configurado existe, se usa directamente. Si no existe y la
    // configuración ofrece fallback, ese fallback sigue perteneciendo a la
    // diana de página y conserva su misma geometría (rings).
    if (CONFIG.target && CONFIG.target.type === 'dom' && CONFIG.target.selector) {
      var pageTarget = getConfiguredTargetDom();
      if (pageTarget) {
        return {
          source: 'page',
          element: pageTarget,
          asset: null,
          rings: normalizeTargetRings(CONFIG.target.rings).length
            ? CONFIG.target.rings
            : getDefaultTargetRings(),
          scale: typeof CONFIG.target.scale === 'number' ? CONFIG.target.scale : CONFIG.scales.target,
          marginPx: typeof CONFIG.target.marginPx === 'number' ? CONFIG.target.marginPx : 16
        };
      }

      if (CONFIG.target.fallback && CONFIG.target.fallback.enabled) {
        var pageFallbackAsset = getPageFallbackTargetAsset();
        if (pageFallbackAsset) {
          return {
            source: 'page-fallback',
            element: targetEl,
            asset: pageFallbackAsset,
            rings: normalizeTargetRings(CONFIG.target.rings).length
              ? CONFIG.target.rings
              : getDefaultTargetRings(),
            scale: typeof CONFIG.target.scale === 'number' ? CONFIG.target.scale : CONFIG.scales.target,
            marginPx: typeof CONFIG.target.marginPx === 'number' ? CONFIG.target.marginPx : 16
          };
        }
      }
    }

    // PRIORIDAD 2: diana declarada por el personaje.
    var characterAsset = getCharacterTargetAsset();
    if (characterAsset && characterAsset.archivo) {
      return {
        source: 'character',
        element: targetEl,
        asset: characterAsset,
        rings: normalizeTargetRings(characterAsset.rings).length
          ? characterAsset.rings
          : getDefaultTargetRings(),
        scale: assetScale(characterAsset, CONFIG.scales.target),
        marginPx: 16
      };
    }

    // PRIORIDAD 3: diana por defecto del módulo /archeryGame.
    var defaultAsset = getDefaultTargetAsset();
    if (!defaultAsset || !defaultAsset.archivo) return null;
    return {
      source: 'module',
      element: targetEl,
      asset: defaultAsset,
      rings: getDefaultTargetRings(),
      scale: assetScale(defaultAsset, CONFIG.scales.target),
      marginPx: 16
    };
  }

function targetTargetPx(targetInfo) {
    var info = targetInfo || getTargetResolution();
    var targetScale = info && typeof info.scale === 'number' ? info.scale : CONFIG.scales.target;
    return CONFIG.targetLongSidePercent * viewportLongSide() * targetScale;
  }

function getTargetEl() {
    var resolution = getTargetResolution();
    return resolution ? resolution.element : null;
  }

function isPageDomTarget(target) {
    var resolution = getTargetResolution();
    return !!(resolution && resolution.source === 'page' && resolution.element === target);
  }

function pageTargetDomConfig() {
    var target = CONFIG.target || {};
    return target.domAim || {};
  }

function pageTargetTransitionMs() {
    var ms = Number(pageTargetDomConfig().transitionMs);
    return isFinite(ms) && ms >= 0 ? ms : 650;
  }

function capturePageTargetVisualState(target) {
    if (!target || !target.getBoundingClientRect) return null;
    var rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      el: target,
      originalRect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      },
      originalInline: {
        position: target.style.position,
        left: target.style.left,
        top: target.style.top,
        right: target.style.right,
        bottom: target.style.bottom,
        width: target.style.width,
        height: target.style.height,
        maxWidth: target.style.maxWidth,
        maxHeight: target.style.maxHeight,
        transform: target.style.transform,
        transition: target.style.transition,
        zIndex: target.style.zIndex
      },
      active: false
    };
  }

function ensurePageTargetVisualState(target) {
    if (!isPageDomTarget(target)) return null;
    if (!pageTargetVisualState || pageTargetVisualState.el !== target) {
      pageTargetVisualState = capturePageTargetVisualState(target);
    }
    return pageTargetVisualState;
  }

function cancelPageTargetRestoreTimer() {
    if (pageTargetRestoreTimer) {
      clearTimeout(pageTargetRestoreTimer);
      pageTargetRestoreTimer = null;
    }
  }

function restorePageTargetOriginal(animate) {
    var visual = pageTargetVisualState;
    var animationToken = ++pageTargetAnimationToken;
    if (!visual || !visual.el || !visual.originalRect) return;

    cancelPageTargetRestoreTimer();
    var target = visual.el;
    var duration = pageTargetTransitionMs();

    if (!animate || duration <= 0) {
      Object.keys(visual.originalInline).forEach(function (key) {
        target.style[key] = visual.originalInline[key];
      });
      visual.active = false;
      return;
    }

    var current = target.getBoundingClientRect();
    if (!current.width || !current.height) return;

    // Recuperamos temporalmente el layout original para conocer la posición
    // que corresponde AHORA. Así, si la página se desplazó mientras se jugaba,
    // la restauración no intenta volver a una coordenada vieja del viewport.
    Object.keys(visual.originalInline).forEach(function (key) {
      target.style[key] = visual.originalInline[key];
    });
    var destination = target.getBoundingClientRect();
    if (!destination.width || !destination.height) {
      visual.active = false;
      return;
    }

    target.style.transition = 'none';
    target.style.position = 'fixed';
    target.style.right = 'auto';
    target.style.bottom = 'auto';
    target.style.maxWidth = 'none';
    target.style.maxHeight = 'none';
    target.style.left = current.left + 'px';
    target.style.top = current.top + 'px';
    target.style.width = current.width + 'px';
    target.style.height = current.height + 'px';
    target.style.transform = 'none';
    target.offsetWidth;
    target.style.transition = 'left ' + duration + 'ms ease, top ' + duration + 'ms ease, width ' + duration + 'ms ease, height ' + duration + 'ms ease';

    requestAnimationFrame(function () {
      if (!visual.active || animationToken !== pageTargetAnimationToken) return;
      target.style.left = destination.left + 'px';
      target.style.top = destination.top + 'px';
      target.style.width = destination.width + 'px';
      target.style.height = destination.height + 'px';
    });

    setTimeout(function () {
      if (!visual.active || animationToken !== pageTargetAnimationToken) return;
      Object.keys(visual.originalInline).forEach(function (key) {
        target.style[key] = visual.originalInline[key];
      });
      visual.active = false;
    }, duration + 30);
  }

function schedulePageTargetRestore() {
    cancelPageTargetRestoreTimer();
    if (!pageTargetVisualState || !pageTargetVisualState.active || !pageTargetLastScoreSumAt) return;

    var cfg = pageTargetDomConfig();
    var wait = Number(cfg.restoreAfterMs);
    if (!isFinite(wait) || wait < 0) wait = 60000;

    var elapsed = pageTargetLastScoreSumAt ? (performance.now() - pageTargetLastScoreSumAt) : 0;
    var remaining = Math.max(0, wait - elapsed);
    pageTargetRestoreTimer = setTimeout(function () {
      pageTargetRestoreTimer = null;
      if (state === 'aiming') return;
      restorePageTargetOriginal(true);
    }, remaining);
  }

function markPageTargetScoreSum() {
    if (!pageTargetVisualState || !pageTargetVisualState.active) return;
    pageTargetLastScoreSumAt = performance.now();
    schedulePageTargetRestore();
  }

function preparePageTargetForAiming() {
    var resolution = getTargetResolution();
    var target = resolution && resolution.source === 'page' ? resolution.element : null;
    if (!target) return;

    cancelPageTargetRestoreTimer();
    pageTargetAnimationToken++;
    var visual = ensurePageTargetVisualState(target);
    if (!visual) return;

    var cfg = pageTargetDomConfig();
    var targetWidth = Number(cfg.sizePx);
    if (!isFinite(targetWidth) || targetWidth <= 0) targetWidth = 100;
    var marginPercent = Number(cfg.edgeMarginPercent);
    if (!isFinite(marginPercent) || marginPercent < 0) marginPercent = 0.30;

    var current = target.getBoundingClientRect();
    if (!current.width || !current.height) return;
    var aspect = visual.originalRect.height / visual.originalRect.width;
    var targetHeight = targetWidth * aspect;
    var targetMargin = targetWidth * marginPercent;
    var targetLeft = targetMargin;
    var targetTop = targetMargin;
    var duration = pageTargetTransitionMs();

    // La comprobación se hace en cada entrada a aiming. Si otro CSS o script
    // cambió el logo, volvemos a llevarlo al estado configurado de forma sutil.
    var alreadyThere = visual.active &&
      Math.abs(current.width - targetWidth) < 0.5 &&
      Math.abs(current.height - targetHeight) < 0.5 &&
      Math.abs(current.left - targetLeft) < 0.5 &&
      Math.abs(current.top - targetTop) < 0.5;

    if (alreadyThere) return;

    target.style.transition = duration > 0
      ? 'left ' + duration + 'ms ease, top ' + duration + 'ms ease, width ' + duration + 'ms ease, height ' + duration + 'ms ease'
      : 'none';
    target.style.position = 'fixed';
    target.style.right = 'auto';
    target.style.bottom = 'auto';
    target.style.maxWidth = 'none';
    target.style.maxHeight = 'none';
    target.style.transform = 'none';

    // Si aún está en su layout original, primero fijamos su posición visual
    // actual para que el navegador pueda interpolar hasta la esquina.
    target.style.left = current.left + 'px';
    target.style.top = current.top + 'px';
    target.style.width = current.width + 'px';
    target.style.height = current.height + 'px';
    target.offsetWidth;

    requestAnimationFrame(function () {
      if (!visual.el || visual.el !== target) return;
      target.style.left = targetLeft + 'px';
      target.style.top = targetTop + 'px';
      target.style.width = targetWidth + 'px';
      target.style.height = targetHeight + 'px';
    });

    visual.active = true;
  }

function updateTargetVisibility() {
    if (!targetEl) return;

    var resolution = getTargetResolution();
    if (!resolution) {
      targetEl.style.display = 'none';
      return;
    }

    if (resolution.element !== targetEl) {
      targetEl.style.display = 'none';
      return;
    }

    targetEl.style.display = 'block';
    if (resolution.asset && resolution.asset.archivo && targetEl.getAttribute('src') !== resolution.asset.archivo) {
      targetEl.src = resolution.asset.archivo;
    }
    targetEl.style.left = resolution.marginPx + 'px';
    targetEl.style.top = resolution.marginPx + 'px';
  }

function computeScore(x, y, rect) {
    var resolution = getTargetResolution();
    if (!resolution) return null;

    var el = resolution.element;
    if (!rect) {
      if (!el) return null;
      rect = el.getBoundingClientRect();
    }
    if (!rect.width || !rect.height) return null;

    var rings = normalizeTargetRings(resolution.rings);
    if (!rings.length) return null;

    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var maxRadius = Math.min(rect.width, rect.height) / 2;
    var dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));

    for (var i = 0; i < rings.length; i++) {
      var ring = rings[i];
      if (dist <= ring.outerPercent * maxRadius) return ring.points;
    }
    return null;
  }

function preloadAssets() {
    var imageKeys = ['mira', 'diana', 'flecha01', 'flecha02', 'flecha03', 'flecha04'];

    imageKeys.forEach(function (key) {
      var resourceName = key === 'mira' ? 'mira' : (key.indexOf('flecha') === 0 ? 'arrows' : 'target');
      var datos = resolveArcheryImage(resourceName, key);
      if (!datos || !datos.archivo) return;

      var img = new Image();
      img.addEventListener('load', function () {
        assetDimsCache[key] = { width: img.naturalWidth, height: img.naturalHeight };
      });
      img.src = datos.archivo;
    });

    var shotPath = window.Buddy.resolveAsset('archeryGame', 'sounds', 'disparar');
    var hitPath = window.Buddy.resolveAsset('archeryGame', 'sounds', 'impacto');
    var tensPath = window.Buddy.resolveAsset('archeryGame', 'sounds', 'tensar');

    shotAudio = new Audio(shotPath);
    shotAudio.preload = 'auto';
    try { shotAudio.load(); } catch (err) { /* noop */ }

    hitAudio = new Audio(hitPath);
    hitAudio.preload = 'auto';
    try { hitAudio.load(); } catch (err) { /* noop */ }

    tensAudio = new Audio(tensPath);
    tensAudio.preload = 'auto';
    try { tensAudio.load(); } catch (err) { /* noop */ }
  }

function playShotSound() {
    if (!shotAudio) return;
    try {
      shotAudio.currentTime = 0;
      var p = shotAudio.play();
      if (p && typeof p.catch === 'function') {
        // Los navegadores pueden bloquear el autoplay hasta que haya
        // interacción del usuario; el toque largo ya cuenta como tal, pero
        // se captura el rechazo igual para no ensuciar la consola.
        p.catch(function () { /* noop */ });
      }
    } catch (err) { /* noop */ }
  }

function playHitSound() {
    if (!hitAudio) return;
    try {
      hitAudio.currentTime = 0;
      var p = hitAudio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () { /* noop */ });
      }
    } catch (err) { /* noop */ }
  }

function playTensSound() {
    if (!tensAudio) return;
    try {
      tensAudio.currentTime = 0;
      var p = tensAudio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () { /* noop */ });
      }
    } catch (err) { /* noop */ }
  }

function stopTensSound() {
    if (!tensAudio) return;
    try { tensAudio.pause(); tensAudio.currentTime = 0; } catch (err) { /* noop */ }
  }

function assetScale(asset, fallbackScale) {
    return asset && typeof asset.escala === 'number' ? asset.escala : fallbackScale;
  }

function miraTargetPx(asset) {
    return CONFIG.miraLongSidePercent * viewportLongSide() * assetScale(asset, CONFIG.scales.mira);
  }

  // v2.1: el punto rojo del peep sight no siempre cae en el centro
  // geométrico del PNG de mira.png. Cuando el asset trae 'centro' (px en
  // la imagen a escala 1:1, ver buddy_char_*.js), este desplazamiento
  // convierte esa diferencia (centro real vs. centro geométrico) a
  // píxeles de pantalla, según cuánto esté escalada la mira ahora mismo.
  // Sin 'centro' o sin dimensiones naturales cargadas, no corrige nada.
  function miraCentroOffsetPx(asset, renderedWidthPx) {
    if (!asset || !asset.centro || !miraEl || !miraEl.naturalWidth || !miraEl.naturalHeight) {
      return { dx: 0, dy: 0 };
    }
    var nw = miraEl.naturalWidth;
    var nh = miraEl.naturalHeight;
    var scale = (renderedWidthPx || miraEl.offsetWidth || nw) / nw;
    return {
      dx: (asset.centro.x - nw / 2) * scale,
      dy: (asset.centro.y - nh / 2) * scale
    };
  }

function arrowTargetPx(asset) {
    return CONFIG.arrowLongSidePercent * viewportLongSide() * assetScale(asset, CONFIG.scales.arrow);
  }

function pickRandomArrowName() {
    if (getResourceMode('arrows') === 'disabled') return null;
    var list = CONFIG.arrowImages;
    return list[Math.floor(Math.random() * list.length)];
  }

function stickArrowAt(x, y, score, targetRect) {
    var name = pickRandomArrowName();
    if (!name) return null;
    var arrowKey = name.replace('.png', '');
    var arrowAsset = resolveArcheryImage('arrows', arrowKey);
    if (!arrowAsset || !arrowAsset.archivo) return null;
    var arrowEl = document.createElement('img');
    arrowEl.alt = '';
    arrowEl.draggable = false;
    Object.assign(arrowEl.style, {
      position: 'fixed',
      left: x + 'px',
      top: y + 'px',
      zIndex: String((CONFIG.aimFocus && CONFIG.aimFocus.arrowZIndex != null)
        ? CONFIG.aimFocus.arrowZIndex
        : ((CONFIG.aimFocus && CONFIG.aimFocus.nearMissZIndex != null)
          ? CONFIG.aimFocus.nearMissZIndex
          : 9990)),
      pointerEvents: 'none',
      userSelect: 'none',
      // No permitir ni un frame en tamaño natural: la flecha queda invisible
      // hasta que conocemos sus dimensiones y aplicamos la escala del asset
      // resuelto (override del personaje o default del módulo).
      visibility: 'hidden',
      opacity: '1',
      transition: 'none'
    });

    function applyArrowSize(width, height) {
      assetDimsCache[name] = { width: width, height: height };
      applyLongSideFit(arrowEl, width, height, arrowTargetPx(arrowAsset));
      arrowEl.style.visibility = 'visible';
    }

    var cached = assetDimsCache[name];
    if (cached) {
      applyArrowSize(cached.width, cached.height);
    } else {
      arrowEl.addEventListener('load', function () {
        applyArrowSize(arrowEl.naturalWidth, arrowEl.naturalHeight);
      });
    }
    arrowEl.src = arrowAsset && arrowAsset.archivo ? arrowAsset.archivo : '';

    document.body.appendChild(arrowEl);
    var hasAnchor = !!(targetRect && targetRect.width && targetRect.height);
    var record = {
      el: arrowEl,
      x: x,
      y: y,
      score: score,
      // Offset fijo respecto del blanco (ver comentario de arriba). Sólo
      // tiene sentido si hasAnchor es true.
      anchorDx: hasAnchor ? (x - targetRect.left) : 0,
      anchorDy: hasAnchor ? (y - targetRect.top) : 0,
      hasAnchor: hasAnchor
    };
    stuckArrows.push(record);
    if (aimFocusActive) updateAimFocusArrowLayers();
    return record;
  }

function repositionStuckArrows() {
    if (!stuckArrows.length) return;
    var el = getTargetEl();
    if (!el) return;
    var rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    stuckArrows.forEach(function (item) {
      if (!item.hasAnchor) return;
      var nx = rect.left + item.anchorDx;
      var ny = rect.top + item.anchorDy;
      item.el.style.left = nx + 'px';
      item.el.style.top = ny + 'px';
    });
    if (aimFocusActive) updateAimFocusArrowLayers();
  }

function scheduleRepositionStuckArrows() {
    if (repositionArrowsRAF) return;
    repositionArrowsRAF = requestAnimationFrame(function () {
      repositionArrowsRAF = null;
      repositionStuckArrows();
    });
  }

function bindArrowRepositioning() {
    window.addEventListener('scroll', scheduleRepositionStuckArrows, { passive: true });
    window.addEventListener('resize', scheduleRepositionStuckArrows);
  }

function resetArrows() {
    stuckArrows.forEach(function (item) {
      if (item.el && item.el.parentNode) item.el.parentNode.removeChild(item.el);
    });
    stuckArrows = [];

    // Reset manual completo (v0.4): también corta cualquier cooldown /
    // desvanecimiento en curso, ya que no tendría sentido seguir esperando
    // a que "desaparezcan" flechas que este reset ya borró.
    if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
    arrowsInBatch = 0;
    andanadaStartedAt = null;
    batchScoreSum = 0; // v1.5: la tanda en curso queda incompleta, no se narra su suma
    cooldownUntil = 0;
    // Deliberadamente NO toca fatigueLevel/lateShotStreak/sessionArrowLog
    // (v0.5), calibOffsetX/Y (v0.8) ni defaultIdlePoseKey (v1.5): esto
    // sólo limpia las flechas clavadas en pantalla, no "descansa" el
    // brazo de Buddy, no borra el historial de la sesión, no recalibra la
    // mira, ni cambia cómo quedó Buddy tras la última tanda completa.
  }

function maxSingleArrowScore() {
    var max = 0;
    var resolution = getTargetResolution();
    var rings = resolution ? normalizeTargetRings(resolution.rings) : [];
    for (var i = 0; i < rings.length; i++) {
      if (rings[i].points > max) max = rings[i].points;
    }
    return max;
  }

function maxAndanadaScore() {
    return CONFIG.arrowLimit.countBeforeCooldown * maxSingleArrowScore();
  }

function getAuthForNameCapture() {
    var auth = window.Buddy && window.Buddy.auth;
    if (!auth || typeof auth.isAuthenticated !== 'function' || typeof auth.getUser !== 'function') return null;
    if (!auth.isAuthenticated()) return null;
    var user = auth.getUser() || {};
    if (user.name || user.nombre || user.firstName || user.nombrePila) return null;
    return auth;
  }

  function getBuddyAppID() {
    var buddy = window.Buddy || {};
    var config = buddy.config || {};
    var appID = CONFIG.appID || CONFIG.appId || buddy.appID || buddy.appId ||
      window.appID || window.appId || config.appID || config.appId;

    if (appID) return String(appID);

    var host = window.location && window.location.hostname;
    if (host) {
      var parts = host.split('.');
      if (parts.length >= 2) return parts[0];
    }
    return 'esta aplicación';
  }

  function startAuthenticationPrompt() {
    var auth = window.Buddy && window.Buddy.auth;
    if (!auth || typeof auth.startAuthenticationPrompt !== 'function') return false;

    // El botón de registro debe abrir exclusivamente el formulario de Auth
    // dentro del globo de Says. Chat no participa en este flujo.
    return auth.startAuthenticationPrompt();
  }

  function isArcheryHandlingAuthWelcome() {
    return false;
  }

  function handleAuthenticationForName(event) {
    var detail = event && event.detail ? event.detail : {};
    if (!detail.authenticated) return;
    // Auth es el único módulo que decide cuándo abrir frmUsr. Archery solo
    // conserva la necesidad de un saludo específico si la autenticación fue
    // provocada por una tanda que acababa de terminar.
    if (pendingAndanadaNameGreeting && detail.user && detail.user.name) {
      pendingAndanadaNameGreeting = false;
      var firstWord = String(detail.user.name).trim().split(/\s+/)[0];
      say('¡Hola ' + firstWord + '! desde ahora podré llamarte por tu nombre y recordar tus flechas jugadas', 'alegre');
    }
  }

  function narrateAndanadaTotal(total) {
    defaultIdlePoseKey = (total >= CONFIG.andanada.lowScorePoseThreshold) ? 'idle' : 'fail';

    var isPerfect = total >= maxAndanadaScore();
    var showPromo = isPerfect && CONFIG.andanada.promo.enabled;

    if (andanadaBubbleTimer) clearTimeout(andanadaBubbleTimer);
    andanadaBubbleTimer = setTimeout(function () {
      andanadaBubbleTimer = null;
      var displayMs = 2800;

      if (showPromo) {
        displayMs = CONFIG.andanada.promo.displayMs;
        var htmlTemplate = CONFIG.andanada.promo.bubbleHtml || getDialogue('andanada_promo_reward');
        var html = htmlTemplate.replace('{link}', buildWhatsAppLink());
        say(html, 'positivo', { html: true, promo: true, durationMs: displayMs });
      } else {
        var template = isPerfect
          ? (CONFIG.andanada.perfectMessage || getDialogue('andanada_perfect'))
          : (CONFIG.andanada.message || getDialogue('andanada_score'));
        say(template ? template.replace('{puntos}', total) : null,
            isPerfect ? 'positivo' : 'neutral',
            { durationMs: displayMs });
      }

      // Después de anunciar la suma: si el usuario ya está autenticado y
      // todavía no tiene nombre, Auth/Says se encargan del formulario.
      // Archery solo recuerda que, cuando el formulario sea resuelto, debe
      // emitir su saludo específico. Si no está autenticado, se invita a
      // iniciar sesión; después de la autenticación Auth abrirá frmUsr.
      var auth = window.Buddy && window.Buddy.auth;
      var isAuthenticated = !!(auth &&
        typeof auth.isAuthenticated === 'function' &&
        auth.isAuthenticated());

      if (isAuthenticated) {
        var authenticatedUser = auth.getUser ? (auth.getUser() || {}) : {};
        if (!authenticatedUser.name && !authenticatedUser.firstName) {
          pendingAndanadaNameGreeting = true;
        }
      } else if (window.Buddy.auth && window.Buddy.auth.enabled === true &&
                 window.Buddy.user && window.Buddy.user.config &&
                 window.Buddy.user.config.enabled === true) {
        pendingAndanadaNameGreeting = true;
        var appID = getBuddyAppID();
        say(
          'Si te registras en ' + appID + ' podré recordar tus juegos realizados y mostrarte tus mejoras',
          'sereno',
          {
            interactive: true,
            durationMs: displayMs,
            choices: [
              { label: 'login', value: 'login' },
              { label: 'cancelar', value: 'cancel' }
            ],
            onChoice: function (value) {
              if (value === 'login') return startAuthenticationPrompt();
              // 'cancel' (o cualquier otro valor): cierra la burbuja sin
              // autenticar. pendingAndanadaNameGreeting queda activo igual,
              // así que si el jugador se autentica más tarde por su cuenta,
              // el saludo con nombre sigue funcionando.
              return false;
            }
          }
        );
      }

      scheduleCalibrationMessage(displayMs);
    }, 2800);
  }

function md5(str) {
    function rotl(x, c) { return (x << c) | (x >>> (32 - c)); }

    function toUtf8Bytes(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i++) {
        var code = s.codePointAt(i);
        if (code > 0xFFFF) i++; // consumió un par subrogado
        if (code < 0x80) {
          bytes.push(code);
        } else if (code < 0x800) {
          bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
        } else if (code < 0x10000) {
          bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
        } else {
          bytes.push(0xF0 | (code >> 18), 0x80 | ((code >> 12) & 0x3F), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
        }
      }
      return bytes;
    }

    var S = [
      7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
      5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
      4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
      6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
    ];
    // K[i] = floor(abs(sin(i+1)) * 2^32), i = 0..63 (constante estándar
    // de MD5) — se calcula en vez de hardcodear 64 números mágicos.
    var K = new Array(64);
    for (var i = 0; i < 64; i++) K[i] = (Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296)) | 0;

    var bytes = toUtf8Bytes(str);
    var bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    // Longitud del mensaje en bits, 64 bits little-endian. Los 32 bits
    // altos quedan en 0: asume entradas de menos de ~2^29 bytes, de sobra
    // para los strings cortos que arma buildPromoCode().
    for (var i = 0; i < 4; i++) bytes.push((bitLen >>> (8 * i)) & 0xFF);
    for (var i = 0; i < 4; i++) bytes.push(0);

    var a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

    for (var chunkStart = 0; chunkStart < bytes.length; chunkStart += 64) {
      var M = new Array(16);
      for (var j = 0; j < 16; j++) {
        M[j] = bytes[chunkStart + j * 4] |
          (bytes[chunkStart + j * 4 + 1] << 8) |
          (bytes[chunkStart + j * 4 + 2] << 16) |
          (bytes[chunkStart + j * 4 + 3] << 24);
      }
      var A = a0, B = b0, C = c0, D = d0;
      for (var i = 0; i < 64; i++) {
        var F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
        else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        F = (F + A + K[i] + M[g]) | 0;
        A = D; D = C; C = B;
        B = (B + rotl(F, S[i])) | 0;
      }
      a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
    }

    function toHexLE(n) {
      var out = '';
      for (var i = 0; i < 4; i++) out += ('0' + ((n >>> (8 * i)) & 0xFF).toString(16)).slice(-2);
      return out;
    }

    return toHexLE(a0) + toHexLE(b0) + toHexLE(c0) + toHexLE(d0);
  }

function rotl(x, c) { return (x << c) | (x >>> (32 - c)); }

function toUtf8Bytes(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i++) {
        var code = s.codePointAt(i);
        if (code > 0xFFFF) i++; // consumió un par subrogado
        if (code < 0x80) {
          bytes.push(code);
        } else if (code < 0x800) {
          bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
        } else if (code < 0x10000) {
          bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
        } else {
          bytes.push(0xF0 | (code >> 18), 0x80 | ((code >> 12) & 0x3F), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
        }
      }
      return bytes;
    }

function toHexLE(n) {
      var out = '';
      for (var i = 0; i < 4; i++) out += ('0' + ((n >>> (8 * i)) & 0xFF).toString(16)).slice(-2);
      return out;
    }

function buildPromoCode() {
    var seed = Date.now() + ':' + Math.random().toString(36).slice(2);
    return md5(seed).slice(0, 6);
  }

function buildWhatsAppLink() {
    var promo = CONFIG.andanada.promo;
    var text = promo.whatsappMessage.replace('{hash}', buildPromoCode());
    return 'https://wa.me/' + promo.whatsappNumber + '?text=' + encodeURIComponent(text);
  }

function startArrowCooldown() {
    cooldownUntil = performance.now() + CONFIG.arrowLimit.cooldownMs;

    // Mira sin calibrar (v0.8): cada andanada completa (esta función se
    // llama exactamente en ese momento) es también la señal para ir
    // ajustando la mira una sola vez — reutiliza el mismo momento de
    // totalización en vez de llevar un contador propio. Si ya está centrada,
    // recalibrateMira() no hace nada.
    recalibrateMira();

    // Foto de las flechas a desvanecer: las clavadas hasta este instante
    // (la tanda que se acaba de completar). Cualquier flecha que se agregue
    // después de este punto pertenece a la tanda siguiente y no se toca acá.
    var batch = stuckArrows.slice();

    if (fadeTimer) clearTimeout(fadeTimer);
    fadeTimer = setTimeout(function () {
      fadeOutArrows(batch, CONFIG.arrowLimit.fadeDurationMs);
    }, CONFIG.arrowLimit.fadeStartMs);
  }

function fadeOutArrows(batch, durationMs) {
    batch.forEach(function (item) {
      if (!item.el) return;
      item.el.style.transition = 'opacity ' + durationMs + 'ms ease';
      // Fuerza reflow para que la transición dispare siempre, aunque el
      // elemento se haya creado recién.
      void item.el.offsetWidth;
      item.el.style.opacity = '0';
    });

    setTimeout(function () {
      batch.forEach(function (item) {
        if (item.el && item.el.parentNode) item.el.parentNode.removeChild(item.el);
        var idx = stuckArrows.indexOf(item);
        if (idx !== -1) stuckArrows.splice(idx, 1);
      });
    }, durationMs);
  }

function initCalibration() {
    if (!CONFIG.calibracion.enabled) {
      calibOffsetX = 0;
      calibOffsetY = 0;
      return;
    }
    var angle = Math.random() * Math.PI * 2;
    var span = CONFIG.calibracion.maxErrorPx - CONFIG.calibracion.minErrorPx;
    var magnitude = CONFIG.calibracion.minErrorPx + Math.random() * span;
    calibOffsetX = Math.cos(angle) * magnitude;
    calibOffsetY = Math.sin(angle) * magnitude;
  }

function recalibrateMira() {
    if (!CONFIG.calibracion.enabled) return;

    // Si ya está centrada, la calibración queda bloqueada: las siguientes
    // totalizaciones no vuelven a mover la mira.
    var currentMagnitude = Math.sqrt(
      calibOffsetX * calibOffsetX + calibOffsetY * calibOffsetY
    );
    if (currentMagnitude === 0) return;

    // Cada ajuste corrige aleatoriamente entre el 60% y el 100% del error
    // actual, conservando la dirección del desvío.
    var minPrecision = CONFIG.calibracion.minCorrectionPrecision;
    var maxPrecision = CONFIG.calibracion.maxCorrectionPrecision;
    var precision = minPrecision + Math.random() * (maxPrecision - minPrecision);
    var remainingMagnitude = currentMagnitude * (1 - precision);

    // A menos de 5 px del centro se considera perfectamente alineada.
    if (remainingMagnitude < CONFIG.calibracion.centerSnapThresholdPx) {
      calibOffsetX = 0;
      calibOffsetY = 0;
      return;
    }

    var scale = remainingMagnitude / currentMagnitude;
    calibOffsetX *= scale;
    calibOffsetY *= scale;
  }

function scheduleCalibrationMessage(afterMs) {
    if (!CONFIG.calibracion.enabled) return;
    if (calibrationBubbleTimer) clearTimeout(calibrationBubbleTimer);
    calibrationBubbleTimer = setTimeout(function () {
      calibrationBubbleTimer = null;
      say(CONFIG.calibracion.message || getDialogue('recalibrating'), 'neutral');
    }, afterMs);
  }

function logArrowShot(score, timestamp) {
    var entry = {
      index: sessionArrowLog.length + 1,
      timestamp: timestamp || Date.now(),
      score: score == null ? 0 : score,
      andanada: Math.floor(sessionArrowLog.length / CONFIG.arrowLog.arrowsPerAndanada) + 1
    };
    sessionArrowLog.push(entry);
    return entry;
  }

function recordArrowFired() {
    var now = performance.now();
    var timestamp = new Date().toISOString();
    arrowsFiredTotal++;

    if (arrowsInBatch === 0) {
      andanadaStartedAt = timestamp;
    }

    if (fatigueActiveNow()) {
      var elapsed = lastShotAt ? (now - lastShotAt) : Infinity;
      var decayedLevel = currentFatigueLevel(now);

      if (elapsed < CONFIG.fatigue.expectedCooldownMs) {
        // Disparo "apurado": no se esperó el cooldown esperado entre
        // flecha y flecha. Sube el temblor y la racha de disparos
        // apurados.
        fatigueLevel = Math.min(CONFIG.fatigue.maxLevel, decayedLevel + CONFIG.fatigue.increasePerLateShot);
        lateShotStreak++;
      } else {
        // Se respetó (al menos) el cooldown mínimo: el temblor queda en
        // el nivel ya decaído por el descanso, sin subir, y se corta la
        // racha de disparos apurados.
        fatigueLevel = decayedLevel;
        lateShotStreak = 0;
      }

      if (lateShotStreak >= CONFIG.fatigue.exhaustionStreak) {
        exhausted = true; // la pose04 / bloqueo se aplican en resolveTimer -> enterExhaustedIdle()
      }
    }

    lastShotAt = now;
    return timestamp;
  }

function enterExhaustedIdle() {
    state = 'exhausted';
    showPose('fail');
    say(CONFIG.fatigue.exhaustionMessage || getDialogue('exhaustion'), 'negativo');
    setDebug('estado: exhausted — el buddy necesita descansar el brazo…');
    scheduleExhaustionRecovery();
  }

function scheduleExhaustionRecovery() {
    clearExhaustionRecoveryTimer();
    exhaustionRecoveryTimer = setTimeout(recoverFromExhaustion, CONFIG.fatigue.exhaustionRestMs);
  }

function clearExhaustionRecoveryTimer() {
    if (exhaustionRecoveryTimer) { clearTimeout(exhaustionRecoveryTimer); exhaustionRecoveryTimer = null; }
  }

function recoverFromExhaustion() {
    exhausted = false;
    exhaustionRecoveryTimer = null;
    fatigueLevel = 0;
    lateShotStreak = 0;
    lastShotAt = 0;
    if (state === 'exhausted') {
      state = 'idle';
      showPose('idle');
      setDebug(idleDebugMessage());
    }
  }

function ensureElements() {
    // buddy.js es el único dueño del elemento del personaje.
    charEl = document.getElementById('buddy-character');

    if (!miraEl) {
      var miraMode = getResourceMode('mira');
      miraEl = document.createElement(miraMode === 'disabled' ? 'div' : 'img');
      miraEl.id = 'buddy-mira';
      miraEl.alt = '';
      miraEl.draggable = false;
      Object.assign(miraEl.style, {
        position: 'fixed',
        left: CONFIG.miraMarginPx + 'px',
        top: CONFIG.miraMarginPx + 'px',
        zIndex: String((CONFIG.aimFocus && CONFIG.aimFocus.miraZIndex != null) ? CONFIG.aimFocus.miraZIndex : 10020),
        pointerEvents: 'none',
        userSelect: 'none',
        display: 'none',
        visibility: 'hidden',
        willChange: 'transform'
      });
      if (miraMode === 'disabled') {
        miraEl.style.width = '1px';
        miraEl.style.height = '1px';
        miraEl.style.visibility = 'hidden';
      } else {
        miraEl.addEventListener('load', function () {
          var miraAsset = resolveArcheryImage('mira', 'mira');
          fitLongSide(miraEl, miraTargetPx(miraAsset));
          miraEl.style.visibility = 'visible';
        });
        var miraAsset = resolveArcheryImage('mira', 'mira');
        if (miraAsset && miraAsset.archivo) miraEl.src = miraAsset.archivo;
      }
      document.body.appendChild(miraEl);
    }

    if (!targetEl && !targetDisabled()) {
      targetEl = document.createElement('img');
      targetEl.id = 'buddy-target';
      targetEl.alt = '';
      targetEl.draggable = false;
      Object.assign(targetEl.style, {
        position: 'fixed',
        left: '16px',
        top: '16px',
        zIndex: String((CONFIG.aimFocus && CONFIG.aimFocus.targetZIndex != null) ? CONFIG.aimFocus.targetZIndex : 10000),
        pointerEvents: 'none',
        userSelect: 'none',
        display: 'none'
      });
      targetEl.addEventListener('load', function () {
        fitLongSide(targetEl, targetTargetPx());
      });

      // La imagen del fallback se resuelve con la misma precedencia que la
      // diana: página -> personaje -> módulo. Si existe una diana DOM de
      // página, este elemento queda oculto pero listo como respaldo.
      var initialResolution = getTargetResolution();
      if (initialResolution && initialResolution.asset && initialResolution.asset.archivo) {
        targetEl.src = initialResolution.asset.archivo;
      }
      document.body.appendChild(targetEl);
    }

    if (!debugEl) {
      debugEl = document.createElement('pre');
      debugEl.id = 'buddy-debug';
      Object.assign(debugEl.style, {
        position: 'fixed',
        left: '8px',
        bottom: '8px',
        zIndex: '10001',
        maxWidth: '90vw',
        margin: '0',
        padding: '6px 8px',
        background: 'rgba(0,0,0,.75)',
        color: '#fff',
        font: '12px/1.3 monospace',
        pointerEvents: 'none',
        display: 'none'
      });
      document.body.appendChild(debugEl);
    }

    updateTargetVisibility();
    return !!charEl;
  }


  // -------------------------------------------------------------------
  // Efecto de concentración durante el apuntado.
  //
  // El overlay usa backdrop-filter para desenfocar/oscurecer la página.
  // Una máscara radial deja una ventana nítida alrededor de la diana para
  // conservar visibles la diana y los misses cercanos. La diana/mira/
  // personaje/misses además se elevan explícitamente mediante z-index.
  // -------------------------------------------------------------------
  function aimFocusConfig() {
    return CONFIG.aimFocus || {};
  }

  function isAimBlurEnabled() {
    var cfg = aimFocusConfig();
    return cfg.enabled !== false && aimBlurRuntimeEnabled !== false;
  }

  function ensureAimFocusElement() {
    if (aimFocusEl) return aimFocusEl;

    aimFocusEl = document.createElement('div');
    aimFocusEl.id = 'buddy-aim-focus';
    aimFocusEl.setAttribute('aria-hidden', 'true');
    Object.assign(aimFocusEl.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '100vw',
      height: '100vh',
      margin: '0',
      padding: '0',
      pointerEvents: 'none',
      userSelect: 'none',
      display: 'none',
      opacity: '0',
      background: 'rgba(0,0,0,0)',
      zIndex: String((aimFocusConfig().overlayZIndex != null) ? aimFocusConfig().overlayZIndex : 9000),
      transition: 'opacity ' + ((aimFocusConfig().transitionMs != null) ? aimFocusConfig().transitionMs : 220) + 'ms ease'
    });

    document.body.appendChild(aimFocusEl);
    return aimFocusEl;
  }

  function restoreAimFocusTargetZ() {
    if (!aimFocusTargetEl || !aimFocusTargetEl.style) {
      aimFocusTargetEl = null;
      aimFocusTargetOriginalZ = null;
      return;
    }

    if (aimFocusTargetOriginalZ !== null) {
      aimFocusTargetEl.style.zIndex = aimFocusTargetOriginalZ;
    }
    aimFocusTargetEl = null;
    aimFocusTargetOriginalZ = null;
  }

  function elevateAimFocusElements() {
    var cfg = aimFocusConfig();

    if (charEl && charEl.style) {
      charEl.style.zIndex = String(cfg.characterZIndex != null ? cfg.characterZIndex : 9999);
    }

    if (miraEl && miraEl.style) {
      miraEl.style.zIndex = String(cfg.miraZIndex != null ? cfg.miraZIndex : 10020);
    }

    var target = getTargetEl();
    if (target && target.style) {
      if (aimFocusTargetEl !== target) {
        restoreAimFocusTargetZ();
        aimFocusTargetEl = target;
        aimFocusTargetOriginalZ = target.style.zIndex || '';
      }
      target.style.zIndex = String(cfg.targetZIndex != null ? cfg.targetZIndex : 10000);
    }
  }

  function updateAimFocusGeometry() {
    if (!aimFocusEl || !aimFocusActive) return;

    var cfg = aimFocusConfig();
    var target = getTargetEl();
    if (!target) return;

    var rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    var scale = Number(cfg.targetFocusScale);
    if (!isFinite(scale) || scale <= 0) scale = 2.25;

    var softness = Number(cfg.targetFocusSoftness);
    if (!isFinite(softness) || softness < 0) softness = 0.22;
    if (softness > 0.49) softness = 0.49;

    // Para una diana DOM de página, la abertura transparente central debe
    // medir exactamente el tamaño visual de la diana + 30%, para mantener
    // visibles las flechas perdidas cercanas. La suavidad del borde se suma
    // hacia afuera sin reducir esa abertura efectiva.
    var rx;
    var ry;
    if (isPageDomTarget(target)) {
      var extra = Number(pageTargetDomConfig().blurOpeningExtraPercent);
      if (!isFinite(extra) || extra < 0) extra = 0.30;
      var openingWidth = Math.max(rect.width, rect.height) * (1 + extra);
      var openingRadius = openingWidth / 2;
      var maskScale = Math.max(0.01, 1 - softness);
      rx = openingRadius / maskScale;
      ry = openingRadius / maskScale;
    } else {
      rx = Math.max(rect.width, rect.height) * scale / 2;
      ry = Math.max(rect.width, rect.height) * scale / 2;
      rx = Math.max(rx, rect.width * scale / 2);
      ry = Math.max(ry, rect.height * scale / 2);
    }

    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;

    aimFocusEl.style.setProperty('--buddy-aim-cx', cx + 'px');
    aimFocusEl.style.setProperty('--buddy-aim-cy', cy + 'px');
    aimFocusEl.style.setProperty('--buddy-aim-rx', rx + 'px');
    aimFocusEl.style.setProperty('--buddy-aim-ry', ry + 'px');

    // La máscara deja transparente el efecto en el centro y lo hace
    // aparecer progresivamente hacia el borde. El overlay sigue cubriendo
    // toda la pantalla, por lo que backdrop-filter funciona también sobre
    // páginas que no comparten el mismo stacking context.
    var transparentEnd = Math.max(0, 1 - softness);
    var mask = 'radial-gradient(ellipse var(--buddy-aim-rx) var(--buddy-aim-ry) at var(--buddy-aim-cx) var(--buddy-aim-cy), transparent 0, transparent ' +
      (transparentEnd * 100) + '%, black 100%)';

    aimFocusEl.style.webkitMaskImage = mask;
    aimFocusEl.style.maskImage = mask;
    aimFocusEl.style.webkitMaskRepeat = 'no-repeat';
    aimFocusEl.style.maskRepeat = 'no-repeat';
  }

  function updateAimFocusArrowLayers() {
    if (!stuckArrows.length) return;

    var cfg = aimFocusConfig();
    var target = getTargetEl();
    if (!target) return;

    var rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    var multiplier = Number(cfg.nearMissMultiplier);
    if (!isFinite(multiplier) || multiplier <= 0) multiplier = 1.35;

    var radius = Math.max(rect.width, rect.height) / 2 * multiplier;
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var nearZ = cfg.nearMissZIndex != null ? cfg.nearMissZIndex : 10010;

    stuckArrows.forEach(function (item) {
      if (!item.el) return;
      var x = item.x;
      var y = item.y;

      if (item.hasAnchor) {
        x = rect.left + item.anchorDx;
        y = rect.top + item.anchorDy;
      }

      var distance = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
      item.el.style.zIndex = String(
        (cfg.arrowZIndex != null)
          ? cfg.arrowZIndex
          : (nearZ != null ? nearZ : 10010)
      );
    });
  }

  function refreshAimFocus() {
    if (!aimFocusActive) return;
    elevateAimFocusElements();
    updateAimFocusGeometry();
    updateAimFocusArrowLayers();
  }

  function startPageTargetBlurSync() {
    if (pageTargetBlurSyncRunning) return;
    pageTargetBlurSyncRunning = true;

    function frame() {
      if (!aimFocusActive) {
        pageTargetBlurSyncRunning = false;
        return;
      }

      var target = getTargetEl();
      if (isPageDomTarget(target)) {
        updateAimFocusGeometry();
        updateAimFocusArrowLayers();
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  function showAimFocus() {
    if (!isAimBlurEnabled()) return;
    var el = ensureAimFocusElement();
    var cfg = aimFocusConfig();

    aimFocusActive = true;
    elevateAimFocusElements();
    updateAimFocusGeometry();
    updateAimFocusArrowLayers();

    var blurPx = Number(cfg.blurPx);
    if (!isFinite(blurPx) || blurPx < 0) blurPx = 7;

    var darkness = Number(cfg.darkness);
    if (!isFinite(darkness) || darkness < 0) darkness = 0.22;
    if (darkness > 1) darkness = 1;

    var fallbackDarkness = Number(cfg.fallbackDarkness);
    if (!isFinite(fallbackDarkness) || fallbackDarkness < 0) fallbackDarkness = 0.18;
    if (fallbackDarkness > 1) fallbackDarkness = 1;

    el.style.backdropFilter = 'blur(' + blurPx + 'px)';
    el.style.webkitBackdropFilter = 'blur(' + blurPx + 'px)';
    el.style.background = 'rgba(0,0,0,' + darkness + ')';

    if (window.CSS && CSS.supports &&
        !(CSS.supports('backdrop-filter', 'blur(1px)') ||
          CSS.supports('-webkit-backdrop-filter', 'blur(1px)'))) {
      el.style.backdropFilter = 'none';
      el.style.webkitBackdropFilter = 'none';
      el.style.background = 'rgba(0,0,0,' + fallbackDarkness + ')';
    }

    el.style.display = 'block';
    // Forzar el estado inicial para que la entrada tenga transición.
    requestAnimationFrame(function () {
      if (aimFocusEl && aimFocusActive) aimFocusEl.style.opacity = '1';
    });
  }

  function hideAimFocus() {
    if (!aimFocusEl) {
      aimFocusActive = false;
      restoreAimFocusTargetZ();
      return;
    }

    aimFocusActive = false;
    aimFocusEl.style.opacity = '0';
    restoreAimFocusTargetZ();

    var el = aimFocusEl;
    var ms = Number(aimFocusConfig().transitionMs);
    if (!isFinite(ms) || ms < 0) ms = 220;

    setTimeout(function () {
      if (!aimFocusActive && el === aimFocusEl) {
        el.style.display = 'none';
      }
    }, ms);
  }

  function setAimBlurEnabled(enabled) {
    aimBlurRuntimeEnabled = enabled !== false;
    if (!aimBlurRuntimeEnabled) {
      hideAimFocus();
      return false;
    }

    if (state === 'aiming') showAimFocus();
    return true;
  }

  function isAimBlurRuntimeEnabled() {
    return isAimBlurEnabled();
  }

function onResize() {
    if (aimFocusActive) refreshAimFocus();
    if (miraEl && miraEl.style.display !== 'none') {
      fitLongSide(miraEl, miraTargetPx(resolveArcheryImage('mira', 'mira')));
    }
    if (targetEl && targetEl.style.display !== 'none') {
      fitLongSide(targetEl, targetTargetPx());
    }
    repositionStuckArrows();
  }

function setDebug(text) {
    if (!debugEl) return;
    if (!CONFIG.debug || !text) {
      debugEl.style.display = 'none';
      return;
    }
    debugEl.style.display = 'block';
    debugEl.textContent = text;
  }

  function idleDebugMessage() {
    if (cooldownUntil && performance.now() < cooldownUntil) {
      var remaining = Math.ceil((cooldownUntil - performance.now()) / 1000);
      return 'estado: idle — buddy va por las flechas (' + remaining + 's)';
    }
    return 'estado: idle — mantené click/touch sobre el buddy';
  }

function idleDebugMessage() {
    if (cooldownUntil && performance.now() < cooldownUntil) {
      var remaining = Math.ceil((cooldownUntil - performance.now()) / 1000);
      return 'estado: idle — buddy va por las flechas (' + remaining + 's)';
    }
    return 'estado: idle — mantené click/touch sobre el buddy';
  }

function showPose(key) {
    currentCharPoseKey = key;

    var datosImagen;
    if (key === 'idle') {
      datosImagen = window.Buddy.resolveExpression('sereno');
    } else if (key === 'aim') {
      datosImagen = resolveArcheryImage('aim', 'apuntar');
    } else if (key === 'fire') {
      datosImagen = resolveArcheryImage('fire', 'liberar_flecha');
    } else {
      datosImagen = window.Buddy.resolveExpressionByCategory('negativo');
    }

    if (datosImagen) {
      window.Buddy.showCharacterImage(datosImagen);
      charEl = document.getElementById('buddy-character');
      bindCharacterEvents();
    }
  }

  var characterEventsBound = false;

  function bindCharacterEvents() {
    if (!charEl || characterEventsBound) return;
    characterEventsBound = true;
    charEl.addEventListener('pointerdown', onPointerDown);
    charEl.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

function showCharacter(preserveCurrentPose) {
    state = 'idle';
    ensureElements();

    // Cuando Says hace visible al personaje para mostrar una expresión,
    // Archery recibe el evento buddy:character-visible. En ese caso NO debe
    // imponer su pose idle (sereno), porque eso sobrescribiría inmediatamente
    // la expresión solicitada por Says.
    if (!preserveCurrentPose) {
      showPose(defaultIdlePoseKey);
    } else if (charEl) {
      bindCharacterEvents();
    }

    if (charEl) charEl.style.display = 'block';
    updateTargetVisibility();
    setDebug(idleDebugMessage());
  }

function hideCharacter() {
    hideAimFocus();
    clearAllTimers();
    cancelPageTargetRestoreTimer();
    restorePageTargetOriginal(false);
    pageTargetLastScoreSumAt = 0;
    detachAimListeners();
    stopTensSound();
    stopAimTremor();

    if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
    if (andanadaBubbleTimer) { clearTimeout(andanadaBubbleTimer); andanadaBubbleTimer = null; }
    if (calibrationBubbleTimer) { clearTimeout(calibrationBubbleTimer); calibrationBubbleTimer = null; }

    arrowsInBatch = 0;
    andanadaStartedAt = null;
    batchScoreSum = 0;
    cooldownUntil = 0;
    pendingAimRequest = false;

    if (charEl) {
      charEl.removeEventListener('pointerup', onPointerUpDuringPendingAimRequest);
      charEl.removeEventListener('pointercancel', onPointerCancelDuringPendingAimRequest);
      charEl.style.display = 'none';
    }

    clearExhaustionRecoveryTimer();
    exhausted = false;
    fatigueLevel = 0;
    lateShotStreak = 0;
    lastShotAt = 0;
    state = 'hidden';

    if (miraEl) { miraEl.style.display = 'none'; miraEl.style.visibility = 'hidden'; }
    if (targetEl) targetEl.style.display = 'none';
    setDebug('');
  }

function clearAllTimers() {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    if (maxHoldTimer) { clearTimeout(maxHoldTimer); maxHoldTimer = null; }
    if (resolveTimer) { clearTimeout(resolveTimer); resolveTimer = null; }
    if (hitTimer) { clearTimeout(hitTimer); hitTimer = null; }
  }

function onPointerDown(e) {
    // Un formulario bloqueante de Says tiene prioridad sobre el juego.
    if (window.Buddy && typeof window.Buddy.isBusy === 'function' && window.Buddy.isBusy()) return;

    // Agotamiento total (v0.5): si Buddy está en pose04 pidiendo descanso
    // (ver enterExhaustedIdle), no entra en pose de apuntado — sólo
    // recuerda que necesita descansar. Se revisa ANTES que 'idle' porque
    // 'exhausted' es un estado propio, distinto de 'idle'.
    if (state === 'exhausted') {
      say(CONFIG.fatigue.exhaustionMessage || getDialogue('exhaustion'), 'negativo');
      setDebug('estado: exhausted — Buddy necesita descansar el brazo…');
      return;
    }

    // v1.0: si Buddy está en 'resolved' pero TODAVÍA se ve pose02 (la
    // flecha recién soltada no terminó de resolverse), un nuevo
    // click/touch-and-drag sobre él NO cancela ese disparo — sigue su
    // curso normal (impacto, puntaje, sonido, `arrowLimit`, todo intacto,
    // ver hitTimer/resolveTimer más abajo en resolve()). Lo único que hace
    // este click es dejar en cola un pedido de apuntado: apenas esa
    // flecha termine de resolverse, en vez de volver a pose03 pasa
    // derecho a pose01, sin pasar por 'pending' ni por el toque largo de
    // siempre (ver el resolveTimer dentro de resolve()). No se aplica
    // sobre pose04 (fallo): ese caso sigue esperando a volver a 'idle'
    // como antes de esta versión.
    var canQueueAimRequest = (state === 'resolved' && currentCharPoseKey === 'fire');

    if (state !== 'idle' && !canQueueAimRequest) return;

    // Cooldown del carcaj (v0.4): si todavía no pasó CONFIG.arrowLimit.cooldownMs
    // desde que se completó la última tanda de CONFIG.arrowLimit.countBeforeCooldown
    // flechas, Buddy no entra en pose de apuntado — solo avisa que está yendo
    // por las flechas. Se sigue respetando igual al querer poner un pedido
    // en cola: no tendría sentido que un click salteara el cooldown del
    // carcaj.
    if (cooldownUntil && performance.now() < cooldownUntil) {
      say(CONFIG.arrowLimit.waitMessage || getDialogue('arrow_cooldown_wait'), 'neutral');
      setDebug(idleDebugMessage());
      return;
    }

    activePointerId = e.pointerId;
    try { charEl.setPointerCapture(activePointerId); } catch (err) { /* noop */ }

    if (canQueueAimRequest) {
      pendingAimRequest = true;
      pendingAimStartX = e.clientX;
      pendingAimStartY = e.clientY;
      charEl.addEventListener('pointerup', onPointerUpDuringPendingAimRequest);
      charEl.addEventListener('pointercancel', onPointerCancelDuringPendingAimRequest);
      setDebug(
        'estado: resolved (fire) — flecha en vuelo, arco listo para volver a tensar apenas llegue…'
      );
      return;
    }

    startX = e.clientX;
    startY = e.clientY;
    state = 'pending';
    setDebug('estado: pending — esperando toque largo…');

    longPressTimer = setTimeout(enterAimState, CONFIG.longPressThresholdMs);

    charEl.addEventListener('pointerup', onPointerUpDuringPending);
    charEl.addEventListener('pointercancel', onPointerCancel);
  }

function onPointerUpDuringPendingAimRequest() {
    if (!pendingAimRequest) return;
    pendingAimRequest = false;
    charEl.removeEventListener('pointerup', onPointerUpDuringPendingAimRequest);
    charEl.removeEventListener('pointercancel', onPointerCancelDuringPendingAimRequest);
  }

function onPointerCancelDuringPendingAimRequest() {
    onPointerUpDuringPendingAimRequest();
  }

function onPointerUpDuringPending() {
    if (state !== 'pending') return;
    charEl.removeEventListener('pointerup', onPointerUpDuringPending);
    clearAllTimers();
    state = 'idle';
    setDebug(idleDebugMessage());
  }

function onPointerCancel() {
    clearAllTimers();
    detachAimListeners();
    stopTensSound();
    stopAimTremor();
    charEl.removeEventListener('pointerup', onPointerUpDuringPending);
    if (state !== 'hidden') {
      state = 'idle';
      showPose(defaultIdlePoseKey); // v1.5: ver defaultIdlePoseKey
      if (miraEl) { miraEl.style.display = 'none'; miraEl.style.visibility = 'hidden'; }
      setDebug(idleDebugMessage());
    }
  }

function enterAimState() {
    if (state !== 'pending') return;
    charEl.removeEventListener('pointerup', onPointerUpDuringPending);
    state = 'aiming';
    aimStartedAt = performance.now();

    // Cada entrada a aiming revalida la diana DOM de página. Si su tamaño o
    // posición ya no coinciden con la configuración, se corrigen con una
    // transición progresiva; las dianas de personaje/módulo no se tocan.
    preparePageTargetForAiming();

    // Mientras se apunta no debe correr el retorno de un minuto: el tiempo
    // de inactividad se reanuda cuando termina esta interacción.
    cancelPageTargetRestoreTimer();

    // Desde este instante Buddy está ocupado: ningún mensaje automático de
    // Says puede aparecer mientras se apunta. Si había un mensaje de Says
    // visible justo antes de que comenzara la interacción, se cancela ahora
    // para que tampoco permanezca sobre la pose 'apuntar'. Los diálogos que
    // Archery genera mediante say() siguen permitidos porque forman parte de
    // la propia interacción del minijuego.
    if (window.Buddy && window.Buddy.says &&
        typeof window.Buddy.says.cancelarMensajeActual === 'function') {
      window.Buddy.says.cancelarMensajeActual();
    }

    showPose('aim');
    playTensSound();
    miraEl.style.display = 'block';
    if (getResourceMode('mira') === 'disabled') {
      // La mira visual está bloqueada por Archery, pero mantenemos un punto
      // virtual de 1x1 px para que la mecánica de puntería siga teniendo un
      // centro geométrico y pueda calcular el impacto sin cargar ninguna
      // imagen del personaje ni del módulo.
      miraEl.style.visibility = 'hidden';
    } else if (miraEl.complete && miraEl.naturalWidth) {
      fitLongSide(miraEl, miraTargetPx(resolveArcheryImage('mira', 'mira')));
      miraEl.style.visibility = 'visible';
    } else {
      miraEl.style.visibility = 'hidden';
    }
    miraBaseDx = 0;
    miraBaseDy = 0;
    miraEl.style.transform = 'translate(0px, 0px)';
    if (getResourceMode('mira') !== 'disabled') {
      fitLongSide(miraEl, miraTargetPx(resolveArcheryImage('mira', 'mira')));
    }

    // Efecto de concentración: se activa al entrar en aiming, pero puede
    // haber sido deshabilitado por CONFIG o por la API pública.
    showAimFocus();
    // La diana DOM se transforma con una transición CSS. El blur debe leer
    // su getBoundingClientRect() en cada frame para acompañar simultáneamente
    // el desplazamiento y el cambio de tamaño, no solo su estado inicial/final.
    startPageTargetBlurSync();

    // Arranca el pulso de latido (v0.4) en reposo: sin intensidad hasta que
    // el primer pointermove aporte una velocidad real que medir. El
    // temblor de cansancio (v0.5) no se "reinicia" acá — su fase visual
    // arranca de nuevo pero su NIVEL (fatigueLevel) es el que trae de
    // disparos anteriores, decaído según currentFatigueLevel(). El vaivén
    // en forma de 8 (v0.6) también arranca su fase de nuevo, pero su radio
    // depende del mismo currentFatigueLevel() recién descripto — no lleva
    // nivel propio.
    heartbeatIntensity = 0;
    heartbeatTargetIntensity = 0;
    heartbeatPhase = 0;
    fatiguePhase = 0;
    vaivenPhase = 0;
    lastVaivenRadiusPx = CONFIG.vaiven.baseRadiusPx;
    sostenidoPhase = 0;
    lastSostenidoIntensity = 0;
    lastPointerMoveAt = performance.now();
    lastPointerX = startX;
    lastPointerY = startY;
    lastTremorFrameAt = 0;
    startAimTremor();

    charEl.addEventListener('pointermove', onPointerMoveWhileAiming);
    charEl.addEventListener('pointerup', onPointerUpWhileAiming);
    charEl.addEventListener('pointercancel', onPointerCancel);

    // v2.0: el brazo se baja solo en algún punto entre forzarBajaMinMs y
    // forzarBajaMaxMs (10 a 14s), sorteado acá mismo para que sea un
    // instante distinto cada vez que se apunta, en vez de un cronómetro
    // fijo. Ver CONFIG.sostenido para el resto del handicap (el temblor
    // que lo precede desde los 4s).
    var forzarBajaMs = CONFIG.sostenido.forzarBajaMinMs +
      Math.random() * (CONFIG.sostenido.forzarBajaMaxMs - CONFIG.sostenido.forzarBajaMinMs);
    maxHoldTimer = setTimeout(function () {
      resolve('fail', 'brazo cansado (' + Math.round(forzarBajaMs) + 'ms)', CONFIG.sostenido.forzarBajaMensaje);
    }, forzarBajaMs);

    setDebug('estado: aiming — soltá antes de 8s para disparar bien');
  }

function aimTremorActive() {
    return !!CONFIG.heartbeat.enabled || fatigueActiveNow() || !!CONFIG.vaiven.enabled ||
      !!CONFIG.sostenido.enabled;
  }

function fatigueActiveNow() {
    return !!CONFIG.fatigue.enabled && arrowsFiredTotal >= CONFIG.fatigue.startAfterArrow;
  }

function currentFatigueLevel(now) {
    if (!lastShotAt) return 0;
    var restedMs = now - lastShotAt;
    if (restedMs < CONFIG.fatigue.restStartMs) return fatigueLevel;
    var steps = 1 + Math.floor((restedMs - CONFIG.fatigue.restStartMs) / CONFIG.fatigue.restStepMs);
    return Math.max(0, fatigueLevel - steps);
  }

function cadenciaMultiplier(now) {
    if (!CONFIG.cadencia.enabled || !lastShotAt) return 1;
    var gap = now - lastShotAt;
    if (gap >= CONFIG.cadencia.restMs) return 1;
    var intensity = 1 - (gap / CONFIG.cadencia.restMs); // 1 en gap≈0 → 0 en gap≥restMs
    return 1 + intensity * CONFIG.cadencia.maxExtraMultiplier;
  }

function startAimTremor() {
    if (!aimTremorActive()) return;
    if (aimTremorRAF) cancelAnimationFrame(aimTremorRAF);
    aimTremorRAF = requestAnimationFrame(aimTremorTick);
  }

function stopAimTremor() {
    if (aimTremorRAF) {
      cancelAnimationFrame(aimTremorRAF);
      aimTremorRAF = null;
    }
  }

function aimTremorTick(now) {
    if (state !== 'aiming' || !miraEl) {
      aimTremorRAF = null;
      return;
    }

    var dt = lastTremorFrameAt ? (now - lastTremorFrameAt) : 16;
    lastTremorFrameAt = now;

    var pulseX = 0;
    var pulseY = 0;

    // v1.0: multiplicador de cadencia (ver CONFIG.cadencia), calculado
    // una sola vez por frame y reutilizado por los tres temblores de
    // abajo — 1 si pasaron CONFIG.cadencia.restMs o más desde el último
    // disparo (distancias originales, sin efecto).
    var cadMult = cadenciaMultiplier(now);

    // v2.0: intensidad (0..1) del cansancio por sostener la mira (ver
    // CONFIG.sostenido). Se calcula acá, antes que todo lo demás, porque
    // el bloque de latido de abajo también la usa (empuja su piso
    // mínimo de intensidad, así "los latidos" se aceleran solos con el
    // tiempo sostenido, no solo con la velocidad real del puntero).
    var sostenidoIntensity = 0;
    if (CONFIG.sostenido.enabled) {
      var heldMs = now - aimStartedAt;
      if (heldMs > CONFIG.sostenido.startAfterMs) {
        var span = CONFIG.sostenido.imposibleEnMs - CONFIG.sostenido.startAfterMs;
        var progress = Math.min(1, (heldMs - CONFIG.sostenido.startAfterMs) / span);
        // Curva exponencial real (no lineal): arranca casi plana y se
        // dispara cerca de imposibleEnMs, tal como pidió el diseño
        // ("el incremento aumenta exponencialmente cada segundo").
        var k = CONFIG.sostenido.growthRate;
        sostenidoIntensity = (Math.exp(k * progress) - 1) / (Math.exp(k) - 1);
      }
    }
    lastSostenidoIntensity = sostenidoIntensity;

    // --- Latido (v0.4) ---------------------------------------------
    if (CONFIG.heartbeat.enabled) {
      // Si el puntero real no se movió en los últimos stillnessMs, el
      // objetivo de intensidad decae a 0 (reposo) aunque el último tramo
      // medido haya sido brusco — así el pulso se calma solo al dejar de
      // mover el dedo/mouse, no solo al soltar.
      if (now - lastPointerMoveAt > CONFIG.heartbeat.stillnessMs) {
        heartbeatTargetIntensity = 0;
      }

      // v2.0: sostener mucho tiempo pone un piso mínimo a la intensidad
      // del latido, aunque el puntero esté quieto (ver sostenidoIntensity
      // arriba). Nunca la baja: sólo puede subirla por encima de lo que
      // ya haya puesto el movimiento real del puntero.
      heartbeatTargetIntensity = Math.max(heartbeatTargetIntensity, sostenidoIntensity);

      var rate = (heartbeatTargetIntensity > heartbeatIntensity)
        ? CONFIG.heartbeat.intensityAttackPerSec
        : CONFIG.heartbeat.intensityReleasePerSec;
      var step = rate * (dt / 1000);
      if (heartbeatTargetIntensity > heartbeatIntensity) {
        heartbeatIntensity = Math.min(heartbeatTargetIntensity, heartbeatIntensity + step);
      } else {
        heartbeatIntensity = Math.max(heartbeatTargetIntensity, heartbeatIntensity - step);
      }

      var bpm = CONFIG.heartbeat.restBpm +
        (CONFIG.heartbeat.maxBpm - CONFIG.heartbeat.restBpm) * heartbeatIntensity;
      var hz = bpm / 60;
      heartbeatPhase += 2 * Math.PI * hz * (dt / 1000);

      var amplitude = (CONFIG.heartbeat.restAmplitudePx +
        (CONFIG.heartbeat.maxAmplitudePx - CONFIG.heartbeat.restAmplitudePx) * heartbeatIntensity) * cadMult;

      // Forma "lub-dub": dos lóbulos por ciclo (el segundo más chico y
      // desfasado), para que se sienta más a un latido real que a un seno
      // simple.
      var wave = Math.sin(heartbeatPhase) + 0.35 * Math.sin(2 * heartbeatPhase - 0.6);
      var pulse = wave * amplitude;

      // Temblor errático: ruido aleatorio que solo se nota con intensidad
      // alta (movimiento brusco reciente). También escalado por cadMult,
      // igual que el pulso principal (ver CONFIG.cadencia).
      var jitterX = (Math.random() * 2 - 1) * CONFIG.heartbeat.jitterPx * heartbeatIntensity * cadMult;
      var jitterY = (Math.random() * 2 - 1) * CONFIG.heartbeat.jitterPx * heartbeatIntensity * cadMult;

      // El pulso principal se siente sobre todo en el eje vertical (como
      // un latido real), con una fracción menor en horizontal, más el
      // temblor errático en ambos ejes.
      pulseX += pulse * 0.35 + jitterX;
      pulseY += pulse + jitterY;
    }

    // --- Cansancio muscular (v0.5) ----------------------------------
    if (fatigueActiveNow()) {
      var level = currentFatigueLevel(now);
      if (level > 0) {
        fatiguePhase += 2 * Math.PI * CONFIG.fatigue.shakeHz * (dt / 1000);
        var fatigueAmplitude = level * CONFIG.fatigue.amplitudePerLevelPx * cadMult;
        // Sacudida más errática que el latido: dos frecuencias no
        // múltiplo exacto entre sí, para que no se sienta como un simple
        // vaivén regular.
        var fatigueWave = Math.sin(fatiguePhase) + 0.5 * Math.sin(1.7 * fatiguePhase + 1.1);
        var fatigueJitterX = (Math.random() * 2 - 1) * level * CONFIG.fatigue.jitterPerLevelPx * cadMult;
        var fatigueJitterY = (Math.random() * 2 - 1) * level * CONFIG.fatigue.jitterPerLevelPx * cadMult;
        pulseX += fatigueWave * fatigueAmplitude + fatigueJitterX;
        pulseY += fatigueWave * fatigueAmplitude * 0.8 + fatigueJitterY;
      }
    }

    // --- Cansancio por sostener la mira (v2.0) -----------------------
    // Sacudida propia, sumada encima de todo lo anterior. No hace nada
    // antes de startAfterMs (sostenidoIntensity queda en 0); de ahí en
    // adelante crece con la curva exponencial calculada arriba, hasta
    // volverse lo bastante grande como para que apuntar sea imposible
    // en la práctica cerca de imposibleEnMs.
    if (sostenidoIntensity > 0) {
      sostenidoPhase += 2 * Math.PI * CONFIG.sostenido.shakeHz * (dt / 1000);
      var sostenidoAmplitude = CONFIG.sostenido.maxAmplitudePx * sostenidoIntensity * cadMult;
      var sostenidoWave = Math.sin(sostenidoPhase) + 0.6 * Math.sin(1.9 * sostenidoPhase + 0.4);
      var sostenidoJitterX = (Math.random() * 2 - 1) * CONFIG.sostenido.maxJitterPx * sostenidoIntensity * cadMult;
      var sostenidoJitterY = (Math.random() * 2 - 1) * CONFIG.sostenido.maxJitterPx * sostenidoIntensity * cadMult;
      pulseX += sostenidoWave * sostenidoAmplitude + sostenidoJitterX;
      pulseY += sostenidoWave * sostenidoAmplitude * 0.85 + sostenidoJitterY;
    }

    // --- Vaivén en forma de 8 (v0.6) --------------------------------
    if (CONFIG.vaiven.enabled) {
      // Reutiliza el mismo nivel de cansancio que ya calcula `fatigue`
      // (decaído en vivo por currentFatigueLevel) para agrandar el 8 — sin
      // cansancio acumulado (nivel 0, o fatigue.enabled=false) queda fijo
      // en baseRadiusPx. v1.0: ese radio se escala además por cadMult
      // (CONFIG.cadencia) — recién disparado, el mismo nivel de cansancio
      // produce un 8 más grande que tras varios segundos de pausa.
      var vaivenLevel = currentFatigueLevel(now);
      var vaivenRadius = (CONFIG.vaiven.baseRadiusPx +
        vaivenLevel * CONFIG.vaiven.radiusPerFatigueLevelPx) * cadMult;
      lastVaivenRadiusPx = vaivenRadius;

      vaivenPhase += 2 * Math.PI * CONFIG.vaiven.hz * (dt / 1000);

      // Curva de Lissajous 1:2 (relación de frecuencias x:y = 1:2): traza
      // un "8" acostado de ancho 2·vaivenRadius y alto vaivenRadius,
      // centrado en (0,0) — se suma sobre la posición base igual que el
      // latido y el cansancio.
      pulseX += vaivenRadius * Math.sin(vaivenPhase);
      pulseY += vaivenRadius * 0.5 * Math.sin(2 * vaivenPhase);
    }

    miraEl.style.transform =
      'translate(' + (miraBaseDx + pulseX) + 'px, ' + (miraBaseDy + pulseY) + 'px)';

    aimTremorRAF = requestAnimationFrame(aimTremorTick);
  }

function detachAimListeners() {
    if (!charEl) return;
    charEl.removeEventListener('pointermove', onPointerMoveWhileAiming);
    charEl.removeEventListener('pointerup', onPointerUpWhileAiming);
    charEl.removeEventListener('pointercancel', onPointerCancel);
  }

function onPointerMoveWhileAiming(e) {
    if (state !== 'aiming') return;

    if (e.clientX < window.innerWidth / 2) {
      resolve('fail', 'puntero cruzó a la mitad izquierda de la pantalla');
      return;
    }

    // --- Latidos (v0.4): estima la velocidad real del puntero entre este
    // evento y el anterior (px/ms) para fijar el objetivo de intensidad del
    // pulso — ver heartbeatTick, que es quien de verdad pinta el temblor en
    // cada frame. Se mide acá porque solo pointermove conoce el
    // desplazamiento real del dedo/mouse entre dos instantes.
    var now = performance.now();
    var moveDt = now - lastPointerMoveAt;
    if (moveDt > 0) {
      var moved = Math.hypot(e.clientX - lastPointerX, e.clientY - lastPointerY);
      var velocity = moved / moveDt;
      var normalized = velocity / CONFIG.heartbeat.velocityForMaxIntensity;
      heartbeatTargetIntensity = Math.max(0, Math.min(1, normalized));
    }
    lastPointerMoveAt = now;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;

    var dx = (e.clientX - startX) * CONFIG.aimSensitivity;
    var dy = (e.clientY - startY) * CONFIG.aimSensitivity;
    miraBaseDx = -dx;
    miraBaseDy = -dy;
    // El transform real (posición base + temblores) lo termina de pintar
    // aimTremorTick en el próximo frame — acá solo actualizamos el
    // objetivo "sin temblor", para no pelear por la escritura del estilo
    // entre este handler y el loop de animación. Excepción: si ni el
    // latido ni el cansancio están activos (aimTremorTick nunca corre),
    // hay que pintar la posición base acá mismo o la mira quedaría
    // congelada.
    if (!aimTremorActive()) {
      miraEl.style.transform = 'translate(' + miraBaseDx + 'px, ' + miraBaseDy + 'px)';
    }

    // Regla (v0.3, ajustada en v0.4): la MIRA en sí (no solo el puntero
    // real) tampoco puede terminar en la mitad DERECHA de la pantalla — es
    // el lado de buddy, no el del blanco, así que ninguna flecha debería
    // poder clavarse ahí. Se calcula de forma analítica sobre la posición
    // BASE (sin el pulso del latido, que es demasiado chico/errático como
    // para decidir un fallo por sí solo) usando offsetWidth/Height, que no
    // se ven afectados por `transform`.
    var mWidth = miraEl.offsetWidth;
    var mHeight = miraEl.offsetHeight;
    var miraCenterX = CONFIG.miraMarginPx + miraBaseDx + mWidth / 2;
    var miraCenterY = CONFIG.miraMarginPx + miraBaseDy + mHeight / 2;
    if (miraCenterX >= window.innerWidth / 2) {
      // v0.4: mensaje específico ("no apuntar tan lejos de la diana") en
      // vez del MISS genérico — la mira se alejó demasiado del blanco.
      resolve('fail', 'la mira cruzó a la mitad derecha de la pantalla', getDialogue('aim_too_far'));
      return;
    }

    // Zona de "sabiduría" (CONFIG.wisdomZone): si la mira cae en el cuarto
    // inferior de la VENTANA VISIBLE (viewport) — equivalente a apuntar
    // hacia abajo, al suelo, en vez de hacia el blanco — Buddy decide no
    // disparar. Se calcula con window.innerHeight, igual que la regla de
    // arriba (mitad de pantalla), no con el alto del documento completo.
    // A diferencia de esa regla, esto NO es un fallo: resolve('wisdom', ...)
    // vuelve derecho a pose03 en vez de pose04/MISS (ver la rama 'wisdom'
    // dentro de resolve()).
    var wisdomThresholdY = window.innerHeight * (1 - CONFIG.wisdomZone.bottomFraction);
    if (miraCenterY >= wisdomThresholdY) {
      resolve('wisdom', 'la mira apuntó al cuarto inferior de la ventana visible');
      return;
    }

    if (CONFIG.debug) {
      // v0.8: el preview de puntería en debug también aplica el desvío de
      // calibración, para poder ver en vivo el puntaje REAL esperado (no
      // sólo el visual) mientras se ajustan los valores de CONFIG.calibracion.
      var preview = computeScore(miraCenterX + calibOffsetX, miraCenterY + calibOffsetY);
      var fatigueNow = fatigueActiveNow() ? currentFatigueLevel(now) : 0;
      var calibMagnitude = Math.sqrt(calibOffsetX * calibOffsetX + calibOffsetY * calibOffsetY);
      // v1.0: multiplicador de cadencia actual (ver CONFIG.cadencia),
      // mostrado como % extra sobre las distancias originales — 0% si
      // pasaron CONFIG.cadencia.restMs o más desde el último disparo.
      var cadenciaExtraPct = Math.round((cadenciaMultiplier(now) - 1) * 100);
      setDebug(
        'estado: aiming — dx:' + Math.round(dx) + ' dy:' + Math.round(dy) +
        ' — puntería actual: ' + (preview != null ? preview : 'miss') +
        ' — pulso: ' + Math.round(heartbeatIntensity * 100) + '%' +
        ' — cansancio: ' + fatigueNow + '/' + CONFIG.fatigue.maxLevel +
        ' — vaivén: ' + Math.round(lastVaivenRadiusPx) + 'px' +
        ' — calibración: ' + Math.round(calibMagnitude) + 'px de error' +
        ' — cadencia: +' + cadenciaExtraPct + '%' +
        ' — sostenido: ' + Math.round(lastSostenidoIntensity * 100) + '%'
      );
    }
  }

function onPointerUpWhileAiming() {
    if (state !== 'aiming') return;
    var elapsed = performance.now() - aimStartedAt;
    if (elapsed <= CONFIG.fireWindowMs) {
      resolve('fire', 'soltó a los ' + Math.round(elapsed) + 'ms');
    } else {
      resolve('fail', 'soltó tarde (' + Math.round(elapsed) + 'ms)');
    }
  }

function sendAndanadaTelemetry(andanada) {
    var data = {
      event: 'archeryGame.andanada',
      module: 'archeryGame',
      data: {
        andanada: andanada
      }
    };

    if (!window.Buddy || !window.Buddy.telemetry ||
        typeof window.Buddy.telemetry.send !== 'function') {
      if (window.BuddyConfig && window.BuddyConfig.debugMode === true) {
        console.log('[Buddy] Telemetry no disponible para archeryGame.andanada');
      }
      return false;
    }

    if (!window.Buddy.telemetry.config || window.Buddy.telemetry.config.enabled === false) {
      if (window.BuddyConfig && window.BuddyConfig.debugMode === true) {
        console.log('[Buddy] Telemetry deshabilitado para archeryGame.andanada');
      }
      return false;
    }

    return window.Buddy.telemetry.send(data);
  }

function resolve(outcome, reasonLabel, failBubbleText) {
    hideAimFocus();
    clearAllTimers();
    detachAimListeners();
    stopTensSound();
    stopAimTremor();
    state = 'resolved';

    // La diana DOM debe permanecer en su tamaño/posición de juego durante
    // toda la interacción. El timer de retorno se inicia EXCLUSIVAMENTE
    // después de completar la sumatoria de la andanada (markPageTargetScoreSum),
    // nunca al resolver cada disparo.

    if (outcome === 'fire') {
      // Centro visual REAL de la mira (incluye el offset espejado y
      // amplificado ya aplicado), tomado ANTES de ocultarla — con
      // display:none el elemento colapsa a 0×0 y getBoundingClientRect()
      // devolvería la esquina superior izquierda, así que este orden
      // importa. Se guarda ahora aunque la flecha recién se clave después
      // del delay de impacto, para que el puntaje sea el del instante de
      // soltar.
      var rect = miraEl.getBoundingClientRect();
      // v2.1: corrige el centro geométrico de la caja por el verdadero
      // centro del peep sight (asset.centro), si el personaje lo definió.
      var miraAssetForCentro = resolveArcheryImage('mira', 'mira');
      var centroOffset = miraCentroOffsetPx(miraAssetForCentro, rect.width);
      var centerX = rect.left + rect.width / 2 + centroOffset.dx;
      var centerY = rect.top + rect.height / 2 + centroOffset.dy;

      miraEl.style.display = 'none';

      // Momento del disparo: pose02 (flecha ya liberada) + disparo.mp3.
      // También el momento que cuenta para el cansancio (v0.5): "el
      // cooldown entre una flecha y otra" se mide de disparo a disparo,
      // no de impacto a impacto (el delay de impacto es de sólo
      // CONFIG.hitDelayMs, insignificante frente a los ~segundos de
      // fatigue).
      showPose('fire');
      playShotSound();
      var shotTimestamp = recordArrowFired();
      setDebug(
        'estado: resolved (fire) — ' + reasonLabel + ' — esperando impacto…'
      );

      // Momento del impacto, CONFIG.hitDelayMs después: golpe.mp3 suena
      // junto con la flecha clavándose y el cálculo/globo de puntaje.
      hitTimer = setTimeout(function () {
        // v0.7: se lee el rect del blanco UNA sola vez acá y se reutiliza
        // tanto para el puntaje como para anclar la flecha al blanco (ver
        // stickArrowAt / repositionStuckArrows) — así ambos cálculos usan
        // exactamente la misma posición del logo real, sin importar si
        // hubo scroll entre el disparo y el impacto (CONFIG.hitDelayMs).
        var targetElNow = getTargetEl();
        var targetRect = targetElNow ? targetElNow.getBoundingClientRect() : null;

        // v0.8: mira sin calibrar (CONFIG.calibracion) — el punto de
        // impacto real se desvía de (centerX, centerY), el centro visual
        // que el jugador vio al soltar, según calibOffsetX/Y. El puntaje
        // y la flecha clavada usan este punto desviado; nada más en el
        // juego (ni la mira dibujada, ni la validez de apuntado) se ve
        // afectado por este desvío.
        var impactX = centerX + calibOffsetX;
        var impactY = centerY + calibOffsetY;

        var score = computeScore(impactX, impactY, targetRect);
        stickArrowAt(impactX, impactY, score, targetRect);
        playHitSound();
        logArrowShot(score, shotTimestamp); // v0.5: registro de la sesión
        var bubbleText = (score != null)
          ? (getDialogue('score_' + score) || ('¡Eso fue un ' + score + '!'))
          : getDialogue('miss');
        say(bubbleText, (score != null && score >= 8) ? 'positivo' : (score != null ? 'neutral' : 'negativo'));
        setDebug(
          'estado: resolved (fire) — ' + reasonLabel + ' — ' + bubbleText +
          ' — flechas clavadas: ' + stuckArrows.length
        );

        // Límite de flechas (v0.4): esta flecha recién clavada cuenta para
        // la tanda actual. Al completar CONFIG.arrowLimit.countBeforeCooldown,
        // arranca el cooldown y se reinicia el conteo para la próxima tanda.
        // v1.5: batchScoreSum acompaña a arrowsInBatch flecha a flecha (un
        // miss suma 0) y se narra/reinicia en el mismo momento.
        arrowsInBatch++;
        batchScoreSum += (score != null ? score : 0);
        if (arrowsInBatch >= CONFIG.arrowLimit.countBeforeCooldown) {
          var andanadaEntries = sessionArrowLog.slice(-arrowsInBatch);
          var andanada = {
            iniciada: andanadaStartedAt,
            completada: new Date().toISOString(),
            cantidad: andanadaEntries.length,
            flechas: andanadaEntries.map(function (entry, index) {
              return {
                numero: index + 1,
                valor: entry.score,
                timestamp: entry.timestamp
              };
            }),
            total: batchScoreSum
          };

          startArrowCooldown();
          narrateAndanadaTotal(batchScoreSum);
          markPageTargetScoreSum();
          sendAndanadaTelemetry(andanada);

          // Si la andanada alcanza el umbral de 55 puntos, actualizamos
          // inmediatamente el ranking público después de comunicar el evento
          // de telemetry. La API top10 también guarda automáticamente el
          // resultado en localStorage.
          if (batchScoreSum >= 55) {
            obtenerTop10().catch(function (error) {
              if (window.BuddyConfig && window.BuddyConfig.debugMode === true) {
                console.warn('[Buddy] No se pudo actualizar archeryGame/top10 después de la andanada.', error);
              }
            });
          }

          arrowsInBatch = 0;
          batchScoreSum = 0;
          andanadaStartedAt = null;
        }
      }, CONFIG.hitDelayMs);
    } else if (outcome === 'wisdom') {
      // Zona de "sabiduría" (CONFIG.wisdomZone): NO es un fallo — Buddy
      // elige conscientemente no disparar, así que vuelve derecho a su
      // pose de reposo (idle/pose03 salvo que la última andanada haya
      // sido floja — ver defaultIdlePoseKey), nunca a pose04 por MISS.
      var wisdomText = failBubbleText || getDialogue('arm_lowered_early');
      miraEl.style.display = 'none';
      showPose(defaultIdlePoseKey); // v1.5: ver defaultIdlePoseKey
      say(wisdomText, 'neutral');
      setDebug('estado: resolved (wisdom) — ' + reasonLabel + ' — ' + wisdomText);
    } else {
      miraEl.style.display = 'none';
      showPose('fail');
      var failText = failBubbleText || getDialogue('miss');
      say(failText, 'negativo');
      setDebug('estado: resolved (fail) — ' + reasonLabel + ' — ' + failText);
    }

    resolveTimer = setTimeout(function () {
      // v1.0: si mientras esta flecha volaba/resolvía el jugador ya hizo
      // click/touch-and-drag sobre buddy (ver pendingAimRequest en
      // onPointerDown), acá es donde se lo honra o se lo descarta — el
      // pedido nunca tocó el disparo que se acaba de terminar de resolver.
      var hadPendingAimRequest = pendingAimRequest;
      if (hadPendingAimRequest) {
        pendingAimRequest = false;
        charEl.removeEventListener('pointerup', onPointerUpDuringPendingAimRequest);
        charEl.removeEventListener('pointercancel', onPointerCancelDuringPendingAimRequest);
      }

      // v0.5: si el disparo que se acaba de resolver dejó a Buddy agotado
      // (ver recordArrowFired -> exhausted = true), en vez de volver a
      // pose03 se lo deja en pose04 pidiendo descanso — sólo descansando
      // CONFIG.fatigue.exhaustionRestMs vuelve solo a pose03 (ver
      // recoverFromExhaustion). El pedido en cola, si había, se descarta:
      // agotado no se puede volver a apuntar aunque ya se haya clickeado.
      if (exhausted) {
        enterExhaustedIdle();
        return;
      }

      // Cooldown del carcaj (v0.4): si ESTA flecha fue la que completó la
      // tanda y disparó el cooldown, un pedido en cola tampoco lo saltea
      // — se descarta igual que si el click hubiera llegado recién ahora
      // durante el cooldown (ver el mismo chequeo en onPointerDown).
      var cooldownActive = cooldownUntil && performance.now() < cooldownUntil;

      if (hadPendingAimRequest && !cooldownActive) {
        // Pasa derecho a pose01 con la posición del click que quedó en
        // cola, sin pasar por 'pending' ni por el toque largo de siempre.
        startX = pendingAimStartX;
        startY = pendingAimStartY;
        state = 'pending';
        enterAimState();
        return;
      }

      state = 'idle';
      showPose(defaultIdlePoseKey); // v1.5: ver defaultIdlePoseKey
      setDebug(idleDebugMessage());
    }, CONFIG.resolveDisplayMs);
  }

function onTestTriggerClick(e) {
    testTriggerClickCount++;

    if (testTriggerClickTimer) {
      clearTimeout(testTriggerClickTimer);
    }
    testTriggerClickTimer = setTimeout(function () {
      testTriggerClickCount = 0;
      testTriggerClickTimer = null;
    }, CONFIG.testTrigger.windowMs);

    if (testTriggerClickCount < CONFIG.testTrigger.clicksToTrigger) return;

    testTriggerClickCount = 0;
    clearTimeout(testTriggerClickTimer);
    testTriggerClickTimer = null;

    // El triple click solo invoca al personaje cuando está oculto.
    // No se utiliza para desactivar un personaje que ya fue mostrado por
    // Says u otro módulo activo.
    if (state === 'hidden') {
      showCharacter();
    }
    // Si está visible o en una partida en curso, el triple click no hace nada.
  }

function registerBusyProvider() {
    if (!window.Buddy || typeof window.Buddy.registerBusyProvider !== 'function') {
      return false;
    }

    window.Buddy.registerBusyProvider('archeryGame', function () {
      return state !== 'idle' && state !== 'hidden';
    });
    return true;
  }

function init() {
    var missing = [];
    if (!window.Buddy || typeof window.Buddy.resolveAsset !== 'function') missing.push('window.Buddy.resolveAsset');
    if (!window.Buddy || typeof window.Buddy.resolveExpression !== 'function') missing.push('window.Buddy.resolveExpression');
    if (!window.Buddy || typeof window.Buddy.resolveExpressionByCategory !== 'function') missing.push('window.Buddy.resolveExpressionByCategory');
    if (!window.Buddy || typeof window.Buddy.showCharacterImage !== 'function') missing.push('window.Buddy.showCharacterImage');
    if (typeof window.buddy_says !== 'function') missing.push('window.buddy_says');

    if (missing.length) {
      console.error('[buddy_archeryGame] No se pudo inicializar: faltan APIs: ' + missing.join(', '));
      return;
    }

    // Registrar el proveedor de ocupado desde init(), cuando Buddy ya está
    // disponible. Esto evita depender del orden en que el navegador cargue
    // buddy.js y este módulo. Mientras el estado sea pending/aiming/resolved/
    // exhausted, las fuentes automáticas de Says deben considerar ocupado a
    // Buddy.
    registerBusyProvider();

    preloadAssets();
    ensureElements();
    bindArrowRepositioning();
    window.addEventListener('resize', onResize);
    initCalibration();

    // Buddy es quien decide cuándo el personaje está visible. Si cualquier
    // módulo (por ejemplo Says) lo hace visible, Archery debe activarse de
    // inmediato si está habilitado, sin exigir triple click.
    window.addEventListener('buddy:character-visible', function () {
      if (state === 'hidden') {
        // La visibilidad fue provocada por otro módulo (por ejemplo Says).
        // Activamos Archery sin cambiar la expresión que acaba de solicitar
        // el módulo que hizo visible al personaje.
        showCharacter(true);
      }
    });

    // Si Buddy ya estaba visible antes de que este módulo terminara de
    // inicializarse, el evento de visibilidad pudo haber ocurrido antes de
    // registrar el listener. En ese caso no esperamos un nuevo triple click:
    // Archery debe quedar activo inmediatamente.
    if (window.Buddy && typeof window.Buddy.isCharacterVisible === 'function' &&
        window.Buddy.isCharacterVisible() && state === 'hidden') {
      showCharacter(true);
    }

    // El triple click queda únicamente como mecanismo de INVOCACIÓN cuando
    // Buddy está oculto. Una vez visible, no debe desactivar Archery ni
    // apagar el personaje que otro módulo acaba de activar.
    document.addEventListener('click', onTestTriggerClick);
  }


  // ---------------------------------------------------------------------
  // API pública del módulo
  // ---------------------------------------------------------------------
  window.Buddy = window.Buddy || {};
  // Restaura la pose que corresponde al estado REAL de la partida.
  // Says puede cambiar temporalmente la imagen para acompañar un mensaje,
  // pero no debe dejar a Archery en sereno si el jugador sigue apuntando o
  // si la flecha todavía está en vuelo.
  function restoreCurrentPose() {
    if (state === 'hidden') return;

    if (state === 'aiming') {
      showPose('aim');
      return;
    }

    if (state === 'resolved' && currentCharPoseKey === 'fire') {
      showPose('fire');
      return;
    }

    if (state === 'exhausted') {
      showPose('fail');
      return;
    }

    // pending/idle: no hay una pose interactiva activa. En ese caso se
    // respeta la pose de reposo calculada por Archery.
    showPose(defaultIdlePoseKey);
  }

  window.Buddy.archeryGame = {
    show: showCharacter,
    hide: hideCharacter,
    restoreCurrentPose: restoreCurrentPose,
    resetArrows: resetArrows,
    computeScore: computeScore,
    getArrowLog: function () {
      return sessionArrowLog.map(function (entry) {
        return Object.assign({}, entry);
      });
    },
    getFatigueLevel: function () {
      return fatigueActiveNow() ? currentFatigueLevel(performance.now()) : 0;
    },
    getCalibrationError: function () {
      return Math.sqrt(calibOffsetX * calibOffsetX + calibOffsetY * calibOffsetY);
    },
    estaOcupado: function () {
      // 'hidden' significa que el minijuego está oculto/inactivo, no que
      // esté ocupando a Buddy. Solo los estados de una interacción en curso
      // deben bloquear las fuentes automáticas de /says.
      return state !== 'idle' && state !== 'hidden';
    },
    setAimBlurEnabled: setAimBlurEnabled,
    isAimBlurEnabled: isAimBlurRuntimeEnabled,
    isHandlingAuthWelcome: isArcheryHandlingAuthWelcome,
    top10: obtenerTop10,
    top10Mostrar: mostrarTop10,
    top10Local: obtenerTop10Local,
    top10Texto: textoTop10
  };

  // API directa para otros módulos que prefieran consultar/controlar
  // específicamente el efecto de concentración sin pasar por Buddy.
  window.BuddyArcheryGame = window.BuddyArcheryGame || {};
  window.BuddyArcheryGame.setAimBlurEnabled = setAimBlurEnabled;
  window.BuddyArcheryGame.isAimBlurEnabled = isAimBlurRuntimeEnabled;
  window.BuddyArcheryGame.top10 = obtenerTop10;
  window.BuddyArcheryGame.top10Local = obtenerTop10Local;
  window.BuddyArcheryGame.top10Texto = textoTop10;

  // Si el usuario tuvo que autenticarse después de una andanada, el segundo
  // paso (nombre) comienza únicamente cuando Auth confirma la autenticación.
  window.addEventListener('buddy:auth-state-changed', handleAuthenticationForName);
  window.addEventListener('buddy:auth-user-updated', handleAuthenticationForName);

  // Fase 10: la política común se registra desde init(), cuando Buddy ya
  // existe. Dejamos este intento defensivo por compatibilidad con cargas
  // no estándar en las que init() pueda ejecutarse antes de que Buddy quede
  // disponible; en ese caso el evento buddy:ready volverá a intentarlo.
  registerBusyProvider();
  window.addEventListener('buddy:ready', registerBusyProvider);


  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
