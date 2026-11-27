// Botón «Suscríbete al newsletter» de los posts del blog (include
// _includes/nl-suscripcion.html). Al abrir el toolbox:
//   - con sesión (window.STT): muestra el correo de la cuenta, un indicador
//     de si ya está suscrito (GET newsletter/status) y el link «¿Deseas
//     suscribirte con otro correo?» que pasa al formulario libre.
//   - sin sesión: input de correo + botón.
// El alta corre contra POST newsletter/subscribe (nodeLab, single opt-in);
// al responder OK se muestra «¡{correo} registrado a la lista de correos!».
(function () {
  'use strict';

  var API = (window.STATETTY_CONFIG && window.STATETTY_CONFIG.WS_API_BASE) ||
    'https://api.statetty.com/api/';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var STYLE_ID = 'nl-sus-styles';
  var MS_ESPERA_SESION = 1500;

  // ------------------------------------------------------------- estilos

  function inyectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent =
      '.nl-sus{position:relative;display:inline-block;margin:1em 0;}' +
      '.nl-sus-btn{display:inline-flex;align-items:center;gap:.5em;padding:.6em 1.2em;' +
      'border:0;border-radius:999px;background:#074f66;color:#fff;font:inherit;' +
      'font-weight:600;cursor:pointer;transition:background .15s;}' +
      '.nl-sus-btn:hover,.nl-sus-btn[aria-expanded="true"]{background:#17baef;}' +
      '.nl-sus-box{position:absolute;z-index:60;top:calc(100% + 8px);left:0;width:300px;' +
      'box-sizing:border-box;background:#fff;border:1px solid #e3e9ec;border-radius:12px;' +
      'box-shadow:0 10px 30px rgba(7,79,102,.22);padding:14px;}' +
      '.nl-sus-box[hidden]{display:none;}' +
      '.nl-box-tit{margin:0 0 10px;font-size:.95rem;font-weight:700;color:#074f66;}' +
      '.nl-mail{display:block;padding:8px 10px;background:#f2f7fa;border:1px solid #dbe7ec;' +
      'border-radius:8px;font-size:.9rem;color:#074f66;word-break:break-all;}' +
      '.nl-estado{display:block;margin-top:6px;font-size:.82rem;color:#5a6b74;}' +
      '.nl-estado.si{color:#1e7d46;font-weight:600;}' +
      '.nl-estado.no{color:#a33a3a;}' +
      '.nl-input{display:block;width:100%;box-sizing:border-box;margin:0 0 8px;' +
      'padding:9px 10px;border:1px solid #c9d6dc;border-radius:8px;font:inherit;font-size:.95rem;}' +
      '.nl-input:focus{outline:none;border-color:#17baef;box-shadow:0 0 0 3px rgba(23,186,239,.18);}' +
      '.nl-enviar{display:block;width:100%;margin-top:8px;padding:.55em 1em;border:0;' +
      'border-radius:8px;background:#eebf3f;color:#074f66;font:inherit;font-weight:700;cursor:pointer;}' +
      '.nl-enviar:hover{background:#f4d67a;}' +
      '.nl-enviar[hidden]{display:none;}' +
      '.nl-enviar:disabled{opacity:.55;cursor:default;}' +
      '.nl-otro{display:inline-block;margin-top:10px;font-size:.82rem;color:#0a7de0;' +
      'cursor:pointer;text-decoration:underline;text-underline-offset:2px;}' +
      '.nl-ok{margin:0;font-size:.95rem;font-weight:600;color:#1e7d46;line-height:1.4;}' +
      '.nl-err{margin:8px 0 0;font-size:.8rem;color:#a33a3a;}' +
      '.nl-web{position:absolute;left:-9999px;top:-9999px;height:1px;width:1px;overflow:hidden;}';
    (document.head || document.documentElement).appendChild(st);
  }

  // ------------------------------------------------------------- helpers

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function usuario() {
    try {
      return (window.STT && typeof window.STT.getUsuario === 'function')
        ? window.STT.getUsuario() : null;
    } catch (e) { return null; }
  }

  // Espera a que auth.js resuelva la sesión (STT.ready) con tope: si el
  // lector abre el toolbox enseguida, no queremos tratarlo de anónimo
  // teniendo sesión por llegar.
  function esperarSesion() {
    return new Promise(function (resolve) {
      var t = setTimeout(resolve, MS_ESPERA_SESION);
      try {
        if (window.STT && window.STT.ready && typeof window.STT.ready.then === 'function') {
          window.STT.ready.then(function () { clearTimeout(t); resolve(); })
            .catch(function () { clearTimeout(t); resolve(); });
        } else { clearTimeout(t); resolve(); }
      } catch (e) { clearTimeout(t); resolve(); }
    });
  }

  function getEstado(email) {
    return fetch(API + 'newsletter/status?email=' + encodeURIComponent(email))
      .then(function (r) { return r.json(); })
      .catch(function () { return null; });
  }

  function postSubscribe(email, nombre, web) {
    return fetch(API + 'newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, nombre: nombre || '', web: web || '' })
    }).then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, error: 'red' }; });
  }

  // ------------------------------------------------------------- toolbox

  function pintarOk(box, email) {
    box.innerHTML = '<p class="nl-ok">¡' + esc(email) +
      ' registrado a la lista de correos!</p>';
  }

  function pintarError(box, txt) {
    var err = box.querySelector('.nl-err');
    if (!err) {
      err = document.createElement('p');
      err.className = 'nl-err';
      box.appendChild(err);
    }
    err.textContent = txt;
  }

  // Formulario libre: visitante, o usuario que quiso «otro correo».
  function pintarForm(root, box) {
    box.innerHTML =
      '<p class="nl-box-tit">Recibe las publicaciones en tu correo</p>' +
      '<input class="nl-input" type="email" autocomplete="email" ' +
      'placeholder="Escribe aquí la dirección que deseas suscribir">' +
      '<input class="nl-web" type="text" name="web" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button type="button" class="nl-enviar">Suscribirme</button>';

    var input = box.querySelector('.nl-input');
    var web = box.querySelector('.nl-web');
    var btn = box.querySelector('.nl-enviar');

    function enviar() {
      var email = (input.value || '').trim().toLowerCase();
      if (!EMAIL_RE.test(email)) {
        pintarError(box, 'Esa dirección no parece un correo válido.');
        input.focus();
        return;
      }
      btn.disabled = true;
      postSubscribe(email, '', web.value).then(function (res) {
        btn.disabled = false;
        if (res && res.ok) { pintarOk(box, email); return; }
        pintarError(box, res && res.error === 'email_invalido'
          ? 'Esa dirección no parece un correo válido.'
          : 'No pudimos registrar el correo, intenta de nuevo.');
      });
    }

    btn.addEventListener('click', enviar);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') enviar();
    });
    input.focus();
  }

  // Vista de cuenta: correo del usuario + indicador de suscripción.
  function pintarCuenta(root, box, u) {
    box.innerHTML =
      '<p class="nl-box-tit">Recibe las publicaciones en tu correo</p>' +
      '<span class="nl-mail">' + esc(u.email) + '</span>' +
      '<span class="nl-estado">Comprobando tu correo…</span>' +
      '<button type="button" class="nl-enviar" hidden>Suscribirme con este correo</button>' +
      '<a class="nl-otro" role="button" tabindex="0">¿Deseas suscribirte con otro correo?</a>';

    var estado = box.querySelector('.nl-estado');
    var btn = box.querySelector('.nl-enviar');
    var otro = box.querySelector('.nl-otro');

    getEstado(u.email).then(function (res) {
      // Si mientras tanto el usuario pidió «otro correo», no pisar el form.
      if (!box.contains(estado)) return;
      if (res && res.ok && res.data && res.data.suscrito) {
        estado.textContent = '✓ Ya está en la lista';
        estado.className = 'nl-estado si';
      } else {
        estado.textContent = (res && res.ok)
          ? 'Todavía no está en la lista'
          : 'No se pudo comprobar si ya está registrado';
        estado.className = 'nl-estado no';
        btn.hidden = false;
      }
    });

    btn.addEventListener('click', function () {
      btn.disabled = true;
      postSubscribe(u.email, u.name || '', '').then(function (res) {
        btn.disabled = false;
        if (res && res.ok) { pintarOk(box, u.email); return; }
        pintarError(box, 'No pudimos registrar el correo, intenta de nuevo.');
      });
    });

    function otroCorreo() { pintarForm(root, box); }
    otro.addEventListener('click', otroCorreo);
    otro.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); otroCorreo(); }
    });
  }

  function abrirBox(root, box) {
    if (root._nlPintado) return;
    root._nlPintado = true;
    box.innerHTML = '<p class="nl-estado">Comprobando tu correo…</p>';
    esperarSesion().then(function () {
      var u = usuario();
      if (u && u.email) { pintarCuenta(root, box, u); return; }
      pintarForm(root, box);
    });
  }

  // ------------------------------------------------------------- montaje

  function montar(root) {
    var btn = root.querySelector('.nl-sus-btn');
    var box = root.querySelector('.nl-sus-box');
    if (!btn || !box) return;

    function alternar(abrir) {
      var va = (typeof abrir === 'boolean') ? abrir : box.hidden;
      box.hidden = !va;
      btn.setAttribute('aria-expanded', va ? 'true' : 'false');
      if (va) abrirBox(root, box);
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      alternar();
    });
    box.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', function () { alternar(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') alternar(false);
    });
  }

  function init() {
    inyectStyles();
    var roots = document.querySelectorAll('.nl-sus');
    for (var i = 0; i < roots.length; i++) montar(roots[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
