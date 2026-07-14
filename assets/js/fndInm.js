/**
 * fndInm.js — Statetty
 * -----------------------------------------------------------------------
 * Script GLOBAL invocado desde menuUser.js. NO es exclusivo de la página
 * del mapa ni del panel del engranaje: menuUser.js lo carga e invoca en
 * TODAS las páginas donde hay un usuario logueado, porque "Buscar
 * Inmuebles" es un ítem más del menú de usuario global (igual que "Mis
 * inmuebles" o "Mis datos"), no una función exclusiva del mapa.
 *
 * Qué hace:
 *   fndInm.js solo arma el CONTENIDO (el <select> de búsquedas guardadas
 *   + el <form> con los filtros) y lo agrega dentro de un contenedor que
 *   le pasa menuUser.js. Es menuUser.js quien decide DÓNDE vive ese
 *   contenedor en cada página, según el modo de integración que ya usa
 *   para el resto de su menú:
 *
 *   - Modo TOOLBOX (solo la página del mapa, donde existe #toolbox):
 *     el contenido se envuelve en el mismo acordeón ".section >
 *     .section-header + .section-body" que usan las secciones propias
 *     de mapa.js (.section-header con toggle delegado en
 *     $(document).on('click', '.section-header', ...)). Se monta como
 *     window.STT_FND_INM.mount(containerEl, usuario, { variant: 'toolbox' }).
 *
 *   - Modo CTA / dropdown (el resto de las páginas, sin #toolbox): el
 *     contenido se monta dentro del mismo dropdown flotante que
 *     menuUser.js despliega al tocar el ícono de usuario, arriba de los
 *     demás links del menú (Mis inmuebles / Mis datos / Mapa), para
 *     aprovechar mejor el espacio al desplegar. Como ahí no existe el
 *     acordeón de mapa.js, se monta sin envoltorio de sección propia:
 *     window.STT_FND_INM.mount(containerEl, usuario, { variant: 'standalone' }).
 *
 *   En ambos casos, "Buscar Inmuebles" queda SIEMPRE visible para el
 *   usuario logueado (sujeto solo al gate temporal de pruebas que define
 *   menuUser.js), en cualquier página del sitio.
 *
 *   El contenido en sí, sea cual sea la variante, es siempre el mismo:
 *     1. Un <select> llamado "slots" (id="fndInm-slots-select") para
 *        elegir búsquedas guardadas. Por ahora va vacío (solo el
 *        placeholder); la lógica de carga/población se agrega después.
 *     2. Un formulario (id="fndInm-form") con un campo por cada parámetro
 *        que espera recibir buscarInmuebles() (ver paramfnd.md /
 *        nodeLab/servicios/statetty/inmuebles.js:639).
 *
 *   Este script NO dispara ningún AJAX todavía: el submit del formulario
 *   está prevenido y solo arma el objeto de parámetros (getParams()) y lo
 *   pasa a window.STT_FND_INM.onSearch si existe, o lo deja en consola.
 *   Eso se conecta a la API en un paso posterior.
 *
 * Toolbox interno (fieldsets), igual en ambas variantes:
 *   - Cada grupo de parámetros es un <fieldset> que funciona como un
 *     mini-acordeón: solo se ve su <legend>; al hacer click se expande
 *     mostrando sus campos, y al desplegar uno se contraen todos los
 *     demás (solo un fieldset abierto a la vez, para ahorrar espacio).
 *   - El <legend> muestra, además del título del grupo, un resumen
 *     dinámico de los valores cargados (ej. "Ubicación y radio |
 *     -17.76, -63.18 - 2Km"), así el usuario ve de un vistazo qué hay
 *     configurado sin necesidad de expandir cada grupo.
 *   - Latitud/longitud se editan en un solo input ("lat, lng"); por
 *     dentro se separan en dos inputs ocultos (name="lat" / name="lng")
 *     que son los que finalmente arma getParams().
 *   - Cada input tiene tooltip explicando cómo afecta al resultado de
 *     la búsqueda (se muestra con foco/hover en desktop y con un tap en
 *     mobile). Cada fieldset tiene su propio tooltip colgado de un
 *     ícono "ⓘ" en el legend (aparte del texto y el caret), para no
 *     interferir con el tap que abre/cierra el fieldset.
 *
 * Dependencias (tooltips):
 *   - Los tooltips usan Tippy.js (https://atomiks.github.io/tippyjs/),
 *     liviano (~10kb) y con soporte táctil de fábrica (en mobile se
 *     muestran con un tap y se cierran al tocar fuera). Hay que cargarlo
 *     ANTES de que este script llame a mount(), agregando en el <head>
 *     o antes de </body> del HTML de la página:
 *
 *       <link rel="stylesheet" href="https://unpkg.com/tippy.js@6/dist/tippy.css">
 *       <script src="https://unpkg.com/@popperjs/core@2"></script>
 *       <script src="https://unpkg.com/tippy.js@6"></script>
 *
 *   - Si por algún motivo Tippy.js no está disponible, fndInm.js no
 *     rompe: hace fallback automático al tooltip nativo del navegador
 *     (atributo title) y deja un console.warn avisando.
 *
 * Integración:
 *   - menuUser.js reserva primero el contenedor donde va a vivir
 *     "Buscar Inmuebles" (arriba de sus propios links, en toolbox o en
 *     el dropdown según corresponda) y recién después llama a
 *     window.STT_FND_INM.mount(containerEl, usuario, { variant }).
 *     fndInm.js no asume ni un id ni una posición fija: solo agrega su
 *     contenido dentro del containerEl que recibe.
 *   - Es idempotente: si ya existe #fndInm-section en la página no
 *     vuelve a crearla (evita duplicados si el evento de sesión se
 *     dispara más de una vez).
 *
 * Personalización:
 *   - window.STT_FND_INM_DEFAULTS puede sobreescribir los valores por
 *     defecto de cualquier campo del formulario antes de que este script
 *     se ejecute, ej: window.STT_FND_INM_DEFAULTS = { dist: 2, pMax: 500000 }
 *     (para el centro también se puede pasar { lat: -17.76, lng: -63.18 })
 *   - window.STT_FND_INM.onSearch = function(params) {...} para engancharle
 *     la búsqueda real (AJAX) cuando esté lista.
 */
