// ---------------------------------------------
// mapa.js - Lógica completa del mapa y selección
// (versión modificada para que las agencias desmarcadas no participen
//  en búsquedas, botones 'seleccionar todos', generación de PDFs, etc.)
// ---------------------------------------------

var map, locations = [], markers = [], seleccionados = [], ultimosFiltrados = [];
var circuloBusqueda = null, cruzCentro = null;   // capa y cruz del centro; se rehacen en cada renderMap
// Estilo único de áreas del mapa: figuras dibujadas (btn-pin / btn-lapiz, IIFE
// initCajaFind más abajo) y el círculo de resultados de renderMap. Top-level
// para que ambos scopes vean la misma definición (plan circulo-resultado-estilo-figuras, D1).
const ESTILO_AREA = { color: '#17baef', weight: 2, fillColor: '#17baef', fillOpacity: 0.22 };
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

// Capa "nuevo": borde verde transparente que se superpone sobre el pointer_{inmobiliaria}.png
// cuando el inmueble tiene una antigüedad (createdAt) de una semana o menos.
// Usa el mismo tamaño/anclaje que los pointer_{inmobiliaria}.png para quedar perfectamente alineado.
var nuevoOverlayIcon = new L.Icon({
  iconUrl: '../../assets/images/pointers/pointer_nuevo.png',
  iconSize: [40, 60], iconAnchor: [20, 60], popupAnchor: [1, -54]
});

function openWsRedirect(serverUrl, waUrl) {
  fetch(serverUrl).catch(function(e) { console.log("openWsRedirect", e); });
  window.open(waUrl, "_blank");
}

// Copia al portapapeles el texto de la ficha WhatsApp de un inmueble
// (misma función que el botón "Mis inmuebles" de inmueble/registro),
// llamando a statetty/inmueble/whatsapp y mostrando el resultado en el tippy.
function copyFichaWhatsApp(encId, btn) {
  var id = decodeURIComponent(encId);
  if (!id || !btn || btn.dataset.disabled) return false;
  var base = (window.STATETTY_CONFIG && STATETTY_CONFIG.WS_API_BASE) || '';
  var headers = { 'Content-Type': 'application/json' };
  if (window.STT && typeof window.STT.getKey === 'function') {
    var token = window.STT.getKey();
    if (token) headers['Authorization'] = 'Bearer ' + token;
  }
  if (btn._tippyOriginal === undefined) {
    btn._tippyOriginal = btn.getAttribute('data-tippy-content') || '';
  }
  btn.dataset.disabled = '1';
  return fetch(base + 'statetty/inmueble/whatsapp', {
    method: 'POST', headers: headers, body: JSON.stringify({ _id: id }),
  })
    .then(function (r) { return r.json().then(function (b) { return { status: r.status, body: b }; }); })
    .then(function (res) {
      if (res.status !== 200 || !res.body || res.body.ok !== true || !res.body.data || !res.body.data.texto) {
        throw new Error((res.body && res.body.error) || 'No se pudo generar el texto.');
      }
      return copiarTextoPortapapeles(res.body.data.texto);
    })
    .then(function () { fichaTippyFeedback(btn, '¡Copiado!'); })
    .catch(function (err) {
      console.log('[Statetty] [error] copyFichaWhatsApp:', err && err.message ? err.message : err);
      fichaTippyFeedback(btn, 'No se pudo copiar');
    })
    .then(function () { delete btn.dataset.disabled; return false; });
}

function copiarTextoPortapapeles(texto) {
  texto = String(texto || '');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(texto);
  }
  return new Promise(function (resolve, reject) {
    try {
      var ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      resolve();
    } catch (e) { reject(e); }
  });
}

function fichaTippyFeedback(btn, msg) {
  if (!btn || !btn._tippy || !btn._tippy.setContent) return;
  btn._tippy.setContent(msg);
  setTimeout(function () {
    if (btn._tippy) btn._tippy.setContent(btn._tippyOriginal);
  }, 1500);
}

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


/** ----------------------------------------------------------------------------------------------- dispersarCoordenadas
 * Revisa todos los inmuebles (por defecto, los que vienen de la base de datos en la variable
 * global `locations`) y detecta grupos de coordenadas "solapadas": inmuebles que están en la
 * misma coordenada exacta o a menos de 10 metros entre sí. Esto es necesario porque el mapa
 * usa punteros con `click`, y si dos o más quedan apilados en el mismo punto, el que queda
 * debajo del layer del otro no puede recibir clicks del usuario.
 *
 * Para cada grupo detectado:
 *  - El primer inmueble del grupo (según su orden original en el arreglo) se deja intacto,
 *    y sirve de "ancla" / centro de referencia.
 *  - El resto de los inmuebles del grupo se redistribuyen alrededor del ancla, en círculo,
 *    a una distancia de `metrosD` metros, para que cada uno tenga su propio espacio clickeable.
 *
 * La detección de solapamiento es transitiva (A solapa con B, B solapa con C => A, B y C
 * quedan en el mismo grupo), para cubrir cadenas de inmuebles muy próximos entre sí.
 *
 * Muta en el lugar las propiedades `lat`/`lng` de los objetos dispersados; no crea copias
 * ni reordena el arreglo.
 *
 * @param {number} [metrosD=15] - Distancia en metros a la que se dispersan los inmuebles solapados
 * @param {Array} [locs=locations] - Arreglo de inmuebles a procesar (por defecto, el arreglo global `locations`)
 * @returns {Array} El mismo arreglo recibido, con las coordenadas ya dispersadas donde correspondía
 */
