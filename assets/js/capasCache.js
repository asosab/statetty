/**
 * capasCache.js — cache de sesión compartido para las capas de datos del
 * mapa (pedido del dueño 2026-11-28: no pedir dos veces lo ya descargado).
 * Expone window.STT_CAPAS_CACHE.
 *
 * Tres servicios:
 *
 * 1) Fuentes por grilla de cobertura (capas que piden por bbox). Cada una
 *    se registra con definir(nombre, cfg):
 *      celdaDeg   tamaño de la celda de cobertura en grados (~0.02 = 2.2 km)
 *      dims(ctx)  dimensiones extra de la clave (paso de malla, categoría…)
 *      dimsItem   item → dims (equipamientos: e.categoria)
 *      idItem     item → id estable para deduplicar (h3, _id, centro…)
 *      centroItem item → [lng,lat] para filtrar a la zona pintada
 *      enZona     item,bbox,fig → bool (alternativa a centroItem; p.ej. una
 *                 ruta entra si su propio bbox toca la zona)
 *      ttlMs      opcional; las dims hidratadas más viejas se descartan
 *
 *    fuente.obtener(ctx, fetchFn): ctx={bbox,fig,...}; calcula las celdas
 *    de la grilla que cubren la zona, pide SOLO las faltantes agrupadas en
 *    componentes contiguas (un fetchFn por componente con su bbox unión),
 *    marca cobertura y devuelve los items filtrados a la zona real.
 *    fetchFn(bboxUnion, ctx) debe resolver {items, dims?, truncado?} — o
 *    un array plano si la dims no cambia. `dims` en la respuesta es la dims
 *    REAL (el servidor puede responder otra resolución, p.ej. ruido
 *    auto-coarsen): cobertura e items se guardan bajo ella y se deja un
 *    alias celda→dims para encontrarla después. `truncado` marca las
 *    celdas como parciales: si luego se piden y no tienen items, se
 *    repiden. Respuesta vacía = zona cubierta sin datos. Error = no se
 *    marca nada (el reintento funciona solo). Las llamadas se serializan
 *    por fuente, así nunca hay dos fetch solapados de lo mismo.
 *
 *    fuente.obtenerVarios(ctx, dimsList, fetchFn): igual pero para varias
 *    dims a la vez (equipamientos por categoría). fetchFn recibe además
 *    dimsFaltan (las dims con celdas faltantes en ese componente) y debe
 *    resolver {items}; cada item se archiva bajo dimsItem(item).
 *
 * 2) consulta(nombre, clave, fetchFn, opts): cache por clave libre para lo
 *    que no es grilla — POST del toolbox (clave = sección + body) y
 *    punto-queries de la ficha (clave = 'lat,lng'). Dedup en vuelo por
 *    Promise compartida; opts.ttlMs opcional por entrada.
 *
 * 3) unaVez(nombre, fetchFn): azúcar de consulta para endpoints escalares
 *    (leyenda de ruido, categorías de equipamientos).
 *
 * Persistencia: sessionStorage, una clave por fuente ('stt-cc:<nombre>'),
 * hidratación perezosa, volcado debounced + flush en pagehide. Si la cuota
 * revienta se recorta la dims más vieja de esa fuente y se reintenta; si
 * ni así, esa fuente sigue solo en memoria. limpiar() borra todo
 * (lo llama clearSession de menuUser.js vía barrido de claves 'stt-cc:').
 *
 * Helpers de figuras compartidos: STT_CAPAS_CACHE.fig
 * (actuales/hay/bbox/dentro) — los paneles dejan de duplicarlos.
 *
 * Para una capa nueva: definir() + llamar obtener() en su actualizar.
 */
