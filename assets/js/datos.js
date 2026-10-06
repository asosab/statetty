// datos.js - Consulta la última búsqueda guardada y transforma los datos al formato del mapa
// Dependencias: STATETTY_CONFIG (config.js)
//
// POST statetty/buscarMapa {ultima:true} -> { ok, total, resultados, filtros, usuario }.
// `resultados` era `result` y `filtros` era `info` cuando existía GET /finderresult.

async function fetchBuscarMapa(token) {
  // Si no se pasó token, esperar a que auth.js lo resuelva (STT.ready).
  if (!token) {
    if (window.STT && window.STT.ready) {
      await window.STT.ready;
    }
    token = window.STT && window.STT.getToken ? window.STT.getToken() : null;
  }

  if (!token) {
    console.warn('[fetchBuscarMapa] sin sesión, se aborta la petición.');
    return null;
  }

  var base = STATETTY_CONFIG.WS_API_BASE;
  var url = base + 'statetty/buscarMapa';
  console.log('[fetchBuscarMapa] Iniciando petición a:', url);

  var res;
  try {
    res = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ ultima: true })
    });
  } catch (e) {
    console.error('[fetchBuscarMapa] Error de red al hacer fetch:', e);
    return null;
  }

  console.log('[fetchBuscarMapa] Respuesta HTTP recibida. status=', res.status, 'ok=', res.ok);

  var data;
  try {
    data = await res.json();
  } catch (e) {
    console.error('[fetchBuscarMapa] Respuesta no JSON. status=', res.status);
    return { ok: false, error: 'HTTP ' + res.status };
  }

  console.log('[fetchBuscarMapa] JSON parseado. Claves recibidas:', Object.keys(data || {}));
  if (!data || !Array.isArray(data.resultados)) {
    console.warn('[fetchBuscarMapa] sin "resultados" como array (ok=', data && data.ok,
      'error=', data && data.error, ')');
  }
  return data;
}

function apiItemToLocation(item) {
  if (!item || typeof item !== 'object') {
    console.error('[apiItemToLocation] item inválido recibido:', item);
    item = {};
  }

  var loc = {};

  var fieldMap = {
    titulo: 'Titulo',
    nombre: 'Nombre',
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
    estacionamientos: 'estacionamientos',
    createdAt: 'createdAt',
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
  loc.dormitorios = parseInt(loc.dormitorios) || 0;
  loc['ba\u00f1os'] = parseInt(loc['ba\u00f1os']) || 0;
  // "estacionamientos" suele venir null cuando el dato no está disponible;
  // no hay forma de distinguirlo de "0 estacionamientos" con la info actual,
  // así que 0 se interpreta como "sin dato" y no se muestra en el popup.
  loc.estacionamientos = parseInt(loc.estacionamientos) || 0;

  // Detección de coordenadas inválidas: causa típica de puntos "invisibles" en el mapa
  if (isNaN(loc.lat) || isNaN(loc.lng)) {
    console.error('[apiItemToLocation] Coordenadas inválidas (lat/lng NaN) para item _id=', loc._id, 'lat original=', item.lat, 'lng original=', item.lng);
  } else if (loc.lat === 0 && loc.lng === 0) {
    console.warn('[apiItemToLocation] Coordenadas (0,0) sospechosas para item _id=', loc._id);
  }

  if (loc.precio === 0 && item.precio !== undefined && item.precio !== '' && item.precio !== 0) {
    console.warn('[apiItemToLocation] precio original no numérico, se convirtió a 0. _id=', loc._id, 'precio original=', item.precio);
  }

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

function parseBuscarMapa(response) {
  if (!response) {
    console.error('[parseBuscarMapa] response es null/undefined. Suele ocurrir cuando fetchBuscarMapa() falló antes.');
    return { locations: [], info: null, usuario: null };
  }

  if (!Array.isArray(response.resultados)) {
    console.error('[parseBuscarMapa] response.resultados no es un array. Tipo real:', typeof response.resultados, 'Claves del response:', Object.keys(response));
    return { locations: [], info: null, usuario: null };
  }

  console.log('[parseBuscarMapa] Parseando', response.resultados.length, 'items...');

  var locations = response.resultados.map(function (item, index) {
    try {
      return apiItemToLocation(item);
    } catch (e) {
      console.error('[parseBuscarMapa] Error al transformar item en índice', index, '. Item:', item, 'Error:', e);
      return null;
    }
  }).filter(Boolean);

  if (locations.length !== response.resultados.length) {
    console.warn('[parseBuscarMapa] Se descartaron', response.resultados.length - locations.length, 'items por errores de transformación.');
  }

  if (!response.filtros) {
    console.warn('[parseBuscarMapa] response.filtros no está presente.');
  }
  if (!response.usuario) {
    console.warn('[parseBuscarMapa] response.usuario no está presente.');
  }

  console.log('[parseBuscarMapa] Resultado final: ', locations.length, 'ubicaciones listas para el mapa.');

  return {
    locations: locations,
    info: response.filtros || null,
    usuario: response.usuario || null
  };
}
