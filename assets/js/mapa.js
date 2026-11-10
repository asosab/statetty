// ---------------------------------------------
// mapa.js — orquestador del mapa unificado (`/`).
// Absorbe lo que antes vivía en dos lugares: la home pública de mapaSimple
// (geo-IP, caja, figuras, render simple) y el mapa de asesor de /maps/find
// (panel de herramientas, render enriquecido, última búsqueda).
//
// Arranque: el mapa nace en modo PÚBLICO (sin muros). Cuando la sesión resuelve
// con usuario.hasTime → activarModoAgente(): el avatar del menú de usuario
// queda como trigger del panel, se auto-carga la
// última búsqueda ({ultima:true} → renderMap) y las búsquedas siguientes
// pintan enriquecido. Sin sesión o sin tiempo, la página queda pública.
//
// Módulos: mapaShared (utils/estado) · mapaFiguras (dibujo) · mapaCaja (#caja)
//          mapaPublico (render simple) · mapaAgente (render enriquecido/toolbox)
// ---------------------------------------------

window.STT_MAPA = window.STT_MAPA || {};
window.STT_MAPA.modo = 'publico';   // 'publico' | 'agente'

// En global: init() lo reescribe tras una búsqueda y el popup del modo agente
// lo lee para armar usrClckWsInm?u=.
window.__mapUserid = null;

var __activo = false;   // el modo agente se activa una sola vez

function _esAgente() { return window.STT_MAPA.modo === 'agente'; }

// Degradación a público cuando el servidor dice sin_tiempo en medio del uso:
// cierra el panel y vuelve a render público (la sesión expiró con la página
// abierta). El avatar queda: sigue dando acceso a los links de usuario.
function _degradarAPublico() {
  window.STT_MAPA.modo = 'publico';
  _toolboxCerrar(false);
}

/** ------------------------------------------------------------------------------------------- normalizarM2TDesdeURI */
function normalizarM2TDesdeURI(){ try {
  let v=parseFloat(window.M2T); if(isNaN(v)||v<=0)return 0;
  if(v>10000&&v<100000)v=v/100;
  while(v>3000)v=v/10;
  if(v>2300)v=2300;
  if(v<50)v=50;
  return Math.round(v*100)/100;
} catch (e) {console.log('normalizarM2TDesdeURI error',e);} }

// ---------- Mapa base (mismo comportamiento que la home pública) ----------

function _guardarPosicion() {
  try {
    var c = map.getCenter();
    localStorage.setItem('mapCenter', JSON.stringify([c.lat, c.lng]));
    localStorage.setItem('mapZoom', map.getZoom());
  } catch (e) {}
}

