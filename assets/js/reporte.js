// assets/js/reporte.js — botón flotante de reporte (captura + comentario → admin).
// Solo visible para usuarios con sesión (registrados, activos o no).
// Usa window.STT (auth.js) como fuente única de identidad. Sin dependencias:
// html2canvas se carga por CDN bajo demanda al abrir el panel.
(function () {
  'use strict';

  var I18N = {
   fabTitulo: 'Reporta un problema o comentario',
    panelTitulo: 'Reporte a Statetty',
    captura: 'Capturando la página…',
    sinCaptura: 'No se pudo capturar la página. Puedes enviar el reporte igual.',
    placeholder: 'Escribe tu comentario, error, dificultad, idea o mejora…',
    recapturar: 'Volver a capturar',
    enviar: 'Enviar reporte',
    enviando: 'Enviando…',
    cerrar: 'Cerrar',
    ok: 'Reporte enviado. ¡Gracias!',
    errorEnvio: 'No se pudo enviar el reporte. Inténtalo de nuevo.',
    errorSesion: 'Tu sesión expiró. Vuelve a iniciar sesión e inténtalo otra vez.',
    errorTexto: 'Escribe un comentario antes de enviar.'
  };

  var ESTILO = ''
    + '#stt-fab-reporte{position:fixed;right:20px;bottom:20px;z-index:2147483600;width:52px;height:52px;'
    + 'border-radius:50%;border:none;background:#0d6efd;color:#fff;font-size:22px;cursor:pointer;'
    + 'box-shadow:0 4px 14px rgba(0,0,0,.35);display:none;align-items:center;justify-content:center;}'
    + '#stt-fab-reporte:hover{background:#0b5ed7;}'
    + '#stt-panel-reporte{position:fixed;right:20px;bottom:84px;z-index:2147483500;width:min(360px,calc(100vw - 40px));'
    + 'background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.3);padding:16px;display:none;'
    + 'font-family:inherit;color:#212529;}'
    + '#stt-panel-reporte h3{margin:0 0 10px;font-size:16px;}'
    + '#stt-img-reporte{width:100%;max-height:200px;object-fit:cover;border-radius:8px;border:1px solid #dee2e6;'
    + 'background:#f8f9fa;display:block;margin-bottom:10px;}'
    + '#stt-txt-reporte{width:100%;min-height:90px;resize:vertical;border:1px solid #ced4da;border-radius:8px;'
    + 'padding:8px;font-size:14px;font-family:inherit;box-sizing:border-box;}'
    + '#stt-msg-reporte{font-size:13px;margin:8px 0 0;min-height:18px;color:#198754;}'
    + '#stt-msg-reporte.err{color:#dc3545;}'
    + '#stt-btns-reporte{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;}'
    + '#stt-btns-reporte button{flex:1;padding:8px 10px;border-radius:8px;border:1px solid #ced4da;'
    + 'background:#f8f9fa;cursor:pointer;font-size:13px;}'
    + '#stt-btns-reporte button.primary{background:#0d6efd;border-color:#0d6efd;color:#fff;}'
    + '#stt-btns-reporte button:disabled{opacity:.6;cursor:default;}'
    + '#stt-reporte-cargando{position:fixed;inset:0;z-index:2147483640;background:rgba(0,0,0,.45);'
    + 'display:none;align-items:center;justify-content:center;color:#fff;font-size:15px;}'
    + '@media(max-width:576px){#stt-fab-reporte{right:14px;bottom:14px;}#stt-panel-reporte{right:14px;bottom:76px;}}';

  function inyectarEstilo() {
    if (document.getElementById('stt-reporte-css')) return;
    var st = document.createElement('style');
    st.id = 'stt-reporte-css';
    st.textContent = ESTILO;
    document.head.appendChild(st);
  }

  function cargarHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      s.onload = resolve;
      s.onerror = function () { reject(new Error('html2canvas no cargó')); };
      document.head.appendChild(s);
    });
  }

  function apiBase() {
    var c = window.STATETTY_CONFIG || {};
    return (c.WS_API_BASE || 'https://api.statetty.com/api/').replace(/\/?$/, '/');
  }

  function usuarioLogueado() {
    try { return !!(window.STT && typeof window.STT.getUsuario === 'function' && window.STT.getUsuario()); }
    catch (e) { return false; }
  }

  function crearUI() {
    inyectarEstilo();

    var fab = document.createElement('button');
    fab.id = 'stt-fab-reporte';
    fab.type = 'button';
    fab.textContent = '📸';
    fab.title = I18N.fabTitulo;
    fab.setAttribute('aria-label', I18N.fabTitulo);

    var panel = document.createElement('div');
    panel.id = 'stt-panel-reporte';
    panel.innerHTML =
      '<h3>' + I18N.panelTitulo + '</h3>' +
      '<img id="stt-img-reporte" alt="Captura de la página" style="display:none">' +
      '<textarea id="stt-txt-reporte" placeholder="' + I18N.placeholder + '"></textarea>' +
      '<p id="stt-msg-reporte"></p>' +
      '<div id="stt-btns-reporte">' +
      '<button type="button" id="stt-btn-captura">' + I18N.recapturar + '</button>' +
      '<button type="button" class="primary" id="stt-btn-enviar">' + I18N.enviar + '</button>' +
      '<button type="button" id="stt-btn-cerrar">' + I18N.cerrar + '</button>' +
      '</div>';

    var cargando = document.createElement('div');
    cargando.id = 'stt-reporte-cargando';
    cargando.textContent = I18N.captura;

    document.body.appendChild(fab);
    document.body.appendChild(panel);
    document.body.appendChild(cargando);
    fab.style.display = 'flex';

    var img = panel.querySelector('#stt-img-reporte');
    var txt = panel.querySelector('#stt-txt-reporte');
    var msg = panel.querySelector('#stt-msg-reporte');
    var btnEnviar = panel.querySelector('#stt-btn-enviar');
    var abierto = false;
    var blobCaptura = null;

    function msgSet(t, esError) {
      msg.textContent = t || '';
      msg.className = esError ? 'err' : '';
    }

    fab.addEventListener('click', function () {
      abierto = !abierto;
      panel.style.display = abierto ? 'block' : 'none';
      fab.style.display = abierto ? 'none' : 'flex';
      if (abierto && !blobCaptura) capturar();
      if (abierto) txt.focus();
    });

    panel.querySelector('#stt-btn-cerrar').addEventListener('click', function () {
      abierto = false;
      panel.style.display = 'none';
      fab.style.display = 'flex';
      msgSet('');
    });

    panel.querySelector('#stt-btn-captura').addEventListener('click', capturar);

    btnEnviar.addEventListener('click', enviar);
    txt.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') enviar();
    });

    function ignorar(el) {
      return el && el.closest && el.closest('#stt-fab-reporte,#stt-panel-reporte,#stt-reporte-cargando');
    }

    function capturar() {
      cargando.style.display = 'flex';
      msgSet('');
      cargarHtml2Canvas().then(function () {
        return window.html2canvas(document.documentElement, {
          useCORS: true,
          logging: false,
          scale: Math.min(window.devicePixelRatio || 1, 2),
          ignoreElements: ignorar
        });
      }).then(function (canvas) {
        return new Promise(function (resolve) {
          canvas.toBlob(function (b) {
            if (!b) return resolve(null);
            if (b.size > 700 * 1024) {
              canvas.toBlob(function (b2) { resolve(b2 || b); }, 'image/jpeg', 0.7);
            } else {
              resolve(b);
            }
          }, 'image/jpeg', 0.85);
        });
      }).then(function (blob) {
        blobCaptura = blob;
        if (blob) {
          img.src = URL.createObjectURL(blob);
          img.style.display = 'block';
        } else {
          img.style.display = 'none';
          msgSet(I18N.sinCaptura, true);
        }
      }).catch(function () {
        blobCaptura = null;
        img.style.display = 'none';
        msgSet(I18N.sinCaptura, true);
      }).finally(function () {
        cargando.style.display = 'none';
      });
    }

    function enviar() {
      var comentario = txt.value.trim();
      if (!comentario) { msgSet(I18N.errorTexto, true); txt.focus(); return; }
      var token = (window.STT && typeof window.STT.getToken === 'function') ? window.STT.getToken() : null;
      if (!token) { msgSet(I18N.errorSesion, true); return; }

      btnEnviar.disabled = true;
      btnEnviar.textContent = I18N.enviando;
      msgSet('');

      var fd = new FormData();
      fd.append('comentario', comentario);
      fd.append('url', location.href);
      if (blobCaptura) fd.append('image', blobCaptura, 'captura.jpg');

      fetch(apiBase() + 'statetty/reportes', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: fd
      }).then(function (r) {
        return r.json().then(function (d) { return { status: r.status, data: d }; });
      }).then(function (res) {
        if (res.status === 401) { msgSet(I18N.errorSesion, true); return; }
        if (!res.data || res.data.ok !== true) { msgSet(I18N.errorEnvio, true); return; }
        msgSet(I18N.ok);
        txt.value = '';
        setTimeout(function () {
          abierto = false;
          panel.style.display = 'none';
          fab.style.display = 'flex';
          msgSet('');
        }, 1600);
      }).catch(function () {
        msgSet(I18N.errorEnvio, true);
      }).finally(function () {
        btnEnviar.disabled = false;
        btnEnviar.textContent = I18N.enviar;
      });
    }
  }

  function evaluar() {
    if (!window.STT) return;
    if (usuarioLogueado()) {
      if (!document.getElementById('stt-fab-reporte')) crearUI();
      var fab = document.getElementById('stt-fab-reporte');
      var panel = document.getElementById('stt-panel-reporte');
      if (fab && panel && panel.style.display !== 'block') fab.style.display = 'flex';
    }
  }

  function ocultar() {
    var fab = document.getElementById('stt-fab-reporte');
    var panel = document.getElementById('stt-panel-reporte');
    if (fab) fab.style.display = 'none';
    if (panel) panel.style.display = 'none';
  }

  function alCambiarSesion() {
    if (usuarioLogueado()) evaluar(); else ocultar();
  }

  if (window.STT && window.STT.ready && typeof window.STT.ready.then === 'function') {
    window.STT.ready.then(alCambiarSesion);
  }
  document.addEventListener('statetty:auth-ready', alCambiarSesion);
  document.addEventListener('statetty:key-ready', alCambiarSesion);
  // Si auth.js aún no definió STT (orden de scripts), reintentar breve.
  var intentos = 0;
  var timer = setInterval(function () {
    intentos++;
    if (window.STT || intentos > 40) { clearInterval(timer); evaluar(); }
  }, 250);
})();