function dispersarCoordenadas(metrosD = 20, locs = locations) { try {
  const UMBRAL_SOLAPE_M = 10; // metros: por debajo de esto se considera "misma posición"
  if (!Array.isArray(locs) || locs.length < 2) return locs;

  const n = locs.length;

  // --- Union-Find para agrupar transitivamente los inmuebles cercanos entre sí ---
  const padre = Array.from({ length: n }, (_, i) => i);
  function encontrar(x) {
    while (padre[x] !== x) { padre[x] = padre[padre[x]]; x = padre[x]; }
    return x;
  }
  function unir(a, b) {
    const ra = encontrar(a), rb = encontrar(b);
    if (ra !== rb) padre[ra] = rb;
  }

  // Distancia en metros entre dos inmuebles, reutilizando la fórmula Haversine ya existente (calculateDH, en km)
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

  // Agrupar índices por raíz del union-find, preservando el orden original dentro de cada grupo
  const grupos = new Map();
  for (let i = 0; i < n; i++) {
    const raiz = encontrar(i);
    if (!grupos.has(raiz)) grupos.set(raiz, []);
    grupos.get(raiz).push(i);
  }

  // Conversión de metros a grados de latitud/longitud
  const METROS_POR_GRADO_LAT = 111320;
  function metrosADegLat(m) { return m / METROS_POR_GRADO_LAT; }
  function metrosADegLng(m, latRef) {
    const metrosPorGradoLng = METROS_POR_GRADO_LAT * Math.cos(latRef * Math.PI / 180);
    if (Math.abs(metrosPorGradoLng) < 1e-6) return 0; // evita división por ~0 cerca de los polos
    return m / metrosPorGradoLng;
  }

  let gruposConSolape = 0, totalDispersados = 0;

  grupos.forEach((indices) => {
    if (indices.length < 2) return; // sin solapamiento, no se toca

    gruposConSolape++;

    // El primero (según orden original) queda como ancla / centro de referencia
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


// Determina la fecha real de antigüedad de un inmueble.
// Regla: fechaIngreso (fecha_ini) prevalece sobre createdAt SOLO si existe
// y es anterior a createdAt (es decir, el inmueble ya estaba publicado antes
// de que nuestro sistema lo captara). Si no existe fechaIngreso, o es
// posterior/igual a createdAt, se usa createdAt.
function getFechaAntiguedad(dato) {
  if (!dato) return null;
  var fCreated = dato.createdAt ? new Date(dato.createdAt) : null;
  if (fCreated && isNaN(fCreated.getTime())) fCreated = null;

  var fIngreso = dato.fechaIngreso ? new Date(dato.fechaIngreso) : null;
  if (fIngreso && isNaN(fIngreso.getTime())) fIngreso = null;

  if (fIngreso && (!fCreated || fIngreso.getTime() < fCreated.getTime())) {
    return fIngreso;
  }
  return fCreated;
}

function esInmuebleNuevo(dato, diasMax = 15) {
  try {
    var fecha = getFechaAntiguedad(dato);
    if (!fecha) return false;
    var LIMITE_MS = diasMax * 24 * 60 * 60 * 1000;
    var antiguedadMs = Date.now() - fecha.getTime();
    return antiguedadMs >= 0 && antiguedadMs <= LIMITE_MS;
  } catch (e) { console.log('esInmuebleNuevo error', e); return false; }
}

// Texto "publicado hace X días/meses/años" usando la misma fecha corregida.
function formatAntiguedad(dato) {
  try {
    var fecha = getFechaAntiguedad(dato);
    if (!fecha) return '';
    var diffMs = Date.now() - fecha.getTime();
    if (diffMs < 0) return '';
    var dias = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (dias < 1) return 'Publicado hoy';
    if (dias === 1) return 'Publicado hace 1 día';
    if (dias < 30) return 'Publicado hace ' + dias + ' días';
    var meses = Math.floor(dias / 30);
    if (meses < 12) return 'Publicado hace ' + meses + (meses === 1 ? ' mes' : ' meses');
    var anios = Math.floor(dias / 365);
    return 'Publicado hace ' + anios + (anios === 1 ? ' año' : ' años');
  } catch (e) { console.log('formatAntiguedad error', e); return ''; }
}

// Precio compacto para el encabezado del popup: 300000 -> "$300K", 1250000 -> "$1.25M"
function formatCompactPrice(precio) {
  var n = Number(precio) || 0;
  if (n >= 1000000) {
    var m = n / 1000000;
    var mRound = Math.round(m * 100) / 100;
    return '$' + (mRound % 1 === 0 ? mRound : mRound.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')) + 'M';
  }
  if (n >= 1000) {
    var k = n / 1000;
    var kRound = Math.round(k * 10) / 10;
    return '$' + (kRound % 1 === 0 ? kRound : kRound.toFixed(1)) + 'K';
  }
  return '$' + n;
}

// Emoji según el tipo de inmueble (tipoInmueble). Si no hay match, usa 🏠 genérico.
var TIPO_INMUEBLE_EMOJI = {
  'casa': '🏡',
  'departamento': '🏢',
  'terreno': '🌳',
  'oficina': '💼',
  'local comercial': '🏬',
  'local': '🏬',
  'edificio': '🏛️',
  'quinta': '🏞️',
  'ph': '🏘️',
  'galpon': '🏭',
  'galpón': '🏭'
};
function getTipoEmoji(tipo) {
  if (!tipo) return '🏠';
  var key = String(tipo).trim().toLowerCase();
  return TIPO_INMUEBLE_EMOJI[key] || '🏠';
}

// Tema Tippy.js reutilizado del formulario de búsqueda (fndInm.js define el
// mismo nombre de tema como 'fndinm'). Se inyecta el CSS acá también por si
// esta página no monta el formulario de búsqueda y por lo tanto ese estilo
// nunca se agrega al <head>.
var MAPA_TIPPY_THEME = 'fndinm';
function ensureTippyTheme() {
  if (document.getElementById('mapa-tippy-theme-style')) return;
  var css =
    '.tippy-box[data-theme~="' + MAPA_TIPPY_THEME + '"]{background-color:#25282c;color:#fff;' +
    'font-size:.72rem;line-height:1.35;border-radius:6px;' +
    'box-shadow:0 2px 8px rgba(0,0,0,.25);}' +
    '.tippy-box[data-theme~="' + MAPA_TIPPY_THEME + '"] .tippy-content{padding:6px 9px;}' +
    '.tippy-box[data-theme~="' + MAPA_TIPPY_THEME + '"] .tippy-arrow{color:#25282c;}';
  var style = document.createElement('style');
  style.id = 'mapa-tippy-theme-style';
  style.textContent = css;
  document.head.appendChild(style);
}

// Inicializa (o reinicializa) los tooltips de Tippy dentro de un elemento del DOM.
// Se usa en el popupopen del marker, ya que el contenido se genera dinámicamente
// y hay que aplicar tippy() recién cuando el popup ya está insertado en el DOM.
function initPopupTooltips(rootEl) {
  if (!rootEl) return;
  var allTargets = rootEl.querySelectorAll('[data-tippy-content]');
  if (!allTargets.length) return;
  // El popup se crea una sola vez (bindPopup) pero "popupopen" dispara en
  // cada apertura; sin este filtro, tippy() se acumularía en instancias
  // duplicadas sobre los mismos elementos cada vez que se reabre el popup.
  var targets = Array.prototype.filter.call(allTargets, function (el) { return !el._tippy; });
  if (!targets.length) return;
  if (window.tippy) {
    ensureTippyTheme();
    window.tippy(targets, {
      theme: MAPA_TIPPY_THEME,
      placement: 'top',
      maxWidth: 220,
      delay: [150, 0],
      touch: true,
      appendTo: function () { return document.body; }
    });
  } else {
    targets.forEach(function (el) {
      el.title = el.getAttribute('data-tippy-content');
    });
  }
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


  if (url.includes("houstyle")) {return 'houstyle';}

  // --------------------------------------------------------------------------------------------------- Marcas pequeñas
  if ( /el-?faro/i.test(url) || agentPhone.replace(/\D/g,'').includes("71035001") || agentName.includes("el faro")
     ) {return 'elfaro';}

  // ---------------------------------------------------------------------------------------------------- Marcas grandes
  else if (url.includes("c21.com") || url.includes("century21"))               {return 'C21';}
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
  else if (url.includes("kw.com") || url.includes("kwbolivia.com")) {return 'kw';}

  else {return 'statetty';}
}

/**
 * Lista de inmuebles visibles para búsquedas, selección masiva y generación de
 * PDFs. Sin filtro de agencias: se usa todo lo que manda el servidor.
 * @returns {Array}
 */
function getVisibleLocations() {
  return locations;
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
    // general de tooltips del toolbox (ver $(document).ready), así que
    // hay que engancharles Tippy acá, recién insertados en el DOM.
    initPopupTooltips(document.getElementById('stats-actions'));
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
    $("#toolbox .section:nth-child(2) .section-body").html(`
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
  }
}

/** Quita lo que dibujó la llamada anterior a renderMap (pines, círculo y cruz). */
function limpiarRenderPrevio() {
  markers.forEach(function (obj) {
    if (obj.marker && map.hasLayer(obj.marker)) map.removeLayer(obj.marker);
    if (obj.overlay && map.hasLayer(obj.overlay)) map.removeLayer(obj.overlay);
    if (obj.nuevoOverlay && map.hasLayer(obj.nuevoOverlay)) map.removeLayer(obj.nuevoOverlay);
  });
  markers = [];
  [circuloBusqueda, cruzCentro].forEach(function (c) {
    if (c && map.hasLayer(c)) map.removeLayer(c);
  });
  circuloBusqueda = null;
  cruzCentro = null;
  seleccionados = [];
}

function initEmptyMap() {
  // Re-carga dinámica (window.recargarMapa): si había un render anterior, sus pines
  // no deben quedar detrás del mapa vacío. En la carga inicial `map` es null y no hace nada.
  if (map) limpiarRenderPrevio();
  if (!map) {
    map = window.map || L.map('mapid').setView([-17.7833, -63.1821], 12);
    window.map = map;
  }
  addBaseLayers();

  $('#toolbox').show();

  setTimeout(function () {
    var fndInmHeader = document.querySelector('#stt-fndinm-slot .section-header');
    if (fndInmHeader) fndInmHeader.click();
  }, 300);
}

function mostrarAvisoSinSesion() {
  if (document.getElementById('modal-sinsesion-overlay')) return; // evitar duplicados

  var overlay = document.createElement('div');
  overlay.id = 'modal-sinsesion-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99999;display:flex;justify-content:center;align-items:center;';

  var box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:12px;padding:32px;max-width:420px;margin:20px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3);font-family:sans-serif;';

  box.innerHTML =
    '<div style="font-size:48px;margin-bottom:12px;">⚠️</div>' +
    '<p style="font-size:18px;color:#333;margin:0 0 16px;line-height:1.5;">' +
    'Debes entrar en tu cuenta de Telegram y ejecutar una nueva búsqueda, u obtener un nuevo link de sesión de usuario.' +
    '</p>' +
    '<a id="modal-sinsesion-link" href="https://t.me/statettybot" target="_blank" rel="noopener" ' +
    'style="display:inline-block;background:#2563eb;color:#fff;border-radius:8px;padding:10px 24px;font-size:16px;text-decoration:none;">' +
    'Ir a @statettybot' +
    '</a>';

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.remove();
  });
}

function mostrarAvisoLogin() {
  // Sin sesión Buddy: se abre el globo de login por correo para generar el magic link.
  if (window.STT && typeof window.STT.startLogin === 'function') {
    try { window.STT.startLogin(); } catch (e) { console.warn('[mostrarAvisoLogin]', e); }
    return;
  }
  mostrarAvisoSinSesion();
}

// Usuario autenticado pero con cutoffDate vencido (`usuario.hasTime === false`).
// Se avisa y se detiene la carga de resultados: sin tiempo de uso no hay mapa.
// Único botón "Planes" → abre la sección de planes en una pestaña nueva.
function mostrarAvisoSinTiempo(usuario) {
  var nombre = (usuario && (usuario.first_name || usuario.buddyName)) || '';
  var texto = 'Hola ' + nombre + ', no tienes tiempo de uso disponible, por favor, compra más tiempo';
  if (window.Buddy && window.Buddy.ui && typeof window.Buddy.ui.box === 'function') {
    window.Buddy.ui.box({
      title: nombre || 'Statetty',
      message: texto,
      submitText: 'Planes',
      cancelText: 'Cerrar',
      onSubmit: function () { window.open('https://statetty.com/#planes', '_blank', 'noopener'); }
    });
    // uiBox siempre pinta un botón secundario (cancelar): acá solo queremos "Planes".
    var ov = document.querySelector('.buddy-ui-overlay');
    var btnCancel = ov && ov.querySelector('.buddy-ui-box__btn--secondary');
    if (btnCancel) btnCancel.style.display = 'none';
    return;
  }
  console.log('[WebScrap] [log] mostrarAvisoSinTiempo: ' + texto);
  alert(texto + ' — https://statetty.com/#planes');
}

$(document).ready(function () {
  // Tooltips del toolbox "📊 Estadísticas & 🔍 Buscar": a diferencia de los
  // popups de los markers (que se regeneran cada apertura), estos elementos
  // ya existen en el DOM al cargar la página, así que se inicializan una
  // sola vez acá.
  initPopupTooltips(document.getElementById('toolbox'));

  $('#toolbox-btn').on('click', function () {
    $('#toolbox').toggle();
  });
  $(document).on('click', function (e) {
    if ($('#toolbox').is(':visible') && !$(e.target).closest('#toolbox, #toolbox-btn').length) {
      $('#toolbox').hide();
    }
  });

  // accordion del toolbox: se registra a nivel de document.ready (NO dentro de
  // renderMap) para que funcione incluso cuando no hay búsqueda activa y se
  // muestra el mapa vacío con initEmptyMap().
  function actualizarBotonesCollapse() {
    $('.section-header').each(function () {
      var $header = $(this);
      var $section = $header.parent();
      var $button = $header.find('.section-collapse');

      if (!$button.length) {
        $header.css({
          display: 'flex',
          alignItems: 'center'
        });
        $button = $('<button type="button" class="section-collapse" aria-label="Minimizar sección" title="Minimizar">×</button>')
          .css({
            display: 'none',
            marginLeft: 'auto',
            border: '0',
            background: 'transparent',
            fontSize: '18px',
            lineHeight: '1',
            cursor: 'pointer',
            padding: '2px 5px',
            color: '#777',
            flexShrink: '0'
          });
        $header.append($button);
      }

      $button.css('display', $section.hasClass('active') ? 'block' : 'none');
    });
  }

  actualizarBotonesCollapse();

  $(document).on('click', '.section-header', function (e) {
    if ($(e.target).closest('.section-collapse').length) return;

    var $section = $(this).parent();
    var yaActiva = $section.hasClass('active');
    $('.section').removeClass('active');

    if (!yaActiva) {
      $section.addClass('active');
    }

    actualizarBotonesCollapse();
  });

  $(document).on('click', '.section-collapse', function (e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).closest('.section').removeClass('active');
    actualizarBotonesCollapse();
  });

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
      iconUrl: '../../assets/images/cross_green.png',
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
        iconUrl: '../../assets/images/pointers/pointer_' + brand + '.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [40, 60], iconAnchor: [20, 60], popupAnchor: [1, -54], shadowSize: [60, 60]
      });

      var marker = L.marker([dato.lat, dato.lng], { icon }); marker.addTo(map);

      // Si el inmueble es "nuevo" (createdAt <= 1 semana), se agrega la capa
      // pointer_nuevo.png justo encima del pointer, en las mismas coordenadas.
      // Se crea con interactive:false para no bloquear el click/popup del marker principal,
      // y se agrega/quita al mapa siguiendo la misma visibilidad que el marker (según brand/agencia).
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

      const msj = `Hola${nombreCortito},${soyNa}${deAg}${sc}un gusto saludarte. Por favor, podría enviarme información sobre este inmueble, en caso de que siga disponible (${dato.Titulo})\n\nGracias de antemano\n\nlink: ${url}\n\n${foto}Mensaje creado con Statetty https://statetty.com`;

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
      // Cada ítem se muestra solo si el dato viene con valor, para no romper
      // con registros que no traen alguno de estos campos.
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

  var urlParams = new URLSearchParams(window.location.search);
  let pProm = Math.round(urlParams.get('p'));
  // En global: initCajaFind (otro IIFE) lo reescribe tras una búsqueda por texto y
  // el popup de arriba lo lee para armar usrClckWsInm?u=.
  window.__mapUserid = urlParams.get('u');
  window.M2T = urlParams.get('M2T');
  window.M2T = normalizarM2TDesdeURI();

  function waitForKey() {
    if (window.publicKey !== undefined) return;
    if (window.STT && window.STT.ready) return window.STT.ready;
    // Respaldo por si user.js aún no se ha cargado
    return new Promise(function(r) {
      document.addEventListener('statetty:key-ready', function(){ r(); }, {once: true});
    });
  }

  function autoSelectSlot(searchParams) {
    var select = document.getElementById('fndInm-slots-select');
    if (!select || !searchParams) return;

    var best = null, bestScore = -1;
    for (var i = 1; i < select.options.length; i++) {
      var opt = select.options[i];
      if (!opt.value) continue;
      var slot;
      try { slot = JSON.parse(opt.value); } catch (e) { continue; }
      if (!slot || typeof slot !== 'object') continue;

      var score = 0;
      if (searchParams.nombre && slot.nombre && String(searchParams.nombre).trim().toLowerCase() === String(slot.nombre).trim().toLowerCase()) score += 6;
      if (searchParams.lat !== undefined && slot.lat !== undefined && Math.abs(Number(searchParams.lat) - Number(slot.lat)) <= 0.001) score += 3;
      if (searchParams.lng !== undefined && slot.lng !== undefined && Math.abs(Number(searchParams.lng) - Number(slot.lng)) <= 0.001) score += 3;
      if (String(searchParams.dist) === String(slot.dist)) score += 2;
      if (String(searchParams.pMin) === String(slot.pMin)) score += 1;
      if (String(searchParams.pMax) === String(slot.pMax)) score += 1;
      if (String(searchParams.antiguedad) === String(slot.antiguedad)) score += 1;

      if (score > bestScore) { bestScore = score; best = opt; }
    }

    if (best && bestScore >= 6) {
      best.selected = true;
      best.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  async function init() {
    $('#loading-indicator').show();
    // Re-carga dinámica tras una búsqueda de la toolbox: lo que una recarga de la
    // página habría vaciado (filtro de texto y estado de la #caja) se vacía acá.
    // En la carga inicial no cambia nada: ambos arrancan vacíos.
    $('#search-input').val('');
    $('#search-count').hide();
    $('#estado').text('');

    await waitForKey();
    var usuario = window.STT && window.STT.getUsuario ? window.STT.getUsuario() : null;

    // Autenticación Buddy: se prioriza la sesión (JWT). El link legacy ?k= está en
    // deshuso y ya NO se interpreta para entrar: un usuario con sesión entra con su
    // cuenta; un usuario sin sesión ve el globo de login por correo (magic link).
    var isBuddyAuth = !!(window.STT && typeof window.STT.getToken === 'function' && window.STT.getToken());

    if (!isBuddyAuth) {
      $('#loading-indicator').hide();
      // Se espera a que la página termine de cargar antes de pedir el correo, para
      // no abrir la caja encima del mapa todavía en painted/loading.
      if (document.readyState === 'complete') mostrarAvisoLogin();
      else window.addEventListener('load', mostrarAvisoLogin, { once: true });
      return;
    }

    // Autenticado pero sin tiempo de uso (cutoffDate vencido): no se buscan resultados.
    if (usuario && usuario._id && !usuario.hasTime) {
      $('#loading-indicator').hide();
      mostrarAvisoSinTiempo(usuario);
      return;
    }

    var response = await fetchBuscarMapa(window.STT.getToken());

    // `sin_sesion` (token vencido) y `sin_busqueda` (nunca buscó) caen al mapa vacío,
    // igual que antes con finderresult.
    if (!response || !response.ok || !Array.isArray(response.resultados)) {
      $('#loading-indicator').hide();
      initEmptyMap();
      return;
    }

    var locs = [];
    if (response.resultados.length > 0) {
      var parsed = parseBuscarMapa(response);
      locs = parsed.locations;
      locs.forEach(function(loc) {
        loc.uid = normalizeURL(loc.URL);
        loc.brand = getBrand({ dato: loc });
        // Respaldo: si parseBuscarMapa no propagó createdAt, se busca en el registro
        // crudo de response.resultados (por _id) para no perder el dato de antigüedad.
        if (loc.createdAt === undefined && loc._id) {
          var raw = response.resultados.find(function (r) { return r._id === loc._id; });
          if (raw) loc.createdAt = raw.createdAt;
        }
      });
    }

    // `filtros` era `info` en finderresult: lat/lng/dist, precioProm, promM2T, userID…
    var info = response.filtros || {};
    window.ACM_INFO = info;
    try { autoSelectSlot(info); } catch (e) { console.warn('[autoSelectSlot]', e); }

    var lat = parseFloat(info.lat) || (locs.length ? null : parseFloat(urlParams.get('lat')));
    var lng = parseFloat(info.lng) || (locs.length ? null : parseFloat(urlParams.get('lng')));
    var radius;
    if (info.dist !== undefined) radius = info.dist * 1000;
    else if (urlParams.get('r')) radius = parseFloat(urlParams.get('r'));
    else if (locs.length) radius = null;

    if ((!lat || !lng) && locs.length) {
      var latSum = 0, lngSum = 0;
      locs.forEach(function(loc) { latSum += loc.lat; lngSum += loc.lng; });
      lat = latSum / locs.length;
      lng = lngSum / locs.length;
    }
    if (!radius && locs.length) {
      var maxDistance = 0;
      locs.forEach(function(loc) {
        var d = calculateDH(lat, lng, loc.lat, loc.lng);
        if (d > maxDistance) maxDistance = d;
      });
      radius = maxDistance * 1000;
    }

    if (!lat || !lng || !radius) {
      $('#loading-indicator').hide();
      // Re-carga dinámica: saca los pines de la búsqueda anterior antes del aviso
      // (con recarga habrían desaparecido). En la carga inicial no hay render previo.
      if (map) limpiarRenderPrevio();
      mostrarAvisoSinResultados();
      return;
    }

    var pProm = Math.round(info.precioProm) || (locs.length ? Math.round(urlParams.get('p')) : 0) || 0;
    if (isNaN(pProm) || pProm == 0) pProm = locs.length ? calcularPromedio(locs, 'precio') : 0;

    if (info.userID) window.__mapUserid = info.userID;

    var na = usuario ? ((usuario.first_name || '') + ' ' + (usuario.last_name || '')).trim() : '';
    var ag = usuario ? (usuario.agencia || '') : '';

    $('#loading-indicator').hide();
    renderMap(locs, lat, lng, radius, pProm, na, ag);
    // Re-carga dinámica: limpia la URL como haría navegar a /maps/find (sin
    // ?lat=&r=&u=). Solo en re-carga: en la carga inicial esos params son la
    // entrada desde el bot de Telegram y se respetan.
    if (window.__mapaCargado) history.replaceState(null, '', window.location.pathname);
    window.__mapaCargado = true;
    $('#loading-indicator').hide();
  }

  // Hook para fndInm.js: repinta el mapa con los resultados nuevos de una búsqueda
  // de la toolbox sin recargar la página (en otras páginas no existe este hook y
  // fndInm.js sigue navegando a /maps/find).
  window.recargarMapa = init;

  init().catch(function(e) {
    console.error('Error al cargar datos del mapa', e);
    $('#loading-indicator').hide();
    var isBuddyAuth = !!(window.STT && typeof window.STT.getToken === 'function' && window.STT.getToken());
    if (isBuddyAuth) initEmptyMap();
    else mostrarAvisoLogin();
  });

  // Si la sesión Buddy se recuperó de forma tardía (refresh de tokens tras una
  // carga fresca, o login por magic link) después de que el mapa ya se decidió
  // a mostrar el globo de login, reintentamos init() para entrar con la cuenta.
  window.addEventListener('statetty:auth-ready', function (e) {
    var d = e && e.detail ? e.detail : {};
    var hasToken = window.STT && typeof window.STT.getToken === 'function' && !!window.STT.getToken();
    if (hasToken && d.token && !window.__mapaCargado) {
      init().catch(function (err) {
        console.error('Error al reintentar cargar el mapa', err);
      });
    }
  });

  // búsqueda
  $('#search-input').on('input', function () {
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
// -------------------------------
// Caja #caja (estilo mapaSimple) en maps/find
// Mismo comportamiento que la de /: apretar y arrastrar para dibujar, figures
// apiladas con deshacer, y búsqueda por POST a statetty/buscarMapa. Lo que cambia
// es el destino: acá los resultados se pintan con el renderMap de la página
// (y la caja vive siempre abajo, anclada por CSS, sin centrarse).
// (pines por agencia, popups, selección, PDF) y no con el pintar() de mapaSimple.
// -------------------------------
(function initCajaFind() {
  if (window.__cajaFindInit) return;
  const caja = document.getElementById('caja');
  if (!caja) return;
  window.__cajaFindInit = true;

  const form    = document.getElementById('form-buscar');
  const input   = document.getElementById('texto');
  const btnLapiz   = document.getElementById('btn-lapiz');
  const btnPin     = document.getElementById('btn-pin');
  const btnDeshacer = document.getElementById('btn-deshacer');
  const boton      = document.getElementById('btn-buscar');
  const estado     = document.getElementById('estado');

  function sesionActiva() {
    const token = window.STT && window.STT.getToken ? window.STT.getToken() : '';
    const u = window.STT && window.STT.getUsuario ? window.STT.getUsuario() : null;
    return !!(token && u && u.hasTime);
  }
  function aplicarGate() { caja.style.display = sesionActiva() ? '' : 'none'; }
  aplicarGate();
  if (window.STT && window.STT.ready && typeof window.STT.ready.then === 'function') {
    window.STT.ready.then(aplicarGate);
  } else {
    document.addEventListener('statetty:key-ready', aplicarGate, { once: true });
  }
  document.addEventListener('statetty:auth-ready', aplicarGate);

  let mapa = null;            // lo publica renderMap/initEmptyMap; esta caja no lo crea
  let contenedor = null;
  let figuras = [];          // pila: la más antigua primero, la más nueva al final
  let herramienta = null;    // 'poligono' | 'circunferencia' | null
  let trazo = null;          // figura en curso mientras el puntero está presionado

  // Máximo de figuras por tipo (cada una es independiente y se envía en su arreglo).
  // Mientras no se llegue al máximo, la herramienta activa sigue dibujando figuras
  // nuevas; al alcanzarlo se apaga y su botón se deshabilita hasta borrar alguna.
  const LIMITE = { poligono: 10, circunferencia: 10 };
  const RADIO_MIN = 20;        // metros; un círculo menor se descarta
  const PUNTOS_MIN = 3;
  const PUNTOS_MAX = 2000;     // tope de vértices por polígono enviado
  const TOLERANCIA_PX = 1.5;   // Douglas-Peucker: puntos que se desvían menos se eliminan
  const HANDLERS = ['dragging', 'touchZoom', 'doubleClickZoom', 'boxZoom'];

  function avisar(txt, esError) {
    if (!estado) return;
    estado.textContent = txt || '';
    estado.className = esError ? 'error' : '';
  }

  function refrescarBotones() {
    if (btnLapiz) btnLapiz.disabled = contar('poligono') >= LIMITE.poligono;
    if (btnPin) btnPin.disabled = contar('circunferencia') >= LIMITE.circunferencia;
    if (btnDeshacer) btnDeshacer.disabled = !figuras.length;
    if (btnLapiz) btnLapiz.setAttribute('aria-pressed', herramienta === 'poligono' ? 'true' : 'false');
    if (btnPin) btnPin.setAttribute('aria-pressed', herramienta === 'circunferencia' ? 'true' : 'false');
    if (herramienta && contar(herramienta) >= LIMITE[herramienta]) activar(null);
  }

  function activar(tipo) {
    if (tipo && contar(tipo) >= LIMITE[tipo]) return;
    herramienta = tipo;
    refrescarBotones();
    if (contenedor) contenedor.classList.toggle('dibujando', !!tipo);
    if (mapa) HANDLERS.forEach(function (h) { mapa[h][tipo ? 'disable' : 'enable'](); });
    if (tipo === 'poligono') avisar('Mantén presionado y arrastra para dibujar el área.', false);
    else if (tipo === 'circunferencia') avisar('Presiona el centro y arrastra para definir el radio.', false);
  }

  function conectarMapa(m) {
    mapa = m;
    contenedor = m.getContainer ? m.getContainer() : document.getElementById('mapid');
    if (contenedor) {
      // Captura: se atiende antes que Leaflet para que no arrastre el mapa ni abra popups.
      contenedor.addEventListener('pointerdown', iniciarTrazo, true);
      contenedor.addEventListener('pointermove', moverTrazo);
      contenedor.addEventListener('pointerup', function (e) { terminarTrazo(e, true); });
      contenedor.addEventListener('pointercancel', function (e) { terminarTrazo(e, false); });
    }
    // La herramienta pudo activarse antes de que existiera el mapa.
    if (herramienta) HANDLERS.forEach(function (h) { mapa[h].disable(); });
  }

  // ---------- Figuras de área (polígono / circunferencia) ----------
  function contar(tipo) { return figuras.filter(function (f) { return f.tipo === tipo; }).length; }
  function redondear(n, d) { return Number(n.toFixed(d)); }

  // Deja el mínimo de vértices que conserva la forma dibujada; si aun así
  // pasan de PUNTOS_MAX, los reparte equitativamente a lo largo del contorno.
  function simplificar(pts) {
    const n = pts.length, z = mapa.getZoom();
    if (n <= PUNTOS_MIN) return pts;
    const P = pts.map(function (p) { return mapa.project(p, z); });
    const keep = new Uint8Array(n);
    keep[0] = keep[n - 1] = 1;
    const pila = [[0, n - 1]];
    while (pila.length) {
      const seg = pila.pop(), a = seg[0], b = seg[1];
      let maxd = 0, idx = -1;
      for (let i = a + 1; i < b; i++) {
        const d = L.LineUtil.pointToSegmentDistance(P[i], P[a], P[b]);
        if (d > maxd) { maxd = d; idx = i; }
      }
      if (idx > -1 && maxd > TOLERANCIA_PX) {
        keep[idx] = 1;
        pila.push([a, idx], [idx, b]);
      }
    }
    const res = pts.filter(function (_, i) { return keep[i]; });
    if (res.length > PUNTOS_MAX) {
      const m = res.length, out = [];
      for (let k = 0; k < PUNTOS_MAX; k++) out.push(res[Math.round(k * (m - 1) / (PUNTOS_MAX - 1))]);
      return out;
    }
    return res;
  }

  function iniciarTrazo(e) {
    if (!herramienta || trazo || !mapa || e.button !== 0) return;
    if (e.target.closest && e.target.closest('.leaflet-control')) return;
    e.preventDefault();
    e.stopPropagation();
    contenedor.setPointerCapture(e.pointerId);
    const ll = mapa.mouseEventToLatLng(e);
    trazo = { id: e.pointerId, tipo: herramienta };
    // Limpiar círculo vestigio de búsqueda al empezar a dibujar
    if (typeof circuloBusqueda !== 'undefined' && circuloBusqueda && map.hasLayer(circuloBusqueda)) {
      map.removeLayer(circuloBusqueda);
      circuloBusqueda = null;
    }
    if (herramienta === 'poligono') {
      trazo.pts = [ll];
      trazo.capa = L.polyline([ll], { color: ESTILO_AREA.color, weight: 2, interactive: false }).addTo(mapa);
    } else {
      trazo.centro = ll;
      trazo.circulo = L.circle(ll, L.extend({ radius: 1, interactive: false }, ESTILO_AREA));
      const centro = L.circleMarker(ll, {
        radius: 4, color: '#04364a', weight: 2, fillColor: '#ffd54a', fillOpacity: 1, interactive: false
      });
      trazo.capa = L.featureGroup([trazo.circulo, centro]).addTo(mapa);
    }
  }

  function moverTrazo(e) {
    if (!trazo || !mapa || e.pointerId !== trazo.id) return;
    const ll = mapa.mouseEventToLatLng(e);
    if (trazo.tipo === 'poligono') {
      const ult = mapa.latLngToContainerPoint(trazo.pts[trazo.pts.length - 1]);
      if (ult.distanceTo(mapa.latLngToContainerPoint(ll)) < 3) return;   // filtra ruido
      trazo.pts.push(ll);
      trazo.capa.setLatLngs(trazo.pts);
    } else {
      trazo.circulo.setRadius(trazo.centro.distanceTo(ll));
    }
  }

  function terminarTrazo(e, ok) {
    if (!trazo || !mapa || e.pointerId !== trazo.id) return;
    const t = trazo;
    trazo = null;
    if (contenedor.hasPointerCapture(e.pointerId)) contenedor.releasePointerCapture(e.pointerId);
    let figura = null;
    const pts = (ok && t.tipo === 'poligono') ? simplificar(t.pts) : null;
    if (pts && pts.length >= PUNTOS_MIN) {
      mapa.removeLayer(t.capa);
      // L.polygon cierra el trazo solo: rellena la superficie completa.
      figura = {
        tipo: 'poligono',
        capa: L.polygon(pts, ESTILO_AREA).addTo(mapa),
        datos: { puntos: pts.map(function (p) { return { lat: redondear(p.lat, 6), lng: redondear(p.lng, 6) }; }) }
      };
    } else if (ok && t.tipo === 'circunferencia' && t.circulo.getRadius() >= RADIO_MIN) {
      figura = {
        tipo: 'circunferencia',
        capa: t.capa,
        datos: { lat: redondear(t.centro.lat, 6), lng: redondear(t.centro.lng, 6), radio: Math.round(t.circulo.getRadius()) }
      };
    }
    if (!figura) {
      mapa.removeLayer(t.capa);
      if (ok) avisar('El trazo fue muy corto. Intenta de nuevo.', true);
      return;
    }
    figuras.push(figura);
    // Limpiar círculo vestigio de búsqueda al guardar figura dibujada
    if (typeof circuloBusqueda !== 'undefined' && circuloBusqueda && map.hasLayer(circuloBusqueda)) {
      map.removeLayer(circuloBusqueda);
      circuloBusqueda = null;
    }
    avisar('', false);
    refrescarBotones();
  }

  function datosDe(tipo) {
    return figuras.filter(function (f) { return f.tipo === tipo; }).map(function (f) { return f.datos; });
  }

  // Figuras vivas para el resto de la página: el form #fndInm del toolbox las adjunta a
  // su POST para que la superficie dibujada mande SIEMPRE sobre lat/lng/dist, no solo en
  // la búsqueda de la #caja (plan figuras-sobrescriben-geografia, D2/D3).
  window.STT_MAP_FIGURAS = function () {
    return { poligono: datosDe('poligono'), circunferencia: datosDe('circunferencia') };
  };

  if (btnLapiz) btnLapiz.addEventListener('click', function () {
    // Limpiar círculo vestigio al activar dibujo
    if (typeof circuloBusqueda !== 'undefined' && circuloBusqueda && mapa && mapa.hasLayer(circuloBusqueda)) {
      mapa.removeLayer(circuloBusqueda);
      circuloBusqueda = null;
    }
    activar(herramienta === 'poligono' ? null : 'poligono');
  });
  if (btnPin) btnPin.addEventListener('click', function () {
    // Limpiar círculo vestigio al activar dibujo
    if (typeof circuloBusqueda !== 'undefined' && circuloBusqueda && mapa && mapa.hasLayer(circuloBusqueda)) {
      mapa.removeLayer(circuloBusqueda);
      circuloBusqueda = null;
    }
    activar(herramienta === 'circunferencia' ? null : 'circunferencia');
  });
  if (btnDeshacer) btnDeshacer.addEventListener('click', function () {
    const f = figuras.pop();
    if (!f) return;
    if (mapa) mapa.removeLayer(f.capa);
    refrescarBotones();
    avisar('', false);
  });

  // ---------- Búsqueda ----------
  // buscarMapa devuelve el shape público del inmueble (_id, nombre, precio, lat, lng,
  // url, …), no el documento completo de la búsqueda guardada (modo `ultima`).
  // apiItemToLocation (datos.js) hace la conversión y de ahí se alimenta el mismo
  // renderMap que usa el resto de la página.
  function aLocations(resultados) {
    return (resultados || []).map(function (it) {
      const loc = apiItemToLocation(it);
      loc.Titulo = loc.Titulo || loc.Nombre || '';
      loc.URL = loc.URL || it.url || '';        // buscarMapa manda 'url' en minúscula
      loc.uid = normalizeURL(loc.URL);
      loc.brand = getBrand({ dato: loc });
      return loc;
    }).filter(function (l) { return isFinite(l.lat) && isFinite(l.lng); });
  }

  function pintar(resultados) {
    if (typeof window.renderMap !== 'function') return false;
    const locs = aLocations(resultados);
    if (!locs.length) return false;
    const lat = locs.reduce(function (s, l) { return s + l.lat; }, 0) / locs.length;
    const lng = locs.reduce(function (s, l) { return s + l.lng; }, 0) / locs.length;
    let maxKm = 0;
    locs.forEach(function (l) { maxKm = Math.max(maxKm, calculateDH(lat, lng, l.lat, l.lng)); });
    const u = (window.STT && window.STT.getUsuario && window.STT.getUsuario()) || {};
    const na = ((u.first_name || '') + ' ' + (u.last_name || '')).trim();
    // El popup calcula el % contra el promedio: con 0 daría Infinity.
    const prom = Math.max(1, calcularPromedio(locs, 'precio'));
    window.renderMap(locs, lat, lng, Math.max(maxKm * 1000, 1), prom, na, u.agencia || '');
    return true;
  }

  function buscar() {
    if (!sesionActiva()) {
      avisar('Tu cuenta no está activa o no tiene tiempo de uso disponible.', true);
      return;
    }
    const texto = input ? input.value.trim() : '';
    if (!texto && !figuras.length) {
      avisar('escribe algo o dibuja una superficie para buscar', true);
      return;
    }
    // Con figuras dibujadas (btn-lapiz / btn-pin) el área la definen ellas: la
    // circunferencia de la búsqueda anterior ya no representa el filtro y se borra
    // al iniciar (si la búsqueda falla, no debe quedar en pantalla — D2 del plan).
    if (figuras.length && typeof circuloBusqueda !== 'undefined' && circuloBusqueda) {
      if (map && map.hasLayer(circuloBusqueda)) map.removeLayer(circuloBusqueda);
      circuloBusqueda = null;
    }
    if (boton) boton.disabled = true;
    avisar('Buscando...', false);
    const base = (window.STATETTY_CONFIG && STATETTY_CONFIG.WS_API_BASE) || '';
    const token = window.STT && window.STT.getToken ? window.STT.getToken() : '';
    fetch(base + 'statetty/buscarMapa', {
      method: 'POST',
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        token ? { 'Authorization': 'Bearer ' + token } : {}
      ),
      body: JSON.stringify({
        texto: texto,
        poligono: datosDe('poligono'),              // [{ puntos: [{lat, lng}, ...] }]
        circunferencia: datosDe('circunferencia'),  // [{ lat, lng, radio }] radio en metros
      }),
    }).then(function (r) {
      return r.json().then(function (d) { return { status: r.status, data: d }; });
    }).then(function (res) {
      if (res.status === 429) { avisar('Hiciste demasiadas búsquedas. Esperá un minuto e intentá de nuevo.', true); return; }
      if (res.status !== 200 || !res.data || !res.data.ok) {
        avisar('No se pudo interpretar la búsqueda. Probá con otra frase.', true);
        return;
      }
      // El popup arma usrClckWsInm?u= con el id del usuario; si la página arrancó
      // vacía, acá es la única chance de tenerlo.
      if (res.data.filtros && res.data.filtros.userID) window.__mapUserid = res.data.filtros.userID;
      const pintados = pintar(res.data.resultados);
      const tot = res.data.total || (res.data.resultados ? res.data.resultados.length : 0);
      if (!tot) { avisar('Sin resultados. Probá con menos filtros u otra zona.', true); return; }
      // El formulario "Buscar Inmuebles" del toolbox (#fndInm-section) pasa a
      // reflejar la búsqueda recién hecha: se vacía y se le escriben los filtros
      // del resultado, para que el usuario pueda ajustarlos y re-buscar desde ahí.
      // aplicarResultado() decide: sin filtros (búsqueda solo con figuras) no
      // toca nada, y sin form montado (sección asíncrona) devuelve 0.
      const filtros = res.data.filtros;
      // Con figuras dibujadas mandan ellas (D6): el form no debe quedar mostrando coords
      // o radio que la próxima búsqueda desde el form va a ignorar.
      if (filtros && figuras.length) { delete filtros.lat; delete filtros.lng; delete filtros.dist; }
      if (filtros && typeof window.STT_FND_INM === 'object' &&
          typeof window.STT_FND_INM.aplicarResultado === 'function') {
        window.STT_FND_INM.aplicarResultado(filtros);
      }
      if (!pintados) {
        avisar(tot + (tot === 1 ? ' inmueble encontrado' : ' inmuebles encontrados') + ', pero el mapa no pudo pintarlos.', true);
        return;
      }
      avisar(tot + (tot === 1 ? ' inmueble encontrado' : ' inmuebles encontrados'), false);
    }).catch(function () {
      avisar('Falló la búsqueda. Revisá tu conexión e intentá de nuevo.', true);
    }).then(function () {
      if (boton) boton.disabled = false;
    });
  }

  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); buscar(); });
  if (input) input.addEventListener('input', function () { if (estado && estado.className === 'error') avisar('', false); });

  // El mapa lo crea la página (renderMap/initEmptyMap), no esta caja: L.map() sobre
  // #mapid ya inicializado revienta y con eso caía toda la página. Se espera a que exista.
  function esperarMapa() {
    if (window.map) { conectarMapa(window.map); return; }
    let intentos = 0;
    const iv = setInterval(function () {
      intentos++;
      if (window.map) { clearInterval(iv); conectarMapa(window.map); }
      else if (intentos > 80) clearInterval(iv);   // 20 s: la búsqueda por texto igual funciona
    }, 250);
  }
  esperarMapa();
})();
