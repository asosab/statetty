/**
 * rutasMicros.js — Statetty
 * -----------------------------------------------------------------------
 * Toolbox "🚌 Rutas de micros" para /maps/find/ (Fase 1 del plan
 * opencode/statetty.com/PLAN/rutas-micros-toolbox.md).
 *
 * - Se monta como slot al FINAL de #toolbox (no es un .section directo:
 *   mapa.js referencia secciones por posición, ej. ".section:nth-child(2)").
 * - Gate: solo usuarios con sesión Buddy y tiempo de uso (usuario.hasTime),
 *   igual que la #caja de mapa.js.
 * - Punto inicial: ubicación del navegador (solo bajo click) o click en el mapa.
 *   Punto final: click en el mapa.
 * - POST statetty/rutasMicros {origen, destino} → hasta 3 opciones
 *   (máx 2 líneas / 1 trasbordo, ≤1500 m a pie). Cada tarjeta pinta la ruta.
 *
 * No modifica mapa.js, menuUser.js ni fndInm.js. Cache-bust en
 * maps/find/index.html.
 */
(function () {
  'use strict';

  if (window.__rutasMicrosInit) return;
  window.__rutasMicrosInit = true;

  var SLOT_ID = 'stt-rutasmicros-slot';
  var STYLE_ID = 'stt-rutasmicros-styles';
  var API = 'statetty/rutasMicros';
  var COLORS = ['#17baef', '#7c3aed', '#0e7490'];
  var WALK_COLOR = '#f59e0b';

  var mapa = null;
  var slot = null;
  var origen = null;
  var destino = null;
  var modo = null;
  var capa = null;
  var marcadores = { origen: null, destino: null };
  var opciones = [];
  var pidiendo = false;
  var seleccion = -1;
  var el = {};

  function sesionActiva() {
    var token = window.STT && window.STT.getToken ? window.STT.getToken() : '';
    var u = window.STT && window.STT.getUsuario ? window.STT.getUsuario() : null;
    return !!(token && u && u.hasTime);
  }

  function aplicarGate() {
    if (slot) slot.style.display = sesionActiva() ? '' : 'none';
  }

  function avisar(txt, esError) {
    if (!el.estado) return;
    el.estado.textContent = txt || '';
    el.estado.className = esError ? 'error' : '';
  }

  function inyectarEstilos() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '#stt-rutasmicros-slot .stt-rm-botones{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;}' +
      '#stt-rutasmicros-slot button{cursor:pointer;border:1px solid #ccc;background:#f7f7f7;' +
        'border-radius:6px;padding:4px 8px;font-size:12px;}' +
      '#stt-rutasmicros-slot button[aria-pressed="true"]{background:#17baef;color:#fff;border-color:#17baef;}' +
      '#stt-rutasmicros-slot button:disabled{opacity:.6;cursor:wait;}' +
      '#stt-rutasmicros-slot .stt-rm-puntos{font-size:12px;color:#04364a;line-height:1.35;margin-bottom:6px;}' +
      '#stt-rm-estado{min-height:1.1em;font-size:12px;color:#04364a;margin:4px 0;}' +
      '#stt-rm-estado.error{color:#b3261e;}' +
      '.stt-rm-card{display:block;width:100%;text-align:left;margin:6px 0;padding:6px 8px;' +
        'border:1px solid #cfe9f5;border-radius:8px;background:#f2fbff;}' +
      '.stt-rm-card:hover{background:#e2f5fd;}' +
      '.stt-rm-card.activa{border-color:#17baef;background:#d9f2fd;}' +
      '.stt-rm-card-titulo{font-weight:700;font-size:12px;}' +
      '.stt-rm-card-lineas{font-size:12px;margin:1px 0;}' +
      '.stt-rm-card-detalle{font-size:11px;color:#444;}';
    document.head.appendChild(style);
  }

  var PLANTILLA =
    '<div class="section">' +
      '<div class="section-header">🚌 Rutas de micros</div>' +
      '<div class="section-body">' +
        '<div class="stt-rm-botones">' +
          '<button type="button" id="stt-rm-geo">📍 Mi ubicación</button>' +
          '<button type="button" id="stt-rm-origen" aria-pressed="false">📌 Origen</button>' +
          '<button type="button" id="stt-rm-destino" aria-pressed="false">🏁 Destino</button>' +
        '</div>' +
        '<div class="stt-rm-puntos">' +
          '<div id="stt-rm-est-origen">Origen: sin definir</div>' +
          '<div id="stt-rm-est-destino">Destino: sin definir</div>' +
        '</div>' +
        '<div class="stt-rm-botones">' +
          '<button type="button" id="stt-rm-buscar">🔍 Buscar rutas</button>' +
          '<button type="button" id="stt-rm-limpiar">✖ Limpiar</button>' +
        '</div>' +
        '<div id="stt-rm-estado" role="status" aria-live="polite"></div>' +
        '<div id="stt-rm-resultados"></div>' +
      '</div>' +
    '</div>';

  function cachear() {
    el.estado = document.getElementById('stt-rm-estado');
    el.resultados = document.getElementById('stt-rm-resultados');
    el.estOrigen = document.getElementById('stt-rm-est-origen');
    el.estDestino = document.getElementById('stt-rm-est-destino');
    el.geo = document.getElementById('stt-rm-geo');
    el.btnOrigen = document.getElementById('stt-rm-origen');
    el.btnDestino = document.getElementById('stt-rm-destino');
    el.buscar = document.getElementById('stt-rm-buscar');
    el.limpiar = document.getElementById('stt-rm-limpiar');
  }

  function textoPunto(cual) {
    var p = cual === 'origen' ? origen : destino;
    var nombre = cual === 'origen' ? 'Origen: ' : 'Destino: ';
    if (!p) return nombre + 'sin definir';
    return nombre + p.lat.toFixed(5) + ', ' + p.lng.toFixed(5);
  }

  function pintarPunto(cual) {
    if (!mapa) return;
    if (marcadores[cual]) { mapa.removeLayer(marcadores[cual]); marcadores[cual] = null; }
    var p = cual === 'origen' ? origen : destino;
    if (!p) return;
    var m = L.circleMarker([p.lat, p.lng], {
      radius: 8, color: '#04364a', weight: 2,
      fillColor: cual === 'origen' ? '#22c55e' : '#ef4444', fillOpacity: 1
    }).addTo(mapa);
    m.bindTooltip(cual === 'origen' ? 'Origen' : 'Destino',
      { permanent: true, direction: 'top', offset: [0, -8] });
    marcadores[cual] = m;
  }

  function limpiarResultados() {
    opciones = [];
    seleccion = -1;
    if (el.resultados) el.resultados.innerHTML = '';
    if (capa) capa.clearLayers();
  }

  function setPunto(cual, punto) {
    var lat = Number(punto && punto.lat), lng = Number(punto && punto.lng);
    if (!isFinite(lat) || !isFinite(lng)) return;
    if (cual === 'origen') origen = { lat: lat, lng: lng };
    else destino = { lat: lat, lng: lng };
    if (el.estOrigen) el.estOrigen.textContent = textoPunto('origen');
    if (el.estDestino) el.estDestino.textContent = textoPunto('destino');
    pintarPunto(cual);
    limpiarResultados();
    avisar('', false);
  }

  function setModo(nuevo) {
    modo = nuevo || null;
    if (el.btnOrigen) el.btnOrigen.setAttribute('aria-pressed', modo === 'origen' ? 'true' : 'false');
    if (el.btnDestino) el.btnDestino.setAttribute('aria-pressed', modo === 'destino' ? 'true' : 'false');
    if (modo) {
      avisar('Haz click en el mapa para fijar ' +
        (modo === 'origen' ? 'el punto inicial.' : 'el punto final.'), false);
    }
  }

  function onMapClick(e) {
    if (!modo || !mapa) return;
    var cont = mapa.getContainer ? mapa.getContainer() : null;
    if (cont && cont.classList && cont.classList.contains('dibujando')) {
      avisar('Termina o desactiva el dibujo de área antes de fijar el punto.', true);
      return;
    }
    var cual = modo;
    setModo(null);
    setPunto(cual, e.latlng);
  }

  function conectarMapa(m) {
    if (mapa) return;
    mapa = m;
    capa = L.layerGroup().addTo(mapa);
    mapa.on('click', onMapClick);
    if (origen) pintarPunto('origen');
    if (destino) pintarPunto('destino');
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

  function seleccionar(i) {
    var op = opciones[i];
    if (!op) return;
    seleccion = i;
    if (el.resultados) {
      var cards = el.resultados.querySelectorAll('.stt-rm-card');
      for (var k = 0; k < cards.length; k++) {
        cards[k].classList.toggle('activa', k === i);
      }
    }
    dibujar(op);
  }

  function dibujar(op) {
    if (!mapa || !capa) return;
    capa.clearLayers();
    var microIdx = 0;
    (op.tramos || []).forEach(function (t) {
      var coords = t.coords || [];
      if (coords.length < 2) return;
      if (t.tipo === 'micro') {
        L.polyline(coords, {
          color: COLORS[microIdx % COLORS.length], weight: 5, opacity: 0.85
        }).addTo(capa);
        microIdx++;
      } else {
        L.polyline(coords, {
          color: WALK_COLOR, weight: 4, dashArray: '6 6', opacity: 0.9
        }).addTo(capa);
      }
    });
    var bounds = L.latLngBounds([]);
    (op.tramos || []).forEach(function (t) {
      (t.coords || []).forEach(function (c) { bounds.extend(c); });
    });
    if (bounds.isValid()) mapa.fitBounds(bounds, { padding: [30, 30] });
  }

  function pintarOpciones(lista) {
    opciones = lista || [];
    seleccion = -1;
    if (el.resultados) el.resultados.innerHTML = '';
    if (!opciones.length) {
      avisar('Sin rutas de micros entre esos puntos (cobertura: Santa Cruz).', true);
      return;
    }
    avisar(opciones.length + (opciones.length === 1 ? ' opción encontrada' : ' opciones encontradas'), false);
    opciones.forEach(function (op, i) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'stt-rm-card';

      var titulo = document.createElement('div');
      titulo.className = 'stt-rm-card-titulo';
      titulo.textContent = 'Opción ' + (i + 1) + ' — ' +
        (op.tipo === 'trasbordo' ? 'con trasbordo' : 'directa');
      card.appendChild(titulo);

      var lineas = document.createElement('div');
      lineas.className = 'stt-rm-card-lineas';
      lineas.textContent = (op.lineas || []).map(function (l) {
        return l.linea || l.route_id || 'línea';
      }).join(' → ');
      card.appendChild(lineas);

      var detalle = document.createElement('div');
      detalle.className = 'stt-rm-card-detalle';
      detalle.textContent = '🚶 ' + Math.round(op.caminata || 0) + ' m a pie · 🚌 ' +
        ((op.recorrido || 0) / 1000).toFixed(1) + ' km';
      card.appendChild(detalle);

      card.addEventListener('click', function () { seleccionar(i); });
      el.resultados.appendChild(card);
    });
    seleccionar(0);
  }

  function buscarRutas() {
    if (pidiendo) return;
    if (!sesionActiva()) {
      avisar('Inicia sesión con una cuenta activa para calcular rutas.', true);
      aplicarGate();
      return;
    }
    if (!origen || !destino) {
      avisar('Fija el punto inicial y el punto final.', true);
      return;
    }
    pidiendo = true;
    if (el.buscar) el.buscar.disabled = true;
    avisar('Buscando rutas...', false);

    var token = window.STT && window.STT.getToken ? window.STT.getToken() : '';
    var base = (window.STATETTY_CONFIG && STATETTY_CONFIG.WS_API_BASE) || '';

    fetch(base + API, {
      method: 'POST',
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        token ? { 'Authorization': 'Bearer ' + token } : {}
      ),
      body: JSON.stringify({ origen: origen, destino: destino })
    }).then(function (r) {
      return r.json().then(function (d) { return { status: r.status, data: d }; });
    }).then(function (res) {
      if (res.status === 401) { avisar('Inicia sesión para calcular rutas.', true); return; }
      if (res.status === 403) { avisar('Tu cuenta no está activa o no tiene tiempo de uso disponible.', true); return; }
      if (res.status === 429) { avisar('Demasiadas búsquedas. Espera un minuto e intenta de nuevo.', true); return; }
      if (res.status !== 200 || !res.data || !res.data.ok) {
        avisar('No se pudieron calcular las rutas. Intenta de nuevo.', true);
        return;
      }
      pintarOpciones(res.data.opciones);
    }).catch(function () {
      avisar('Falló la búsqueda de rutas. Revisa tu conexión.', true);
    }).then(function () {
      pidiendo = false;
      if (el.buscar) el.buscar.disabled = false;
    });
  }

  function limpiar() {
    origen = null;
    destino = null;
    setModo(null);
    ['origen', 'destino'].forEach(function (c) {
      if (marcadores[c] && mapa) mapa.removeLayer(marcadores[c]);
      marcadores[c] = null;
    });
    limpiarResultados();
    if (el.estOrigen) el.estOrigen.textContent = textoPunto('origen');
    if (el.estDestino) el.estDestino.textContent = textoPunto('destino');
    avisar('', false);
  }

  function obtenerUbicacion() {
    if (!navigator.geolocation) {
      avisar('Tu navegador no permite geolocalización. Fija el origen con un click en el mapa.', true);
      return;
    }
    avisar('Obteniendo tu ubicación...', false);
    navigator.geolocation.getCurrentPosition(function (pos) {
      setModo(null);
      setPunto('origen', { lat: pos.coords.latitude, lng: pos.coords.longitude });
      avisar('Origen fijado en tu ubicación.', false);
    }, function () {
      avisar('No pudimos obtener tu ubicación. Puedes fijar el origen con un click en el mapa.', true);
    }, { enableHighAccuracy: true, timeout: 10000 });
  }

  function enlazar() {
    if (el.geo) el.geo.addEventListener('click', obtenerUbicacion);
    if (el.btnOrigen) el.btnOrigen.addEventListener('click', function () {
      setModo(modo === 'origen' ? null : 'origen');
    });
    if (el.btnDestino) el.btnDestino.addEventListener('click', function () {
      setModo(modo === 'destino' ? null : 'destino');
    });
    if (el.buscar) el.buscar.addEventListener('click', buscarRutas);
    if (el.limpiar) el.limpiar.addEventListener('click', limpiar);
  }

  function initGate() {
    aplicarGate();
    if (window.STT && window.STT.ready && typeof window.STT.ready.then === 'function') {
      window.STT.ready.then(aplicarGate);
    } else {
      document.addEventListener('statetty:key-ready', aplicarGate, { once: true });
    }
    document.addEventListener('statetty:auth-ready', aplicarGate);
  }

  function montar() {
    var toolbox = document.getElementById('toolbox');
    if (!toolbox) return false;

    inyectarEstilos();
    slot = document.getElementById(SLOT_ID);
    if (!slot) {
      slot = document.createElement('div');
      slot.id = SLOT_ID;
      toolbox.appendChild(slot);
    }
    slot.innerHTML = PLANTILLA;
    cachear();
    enlazar();
    aplicarGate();
    return true;
  }

  function init() {
    if (!montar()) return;
    esperarMapa();
    initGate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
