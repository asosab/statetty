// ---------------------------------------------
// mapaFiguras.js — stack único de figuras de área (polígono / circunferencia)
// para el mapa unificado. Reemplaza las DOS copias que existían (inline en
// mapaSimple.html y dentro de initCajaFind en mapa.js).
//
// Polígono (lápiz): click a click — cada click en el mapa deja un punto; el
// último se une al penúltimo y, desde el tercero, también al primero (el área
// se cierra sola). Mínimo 3 puntos. El mapa sigue navegable mientras se
// dibuja (arrastrar pan, rueda/pinza zoom); solo el doble-click-zoom queda
// apagado para que no vuele el zoom al marcar rápido.
// Circunferencia (pin): apretar y arrastrar desde el centro, como siempre.
// Deshacer: quita los puntos del último polígono en orden inverso a su
// creación; una circunferencia se borra entera (es una sola creación).
//
// Cada figura lleva una caja informativa dinámica (tooltip permanente): m²
// de superficie y metros de borde en vivo; tras una búsqueda suma inmuebles
// contenidos, precio ponderado (media recortada 15% sobre la mediana, igual
// que mediaPonderada de acm.js), precio máximo/mínimo, y tipo de inmueble y
// de negocio predominantes. Los contenidos salen del array global `markers`
// que llenan renderMap (agente) y STT_MAPA_PUBLICO.pintar (público); ambos
// llaman STT_FIGURAS.actualizarStats() al terminar de pintar.
//
// API:
//   STT_FIGURAS.bind({map, btnLapiz, btnPin, btnDeshacer, avisar, onActivar})
//   STT_FIGURAS.conectarMapa(map)      // cuando el mapa existe/ cambia
//   STT_FIGURAS.datosDe('poligono'|'circunferencia')
//   STT_FIGURAS.hayFiguras()
//   STT_FIGURAS.limpiar()              // quita todas las figuras del mapa
//   STT_FIGURAS.cargar(datos)          // reemplaza la pila con figuras de un JSON
//   STT_FIGURAS.actualizarStats()      // refresca las cajas tras una búsqueda
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
  var R_TIERRA = 6378137;    // metros, para área/perímetro/contención
  var HANDLERS = ['dragging', 'touchZoom', 'doubleClickZoom', 'boxZoom'];
  var ESTILO_PUNTO = {
    radius: 5, color: '#04364a', weight: 2,
    fillColor: '#ffd54a', fillOpacity: 1, interactive: false
  };

  var mapa = null;
  var contenedor = null;
  var figuras = [];          // pila: la más antigua primero, la más nueva al final
  var herramienta = null;    // 'poligono' | 'circunferencia' | null
  var trazo = null;          // circunferencia en curso mientras el puntero está presionado
  var dibujo = null;         // polígono en edición (los clicks le agregan puntos)
  var busquedaHecha = false; // tras pintar resultados las cajas suman sus stats
  var mapaClickBound = null; // el mapa donde ya quedó atado el click de vértices

  var btnLapiz = null, btnPin = null, btnDeshacer = null;
  var _avisar = function () {};
  var _leer = null;          // lector del aviso vigente (lo provee la caja)
  var _onActivar = null;     // hook: la caja fija su posición al activar
  var hintActivo = null;     // indicativo propio que sigue en pantalla
  var hoverActivo = null;    // tipo del botón bajo el puntero, o null
  var hoverPrev = '';        // aviso previo, a restaurar cuando el puntero sale

  // Solo las figuras "formadas" cuentan como zona: un polígono con menos de
  // 3 puntos todavía no es área (está en edición o quedó trunco al deshacer).
  function formada(f) { return f.tipo === 'circunferencia' || (f.pts && f.pts.length >= PUNTOS_MIN); }
  // El polígono en edición todavía no es área: no cuenta para el tope hasta
  // cerrarse con el tercer punto (si no, el primer vértice del 10.º polígono
  // apagaría el lápiz y descartaría el dibujo).
  function contar(tipo) { return figuras.filter(function (f) { return f.tipo === tipo && formada(f); }).length; }
  function redondear(n, d) { return Number(n.toFixed(d)); }

  function refrescarBotones() {
    if (btnLapiz) btnLapiz.disabled = contar('poligono') >= LIMITE.poligono;
    if (btnPin) btnPin.disabled = contar('circunferencia') >= LIMITE.circunferencia;
    if (btnDeshacer) btnDeshacer.disabled = !figuras.length;
    if (btnLapiz) btnLapiz.setAttribute('aria-pressed', herramienta === 'poligono' ? 'true' : 'false');
    if (btnPin) btnPin.setAttribute('aria-pressed', herramienta === 'circunferencia' ? 'true' : 'false');
    if (herramienta && contar(herramienta) >= LIMITE[herramienta]) activar(null);
  }

  function hintDe(tipo) {
    return tipo === 'poligono'
      ? 'Haz click en el mapa para colocar los puntos del área (mínimo 3).'
      : 'Presiona el centro y arrastra para definir el radio.';
  }

  // Quita el indicativo solo si el aviso sigue siendo el nuestro: si otra cosa
  // lo pisó (resultado de búsqueda, error) ese mensaje no se toca.
  function soltarHint() {
    if (!hintActivo) return;
    if (!_leer || _leer() === hintActivo) _avisar('', false);
    hintActivo = null;
  }

  // El lápiz necesita el mapa navegable (los vértices van con click: hay que
  // poder hacer pan/zoom entre punto y punto); solo el doble-click-zoom se
  // apaga. La circunferencia sigue congelando todo: arrastrar es su gesto.
  function aplicarHandlers() {
    if (!mapa) return;
    var set = function (h, metodo) { if (mapa[h] && typeof mapa[h][metodo] === 'function') mapa[h][metodo](); };
    if (herramienta === 'circunferencia') {
      HANDLERS.forEach(function (h) { set(h, 'disable'); });
    } else if (herramienta === 'poligono') {
      HANDLERS.forEach(function (h) { set(h, 'enable'); });
      set('doubleClickZoom', 'disable');
    } else {
      HANDLERS.forEach(function (h) { set(h, 'enable'); });
    }
  }

  // Cierra la edición del polígono en curso: con 3+ puntos la figura ya está
  // formada y se queda; con menos se descarta (un par de puntos sin área no
  // sirve de zona de búsqueda).
  function cerrarDibujo() {
    if (!dibujo) return;
    if (dibujo.pts.length < PUNTOS_MIN) quitarFigura(dibujo);
    dibujo = null;
    refrescarBotones();
  }

  function activar(tipo) {
    if (tipo && contar(tipo) >= LIMITE[tipo]) return;
    if (herramienta !== tipo) cerrarDibujo();
    herramienta = tipo;
    refrescarBotones();
    if (contenedor) {
      contenedor.classList.toggle('dibujando', !!tipo);
      // Con el lápiz el touch sigue siendo pan/pinza (pan-libre anula el
      // touch-action:none del dibujo a mano alzada que usaba antes).
      contenedor.classList.toggle('pan-libre', tipo === 'poligono');
    }
    aplicarHandlers();
    if (tipo) { hintActivo = hintDe(tipo); _avisar(hintActivo, false); }
    else soltarHint();
  }

  // Apaga la herramienta activa (las búsquedas la llaman al arrancar y al
  // terminar): el click siguiente sobre el mapa vuelve a ser pan/zoom, no un
  // dibujo. También cancela un trazo a medio hacer y el polígono en edición.
  function desactivar() {
    if (trazo) {
      if (mapa && trazo.capa) mapa.removeLayer(trazo.capa);
      trazo = null;
    }
    cerrarDibujo();
    if (herramienta) activar(null);
  }

  // Limpiar círculo vestigio de búsqueda al empezar/continuar dibujo.
  function limpiarCirculoBusqueda() {
    if (typeof circuloBusqueda !== 'undefined' && circuloBusqueda && mapa && mapa.hasLayer(circuloBusqueda)) {
      mapa.removeLayer(circuloBusqueda);
      circuloBusqueda = null;
    }
  }

  function quitarCapas(f) {
    if (!mapa) return;
    if (f.forma) mapa.removeLayer(f.forma);
    (f.marcas || []).forEach(function (m) { mapa.removeLayer(m); });
    if (f.capa) mapa.removeLayer(f.capa);
    if (f.info) mapa.removeLayer(f.info);
  }

  function quitarFigura(f) {
    var i = figuras.indexOf(f);
    if (i > -1) figuras.splice(i, 1);
    quitarCapas(f);
    if (dibujo === f) dibujo = null;
  }

  // ---------- medidas (haversine local: no depende de la proyección) ----------

  function distM(a, b) {
    var rad = Math.PI / 180;
    var dLa = (b.lat - a.lat) * rad, dLn = (b.lng - a.lng) * rad;
    var h = Math.sin(dLa / 2) * Math.sin(dLa / 2) +
            Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLn / 2) * Math.sin(dLn / 2);
    return 2 * R_TIERRA * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function superficieDe(f) {
    if (f.tipo === 'circunferencia') return Math.PI * f.datos.radio * f.datos.radio;
    var pts = f.pts || [];
    if (pts.length < PUNTOS_MIN) return 0;
    // Área geodésica por exceso esférico (la misma fórmula de Leaflet.draw).
    var rad = Math.PI / 180, area = 0;
    for (var i = 0; i < pts.length; i++) {
      var p1 = pts[i], p2 = pts[(i + 1) % pts.length];
      area += (p2.lng - p1.lng) * rad * (2 + Math.sin(p1.lat * rad) + Math.sin(p2.lat * rad));
    }
    return Math.abs(area * R_TIERRA * R_TIERRA / 2);
  }

  function perimetroDe(f) {
    if (f.tipo === 'circunferencia') return 2 * Math.PI * f.datos.radio;
    var pts = f.pts || [];
    if (pts.length < 2) return 0;
    var s = distM(pts[0], pts[pts.length - 1]); // el último se une al primero
    for (var i = 1; i < pts.length; i++) s += distM(pts[i - 1], pts[i]);
    return s;
  }

  function centroDe(f) {
    if (f.tipo === 'circunferencia') return { lat: f.datos.lat, lng: f.datos.lng };
    var pts = f.pts || [], n = Math.max(pts.length, 1), la = 0, ln = 0;
    pts.forEach(function (p) { la += p.lat; ln += p.lng; });
    return { lat: la / n, lng: ln / n };
  }

  // ---------- caja informativa por figura ----------

  function marcadoresVivos() {
    return (typeof markers !== 'undefined' && Array.isArray(markers)) ? markers : [];
  }

  // Ray casting sobre los vértices (x = lng, y = lat), como puntoEnPoligono
  // de mapaShared pero con el formato {lat,lng} de f.pts.
  function puntoDentro(lat, lng, pts) {
    var dentro = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i].lng, yi = pts[i].lat;
      var xj = pts[j].lng, yj = pts[j].lat;
      if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
        dentro = !dentro;
      }
    }
    return dentro;
  }

  function contiene(f, lat, lng) {
    if (f.tipo === 'circunferencia') {
      return distM({ lat: f.datos.lat, lng: f.datos.lng }, { lat: lat, lng: lng }) <= f.datos.radio;
    }
    return !!(f.pts && f.pts.length >= PUNTOS_MIN) && puntoDentro(lat, lng, f.pts);
  }

  function contenidos(f) {
    var dentro = [];
    marcadoresVivos().forEach(function (m) {
      var d = m && m.dato;
      if (!d) return;
      var la = parseFloat(d.lat), ln = parseFloat(d.lng);
      if (!isFinite(la) || !isFinite(ln)) return;
      if (contiene(f, la, ln)) dentro.push(d);
    });
    return dentro;
  }

  // Media ponderada del proyecto: recorta los valores que se alejan más del
  // 15% de la mediana y promedia el resto (misma regla que acm.js).
  function ponderadoDe(precios) {
    var arr = precios.filter(function (v) { return isFinite(v) && v > 0; })
      .sort(function (a, b) { return a - b; });
    if (!arr.length) return 0;
    var med = arr[Math.floor(arr.length / 2)];
    var base = arr.filter(function (v) { return v >= med * 0.85 && v <= med * 1.15; });
    if (!base.length) base = arr;
    return Math.round(base.reduce(function (s, v) { return s + v; }, 0) / base.length);
  }

  function modaDe(valores) {
    var cuenta = {}, mejor = '', n = 0;
    valores.forEach(function (v) {
      v = String(v == null ? '' : v).trim();
      if (!v) return;
      cuenta[v] = (cuenta[v] || 0) + 1;
      if (cuenta[v] > n) { n = cuenta[v]; mejor = v; }
    });
    return mejor;
  }

  function escInfo(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function milesInfo(n) {
    try { return Math.round(n).toLocaleString('es-BO'); }
    catch (e) { return String(Math.round(n)); }
  }

  function htmlInfo(f) {
    var lin = [];
    var esFormada = formada(f);
    if (!esFormada) {
      lin.push('<b>' + f.pts.length + '/' + PUNTOS_MIN + ' puntos</b>');
    } else {
      lin.push('<b>' + milesInfo(superficieDe(f)) + ' m²</b> · borde ' + milesInfo(perimetroDe(f)) + ' m');
    }
    if (esFormada && busquedaHecha) {
      var dentro = contenidos(f);
      lin.push('<b>' + dentro.length + '</b> ' + (dentro.length === 1 ? 'inmueble' : 'inmuebles'));
      var precios = dentro.map(function (d) { return parseFloat(d.precio); })
        .filter(function (v) { return isFinite(v) && v > 0; });
      if (precios.length) {
        lin.push('pond. <b>USD ' + milesInfo(ponderadoDe(precios)) + '</b> · ' +
          'máx ' + milesInfo(Math.max.apply(Math, precios)) + ' · mín ' + milesInfo(Math.min.apply(Math, precios)));
      }
      var tipo = modaDe(dentro.map(function (d) { return d.tipoInmueble; }));
      var negocio = modaDe(dentro.map(function (d) { return d.tipoNegocio; }));
      var etiqueta = '';
      if (tipo) {
        etiqueta = ((typeof emojiTipo === 'function') ? emojiTipo(tipo) + ' ' : '') + escInfo(tipo);
      }
      if (negocio) etiqueta += (etiqueta ? ' · ' : '') + escInfo(negocio);
      if (etiqueta) lin.push(etiqueta);
    }
    return lin.map(function (l) { return '<div>' + l + '</div>'; }).join('');
  }

  // La caja es un tooltip permanente anclado al centro de la figura; su texto
  // se rehace en cada cambio (punto nuevo, deshacer, resultado de búsqueda).
  function asegurarInfo(f) {
    if (f.info || !mapa || typeof L.tooltip !== 'function') return;
    f.info = L.tooltip({
      permanent: true, direction: 'center', interactive: false,
      className: 'stt-figura-info', opacity: 1
    }).setContent(htmlInfo(f)).setLatLng(centroDe(f));
    f.info.addTo(mapa);
  }

  function actualizarInfo(f) {
    asegurarInfo(f);
    if (!f.info) return;
    f.info.setLatLng(centroDe(f));
    f.info.setContent(htmlInfo(f));
  }

  // Se llama cuando termina de pintarse una búsqueda (renderMapFin del modo
  // agente, STT_MAPA_PUBLICO.pintar del público): los contadores salen de los
  // `markers` vigentes en ese momento. Con marcar=false solo refresca contra
  // los markers actuales sin contar como "búsqueda hecha" (render limpiado).
  function actualizarStats(marcar) {
    if (marcar !== false) busquedaHecha = true;
    figuras.forEach(actualizarInfo);
  }

  // ---------- polígono: click a click ----------

  function onMapaClick(e) {
    if (herramienta !== 'poligono' || !mapa || !e || !e.latlng) return;
    agregarVertice(e.latlng);
  }

  // Distancia en píxeles de pantalla: un doble click (o un tap que repite el
  // punto) no debe crear dos vértices encimados.
  function distPx(a, b) {
    try {
      if (mapa && typeof mapa.latLngToContainerPoint === 'function') {
        return mapa.latLngToContainerPoint(a).distanceTo(mapa.latLngToContainerPoint(b));
      }
    } catch (e) {}
    return (Math.abs(a.lat - b.lat) + Math.abs(a.lng - b.lng)) < 0.000002 ? 0 : 999;
  }

  function sincronizarDatos(f) {
    f.datos.puntos = f.pts.map(function (p) {
      return { lat: redondear(p.lat, 6), lng: redondear(p.lng, 6) };
    });
  }

  // Redibuja el contorno del polígono: con 1 punto solo hay marcas, con 2 una
  // línea abierta, con 3+ el polígono relleno que se cierra solo (último →
  // primero). Las marcas se re-agregan después para que queden sobre el relleno.
  function reconstruirForma(f) {
    if (!mapa) return;
    if (f.forma) { mapa.removeLayer(f.forma); f.forma = null; }
    if (f.pts.length >= PUNTOS_MIN) {
      f.forma = L.polygon(f.pts, ESTILO_AREA).addTo(mapa);
    } else if (f.pts.length >= 2) {
      f.forma = L.polyline(f.pts, { color: ESTILO_AREA.color, weight: 2, interactive: false }).addTo(mapa);
    }
    f.marcas.forEach(function (m) { mapa.removeLayer(m); m.addTo(mapa); });
  }

  function agregarVertice(ll) {
    if (!dibujo || figuras.indexOf(dibujo) === -1) {
      dibujo = { tipo: 'poligono', pts: [], marcas: [], forma: null, info: null, datos: { puntos: [] } };
      figuras.push(dibujo);
    }
    if (dibujo.pts.length >= PUNTOS_MAX) return;
    var n = dibujo.pts.length;
    if (n && distPx(dibujo.pts[n - 1], ll) < 3) return;
    limpiarCirculoBusqueda();
    dibujo.pts.push({ lat: ll.lat, lng: ll.lng });
    dibujo.marcas.push(L.circleMarker(ll, ESTILO_PUNTO).addTo(mapa));
    reconstruirForma(dibujo);
    sincronizarDatos(dibujo);
    actualizarInfo(dibujo);
    hintActivo = dibujo.pts.length < PUNTOS_MIN
      ? 'Punto ' + dibujo.pts.length + ' colocado. Con ' + PUNTOS_MIN + ' o más el área se cierra sola.'
      : 'Área cerrada con ' + dibujo.pts.length + ' puntos. Sigue agregando o apaga el lápiz.';
    _avisar(hintActivo, false);
    refrescarBotones();
    avisarCambio();
  }

  // ---------- circunferencia: apretar y arrastrar (sin cambios) ----------

  function iniciarTrazo(e) {
    if (herramienta !== 'circunferencia' || trazo || !mapa || e.button !== 0) return;
    if (e.target.closest && e.target.closest('.leaflet-control')) return;
    e.preventDefault();
    e.stopPropagation();
    contenedor.setPointerCapture(e.pointerId);
    var ll = mapa.mouseEventToLatLng(e);
    trazo = { id: e.pointerId, tipo: 'circunferencia' };
    limpiarCirculoBusqueda();
    trazo.centro = ll;
    trazo.circulo = L.circle(ll, L.extend({ radius: 1, interactive: false }, ESTILO_AREA));
    var centro = L.circleMarker(ll, {
      radius: 4, color: '#04364a', weight: 2, fillColor: '#ffd54a', fillOpacity: 1, interactive: false
    });
    trazo.capa = L.featureGroup([trazo.circulo, centro]).addTo(mapa);
  }

  function moverTrazo(e) {
    if (!trazo || !mapa || e.pointerId !== trazo.id) return;
    trazo.circulo.setRadius(trazo.centro.distanceTo(mapa.mouseEventToLatLng(e)));
  }

  function terminarTrazo(e, ok) {
    if (!trazo || !mapa || e.pointerId !== trazo.id) return;
    var t = trazo;
    trazo = null;
    if (contenedor.hasPointerCapture(e.pointerId)) contenedor.releasePointerCapture(e.pointerId);
    var figura = null;
    if (ok && t.circulo.getRadius() >= RADIO_MIN) {
      figura = {
        tipo: 'circunferencia',
        capa: t.capa,
        marcas: [], forma: null, info: null,
        datos: { lat: redondear(t.centro.lat, 6), lng: redondear(t.centro.lng, 6), radio: Math.round(t.circulo.getRadius()) }
      };
    }
    if (!figura) {
      mapa.removeLayer(t.capa);
      if (ok) { hintActivo = null; _avisar('El trazo fue muy corto. Intenta de nuevo.', true); }
      return;
    }
    figuras.push(figura);
    limpiarCirculoBusqueda();
    actualizarInfo(figura);
    soltarHint();
    refrescarBotones();
    avisarCambio();
  }

  function avisarCambio() {
    try { document.dispatchEvent(new Event('stt:figuras-cambio')); } catch (e) {}
  }

  function conectarMapa(m) {
    mapa = m;
    contenedor = m.getContainer ? m.getContainer() : document.getElementById('mapid');
    if (contenedor && !contenedor._sttFigBound) {
      // Captura: se atiende antes que Leaflet para que no arrastre el mapa ni
      // abra popups. Solo la circunferencia usa estos eventos (ver iniciarTrazo).
      contenedor._sttFigBound = true;
      contenedor.addEventListener('pointerdown', iniciarTrazo, true);
      contenedor.addEventListener('pointermove', moverTrazo);
      contenedor.addEventListener('pointerup', function (e) { terminarTrazo(e, true); });
      contenedor.addEventListener('pointercancel', function (e) { terminarTrazo(e, false); });
    }
    // Los vértices del polígono entran por el click de Leaflet: él mismo
    // suprime el click si el puntero arrastró, así el pan no deja puntos.
    if (mapaClickBound !== m && typeof m.on === 'function') {
      m.on('click', onMapaClick);
      mapaClickBound = m;
    }
    // La herramienta pudo activarse antes de que existiera el mapa.
    aplicarHandlers();
  }

  // Hover sobre lápiz/pin: muestra el indicativo de esa herramienta aunque el
  // botón esté apagado, y al salir el puntero restaura lo que había (el hint
  // de la herramienta activa, o el aviso previo). Si el aviso previo era un
  // hint de herramienta ya apagada, no se restaura: apagado = sin indicativo.
  function bindHover(btn, tipo) {
    if (!btn || btn._sttHoverBound) return;
    btn._sttHoverBound = true;
    btn.addEventListener('pointerenter', function () {
      if (hoverActivo === null) hoverPrev = _leer ? _leer() : '';
      hoverActivo = tipo;
      _avisar(hintDe(tipo), false);
    });
    btn.addEventListener('pointerleave', function () {
      var era = hoverActivo;
      hoverActivo = null;
      if (era === null) return;
      // Otro texto pisó el hint del hover mientras el puntero estaba encima:
      // no hay nada que restaurar.
      if (_leer && _leer() !== hintDe(era)) { hoverPrev = ''; return; }
      if (herramienta) { hintActivo = hintDe(herramienta); _avisar(hintActivo, false); }
      else {
        hintActivo = null;
        var prev = (hoverPrev === hintDe('poligono') || hoverPrev === hintDe('circunferencia')) ? '' : hoverPrev;
        _avisar(prev, false);
      }
      hoverPrev = '';
    });
  }

  // Deshacer quita los puntos del último polígono en orden inverso a su
  // creación; al quedar sin puntos la figura se elimina. Una circunferencia
  // no tiene puntos que deshacer: se borra entera.
  function deshacer() {
    var f = figuras[figuras.length - 1];
    if (!f) return;
    if (f.tipo === 'poligono' && f.pts) {
      f.pts.pop();
      var marca = f.marcas.pop();
      if (marca && mapa) mapa.removeLayer(marca);
      if (f.pts.length) {
        reconstruirForma(f);
        sincronizarDatos(f);
        actualizarInfo(f);
      } else {
        quitarFigura(f);
      }
    } else {
      quitarFigura(f);
    }
    refrescarBotones();
    soltarHint();
    avisarCambio();
  }

  function bind(opts) {
    opts = opts || {};
    btnLapiz = opts.btnLapiz || btnLapiz;
    btnPin = opts.btnPin || btnPin;
    btnDeshacer = opts.btnDeshacer || btnDeshacer;
    if (typeof opts.avisar === 'function') _avisar = opts.avisar;
    if (typeof opts.leer === 'function') _leer = opts.leer;
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
    if (btnDeshacer) btnDeshacer.addEventListener('click', deshacer);
    bindHover(btnLapiz, 'poligono');
    bindHover(btnPin, 'circunferencia');
    refrescarBotones();
  }

  function datosDe(tipo) {
    return figuras.filter(function (f) { return f.tipo === tipo && formada(f); })
      .map(function (f) { return f.datos; });
  }

  function limpiar() {
    figuras.slice().forEach(quitarFigura);
    dibujo = null;
    activar(null);
    refrescarBotones();
    avisarCambio();
  }

  // Reemplaza la pila con las figuras serializadas de una búsqueda compartida
  // (botón «Pegar búsqueda» de fndInm.js). Acepta exactamente la forma que
  // devuelve window.STT_MAP_FIGURAS():
  //   { poligono: [{puntos:[{lat,lng}...]}...], circunferencia: [{lat,lng,radio}...] }
  // Las entradas inválidas se saltan; si la lista total pasa de LIMITE se
  // restauran solo las primeras. Devuelve cuántas figuras quedaron dibujadas.
  // Se llama siempre (también con datos vacíos) para que pegar una búsqueda
  // sin figuras limpie las que el usuario tenía dibujadas.
  function cargar(datos) {
    limpiar();
    if (!mapa || !datos || typeof datos !== 'object') return 0;
    var restauradas = 0;
    var bounds = [];

    (Array.isArray(datos.poligono) ? datos.poligono : []).forEach(function (p) {
      if (contar('poligono') >= LIMITE.poligono) return;
      var pts = (p && Array.isArray(p.puntos) ? p.puntos : [])
        .filter(function (q) { return q && isFinite(Number(q.lat)) && isFinite(Number(q.lng)); })
        .map(function (q) { return { lat: Number(q.lat), lng: Number(q.lng) }; });
      if (pts.length < PUNTOS_MIN) return;
      var f = {
        tipo: 'poligono', pts: pts, marcas: [], forma: null, capa: null, info: null,
        datos: { puntos: pts.map(function (q) { return { lat: q.lat, lng: q.lng }; }) }
      };
      f.forma = L.polygon(pts, ESTILO_AREA).addTo(mapa);
      pts.forEach(function (q) { f.marcas.push(L.circleMarker(q, ESTILO_PUNTO).addTo(mapa)); });
      figuras.push(f);
      actualizarInfo(f);
      bounds = bounds.concat(pts);
      restauradas++;
    });

    (Array.isArray(datos.circunferencia) ? datos.circunferencia : []).forEach(function (c) {
      if (contar('circunferencia') >= LIMITE.circunferencia) return;
      var lat = Number(c && c.lat), lng = Number(c && c.lng), r = Number(c && c.radio);
      if (!isFinite(lat) || !isFinite(lng) || !isFinite(r) || r < RADIO_MIN) return;
      var centro = L.latLng(lat, lng);
      var capa = L.featureGroup([
        L.circle(centro, L.extend({ radius: r, interactive: false }, ESTILO_AREA)),
        L.circleMarker(centro, {
          radius: 4, color: '#04364a', weight: 2, fillColor: '#ffd54a', fillOpacity: 1, interactive: false
        })
      ]).addTo(mapa);
      var f = {
        tipo: 'circunferencia', capa: capa, marcas: [], forma: null, info: null,
        datos: { lat: lat, lng: lng, radio: Math.round(r) }
      };
      figuras.push(f);
      actualizarInfo(f);
      // El fitBounds necesita esquinas, no el centro: se agregan los cuatro
      // extremos del círculo (1° lat ≈ 110.54 km, 1° lng ≈ 111.32·cos(lat) km).
      var dLat = r / 110540, dLng = r / (111320 * Math.max(Math.cos(lat * Math.PI / 180), 0.01));
      bounds.push({ lat: lat - dLat, lng: lng }, { lat: lat + dLat, lng: lng },
                  { lat: lat, lng: lng - dLng }, { lat: lat, lng: lng + dLng });
      restauradas++;
    });

    if (bounds.length && typeof mapa.fitBounds === 'function') {
      try { mapa.fitBounds(bounds, { padding: [30, 30] }); } catch (e) {}
    }
    refrescarBotones();
    if (restauradas) avisarCambio();
    return restauradas;
  }

  // Figuras vivas para el resto de la página: el form #fndInm del toolbox las
  // adjunta a su POST para que la superficie dibujada mande SIEMPRE sobre
  // lat/lng/dist (plan figuras-sobrescriben-geografia, D2/D3). Solo viajan las
  // formadas: un polígono a medio editar (<3 puntos) no define área.
  window.STT_MAP_FIGURAS = function () {
    return { poligono: datosDe('poligono'), circunferencia: datosDe('circunferencia') };
  };

  window.STT_FIGURAS = {
    bind: bind,
    conectarMapa: conectarMapa,
    datosDe: datosDe,
    desactivar: desactivar,
    hayFiguras: function () { return figuras.some(formada); },
    limpiar: limpiar,
    cargar: cargar,
    actualizarStats: actualizarStats,
    LIMITE: LIMITE,
    RADIO_MIN: RADIO_MIN,
    PUNTOS_MIN: PUNTOS_MIN,
    PUNTOS_MAX: PUNTOS_MAX
  };
})();
