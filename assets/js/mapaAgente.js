// ---------------------------------------------
// mapaAgente.js — render enriquecido + toolbox internals del modo agente
// del mapa unificado. Extraído del viejo mapa.js de /maps/find:
// renderMap (pines de marca, popup rico, círculo+cruz), selección de
// inmuebles, estadísticas, generación PDF/TSV, avisos modales.
// Requiere cargados antes: mapaShared.js, datos.js, acm.js, inmueblesPdf.js.
// ---------------------------------------------

// Iconos
var resultIcon = new L.Icon({
  iconUrl: '/assets/images/pointers/pointer_found.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [40, 60], iconAnchor: [20, 60], popupAnchor: [1, -54], shadowSize: [60, 60]
});

var checkOverlayIcon = L.divIcon({
  className: 'check-overlay',
  html: '✔️',
  iconSize: [30, 30],
  iconAnchor: [1, 60] // ✔️ sobre la mitad superior del marker
});

// Capa "nuevo": borde verde transparente sobre el pointer_<inmobiliaria>.png
// cuando el inmueble tiene una antigüedad de una semana o menos.
var nuevoOverlayIcon = new L.Icon({
  iconUrl: '/assets/images/pointers/pointer_nuevo.png',
  iconSize: [40, 60], iconAnchor: [20, 60], popupAnchor: [1, -54]
});

/** --------------------------------------------------------------------------------------- calcularBoundsDesdeLocations
 * Calcula bounds y centro óptimo a partir de locations visibles
 */
function calcularBoundsDesdeLocations(locs){ try {
  if(!Array.isArray(locs)||!locs.length)return null;
  let group=new L.featureGroup(locs.map(l=>L.marker([l.lat,l.lng])));
  let bounds=group.getBounds(),center=bounds.getCenter();
  return {bounds,center};
} catch (e) {console.log('calcularBoundsDesdeLocations error',e);} }

/** ----------------------------------------------------------------------------------------------- dispersarCoordenadas
 * Detecta grupos de coordenadas "solapadas" (misma coordenada exacta o a
 * menos de 10 metros) y redistribuye en círculo a `metrosD` metros alrededor
 * del ancla, para que cada puntero tenga su propio espacio clickeable.
 * La detección es transitiva (A~B, B~C => mismo grupo).
 * Muta `lat`/`lng` de los objetos dispersados; no crea copias ni reordena.
 */
function dispersarCoordenadas(metrosD = 20, locs = locations) { try {
  const UMBRAL_SOLAPE_M = 10; // metros: por debajo se considera "misma posición"
  if (!Array.isArray(locs) || locs.length < 2) return locs;

  const n = locs.length;
  const padre = Array.from({ length: n }, (_, i) => i);
  function encontrar(x) {
    while (padre[x] !== x) { padre[x] = padre[padre[x]]; x = padre[x]; }
    return x;
  }
  function unir(a, b) {
    const ra = encontrar(a), rb = encontrar(b);
    if (ra !== rb) padre[ra] = rb;
  }

  function distMetros(a, b) {
    if (!a || !b || typeof a.lat !== 'number' || typeof a.lng !== 'number' ||
        typeof b.lat !== 'number' || typeof b.lng !== 'number' ||
        isNaN(a.lat) || isNaN(a.lng) || isNaN(b.lat) || isNaN(b.lng)) return Infinity;
    return calculateDH(a.lat, a.lng, b.lat, b.lng) * 1000;
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (distMetros(locs[i], locs[j]) < UMBRAL_SOLAPE_M) unir(i, j);
    }
  }

  const grupos = new Map();
  for (let i = 0; i < n; i++) {
    const raiz = encontrar(i);
    if (!grupos.has(raiz)) grupos.set(raiz, []);
    grupos.get(raiz).push(i);
  }

  const METROS_POR_GRADO_LAT = 111320;
  function metrosADegLat(m) { return m / METROS_POR_GRADO_LAT; }
  function metrosADegLng(m, latRef) {
    const metrosPorGradoLng = METROS_POR_GRADO_LAT * Math.cos(latRef * Math.PI / 180);
    if (Math.abs(metrosPorGradoLng) < 1e-6) return 0;
    return m / metrosPorGradoLng;
  }

  let gruposConSolape = 0, totalDispersados = 0;

  grupos.forEach((indices) => {
    if (indices.length < 2) return;
    gruposConSolape++;
    const ancla = locs[indices[0]];
    const resto = indices.slice(1);
    resto.forEach((idx, k) => {
      const angulo = (2 * Math.PI * k) / resto.length;
      const dLat = metrosADegLat(metrosD) * Math.cos(angulo);
      const dLng = metrosADegLng(metrosD, ancla.lat) * Math.sin(angulo);
      locs[idx].lat = ancla.lat + dLat;
      locs[idx].lng = ancla.lng + dLng;
      totalDispersados++;
    });
  });

  if (gruposConSolape > 0) {
    console.log(`dispersarCoordenadas: ${gruposConSolape} grupo(s) con coordenadas solapadas, ${totalDispersados} inmueble(s) dispersado(s) a ${metrosD}m`);
  }

  return locs;
} catch (e) { console.log('dispersarCoordenadas error', e); return locs; } }

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

