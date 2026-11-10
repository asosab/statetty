// ---------------------------------------------
// mapaShared.js — utilidades y estado compartidos por los dos renders del
// mapa unificado (público y agente). Cargar PRIMERO: declara los arreglos
// globales que leen acm.js, inmueblesPdf.js y el resto de módulos.
// ---------------------------------------------

// Estado global del mapa (top-level var = window.*): los satélites
// (acm.js, inmueblesPdf.js) los leen directo por nombre.
var map, locations = [], markers = [], seleccionados = [], ultimosFiltrados = [];
var circuloBusqueda = null, cruzCentro = null;
// Estilo único de áreas del mapa: figuras dibujadas (mapaFiguras.js) y el
// círculo de resultados de renderMap (mapaAgente.js).
var ESTILO_AREA = { color: '#17baef', weight: 2, fillColor: '#17baef', fillOpacity: 0.22 };
window.__backupLocalStorage = window.__backupLocalStorage || {};

// -------------------------------
// Utilidades generales
// -------------------------------
function calculateDH(lat1, lng1, lat2, lng2) {
  const lat1Rad = lat1 * Math.PI / 180, lng1Rad = lng1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180, lng2Rad = lng2 * Math.PI / 180;
  const dLat = lat2Rad - lat1Rad, dLng = lng2Rad - lng1Rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

function normalizeURL(u) {
  if (!u) return '';
  return u;
}

function formatNumber(num) {
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

// Los nombres vienen de portales externos: siempre como texto escapado.
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function num(v) { return v == null || v === '' ? null : Number(v); }
function miles(v) { return Number(v).toLocaleString('es-BO'); }

function calcularPromedio(datos, prop) {
  if (!Array.isArray(datos) || datos.length === 0) return 0;
  const datosFiltrados = datos.filter(item => item && typeof item[prop] === 'number' && item[prop] >= 0);
  if (datosFiltrados.length === 0) return 0;
  const suma = datosFiltrados.reduce((acc, item) => acc + item[prop], 0);
  return Math.round(suma / datosFiltrados.length);
}

// Precio compacto para encabezados: 300000 -> "$300K", 1250000 -> "$1.25M"
function formatCompactPrice(precio) {
  var n = Number(precio) || 0;
  if (n >= 1000000) {
    var m = n / 1000000;
    var mRound = Math.round(m * 100) / 100;
    return '$' + (mRound % 1 === 0 ? mRound : mRound.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')) + 'M';
  }
  if (n >= 1000) {
    var k = n / 1000;
    var kRound = Math.round(k * 10) / 10;
    return '$' + (kRound % 1 === 0 ? kRound : kRound.toFixed(1)) + 'K';
  }
  return '$' + n;
}

// -------------------------------
// Antigüedad del inmueble
// -------------------------------
// fechaIngreso (fecha_ini) prevalece sobre createdAt SOLO si existe y es
// anterior (el inmueble ya estaba publicado antes de que el sistema lo
// captara). Si no, se usa createdAt.
function getFechaAntiguedad(dato) {
  if (!dato) return null;
  var fCreated = dato.createdAt ? new Date(dato.createdAt) : null;
  if (fCreated && isNaN(fCreated.getTime())) fCreated = null;

  var fIngreso = dato.fechaIngreso ? new Date(dato.fechaIngreso) : null;
  if (fIngreso && isNaN(fIngreso.getTime())) fIngreso = null;

  if (fIngreso && (!fCreated || fIngreso.getTime() < fCreated.getTime())) {
    return fIngreso;
  }
  return fCreated;
}

function esInmuebleNuevo(dato, diasMax = 15) {
  try {
    var fecha = getFechaAntiguedad(dato);
    if (!fecha) return false;
    var LIMITE_MS = diasMax * 24 * 60 * 60 * 1000;
    var antiguedadMs = Date.now() - fecha.getTime();
    return antiguedadMs >= 0 && antiguedadMs <= LIMITE_MS;
  } catch (e) { console.log('esInmuebleNuevo error', e); return false; }
}

function formatAntiguedad(dato) {
  try {
    var fecha = getFechaAntiguedad(dato);
    if (!fecha) return '';
    var diffMs = Date.now() - fecha.getTime();
    if (diffMs < 0) return '';
    var dias = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (dias < 1) return 'Publicado hoy';
    if (dias === 1) return 'Publicado hace 1 día';
    if (dias < 30) return 'Publicado hace ' + dias + ' días';
    var meses = Math.floor(dias / 30);
    if (meses < 12) return 'Publicado hace ' + meses + (meses === 1 ? ' mes' : ' meses');
    var anios = Math.floor(dias / 365);
    return 'Publicado hace ' + anios + (anios === 1 ? ' año' : ' años');
  } catch (e) { console.log('formatAntiguedad error', e); return ''; }
}

// -------------------------------
// Emoji por tipo de inmueble — versión UNIFICADA (regex de palabra completa,
// superset de la tabla exacta del viejo mapa.js y de la de mapaSimple).
// Cada grupo: un emoji y las palabras que lo activan (minúscula, sin tildes).
// Ante varias coincidencias gana la palabra más larga.
// -------------------------------
var TIPO_INMUEBLE_EMOJI = [
  { '🏡': ['casa'] },
  { '🏢': ['departamento', 'apartment', 'monoambiente', 'penthouse', 'duplex'] },
  { '🌳': ['lote', 'terreno'] },
  { '💼': ['oficina'] },
  { '🏬': ['local comercial', 'local', 'tienda'] },
  { '🏛️': ['edificio'] },
  { '🏞️': ['quinta'] },
  { '🏘️': ['ph', 'condominio'] },
  { '🏭': ['tinglado', 'deposito', 'galpon'] },
  { '🛏️': ['habitacion', 'cuarto'] },
  { '🚗': ['garaje', 'cochera'] }
];
var EMOJI_DEFECTO = '📍';

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
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!t) return EMOJI_DEFECTO;
  for (var i = 0; i < TIPOS_INDEX.length; i++) {
    if (TIPOS_INDEX[i].re.test(t)) return TIPOS_INDEX[i].emoji;
  }
  return EMOJI_DEFECTO;
}

// Alias del viejo mapa.js: mismo resultado, ya con la tabla unificada.
function getTipoEmoji(tipo) { return emojiTipo(tipo); }

// -------------------------------
// Marca (inmobiliaria) — versión UNIFICADA.
// Orden: `brocker`/`broker` explícito de la BD > reglas por texto (marcas
// chicas) > heurísticas por URL/nombre/teléfono > Statetty.
// La shape pública no trae brocker ni agente: siempre cae a Statetty.
// -------------------------------
var PUNTEROS = {
  bo_remax: 'remax', pe_remax: 'remax',
  bo_c21: 'C21', pe_c21: 'C21',
  bo_bien: 'bieni', bo_idi: 'IDI', bo_uc: 'UC',
  bo_ic: 'ic', pe_ic: 'ic',
  bo_capital: 'capital', bo_kw: 'kw', bo_sce: 'sce',
  bo_si: 'si', pe_laenc: 'laenc', pe_nexoi: 'nexoi',
  bo_houstyle: 'houstyle'
};

// Marcas chicas: sin brocker propio en la BD, se reconocen por otros medios.
// string = substring (minúsculas); RegExp = la que escribas.
var MARCAS_EXTRA = {
  elfaro: ['el faro', '71035001', /el-?faro/i]
};

function _haystackMarca(dato) {
  if (!dato) return '';
  return (String(dato.uid || dato.URL || dato.url || '') + ' ' +
          String(dato.agentName || '') + ' ' +
          String(dato.agentPhon || dato.agentPhone || '').replace(/\D/g, '')).toLowerCase();
}

function _marcaPorTexto(hay) {
  var claves = Object.keys(MARCAS_EXTRA);
  for (var i = 0; i < claves.length; i++) {
    var pruebas = MARCAS_EXTRA[claves[i]];
    for (var j = 0; j < pruebas.length; j++) {
      var p = pruebas[j];
      if (typeof p === 'string' ? hay.indexOf(p) > -1 : p.test(hay)) return claves[i];
    }
  }
  return null;
}

function _marcaPorUrl(hay) {
  if (hay.indexOf('houstyle') > -1) return 'houstyle';
  if (hay.indexOf('c21.com') > -1 || hay.indexOf('century21') > -1) return 'C21';
  if (hay.indexOf('remax') > -1) return 'remax';
  if (hay.indexOf('bieninmuebles') > -1) return 'bieni';
  if (hay.indexOf('dueodeinmueble') > -1) return 'IDI';
  if (hay.indexOf('ultracasas') > -1) return 'UC';
  if (hay.indexOf('uno.com') > -1) return 'uno';
  if (hay.indexOf('infocasas') > -1) return 'ic';
  if (hay.indexOf('sin-intermediarios') > -1) return 'si';
  if (hay.indexOf('capitalcorp') > -1) return 'capital';
  if (hay.indexOf('santa-cruz.estate') > -1) return 'sce';
  if (hay.indexOf('laencontre.com') > -1) return 'laenc';
  if (hay.indexOf('nexoinmobiliario.pe') > -1) return 'nexoi';
  if (hay.indexOf('kw.com') > -1 || hay.indexOf('kwbolivia.com') > -1) return 'kw';
  return null;
}

/** Marca de un inmueble (objeto) o de una URL (string). Devuelve la clave
 *  que completa `pointer_<marca>.png` ('remax','C21','ic','statetty',…). */
function marcaDe(input) {
  if (!input) return 'statetty';
  var dato = (typeof input === 'object' && input.dato) ? input.dato : input;
  if (typeof dato === 'object' && dato) {
    var brocker = String(dato.brocker || dato.broker || '').toLowerCase();
    if (PUNTEROS[brocker]) return PUNTEROS[brocker];
  }
  var hay = (typeof input === 'string')
    ? input.toLowerCase()
    : _haystackMarca(dato);
  return _marcaPorTexto(hay) || _marcaPorUrl(hay) || 'statetty';
}

// Alias del viejo mapa.js (aceptaba marker/string/dato): misma salida.
function getBrand(input) { return marcaDe(input); }

// -------------------------------
// Detección de país + teléfono wa.me
// -------------------------------
var PAISES = [
  {
    code: 'BO',
    callingCode: '591',
    polygon: [
      [-57.50, -18.17], [-58.24, -16.30], [-60.16, -16.26],
      [-63.20, -12.63], [-65.34,  -9.76], [-67.17, -10.31],
      [-68.67, -12.56], [-68.88, -12.90], [-68.96, -16.50],
      [-69.39, -15.66], [-69.59, -17.58], [-69.10, -18.26],
      [-68.76, -20.37], [-68.22, -21.49], [-67.83, -22.87],
      [-64.38, -22.80], [-62.69, -22.25], [-62.27, -20.51],
      [-60.04, -19.34], [-57.50, -18.17]
    ]
  },
  {
    code: 'PE',
    callingCode: '51',
    polygon: [
      [-69.59, -17.58], [-70.37, -18.35], [-71.38, -17.77],
      [-74.12, -15.27], [-76.42, -13.82], [-79.04,  -8.39],
      [-81.25,  -6.14], [-81.41,  -4.74], [-80.30,  -3.40],
      [-78.45,  -3.87], [-75.55,  -1.56], [-75.11,  -0.06],
      [-73.07,  -2.31], [-70.69,  -3.74], [-69.53, -10.95],
      [-68.67, -12.56], [-68.88, -12.90], [-68.96, -16.50],
      [-69.39, -15.66], [-69.59, -17.58]
    ]
  }
];

function puntoEnPoligono(lat, lng, poligono) {
  var dentro = false;
  for (var i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    var xi = poligono[i][0], yi = poligono[i][1];
    var xj = poligono[j][0], yj = poligono[j][1];
    if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)
      dentro = !dentro;
  }
  return dentro;
}

