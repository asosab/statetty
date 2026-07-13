// datos.js - Consulta finderresult y transforma datos al formato del mapa
// Dependencias: STATETTY_CONFIG (config.js)

async function fetchFinderResult(publicKey) {
  if (!publicKey) return null;
  try {
    var url = STATETTY_CONFIG.WS_API_BASE + 'statetty/finderresult?publicKey=' + encodeURIComponent(publicKey);
    var res = await fetch(url);
    var data = await res.json();
    return data;
  } catch (e) {
    console.warn('fetchFinderResult error', e);
    return null;
  }
}

function apiItemToLocation(item) {
  var loc = {};

  var fieldMap = {
    nombre: 'Titulo',
    lat: 'lat',
    lng: 'lng',
    direccion: 'dir',
    URL: 'URL',
    desc: 'des',
    dormitorios: 'dormitorios',
    banos: 'ba\u00f1os',
    m2c: 'm2construccion',
    m2t: 'm2terreno',
    brocker: 'broker',
    precio: 'precio',
    agentName: 'agentName',
    agentPhon: 'agentPhone',
    fecha_ini: 'fechaIngreso',
    tOfertado: 'tiempoOfertado',
    tipoInmueble: 'tipoInmueble',
    tipoNegocio: 'tipoNegocio',
    _id: '_id'
  };

  for (var api in fieldMap) {
    loc[fieldMap[api]] = item[api] !== undefined ? item[api] : '';
  }

  loc.ambientes = '';
  loc.nombre = '';
  loc.anoc = item.anoc !== undefined ? item.anoc : '';
  loc.foto = Array.isArray(item.fotos) && item.fotos.length > 0 ? item.fotos[0] : '';

  if (Array.isArray(item.micros) && item.micros.length > 0) {
    loc.micros = item.micros.map(function (m) { return m.route_id || m.id || ''; }).filter(Boolean).join(', ');
  } else {
    loc.micros = '';
  }

  loc.lat = parseFloat(loc.lat);
  loc.lng = parseFloat(loc.lng);
  loc.precio = parseInt(loc.precio) || 0;
  loc.m2terreno = parseInt(loc.m2terreno) || 0;
  loc.m2construccion = parseInt(loc.m2construccion) || 0;
  loc.tiempoOfertado = parseInt(loc.tiempoOfertado) || 0;

  loc.precioM2C = (loc.precio > 0 && loc.m2construccion > 0) ? loc.precio / loc.m2construccion : 0;
  loc.precioM2T = (loc.precio > 0 && loc.m2terreno > 0) ? loc.precio / loc.m2terreno : 0;

  var raw = loc.des || '';
  raw = raw
    .replace(/Ø[=<>][ÜÝÐ°Í]/g, ' ')
    .replace(/[•·•`´¨^~¬]+/g, ' ')
    .replace(/[""]/g, "'")
    .replace(/[`´¨]/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/[^\x20-\x7EÀ-ÿ\n\r]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/(\r\n|\r|\n){2,}/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/\s+\n/g, '\n')
    .trim()
    .replace(/\+591\d{8}/g, '[...]')
    .replace(/591\d{8}/g, '[...]')
    .replace(/\b\d{8}\b/g, '[...]')
    .replace(/\d{2,4}[-\s]\d{2,4}[-\s]\d{2,4}/g, '[...]')
    .replace(/\(\d{3,4}\)\s?\d{5,8}/g, '[...]')
    .replace(/00\s?591\d{8}/g, '[...]')
    .replace(/wa\.me\/\d+/gi, '[...]')
    .replace(/whatsapp\.com\/\d+/gi, '[...]');

  var max = 300;
  var falta = raw.length > max ? raw.length - max : 0;
  var sufijo = falta > 0 ? '... (y ' + falta + ' caracteres m\u00e1s)' : '';
  loc.des = raw.length > max ? raw.substring(0, max) + sufijo : raw;

  return loc;
}

function parseFinderResult(response) {
  if (!response || !Array.isArray(response.result)) {
    return { locations: [], info: null, usuario: null };
  }
  return {
    locations: response.result.map(apiItemToLocation),
    info: response.info || null,
    usuario: response.usuario || null
  };
}
