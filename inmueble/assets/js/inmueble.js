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
    if (id) {
      renderSimilares(id);
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
        el.addEventListener('click', function () {
          var k = getVerifiedKey();
          window.location.href = k ? (baseUrl + '&k=' + encodeURIComponent(k)) : baseUrl;
        });
        DOM.simList.appendChild(el);
      });
    }, function () {});
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
