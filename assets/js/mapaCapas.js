/**
 * mapaCapas.js — toolbox de capas del mapa unificado (esquina inferior
 * izquierda). Pedido del dueño 2026-11-21.
 *
 * - Selector de tipo de mapa: Calles (OSM) / Satélite (Esri) / Relieve
 *   (OpenTopoMap). Usa window.STT_MAPA_BASE que expone mapa.js.
 * - Checkbox «Ruido»: malla fina del raster (~120 m, endpoint
 *   statetty/ruido/malla) — diferencia cuadra a cuadra. Si hay figuras
 *   dibujadas con ✏️ (btn-lapiz) o 📍 (btn-pin) la capa se limita a esas
 *   zonas; si no, cubre la vista actual y se actualiza al mover el mapa.
 *   Solo hay datos para Santa Cruz (sczmicros); fuera de cobertura avisa.
 * - Checkbox «Rutas de micros»: pinta TODAS las líneas que cruzan la zona
 *   (endpoint statetty/rutasMicros/capas) + los resultados de búsqueda del
 *   toolbox (vía window.STT_RUTAS_MICROS).
 *
 * La capa de ruido también se puede alternar desde la sección «Ruido urbano»
 * del toolbox de rutas (botón stt-rm-mostrar-ruido → STT_CAPAS.ruido.alternar).
 */
