/**
 * fndInm.js — Statetty
 * -----------------------------------------------------------------------
 * Script GLOBAL invocado desde menuUser.js (modo toolbox, página del mapa).
 *
 * Qué hace:
 *   Agrega al panel del engranaje (#toolbox) una sección desplegable más,
 *   con el mismo formato "acordeón" que ya usan las secciones creadas
 *   directamente en el HTML de la página y manejadas por mapa.js
 *   (.section > .section-header + .section-body, con toggle delegado en
 *   $(document).on('click', '.section-header', ...)). Como ese handler
 *   está delegado al document, la nueva sección funciona con el mismo
 *   acordeón sin tocar mapa.js.
 *
 *   La sección se llama "Buscar Inmuebles" y contiene:
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
 * Integración:
 *   - Se monta llamando a window.STT_FND_INM.mount(toolboxEl, usuario)
 *     desde menuUser.js, DESPUÉS de agregar los links sueltos, para no
 *     alterar los índices ":nth-child" que mapa.js usa para referenciar
 *     sus propias secciones (la nueva sección se agrega siempre al final
 *     de #toolbox).
 *   - Es idempotente: si ya existe #fndInm-section no vuelve a crearla.
 *
 * Personalización:
 *   - window.STT_FND_INM_DEFAULTS puede sobreescribir los valores por
 *     defecto de cualquier campo del formulario antes de que este script
 *     se ejecute, ej: window.STT_FND_INM_DEFAULTS = { dist: 2, pMax: 500000 }
 *   - window.STT_FND_INM.onSearch = function(params) {...} para engancharle
 *     la búsqueda real (AJAX) cuando esté lista.
 */
