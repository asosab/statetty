/**
 * assets/buddy/modules/menu/buddy_menu.js
 * ---------------------------------------------------------------------------
 * Menú de usuario integrado en la barra del chat.
 *
 * Coloca a la izquierda del área de texto del chat (#buddy-chat-input) un
 * trigger único que muestra:
 *   - Sin usuario  -> botón "login" (actúa como botón de autenticación).
 *   - Con usuario  -> avatar circular (foto o iniciales, via Buddy.user.avatar).
 * Nunca se muestran ambos a la vez.
 *
 * Al desplegarse muestra un menú flotante con los elementos de menú que cada
 * MÓDULO ACTIVO declara en su propia configuración (campo `menu` de
 * window.Buddy<Module>Config), filtrados por `enabled` y por el tipo de
 * usuario actual (`roles`).
 *
 * Contrato de ítem declarado por cada módulo en su config.js:
 * {
 *   id:    'myData',
 *   label: 'Mis datos',
 *   icon:  '👤',                       // opcional
 *   roles: 'auth,admin,superadmin',    // 'anon','auth','admin','superadmin'
 *   enabled: true,                     // visible por defecto
 *   action: 'renderProfile',           // función a llamar en window.Buddy.<module>
 *   arg:   { ... }                     // opcional
 * }
 *
 * El botón de autenticación nativo del chat (.buddy-chat-auth) está
 * deshabilitado; este módulo lo oculta y asume la función de auth.
 */
window.Buddy = window.Buddy || {};

