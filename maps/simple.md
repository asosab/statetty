---
layout:             map
title:              "Buscador de inmuebles en el mapa"
date:               2026-09-27
categories:         mapas,Búsquedas
description:        "Escribe lo que estás buscando y mira los 10 inmuebles más nuevos en el mapa."
tags:               [búsquedas,mapa,texto]
published:          true
image:              mapa.png
---

<!-- CSS del header (site) que usa _includes/header.html. Va en la página, no en
     _includes/headMaps.html, para no cambiar las otras 3 páginas de mapa. -->
<link href='https://fonts.googleapis.com/css?family=Lato:300,400,300italic,400italic' rel='stylesheet' type='text/css'>
<link href='https://fonts.googleapis.com/css?family=Montserrat:400,700' rel='stylesheet' type='text/css'>
<link rel="stylesheet" href="/assets/plugins/bootstrap/css/bootstrap.min.css">
<link rel="stylesheet" href="/assets/css/theme-1.css">
<link rel="stylesheet" href="/assets/css/statettyAccesibilidad.css">

{% include header.html %}

<style>
  /* .header es position:fixed con 64px: el mapa arranca debajo. */
  #mapid { width: 100%; height: calc(100vh - 64px); margin-top: 64px; }
  /* Posiciones de la caja (fixed = relativa a la pantalla visible):
     inicio: centro vertical | .con-resultados: top 70% | .abajo: pegada a la base. */
  #caja {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    z-index: 1100; width: min(92vw, 520px); background: #fff;
    border-radius: 12px; padding: 14px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, .25);
    transition: top .5s ease, transform .5s ease;
  }
  #caja.con-resultados { top: 70%; }
  /* 28px de margen para no tapar la atribución de OpenStreetMap */
  #caja.abajo { top: calc(100% - 28px); transform: translate(-50%, -100%); }
  @media (prefers-reduced-motion: reduce) { #caja { transition: none; } }
  #caja form { display: flex; gap: 8px; }
  #caja input {
    flex: 1; min-width: 0; padding: 10px 12px; font-size: 1rem;
    border: 1px solid #ccc; border-radius: 8px;
  }
  #caja input:focus { outline: 2px solid #17baef; outline-offset: 1px; }
  #caja button {
    padding: 10px 18px; font-size: 1rem; font-weight: 700; cursor: pointer;
    color: #04364a; background: #ffd54a; border: 0; border-radius: 8px;
  }
  #caja button:disabled { opacity: .6; cursor: wait; }
  #estado { margin-top: 8px; min-height: 1.2em; font-size: .9rem; color: #04364a; }
  #estado.error { color: #b3261e; }

  /* Pin con insignia de tipo de inmueble */
  .pin-tipo { background: none; border: 0; }
  .pin-tipo .pin-img {
    display: block; width: 40px; height: 60px;
    filter: drop-shadow(0 2px 2px rgba(0, 0, 0, .35));
  }
  .pin-tipo .pin-emoji {
    position: absolute; top: -4px; left: -6px;
    width: 22px; height: 22px; line-height: 22px; text-align: center;
    font-size: 14px; background: #fff; border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0, 0, 0, .35); pointer-events: none;
  }


  /* buddy: en esta página solo va el mapa. Estos elementos los crea el JS al vuelo
     con estilos inline, así que el !important es necesario para ganarle. */
  #buddy-chat-toggle, #buddy-chat, #buddy-character, #buddy-close, #buddy-backgrounds {
    display: none !important;
  }
</style>

<div id="mapid"></div>

<div id="caja">
  <form id="form-buscar" autocomplete="off">
    <input type="text" id="texto" name="texto" placeholder="escribe lo que estás buscando" aria-label="Qué inmueble estás buscando">
    <button type="submit" id="btn-buscar">Buscar</button>
  </form>
  <div id="estado" role="status" aria-live="polite"></div>
</div>

