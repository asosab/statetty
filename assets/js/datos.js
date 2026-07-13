// datos.js - Consulta finderresult y transforma datos al formato del mapa
// Dependencias: STATETTY_CONFIG (config.js)

async function fetchFinderResult(publicKey) {
  // Si no se pasó publicKey, obtenerlo de user.js tras esperar que termine
  if (!publicKey) {
    if (window.STT && window.STT.ready) {
      await window.STT.ready;
    }
    publicKey = window.STT && window.STT.getKey ? window.STT.getKey() : null;
  }
  if (!publicKey) {
    console.warn('[fetchFinderResult] publicKey vacío o no definido, se aborta la petición.');
    return null;
  }

  var url = STATETTY_CONFIG.WS_API_BASE + 'statetty/finderresult?publicKey=' + encodeURIComponent(publicKey);
  console.log('[fetchFinderResult] Iniciando petición a:', url);

  var res;
  try {
    res = await fetch(url);
  } catch (e) {
    console.error('[fetchFinderResult] Error de red al hacer fetch:', e);
    return null;
  }

  console.log('[fetchFinderResult] Respuesta HTTP recibida. status=', res.status, 'ok=', res.ok, 'statusText=', res.statusText);

  if (!res.ok) {
    try {
      var errorJson = await res.json();
      console.error('[fetchFinderResult] API error:', errorJson);
      return errorJson;
    } catch (e2) {
      var text = '';
      try { text = await res.text(); } catch (e3) {}
      console.error('[fetchFinderResult] HTTP', res.status, text);
      return { error: 'HTTP ' + res.status };
    }
  }

  var rawText;
  try {
    rawText = await res.text();
  } catch (e) {
    console.error('[fetchFinderResult] Error leyendo el body de la respuesta como texto:', e);
    return null;
  }

  var data;
  try {
    data = JSON.parse(rawText);
  } catch (e) {
    console.error('[fetchFinderResult] La respuesta no es JSON válido. Body crudo (primeros 500 chars):', rawText.substring(0, 500), 'Error:', e);
    return null;
  }

  console.log('[fetchFinderResult] JSON parseado correctamente. Claves recibidas:', Object.keys(data || {}));

  if (!data || !Array.isArray(data.result)) {
    console.warn('[fetchFinderResult] La respuesta no tiene la forma esperada (falta "result" como array). data=', data);
  } else {
    console.log('[fetchFinderResult] Cantidad de items en result:', data.result.length);
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

function parseFinderResult(response) {
  if (!response) {
    console.error('[parseFinderResult] response es null/undefined. No se puede parsear. Esto suele ocurrir cuando fetchFinderResult() falló silenciosamente antes.');
    return { locations: [], info: null, usuario: null };
  }

  if (!Array.isArray(response.result)) {
    console.error('[parseFinderResult] response.result no es un array. Tipo real:', typeof response.result, 'Valor:', response.result, 'Claves del response:', Object.keys(response));
    return { locations: [], info: null, usuario: null };
  }

  console.log('[parseFinderResult] Parseando', response.result.length, 'items...');

  var locations = response.result.map(function (item, index) {
    try {
      return apiItemToLocation(item);
    } catch (e) {
      console.error('[parseFinderResult] Error al transformar item en índice', index, '. Item:', item, 'Error:', e);
      return null;
    }
  }).filter(Boolean);

  if (locations.length !== response.result.length) {
    console.warn('[parseFinderResult] Se descartaron', response.result.length - locations.length, 'items por errores de transformación.');
  }

  if (!response.info) {
    console.warn('[parseFinderResult] response.info no está presente.');
  }
  if (!response.usuario) {
    console.warn('[parseFinderResult] response.usuario no está presente.');
  }

  console.log('[parseFinderResult] Resultado final: ', locations.length, 'ubicaciones listas para el mapa.');

  return {
    locations: locations,
    info: response.info || null,
    usuario: response.usuario || null
  };
}
