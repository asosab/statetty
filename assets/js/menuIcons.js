/**
 * menuIcons.js — Statetty
 * -----------------------------------------------------------------------
 * Script EXCLUSIVO de /maps/find/index.html. No modifica mapa.js,
 * fndInm.js ni menuUser.js: solo observa el estado de #toolbox y ajusta
 * una clase CSS en base a eso.
 *
 * Comportamiento:
 *   - mapa.js ya maneja el acordeón de #toolbox: al hacer click en un
 *     .section-header, agrega/quita la clase .active en su .section
 *     padre (un solo .section activo a la vez). Esa lógica NO se toca.
 *   - Este script solo detecta si hay o no un .section.active dentro de
 *     #toolbox y, según eso, agrega/quita la clase "stt-toolbox-solo" en
 *     #toolbox. El CSS inyectado más abajo usa esa clase para ocultar
 *     (display:none) todas las .section que NO estén activas, dejando
 *     todo el espacio del panel para la sección abierta. Al cerrarla
 *     (ningún .section queda .active), la clase se quita y todas las
 *     secciones vuelven a mostrarse tal como estaban.
 *   - Cubre también la 5ta sección ("🔎 Buscar Inmuebles") que fndInm.js
 *     agrega dentro de #toolbox de forma asíncrona (minutos después de
 *     cargada la página, solo para usuarios logueados): el
 *     MutationObserver está armado con subtree:true sobre #toolbox desde
 *     el inicio, así que sigue funcionando aunque esa sección aparezca
 *     recién más tarde.
 *   - No reordena ni mueve nodos del DOM: todo el efecto es vía CSS
 *     (display:none), por lo que selectores posicionales que ya usa
 *     mapa.js (ej. "#toolbox .section:nth-child(2) .section-body") no se
 *     ven afectados.
 */
(function () {
  'use strict';

  var TOOLBOX_ID = 'toolbox';
  var SOLO_CLASS = 'stt-toolbox-solo';
  var STYLE_ID = 'stt-menu-icons-styles';

  // ------------------------------------------------------------------
  // Estilos: se inyectan una sola vez. Si se prefiere mantenerlos en el
  // <style> de index.html en vez de acá, se puede borrar esta función y
  // su llamada, y agregar el mismo CSS directamente en el HTML.
  // ------------------------------------------------------------------
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      '#' + TOOLBOX_ID + '.' + SOLO_CLASS + ' .section:not(.active){display:none;}' +
      '#' + TOOLBOX_ID + '.' + SOLO_CLASS + ' > #stt-user-toolbox-links{display:none;}';
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ------------------------------------------------------------------
  // Recalcula si debe estar presente la clase "modo solo" en #toolbox.
  // ------------------------------------------------------------------
  function recomputeSoloMode(toolbox) {
    var hayActiva = !!toolbox.querySelector('.section.active');
    toolbox.classList.toggle(SOLO_CLASS, hayActiva);
  }

  // ------------------------------------------------------------------
  // Inicialización
  // ------------------------------------------------------------------
  function init() {
    var toolbox = document.getElementById(TOOLBOX_ID);
    if (!toolbox) return; // página sin #toolbox: no hay nada que hacer

    injectStyles();
    recomputeSoloMode(toolbox); // por si alguna sección ya estuviera activa al cargar

    var observer = new MutationObserver(function () {
      recomputeSoloMode(toolbox);
    });

    observer.observe(toolbox, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
