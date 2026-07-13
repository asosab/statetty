/**
 * menuUser.js — Statetty
 * -----------------------------------------------------------------------
 * Script GLOBAL (se incluye igual en todas las páginas, después de user.js).
 *
 * Qué hace:
 *   1. Escucha el evento "statetty:key-ready" que dispara user.js cuando
 *      termina de verificar la sesión (detail = { key, usuario, error }).
 *   2. Si hay un usuario logueado (detail.usuario existe), reemplaza el/los
 *      elemento(s) ".btn-nav-cta" VISIBLES del header por una imagen
 *      circular (usuario.userIcon) que al hacer click despliega un menú.
 *   3. Si no hay usuario (no logueado / error), no toca nada: el botón
 *      original ("Subí tu propiedad", etc.) queda como está.
 *
 * Personalización por página:
 *   - Selector del/los botón(es) a reemplazar: window.STT_MENU_USER_SELECTOR
 *     (por defecto ".btn-nav-cta").
 *   - Ítems del menú: se definen abajo en MENU_ITEMS. Si una página necesita
 *     otros ítems puede sobreescribirlos ANTES de cargar este script con
 *     window.STT_MENU_USER_ITEMS = [ { label: '...', href: '...' }, ... ].
 */
(function () {
  'use strict';

  // ------------------------------------------------------------------
  // Configuración editable
  // ------------------------------------------------------------------

  // Ítems del menú desplegable. Agregar/quitar/reordenar acá.
  var MENU_ITEMS = (window.STT_MENU_USER_ITEMS && window.STT_MENU_USER_ITEMS.length)
    ? window.STT_MENU_USER_ITEMS
    : [
        { label: 'Mis inmuebles', href: 'https://statetty.com/inmueble/registro' },
        { label: 'Mis datos', href: 'https://statetty.com/registro' },
        { label: 'Mapa', href: 'https://statetty.com/maps/find/' }
      ];

  // Selector de el/los botón(es) del header a reemplazar por el ícono.
  var CTA_SELECTOR = window.STT_MENU_USER_SELECTOR || '.btn-nav-cta';

  // Avatar por defecto si el usuario no trae userIcon (o si la imagen falla al cargar).
  var DEFAULT_ICON = 'https://statetty.com/assets/images/genUsrIco.png';

  var STYLE_ID = 'stt-menu-user-styles';
  var READY_FLAG = 'sttMenuUserReady';

  // ------------------------------------------------------------------
  // Estilos (con fallback por si la página no define las variables --blue, etc.)
  // ------------------------------------------------------------------

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      '.stt-user-menu{position:relative;display:inline-flex;align-items:center;}' +
      '.stt-user-trigger{background:none;border:0;padding:0;cursor:pointer;' +
      'display:inline-flex;line-height:0;border-radius:50%;' +
      'transition:box-shadow .2s ease, transform .2s ease;}' +
      '.stt-user-trigger:hover{transform:translateY(-1px);}' +
      '.stt-user-trigger:focus-visible{outline:2px solid var(--blue,#17baef);outline-offset:2px;}' +
      '.stt-user-avatar{width:38px;height:38px;border-radius:50%;object-fit:cover;' +
      'border:2px solid var(--blue,#17baef);display:block;background:#e2edf3;}' +
      '.stt-user-dropdown{position:absolute;top:calc(100% + 10px);right:0;min-width:190px;' +
      'background:#fff;border-radius:var(--radius-md,12px);' +
      'box-shadow:0 10px 30px rgba(7,79,102,.18);padding:8px;z-index:1000;' +
      'opacity:0;visibility:hidden;transform:translateY(-6px);' +
      'transition:opacity .18s ease, transform .18s ease, visibility .18s;' +
      'font-family:var(--font-body,\'Lato\',sans-serif);}' +
      '.stt-user-menu.open .stt-user-dropdown{opacity:1;visibility:visible;transform:translateY(0);}' +
      '.stt-user-dropdown a{display:block;padding:10px 12px;border-radius:var(--radius-sm,6px);' +
      'font-size:.92rem;color:#2b3a42;text-decoration:none;white-space:nowrap;' +
      'transition:background .15s ease, color .15s ease;}' +
      '.stt-user-dropdown a:hover,.stt-user-dropdown a:focus-visible{' +
      'background:rgba(23,186,239,.1);color:var(--blue-dark,#074f66);}' +
      '@media (max-width:768px){.stt-user-dropdown{right:auto;left:0;}}';
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ------------------------------------------------------------------
  // Construcción del ícono + menú desplegable
  // ------------------------------------------------------------------

  function buildUserMenu(usuario) {
    var wrap = document.createElement('div');
    wrap.className = 'stt-user-menu';

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'stt-user-trigger';
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', 'Menú de usuario');

    var img = document.createElement('img');
    img.className = 'stt-user-avatar';
    img.src = (usuario && usuario.userIcon) || DEFAULT_ICON;
    img.alt = usuario && usuario.nombre ? usuario.nombre : 'Usuario';
    img.referrerPolicy = 'no-referrer';
    img.onerror = function () {
      this.onerror = null;
      this.src = DEFAULT_ICON;
    };
    trigger.appendChild(img);

    var dropdown = document.createElement('div');
    dropdown.className = 'stt-user-dropdown';
    dropdown.setAttribute('role', 'menu');

    MENU_ITEMS.forEach(function (item) {
      var a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      a.setAttribute('role', 'menuitem');
      dropdown.appendChild(a);
    });

    wrap.appendChild(trigger);
    wrap.appendChild(dropdown);

    function open() {
      wrap.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    }
    function close() {
      wrap.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }
    function toggle(e) {
      e.stopPropagation();
      wrap.classList.contains('open') ? close() : open();
    }

    trigger.addEventListener('click', toggle);
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    return wrap;
  }

  // ------------------------------------------------------------------
  // Reemplazo del/los botón(es) CTA por el ícono de usuario
  // ------------------------------------------------------------------

  function isVisible(el) {
    if (!(el instanceof Element)) return false;
    var style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
  }

  function replaceCtas(usuario) {
    var candidatos = document.querySelectorAll(CTA_SELECTOR);
    var reemplazados = 0;

    candidatos.forEach(function (cta) {
      //if (!isVisible(cta)) return; // no tocar botones/spans ocultos
      var menu = buildUserMenu(usuario);
      cta.replaceWith(menu);
      reemplazados++;
    });

    return reemplazados;
  }

  // ------------------------------------------------------------------
  // Inicialización
  // ------------------------------------------------------------------

  function handleKeyReady(e) {
    var detail = e.detail || {};
    // Solo se considera "logueado" si user.js trajo un usuario con _id real.
    // Un objeto usuario vacío/incompleto (o un error) no debe disparar el reemplazo.
    if (!detail.usuario || !detail.usuario._id) return; // no logueado o error: se deja el CTA original

    if (document.body.dataset[READY_FLAG]) return; // evita duplicados si el evento se dispara más de una vez
    injectStyles();
    var n = replaceCtas(detail.usuario);
    if (n > 0) document.body.dataset[READY_FLAG] = '1';
  }

  function init() {
    document.addEventListener('statetty:key-ready', handleKeyReady);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
