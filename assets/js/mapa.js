// ---------------------------------------------
// mapa.js - Lógica completa del mapa y selección
// (versión modificada para que las agencias desmarcadas no participen
//  en búsquedas, botones 'seleccionar todos', generación de PDFs, etc.)
// ---------------------------------------------

var map, locations = [], markers = [], seleccionados = [], ultimosFiltrados = [];
window.__backupLocalStorage = window.__backupLocalStorage || {};

// Iconos
var resultIcon = new L.Icon({
  iconUrl: '../../assets/images/pointers/pointer_found.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [40, 60], iconAnchor: [20, 60], popupAnchor: [1, -54], shadowSize: [60, 60]
});

var checkOverlayIcon = L.divIcon({
  className: 'check-overlay',
  html: '✔️',
  iconSize: [30, 30],
  iconAnchor: [1, 60] // ✔️ sobre la mitad superior del marker
});

async function openWsRedirect(url) {try {
  const res = await fetch(url, {headers: {"ngrok-skip-browser-warning": "1"}});
  const html = await res.text();
  const win = window.open("", "_blank");  //, "noopener,noreferrer"
  if (!win) return alert("Popup bloqueado");
  //win.opener = null;
  win.document.open();
  win.document.write(html);
  win.document.close();
} catch (e) {console.log("openWsRedirect", e);}}

/** --------------------------------------------------------------------------------------- calcularBoundsDesdeLocations
 * Calcula bounds y centro óptimo a partir de locations visibles
 * @param {Array} locs
 * @returns {Object|null} {bounds, center}
 */
  function calcularBoundsDesdeLocations(locs){ try {
    if(!Array.isArray(locs)||!locs.length)return null;
    let group=new L.featureGroup(locs.map(l=>L.marker([l.lat,l.lng])));
    let bounds=group.getBounds(),center=bounds.getCenter();
    return {bounds,center};
  } catch (e) {console.log('calcularBoundsDesdeLocations error',e);} }


// -------------------------------
// Persistencia en localStorage
// -------------------------------
function guardarSeleccionados() {
  const MAX_SEL = 200;
  let ids = seleccionados.map(s => s.uid);

  if (ids.length > MAX_SEL) {
    ids = ids.slice(-MAX_SEL);
  }

  try {
    localStorage.setItem("inmueblesSeleccionados", JSON.stringify(ids));
    console.log(`✅ Guardados ${ids.length} seleccionados en localStorage`);
  } catch (e) {
    if (e.name === "QuotaExceededError" || e.code === 22) {
      console.warn("⚠️ localStorage lleno, usando backup en memoria");
      window.__backupLocalStorage = window.__backupLocalStorage || {};
      window.__backupLocalStorage["inmueblesSeleccionados"] = JSON.stringify(ids);
    } else {
      console.error("Error inesperado al guardar seleccionados", e);
    }
  }
}


function cargarSeleccionados() {
  window.__backupLocalStorage = window.__backupLocalStorage || {};

  let data = localStorage.getItem("inmueblesSeleccionados");

  if (!data && window.__backupLocalStorage["inmueblesSeleccionados"]) {
    console.warn("⚠️ Recuperando desde backup en memoria");
    data = window.__backupLocalStorage["inmueblesSeleccionados"];
  }

  try {
    return JSON.parse(data || "[]");
  } catch (e) {
    return [];
  }
}


function guardarMapa() {
  if (map) {
    const center = map.getCenter();
    const zoom = map.getZoom();
    localStorage.setItem("mapCenter", JSON.stringify([center.lat, center.lng]));
    localStorage.setItem("mapZoom", zoom);
  }
}

function cargarMapa() {
  try {
    const center = JSON.parse(localStorage.getItem("mapCenter"));
    const zoom = parseInt(localStorage.getItem("mapZoom"));
    if (Array.isArray(center) && !isNaN(zoom)) {
      return { center, zoom };
    }
  } catch (e) {}
  return null;
}

function guardarAgencias() {
  const seleccionadas = [];
  $(".chk-agency").each(function () {
    if (this.checked) seleccionadas.push($(this).data("ag"));
  });
  localStorage.setItem("agenciasSeleccionadas", JSON.stringify(seleccionadas));
}

function cargarAgencias() {
  try {
    const data = JSON.parse(localStorage.getItem("agenciasSeleccionadas")) || null;
    return Array.isArray(data) ? data : null;
  } catch (e) {
    return null;
  }
}


// -------------------------------
// Utilidades
// -------------------------------
function normalizeURL(u) {
  if (!u) return '';
  //return u.includes('http') ? u : `https://c21.com.bo${u}`;
  return u;
}

