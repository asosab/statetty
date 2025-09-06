// ---------------------------------------------
// mapaInmo.js - Lógica completa del mapa de agencias con UID e índice de columnas
// ---------------------------------------------

var map, locations = [], markers = [], seleccionados = [];

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
  iconAnchor: [1, 60]
});

// -------------------------------
// Persistencia en localStorage
// -------------------------------
function guardarSeleccionados() {
  const ids = seleccionados.map(s => s.uid);
  localStorage.setItem("agenciasSeleccionadas", JSON.stringify(ids));
}

function cargarSeleccionados() {
  try {
    const data = JSON.parse(localStorage.getItem("agenciasSeleccionadas")) || [];
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function guardarMapa() {
  if (map) {
    const center = map.getCenter();
    const zoom = map.getZoom();
    localStorage.setItem("mapInmoCenter", JSON.stringify([center.lat, center.lng]));
    localStorage.setItem("mapInmoZoom", zoom);
  }
}

function cargarMapa() {
  try {
    const center = JSON.parse(localStorage.getItem("mapInmoCenter"));
    const zoom = parseInt(localStorage.getItem("mapInmoZoom"));
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
  return u.includes('http') ? u : `https://c21.com.bo${u}`;
}

function calculateDH(lat1, lng1, lat2, lng2) {
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))); // km
}

