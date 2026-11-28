/**
 * mapaEquipamientos.js — panel de equipamientos urbanos del mapa unificado.
 * Segundo icono flotante junto al de 🗂️ Capas (mismo comportamiento: icono
 * colapsado que se despliega sobre la caja, estado persistido).
 *
 * Los checkboxes se arman con GET statetty/equipamientos/categorias (conteo
 * por categoría en la colección `equipamientos`); si el endpoint no responde
 * se muestra al menos «Aparcamientos». Cada categoría activa pinta marcadores
 * de GET statetty/equipamientos?bbox&categoria=... — si hay figuras dibujadas
 * (✏️/📍) la zona se limita a su bbox y se filtra adentro; si no, sigue la
 * vista y se actualiza al mover el mapa. Datos públicos (POIs de Google Maps).
 */
(function () {
  'use strict';

  if (window.__mapaEquipInit) return;
  window.__mapaEquipInit = true;

  var API_EQUIP = 'statetty/equipamientos';
  var API_CATS = 'statetty/equipamientos/categorias';

  // Nombre visible por slug (fallback: slug capitalizado).
  var NOMBRES = {
    aparcamiento: 'Aparcamientos',
    escuela: 'Escuelas',
    universidad: 'Universidades',
    farmacia: 'Farmacias',
    plaza: 'Plazas',
    hospital: 'Hospitales',
    mercado: 'Mercados',
    parque: 'Parques'
  };

  // Emoji por categoría (los pines del mapa) — 📍 si no hay definido.
  var EMOJIS = {
    aparcamiento: '🅿️',
    escuela: '🏫',
    universidad: '🎓',
    farmacia: '💊',
    plaza: '🌳',
    hospital: '🏥',
    mercado: '🛒',
    parque: '🌳'
  };

  // Cache de sesión compartido: cobertura por categoría sobre la grilla —
  // activar una categoría nueva solo pide las celdas que le faltan a ELLA,
  // y apagar/encender o volver a una zona no repite peticiones.
  var CC = window.STT_CAPAS_CACHE;
  var figApi = CC.fig;
  var FUENTE_EQUIP = CC.definir('equipamientos', {
    celdaDeg: 0.01,
    dimsItem: function (e) { return e.categoria || 'otros'; },
    idItem: function (e) { return e.id || (e.lng + ',' + e.lat + '|' + (e.categoria || '')); },
    centroItem: function (e) { return (e.lng != null && e.lat != null) ? [e.lng, e.lat] : null; }
  });

  var mapa = null;
  var panelEq = null, panelHome = null;
  var estEq = null, listaBox = null;
  var capaEq = null;                 // L.layerGroup con los marcadores
  var activas = {};                  // categoria → true
  var peticionEq = 0;
  var debounceMove = null;
  var catsCargadas = false;

  function baseApi() {
    return (window.STATETTY_CONFIG && STATETTY_CONFIG.WS_API_BASE) || '';
  }

  function nombreCat(slug) {
    if (NOMBRES[slug]) return NOMBRES[slug];
    return slug.charAt(0).toUpperCase() + slug.slice(1);
  }

  // Nombre en singular para la caja informativa (fallback: slug capitalizado).
  var TIPOS = {
    aparcamiento: 'Aparcamiento',
    escuela: 'Escuela',
    universidad: 'Universidad',
    farmacia: 'Farmacia',
    plaza: 'Plaza',
    hospital: 'Hospital',
    mercado: 'Mercado',
    parque: 'Parque'
  };
  function tipoCat(slug) {
    return TIPOS[slug] || nombreCat(slug);
  }

  function emojiCat(slug) {
    return EMOJIS[slug] || '📍';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function avisar(txt, esError) {
    if (!estEq) return;
    estEq.textContent = txt || '';
    estEq.className = 'stt-equip-estado' + (esError ? ' error' : '');
  }

  // ── geometría de figuras (✏️ polígono / 📍 circunferencia) ────────────────
  // Delegados a STT_CAPAS_CACHE.fig (los paneles ya no duplican la lógica).
  function figurasActuales() { return figApi.actuales(); }
  function hayFiguras(fig) { return figApi.hay(fig); }
  function bboxDeFiguras(fig) { return figApi.bbox(fig); }
  function dentroDeFiguras(lng, lat, fig) { return figApi.dentro(lng, lat, fig); }

  function bboxDeZona(fig) {
    if (hayFiguras(fig)) return bboxDeFiguras(fig);
    var b = mapa.getBounds();
    return { minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() };
  }

  // ── pintado ────────────────────────────────────────────────────────────────
  // Cada equipamiento es un pin-emoji por categoría (🅿️ aparcamiento…) con
  // caja informativa simple al click: tipo, nombre y ranking.
  function popupEq(e) {
    var tipo = tipoCat(e.categoria || '');
    var t = '<div class="stt-equip-pop">' +
      '<div class="stt-equip-pop-tipo">' + emojiCat(e.categoria || '') + ' ' + esc(tipo) + '</div>' +
      '<b>' + esc(e.nombre || tipo) + '</b>';
    if (e.score != null || e.rating != null) {
      t += '<br>★ ' + (e.score != null ? e.score : e.rating) +
        '<span class="stt-equip-pop-mut"> · Google ' + (e.rating != null ? e.rating : '—') +
        (e.reviews ? ' (' + e.reviews + ' reseña' + (e.reviews === 1 ? '' : 's') + ')' : '') + '</span>';
    } else if (e.reviews) {
      t += '<br><span class="stt-equip-pop-mut">' + e.reviews + ' reseñas</span>';
    }
    return t + '</div>';
  }

  var iconosEq = {};
  function iconoEq(slug) {
    if (!iconosEq[slug]) {
      iconosEq[slug] = L.divIcon({
        className: 'stt-equip-pin',
        html: emojiCat(slug),
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -12]
      });
    }
    return iconosEq[slug];
  }

  function pintarEq(items, fig) {
    if (!mapa) return;
    if (!capaEq) capaEq = L.layerGroup().addTo(mapa);
    capaEq.clearLayers();
    var conFigs = hayFiguras(fig);
    var pintados = 0;
    items.forEach(function (e) {
      if (e.lat == null || e.lng == null) return;
      if (conFigs && !dentroDeFiguras(e.lng, e.lat, fig)) return;
      L.marker([e.lat, e.lng], { icon: iconoEq(e.categoria || '') })
        .bindPopup(popupEq(e))
        .addTo(capaEq);
      pintados++;
    });
    if (!pintados) {
      avisar(conFigs
        ? 'La zona marcada no tiene equipamientos de este tipo.'
        : 'Esta vista no tiene equipamientos de este tipo (cobertura: Santa Cruz).', true);
      return;
    }
    avisar(pintados + ' en la zona' + (items.length >= 5000 ? ' (tope de 5000 alcanzado)' : '') +
      '. Toca un pin para ver el detalle.', false);
  }

  function catsActivas() {
    return Object.keys(activas).filter(function (k) { return activas[k]; });
  }

  function actualizarEq() {
    var cats = catsActivas();
    if (!mapa || !cats.length) return;
    var fig = figurasActuales();
    var bb = bboxDeZona(fig);
    peticionEq++;
    var miReq = peticionEq;
    avisar('Cargando equipamientos…', false);
    FUENTE_EQUIP.obtenerVarios({ bbox: bb, fig: fig }, cats, function (bbF, ctx, dimsF) {
      var q = 'minLng=' + bbF.minLng + '&minLat=' + bbF.minLat +
              '&maxLng=' + bbF.maxLng + '&maxLat=' + bbF.maxLat +
              '&categoria=' + encodeURIComponent(dimsF.join(','));
      return fetch(baseApi() + API_EQUIP + '?' + q).then(function (r) {
        if (!r.ok) { var e = new Error('http'); e.status = r.status; throw e; }
        return r.json();
      }).then(function (d) {
        if (!d || d.ok === false) { var e2 = new Error('sin_datos'); e2.status = 0; throw e2; }
        return { items: d.equipamientos || [] };
      });
    }).then(function (res) {
      if (peticionEq !== miReq || !catsActivas().length) return;
      pintarEq(res.items, fig);
    }).catch(function (err) {
      if (peticionEq !== miReq) return;
      var s = err && err.status;
      avisar(
        s === 429 ? 'Demasiadas consultas. Espera un minuto.' :
        s === 0 ? 'Sin datos de equipamientos en esta zona.' :
        s ? 'No se pudieron cargar los equipamientos (' + s + ').' :
        'Falló la consulta. Revisa tu conexión.', true);
    });
  }

  function repintar() {
    // re-filtra lo cacheado si existe para la zona actual, si no, pide de nuevo
    var cats = catsActivas();
    if (!cats.length) { if (capaEq) capaEq.clearLayers(); avisar('', false); return; }
    actualizarEq();
  }

  // ── lista de categorías (checkboxes) ──────────────────────────────────────
  function pintarCheckboxes(cats) {
    if (!listaBox) return;
    listaBox.innerHTML = '';
    cats.forEach(function (c) {
      var slug = c.categoria;
      var lab = document.createElement('label');
      var chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = !!activas[slug];
      chk.addEventListener('change', function () {
        activas[slug] = chk.checked;
        repintar();
      });
      lab.appendChild(chk);
      lab.appendChild(document.createTextNode(' ' + nombreCat(slug) + (c.n ? ' (' + c.n + ')' : '')));
      listaBox.appendChild(lab);
    });
  }

  function cargarCategorias() {
    if (catsCargadas || !listaBox) return;
    catsCargadas = true;
    var base = [{ categoria: 'aparcamiento', n: 0 }];
    CC.unaVez('equip-categorias', function () {
      return fetch(baseApi() + API_CATS).then(function (r) { return r.ok ? r.json() : null; });
    }).then(function (d) {
      var cats = (d && d.categorias) || [];
      var slugs = {};
      cats.forEach(function (c) { slugs[c.categoria] = true; });
      base.forEach(function (b) { if (!slugs[b.categoria]) cats.unshift(b); });
      pintarCheckboxes(cats.length ? cats : base);
    }).catch(function () {
      pintarCheckboxes(base);
    });
  }

  // ── modo flotante: icono junto al de Capas (misma lógica que mapaCapas) ────
  var movilBox = null, btnIcono = null, cajaEl = null;
  var modoMovil = false, eqAbiertas = false;
  var cajaObs = null, movListenersOk = false;

  function posicionarMovil() {
    if (!movilBox || !cajaEl) return;
    var r = cajaEl.getBoundingClientRect();
    movilBox.style.bottom = Math.max(8, window.innerHeight - r.top + 10) + 'px';
    movilBox.style.left = Math.max(8, r.left) + 52 + 'px';   // a la derecha del icono 🗂️ (44 px + 8)
  }

  function setAbiertasMovil(v) {
    eqAbiertas = !!v;
    if (movilBox) movilBox.classList.toggle('colapsado', !eqAbiertas);
    if (btnIcono) btnIcono.setAttribute('aria-expanded', String(eqAbiertas));
    try { localStorage.setItem('stt-equip-abierto', eqAbiertas ? '1' : '0'); } catch (e) {}
    if (eqAbiertas) cargarCategorias();
  }

  function cerrarEqMovil() { setAbiertasMovil(false); }

  function abiertasGuardadas() {
    try { return localStorage.getItem('stt-equip-abierto') === '1'; } catch (e) {}
    return false;
  }

  function evaluarModoMovil() {
    var activo = !!panelEq;
    if (activo === modoMovil) { if (activo) posicionarMovil(); return; }
    modoMovil = activo;
    if (!movilBox) return;
    if (activo) {
      if (panelHome == null) panelHome = panelEq.parentNode;
      movilBox.appendChild(panelEq);
      setAbiertasMovil(abiertasGuardadas());
      movilBox.classList.add('visible');
      posicionarMovil();
    } else {
      movilBox.classList.remove('visible', 'colapsado');
      if (panelHome && panelEq.parentNode !== panelHome) panelHome.appendChild(panelEq);
    }
  }

  function iniciarModoMovil() {
    if (movListenersOk) return;
    movListenersOk = true;
    cajaEl = document.getElementById('caja');
    if (!cajaEl || typeof MutationObserver !== 'function') return;
    movilBox = document.createElement('div');
    movilBox.id = 'stt-equip-movil';
    movilBox.className = 'stt-equip-movil colapsado';
    btnIcono = document.createElement('button');
    btnIcono.type = 'button';
    btnIcono.className = 'stt-equip-icono';
    btnIcono.title = 'Equipamientos urbanos';
    btnIcono.setAttribute('aria-label', 'Equipamientos urbanos');
    btnIcono.setAttribute('aria-expanded', 'false');
    btnIcono.textContent = '🏙️';
    btnIcono.addEventListener('click', function () {
      if (!modoMovil) return;
      setAbiertasMovil(!eqAbiertas);
    });
    movilBox.appendChild(btnIcono);
    document.body.appendChild(movilBox);
    cajaObs = new MutationObserver(function () { evaluarModoMovil(); });
    cajaObs.observe(cajaEl, { attributes: true, attributeFilter: ['class'] });
    cajaEl.addEventListener('click', function () {
      if (modoMovil && eqAbiertas) cerrarEqMovil();
    });
    cajaEl.addEventListener('transitionstart', function (e) {
      if (e.propertyName === 'top' || e.propertyName === 'transform') posicionarMovil();
    });
    cajaEl.addEventListener('transitionend', function (e) {
      if (e.propertyName === 'top' || e.propertyName === 'transform') posicionarMovil();
    });
    window.addEventListener('resize', posicionarMovil);
    window.addEventListener('orientationchange', posicionarMovil);
    if (mapa) {
      mapa.on('click', function () { if (modoMovil && eqAbiertas) cerrarEqMovil(); });
    }
    evaluarModoMovil();
  }

  // ── estilos ────────────────────────────────────────────────────────────────
  var CSS_ID = 'stt-equip-styles';
  function inyectarEstilos() {
    if (document.getElementById(CSS_ID)) return;
    var s = document.createElement('style');
    s.id = CSS_ID;
    s.textContent =
      '.stt-equip{background:rgba(255,255,255,.95);border:1px solid #cfe9f5;border-radius:10px;' +
        'padding:8px 10px;font-size:12px;color:#04364a;line-height:1.6;min-width:170px;}' +
      '.stt-equip-tit{font-weight:700;margin-bottom:4px;display:flex;align-items:center;' +
        'justify-content:space-between;gap:10px;}' +
      '.stt-equip label{display:flex;align-items:center;gap:6px;margin:2px 0;cursor:pointer;}' +
      '.stt-equip-estado{margin-top:6px;font-size:11px;color:#074f66;line-height:1.4;min-height:1em;}' +
      '.stt-equip-estado.error{color:#b3261e;}' +
      '.stt-equip-cerrar{display:none;border:0;background:none;color:#04364a;' +
        'font-size:15px;line-height:1;cursor:pointer;padding:2px 4px;opacity:.7;}' +
      '.stt-equip-cerrar:hover{opacity:1;}' +
      '.stt-equip-movil .stt-equip-cerrar{display:inline-flex;align-items:center;justify-content:center;}' +
      '.stt-equip-movil{position:fixed;left:12px;transform:none;' +
        'z-index:1150;display:none;flex-direction:column;align-items:flex-start;gap:0;' +
        'transition:bottom .5s ease,left .5s ease;}' +
      '.stt-equip-movil.visible{display:flex;}' +
      // Caja desplegada por encima de los iconos (misma regla que Capas).
      '.stt-equip-movil:not(.colapsado){z-index:1160;}' +
      '.stt-equip-movil .stt-equip{margin:0;max-width:86vw;}' +
      '.stt-equip-movil.colapsado .stt-equip{display:none;}' +
      '.stt-equip-movil:not(.colapsado) .stt-equip-icono{display:none;}' +
      '.stt-equip-icono{width:44px;height:44px;border-radius:50%;padding:0;' +
        'border:1px solid #cfe9f5;background:rgba(255,255,255,.95);color:#04364a;' +
        'font-size:20px;line-height:1;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25);}' +
      '.stt-equip-icono:active{transform:scale(.94);}' +
      // Pin-emoji: el divIcon trae fondo blanco por defecto → transparente,
      // solo la sombra para leerlo sobre satélite.
      '.stt-equip-pin.leaflet-div-icon{background:transparent;border:0;}' +
      '.stt-equip-pin{font-size:22px;line-height:26px;text-align:center;' +
        'filter:drop-shadow(0 1px 2px rgba(0,0,0,.45));}' +
      // Caja informativa del equipamiento.
      '.stt-equip-pop{font-size:13px;line-height:1.5;color:#04364a;max-width:230px;}' +
      '.stt-equip-pop-tipo{font-size:11px;font-weight:700;color:#074f66;' +
        'text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px;}' +
      '.stt-equip-pop-mut{color:#5b7b88;font-size:12px;}';
    document.head.appendChild(s);
  }

  // ── montaje ────────────────────────────────────────────────────────────────
  function montarPanel() {
    if (panelEq) return;
    inyectarEstilos();
    panelEq = document.createElement('div');
    panelEq.className = 'stt-equip';
    panelEq.innerHTML =
      '<div class="stt-equip-tit"><span>🏙️ Equipamientos</span>' +
        '<button type="button" class="stt-equip-cerrar" id="stt-equip-cerrar" ' +
          'title="Cerrar" aria-label="Cerrar equipamientos">✕</button></div>' +
      '<div id="stt-equip-lista"></div>' +
      '<div class="stt-equip-estado" id="stt-equip-estado"></div>';
    listaBox = panelEq.querySelector('#stt-equip-lista');
    estEq = panelEq.querySelector('#stt-equip-estado');
    panelEq.querySelector('#stt-equip-cerrar').addEventListener('click', cerrarEqMovil);
    // Vive en un contenedor propio flotante (el mapa no lo aloja como control);
    // iniciarModoMovil → evaluarModoMovil lo muda a movilBox.
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
    montarPanel();
    iniciarModoMovil();
    mapa.on('moveend', function () {
      if (mapa && !hayFiguras(figurasActuales()) && catsActivas().length) {
        clearTimeout(debounceMove);
        debounceMove = setTimeout(actualizarEq, 600);
      }
    });
    document.addEventListener('stt:figuras-cambio', function () {
      if (catsActivas().length) actualizarEq();
    });
  }

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