function formatNumber(num) {
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

function calcularPromedio(datos, prop) {
  if (!Array.isArray(datos) || datos.length === 0) return 0;
  const datosFiltrados = datos.filter(item => item && typeof item[prop] === 'number' && item[prop] >= 0);
  if (datosFiltrados.length === 0) return 0;
  const suma = datosFiltrados.reduce((acc, item) => acc + item[prop], 0);
  return Math.round(suma / datosFiltrados.length);
}

// -----------------------------------------------------------------------
// Datos geográficos para detección de país por coordenadas (extensible)
// -----------------------------------------------------------------------
var PAISES = [
  {
    code: 'BO',
    callingCode: '591',
    polygon: [
      [-57.50, -18.17], [-58.24, -16.30], [-60.16, -16.26],
      [-63.20, -12.63], [-65.34,  -9.76], [-67.17, -10.31],
      [-68.67, -12.56], [-68.88, -12.90], [-68.96, -16.50],
      [-69.39, -15.66], [-69.59, -17.58], [-69.10, -18.26],
      [-68.76, -20.37], [-68.22, -21.49], [-67.83, -22.87],
      [-64.38, -22.80], [-62.69, -22.25], [-62.27, -20.51],
      [-60.04, -19.34], [-57.50, -18.17]
    ]
  },
  {
    code: 'PE',
    callingCode: '51',
    polygon: [
      [-69.59, -17.58], [-70.37, -18.35], [-71.38, -17.77],
      [-74.12, -15.27], [-76.42, -13.82], [-79.04,  -8.39],
      [-81.25,  -6.14], [-81.41,  -4.74], [-80.30,  -3.40],
      [-78.45,  -3.87], [-75.55,  -1.56], [-75.11,  -0.06],
      [-73.07,  -2.31], [-70.69,  -3.74], [-69.53, -10.95],
      [-68.67, -12.56], [-68.88, -12.90], [-68.96, -16.50],
      [-69.39, -15.66], [-69.59, -17.58]
    ]
  }
];

function puntoEnPoligono(lat, lng, poligono) {
  var dentro = false;
  for (var i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    var xi = poligono[i][0], yi = poligono[i][1];
    var xj = poligono[j][0], yj = poligono[j][1];
    if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)
      dentro = !dentro;
  }
  return dentro;
}

function detectarPais(lat, lng) {
  for (var i = 0; i < PAISES.length; i++) {
    if (puntoEnPoligono(lat, lng, PAISES[i].polygon))
      return PAISES[i];
  }
  return null;
}

/**
 * Devuelve el "brand" (clave de agencia) a partir de una URL o de un marker.
 * @param {Object|string} input - Puede ser un marker objeto o una URL/uid string
 * @returns {string} brand clave como 'remax','C21','ic','statetty', etc.
 */
function getBrand(input) {
  let url = '';
  let agentName = '';
  let agentPhone = '';
  if (!input) return 'statetty';
  if (typeof input === 'string') {url = input;} 
  else if (input.dato) {
    url = input.dato.uid || '';
    agentName = (input.dato.agentName || '').toLowerCase();
    agentPhone = (input.dato.agentPhone || '').toString();
  } 
  else if (input.options && input.options.iconUrl) {url = input.options.iconUrl;}
  url = (url || '').toLowerCase();


  // --------------------------------------------------------------------------------------------------- Marcas pequeñas
  if ( /el-?faro/i.test(url) || agentPhone.replace(/\D/g,'').includes("71035001") || agentName.includes("el faro")
     ) {return 'elfaro';}

  // ---------------------------------------------------------------------------------------------------- Marcas grandes
  else if (url.includes("c21.com"))               {return 'C21';}
  else if (url.includes("century21"))             {return 'C21';}
  else if (url.includes("remax"))                 {return 'remax';}
  else if (url.includes("bieninmuebles"))         {return 'bieni';}
  else if (url.includes("dueodeinmueble"))        {return 'IDI';}
  else if (url.includes("ultracasas"))            {return 'UC';}
  else if (url.includes("uno.com"))               {return 'uno';}
  else if (url.includes("infocasas"))             {return 'ic';}
  else if (url.includes("sin-intermediarios"))    {return 'si';}
  else if (url.includes("capitalcorp"))           {return 'capital';}
  else if (url.includes("santa-cruz.estate"))     {return 'sce';}
  else if (url.includes("laencontre.com"))        {return 'laenc';}
  else if (url.includes("nexoinmobiliario.pe"))   {return 'nexoi';}

  else {return 'statetty';}
}

/**
 * ¿Está visible (habilitada) la agencia/marker actual en los filtros?
 * Usa las checkboxes de agencias para decidirlo.
 * @param {Object} m - objeto {marker, iconOriginal, dato, overlay}
 * @returns {boolean}
 */
function isMarkerActive(m) {
  const brand = getBrand(m);
  if (brand === 'statetty') return true; // siempre operativo
  const activas = agenciasActivas() || [];
  return activas.includes(brand);
}

/**
 * Obtiene la lista de locations que actualmente están visibles/operativas
 * para búsquedas, selección masiva y generación de PDFs.
 * @returns {Array}
 */
function getVisibleLocations() {
  const activas = agenciasActivas();
  return locations.filter(loc => {
    //let url = loc.uid || "";
    //let brand = getBrand(url);
    let brand = getBrand({ dato: loc });
    if (brand === "statetty") return true;
    return activas.includes(brand);
  });
}

/**
 * Helper para sincronizar el DOM y el estado de seleccionados cuando se
 * deshabilita una agencia: elimina esos inmuebles de "seleccionados",
 * quita overlays y desmarca checkboxes; cuando se habilita, vuelve a
 * reactivar las checkboxes (sin seleccionarlas automáticamente).
 * @param {string} ag - clave de la agencia que cambió
 * @param {boolean} checked - nuevo estado
 */