function detectarPais(lat, lng) {
  for (var i = 0; i < PAISES.length; i++) {
    if (puntoEnPoligono(lat, lng, PAISES[i].polygon))
      return PAISES[i];
  }
  return null;
}

/** Teléfono listo para wa.me: completa el prefijo del país del inmueble
 *  (`pais`, con fallback al prefijo de `broker`, p. ej. `BO_remax`).
 *  Devuelve `{cel, valido}`: `cel` sin el `+`. */
function telefonoConPais(dato, paises, lib) {
  var raw = (dato && dato.agentPhone ? dato.agentPhone : '').toString().trim();
  var digits = raw.replace(/\D/g, '');
  var paisCode = String((dato && dato.pais) || '').toUpperCase();
  if (!paisCode && dato && dato.broker) {
    paisCode = String(dato.broker).split('_')[0].toUpperCase();
  }
  var cfg = null;
  for (var i = 0; i < (paises || []).length; i++) {
    if (paises[i].code === paisCode) { cfg = paises[i]; break; }
  }
  var callingCode = cfg ? cfg.callingCode : null;
  var cel = '';
  var valido = false;
  if (lib) {
    var pn = null;
    if (raw.includes('+')) {
      pn = lib.parsePhoneNumberFromString(raw);
    } else if (callingCode && digits.length >= 8 && digits.length < 11) {
      pn = lib.parsePhoneNumberFromString('+' + callingCode + digits);
    } else if (digits.length >= 8) {
      pn = lib.parsePhoneNumberFromString('+' + digits);
    }
    if (pn && pn.isValid()) { cel = pn.number.slice(1); valido = true; }
  }
  return { cel: cel, valido: valido };
}