(function () {
  'use strict';

  if (window.__mapaCapasInit) return;
  window.__mapaCapasInit = true;

  var API_CELDAS = 'statetty/ruido/malla';
  var API_CLIMA_CELDAS = 'statetty/clima/celdas';
  var API_VERDE_CELDAS = 'statetty/verde/celdas';
  var API_RUTAS_CAPAS = 'statetty/rutasMicros/capas';
  var API_LEYENDA = 'statetty/ruido/leyenda';

  var mapa = null;
  var control = null;
  var selTipo = null, chkRuido = null, chkRutas = null,
      chkVerdeSat = null, chkVerdeCalle = null;
  var chkTemp = null, chkAmp = null, chkLluvia = null;
  var estRuido = null, leyendaBox = null;
  var panelCapas = null, panelHome = null;

  var capaRuido = null;          // L.layerGroup con los cuadros de la malla
  var ruidoActivo = false;
  var ruidoCargando = false;
  var peticionRuido = 0;
  var leyendaCats = null;
  var cacheCeldas = {};          // key bbox+figuras → respuesta
  var debounceMove = null;

  // ── capa de rutas de micros (red completa de la zona) ──
  var capaRed = null;
  var redActiva = false;
  var cacheRed = {};
  var peticionRed = 0;

  // ── capa de clima (temperature/lluvia por celda) ──
  var capaClima = null;
  var climaModo = null;          // 'temp' | 'amplitud' | 'lluvia'
  var cacheClima = {};
  var peticionClima = 0;

  // ── capas de índice verde ────────────────────────────────────────────────
  // Dos vistas comparables sobre la misma consulta /verde/celdas:
  //  satélite → copa arbórea vista desde arriba (Sentinel-2, relleno)
  //  calle    → verde que ve el peatón (GVI sobre panos GSV, anillo)
  // Solapadas se lee la divergencia: copa alta + anillo rojo = verde
  // privado (patios) vs verde experimentable en la vereda.
  var capaVerdeSat = null, capaVerdeCalle = null;
  var verdeSatActivo = false, verdeCalleActivo = false;
  var cacheVerde = {};
  var peticionVerde = 0;

  // ── helpers de sesión / red ────────────────────────────────────────────────
  function sesionActiva() {
    var token = window.STT && window.STT.getToken ? window.STT.getToken() : '';
    var u = window.STT && window.STT.getUsuario ? window.STT.getUsuario() : null;
    return !!(token && u && u.hasTime);
  }

  function baseApi() {
    return (window.STATETTY_CONFIG && STATETTY_CONFIG.WS_API_BASE) || '';
  }

  function tokenFresco() {
    return (window.STT && window.STT.getTokenFresco)
      ? window.STT.getTokenFresco()
      : Promise.resolve(window.STT && window.STT.getToken ? window.STT.getToken() : '');
  }

  function getAuthed(url) {
    return tokenFresco().then(function (token) {
      return fetch(baseApi() + url, {
        headers: token ? { 'Authorization': 'Bearer ' + token } : {}
      });
    });
  }

  // Escribe el estado del ruido en el control y en la sección del toolbox
  // de rutas (si existe) para que ambos lugares muestren lo mismo.
  function avisarRuido(txt, esError) {
    if (estRuido) {
      estRuido.textContent = txt || '';
      estRuido.className = 'stt-capas-estado' + (esError ? ' error' : '');
    }
    var res = document.getElementById('stt-rm-resultados-ruido');
    if (res) {
      res.innerHTML = txt
        ? '<div class="stt-rm-item' + (esError ? ' error' : '') + '">' + txt + '</div>'
        : '';
    }
  }

  // ── geometría de figuras (✏️ polígono / 📍 circunferencia) ────────────────
  function figurasActuales() {
    try {
      if (window.STT_MAP_FIGURAS) return window.STT_MAP_FIGURAS() || {};
    } catch (e) {}
    return {};
  }

  function hayFiguras(fig) {
    return !!((fig.poligono && fig.poligono.length) || (fig.circunferencia && fig.circunferencia.length));
  }

  function bboxDeFiguras(fig) {
    var b = null;
    function ext(lat, lng) {
      if (!b) { b = { minLat: lat, maxLat: lat, minLng: lng, maxLng: lng }; return; }
      if (lat < b.minLat) b.minLat = lat; if (lat > b.maxLat) b.maxLat = lat;
      if (lng < b.minLng) b.minLng = lng; if (lng > b.maxLng) b.maxLng = lng;
    }
    (fig.poligono || []).forEach(function (p) {
      (p.puntos || []).forEach(function (pt) { ext(pt.lat, pt.lng); });
    });
    (fig.circunferencia || []).forEach(function (c) {
      var dLat = c.radio / 111320;
      var dLng = c.radio / (111320 * Math.max(0.2, Math.cos(c.lat * Math.PI / 180)));
      ext(c.lat - dLat, c.lng - dLng); ext(c.lat - dLat, c.lng + dLng);
      ext(c.lat + dLat, c.lng - dLng); ext(c.lat + dLat, c.lng + dLng);
    });
    return b;
  }

  function puntoEnPoligono(lng, lat, puntos) {
    var dentro = false;
    for (var i = 0, j = puntos.length - 1; i < puntos.length; j = i++) {
      var pi = puntos[i], pj = puntos[j];
      if (((pi.lat > lat) !== (pj.lat > lat)) &&
          (lng < (pj.lng - pi.lng) * (lat - pi.lat) / (pj.lat - pi.lat) + pi.lng)) {
        dentro = !dentro;
      }
    }
    return dentro;
  }

  function distM(lat1, lng1, lat2, lng2) {
    var dx = (lng2 - lng1) * 111320 * Math.cos((lat1 + lat2) / 2 * Math.PI / 180);
    var dy = (lat2 - lat1) * 110540;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ¿El centro de la celda cae dentro de alguna figura dibujada?
  function dentroDeFiguras(centro, fig) {
    var lng = centro[0], lat = centro[1];
    var polis = fig.poligono || [], cirs = fig.circunferencia || [];
    for (var i = 0; i < polis.length; i++) {
      if (puntoEnPoligono(lng, lat, polis[i].puntos || [])) return true;
    }
    for (var k = 0; k < cirs.length; k++) {
      var c = cirs[k];
      if (distM(lat, lng, c.lat, c.lng) <= (c.radio || 0)) return true;
    }
    return false;
  }

  // ── capa de ruido ──────────────────────────────────────────────────────────
  // Índice efectivo: el solapamiento de muchas rutas sube el piso del
  // etiquetado (44 rutas encima no puede verse «Moderado'). Regla del dueño.
  function idxEfectivo(ruido, rutas) {
    var piso = (rutas >= 50) ? 85 : (rutas >= 25 ? 60 : 0);
    return Math.max(ruido || 0, piso);
  }
  function colorRuido(v, rutas) {
    v = idxEfectivo(v, rutas);
    if (v <= 0) return '#e5e7eb';
    if (v <= 25) return '#fde047';
    if (v <= 55) return '#f97316';
    if (v <= 80) return '#ef4444';
    return '#7c3aed';
  }

  function etiquetaRuido(c) {
    var v = idxEfectivo(c.ruido, c.rutas);
    if (c.ruido == null) return 'Sin datos';
    if (v <= 0) return 'Sin aporte de buses';
    if (v <= 25) return 'Bajo';
    if (v <= 55) return 'Moderado';
    if (v <= 80) return 'Alto';
    return 'Intenso';
  }

  var rendererRuido = null;
  function pintarCeldas(celdas, pasoM) {
    if (!mapa) return;
    if (!capaRuido) capaRuido = L.layerGroup().addTo(mapa);
    if (!rendererRuido) rendererRuido = L.canvas({ padding: 0.5 });
    capaRuido.clearLayers();
    var pintadas = 0;
    celdas.forEach(function (c) {
      // malla: anillo [lng,lat]; celdas H3 (endpoint viejo): poligono igual
      var ring = c.anillo || c.poligono;
      if (!Array.isArray(ring) || ring.length < 4) return;
      // GeoJSON [lng,lat] → Leaflet [lat,lng]
      var coords = ring.map(function (p) { return [p[1], p[0]]; });
      var color = colorRuido(c.ruido, c.rutas);
      var poly = L.polygon(coords, {
        color: color, weight: 0.6, opacity: 0.9,
        fillColor: color, fillOpacity: c.ruido > 0 ? 0.5 : 0.35,
        renderer: rendererRuido
      });
      poly.bindTooltip(
        '<b>' + etiquetaRuido(c) + '</b> · índice ' + (c.ruido == null ? '—' : c.ruido) +
        (c.max != null ? ' (pico ' + c.max + ')' : '') +
        (c.rutas ? ' · ' + c.rutas + ' rutas' : '') +
        (c.distM != null ? ' · a ' + c.distM + ' m de la ruta más cercana' : ''),
        { sticky: true }
      );
      poly.addTo(capaRuido);
      pintadas++;
    });
    if (!pintadas) {
      avisarRuido('No hay celdas con datos de ruido en esta zona.', true);
      return;
    }
    var maxRutas = 0, maxRuido = 0;
    celdas.forEach(function (c) {
      if (c.rutas > maxRutas) maxRutas = c.rutas;
      if (c.ruido > maxRuido) maxRuido = c.ruido;
    });
    avisarRuido(pintadas + ' zonas (~' + (pasoM || pasoRuidoActual) + ' m) · índice máx ' + maxRuido +
      (maxRutas ? ' · hasta ' + maxRutas + ' rutas solapadas' : '') +
      '. Pasa el cursor para ver el detalle.', false);
  }

  function pintarLeyenda() {
    if (!leyendaBox) return;
    leyendaBox.innerHTML = '';
    var cats = leyendaCats || [
      { min: 0, max: 0, label: 'Sin aporte de buses', color: '#e5e7eb' },
      { min: 1, max: 25, label: 'Bajo', color: '#fde047' },
      { min: 26, max: 55, label: 'Moderado', color: '#f97316' },
      { min: 56, max: 80, label: 'Alto', color: '#ef4444' },
      { min: 81, max: 100, label: 'Intenso', color: '#7c3aed' }
    ];
    cats.forEach(function (c) {
      var row = document.createElement('div');
      row.className = 'stt-capas-leyenda-row';
      row.innerHTML = '<span class="stt-capas-chip" style="background:' + c.color + '"></span>' + c.label;
      leyendaBox.appendChild(row);
    });
  }

  function cargarLeyenda() {
    if (leyendaCats) { pintarLeyenda(); return; }
    getAuthed(API_LEYENDA).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.categorias) { leyendaCats = d.categorias; pintarLeyenda(); }
    }).catch(function () {});
  }

  function bboxDeZona(fig) {
    if (hayFiguras(fig)) return bboxDeFiguras(fig);
    var b = mapa.getBounds();
    return { minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() };
  }

  function claveZona(fig, bb) {
    var partes = [bb.minLng.toFixed(4), bb.minLat.toFixed(4), bb.maxLng.toFixed(4), bb.maxLat.toFixed(4)];
    if (hayFiguras(fig)) {
      // hash simple de la geometría: distingue figuras distintas en la misma zona
      var s = JSON.stringify(fig), h = 0;
      for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
      partes.push('f' + h);
    }
    return partes.join(',');
  }

  var reqId = 0;

  function terminarCeldas(d, fig) {
    var celdas = d.celdas || [];
    if (hayFiguras(fig)) {
      celdas = celdas.filter(function (c) {
        return c.centro && dentroDeFiguras(c.centro, fig);
      });
    }
    if (!celdas.length) {
      pintarCeldas([], d && d.pasoM);
      avisarRuido(hayFiguras(fig)
        ? 'La zona marcada no tiene datos de ruido (cobertura: Santa Cruz).'
        : 'Esta vista no tiene datos de ruido (cobertura: Santa Cruz).', true);
      leyendaBox.style.display = 'none';
      return;
    }
    pintarCeldas(celdas, d && d.pasoM);
    cargarLeyenda();
    if (leyendaBox) leyendaBox.style.display = '';
  }

  // Paso de la malla según el tamaño de la zona: figuras o vista de pocos
  // cientos de metros → 30 m (detalle de cuadra); zona media → 60 m;
  // vista de ciudad → 120 m. El servidor auto-coarsen si hace falta.
  function pasoSegunZona(bb) {
    var w = distM(bb.minLat, bb.minLng, bb.minLat, bb.maxLng);
    var h = distM(bb.minLat, bb.minLng, bb.maxLat, bb.minLng);
    var max = Math.max(w, h);
    if (max <= 1500) return 30;
    if (max <= 4000) return 60;
    return 120;
  }
  var pasoRuidoActual = 120;

  function actualizarRuido() {
    if (!ruidoActivo || !mapa) return;
    // El ruido es público (regla del dueño): sin sesión también se muestra.
    var fig = figurasActuales();
    var bb = bboxDeZona(fig);
    var paso = pasoSegunZona(bb);
    pasoRuidoActual = paso;
    var clave = claveZona(fig, bb) + '|p' + paso;
    reqId++;
    var miReq = reqId;
    peticionRuido = miReq;
    avisarRuido('Cargando ruido…', false);
    if (cacheCeldas[clave]) { terminarCeldas(cacheCeldas[clave], fig); return; }
    ruidoCargando = true;
    var q = 'minLng=' + bb.minLng + '&minLat=' + bb.minLat +
            '&maxLng=' + bb.maxLng + '&maxLat=' + bb.maxLat + '&paso=' + paso;
    getAuthed(API_CELDAS + '?' + q).then(function (r) {
      if (r.status === 401 || r.status === 403) { avisarRuido('No se pudo cargar el ruido.', true); return null; }
      if (r.status === 429) { avisarRuido('Demasiadas consultas. Espera un minuto.', true); return null; }
      if (!r.ok) { avisarRuido('No se pudo cargar el ruido (' + r.status + ').', true); return null; }
      return r.json();
    }).then(function (d) {
      if (peticionRuido !== miReq || !ruidoActivo) return;
      if (!d || d.ok === false) { avisarRuido('Sin datos de ruido en esta zona.', true); return; }
      cacheCeldas[clave] = d;
      terminarCeldas(d, fig);
    }).catch(function () {
      if (peticionRuido === miReq) avisarRuido('Falló la consulta de ruido. Revisa tu conexión.', true);
    }).then(function () {
      ruidoCargando = false;
    });
  }

  // ── capa de clima ──────────────────────────────────────────────────────────
  // Métricas por celda (de /clima/celdas): actual.t, amplitud, actual.lluvia.
  function colorTemp(t) {
    if (t == null) return '#e5e7eb';
    // 15 °C azul → 22 verde → 30 naranja → 38 rojo
    var stops = [[15, 59, 130, 246], [22, 34, 197, 94], [30, 249, 115, 22], [38, 220, 38, 38]];
    for (var i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        var a = stops[i - 1], b = stops[i], k = (t - a[0]) / (b[0] - a[0]);
        return 'rgb(' + Math.round(a[1] + (b[1] - a[1]) * k) + ',' +
          Math.round(a[2] + (b[2] - a[2]) * k) + ',' + Math.round(a[3] + (b[3] - a[3]) * k) + ')';
      }
    }
    return 'rgb(180,20,20)';
  }
  function colorAmp(a) {
    if (a == null) return '#e5e7eb';
    // amplitud 0-15 °C: verde estable → rojo contrastado
    var k = Math.max(0, Math.min(1, a / 15));
    return 'hsl(' + Math.round(120 - k * 120) + ',70%,' + Math.round(45 + k * 10) + '%)';
  }
  function colorLluvia(l, prob) {
    var mm = l || 0, p = prob || 0;
    if (mm <= 0.2 && p < 20) return '#e5e7eb';
    var k = Math.max(0, Math.min(1, (mm + p * 0.1) / 20));
    return 'hsl(210,75%,' + Math.round(75 - k * 35) + '%)';
  }
  function valorClima(c, modo) {
    if (modo === 'temp') return c.actual ? c.actual.t ?? c.actual.sensacion : null;
    if (modo === 'amplitud') return c.amplitud;
    if (modo === 'lluvia') return c.actual ? { lluvia: c.actual.lluvia, prob: c.actual.probLluvia } : null;
    return null;
  }
  function colorDe(c, modo) {
    var v = valorClima(c, modo);
    if (modo === 'lluvia') return colorLluvia(v ? v.lluvia : 0, v ? v.prob : 0);
    if (modo === 'temp') return colorTemp(typeof v === 'number' ? v : null);
    return colorAmp(typeof v === 'number' ? v : null);
  }
  function etiquetaClima(c, modo) {
    var v = valorClima(c, modo);
    if (modo === 'temp') return v == null ? 'sin dato' : Math.round(v * 10) / 10 + ' °C';
    if (modo === 'amplitud') return v == null ? 'sin dato' : v + ' °C de amplitud';
    if (modo === 'lluvia') {
      if (!v) return 'sin dato';
      return (v.lluvia ? v.lluvia + ' mm' : '0 mm') + (v.prob != null ? ' · ' + v.prob + '% prob.' : '');
    }
    return '';
  }

  function pintarClima(celdas, modo) {
    if (!mapa) return;
    if (!capaClima) capaClima = L.layerGroup().addTo(mapa);
    capaClima.clearLayers();
    var pintadas = 0;
    celdas.forEach(function (c) {
      var ring = c.poligono;
      if (!Array.isArray(ring) || ring.length < 4) return;
      var coords = ring.map(function (p) { return [p[1], p[0]]; });
      var color = colorDe(c, modo);
      var poly = L.polygon(coords, {
        color: color, weight: 0.6, opacity: 0.9,
        fillColor: color, fillOpacity: 0.45
      });
      poly.bindTooltip('<b>' + etiquetaClima(c, modo) + '</b>', { sticky: true });
      poly.addTo(capaClima);
      pintadas++;
    });
    if (!pintadas) avisarRuido('No hay datos de clima en esta zona.', true);
  }

  function actualizarClima() {
    if (!climaModo || !mapa) return;
    var fig = figurasActuales();
    var bb = bboxDeZona(fig);
    var clave = 'c' + claveZona(fig, bb);
    peticionClima++;
    var miReq = peticionClima;
    if (cacheClima[clave]) { pintarClima(filtrarCeldas(cacheClima[clave], fig), climaModo); return; }
    var q = 'minLng=' + bb.minLng + '&minLat=' + bb.minLat +
            '&maxLng=' + bb.maxLng + '&maxLat=' + bb.maxLat;
    fetch(baseApi() + API_CLIMA_CELDAS + '?' + q)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (peticionClima !== miReq || !climaModo) return;
        if (!d || d.ok === false) { avisarRuido('Sin datos de clima en esta zona.', true); return; }
        cacheClima[clave] = d;
        pintarClima(filtrarCeldas(d, fig), climaModo);
      })
      .catch(function () {
        if (peticionClima === miReq) avisarRuido('Falló la consulta de clima.', true);
      });
  }

  // Filtra las celdas develtas por bbox a las que caen dentro de las figuras.
  function filtrarCeldas(d, fig) {
    var celdas = d.celdas || [];
    if (!hayFiguras(fig)) return celdas;
    return celdas.filter(function (c) {
      return c.centro && dentroDeFiguras(c.centro, fig);
    });
  }

  function activarClima(modo) {
    climaModo = modo;
    if (chkTemp) chkTemp.checked = modo === 'temp';
    if (chkAmp) chkAmp.checked = modo === 'amplitud';
    if (chkLluvia) chkLluvia.checked = modo === 'lluvia';
    if (!capaClima && mapa) capaClima = L.layerGroup().addTo(mapa);
    actualizarClima();
  }
  function desactivarClima() {
    climaModo = null;
    [chkTemp, chkAmp, chkLluvia].forEach(function (c) { if (c) c.checked = false; });
    if (capaClima && mapa) { capaClima.clearLayers(); mapa.removeLayer(capaClima); }
    capaClima = null;
  }

  // ── capa de índice verde ─────────────────────────────────────────────────
  // Rampa rojo→verde sobre greenIndex 0-100 (hoy = % copa vista por satélite;
  // el tooltip desglosa las fuentes que ya aportaron a la celda).
  function colorVerde(v) {
    if (v == null) return '#e5e7eb';
    var k = Math.max(0, Math.min(1, v / 100));
    return 'hsl(' + Math.round(k * 120) + ',60%,40%)';
  }
  function etiquetaVerde(c) {
    var v = c.verde;
    if (v == null) return 'Sin datos';
    if (v < 20) return 'Muy bajo';
    if (v < 40) return 'Bajo';
    if (v < 60) return 'Medio';
    if (v < 80) return 'Alto';
    return 'Muy alto';
  }
  function detalleVerde(c) {
    var partes = [];
    if (c.copa != null) partes.push('copa satélite ' + c.copa + ' %');
    if (c.gvi != null) partes.push('verde en calle ' + c.gvi + (c.gviPuntos ? ' (' + c.gviPuntos + ' obs.)' : ''));
    if (c.arboles) partes.push(c.arboles + ' árboles censados');
    if (!partes.length) return 'sin detalle';
    return partes.join(' · ');
  }

  function pintarVerde(celdas) {
    if (!mapa) return;
    if (verdeSatActivo && !capaVerdeSat) capaVerdeSat = L.layerGroup().addTo(mapa);
    if (verdeCalleActivo && !capaVerdeCalle) capaVerdeCalle = L.layerGroup().addTo(mapa);
    if (capaVerdeSat) capaVerdeSat.clearLayers();
    if (capaVerdeCalle) capaVerdeCalle.clearLayers();
    var nSat = 0, nCalle = 0;
    celdas.forEach(function (c) {
      var ring = c.poligono;
      if (!Array.isArray(ring) || ring.length < 4) return;
      var coords = ring.map(function (p) { return [p[1], p[0]]; });
      var tooltip =
        '<b>' + etiquetaVerde(c) + '</b> · índice verde ' + (c.verde == null ? '—' : c.verde) +
        '<br>' + detalleVerde(c);
      // satélite: hexágono relleno por % copa
      if (capaVerdeSat) {
        var colS = colorVerde(c.copa);
        L.polygon(coords, {
          color: colS, weight: 0.6, opacity: 0.9,
          fillColor: colS, fillOpacity: 0.45
        }).bindTooltip(tooltip, { sticky: true }).addTo(capaVerdeSat);
        nSat++;
      }
      // calle: anillo por GVI — se superpone al relleno satélite
      if (capaVerdeCalle && c.gvi != null) {
        L.polygon(coords, {
          color: colorVerde(c.gvi), weight: 3.5, opacity: 1,
          fill: false, interactive: false
        }).addTo(capaVerdeCalle);
        nCalle++;
      }
    });
    if (!nSat && !nCalle) {
      avisarRuido('No hay datos de índice verde en esta zona (cobertura: Santa Cruz).', true);
      return;
    }
    var msg = [];
    if (verdeSatActivo) msg.push(nSat + ' zonas vista satélite');
    if (verdeCalleActivo) msg.push(nCalle ? nCalle + ' con dato de calle (anillo)' : 'sin levantamiento callejero aquí');
    avisarRuido(msg.join(' · ') + '. Pasa el cursor para el detalle.', false);
  }

  function actualizarVerde() {
    if ((!verdeSatActivo && !verdeCalleActivo) || !mapa) return;
    var fig = figurasActuales();
    var bb = bboxDeZona(fig);
    var clave = 'v' + claveZona(fig, bb);
    peticionVerde++;
    var miReq = peticionVerde;
    if (cacheVerde[clave]) { pintarVerde(filtrarCeldas(cacheVerde[clave], fig)); return; }
    var q = 'minLng=' + bb.minLng + '&minLat=' + bb.minLat +
            '&maxLng=' + bb.maxLng + '&maxLat=' + bb.maxLat;
    fetch(baseApi() + API_VERDE_CELDAS + '?' + q)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (peticionVerde !== miReq || (!verdeSatActivo && !verdeCalleActivo)) return;
        if (!d || d.ok === false) { avisarRuido('Sin datos de índice verde en esta zona.', true); return; }
        cacheVerde[clave] = d;
        pintarVerde(filtrarCeldas(d, fig));
      })
      .catch(function () {
        if (peticionVerde === miReq) avisarRuido('Falló la consulta de índice verde.', true);
      });
  }

  function encenderVerdeSat() {
    if (!mapa) { avisarRuido('El mapa aún no está listo.', true); return; }
    verdeSatActivo = true;
    if (!capaVerdeSat) capaVerdeSat = L.layerGroup().addTo(mapa);
    actualizarVerde();
  }
  function apagarVerdeSat() {
    verdeSatActivo = false;
    if (chkVerdeSat) chkVerdeSat.checked = false;
    if (capaVerdeSat && mapa) { capaVerdeSat.clearLayers(); mapa.removeLayer(capaVerdeSat); }
    capaVerdeSat = null;
    if (!verdeCalleActivo) { peticionVerde++; avisarRuido('', false); }
  }
  function encenderVerdeCalle() {
    if (!mapa) { avisarRuido('El mapa aún no está listo.', true); return; }
    verdeCalleActivo = true;
    if (!capaVerdeCalle) capaVerdeCalle = L.layerGroup().addTo(mapa);
    actualizarVerde();
  }
  function apagarVerdeCalle() {
    verdeCalleActivo = false;
    if (chkVerdeCalle) chkVerdeCalle.checked = false;
    if (capaVerdeCalle && mapa) { capaVerdeCalle.clearLayers(); mapa.removeLayer(capaVerdeCalle); }
    capaVerdeCalle = null;
    if (!verdeSatActivo) { peticionVerde++; avisarRuido('', false); }
  }

  function encenderRuido() {
    if (!mapa) { avisarRuido('El mapa aún no está listo.', true); return; }
    // El ruido es público (regla del dueño): sin sesión también se muestra.
    ruidoActivo = true;
    if (chkRuido) chkRuido.checked = true;
    if (!capaRuido) capaRuido = L.layerGroup().addTo(mapa);
    var fig = figurasActuales();
    if (hayFiguras(fig)) {
      // centra la vista en la zona dibujada para que el ruido se vea
      var b = bboxDeFiguras(fig);
      if (b) mapa.fitBounds([[b.minLat, b.minLng], [b.maxLat, b.maxLng]], { padding: [40, 40] });
    }
    actualizarRuido();
  }

  function apagarRuido() {
    ruidoActivo = false;
    peticionRuido++;
    if (chkRuido) chkRuido.checked = false;
    if (capaRuido && mapa) { capaRuido.clearLayers(); mapa.removeLayer(capaRuido); }
    capaRuido = null;
    if (leyendaBox) leyendaBox.style.display = 'none';
    avisarRuido('', false);
  }

  function alternarRuido() {
    if (ruidoActivo) apagarRuido(); else encenderRuido();
  }

  // ── rutas de micros (capas dibujadas por rutasMicros.js) ──────────────────
  // ── red de rutas de micros (capa propia del panel) ─────────────────────────
  // A diferencia de los resultados de búsqueda del toolbox, esta capa pinta
  // TODAS las líneas que cruzan la zona (figuras o vista actual).
  function colorRuta(nombre) {
    var h = 0;
    for (var i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) | 0;
    return 'hsl(' + (Math.abs(h) % 360) + ',65%,42%)';
  }

  // Parámetros t ∈ [0,1] donde el segmento a→b cruza el borde de alguna
  // figura (unión de polígonos y círculos), ordenados e incluyendo 0 y 1.
  function cortesSegmento(latA, lngA, latB, lngB, fig) {
    var ts = [0, 1];
    var dx = lngB - lngA, dy = latB - latA;
    if (!dx && !dy) return ts;
    // círculos: |P + t·d − C| = r en metros (proyección afín local; el mismo
    // t sirve para interpolar de vuelta en grados).
    (fig.circunferencia || []).forEach(function (c) {
      var mLng = 111320 * Math.cos(c.lat * Math.PI / 180), mLat = 111320;
      var ax = (lngA - c.lng) * mLng, ay = (latA - c.lat) * mLat;
      var ex = (lngB - lngA) * mLng, ey = (latB - latA) * mLat;
      var qa = ex * ex + ey * ey;
      var qb = 2 * (ax * ex + ay * ey);
      var qc = ax * ax + ay * ay - c.radio * c.radio;
      var disc = qb * qb - 4 * qa * qc;
      if (!qa || disc <= 0) return;
      var sq = Math.sqrt(disc);
      [(-qb - sq) / (2 * qa), (-qb + sq) / (2 * qa)].forEach(function (t) {
        if (t > 1e-9 && t < 1 - 1e-9) ts.push(t);
      });
    });
    // polígonos: cruce paramétrico con cada arista, en grados (puntoEnPoligono
    // también trabaja en grados, así el test adentro/afuera es consistente).
    (fig.poligono || []).forEach(function (pol) {
      var pts = pol.puntos || [];
      for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        var ex = pts[i].lng - pts[j].lng, ey = pts[i].lat - pts[j].lat;
        var den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-12) continue;
        var qx = pts[j].lng - lngA, qy = pts[j].lat - latA;
        var t = (qx * ey - qy * ex) / den;
        var s = (qx * dy - qy * dx) / den;
        if (t > 1e-9 && t < 1 - 1e-9 && s >= -1e-9 && s <= 1 + 1e-9) ts.push(t);
      }
    });
    return ts.sort(function (a, b) { return a - b; });
  }

  // Recorta la polilínea a los tramos que caen dentro de las figuras.
  // A diferencia de un filtro por vértices, calcula el cruce real de cada
  // segmento con el borde del polígono/círculo: una ruta que atraviesa el
  // dibujo sin vértices dentro también se dibuja.
  function recortarRuta(coords, fig) {
    if (!hayFiguras(fig)) return [coords];
    var seg = [], cur = [];
    function cerrar() { if (cur.length >= 2) seg.push(cur); cur = []; }
    function interpola(a, b, t) {
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    for (var i = 1; i < coords.length; i++) {
      var a = coords[i - 1], b = coords[i];
      if (a[0] === b[0] && a[1] === b[1]) continue;
      var ts = cortesSegmento(a[0], a[1], b[0], b[1], fig);
      for (var k = 0; k + 1 < ts.length; k++) {
        var t0 = ts[k], t1 = ts[k + 1];
        if (t1 - t0 < 1e-9) continue;
        var mid = interpola(a, b, (t0 + t1) / 2);
        if (!dentroDeFiguras([mid[1], mid[0]], fig)) { cerrar(); continue; }
        if (!cur.length) cur.push(interpola(a, b, t0));
        cur.push(interpola(a, b, t1));
      }
    }
    cerrar();
    return seg;
  }

  var rendererRed = null;
  function pintarRed(rutas, fig) {
    if (!mapa) return;
    if (!capaRed) capaRed = L.layerGroup().addTo(mapa);
    if (!rendererRed) rendererRed = L.canvas({ padding: 0.5 });
    capaRed.clearLayers();
    var pintadas = 0, lineas = 0;
    rutas.forEach(function (r) {
      var coords = r.coords || [];
      if (coords.length < 2) return;
      var tramos = recortarRuta(coords, fig);
      tramos.forEach(function (seg) {
        L.polyline(seg, {
          color: colorRuta(String(r.nombre || r.route_id || '')), weight: 2.5,
          opacity: 0.55, renderer: rendererRed
        }).bindTooltip(
          '<b>' + (r.nombre || 'Ruta') + '</b>' +
          (r.direccion ? '<br>' + r.direccion : '') +
          (r.sentido ? ' · ' + r.sentido : ''),
          { sticky: true }
        ).addTo(capaRed);
        lineas++;
      });
      if (tramos.length) pintadas++;
    });
    avisarRuido(pintadas ? pintadas + ' líneas de micros en la zona (' + lineas + ' tramos). Pasa el cursor para ver el detalle.'
      : 'No hay rutas de micros en esta zona (cobertura: Santa Cruz).', !pintadas);
  }

  function actualizarRed() {
    if (!redActiva || !mapa) return;
    if (!sesionActiva()) {
      avisarRuido('Inicia sesión con una cuenta de agente para ver las rutas.', true);
      return;
    }
    var fig = figurasActuales();
    var bb = bboxDeZona(fig);
    var clave = 'r' + claveZona(fig, bb);
    peticionRed++;
    var miReq = peticionRed;
    if (cacheRed[clave]) { pintarRed(cacheRed[clave], fig); return; }
    var q = 'minLng=' + bb.minLng + '&minLat=' + bb.minLat +
            '&maxLng=' + bb.maxLng + '&maxLat=' + bb.maxLat;
    getAuthed(API_RUTAS_CAPAS + '?' + q).then(function (r) {
      if (r.status === 401 || r.status === 403) { avisarRuido('Inicia sesión con una cuenta de agente para ver las rutas.', true); return null; }
      if (r.status === 429) { avisarRuido('Demasiadas consultas. Espera un minuto.', true); return null; }
      if (!r.ok) { avisarRuido('No se pudieron cargar las rutas (' + r.status + ').', true); return null; }
      return r.json();
    }).then(function (d) {
      if (peticionRed !== miReq || !redActiva) return;
      if (!d || d.ok === false) { avisarRuido('Sin datos de rutas en esta zona.', true); return; }
      cacheRed[clave] = d.rutas || [];
      pintarRed(cacheRed[clave], fig);
    }).catch(function () {
      if (peticionRed === miReq) avisarRuido('Falló la consulta de rutas.', true);
    });
  }

  function encenderRed() {
    if (!mapa) { avisarRuido('El mapa aún no está listo.', true); return; }
    if (!sesionActiva()) {
      avisarRuido('Inicia sesión con una cuenta de agente para ver las rutas.', true);
      if (chkRutas) chkRutas.checked = false;
      return;
    }
    redActiva = true;
    if (!capaRed) capaRed = L.layerGroup().addTo(mapa);
    alternarRutas(true);          // también muestra resultados de búsqueda si los hay
    actualizarRed();
  }

  function apagarRed() {
    redActiva = false;
    peticionRed++;
    if (capaRed && mapa) { capaRed.clearLayers(); mapa.removeLayer(capaRed); }
    capaRed = null;
    alternarRutas(false);
  }

  function alternarRutas(visible) {
    if (window.STT_RUTAS_MICROS && window.STT_RUTAS_MICROS.alternar) {
      window.STT_RUTAS_MICROS.alternar(visible);
    }
  }

  // ── tipo de mapa ───────────────────────────────────────────────────────────
  function cambiarTipo() {
    if (window.STT_MAPA_BASE && selTipo) {
      window.STT_MAPA_BASE.cambiar(selTipo.value);
    }
  }

  // ── montaje del control ────────────────────────────────────────────────────
  var CSS_ID = 'stt-capas-styles';
  function inyectarEstilos() {
    if (document.getElementById(CSS_ID)) return;
    var s = document.createElement('style');
    s.id = CSS_ID;
    s.textContent =
      '.stt-capas{background:rgba(255,255,255,.95);border:1px solid #cfe9f5;border-radius:10px;' +
        'padding:8px 10px;font-size:12px;color:#04364a;line-height:1.6;min-width:170px;}' +
      '.stt-capas-tit{font-weight:700;margin-bottom:4px;}' +
      '.stt-capas label{display:flex;align-items:center;gap:6px;margin:2px 0;cursor:pointer;}' +
      '.stt-capas select{flex:1;padding:2px 4px;border:1px solid #cfe9f5;border-radius:6px;' +
        'font-size:12px;color:#04364a;background:#fff;}' +
      '.stt-capas-estado{margin-top:6px;font-size:11px;color:#074f66;line-height:1.4;min-height:1em;}' +
      '.stt-capas-estado.error{color:#b3261e;}' +
      '.stt-capas-leyenda{margin-top:6px;border-top:1px dashed #d9ecf5;padding-top:5px;display:none;}' +
      '.stt-capas-leyenda-row{white-space:nowrap;font-size:11px;}' +
      '.stt-capas-sub{margin-top:6px;font-weight:700;border-top:1px dashed #d9ecf5;padding-top:4px;}' +
      // Subir el control para no pisar el botón de menú admin (esquina inf-izq).
      '.leaflet-control.stt-capas{margin-bottom:72px;}' +
      '.stt-capas-chip{display:inline-block;width:10px;height:10px;border-radius:2px;' +
        'margin-right:5px;vertical-align:-1px;}' +
      // #caja (z-index 1100) ocupa el centro o la base según el estado del
      // mapa. El panel de capas siempre flota como icono/toolbox justo sobre
      // la caja (z-index 1150, bajo el header) para que nunca se solapen:
      // si estorba, basta un toque para plegarlo a icono.
      // Icono/toolbox a la IZQUIERDA, base a la altura de la caja (nunca la
      // solapa). Estado abierto/cerrado persistente (localStorage).
      '.stt-capas-movil{position:fixed;left:12px;transform:none;' +
        'z-index:1150;display:none;flex-direction:column;align-items:flex-start;gap:0;' +
        'transition:bottom .5s ease,left .5s ease;}' +
      '.stt-capas-movil.visible{display:flex;}' +
      // Caja desplegada por encima de los iconos (el icono de equipamientos
      // vive en la misma zona); iconos solapados quedan en 1150.
      '.stt-capas-movil:not(.colapsado){z-index:1160;}' +
      '.stt-capas-movil .stt-capas{margin:0;max-width:86vw;}' +
      '.stt-capas-movil.colapsado .stt-capas{display:none;}' +
      '.stt-capas-movil:not(.colapsado) .stt-capas-icono{display:none;}' +
      '.stt-capas-icono{width:44px;height:44px;border-radius:50%;padding:0;' +
        'border:1px solid #cfe9f5;background:rgba(255,255,255,.95);color:#04364a;' +
        'font-size:20px;line-height:1;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25);}' +
      '.stt-capas-icono:active{transform:scale(.94);}' +
      '.stt-capas-tit{display:flex;align-items:center;justify-content:space-between;gap:10px;}' +
      '.stt-capas-cerrar{display:none;border:0;background:none;color:#04364a;' +
        'font-size:15px;line-height:1;cursor:pointer;padding:2px 4px;opacity:.7;}' +
      '.stt-capas-cerrar:hover{opacity:1;}' +
      '.stt-capas-movil .stt-capas-cerrar{display:inline-flex;align-items:center;justify-content:center;}';
    document.head.appendChild(s);
  }

  function montarControl() {
    if (control || !mapa) return;
    inyectarEstilos();
    control = L.control({ position: 'bottomleft' });
    control.onAdd = function () {
      var div = L.DomUtil.create('div', 'stt-capas');
      panelCapas = div;
      div.innerHTML =
        '<div class="stt-capas-tit"><span>🗺️ Capas</span>' +
          '<button type="button" class="stt-capas-cerrar" id="stt-capas-cerrar" ' +
            'title="Cerrar" aria-label="Cerrar capas">✕</button></div>' +
        '<label>Tipo de mapa <select id="stt-capa-tipo">' +
          '<option value="calles">Calles</option>' +
          '<option value="satelite">Satélite</option>' +
          '<option value="relieve">Relieve</option>' +
        '</select></label>' +
        '<label><input type="checkbox" id="stt-capa-ruido"> Ruido</label>' +
        '<label><input type="checkbox" id="stt-capa-rutas"> Rutas de micros</label>' +
        '<div class="stt-capas-sub">Clima</div>' +
        '<label title="Temperatura actual en cada zona (°C), de Open-Meteo. Áreas cálidas en rojo, frescas en azul.">' +
          '<input type="checkbox" id="stt-capa-temp"> Temperatura actual</label>' +
        '<label title="Amplitud anual = diferencia entre el mes más caliente y el más frío del clima típico (NASA POWER, 25 años). Verde = clima estable todo el año; rojo = veranos muy calurosos e inviernos frescos.">' +
          '<input type="checkbox" id="stt-capa-amp"> Amplitud anual</label>' +
        '<label title="Lluvia de hoy en cada zona: milímetros caídos y probabilidad del día (pronóstico Open-Meteo, 7 días).">' +
          '<input type="checkbox" id="stt-capa-lluvia"> Lluvia hoy</label>' +
        '<div class="stt-capas-sub">Verde</div>' +
        '<label title="Copa arbórea vista por satélite (Sentinel-2), 0–100 por zona. Verde intenso = más cubierta; rojo = zona desnuda. Cobertura: Santa Cruz de la Sierra.">' +
          '<input type="checkbox" id="stt-capa-verde-sat"> Verde satélite</label>' +
        '<label title="Verde que ve el peatón: índice GVI 0–100 calculado sobre panoramas de calle (anillo sobre el hexágono). Verde intenso = calle muy arbolada; rojo = vereda desnuda. Cobertura: levantamiento por distritos de SCZ.">' +
          '<input type="checkbox" id="stt-capa-verde-calle"> Verde en calle</label>' +
        '<div class="stt-capas-estado" id="stt-capa-estado"></div>' +
        '<div class="stt-capas-leyenda" id="stt-capas-leyenda"></div>';
      selTipo = div.querySelector('#stt-capa-tipo');
      chkRuido = div.querySelector('#stt-capa-ruido');
      chkRutas = div.querySelector('#stt-capa-rutas');
      estRuido = div.querySelector('#stt-capa-estado');
      leyendaBox = div.querySelector('#stt-capas-leyenda');
      if (window.STT_MAPA_BASE) selTipo.value = window.STT_MAPA_BASE.actual || 'calles';
      // «Rutas de micros» arranca deschequeado: solo se marca al encender la
      // capa (checkbox propio o evento stt:rutas-dibujadas). Marcarlo aquí sin
      // activar la red dejaba un estado fantasma (pedido del dueño 2026-11-24).
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
      div.querySelector('#stt-capas-cerrar').addEventListener('click', cerrarCapasMovil);
      selTipo.addEventListener('change', cambiarTipo);
      chkRuido.addEventListener('change', function () {
        if (chkRuido.checked) encenderRuido(); else apagarRuido();
      });
      chkTemp = div.querySelector('#stt-capa-temp');
      chkAmp = div.querySelector('#stt-capa-amp');
      chkLluvia = div.querySelector('#stt-capa-lluvia');
      chkRutas.addEventListener('change', function () {
        if (chkRutas.checked) encenderRed(); else apagarRed();
      });
      chkTemp.addEventListener('change', function () {
        if (chkTemp.checked) activarClima('temp'); else desactivarClima();
      });
      chkAmp.addEventListener('change', function () {
        if (chkAmp.checked) activarClima('amplitud'); else desactivarClima();
      });
      chkLluvia.addEventListener('change', function () {
        if (chkLluvia.checked) activarClima('lluvia'); else desactivarClima();
      });
      chkVerdeSat = div.querySelector('#stt-capa-verde-sat');
      chkVerdeCalle = div.querySelector('#stt-capa-verde-calle');
      chkVerdeSat.addEventListener('change', function () {
        if (chkVerdeSat.checked) encenderVerdeSat(); else apagarVerdeSat();
      });
      chkVerdeCalle.addEventListener('change', function () {
        if (chkVerdeCalle.checked) encenderVerdeCalle(); else apagarVerdeCalle();
      });
      return div;
    };
    control.addTo(mapa);
  }

  function esperarMapa() {
    if (window.map) { conectarMapa(window.map); return; }
    var intentos = 0;
    var iv = setInterval(function () {
      intentos++;
      if (window.map) { clearInterval(iv); conectarMapa(window.map); }
      else if (intentos > 80) clearInterval(iv);
    }, 250);
  }

  function conectarMapa(m) {
    if (mapa) return;
    mapa = m;
    montarControl();
    iniciarModoMovil();
    // Sin figuras dibujadas, la zona de ruido sigue la vista del usuario.
    mapa.on('moveend', function () {
      if (mapa && !hayFiguras(figurasActuales())) {
        clearTimeout(debounceMove);
        debounceMove = setTimeout(function () {
          if (ruidoActivo) actualizarRuido();
          if (climaModo) actualizarClima();
          if (redActiva) actualizarRed();
          if (verdeSatActivo || verdeCalleActivo) actualizarVerde();
        }, 600);
      }
    });
    // Las figuras (✏️/📍) cambian la zona de ruido/clima/rutas si están activas.
    document.addEventListener('stt:figuras-cambio', function () {
      if (ruidoActivo) actualizarRuido();
      if (climaModo) actualizarClima();
      if (redActiva) actualizarRed();
      if (verdeSatActivo || verdeCalleActivo) actualizarVerde();
    });
    // Cuando rutasMicros dibuja rutas, el check «Rutas de micros» se marca
    // y se muestra la capa (si estaba oculta).
    document.addEventListener('stt:rutas-dibujadas', function () {
      if (chkRutas && !chkRutas.checked) { chkRutas.checked = true; encenderRed(); }
    });
  }

  // ── modo flotante: el panel siempre vive como icono sobre la caja ─────────
  // Cualquier tamaño de pantalla y cualquier posición de #caja: el panel de
  // capas se muda a un contenedor fijo alineado al borde izquierdo de la caja
  // y siempre ~10 px por encima de ella (transición propia que la sigue al
  // moverse), nunca la solapa. Estado natural: icono 🗂️ (persistido en
  // localStorage). Se despliega con el icono / cierra con ✕ (z-index 1150 >
  // caja 1100), por click en la caja o en el mapa.
  var movilBox = null, btnIcono = null, cajaEl = null;
  var modoMovil = false, capasAbiertas = false;
  var cajaObs = null, movListenersOk = false;

  function posicionarMovil() {
    if (!movilBox || !cajaEl) return;
    var r = cajaEl.getBoundingClientRect();
    movilBox.style.bottom = Math.max(8, window.innerHeight - r.top + 10) + 'px';
    movilBox.style.left = Math.max(8, r.left) + 'px';   // borde izquierdo de la caja
  }

  // Estado persistido: primera vez icono; luego se recuerda lo elegido.
  function setAbiertasMovil(v) {
    capasAbiertas = !!v;
    if (movilBox) movilBox.classList.toggle('colapsado', !capasAbiertas);
    if (btnIcono) btnIcono.setAttribute('aria-expanded', String(capasAbiertas));
    try { localStorage.setItem('stt-capas-abierto', capasAbiertas ? '1' : '0'); } catch (e) {}
  }

  function cerrarCapasMovil() { setAbiertasMovil(false); }

  function abiertasGuardadas() {
    try { return localStorage.getItem('stt-capas-abierto') === '1'; } catch (e) {}
    return false;
  }

  function evaluarModoMovil() {
    var activo = !!panelCapas;
    if (activo === modoMovil) { if (activo) posicionarMovil(); return; }
    modoMovil = activo;
    if (!movilBox) return;
    if (activo) {
      if (panelHome == null) panelHome = panelCapas.parentNode;
      movilBox.appendChild(panelCapas);
      setAbiertasMovil(abiertasGuardadas());   // recuerda el estado; 1.ª vez = icono
      movilBox.classList.add('visible');
      posicionarMovil();
    } else {
      movilBox.classList.remove('visible', 'colapsado');
      if (panelHome && panelCapas.parentNode !== panelHome) panelHome.appendChild(panelCapas);
    }
  }

  function iniciarModoMovil() {
    if (movListenersOk) return;
    movListenersOk = true;
    cajaEl = document.getElementById('caja');
    if (!cajaEl || typeof MutationObserver !== 'function') return;
    movilBox = document.createElement('div');
    movilBox.id = 'stt-capas-movil';
    movilBox.className = 'stt-capas-movil colapsado';
    btnIcono = document.createElement('button');
    btnIcono.type = 'button';
    btnIcono.className = 'stt-capas-icono';
    btnIcono.title = 'Capas del mapa';
    btnIcono.setAttribute('aria-label', 'Capas del mapa');
    btnIcono.setAttribute('aria-expanded', 'false');
    btnIcono.textContent = '🗂️';
    btnIcono.addEventListener('click', function () {
      if (!modoMovil) return;
      setAbiertasMovil(!capasAbiertas);
    });
    movilBox.appendChild(btnIcono);
    document.body.appendChild(movilBox);
    // La caja baja al pie por zoom (colocarCaja) o por buscar/dibujar
    // (fijarAbajo): ambos cambian su className → observer. Click en la caja
    // o su regreso al centro también repliega el panel a icono.
    cajaObs = new MutationObserver(function () { evaluarModoMovil(); });
    cajaObs.observe(cajaEl, { attributes: true, attributeFilter: ['class'] });
    cajaEl.addEventListener('click', function () {
      if (modoMovil && capasAbiertas) cerrarCapasMovil();
    });
    // La caja tiene transición de .5 s: el icono se reubica al empezar el
    // desplazamiento (su propia transición lo hace seguir a la caja) y ante
    // resize/orientación.
    cajaEl.addEventListener('transitionstart', function (e) {
      if (e.propertyName === 'top' || e.propertyName === 'transform') posicionarMovil();
    });
    cajaEl.addEventListener('transitionend', function (e) {
      if (e.propertyName === 'top' || e.propertyName === 'transform') posicionarMovil();
    });
    window.addEventListener('resize', posicionarMovil);
    window.addEventListener('orientationchange', posicionarMovil);
    if (mapa) {
      mapa.on('click', function () { if (modoMovil && capasAbiertas) cerrarCapasMovil(); });
    }
    evaluarModoMovil();
  }

  // API para el botón de la sección «Ruido urbano» del toolbox de rutas.
  window.STT_CAPAS = {
    ruido: {
      alternar: alternarRuido,
      encender: encenderRuido,
      apagar: apagarRuido,
      activo: function () { return ruidoActivo; }
    }
  };

  function init() {
    inyectarEstilos();
    esperarMapa();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
