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
 * - POST statetty/rutasMicros {origen, destino} → hasta 7 opciones
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
  var API_MAPA = 'statetty/rutasMicros/mapa';
  var STORAGE_KEY = 'stt_rutasmicros_puntos';
  var COLORS = ['#17baef', '#7c3aed', '#0e7490'];
  var WALK_COLOR = '#f59e0b';
  var SECCIONES = ['nombre', 'origen', 'destino', 'ruido'];
  var COLOR_SECCION = { nombre: '#7c3aed', origen: '#0e7490', destino: '#f97316', ruido: '#dc2626' };

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
  var capasSeccion = {};
  var pidiendoSeccion = {};
  var peticionSeccion = {};
  var rutasOcultas = false;   // checkbox «Rutas de micros» del panel de capas
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
      '.stt-rm-card-detalle{font-size:11px;color:#444;}' +
      '#stt-rutasmicros-slot .stt-rm-seccion{margin-top:10px;border-top:1px dashed #d9ecf5;padding-top:8px;}' +
      '#stt-rutasmicros-slot .stt-rm-seccion-tit{font-size:12px;font-weight:700;color:#074f66;margin-bottom:6px;}' +
      '#stt-rutasmicros-slot .stt-rm-filtro{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px;}' +
      '#stt-rutasmicros-slot .stt-rm-filtro label{font-size:12px;font-weight:700;color:#04364a;}' +
      '#stt-rutasmicros-slot .stt-rm-filtro input{flex:1;min-width:150px;padding:4px 6px;border:1px solid #cfe9f5;' +
        'border-radius:6px;font-size:12px;color:#04364a;background:#fff;}' +
      '#stt-rutasmicros-slot .stt-rm-item{display:block;width:100%;text-align:left;margin:4px 0;padding:5px 7px;' +
        'border:1px solid #e2eef3;border-radius:7px;background:#fff;font-size:11px;color:#04364a;}' +
      '#stt-rutasmicros-slot .stt-rm-item-nom{font-weight:700;color:#074f66;}' +
      '#stt-rutasmicros-slot .stt-rm-item-det{color:#7b8f99;margin-top:1px;}' +
      '#stt-rutasmicros-slot .stt-rm-item.error{border-color:#f2c1bd;background:#fff5f4;color:#b3261e;}' +
      '.stt-rm-leyenda{background:rgba(255,255,255,.92);border:1px solid #cfe9f5;border-radius:8px;' +
        'padding:6px 8px;font-size:11px;color:#04364a;line-height:1.5;}' +
      '.stt-rm-leyenda-tit{font-weight:700;margin-bottom:2px;}' +
      '.stt-rm-leyenda-row{white-space:nowrap;}' +
      '.stt-rm-leyenda-chip{display:inline-block;width:10px;height:10px;border-radius:2px;' +
        'margin-right:5px;vertical-align:-1px;}' +
      '.stt-rm-leyenda-row em{font-style:normal;color:#7b8f99;}';
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
        '<div class="stt-rm-seccion">' +
          '<div class="stt-rm-seccion-tit">Por nombre</div>' +
          '<div class="stt-rm-filtro">' +
            '<label for="stt-rm-ruta">Ruta:</label>' +
            '<input type="text" id="stt-rm-ruta" placeholder="escribe aquí el nombre de rutas separadas por coma">' +
          '</div>' +
          '<div class="stt-rm-botones">' +
            '<button type="button" id="stt-rm-mostrar-nombre">Mostrar</button>' +
            '<button type="button" id="stt-rm-limpiar-nombre">Limpiar</button>' +
          '</div>' +
          '<div id="stt-rm-resultados-nombre"></div>' +
        '</div>' +
        '<div class="stt-rm-seccion">' +
          '<div class="stt-rm-seccion-tit">Cruzan por Origen</div>' +
          '<div class="stt-rm-botones">' +
            '<button type="button" id="stt-rm-mostrar-origen">Mostrar rutas que cruzan por Origen</button>' +
            '<button type="button" id="stt-rm-limpiar-origen">Limpiar</button>' +
          '</div>' +
          '<div id="stt-rm-resultados-origen"></div>' +
        '</div>' +
        '<div class="stt-rm-seccion">' +
          '<div class="stt-rm-seccion-tit">Cruzan por Destino</div>' +
          '<div class="stt-rm-botones">' +
            '<button type="button" id="stt-rm-mostrar-destino">Mostrar rutas que cruzan por Destino</button>' +
            '<button type="button" id="stt-rm-limpiar-destino">Limpiar</button>' +
          '</div>' +
          '<div id="stt-rm-resultados-destino"></div>' +
        '</div>' +
        '<div class="stt-rm-seccion">' +
          '<div class="stt-rm-seccion-tit">Ruido urbano</div>' +
          '<div class="stt-rm-botones">' +
            '<button type="button" id="stt-rm-mostrar-ruido">🗺️ Ruido urbano</button>' +
          '</div>' +
          '<div class="stt-rm-item-det">Se dibuja sobre la zona marcada con ✏️ o 📍; ' +
            'sin zona, sobre la vista actual (cobertura: Santa Cruz). ' +
            'También está en el panel de capas, esquina inferior izquierda.</div>' +
          '<div id="stt-rm-resultados-ruido"></div>' +
        '</div>' +
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
    el.rutaInput = document.getElementById('stt-rm-ruta');
    el.mostrarNombre = document.getElementById('stt-rm-mostrar-nombre');
    el.limpiarNombre = document.getElementById('stt-rm-limpiar-nombre');
    el.mostrarOrigen = document.getElementById('stt-rm-mostrar-origen');
    el.limpiarOrigen = document.getElementById('stt-rm-limpiar-origen');
    el.mostrarDestino = document.getElementById('stt-rm-mostrar-destino');
    el.limpiarDestino = document.getElementById('stt-rm-limpiar-destino');
    el.resultadosExtra = {
      nombre: document.getElementById('stt-rm-resultados-nombre'),
      origen: document.getElementById('stt-rm-resultados-origen'),
      destino: document.getElementById('stt-rm-resultados-destino'),
      ruido: document.getElementById('stt-rm-resultados-ruido')
    };
    el.mostrarRuido = document.getElementById('stt-rm-mostrar-ruido');
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

  function resultadosSeccion(sec) {
    return el.resultadosExtra ? el.resultadosExtra[sec] : null;
  }

  function mensajeSeccion(sec, txt, esError) {
    var res = resultadosSeccion(sec);
    if (!res) return;
    res.innerHTML = '<div class="stt-rm-item' + (esError ? ' error' : '') + '">' + txt + '</div>';
  }

  function capaSeccion(sec) {
    if (!mapa) return null;
    if (!capasSeccion[sec]) {
      var g = L.layerGroup();
      if (!rutasOcultas) g.addTo(mapa);
      capasSeccion[sec] = g;
    }
    return capasSeccion[sec];
  }

  function limpiarSeccion(sec) {
    var res = resultadosSeccion(sec);
    if (res) res.innerHTML = '';
    var cg = capasSeccion[sec];
    if (cg) {
      cg.clearLayers();
      if (mapa) mapa.removeLayer(cg);
      capasSeccion[sec] = null;
    }
    if (sec === 'ruido') {
      // La capa de ruido vive en mapaCapas.js (panel de capas); aquí solo
      // se apaga y se limpia el mensaje de la sección.
      if (window.STT_CAPAS && window.STT_CAPAS.ruido) window.STT_CAPAS.ruido.apagar();
    }
    peticionSeccion[sec] = (peticionSeccion[sec] || 0) + 1;
  }

  function pintarRutasSeccion(sec, rutas) {
    limpiarSeccion(sec);
    var res = resultadosSeccion(sec);
    if (!res) return;
    if (!rutas || !rutas.length) {
      mensajeSeccion(sec, 'Sin rutas para mostrar.', true);
      return;
    }
    var cg = capaSeccion(sec);
    var bounds = L.latLngBounds([]);
    rutas.forEach(function (r) {
      var coords = r.coords || [];
      if (coords.length > 1 && cg) {
        L.polyline(coords, { color: COLOR_SECCION[sec], weight: 4, opacity: 0.8 }).addTo(cg);
      }
      coords.forEach(function (c) { bounds.extend(c); });
      var item = document.createElement('div');
      item.className = 'stt-rm-item';
      var nom = document.createElement('div');
      nom.className = 'stt-rm-item-nom';
      nom.textContent = (r.nombre || 'Ruta') + (r.direccion ? ' · ' + r.direccion : '');
      var det = document.createElement('div');
      det.className = 'stt-rm-item-det';
      det.textContent = (r.sentido ? r.sentido + ' · ' : '') + 'Recorrido: ' + ((r.distancia || 0) / 1000).toFixed(1) + ' km' +
        (r.distanciaPunto != null ? ' · pasa a ' + r.distanciaPunto + ' m del punto' : '');
      item.appendChild(nom);
      item.appendChild(det);
      res.appendChild(item);
    });
    if (mapa && bounds.isValid()) mapa.fitBounds(bounds, { padding: [30, 30] });
    try { document.dispatchEvent(new Event('stt:rutas-dibujadas')); } catch (e) {}
  }

  function pedirMapa(sec, body, boton) {
    if (pidiendoSeccion[sec]) return;
    if (!sesionActiva()) {
      avisar('Inicia sesión con una cuenta activa para ver rutas.', true);
      aplicarGate();
      return;
    }
    pidiendoSeccion[sec] = true;
    if (boton) boton.disabled = true;
    limpiarSeccion(sec);
    var req = peticionSeccion[sec];
    mensajeSeccion(sec, 'Buscando rutas…', false);

    var base = (window.STATETTY_CONFIG && STATETTY_CONFIG.WS_API_BASE) || '';
    var tokenPromise = (window.STT && window.STT.getTokenFresco)
      ? window.STT.getTokenFresco()
      : Promise.resolve(window.STT && window.STT.getToken ? window.STT.getToken() : '');

    Promise.resolve(tokenPromise).then(function (token) {
      return fetch(base + API_MAPA, {
        method: 'POST',
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          token ? { 'Authorization': 'Bearer ' + token } : {}
        ),
        body: JSON.stringify(body)
      }).then(function (r) {
        return r.json().then(function (d) { return { status: r.status, data: d }; });
      }).then(function (res) {
        if (peticionSeccion[sec] !== req) return;
        if (res.status === 401) { mensajeSeccion(sec, 'Inicia sesión para ver rutas.', true); return; }
        if (res.status === 403) { mensajeSeccion(sec, 'Tu cuenta no está activa o no tiene tiempo de uso disponible.', true); return; }
        if (res.status === 429) { mensajeSeccion(sec, 'Demasiadas búsquedas. Espera un minuto e intenta de nuevo.', true); return; }
        if (res.status !== 200 || !res.data || !res.data.ok) {
          mensajeSeccion(sec, 'No se pudieron cargar las rutas. Intenta de nuevo.', true);
          return;
        }
        pintarRutasSeccion(sec, res.data.rutas || []);
      }).catch(function () {
        if (peticionSeccion[sec] === req) mensajeSeccion(sec, 'Falló la búsqueda de rutas. Revisa tu conexión.', true);
      }).then(function () {
        pidiendoSeccion[sec] = false;
        if (boton) boton.disabled = false;
      });
    });
  }

  function mostrarNombre() {
    var texto = el.rutaInput ? el.rutaInput.value : '';
    var nombres = String(texto || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!nombres.length) {
      mensajeSeccion('nombre', 'Escribe al menos un nombre de ruta.', true);
      return;
    }
    pedirMapa('nombre', { modo: 'nombres', nombres: nombres }, el.mostrarNombre);
  }

  function mostrarCerca(sec) {
    var p = sec === 'origen' ? origen : destino;
    if (!p) {
      mensajeSeccion(sec, 'Fija primero el punto ' + (sec === 'origen' ? 'inicial' : 'final') + '.', true);
      return;
    }
    pedirMapa(sec, { modo: 'punto', punto: p, radio: 50 },
      sec === 'origen' ? el.mostrarOrigen : el.mostrarDestino);
  }

  // ── Ruido urbano ───────────────────────────────────────────────────────────
  // La capa de ruido (celdas H3 por zona) vive en mapaCapas.js / panel de
  // capas. Este botón solo la alterna; los mensajes caen en
  // #stt-rm-resultados-ruido desde allá.
  function mostrarRuido() {
    if (window.STT_CAPAS && window.STT_CAPAS.ruido) {
      window.STT_CAPAS.ruido.alternar();
      return;
    }
    mensajeSeccion('ruido', 'El panel de capas aún no está listo.', true);
  }

  // Visibilidad de las capas de rutas (checkbox «Rutas de micros» del panel
  // de capas, mapaCapas.js). ocultas=true saca los layer groups del mapa sin
  // borrar los datos; al reactivar se vuelven a añadir.
  function gruposRutas() {
    var g = [];
    if (capa) g.push(capa);
    Object.keys(capasSeccion).forEach(function (k) {
      if (capasSeccion[k]) g.push(capasSeccion[k]);
    });
    return g;
  }

  window.STT_RUTAS_MICROS = {
    alternar: function (visible) {
      rutasOcultas = !visible;
      if (mapa) {
        gruposRutas().forEach(function (g) {
          if (visible) { if (!mapa.hasLayer(g)) mapa.addLayer(g); }
          else if (mapa.hasLayer(g)) mapa.removeLayer(g);
        });
      }
      try { document.dispatchEvent(new CustomEvent('stt:rutas-visibilidad', { detail: { visible: !!visible } })); } catch (e) {}
    },
    ocultas: function () { return rutasOcultas; }
  };

  function setPunto(cual, punto) {
    var lat = Number(punto && punto.lat), lng = Number(punto && punto.lng);
    if (!isFinite(lat) || !isFinite(lng)) return;
    if (cual === 'origen') origen = { lat: lat, lng: lng };
    else destino = { lat: lat, lng: lng };
    if (el.estOrigen) el.estOrigen.textContent = textoPunto('origen');
    if (el.estDestino) el.estDestino.textContent = textoPunto('destino');
    guardarPuntos();
    pintarPunto(cual);
    limpiarResultados();
    if (cual === 'origen' || cual === 'destino') limpiarSeccion(cual);
    avisar('', false);
  }

  // Origen/destino persisten entre sesiones (localStorage); solo el botón
  // Limpiar los borra. D10 (sin caché) aplicaba a las RESPUESTAS del API.
  function guardarPuntos() {
    try {
      if (!origen && !destino) { localStorage.removeItem(STORAGE_KEY); return; }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ origen: origen, destino: destino }));
    } catch (e) {}
  }

  function cargarPuntos() {
    try {
      var data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!data) return;
      ['origen', 'destino'].forEach(function (c) {
        var p = data[c];
        var lat = Number(p && p.lat), lng = Number(p && p.lng);
        if (isFinite(lat) && isFinite(lng)) {
          if (c === 'origen') origen = { lat: lat, lng: lng };
          else destino = { lat: lat, lng: lng };
        }
      });
      if (el.estOrigen) el.estOrigen.textContent = textoPunto('origen');
      if (el.estDestino) el.estDestino.textContent = textoPunto('destino');
    } catch (e) {}
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
    capa = L.layerGroup();
    if (!rutasOcultas) capa.addTo(mapa);
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

    var base = (window.STATETTY_CONFIG && STATETTY_CONFIG.WS_API_BASE) || '';
    // getTokenFresco refresca el JWT Buddy si venció (accessToken de 1h);
    // sin él un STT.token viejo devolvía 401 con sesión aparentemente activa.
    var tokenPromise = (window.STT && window.STT.getTokenFresco)
      ? window.STT.getTokenFresco()
      : Promise.resolve(window.STT && window.STT.getToken ? window.STT.getToken() : '');

    Promise.resolve(tokenPromise).then(function (token) {
    return fetch(base + API, {
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
    });
  }

  function limpiar() {
    origen = null;
    destino = null;
    guardarPuntos();
    setModo(null);
    ['origen', 'destino'].forEach(function (c) {
      if (marcadores[c] && mapa) mapa.removeLayer(marcadores[c]);
      marcadores[c] = null;
    });
    limpiarResultados();
    SECCIONES.forEach(limpiarSeccion);
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
    if (el.mostrarNombre) el.mostrarNombre.addEventListener('click', mostrarNombre);
    if (el.limpiarNombre) el.limpiarNombre.addEventListener('click', function () { limpiarSeccion('nombre'); });
    if (el.mostrarOrigen) el.mostrarOrigen.addEventListener('click', function () { mostrarCerca('origen'); });
    if (el.limpiarOrigen) el.limpiarOrigen.addEventListener('click', function () { limpiarSeccion('origen'); });
    if (el.mostrarDestino) el.mostrarDestino.addEventListener('click', function () { mostrarCerca('destino'); });
    if (el.limpiarDestino) el.limpiarDestino.addEventListener('click', function () { limpiarSeccion('destino'); });
    if (el.mostrarRuido) el.mostrarRuido.addEventListener('click', mostrarRuido);
    if (el.rutaInput) el.rutaInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); mostrarNombre(); }
    });
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
    cargarPuntos();
    esperarMapa();
    initGate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
