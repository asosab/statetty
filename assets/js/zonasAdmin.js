/* zonasAdmin.js — CRUD admin de `geoentidades` sobre el mapa (/maps/zonas/).
 * Lista las zonas nombradas del buscador agrupadas por zona geopolítica
 * (país → región → ciudad, mismos ubigeos del registro) y permite editar,
 * agregar o borrar coordenadas + listas de palabras. Solo role admin:
 * el servidor devuelve 403 `solo_admin` igual que /inmobiliarias.
 * Plan: opencode/nodelab/PLAN/zonas-geoentidades.md
 */
(function () {
  'use strict';

  var TIPOS = ['zona', 'sector', 'municipio', 'localidad', 'ciudad', 'provincia',
    'barrio', 'urbanizacion', 'avenida', 'calle', 'condominio', 'edificio',
    'referencia', 'punto_referencia'];
  var UBIGEO = { BO: window.CIUDADES_BO || {}, PE: window.CIUDADES_PE || {} };
  var CENTRO = [-17.7833281, -63.1821673];

  var $ = function (id) { return document.getElementById(id); };
  var estado = $('estado');
  function avisar(t, err) { estado.textContent = t || ''; estado.className = err ? 'error' : ''; }

  function apiBase() {
    return (window.STATETTY_CONFIG && STATETTY_CONFIG.WS_API_BASE) || 'https://api.statetty.com/api/';
  }
  function sesionLista() {
    return new Promise(function (resolve) {
      function fin() { resolve(window.STT && STT.getToken ? STT.getToken() : null); }
      if (window.STT && window.STT.ready && window.STT.ready.then) { window.STT.ready.then(fin, fin); return; }
      var n = 0, iv = setInterval(function () {
        if (window.STT) { clearInterval(iv); fin(); }
        else if (++n > 100) { clearInterval(iv); resolve(null); }
      }, 50);
    });
  }
  function api(metodo, ruta, body) {
    return sesionLista().then(function (token) {
      if (!token) throw new Error('Iniciá sesión con una cuenta administradora.');
      return fetch(apiBase() + 'statetty/' + ruta, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: body ? JSON.stringify(body) : undefined,
      }).then(function (r) {
        return r.json().then(function (d) {
          if (r.status === 403) throw new Error('Esta página es solo para administradores.');
          if (!r.ok || !d.ok) throw new Error(d.error || ('HTTP ' + r.status));
          return d;
        });
      });
    });
  }

  // ---------- mapa ----------
  var map = L.map('mapid').setView(CENTRO, 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© OpenStreetMap',
  }).addTo(map);
  var capas = L.layerGroup().addTo(map);
  var circuloSel = null;
  var fijando = false;

  map.on('click', function (e) {
    if (!fijando) return;
    fijando = false;
    $('btn-fijar').textContent = '📍 Fijar en el mapa';
    $('g-lat').value = e.latlng.lat.toFixed(6);
    $('g-lng').value = e.latlng.lng.toFixed(6);
    pintarCirculo(e.latlng.lat, e.latlng.lng);
    avisar('Punto fijado. Guardá para aplicar.');
  });
  function pintarCirculo(lat, lng) {
    if (circuloSel) { map.removeLayer(circuloSel); circuloSel = null; }
    var r = parseFloat($('g-radio').value);
    if (isFinite(lat) && isFinite(lng) && isFinite(r) && r > 0) {
      circuloSel = L.circle([lat, lng], {
        radius: r * 1000, color: '#17baef', weight: 2, fillOpacity: 0.15,
      }).addTo(map);
      map.fitBounds(circuloSel.getBounds().pad(0.3));
    } else if (isFinite(lat) && isFinite(lng)) {
      circuloSel = L.circleMarker([lat, lng], { radius: 8, color: '#c62828', weight: 3 }).addTo(map);
      map.setView([lat, lng], 14);
    }
  }

  // ---------- estado ----------
  var datos = [];
  var sel = null;      // doc seleccionado (o {_nuevo:true})
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  // ---------- selects geopolíticos ----------
  function llenar(sel_, opciones, valor) {
    var primero = sel_.options[0] ? sel_.options[0].outerHTML : '';
    sel_.innerHTML = primero;
    opciones.forEach(function (o) {
      var el = document.createElement('option');
      el.value = o; el.textContent = o;
      sel_.appendChild(el);
    });
    sel_.value = valor || '';
  }
  function regionesDe(pais) { return Object.keys(UBIGEO[pais] || {}); }
  function ciudadesDe(pais, region) { return (UBIGEO[pais] || {})[region] || []; }

  // ---------- lista ----------
  function filtrados() {
    var pais = $('f-pais').value, region = $('f-region').value;
    var ciudad = $('f-ciudad').value, tipo = $('f-tipo').value, q = norm($('f-q').value);
    return datos.filter(function (d) {
      if (pais && d.paisCod !== pais) return false;
      if (region && d.region !== region) return false;
      if (ciudad && d.ciudad !== ciudad) return false;
      if (tipo && d.tipo !== tipo) return false;
      if (q) {
        var hay = norm(d.key + ' ' + d.nombre + ' ' + (d.palabras || []).join(' '));
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }
  function pintarLista() {
    var arr = filtrados();
    $('cnt').textContent = arr.length + ' / ' + datos.length;
    var lista = $('lista');
    lista.innerHTML = '';
    capas.clearLayers();
    arr.forEach(function (d) {
      var div = document.createElement('div');
      div.className = 'item' + (sel && sel._id === d._id ? ' sel' : '');
      div.innerHTML = '<strong>' + d.nombre + '</strong> <span class="sub">' +
        d.tipo + ' · ' + (d.ciudad || d.region || d.paisCod || '') + '</span>';
      div.onclick = function () { elegir(d); };
      lista.appendChild(div);
      if (isFinite(d.lat) && isFinite(d.lng)) {
        var m = L.circleMarker([d.lat, d.lng], {
          radius: 5, weight: 2, color: d.activo ? '#04364a' : '#bbb', fillOpacity: 0.7,
        });
        m.on('click', function () { elegir(d); });
        m.bindTooltip(d.nombre);
        capas.addLayer(m);
      }
    });
  }

  // ---------- formulario ----------
  function llenarForma(d) {
    $('forma').style.display = 'block';
    $('g-nombre').value = d.nombre || '';
    $('g-palabras').value = (d.palabras || []).join(', ');
    $('g-lat').value = d.lat != null ? d.lat : '';
    $('g-lng').value = d.lng != null ? d.lng : '';
    $('g-radio').value = d.radioKm != null ? d.radioKm : '';
    $('g-ancla').value = d.ancla || '';
    $('g-notas').value = d.notas || '';
    $('g-activo').value = d.activo === false ? '0' : '1';
    $('g-tipo').value = d.tipo || 'zona';
    var pais = d.paisCod || 'BO';
    $('g-pais').value = pais;
    llenar($('g-region'), regionesDe(pais), d.region || '');
    llenar($('g-ciudad'), ciudadesDe(pais, $('g-region').value), d.ciudad || '');
    $('btn-borrar').style.display = d._nuevo ? 'none' : '';
    pintarCirculo(d.lat, d.lng);
  }
  function elegir(d) {
    sel = d;
    pintarLista();
    llenarForma(d);
  }
  function nueva() {
    sel = { _nuevo: true, activo: true, paisCod: $('f-pais').value || 'BO',
            region: $('f-region').value || '', ciudad: $('f-ciudad').value || '' };
    pintarLista();
    llenarForma(sel);
    avisar('Nueva zona: fijá el punto en el mapa o escribí las coordenadas.');
  }

  function bodyDesdeForma() {
    var palabras = $('g-palabras').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var body = {
      nombre: $('g-nombre').value.trim(),
      tipo: $('g-tipo').value,
      palabras: palabras.length ? palabras : [$('g-nombre').value.trim()],
      lat: parseFloat($('g-lat').value),
      lng: parseFloat($('g-lng').value),
      radioKm: $('g-radio').value === '' ? null : parseFloat($('g-radio').value),
      ancla: $('g-ancla').value || null,
      paisCod: $('g-pais').value || null,
      region: $('g-region').value || null,
      ciudad: $('g-ciudad').value || null,
      notas: $('g-notas').value || null,
      activo: $('g-activo').value === '1',
    };
    if (!body.nombre) throw new Error('El nombre es obligatorio.');
    if (!isFinite(body.lat) || !isFinite(body.lng)) throw new Error('Faltan las coordenadas (fijalas en el mapa).');
    return body;
  }

  function guardar() {
    var body;
    try { body = bodyDesdeForma(); } catch (e) { avisar(e.message, true); return; }
    avisar('Guardando…');
    var esNuevo = sel && sel._nuevo;
    var llamada = esNuevo
      ? api('POST', 'geoentidades', body)
      : api('PUT', 'geoentidades/' + encodeURIComponent(sel._id || sel.key), body);
    llamada.then(function (d) {
      avisar('Guardada: ' + d.entidad.nombre + '.');
      return cargar().then(function () {
        var e = datos.find(function (x) { return x.key === d.entidad.key; });
        if (e) elegir(e);
      });
    }).catch(function (e) { avisar(e.message, true); });
  }
  function borrar() {
    if (!sel || sel._nuevo) return;
    if (!window.confirm('¿Eliminar "' + sel.nombre + '" (' + sel.key + ')?')) return;
    avisar('Eliminando…');
    api('DELETE', 'geoentidades/' + encodeURIComponent(sel._id || sel.key)).then(function () {
      avisar('Eliminada: ' + sel.nombre + '.');
      sel = null;
      $('forma').style.display = 'none';
      if (circuloSel) { map.removeLayer(circuloSel); circuloSel = null; }
      return cargar();
    }).catch(function (e) { avisar(e.message, true); });
  }

  // ---------- carga ----------
  function cargar() {
    return api('GET', 'geoentidades').then(function (d) {
      datos = d.entidades || [];
      var regiones = {}, ciudades = {};
      datos.forEach(function (e) {
        if (e.region) regiones[e.region] = 1;
        if (e.ciudad) ciudades[e.ciudad] = 1;
      });
      var r = $('f-region').value, c = $('f-ciudad').value;
      llenar($('f-region'), Object.keys(regiones).sort(), r);
      llenar($('f-ciudad'), Object.keys(ciudades).sort(), c);
      pintarLista();
      avisar('');
      return datos;
    });
  }

  // ---------- init ----------
  llenar($('f-pais'), (window.PAISES || []).map(function (p) { return p.value; }));
  llenar($('f-tipo'), TIPOS);
  llenar($('g-tipo'), TIPOS);
  llenar($('g-pais'), (window.PAISES || []).map(function (p) { return p.value; }), 'BO');

  $('f-pais').onchange = function () { llenar($('f-region'), regionesDe($('f-pais').value)); llenar($('f-ciudad'), []); pintarLista(); };
  $('f-region').onchange = function () { llenar($('f-ciudad'), ciudadesDe($('f-pais').value, $('f-region').value)); pintarLista(); };
  $('f-ciudad').onchange = pintarLista;
  $('f-tipo').onchange = pintarLista;
  $('f-q').oninput = pintarLista;
  $('g-pais').onchange = function () { llenar($('g-region'), regionesDe($('g-pais').value)); llenar($('g-ciudad'), []); };
  $('g-region').onchange = function () { llenar($('g-ciudad'), ciudadesDe($('g-pais').value, $('g-region').value)); };
  $('g-radio').oninput = function () {
    var lat = parseFloat($('g-lat').value), lng = parseFloat($('g-lng').value);
    if (isFinite(lat) && isFinite(lng)) pintarCirculo(lat, lng);
  };
  $('btn-nueva').onclick = nueva;
  $('btn-guardar').onclick = guardar;
  $('btn-borrar').onclick = borrar;
  $('btn-fijar').onclick = function () {
    fijando = !fijando;
    this.textContent = fijando ? 'Clic en el mapa…' : '📍 Fijar en el mapa';
    if (fijando) avisar('Hacé clic en el mapa para fijar el centro.');
  };

  avisar('Verificando sesión…');
  cargar().catch(function (e) { avisar(e.message, true); });
})();