function handleAgencyToggle(ag, checked) {
  markers.forEach(m => {
    const brand = getBrand(m);
    if (brand !== ag) return;

    // sincronizar marcador en el mapa
    if (checked) {
      map.addLayer(m.marker);
      // reactivar checkbox en popup si existe (no lo marcamos seleccionado)
      $(`.chk-sel[data-id='${m.dato.uid}']`).prop('disabled', false);
    } else {
      map.removeLayer(m.marker);
      // quitar de seleccionados si estaba
      if (seleccionados.some(s => s.uid === m.dato.uid)) {
        // eliminar overlay
        if (m.overlay) { map.removeLayer(m.overlay); m.overlay = null; }
        seleccionados = seleccionados.filter(s => s.uid !== m.dato.uid);
      }
      // desmarcar y deshabilitar checkbox popup
      $(`.chk-sel[data-id='${m.dato.uid}']`).prop('checked', false).prop('disabled', true);
    }
  });

  // Persistir y recalcular estadísticas y toolbox
  guardarAgencias();
  actualizarEstadisticas(getVisibleLocations());
  guardarSeleccionados();
  actualizarToolbox();
}

/**
 * Actualiza las estadísticas visuales y se asegura de que los
 * botones de acción existan y estén inicializados.
 * @param {Array} lista - Lista de inmuebles a usar para calcular estadísticas.
 * @returns {void}
 */
function actualizarEstadisticas(lista) {
  if (!lista || lista.length === 0) {
    $('#total-inmuebles').text(0);
    $('#precio-promedio').text("0,00");
    $('#mas-barato').text("-");
    $('#mas-caro').text("-");
    ensureStatsActions();
    updateButtonsState();
    return;
  }

  let promedio = calcularPromedio(lista, 'precio');
  let masBarato = lista.reduce((min, loc) => (loc.precio && loc.precio < min.precio ? loc : min), lista[0]);
  let masCaro = lista.reduce((max, loc) => (loc.precio && loc.precio > max.precio ? loc : max), lista[0]);
  $('#total-inmuebles').text(lista.length);
  $('#precio-promedio').text(formatNumber(promedio));
  $('#mas-barato').text(`${masBarato.Titulo}`);
  $('#mas-caro').text(`${masCaro.Titulo}`);

  ensureStatsActions();
  updateButtonsState();
}

/**
 * Asegura que exista #stats-actions y enlaza los handlers una sola vez.
 * Si el contenedor ya está en el HTML, no lo recrea; solo agrega handlers
 * la primera vez que se llama.
 * @returns {void}
 */
function ensureStatsActions() {
  if ($('#stats-actions').length === 0) {
    $('#stats-container').append(`
      <div id="stats-actions" style="margin-top:8px;">
        <button id="btn-add-sel">Agregar a selección</button>
        <button id="btn-remove-sel">Quitar de selección</button>
        <button id="btn-keep-only">Mantener estos</button>
        <br>
        <button id="btn-add-all">Agregar todos</button>
        <button id="btn-remove-all">Quitar todos</button>
        <button id="btn-add-all-except" title="Agregar todos menos los filtrados">➕ Otros</button>
      </div>
    `);
  }

  if (window.statsButtonsInit) return;
  window.statsButtonsInit = true;

  // --- handlers (usar .off para evitar duplicados si por alguna razón se vuelve a llamar) ---
  $('#btn-add-all').off('click').on('click', function () {
    // ahora agrega SOLO los inmuebles visibles/operativos
    const visibles = getVisibleLocations();
    visibles.forEach(a => {
      if (!seleccionados.some(s => s.uid === a.uid)) {
        seleccionados.push(a);
        let overlay = L.marker([a.lat, a.lng], { icon: checkOverlayIcon, interactive: false }).addTo(map);
        let obj = markers.find(m => m.dato.uid === a.uid);
        if (obj) obj.overlay = overlay;
        $(`.chk-sel[data-id='${a.uid}']`).prop("checked", true);
      }
    });
    guardarSeleccionados();
    actualizarToolbox();
    updateButtonsState();
  });

  $('#btn-remove-all').off('click').on('click', function () {
    seleccionados.slice().forEach(s => {
      const obj = markers.find(m => m.dato.uid === s.uid);
      if (obj && obj.overlay) { map.removeLayer(obj.overlay); obj.overlay = null; }
      $(`.chk-sel[data-id='${s.uid}']`).prop("checked", false);
    });
    seleccionados = [];
    guardarSeleccionados();
    actualizarToolbox();
    updateButtonsState();
  });

  $('#btn-add-sel').off('click').on('click', function () {
    // agrega SOLO los ultimos filtrados que además estén visibles
    const visiblesUID = new Set(getVisibleLocations().map(x => x.uid));
    (ultimosFiltrados || []).forEach(a => {
      if (!visiblesUID.has(a.uid)) return; // ignorar no visibles
      if (!seleccionados.some(s => s.uid === a.uid)) {
        seleccionados.push(a);
        let overlay = L.marker([a.lat, a.lng], { icon: checkOverlayIcon, interactive: false }).addTo(map);
        let obj = markers.find(m => m.dato.uid === a.uid);
        if (obj) obj.overlay = overlay;
        $(`.chk-sel[data-id='${a.uid}']`).prop("checked", true);
      }
    });
    guardarSeleccionados();
    actualizarToolbox();
    updateButtonsState();
  });

  $('#btn-remove-sel').off('click').on('click', function () {
    const visiblesUID = new Set(getVisibleLocations().map(x => x.uid));
    (ultimosFiltrados || []).forEach(a => {
      if (!visiblesUID.has(a.uid)) return; // ignorar no visibles
      seleccionados = seleccionados.filter(s => s.uid !== a.uid);
      let obj = markers.find(m => m.dato.uid === a.uid);
      if (obj && obj.overlay) { map.removeLayer(obj.overlay); obj.overlay = null; }
      $(`.chk-sel[data-id='${a.uid}']`).prop("checked", false);
    });
    guardarSeleccionados();
    actualizarToolbox();
    updateButtonsState();
  });

  $('#btn-keep-only').off('click').on('click', function () {
    const keepUIDs = new Set((ultimosFiltrados || []).map(a => a.uid));
    if (keepUIDs.size === 0) return;

    seleccionados.slice().forEach(s => {
      if (!keepUIDs.has(s.uid)) {
        seleccionados = seleccionados.filter(x => x.uid !== s.uid);
        const obj = markers.find(m => m.dato.uid === s.uid);
        if (obj && obj.overlay) { map.removeLayer(obj.overlay); obj.overlay = null; }
        $(`.chk-sel[data-id='${s.uid}']`).prop('checked', false);
      }
    });

    guardarSeleccionados();
    actualizarToolbox();
    updateButtonsState();
  });

  $('#btn-add-all-except').off('click').on('click', function () {
    const excludeUIDs = new Set((ultimosFiltrados || []).map(a => a.uid));
    const visibles = getVisibleLocations();
    visibles.forEach(a => {
      if (excludeUIDs.has(a.uid)) return;
      if (!seleccionados.some(s => s.uid === a.uid)) {
        seleccionados.push(a);
        let overlay = L.marker([a.lat, a.lng], { icon: checkOverlayIcon, interactive: false }).addTo(map);
        let obj = markers.find(m => m.dato.uid === a.uid);
        if (obj) obj.overlay = overlay;
        $(`.chk-sel[data-id='${a.uid}']`).prop("checked", true);
      }
    });
    guardarSeleccionados();
    actualizarToolbox();
    updateButtonsState();
  });
}