(function () {
  'use strict';

  if (window.STT_CAPAS_CACHE) return;

  var PREFIJO = 'stt-cc:';
  var VERSION = 1;
  var DEBOUNCE_MS = 800;
  var MAX_CELDAS = 4096;         // vistas continentales: se piden sin marcar

  // ── figuras (✏️ polígono / 📍 circunferencia) ─────────────────────────────
  function figurasActuales() {
    try {
      if (window.STT_MAP_FIGURAS) return window.STT_MAP_FIGURAS() || {};
    } catch (e) {}
    return {};
  }

  function hayFiguras(fig) {
    return !!(fig && ((fig.poligono && fig.poligono.length) || (fig.circunferencia && fig.circunferencia.length)));
  }

  function bboxDeFiguras(fig) {
    if (!fig) return null;
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
    if (!fig) return false;
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

  // ── grilla de cobertura ─────────────────────────────────────────────────────
  function celdaDePunto(lng, lat, deg) {
    return { ix: Math.floor(lng / deg), iy: Math.floor(lat / deg) };
  }
  function ck(c) { return c.ix + ',' + c.iy; }

  // Celdas de la grilla que cubren un bbox (bordes incluidos).
  function celdasDe(bb, deg) {
    var out = [];
    var ix0 = Math.floor(bb.minLng / deg), ix1 = Math.floor(bb.maxLng / deg);
    var iy0 = Math.floor(bb.minLat / deg), iy1 = Math.floor(bb.maxLat / deg);
    for (var ix = ix0; ix <= ix1; ix++)
      for (var iy = iy0; iy <= iy1; iy++)
        out.push({ ix: ix, iy: iy });
    return out;
  }

  // Componentes contiguas (4-conectividad) → un bbox unión por componente.
  function componentesDe(celdas, deg) {
    var pend = {}, comps = [];
    celdas.forEach(function (c) { pend[ck(c)] = c; });
    Object.keys(pend).forEach(function (k0) {
      if (!pend[k0]) return;
      var comp = [], pila = [pend[k0]];
      delete pend[k0];
      while (pila.length) {
        var c = pila.pop();
        comp.push(c);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var k = (c.ix + d[0]) + ',' + (c.iy + d[1]);
          if (pend[k]) { pila.push(pend[k]); delete pend[k]; }
        });
      }
      var minIx = Infinity, maxIx = -Infinity, minIy = Infinity, maxIy = -Infinity;
      comp.forEach(function (c) {
        if (c.ix < minIx) minIx = c.ix; if (c.ix > maxIx) maxIx = c.ix;
        if (c.iy < minIy) minIy = c.iy; if (c.iy > maxIy) maxIy = c.iy;
      });
      comps.push({
        celdas: comp,
        bbox: {
          minLng: minIx * deg, maxLng: (maxIx + 1) * deg,
          minLat: minIy * deg, maxLat: (maxIy + 1) * deg
        }
      });
    });
    return comps;
  }

  // ── sessionStorage ──────────────────────────────────────────────────────────
  function storageOk() {
    try { return typeof sessionStorage !== 'undefined' && sessionStorage; }
    catch (e) { return false; }
  }

  function leerStorage(nombre) {
    if (!storageOk()) return null;
    try {
      var raw = sessionStorage.getItem(PREFIJO + nombre);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function escribirStorage(nombre, obj) {
    if (!storageOk()) return false;
    try { sessionStorage.setItem(PREFIJO + nombre, JSON.stringify(obj)); return true; }
    catch (e) { return false; }
  }

  // ── fuentes ──────────────────────────────────────────────────────────────────
  var fuentes = {};

  function fuenteDe(nombre) {
    if (!fuentes[nombre]) {
      fuentes[nombre] = {
        cfg: null,
        subs: {},          // dims -> {cov:Set, trunc:Set, cells:Map, items:Map, ts}
        alias: {},         // cellKey -> dims (respuesta llegó en otra dims)
        cons: { map: {}, pend: {} },
        cola: Promise.resolve(),
        hidratada: false,
        persist: true,
        dirty: false,
        timer: null
      };
    }
    return fuentes[nombre];
  }

  function subDe(fuente, dims) {
    if (!fuente.subs[dims]) {
      fuente.subs[dims] = {
        cov: new Set(), trunc: new Set(),
        cells: new Map(),           // cellKey -> Set(itemId) — test de vacías truncadas
        items: new Map(),
        ts: Date.now()
      };
    }
    return fuente.subs[dims];
  }

  function idDe(fuente, it, seq) {
    var cfg = fuente.cfg || {};
    if (cfg.idItem) return cfg.idItem(it);
    var c = centroDe(fuente, it);
    if (c) return c[0] + ',' + c[1];
    return '#' + seq;
  }
  function centroDe(fuente, it) {
    var cfg = fuente.cfg || {};
    if (cfg.centroItem) return cfg.centroItem(it);
    return it && it.centro ? it.centro : null;
  }

  // ¿La celda ya tiene datos (en dims pedida o en su alias)? Las truncadas
  // sin items cuentan como faltantes: su respuesta quedó cortada a medias.
  function celdaCubierta(fuente, dims, c) {
    var k = ck(c);
    var d = (fuente.subs[dims] && fuente.subs[dims].cov.has(k)) ? dims : fuente.alias[k];
    if (d == null || !fuente.subs[d] || !fuente.subs[d].cov.has(k)) return false;
    var sub = fuente.subs[d];
    if (sub.trunc.has(k) && !(sub.cells.get(k) && sub.cells.get(k).size)) return false;
    return true;
  }

  function dimsDeCelda(fuente, dims, c) {
    var k = ck(c);
    if (fuente.subs[dims] && fuente.subs[dims].cov.has(k)) return dims;
    return fuente.alias[k] != null ? fuente.alias[k] : null;
  }

  function enZona(fuente, it, ctx) {
    var cfg = fuente.cfg || {};
    if (cfg.enZona) return cfg.enZona(it, ctx.bbox, ctx.fig);
    var c = centroDe(fuente, it);
    if (!c) return true;
    var bb = ctx.bbox;
    if (c[0] < bb.minLng || c[0] > bb.maxLng || c[1] < bb.minLat || c[1] > bb.maxLat) return false;
    if (hayFiguras(ctx.fig) && !dentroDeFiguras(c[0], c[1], ctx.fig)) return false;
    return true;
  }

  function indexarItem(fuente, sub, it, id, deg) {
    var c = centroDe(fuente, it);
    if (!c) return;
    var k = ck(celdaDePunto(c[0], c[1], deg));
    var s = sub.cells.get(k);
    if (!s) { s = new Set(); sub.cells.set(k, s); }
    s.add(id);
  }

  function pintarItems(fuente, dims, needed, ctx) {
    var usados = {}, items = [];
    needed.forEach(function (c) {
      var d = dimsDeCelda(fuente, dims, c);
      if (d != null) usados[d] = true;
    });
    Object.keys(usados).forEach(function (d) {
      fuente.subs[d].items.forEach(function (it) {
        if (enZona(fuente, it, ctx)) items.push(it);
      });
    });
    return { items: items, dimsUsados: Object.keys(usados) };
  }

  // ── persistencia por fuente ──────────────────────────────────────────────────
  function hidratar(fuente, nombre) {
    if (fuente.hidratada) return;
    fuente.hidratada = true;
    var d = leerStorage(nombre);
    if (d && d.v !== VERSION && storageOk()) {
      try { sessionStorage.removeItem(PREFIJO + nombre); } catch (e) {}
      d = null;
    }
    if (!d) return;
    var ttl = fuente.cfg && fuente.cfg.ttlMs;
    var ahora = Date.now();
    Object.keys(d.subs || {}).forEach(function (dims) {
      var s = d.subs[dims];
      if (ttl && s.ts && ahora - s.ts > ttl) return;
      var sub = subDe(fuente, dims);
      (s.cov || []).forEach(function (k) { sub.cov.add(k); });
      (s.trunc || []).forEach(function (k) { sub.trunc.add(k); });
      var deg = fuente.cfg ? fuente.cfg.celdaDeg : 1;
      Object.keys(s.items || {}).forEach(function (id) {
        var it = s.items[id];
        sub.items.set(id, it);
        indexarItem(fuente, sub, it, id, deg);
      });
      if (s.ts) sub.ts = s.ts;
    });
    fuente.alias = d.alias || {};
    Object.keys(d.cons || {}).forEach(function (k) {
      var e = d.cons[k];
      if (!e) return;
      if (e.ttl && e.ts && ahora - e.ts > e.ttl) return;
      fuente.cons.map[k] = e;
    });
  }

  function serializar(fuente) {
    var subs = {};
    Object.keys(fuente.subs).forEach(function (dims) {
      var s = fuente.subs[dims];
      var items = {};
      s.items.forEach(function (it, id) { items[id] = it; });
      subs[dims] = {
        cov: Array.from(s.cov), trunc: Array.from(s.trunc),
        items: items, ts: s.ts
      };
    });
    return { v: VERSION, subs: subs, alias: fuente.alias, cons: fuente.cons.map };
  }

  function escribirFuente(nombre, fuente) {
    if (!fuente.persist) { fuente.dirty = false; return; }
    if (escribirStorage(nombre, serializar(fuente))) { fuente.dirty = false; return; }
    // Cuota llena: se recorta la dims más vieja y se reintenta una vez.
    var vieja = null, tsViejo = Infinity;
    Object.keys(fuente.subs).forEach(function (dims) {
      var ts = fuente.subs[dims].ts || 0;
      if (ts < tsViejo) { tsViejo = ts; vieja = dims; }
    });
    if (vieja != null) {
      delete fuente.subs[vieja];
      Object.keys(fuente.alias).forEach(function (k) {
        if (fuente.alias[k] === vieja) delete fuente.alias[k];
      });
      if (escribirStorage(nombre, serializar(fuente))) { fuente.dirty = false; return; }
    }
    fuente.persist = false;   // sin espacio: sigue solo en memoria
    fuente.dirty = false;
  }

  function marcarDirty(fuente, nombre) {
    fuente.dirty = true;
    if (fuente.timer) return;
    fuente.timer = setTimeout(function () {
      fuente.timer = null;
      if (fuente.dirty) escribirFuente(nombre, fuente);
    }, DEBOUNCE_MS);
  }

  function flushTodo() {
    Object.keys(fuentes).forEach(function (nombre) {
      var f = fuentes[nombre];
      if (f.timer) { clearTimeout(f.timer); f.timer = null; }
      if (f.dirty) escribirFuente(nombre, f);
    });
  }
  try {
    window.addEventListener('pagehide', flushTodo);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flushTodo();
    });
  } catch (e) {}

  // ── obtener: capa por grilla ─────────────────────────────────────────────────
  function obtener(fuente, nombre, ctx, fetchFn) {
    var cfg = fuente.cfg;
    var dims = cfg.dims ? String(cfg.dims(ctx) == null ? '' : cfg.dims(ctx)) : '';
    subDe(fuente, dims);
    var needed = celdasDe(ctx.bbox, cfg.celdaDeg);
    var trab = function () {
      if (needed.length > MAX_CELDAS) {
        // Zona gigante: se pide entera sin tocar cobertura.
        return Promise.resolve(fetchFn(ctx.bbox, ctx)).then(function (res) {
          var items = Array.isArray(res) ? res : (res && res.items) || [];
          return { items: items, dimsUsados: [dims] };
        });
      }
      var missing = needed.filter(function (c) { return !celdaCubierta(fuente, dims, c); });
      var comps = componentesDe(missing, cfg.celdaDeg);
      var p = Promise.resolve();
      comps.forEach(function (comp) {
        p = p.then(function () {
          var faltan = comp.celdas.filter(function (c) { return !celdaCubierta(fuente, dims, c); });
          if (!faltan.length) return;
          return Promise.resolve(fetchFn(comp.bbox, ctx)).then(function (res) {
            var items = Array.isArray(res) ? res : (res && res.items) || [];
            var dimsReal = Array.isArray(res) || !res || res.dims == null ? dims : String(res.dims);
            var trunc = !Array.isArray(res) && res && res.truncado;
            var subR = subDe(fuente, dimsReal);
            faltan.forEach(function (c) {
              var k = ck(c);
              subR.cov.add(k);
              if (trunc) subR.trunc.add(k); else subR.trunc.delete(k);
              if (dimsReal !== dims) fuente.alias[k] = dimsReal;
            });
            var seq = 0;
            items.forEach(function (it) {
              var id = idDe(fuente, it, seq++);
              if (!subR.items.has(id)) subR.items.set(id, it);
              indexarItem(fuente, subR, it, id, cfg.celdaDeg);
            });
            subR.ts = Date.now();
            marcarDirty(fuente, nombre);
          });
        });
      });
      return p.then(function () { return pintarItems(fuente, dims, needed, ctx); });
    };
    fuente.cola = fuente.cola.then(trab, trab);
    return fuente.cola;
  }

  // ── obtenerVarios: varias dims sobre la misma grilla ─────────────────────────
  function obtenerVarios(fuente, nombre, ctx, dimsList, fetchFn) {
    var cfg = fuente.cfg;
    var needed = celdasDe(ctx.bbox, cfg.celdaDeg);
    var trab = function () {
      // Celda → dims que aún le faltan.
      var porCelda = {};
      dimsList.forEach(function (d) {
        subDe(fuente, d);
        needed.forEach(function (c) {
          if (!celdaCubierta(fuente, d, c)) {
            var k = ck(c);
            (porCelda[k] = porCelda[k] || { celda: c, dims: {} }).dims[d] = true;
          }
        });
      });
      var celdasFaltan = Object.keys(porCelda).map(function (k) { return porCelda[k].celda; });
      var comps = componentesDe(celdasFaltan, cfg.celdaDeg);
      var p = Promise.resolve();
      comps.forEach(function (comp) {
        p = p.then(function () {
          var dimsComp = {}, porCeldaComp = [];
          comp.celdas.forEach(function (c) {
            var entry = porCelda[ck(c)];
            if (!entry) return;
            var vivas = Object.keys(entry.dims).filter(function (d) {
              return !celdaCubierta(fuente, d, c);
            });
            if (!vivas.length) return;
            porCeldaComp.push({ celda: c, dims: vivas });
            vivas.forEach(function (d) { dimsComp[d] = true; });
          });
          var dimsF = Object.keys(dimsComp);
          if (!dimsF.length) return;
          return Promise.resolve(fetchFn(comp.bbox, ctx, dimsF)).then(function (res) {
            var items = Array.isArray(res) ? res : (res && res.items) || [];
            var trunc = !Array.isArray(res) && res && res.truncado;
            porCeldaComp.forEach(function (pc) {
              pc.dims.forEach(function (d) {
                var sub = subDe(fuente, d);
                sub.cov.add(ck(pc.celda));
                if (trunc) sub.trunc.add(ck(pc.celda)); else sub.trunc.delete(ck(pc.celda));
              });
            });
            var seq = 0;
            items.forEach(function (it) {
              var dIt = cfg.dimsItem ? String(cfg.dimsItem(it)) : dimsF[0];
              var sub = subDe(fuente, dIt);
              var id = idDe(fuente, it, seq++);
              if (!sub.items.has(id)) sub.items.set(id, it);
              indexarItem(fuente, sub, it, id, cfg.celdaDeg);
              sub.ts = Date.now();
            });
            marcarDirty(fuente, nombre);
          });
        });
      });
      return p.then(function () {
        var items = [];
        dimsList.forEach(function (d) {
          var sub = fuente.subs[d];
          if (!sub) return;
          sub.items.forEach(function (it) {
            if (enZona(fuente, it, ctx)) items.push(it);
          });
        });
        return { items: items, dimsUsados: dimsList.slice() };
      });
    };
    fuente.cola = fuente.cola.then(trab, trab);
    return fuente.cola;
  }

  // ── API pública ──────────────────────────────────────────────────────────────
  var API = {
    fig: {
      actuales: figurasActuales,
      hay: hayFiguras,
      bbox: bboxDeFiguras,
      dentro: dentroDeFiguras,
      distM: distM
    },

    definir: function (nombre, cfg) {
      var f = fuenteDe(nombre);
      f.cfg = cfg || {};
      if (!f.cfg.celdaDeg) f.cfg.celdaDeg = 0.02;
      var self = {
        obtener: function (ctx, fetchFn) {
          hidratar(f, nombre);
          return obtener(f, nombre, ctx, fetchFn);
        },
        obtenerVarios: function (ctx, dimsList, fetchFn) {
          hidratar(f, nombre);
          return obtenerVarios(f, nombre, ctx, dimsList, fetchFn);
        }
      };
      return self;
    },

    // Cache por clave libre (POST del toolbox, punto-queries de la ficha).
    consulta: function (nombre, clave, fetchFn, opts) {
      var f = fuenteDe(nombre);
      hidratar(f, nombre);
      var e = f.cons.map[clave];
      if (e) {
        var ttl = opts && opts.ttlMs != null ? opts.ttlMs : e.ttl;
        if (!ttl || !e.ts || Date.now() - e.ts <= ttl) return Promise.resolve(e.d);
        delete f.cons.map[clave];
      }
      if (f.cons.pend[clave]) return f.cons.pend[clave];
      var p = Promise.resolve().then(fetchFn).then(function (d) {
        f.cons.map[clave] = { d: d, ts: Date.now(), ttl: opts && opts.ttlMs ? opts.ttlMs : 0 };
        delete f.cons.pend[clave];
        marcarDirty(f, nombre);
        return d;
      }, function (err) {
        delete f.cons.pend[clave];
        throw err;
      });
      f.cons.pend[clave] = p;
      return p;
    },

    // Endpoint escalar: una sola petición por sesión.
    unaVez: function (nombre, fetchFn) {
      return API.consulta(nombre, 'solo', fetchFn);
    },

    // Clave estable para bodies: mismo JSON con claves ordenadas.
    claveDe: function (obj) {
      function n(v) {
        if (Array.isArray(v)) return v.map(n);
        if (v && typeof v === 'object') {
          var o = {};
          Object.keys(v).sort().forEach(function (k) { o[k] = n(v[k]); });
          return o;
        }
        return v;
      }
      return JSON.stringify(n(obj));
    },

    // Logout/reset: borra el cache persistido y el de memoria.
    limpiar: function () {
      if (storageOk()) {
        try {
          var ks = [];
          for (var i = 0; i < sessionStorage.length; i++) {
            var k = sessionStorage.key(i);
            if (k && k.indexOf(PREFIJO) === 0) ks.push(k);
          }
          ks.forEach(function (k) { sessionStorage.removeItem(k); });
        } catch (e) {}
      }
      Object.keys(fuentes).forEach(function (nombre) {
        var f = fuentes[nombre];
        f.subs = {}; f.alias = {}; f.cons = { map: {}, pend: {} };
        f.dirty = false;
        if (f.timer) { clearTimeout(f.timer); f.timer = null; }
      });
    }
  };

  window.STT_CAPAS_CACHE = API;
})();
