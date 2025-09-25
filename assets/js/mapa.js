// ---------------------------------------------
// mapa.js - Lógica completa del mapa y selección
// ---------------------------------------------

var map, locations = [], markers = [], seleccionados = [], ultimosFiltrados = [];

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

// -------------------------------
// Persistencia en localStorage
// -------------------------------
function guardarSeleccionados() {
  try {
    // Solo guardar los UID
    const ids = seleccionados.map(s => s.uid);

    // Intentar guardar todos
    localStorage.setItem("inmueblesSeleccionados", JSON.stringify(ids));
  } catch (e) {
    if (e.name === "QuotaExceededError" || e.code === 22) {
      console.warn("⚠️ QuotaExceededError: demasiados seleccionados, guardando solo los últimos 200");

      // Guardar solo los últimos N para no exceder la cuota
      const N = 200;
      const idsReducidos = seleccionados.slice(-N).map(s => s.uid);

      try {
        localStorage.setItem("inmueblesSeleccionados", JSON.stringify(idsReducidos));
      } catch (err2) {
        console.error("No se pudo guardar ni la versión reducida en localStorage", err2);
      }
    } else {
      console.error("Error inesperado al guardar seleccionados", e);
    }
  }
}


function cargarSeleccionados() {
  try {
    const data = JSON.parse(localStorage.getItem("inmueblesSeleccionados")) || [];
    return Array.isArray(data) ? data : [];
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
  return u.includes('http') ? u : `https://c21.com.bo${u}`;
}

//function formatNumber(num) { return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ",00";}

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
    // Aseguramos botones aunque lista esté vacía (para inicializar handlers)
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

  // Asegurar existencia de botones y sus handlers (idempotente)
  ensureStatsActions();

  // Ajustar habilitación / visibilidad según estado actual
  updateButtonsState();
}

/**
 * Asegura que exista #stats-actions y enlaza los handlers una sola vez.
 * Si el contenedor ya está en el HTML, no lo recrea; solo agrega handlers
 * la primera vez que se llama.
 * @returns {void}
 */
