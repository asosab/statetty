// ---------------------------------------------
// mapaInmo.js - Mapa de agencias inmobiliarias (datos de la API, sesión admin)
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
    $('#stats-actions').remove(); // quitar botones si no hay datos
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

  // botones de acción
  if ($('#stats-actions').length === 0) {
    $('#stats-container').append(`
      <div id="stats-actions" style="margin-top:8px;">
        <button id="btn-add-sel">Agregar a selección</button>
        <button id="btn-remove-sel">Quitar de selección</button>
        <button id="btn-keep-only">Quitar todos excepto estos</button>
      </div>
    `);

    // Agregar a selección
    $('#btn-add-sel').on('click', function () {
      ultimosFiltrados.forEach(a => {
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
    });

    // Quitar de selección
    $('#btn-remove-sel').on('click', function () {
      ultimosFiltrados.forEach(a => {
        seleccionados = seleccionados.filter(s => s.uid !== a.uid);
        let obj = markers.find(m => m.dato.uid === a.uid);
        if (obj && obj.overlay) { map.removeLayer(obj.overlay); obj.overlay = null; }
        $(`.chk-sel[data-id='${a.uid}']`).prop("checked", false);
      });
      guardarSeleccionados();
      actualizarToolbox();
    });

    // Quitar todos excepto estos (solo elimina los que NO están en el filtro actual)
    $('#btn-keep-only').off('click').on('click', function () {
      const keepUIDs = new Set((ultimosFiltrados || []).map(a => a.uid));

      // Si no hay resultados filtrados, no hacemos nada (protección)
      if (keepUIDs.size === 0) return;

      // Recorremos una copia porque vamos a mutar 'seleccionados'
      seleccionados.slice().forEach(s => {
        if (!keepUIDs.has(s.uid)) {
          // 1) quitar del arreglo de seleccionados
          seleccionados = seleccionados.filter(x => x.uid !== s.uid);

          // 2) quitar overlay del mapa
          const obj = markers.find(m => m.dato.uid === s.uid);
          if (obj && obj.overlay) { map.removeLayer(obj.overlay); obj.overlay = null; }

          // 3) desmarcar checkbox si está presente en el DOM
          $(`.chk-sel[data-id='${s.uid}']`).prop('checked', false);
        }
      });

      guardarSeleccionados();
      actualizarToolbox();
    });
  }
}


function actualizarToolbox() {
  $("#sel-container").empty();
  if (seleccionados.length > 0) {
    let html = seleccionados.map(s => `<div>${s.nombre} <span class="remove-sel" data-id="${s.uid}" style="cursor:pointer; color:red;">❌</span></div>`).join("");
    $("#sel-container").append(`
      <div id="sel-box">
        <hr>
        ✅ Seleccionados: ${seleccionados.length}
        ${html}
      </div>
    `);

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
  }
}


// -------------------------------
// Carga de agencias desde la API Statetty (sesión Buddy, solo admin).
// Reemplaza la antigua lectura de la hoja de Google (id/key en la URL).
// -------------------------------
function apiBase() {
  return (window.STATETTY_CONFIG && STATETTY_CONFIG.WS_API_BASE) || 'https://api.statetty.com/api/';
}

// Espera a que auth.js resuelva la sesión (STT.ready) aunque mapaInmo.js corra
// antes por no ser `defer`; si la página no monta auth.js, sondea window.STT.
function sesionLista() {
  return new Promise(function (resolve) {
    function terminar() {
      var t = (window.STT && typeof window.STT.getToken === 'function') ? window.STT.getToken() : null;
      resolve(t);
    }
    if (window.STT && window.STT.ready && typeof window.STT.ready.then === 'function') {
      window.STT.ready.then(terminar);
      return;
    }
    var n = 0;
    var iv = setInterval(function () {
      if (window.STT) { clearInterval(iv); terminar(); }
      else if (++n > 100) { clearInterval(iv); resolve(null); }
    }, 50);
  });
}

function cargarAgencias() {
  return sesionLista().then(function (token) {
    if (!token) throw new Error('Iniciá sesión con una cuenta administradora para ver el mapa de agencias.');
    return fetch(apiBase() + 'statetty/inmobiliarias', {
      cache: 'no-store',
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(function (res) {
      if (res.status === 403) throw new Error('Este mapa es solo para administradores.');
      if (!res.ok) throw new Error('No se pudieron cargar las agencias (HTTP ' + res.status + ').');
      return res.json();
    }).then(function (data) {
      if (!data || !Array.isArray(data.agencias)) throw new Error('Respuesta inválida del servidor.');
      return data.agencias;
    });
  });
}

// -------------------------------
// Inicialización del mapa
// -------------------------------
$(document).ready(function () {
  $('#toolbox-btn').on('click', () => $('#toolbox').toggle());

  var urlParams = new URLSearchParams(window.location.search);

  $('#loading-indicator').show();

  cargarAgencias().then(function (rows) {
    $('#loading-indicator').hide();

    rows.forEach(function (a) {
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

    map = L.map('mapid', { zoomControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

    var center = L.latLng(lat, lng);
    L.circle(center, { color: 'green', weight: 1, fillOpacity: 0, radius: radius }).addTo(map);
    var crossIcon = L.icon({ iconUrl: '../../assets/images/cross_green.png', iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -10] });
    var crossMarker = L.marker(center, { icon: crossIcon }).addTo(map).bindPopup(`Centro aproximado`);

    // Marcadores
    locations.forEach(function (a) {
      let fullUrl = normalizeURL(a.URL);
      var brand;
      if      ((fullUrl || '').includes("c21"))               brand = 'C21';
      else if ((fullUrl || '').includes("century21"))         brand = 'C21';
      else if ((fullUrl || '').includes("remax"))             brand = 'remax';
      else if ((fullUrl || '').includes("bieninmuebles"))     brand = 'bieni';
      else if ((fullUrl || '').includes("elfaro"))            brand = 'elfaro';
      else if ((fullUrl || '').includes("dueodeinmueble"))    brand = 'IDI';
      else if ((fullUrl || '').includes("ultracasas"))        brand = 'UC';
      else if ((fullUrl || '').includes("uno.com"))           brand = 'uno';
      else if ((fullUrl || '').includes("infocasas.com"))     brand = 'ic';
      else if ((fullUrl || '').includes("santa-cruz.estate")) brand = 'sce';
      else if ((fullUrl || '').includes("bolivia.kw.com"))     brand = 'kw';
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
        <b>${escapeHtml(a.nombre)}</b><br>
        <b>Agencia:</b> ${escapeHtml(a.agencia)}<br>
        <b>Región:</b> ${escapeHtml(a.region)} | <b>País:</b> ${escapeHtml(a.pais)}<br>
        <b>Dirección:</b> ${escapeHtml(a.dir)}<br>
        <b>Agentes:</b> ${a.cantAg} | 🟢 ${a.activos} | 🟡 ${a.inactivos} | 🔴 ${a.sinCuenta}<br>
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
  }).catch(function (err) {
    $('#loading-indicator').text((err && err.message) || 'No se pudieron cargar las agencias.');
  });

  // búsqueda
  $('#search-input').on('input', function () {
    let query = $(this).val().toLowerCase();
    let matchCount = 0, filtrados = [];

    markers.forEach(obj => {
      let texto = (obj.dato.nombre + ' ' + obj.dato.agencia + ' ' + obj.dato.region + ' ' + obj.dato.pais + ' ' + obj.dato.estado + ' ' + obj.dato.phone + ' ' + obj.dato.dir).toLowerCase();
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

    if (query) {
      $('#search-count').text(matchCount).show();
      actualizarEstadisticas(filtrados);
    } else {
      $('#search-count').hide();
      actualizarEstadisticas(locations);
      ultimosFiltrados = locations; 
    }
  });

  // Eventos sobre textos de estadísticas
  $("#txt-activas").on("click", function() { $("#search-input").val("activa").trigger("input");});
  $("#txt-latentes").on("click", function() { $("#search-input").val("latente").trigger("input");});
  $("#txt-desconectadas").on("click", function() { $("#search-input").val("desconectada").trigger("input");});

});
