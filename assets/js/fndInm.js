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
 *     muestran con un tap y se cierran al tocar fuera).
 *
 *   - Tippy.js es una dependencia GLOBAL de la app (no exclusiva de
 *     fndInm.js): se carga una sola vez, en el <head> de cada página
 *     (junto con jQuery/etc.), NO en el footer y NO desde este script.
 *     Agregar en el <head>:
 *
 *       <link rel="stylesheet" href="https://unpkg.com/tippy.js@6/dist/tippy.css">
 *       <script src="https://unpkg.com/@popperjs/core@2"></script>
 *       <script src="https://unpkg.com/tippy.js@6"></script>
 *
 *   - Si por algún motivo Tippy.js no está disponible cuando corre
 *     mount() (ej. una página que todavía no la incluyó en su <head>),
 *     fndInm.js no rompe: hace fallback automático al tooltip nativo del
 *     navegador (atributo title) y deja un console.warn avisando.
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

  // ------------------------------------------------------------------
  // Helpers para poblar el <select> de búsquedas guardadas
  // ------------------------------------------------------------------
  function formatPriceForLabel(val) {
    if (val === undefined || val === null || val === '') return '';
    var n = Number(val);
    if (isNaN(n)) return String(val);
    if (n >= 1000000) return Math.round(n / 1000000) + 'MM';
    if (n >= 1000) return Math.round(n / 1000) + 'K';
    return String(n);
  }

  function buildSlotLabel(param) {
    if (param.nombre && String(param.nombre).trim()) return String(param.nombre).trim();
    var parts = [];
    if (param.lat !== undefined && param.lng !== undefined) {
      var latN = Number(param.lat), lngN = Number(param.lng);
      if (!isNaN(latN) && !isNaN(lngN)) parts.push(latN.toFixed(2) + ',' + lngN.toFixed(2));
    }
    var pMin = formatPriceForLabel(param.pMin);
    var pMax = formatPriceForLabel(param.pMax);
    var priceStr = '';
    if (pMin || pMax) priceStr = (pMin || '') + ' - ' + (pMax || '');
    if (priceStr) parts.push(priceStr);
    return parts.join(' | ');
  }

  function populateSlots(selectEl, usuario) {
    while (selectEl.options.length > 1) selectEl.remove(1);
    var busquedas = usuario && usuario.busquedas;
    if (!Array.isArray(busquedas)) return;
    busquedas.forEach(function (jsonStr, idx) {
      if (!jsonStr || jsonStr === '{}') return;
      try {
        var param = JSON.parse(jsonStr);
        var opt = document.createElement('option');
        opt.value = jsonStr;
        opt.setAttribute('data-index', idx);
        opt.textContent = buildSlotLabel(param);
        selectEl.appendChild(opt);
      } catch (e) {}
    });
  }

  // Acepta "lat, lng", "lat lng" o "lat;lng"
  // ------------------------------------------------------------------
  // Status indicator helpers
  // ------------------------------------------------------------------
  var _saveTimer = null;

  function showSaveStatus(state, msg) {
    var el = document.getElementById('fndInm-save-status');
    if (!el) return;
    el.className = 'fndinm-save-status';
    if (state === 'saving') {
      el.innerHTML = '<span class="fndinm-spinner"></span>';
    } else if (state === 'success') {
      el.innerHTML = '\u2705 ' + (msg || 'Cambio realizado');
      el.classList.add('fndinm-success');
      clearTimeout(el._hideTimer);
      el._hideTimer = setTimeout(function () { el.innerHTML = ''; }, 5000);
    } else if (state === 'error') {
      el.innerHTML = '\u274c ' + (msg || 'Error al actualizar');
      el.classList.add('fndinm-error');
      clearTimeout(el._hideTimer);
      el._hideTimer = setTimeout(function () { el.innerHTML = ''; }, 5000);
    }
  }

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
      // Color de texto propio: legend/label/summary/note NO son controles
      // de formulario, así que SÍ heredan el "color" del body de la
      // página. En el mapa, #toolbox ya fija un color oscuro; en el
      // resto de las páginas el body puede ser blanco (hero/navbar), y
      // el texto quedaba blanco sobre el fondo blanco del dropdown
      // (invisible). Los inputs/selects/botones no se ven afectados por
      // esto porque los navegadores no les heredan color por defecto.
      '#' + SECTION_ID + '{color:#2b3a42;}' +
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
      '#' + SECTION_ID + ' .fndinm-latlng-wrapper{display:flex;flex-direction:row;align-items:center;gap:4px;}' +
      '#' + SECTION_ID + ' .fndinm-latlng-wrapper input{flex:1;}' +
      '#' + SECTION_ID + ' .fndinm-latlng-search{cursor:pointer;font-size:1rem;padding:0 4px;user-select:none;}' +
      '#' + SECTION_ID + ' .fndinm-latlng-search:hover{opacity:.7;}' +
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
      // Espacio invisible después de los botones Buscar/Limpiar: cuando el
      // formulario desplegado llena todo el alto de #toolbox (que ahora
      // ocupa 100vh, ver index.html), los botones quedaban pegados al
      // borde inferior real del panel al scrollear hasta el final. Este
      // div vacío se agrega en buildForm() justo después de "actions" y
      // viaja con el contenido (no depende del padding del contenedor).
      '#' + SECTION_ID + ' .fndinm-bottom-spacer{height:28px;flex-shrink:0;}' +
      // Variante standalone (dentro del dropdown de menuUser.js): título
      // propio no interactivo + límite de alto con scroll, porque acá no
      // hay un acordeón exterior que la contenga (a diferencia de #toolbox).
      '#' + SECTION_ID + '.fndinm-standalone{max-height:min(65vh,520px);' +
      'overflow-y:auto;overflow-x:hidden;padding-bottom:8px;margin-bottom:8px;' +
      'border-bottom:1px solid rgba(0,0,0,.1);}' +
      // Header propio y clickeable de la variante standalone: acá NO hay
      // acordeón externo (el de mapa.js no existe fuera del mapa), así
      // que fndInm.js tiene que resolver su propio colapsar/expandir para
      // no ocupar todo el dropdown con el formulario siempre abierto.
      // Empieza cerrado (ver buildSection): solo el header es visible
      // hasta que el usuario lo toca.
      '#' + SECTION_ID + ' .fndinm-standalone-header{display:flex;align-items:center;' +
      'justify-content:space-between;gap:6px;cursor:pointer;user-select:none;' +
      'padding:2px 2px 8px;}' +
      '#' + SECTION_ID + ' .fndinm-standalone-title{font-weight:700;font-size:.85rem;opacity:.85;}' +
      '#' + SECTION_ID + ' .fndinm-standalone-caret{font-size:.7rem;opacity:.6;' +
      'transition:transform .15s ease;}' +
      '#' + SECTION_ID + '.fndinm-standalone-open .fndinm-standalone-caret{transform:rotate(90deg);}' +
      '#' + SECTION_ID + ' .fndinm-standalone-body{display:none;}' +
      '#' + SECTION_ID + '.fndinm-standalone-open .fndinm-standalone-body{display:block;}' +
      '#' + SECTION_ID + ' #fndInm-acm-pointer{font-size:.8rem;margin-bottom:4px;display:flex;align-items:center;gap:6px;}' +
      '#' + SECTION_ID + ' #fndInm-acm-usar-btn{padding:2px 8px;border:1px solid rgba(0,0,0,.15);border-radius:4px;cursor:pointer;background:#f4f6f7;font-size:.78rem;}' +
      '#' + SECTION_ID + ' #fndInm-acm-usar-btn:hover{background:rgba(0,0,0,.08);}' +
      '#' + SECTION_ID + ' #fndInm-save-status{margin-left:auto;font-size:.78rem;display:flex;align-items:center;gap:4px;flex-shrink:0;}' +
      '#' + SECTION_ID + ' .fndinm-spinner{width:14px;height:14px;border:2px solid #ddd;border-top-color:#17baef;border-radius:50%;animation:fndinm-spin .6s linear infinite;display:inline-block;}' +
      '@keyframes fndinm-spin{to{transform:rotate(360deg)}}' +
      '@keyframes fndinm-search-spin{to{transform:rotate(360deg)}}' +
      '#' + SECTION_ID + ' .fndinm-save-status.fndinm-success{color:#28a745;}' +
      '#' + SECTION_ID + ' .fndinm-save-status.fndinm-error{color:#dc3545;}' +
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

      // --- Indicador de coordenadas del pointer ACM ---
      var acmPointerDiv = document.createElement('div');
      acmPointerDiv.id = 'fndInm-acm-pointer';
      acmPointerDiv.style.display = 'none';

      var acmIcon = document.createTextNode('\ud83d\udccd ACM: ');
      acmPointerDiv.appendChild(acmIcon);

      var acmCoordSpan = document.createElement('span');
      acmCoordSpan.id = 'fndInm-acm-coord-text';
      acmPointerDiv.appendChild(acmCoordSpan);

      var acmUsarBtn = document.createElement('button');
      acmUsarBtn.id = 'fndInm-acm-usar-btn';
      acmUsarBtn.type = 'button';
      acmUsarBtn.textContent = 'Usar';
      acmUsarBtn.addEventListener('click', function () {
        if (window.__acmCoords) {
          combined.value = window.__acmCoords.lat + ', ' + window.__acmCoords.lng;
          combined.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      acmPointerDiv.appendChild(acmUsarBtn);

      if (window.__acmCoords && window.__acmCoords.lat !== undefined && window.__acmCoords.lng !== undefined) {
        acmCoordSpan.textContent = window.__acmCoords.lat + ', ' + window.__acmCoords.lng;
        acmPointerDiv.style.display = '';
      }

      row.appendChild(acmPointerDiv);
      var combinedWrapper = document.createElement('div');
      combinedWrapper.className = 'fndinm-latlng-wrapper';

      var searchBtn = document.createElement('span');
      searchBtn.className = 'fndinm-latlng-search';
      searchBtn.textContent = '\ud83d\udd0d';
      searchBtn.setAttribute('data-tippy-content', 'Mover puntero ACM a estas coordenadas');
      searchBtn.addEventListener('click', function () {
        var parsed = parseLatLng(combined.value);
        if (!parsed) return;
        window.__acmCoords = { lat: parsed.lat, lng: parsed.lng };
        if (window.__acmMarker && window.map) {
          window.__acmMarker.setLatLng([parsed.lat, parsed.lng]);
          window.map.panTo([parsed.lat, parsed.lng]);
        } else if (window.map) {
          window.map.fire('click', { latlng: L.latLng(parsed.lat, parsed.lng) });
          window.map.panTo([parsed.lat, parsed.lng]);
        }
        if (window.STT_FND_INM && typeof window.STT_FND_INM.refreshACMPointer === 'function') {
          window.STT_FND_INM.refreshACMPointer();
        }
      });

      combinedWrapper.appendChild(combined);
      combinedWrapper.appendChild(searchBtn);

      row.appendChild(llLabel);
      row.appendChild(combinedWrapper);
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
  function buildSlotsControl(usuario) {
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

    populateSlots(select, usuario);

    select.addEventListener('change', function () {
      var jsonStr = this.value;
      if (!jsonStr) return;
      var form = document.getElementById(FORM_ID);
      if (!form) return;
      var param;
      try { param = JSON.parse(jsonStr); } catch (e) { return; }
      if (!param || typeof param !== 'object') return;

      var combined = document.getElementById('fndInm-latlng');
      if (combined && param.lat !== undefined && param.lng !== undefined) {
        var latN = Number(param.lat), lngN = Number(param.lng);
        if (!isNaN(latN) && !isNaN(lngN)) {
          combined.value = latN + ', ' + lngN;
          combined.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      var nombreEl = form.elements['nombre'];
      if (nombreEl) nombreEl.value = param.nombre !== undefined && param.nombre !== null ? param.nombre : '';

      GROUPS.forEach(function (group) {
        group.fields.forEach(function (field) {
          if (field.type === 'latlng') return;
          var el = form.elements[field.name];
          if (!el) return;
          var val = param[field.name];
          if (val === undefined || val === null) return;
          if (field.type === 'checkbox') {
            el.checked = !!val;
          } else {
            el.value = val;
          }
        });
      });

      if (form._fieldsetRefs) refreshLegends(form, form._fieldsetRefs);
    });

    wrap.appendChild(select);
    return wrap;
  }

  // ------------------------------------------------------------------
  // Tooltips (Tippy.js si está cargado; si no, fallback a title nativo)
  // ------------------------------------------------------------------
  // Tippy.js es una dependencia GLOBAL de la app (se carga una sola vez,
  // en el <head> de cada página, junto con jQuery/etc. — no es exclusiva
  // de fndInm.js). Por eso este script no intenta cargarla por su cuenta:
  // solo la usa si ya está disponible en window.tippy, y si no, avisa por
  // consola y cae al title nativo del navegador (así no rompe nada si
  // alguna página todavía no la incluye).
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
        'nativo del navegador como respaldo. Asegurate de incluir Tippy.js ' +
        '(CSS + @popperjs/core + tippy.js) en el <head> de la página.'
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

    var nombreRow = document.createElement('div');
    nombreRow.className = 'fndinm-row';

    var nombreLabel = document.createElement('label');
    nombreLabel.setAttribute('for', 'fndInm-nombre');
    nombreLabel.textContent = 'Nombre de la búsqueda';

    var nombreInput = document.createElement('input');
    nombreInput.type = 'text';
    nombreInput.id = 'fndInm-nombre';
    nombreInput.name = 'nombre';
    nombreInput.placeholder = 'Ej: Casas en Santa Cruz';
    nombreInput.setAttribute('data-tippy-content', 'Un nombre para identificar esta búsqueda. Si se deja vacío, se genera automáticamente desde los filtros.');

    nombreRow.appendChild(nombreLabel);
    nombreRow.appendChild(nombreInput);
    form.appendChild(nombreRow);

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

    // --- Auto-save debounced por campo editado ---
    var _pendingData = null;

    function enqueueSave(fieldData) {
      if (!_pendingData) _pendingData = {};
      Object.assign(_pendingData, fieldData);
      clearTimeout(_saveTimer);
      _saveTimer = setTimeout(function () {
        if (!_pendingData) return;
        var pk = window.STT && window.STT.getKey && window.STT.getKey();
        if (!pk) return;
        var sel = document.getElementById('fndInm-slots-select');
        var opt = sel && sel.options[sel.selectedIndex];
        var idx = opt ? parseInt(opt.getAttribute('data-index'), 10) : 0;
        var savedData = _pendingData;
        _pendingData = null;
        showSaveStatus('saving');
        var base = window.STATETTY_CONFIG ? STATETTY_CONFIG.WS_API_BASE : '';
        fetch(base + 'statetty/updtUsrBusqueda', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicKey: pk, i: idx, data: savedData })
        }).then(function (r) { return r.json(); }).then(function (res) {
          showSaveStatus(res.ok ? 'success' : 'error', res.ok ? 'Cambio realizado' : 'Error al actualizar');
          if (res.ok) {
            var usuario = window.STT && window.STT.getUsuario && window.STT.getUsuario();
            if (usuario && Array.isArray(usuario.busquedas) && idx >= 0 && idx < usuario.busquedas.length) {
              try {
                var current = JSON.parse(usuario.busquedas[idx]);
                Object.assign(current, savedData);
                usuario.busquedas[idx] = JSON.stringify(current);
              } catch (_) {}
            }
            var sel_ = document.getElementById('fndInm-slots-select');
            if (sel_) {
              for (var i_ = 0; i_ < sel_.options.length; i_++) {
                var opt_ = sel_.options[i_];
                if (parseInt(opt_.getAttribute('data-index'), 10) === idx) {
                  try {
                    var param_ = JSON.parse(opt_.value);
                    Object.assign(param_, savedData);
                    opt_.value = JSON.stringify(param_);
                    opt_.textContent = buildSlotLabel(param_);
                  } catch (_) {}
                  break;
                }
              }
            }
          }
        }).catch(function () {
          showSaveStatus('error', 'Error al actualizar');
        });
      }, 1500);
    }

    // Adjuntar listeners de auto-save a cada campo del form
    function attachSaveListeners(root) {
      var els = root.querySelectorAll('input, select, textarea');
      Array.prototype.forEach.call(els, function (el) {
        if (el.type === 'hidden' || el.type === 'button' || el.type === 'submit' || el.type === 'reset' || el.id === 'fndInm-slots-select') return;
        if (el.id === 'fndInm-latlng') {
          el.addEventListener('input', function () {
            var parsed = parseLatLng(el.value);
            if (parsed) enqueueSave({ lat: parsed.lat, lng: parsed.lng });
          });
        } else if (el.type === 'checkbox') {
          var chk = {};
          chk[el.name] = el.checked;
          el.addEventListener('change', function () { chk[el.name] = el.checked; enqueueSave(chk); });
        } else {
          el.addEventListener('input', function () {
            var o = {}; o[el.name] = el.value === '' ? null : el.value; enqueueSave(o);
          });
          el.addEventListener('change', function () {
            var o = {}; o[el.name] = el.value === '' ? null : el.value; enqueueSave(o);
          });
        }
      });
    }
    attachSaveListeners(form);

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
    form._fieldsetRefs = fieldsetRefs;

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

    var bottomSpacer = document.createElement('div');
    bottomSpacer.className = 'fndinm-bottom-spacer';
    bottomSpacer.setAttribute('aria-hidden', 'true');
    form.appendChild(bottomSpacer);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var params = getParams();
      var pk = window.STT && window.STT.getKey && window.STT.getKey();
      if (!pk) {
        showSaveStatus('error', 'Debes iniciar sesión para buscar.');
        return;
      }

      var overlay = document.createElement('div');
      overlay.id = 'fndInm-search-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);z-index:99999;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:16px;cursor:wait;';

      var spinner = document.createElement('div');
      spinner.style.cssText = 'width:48px;height:48px;border:4px solid rgba(255,255,255,0.3);border-top-color:#17baef;border-radius:50%;animation:fndinm-search-spin .8s linear infinite;';

      var msg = document.createElement('div');
      msg.style.cssText = 'color:#fff;font-size:1.1rem;font-family:sans-serif;text-align:center;';
      msg.textContent = 'Realizando búsqueda, un momento por favor';

      overlay.appendChild(spinner);
      overlay.appendChild(msg);
      document.body.appendChild(overlay);

      params.publicKey = pk;

      var base = window.STATETTY_CONFIG ? STATETTY_CONFIG.WS_API_BASE : '';
      fetch(base + 'statetty/buscarInmueble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      }).then(function (r) { return r.json(); }).then(function (res) {
        overlay.remove();
        if (res.ok) {
          if (res.truncated) {
            showSaveStatus('success', 'Mostrando ' + res.displayedResults + ' de ' + res.totalResults + ' resultados.');
            setTimeout(function () {
              window.location.href = 'https://statetty.com/maps/find';
            }, 3000);
          } else {
            window.location.href = 'https://statetty.com/maps/find';
          }
        } else if (res.error === 'publicKey_requerida' || res.error === 'publicKey_invalida' || res.error === 'publicKey_vencida') {
          showSaveStatus('error', 'Tu sesión ha expirado. Recarga la página e intenta de nuevo.');
        } else {
          showSaveStatus('error', res.error === 'error_en_busqueda' ? 'Error al realizar la búsqueda. Intenta de nuevo.' : res.error || 'Error inesperado.');
        }
      }).catch(function () {
        overlay.remove();
        showSaveStatus('error', 'Error de conexión. Verifica tu conexión e intenta de nuevo.');
      });
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
    var textFields = ['nombre', 'lat', 'lng', 'userID', 'agenciaID', 'agenteID', 'inmuebleID',
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
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.gap = '6px';
      var headerTitle = document.createTextNode('🔎 Buscar Inmuebles');
      var saveStatus = document.createElement('span');
      saveStatus.id = 'fndInm-save-status';
      header.appendChild(headerTitle);
      header.appendChild(saveStatus);

      var body = document.createElement('div');
      body.className = 'section-body';
      body.appendChild(buildSlotsControl(usuario));
      body.appendChild(buildForm(usuario));

      section.appendChild(header);
      section.appendChild(body);
    } else {
      section.className = 'fndinm-standalone';

      var header = document.createElement('div');
      header.className = 'fndinm-standalone-header';
      header.setAttribute('role', 'button');
      header.setAttribute('tabindex', '0');
      header.setAttribute('aria-expanded', 'false');
      header.setAttribute('aria-controls', SECTION_ID + '-standalone-body');

      var title = document.createElement('span');
      title.className = 'fndinm-standalone-title';
      title.textContent = '🔎 Buscar Inmuebles';

      var saveStatus = document.createElement('span');
      saveStatus.id = 'fndInm-save-status';

      var caret = document.createElement('span');
      caret.className = 'fndinm-standalone-caret';
      caret.textContent = '▸';

      header.appendChild(title);
      header.appendChild(saveStatus);
      header.appendChild(caret);

      var body = document.createElement('div');
      body.className = 'fndinm-standalone-body';
      body.id = SECTION_ID + '-standalone-body';
      body.appendChild(buildSlotsControl(usuario));
      body.appendChild(buildForm(usuario));

      // Colapsado por defecto: en modo standalone no hay acordeón externo
      // (el de mapa.js no existe fuera del mapa) que lo mantenga cerrado
      // hasta que el usuario lo pida, así que fndInm.js resuelve esto
      // por su cuenta con un simple toggle de clase.
      function toggle() {
        var isOpen = section.classList.toggle('fndinm-standalone-open');
        header.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      }
      header.addEventListener('click', toggle);
      header.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });

      section.appendChild(header);
      section.appendChild(body);
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
  window.STT_FND_INM.refreshACMPointer = function () {
    var el = document.getElementById('fndInm-acm-coord-text');
    var div = document.getElementById('fndInm-acm-pointer');
    if (!el || !div) return;
    if (window.__acmCoords && window.__acmCoords.lat !== undefined && window.__acmCoords.lng !== undefined) {
      el.textContent = window.__acmCoords.lat + ', ' + window.__acmCoords.lng;
      div.style.display = '';
    } else {
      div.style.display = 'none';
    }
  };
  // window.STT_FND_INM.onSearch se define desde afuera cuando se conecte el AJAX real.
})();