function ensureStatsActions() {
  // Si no existe el contenedor, lo creamos (por seguridad)
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

  // Evitar volver a atar handlers
  if (window.statsButtonsInit) return;
  window.statsButtonsInit = true;

  // --- handlers (usar .off para evitar duplicados si por alguna razón se vuelve a llamar) ---
  $('#btn-add-all').off('click').on('click', function () {
    locations.forEach(a => {
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
    (ultimosFiltrados || []).forEach(a => {
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
    (ultimosFiltrados || []).forEach(a => {
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

    // Protección: si no hay resultados filtrados, no hacemos nada
    if (keepUIDs.size === 0) return;

    // Eliminar seleccionados que no estén en keepUIDs
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
    locations.forEach(a => {
      if (excludeUIDs.has(a.uid)) return; // saltar los filtrados
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

/**
 * Actualiza enabled/disabled de los botones según el estado actual:
 * - habilita operaciones de 'agregar' cuando tiene sentido
 * - deshabilita operaciones 'quitar' si no hay selección
 * - deshabilita acciones ligadas al filtro si no hay resultados filtrados
 * @returns {void}
 */
function updateButtonsState() {
  // referencias
  const $addSel = $('#btn-add-sel'), $removeSel = $('#btn-remove-sel'),
        $keepOnly = $('#btn-keep-only'), $addAll = $('#btn-add-all'),
        $removeAll = $('#btn-remove-all'), $addAllExcept = $('#btn-add-all-except');

  // seguridad: si no existen los botones, nada que hacer
  if ($addSel.length === 0) return;

  const selCount = seleccionados.length;
  const filtCount = (ultimosFiltrados || []).length;
  const totalCount = (locations || []).length;

  // desactivar todo por defecto
  [$addSel,$removeSel,$keepOnly,$addAll,$removeAll,$addAllExcept].forEach($b => { if ($b.length) $b.prop('disabled', true); });

  // reglas:
  // - Si hay resultados filtrados: permitir agregar/quitar sobre esos filtrados (según exista selección)
  if (filtCount > 0) {
    if ($addSel.length) $addSel.prop('disabled', false);             // siempre se puede 'Agregar a selección' los filtrados
    if ($removeSel.length) $removeSel.prop('disabled', selCount === 0); // quitar filtrados solo si hay seleccionados
    if ($keepOnly.length) $keepOnly.prop('disabled', selCount === 0);   // mantener estos solo si hay seleccionados
    if ($addAllExcept.length) $addAllExcept.prop('disabled', false);   // agregar todos excepto filtrados (siempre permitido cuando hay filtros)
  }

  // - Agregar todos (si existen inmuebles en el mapa)
  if (totalCount > 0 && $addAll.length) $addAll.prop('disabled', false);

  // - Quitar todos (solo si hay elementos seleccionados)
  if (selCount > 0 && $removeAll.length) $removeAll.prop('disabled', false);

  // Nota: si quieres el comportamiento estricto que mencionaste
  // (cuando seleccionados === 0, SOLO habilitar 'Agregar a selección'),
  // activa la siguiente opción: (descomenta la línea siguiente)
  // if (selCount === 0) { [$addAll,$addAllExcept,$removeSel,$keepOnly,$removeAll].forEach($b => $b.prop('disabled', true)); }
}


function actualizarToolbox() {
  $("#sel-box").remove();

  // ✅ ordenar seleccionados por precio ascendente
  seleccionados.sort((a, b) => (parseFloat(a.precio) || 0) - (parseFloat(b.precio) || 0));

  let html = '';
  seleccionados.forEach((s, i) => {
    html += `<div>${i + 1}. ${s.Titulo} <span class="remove-sel" data-id="${s.uid}" style="cursor:pointer; color:red;">❌</span></div>`;
  });

  if (seleccionados.length > 0) {
    $("#agency-filter").parent().prev(".section-header"); // solo para mantener referencia

    // ✅ siempre apunta a la sección de seleccionados
    $("#toolbox .section:nth-child(2) .section-body").html(`
      <div id="sel-box">
        ✅ Seleccionados: ${seleccionados.length}
        ${html}
        <br>
        <button id="btn-pdf-landscape" ...>📄 PDF pantalla</button>
        <button id="btn-pdf-mobile" ...>📱 PDF móvil</button>
      </div>
    `);


    renderColumnSelector();

    $("#btn-pdf-landscape").off("click").on("click", function () {
      generarBrochurePDF(seleccionados, "landscape");
    });

    $("#btn-pdf-mobile").off("click").on("click", function () {
      generarBrochurePDF(seleccionados, "mobile");
    });
  } else {
    // Si no hay seleccionados, vaciar el bloque de seleccionados
    $(".section-body:has(#sel-box)").html("");
  }

  $(".remove-sel").off("click").on("click", function () {
    let id = $(this).data("id");
    seleccionados = seleccionados.filter(s => s.uid !== id);
    guardarSeleccionados();
    let obj = markers.find(m => m.dato.uid === id);
    if (obj && obj.overlay) { map.removeLayer(obj.overlay); obj.overlay = null; }
    $(`.chk-sel[data-id='${id}']`).prop("checked", false);
    actualizarToolbox();
  });

  if (typeof actualizarACM === "function") {actualizarACM();}
  //if (typeof restaurarEstadoACM === "function") {restaurarEstadoACM();}
}


function agenciasActivas() {
  const activas = [];
  $(".chk-agency").each(function () {
    if (this.checked) activas.push($(this).data("ag"));
  });
  return activas;
}

function getVisibleLocations() {
  const activas = agenciasActivas();
  return locations.filter(loc => {
    let url = loc.uid || "";
    let brand = "statetty";
    if (url.includes("c21.com")) brand = "C21";
    else if (url.includes("remax")) brand = "remax";
    else if (url.includes("bieninmuebles")) brand = "bieni";
    else if (url.includes("elfaro")) brand = "elfaro";
    else if (url.includes("dueodeinmueble")) brand = "IDI";
    else if (url.includes("ultracasas")) brand = "UC";
    else if (url.includes("uno.com")) brand = "uno";
    else if (url.includes("infocasas.com")) brand = "ic";
    else brand = "statetty";

    // statetty siempre visible
    if (brand === "statetty") return true;
    return activas.includes(brand);
  });
}


// -------------------------------
// Inicialización del mapa
// -------------------------------
$(document).ready(function () {
  $('#toolbox-btn').on('click', () => $('#toolbox').toggle());

  // Diccionario de agencias para mostrar nombres correctos
  const agencyNames = {
    "ic":     "Info Casas",
    "UC":     "Ultra Casas",
    "C21":    "Century 21",
    "remax":  "RE/MAX",
    "bieni":  "Bien Inmuebles",
    "IDI":    "Inversionistas de Impacto",
    "elfaro": "El Faro"
    // statetty no se coloca en los checkboxes
  };




  var urlParams = new URLSearchParams(window.location.search);
  let id = urlParams.get('id');
  let key = urlParams.get('key');
  let pProm = Math.round(urlParams.get('p'));
  window.na = urlParams.get('na');
  window.ag = urlParams.get('ag');
  window.an = urlParams.get('an');
  window.M2T = urlParams.get('M2T');

  if (!id || !key) { throw new Error("ID o clave no proporcionados en la URL"); }

  var valores = 'Sheet1!A2:W';
  var url = 'https://sheets.googleapis.com/v4/spreadsheets/' + id + '/values/' + valores + '?key=' + key;

  $('#loading-indicator').show();

  $.getJSON(url, function (data) {
    $('#loading-indicator').hide();

  const columnas = [
    "Titulo",
    "lat",
    "lng",
    "dir",
    "URL",
    "des",
    "ambientes",
    "dormitorios",
    "baños",
    "m2construccion",
    "m2terreno",
    "nombre",
    "precioM2",
    "broker",
    "foto",
    "precio",
    "agentName",
    "agentPhon",
    "fechaIngreso",
    "tiempoOfertado",
    "tipoInmueble",
    "tipoNegocio",
    "anoc"
  ];


  window.columnasConfig = {
    "Titulo": true,
    "lat": false, 
    "lng": false, 
    "dir": false, 
    "URL": false, 
    "des": false,
    "ambientes": false, 
    "dormitorios": true, 
    "baños": true, 
    "m2construccion": true,
    "m2terreno": true, 
    "nombre": false,
    "precioM2": true, 
    "broker": false,
    "foto": false, 
    "precio": true,
    "agentName": false, 
    "agentPhon": false,
    "fechaIngreso": false,       
    "tiempoOfertado": true,     
    "tipoInmueble": false,       
    "tipoNegocio": false,
    "anoc": false          
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


      // ✅ renombramos precioM2 a precioM2C
      location.precioM2C = (location.precio > 0 && location.m2construccion > 0)? location.precio / location.m2construccion: 0;
      delete location.precioM2;

      // ✅ calculamos precioM2T si es posible
      location.precioM2T = (location.precio > 0 && location.m2terreno > 0)? location.precio / location.m2terreno: 0;






      let rawDesc = location.des || '';
      rawDesc = rawDesc.replace(/\+591\d{8}/g, '[número eliminado]')
                       .replace(/591\d{8}/g, '[número eliminado]')
                       .replace(/\b\d{8}\b/g, '[número eliminado]')
                       .replace(/\d{2,4}[-\s]\d{2,4}[-\s]\d{2,4}/g, '[número eliminado]')
                       .replace(/\(\d{3,4}\)\s?\d{5,8}/g, '[número eliminado]')
                       .replace(/00\s?591\d{8}/g, '[número eliminado]')
                       .replace(/wa\.me\/\d+/gi, '[número eliminado]')
                       .replace(/whatsapp\.com\/\d+/gi, '[número eliminado]');

      const chrMax = 500;
      const faltan = rawDesc.length > chrMax ? rawDesc.length - chrMax : 0;
      const frase = faltan > 0 ? '... (y ' + faltan + ' caracteres más)' : '';
      location.des = rawDesc.length > chrMax ? rawDesc.substring(0, chrMax) + frase : rawDesc;

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

    map = L.map('mapid');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    var circleCenter = L.latLng(lat, lng);
    var circle = L.circle(circleCenter, { color: 'green', weight: 1, fillOpacity: 0, radius }).addTo(map);

    var crossIcon = L.icon({
      iconUrl: '../../assets/images/cross_green.png',
      iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -10]
    });
    var crossMarker = L.marker(circleCenter, { icon: crossIcon }).addTo(map);
    crossMarker.bindPopup(`Coordenadas: ${lat},${lng}<br>Valor promedio: USD${formatNumber(pProm)}`);

    // markers
    locations.forEach(function (dato) {
      let url = dato.uid;
      var brand;
      if (url.includes("c21.com")) { brand = 'C21'; }
      else if (url.includes("remax")) { brand = 'remax'; }
      else if (url.includes("bieninmuebles")) { brand = 'bieni'; }
      else if (url.includes("elfaro")) { brand = 'elfaro'; }
      else if (url.includes("dueodeinmueble")) { brand = 'IDI'; }
      else if (url.includes("ultracasas")) { brand = 'UC'; }
      else if (url.includes("uno.com")) { brand = 'uno'; }
      else if (url.includes("infocasas.com")) { brand = 'ic'; }
      else { brand = 'statetty'; }

      var icon = new L.Icon({
        iconUrl: '../../assets/images/pointers/pointer_' + brand + '.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [40, 60], iconAnchor: [20, 60], popupAnchor: [1, -54], shadowSize: [60, 60]
      });

      var marker = L.marker([dato.lat, dato.lng], { icon }).addTo(map);

      // Nombre del agente
      const nombreAgente = (dato.agentName || '').trim();
      const nombreCorto = nombreAgente ? ' ' + nombreAgente.split(' ')[0] : '';

      // Teléfono del agente (ojo con la columna: agentPhon)
      let cel = (dato.agentPhon || '').toString().replace(/\D/g, '');

      // Normaliza para WhatsApp
      if (cel.length === 8) cel = '591' + cel;
      if (cel.length === 9 && cel.startsWith('0')) cel = '591' + cel.slice(1);

      // Mensaje
      let soyNa = na ? ` ${na}` : '';
      let deAg = ag ? ` de ${ag}` : '';
      let sc = (na || ag) ? ' te escribe, ' : '';
      const msj = `Hola${nombreCorto},${soyNa}${deAg}${sc}un gusto saludarte.
      Por favor, podría enviarme información sobre este inmueble, en caso de que siga disponible (${dato.Titulo})

      link: ${url}

      Gracias de antemano

      (Mensaje creado con Statetty https://statetty.com)`;

      // Link WhatsApp
      const linkWA = cel
        ? `<br/><a href="https://wa.me/${cel}?text=${encodeURIComponent(msj)}" target="_blank" rel="noopener">📱 Contactar por WhatsApp</a>`
        : '';



      var distance = Math.round(calculateDH(circleCenter.lat, circleCenter.lng, dato.lat, dato.lng) * 1000);
      var priceDiffPercent = ((dato.precio - pProm) / pProm) * 100;
      var priceComparison = priceDiffPercent > 0
        ? `<span style="color: red;">↑${Math.ceil(priceDiffPercent)}%</span>`
        : `<span style="color: green;">↓${Math.ceil(Math.abs(priceDiffPercent))}%</span>`;

      var popupContent = "<b>" + dato.Titulo + " (" + distance + "m)</b> " + priceComparison + "<br>" +
        "<b>Dirección:</b> " + dato.dir + "<br>" +
        "<b>Descripción:</b> " + dato.des + "<br>" +
        '<a href="' + url + '" target="_blank">Ver página de la captación</a>' +
        linkWA +
        `<br><label><input type="checkbox" class="chk-sel" data-id="${dato.uid}"> Seleccionar</label>`;

      marker.bindPopup(popupContent);
      markers.push({ marker, iconOriginal: icon, dato, overlay: null });

      marker.on("popupopen", function () {
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


    // --- inicializar acordeón ---
    $(document).on('click', '.section-header', function () {
      $('.section').removeClass('active'); // cerrar todas
      $(this).parent().addClass('active'); // abrir esta
    });

    // --- agencias únicas ---
    let agencies = {};
    markers.forEach(obj => {
      let brand = obj.iconOriginal.options.iconUrl.split("pointer_")[1].split(".")[0];
      agencies[brand] = true;
    });

    // cargar estado previo si existe
    const prevAgencias = cargarAgencias();

    // renderizar checkboxes con nombres bonitos, excluyendo statetty
    for (let ag in agencies) {
      if (ag === "statetty") continue; // no mostrar
      let label = agencyNames[ag] || ag;
      //let checked = (!prevAgencias && ag !== "ic") || (prevAgencias && prevAgencias.includes(ag));
      let checked = !prevAgencias || prevAgencias.includes(ag);


      $('#agency-filter').append(
        `<div><label><input type="checkbox" class="chk-agency" data-ag="${ag}" ${checked ? "checked" : ""}> ${label}</label></div>`
      );

      // aplicar estado inicial
      markers.forEach(m => {
        let brand = m.iconOriginal.options.iconUrl.split("pointer_")[1].split(".")[0];
        if (brand === ag) {
          if (checked) {
            map.addLayer(m.marker);
          } else {
            map.removeLayer(m.marker);
          }
        }
      });
    }

    // --- filtro por agencias ---
    $(document).on('change', '.chk-agency', function () {
      let ag = $(this).data('ag');
      let checked = this.checked;
      markers.forEach(m => {
        let brand = m.iconOriginal.options.iconUrl.split("pointer_")[1].split(".")[0];
        if (brand === ag) {
          if (checked) {
            map.addLayer(m.marker);
          } else {
            map.removeLayer(m.marker);
          }
        }
      });
      guardarAgencias();
      actualizarEstadisticas(getVisibleLocations());
    });





    // ✅ Restaurar seleccionados
    const prevSel = cargarSeleccionados();
    prevSel.forEach(id => {
      let obj = markers.find(m => m.dato.uid === id);
      if (obj) {
        seleccionados.push(obj.dato);
        let overlay = L.marker([obj.dato.lat, obj.dato.lng], { icon: checkOverlayIcon, interactive: false }).addTo(map);
        obj.overlay = overlay;
      }
      $(`.chk-sel[data-id='${id}']`).prop("checked", true);
    });
    actualizarToolbox();

    // ✅ Restaurar centro/zoom del mapa si existe
    const savedMap = cargarMapa();
    if (savedMap) {
      map.setView(savedMap.center, savedMap.zoom);
    } else {
      var group = new L.featureGroup(locations.map(function (location) {
        return L.marker([location.lat, location.lng]);
      }));
      map.fitBounds(group.getBounds());
    }

    actualizarEstadisticas(getVisibleLocations());


    // Guardar posición/zoom cada vez que se mueva o haga zoom
    map.on("moveend", guardarMapa);
    map.on("zoomend", guardarMapa);
  });

  // búsqueda
  $('#search-input').on('input', function () {
    let query = $(this).val().toLowerCase();
    let matchCount = 0, filtrados = [];

    markers.forEach(obj => {
      let texto = (
        obj.dato.des + ' ' + obj.dato.nombre + ' ' + obj.dato.Titulo + ' ' + obj.dato.dir + ' ' + obj.dato.broker + ' ' + 
        (obj.dato.agentName || '') + ' ' +
        (obj.dato.agentPhon || '')
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
  if (typeof restaurarEstadoACM === "function") {restaurarEstadoACM();}
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