// -------------------------------
// Tippy (tooltips) — tema 'fndinm' compartido con fndInm.js
// -------------------------------
var MAPA_TIPPY_THEME = 'fndinm';
function ensureTippyTheme() {
  if (document.getElementById('mapa-tippy-theme-style')) return;
  var css =
    '.tippy-box[data-theme~="' + MAPA_TIPPY_THEME + '"]{background-color:#25282c;color:#fff;' +
    'font-size:.72rem;line-height:1.35;border-radius:6px;' +
    'box-shadow:0 2px 8px rgba(0,0,0,.25);}' +
    '.tippy-box[data-theme~="' + MAPA_TIPPY_THEME + '"] .tippy-content{padding:6px 9px;}' +
    '.tippy-box[data-theme~="' + MAPA_TIPPY_THEME + '"] .tippy-arrow{color:#25282c;}';
  var style = document.createElement('style');
  style.id = 'mapa-tippy-theme-style';
  style.textContent = css;
  document.head.appendChild(style);
}

// Inicializa tooltips dentro de un elemento del DOM (el contenido de los
// popups se genera al vuelo: hay que correrlo en cada apertura, filtrando
// los que ya tienen instancia para no duplicar).
function initPopupTooltips(rootEl) {
  if (!rootEl) return;
  var allTargets = rootEl.querySelectorAll('[data-tippy-content]');
  if (!allTargets.length) return;
  var targets = Array.prototype.filter.call(allTargets, function (el) { return !el._tippy; });
  if (!targets.length) return;
  if (window.tippy) {
    ensureTippyTheme();
    window.tippy(targets, {
      theme: MAPA_TIPPY_THEME,
      placement: 'top',
      maxWidth: 220,
      delay: [150, 0],
      touch: true,
      appendTo: function () { return document.body; }
    });
  } else {
    targets.forEach(function (el) {
      el.title = el.getAttribute('data-tippy-content');
    });
  }
}