(function (window, document) {
  'use strict';

  var CONFIG = window.BuddyMenuConfig || {};

  var BUDDY_ADMIN_EMAIL = 'asosab@gmail.com';

  var STYLE_ID = 'buddy-menu-styles';
  var DROPDOWN_ID = 'buddy-menu-dropdown';
  var MODAL_ID = 'buddy-menu-modal';

  var state = {
    init: false,
    role: 'anon'
  };

  var elements = {
    trigger: null,
    dropdown: null,
    modal: null
  };

  function debugLog() {
    if (!CONFIG || (CONFIG.debug !== true && CONFIG.debugMode !== true)) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[BuddyMenu]');
    console.log.apply(console, args);
  }

  function getConfigForModule(moduleId) {
    // El módulo `config` (toolbox de configuración) rompe la convención de
    // nombre público (window.BuddyConfigToolboxConfig en lugar de
    // window.BuddyConfigConfig). Se resuelve explícitamente.
    if (String(moduleId).toLowerCase() === 'config') {
      return window.BuddyConfigToolboxConfig || {};
    }
    var name = 'Buddy' + moduleId.charAt(0).toUpperCase() + moduleId.slice(1)
      .replace(/_([a-z])/g, function (_, c) { return c.toUpperCase(); }) + 'Config';
    return window[name] || {};
  }

  // -------------------------------------------------------------------
  // Tipo de usuario actual
  // -------------------------------------------------------------------
  function getUserRole() {
    var auth = window.Buddy && window.Buddy.auth;
    if (!auth || !auth.isAuthenticated || !auth.isAuthenticated()) return 'anon';

    var user = auth.getUser ? auth.getUser() : null;
    var email = user && user.email ? String(user.email).toLowerCase() : '';

    if (email === BUDDY_ADMIN_EMAIL) return 'superadmin';

    var admin = window.Buddy && window.Buddy.admin;
    if (admin && typeof admin.isAdmin === 'function' && admin.isAdmin()) return 'admin';

    return 'auth';
  }

  function roleAllows(roles, role) {
    if (!roles) return false;
    var list = String(roles).split(',').map(function (r) { return r.trim(); });
    return list.indexOf(role) !== -1;
  }

  // -------------------------------------------------------------------
  // Estilos
  // -------------------------------------------------------------------
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '.buddy-menu-trigger{display:inline-flex;align-items:center;justify-content:center;' +
      'height:36px;min-width:36px;padding:0 10px;gap:6px;box-sizing:border-box;' +
      'border:1px solid #bbb;border-radius:18px;background:#fff;color:#555;' +
      'cursor:pointer;font:600 14px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
      'line-height:1;white-space:nowrap;flex:0 0 auto;}' +
      '.buddy-menu-trigger:hover{border-color:#777;color:#000;}' +
      '.buddy-menu-trigger .buddy-menu-avatar{width:24px;height:24px;border-radius:50%;' +
      'overflow:hidden;background:#eee;display:grid;place-items:center;font-size:12px;' +
      'font-weight:700;color:#666;flex:0 0 auto;}' +
      '.buddy-menu-trigger .buddy-menu-avatar img{width:100%;height:100%;object-fit:cover;}' +
      '.buddy-menu-wrap{position:relative;display:inline-flex;flex:0 0 auto;}' +
      '.buddy-menu-dropdown{position:fixed;left:56px;bottom:64px;z-index:10040;' +
      'min-width:210px;padding:6px;box-sizing:border-box;background:#fff;' +
      'border:1px solid rgba(0,0,0,.12);border-radius:10px;' +
      'box-shadow:0 8px 28px rgba(0,0,0,.18);' +
      'font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
      'opacity:0;visibility:hidden;transform:translateY(6px);transition:.15s ease;}' +
      '.buddy-menu-dropdown.open{opacity:1;visibility:visible;transform:translateY(0);}' +
      '.buddy-menu-dropdown button{display:flex;align-items:center;gap:10px;width:100%;' +
      'padding:9px 10px;box-sizing:border-box;border:0;border-radius:7px;background:transparent;' +
      'color:#333;cursor:pointer;font:inherit;text-align:left;}' +
      '.buddy-menu-dropdown button:hover,.buddy-menu-dropdown button:focus-visible{' +
      'background:rgba(0,0,0,.05);color:#000;}' +
      '.buddy-menu-dropdown .buddy-menu-sep{height:1px;background:rgba(0,0,0,.08);margin:4px 0;}' +
      '.buddy-menu-dropdown .buddy-menu-logout{color:#c0392b;}' +
      '.buddy-menu-modal{position:fixed;inset:0;z-index:10060;display:none;align-items:center;' +
      'justify-content:center;background:rgba(0,0,0,.4);padding:16px;box-sizing:border-box;' +
      'font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}' +
      '.buddy-menu-modal.open{display:flex;}' +
      '.buddy-menu-modal-box{position:relative;max-width:640px;width:100%;max-height:85vh;' +
      'overflow:auto;box-sizing:border-box;padding:20px;background:#fff;border-radius:12px;' +
      'box-shadow:0 12px 40px rgba(0,0,0,.25);}' +
      '.buddy-menu-modal-close{position:absolute;top:10px;right:12px;border:0;background:transparent;' +
      'font-size:20px;line-height:1;cursor:pointer;color:#888;}' +
      '@media (max-width:768px){.buddy-menu-dropdown{left:10px;right:10px;width:auto;bottom:70px;}}';
    document.head.appendChild(style);
  }

  // -------------------------------------------------------------------
  // Cierre del dropdown por click externo / tecla
  // -------------------------------------------------------------------
  function closeDropdown() {
    if (elements.dropdown) elements.dropdown.classList.remove('open');
    if (elements.trigger) elements.trigger.setAttribute('aria-expanded', 'false');
  }

  function closeModal() {
    if (elements.modal) {
      elements.modal.classList.remove('open');
      elements.modal.innerHTML = '';
    }
  }

  function onDocClick(e) {
    var wrap = elements.trigger ? elements.trigger.closest('.buddy-menu-wrap') : null;
    if (wrap && wrap.contains(e.target)) return;
    if (elements.dropdown && elements.dropdown.contains(e.target)) return;
    closeDropdown();
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      closeDropdown();
      closeModal();
    }
  }

  function onChatVisibility() {
    // Si el chat se cierra/oculta, se cierra el menú abierto.
    var container = document.getElementById('buddy-chat');
    if (container && (container.hidden || container.getAttribute('hidden') !== null)) {
      closeDropdown();
    }
  }

  // -------------------------------------------------------------------
  // Botón de autenticación nativo del chat: ocultarlo.
  // -------------------------------------------------------------------
  function hideNativeAuthButton() {
    var authButton = document.querySelector('.buddy-chat-auth');
    if (authButton) {
      authButton.setAttribute('hidden', '');
      authButton.style.display = 'none';
    }
  }

  // -------------------------------------------------------------------
  // Recolectar ítems de menú declarados por los módulos activos.
  // -------------------------------------------------------------------
  function collectItems() {
    var role = state.role;
    var active = (window.Buddy && window.Buddy.modules && Array.isArray(window.Buddy.modules.active)) ?
      window.Buddy.modules.active : [];
    var items = [];

    active.forEach(function (moduleId) {
      var config = getConfigForModule(moduleId);
      var menuList = Array.isArray(config.menu) ? config.menu : [];
      menuList.forEach(function (item) {
        if (!item || item.enabled === false) return;
        if (!roleAllows(item.roles, role)) return;
        items.push({
          moduleId: moduleId,
          id: item.id || item.label,
          label: item.label,
          icon: item.icon || '',
          action: item.action || null,
          arg: item.arg
        });
      });
    });

    return items;
  }

  // -------------------------------------------------------------------
  // Ejecutar la acción de un ítem de menú.
  // -------------------------------------------------------------------
  function runAction(item) {
    var api = window.Buddy && window.Buddy[item.moduleId];
    if (!api || !item.action) return;

    var fn = api[item.action];
    if (typeof fn !== 'function') {
      debugLog('Acción no disponible en el módulo ' + item.moduleId + ': ' + item.action);
      return;
    }

    // Si la acción es un *render de vista* que exige un contenedor, se monta
    // en el modal del menú (reutilización): no se duplica UI.
    var isRender = /^render/.test(item.action);
    if (isRender) {
      var target = openModal();
      try {
        var result = fn(target, item.arg || {});
        if (result && typeof result.catch === 'function') {
          result.catch(function (err) {
            debugLog('La vista del módulo ' + item.moduleId + ' falló al montarse.', err);
          });
        }
      } catch (err) {
        debugLog('No se pudo montar la vista del módulo ' + item.moduleId, err);
      }
      closeDropdown();
      return;
    }

    try {
      fn(item.arg);
    } catch (err) {
      debugLog('La acción del módulo ' + item.moduleId + ' falló.', err);
    }
    closeDropdown();
  }

  function openModal() {
    if (!elements.modal) {
      var modal = document.createElement('div');
      modal.id = MODAL_ID;
      modal.className = 'buddy-menu-modal';
      modal.setAttribute('role', 'dialog');
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal();
      });
      document.body.appendChild(modal);
      elements.modal = modal;
    }
    var box = document.createElement('div');
    box.className = 'buddy-menu-modal-box';

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'buddy-menu-modal-close';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Cerrar');
    closeBtn.addEventListener('click', closeModal);
    box.appendChild(closeBtn);

    var target = document.createElement('div');
    target.dataset.buddyMenuTarget = 'true';
    box.appendChild(target);

    elements.modal.innerHTML = '';
    elements.modal.appendChild(box);
    elements.modal.classList.add('open');
    return target;
  }

  // -------------------------------------------------------------------
  // Cerrar sesión (solo autenticado).
  // -------------------------------------------------------------------
  function handleLogout() {
    var auth = window.Buddy && window.Buddy.auth;
    if (auth && typeof auth.logout === 'function') {
      var result = auth.logout();
      if (result && typeof result.catch === 'function') {
        result.catch(function () { /* auth notifica por eventos */ });
      }
    }
    closeDropdown();
  }

  function handleLogin() {
    var auth = window.Buddy && window.Buddy.auth;
    if (auth && typeof auth.startAuthenticationPrompt === 'function') {
      auth.startAuthenticationPrompt();
    } else if (auth && typeof auth.requestLogin === 'function') {
      auth.requestLogin(null);
    }
    closeDropdown();
  }

  // -------------------------------------------------------------------
  // Construcción del trigger y del dropdown.
  // -------------------------------------------------------------------
  function buildDropdown(role) {
    if (!elements.dropdown) {
      var dropdown = document.createElement('div');
      dropdown.id = DROPDOWN_ID;
      dropdown.className = 'buddy-menu-dropdown';
      dropdown.setAttribute('role', 'menu');
      document.body.appendChild(dropdown);
      elements.dropdown = dropdown;
    }
    elements.dropdown.innerHTML = '';

    var items = collectItems();

    if (role === 'anon') {
      addItem({ label: (CONFIG.labels && CONFIG.labels.login) || 'Iniciar sesión', icon: '→', onClick: handleLogin });
      if (items.length) elements.dropdown.appendChild(sep());
    }

    items.forEach(function (item) {
      addItem({ label: item.label, icon: item.icon, onClick: function () { runAction(item); } });
    });

    if (role !== 'anon') {
      elements.dropdown.appendChild(sep());
      addItem({ label: CONFIG.logoutLabel || 'Cerrar sesión', icon: '', onClick: handleLogout, logout: true });
    }

    if (!items.length && role === 'anon') {
      // Nada adicional.
    }
  }

  function sep() {
    var div = document.createElement('div');
    div.className = 'buddy-menu-sep';
    return div;
  }

  function addItem(opts) {
    var button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'menuitem');
    if (opts.icon) {
      var icon = document.createElement('span');
      icon.textContent = opts.icon;
      button.appendChild(icon);
    }
    var label = document.createElement('span');
    label.textContent = opts.label;
    button.appendChild(label);
    if (opts.logout) button.classList.add('buddy-menu-logout');
    button.addEventListener('click', opts.onClick);
    elements.dropdown.appendChild(button);
  }

  function buildTrigger(role) {
    var wrap = document.createElement('div');
    wrap.className = 'buddy-menu-wrap';

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'buddy-menu-trigger';
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', 'Menú de usuario');

    if (role === 'anon') {
      trigger.textContent = CONFIG.anonLabel || 'login';
    } else {
      var avatar = makeAvatar();
      if (avatar) trigger.appendChild(avatar);
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      buildDropdown(state.role);
      var open = elements.dropdown.classList.toggle('open');
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    wrap.appendChild(trigger);
    elements.trigger = trigger;
    return wrap;
  }

  function makeAvatar() {
    var user = window.Buddy && window.Buddy.user;
    if (user && typeof user.avatar === 'function') {
      return user.avatar(window.Buddy.auth && window.Buddy.auth.getUser ? window.Buddy.auth.getUser() : {}, 'buddy-menu-avatar');
    }
    var div = document.createElement('div');
    div.className = 'buddy-menu-avatar';
    div.textContent = '?';
    return div;
  }

  // -------------------------------------------------------------------
  // Montaje dentro de la barra del chat.
  // -------------------------------------------------------------------
  function render() {
    if (!document.getElementById('buddy-chat')) return;
    var input = document.getElementById('buddy-chat-input');
    if (!input) return;

    state.role = getUserRole();

    var existing = document.querySelector('.buddy-menu-wrap');
    if (existing) existing.remove();

    var wrap = buildTrigger(state.role);
    // Insertar antes del input: queda a la izquierda del área de texto.
    document.getElementById('buddy-chat').insertBefore(wrap, input);
  }

  function initialize() {
    if (state.init) return;
    if (!window.Buddy.ready && window.Buddy.readyPromise) {
      window.Buddy.readyPromise.then(function () { initialize(); }).catch(function () {});
      return;
    }

    var container = document.getElementById('buddy-chat');
    if (!container) return;

    ensureStyle();
    hideNativeAuthButton();
    state.init = true;
    render();

    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);

    // Re-render al cambiar auth / admin (y cierre si el chat se oculta).
    window.addEventListener('buddy:auth-state-changed', render);
    window.addEventListener('buddy:auth-ready', render);
    window.addEventListener('buddy:admin-visibility-changed', render);
  }

  // -------------------------------------------------------------------
  // API pública
  // -------------------------------------------------------------------
  window.Buddy.menu = {
    config: CONFIG,
    render: render,
    closeDropdown: closeDropdown,
    getRole: getUserRole,
    getItems: collectItems
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})(window, document);
