/**
 * buddy_backgrounds.js
 * ---------------------------------------------------------------------------
 * Módulo de backgrounds para Buddy: capas de imagen (exteriores, interiores,
 * clima) y sonido en bucle que se muestran detrás del personaje.
 *
 * Los layers se definen en BD (BuddyModule 'backgrounds') con un default para
 * el sitio y overrides opcionales por página (pageOverrides). Solo se muestran
 * si el personaje es visible.
 * ---------------------------------------------------------------------------
 */
window.BuddyBackgrounds = window.BuddyBackgrounds || {};

(function () {
  'use strict';

  var BG_ZINDEX = 9998;

  // --- Referencias DOM ---
  var containerEl = null;
  var layerEls = [];
  var audioEls = {};
  var activeLayers = [];
  var visible = false;

  // --- Helpers ---

  function moduleConfig() {
    return window.BuddyBackgroundsConfig || {};
  }

  function moduleBase() {
    var el = document.querySelector('script[data-buddy-module-id="backgrounds"]');
    if (el && el.src) return new URL('./', el.src).href;
    var base = (window.Buddy && window.Buddy.assetBase) || '';
    return base + 'modules/backgrounds/';
  }

  function screenLongSide() {
    return Math.max(window.innerWidth, window.innerHeight);
  }

  function currentPageUrl() {
    return (window.location.href || '').replace(/\/+$/, '');
  }

  function parseOverrides(raw) {
    if (!raw) return null;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch (_) { return null; }
    }
    return raw && typeof raw === 'object' ? raw : null;
  }

  // --- Resolución de layers ---

  function resolveLayers() {
    var cfg = moduleConfig();
    if (!cfg || typeof cfg !== 'object') return [];

    var overrides = parseOverrides(cfg.pageOverrides);
    if (overrides) {
      var currentUrl = currentPageUrl();

      // Forma array: [{ url, layers }] (schema visual del toolbox).
      if (Array.isArray(overrides)) {
        for (var i = 0; i < overrides.length; i++) {
          var entry = overrides[i];
          var entryUrl = String((entry && entry.url) || '').replace(/\/+$/, '');
          if (entryUrl && (currentUrl === entryUrl || currentUrl.indexOf(entryUrl + '/') === 0)) {
            return (entry && entry.layers) || [];
          }
        }
        return cfg.defaultLayers || [];
      }

      // Forma objeto: { url: [layers] } (compat por JSON libre).
      var keys = Object.keys(overrides);
      for (var j = 0; j < keys.length; j++) {
        var key = String(keys[j]).replace(/\/+$/, '');
        if (currentUrl === key || currentUrl.indexOf(key + '/') === 0) {
          return overrides[keys[j]] || [];
        }
      }
    }

    return cfg.defaultLayers || [];
  }

  // --- Renderizado ---

  function ensureContainer() {
    if (containerEl) return containerEl;

    containerEl = document.createElement('div');
    containerEl.id = 'buddy-backgrounds';
    Object.assign(containerEl.style, {
      position: 'fixed',
      bottom: '0',
      right: '0',
      width: '0',
      height: '0',
      zIndex: String(BG_ZINDEX),
      pointerEvents: 'none',
      display: 'none'
    });
    document.body.appendChild(containerEl);
    return containerEl;
  }

  function createLayerElement(layer) {
    var img = document.createElement('img');
    img.draggable = false;
    img.setAttribute('data-bg-layer', String(layer.id || ''));
    img.alt = '';

    var src = moduleBase() + 'images/' + layer.image;
    img.src = window.Buddy.withVersion ? window.Buddy.withVersion(src) : src;

    Object.assign(img.style, {
      position: 'fixed',
      pointerEvents: 'none',
      userSelect: 'none',
      webkitUserSelect: 'none',
      opacity: String(layer.opacity != null ? layer.opacity : 1)
    });

    img.addEventListener('load', function () {
      if (visible) positionLayer(img, layer);
    });

    containerEl.appendChild(img);
    return img;
  }

  function positionLayer(img, layer) {
    var charEl = document.getElementById('buddy-character');
    if (!charEl || img.style.display === 'none') return;

    var ch = charEl.offsetHeight;
    var cw = charEl.offsetWidth;
    if (!ch || !cw) return;

    var layerScale = layer.scale != null ? layer.scale : 1;
    var baseScale =
      window.Buddy && window.Buddy.characterLayout &&
      window.Buddy.characterLayout.scalePercent != null
        ? window.Buddy.characterLayout.scalePercent
        : 45;
    var layerTarget = (baseScale / 100) * screenLongSide() * layerScale;

    var chBottom = Number(charEl.style.bottom) || 0;
    var chRight = Number(charEl.style.right) || 0;

    var layerBottom = chBottom + (((layer.offsetY || 0) / 100) * ch);
    var layerRight = chRight + (((layer.offsetX || 0) / 100) * cw);

    if (img.naturalWidth && img.naturalHeight) {
      var nw = img.naturalWidth;
      var nh = img.naturalHeight;
      var renderedW, renderedH;
      if (nw >= nh) {
        renderedW = layerTarget;
        renderedH = (nh / nw) * layerTarget;
      } else {
        renderedH = layerTarget;
        renderedW = (nw / nh) * layerTarget;
      }

      var anchorX = (layer.anchorX != null ? layer.anchorX : 0) / 100;
      var anchorY = (layer.anchorY != null ? layer.anchorY : 0) / 100;
      layerRight = layerRight - renderedW * anchorX;
      layerBottom = layerBottom - renderedH * anchorY;

      img.style.width = renderedW + 'px';
      img.style.height = renderedH + 'px';
    }

    img.style.bottom = layerBottom + 'px';
    img.style.right = layerRight + 'px';
  }

  // --- Audio ---

  function playSounds() {
    var base = moduleBase() + 'sounds/';
    activeLayers.forEach(function (layer) {
      if (!layer.loop || !layer.sound || audioEls[layer.id]) return;
      var audio = new Audio();
      audio.loop = true;
      audio.volume = layer.soundVolume != null ? layer.soundVolume : 0.5;
      var src = base + layer.sound;
      audio.src = window.Buddy.withVersion ? window.Buddy.withVersion(src) : src;
      audio.play().catch(function () {});
      audioEls[layer.id] = audio;
    });
  }

  function stopSounds() {
    Object.keys(audioEls).forEach(function (id) {
      var a = audioEls[id];
      if (a) { try { a.pause(); a.src = ''; } catch (_) {} }
    });
    audioEls = {};
  }

  // --- API pública ---

  function show() {
    if (visible) return;
    activeLayers = resolveLayers();
    if (!activeLayers.length) return;

    ensureContainer();

    layerEls.forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
    layerEls = [];

    activeLayers.forEach(function (layer) {
      layerEls.push(createLayerElement(layer));
    });

    containerEl.style.display = 'block';
    visible = true;

    layerEls.forEach(function (img, i) {
      positionLayer(img, activeLayers[i]);
    });

    playSounds();
  }

  function hide() {
    if (!visible) return;
    containerEl.style.display = 'none';
    visible = false;
    stopSounds();
  }

  function showIfNotHidden() {
    if (window.Buddy.isCharacterHidden && window.Buddy.isCharacterHidden()) {
      hide();
    } else {
      show();
    }
  }

  function onResize() {
    if (!visible) return;
    layerEls.forEach(function (img, i) {
      positionLayer(img, activeLayers[i]);
    });
  }

  function refresh() {
    hide();
    activeLayers = [];
    showIfNotHidden();
  }

  // --- Suscripción a eventos ---

  window.addEventListener('buddy:ready', function () {
    window.addEventListener('buddy:character-visible', function () { show(); });
    window.addEventListener('buddy:character-hidden', function () { hide(); });
    window.addEventListener('resize', onResize);
    showIfNotHidden();
  });

  // --- Registro del módulo ---

  window.BuddyBackgrounds = {
    show: show,
    hide: hide,
    refresh: refresh,
    resolveLayers: resolveLayers
  };

  window.Buddy.backgrounds = window.BuddyBackgrounds;
})();