// -------------------------------
// Portapapeles + ficha WhatsApp
// -------------------------------
function copiarTextoPortapapeles(texto) {
  texto = String(texto || '');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(texto);
  }
  return new Promise(function (resolve, reject) {
    try {
      var ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      resolve();
    } catch (e) { reject(e); }
  });
}

function fichaTippyFeedback(btn, msg) {
  if (!btn || !btn._tippy || !btn._tippy.setContent) return;
  btn._tippy.setContent(msg);
  setTimeout(function () {
    if (btn._tippy) btn._tippy.setContent(btn._tippyOriginal);
  }, 1500);
}

function openWsRedirect(serverUrl, waUrl) {
  fetch(serverUrl).catch(function(e) { console.log("openWsRedirect", e); });
  window.open(waUrl, "_blank");
}

// Copia al portapapeles el texto de la ficha WhatsApp de un inmueble
// llamando a statetty/inmueble/whatsapp y mostrando el resultado en el tippy.
// Con 403 sin_tiempo el mensaje lo dice: la cuenta no tiene tiempo activo.
function copyFichaWhatsApp(encId, btn) {
  var id = decodeURIComponent(encId);
  if (!id || !btn || btn.dataset.disabled) return false;
  var base = (window.STATETTY_CONFIG && window.STATETTY_CONFIG.WS_API_BASE) || '';
  var headers = { 'Content-Type': 'application/json' };
  if (window.STT && typeof window.STT.getKey === 'function') {
    var token = window.STT.getKey();
    if (token) headers['Authorization'] = 'Bearer ' + token;
  }
  if (btn._tippyOriginal === undefined) {
    btn._tippyOriginal = btn.getAttribute('data-tippy-content') || '';
  }
  btn.dataset.disabled = '1';
  return fetch(base + 'statetty/inmueble/whatsapp', {
    method: 'POST', headers: headers, body: JSON.stringify({ _id: id }),
  })
    .then(function (r) { return r.json().then(function (b) { return { status: r.status, body: b }; }); })
    .then(function (res) {
      if (res.status === 403 || (res.body && res.body.error === 'sin_tiempo')) {
        throw new Error('sin_tiempo');
      }
      if (res.status !== 200 || !res.body || res.body.ok !== true || !res.body.data || !res.body.data.texto) {
        throw new Error((res.body && res.body.error) || 'No se pudo generar el texto.');
      }
      return copiarTextoPortapapeles(res.body.data.texto);
    })
    .then(function () { fichaTippyFeedback(btn, '¡Copiado!'); })
    .catch(function (err) {
      console.log('[Statetty] [error] copyFichaWhatsApp:', err && err.message ? err.message : err);
      fichaTippyFeedback(btn, err && err.message === 'sin_tiempo' ? 'Tu cuenta no tiene tiempo activo' : 'No se pudo copiar');
    })
    .then(function () { delete btn.dataset.disabled; return false; });
}
