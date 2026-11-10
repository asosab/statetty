// ---------------------------------------------
// mapaFiguras.js — stack único de figuras de área (polígono / circunferencia)
// para el mapa unificado. Reemplaza las DOS copias que existían (inline en
// mapaSimple.html y dentro de initCajaFind en mapa.js).
//
// API:
//   STT_FIGURAS.bind({map, btnLapiz, btnPin, btnDeshacer, avisar, onActivar})
//   STT_FIGURAS.conectarMapa(map)      // cuando el mapa existe/ cambia
//   STT_FIGURAS.datosDe('poligono'|'circunferencia')
//   STT_FIGURAS.hayFiguras()
//   STT_FIGURAS.limpiar()              // quita todas las figuras del mapa
//   window.STT_MAP_FIGURAS()           // contrato que usa fndInm.js
//
// Máximo de figuras por tipo: al llegar, la herramienta activa se apaga y su
// botón se deshabilita hasta borrar alguna.
// ---------------------------------------------
(function () {
  'use strict';

  if (window.STT_FIGURAS) return;

  var LIMITE = { poligono: 10, circunferencia: 10 };
  var RADIO_MIN = 20;        // metros; un círculo menor se descarta
  var PUNTOS_MIN = 3;
  var PUNTOS_MAX = 2000;     // tope de vértices por polígono enviado
  var TOLERANCIA_PX = 1.5;   // Douglas-Peucker
  var HANDLERS = ['dragging', 'touchZoom', 'doubleClickZoom', 'boxZoom'];

  var mapa = null;
  var contenedor = null;
  var figuras = [];          // pila: la más antigua primero, la más nueva al final
  var herramienta = null;    // 'poligono' | 'circunferencia' | null
  var trazo = null;          // figura en curso mientras el puntero está presionado

  var btnLapiz = null, btnPin = null, btnDeshacer = null;
  var _avisar = function () {};
  var _onActivar = null;     // hook: la caja fija su posición al activar

  function contar(tipo) { return figuras.filter(function (f) { return f.tipo === tipo; }).length; }
  function redondear(n, d) { return Number(n.toFixed(d)); }

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
    if (tipo === 'poligono') _avisar('Mantén presionado y arrastra para dibujar el área.', false);
    else if (tipo === 'circunferencia') _avisar('Presiona el centro y arrastra para definir el radio.', false);
  }

  // Limpiar círculo vestigio de búsqueda al empezar/continuar dibujo.
  function limpiarCirculoBusqueda() {
    if (typeof circuloBusqueda !== 'undefined' && circuloBusqueda && mapa && mapa.hasLayer(circuloBusqueda)) {
      mapa.removeLayer(circuloBusqueda);
      circuloBusqueda = null;
    }
  }

  // Deja el mínimo de vértices que conserva la forma dibujada; si aun así
  // pasan de PUNTOS_MAX, los reparte equitativamente a lo largo del contorno.
  function simplificar(pts) {
    var n = pts.length, z = mapa.getZoom();
    if (n <= PUNTOS_MIN) return pts;
    var P = pts.map(function (p) { return mapa.project(p, z); });
    var keep = new Uint8Array(n);
    keep[0] = keep[n - 1] = 1;
    var pila = [[0, n - 1]];
    while (pila.length) {
      var seg = pila.pop(), a = seg[0], b = seg[1], maxd = 0, idx = -1;
      for (var i = a + 1; i < b; i++) {
        var d = L.LineUtil.pointToSegmentDistance(P[i], P[a], P[b]);
        if (d > maxd) { maxd = d; idx = i; }
      }
      if (idx > -1 && maxd > TOLERANCIA_PX) {
        keep[idx] = 1;
        pila.push([a, idx], [idx, b]);
      }
    }
    var res = pts.filter(function (_, i) { return keep[i]; });
    if (res.length > PUNTOS_MAX) {
      var m = res.length, out = [];
      for (var k = 0; k < PUNTOS_MAX; k++) out.push(res[Math.round(k * (m - 1) / (PUNTOS_MAX - 1))]);
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
    var ll = mapa.mouseEventToLatLng(e);
    trazo = { id: e.pointerId, tipo: herramienta };
    limpiarCirculoBusqueda();
    if (herramienta === 'poligono') {
      trazo.pts = [ll];
      trazo.capa = L.polyline([ll], { color: ESTILO_AREA.color, weight: 2, interactive: false }).addTo(mapa);
    } else {
      trazo.centro = ll;
      trazo.circulo = L.circle(ll, L.extend({ radius: 1, interactive: false }, ESTILO_AREA));
      var centro = L.circleMarker(ll, {
        radius: 4, color: '#04364a', weight: 2, fillColor: '#ffd54a', fillOpacity: 1, interactive: false
      });
      trazo.capa = L.featureGroup([trazo.circulo, centro]).addTo(mapa);
    }
  }

  function moverTrazo(e) {
    if (!trazo || !mapa || e.pointerId !== trazo.id) return;
    var ll = mapa.mouseEventToLatLng(e);
    if (trazo.tipo === 'poligono') {
      var ult = mapa.latLngToContainerPoint(trazo.pts[trazo.pts.length - 1]);
      if (ult.distanceTo(mapa.latLngToContainerPoint(ll)) < 3) return;   // filtra ruido
      trazo.pts.push(ll);
      trazo.capa.setLatLngs(trazo.pts);
    } else {
      trazo.circulo.setRadius(trazo.centro.distanceTo(ll));
    }
  }

  function terminarTrazo(e, ok) {
    if (!trazo || !mapa || e.pointerId !== trazo.id) return;
    var t = trazo;
    trazo = null;
    if (contenedor.hasPointerCapture(e.pointerId)) contenedor.releasePointerCapture(e.pointerId);
    var figura = null;
    var pts = (ok && t.tipo === 'poligono') ? simplificar(t.pts) : null;
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
      if (ok) _avisar('El trazo fue muy corto. Intenta de nuevo.', true);
      return;
    }
    figuras.push(figura);
    limpiarCirculoBusqueda();
    _avisar('', false);
    refrescarBotones();
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

  function bind(opts) {
    opts = opts || {};
    btnLapiz = opts.btnLapiz || btnLapiz;
    btnPin = opts.btnPin || btnPin;
    btnDeshacer = opts.btnDeshacer || btnDeshacer;
    if (typeof opts.avisar === 'function') _avisar = opts.avisar;
    _onActivar = typeof opts.onActivar === 'function' ? opts.onActivar : null;
    if (opts.map) conectarMapa(opts.map);

    if (btnLapiz) btnLapiz.addEventListener('click', function () {
      limpiarCirculoBusqueda();
      if (_onActivar) _onActivar();
      activar(herramienta === 'poligono' ? null : 'poligono');
    });
    if (btnPin) btnPin.addEventListener('click', function () {
      limpiarCirculoBusqueda();
      if (_onActivar) _onActivar();
      activar(herramienta === 'circunferencia' ? null : 'circunferencia');
    });
    if (btnDeshacer) btnDeshacer.addEventListener('click', function () {
      var f = figuras.pop();
      if (!f) return;
      if (mapa) mapa.removeLayer(f.capa);
      refrescarBotones();
      _avisar('', false);
    });
    refrescarBotones();
  }

  function datosDe(tipo) {
    return figuras.filter(function (f) { return f.tipo === tipo; }).map(function (f) { return f.datos; });
  }

  function limpiar() {
    if (mapa) figuras.forEach(function (f) { if (mapa.hasLayer(f.capa)) mapa.removeLayer(f.capa); });
    figuras = [];
    activar(null);
    refrescarBotones();
  }

  // Figuras vivas para el resto de la página: el form #fndInm del toolbox las
  // adjunta a su POST para que la superficie dibujada mande SIEMPRE sobre
  // lat/lng/dist (plan figuras-sobrescriben-geografia, D2/D3).
  window.STT_MAP_FIGURAS = function () {
    return { poligono: datosDe('poligono'), circunferencia: datosDe('circunferencia') };
  };

  window.STT_FIGURAS = {
    bind: bind,
    conectarMapa: conectarMapa,
    datosDe: datosDe,
    hayFiguras: function () { return figuras.length > 0; },
    limpiar: limpiar,
    LIMITE: LIMITE,
    RADIO_MIN: RADIO_MIN,
    PUNTOS_MIN: PUNTOS_MIN,
    PUNTOS_MAX: PUNTOS_MAX,
    TOLERANCIA_PX: TOLERANCIA_PX
  };
})();
