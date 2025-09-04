// ---------------------------------------------
// mapa.js - Lógica completa del mapa y selección
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
  iconSize: [20, 20],
  iconAnchor: [1, 60] // ✔️ sobre la mitad superior del marker
});

// -------------------------------
// Utilidades
// -------------------------------
function normalizeURL(u) {
  if (!u) return '';
  return u.includes('http') ? u : `https://c21.com.bo${u}`;
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ",00";
}

function calcularPromedio(datos, prop) {
  if (!Array.isArray(datos) || datos.length === 0) return 0;
  const datosFiltrados = datos.filter(item => item && typeof item[prop] === 'number' && item[prop] >= 0);
  if (datosFiltrados.length === 0) return 0;
  const suma = datosFiltrados.reduce((acc, item) => acc + item[prop], 0);
  return Math.round(suma / datosFiltrados.length);
}

function actualizarEstadisticas(lista) {
  if (!lista || lista.length === 0) {
    $('#total-inmuebles').text(0);
    $('#precio-promedio').text("0,00");
    $('#mas-barato').text("-");
    $('#mas-caro').text("-");
    return;
  }
  let promedio = calcularPromedio(lista, 'precio');
  let masBarato = lista.reduce((min, loc) => (loc.precio && loc.precio < min.precio ? loc : min), lista[0]);
  let masCaro = lista.reduce((max, loc) => (loc.precio && loc.precio > max.precio ? loc : max), lista[0]);
  $('#total-inmuebles').text(lista.length);
  $('#precio-promedio').text(formatNumber(promedio));
  $('#mas-barato').text(`${masBarato.nombre}`);
  $('#mas-caro').text(`${masCaro.nombre}`);
}

function actualizarToolbox() {
  $("#sel-box").remove();
  let html = '';
  seleccionados.forEach((s, i) => {
    html += `<div>${i + 1}. ${s.nombre} <span class="remove-sel" data-id="${s.uid}" style="cursor:pointer; color:red;">❌</span></div>`;
  });
  if (seleccionados.length > 0) {
    $("#stats-container").append(`<div id="sel-box"><hr>✅ Seleccionados: ${seleccionados.length}${html}</div>`);
  }
  $(".remove-sel").off("click").on("click", function () {
    let id = $(this).data("id"); // uid (URL absoluta)

    // quitar del arreglo
    seleccionados = seleccionados.filter(s => s.uid !== id);

    // quitar overlay y animar rebote en el marker correcto (por uid)
    let obj = markers.find(m => m.dato.uid === id);
    if (obj) {
      if (obj.overlay) { map.removeLayer(obj.overlay); obj.overlay = null; }
      let pos = obj.marker.getLatLng();
      let offset = 0.0001;
      obj.marker.setLatLng([pos.lat + offset, pos.lng]);
      setTimeout(() => obj.marker.setLatLng(pos), 150);
    }

    // desmarcar checkbox si el popup está abierto
    $(`.chk-sel[data-id='${id}']`).prop("checked", false);

    actualizarToolbox();
  });
}

