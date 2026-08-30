/**
 * assets/buddy/modules/says/buddy_says.js
 * ---------------------------------------------------------------------------
 * Fase 4 del plan de separación de raulito.js (ver planBuddy_v5.md, sección
 * 4.4 y 4.4.1; prompt de ejecución en fase04.md).
 *
 * Fase 8: además del NÚCLEO de comunicación por globo, este archivo
 * incorpora el motor de fuentes automáticas (recurrencia, frecuencia,
 * medios registrados en modules/says/sources/, selección aleatoria/secuencial,
 * persistencia diaria y variante cortés que nunca interrumpe una actividad ocupada).
 *
 * Fuente del mecanismo: raulito.js (ensureBubbleStyles, positionBubble,
 * showSpeechBubble, hideSpeechBubble, CONFIG.bubbleGapPx/bubbleLeftShiftPx/
 * bubbleTailOffsetPx/bubbleDisplayMs). Se traslada conservando el
 * comportamiento visual; lo que cambia es:
 *   - el punto de anclaje: antes CONFIG.characterFaceAnchor.x/y[poseKey]
 *     (nivel de ojos/sombrero, indexado por pose fija); ahora
 *     datosExpresion.anclas.cabeza_superior (esquina superior-izquierda de
 *     la cabeza, medida por expresión — ver planBuddy_v5.md sección 4.1 y
 *     4.4.1, y tabla de mapeo sección 4.1);
 *   - la fuente de la expresión/imagen: antes showPose(poseKey) local a
 *     raulito.js; ahora window.Buddy.showCharacterImage(datosExpresion)
 *     de la Fase 3 (buddy.js) — este módulo no dibuja ni posiciona al
 *     personaje.
 * ---------------------------------------------------------------------------
 */
window.Buddy = window.Buddy || {};