/** ---------------------------------------------------------------------------------------- ensureRenderColumnSelector
* Garantiza disponibilidad de renderColumnSelector cargando el script si es necesario
*/
function ensureRenderColumnSelector(){ try {
  if(typeof renderColumnSelector==="function"){renderColumnSelector();return;}
  let s=document.querySelector('script[src*="inmueblesPdf.js"]');
  if(!s){
    s=document.createElement("script");
    s.src="../../assets/js/inmueblesPdf.js";
    s.onload=function(){if(typeof renderColumnSelector==="function"){renderColumnSelector();}};
    s.onerror=function(){console.log("Error cargando inmueblesPdf.js");};
    document.head.appendChild(s);
  }
} catch (e) {console.log('ensureRenderColumnSelector error',e);} }


/**
 * Actualiza enabled/disabled de los botones según el estado actual.
 * @returns {void}
 */
function updateButtonsState() {
  const $addSel = $('#btn-add-sel'), $removeSel = $('#btn-remove-sel'),
        $keepOnly = $('#btn-keep-only'), $addAll = $('#btn-add-all'),
        $removeAll = $('#btn-remove-all'), $addAllExcept = $('#btn-add-all-except');

  if ($addSel.length === 0) return;

  const selCount = seleccionados.length;
  const filtCount = (ultimosFiltrados || []).length;
  const totalCount = getVisibleLocations().length;

  [$addSel,$removeSel,$keepOnly,$addAll,$removeAll,$addAllExcept].forEach($b => { if ($b.length) $b.prop('disabled', true); });

  if (filtCount > 0) {
    if ($addSel.length) $addSel.prop('disabled', false);
    if ($removeSel.length) $removeSel.prop('disabled', selCount === 0);
    if ($keepOnly.length) $keepOnly.prop('disabled', selCount === 0);
    if ($addAllExcept.length) $addAllExcept.prop('disabled', false);
  }

  if (totalCount > 0 && $addAll.length) $addAll.prop('disabled', false);
  if (selCount > 0 && $removeAll.length) $removeAll.prop('disabled', false);
}