// -------------------------------
// Inicialización del mapa
// -------------------------------
$(document).ready(function () {
  $('#toolbox-btn').on('click', () => $('#toolbox').toggle());

  var urlParams = new URLSearchParams(window.location.search);
  let id = urlParams.get('id');
  let key = urlParams.get('key');
  let pProm = Math.round(urlParams.get('p'));
  let na = urlParams.get('na');
  let ag = urlParams.get('ag');
  if (!id || !key) { throw new Error("ID o clave no proporcionados en la URL"); }

  var valores = 'Sheet1!A2:R';
  var url = 'https://sheets.googleapis.com/v4/spreadsheets/' + id + '/values/' + valores + '?key=' + key;

  // Mostrar indicador de carga
  $('#loading-indicator').show();

  $.getJSON(url, function (data) {
    $('#loading-indicator').hide();

    $(data.values).each(function () {
      var location = {};
      location.nombre = this[0];
      location.lat = parseFloat(this[1]);
      location.lng = parseFloat(this[2]);
      location.dir = this[3];
      location.URL = this[4];
      location.uid = normalizeURL(location.URL); // <<< UID por URL absoluta
      location.precio = parseInt(this[15]) || 0;
      location.agente = this[16];
      location.numero = this[17];

      // limpiar descripción y eliminar números telefónicos
      let rawDesc = this[5] ? this[5] : '';
      rawDesc = rawDesc.replace(/\+591\d{8}/g, '[número eliminado]')
                       .replace(/591\d{8}/g, '[número eliminado]')
                       .replace(/\b\d{8}\b/g, '[número eliminado]')
                       .replace(/\d{2,4}[-\s]\d{2,4}[-\s]\d{2,4}/g, '[número eliminado]')
                       .replace(/\(\d{3,4}\)\s?\d{5,8}/g, '[número eliminado]')
                       .replace(/00\s?591\d{8}/g, '[número eliminado]')
                       .replace(/wa\.me\/\d+/gi, '[número eliminado]')
                       .replace(/whatsapp\.com\/\d+/gi, '[número eliminado]');

      // truncar después de limpiar
      var chrMax = 500;
      var faltan = rawDesc.length > chrMax ? rawDesc.length - chrMax : 0;
      var frase = faltan > 0 ? '... (y ' + faltan + ' caracteres más)' : '';
      location.des = rawDesc.length > chrMax ? rawDesc.substring(0, chrMax) + frase : rawDesc;

      locations.push(location);
    });

    // calcular centro y radio
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

    // crear mapa
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

    // agregar markers
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

      var nombre = dato?.agente ? ' ' + dato.agente.split(" ")[0] : '';
      var cel = dato?.numero ? dato.numero.replace(/[^0-9]/g, "") : '';
      let soyNa = na ? ` ${na}` : '';
      let deAg = ag ? ` de ${ag}` : '';
      let sc = (na || ag) ? ' te escribe, ' : '';
      var msj = `Hola${nombre}, ${soyNa}${deAg}${sc}un gusto saludarte. \nPor favor, podría enviarme información sobre este inmueble, en caso de que siga disponible (${dato.nombre}) \n\nlink: ${url}\n\nGracias de antemano \n\n\n( Mensaje creado con Statetty https://statetty.com )`;
      var msjWhatsapp = `https://wa.me/${cel}?text=${encodeURIComponent(msj)}`;
      var linkWA = cel ? '<br/><a href="' + msjWhatsapp + '" target="_blank">Contacta al captador</a>' : '';

      var distance = Math.round(calculateDH(circleCenter.lat, circleCenter.lng, dato.lat, dato.lng) * 1000);
      var priceDiffPercent = ((dato.precio - pProm) / pProm) * 100;
      var priceComparison = priceDiffPercent > 0
        ? `<span style="color: red;">↑${Math.ceil(priceDiffPercent)}%</span>`
        : `<span style="color: green;">↓${Math.ceil(Math.abs(priceDiffPercent))}%</span>`;

      var popupContent = "<b>" + dato.nombre + " (" + distance + "m)</b> " + priceComparison + "<br>" +
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
          actualizarToolbox();
        });
      });
    });

    var group = new L.featureGroup(locations.map(function (location) {
      return L.marker([location.lat, location.lng]);
    }));
    map.fitBounds(group.getBounds());
    actualizarEstadisticas(locations);
  });

  // búsqueda
  $('#search-input').on('input', function () {
    let query = $(this).val().toLowerCase();
    let matchCount = 0, filtrados = [];

    markers.forEach(obj => {
      let texto = (obj.dato.des + ' ' + obj.dato.nombre + ' ' + obj.dato.dir + ' ' + obj.dato.agente + ' ' + obj.dato.numero).toLowerCase();
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

// -------------------------------
// Funciones auxiliares
// -------------------------------
function calculateDH(lat1, lng1, lat2, lng2) {
  const lat1Rad = lat1 * Math.PI / 180, lng1Rad = lng1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180, lng2Rad = lng2 * Math.PI / 180;
  const dLat = lat2Rad - lat1Rad, dLng = lng2Rad - lng1Rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c; // km
}
