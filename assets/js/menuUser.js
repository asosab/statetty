/**
 * menuUser.js — Statetty
 * -----------------------------------------------------------------------
 * Script GLOBAL (se incluye igual en todas las páginas, después de user.js).
 *
 * Qué hace:
 *   1. Escucha el evento "statetty:key-ready" que dispara user.js cuando
 *      termina de verificar la sesión (detail = { key, usuario, error }).
 *   2. Si hay un usuario logueado (detail.usuario existe), decide en qué
 *      "modo" mostrar sus accesos directos:
 *
 *      - MODO CTA (por defecto en la mayoría de páginas): reemplaza el/los
 *        elemento(s) ".btn-nav-cta" VISIBLES del header por una imagen
 *        circular (usuario.userIcon) que al hacer click despliega un menú
 *        propio (dropdown flotante con estilos inyectados por este script).
 *
 *      - MODO TOOLBOX (página del mapa): en vez de crear un ícono/dropdown
 *        nuevo, agrega una sección más al panel del engranaje (#toolbox,
 *        el mismo que abre #toolbox-btn), reutilizando exactamente las
 *        clases .section / .section-header / .section-body que ya usa
 *        mapa.js para sus otras secciones (Agencias, Seleccionados, etc).
 *        Así la sección de usuario hereda el mismo look & feel y el mismo
 *        comportamiento de acordeón (mapa.js ya delega el click de
 *        ".section-header" a nivel de `document`, así que no hay que
 *        reimplementar nada de eso acá). El botón engranaje NO se
 *        reemplaza por el ícono del usuario: se mantiene tal cual.
 *
 *   3. Si no hay usuario (no logueado / error), no toca nada.
 *
 * Personalización por página:
 *   - Modo forzado: window.STT_MENU_USER_MODE = 'cta' | 'toolbox' | 'auto'
 *     (por defecto 'auto': si no encuentra ".btn-nav-cta" visible en el
 *     header pero sí encuentra "#toolbox", usa modo toolbox).
 *   - Selector del/los botón(es) CTA a reemplazar en modo cta:
 *     window.STT_MENU_USER_SELECTOR (por defecto ".btn-nav-cta").
 *   - Ítems del menú (ambos modos): se definen abajo en MENU_ITEMS. Si una
 *     página necesita otros ítems puede sobreescribirlos ANTES de cargar
 *     este script con
 *     window.STT_MENU_USER_ITEMS = [ { label: '...', href: '...' }, ... ].
 *     En modo toolbox, si alguno de esos ítems apunta a la página actual
 *     (mismo pathname), se omite automáticamente (ej: el link "Mapa" no
 *     tiene sentido mostrarlo estando ya en el mapa).
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

  // Selector de el/los botón(es) del header a reemplazar por el ícono (modo cta).
  var CTA_SELECTOR = window.STT_MENU_USER_SELECTOR || '.btn-nav-cta';

  // Modo de integración: 'cta' | 'toolbox' | 'auto'
  var MODE = window.STT_MENU_USER_MODE || 'auto';

  // IDs del panel del engranaje (mapa.js)
  var TOOLBOX_BOX_ID = 'toolbox';
  var TOOLBOX_BTN_ID = 'toolbox-btn';
  var TOOLBOX_SECTION_ID = 'stt-user-toolbox-section';

  // Avatar por defecto si el usuario no trae userIcon (o si la imagen falla al cargar).
  var DEFAULT_ICON = 'https://statetty.com/assets/images/genUsrIco.png';

  var STYLE_ID = 'stt-menu-user-styles';
  var TOOLBOX_STYLE_ID = 'stt-menu-user-toolbox-styles';
  var READY_FLAG = 'sttMenuUserReady';

  // ------------------------------------------------------------------
  // Estilos modo CTA (con fallback por si la página no define --blue, etc.)
  // ------------------------------------------------------------------

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      '.stt-user-menu{position:relative;display:inline-flex;align-items:center;gap:8px;}' +
      '.stt-user-greeting{font-family:var(--font-body,\'Lato\',sans-serif);font-size:.92rem;' +
      'color:#2b3a42;white-space:nowrap;}' +
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

  // Estilos modo TOOLBOX: mínimos y "sin opinión" (heredan color/tipografía
  // de la página) para no romper el estilo ya definido por #toolbox.
  function injectToolboxStyles() {
    if (document.getElementById(TOOLBOX_STYLE_ID)) return;
    var css =
      '#' + TOOLBOX_SECTION_ID + ' .section-body a{display:block;padding:8px 6px;' +
      'color:inherit;text-decoration:none;border-radius:6px;}' +
      '#' + TOOLBOX_SECTION_ID + ' .section-body a:hover,' +
      '#' + TOOLBOX_SECTION_ID + ' .section-body a:focus-visible{background:rgba(0,0,0,.06);}';
    var style = document.createElement('style');
    style.id = TOOLBOX_STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ------------------------------------------------------------------
  // Utilidades comunes
  // ------------------------------------------------------------------

  function getFirstName(usuario) {
    var nombre = usuario && (usuario.first_name || usuario.nombre || usuario.name);
    if (!nombre) return '';
    return String(nombre).trim().split(/\s+/)[0];
  }

  // Ítems del menú, filtrando (en modo toolbox) los que apunten a la página actual.
  function getMenuItems(filterCurrentPage) {
    if (!filterCurrentPage) return MENU_ITEMS;
    return MENU_ITEMS.filter(function (item) {
      try {
        var url = new URL(item.href, window.location.href);
        return url.pathname.replace(/\/+$/, '') !== window.location.pathname.replace(/\/+$/, '');
      } catch (e) {
        return true;
      }
    });
  }

  // ------------------------------------------------------------------
  // MODO CTA: ícono circular + dropdown flotante
  // ------------------------------------------------------------------

  function buildUserMenu(usuario) {
    var wrap = document.createElement('div');
    wrap.className = 'stt-user-menu';

    var firstName = getFirstName(usuario);
    if (firstName) {
      var greeting = document.createElement('span');
      greeting.className = 'stt-user-greeting';
      greeting.textContent = '¡Hola ' + firstName + '!';
      wrap.appendChild(greeting);
    }

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'stt-user-trigger';
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', 'Menú de usuario');

    var img = document.createElement('img');
    img.className = 'stt-user-avatar';
    img.src = (usuario && usuario.usrIconURL) || DEFAULT_ICON;
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

    getMenuItems(false).forEach(function (item) {
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

  function replaceCtas(usuario) {
    var candidatos = document.querySelectorAll(CTA_SELECTOR);
    var reemplazados = 0;

    candidatos.forEach(function (cta) {
      var menu = buildUserMenu(usuario);
      cta.replaceWith(menu);
      reemplazados++;
    });

    return reemplazados;
  }

  // ------------------------------------------------------------------
  // MODO TOOLBOX: sección extra dentro del panel del engranaje
  // ------------------------------------------------------------------

  function buildToolboxSection(usuario) {
    var section = document.createElement('div');
    section.className = 'section';
    section.id = TOOLBOX_SECTION_ID;

    var header = document.createElement('div');
    header.className = 'section-header';
    var firstName = getFirstName(usuario);
    header.textContent = '👤 ' + (firstName ? '¡Hola ' + firstName + '!' : 'Mi cuenta');

    var body = document.createElement('div');
    body.className = 'section-body';

    getMenuItems(true).forEach(function (item) {
      var row = document.createElement('div');
      var a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      row.appendChild(a);
      body.appendChild(row);
    });

    section.appendChild(header);
    section.appendChild(body);
    return section;
  }

  function addToolboxSection(usuario) {
    if (document.getElementById(TOOLBOX_SECTION_ID)) return 1; // ya agregada

    var toolbox = document.getElementById(TOOLBOX_BOX_ID);
    if (!toolbox) return 0;

    injectToolboxStyles();
    // Se agrega al FINAL del panel a propósito: mapa.js referencia otras
    // secciones por posición (ej. ":nth-child(2)") y no queremos correr
    // esos índices agregando algo antes.
    toolbox.appendChild(buildToolboxSection(usuario));
    return 1;
  }

  // ------------------------------------------------------------------
  // Inicialización
  // ------------------------------------------------------------------

  function resolveMode() {
    if (MODE === 'cta' || MODE === 'toolbox') return MODE;
    // auto: si hay un botón CTA visible en el header, se usa ese modo;
    // si no, pero existe el panel del engranaje, se usa modo toolbox.
    var hasCta = document.querySelectorAll(CTA_SELECTOR).length > 0;
    if (hasCta) return 'cta';
    if (document.getElementById(TOOLBOX_BOX_ID)) return 'toolbox';
    return 'cta'; // default: sin CTA ni toolbox, no hay nada que hacer igual
  }

  function handleKeyReady(e) {
    var detail = e.detail || {};
    // Solo se considera "logueado" si user.js trajo un usuario con _id real.
    // Un objeto usuario vacío/incompleto (o un error) no debe disparar el reemplazo.
    if (!detail.usuario || !detail.usuario._id) return; // no logueado o error: se deja todo como está

    if (document.body.dataset[READY_FLAG]) return; // evita duplicados si el evento se dispara más de una vez

    var mode = resolveMode();
    var n = 0;

    if (mode === 'toolbox') {
      n = addToolboxSection(detail.usuario);
    } else {
      injectStyles();
      n = replaceCtas(detail.usuario);
    }

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