function actualizarToolbox() {
  $("#sel-box").remove();
  seleccionados.sort((a, b) => (parseFloat(a.precio) || 0) - (parseFloat(b.precio) || 0));

  let html = '';
  seleccionados.forEach((s, i) => {
    html += `<div>${i + 1}. ${s.Titulo} <span class="remove-sel" data-id="${s.uid}" style="cursor:pointer; color:red;">❌</span></div>`;
  });

  if (true) {
    $("#agency-filter").parent().prev(".section-header");

    $("#toolbox .section:nth-child(2) .section-body").html(`
      <div id="sel-box">
        <b>Seleccionados: ${seleccionados.length}</b>
        ${html}
        <br>
        <button id="btn-pdf-landscape" disabled>📄 PDF pantalla</button>
        <button id="btn-pdf-mobile" disabled>📱 PDF móvil</button> 
      </div>
    `);

    ensureRenderColumnSelector();
    initPDFFormPersistence();

    const chkAll = $("#pdf-show-all").prop("checked");
    const selCount = seleccionados.length;
    const habilitar = selCount > 0 || chkAll === true;

    $("#btn-pdf-landscape").prop("disabled", !habilitar);
    $("#btn-pdf-mobile").prop("disabled", !habilitar);

    $("#pdf-show-all").off("change").on("change", function(){
      const habilitar = seleccionados.length > 0 || this.checked === true;
      $("#btn-pdf-landscape").prop("disabled", !habilitar);
      $("#btn-pdf-mobile").prop("disabled", !habilitar);
    });

    $("#btn-pdf-landscape").off("click").on("click", function () {
      const showAll = $("#pdf-show-all").prop("checked");
      const data = showAll ? locations : seleccionados;
      generarBrochurePDF(data, "landscape", seleccionados);
    });

    $("#btn-pdf-mobile").off("click").on("click", function () {
      const showAll = $("#pdf-show-all").prop("checked");
      const data = showAll ? locations : seleccionados;
      generarBrochurePDF(data, "mobile", seleccionados);
    });

  } 

  $(".remove-sel").off("click").on("click", function (e) {
    e.stopPropagation();
    let id = $(this).data("id");
    seleccionados = seleccionados.filter(s => s.uid !== id);
    guardarSeleccionados();
    let obj = markers.find(m => m.dato.uid === id);
    if (obj && obj.overlay) { map.removeLayer(obj.overlay); obj.overlay = null; }
    $(`.chk-sel[data-id='${id}']`).prop("checked", false);
    actualizarToolbox();
  });

  if (typeof actualizarACM === "function") {actualizarACM();}
}

function agenciasActivas() {
  const activas = [];
  $(".chk-agency").each(function () {
    if (this.checked) activas.push($(this).data("ag"));
  });
  return activas;
}

function mostrarModalError() {
  var overlay = document.createElement('div');
  overlay.id = 'modal-error-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99999;display:flex;justify-content:center;align-items:center;';
  
  var box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:12px;padding:32px;max-width:420px;margin:20px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3);font-family:sans-serif;';
  
  box.innerHTML =
    '<div style="font-size:48px;margin-bottom:12px;">⚠️</div>' +
    '<p style="font-size:18px;color:#333;margin:0 0 16px;line-height:1.5;">' +
    'actualiza tu link al mapa desde Statetty Telegram, entonces has click en el nuevo link' +
    '</p>' +
    '<button id="modal-error-btn" style="background:#2563eb;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-size:16px;cursor:pointer;">Cerrar</button>';
  
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  
  document.getElementById('modal-error-btn').addEventListener('click', function () {
    overlay.remove();
  });
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.remove();
  });
}

