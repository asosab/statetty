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

  var mapa = null;
  var panelEq = null, panelHome = null;
  var estEq = null, listaBox = null;
  var capaEq = null;                 // L.layerGroup con los marcadores
  var activas = {};                  // categoria → true
  var cacheEq = {};                  // key bbox+figuras+cats → items
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

  function colorCat(slug) {
    var h = 0;
    for (var i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
    return 'hsl(' + (Math.abs(h) % 360) + ',70%,38%)';
  }

  function avisar(txt, esError) {
    if (!estEq) return;
    estEq.textContent = txt || '';
    estEq.className = 'stt-equip-estado' + (esError ? ' error' : '');
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

  function dentroDeFiguras(lng, lat, fig) {
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

  function bboxDeZona(fig) {
    if (hayFiguras(fig)) return bboxDeFiguras(fig);
    var b = mapa.getBounds();
    return { minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() };
  }

  function claveZona(fig, bb, cats) {
    var partes = [bb.minLng.toFixed(4), bb.minLat.toFixed(4), bb.maxLng.toFixed(4), bb.maxLat.toFixed(4), cats.join('+')];
    if (hayFiguras(fig)) {
      var s = JSON.stringify(fig), h = 0;
      for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
      partes.push('f' + h);
    }
    return partes.join(',');
  }

  // ── pintado ────────────────────────────────────────────────────────────────
  var rendererEq = null;
  function tooltipEq(e) {
    var t = '<b>' + (e.nombre || nombreCat(e.categoria)) + '</b>';
    if (e.rating != null) t += '<br>★ ' + e.rating + (e.reviews ? ' (' + e.reviews + ' reseñas)' : '');
    else if (e.reviews) t += '<br>' + e.reviews + ' reseñas';
    if (e.direccion) t += '<br>' + e.direccion;
    return t;
  }

  function pintarEq(items, fig) {
    if (!mapa) return;
    if (!capaEq) capaEq = L.layerGroup().addTo(mapa);
    if (!rendererEq) rendererEq = L.canvas({ padding: 0.5 });
    capaEq.clearLayers();
    var conFigs = hayFiguras(fig);
    var pintados = 0;
    items.forEach(function (e) {
      if (e.lat == null || e.lng == null) return;
      if (conFigs && !dentroDeFiguras(e.lng, e.lat, fig)) return;
      var col = colorCat(e.categoria || '');
      L.circleMarker([e.lat, e.lng], {
        radius: 6, color: '#fff', weight: 1.5,
        fillColor: col, fillOpacity: 0.85,
        renderer: rendererEq
      }).bindTooltip(tooltipEq(e), { sticky: true }).addTo(capaEq);
      pintados++;
    });
    if (!pintados) {
      avisar(conFigs
        ? 'La zona marcada no tiene equipamientos de este tipo.'
        : 'Esta vista no tiene equipamientos de este tipo (cobertura: Santa Cruz).', true);
      return;
    }
    avisar(pintados + ' en la zona' + (items.length >= 5000 ? ' (tope de 5000 alcanzado)' : '') +
      '. Pasa el cursor para ver el detalle.', false);
  }

  function catsActivas() {
    return Object.keys(activas).filter(function (k) { return activas[k]; });
  }

  function actualizarEq() {
    var cats = catsActivas();
    if (!mapa || !cats.length) return;
    var fig = figurasActuales();
    var bb = bboxDeZona(fig);
    var clave = claveZona(fig, bb, cats);
    peticionEq++;
    var miReq = peticionEq;
    avisar('Cargando equipamientos…', false);
    if (cacheEq[clave]) { pintarEq(cacheEq[clave], fig); return; }
    var q = 'minLng=' + bb.minLng + '&minLat=' + bb.minLat +
            '&maxLng=' + bb.maxLng + '&maxLat=' + bb.maxLat +
            '&categoria=' + encodeURIComponent(cats.join(','));
    fetch(baseApi() + API_EQUIP + '?' + q).then(function (r) {
      if (r.status === 429) { avisar('Demasiadas consultas. Espera un minuto.', true); return null; }
      if (!r.ok) { avisar('No se pudieron cargar los equipamientos (' + r.status + ').', true); return null; }
      return r.json();
    }).then(function (d) {
      if (peticionEq !== miReq || !catsActivas().length) return;
      if (!d || d.ok === false) { avisar('Sin datos de equipamientos en esta zona.', true); return; }
      var items = d.equipamientos || [];
      cacheEq[clave] = items;
      pintarEq(items, fig);
    }).catch(function () {
      if (peticionEq === miReq) avisar('Falló la consulta. Revisa tu conexión.', true);
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
        cacheEq = {};
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
    fetch(baseApi() + API_CATS).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
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
      '.stt-equip-movil .stt-equip{margin:0;max-width:86vw;}' +
      '.stt-equip-movil.colapsado .stt-equip{display:none;}' +
      '.stt-equip-movil:not(.colapsado) .stt-equip-icono{display:none;}' +
      '.stt-equip-icono{width:44px;height:44px;border-radius:50%;padding:0;' +
        'border:1px solid #cfe9f5;background:rgba(255,255,255,.95);color:#04364a;' +
        'font-size:20px;line-height:1;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25);}' +
      '.stt-equip-icono:active{transform:scale(.94);}';
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