(function () {
  'use strict';

  var SECTION_ID = 'fndInm-section';
  var FORM_ID = 'fndInm-form';
  var SLOTS_SELECT_ID = 'fndInm-slots-select';
  var STYLE_ID = 'stt-fndinm-styles';

  // ------------------------------------------------------------------
  // Definición de campos (según paramfnd.md)
  // ------------------------------------------------------------------
  // type: 'text' | 'number' | 'select' | 'checkbox' | 'hidden'
  // Cada grupo se renderiza como un <fieldset> dentro de la sección.
  var GROUPS = [
    {
      legend: 'Ubicación y radio',
      fields: [
        { name: 'lat', type: 'text', label: 'Latitud', placeholder: 'Centro de la ciudad del usuario' },
        { name: 'lng', type: 'text', label: 'Longitud', placeholder: 'Centro de la ciudad del usuario' },
        { name: 'dist', type: 'number', label: 'Radio de búsqueda (km)', step: '0.1', min: '0', def: 1 }
      ]
    },
    {
      legend: 'Precio y antigüedad',
      fields: [
        { name: 'pMin', type: 'number', label: 'Precio mínimo (USD)', min: '0', def: 1 },
        { name: 'pMax', type: 'number', label: 'Precio máximo (USD)', min: '0', def: 100000000 },
        { name: 'antiguedad', type: 'number', label: 'Antigüedad máxima (meses)', min: '0', def: 3 }
      ]
    },
    {
      legend: 'Estado',
      fields: [
        {
          name: 'activos', type: 'select', label: 'Estado del inmueble', def: '1',
          options: [
            { value: '', label: 'Todos' },
            { value: '1', label: 'Solo activos' },
            { value: '0', label: 'Solo inactivos' }
          ]
        },
        { name: 'seeSell', type: 'checkbox', label: 'Incluir vendidas', def: true },
        { name: 'seeRent', type: 'checkbox', label: 'Incluir alquiladas', def: true }
      ]
    },
    {
      legend: 'Características mínimas',
      fields: [
        { name: 'hab', type: 'number', label: 'Dormitorios (mín.)', min: '0' },
        { name: 'banos', type: 'number', label: 'Baños (mín.)', min: '0' },
        { name: 'amb', type: 'number', label: 'Ambientes (mín.)', min: '0' },
        { name: 'anoc', type: 'number', label: 'Año de construcción (mín.)', min: '0' }
      ]
    },
    {
      legend: 'Superficies (m²)',
      fields: [
        { name: 'm2c', type: 'number', label: 'Construcción mín. (m2c)', min: '0' },
        { name: 'm2cgt', type: 'number', label: 'Construcción ≥ (m2cgt)', min: '0' },
        { name: 'm2clt', type: 'number', label: 'Construcción ≤ (m2clt)', min: '0' },
        { name: 'm2t', type: 'number', label: 'Terreno mín. (m2t)', min: '0' },
        { name: 'm2tgt', type: 'number', label: 'Terreno ≥ (m2tgt)', min: '0' },
        { name: 'm2tlt', type: 'number', label: 'Terreno ≤ (m2tlt)', min: '0' }
      ]
    },
    {
      legend: 'Filtrar por ID',
      fields: [
        { name: 'agenciaID', type: 'text', label: 'ID de agencia' },
        { name: 'agenteID', type: 'text', label: 'ID de agente' },
        { name: 'inmuebleID', type: 'text', label: 'ID de inmueble' }
      ]
    },
    {
      legend: 'Términos de texto',
      fields: [
        { name: 'whiteList', type: 'text', label: 'Debe incluir (separados por coma)', placeholder: 'ej: piscina, garaje' },
        { name: 'blackList', type: 'text', label: 'Debe excluir (separados por coma)', placeholder: 'ej: anticrético' }
      ]
    },
    {
      legend: 'Otros',
      fields: [
        { name: 'ciudad', type: 'text', label: 'Ciudad', note: 'Definido en la API pero aún no usado en la búsqueda (solo se usa el centro lat/lng).' }
      ]
    }
  ];

  // ------------------------------------------------------------------
  // Estilos (mínimos, heredan tipografía/color de la página, igual que
  // el resto de #toolbox)
  // ------------------------------------------------------------------
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      '#' + SECTION_ID + ' .fndinm-slots{display:flex;gap:6px;align-items:center;' +
      'margin-bottom:10px;flex-wrap:wrap;}' +
      '#' + SECTION_ID + ' .fndinm-slots select{flex:1;min-width:120px;}' +
      '#' + SECTION_ID + ' fieldset{border:1px solid rgba(0,0,0,.12);border-radius:8px;' +
      'margin:0 0 10px;padding:8px 10px 10px;}' +
      '#' + SECTION_ID + ' legend{font-size:.82rem;font-weight:600;padding:0 4px;opacity:.75;}' +
      '#' + SECTION_ID + ' .fndinm-row{display:flex;flex-direction:column;gap:2px;margin-bottom:8px;}' +
      '#' + SECTION_ID + ' .fndinm-row:last-child{margin-bottom:0;}' +
      '#' + SECTION_ID + ' .fndinm-row label{font-size:.8rem;opacity:.8;}' +
      '#' + SECTION_ID + ' .fndinm-row input[type="text"],' +
      '#' + SECTION_ID + ' .fndinm-row input[type="number"],' +
      '#' + SECTION_ID + ' .fndinm-row select{padding:5px 6px;border:1px solid rgba(0,0,0,.2);' +
      'border-radius:6px;font-size:.85rem;width:100%;box-sizing:border-box;}' +
      '#' + SECTION_ID + ' .fndinm-row-inline{flex-direction:row;align-items:center;gap:6px;}' +
      '#' + SECTION_ID + ' .fndinm-note{font-size:.72rem;opacity:.65;margin-top:2px;}' +
      '#' + SECTION_ID + ' .fndinm-actions{display:flex;gap:8px;margin-top:4px;}' +
      '#' + SECTION_ID + ' .fndinm-actions button{flex:1;}';
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

    // window.STT_FND_INM_DEFAULTS permite sobreescribir el valor inicial
    var overrides = window.STT_FND_INM_DEFAULTS || {};
    if (Object.prototype.hasOwnProperty.call(overrides, field.name)) {
      if (field.type === 'checkbox') input.checked = !!overrides[field.name];
      else input.value = overrides[field.name];
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

    GROUPS.forEach(function (group) {
      var fieldset = document.createElement('fieldset');
      var legend = document.createElement('legend');
      legend.textContent = group.legend;
      fieldset.appendChild(legend);
      group.fields.forEach(function (field) {
        fieldset.appendChild(buildField(field));
      });
      form.appendChild(fieldset);
    });

    var actions = document.createElement('div');
    actions.className = 'fndinm-actions';

    var btnBuscar = document.createElement('button');
    btnBuscar.type = 'submit';
    btnBuscar.id = 'fndInm-btn-buscar';
    btnBuscar.textContent = '🔎 Buscar';

    var btnReset = document.createElement('button');
    btnReset.type = 'reset';
    btnReset.id = 'fndInm-btn-reset';
    btnReset.textContent = '↺ Limpiar';

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
  // Construcción de la sección completa (.section acordeón)
  // ------------------------------------------------------------------
  function buildSection(usuario) {
    var section = document.createElement('div');
    section.id = SECTION_ID;
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
    return section;
  }

  // ------------------------------------------------------------------
  // API pública
  // ------------------------------------------------------------------
  function mount(toolboxEl, usuario) {
    if (document.getElementById(SECTION_ID)) return false; // ya montada
    if (!toolboxEl) toolboxEl = document.getElementById('toolbox');
    if (!toolboxEl) return false;

    injectStyles();
    // Se agrega SIEMPRE al final de #toolbox (después de las secciones ya
    // existentes y de los links sueltos de menuUser.js), para no alterar
    // los índices ":nth-child" que mapa.js usa para referenciar sus
    // propias secciones (ver actualizarToolbox() en mapa.js).
    toolboxEl.appendChild(buildSection(usuario));
    return true;
  }

  window.STT_FND_INM = window.STT_FND_INM || {};
  window.STT_FND_INM.mount = mount;
  window.STT_FND_INM.getParams = getParams;
  // window.STT_FND_INM.onSearch se define desde afuera cuando se conecte el AJAX real.
})();