(function () {
  'use strict';

  // -------------------------------------------------------------------
  // Verificación de dependencias de la Fase 3. Si buddy.js no está
  // cargado o no expone las APIs que exige fase04.md (sección 1), se
  // detiene la carga y se reporta qué falta, en vez de inventar una
  // implementación paralela.
  // -------------------------------------------------------------------
  var faltantes = [];
  if (!window.Buddy || typeof window.Buddy.showCharacterImage !== 'function') {
    faltantes.push('window.Buddy.showCharacterImage');
  }
  if (!window.Buddy || typeof window.Buddy.resolveExpression !== 'function') {
    faltantes.push('window.Buddy.resolveExpression');
  }
  if (!window.Buddy || typeof window.Buddy.resolveExpressionByCategory !== 'function') {
    faltantes.push('window.Buddy.resolveExpressionByCategory');
  }
  if (!window.Buddy || typeof window.Buddy.resolveExpressionExact !== 'function') {
    faltantes.push('window.Buddy.resolveExpressionExact');
  }
  if (faltantes.length) {
    console.error(
      '[buddy_says] No se pudo inicializar: faltan APIs de la Fase 3 (buddy.js): ' +
      faltantes.join(', ') + '. Verificá que assets/buddy/buddy.js se cargue ' +
      'ANTES que assets/buddy/modules/says/buddy_says.js.'
    );
    return;
  }

  // -------------------------------------------------------------------
  // Config propia del módulo — geometría del globo, trasladada de
  // raulito.js sin cambiar los valores (ver cabecera del archivo).
  // -------------------------------------------------------------------
  var CONFIG = {
    // Cuánto se queda visible el globo por defecto si no se pasa
    // opciones.durationMs (= CONFIG.bubbleDisplayMs en raulito.js).
    bubbleDisplayMs: 2800,

    // Duración adaptativa: los mensajes largos permanecen visibles el
    // tiempo suficiente para poder leerlos. Los límites y la velocidad se
    // pueden ajustar desde BuddySaysConfig.display.
    bubbleDuration: {
      minMs: 2800,
      maxMs: 9000,
      charsPerSecond: 14,
      extraMs: 500
    },

    // Separación vertical entre la base del globo y anclas.cabeza_superior.
    bubbleGapPx: 1,
    // Corrimiento del CUERPO del globo hacia la izquierda del punto de
    // cabeza_superior (la colita se queda apuntando cerca del punto real).
    bubbleLeftShiftPx: 17,
    // Debe coincidir con la colita del globo (::after en ensureBubbleStyles:
    // "right:28px;width:14px" -> el centro de la colita queda a
    // 28+14/2=35px del borde derecho del globo).
    bubbleTailOffsetPx: 17,

    // Expresión de reposo — obligatoria en cualquier personaje (ver
    // buddy.js, EXPRESION_OBLIGATORIA), a la que se vuelve al terminar
    // un mensaje.
    expresionPorDefecto: 'sereno',

    // Fallback expresado también en píxeles absolutos del archivo original.
    // Se usa únicamente si una expresión no declara cabeza_superior.
    cabezaSuperiorFallback: { x: 90, y: 59 }
  };

  // -------------------------------------------------------------------
  // Estilos del globo — mismos valores visuales que raulito.js
  // (.raulito-bubble), renombrados para no depender de nombres de
  // Raulito.
  // -------------------------------------------------------------------
  function ensureBubbleStyles() {
    if (document.getElementById('buddy-says-bubble-style')) return;
    var style = document.createElement('style');
    style.id = 'buddy-says-bubble-style';
    style.textContent =
      // La raíz interactiva NO recibe eventos. Sus hijos sí: el backdrop
      // bloquea la página y el globo queda por encima del backdrop.
      '.buddy-says-interaction-layer{position:fixed;inset:0;z-index:2147483000;' +
      'display:none;pointer-events:none;background:transparent;' +
      '-webkit-tap-highlight-color:transparent;}' +
      // El backdrop, por defecto, NO bloquea: los mensajes de sólo texto
      // (unidireccionales) no necesitan foco, así que scroll/clicks/touch
      // deben seguir llegando normalmente a lo que hay debajo del globo.
      // Sólo cuando el layer recibe la clase "is-blocking" (mensajes
      // interactivos con elección rápida, o formularios) el backdrop pasa
      // a bloquear la página — ver setBackdropBlocking().
      '.buddy-says-interaction-backdrop{position:absolute;inset:0;' +
      'background:transparent;pointer-events:none;touch-action:auto;}' +
      '.buddy-says-interaction-layer.is-blocking .buddy-says-interaction-backdrop{' +
      'pointer-events:auto;touch-action:none;}' +
      '.buddy-says-bubble{position:fixed;max-width:230px;background:#ffffff;' +
      'color:#1a1a1a;font:600 14px/1.4 -apple-system,BlinkMacSystemFont,' +
      '"Segoe UI",Roboto,sans-serif;padding:10px 14px;border-radius:16px;' +
      'box-shadow:0 6px 18px rgba(0,0,0,.2);z-index:2147483001;' +
      'pointer-events:none;user-select:none;opacity:0;transform:translateY(8px) scale(.96);' +
      'transition:opacity .18s ease,transform .18s ease;text-align:center;}' +
      '.buddy-says-bubble.is-visible{opacity:1;transform:translateY(0) scale(1);}' +
      '.buddy-says-bubble::after{content:"";position:absolute;bottom:-6px;' +
      'right:28px;width:14px;height:14px;background:#ffffff;' +
      'transform:rotate(45deg);border-radius:2px;}' +
      '.buddy-says-bubble.is-interactive{pointer-events:auto;user-select:none;' +
      'max-width:300px;touch-action:auto;}' +
      '.buddy-says-bubble.is-interactive .buddy-says-choice{margin:8px 4px 0;padding:6px 12px;border:1px solid #888;' +
      'border-radius:8px;background:#f3f3f3;color:#1a1a1a;cursor:pointer;font:inherit;}' +
      '.buddy-says-bubble.is-interactive .buddy-says-choice:hover{background:#e8e8e8;}' +
      '.buddy-says-bubble.is-promo{max-width:300px;pointer-events:auto;user-select:text;}' +
      '.buddy-says-bubble.is-promo a{color:#0d6efd;text-decoration:underline;pointer-events:auto;}' +
      '.buddy-says-bubble.is-form{max-width:310px;pointer-events:auto;user-select:text;' +
      'text-align:left;padding:12px 14px;touch-action:auto;}' +
      '.buddy-says-form{display:flex;flex-direction:column;gap:7px;}' +
      '.buddy-says-form-row{display:grid;grid-template-columns:72px minmax(0,1fr);align-items:center;gap:7px;}' +
      '.buddy-says-form-row label{font-weight:600;white-space:nowrap;}' +
      '.buddy-says-form-row input{width:100%;height:32px;box-sizing:border-box;padding:5px 8px;' +
      'border:1px solid #bbb;border-radius:6px;font:inherit;outline:none;}' +
      '.buddy-says-form-row input:focus{border-color:#777;}' +
      '.buddy-says-form-row input[readonly]{background:#f1f1f1;color:#666;}' +
      '.buddy-says-form-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:3px;}' +
      '.buddy-says-form-submit,.buddy-says-form-cancel{height:32px;padding:0 14px;' +
      'border:1px solid #888;border-radius:6px;cursor:pointer;font:inherit;}' +
      '.buddy-says-form-submit{background:#f3f3f3;color:#1a1a1a;}' +
      '.buddy-says-form-cancel{background:#fff;color:#1a1a1a;}' +
      '.buddy-says-form-submit:disabled{opacity:.6;cursor:wait;}' +
      '.buddy-says-form-error{display:none;margin-top:2px;color:#b00020;font-size:12px;text-align:left;}';
    document.head.appendChild(style);
  }

  var interactionLayerEl = null;
  var interactionBackdropEl = null;
  var bubbleEl = null;
  var interactiveHandler = null;
  var userFormState = null;

  function ensureInteractionLayer() {
    if (interactionLayerEl) return interactionLayerEl;
    ensureBubbleStyles();

    interactionLayerEl = document.createElement('div');
    interactionLayerEl.id = 'buddy-says-interaction-layer';
    interactionLayerEl.className = 'buddy-says-interaction-layer';

    // El backdrop es el único elemento que bloquea la página. No se usan
    // listeners globales de document/capture: el navegador puede entregar
    // normalmente los eventos táctiles a inputs y botones del globo.
    interactionBackdropEl = document.createElement('div');
    interactionBackdropEl.id = 'buddy-says-interaction-backdrop';
    interactionBackdropEl.className = 'buddy-says-interaction-backdrop';
    interactionBackdropEl.setAttribute('aria-hidden', 'true');

    interactionLayerEl.appendChild(interactionBackdropEl);
    document.body.appendChild(interactionLayerEl);
    return interactionLayerEl;
  }

  function setInteractionLayer(active) {
    ensureInteractionLayer();
    interactionLayerEl.style.display = active ? 'block' : 'none';
    interactionLayerEl.setAttribute('aria-hidden', active ? 'false' : 'true');
  }

  // Controla si el backdrop bloquea clicks/scroll/touch del resto de la
  // pantalla. Independiente de setInteractionLayer(): esa función sólo
  // decide si el layer (y por lo tanto el globo, que es su hijo) se
  // renderiza; ésta decide si, mientras el globo está visible, el resto
  // de la página queda inhabilitado. Un mensaje de sólo texto activa el
  // layer pero NO el bloqueo; un mensaje interactivo o un formulario
  // activan ambos.
  function setBackdropBlocking(active) {
    ensureInteractionLayer();
    interactionLayerEl.classList.toggle('is-blocking', !!active);
  }

  function ensureBubbleElement() {
    if (bubbleEl) return bubbleEl;
    ensureBubbleStyles();
    ensureInteractionLayer();
    bubbleEl = document.createElement('div');
    bubbleEl.id = 'buddy-says-bubble';
    bubbleEl.className = 'buddy-says-bubble';
    bubbleEl.style.display = 'none';
    // El globo está por encima del backdrop dentro del mismo stacking
    // context. No necesita listeners de captura ni document handlers.
    interactionLayerEl.appendChild(bubbleEl);
    return bubbleEl;
  }

  // -------------------------------------------------------------------
  // Elemento del personaje: buddy_says NO dibuja ni calcula la posición
  // del personaje (eso es responsabilidad exclusiva de buddy.js / Fase 3).
  // Acá solo se LEE el rect ya renderizado por buddy.js, a través del id
  // fijo que buddy.js le asigna (#buddy-character), para saber dónde cae
  // en pantalla el ancla cabeza_superior. No se reimplementa ningún
  // cálculo de escala/offset/cintura.
  // -------------------------------------------------------------------
  function getCharacterEl() {
    return document.getElementById('buddy-character');
  }

  // Posiciona el globo apuntando a datosExpresion.anclas.cabeza_superior
  // (sección 4.4.1 del plan), no al borde del rectángulo completo de la
  // imagen ni a coordenadas fijas del personaje. La base del globo (borde
  // inferior + colita) queda fija respecto de ese punto; el cuerpo crece
  // hacia arriba (ver showBubble/CSS: bottom/right, nunca top/left).
  function positionBubble(datosExpresion) {
    var charEl = getCharacterEl();
    if (!charEl || !bubbleEl) return;
    var rect = charEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    var cabezaSuperior = datosExpresion && datosExpresion.anclas &&
      datosExpresion.anclas.cabeza_superior;

    // Las anclas de las expresiones ahora son coordenadas ABSOLUTAS en
    // píxeles dentro de la imagen original, igual que las anclas del
    // personaje y de Archery. No se pueden multiplicar directamente por
    // rect.width/height: primero hay que convertirlas a la escala renderizada.
    var sourceWidth = Number(datosExpresion && datosExpresion.ancho);
    var sourceHeight = Number(datosExpresion && datosExpresion.alto);
    var anchorX = cabezaSuperior && typeof cabezaSuperior.x === 'number'
      ? cabezaSuperior.x
      : CONFIG.cabezaSuperiorFallback.x;
    var anchorY = cabezaSuperior && typeof cabezaSuperior.y === 'number'
      ? cabezaSuperior.y
      : CONFIG.cabezaSuperiorFallback.y;

    if (!sourceWidth || !sourceHeight ||
        !isFinite(sourceWidth) || !isFinite(sourceHeight)) {
      console.warn('[buddy_says] La expresión no tiene ancho/alto válidos; no se puede convertir cabeza_superior a píxeles renderizados.');
      return;
    }

    var renderedAnchorX = anchorX * rect.width / sourceWidth;
    var renderedAnchorY = anchorY * rect.height / sourceHeight;

    var faceX = rect.left + renderedAnchorX;
    var faceY = rect.top + renderedAnchorY;

    // La colita (bubbleTailOffsetPx) apunta cerca de faceX; el cuerpo del
    // globo se corre bubbleLeftShiftPx más a la izquierda de eso.
    var tailTargetX = faceX - CONFIG.bubbleLeftShiftPx;

    bubbleEl.style.left = 'auto';
    bubbleEl.style.top = 'auto';
    // right/bottom (no left/top): el globo crece hacia arriba y a la
    // izquierda sin mover su base — un texto largo no desplaza el anclaje.
    bubbleEl.style.right = Math.max(8, window.innerWidth - tailTargetX - CONFIG.bubbleTailOffsetPx) + 'px';
    bubbleEl.style.bottom = (window.innerHeight - faceY + CONFIG.bubbleGapPx) + 'px';
  }

  function clearInteractiveChoices() {
    // Vuelve al estado seguro por defecto: no bloqueante. Si el mensaje
    // que se está por mostrar sí requiere foco, renderInteractiveChoices()
    // (o createUserForm(), para formularios) lo reactiva explícitamente.
    setBackdropBlocking(false);
    if (!bubbleEl) return;
    var choices = bubbleEl.querySelectorAll('.buddy-says-choice');
    for (var i = 0; i < choices.length; i += 1) choices[i].remove();
    interactiveHandler = null;
    bubbleEl.classList.remove('is-interactive');
  }

  function cancelInteractive() {
    interactiveHandler = null;
    if (bubbleTimer) {
      clearTimeout(bubbleTimer);
      bubbleTimer = null;
    }
    callToken++;
    clearInteractiveChoices();
    setInteractionLayer(false);
    hideBubble();
    showNextQueuedSpeech();
    return true;
  }

  function finishInteractive(value) {
    var handler = interactiveHandler;
    interactiveHandler = null;
    if (bubbleTimer) {
      clearTimeout(bubbleTimer);
      bubbleTimer = null;
    }
    callToken++;
    clearInteractiveChoices();
    setInteractionLayer(false);
    hideBubble();
    if (typeof handler === 'function') {
      var result = handler(value);
      // El handler puede generar inmediatamente el siguiente mensaje. Como
      // el globo anterior todavía está en transición de salida, liberamos la
      // cola después de esa transición.
      setTimeout(function () {
        if (!hasActiveSpeech()) showNextQueuedSpeech();
      }, 220);
      return result;
    }
    setTimeout(function () {
      showNextQueuedSpeech();
    }, 220);
    return false;
  }

  function renderInteractiveChoices(opciones) {
    clearInteractiveChoices();
    if (!opciones || opciones.interactive !== true || !Array.isArray(opciones.choices)) return;
    interactiveHandler = typeof opciones.onChoice === 'function' ? opciones.onChoice : null;
    bubbleEl.classList.add('is-interactive');
    setInteractionLayer(true);
    // Este mensaje sí necesita foco del usuario (espera una elección):
    // ahora el backdrop debe bloquear el resto de la pantalla.
    setBackdropBlocking(true);
    opciones.choices.forEach(function (choice) {
      if (!choice) return;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'buddy-says-choice';
      button.textContent = String(choice.label == null ? choice.value : choice.label);
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        finishInteractive(choice.value);
      });
      bubbleEl.appendChild(button);
    });
  }

  function showBubble(texto, opciones, datosExpresion) {
    ensureBubbleElement();
    clearInteractiveChoices();
    if (opciones.html) {
      bubbleEl.innerHTML = texto;
    } else {
      bubbleEl.textContent = texto;
    }
    bubbleEl.classList.toggle('is-promo', !!opciones.promo);
    renderInteractiveChoices(opciones);
    positionBubble(datosExpresion);

    // La capa padre permanece oculta cuando no hay ningún globo activo.
    // Activarla aquí es necesario para que el globo (su hijo) pueda
    // renderizarse — pero esto YA NO implica bloquear la página: eso lo
    // decide renderInteractiveChoices() de forma independiente, más
    // arriba, según si el mensaje es de sólo texto (no bloqueante) o
    // espera una elección del usuario (bloqueante).
    setInteractionLayer(true);

    bubbleEl.style.display = 'block';
    // Fuerza reflow para que la transición de entrada dispare siempre,
    // incluso si el globo ya estaba visible mostrando otro texto.
    void bubbleEl.offsetWidth;
    bubbleEl.classList.add('is-visible');
  }

  function hideBubble() {
    if (!bubbleEl) return;
    bubbleEl.classList.remove('is-visible');
    setTimeout(function () {
      if (bubbleEl && !bubbleEl.classList.contains('is-visible')) {
        bubbleEl.style.display = 'none';
        setInteractionLayer(false);
      }
    }, 200);
  }

  // -------------------------------------------------------------------
  // Resolución de emocion -> datosExpresion.
  //
  // La prioridad es: 1) categoría del diccionario, 2) expresión exacta,
  // 3) expresión por defecto. Las APIs Exact permiten saber si realmente
  // hubo una coincidencia, sin comparar rutas de archivos contra sereno.
  // -------------------------------------------------------------------
  function resolveExpresionParaEmocion(emocion) {
    if (!emocion) emocion = CONFIG.expresionPorDefecto;

    var porCategoria = window.Buddy.resolveExpressionByCategory(emocion);
    if (porCategoria) return porCategoria;

    var directa = window.Buddy.resolveExpressionExact(emocion);
    if (directa) return directa;

    return window.Buddy.resolveExpression(CONFIG.expresionPorDefecto);
  }

  // -------------------------------------------------------------------
  // Estado interno mínimo: timer de ocultación + token de llamada (para
  // saber si, cuando vence durationMs, otro buddy_says() ya tomó el
  // control mientras tanto — en ese caso NO se restaura 'sereno', porque
  // ese llamado más nuevo es responsable de su propia restauración).
  // -------------------------------------------------------------------
  var bubbleTimer = null;
  var callToken = 0;

  // Cola única de turnos de entrega.
  //
  // Acá confluyen TODOS los mensajes que deben hablarse: mensajes generados
  // por acciones y mensajes provenientes de las fuentes. El orden de esta
  // cola es el orden de los turnos de entrega. Un mensaje que llega mientras
  // otro está visible se agrega al final y será entregado en el siguiente
  // turno disponible.
  //
  // Los mensajes de fuente conservan su estado persistente separado; sólo se
  // incorporan a esta cola cuando su espera ya venció.
  var speechQueue = [];

  // Evita incorporar dos veces el mismo mensaje de fuente mientras está
  // esperando su turno en speechQueue. La recurrencia sólo se descuenta cuando
  // el mensaje realmente pasa a pantalla.
  var queuedSourceMessages = {};

  function getBubbleDurationMs(texto, opciones) {
    if (opciones && typeof opciones.durationMs === 'number') {
      return Math.max(0, opciones.durationMs);
    }

    var settings = window.BuddySaysConfig && window.BuddySaysConfig.display || {};
    var base = Number(settings.baseMs);
    var minMs = Number(settings.minMs);
    var maxMs = Number(settings.maxMs);
    var charsPerSecond = Number(settings.charsPerSecond);
    var extraMs = Number(settings.extraMs);

    if (!isFinite(base) || base < 0) base = CONFIG.bubbleDisplayMs;
    if (!isFinite(minMs) || minMs < 0) minMs = CONFIG.bubbleDuration.minMs;
    if (!isFinite(maxMs) || maxMs < minMs) maxMs = CONFIG.bubbleDuration.maxMs;
    if (!isFinite(charsPerSecond) || charsPerSecond <= 0) charsPerSecond = CONFIG.bubbleDuration.charsPerSecond;
    if (!isFinite(extraMs) || extraMs < 0) extraMs = CONFIG.bubbleDuration.extraMs;

    var plainText = String(texto == null ? '' : texto)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    var chars = plainText.length;
    var duration = base + (chars / charsPerSecond) * 1000 + (chars > 45 ? extraMs : 0);
    return Math.round(Math.min(maxMs, Math.max(minMs, duration)));
  }

  function hasActiveSpeech() {
    return !!(userFormState || bubbleTimer || interactiveHandler || isBubbleVisible());
  }

  function showNextQueuedSpeech() {
    if (userFormState || hasActiveSpeech() || !speechQueue.length) return false;

    var next = speechQueue.shift();

    if (next && next.type === 'form') {
      debugSource('[BUDDY SAYS] entregando formulario pendiente; pendientes=', speechQueue.length);
      var formShown = frmUsr(next.config);
      if (!formShown) {
        // Mismo resguardo que ya existe para mensajes normales: si el
        // formulario no pudo mostrarse ahora (por ejemplo, la expresión
        // del personaje todavía no está disponible), no se pierde el
        // turno — vuelve al frente de la cola para reintentarlo.
        speechQueue.unshift(next);
      }
      return formShown;
    }

    debugSource('[BUDDY SAYS] entregando turno pendiente:', next && next.texto,
      'source=', next && next.source || 'action',
      'pendientes=', speechQueue.length);

    var shown = showSpeechNow(next.texto, next.opciones);
    if (!shown) {
      // No perdemos el turno si la capa visual todavía no puede mostrarlo.
      speechQueue.unshift(next);
      return false;
    }

    if (typeof next.onDelivered === 'function') {
      try {
        next.onDelivered();
      } catch (error) {
        console.error('[buddy_says] Error al confirmar entrega:', error);
      }
    }

    return true;
  }

  function normalizeFormField(field, defaults) {
    var value = field && Object.prototype.hasOwnProperty.call(field, 'value') ? field.value : '';
    return {
      value: value == null ? '' : String(value),
      readonly: field && field.readonly === true,
      required: field && field.required === true,
      hidden: field && field.hidden === true,
      label: field && field.label ? String(field.label) : defaults.label,
      placeholder: field && field.placeholder != null ? String(field.placeholder) : defaults.placeholder
    };
  }

  function buildUserFormConfig(config) {
    config = config || {};
    var fields = config.fields || {};
    return {
      email: normalizeFormField(fields.email, { label: 'Correo:', placeholder: '' }),
      name: normalizeFormField(fields.name, { label: 'Nombre:', placeholder: '' }),
      whatsapp: normalizeFormField(fields.whatsapp, { label: 'Whatsapp:', placeholder: '' })
    };
  }

  function createUserForm(config) {
    ensureBubbleElement();
    var fields = buildUserFormConfig(config);
    bubbleEl.innerHTML = '';
    bubbleEl.classList.remove('is-promo', 'is-interactive');
    bubbleEl.classList.add('is-form');
    setInteractionLayer(true);
    // Un formulario siempre requiere foco del usuario: bloquea el resto
    // de la pantalla hasta que se cancele o se envíe.
    setBackdropBlocking(true);

    var form = document.createElement('form');
    form.className = 'buddy-says-form';
    form.noValidate = true;

    var controls = {};
    ['email', 'name', 'whatsapp'].forEach(function (key) {
      var field = fields[key];
      var row = document.createElement('div');
      row.className = 'buddy-says-form-row';
      if (field.hidden) row.style.display = 'none';

      var label = document.createElement('label');
      label.textContent = field.label;
      label.htmlFor = 'buddy-says-user-' + key;

      var input = document.createElement('input');
      input.type = key === 'email' ? 'email' : 'text';
      input.id = 'buddy-says-user-' + key;
      input.name = key;
      input.value = field.value;
      input.placeholder = field.placeholder;
      input.readOnly = field.readonly;
      input.required = field.required;
      input.autocomplete = key === 'email' ? 'email' : (key === 'whatsapp' ? 'tel' : 'name');

      row.appendChild(label);
      row.appendChild(input);
      form.appendChild(row);
      controls[key] = input;
    });

    var error = document.createElement('div');
    error.className = 'buddy-says-form-error';

    var actions = document.createElement('div');
    actions.className = 'buddy-says-form-actions';
    var cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'buddy-says-form-cancel';
    cancel.textContent = config.cancelText || 'cancelar';

    var submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'buddy-says-form-submit';
    submit.textContent = config.submitText || 'enviar';

    actions.appendChild(cancel);
    actions.appendChild(submit);
    form.appendChild(error);
    form.appendChild(actions);
    bubbleEl.appendChild(form);

    userFormState = {
      config: config,
      form: form,
      controls: controls,
      cancel: cancel,
      submit: submit,
      error: error,
      resolved: false
    };

    function setError(message) {
      error.textContent = String(message || '');
      error.style.display = message ? 'block' : 'none';
    }

    function collect() {
      return {
        email: controls.email.value.trim(),
        name: controls.name.value.trim(),
        whatsapp: controls.whatsapp.value.trim()
      };
    }

    function validate(data) {
      if (fields.email.required && !data.email) return 'El correo es obligatorio.';
      if (fields.email.required && !isValidEmailForForm(data.email)) return 'Escribe un correo válido.';
      if (fields.name.required && !data.name) return 'El nombre es obligatorio.';
      if (fields.whatsapp.required && !data.whatsapp) return 'El teléfono es obligatorio.';
      return '';
    }

    function isValidEmailForForm(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
    }

    // El formulario vive dentro del globo: las interacciones con sus
    // controles no deben propagarse a handlers externos que puedan cerrar
    // o reemplazar el globo.
    cancel.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      cancelUserForm();
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!userFormState || userFormState.resolved) return;

      var data = collect();
      var validationError = validate(data);
      if (validationError) {
        setError(validationError);
        var invalid = fields.email.required && !data.email ? controls.email :
          (fields.name.required && !data.name ? controls.name : (fields.whatsapp.required && !data.whatsapp ? controls.whatsapp : controls.email));
        try { invalid.focus(); } catch (e) {}
        return;
      }

      setError('');
      submit.disabled = true;
      controls.email.disabled = true;
      controls.name.disabled = true;
      controls.whatsapp.disabled = true;

      var callback = typeof config.onSubmit === 'function' ? config.onSubmit : null;
      var result;
      try {
        result = callback ? callback(data) : true;
      } catch (error) {
        result = Promise.reject(error);
      }

      Promise.resolve(result).then(function (ok) {
        if (ok === false) throw new Error('La operación no fue confirmada.');
        resolveUserForm(data);
      }).catch(function (error) {
        submit.disabled = false;
        controls.email.disabled = false;
        controls.name.disabled = false;
        controls.whatsapp.disabled = false;
        setError(error && error.message ? error.message : 'No se pudieron guardar los datos.');
      });
    });
  }

  function cancelUserForm() {
    if (!userFormState) return false;
    var state = userFormState;
    userFormState = null;
    state.resolved = true;
    if (bubbleEl) bubbleEl.classList.remove('is-form');
    setInteractionLayer(false);
    setBackdropBlocking(false);
    callToken++;
    hideBubble();

    var callback = typeof state.config.onCancel === 'function' ? state.config.onCancel : null;
    if (callback) {
      try { callback(); } catch (error) { console.error('[buddy_says] Error en onCancel:', error); }
    }

    setTimeout(function () {
      showNextQueuedSpeech();
    }, 220);
    return true;
  }

  function resolveUserForm(data) {
    if (!userFormState) return false;
    var state = userFormState;
    userFormState = null;
    state.resolved = true;
    if (bubbleEl) bubbleEl.classList.remove('is-form');
    setInteractionLayer(false);
    setBackdropBlocking(false);
    callToken++;
    hideBubble();
    var callback = typeof state.config.onResolved === 'function' ? state.config.onResolved : null;
    if (callback) callback(data);
    setTimeout(function () {
      showNextQueuedSpeech();
    }, 220);
    return true;
  }

  function frmUsr(config) {
    config = config || {};
    if (!config.fields) {
      throw new Error('Buddy.says.frmUsr requiere config.fields.');
    }

    var entry = { type: 'form', config: config };
    if (userFormState || hasActiveSpeech()) {
      speechQueue.push(entry);
      debugSource('[BUDDY SAYS] formulario de usuario agregado al final de la cola de turnos; pendientes=', speechQueue.length);
      return true;
    }

    var datosExpresion = resolveExpresionParaEmocion(config.emocion);
    if (!datosExpresion || !datosExpresion.archivo) return false;
    window.Buddy.showCharacterImage(datosExpresion);
    createUserForm(config);
    positionBubble(datosExpresion);
    bubbleEl.style.display = 'block';
    void bubbleEl.offsetWidth;
    bubbleEl.classList.add('is-visible');
    setTimeout(function () {
      if (userFormState && userFormState.controls) {
        var controls = userFormState.controls;
        var target = controls.email.readOnly ?
          (controls.name.readOnly ? controls.whatsapp : controls.name) : controls.email;
        try { target.focus(); target.setSelectionRange(target.value.length, target.value.length); } catch (e) { try { target.focus(); } catch (ignore) {} }
      }
    }, 0);
    return true;
  }

  function buddySays(texto, opciones) {
    opciones = Object.assign({}, opciones || {});

    // Todo mensaje generado por una acción entra siempre en la misma cola de
    // turnos. No se muestra directamente aunque Buddy esté libre: de esta
    // forma la acción queda integrada con los mensajes de fuente y nunca
    // puede saltarse el planificador.
    speechQueue.push({
      type: 'message',
      texto: texto,
      opciones: opciones,
      source: 'action'
    });

    debugSource('[BUDDY SAYS] turno generado por acción encolado:', texto,
      'pendientes=', speechQueue.length);

    showNextQueuedSpeech();
    return true;
  }

  function showSpeechNow(texto, opciones) {
    opciones = opciones || {};
    if (userFormState) return false;
    if (bubbleEl) bubbleEl.classList.remove('is-form');
    var interactive = opciones.interactive === true && Array.isArray(opciones.choices);
    var durationMs = getBubbleDurationMs(texto, opciones);

    var datosExpresion = resolveExpresionParaEmocion(opciones.emocion);
    if (!datosExpresion || !datosExpresion.archivo) {
      console.error(
        "[buddy_says] No se pudo resolver ninguna expresión (ni siquiera '" +
        CONFIG.expresionPorDefecto + "'). Revisar el archivo de datos del " +
        'personaje activo (window.BuddyChars).'
      );
      return false;
    }

    // 1) cambia la cara mientras dura el mensaje. showCharacterImage()
    // también hace visible al personaje y notifica a los módulos para que
    // puedan salir de su estado interno 'hidden'.
    window.Buddy.showCharacterImage(datosExpresion);
    // 2) muestra el globo, anclado a cabeza_superior de esa expresión.
    showBubble(texto, opciones, datosExpresion);

    // Este método sólo se ejecuta cuando el mensaje puede mostrarse ahora;
    // los nuevos buddy_says() durante un mensaje activo se incorporan a
    // speechQueue y no llegan a pisar el timer ni el globo actual.
    callToken++;
    var thisCall = callToken;
    if (bubbleTimer) clearTimeout(bubbleTimer);

    if (interactive) {
      bubbleTimer = null;
      return true;
    }

    bubbleTimer = setTimeout(function () {
      bubbleTimer = null;
      // Si otro buddy_says() ya se ejecutó después de este, ese llamado
      // es dueño del estado actual: no pisar su globo ni su expresión.
      if (thisCall !== callToken) return;

      hideBubble();

      // Si un módulo interactivo mantiene el control de la pose (por ejemplo
      // Archery mientras se apunta o mientras la flecha está en vuelo), no
      // debemos imponer sereno al terminar el mensaje. El módulo activo es
      // quien conoce cuál debe ser la pose en ese instante.
      if (window.Buddy && window.Buddy.archery &&
          typeof window.Buddy.archery.restoreCurrentPose === 'function' &&
          typeof window.Buddy.archery.estaOcupado === 'function' &&
          window.Buddy.archery.estaOcupado()) {
        window.Buddy.archery.restoreCurrentPose();
      } else {
        var serenoData = window.Buddy.resolveExpression(CONFIG.expresionPorDefecto);
        if (serenoData) {
          window.Buddy.showCharacterImage(serenoData);
        }
      }

      // Una vez liberado el mensaje actual, continúa el tren FIFO sin
      // reemplazar ni perder los mensajes que llegaron mientras se hablaba.
      showNextQueuedSpeech();
    }, durationMs);

    return true;
  }


  // -------------------------------------------------------------------
  // Fase 8 — motor de fuentes
  // -------------------------------------------------------------------
  var SOURCES = window.BuddyInformSources = window.BuddyInformSources || {};
  var SOURCE_STORAGE_KEY = 'buddySaysV1';
  var sourceStates = {};
  var sourceEngineStarted = false;
  var sourceEngineTimer = null;
  var sourceQueue = [];
  var queueIndex = 0;
  var lastDeliveryDate = 0;

  var configuredSources = window.BuddySaysConfig && Array.isArray(window.BuddySaysConfig.sources) ?
    window.BuddySaysConfig.sources : [];

  var SOURCES_CONFIG = configuredSources.filter(function (item) {
    return item && item.enabled === true && item.id;
  }).map(function (item) {
    return {
      id: String(item.id),
      recurrence: item.recurrence != null ? Number(item.recurrence) : Number(item.recurrencia || 1),
      frequency: item.frequency || item.frecuencia || { min: 0, max: 0 },
      selection: String(item.selection || item.seleccion || 'sequential').toLowerCase(),
      primero: item.primero === true
    };
  });

  function debugSource() {
    if (window.BUDDY_SAYS_DEBUG && window.console && window.console.log) {
      window.console.log.apply(window.console, arguments);
    }
  }

  function warnSource() {
    if (window.console && window.console.warn) {
      window.console.warn.apply(window.console, arguments);
    }
  }

  function todayKey(timestamp) {
    var date = new Date(timestamp == null ? Date.now() : timestamp);
    return date.getFullYear() + '-' +
      ('0' + (date.getMonth() + 1)).slice(-2) + '-' +
      ('0' + date.getDate()).slice(-2);
  }

  function isToday(timestamp) {
    return Number(timestamp) > 0 && todayKey(timestamp) === todayKey();
  }

  function readStore() {
    try {
      var raw = window.localStorage.getItem(SOURCE_STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function writeStore() {
    try {
      window.localStorage.setItem(SOURCE_STORAGE_KEY, JSON.stringify(sourceStore));
    } catch (e) {
      warnSource('[buddy_says] No se pudo guardar buddySaysV1:', e);
    }
  }

  var sourceStore = readStore().filter(function (message) {
    return !Number(message && message.date) || isToday(message.date);
  });

  function stableHash(text) {
    var hash = 2166136261;
    for (var i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  }

  function getMessageText(message) {
    if (typeof message === 'string') return message.trim();
    if (message && typeof message.texto === 'string') return message.texto.trim();
    if (message && typeof message.mensaje === 'string') return message.mensaje.trim();
    if (message && typeof message.text === 'string') return message.text.trim();
    return '';
  }

  function getMessageId(message) {
    return stableHash(getMessageText(message));
  }

  function getMessageEmotion(message) {
    if (message && typeof message === 'object' && typeof message.emocion === 'string') {
      return message.emocion;
    }
    return CONFIG.expresionPorDefecto;
  }

  function normalizeMessages(sourceId, messages) {
    if (!Array.isArray(messages)) return [];
    return messages.map(function (message, index) {
      var texto = getMessageText(message);
      if (!texto) return null;
      return {
        id: getMessageId(message),
        texto: texto,
        emocion: getMessageEmotion(message),
        source: sourceId,
        sourceIndex: index,
        original: message
      };
    }).filter(Boolean);
  }

  function randomNumberInclusive(min, max) {
    min = Math.max(0, Number(min) || 0);
    max = Math.max(min, Number(max) || min);
    return min + Math.random() * (max - min);
  }

  function getWaitMinutes(config) {
    var min = Math.max(0, Number(config.frequency && config.frequency.min) || 0);
    var max = Math.max(min, Number(config.frequency && config.frequency.max) || min);
    return randomNumberInclusive(min, max);
  }

  function getStoredMessage(id) {
    for (var i = 0; i < sourceStore.length; i++) {
      if (sourceStore[i].id === id) return sourceStore[i];
    }
    return null;
  }

  function ensureStoredMessage(message, config) {
    var stored = getStoredMessage(message.id);
    var recurrence = Math.max(0, Number(config.recurrence) || 0);

    if (!stored) {
      stored = {
        id: message.id,
        texto: message.texto,
        emocion: message.emocion,
        source: message.source,
        date: 0,
        recurrence: recurrence,
        espera: getWaitMinutes(config)
      };
      sourceStore.push(stored);
      return stored;
    }

    // El texto/emoción/fuente se actualizan con la fuente actual, pero
    // recurrence, espera y date pertenecen al estado persistente del mensaje.
    stored.texto = message.texto;
    stored.emocion = message.emocion;
    stored.source = message.source;
    stored.recurrence = Math.max(0, Number(stored.recurrence) || 0);
    stored.espera = Math.max(0, Number(stored.espera) || 0);

    // `date` es estado persistente de la entrega. Nunca debemos convertirlo
    // silenciosamente a 0 sólo porque venga serializado como string (por
    // ejemplo, una fecha ISO) o porque el valor haya sido creado por una
    // versión anterior del módulo. Un 0 sólo significa "nunca entregado".
    var persistedDate = stored.date;
    var normalizedDate = 0;

    if (typeof persistedDate === 'number' && isFinite(persistedDate)) {
      normalizedDate = persistedDate > 0 ? persistedDate : 0;
    } else if (typeof persistedDate === 'string' && persistedDate.trim()) {
      var numericDate = Number(persistedDate);
      if (isFinite(numericDate) && numericDate > 0) {
        normalizedDate = numericDate;
      } else {
        var parsedDate = Date.parse(persistedDate);
        if (isFinite(parsedDate) && parsedDate > 0) normalizedDate = parsedDate;
      }
    }

    // Si había una fecha válida pero no pudimos normalizarla, conservar el
    // valor original para evitar destruir el historial persistido.
    if (normalizedDate > 0) {
      stored.date = normalizedDate;
    } else if (persistedDate === 0 || persistedDate == null || persistedDate === '') {
      stored.date = 0;
    }

    return stored;
  }

  function loadSource(state) {
    var source = SOURCES[state.config.id];
    if (source === undefined || source === null) {
      state.error = new Error('Fuente no registrada: ' + state.config.id);
      warnSource('[buddy_says] ' + state.error.message);
      return Promise.resolve(false);
    }

    state.loading = true;
    return Promise.resolve().then(function () {
      if (Array.isArray(source)) return source;
      if (typeof source.obtenerMensajes === 'function') return source.obtenerMensajes();
      throw new Error('Formato de fuente no válido: ' + state.config.id);
    }).then(function (messages) {
      state.messages = normalizeMessages(state.config.id, messages);
      state.error = null;
      state.messages.forEach(function (message) {
        message.stored = ensureStoredMessage(message, state.config);
      });
      debugSource('[BUDDY SAYS] mensajes cargados:', state.config.id, '=', state.messages.length);
      return true;
    }).catch(function (error) {
      state.messages = [];
      state.error = error;
      warnSource('[buddy_says] Error en fuente ' + state.config.id + ':', error);
      return false;
    }).then(function (ok) {
      state.loading = false;
      return ok;
    });
  }

  function shuffleArray(list) {
    var result = list.slice();
    for (var i = result.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = result[i];
      result[i] = result[j];
      result[j] = tmp;
    }
    return result;
  }

  function getAvailableMessages(config) {
    var state = sourceStates[config.id];
    if (!state || !state.messages.length) return [];

    var available = state.messages.filter(function (message) {
      return message.stored &&
        Number(message.stored.recurrence) > 0 &&
        !queuedSourceMessages[message.id];
    });

    if (config.selection === 'shuffle' || config.selection === 'random' ||
        config.selection === 'aleatorio' || config.selection === 'aleatoria') {
      available = shuffleArray(available);
    }

    return available;
  }

  function interleaveSources(sourceLists) {
    var queue = [];
    var active = sourceLists.filter(function (item) { return item.messages.length > 0; });
    var emitted = active.map(function () { return 0; });
    var total = active.map(function (item) { return item.messages.length; });
    var remaining = active.reduce(function (sum, item) { return sum + item.messages.length; }, 0);

    while (remaining > 0) {
      var selected = -1;
      var bestRatio = Infinity;

      active.forEach(function (item, index) {
        if (emitted[index] >= total[index]) return;
        var ratio = emitted[index] / total[index];
        if (ratio < bestRatio) {
          bestRatio = ratio;
          selected = index;
        }
      });

      if (selected < 0) break;
      queue.push(active[selected].messages[emitted[selected]]);
      emitted[selected]++;
      remaining--;
    }

    return queue;
  }

  function buildCycleQueue() {
    var first = [];
    var normal = [];

    SOURCES_CONFIG.forEach(function (config) {
      var messages = getAvailableMessages(config);
      if (!messages.length) return;
      if (config.primero) {
        first = first.concat(messages);
        return;
      }
      normal.push({ config: config, messages: messages });
    });

    return first.concat(interleaveSources(normal));
  }

  function getLastDeliveryDate() {
    var latest = Number(lastDeliveryDate) || 0;
    sourceStore.forEach(function (message) {
      var date = Number(message && message.date) || 0;
      if (date > latest && isToday(date)) latest = date;
    });
    lastDeliveryDate = latest;
    return latest;
  }

  // Si localStorage conserva al menos un mensaje pendiente por entregar
  // (recurrence > 0) y el personaje está oculto después de una recarga,
  // hacemos visible al personaje para que el motor de Says pueda entregar
  // ese mensaje. No consumimos recurrencias ni creamos una entrega aquí.
  function restoreCharacterVisibilityIfNeeded() {
    if (!window.Buddy || typeof window.Buddy.isCharacterVisible !== 'function' ||
        typeof window.Buddy.showCharacterImage !== 'function') return;

    if (window.Buddy.isCharacterVisible()) return;

    var pending = sourceStore.some(function (message) {
      return Number(message && message.recurrence) > 0;
    });

    if (!pending) return;

    var serenoData = resolveExpresionParaEmocion(CONFIG.expresionPorDefecto);
    if (serenoData && serenoData.archivo) {
      debugSource('[BUDDY SAYS] hay mensajes pendientes tras recarga; mostrando el personaje para poder entregarlos.');
      window.Buddy.showCharacterImage(serenoData);
    }
  }

  function getWaitRemainingMs(message) {
    var previous = getLastDeliveryDate();
    if (!previous) return 0;
    var espera = Math.max(0, Number(message.stored.espera) || 0);
    var dueAt = previous + espera * 60 * 1000;
    return Math.max(0, dueAt - Date.now());
  }

  function isBubbleVisible() {
    return !!(bubbleEl && bubbleEl.classList.contains('is-visible'));
  }

  function isSystemBusy() {
    if (window.Buddy && typeof window.Buddy.isBusy === 'function') {
      try {
        return !!window.Buddy.isBusy();
      } catch (e) {
        warnSource('[buddy_says] Buddy.isBusy() lanzó una excepción; se considera ocupado.');
        return true;
      }
    }
    return true;
  }

  function canSpeakPolitely() {
    // Archery tiene prioridad durante una interacción. En particular, desde
    // que comienza 'aiming' hasta que termina la resolución del disparo, no
    // deben aparecer mensajes automáticos de las fuentes. Se consulta
    // directamente además de Buddy.isBusy() para que la protección siga
    // funcionando incluso si el proveedor común todavía no fue registrado
    // por un orden de carga atípico.
    if (window.Buddy && window.Buddy.archery &&
        typeof window.Buddy.archery.estaOcupado === 'function') {
      try {
        if (window.Buddy.archery.estaOcupado()) return false;
      } catch (e) {
        warnSource('[buddy_says] Archery no pudo informar su estado; se considera ocupado.');
        return false;
      }
    }

    return !isBubbleVisible() && !isSystemBusy();
  }

  function hasPendingMessages() {
    return sourceStore.some(function (message) {
      return Number(message && message.recurrence) > 0 &&
        sourceStates[message.source] &&
        sourceStates[message.source].messages.some(function (item) {
          return item.id === message.id;
        });
    });
  }

  function enqueueSourceMessage(message) {
    if (!message || !message.stored) return false;

    if (queuedSourceMessages[message.id]) {
      return false;
    }

    if (Number(message.stored.recurrence) <= 0) {
      return false;
    }

    // La fuente sólo selecciona el siguiente turno. La entrega real y el
    // descuento de recurrence ocurren cuando showNextQueuedSpeech() logra
    // poner el mensaje en pantalla.
    queuedSourceMessages[message.id] = true;

    speechQueue.push({
      type: 'message',
      texto: message.texto,
      opciones: {
        emocion: message.emocion
      },
      source: message.source,
      sourceId: message.id,
      onDelivered: function () {
        var now = Date.now();

        message.stored.date = now;
        message.stored.recurrence =
          Math.max(0, Number(message.stored.recurrence) - 1);

        lastDeliveryDate = now;
        delete queuedSourceMessages[message.id];
        writeStore();

        debugSource('[BUDDY SAYS] mensaje de fuente entregado:', message.source,
          message.id, 'recurrence=', message.stored.recurrence,
          'espera=', message.stored.espera);
      }
    });

    debugSource('[BUDDY SAYS] turno de fuente agregado a la cola:',
      message.source, message.id, 'pendientes=', speechQueue.length);

    // Si no hay un mensaje activo, puede comenzar este turno inmediatamente.
    showNextQueuedSpeech();
    return true;
  }

  function scheduleEngine(delay) {
    if (!sourceEngineStarted) return;
    if (sourceEngineTimer) clearTimeout(sourceEngineTimer);
    sourceEngineTimer = setTimeout(runSourceEngine, Math.max(250, delay || 0));
  }

  function runSourceEngine() {
    sourceEngineTimer = null;
    if (!sourceEngineStarted) return;

    if (!sourceQueue.length || queueIndex >= sourceQueue.length) {
      sourceQueue = buildCycleQueue();
      queueIndex = 0;

      if (!sourceQueue.length) {
        debugSource('[BUDDY SAYS] ciclo finalizado: no quedan mensajes con recurrence > 0.');
        return;
      }
    }

    var message = sourceQueue[queueIndex];
    if (!message || !message.stored || Number(message.stored.recurrence) <= 0) {
      queueIndex++;
      scheduleEngine(0);
      return;
    }

    var remaining = getWaitRemainingMs(message);
    if (remaining > 0) {
      scheduleEngine(remaining);
      return;
    }

    if (!canSpeakPolitely()) {
      // El mensaje de fuente ya está listo, pero la presentación debe esperar
      // a que Buddy quede libre. No se descuenta recurrence todavía.
      scheduleEngine(1000);
      return;
    }

    // El motor de fuentes sólo incorpora el mensaje al tren de turnos.
    // La cola única decide cuándo se presenta realmente.
    if (enqueueSourceMessage(message)) {
      queueIndex++;
    }

    // Si una acción ya estaba esperando su turno, permanece delante de este
    // nuevo mensaje de fuente porque respeta el orden en que los turnos fueron
    // incorporados a la cola.
    if (speechQueue.length && !hasActiveSpeech()) {
      showNextQueuedSpeech();
    }

    scheduleEngine(0);
  }

  function wakeSourceEngine() {
    if (!sourceEngineStarted) return;
    scheduleEngine(0);
  }

  // Al recuperar foco/visibilidad no esperamos el timeout que estaba
  // pendiente: el motor comprueba inmediatamente si ya corresponde hablar.
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', wakeSourceEngine);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', wakeSourceEngine);
  }

  function initializeSourceEngine() {
    if (sourceEngineStarted) return;
    sourceEngineStarted = true;

    SOURCES_CONFIG.forEach(function (config) {
      sourceStates[config.id] = {
        config: config,
        messages: [],
        loading: false,
        error: null
      };
    });

    var loads = SOURCES_CONFIG.map(function (config) {
      return loadSource(sourceStates[config.id]);
    });

    Promise.all(loads).then(function () {
      writeStore();
      getLastDeliveryDate();

      // Si localStorage conserva al menos un mensaje pendiente y el personaje
      // está oculto, lo hacemos visible para que el motor pueda entregar ese
      // mensaje tras la recarga.
      restoreCharacterVisibilityIfNeeded();

      sourceQueue = buildCycleQueue();
      queueIndex = 0;

      if (!sourceQueue.length) {
        debugSource('[BUDDY SAYS] no hay mensajes pendientes para hoy.');
        return;
      }

      // El primer mensaje del día se entrega inmediatamente. Los siguientes
      // respetan la espera fija del mensaje seleccionado desde la última entrega.
      scheduleEngine(0);
    });
  }

  // -------------------------------------------------------------------
  // Variante cortés y API pública del motor.
  // -------------------------------------------------------------------
  function decirSiLibre(texto, opciones) {
    if (!canSpeakPolitely()) return false;
    buddySays(texto, opciones || {});
    return true;
  }

  function cancelarMensajeActual() {
    if (userFormState) {
      debugSource('[BUDDY SAYS] cancelarMensajeActual ignorado: formulario de usuario bloqueante activo.');
      return false;
    }
    callToken++;
    if (bubbleTimer) {
      clearTimeout(bubbleTimer);
      bubbleTimer = null;
    }
    clearInteractiveChoices();
    hideBubble();
    // Cancelar el mensaje actual no significa descartar los mensajes que
    // quedaron pendientes. Se continúa con el siguiente del tren.
    showNextQueuedSpeech();
  }

  function getPendingSpeechCount() {
    return speechQueue.length;
  }

  if (window.Buddy && typeof window.Buddy.registerBusyProvider === 'function') {
    window.Buddy.registerBusyProvider('says', function () {
      return !!userFormState;
    });
  }

  window.Buddy.says = {
    config: SOURCES_CONFIG,
    decirSiLibre: decirSiLibre,
    cancelarMensajeActual: cancelarMensajeActual,
    pendientes: getPendingSpeechCount,
    formularioActivo: function () { return !!userFormState; },
    resolverInteraccion: finishInteractive,
    frmUsr: frmUsr,
    cancelarInteraccion: cancelInteractive,
    estaOcupado: isSystemBusy,
    iniciarFuentes: initializeSourceEngine,
    _sources: SOURCES,
    _state: sourceStates,
    _recurrenceKey: SOURCE_STORAGE_KEY,
    tieneAlgoQueDecir: function () {
      return Object.keys(sourceStates).some(function (id) {
        var state = sourceStates[id];
        return !!(state && state.messages && state.messages.some(function (message) {
          return !!(message && message.stored && Number(message.stored.recurrence) > 0);
        }));
      });
    }
  };

  // buddy.js llama a iniciarFuentes() después de registrar todas las fuentes.


  // ---------------------------------------------------------------------
  // API pública
  // ---------------------------------------------------------------------
  window.buddy_says = buddySays;
})();