function escapeHtml(s) {
  return (s || '').toString().replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function actualizarEstadisticas(lista) {
  if (!lista || lista.length === 0) {
    $('#total-agencias').text(0);
    $('#prom-agentes').text(0);
    $('#total-agentes-all').text(0);
    $('#cnt-activas').text(0);
    $('#cnt-inactivas').text(0);
    $('#cnt-sincuenta').text(0);
    return;
  }
  const totalAgencias = lista.length;
  const promAg = Math.round(lista.reduce((a, b) => a + (b.cantAg || 0), 0) / totalAgencias);
  const act = lista.reduce((a, b) => a + (b.activos || 0), 0);
  const inact = lista.reduce((a, b) => a + (b.inactivos || 0), 0);
  const sinC = lista.reduce((a, b) => a + (b.sinCuenta || 0), 0);
  const totalAgentes = act + inact + sinC;

  $('#total-agencias').text(totalAgencias);
  $('#prom-agentes').text(promAg);
  $('#total-agentes-all').text(totalAgentes);
  $('#cnt-activas').text(act);
  $('#cnt-inactivas').text(inact);
  $('#cnt-sincuenta').text(sinC);
}


function actualizarToolbox() {
  $("#stats-container").empty();
  if (seleccionados.length > 0) {
    let html = seleccionados.map(s => `<div>${s.nombre} <span class="remove-sel" data-id="${s.uid}" style="cursor:pointer; color:red;">❌</span></div>`).join("");
    $("#stats-container").append(`
      <div id="sel-box">
        <hr>
        ✅ Seleccionados: ${seleccionados.length}
        ${html}
      </div>
    `);

    $(".remove-sel").off("click").on("click", function () {
      let id = $(this).data("id");
      seleccionados = seleccionados.filter(s => s.uid !== id);
      guardarSeleccionados();
      let obj = markers.find(m => m.dato.uid === id);
      if (obj) {
        if (obj.overlay) { map.removeLayer(obj.overlay); obj.overlay = null; }
      }
      $(`.chk-sel[data-id='${id}']`).prop("checked", false);
      actualizarToolbox();
    });
  }
}

// -------------------------------
// Índice de columnas de la hoja Agencias_Bolivia
// -------------------------------
const columnas = [
  "lat",            // 0 latitud
  "lng",            // 1 longitud
  "broker",         // 2 broker
  "nombre",         // 3 nombre de la agencia
  "dir",            // 4 dirección
  "pais",           // 5 país
  "cantAg",         // 6 cantidad de agentes
  "estado",         // 7 Estado (activa/inactiva)
  "activos",        // 8 número de agentes activos
  "inactivos",      // 9 número de agentes inactivos
  "sinCuenta",      // 10 agentes sin cuenta
  "URL",            // 11 sitio web
  "phone",          // 12 teléfono
  "region"          // 13 región
];

window.columnasConfig = {
  "lat": false,
  "lng": false,
  "broker": false,
  "nombre": true,
  "dir": true,
  "pais": true,
  "cantAg": true,
  "estado": true,
  "activos": true,
  "inactivos": true,
  "sinCuenta": true,
  "URL": false,
  "phone": false,
  "region": true
};

// -------------------------------
// Inicialización del mapa
// -------------------------------
$(document).ready(function () {
  $('#toolbox-btn').on('click', () => $('#toolbox').toggle());

  var urlParams = new URLSearchParams(window.location.search);
  let id = urlParams.get('id'), key = urlParams.get('key');
  if (!id || !key) { throw new Error("ID o key no proporcionados en la URL"); }

  var valores = 'Agencias_Bolivia!A2:N';
  var url = 'https://sheets.googleapis.com/v4/spreadsheets/' + id + '/values/' + valores + '?key=' + key;

  $('#loading-indicator').show();

  $.getJSON(url, function (data) {
    $('#loading-indicator').hide();

    (data.values || []).forEach(function (row) {
      if (!row || row.length < columnas.length) return;
      var a = {};
      columnas.forEach((col, i) => a[col] = row[i] || "");

      a.lat = parseFloat(a.lat);
      a.lng = parseFloat(a.lng);
      a.cantAg = parseInt(a.cantAg) || 0;
      a.activos = parseInt(a.activos) || 0;
      a.inactivos = parseInt(a.inactivos) || 0;
      a.sinCuenta = parseInt(a.sinCuenta) || 0;
      a.estado = (a.estado || '').toLowerCase();
      a.uid = normalizeURL(a.URL || a.nombre);

      if (!isFinite(a.lat) || !isFinite(a.lng)) return;
      locations.push(a);
    });

    var lat = parseFloat(urlParams.get('lat')), lng = parseFloat(urlParams.get('lng')), radius = parseFloat(urlParams.get('r'));
    if (!isFinite(lat) || !isFinite(lng) || !isFinite(radius)) {
      let latSum = 0, lngSum = 0; locations.forEach(l => { latSum += l.lat; lngSum += l.lng; });
      lat = latSum / locations.length; lng = lngSum / locations.length;
      let maxD = 0; locations.forEach(l => { const d = calculateDH(lat, lng, l.lat, l.lng); if (d > maxD) maxD = d; }); radius = maxD * 1000;
    }

    map = L.map('mapid');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

    var center = L.latLng(lat, lng);
    L.circle(center, { color: 'green', weight: 1, fillOpacity: 0, radius: radius }).addTo(map);
    var crossIcon = L.icon({ iconUrl: '../../assets/images/cross_green.png', iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -10] });
    var crossMarker = L.marker(center, { icon: crossIcon }).addTo(map).bindPopup(`Centro aproximado`);

    // Marcadores
    locations.forEach(function (a) {
      let fullUrl = normalizeURL(a.URL);
      var brand;
      if ((fullUrl || '').includes("c21.com")) brand = 'C21';
      else if ((fullUrl || '').includes("remax")) brand = 'remax';
      else if ((fullUrl || '').includes("bieninmuebles")) brand = 'bieni';
      else if ((fullUrl || '').includes("elfaro")) brand = 'elfaro';
      else if ((fullUrl || '').includes("dueodeinmueble")) brand = 'IDI';
      else if ((fullUrl || '').includes("ultracasas")) brand = 'UC';
      else if ((fullUrl || '').includes("uno.com")) brand = 'uno';
      else if ((fullUrl || '').includes("infocasas.com")) brand = 'ic';
      else brand = 'statetty';

      var icon = new L.Icon({
        iconUrl: '../../assets/images/pointers/pointer_' + brand + '.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [40, 60], iconAnchor: [20, 60], popupAnchor: [1, -54], shadowSize: [60, 60]
      });

      var marker = L.marker([a.lat, a.lng], { icon }).addTo(map);

      var cel = (a.phone || '').replace(/\D/g, '');
      var waTxt = `Hola, me gustaría contactar con la agencia ${a.nombre}. (Enviado desde Statetty https://statetty.com)`;
      var wa = cel ? 'https://wa.me/' + cel + '?text=' + encodeURIComponent(waTxt) : '';
      var distance = Math.round(calculateDH(center.lat, center.lng, a.lat, a.lng) * 1000);

      var popup = `
        <b>${escapeHtml(a.nombre)}</b> (${distance} m)<br>
        <b>Broker:</b> ${escapeHtml(a.broker)}<br>
        <b>Región:</b> ${escapeHtml(a.region)} | <b>País:</b> ${escapeHtml(a.pais)}<br>
        <b>Dirección:</b> ${escapeHtml(a.dir)}<br>
        <b>Agentes:</b> ${a.cantAg} | ✅ ${a.activos} | ❌ ${a.inactivos} | 🚫 ${a.sinCuenta}<br>
        ${fullUrl ? `<a href="${fullUrl}" target="_blank">Ver sitio de la agencia</a><br>` : ''}
        ${wa ? `<a href="${wa}" target="_blank">Contactar por WhatsApp</a>` : ''}
        <br><label><input type="checkbox" class="chk-sel" data-id="${a.uid}"> Seleccionar</label>
      `;

      marker.bindPopup(popup);
      markers.push({ marker, iconOriginal: icon, dato: a, overlay: null });

      marker.on("popupopen", function () {
        let chk = $(`.chk-sel[data-id='${a.uid}']`);
        chk.prop("checked", seleccionados.some(s => s.uid === a.uid));

        chk.off("change").on("change", function () {
          if (this.checked) {
            if (!seleccionados.some(s => s.uid === a.uid)) seleccionados.push(a);
            let overlay = L.marker([a.lat, a.lng], { icon: checkOverlayIcon, interactive: false }).addTo(map);
            let obj = markers.find(m => m.dato.uid === a.uid);
            if (obj) obj.overlay = overlay;
          } else {
            seleccionados = seleccionados.filter(s => s.uid !== a.uid);
            let obj = markers.find(m => m.dato.uid === a.uid);
            if (obj && obj.overlay) { map.removeLayer(obj.overlay); obj.overlay = null; }
          }
          guardarSeleccionados();
          actualizarToolbox();
        });
      });
    });

    // Restaurar seleccionados
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

    // Restaurar centro/zoom del mapa si existe
    const savedMap = cargarMapa();
    if (savedMap) {
      map.setView(savedMap.center, savedMap.zoom);
    } else {
      var group = new L.featureGroup(locations.map(function (l) { return L.marker([l.lat, l.lng]); }));
      map.fitBounds(group.getBounds());
    }

    actualizarEstadisticas(locations);
    map.on("moveend", guardarMapa);
    map.on("zoomend", guardarMapa);
  });

  // búsqueda
  $('#search-input').on('input', function () {
    let query = $(this).val().toLowerCase();
    let matchCount = 0, filtrados = [];

    markers.forEach(obj => {
      let texto = (obj.dato.nombre + ' ' + obj.dato.broker + ' ' + obj.dato.region + ' ' + obj.dato.pais).toLowerCase();
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

    if (query) {
      $('#search-count').text(matchCount).show();
      actualizarEstadisticas(filtrados);
    } else {
      $('#search-count').hide();
      actualizarEstadisticas(locations);
    }
  });
});