$(document).ready(function () {
  $('#toolbox-btn').on('click', function () {
    $('#toolbox').toggle();
  });
  $(document).on('click', function (e) {
    if ($('#toolbox').is(':visible') && !$(e.target).closest('#toolbox, #toolbox-btn').length) {
      $('#toolbox').hide();
    }
  });

  const agencyNames = {
    "ic":     "Info Casas",
    "UC":     "Ultra Casas",
    "C21":    "Century 21",
    "remax":  "RE/MAX",
    "bieni":  "Bien Inmuebles",
    "IDI":    "Inversionistas de Impacto",
    "elfaro": "El Faro",
    "si":     "Sin Intermediarios",
    "capital":"Capital Corporación",
    "sce":    "Santa Cruz Estate",
    "laenc":  "La encontré",
    "nexoi":  "Nexo Inmobiliario",
  };

  function renderMap(locs, centerLat, centerLng, circleRadius, avgPrice) {
    locations = locs;
    map = L.map('mapid');
    initACMMapClickMarker(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    var circleCenter = L.latLng(centerLat, centerLng);
    var circle = L.circle(circleCenter, { color: 'green', weight: 1, fillOpacity: 0, radius: circleRadius }).addTo(map);

    var crossIcon = L.icon({
      iconUrl: '../../assets/images/cross_green.png',
      iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -10]
    });
    var crossMarker = L.marker(circleCenter, { icon: crossIcon }).addTo(map);
    crossMarker.bindPopup('Coordenadas: ' + centerLat + ',' + centerLng + '<br>Valor promedio: USD' + formatNumber(avgPrice));

    // markers
    locations.forEach(function (dato) {
      let url = dato.uid;
      var brand = dato.brand;

      var icon = new L.Icon({
        iconUrl: '../../assets/images/pointers/pointer_' + brand + '.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [40, 60], iconAnchor: [20, 60], popupAnchor: [1, -54], shadowSize: [60, 60]
      });

      var marker = L.marker([dato.lat, dato.lng], { icon }); if (brand !== "ic") {marker.addTo(map);}

      const nombreAgente = (dato.agentName || '').trim();
      const limpio = nombreAgente
        ? nombreAgente
            .replace(/\b(lic|ing|arq|dr|dra)\.?\s+/gi,'')
            .replace(/[^\p{L}\s'-]/gu,'')
            .trim()
        : '';

      const nombreCorto   = limpio ? ' ' + limpio.split(/\s+/).slice(0,2).join(' ') : '';
      const nombreCortito = limpio ? ' ' + limpio.split(/\s+/).slice(0,1).join(' ') : '';

      var cel = '';
      var celularValido = false;
      var rawPhone = (dato.agentPhone || '').toString().trim();
      if (typeof libphonenumber !== 'undefined') {
        var pn = null;
        if (rawPhone.includes('+')) {
          pn = libphonenumber.parsePhoneNumberFromString(rawPhone);
        } else {
          var digits = rawPhone.replace(/\D/g, '');
          if (digits.length >= 8) {
            pn = libphonenumber.parsePhoneNumberFromString('+' + digits);
          }
        }
        if (pn && pn.isValid()) {
          cel = pn.number.slice(1);
          celularValido = true;
        }
      }

      let soyNa = na ? ` ${na}` : '';
      let deAg = ag ? ` de ${ag}` : '';
      let sc = (na || ag) ? ' te escribe, ' : '';
      let foto = dato.foto ? `Foto: ${dato.foto}\n\n`:'';

      const server = STATETTY_CONFIG.WS_API_BASE;
      const linkSrv = `${server}/usrClckWsInm?u=${encodeURIComponent(userid)}&i=${encodeURIComponent(dato._id)}`;

      const linkWA = celularValido
        ? `<br/><a href="#" onclick="openWsRedirect('${linkSrv}');return false;">📱 Contactar a${nombreCorto}</a>`
        : '';        

      var distance = Math.round(calculateDH(circleCenter.lat, circleCenter.lng, dato.lat, dato.lng) * 1000);
      let fotoHTML = dato.foto
        ? `<div style="width:200px;height:200px;overflow:hidden;border-radius:8px;margin:6px 0;cursor:pointer;"
               onclick="showFullImage('${dato.foto}')">
             <img src="${dato.foto}"
                  style="width:100%;height:100%;object-fit:cover;object-position:center;">
           </div>`
        : "";

      var priceDiffPercent = ((dato.precio - avgPrice) / avgPrice) * 100;
      var priceComparison = priceDiffPercent > 0
        ? `<span style="color: red;">↑${Math.ceil(priceDiffPercent)}%</span>`
        : `<span style="color: green;">↓${Math.ceil(Math.abs(priceDiffPercent))}%</span>`;
      let descripcion = dato.des ? `<b>Descripción:</b> ${dato.des}<br>`:'';
      let direccion = dato.dir ? `<b>Dirección:</b> ${dato.dir}<br>`:'';
      let micros = dato.micros !=='' ? `<b>Líneas de micros:</b> ${dato.micros}<br>`:'';

      var popupContent = "<b>" + dato.Titulo + " (" + distance + "m)</b> " + priceComparison + "<br>" +
        `${descripcion}` +
        `${direccion}` +
        `${micros}` +
        fotoHTML +
        '<a href="' + url + '" target="_blank">🔗 Ver página de la fuente de los datos</a>' +
        linkWA +
        `<br><label><input type="checkbox" class="chk-sel" data-id="${dato.uid}"> Seleccionar</label>`;

      marker.bindPopup(popupContent);
      markers.push({ marker, iconOriginal: icon, dato, overlay: null });

      marker.on("popupopen", function () {
        let chk = $(`.chk-sel[data-id='${dato.uid}']`);
        chk.prop("checked", seleccionados.some(s => s.uid === dato.uid));

        const currentMarkerObj = markers.find(mm => mm.dato.uid === dato.uid);
        if (!isMarkerActive(currentMarkerObj)) chk.prop('disabled', true);
        else chk.prop('disabled', false);

        chk.off("change").on("change", function () {
          if (this.checked) {
            if (!seleccionados.some(s => s.uid === dato.uid)) seleccionados.push(dato);
            let overlay = L.marker([dato.lat, dato.lng], { icon: checkOverlayIcon, interactive: false }).addTo(map);
            let obj = markers.find(m => m.dato.uid === dato.uid);
            if (obj) obj.overlay = overlay;
          } else {
            seleccionados = seleccionados.filter(s => s.uid !== dato.uid);
            let obj = markers.find(m => m.dato.uid === dato.uid);
            if (obj && obj.overlay) { map.removeLayer(obj.overlay); obj.overlay = null; }
          }
          guardarSeleccionados();
          actualizarToolbox();
        });
      });
    });

    // accordion
    $(document).on('click', '.section-header', function () {
      $('.section').removeClass('active');
      $(this).parent().addClass('active');
    });

    // agencias únicas
    let agencies = {};
    markers.forEach(obj => {
      let brand = getBrand(obj);
      agencies[brand] = true;
    });
    localStorage.removeItem("agenciasSeleccionadas");
    for (let ag in agencies) {
      if (ag === "statetty") continue;
      let label = agencyNames[ag] || ag;
      let checked = ag !== "ic";
      $('#agency-filter').append(
        `<div><label><input type="checkbox" class="chk-agency" data-ag="${ag}" ${checked ? "checked" : ""}> ${label}</label></div>`
      );
    }

    // filtro por agencias
    $(document).on('change', '.chk-agency', function () {
      let ag = $(this).data('ag');
      let checked = this.checked;
      handleAgencyToggle(ag, checked);
      const query = $('#search-input').val() || '';
      if (query.trim()) {
        $('#search-input').trigger('input');
      } else {
        ultimosFiltrados = getVisibleLocations();
        actualizarEstadisticas(ultimosFiltrados);
      }
      resetLocalStoragePreservingState();
    });

    // restaurar seleccionados
    const prevSel = cargarSeleccionados();
    const visiblesSet = new Set(getVisibleLocations().map(x => x.uid));
    prevSel.forEach(id => {
      if (!visiblesSet.has(id)) return;
      let obj = markers.find(m => m.dato.uid === id);
      if (obj) {
        seleccionados.push(obj.dato);
        let overlay = L.marker([obj.dato.lat, obj.dato.lng], { icon: checkOverlayIcon, interactive: false }).addTo(map);
        obj.overlay = overlay;
      }
      $(`.chk-sel[data-id='${id}']`).prop("checked", true);
    });
    guardarSeleccionados();
    actualizarToolbox();

    const visibles = getVisibleLocations();
    const calc = calcularBoundsDesdeLocations(visibles);
    if (calc && calc.bounds) { map.fitBounds(calc.bounds.pad(0.1)); } else { map.setView([centerLat, centerLng], 13); }

    ultimosFiltrados = getVisibleLocations();
    actualizarEstadisticas(ultimosFiltrados);

    map.on("moveend", guardarMapa);
    map.on("zoomend", guardarMapa);
  }

  var urlParams = new URLSearchParams(window.location.search);
  let id = urlParams.get('id');
  let key = urlParams.get('key');
  let pProm = Math.round(urlParams.get('p'));
  let userid = urlParams.get('u');
  window.na = urlParams.get('na');
  window.ag = urlParams.get('ag');
  window.an = urlParams.get('an');
  window.M2T = urlParams.get('M2T');
  window.M2T = normalizarM2TDesdeURI();

  var publicKey = urlParams.get('k');

  async function init() {
    $('#loading-indicator').show();

    if (publicKey) {
      var response = await fetchFinderResult(publicKey);
      if (response && Array.isArray(response.result) && response.result.length > 0) {
        var parsed = parseFinderResult(response);
        var locs = parsed.locations;

        locs.forEach(function(loc) {
          loc.uid = normalizeURL(loc.URL);
          loc.brand = getBrand({ dato: loc });
        });

        if (parsed.usuario) {
          window.na = parsed.usuario.nombre || '';
          window.ag = parsed.usuario.agencia || '';
          window.an = parsed.usuario.telefono || '';
        }

        var info = parsed.info || {};
        var lat = parseFloat(info.lat) || parseFloat(urlParams.get('lat'));
        var lng = parseFloat(info.lng) || parseFloat(urlParams.get('lng'));
        var radius;
        if (info.dist !== undefined) radius = info.dist * 1000;
        else if (urlParams.get('r')) radius = parseFloat(urlParams.get('r'));
        else radius = null;
        var pProm = Math.round(info.precioProm) || Math.round(urlParams.get('p')) || 0;

        if (!lat || !lng || !radius) {
          var latSum = 0, lngSum = 0;
          locs.forEach(function(loc) { latSum += loc.lat; lngSum += loc.lng; });
          lat = latSum / locs.length;
          lng = lngSum / locs.length;
          var maxDistance = 0;
          locs.forEach(function(loc) {
            var d = calculateDH(lat, lng, loc.lat, loc.lng);
            if (d > maxDistance) maxDistance = d;
          });
          radius = maxDistance * 1000;
        }
        if (isNaN(pProm) || pProm == 0) pProm = calcularPromedio(locs, 'precio');

        if (info.userID) userid = info.userID;

        $('#loading-indicator').hide();
        renderMap(locs, lat, lng, radius, pProm);
        return;
      }
      $('#loading-indicator').hide();
      mostrarModalError();
      return;
    }

    // Fallback: Google Sheets
    if (!id || !key) { throw new Error("ID o clave no proporcionados en la URL"); }

    var valores = 'Sheet1!A2:Y';
    var url = 'https://sheets.googleapis.com/v4/spreadsheets/' + id + '/values/' + valores + '?key=' + key;

    $.getJSON(url, function (data) {
      $('#loading-indicator').hide();

      const columnas = [
        "Titulo","lat","lng","dir","URL","des","ambientes","dormitorios","baños","m2construccion",
        "m2terreno","nombre","precioM2","broker","foto","precio","agentName","agentPhone","fechaIngreso",
        "tiempoOfertado","tipoInmueble","tipoNegocio","anoc","_id", "micros"
      ];

      window.columnasConfig = {
        "foto":           true,
        "Titulo":         true,
        "dormitorios":    true,
        "baños":          true,
        "m2construccion": true,
        "m2terreno":      true,
        "lat":            false,
        "lng":            false,
        "dir":            false,
        "URL":            false,
        "des":            false,
        "ambientes":      false,
        "nombre":         false,
        "precioM2":       false,
        "precioM2C":      false,
        "precioM2T":      false,
        "broker":         false,
        "precio":         false,
        "agentName":      false,
        "agentPhone":     false,
        "fechaIngreso":   false,
        "tiempoOfertado": false,
        "tipoInmueble":   false,
        "tipoNegocio":    false,
        "anoc":           false,
        "_id":            false,
        "micros":         false,
      };

      $(data.values).each(function () {
        let location = {};
        columnas.forEach((col, i) => location[col] = this[i] || "");

        location.lat            = parseFloat(location.lat);
        location.lng            = parseFloat(location.lng);
        location.precio         = parseInt(location.precio) || 0;
        location.precioM2       = parseInt(location.precioM2) || 0;
        location.uid            = normalizeURL(location.URL);
        location.m2terreno      = parseInt(location.m2terreno) || 0;
        location.m2construccion = parseInt(location.m2construccion) || 0;
        location.tiempoOfertado = parseInt(location.tiempoOfertado) || 0;
        location.micros         = location.micros || '';

        location.precioM2C = (location.precio > 0 && location.m2construccion > 0)? location.precio / location.m2construccion: 0;
        delete location.precioM2;

        location.precioM2T = (location.precio > 0 && location.m2terreno > 0)? location.precio / location.m2terreno: 0;

        let rawDesc = location.des || "";
        rawDesc = rawDesc
          .replace(/Ø[=<>][ÜÝÐ°Í]/g, " ")
          .replace(/[•·•`´¨^~¬]+/g, " ")
          .replace(/[“”"']/g, "'")
          .replace(/[`´¨]/g, "")
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
          .replace(/[^\x20-\x7EÀ-ÿ\n\r]/g, " ")
          .replace(/\s{2,}/g, " ")
          .replace(/(\r\n|\r|\n){2,}/g, "\n")
          .replace(/\n\s+/g, "\n")
          .replace(/\s+\n/g, "\n")
          .trim();

        rawDesc = rawDesc
          .replace(/\+591\d{8}/g, "[...]")
          .replace(/591\d{8}/g, "[...]")
          .replace(/\b\d{8}\b/g, "[...]")
          .replace(/\d{2,4}[-\s]\d{2,4}[-\s]\d{2,4}/g, "[...]")
          .replace(/\(\d{3,4}\)\s?\d{5,8}/g, "[...]")
          .replace(/00\s?591\d{8}/g, "[...]")
          .replace(/wa\.me\/\d+/gi, "[...]")
          .replace(/whatsapp\.com\/\d+/gi, "[...]");

        const chrMax = 300;
        const faltan = rawDesc.length > chrMax ? rawDesc.length - chrMax : 0;
        const frase = faltan > 0 ? `... (y ${faltan} caracteres más)` : "";
        location.des = rawDesc.length > chrMax ? rawDesc.substring(0, chrMax) + frase : rawDesc;

        location.brand = getBrand({ dato: location });
        locations.push(location);

      });

      var lat = urlParams.get('lat');
      var lng = urlParams.get('lng');
      var radius = urlParams.get('r');
      if (!lat || !lng || !radius) {
        let latSum = 0, lngSum = 0;
        locations.forEach(loc => { latSum += loc.lat; lngSum += loc.lng; });
        lat = latSum / locations.length;
        lng = latSum / locations.length;
        let maxDistance = 0;
        locations.forEach(loc => {
          const distance = calculateDH(lat, lng, loc.lat, loc.lng);
          if (distance > maxDistance) { maxDistance = distance; }
        });
        radius = maxDistance * 1000;
      }
      if (isNaN(pProm) || pProm == 0) { pProm = calcularPromedio(locations, 'precio'); }

      renderMap(locations, lat, lng, radius, pProm);
    });
  }

  init().catch(function(e) {
    console.error('Error al cargar datos del mapa', e);
    $('#loading-indicator').hide();
    if (publicKey) mostrarModalError();
  });

  // búsqueda
  $('#search-input').on('input', function () {
    let query = $(this).val().toLowerCase();
    let matchCount = 0, filtrados = [];

    markers.forEach(obj => {
      // ignorar markers cuyas agencias estén desactivadas
      if (!isMarkerActive(obj)) {
        // restaurar icono original si era resultado
        obj.marker.setIcon(obj.iconOriginal);
        obj.marker.setZIndexOffset(0);
        return;
      }

      let texto = (
        obj.dato.des + ' ' + obj.dato.nombre + ' ' + obj.dato.Titulo + ' ' + obj.dato.dir + ' ' + obj.dato.broker + ' ' + 
        (obj.dato.agentName || '') + ' ' +
        (obj.dato.agentPhone || '')
      ).toLowerCase();

      if (query && texto.includes(query)) {
        obj.marker.setIcon(resultIcon);
        obj.marker.setZIndexOffset(1000);
        matchCount++;
        filtrados.push(obj.dato);
      } else {
        obj.marker.setIcon(obj.iconOriginal);
        obj.marker.setZIndexOffset(0);
      }
    });

    ultimosFiltrados = filtrados;

    if (query) {$('#search-count').text(matchCount).show();actualizarEstadisticas(filtrados);} 
    else {
      $('#search-count').hide();
      const visibles = getVisibleLocations();
      actualizarEstadisticas(visibles);
      ultimosFiltrados = visibles;
    }
    resetLocalStoragePreservingState();

  });
  if (typeof initACMTools === "function") {initACMTools();}
});

// -------------------------------
// Funciones auxiliares
// -------------------------------
function calculateDH(lat1, lng1, lat2, lng2) {
  const lat1Rad = lat1 * Math.PI / 180, lng1Rad = lng1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180, lng2Rad = lng2 * Math.PI / 180;
  const dLat = lat2Rad - lat1Rad, dLng = lng2Rad - lng1Rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

/** ------------------------------------------------------------------------------------------- normalizarM2TDesdeURI
 * Normaliza el valor M2T proveniente del URI corrigiendo errores de escala y rango
 * @returns {number}
 */
  function normalizarM2TDesdeURI(){ try {
    let v=parseFloat(window.M2T); if(isNaN(v)||v<=0)return 0;
    if(v>10000&&v<100000)v=v/100;
    while(v>3000)v=v/10;
    if(v>2300)v=2300;
    if(v<50)v=50;
    return Math.round(v*100)/100;
  } catch (e) {console.log('normalizarM2TDesdeURI error',e);} }