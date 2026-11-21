(function () {
  'use strict';

  var STATE = {
    fotos: [],
    currentIndex: 0
  };

  var DOM = {};

  function init() {
    console.log('STATETTY: init (versión cacheada, datos estáticos)');
    cacheDOM();
    bindEvents();

    // El resto del inmueble (header, features, descripción, mapa, SEO) ya
    // viene renderizado server-side en el HTML cacheado, así que NO se hace
    // fetch a la API. fetchInmueble()/render() y sus funciones auxiliares
    // se dejan definidas más abajo por si hacen falta más adelante, pero no
    // se ejecutan para esas secciones.
    //
    // La galería es la excepción: sí necesita JS para la interactividad
    // (lightbox, thumbs), así que se sigue usando renderGallery(), pero
    // alimentada con los datos que el .ejs ya embebió en la página
    // (window.STATETTY_FOTOS), sin volver a pedirlos a la API.
    renderGallery({ fotos: window.STATETTY_FOTOS || [] });

    // El mapa usa coordenadas inyectadas server-side en STATETTY_COORDS.
    // Cuando el inmueble no tiene coordenadas renderMap() oculta la sección.
    renderMap(window.STATETTY_COORDS || {});

    var id = getParam();
    console.log('STATETTY: id =', id);
    var waphone = getWaphoneParam();

    // Vista de "asesor": /inmueble/{id}?t={waphone}. Se pregunta a la API si el
    // waphone pertenece a un usuario activo; si es así se ocultan las tarjetas
    // laterales y se dibuja la card del asesor. Si no, la página queda como
    // siempre (sin cambios).
    if (waphone && id) {
      getAgentePublico(waphone, function (data) {
        if (data && data.activo === true) {
          activateAgentMode(data);
        } else {
          renderSimilares(id);
          renderEntornoInmueble(false);
        }
      }, function () {
        renderSimilares(id);
        renderEntornoInmueble(false);
      });
    } else if (id) {
      renderSimilares(id);
      renderEntornoInmueble(false);
    }
  }

  function cacheDOM() {
    DOM.loading         = document.getElementById('inm-loading');
    DOM.error           = document.getElementById('inm-error');
    DOM.content         = document.getElementById('inm-content');
    DOM.contactBar      = document.getElementById('inm-contact-bar');
    DOM.sidebar         = document.getElementById('inm-sidebar');
    DOM.contactBtn      = document.getElementById('inmContactBtn');
    DOM.gallery         = document.getElementById('inm-gallery');
    DOM.mainImg         = document.getElementById('inm-main-img');
    DOM.galCount        = document.getElementById('inm-gal-count');
    DOM.thumbs          = document.getElementById('inm-thumbs');
    DOM.title           = document.getElementById('inm-title');
    DOM.price           = document.getElementById('inm-price');
    DOM.address         = document.getElementById('inm-address');
    DOM.features        = document.getElementById('inm-features');
    DOM.desc            = document.getElementById('inm-desc');
    DOM.lb              = document.getElementById('inm-lightbox');
    DOM.lbImg           = document.getElementById('inm-lb-img');
    DOM.lbCount         = document.getElementById('inm-lb-count');
    DOM.mapSection      = document.getElementById('inm-map-section');
    DOM.mapContainer    = document.getElementById('inm-map');
    DOM.simCard         = document.getElementById('inm-sim-card');
    DOM.simList         = document.getElementById('inm-sim-list');
    // El ejs ahora monta la tarjeta con STTContact.mountInto() en #inm-contact-mount;
    // el fallback .inm-contact-card mantiene viva la copia standalone
    // statetty.com/inmueble/index.html (con su propio markup estático).
    DOM.contactCard     = document.getElementById('inm-contact-mount') || document.querySelector('.inm-contact-card');
  }

  function getParam() {
    // 1) Versión cacheada: _id inyectado server-side desde el .ejs.
    if (window.STATETTY_INMUEBLE_ID) return window.STATETTY_INMUEBLE_ID;

    // 2) Compat con la versión dinámica (?_id= o ?p=).
    var p = new URLSearchParams(window.location.search).get('_id');
    if (!p) {
      p = new URLSearchParams(window.location.search).get('p');
    }
    if (p) return p;

    // 3) Fallback: parsear /inmueble/<_id> directamente de la ruta.
    var m = window.location.pathname.match(/\/inmueble\/([^\/?#]+)\/?$/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  // Parámetro ?t= = número telefónico con código de país sin "+" (ej. 59174189700),
  // sin relación con el id del inmueble ni con ?p=/_id=. Solo dígitos, 8-15.
  function getWaphoneParam() {
    var t = new URLSearchParams(window.location.search).get('t');
    if (!t) return null;
    var digits = t.replace(/\D/g, '');
    return /^\d{8,15}$/.test(digits) ? digits : null;
  }

  // Datos públicos del asesor dueño de un waphone (GET /api/statetty/agentes/{celular}).
  // onSuccess(data) recibe { activo, nombre, foto, agencia, logoAgencia, celular,
  // whatsapp, email, desde, descripcion }; si el número no es de un usuario activo,
  // data.activo === false (mismas respuesta para "no existe" y "no activo").
  function getAgentePublico(cel, onSuccess, onError) {
    try {
      var base = window.STATETTY_CONFIG ? STATETTY_CONFIG.WS_API_BASE : '';
      if (!base) {
        if (onError) onError('No se pudo determinar el endpoint del servidor.');
        return;
      }

      var url = base + 'statetty/agentes/' + encodeURIComponent(cel);
      console.log('STATETTY: fetching', url);

      fetch(url, {})
        .then(function (r) {
          return r.json().then(function (body) { return { status: r.status, ok: r.ok, body: body }; });
        })
        .then(function (res) {
          if (!res.ok) throw new Error(res.body && res.body.error ? res.body.error : 'HTTP ' + res.status);
          if (res.body.error) throw new Error(res.body.error);
          if (!res.body.data || typeof res.body.data !== 'object') throw new Error('Respuesta inválida del servidor');
          onSuccess(res.body.data);
        })
        .catch(function (err) {
          console.warn('STATETTY: getAgentePublico fetch error', err);
          if (onError) onError(err.message || 'No se pudieron cargar los datos del agente.');
        });
    } catch (err) {
      console.warn('STATETTY: getAgentePublico sync error', err);
      if (onError) onError(err.message);
    }
  }

  function fetchInmueble(id) {
    try {
      var base = window.STATETTY_CONFIG ? STATETTY_CONFIG.WS_API_BASE : '';
      if (!base) {
        showError('Error de configuración', 'No se pudo determinar el endpoint del servidor.');
        return;
      }
      var url = base + 'statetty/inmueble/' + encodeURIComponent(id);
      console.log('STATETTY: fetching', url);
      var opts = {};
      if (typeof AbortController !== 'undefined') {
        var controller = new AbortController();
        var timeout = setTimeout(function () { controller.abort(); }, 20000);
        opts.signal = controller.signal;
      }
      fetch(url, opts)
        .then(function (r) {
          if (opts.signal) clearTimeout(timeout);
          return r.json().then(function (body) { return { status: r.status, ok: r.ok, body: body }; });
        })
        .then(function (res) {
          if (!res.ok) throw new Error(res.body && res.body.error ? res.body.error : 'HTTP ' + res.status);
          if (res.body.error) throw new Error(res.body.error);
          if (!res.body.data || typeof res.body.data !== 'object') throw new Error('Respuesta inválida del servidor');
          render(res.body.data);
        })
        .catch(function (err) {
          if (opts.signal) clearTimeout(timeout);
          console.warn('STATETTY: fetch error', err);
          if (err.name === 'AbortError') {
            showError('Tiempo de espera agotado', 'El servidor no respondió a tiempo.');
          } else {
            showError('Error del servidor', err.message || 'No se pudo cargar la información del inmueble.');
          }
        });
    } catch (err) {
      console.warn('STATETTY: sync error', err);
      showError('Error inesperado', err.message);
    }
  }

  function formatde(num) {
    return Math.ceil(Number(num)).toLocaleString('es-BO');
  }

  function render(inm) {
    DOM.loading.classList.add('inm-hidden');
    DOM.content.classList.remove('inm-hidden');
    DOM.contactBar.classList.remove('inm-hidden');

    renderGallery(inm);
    renderHeader(inm);
    renderFeatures(inm);
    renderDescription(inm);
    renderMap(inm);
    renderSEO(inm);
    renderSimilares(inm._id || getParam());

    window.scrollTo(0, 0);
  }

  /* ---------- Gallery ---------- */
  function renderGallery(inm) {
    var fotos = inm.fotos;
    if (!Array.isArray(fotos) || fotos.length === 0) {
      DOM.gallery.classList.add('inm-hidden');
      return;
    }
    STATE.fotos = fotos;
    STATE.currentIndex = 0;

    DOM.mainImg.fetchPriority = 'high';
    setMainImage(0);
    DOM.galCount.textContent = '1 / ' + fotos.length;
    DOM.mainImg.addEventListener('click', function () { openLightbox(0); });

    function renderThumbs() {
      DOM.thumbs.innerHTML = '';
      fotos.forEach(function (url, i) {
        var thumb = document.createElement('div');
        thumb.className = 'inm-gallery-thumb' + (i === 0 ? ' active' : '');
        var img = document.createElement('img');
        img.src = url;
        img.alt = 'Foto ' + (i + 1);
        img.loading = 'lazy';
        img.fetchPriority = 'low';
        thumb.appendChild(img);
        thumb.addEventListener('click', function () { selectImage(i); });
        DOM.thumbs.appendChild(thumb);
      });
    }

    if (DOM.mainImg.complete) {
      // La imagen principal ya está cargada (típico en la versión cacheada,
      // donde viene servida directo en el HTML estático): el evento 'load'
      // puede no volver a dispararse, así que armamos los thumbs ya mismo.
      renderThumbs();
    } else {
      DOM.mainImg.addEventListener('load', renderThumbs, { once: true });
      DOM.mainImg.addEventListener('error', renderThumbs, { once: true });
    }
  }

  function setMainImage(index) {
    if (!STATE.fotos[index]) return;
    DOM.mainImg.src = STATE.fotos[index];
    DOM.mainImg.alt = 'Foto ' + (index + 1);
    STATE.currentIndex = index;
  }

  function selectImage(index) {
    setMainImage(index);
    DOM.galCount.textContent = (index + 1) + ' / ' + STATE.fotos.length;
    var thumbs = DOM.thumbs.querySelectorAll('.inm-gallery-thumb');
    thumbs.forEach(function (t, i) { t.classList.toggle('active', i === index); });
  }

  /* ---------- Lightbox ---------- */
  function openLightbox(index) {
    if (!STATE.fotos.length) return;
    STATE.currentIndex = index;
    DOM.lbImg.src = STATE.fotos[index];
    DOM.lbCount.textContent = (index + 1) + ' / ' + STATE.fotos.length;
    DOM.lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    DOM.lb.classList.remove('open');
    document.body.style.overflow = '';
  }

  function prevImage() {
    var i = STATE.currentIndex;
    i = (i - 1 + STATE.fotos.length) % STATE.fotos.length;
    openLightbox(i);
  }

  function nextImage() {
    var i = STATE.currentIndex;
    i = (i + 1) % STATE.fotos.length;
    openLightbox(i);
  }

  function bindEvents() {
    DOM.lb.addEventListener('click', function (e) {
      if (e.target === DOM.lb || e.target === DOM.lbImg) closeLightbox();
    });
    document.getElementById('inm-lb-close').addEventListener('click', closeLightbox);
    document.getElementById('inm-lb-prev').addEventListener('click', prevImage);
    document.getElementById('inm-lb-next').addEventListener('click', nextImage);
    DOM.contactBtn.addEventListener('click', function () {
      DOM.sidebar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    document.addEventListener('keydown', function (e) {
      if (!DOM.lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
    });
  }

  /* ---------- Header Info ---------- */
  function buildTitulo(inm) {
    var tipo = inm.tipoInmueble || 'Inmueble';
    var negocio = inm.tipoNegocio || '';
    var precio = Math.ceil(Number(inm.precio)) || 0;
    var precioStr = precio ? '$ ' + formatde(precio) : '';
    return tipo + ' en ' + negocio + ' por ' + precioStr;
  }

  function renderHeader(inm) {
    var titulo = buildTitulo(inm);
    DOM.title.textContent = inm.nombre || titulo;
    document.title = titulo + ' — Statetty';
    var moneda = inm.moneda || 'USD';
    var precio = Math.ceil(Number(inm.precio)) || 0;
    DOM.price.innerHTML = precio
      ? moneda + ' ' + formatde(precio) + ' <small>' + (inm.tipoNegocio || '') + '</small>'
      : (inm.tipoNegocio || '');
    var dir = inm.direccion || '';
    if (inm.zona) dir += (dir ? ', ' : '') + inm.zona;
    if (inm.ciudad) dir += (dir ? ', ' : '') + inm.ciudad;
    DOM.address.textContent = dir || 'Sin dirección';
  }

  /* ---------- Features ---------- */
  function renderFeatures(inm) {
    var items = [
      { label: 'Dormitorios',     value: inm.dormitorios,     icon: '🛏' },
      { label: 'Baños',           value: inm.banos,           icon: '🛁' },
      { label: 'Estacionamientos',value: inm.estacionamientos,icon: '🚗' },
      { label: 'M² construc.',    value: inm.m2c != null ? Math.ceil(inm.m2c) : inm.m2c, icon: '📐' },
      { label: 'M² terreno',      value: inm.m2t != null ? Math.ceil(inm.m2t) : inm.m2t, icon: '🌳' },
      { label: 'Tipo',            value: inm.tipoInmueble,   icon: '🏠' }
    ];
    if (inm.vendida)  items.push({ label: 'Estado', value: 'Vendida', icon: '✅' });
    if (inm.alquilada) items.push({ label: 'Estado', value: 'Alquilada', icon: '✅' });
    if (inm.es_preventa) items.push({ label: 'Estado', value: 'Pre-venta', icon: '🏗️' });
    DOM.features.innerHTML = '';
    items.forEach(function (item) {
      if (item.value === undefined || item.value === null || item.value === '') return;
      var div = document.createElement('div');
      div.className = 'inm-feature';
      div.innerHTML = '<div class="inm-feature-value"> ' + item.value + '</div>'
                    + '<div class="inm-feature-label">' + item.label + '</div>';
      DOM.features.appendChild(div);
    });
  }

  /* ---------- Description ---------- */
  function renderDescription(inm) {
    var desc = inm.desc || '';
    if (!desc) {
      DOM.desc.parentElement.classList.add('inm-hidden');
      return;
    }
    DOM.desc.textContent = desc;
  }

  /* ---------- SEO ---------- */
  function renderSEO(inm) {
    var titulo = buildTitulo(inm);
    var title = titulo + ' — Statetty';
    var desc = (inm.desc || titulo || 'Inmueble en Statetty').substring(0, 200);
    var img = Array.isArray(inm.fotos) && inm.fotos.length > 0
      ? inm.fotos[0]
      : 'https://statetty.com/assets/images/statetty.png';
    var keywords = [
      inm.tipoInmueble, inm.tipoNegocio, 'inmueble',
      inm.ciudad, inm.zona, inm.pais
    ].filter(Boolean).join(', ');
    var url = window.location.href;
    var lat = parseFloat(inm.lat);
    var lng = parseFloat(inm.lng);

    var tags = {
      'title': title,
      'description': desc,
      'keywords': keywords,
      'author': 'Statetty',

      'og:title': title,
      'og:description': desc,
      'og:image': img,
      'og:image:type': img.match(/\.png$/i) ? 'image/png' : 'image/jpeg',
      'og:image:alt': 'Foto de ' + titulo,
      'og:url': url,
      'og:type': 'article',
      'og:site_name': 'Statetty',
      'og:locale': 'es_BO',

      'twitter:card': 'summary_large_image',
      'twitter:site': '@statetty',
      'twitter:title': title,
      'twitter:description': desc,
      'twitter:image:src': img,
      'twitter:image:alt': 'Foto de ' + titulo,
      'twitter:url': url,
      'twitter:creator': '@statetty'
    };

    if (!isNaN(lat) && !isNaN(lng)) {
      tags['geo.region'] = inm.pais || 'BO';
      tags['geo.placename'] = [inm.ciudad, inm.zona].filter(Boolean).join(', ') || 'Bolivia';
      tags['geo.position'] = lat + '; ' + lng;
      tags['ICBM'] = lat + ', ' + lng;
    }

    var name, content;
    for (name in tags) {
      content = tags[name];
      if (!content) continue;
      var sel = 'meta[name="' + name + '"], meta[property="' + name + '"]';
      var el = document.querySelector(sel);
      if (!el) {
        el = document.createElement('meta');
        if (name.indexOf('og:') === 0 || name.indexOf('twitter:') === 0) {
          el.setAttribute('property', name);
        } else {
          el.setAttribute('name', name);
        }
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    }

    var canon = document.querySelector('link[rel="canonical"]');
    if (!canon) {
      canon = document.createElement('link');
      canon.setAttribute('rel', 'canonical');
      canon.setAttribute('itemprop', 'url');
      document.head.appendChild(canon);
    }
    canon.setAttribute('href', url);
  }

  /* ---------- Map ---------- */
  function renderMap(inm) {
    // Coordenadas desde los data-* del DOM (si el servidor las incluyó),
    // con fallback al objeto inm (STATETTY_COORDS o API). Esto permite
    // compatibilidad con HTML cacheados viejos que no tienen la variable
    // global STATETTY_COORDS pero sí los data-* en el section.
    var section = DOM.mapSection;
    var lat = section ? parseFloat(section.dataset.lat) : NaN;
    var lng = section ? parseFloat(section.dataset.lng) : NaN;
    if (isNaN(lat) || isNaN(lng)) {
      lat = parseFloat(inm && inm.lat);
      lng = parseFloat(inm && inm.lng);
    }
    if (!isNaN(lat) && !isNaN(lng)) coordsResueltas = { lat: lat, lng: lng };
    if (isNaN(lat) || isNaN(lng)) {
      if (section) section.classList.add('inm-hidden');
      return;
    }
    if (section) section.classList.remove('inm-hidden');

    var map = L.map(DOM.mapContainer, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
      scrollWheelZoom: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19
    }).addTo(map);

    var icon = L.icon({
      iconUrl: '/assets/images/pointers/pointer_statetty.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [40, 60],
      iconAnchor: [20, 60],
      popupAnchor: [1, -54],
      shadowSize: [60, 60]
    });

    var marker = L.marker([lat, lng], { icon: icon }).addTo(map);

    marker.on('click', function () {
      var url = 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng;
      window.open(url, '_blank');
    });

    setTimeout(function () { map.invalidateSize(); }, 300);
  }

  /* ---------- Error ---------- */
  function showError(title, msg) {
    DOM.loading.classList.add('inm-hidden');
    DOM.error.classList.remove('inm-hidden');
    document.getElementById('inm-error-title').textContent = title || 'Error';
    document.getElementById('inm-error-msg').textContent  = msg  || 'Ocurrió un error inesperado.';
  }

  /* ---------- Similares ---------- */
  function renderSimilares(id) {
    // Llegar aquí significa que NO se activó la vista de asesor (?t= no presente
    // o no es de un usuario activo), así que se muestran las tarjetas de contacto
    // e inmuebles similares, que arrancan ocultas por defecto.
    if (DOM.contactCard) DOM.contactCard.classList.remove('inm-hidden');

    getInmSim(id, { max: 4 }, function (lista) {
      if (!Array.isArray(lista) || lista.length === 0) return;
      DOM.simCard.classList.remove('inm-hidden');
      DOM.simList.innerHTML = '';

      // La key ya viene resuelta y verificada por user.js (cookie / localStorage /
      // ?k= + chequeo contra getuser), expuesta en window.STT.getKey() / window.publicKey.
      // No la releemos de la URL: la calculamos al hacer click, para darle tiempo
      // a user.js (que es async) a terminar de verificarla.
      function getVerifiedKey() {
        return (window.STT && window.STT.getKey && window.STT.getKey()) || window.publicKey || null;
      }

      lista.forEach(function (item) {
        var baseUrl = 'https://statetty.com/inmueble/' + encodeURIComponent(item._id);

        var el = document.createElement('div');
        el.className = 'inm-sim-item';

        if (item.fotos) {
          var img = document.createElement('img');
          img.className = 'inm-sim-item-img';
          img.src = item.fotos;
          img.alt = item.nombre || 'Similar';
          img.loading = 'lazy';
          el.appendChild(img);
        }

        var info = document.createElement('div');
        info.className = 'inm-sim-item-info';

        var precio = document.createElement('div');
        precio.className = 'inm-sim-item-precio';
        var p = Math.ceil(Number(item.precio)) || 0;
        precio.textContent = p ? '$ ' + formatde(p) : '';
        info.appendChild(precio);

        var tipo = document.createElement('div');
        tipo.className = 'inm-sim-item-tipo';
        tipo.textContent = item.nombre || item.tipoNegocio || '';
        info.appendChild(tipo);

        if (item.distanciaKm != null) {
          var dist = document.createElement('div');
          dist.className = 'inm-sim-item-dist';
          dist.textContent = 'a ~' + Math.round(item.distanciaKm) + ' km';
          info.appendChild(dist);
        }

        el.appendChild(info);
        el.addEventListener('click', function () {window.location.href = baseUrl;});
        DOM.simList.appendChild(el);
      });
    }, function () {});
  }

  /* ---------- Entorno: rutas de transporte + clima/ruido ----------
     Dos cajas independientes; cada una solo se muestra si tiene contenido.
     Regla del dueño: la vista pública ve TODO (rutas + clima + ruido);
     la vista asesor ?t= oculta clima y ruido (info «negativa» para el cliente). */
  var WMO_EMOJI = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
    71: '🌨️', 73: '🌨️', 75: '❄️', 80: '🌦️', 81: '🌧️', 82: '⛈️',
    95: '⛈️', 96: '⛈️', 99: '⛈️'
  };
  function wmoEmoji(c) { return WMO_EMOJI[c] || '🌡️'; }
  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  var coordsResueltas = null;
  function coordsInmueble() {
    if (coordsResueltas) return coordsResueltas;
    var section = DOM.mapSection;
    var lat = section ? parseFloat(section.dataset.lat) : NaN;
    var lng = section ? parseFloat(section.dataset.lng) : NaN;
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat: lat, lng: lng };
  }

  function inyectarEstilosEntorno() {
    if (document.getElementById('inm-entorno-styles')) return;
    var s = document.createElement('style');
    s.id = 'inm-entorno-styles';
    s.textContent =
      '#inm-entorno{margin:18px 0;padding:16px;border:1px solid #e2eef3;border-radius:12px;background:#fbfdff;}' +
      '#inm-entorno h3{margin:0 0 10px;font-size:15px;color:#074f66;}' +
      '.inm-ent-bloque{margin-bottom:14px;}' +
      '.inm-ent-bloque:last-child{margin-bottom:0;}' +
      '.inm-ent-bloque h3{margin-bottom:8px;}' +
      '.inm-ent-sub{font-size:12px;font-weight:700;color:#04364a;margin:12px 0 6px;}' +
      '.inm-ent-rutas{display:flex;flex-wrap:wrap;gap:6px;}' +
      '.inm-ent-ruta{background:#f2fbff;border:1px solid #cfe9f5;border-radius:999px;' +
        'padding:3px 10px;font-size:12px;color:#074f66;}' +
      '.inm-ent-ruta small{color:#7b8f99;}' +
      '.inm-ent-actual{display:flex;flex-wrap:wrap;gap:10px;font-size:13px;color:#04364a;}' +
      '.inm-ent-actual b{font-size:16px;}' +
      '.inm-ent-fc{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;}' +
      '.inm-ent-dia{min-width:64px;text-align:center;background:#fff;border:1px solid #e2eef3;' +
        'border-radius:8px;padding:6px 4px;font-size:11px;color:#04364a;}' +
      '.inm-ent-dia .d{font-weight:700;}' +
      '.inm-ent-clima-chart{width:100%;height:auto;display:block;}' +
      '.inm-ent-ruido{display:inline-block;margin-top:8px;padding:4px 10px;border-radius:8px;' +
        'font-size:12px;font-weight:700;color:#fff;}' +
      '.inm-ent-nota{font-size:11px;color:#7b8f99;margin-top:8px;}';
    document.head.appendChild(s);
  }

  function montarSeccionEntorno(coords, esAsesor) {
    var anchor = DOM.mapSection;
    if (!anchor || !anchor.parentNode) return null;
    var sec = document.createElement('div');
    sec.id = 'inm-entorno';
    sec.innerHTML =
      '<div class="inm-ent-bloque" id="inm-ent-bloque-rutas">' +
        '<h3>🚌 Rutas de transporte urbano</h3>' +
        '<div class="inm-ent-rutas" id="inm-ent-rutas"><span style="font-size:12px;color:#7b8f99">Cargando…</span></div>' +
      '</div>' +
      (esAsesor ? '' :
        '<div class="inm-ent-bloque" id="inm-ent-bloque-clima">' +
          '<h3>🌡️ Clima y ruido de la zona</h3>' +
          '<div id="inm-ent-clima"><span style="font-size:12px;color:#7b8f99">Cargando…</span></div>' +
        '</div>');
    anchor.parentNode.insertBefore(sec, anchor);
    return sec;
  }

  // Quita una caja si quedó sin contenido; si no queda ninguna, quita la sección.
  function limpiarBloqueVacio(sec, bloqueId) {
    var b = sec.querySelector('#' + bloqueId);
    if (b && !b.textContent.replace(/\s/g, '')) b.remove();
    if (!sec.querySelector('.inm-ent-bloque')) sec.remove();
  }

  function pintarRutasEntorno(sec, rutas) {
    var bloque = sec.querySelector('#inm-ent-bloque-rutas');
    if (!bloque) return;
    if (!rutas || !rutas.length) { bloque.remove(); limpiarBloqueVacio(sec, 'inm-ent-bloque-rutas'); return; }
    var box = bloque.querySelector('#inm-ent-rutas');
    box.innerHTML = '';
    rutas.forEach(function (r) {
      var chip = document.createElement('span');
      chip.className = 'inm-ent-ruta';
      chip.innerHTML = escHtml(r.nombre || 'Ruta') +
        (r.direccion ? ' <small>' + escHtml(r.direccion) + '</small>' : '') +
        (r.distanciaM != null ? ' <small>· a ' + r.distanciaM + ' m</small>' : '');
      box.appendChild(chip);
    });
  }

  function pintarClimaEntorno(sec, d) {
    var bloque = sec.querySelector('#inm-ent-bloque-clima');
    if (!bloque) return;
    var box = bloque.querySelector('#inm-ent-clima');
    if (!box) return;
    d = d || {};
    var html = '';
    if (d.actual) {
      html += '<div class="inm-ent-actual">' +
        '<span>' + wmoEmoji(d.actual.code) + ' <b>' + (d.actual.t != null ? Math.round(d.actual.t) + ' °C' : '—') + '</b> ahora</span>' +
        (d.actual.sensacion != null ? '<span>sensación <b>' + Math.round(d.actual.sensacion) + ' °C</b></span>' : '') +
        (d.actual.hr != null ? '<span>humedad <b>' + d.actual.hr + '%</b></span>' : '') +
        (d.actual.presion != null ? '<span>presión <b>' + Math.round(d.actual.presion) + ' hPa</b></span>' : '') +
        (d.actual.lluvia != null ? '<span>lluvia <b>' + d.actual.lluvia + ' mm</b></span>' : '') +
        '</div>';
    }
    if (d.pronostico && d.pronostico.length) {
      html += '<div class="inm-ent-sub" style="margin-top:10px">Próximos 7 días</div><div class="inm-ent-fc">';
      var DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      d.pronostico.forEach(function (p, i) {
        var nom = i === 0 ? 'Hoy' : (i === 1 ? 'Mañana' : DIAS[new Date(p.fecha + 'T12:00:00').getDay()]);
        html += '<div class="inm-ent-dia"><div class="d">' + nom + '</div>' +
          '<div>' + wmoEmoji(p.code) + '</div>' +
          '<div><b>' + (p.tMax != null ? Math.round(p.tMax) : '—') + '</b>/' + (p.tMin != null ? Math.round(p.tMin) : '—') + '°</div>' +
          (p.probLluvia != null && p.probLluvia > 10 ? '<div>🌧 ' + p.probLluvia + '%</div>' : '') +
          '</div>';
      });
      html += '</div>';
    }
    if (d.celda && d.celda.mensual && d.celda.mensual.length === 12) {
      html += '<div class="inm-ent-sub" style="margin-top:10px">Ciclo anual de sensación térmica ' +
        '(promedio mensual 2001-2025) · mes actual resaltado</div>' +
        graficoCicloAnual(d.celda.mensual, d.actual);
    }
    if (d.celda && d.celda.ruido != null) {
      var etiqueta = d.celda.ruido <= 0 ? 'Sin aporte de buses' :
        d.celda.ruido <= 25 ? 'Bajo' : d.celda.ruido <= 55 ? 'Moderado' :
        d.celda.ruido <= 80 ? 'Alto' : 'Intenso';
      var color = d.celda.ruido <= 0 ? '#6b7280' : d.celda.ruido <= 25 ? '#ca8a04' :
        d.celda.ruido <= 55 ? '#ea580c' : d.celda.ruido <= 80 ? '#dc2626' : '#7c3aed';
      html += '<div>Ruido de la zona: <span class="inm-ent-ruido" style="background:' + color + '">' +
        etiqueta + ' · ' + d.celda.ruido + '/100</span>' +
        (d.celda.ruidoRutas ? ' <small style="color:#7b8f99">(' + d.celda.ruidoRutas + ' rutas solapadas)</small>' : '') +
        (d.celda.tranquila ? ' · <b style="color:#15803d">calle tranquila</b>' : '') + '</div>';
    }
    if (!html) { bloque.remove(); if (!sec.querySelector('.inm-ent-bloque')) sec.remove(); return; }
    box.innerHTML = html;
  }

  // Gráfica SVG del ciclo anual: sensación térmica (naranja) y temperatura
  // media (azul) por mes. El mes actual va resaltado y se marcan la
  // temperatura real de ahora y la sensación real contra el promedio del mes.
  // Sin dependencias.
  function graficoCicloAnual(mensual, actual) {
    var W = 640, H = 170, P = { l: 34, r: 8, t: 10, b: 22 };
    var MESES_C = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    // Mes actual: por la fecha del dato real; si no hay, el mes de hoy.
    var mesActual = null;
    if (actual && actual.fecha) {
      var fm = parseInt(String(actual.fecha).slice(5, 7), 10);
      if (fm >= 1 && fm <= 12) mesActual = fm - 1;
    }
    if (mesActual == null) mesActual = new Date().getMonth();
    var s = mensual.map(function (m) { return m.sensacion != null ? m.sensacion : m.tMedia; })
      .filter(function (v) { return v != null; });
    var t = mensual.map(function (m) { return m.tMedia; }).filter(function (v) { return v != null; });
    var vals = s.concat(t);
    if (actual) {
      if (actual.t != null && isFinite(actual.t)) vals.push(actual.t);
      if (actual.sensacion != null && isFinite(actual.sensacion)) vals.push(actual.sensacion);
    }
    if (!s.length) return '';
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (max - min < 1) { max += 1; min -= 1; }
    function X(i) { return P.l + (W - P.l - P.r) * i / 11; }
    function Y(v) { return P.t + (H - P.t - P.b) * (1 - (v - min) / (max - min)); }
    function serie(vals, color, fill) {
      // Solo puntos con dato; los huecos se omiten (POWER devuelve los 12
      // meses, pero un mes puede venir -999 si falta).
      var idx = vals.map(function (v, i) { return { i: i, v: v }; })
        .filter(function (p) { return p.v != null && isFinite(p.v); });
      if (!idx.length) return '';
      var pts = idx.map(function (p) { return X(p.i) + ',' + Y(p.v); });
      var line = pts.join(' ');
      var area = 'M' + pts[0] + ' L' + pts.slice(1).join(' L') +
        ' L' + X(idx[idx.length - 1].i) + ',' + Y(min) + ' L' + X(idx[0].i) + ',' + Y(min) + ' Z';
      return (fill ? '<path d="' + area + '" fill="' + fill + '"/>' : '') +
        '<polyline points="' + line + '" fill="none" stroke="' + color + '" stroke-width="2"/>';
    }
    var etiquetasY = [min, (min + max) / 2, max].map(function (v) {
      return '<text x="2" y="' + (Y(v) + 3) + '" font-size="9" fill="#7b8f99">' + Math.round(v) + '°</text>';
    }).join('');
    var etiquetasX = MESES_C.map(function (m, i) {
      var peso = i === mesActual ? 'font-weight="700" fill="#074f66"' : 'fill="#7b8f99"';
      return '<text x="' + X(i) + '" y="' + (H - 6) + '" font-size="9" ' + peso +
        ' text-anchor="middle">' + m + '</text>';
    }).join('');

    // Mes actual: banda de fondo + marcador del mes en la etiqueta.
    var pasoX = (W - P.l - P.r) / 11;
    var fondo = mesActual != null
      ? '<rect x="' + (X(mesActual) - pasoX / 2) + '" y="' + P.t + '" width="' + pasoX +
        '" height="' + (H - P.t - P.b) + '" fill="rgba(7,79,102,.07)"/>'
      : '';

    // Marcadores «ahora»: temperatura real (punto azul sobre la serie de
    // temperatura media) y sensación real (punto naranja sobre su serie).
    var marcadores = '', notaHoy = '';
    if (actual && mesActual != null) {
      var mm = mensual[mesActual] || {};
      if (actual.t != null && isFinite(actual.t)) {
        marcadores += '<circle cx="' + X(mesActual) + '" cy="' + Y(actual.t) +
          '" r="4" fill="#1d4ed8" stroke="#fff" stroke-width="1.5"/>';
      }
      if (actual.sensacion != null && isFinite(actual.sensacion)) {
        marcadores += '<circle cx="' + X(mesActual) + '" cy="' + Y(actual.sensacion) +
          '" r="4" fill="#ea580c" stroke="#fff" stroke-width="1.5"/>';
      }
      var partes = [];
      if (actual.t != null && mm.tMedia != null)
        partes.push('hoy <b>' + Math.round(actual.t) + ' °C</b> real · promedio del mes ' + Math.round(mm.tMedia) + ' °C');
      if (actual.sensacion != null && (mm.sensacion != null || mm.tMedia != null)) {
        var prom = mm.sensacion != null ? mm.sensacion : mm.tMedia;
        partes.push('sensación <b>' + Math.round(actual.sensacion) + ' °C</b> · promedio ' + Math.round(prom) + ' °C');
      }
      if (partes.length) notaHoy = '<div class="inm-ent-nota" style="color:#074f66;font-weight:600">' + partes.join(' · ') + '</div>';
    }

    return '<svg class="inm-ent-clima-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="Ciclo anual de sensación térmica">' + fondo + etiquetasY + etiquetasX +
      serie(t, '#2563eb', 'rgba(37,99,235,.08)') +
      serie(s, '#ea580c', 'rgba(234,88,12,.08)') + marcadores + '</svg>' +
      notaHoy +
      '<div class="inm-ent-nota">Azul: temperatura media · Naranja: sensación térmica (T + humedad + viento). ' +
      'Puntos sólidos: valor real de ahora. Valores normales NASA POWER 2001-2025.</div>';
  }

  function renderEntornoInmueble(esAsesor) {
    var coords = coordsInmueble();
    if (!coords) return;
    inyectarEstilosEntorno();
    var sec = montarSeccionEntorno(coords, esAsesor);
    if (!sec) return;
    var base = window.STATETTY_CONFIG ? STATETTY_CONFIG.WS_API_BASE : '';

    // Rutas de micros cercanas: para todos los visitantes.
    fetch(base + 'statetty/inmueble/rutas?lat=' + coords.lat + '&lng=' + coords.lng + '&radio=150')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { pintarRutasEntorno(sec, d && d.rutas); })
      .catch(function () { pintarRutasEntorno(sec, []); });

    // Clima + ruido: solo vista PÚBLICA. En ?t= (asesor) se ocultan porque
    // pueden mostrar datos «negativos» de la zona (regla del dueño).
    if (esAsesor) return;
    fetch(base + 'statetty/clima/punto?lat=' + coords.lat + '&lng=' + coords.lng)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { pintarClimaEntorno(sec, d || {}); })
      .catch(function () {
        var bloque = sec.querySelector('#inm-ent-bloque-clima');
        if (bloque) { bloque.remove(); if (!sec.querySelector('.inm-ent-bloque')) sec.remove(); }
      });
  }

  /* ---------- Vista asesor (?t=waphone, usuario activo) ---------- */
  var modoAsesor = false;
  function activateAgentMode(data) {
    modoAsesor = true;
    if (DOM.contactBar) DOM.contactBar.classList.add('inm-hidden');
    if (DOM.contactCard) DOM.contactCard.classList.add('inm-hidden');
    if (DOM.simCard) DOM.simCard.classList.add('inm-hidden');
    renderAgenteCard(data);
    renderEntornoInmueble(true);
  }

  function renderAgenteCard(data) {
    if (!DOM.sidebar) return;

    var card = document.createElement('div');
    card.className = 'inm-agent-card';

    var head = document.createElement('div');
    head.className = 'inm-agent-head';

    var foto = document.createElement('div');
    foto.className = 'inm-agent-foto';
    if (data.foto) {
      var img = document.createElement('img');
      img.src = data.foto;
      img.alt = data.nombre || 'Asesor inmobiliario';
      img.loading = 'lazy';
      img.addEventListener('error', function () {
        foto.classList.add('sin-foto');
        foto.textContent = '👤';
      });
      foto.appendChild(img);
    } else {
      foto.classList.add('sin-foto');
      foto.textContent = '👤';
    }
    head.appendChild(foto);

    var info = document.createElement('div');
    info.className = 'inm-agent-info';

    var nombre = document.createElement('div');
    nombre.className = 'inm-agent-nombre';
    nombre.textContent = data.nombre || 'Asesor inmobiliario';
    info.appendChild(nombre);

    var rol = document.createElement('div');
    rol.className = 'inm-agent-rol';
    rol.textContent = 'Asesor inmobiliario';
    info.appendChild(rol);

    if (data.agencia) {
      var agenciaEl = document.createElement('div');
      agenciaEl.className = 'inm-agent-agencia';
      if (data.logoAgencia) {
        var logo = document.createElement('img');
        logo.className = 'inm-agent-agencia-logo';
        logo.src = data.logoAgencia;
        logo.alt = '';
        logo.loading = 'lazy';
        agenciaEl.appendChild(logo);
      }
      var agenciaNombre = document.createElement('span');
      agenciaNombre.textContent = data.agencia;
      agenciaEl.appendChild(agenciaNombre);
      info.appendChild(agenciaEl);
    }

    head.appendChild(info);
    card.appendChild(head);

    if (data.descripcion) {
      var desc = document.createElement('p');
      desc.className = 'inm-agent-desc';
      desc.textContent = data.descripcion;
      card.appendChild(desc);
    }

    var acciones = document.createElement('div');
    acciones.className = 'inm-agent-acciones';

    var titulo = (DOM.title && (DOM.title.textContent || '').trim()) || '';
    var precioTxt = '';
    if (DOM.price) {
      var mPrecio = (DOM.price.textContent || '').match(/\$\s*[\d][\d\.,]*/);
      if (mPrecio) precioTxt = mPrecio[0].trim();
    }
    var msg = 'Hola, estoy interesado en ' + (titulo || 'este inmueble') +
      (precioTxt ? ' en ' + precioTxt : '') +
      '\n\n' + window.location.href;

    if (data.whatsapp) {
      var wa = document.createElement('a');
      wa.className = 'inm-agent-btn inm-agent-btn-wa';
      wa.href = 'https://wa.me/' + data.whatsapp + '?text=' + encodeURIComponent(msg);
      wa.target = '_blank';
      wa.rel = 'noopener';
      wa.textContent = 'WhatsApp';
      acciones.appendChild(wa);
    }

    if (data.email) {
      var mail = document.createElement('a');
      mail.className = 'inm-agent-btn inm-agent-btn-mail';
      mail.href = 'mailto:' + data.email +
        '?subject=' + encodeURIComponent('Interés en ' + (titulo || 'inmueble')) +
        '&body=' + encodeURIComponent(msg);
      mail.textContent = 'Correo';
      acciones.appendChild(mail);
    }

    card.appendChild(acciones);

    DOM.sidebar.insertBefore(card, DOM.sidebar.firstChild);
  }

  /* ---------- Bootstrap ---------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ---------- Service Worker (images cache) ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function (err) {
        console.warn('STATETTY: Service Worker registration failed', err);
      });
    });
  }

  /**
   * getInmSim
   * Llama al endpoint route_getInmSim para obtener inmuebles similares al inmueble actual.
   *
   * @param {String} id - _id del inmueble objetivo (el mismo que se usa en fetchInmueble).
   * @param {Object} [opciones] - Parámetros opcionales de búsqueda (si no se envían, el servidor usa sus defaults: max=10, pDesde=20, pHasta=20, KmRadio=5).
   * @param {Number} [opciones.max]     - Cantidad máxima de resultados a traer.
   * @param {Number} [opciones.pDesde]  - % por debajo del precio objetivo.
   * @param {Number} [opciones.pHasta]  - % por arriba del precio objetivo.
   * @param {Number} [opciones.KmRadio] - Radio de búsqueda en Km.
   * @param {Function} onSuccess - callback(lista) invocado con el array de inmuebles similares
   *                                (cada uno con: _id, nombre, precio, tipoNegocio, fotos [String url o ""], distanciaKm).
   * @param {Function} [onError] - callback(mensaje) invocado si falla la petición o el servidor devuelve error.
   */
  function getInmSim(id, opciones, onSuccess, onError) {
    try {
      var base = window.STATETTY_CONFIG ? STATETTY_CONFIG.WS_API_BASE : '';
      if (!base) {
        if (onError) onError('No se pudo determinar el endpoint del servidor.');
        return;
      }

      var params = new URLSearchParams();
      params.set('_id', id);
      if (opciones && opciones.max     !== undefined) params.set('max', opciones.max);
      if (opciones && opciones.pDesde  !== undefined) params.set('pDesde', opciones.pDesde);
      if (opciones && opciones.pHasta  !== undefined) params.set('pHasta', opciones.pHasta);
      if (opciones && opciones.KmRadio !== undefined) params.set('KmRadio', opciones.KmRadio);

      var url = base + 'statetty/getInmSim?' + params.toString();
      console.log('STATETTY: fetching', url);

      var opts = {};
      var controller, timeout;
      if (typeof AbortController !== 'undefined') {
        controller = new AbortController();
        timeout = setTimeout(function () { controller.abort(); }, 20000);
        opts.signal = controller.signal;
      }

      fetch(url, opts)
        .then(function (r) {
          if (opts.signal) clearTimeout(timeout);
          return r.json().then(function (body) { return { status: r.status, ok: r.ok, body: body }; });
        })
        .then(function (res) {
          if (!res.ok) throw new Error(res.body && res.body.error ? res.body.error : 'HTTP ' + res.status);
          if (res.body.error) throw new Error(res.body.error);
          if (!Array.isArray(res.body.data)) throw new Error('Respuesta inválida del servidor');
          onSuccess(res.body.data);
        })
        .catch(function (err) {
          if (opts.signal) clearTimeout(timeout);
          console.warn('STATETTY: getInmSim fetch error', err);
          if (onError) {
            if (err.name === 'AbortError') {
              onError('El servidor no respondió a tiempo.');
            } else {
              onError(err.message || 'No se pudo cargar los inmuebles similares.');
            }
          }
        });
    } catch (err) {
      console.warn('STATETTY: getInmSim sync error', err);
      if (onError) onError(err.message);
    }
  }


})();