(function () {
  'use strict';

  var SECTION_ID = 'fndInm-section';
  var FORM_ID = 'fndInm-form';
  var SLOTS_SELECT_ID = 'fndInm-slots-select';
  var STYLE_ID = 'stt-fndinm-styles';
  var TIPPY_THEME = 'fndinm';

  // ------------------------------------------------------------------
  // Definición de campos (según paramfnd.md)
  // ------------------------------------------------------------------
  // type: 'text' | 'number' | 'select' | 'checkbox' | 'hidden' | 'latlng'
  // Cada grupo se renderiza como un <fieldset> dentro de la sección.
  // - group.tooltip: texto explicativo del grupo completo (va en el ícono ⓘ del legend)
  // - group.summary(form): arma el resumen dinámico que se muestra en el legend
  // - field.tooltip: texto explicativo de ese campo puntual (va en el input, vía Tippy.js)
  var GROUPS = [
    {
      legend: 'Ubicación y radio',
      tooltip: 'Define el centro geográfico y el radio de búsqueda alrededor de ese punto.',
      fields: [
        {
          name: 'latlng', type: 'latlng', label: 'Coordenadas (lat, lng)',
          placeholder: 'Ej: -17.76, -63.18 — vacío = centro del usuario',
          tooltip: 'Centro de búsqueda: latitud y longitud separadas por coma. Si se deja vacío, se usa el centro de la ciudad del usuario.'
        },
        {
          name: 'dist', type: 'number', label: 'Radio de búsqueda (km)', step: '0.1', min: '0', def: 1,
          tooltip: 'Radio en kilómetros alrededor del centro. Solo se incluyen inmuebles dentro de este radio.'
        }
      ],
      summary: function (form) {
        var lat = getVal(form, 'lat');
        var lng = getVal(form, 'lng');
        var dist = getVal(form, 'dist');
        var parts = [];
        var latN = parseFloat(lat), lngN = parseFloat(lng);
        if (!isNaN(latN) && !isNaN(lngN)) parts.push(latN.toFixed(2) + ', ' + lngN.toFixed(2));
        if (dist !== '') parts.push(dist + 'Km');
        return parts.join(' - ');
      }
    },
    {
      legend: 'Precio y antigüedad',
      tooltip: 'Filtra por rango de precio y por qué tan reciente es la publicación.',
      fields: [
        { name: 'pMin', type: 'number', label: 'Precio mínimo (USD)', min: '0', def: 1, tooltip: 'Excluye inmuebles con precio menor a este valor (USD).' },
        { name: 'pMax', type: 'number', label: 'Precio máximo (USD)', min: '0', def: 100000000, tooltip: 'Excluye inmuebles con precio mayor a este valor (USD).' },
        { name: 'antiguedad', type: 'number', label: 'Antigüedad máxima (meses)', min: '0', def: 3, tooltip: 'Excluye publicaciones con más antigüedad que este número de meses.' }
      ],
      summary: function (form) {
        var pMin = getVal(form, 'pMin');
        var pMax = getVal(form, 'pMax');
        var ant = getVal(form, 'antiguedad');
        var parts = [];
        if (pMin !== '' || pMax !== '') parts.push('$' + (pMin || '0') + ' - $' + (pMax || '∞'));
        if (ant !== '') parts.push(ant + ' meses');
        return parts.join(', ');
      }
    },
    {
      legend: 'Estado',
      tooltip: 'Filtra por estado de la publicación y si se incluyen operaciones ya concretadas.',
      fields: [
        {
          name: 'activos', type: 'select', label: 'Estado del inmueble', def: '1',
          tooltip: 'Filtra por estado del inmueble: todos, solo activos o solo inactivos.',
          options: [
            { value: '', label: 'Todos' },
            { value: '1', label: 'Solo activos' },
            { value: '0', label: 'Solo inactivos' }
          ]
        },
        { name: 'seeSell', type: 'checkbox', label: 'Incluir vendidas', def: true, tooltip: 'Si está marcado, incluye en los resultados inmuebles ya vendidos.' },
        { name: 'seeRent', type: 'checkbox', label: 'Incluir alquiladas', def: true, tooltip: 'Si está marcado, incluye en los resultados inmuebles ya alquilados.' }
      ],
      summary: function (form) {
        var activos = getVal(form, 'activos');
        var labelMap = { '': 'Todos', '1': 'Activos', '0': 'Inactivos' };
        var parts = [labelMap.hasOwnProperty(activos) ? labelMap[activos] : 'Todos'];
        var extra = [];
        if (getChecked(form, 'seeSell')) extra.push('vendidas');
        if (getChecked(form, 'seeRent')) extra.push('alquiladas');
        if (extra.length) parts.push('+ ' + extra.join('/'));
        return parts.join(' ');
      }
    },
    {
      legend: 'Características mínimas',
      tooltip: 'Filtra por características físicas mínimas del inmueble.',
      fields: [
        { name: 'hab', type: 'number', label: 'Dormitorios (mín.)', min: '0', tooltip: 'Solo muestra inmuebles con al menos esta cantidad de dormitorios.' },
        { name: 'banos', type: 'number', label: 'Baños (mín.)', min: '0', tooltip: 'Solo muestra inmuebles con al menos esta cantidad de baños.' },
        { name: 'amb', type: 'number', label: 'Ambientes (mín.)', min: '0', tooltip: 'Solo muestra inmuebles con al menos esta cantidad de ambientes.' },
        { name: 'anoc', type: 'number', label: 'Año de construcción (mín.)', min: '0', tooltip: 'Solo muestra inmuebles construidos en o después de este año.' }
      ],
      summary: function (form) {
        var map = [['hab', 'dorm'], ['banos', 'baños'], ['amb', 'amb'], ['anoc', 'año≥']];
        var parts = [];
        map.forEach(function (pair) {
          var v = getVal(form, pair[0]);
          if (v !== '') parts.push('≥' + v + ' ' + pair[1]);
        });
        return parts.join(', ');
      }
    },
    {
      legend: 'Superficies (m²)',
      tooltip: 'Filtra por superficie de construcción y de terreno.',
      fields: [
        { name: 'm2c', type: 'number', label: 'Construcción mín. (m2c)', min: '0', tooltip: 'Superficie de construcción mínima, en m².' },
        { name: 'm2cgt', type: 'number', label: 'Construcción ≥ (m2cgt)', min: '0', tooltip: 'Solo inmuebles con superficie de construcción mayor o igual a este valor.' },
        { name: 'm2clt', type: 'number', label: 'Construcción ≤ (m2clt)', min: '0', tooltip: 'Solo inmuebles con superficie de construcción menor o igual a este valor.' },
        { name: 'm2t', type: 'number', label: 'Terreno mín. (m2t)', min: '0', tooltip: 'Superficie de terreno mínima, en m².' },
        { name: 'm2tgt', type: 'number', label: 'Terreno ≥ (m2tgt)', min: '0', tooltip: 'Solo inmuebles con superficie de terreno mayor o igual a este valor.' },
        { name: 'm2tlt', type: 'number', label: 'Terreno ≤ (m2tlt)', min: '0', tooltip: 'Solo inmuebles con superficie de terreno menor o igual a este valor.' }
      ],
      summary: function (form) {
        var map = [
          ['m2c', 'constr.mín'], ['m2cgt', 'constr.≥'], ['m2clt', 'constr.≤'],
          ['m2t', 'terr.mín'], ['m2tgt', 'terr.≥'], ['m2tlt', 'terr.≤']
        ];
        var parts = [];
        map.forEach(function (pair) {
          var v = getVal(form, pair[0]);
          if (v !== '') parts.push(pair[1] + ' ' + v + 'm²');
        });
        return parts.join(', ');
      }
    },
    {
      legend: 'Filtrar por ID',
      tooltip: 'Restringe la búsqueda a una agencia, agente o inmueble específico.',
      fields: [
        { name: 'agenciaID', type: 'text', label: 'ID de agencia', tooltip: 'Solo muestra inmuebles publicados por esta agencia.' },
        { name: 'agenteID', type: 'text', label: 'ID de agente', tooltip: 'Solo muestra inmuebles publicados por este agente.' },
        { name: 'inmuebleID', type: 'text', label: 'ID de inmueble', tooltip: 'Busca directamente un inmueble puntual por su ID.' }
      ],
      summary: function (form) {
        var map = [['agenciaID', 'agencia'], ['agenteID', 'agente'], ['inmuebleID', 'inmueble']];
        var parts = [];
        map.forEach(function (pair) {
          var v = getVal(form, pair[0]);
          if (v !== '') parts.push(pair[1] + ': ' + v);
        });
        return parts.join(', ');
      }
    },
    {
      legend: 'Términos de texto',
      tooltip: 'Filtra según palabras que deben o no aparecer en la descripción del inmueble.',
      fields: [
        { name: 'whiteList', type: 'text', label: 'Debe incluir (separados por coma)', placeholder: 'ej: piscina, garaje', tooltip: 'Solo incluye inmuebles cuya descripción contenga estas palabras (separadas por coma).' },
        { name: 'blackList', type: 'text', label: 'Debe excluir (separados por coma)', placeholder: 'ej: anticrético', tooltip: 'Excluye inmuebles cuya descripción contenga estas palabras (separadas por coma).' }
      ],
      summary: function (form) {
        var parts = [];
        var wl = getVal(form, 'whiteList');
        var bl = getVal(form, 'blackList');
        if (wl !== '') parts.push('+' + truncate(wl, 18));
        if (bl !== '') parts.push('-' + truncate(bl, 18));
        return parts.join(', ');
      }
    },
    {
      legend: 'Otros',
      tooltip: 'Parámetros adicionales.',
      fields: [
        { name: 'ciudad', type: 'text', label: 'Ciudad', tooltip: 'Nombre de la ciudad. Definido en la API pero aún no se usa para filtrar (solo se usa el centro lat/lng).', note: 'Definido en la API pero aún no usado en la búsqueda (solo se usa el centro lat/lng).' }
      ],
      summary: function (form) {
        var v = getVal(form, 'ciudad');
        return v !== '' ? v : '';
      }
    }
  ];

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  function getVal(form, name) {
    var el = form.elements[name];
    return el ? String(el.value).trim() : '';
  }

  function getChecked(form, name) {
    var el = form.elements[name];
    return !!(el && el.checked);
  }

  function truncate(str, max) {
    return str.length > max ? str.slice(0, max) + '…' : str;
  }

  // Acepta "lat, lng", "lat lng" o "lat;lng"
  function parseLatLng(str) {
    if (!str) return null;
    var parts = String(str).split(/[,;]+|\s+/).map(function (s) { return s.trim(); })
      .filter(function (s) { return s !== ''; });
    if (parts.length < 2) return null;
    var lat = parseFloat(parts[0]);
    var lng = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat: lat, lng: lng };
  }

  // ------------------------------------------------------------------
  // Estilos (mínimos, heredan tipografía/color de la página, igual que
  // el resto de #toolbox)
  // ------------------------------------------------------------------
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      // Reset propio de box-sizing: fndInm.js no debe asumir que la página
      // host trae un "*{box-sizing:border-box}" global (el mapa sí lo
      // tiene vía mapa.css; el resto de las páginas, no necesariamente).
      // Sin esto, fieldsets/inputs pueden medirse distinto según la
      // página en la que se monte.
      '#' + SECTION_ID + ',#' + SECTION_ID + ' *,#' + SECTION_ID + ' *::before,' +
      '#' + SECTION_ID + ' *::after{box-sizing:border-box;}' +
      '#' + SECTION_ID + ' .fndinm-slots{display:flex;gap:6px;align-items:center;' +
      'margin-bottom:10px;flex-wrap:wrap;}' +
      '#' + SECTION_ID + ' .fndinm-slots select{flex:1;min-width:120px;}' +
      '#' + SECTION_ID + ' fieldset{border:1px solid rgba(0,0,0,.12);border-radius:8px;' +
      'margin:0 0 8px;padding:6px 10px;}' +
      '#' + SECTION_ID + ' legend{display:flex;align-items:center;gap:6px;width:100%;' +
      'font-size:.82rem;font-weight:600;padding:4px 4px;opacity:.85;cursor:pointer;' +
      'user-select:none;box-sizing:border-box;}' +
      '#' + SECTION_ID + ' .fndinm-legend-title{white-space:nowrap;flex:0 0 auto;}' +
      '#' + SECTION_ID + ' .fndinm-legend-summary{flex:1 1 auto;min-width:0;font-weight:400;' +
      'opacity:.7;font-size:.78rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '#' + SECTION_ID + ' .fndinm-legend-info{flex:0 0 auto;display:inline-flex;' +
      'align-items:center;justify-content:center;width:16px;height:16px;font-size:.72rem;' +
      'line-height:1;opacity:.5;cursor:help;}' +
      '#' + SECTION_ID + ' .fndinm-legend-info:hover,' +
      '#' + SECTION_ID + ' .fndinm-legend-info:active{opacity:.9;}' +
      '#' + SECTION_ID + ' .fndinm-legend-caret{flex:0 0 auto;font-size:.7rem;margin-left:2px;' +
      'transition:transform .15s ease;opacity:.6;}' +
      '#' + SECTION_ID + ' fieldset.fndinm-fieldset-open .fndinm-legend-caret{transform:rotate(90deg);}' +
      '#' + SECTION_ID + ' .fndinm-fieldset-body{display:none;padding-top:6px;}' +
      '#' + SECTION_ID + ' fieldset.fndinm-fieldset-open .fndinm-fieldset-body{display:block;}' +
      '#' + SECTION_ID + ' .fndinm-row{display:flex;flex-direction:column;gap:2px;margin-bottom:8px;}' +
      '#' + SECTION_ID + ' .fndinm-row:last-child{margin-bottom:0;}' +
      '#' + SECTION_ID + ' .fndinm-row label{font-size:.8rem;opacity:.8;}' +
      '#' + SECTION_ID + ' .fndinm-row input[type="text"],' +
      '#' + SECTION_ID + ' .fndinm-row input[type="number"],' +
      '#' + SECTION_ID + ' .fndinm-row select,' +
      // El <select> de "Búsquedas guardadas" (.fndinm-slots) vive FUERA de
      // cualquier .fndinm-row, así que antes quedaba afuera de este
      // selector y no recibía padding/borde/radius: se veía con el estilo
      // nativo "pelado" del navegador. Se agrega explícitamente acá.
      '#' + SECTION_ID + ' .fndinm-slots select{padding:5px 6px;border:1px solid rgba(0,0,0,.2);' +
      'border-radius:6px;font-size:.85rem;width:100%;box-sizing:border-box;}' +
      '#' + SECTION_ID + ' .fndinm-row-inline{flex-direction:row;align-items:center;gap:6px;}' +
      '#' + SECTION_ID + ' .fndinm-note{font-size:.72rem;opacity:.65;margin-top:2px;}' +
      '#' + SECTION_ID + ' .fndinm-actions{display:flex;gap:8px;margin-top:4px;}' +
      // Antes los botones no tenían NINGÚN estilo propio (ni fondo, ni
      // borde, ni color, ni padding) más que "flex:1": dependían por
      // completo de que la página host ya tuviera un estilo global para
      // <button>, cosa que solo pasa en la página del mapa. Se agrega acá
      // un estilo base autocontenido para que se vean bien en cualquier
      // página, con var(--blue)/var(--blue-dark) como mejora progresiva
      // si la página los define (igual que hace menuUser.js) y un color
      // de respaldo fijo si no.
      '#' + SECTION_ID + ' .fndinm-actions button{flex:1;padding:9px 10px;' +
      'border:1px solid rgba(0,0,0,.15);border-radius:6px;font-size:.85rem;' +
      'cursor:pointer;background:#f4f6f7;color:inherit;' +
      'transition:background .15s ease,border-color .15s ease;}' +
      '#' + SECTION_ID + ' .fndinm-actions button:hover{background:rgba(0,0,0,.08);}' +
      '#' + SECTION_ID + ' #fndInm-btn-buscar{background:var(--blue,#17baef);' +
      'border-color:var(--blue,#17baef);color:#fff;}' +
      '#' + SECTION_ID + ' #fndInm-btn-buscar:hover{background:var(--blue-dark,#0f95bd);' +
      'border-color:var(--blue-dark,#0f95bd);}' +
      // Variante standalone (dentro del dropdown de menuUser.js): título
      // propio no interactivo + límite de alto con scroll, porque acá no
      // hay un acordeón exterior que la contenga (a diferencia de #toolbox).
      '#' + SECTION_ID + '.fndinm-standalone{max-height:min(65vh,520px);' +
      'overflow-y:auto;overflow-x:hidden;padding-bottom:8px;margin-bottom:8px;' +
      'border-bottom:1px solid rgba(0,0,0,.1);}' +
      '#' + SECTION_ID + ' .fndinm-standalone-title{font-weight:700;font-size:.85rem;' +
      'opacity:.85;margin-bottom:8px;}' +
      // Tema Tippy.js propio, para que los tooltips combinen con el toolbox
      // (los popups de Tippy se insertan en document.body, por eso van
      // fuera del prefijo "#SECTION_ID").
      '.tippy-box[data-theme~="' + TIPPY_THEME + '"]{background-color:#25282c;color:#fff;' +
      'font-size:.72rem;line-height:1.35;border-radius:6px;' +
      'box-shadow:0 2px 8px rgba(0,0,0,.25);}' +
      '.tippy-box[data-theme~="' + TIPPY_THEME + '"] .tippy-content{padding:6px 9px;}' +
      '.tippy-box[data-theme~="' + TIPPY_THEME + '"] .tippy-arrow{color:#25282c;}';
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ------------------------------------------------------------------
  // Construcción de un campo individual
  // ------------------------------------------------------------------
  function buildField(field) {
    var row = document.createElement('div');
    row.className = 'fndinm-row' + (field.type === 'checkbox' ? ' fndinm-row-inline' : '');

    var inputId = 'fndInm-' + field.name;

    // ---- Campo especial: lat/lng combinados en un solo input ----
    if (field.type === 'latlng') {
      var combined = document.createElement('input');
      combined.type = 'text';
      combined.id = inputId;
      if (field.placeholder) combined.placeholder = field.placeholder;
      if (field.tooltip) combined.setAttribute('data-tippy-content', field.tooltip);

      var hiddenLat = document.createElement('input');
      hiddenLat.type = 'hidden';
      hiddenLat.id = 'fndInm-lat';
      hiddenLat.name = 'lat';

      var hiddenLng = document.createElement('input');
      hiddenLng.type = 'hidden';
      hiddenLng.id = 'fndInm-lng';
      hiddenLng.name = 'lng';

      // Overrides externos: window.STT_FND_INM_DEFAULTS = { lat: -17.76, lng: -63.18 }
      var overrides = window.STT_FND_INM_DEFAULTS || {};
      var defLat = Object.prototype.hasOwnProperty.call(overrides, 'lat') ? overrides.lat : undefined;
      var defLng = Object.prototype.hasOwnProperty.call(overrides, 'lng') ? overrides.lng : undefined;
      if (defLat !== undefined && defLng !== undefined && defLat !== '' && defLng !== '') {
        combined.value = defLat + ', ' + defLng;
        hiddenLat.value = defLat;
        hiddenLng.value = defLng;
      }

      // El input visible es la fuente de verdad "para presentar/recibir";
      // los ocultos son los que efectivamente se envían.
      combined.addEventListener('input', function () {
        var parsed = parseLatLng(combined.value);
        hiddenLat.value = parsed ? parsed.lat : '';
        hiddenLng.value = parsed ? parsed.lng : '';
      });

      var llLabel = document.createElement('label');
      llLabel.setAttribute('for', inputId);
      llLabel.textContent = field.label;

      row.appendChild(llLabel);
      row.appendChild(combined);
      row.appendChild(hiddenLat);
      row.appendChild(hiddenLng);

      if (field.note) {
        var llNote = document.createElement('div');
        llNote.className = 'fndinm-note';
        llNote.textContent = field.note;
        row.appendChild(llNote);
      }

      return row;
    }

    var input;

    if (field.type === 'select') {
      input = document.createElement('select');
      input.id = inputId;
      input.name = field.name;
      (field.options || []).forEach(function (opt) {
        var o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        input.appendChild(o);
      });
      if (field.def !== undefined) input.value = field.def;
    } else if (field.type === 'checkbox') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.id = inputId;
      input.name = field.name;
      input.checked = !!field.def;
    } else {
      input = document.createElement('input');
      input.type = field.type === 'number' ? 'number' : 'text';
      input.id = inputId;
      input.name = field.name;
      if (field.placeholder) input.placeholder = field.placeholder;
      if (field.step) input.step = field.step;
      if (field.min !== undefined) input.min = field.min;
      if (field.def !== undefined) input.value = field.def;
    }

    if (field.tooltip) input.setAttribute('data-tippy-content', field.tooltip);

    // window.STT_FND_INM_DEFAULTS permite sobreescribir el valor inicial
    var overrides2 = window.STT_FND_INM_DEFAULTS || {};
    if (Object.prototype.hasOwnProperty.call(overrides2, field.name)) {
      if (field.type === 'checkbox') input.checked = !!overrides2[field.name];
      else input.value = overrides2[field.name];
    }

    var label = document.createElement('label');
    label.setAttribute('for', inputId);
    label.textContent = field.label;

    if (field.type === 'checkbox') {
      row.appendChild(input);
      row.appendChild(label);
    } else {
      row.appendChild(label);
      row.appendChild(input);
    }

    if (field.note) {
      var note = document.createElement('div');
      note.className = 'fndinm-note';
      note.textContent = field.note;
      row.appendChild(note);
    }

    return row;
  }

  // ------------------------------------------------------------------
  // Construcción del <select> de slots (vacío por ahora)
  // ------------------------------------------------------------------
  function buildSlotsControl() {
    var wrap = document.createElement('div');
    wrap.className = 'fndinm-slots';

    var select = document.createElement('select');
    select.id = SLOTS_SELECT_ID;
    select.name = 'slots';
    select.setAttribute('data-tippy-content', 'Búsquedas guardadas: elegí una para precargar todos los campos del formulario.');

    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Búsquedas guardadas…';
    select.appendChild(placeholder);
    // TODO: popular este <select> con las búsquedas guardadas del usuario
    // (ajax) y disparar el llenado del formulario al elegir una opción.

    wrap.appendChild(select);
    return wrap;
  }

  // ------------------------------------------------------------------
  // Tooltips (Tippy.js si está cargado; si no, fallback a title nativo)
  // ------------------------------------------------------------------
  function initTooltips(rootEl) {
    var targets = rootEl.querySelectorAll('[data-tippy-content]');
    if (!targets.length) return;

    if (window.tippy) {
      window.tippy(targets, {
        theme: TIPPY_THEME,
        placement: 'top',
        maxWidth: 220,
        delay: [150, 0],
        touch: true, // en mobile: se muestra con un tap, se oculta al tocar afuera
        appendTo: function () { return document.body; }
      });
    } else {
      console.warn(
        '[fndInm] Tippy.js no está cargado; los tooltips usarán el título ' +
        'nativo del navegador como respaldo. Ver la cabecera de fndInm.js ' +
        'para las etiquetas <link>/<script> necesarias (CDN de Tippy.js).'
      );
      targets.forEach(function (el) {
        el.title = el.getAttribute('data-tippy-content');
      });
    }
  }

  // ------------------------------------------------------------------
  // Leyendas dinámicas + acordeón de fieldsets (uno abierto a la vez)
  // ------------------------------------------------------------------
  function refreshLegends(form, fieldsetRefs) {
    fieldsetRefs.forEach(function (ref) {
      var summarySpan = ref.el.querySelector('.fndinm-legend-summary');
      if (!summarySpan) return;
      var text = '';
      if (typeof ref.group.summary === 'function') {
        try { text = ref.group.summary(form) || ''; } catch (e) { text = ''; }
      }
      summarySpan.textContent = text ? ' | ' + text : '';
    });
  }

  function attachFieldsetAccordion(form, fieldsetRefs) {
    form.addEventListener('click', function (e) {
      var legend = e.target.closest ? e.target.closest('legend') : null;
      if (!legend) return;
      e.preventDefault();
      var fieldset = legend.parentNode;
      var wasOpen = fieldset.classList.contains('fndinm-fieldset-open');
      fieldsetRefs.forEach(function (ref) {
        ref.el.classList.remove('fndinm-fieldset-open');
      });
      if (!wasOpen) fieldset.classList.add('fndinm-fieldset-open');
    });
  }

  // ------------------------------------------------------------------
  // Construcción del formulario completo
  // ------------------------------------------------------------------
  function buildForm(usuario) {
    var form = document.createElement('form');
    form.id = FORM_ID;
    form.setAttribute('autocomplete', 'off');

    // userID: no se pide en el form, se resuelve solo con el usuario logueado
    var userIdInput = document.createElement('input');
    userIdInput.type = 'hidden';
    userIdInput.id = 'fndInm-userID';
    userIdInput.name = 'userID';
    userIdInput.value = (usuario && (usuario._id || usuario.userID)) || '';
    form.appendChild(userIdInput);

    var fieldsetRefs = [];

    GROUPS.forEach(function (group) {
      var fieldset = document.createElement('fieldset');
      var legend = document.createElement('legend');

      var titleSpan = document.createElement('span');
      titleSpan.className = 'fndinm-legend-title';
      titleSpan.textContent = group.legend;

      var summarySpan = document.createElement('span');
      summarySpan.className = 'fndinm-legend-summary';

      var caretSpan = document.createElement('span');
      caretSpan.className = 'fndinm-legend-caret';
      caretSpan.textContent = '▸';

      legend.appendChild(titleSpan);
      legend.appendChild(summarySpan);

      // Ícono de info aparte: tiene su propio tooltip explicando el grupo
      // completo, y frena la propagación del click para no disparar el
      // toggle del acordeón (que también escucha clicks sobre el legend).
      if (group.tooltip) {
        var infoSpan = document.createElement('span');
        infoSpan.className = 'fndinm-legend-info';
        infoSpan.textContent = 'ⓘ';
        infoSpan.setAttribute('data-tippy-content', group.tooltip);
        infoSpan.setAttribute('aria-label', group.tooltip);
        infoSpan.addEventListener('click', function (e) { e.stopPropagation(); });
        legend.appendChild(infoSpan);
      }

      legend.appendChild(caretSpan);
      fieldset.appendChild(legend);

      var bodyDiv = document.createElement('div');
      bodyDiv.className = 'fndinm-fieldset-body';
      group.fields.forEach(function (field) {
        bodyDiv.appendChild(buildField(field));
      });
      fieldset.appendChild(bodyDiv);

      form.appendChild(fieldset);
      fieldsetRefs.push({ group: group, el: fieldset });
    });

    attachFieldsetAccordion(form, fieldsetRefs);

    // Recalcular leyendas ante cualquier cambio en el formulario
    form.addEventListener('input', function () { refreshLegends(form, fieldsetRefs); });
    form.addEventListener('change', function () { refreshLegends(form, fieldsetRefs); });
    form.addEventListener('reset', function () {
      // Esperar a que el navegador aplique el reset nativo antes de
      // resincronizar el input combinado lat/lng y las leyendas.
      setTimeout(function () {
        var combined = document.getElementById('fndInm-latlng');
        if (combined) combined.dispatchEvent(new Event('input', { bubbles: true }));
        refreshLegends(form, fieldsetRefs);
      }, 0);
    });

    // Estado inicial de las leyendas (según valores por defecto/overrides)
    refreshLegends(form, fieldsetRefs);

    var actions = document.createElement('div');
    actions.className = 'fndinm-actions';

    var btnBuscar = document.createElement('button');
    btnBuscar.type = 'submit';
    btnBuscar.id = 'fndInm-btn-buscar';
    btnBuscar.textContent = '🔎 Buscar';
    btnBuscar.setAttribute('data-tippy-content', 'Ejecuta la búsqueda de inmuebles con los filtros configurados arriba.');

    var btnReset = document.createElement('button');
    btnReset.type = 'reset';
    btnReset.id = 'fndInm-btn-reset';
    btnReset.textContent = '↺ Limpiar';
    btnReset.setAttribute('data-tippy-content', 'Restablece todos los filtros a sus valores por defecto.');

    actions.appendChild(btnBuscar);
    actions.appendChild(btnReset);
    form.appendChild(actions);

    form.addEventListener('submit', function (e) {
      e.preventDefault(); // el AJAX real se conecta después
      var params = getParams();
      if (window.STT_FND_INM && typeof window.STT_FND_INM.onSearch === 'function') {
        window.STT_FND_INM.onSearch(params);
      } else {
        console.log('[fndInm] TODO: conectar AJAX a buscarInmuebles con params:', params);
      }
    });

    return form;
  }

  // ------------------------------------------------------------------
  // Lectura del formulario -> objeto de parámetros para buscarInmuebles
  // ------------------------------------------------------------------
  function getParams() {
    var form = document.getElementById(FORM_ID);
    if (!form) return {};

    var params = {};
    var numberFields = ['dist', 'antiguedad', 'pMin', 'pMax', 'hab', 'banos', 'amb',
      'm2c', 'm2t', 'm2clt', 'm2cgt', 'm2tlt', 'm2tgt', 'anoc'];
    // lat/lng siguen siendo dos campos independientes a nivel de datos;
    // solo la presentación/edición está unificada en un input "latlng".
    var textFields = ['lat', 'lng', 'userID', 'agenciaID', 'agenteID', 'inmuebleID',
      'whiteList', 'blackList', 'ciudad'];
    var boolFields = ['seeSell', 'seeRent'];

    textFields.forEach(function (name) {
      var el = form.elements[name];
      if (el && el.value !== '') params[name] = el.value.trim();
    });

    numberFields.forEach(function (name) {
      var el = form.elements[name];
      if (el && el.value !== '') {
        var n = parseFloat(el.value);
        if (!isNaN(n)) params[name] = n;
      }
    });

    boolFields.forEach(function (name) {
      var el = form.elements[name];
      if (el) params[name] = !!el.checked;
    });

    var activosEl = form.elements['activos'];
    if (activosEl && activosEl.value !== '') params.activos = parseInt(activosEl.value, 10);

    return params;
  }

  // ------------------------------------------------------------------
  // Construcción de la sección completa
  // ------------------------------------------------------------------
  // variant 'toolbox': se monta dentro de #toolbox (página del mapa) y se
  //   envuelve en el mismo acordeón ".section > .section-header +
  //   .section-body" que usa mapa.js, para heredar su toggle (delegado
  //   en document, ver cabecera del archivo).
  // variant 'standalone': se monta dentro del dropdown del menú de
  //   usuario (resto de páginas), donde no existe el acordeón de
  //   mapa.js. No lleva .section-header propio (ya está dentro de un
  //   dropdown que el propio menuUser.js abre/cierra); solo un título
  //   no interactivo arriba del selector de slots y el formulario.
  function buildSection(usuario, opts) {
    var variant = (opts && opts.variant === 'standalone') ? 'standalone' : 'toolbox';

    var section = document.createElement('div');
    section.id = SECTION_ID;

    if (variant === 'toolbox') {
      section.className = 'section';

      var header = document.createElement('div');
      header.className = 'section-header';
      header.textContent = 'Buscar Inmuebles';

      var body = document.createElement('div');
      body.className = 'section-body';
      body.appendChild(buildSlotsControl());
      body.appendChild(buildForm(usuario));

      section.appendChild(header);
      section.appendChild(body);
    } else {
      section.className = 'fndinm-standalone';

      var title = document.createElement('div');
      title.className = 'fndinm-standalone-title';
      title.textContent = 'Buscar Inmuebles';

      section.appendChild(title);
      section.appendChild(buildSlotsControl());
      section.appendChild(buildForm(usuario));
    }

    return section;
  }

  // ------------------------------------------------------------------
  // API pública
  // ------------------------------------------------------------------
  // mount(containerEl, usuario, opts)
  //   - containerEl: nodo donde insertar la sección. Lo decide quien
  //     llama (menuUser.js); fndInm.js no asume dónde vive.
  //   - opts.variant: 'toolbox' (default) | 'standalone' (ver arriba).
  function mount(containerEl, usuario, opts) {
    if (document.getElementById(SECTION_ID)) return false; // ya montada
    if (!containerEl) containerEl = document.getElementById('toolbox');
    if (!containerEl) return false;

    injectStyles();
    var section = buildSection(usuario, opts);
    containerEl.appendChild(section);
    initTooltips(section);
    return true;
  }

  window.STT_FND_INM = window.STT_FND_INM || {};
  window.STT_FND_INM.mount = mount;
  window.STT_FND_INM.getParams = getParams;
  // window.STT_FND_INM.onSearch se define desde afuera cuando se conecte el AJAX real.
})();
