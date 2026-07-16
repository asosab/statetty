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
 *      - MODO TOOLBOX (página del mapa): NO agrega un ícono/dropdown nuevo
 *        ni una sección propia con título ("Mi cuenta" / "¡Hola ...!").
 *        En vez de eso, simplemente añade los ítems del menú de usuario
 *        (MENU_ITEMS) como links sueltos al final del panel del engranaje
 *        (#toolbox, el mismo que abre #toolbox-btn), sumándose a lo que
 *        mapa.js ya puso ahí (Agencias, Seleccionados, etc.), sin crear
 *        un acordeón/sección nueva ni un título propio. El botón engranaje
 *        NO se reemplaza por el ícono del usuario: se mantiene tal cual.
 *
 *   3. Si no hay usuario (no logueado / error), no toca nada.
 *
 * Filtrado de ítems por página actual (aplica a AMBOS modos):
 *   Cualquier ítem de MENU_ITEMS cuyo href apunte a la página en la que ya
 *   estamos (mismo pathname) se omite automáticamente. Ej: el link "Mapa"
 *   no se muestra estando ya en el mapa; lo mismo aplica para cualquier
 *   otra dirección de MENU_ITEMS si coincide con la página actual.
 *
 * NOTA TEMPORAL (período de pruebas):
 *   "Buscar Inmuebles" (fndInm.js) es un ítem más del menú de usuario
 *   global: se monta SIEMPRE, en cualquier página, sin importar el modo
 *   ('cta' o 'toolbox'). Este mismo script (menuUser.js) carga fndInm.js
 *   dinámicamente con un <script> insertado en runtime (no hace falta
 *   incluirlo aparte en el HTML). En modo 'cta' se agrega arriba de los
 *   demás links, dentro del propio dropdown de usuario; en modo
 *   'toolbox' (solo la página del mapa) se agrega arriba de los links
 *   sueltos que este script ya pone en #toolbox. Por ahora esto ocurre
 *   solo si el usuario activo es el admin de pruebas
 *   (_id = FNDINM_TEST_ADMIN_ID, ver más abajo). Quitar este gate cuando
 *   termine el período de pruebas.
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

  var LOGOUT_LABEL = 'Cerrar sesión';

  // Selector de el/los botón(es) del header a reemplazar por el ícono (modo cta).
  var CTA_SELECTOR = window.STT_MENU_USER_SELECTOR || '.btn-nav-cta';

  // Modo de integración: 'cta' | 'toolbox' | 'auto'
  var MODE = window.STT_MENU_USER_MODE || 'auto';

  // IDs del panel del engranaje (mapa.js)
  var TOOLBOX_BOX_ID = 'toolbox';
  var TOOLBOX_BTN_ID = 'toolbox-btn';
  // Ya no es una ".section" con título propio: es solo el contenedor de
  // links que se suma al final del panel, sin acordeón ni encabezado.
  var TOOLBOX_LINKS_ID = 'stt-user-toolbox-links';

  // Avatar por defecto si el usuario no trae userIcon (o si la imagen falla al cargar).
  var DEFAULT_ICON = 'https://statetty.com/assets/images/genUsrIco.png';

  // menuUser.js es quien usa fndInm.js, así que es quien lo carga (la página
  // NO necesita incluir un <script> aparte para fndInm.js). Se puede
  // sobreescribir la URL antes de cargar este script con
  // window.STT_FND_INM_URL = 'https://.../fndInm.js'
  var FNDINM_SCRIPT_URL = window.STT_FND_INM_URL || 'https://statetty.com/assets/js/fndInm.js?v12';
  var fndInmLoading = false;
  // Contenedor donde vive "Buscar Inmuebles": lo crea/reserva este script
  // (arriba de sus propios links/dropdown, ver reserveFndInmSlot() y
  // buildUserMenu()) y fndInm.js solo agrega su contenido adentro.
  var FNDINM_SLOT_ID = 'stt-fndinm-slot';

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
      // IMPORTANTE: ancho FIJO (no "max-content"). Combinar un contenedor
      // "max-content" con hijos "width:100%" (como los inputs/selects de
      // fndInm.js) produce layouts inestables: el navegador calcula el
      // ancho del contenedor ignorando los porcentajes de los hijos y
      // recién después los resuelve contra ese ancho, dando columnas
      // desalineadas o angostas. Con un ancho fijo, cualquier contenido
      // interno con width:100% (incluido fndInm.js) se ve igual en
      // cualquier página, no solo en #toolbox (que sí tiene ancho fijo
      // propio via mapa.css).
      '.stt-user-dropdown{position:absolute;top:calc(100% + 10px);right:0;' +
      'width:min(320px,92vw);min-width:190px;max-height:min(75vh,560px);' +
      'overflow-y:auto;overflow-x:hidden;' +
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
      '.stt-user-dropdown-sep{height:1px;background:rgba(0,0,0,.08);margin:4px 0;}' +
      '.stt-user-logout{display:block;width:100%;padding:10px 12px;border:0;border-radius:var(--radius-sm,6px);' +
      'font-size:.92rem;font-family:var(--font-body,\'Lato\',sans-serif);color:#999;text-decoration:none;text-align:left;' +
      'background:none;cursor:pointer;white-space:nowrap;transition:background .15s ease,color .15s ease;}' +
      '.stt-user-logout:hover,.stt-user-logout:focus-visible{background:rgba(0,0,0,.04);color:#666;}' +
      '@media (max-width:768px){.stt-user-dropdown{right:auto;left:0;width:min(320px,92vw);}}';
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  // Estilos modo TOOLBOX: mínimos y "sin opinión" (heredan color/tipografía
  // de la página) para no romper el estilo ya definido por #toolbox. Como
  // ya no es una ".section" con header, se agrega un separador sutil para
  // distinguirlo visualmente de las secciones que ya existen arriba.
  function injectToolboxStyles() {
    if (document.getElementById(TOOLBOX_STYLE_ID)) return;
    var css =
      '#' + TOOLBOX_LINKS_ID + '{border-top:1px solid rgba(0,0,0,.08);' +
      'margin-top:6px;padding-top:6px;}' +
      '#' + TOOLBOX_LINKS_ID + ' a{display:block;padding:8px 6px;' +
      'color:inherit;text-decoration:none;border-radius:6px;}' +
      '#' + TOOLBOX_LINKS_ID + ' a:hover,' +
      '#' + TOOLBOX_LINKS_ID + ' a:focus-visible{background:rgba(0,0,0,.06);}' +
      '#' + TOOLBOX_LINKS_ID + ' .stt-user-toolbox-sep{height:1px;background:rgba(0,0,0,.08);margin:4px 0;}' +
      '#' + TOOLBOX_LINKS_ID + ' .stt-user-logout{width:100%;padding:8px 6px;border:0;' +
      'font-family:inherit;font-size:inherit;color:#999;background:none;cursor:pointer;text-align:left;' +
      'border-radius:6px;}' +
      '#' + TOOLBOX_LINKS_ID + ' .stt-user-logout:hover,' +
      '#' + TOOLBOX_LINKS_ID + ' .stt-user-logout:focus-visible{background:rgba(0,0,0,.06);color:#666;}';
    var style = document.createElement('style');
    style.id = TOOLBOX_STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ------------------------------------------------------------------
  // Cerrar sesión
  // ------------------------------------------------------------------

  function clearSession() {
    document.cookie = 'stt_pk=; Max-Age=0; Path=/; Domain=.statetty.com; Secure';
    localStorage.removeItem('stt_pk');
    window.publicKey = null;
    if (window.STT) window.STT.usuario = null;
    window.location.href = '/';
  }

  function handleLogout(e) {
    e.preventDefault();
    var key = window.STT && window.STT.getKey();
    if (!key) { clearSession(); return; }
    var base = window.STATETTY_CONFIG ? STATETTY_CONFIG.WS_API_BASE : '';
    fetch(base + 'statetty/changePublicKey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey: key })
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (data) {
      if (data && data.ok === true) {
        clearSession();
      } else {
        alert('No se pudo cerrar sesión. Intenta de nuevo.');
      }
    }).catch(function () {
      alert('No se pudo cerrar sesión. Intenta de nuevo.');
    });
  }

  // ------------------------------------------------------------------
  // Utilidades comunes
  // ------------------------------------------------------------------

  function getFirstName(usuario) {
    var nombre = usuario && (usuario.first_name || usuario.nombre || usuario.name);
    if (!nombre) return '';
    return String(nombre).trim().split(/\s+/)[0];
  }

  // Normaliza un pathname para comparar ubicaciones de forma robusta:
  // - quita archivos índice al final (index.html / index.htm / index.php),
  //   ya que "/maps/find/index.html" y "/maps/find/" son la misma ubicación
  // - quita la(s) barra(s) final(es)
  // - ignora mayúsculas/minúsculas
  function normalizePath(pathname) {
    return String(pathname || '')
      .replace(/\/index\.(html?|php)$/i, '/')
      .replace(/\/+$/, '')
      .toLowerCase();
  }

  // Ítems del menú, quitando siempre (en cualquier modo) los que apunten
  // a la página en la que ya estamos (mismo origin + mismo pathname,
  // considerando "index.html" y "/" como la misma ubicación).
  function getMenuItems() {
    return MENU_ITEMS.filter(function (item) {
      try {
        var url = new URL(item.href, window.location.href);
        var samePathname = normalizePath(url.pathname) === normalizePath(window.location.pathname);
        var sameOrigin = url.origin === window.location.origin;
        return !(samePathname && sameOrigin);
      } catch (e) {
        return true;
      }
    });
  }

  // ------------------------------------------------------------------
  // MODO CTA: ícono circular + dropdown flotante
  // ------------------------------------------------------------------

  function buildUserMenu(usuario, includeFndInmSlot) {
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

    // "Buscar Inmuebles" (fndInm.js) va PRIMERO, arriba de los links
    // sueltos, para mejor aprovechamiento del espacio al desplegar. Solo
    // se reserva en la primera instancia del menú (si ".btn-nav-cta"
    // aparece más de una vez en la página, ej. header desktop + mobile,
    // para no duplicar el id del contenedor).
    if (includeFndInmSlot) {
      var fndInmSlot = document.createElement('div');
      fndInmSlot.id = FNDINM_SLOT_ID;
      dropdown.appendChild(fndInmSlot);
    }

    getMenuItems().forEach(function (item) {
      var a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      a.setAttribute('role', 'menuitem');
      dropdown.appendChild(a);
    });

    var sep = document.createElement('div');
    sep.className = 'stt-user-dropdown-sep';
    dropdown.appendChild(sep);

    var logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.className = 'stt-user-logout';
    logoutBtn.textContent = LOGOUT_LABEL;
    logoutBtn.addEventListener('click', handleLogout);
    dropdown.appendChild(logoutBtn);

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
    var dropdowns = [];
    var esLaPrimera = true;

    candidatos.forEach(function (cta) {
      var menu = buildUserMenu(usuario, esLaPrimera);
      esLaPrimera = false;
      cta.replaceWith(menu);
      dropdowns.push(menu.querySelector('.stt-user-dropdown'));
    });

    return dropdowns;
  }

  // ------------------------------------------------------------------
  // MODO TOOLBOX: links sueltos al final del panel del engranaje
  // (SIN sección propia, SIN header/título "Hola ...!" / "Mi cuenta")
  // ------------------------------------------------------------------

  function buildToolboxLinks() {
    var container = document.createElement('div');
    container.id = TOOLBOX_LINKS_ID;

    getMenuItems().forEach(function (item) {
      var a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      container.appendChild(a);
    });

    var sep = document.createElement('div');
    sep.className = 'stt-user-toolbox-sep';
    container.appendChild(sep);

    var logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.className = 'stt-user-logout';
    logoutBtn.textContent = LOGOUT_LABEL;
    logoutBtn.addEventListener('click', handleLogout);
    container.appendChild(logoutBtn);

    return container;
  }

  // Reserva el contenedor de "Buscar Inmuebles" en #toolbox, ANTES de los
  // links sueltos (addToolboxLinks se llama después), para que quede
  // arriba de ellos en el panel. Se reserva de forma síncrona apenas se
  // sabe que hay que montar fndInm.js, sin esperar a que termine de
  // cargar ese script, así el orden en el DOM no depende de si fndInm.js
  // ya estaba cargado o hay que traerlo por primera vez.
  function reserveFndInmSlot() {
    var existing = document.getElementById(FNDINM_SLOT_ID);
    if (existing) return existing;

    var toolbox = document.getElementById(TOOLBOX_BOX_ID);
    if (!toolbox) return null;

    var slot = document.createElement('div');
    slot.id = FNDINM_SLOT_ID;
    // Se agrega al final de lo que mapa.js ya puso (no altera sus
    // índices ":nth-child"), pero ANTES que buildToolboxLinks(), que se
    // llama después y por lo tanto queda debajo.
    toolbox.appendChild(slot);
    return slot;
  }

  function addToolboxLinks() {
    if (document.getElementById(TOOLBOX_LINKS_ID)) return 1; // ya agregados

    var toolbox = document.getElementById(TOOLBOX_BOX_ID);
    if (!toolbox) return 0;

    var items = getMenuItems();
    if (!items.length) return 0; // nada que mostrar (ej: todos filtrados por ser la página actual)

    injectToolboxStyles();
    // Se agrega al FINAL del panel a propósito: mapa.js referencia otras
    // secciones por posición (ej. ":nth-child(2)") y no queremos correr
    // esos índices agregando algo antes. Al no ser una ".section" nueva,
    // tampoco se altera el comportamiento de acordeón de las secciones
    // que mapa.js ya define.
    toolbox.appendChild(buildToolboxLinks());
    return 1;
  }

  // Carga fndInm.js dinámicamente (menuUser.js es quien lo usa, así que es
  // quien lo incluye en la página). Si ya está cargado (window.STT_FND_INM
  // presente) no vuelve a insertar el <script>. cb() se llama una sola vez,
  // ya sea que el script se cargue recién o ya estuviera disponible.
  function loadFndInmScript(cb) {
    if (window.STT_FND_INM && typeof window.STT_FND_INM.mount === 'function') {
      cb();
      return;
    }
    if (fndInmLoading) {
      document.addEventListener('stt:fndinm-loaded', function onLoaded() {
        document.removeEventListener('stt:fndinm-loaded', onLoaded);
        cb();
      });
      return;
    }
    fndInmLoading = true;
    var script = document.createElement('script');
    script.src = FNDINM_SCRIPT_URL;
    script.async = true;
    script.onload = function () {
      fndInmLoading = false;
      document.dispatchEvent(new CustomEvent('stt:fndinm-loaded'));
      cb();
    };
    script.onerror = function () {
      fndInmLoading = false;
      console.error('[menuUser] No se pudo cargar fndInm.js desde', FNDINM_SCRIPT_URL);
    };
    document.head.appendChild(script);
  }

  // "Buscar Inmuebles" (fndInm.js) es un ítem más del menú de usuario:
  // se monta SIEMPRE (no depende del modo 'cta'/'toolbox'), en el
  // contenedor que ya haya sido reservado en handleKeyReady() para esta
  // página (ver reserveFndInmSlot() y buildUserMenu()).
  function mountFndInm(usuario, mode) {
    if (!usuario) return;

    loadFndInmScript(function () {
      if (!window.STT_FND_INM || typeof window.STT_FND_INM.mount !== 'function') return;
      var slot = document.getElementById(FNDINM_SLOT_ID);
      if (!slot) return; // no se pudo reservar contenedor en esta página (raro, pero no debe romper nada)
      var variant = mode === 'toolbox' ? 'toolbox' : 'standalone';
      window.STT_FND_INM.mount(slot, usuario, { variant: variant });
    });
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
      // Reservar el contenedor de "Buscar Inmuebles" primero, para que
      // quede arriba de los links sueltos (addToolboxLinks se agrega
      // siempre después, ver reserveFndInmSlot()).
      reserveFndInmSlot();
      n = addToolboxLinks();
    } else {
      injectStyles();
      // El slot de "Buscar Inmuebles" ya queda reservado adentro del
      // dropdown por buildUserMenu() (primer hijo, arriba de los demás
      // links), como parte de replaceCtas().
      n = replaceCtas(detail.usuario).length;
    }

    if (n > 0) document.body.dataset[READY_FLAG] = '1';

    // fndInm.js: independiente del modo (cta/toolbox); ver mountFndInm().
    mountFndInm(detail.usuario, mode);
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
