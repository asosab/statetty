(function () {
  'use strict';

  var TOOLBOX = document.getElementById('toolbox');
  if (!TOOLBOX) return;

  var $TOOLBOX = $(TOOLBOX);
  var headerCache = {};
  var _updating = false;

  /* ---------- helpers ---------- */

  function hdrId(el) {
    if (!el.dataset.sttId)
      el.dataset.sttId = 'h' + (Date.now() + Math.random()).toString(36);
    return el.dataset.sttId;
  }

  function cache(header) {
    var id = hdrId(header);
    if (!headerCache[id]) headerCache[id] = {};
    return headerCache[id];
  }

  function iconOf(header) {
    var c = cache(header);
    if (c.icon !== undefined) return c.icon;
    var text = header.textContent || '';
    c.icon = text.trim().split(/\s+/)[0] || '';
    return c.icon;
  }

  /* ---------- collapse / expand ---------- */

  function collapseHeader(header) {
    if (header.dataset.sttState === 'collapsed') return;

    var icon = iconOf(header);
    var iconSpan = document.createElement('span');
    iconSpan.className = 'stt-icon-only';
    iconSpan.textContent = icon;

    var fullWrap = document.createElement('span');
    fullWrap.className = 'stt-icon-full-text';
    fullWrap.style.display = 'none';

    while (header.firstChild) fullWrap.appendChild(header.firstChild);

    header.appendChild(iconSpan);
    header.appendChild(fullWrap);
    header.dataset.sttState = 'collapsed';
  }

  function expandHeader(header) {
    if (header.dataset.sttState !== 'collapsed') return;

    var fullWrap = header.querySelector('.stt-icon-full-text');
    if (fullWrap) {
      while (fullWrap.firstChild) header.appendChild(fullWrap.firstChild);
      header.removeChild(fullWrap);
    }

    var iconSpan = header.querySelector('.stt-icon-only');
    if (iconSpan) header.removeChild(iconSpan);

    header.dataset.sttState = 'expanded';
  }

  /* ---------- layout switch ---------- */

  function resetHeaders() {
    $(TOOLBOX).find('.section-header').each(function () {
      expandHeader(this);
      this.style.order = '';
      this.style.flex = '';
    });
    $(TOOLBOX).find('.section-body').each(function () {
      this.style.order = '';
      this.style.flex = '';
    });
  }

  function applyFlex() {
    var sections = $(TOOLBOX).children('.section');
    var active = sections.filter('.active');
    if (active.length !== 1) return false;

    var inactives = sections.not('.active');

    inactives.each(function (idx) {
      var h = this.querySelector('.section-header');
      if (!h) return;
      collapseHeader(h);
      h.style.order = idx;
    });

    var ah = active[0].querySelector('.section-header');
    if (ah) {
      expandHeader(ah);
      ah.style.order = '500';
      ah.style.flex = '0 0 100%';
    }

    sections.each(function () {
      var b = this.querySelector('.section-body');
      if (b) b.style.order = '1000';
    });

    return true;
  }

  function cleanOlddisplay() {
    try {
      var k = TOOLBOX[jQuery.expando];
      if (k && $.cache && $.cache[k] && 'olddisplay' in $.cache[k])
        delete $.cache[k].olddisplay;
    } catch (e) { /* ignore */ }
  }

  function actualizarEstiloHeaders() {
    if (_updating) return;
    _updating = true;
    try {
      if (!$('#toolbox').is(':visible')) {
        $TOOLBOX.removeClass('stt-icons-mode');
        resetHeaders();
        return;
      }

      var ok = applyFlex();
      if (ok) {
        $TOOLBOX.addClass('stt-icons-mode');
        $TOOLBOX.css('display', 'flex');
      } else {
        $TOOLBOX.removeClass('stt-icons-mode');
        resetHeaders();
        $TOOLBOX.css('display', 'block');
        cleanOlddisplay();
      }
    } finally {
      _updating = false;
    }
  }

  /* ---------- init ---------- */

  // Prime cache for existing headers
  $(TOOLBOX).find('.section-header').each(function () { iconOf(this); });

  // Click: runs after mapa.js because menuIcons.js loads later
  $(document).on('click', '.section-header', actualizarEstiloHeaders);

  // Observe new sections & class changes on .section
  var obs = new MutationObserver(function (mutations) {
    var relevant = false;
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.type === 'childList') { relevant = true; break; }
      if (m.type === 'attributes' && m.attributeName === 'class') {
        if (m.target === TOOLBOX || m.target.classList.contains('section')) {
          relevant = true; break;
        }
      }
      if (m.type === 'attributes' && m.attributeName === 'style' && m.target === TOOLBOX) {
        relevant = true; break;
      }
    }
    if (!relevant) return;

    // Cache any new header that just appeared
    $(TOOLBOX).find('.section-header').each(function () { iconOf(this); });
    actualizarEstiloHeaders();
  });

  obs.observe(TOOLBOX, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });

  // Initial application
  actualizarEstiloHeaders();
})();
