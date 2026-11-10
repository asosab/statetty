// ---------------------------------------------
// mapaCaja.js — la #caja del mapa unificado (texto + figuras + buscar).
// Reemplaza el IIFE de mapaSimple.html y el initCajaFind del viejo mapa.js.
//
// Comportamiento único para los dos modos:
//   - #caja flotante (centro → abajo al buscar/dibujar o superar zoomRef);
//   - Buscar con texto → POST statetty/buscarMapa (con Bearer si hay sesión);
//   - Buscar sin texto → filtro cargado en #fndInm (si existe) → figuras
//     dibujadas → aviso;
//   - el render lo decide el modo: agente → renderMap (enriquecido);
//     público → STT_MAPA_PUBLICO.pintar.
//
// API: window.STT_MAPA_CAJA = { init(opts), buscar, avisar, fijarAbajo,
//      registrarZoomAuto, esperarMapa }
// ---------------------------------------------
(function () {
  'use strict';

  if (window.STT_MAPA_CAJA) return;

  var form = null, input = null, boton = null, estado = null, caja = null;
  var zoomRef = 12;      // zoom "de reposo": superado, la caja baja a la base
  var cajaFija = false;  // true tras buscar o dibujar: la caja queda abajo
  var headerOculto = false;
  var MARGEN_HEADER = 0; // niveles por debajo de zoomRef para que vuelva el header
  var _mapInit = false;
  var _busquedaActiva = null; // handle del stream en curso: se cancela al re-buscar
  var slotAvatar = null;     // #avatar-flotante: refugio de la foto cuando sube el header
  var avatarObserver = null;

  function avisar(txt, esError) {
    if (!estado) return;
    estado.textContent = txt || '';
    estado.className = esError ? 'error' : '';
  }

  function colocarCaja() {
    var m = window.map;
    var z = m ? m.getZoom() : zoomRef;
    caja.className = (cajaFija || z > zoomRef) ? 'abajo' : '';
    if (!headerOculto && z > zoomRef) headerOculto = true;
    else if (headerOculto && z <= zoomRef - MARGEN_HEADER) headerOculto = false;
    if (document.body) document.body.classList.toggle('header-oculto', headerOculto);
    reubicarAvatar();
  }

  // El header se lleva la foto de perfil (única puerta al menú lateral) al
  // esconderse. Con el header oculto, el botón-avatar se muda al flotante de
  // la esquina superior derecha; al volver el header, regresa a su
  // .stt-user-menu. Es el mismo nodo: sus listeners y el aria-expanded del
  // panel viajan con él.
  function reubicarAvatar() {
    if (!slotAvatar) return;
    var enHeader = document.querySelector('.header-right .stt-user-trigger');
    var flotante = slotAvatar.querySelector('.stt-user-trigger');
    if (headerOculto) {
      if (enHeader) slotAvatar.appendChild(enHeader);
    } else if (flotante) {
      var wrap = document.querySelector('.header-right .stt-user-menu');
      if (wrap) wrap.appendChild(flotante);
    }
    slotAvatar.hidden = !slotAvatar.querySelector('.stt-user-trigger');
  }

  // El avatar lo monta menuUser.js cuando resuelve la sesión: si eso ocurre
  // con el header ya escondido, hay que moverlo al flotante apenas aparezca.
  function observarAvatar() {
    if (avatarObserver || typeof MutationObserver !== 'function') return;
    var host = document.querySelector('.header-right');
    if (!host) return;
    avatarObserver = new MutationObserver(function () { reubicarAvatar(); });
    avatarObserver.observe(host, { childList: true });
  }

  function fijarAbajo() { cajaFija = true; colocarCaja(); }

  // Un painter (renderMap / pintar) avisa el zoom que dejó su encuadre
  // automático, para que ese salto programático no cuente como zoom del usuario.
  function registrarZoomAuto(z) {
    zoomRef = z;
    colocarCaja();
  }

  function conectarMapa(m) {
    if (_mapInit) return;
    _mapInit = true;
    zoomRef = m.getZoom();
    m.on('zoomend', colocarCaja);
    if (window.STT_FIGURAS) window.STT_FIGURAS.conectarMapa(m);
  }

  // El mapa lo crea el orquestador (mapa.js): L.map() sobre #mapid ya
  // inicializado revienta. Se espera a que exista.
  function esperarMapa() {
    if (window.map) { conectarMapa(window.map); return; }
    var intentos = 0;
    var iv = setInterval(function () {
      intentos++;
      if (window.map) { clearInterval(iv); conectarMapa(window.map); }
      else if (intentos > 80) clearInterval(iv);   // 20 s: la búsqueda igual funciona
    }, 250);
  }

  // Convierte items de buscarMapa al formato del render enriquecido.
  function aLocations(resultados) {
    return (resultados || []).map(function (it) {
      var loc = apiItemToLocation(it);
      loc.Titulo = loc.Titulo || loc.Nombre || '';
      loc.URL = loc.URL || it.url || '';        // buscarMapa manda 'url' en minúscula
      loc.uid = normalizeURL(loc.URL);
      loc.brand = marcaDe({ dato: loc });
      return loc;
    }).filter(function (l) { return isFinite(l.lat) && isFinite(l.lng); });
  }

  // Render enriquecido: mismo que init() con `ultima` (fitBounds dentro de
  // renderMap). Devuelve false si no se pudo pintar nada.
  function pintarAgente(resultados) {
    if (typeof window.renderMap !== 'function') return false;
    var locs = aLocations(resultados);
    if (!locs.length) return false;
    var lat = locs.reduce(function (s, l) { return s + l.lat; }, 0) / locs.length;
    var lng = locs.reduce(function (s, l) { return s + l.lng; }, 0) / locs.length;
    var maxKm = 0;
    locs.forEach(function (l) { maxKm = Math.max(maxKm, calculateDH(lat, lng, l.lat, l.lng)); });
    var u = (window.STT && window.STT.getUsuario && window.STT.getUsuario()) || {};
    var na = ((u.first_name || '') + ' ' + (u.last_name || '')).trim();
    // El popup calcula el % contra el promedio: con 0 daría Infinity.
    var prom = Math.max(1, calcularPromedio(locs, 'precio'));
    window.renderMap(locs, lat, lng, Math.max(maxKm * 1000, 1), prom, na, u.agencia || '');
    return true;
  }

  function esAgente() {
    return !!(window.STT_MAPA && window.STT_MAPA.modo === 'agente');
  }

  function buscar() {
    var texto = input ? input.value.trim() : '';
    var fig = (typeof window.STT_MAP_FIGURAS === 'function') ? window.STT_MAP_FIGURAS() : null;
    var hayFiguras = !!(fig && ((fig.poligono && fig.poligono.length) ||
                                (fig.circunferencia && fig.circunferencia.length)));
    // #texto vacío (plan find-buscar-vacio-filtro-o-zona, D2): primero el filtro
    // cargado en la toolbox (#fndInm-slots-select) → su botón; si no, las zonas
    // dibujadas buscan con los defaults del server; si tampoco hay zonas, aviso.
    if (!texto) {
      var selSlot = document.getElementById('fndInm-slots-select');
      var btnFndInm = document.getElementById('fndInm-btn-buscar');
      if (selSlot && selSlot.value && btnFndInm) { btnFndInm.click(); return; }
      if (!hayFiguras) {
        avisar('describe lo que buscas o dibuja una zona sobre el mapa para iniciar la búsqueda', true);
        return;
      }
    }
    // Con figuras dibujadas el área la definen ellas: la circunferencia de la
    // búsqueda anterior ya no representa el filtro y se borra al iniciar.
    if (hayFiguras && typeof circuloBusqueda !== 'undefined' && circuloBusqueda) {
      if (map && map.hasLayer(circuloBusqueda)) map.removeLayer(circuloBusqueda);
      circuloBusqueda = null;
    }
    fijarAbajo();   // la caja baja al base, como lápiz y pin
    if (boton) boton.disabled = true;
    avisar('Buscando...', false);
    var base = (window.STATETTY_CONFIG && window.STATETTY_CONFIG.WS_API_BASE) || '';
    var m = window.map;
    var centro = m ? m.getCenter() : null;
    // getToken() devuelve null hasta que auth.js termina su flujo: esperar (lo mismo
    // que datos.js) para no buscar en la shape pública habiendo sesión. Sin sesión
    // pendiente el fetch sale directo (no hay nada que esperar).
    var listo = (window.STT && window.STT.ready) ? window.STT.ready.catch(function () {}) : null;
    var lanzarBusqueda = function () {
      var token = window.STT && window.STT.getToken ? window.STT.getToken() : '';
      // Stream NDJSON apagado (decisión del dueño 2026-11-10): más lento y
      // rompió el arranque — se vuelve al fetch JSON de siempre (abajo).
      if (false) {
        var pintados = 0, metaRef = null;
        if (_busquedaActiva) { try { _busquedaActiva.cancel(); } catch (e) {} }
        _busquedaActiva = fetchBuscarMapaStream(token, {
          texto: texto,
          poligono: fig ? fig.poligono : [],
          circunferencia: fig ? fig.circunferencia : [],
          lat: centro ? centro.lat : undefined,
          lng: centro ? centro.lng : undefined,
        }, {
          onMeta: function (meta) {
            metaRef = meta;
            if (meta.filtros && meta.filtros.userID) window.__mapUserid = meta.filtros.userID;
            var u = (window.STT && window.STT.getUsuario && window.STT.getUsuario()) || {};
            var na = ((u.first_name || '') + ' ' + (u.last_name || '')).trim();
            window.STT_RENDER.streamInit({ na: na, ag: u.agencia || '' });
          },
          onItems: function (items, totalParcial) {
            pintados += window.STT_RENDER.add(aLocations(items));
            if (pintados) avisar(totalParcial + ' inmuebles...', false);
          },
          onFin: function (fin) {
            window.STT_RENDER.fin();
            var filtros = metaRef && metaRef.filtros;
            if (filtros && hayFiguras) { delete filtros.lat; delete filtros.lng; delete filtros.dist; }
            if (filtros && typeof window.STT_FND_INM === 'object' &&
                typeof window.STT_FND_INM.aplicarResultado === 'function') {
              window.STT_FND_INM.aplicarResultado(filtros);
            }
            var tot = (fin && fin.total) || pintados;
            if (!tot) { avisar('Sin resultados. Probá con menos filtros u otra zona.', true); return; }
            avisar(tot + (tot === 1 ? ' inmueble encontrado' : ' inmuebles encontrados'), false);
          },
          onError: function () {
            if (pintados) { window.STT_RENDER.fin(); avisar(pintados + ' inmuebles (la búsqueda se cortó).', true); }
            else avisar('Falló la búsqueda. Revisá tu conexión e intentá de nuevo.', true);
          },
        });
        return _busquedaActiva.promise.then(function (r) {
          if (!r) return;
          if (r.status === 429) { avisar('Hiciste demasiadas búsquedas. Esperá un minuto e intentá de nuevo.', true); return; }
          if (r.status === 403 || (r.data && r.data.error === 'sin_tiempo')) {
            avisar('Tu cuenta no tiene tiempo activo: ves la vista pública.', true);
            if (window.STT_MAPA && typeof window.STT_MAPA.degradarAPublico === 'function') STT_MAPA.degradarAPublico();
            return;
          }
          if (r.ok === false && !r.cancelled && !pintados && r.error !== 'sin_sesion') {
            avisar('No se pudo interpretar la búsqueda. Probá con otra frase.', true);
          }
        }).then(function () {
          if (boton) boton.disabled = false;
        });
      }
      return fetch(base + 'statetty/buscarMapa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        },
        body: JSON.stringify({
          texto: texto,
          poligono: fig ? fig.poligono : [],              // [{ puntos: [{lat, lng}, ...] }]
          circunferencia: fig ? fig.circunferencia : [],  // [{ lat, lng, radio }] radio en metros
          lat: centro ? centro.lat : undefined,   // si el texto no resuelve zona ni hay
          lng: centro ? centro.lng : undefined,   // figuras, se busca el país de esta vista
        }),
      })
    .then(function (r) {
      return r.json().then(function (d) { return { status: r.status, data: d }; });
    }).then(function (res) {
      if (res.status === 429) { avisar('Hiciste demasiadas búsquedas. Esperá un minuto e intentá de nuevo.', true); return; }
      if (res.status === 403 || (res.data && res.data.error === 'sin_tiempo')) {
        avisar('Tu cuenta no tiene tiempo activo: ves la vista pública.', true);
        if (window.STT_MAPA && typeof window.STT_MAPA.degradarAPublico === 'function') STT_MAPA.degradarAPublico();
        return;
      }
      if (res.status !== 200 || !res.data || !res.data.ok) {
        avisar('No se pudo interpretar la búsqueda. Probá con otra frase.', true);
        return;
      }
      // El popup arma usrClckWsInm?u= con el id del usuario; si la página arrancó
      // vacía, acá es la única chance de tenerlo.
      if (res.data.filtros && res.data.filtros.userID) window.__mapUserid = res.data.filtros.userID;
      var tot = res.data.total || (res.data.resultados ? res.data.resultados.length : 0);
      var pintados = esAgente()
        ? pintarAgente(res.data.resultados)
        : (window.STT_MAPA_PUBLICO ? window.STT_MAPA_PUBLICO.pintar(res.data.resultados) : 0);
      if (!tot) { avisar('Sin resultados. Probá con menos filtros u otra zona.', true); return; }
      // El formulario "Buscar Inmuebles" del toolbox (#fndInm-section) pasa a
      // reflejar la búsqueda recién hecha (solo modo agente): se vacía y se le
      // escriben los filtros del resultado, para ajustarlos y re-buscar desde ahí.
      var filtros = res.data.filtros;
      if (filtros && hayFiguras) { delete filtros.lat; delete filtros.lng; delete filtros.dist; }
      if (esAgente() && filtros && typeof window.STT_FND_INM === 'object' &&
          typeof window.STT_FND_INM.aplicarResultado === 'function') {
        window.STT_FND_INM.aplicarResultado(filtros);
      }
      if (!pintados) {
        avisar(tot + (tot === 1 ? ' inmueble encontrado' : ' inmuebles encontrados') + ', pero el mapa no pudo pintarlos.', true);
        return;
      }
      avisar(tot + (tot === 1 ? ' inmueble encontrado' : ' inmuebles encontrados'), false);
    }).catch(function (e) {
      console.log('[Statetty] [error] buscar:', e && e.message ? e.message : e);
      avisar('Falló la búsqueda. Revisá tu conexión e intentá de nuevo.', true);
    }).then(function () {
      if (boton) boton.disabled = false;
    });
    };
    if (listo) Promise.resolve(listo).then(lanzarBusqueda); else lanzarBusqueda();
  }

  function init(opts) {
    opts = opts || {};
    form = opts.form || document.getElementById('form-buscar');
    input = opts.input || document.getElementById('texto');
    boton = opts.boton || document.getElementById('btn-buscar');
    estado = opts.estado || document.getElementById('estado');
    caja = opts.caja || document.getElementById('caja');
    if (!caja || !form) return;
    slotAvatar = opts.slotAvatar || document.getElementById('avatar-flotante');
    observarAvatar();
    reubicarAvatar();

    // Figuras: un solo stack, compartido con el resto de la página.
    if (window.STT_FIGURAS) {
      window.STT_FIGURAS.bind({
        btnLapiz: opts.btnLapiz || document.getElementById('btn-lapiz'),
        btnPin: opts.btnPin || document.getElementById('btn-pin'),
        btnDeshacer: opts.btnDeshacer || document.getElementById('btn-deshacer'),
        avisar: avisar,
        onActivar: fijarAbajo
      });
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); buscar(); });
    if (input) input.addEventListener('input', function () { if (estado && estado.className === 'error') avisar('', false); });

    if (window.map) conectarMapa(window.map); else esperarMapa();
  }

  window.STT_MAPA_CAJA = {
    init: init,
    buscar: buscar,
    avisar: avisar,
    fijarAbajo: fijarAbajo,
    registrarZoomAuto: registrarZoomAuto,
    esperarMapa: esperarMapa,
    conectarMapa: conectarMapa,
    colocarCaja: colocarCaja,
    esAgente: esAgente,
    _aLocations: aLocations
  };
})();
