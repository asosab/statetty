(function () {
  'use strict';

  var STATE = {
    fotos: [],
    currentIndex: 0
  };

  var DOM = {};

  function init() {
    cacheDOM();
    var id = getParam();
    if (!id) {
      showError('Parámetro faltante', 'No se recibió el identificador del inmueble.');
      return;
    }
    fetchInmueble(id);
  }

  function cacheDOM() {
    DOM.loading    = document.getElementById('inm-loading');
    DOM.error      = document.getElementById('inm-error');
    DOM.content    = document.getElementById('inm-content');
    DOM.contactBar = document.getElementById('inm-contact-bar');
    DOM.gallery    = document.getElementById('inm-gallery');
    DOM.mainImg    = document.getElementById('inm-main-img');
    DOM.galCount   = document.getElementById('inm-gal-count');
    DOM.thumbs     = document.getElementById('inm-thumbs');
    DOM.title      = document.getElementById('inm-title');
    DOM.price      = document.getElementById('inm-price');
    DOM.address    = document.getElementById('inm-address');
    DOM.features   = document.getElementById('inm-features');
    DOM.desc       = document.getElementById('inm-desc');
    DOM.lb         = document.getElementById('inm-lightbox');
    DOM.lbImg      = document.getElementById('inm-lb-img');
    DOM.lbCount    = document.getElementById('inm-lb-count');
  }

  function getParam() {
    var p = new URLSearchParams(window.location.search).get('_id');
    if (!p) {
      p = new URLSearchParams(window.location.search).get('p');
    }
    return p || null;
  }

  function fetchInmueble(id) {
    var base = window.STATETTY_CONFIG ? STATETTY_CONFIG.WS_API_BASE : '';
    if (!base) {
      showError('Error de configuración', 'No se pudo determinar el endpoint del servidor.');
      return;
    }
    var url = base + '/inmueble?_id=' + encodeURIComponent(id);
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 20000);
    fetch(url, { signal: controller.signal, headers: { 'ngrok-skip-browser-warning': '1' } })
      .then(function (r) {
        clearTimeout(timeout);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (res) {
        if (res.error) throw new Error(res.error);
        if (!res.data || typeof res.data !== 'object') throw new Error('Respuesta inválida del servidor');
        render(res.data);
      })
      .catch(function (err) {
        clearTimeout(timeout);
        console.warn('fetchInmueble error', err);
        if (err.name === 'AbortError') {
          showError('Tiempo de espera agotado', 'El servidor no respondió a tiempo. Verificá tu conexión e intentá de nuevo.');
        } else {
          showError('Error del servidor', err.message || 'No se pudo cargar la información del inmueble.');
        }
      });
  }

  function render(inm) {
    DOM.loading.classList.add('inm-hidden');
    DOM.content.classList.remove('inm-hidden');
    DOM.contactBar.classList.remove('inm-hidden');

    renderGallery(inm);
    renderHeader(inm);
    renderFeatures(inm);
    renderDescription(inm);

    document.title = (inm.nombre || 'Inmueble') + ' — Statetty';

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

    setMainImage(0);
    DOM.galCount.textContent = '1 / ' + fotos.length;

    DOM.thumbs.innerHTML = '';
    fotos.forEach(function (url, i) {
      var thumb = document.createElement('div');
      thumb.className = 'inm-gallery-thumb' + (i === 0 ? ' active' : '');
      var img = document.createElement('img');
      img.src = url;
      img.alt = 'Foto ' + (i + 1);
      img.loading = 'lazy';
      thumb.appendChild(img);
      thumb.addEventListener('click', function () { selectImage(i); });
      DOM.thumbs.appendChild(thumb);
    });

    DOM.mainImg.addEventListener('click', function () { openLightbox(0); });
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

  DOM.lb.addEventListener('click', function (e) {
    if (e.target === DOM.lb || e.target === DOM.lbImg) closeLightbox();
  });
  document.getElementById('inm-lb-close').addEventListener('click', closeLightbox);
  document.getElementById('inm-lb-prev').addEventListener('click', prevImage);
  document.getElementById('inm-lb-next').addEventListener('click', nextImage);
  document.addEventListener('keydown', function (e) {
    if (!DOM.lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'ArrowRight') nextImage();
  });

  /* ---------- Header Info ---------- */
  function renderHeader(inm) {
    DOM.title.textContent = inm.nombre || 'Inmueble';
    var moneda = inm.moneda || 'USD';
    var precio = parseInt(inm.precio) || 0;
    DOM.price.innerHTML = precio
      ? moneda + ' ' + precio.toLocaleString('es-BO') + ' <small>' + (inm.tipoNegocio || '') + '</small>'
      : (inm.tipoNegocio || '');
    var dir = inm.direccion || '';
    if (inm.zona) dir += (dir ? ', ' : '') + inm.zona;
    if (inm.ciudad) dir += (dir ? ', ' : '') + inm.ciudad;
    DOM.address.textContent = dir || 'Sin dirección';
  }

  /* ---------- Features ---------- */
  function renderFeatures(inm) {
    var items = [
      { label: 'Dormitorios',  value: inm.dormitorios, icon: '🛏' },
      { label: 'Baños',        value: inm.banos,       icon: '🛁' },
      { label: 'M² construc.', value: inm.m2c,         icon: '📐' },
      { label: 'M² terreno',   value: inm.m2t,         icon: '🌳' },
      { label: 'Tipo',         value: inm.tipoInmueble, icon: '🏠' }
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

  /* ---------- Error ---------- */
  function showError(title, msg) {
    DOM.loading.classList.add('inm-hidden');
    DOM.error.classList.remove('inm-hidden');
    document.getElementById('inm-error-title').textContent = title || 'Error';
    document.getElementById('inm-error-msg').textContent  = msg  || 'Ocurrió un error inesperado.';
  }

  /* ---------- Bootstrap ---------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
