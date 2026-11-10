// ---------------------------------------------
// mapaPublico.js — render público del mapa unificado.
// Pines divIcon con badge emoji de tipo + puntero de marca, popup simple.
// Es el render que ve el visitante anónimo y el registrado sin tiempo; con
// usuario activo los resultados llegan con `brocker` y los pines toman la
// marca solos (mismo `marcaDe` unificado de mapaShared).
//
// API: window.STT_MAPA_PUBLICO = { pintar(resultados), limpiar() }
// Los markers van al arreglo global `markers` (mapaShared): limpiarRenderPrevio
// de mapaAgente limpia los dos modos por igual.
// ---------------------------------------------
(function () {
  'use strict';

  var PIN = '/assets/images/pointers/pointer_statetty.png';

  function iconoPara(tipo, marca) {
    var src = '/assets/images/pointers/pointer_' + (marca || 'statetty') + '.png';
    return L.divIcon({
      className: 'pin-tipo',
      html: '<img class="pin-img" src="' + src + '" alt=""' +
            ' onerror="this.onerror=null;this.src=\'' + PIN + '\'">' +
            '<span class="pin-emoji" aria-hidden="true">' + emojiTipo(tipo) + '</span>',
      iconSize: [40, 60], iconAnchor: [20, 60], popupAnchor: [1, -54],
    });
  }

  function linea(txt) { return txt ? '<div>' + txt + '</div>' : ''; }

  function popup(r) {
    var cuerpo = '';
    cuerpo += linea(esc(r.tipoInmueble || '') + (r.tipoNegocio ? ' · ' + esc(r.tipoNegocio) : ''));
    cuerpo += linea('<strong>USD ' + miles(r.precio || 0) + '</strong>');
    cuerpo += linea(esc(r.nombre || ''));
    var det = [];
    if (r.dormitorios) det.push(r.dormitorios + ' dorm.');
    if (r.banos) det.push(r.banos + ' baños');
    if (r.m2c) det.push(r.m2c + ' m² construc.');
    if (r.m2t) det.push(r.m2t + ' m² terreno');
    cuerpo += linea(esc(det.join(' · ')));
    cuerpo += linea('<a href="' + esc(r.url) + '" target="_blank" rel="noopener">Ver ficha</a>');
    return cuerpo;
  }

  function limpiar() {
    if (typeof map !== 'undefined' && map) {
      markers.forEach(function (m) {
        var layer = m && m.marker ? m.marker : m;
        if (map.hasLayer(layer)) map.removeLayer(layer);
      });
    }
    markers = [];
  }

  // resultados = items tal como los manda buscarMapa (shape pública o doc
  // completo; los campos usados existen en ambas).
  function pintar(resultados) {
    if (!map) return 0;
    limpiar();
    var m = window.map || map;
    (resultados || []).forEach(function (r) {
      var lat = num(r.lat), lng = num(r.lng);
      if (!isFinite(lat) || !isFinite(lng)) return;   // sin coordenadas no hay pin
      var marker = L.marker([lat, lng], { icon: iconoPara(r.tipoInmueble, marcaDe(r)) }).addTo(m);
      marker.bindPopup(popup(r));
      markers.push({ marker: marker, dato: r, overlay: null, nuevoOverlay: null });
    });
    if (!markers.length) {
      if (window.STT_MAPA_CAJA && window.STT_MAPA_CAJA.registrarZoomAuto) {
        window.STT_MAPA_CAJA.registrarZoomAuto(m.getZoom());
      }
      return 0;
    }
    // Encuadre automático: el zoom que queda es el nuevo "de reposo" para que
    // no cuente como zoom in del usuario al bajar la caja.
    var zoomRef;
    if (markers.length === 1) {
      zoomRef = 15;
      m.setView(markers[0].marker.getLatLng(), 15);
    } else {
      var b = L.featureGroup(markers.map(function (x) { return x.marker; })).getBounds().pad(0.15);
      zoomRef = Math.min(m.getBoundsZoom(b), m.getMaxZoom());
      m.fitBounds(b);
    }
    if (window.STT_MAPA_CAJA && window.STT_MAPA_CAJA.registrarZoomAuto) {
      window.STT_MAPA_CAJA.registrarZoomAuto(zoomRef);
    }
    return markers.length;
  }

  window.STT_MAPA_PUBLICO = { pintar: pintar, limpiar: limpiar, popup: popup, iconoPara: iconoPara };
})();