<!-- config.js no lo carga _includes/headMaps.html -->
<script src="/assets/js/config.js"></script>
<script>
(function () {
  'use strict';

  var CENTRO = [-17.7833281, -63.1821673];
  var PIN = '/assets/images/pointers/pointer_statetty.png';

  var map = L.map('mapid').setView(CENTRO, 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  setTimeout(function () { map.invalidateSize(); }, 300);

    // Cada grupo: un emoji y las palabras que lo activan (en minúscula y sin tildes).
  // Se busca como palabra completa dentro de tipoInmueble; ante varias
  // coincidencias gana la palabra más larga, así que el orden de los grupos no importa.
  var TIPO_INMUEBLE_EMOJI = [
    { '🏡': ['casa'] },
    { '🏢': ['departamento', 'apartment', 'monoambiente', 'penthouse', 'duplex'] },
    { '🌳': ['lote', 'terreno'] },
    { '💼': ['oficina'] },
    { '🏬': ['local comercial', 'local', 'tienda'] },
    { '🏛️': ['edificio'] },
    { '🏞️': ['quinta'] },
    { '🏘️': ['ph', 'condominio'] },
    { '🏭': ['deposito', 'galpon'] },
    { '🛏️': ['habitacion', 'cuarto'] }
  ];
  var EMOJI_DEFECTO = '📍';

  // Índice plano armado una sola vez al cargar la página.
  var TIPOS_INDEX = [];
  TIPO_INMUEBLE_EMOJI.forEach(function (grupo) {
    Object.keys(grupo).forEach(function (emoji) {
      grupo[emoji].forEach(function (clave) {
        TIPOS_INDEX.push({
          clave: clave,
          emoji: emoji,
          re: new RegExp('(^|[^a-z])' + clave + '([^a-z]|$)')
        });
      });
    });
  });
  TIPOS_INDEX.sort(function (a, b) { return b.clave.length - a.clave.length; });

  function emojiTipo(tipo) {
    var t = String(tipo == null ? '' : tipo).toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!t) return EMOJI_DEFECTO;
    for (var i = 0; i < TIPOS_INDEX.length; i++) {
      if (TIPOS_INDEX[i].re.test(t)) return TIPOS_INDEX[i].emoji;
    }
    return EMOJI_DEFECTO;
  }

  function iconoPara(tipo) {
    return L.divIcon({
      className: 'pin-tipo',
      html: '<img class="pin-img" src="' + PIN + '" alt="">' +
            '<span class="pin-emoji" aria-hidden="true">' + emojiTipo(tipo) + '</span>',
      iconSize: [40, 60], iconAnchor: [20, 60], popupAnchor: [1, -54],
    });
  }

  var form = document.getElementById('form-buscar');
  var input = document.getElementById('texto');
  var boton = document.getElementById('btn-buscar');
  var estado = document.getElementById('estado');
  var caja = document.getElementById('caja');
  var markers = [];

  // Posición de la caja. zoomRef es el zoom "de reposo": si el usuario supera ese
  // zoom la caja baja a la base; si vuelve a él (o menos) regresa a su posición.
  var zoomRef = map.getZoom();
  var respondio = false;   // true tras la primera respuesta válida del servidor

  function colocarCaja() {
    caja.className = map.getZoom() > zoomRef
      ? 'abajo'
      : (respondio ? 'con-resultados' : '');
  }
  map.on('zoomend', colocarCaja);

  // Los nombres vienen de portales externos: siempre como textContent.
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v) { return v == null || v === '' ? null : Number(v); }
  function miles(v) { return Number(v).toLocaleString('es-BO'); }

  function avisar(txt, esError) {
    estado.textContent = txt;
    estado.className = esError ? 'error' : '';
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
    markers.forEach(function (m) { map.removeLayer(m); });
    markers = [];
  }

  function pintar(resultados) {
    limpiar();
    (resultados || []).forEach(function (r) {
      var lat = num(r.lat), lng = num(r.lng);
      if (!isFinite(lat) || !isFinite(lng)) return;   // sin coordenadas no hay pin
      var m = L.marker([lat, lng], { icon: iconoPara(r.tipoInmueble) }).addTo(map);
      m.bindPopup(popup(r));
      markers.push(m);
    });
    if (!markers.length) { zoomRef = map.getZoom(); return; }
    // zoomRef = zoom que dejará el encuadre automático, para que ese zoom
    // programático no cuente como "zoom in" del usuario.
    if (markers.length === 1) {
      zoomRef = 15;
      map.setView(markers[0].getLatLng(), 15);
    } else {
      var b = L.featureGroup(markers).getBounds().pad(0.15);
      zoomRef = Math.min(map.getBoundsZoom(b), map.getMaxZoom());
      map.fitBounds(b);
    }
  }

  function buscar() {
    var texto = input.value.trim();
    if (!texto) {
      avisar('debes escribir algo para iniciar una búsqueda', true);
      return;
    }
    boton.disabled = true;
    avisar('Buscando...', false);
    var base = (window.STATETTY_CONFIG && STATETTY_CONFIG.WS_API_BASE) || '';
    fetch(base + 'statetty/buscarMapa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: texto }),
    }).then(function (r) {
      return r.json().then(function (d) { return { status: r.status, data: d }; });
    }).then(function (res) {
      if (res.status === 429) { avisar('Hiciste demasiadas búsquedas. Esperá un minuto e intentá de nuevo.', true); return; }
      if (res.status !== 200 || !res.data || !res.data.ok) {
        avisar('No se pudo interpretar la búsqueda. Probá con otra frase.', true);
        return;
      }
      respondio = true;
      pintar(res.data.resultados);
      colocarCaja();
      avisar(res.data.total
        ? res.data.total + (res.data.total === 1 ? ' inmueble encontrado' : ' inmuebles encontrados')
        : 'Sin resultados. Probá con menos filtros o otra zona.', !res.data.total);
    }).catch(function () {
      avisar('Falló la búsqueda. Revisá tu conexión e intentá de nuevo.', true);
    }).then(function () {
      boton.disabled = false;
    });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); buscar(); });
  input.addEventListener('input', function () {
    if (estado.className === 'error') avisar('', false);
  });
})();
</script>