function _initMapaBase() {
  var inicial = (window.STT_GEO && window.STT_GEO.inicial)
    ? window.STT_GEO.inicial(location.search, localStorage)
    : { centro: [-17.7833281, -63.1821673], zoom: 12, fuente: 'default' };
  map = L.map('mapid').setView(inicial.centro, inicial.zoom);
  window.map = map;
  // fitBounds al crear: el país pedido por URL debe verse completo desde el
  // primer paint.
  if (inicial.cobertura) map.fitBounds(window.STT_GEO.cobertura(), { padding: [24, 24], animate: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  setTimeout(function () { map.invalidateSize(); }, 300);

  // Posición persistente (mismo contrato que siempre: mapCenter/mapZoom).
  // Solo se guarda cuando el usuario mueve el mapa — los saltos del geo no cuentan.
  var saltoAuto = false;
  map.on('moveend', function () { if (!saltoAuto) _guardarPosicion(); });
  map.on('zoomend', function () { if (!saltoAuto) _guardarPosicion(); });

  // Centro por IP del visitante — corre salvo que la URL haya decidido. Sin
  // decisión previa aplica directo; con posición guardada solo corrige cuando
  // el país no coincide.
  if (inicial.fuente !== 'url' && window.STT_GEO) {
    var saltar = function (destino) {
      saltoAuto = true;
      if (destino.cobertura) {
        map.fitBounds(window.STT_GEO.cobertura(), { padding: [24, 24], animate: false });
      } else {
        map.setView(destino.centro, destino.zoom, { animate: false });
      }
      saltoAuto = false;
    };
    var alLlegarGeo = function (d) {
      if (!d) return;
      if (inicial.fuente === 'local' && !window.STT_GEO.debeCorregir(inicial, d.pais)) return;
      saltar(d);
    };
    var porTrace = function () {
      return fetch('/cdn-cgi/trace').then(function (r) { return r.text(); })
        .then(function (t) { alLlegarGeo(window.STT_GEO.desdeTrace(t)); }).catch(function () {});
    };
    var baseGeo = (window.STATETTY_CONFIG && window.STATETTY_CONFIG.WS_API_BASE) || '';
    fetch(baseGeo + 'statetty/geo').then(function (r) { return r.json(); })
      .then(function (g) {
        var d = window.STT_GEO.desdeGeo(g);
        if (d) alLlegarGeo(d); else return porTrace();
      }).catch(porTrace);
  }
}

// ---------- Toolbox: drawer (abrir/cerrar), API global, acordeón ----------

// Único punto de verdad del estado del panel: la visibilidad la maneja la
// clase .open (transform en CSS), no display. Todo el que antes hacía
// $('#toolbox').show()/.hide()/.toggle() pasa por acá para mantener
// sincronizados el backdrop y el aria-expanded del ⚙.
function _toolboxEsMovil() { return window.innerWidth < 768; }

// El trigger del panel es el avatar del menú de usuario (lo monta menuUser.js
// en el header): puede no existir si el usuario no tiene tiempo.
function _toolboxTrigger() {
  return document.querySelector('.stt-user-trigger');
}

function _toolboxAbrir() {
  var box = document.getElementById('toolbox');
  if (!box) return;
  box.classList.add('open');
  var bd = document.getElementById('toolbox-backdrop');
  if (bd) bd.classList.add('open');
  var trigger = _toolboxTrigger();
  if (trigger) trigger.setAttribute('aria-expanded', 'true');
}

function _toolboxCerrar(devolverFoco) {
  var box = document.getElementById('toolbox');
  if (!box || !box.classList.contains('open')) return;
  box.classList.remove('open');
  var bd = document.getElementById('toolbox-backdrop');
  if (bd) bd.classList.remove('open');
  var trigger = _toolboxTrigger();
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
  // Si el foco quedó dentro del panel, vuelve al avatar (cierre con Esc/✕).
  if (devolverFoco !== false && trigger && box.contains(document.activeElement)) trigger.focus();
}

function _toolboxAbierta() {
  var box = document.getElementById('toolbox');
  return !!(box && box.classList.contains('open'));
}

window.STT_TOOLBOX = {
  abrir: _toolboxAbrir,
  cerrar: _toolboxCerrar,
  toggle: function () { _toolboxAbierta() ? _toolboxCerrar() : _toolboxAbrir(); },
  abierta: _toolboxAbierta,
  esMovil: _toolboxEsMovil
};

function _initToolboxHandlers() {
  initPopupTooltips(document.getElementById('toolbox'));

  // El ✕ del header propio del panel (delegado: el markup vive en el include).
  $(document).on('click', '#toolbox .tb-close', function () {
    _toolboxCerrar();
  });
  // Backdrop móvil: mismo cierre que el click-fuera, pero con affordance.
  $(document).on('click', '#toolbox-backdrop', function () {
    _toolboxCerrar(false);
  });
  $(document).on('keydown', function (e) {
    if (e.key === 'Escape') _toolboxCerrar();
  });
  // Click-fuera solo en pantallas chicas: en desktop el panel queda abierto
  // para trabajar con los pines del mapa (selección para ACM/PDF). El
  // header-right (avatar + ☰) no cuenta como "fuera": el avatar es el trigger.
  $(document).on('click', function (e) {
    if (!_toolboxEsMovil() || !_toolboxAbierta()) return;
    if (!$(e.target).closest('#toolbox, .header-right').length) {
      _toolboxCerrar(false);
    }
  });

  // Acordeón del toolbox: delegado en document para que funcione también con
  // las secciones que se montan después (fndInm, rutasMicros, links de menuUser).
  function actualizarBotonesCollapse() {
    $('.section-header').each(function () {
      var $header = $(this);
      var $button = $header.find('.section-collapse');

      if (!$button.length) {
        $button = $('<button type="button" class="section-collapse" aria-label="Colapsar sección" title="Colapsar">▾</button>');
        $header.append($button);
      }
    });
  }

  actualizarBotonesCollapse();

  $(document).on('click', '.section-header', function (e) {
    if ($(e.target).closest('.section-collapse').length) return;
    var $section = $(this).parent();
    var yaActiva = $section.hasClass('active');
    $('.section').removeClass('active');
    if (!yaActiva) $section.addClass('active');
    actualizarBotonesCollapse();
  });

  $(document).on('click', '.section-collapse', function (e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).closest('.section').removeClass('active');
    actualizarBotonesCollapse();
  });
}

// ---------- Sesión ----------

function waitForKey() {
  if (window.publicKey !== undefined) return Promise.resolve();
  if (window.STT && window.STT.ready) return window.STT.ready;
  return new Promise(function(r) {
    document.addEventListener('statetty:key-ready', function(){ r(); }, {once: true});
  });
}

function _usuarioConTiempo() {
  var token = window.STT && window.STT.getToken ? window.STT.getToken() : null;
  var u = window.STT && window.STT.getUsuario ? window.STT.getUsuario() : null;
  return !!(token && u && u._id && u.hasTime);
}

// ---------- Auto-selección de slot guardado (búsqueda activa del usuario) ----------

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

// ---------- Carga de la última búsqueda (modo agente) ----------

async function init() {
  $('#loading-indicator').show();
  // Re-carga dinámica tras una búsqueda de la toolbox: lo que una recarga de la
  // página habría vaciado (filtro de texto y estado de la #caja) se vacía acá.
  $('#search-input').val('');
  $('#search-count').hide();
  if (window.STT_MAPA_CAJA) window.STT_MAPA_CAJA.avisar('');

  await waitForKey();
  var usuario = window.STT && window.STT.getUsuario ? window.STT.getUsuario() : null;

  if (!_esAgente()) { $('#loading-indicator').hide(); return; }

  // Stream NDJSON (agente): la última búsqueda llega en tandas y los pines
  // caen al mapa apenas llegan — misma información que el JSON de siempre.
  if (typeof fetchBuscarMapaStream === 'function' && window.STT_RENDER) {
    var na0 = ((usuario.first_name || '') + ' ' + (usuario.last_name || '')).trim();
    var ag0 = usuario.agencia || '';
    var urlParams0 = new URLSearchParams(window.location.search);
    var handle = fetchBuscarMapaStream(window.STT.getToken(), { ultima: true }, {
      onMeta: function (meta) {
        var info = meta.filtros || {};
        window.ACM_INFO = info;
        try { autoSelectSlot(info); } catch (e) { console.warn('[autoSelectSlot]', e); }
        if (info.userID) window.__mapUserid = info.userID;
        var lat = parseFloat(info.lat), lng = parseFloat(info.lng);
        var radius = (info.dist !== undefined && info.dist !== null) ? info.dist * 1000 : null;
        var pProm = Math.round(info.precioProm) || (parseFloat(urlParams0.get('p')) || 0);
        window.STT_RENDER.streamInit({
          centerLat: isFinite(lat) ? lat : undefined,
          centerLng: isFinite(lng) ? lng : undefined,
          circleRadius: radius || undefined,
          avgPrice: pProm || undefined,
          na: na0, ag: ag0
        });
      },
      onItems: function (items) {
        var locs = items.map(function (it) {
          var loc = apiItemToLocation(it);
          loc.Titulo = loc.Titulo || loc.Nombre || '';
          loc.uid = normalizeURL(loc.URL);
          loc.brand = marcaDe({ dato: loc });
          if (loc.createdAt === undefined && loc._id) {
            var raw = items.find(function (r) { return r._id === loc._id; });
            if (raw) loc.createdAt = raw.createdAt;
          }
          return loc;
        }).filter(function (l) { return isFinite(l.lat) && isFinite(l.lng); });
        window.STT_RENDER.add(locs);
      },
      onFin: function () {
        if (!locations.length) {
          if (map) limpiarRenderPrevio();
          mostrarAvisoSinResultados();
          return;
        }
        window.STT_RENDER.fin();
        // Re-carga dinámica: limpia la URL como haría navegar a / (sin ?lat=&r=&u=).
        if (window.__mapaCargado) history.replaceState(null, '', window.location.pathname);
        window.__mapaCargado = true;
      },
      onError: function () {
        // Corte a mitad de stream: se queda lo pintado y se cierra como si
        // hubiera terminado (círculo, seleccionados, stats).
        if (locations.length) window.STT_RENDER.fin();
      }
    });
    var res = await handle.promise;
    $('#loading-indicator').hide();
    if (res && res.ok === false) {
      var err = (res.data && res.data.error) || res.error || '';
      if (res.status === 403 || err === 'sin_tiempo') { _degradarAPublico(); return; }
      if (res.cancelled) return;          // se re-busco: la nueva búsqueda sigue
      // sin_sesion / sin_busqueda / red: el mapa queda en modo agente vacío.
      initEmptyMap();
    }
    return;
  }

  var response = await fetchBuscarMapa(window.STT.getToken());

  // `sin_sesion` (token vencido), `sin_tiempo` y `sin_busqueda` (nunca buscó)
  // caen al mapa vacío en modo agente (toolbox disponible, sin resultados).
  if (!response || !response.ok || !Array.isArray(response.resultados)) {
    $('#loading-indicator').hide();
    if (response && response.error === 'sin_tiempo') { _degradarAPublico(); return; }
    initEmptyMap();
    return;
  }

  var urlParams = new URLSearchParams(window.location.search);
  var locs = [];
  if (response.resultados.length > 0) {
    var parsed = parseBuscarMapa(response);
    locs = parsed.locations;
    // apiItemToLocation deja lat/lng en NaN cuando el doc no trae coordenadas:
    // L.marker([NaN, NaN]) revienta renderMap, init() rechaza y el llamador
    // (fndInm.js) cae a recargar la página. Se descartan acá, igual que hace
    // STT_MAPA_CAJA._aLocations.
    var antes = locs.length;
    locs = locs.filter(function (l) { return isFinite(l.lat) && isFinite(l.lng); });
    if (locs.length !== antes) {
      console.warn('[init] se descartaron', antes - locs.length, 'inmuebles sin coordenadas válidas');
    }
    locs.forEach(function(loc) {
      loc.uid = normalizeURL(loc.URL);
      loc.brand = marcaDe({ dato: loc });
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
    // Re-carga dinámica: saca los pines de la búsqueda anterior antes del aviso.
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
  // Re-carga dinámica: limpia la URL como haría navegar a / (sin ?lat=&r=&u=).
  // Solo en re-carga: en la carga inicial esos params son la entrada desde el
  // bot de Telegram y se respetan.
  if (window.__mapaCargado) history.replaceState(null, '', window.location.pathname);
  window.__mapaCargado = true;
  $('#loading-indicator').hide();
}

// ---------- Activación del modo agente ----------

function activarModoAgente() {
  if (__activo) return;
  __activo = true;
  window.STT_MAPA.modo = 'agente';
  if (typeof initACMTools === 'function') initACMTools();
  if (typeof initFiltroTextoToolbox === 'function') initFiltroTextoToolbox();
  if (window.map && typeof initACMMapClickMarker === 'function') {
    try { initACMMapClickMarker(map); } catch (e) {}
  }
  init().catch(function(e) {
    console.error('Error al cargar datos del mapa', e);
    $('#loading-indicator').hide();
  });
}

// Si la sesión expira en medio del uso, la próxima respuesta 403 degrada a
// público vía _degradarAPublico (mapaCaja ya la llama).
window.STT_MAPA.degradarAPublico = _degradarAPublico;
window.STT_MAPA.esAgente = _esAgente;
window.STT_MAPA.activarModoAgente = activarModoAgente;

// Aviso suave para registrados sin tiempo: no es un muro, solo una nota en la
// #caja de que con tiempo activo vería los datos completos.
function mostrarAvisoSuave() {
  if (window.STT_MAPA_CAJA) {
    window.STT_MAPA_CAJA.avisar('Tu cuenta no tiene tiempo activo: ves la vista pública. Con tiempo verías los datos completos de cada inmueble.', false);
  }
}

// ---------- Arranque ----------

$(document).ready(function () {
  _initToolboxHandlers();

  var urlParams = new URLSearchParams(window.location.search);
  window.__mapUserid = urlParams.get('u');
  window.M2T = urlParams.get('M2T');
  window.M2T = normalizarM2TDesdeURI();

  _initMapaBase();

  // La #caja y las figuras las gobierna mapaCaja (único motor para ambos modos).
  if (window.STT_MAPA_CAJA) window.STT_MAPA_CAJA.init({});

  // Hook para fndInm.js: repinta el mapa con los resultados nuevos de una
  // búsqueda de la toolbox sin recargar la página.
  window.recargarMapa = init;

  // Resolución de la sesión: con tiempo → modo agente; registrado sin tiempo →
  // aviso suave (experiencia pública). Se corre apenas STT.ready resuelva y
  // otra vez si llega un auth-ready tardío (magic link / ticket ?k=).
  var evaluar = function () {
    var u = window.STT && window.STT.getUsuario ? window.STT.getUsuario() : null;
    // Con sesión la #caja baja a la base: el centro de la pantalla es la
    // bienvenida del anónimo; quien se autentica viene a trabajar el mapa.
    if (u && u._id && window.STT_MAPA_CAJA && window.STT_MAPA_CAJA.fijarAbajo) {
      window.STT_MAPA_CAJA.fijarAbajo();
    }
    if (_usuarioConTiempo()) { activarModoAgente(); return 'agente'; }
    if (u && u._id && !u.hasTime) mostrarAvisoSuave();
    return 'publico';
  };

  waitForKey().then(evaluar);

  window.addEventListener('statetty:auth-ready', function () {
    if (!_esAgente()) evaluar();
  });
});
