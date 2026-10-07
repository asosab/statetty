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
        { label: 'Mapa', href: 'https://statetty.com/maps/find/' },
        { label: 'Acortador', href: 'https://statetty.com/shortlinks', superuser: true },
        { label: 'Adquirir tiempo', action: 'stt-open-checkout' }
      ];

  var LOGOUT_LABEL = 'Cerrar sesión';

  // Superusuario: único email autorizado a ver el ítem "Acortador".
  var SUPER_ADMIN_EMAIL = 'asosab@gmail.com';
  var LOGGED_USER = null;

  // ------------------------------------------------------------------
  // Ítems de administración de Buddy
  // ------------------------------------------------------------------
  // Mismos comandos que ofrece el menú de usuario del chat de Buddy
  // (declarados en assets/buddy/modules/*/config.js → `menu: []`), pero
  // accesibles desde el menú del sitio, sin depender del chat.
  //
  // La autorización se lee SIEMPRE de Buddy ( Buddy es la única verificación):
  //   - role 'admin'      → Buddy.admin.isAdmin()
  //   - role 'superadmin' → Buddy.configToolbox.isSuperuser()
  //   - role 'auth'       → Buddy.auth.isAuthenticated()
  //   - siteModule        → además exige Buddy.modules.isActive(siteModule),
  //                         para que un módulo ausente en este sitio no offerte
  //                         un comando que no puede abrir nada.
  var BUDDY_ADMIN_ITEMS = [
    { module: 'admin', action: 'open', label: 'Administrador del sitio', icon: '🛡️', role: 'admin' },
    { module: 'dashboard', action: 'open', label: 'Dashboard', icon: '📊', role: 'admin' },
    { module: 'configToolbox', action: 'open', label: 'Toolbox de configuración', icon: '⚙️', role: 'superadmin' },
    { module: 'archerySchool', action: 'renderAdmin', label: 'Administrar arquería', icon: '🛠️', role: 'admin', siteModule: 'archerySchool' },
    { module: 'archeryGame', action: 'top10Mostrar', label: 'Top 10', icon: '🏆', role: 'auth', siteModule: 'archeryGame' }
  ];

  var ADMIN_BLOCK_CLASS = 'stt-admin-menu-block';
  // Eventos con los que Buddy avisa que el estado de sesión/admin cambió. El
  // bloque se repinta en sitio (sin rehacer el menú entero) cuando el rol se
  // resuelve más tarde que la primera carga.
  var ADMIN_REPAINT_EVENTS = [
    'buddy:ready',
    'buddy:auth-ready',
    'buddy:auth-state-changed',
    'buddy:auth-verified',
    'buddy:admin-visibility-changed'
  ];

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
  var FNDINM_SCRIPT_URL = window.STT_FND_INM_URL || 'https://statetty.com/assets/js/fndInm.js?v20';
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
      '.stt-user-dropdown{position:fixed;' +
      'width:min(320px,92vw);min-width:190px;max-height:min(75vh,560px);' +
      'overflow-y:auto;overflow-x:hidden;' +
      'background:#fff;border-radius:var(--radius-md,12px);' +
      'box-shadow:0 10px 30px rgba(7,79,102,.18);padding:8px;' +
      // Por encima de las burbujas de texto de Buddy says (z-index 2147483000/301).
      // Se monta como portal en <body> (no dentro del header, que crea su propio
      // stacking context con z-index:1000) para que este valor sí aplique a nivel
      // raíz y no quede atrapado bajo la capa de Buddy.
      'z-index:2147483002;' +
      'opacity:0;visibility:hidden;transform:translateY(-6px);' +
      'transition:opacity .18s ease, transform .18s ease, visibility .18s;' +
      'font-family:var(--font-body,\'Lato\',sans-serif);}' +
      '.stt-user-dropdown.open{opacity:1;visibility:visible;transform:translateY(0);}' +
      '.stt-user-dropdown a{display:block;padding:10px 12px;border-radius:var(--radius-sm,6px);' +
      'font-size:.92rem;color:#2b3a42;text-decoration:none;white-space:nowrap;' +
      'transition:background .15s ease, color .15s ease;}' +
      '.stt-user-dropdown a:hover,.stt-user-dropdown a:focus-visible{' +
      'background:rgba(23,186,239,.1);color:var(--blue-dark,#074f66);}' +
      // Ítems de admin de Buddy: son <button> (disparan una acción, no navegan),
      // por eso llevan su propio estilo replicando el de los <a>.
      '.' + ADMIN_BLOCK_CLASS + '{padding:2px 0;}' +
      '.' + ADMIN_BLOCK_CLASS + ' button{display:block;width:100%;border:0;background:none;cursor:pointer;' +
      'padding:10px 12px;border-radius:var(--radius-sm,6px);text-align:left;white-space:nowrap;' +
      'font-size:.92rem;font-family:var(--font-body,\'Lato\',sans-serif);color:#2b3a42;' +
      'transition:background .15s ease, color .15s ease;}' +
      '.' + ADMIN_BLOCK_CLASS + ' button:hover,' + ADMIN_BLOCK_CLASS + ' button:focus-visible{' +
      'background:rgba(23,186,239,.1);color:var(--blue-dark,#074f66);}' +
      '.stt-user-dropdown-sep{height:1px;background:rgba(0,0,0,.08);margin:4px 0;}' +
      '.stt-user-logout{display:block;width:100%;padding:10px 12px;border:0;border-radius:var(--radius-sm,6px);' +
      'font-size:.92rem;font-family:var(--font-body,\'Lato\',sans-serif);color:#999;text-decoration:none;text-align:left;' +
      'background:none;cursor:pointer;white-space:nowrap;transition:background .15s ease,color .15s ease;}' +
      '.stt-user-logout:hover,.stt-user-logout:focus-visible{background:rgba(0,0,0,.04);color:#666;}' +
      '@media (max-width:768px){.stt-user-dropdown{width:min(320px,92vw);}}';
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
      '.' + ADMIN_BLOCK_CLASS + ' button{display:block;width:100%;border:0;background:none;cursor:pointer;' +
      'padding:8px 6px;text-align:left;color:inherit;font-family:inherit;font-size:inherit;border-radius:6px;}' +
      '.' + ADMIN_BLOCK_CLASS + ' button:hover,' + ADMIN_BLOCK_CLASS + ' button:focus-visible{background:rgba(0,0,0,.06);}' +
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
  // El cierre de sesión es de Buddy: revoca el refresh token en el servidor y
  // limpia los tokens locales. Nada más lo puede cerrar (ni una "?k=" nueva ni
  // una llave de Telegram), así que no hay nada que rotar del lado Statetty.

  function clearSession() {
    document.cookie = 'stt_pk=; Max-Age=0; Path=/; Domain=.statetty.com; Secure';
    localStorage.removeItem('stt_pk');
    window.publicKey = null;
    if (window.STT) window.STT.usuario = null;
    window.location.href = '/';
  }

  function handleLogout(e) {
    if (e && e.preventDefault) e.preventDefault();
    var p = Promise.resolve();
    if (window.STT && typeof window.STT.logout === 'function') {
      p = Promise.resolve(window.STT.logout());
    }
    // Se espera el cierre de Buddy para no cortar la revocación del refresh con
    // la navegación; si falla, se limpia igual (el logout es local también).
    p.catch(function () {}).then(function () { clearSession(); });
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
      if (item.superuser && !(LOGGED_USER && LOGGED_USER.email === SUPER_ADMIN_EMAIL)) {
        return false;
      }
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
  // Bloque de administración de Buddy
  // ------------------------------------------------------------------

  // Los ítems visibles según el estado actual de Buddy (rol + módulos activos).
  // Se recalcula en cada repintado porque el rol puede resolverse después del
  // primer render (p. ej. el admin se confirma cuando llega la sesión maestra).
  function getBuddyAdminItems() {
    var b = window.Buddy;
    if (!b) return [];

    return BUDDY_ADMIN_ITEMS.filter(function (item) {
      if (item.siteModule) {
        var mods = b.modules;
        if (!mods || typeof mods.isActive !== 'function') return false;
        if (!mods.isActive(item.siteModule)) return false;
      }
      if (item.role === 'superadmin') {
        var ct = b.configToolbox;
        if (!ct || typeof ct.isSuperuser !== 'function' || !ct.isSuperuser()) return false;
        return true;
      }
      if (item.role === 'admin') {
        var ad = b.admin;
        if (!ad || typeof ad.isAdmin !== 'function' || !ad.isAdmin()) return false;
        return true;
      }
      if (item.role === 'auth') {
        var au = b.auth;
        if (!au || typeof au.isAuthenticated !== 'function' || !au.isAuthenticated()) return false;
        return true;
      }
      return true;
    });
  }

  function buildAdminButton(item) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('role', 'menuitem');
    btn.textContent = item.icon + ' ' + item.label;
    btn.addEventListener('click', function () {
      runBuddyAction(item);
      // Cierra el desplegable: el click sintético en document es detectado por
      // el listener de cierre que cada menú registró (solo cierra si el click
      // cae fuera de él, y document siempre cae fuera).
      try { document.dispatchEvent(new MouseEvent('click', { bubbles: false })); } catch (e) {}
    });
    return btn;
  }

  function buildAdminBlock() {
    var block = document.createElement('div');
    block.className = ADMIN_BLOCK_CLASS;
    getBuddyAdminItems().forEach(function (item) {
      block.appendChild(buildAdminButton(item));
    });
    return block;
  }

  // Inserta el bloque al final del host (antes del separador de logout) si hay
  // ítems visibles. Devuelve el bloque o null.
  function renderAdminBlock(host) {
    var items = getBuddyAdminItems();
    if (!items.length) return null;
    var block = buildAdminBlock();
    host.appendChild(block);
    return block;
  }

  // Repinta los bloques ya montados. Si el rol se perdió, el bloque se retira.
  // Reemplaza nodo por nodo para no depender de innerHTML.
  //
  // El rol puede resolverse DESPUÉS del primer render (la sesión maestra o la
  // confirmación de admin llegan más tarde que el evento statetty:key-ready), y
  // en ese momento no hay ningún bloque montado: por eso, si hay ítems visibles
  // y aún no existe bloque, se inserta en los contenedores conocidos.
  function updateAdminBlock() {
    var hayItems = getBuddyAdminItems().length > 0;
    var blocks = document.querySelectorAll('.' + ADMIN_BLOCK_CLASS);

    for (var i = 0; i < blocks.length; i++) {
      var parent = blocks[i].parentNode;
      if (!parent) continue;
      if (hayItems) {
        parent.replaceChild(buildAdminBlock(), blocks[i]);
      } else {
        parent.removeChild(blocks[i]);
      }
    }

    if (!hayItems || blocks.length) return;
    adminHosts().forEach(function (h) {
      if (h.host.querySelector('.' + ADMIN_BLOCK_CLASS)) return;
      var block = buildAdminBlock();
      if (h.sep) {
        h.host.insertBefore(block, h.sep);
      } else {
        h.host.appendChild(block);
      }
    });
  }

  // Contenedores donde vive el bloque: el desplegable del usuario (modo cta) y
  // el panel del engranaje (modo toolbox). El separador marca dónde insertar.
  function adminHosts() {
    var hosts = [];
    document.querySelectorAll('.stt-user-dropdown').forEach(function (dropdown) {
      hosts.push({ host: dropdown, sep: dropdown.querySelector('.stt-user-dropdown-sep') });
    });
    var toolbox = document.getElementById(TOOLBOX_LINKS_ID);
    if (toolbox) hosts.push({ host: toolbox, sep: toolbox.querySelector('.stt-user-toolbox-sep') });
    return hosts;
  }

  // Ejecuta la acción de un ítem de admin sobre el módulo de Buddy.
  // Las acciones `render*` exigen un contenedor: se les da un modal propio,
  // igual que hace el módulo `menu` de Buddy, para no duplicar UI.
  function runBuddyAction(item) {
    var b = window.Buddy || {};
    var api = b[item.module];
    if (!api || typeof api[item.action] !== 'function') {
      console.log('[Statetty] [warn] menuUser: acción no disponible en el módulo ' + item.module + ': ' + item.action);
      return;
    }
    try {
      if (/^render/.test(item.action)) {
        var host = openActionModal();
        var res = api[item.action](host, item.arg || {});
        if (res && typeof res.catch === 'function') {
          res.catch(function (e) {
            console.log('[Statetty] [error] menuUser: la vista de ' + item.module + ' falló al montarse.', e);
          });
        }
      } else {
        api[item.action](item.arg);
      }
    } catch (e) {
      console.log('[Statetty] [error] menuUser: la acción de ' + item.module + ' falló.', e);
    }
  }

  var ACTION_MODAL_ID = 'stt-admin-action-modal';
  function openActionModal() {
    var overlay = document.getElementById(ACTION_MODAL_ID);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = ACTION_MODAL_ID;
      overlay.setAttribute('role', 'dialog');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483003;background:rgba(7,52,63,.55);' +
        'display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto;';
      document.body.appendChild(overlay);
    }
    var box = document.createElement('div');
    box.style.cssText = 'position:relative;background:#fff;border-radius:14px;max-width:960px;width:100%;' +
      'max-height:88vh;overflow:auto;padding:20px;box-shadow:0 18px 50px rgba(0,0,0,.28);';
    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Cerrar');
    close.textContent = '×';
    close.style.cssText = 'position:absolute;right:10px;top:8px;background:none;border:0;font-size:22px;' +
      'color:#7b8f99;cursor:pointer;line-height:1;';
    close.addEventListener('click', function () { overlay.remove(); });
    var target = document.createElement('div');
    box.appendChild(close);
    box.appendChild(target);
    overlay.appendChild(box);
    return target;
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
      if (item.action) {
        var b = document.createElement('a');
        b.href = '#';
        b.textContent = item.label;
        b.setAttribute('role', 'menuitem');
        b.addEventListener('click', function (e) {
          e.preventDefault();
          close();
          if (item.action === 'stt-open-checkout' && window.STTCheckout && window.STTCheckout.open) {
            window.STTCheckout.open();
          }
        });
        dropdown.appendChild(b);
        return;
      }
      var a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      a.setAttribute('role', 'menuitem');
      dropdown.appendChild(a);
    });

    // Administración de Buddy (roles de admin/superadmin), sobre el separador.
    renderAdminBlock(dropdown);

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
    // El dropdown se monta como portal en <body>: al quedar fuera del header
    // (position:fixed; z-index:1000 → crea stacking context), su z-index
    // 2147483002 se respeta a nivel raíz y queda por encima de las burbujas de
    // "Buddy says" (2147483001) en vez de ocultarse debajo.
    document.body.appendChild(dropdown);

    function positionDropdown() {
      var r = trigger.getBoundingClientRect();
      var dd = dropdown.getBoundingClientRect();
      var gap = 10;
      var top = r.bottom + gap;
      if (top + dd.height > window.innerHeight - gap) top = Math.max(gap, window.innerHeight - dd.height - gap);
      var left = r.right - dd.width;
      left = Math.max(gap, Math.min(left, window.innerWidth - dd.width - gap));
      dropdown.style.top = Math.round(top) + 'px';
      dropdown.style.left = Math.round(left) + 'px';
    }
    function open() {
      wrap.classList.add('open');
      dropdown.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      positionDropdown();
    }
    function close() {
      wrap.classList.remove('open');
      dropdown.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }
    function toggle(e) {
      e.stopPropagation();
      wrap.classList.contains('open') ? close() : open();
    }
    function repositionIfOpen() {
      if (wrap.classList.contains('open')) positionDropdown();
    }

    trigger.addEventListener('click', toggle);
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target) && !dropdown.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
    window.addEventListener('resize', repositionIfOpen);
    window.addEventListener('scroll', repositionIfOpen, true);

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
      if (item.action) {
        var b = document.createElement('a');
        b.href = '#';
        b.textContent = item.label;
        b.addEventListener('click', function (e) {
          e.preventDefault();
          if (item.action === 'stt-open-checkout' && window.STTCheckout && window.STTCheckout.open) {
            window.STTCheckout.open();
          }
        });
        container.appendChild(b);
        return;
      }
      var a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      container.appendChild(a);
    });

    // Administración de Buddy (roles de admin/superadmin), sobre el separador.
    renderAdminBlock(container);

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
    if (!detail.usuario || !detail.usuario._id) {
      // Fase 1.3: sin sesión statetty → si Buddy está disponible, mostrar CTA
      // de login para entrar con correo (magic link). Solo en modo cta.
      mountLoginCta();
      return;
    }

    if (document.body.dataset[READY_FLAG]) return; // evita duplicados si el evento se dispara más de una vez

    LOGGED_USER = detail.usuario;

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
    removeLoginCta();

    // fndInm.js: independiente del modo (cta/toolbox); ver mountFndInm().
    mountFndInm(detail.usuario, mode);
  }

  // Fase 1.3: CTA de login Buddy cuando el usuario no está logueado.
  var LOGIN_CTA_FLAG = 'menuUserLoginCta';
  var LOGIN_CTA_SELECTOR = '.stt-login-cta';

  function mountLoginCta() {
    // Solo si Buddy está disponible (login por correo) y en modo cta.
    if (!(window.Buddy && window.Buddy.auth)) return;
    if (document.body.dataset[READY_FLAG]) return; // ya hay usuario, no login
    if (document.body.dataset[LOGIN_CTA_FLAG]) return; // ya montado
    if (resolveMode() !== 'cta') return;

    var ctaEls = document.querySelectorAll(CTA_SELECTOR);
    if (ctaEls.length === 0) return;

    var mounted = 0;
    ctaEls.forEach(function (el) {
      // Idempotencia extra a nivel DOM: si el contenedor del CTA ya tiene un
      // botón de login "Ingresar" como hermano, no crear otro (evita duplicados
      // aunque el flag de body falle por cualquier motivo).
      if (el.parentNode && el.parentNode.querySelector(LOGIN_CTA_SELECTOR)) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'stt-login-cta';
      btn.textContent = 'Ingresar';
      btn.setAttribute('aria-label', 'Ingresar con tu correo');
      btn.addEventListener('click', function () {
        if (window.STT && window.STT.startLogin) window.STT.startLogin();
      });
      el.parentNode.appendChild(btn);
      mounted++;
    });
    if (mounted > 0) document.body.dataset[LOGIN_CTA_FLAG] = '1';
  }

  function removeLoginCta() {
    if (!document.body.dataset[LOGIN_CTA_FLAG]) return;
    document.querySelectorAll(LOGIN_CTA_SELECTOR).forEach(function (el) { el.remove(); });
    delete document.body.dataset[LOGIN_CTA_FLAG];
  }

  function init() {
    document.addEventListener('statetty:key-ready', handleKeyReady);
    // El rol de admin puede resolverse después del primer render (sesión maestra
    // o confirmación de admin): se repinta solo el bloque, no el menú entero.
    ADMIN_REPAINT_EVENTS.forEach(function (evt) {
      window.addEventListener(evt, updateAdminBlock);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