/**
 * Lista de inmuebles visibles para búsquedas, selección masiva y generación de
 * PDFs. Sin filtro de agencias: se usa todo lo que manda el servidor.
 */
function getVisibleLocations() {
  return locations;
}

/**
 * Actualiza las estadísticas visuales y asegura que los botones de acción
 * existan y estén inicializados.
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
 */
function ensureStatsActions() {
  if ($('#stats-actions').length === 0) {
    $('#stats-container').append(`
      <div id="stats-actions" style="margin-top:8px;">
        <button id="btn-add-sel" data-tippy-content="Agrega a la selección los inmuebles que coinciden con el texto buscado y están visibles en el mapa.">Agregar a selección</button>
        <button id="btn-remove-sel" data-tippy-content="Quita de la selección los inmuebles que coinciden con el texto buscado y están visibles en el mapa.">Quitar de selección</button>
        <button id="btn-keep-only" data-tippy-content="Deja en la selección solo los inmuebles que coinciden con la búsqueda actual; el resto se quita.">Mantener estos</button>
        <br>
        <button id="btn-add-all" data-tippy-content="Agrega a la selección todos los inmuebles actualmente visibles en el mapa, sin importar el texto buscado.">Agregar todos</button>
        <button id="btn-remove-all" data-tippy-content="Quita todos los inmuebles de la selección actual (vacía la lista de seleccionados).">Quitar todos</button>
        <button id="btn-add-all-except" title="Agregar todos menos los filtrados">➕ Otros</button>
      </div>
    `);
    // Estos botones se crean dinámicamente después de la inicialización
    // general de tooltips del toolbox, así que hay que engancharles Tippy acá.
    initPopupTooltips(document.getElementById('stats-actions'));
  }

  if (window.statsButtonsInit) return;
  window.statsButtonsInit = true;

  // --- handlers (usar .off para evitar duplicados si se vuelve a llamar) ---
  $('#btn-add-all').off('click').on('click', function () {
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
    const visiblesUID = new Set(getVisibleLocations().map(x => x.uid));
    (ultimosFiltrados || []).forEach(a => {
      if (!visiblesUID.has(a.uid)) return;
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
      if (!visiblesUID.has(a.uid)) return;
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
    s.src="/assets/js/inmueblesPdf.js";
    s.onload=function(){if(typeof renderColumnSelector==="function"){renderColumnSelector();}};
    s.onerror=function(){console.log("Error cargando inmueblesPdf.js");};
    document.head.appendChild(s);
  }
} catch (e) {console.log('ensureRenderColumnSelector error',e);} }

/**
 * Actualiza enabled/disabled de los botones según el estado actual.
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

if (!window.columnasConfig) {
  window.columnasConfig = {
    "foto":           true,
    "Titulo":         true,
    "precio":         true,
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
    "precioM2C":      false,
    "precioM2T":      false,
    "broker":         false,
    "agentName":      false,
    "agentPhone":     false,
    "fechaIngreso":   false,
    "tiempoOfertado": false,
    "tipoInmueble":   false,
    "tipoNegocio":    false,
    "anoc":           false,
  };
}

function actualizarToolbox() {
  $("#sel-box").remove();
  seleccionados.sort((a, b) => (parseFloat(a.precio) || 0) - (parseFloat(b.precio) || 0));

  let html = '';
  seleccionados.forEach((s, i) => {
    html += `<div>${i + 1}. ${s.Titulo} <span class="remove-sel" data-id="${s.uid}" style="cursor:pointer; color:red;">❌</span></div>`;
  });

  if (true) {
    // #sel-section: la .section "Seleccionados & PDF" del toolbox (id fijo en
    // mapaToolbox.html; antes se buscaba por posición :nth-child(2), que se
    // movió al agregarse la cabecera .tb-head del panel).
    $("#sel-section .section-body").html(`
      <div id="sel-box">
        <b>Seleccionados: ${seleccionados.length}</b>
        ${html}
        <br>
        <button id="btn-pdf-landscape" disabled>📄 PDF pantalla</button>
        <button id="btn-pdf-mobile" disabled>📱 PDF móvil</button>
        <button id="btn-tsv" disabled>⬇️ Descargar datos</button>
        <button id="btn-copiar" disabled>📋 Copiar datos</button>
        <span id="tsv-copied-msg" style="display:none;color:green;margin-left:6px;"></br>Datos copiados al portapapeles, puedes pegarlos en una hoja de cálculo</span> 
      </div>
    `);

    ensureRenderColumnSelector();
    initPDFFormPersistence();
    if (typeof fillPDFAgentFieldsFromUser === 'function') {
      var userData = window.STT && window.STT.getUsuario && window.STT.getUsuario();
      if (userData) fillPDFAgentFieldsFromUser(userData);
    }

    const chkAll = $("#pdf-show-all").prop("checked");
    const selCount = seleccionados.length;
    const habilitar = selCount > 0 || chkAll === true;

    $("#btn-pdf-landscape").prop("disabled", !habilitar);
    $("#btn-pdf-mobile").prop("disabled", !habilitar);
    $("#btn-tsv").prop("disabled", !habilitar);
    $("#btn-copiar").prop("disabled", !habilitar);

    $("#pdf-show-all").off("change").on("change", function(){
      const habilitar = seleccionados.length > 0 || this.checked === true;
      $("#btn-pdf-landscape").prop("disabled", !habilitar);
      $("#btn-pdf-mobile").prop("disabled", !habilitar);
      $("#btn-tsv").prop("disabled", !habilitar);
      $("#btn-copiar").prop("disabled", !habilitar);
    });

    function getNombreBusqueda() {
      var inputName = ($('#fndInm-nombre').val() || '').trim();
      var slotLabel = ($('#fndInm-slots-select option:selected').text() || '').trim();
      if (slotLabel === 'Búsquedas guardadas…' || slotLabel === '--- Vacío ---') slotLabel = '';
      return inputName || slotLabel || '';
    }

    $("#btn-pdf-landscape").off("click").on("click", function () {
      const showAll = $("#pdf-show-all").prop("checked");
      generarBrochurePDF(showAll ? locations : seleccionados, "landscape", seleccionados, getNombreBusqueda());
    });

    $("#btn-pdf-mobile").off("click").on("click", function () {
      const showAll = $("#pdf-show-all").prop("checked");
      generarBrochurePDF(showAll ? locations : seleccionados, "mobile", seleccionados, getNombreBusqueda());
    });

    $("#btn-tsv").off("click").on("click", function () {
      const showAll = $("#pdf-show-all").prop("checked");
      descargarTSV(showAll ? locations : seleccionados, getNombreBusqueda());
    });

    $("#btn-copiar").off("click").on("click", function () {
      const showAll = $("#pdf-show-all").prop("checked");
      copiarTSV(showAll ? locations : seleccionados).then(function (ok) {
        if (!ok) return;
        $("#tsv-copied-msg").show();
        clearTimeout($("#btn-copiar").data("sp-msg-timer"));
        $("#btn-copiar").data("sp-msg-timer", setTimeout(function () {
          $("#tsv-copied-msg").hide();
        }, 2500));
      }).catch(function (e) {
        console.log("[Statetty] [error] copiarTSV:", e);
      });
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

function mostrarAvisoSinResultados() {
  if (document.getElementById('modal-sinresultados-overlay')) return; // evitar duplicados

  var overlay = document.createElement('div');
  overlay.id = 'modal-sinresultados-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99999;display:flex;justify-content:center;align-items:center;';

  var box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:12px;padding:32px;max-width:420px;margin:20px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3);font-family:sans-serif;';

  box.innerHTML =
    '<div style="font-size:48px;margin-bottom:12px;">🔍</div>' +
    '<p style="font-size:18px;color:#333;margin:0 0 16px;line-height:1.5;">' +
    'Tu última búsqueda no devolvió inmuebles con los criterios seleccionados. Probá ajustar tu búsqueda desde Telegram.' +
    '</p>' +
    '<a id="modal-sinresultados-link" href="https://t.me/statettybot" target="_blank" rel="noopener" ' +
    'style="display:inline-block;background:#2563eb;color:#fff;border-radius:8px;padding:10px 24px;font-size:16px;text-decoration:none;">' +
    'Ir a @statettybot' +
    '</a>';

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.remove();
  });
}

// Capa de fondo y pin ACM: se agregan una sola vez por mapa. renderMap se puede
// volver a llamar (búsqueda desde la #caja) y repetirlos duplicaría las capas.
function addBaseLayers() {
  if (!map.__baseLayers) {
    map.__baseLayers = true;
    initACMMapClickMarker(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    // Regla de mapa.js: el zoom del usuario esconde el toolbox solo en
    // pantalla chica (donde el panel tapa el mapa). En desktop queda abierto
    // para seguir trabajando con los pines; cierra con ⚙, ✕ o Esc.
    // Se registra por instancia (junto al flag), no en document.ready, porque cada
    // renderMap puede crear un mapa nuevo. No lo vuelve a mostrar
    // hasta que el usuario lo abra con #toolbox-btn.
    map.on('zoomstart', function () {
      if (window.STT_TOOLBOX && window.STT_TOOLBOX.esMovil()) window.STT_TOOLBOX.cerrar(false);
    });
  }
}

/** Quita lo que dibujó la llamada anterior a renderMap (pines, círculo y cruz). */
function limpiarRenderPrevio() {
  markers.forEach(function (obj) {
    var mk = obj && obj.marker ? obj.marker : obj;
    if (mk && map.hasLayer(mk)) map.removeLayer(mk);
    if (obj && obj.overlay && map.hasLayer(obj.overlay)) map.removeLayer(obj.overlay);
    if (obj && obj.nuevoOverlay && map.hasLayer(obj.nuevoOverlay)) map.removeLayer(obj.nuevoOverlay);
  });
  markers = [];
  [circuloBusqueda, cruzCentro].forEach(function (c) {
    if (c && map.hasLayer(c)) map.removeLayer(c);
  });
  circuloBusqueda = null;
  cruzCentro = null;
  seleccionados = [];
}

// Centros por código de ciudad (espejo de config.ciudades del backend). Sirven
// de vista inicial mientras llegan resultados o el mapCenter del localStorage.
var CENTRO_POR_CIUDAD = {
  SCZ: [-17.7833, -63.1821],
  LIM: [-12.0953, -77.0540]
};

function centroInicialMapa() {
  try {
    var mc = JSON.parse(localStorage.getItem("mapCenter"));
    if (Array.isArray(mc) && isFinite(mc[0]) && isFinite(mc[1])) return mc;
  } catch (_) {}
  var u = (window.STT && window.STT.getUsuario) ? window.STT.getUsuario() : null;
  return CENTRO_POR_CIUDAD[(u && u.ciudad) || 'SCZ'] || CENTRO_POR_CIUDAD.SCZ;
}

function initEmptyMap() {
  // Re-carga dinámica (window.recargarMapa): si había un render anterior, sus pines
  // no deben quedar detrás del mapa vacío. En la carga inicial `map` es null y no hace nada.
  if (map) limpiarRenderPrevio();
  if (!map) {
    map = window.map || L.map('mapid').setView(centroInicialMapa(), 12);
    window.map = map;
  }
  addBaseLayers();

  // Auto-apertura del toolbox solo en desktop: en celular el panel nace
  // cerrado (abierto taparía casi toda la pantalla al entrar al mapa vacío).
  var autoAbrir = !(window.STT_TOOLBOX && window.STT_TOOLBOX.esMovil());
  if (autoAbrir && window.STT_TOOLBOX) window.STT_TOOLBOX.abrir();

  if (autoAbrir) {
    setTimeout(function () {
      var fndInmHeader = document.querySelector('#stt-fndinm-slot .section-header');
      if (fndInmHeader) fndInmHeader.click();
    }, 300);
  }
}

/**
 * renderMap — pinta resultados enriquecidos (documento completo del backend)
 * sobre el mapa. Se vuelve global porque la #caja repinta con él.
 */
function renderMap(locs, centerLat, centerLng, circleRadius, avgPrice, na, ag) {
  locations = locs;
  dispersarCoordenadas();
  // El contenedor #mapid puede haberlo tomado antes otro bloque (la #caja espera
  // mapa). Se adopta el existente: Leaflet rechaza L.map() sobre un contenedor ya
  // inicializado, y eso tumbaba toda la página.
  if (!map) {
    map = window.map || L.map('mapid');
    window.map = map;
  }
  limpiarRenderPrevio();
  addBaseLayers();

  var circleCenter = L.latLng(centerLat, centerLng);
  circuloBusqueda = L.circle(circleCenter, L.extend({ radius: circleRadius }, ESTILO_AREA)).addTo(map);

  var crossIcon = L.icon({
    iconUrl: '/assets/images/cross_green.png',
    iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -10]
  });
  cruzCentro = L.marker(circleCenter, { icon: crossIcon }).addTo(map);
  cruzCentro.bindPopup('Coordenadas: ' + centerLat + ',' + centerLng + '<br>Valor promedio: USD' + formatNumber(avgPrice));

  // markers
  var waphoneUsuario = (window.STT && window.STT.getUsuario && window.STT.getUsuario() || {}).waphone || '';
  locations.forEach(function (dato) {
    // RE/MAX BO guarda a veces la foto como ruta relativa "listings/..."
    // → completar con el dominio para que el popup/WhatsApp/PDF no la rompan.
    if (/^\s*listings\//.test(dato.foto || '') && /remax/i.test(dato.broker || '')) {
      dato.foto = 'https://intramax.bo/storage/' + dato.foto.trim();
    }
    let url = dato.uid;
    var brand = dato.brand;

    var icon = new L.Icon({
      iconUrl: '/assets/images/pointers/pointer_' + brand + '.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [40, 60], iconAnchor: [20, 60], popupAnchor: [1, -54], shadowSize: [60, 60]
    });

    var marker = L.marker([dato.lat, dato.lng], { icon }); marker.addTo(map);

    // Si el inmueble es "nuevo" (createdAt <= 1 semana), se agrega la capa
    // pointer_nuevo.png justo encima del pointer, en las mismas coordenadas.
    var nuevoOverlay = null;
    if (esInmuebleNuevo(dato)) {
      nuevoOverlay = L.marker([dato.lat, dato.lng], { icon: nuevoOverlayIcon, interactive: false });
      nuevoOverlay.addTo(map);
    }

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
    // Teléfono listo para wa.me: completa el prefijo del país del inmueble
    // (8-10 dígitos sin +) para que el link "📱 Contactar a..." aparezca.
    var tlf = telefonoConPais(dato, PAISES, typeof libphonenumber !== 'undefined' ? libphonenumber : null);
    cel = tlf.cel;
    celularValido = tlf.valido;

    let soyNa = na ? ` ${na}` : '';
    let deAg = ag ? ` de ${ag}` : '';
    let sc = (na || ag) ? ' te escribe, ' : '';
    let foto = dato.foto ? `Foto: ${dato.foto}\n\n`:'';

    const msj = `Hola${nombreCortito},${soyNa}${deAg}${sc}un gusto saludarte. Por favor, podría enviarme información sobre este inmueble, en caso de que siga disponible (${dato.Titulo})\n\nGracias de antemano\n\nlink: ${url}\n\nMensaje creado con Statetty https://statetty.com`;

    const server = STATETTY_CONFIG.WS_API_BASE;
    const linkSrv = `${server}statetty/usrClckWsInm?u=${encodeURIComponent(window.__mapUserid)}&i=${encodeURIComponent(dato._id)}`;

    const linkWA = celularValido
      ? `<br/><a href="#" onclick="openWsRedirect('${linkSrv}','https://wa.me/${cel}?text=${encodeURIComponent(msj)}');return false;">📱 Contactar a${nombreCorto}</a>`
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
    var priceArrow = priceDiffPercent > 0 ? '↑' : '↓';
    var priceColor = priceDiffPercent > 0 ? 'red' : 'green';
    var priceComparisonTexto = priceArrow + Math.ceil(Math.abs(priceDiffPercent)) + '%';
    let descripcion = dato.des ? `<b>Descripción:</b> ${dato.des}<br>`:'';
    let direccion = dato.dir ? `<b>Dirección:</b> ${dato.dir}<br>`:'';
    let listaMicros = [];
    if (dato.micros && dato.micros !== '') {
      listaMicros = dato.micros.split(',').map(m => m.trim()).filter(m => m !== '');
    }

    // Línea compacta de detalles: 🏡 💰$300K | 📐353 | 🏗️175 | 🛏️3 | 🛁2 | 🚗3 | 📍910m | ⚖️↓10% | 🚌8
    var tipoEmoji = getTipoEmoji(dato.tipoInmueble);
    var precioCompacto = formatCompactPrice(dato.precio);
    var detalles = [];
    detalles.push(`<span data-tippy-content="Tipo de inmueble: ${dato.tipoInmueble || 'No especificado'}">${tipoEmoji}</span>`);
    detalles.push(`<span data-tippy-content="Precio: USD ${formatNumber(dato.precio)}">💰${precioCompacto}</span>`);
    if (dato.m2terreno) detalles.push(`<span data-tippy-content="Superficie de terreno: ${dato.m2terreno} m²">📐${dato.m2terreno}</span>`);
    if (dato.m2construccion) detalles.push(`<span data-tippy-content="Superficie construida: ${dato.m2construccion} m²">🏗️${dato.m2construccion}</span>`);
    if (dato.dormitorios) detalles.push(`<span data-tippy-content="Dormitorios: ${dato.dormitorios}">🛏️${dato.dormitorios}</span>`);
    if (dato['baños']) detalles.push(`<span data-tippy-content="Baños: ${dato['baños']}">🛁${dato['baños']}</span>`);
    if (dato.estacionamientos) detalles.push(`<span data-tippy-content="Estacionamientos: ${dato.estacionamientos}">🚗${dato.estacionamientos}</span>`);
    detalles.push(`<span data-tippy-content="Distancia al centro del área de búsqueda">📍${distance}m</span>`);
    detalles.push(`<span data-tippy-content="Comparación de precio respecto al promedio de los resultados de esta búsqueda"><span style="color:${priceColor}">⚖️${priceComparisonTexto}</span></span>`);
    if (listaMicros.length) detalles.push(`<span data-tippy-content="Micros que pasan a menos de 250m del inmueble">🚌${listaMicros.length}</span>`);
    var detallesLine = detalles.join(' | ');

    var esNuevo = esInmuebleNuevo(dato);
    var nuevoTag = esNuevo
      ? ` <span style="color:#e63946;font-weight:bold;" data-tippy-content="Publicado hace 15 días o menos">¡Nuevo!</span>`
      : '';
    var antiguedadTexto = formatAntiguedad(dato);
    var antiguedadLine = antiguedadTexto
      ? `<div style="font-size:11px;color:#666;" data-tippy-content="Fecha de publicación estimada del inmueble">${antiguedadTexto}</div>`
      : '';

    var popupContent = "<b>" + dato.Titulo + "</b>" + nuevoTag + "<br>" +
      detallesLine + "<br>" +
      antiguedadLine +
      `${descripcion}` +
      `${direccion}` +
      fotoHTML +                                     
      '<a href="' + url + '" target="_blank" style="text-decoration:none;">🔗 Página oficial</a>' +
      '&nbsp;|&nbsp;<a href="https://statetty.com/inmueble/' + encodeURIComponent(dato._id) + '?t=' + encodeURIComponent(waphoneUsuario) + '" target="_blank" style="text-decoration:none;">🔗 Página Statetty</a>' +
      '<br><a href="#" style="text-decoration:none;" data-tippy-content="Copy para usar en WhatsApp" onclick="return copyFichaWhatsApp(\'' + encodeURIComponent(dato._id) + '\', this);">🗨️ Copy</a>' +
      linkWA +
      `<br><label><input type="checkbox" class="chk-sel" data-id="${dato.uid}"> Seleccionar</label>`;

    marker.bindPopup(popupContent);
    markers.push({ marker, iconOriginal: icon, dato, overlay: null, nuevoOverlay });

    marker.on("popupopen", function (e) {
      initPopupTooltips(e.popup.getElement());
      let chk = $(`.chk-sel[data-id='${dato.uid}']`);
      chk.prop("checked", seleccionados.some(s => s.uid === dato.uid));

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

  map.off("moveend", guardarMapa);
  map.off("zoomend", guardarMapa);
  map.on("moveend", guardarMapa);
  map.on("zoomend", guardarMapa);
}
// La #caja busca por texto y repinta con este mismo renderMap: sin este hook sus
// resultados se descartaban (window.pintar no existe y renderMap no era global).
window.renderMap = renderMap;

// búsqueda por texto sobre los pines visibles (📊 Estadísticas & 🔍 Buscar del
// toolbox): resalta los que coinciden y recalcula las estadísticas.
function initFiltroTextoToolbox() {
  $('#search-input').off('input').on('input', function () {
    let query = $(this).val().toLowerCase();
    let matchCount = 0, filtrados = [];

    markers.forEach(obj => {
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
  });
}
