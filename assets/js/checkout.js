// Toolbox transversal "Adquirir tiempo" (Statetty).
// Invocable desde cualquier página que cargue este script: window.STTCheckout.open().
// Requiere sesión autenticada (window.STT). Usa <dialog> nativo (sin dependencias).
(function () {
  'use strict';

  var DIALOG_ID = 'stt-checkout-dlg';
  var STYLE_ID = 'stt-checkout-styles';
  var API_BASE = (window.STATTETY_CONFIG && window.STATTETY_CONFIG.WS_API_BASE) ||
    'https://api.statetty.com/api/';
  var TIPOS = ['image/jpeg', 'image/png'];
  var ESTADOS = { LOADING: 'loading', READY: 'ready', ERROR: 'error' };

  var planes = [];
  var planSel = null;
  var estado = ESTADOS.LOADING;
  var archivo = null;

  // -------------------------------------------------- utilidades

  function fechatxt(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      var ff = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
      var hf = d.toLocaleTimeString('es-ES', { hour: 'numeric', minute: 'numeric' });
      return ff + ' a las ' + hf;
    } catch (_) { return String(iso); }
  }

  function esc(html) {
    return String(html == null ? '' : html)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function inyectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      '#' + DIALOG_ID + '{position:fixed;inset:0;margin:auto;padding:0;border:0;border-radius:14px;' +
      'width:min(560px,94vw);' +
      'max-height:88vh;overflow:auto;box-shadow:0 16px 50px rgba(0,0,0,.28);' +
      'font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}' +
      '#' + DIALOG_ID + '::backdrop{background:rgba(0,0,0,.45);}' +
      '.stt-co-header{display:flex;align-items:center;justify-content:space-between;' +
      'padding:14px 18px;border-bottom:1px solid #ececec;position:sticky;top:0;' +
      'background:#fff;z-index:2;}' +
      '.stt-co-title{margin:0;font-size:1.15rem;font-weight:700;}' +
      '.stt-co-close{border:0;background:none;font-size:1.4rem;line-height:1;cursor:pointer;' +
      'color:#444;padding:4px 8px;border-radius:8px;}' +
      '.stt-co-close:hover{background:#f2f2f2;}' +
      '.stt-co-body{padding:16px 18px;}' +
      '.stt-co-sec{margin:0 0 22px;}' +
      '.stt-co-sec label.stt-co-sec-tit{display:block;font-weight:700;margin-bottom:4px;}' +
      '.stt-co-plans{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;}' +
      '.stt-co-plan{border:1px solid #d9d9d9;border-radius:10px;padding:10px;cursor:pointer;' +
      'text-align:center;background:#fff;transition:border-color .15s;}' +
      '.stt-co-plan:hover{border-color:#0a7de0;}' +
      '.stt-co-plan.sel{border-color:#0a7de0;background:#eef6ff;box-shadow:0 0 0 1px #0a7de0;}' +
      '.stt-co-plan .p-dias{font-weight:700;font-size:1.05rem;}' +
      '.stt-co-plan .p-monto{color:#0a7de0;font-weight:600;}' +
      '.stt-co-plan .p-cuentas{font-size:.8rem;color:#777;}' +
      '.stt-co-detail{margin-top:14px;border-top:1px dashed #ddd;padding-top:12px;}' +
      '.stt-co-qr{text-align:center;margin:12px 0;}' +
      '.stt-co-qr img{max-width:240px;border-radius:10px;border:1px solid #eee;display:inline-block;}' +
      '.stt-co-instr{background:#f7f9fb;border:1px solid #e6ecf2;border-radius:10px;' +
      'padding:12px 14px;margin-top:10px;font-size:.92rem;line-height:1.55;}' +
      '.stt-co-instr ol{margin:0;padding-left:18px;}' +
      '.stt-co-fecha{font-weight:600;color:#0a7de0;}' +
      '.stt-co-drop{border:2px dashed #c3ccd6;border-radius:10px;padding:22px;text-align:center;' +
      'color:#666;cursor:pointer;transition:border-color .15s;background:#fafbfc;}' +
      '.stt-co-drop.over{border-color:#0a7de0;color:#0a7de0;background:#eef6ff;}' +
      '.stt-co-drop input{display:none;}' +
      '.stt-co-prev{display:none;margin-top:10px;text-align:center;}' +
      '.stt-co-prev img{max-height:160px;border-radius:8px;border:1px solid #eee;max-width:100%;}' +
      '.stt-co-btn{margin-top:12px;width:100%;padding:11px;border:0;border-radius:10px;' +
      'background:#0a7de0;color:#fff;font:inherit;font-weight:600;cursor:pointer;}' +
      '.stt-co-btn:disabled{background:#b9c6d2;cursor:not-allowed;}' +
      '.stt-co-btn .spin{display:none;}' +
      '.stt-co-btn.busy .spin{display:inline-block;}' +
      '.stt-co-result{margin-top:12px;border-radius:10px;padding:12px 14px;font-size:.95rem;line-height:1.5;}' +
      '.stt-co-result.ok{background:#e7f6ec;border:1px solid #bfe3cc;color:#1d7a3f;}' +
      '.stt-co-result.err{background:#fdecea;border:1px solid #f2c4c0;color:#b03a2e;}' +
      '.stt-co-note{font-size:.82rem;color:#888;margin-top:8px;}';
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  // -------------------------------------------------- DOM

  function asegurarDialog() {
    var dlg = document.getElementById(DIALOG_ID);
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.id = DIALOG_ID;
    dlg.setAttribute('aria-labelledby', 'stt-co-title');
    document.body.appendChild(dlg);

    var header = document.createElement('div');
    header.className = 'stt-co-header';
    var h = document.createElement('h2');
    h.id = 'stt-co-title';
    h.className = 'stt-co-title';
    h.textContent = 'Adquirir tiempo';
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'stt-co-close';
    close.setAttribute('aria-label', 'Cerrar');
    close.innerHTML = '&times;';
    close.addEventListener('click', function () { dlg.close(); });
    header.appendChild(h);
    header.appendChild(close);

    var body = document.createElement('div');
    body.className = 'stt-co-body';
    body.id = 'stt-co-body';
    dlg.appendChild(header);
    dlg.appendChild(body);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    return dlg;
  }

  // -------------------------------------------------- sección 1: planes

  function renderSeccionPlanes() {
    return '' +
      '<div class="stt-co-sec">' +
      '  <label class="stt-co-sec-tit">1. Elige tu paquete y paga con QR</label>' +
      '  <div id="stt-co-plans" class="stt-co-plans">' +
      (estado === ESTADOS.LOADING
        ? '<div style="grid-column:1/-1;color:#777">Cargando tarifas…</div>'
        : estado === ESTADOS.ERROR
          ? '<div style="grid-column:1/-1;color:#b03a2e">No se pudieron cargar las tarifas.</div>'
          : planes.map(function (p) {
            return '<div class="stt-co-plan" data-cod="' + esc(p.cod) + '" data-dias="' + esc(p.dias) +
              '" data-monto="' + esc(p.monto) + '" data-qr="' + esc(p.qr || '') + '">' +
              '<div class="p-dias">' + esc(p.dias) + ' días</div>' +
              '<div class="p-monto">Bs. ' + esc(p.monto) + '</div>' +
              '<div class="p-cuentas">' + esc(p.cuentas) + ' cuenta(s)</div>' +
              '</div>';
          }).join('')) +
      '  </div>' +
      '  <div id="stt-co-detail" class="stt-co-detail"></div>' +
      '  <div id="stt-co-instr" class="stt-co-instr">' +
      '    <div><b>¿Cómo pagar?</b></div>' +
      '    <ol>' +
      '      <li>Copia el QR de pago o ábrelo para escanearlo.</li>' +
      '      <li>Elige tu paquete y paga con QR (selecciónalo arriba).</li>' +
      '      <li>Después de pagar, copia la imagen del <b>recibo de pago</b>.</li>' +
      '      <li>Pega o envía la imagen del recibo en la sección 2 y el sistema la verificará para habilitar tu tiempo.</li>' +
      '    </ol>' +
      '  </div>' +
      '</div>';
  }

  function calcDetalle(p) {
    var u = window.STT && window.STT.usuario;
    var ahora = new Date();
    var informe = { valorDia: (p.monto / p.dias).toFixed(2) };
    var tieneTiempo = !!(u && u.hasTime && u.cutoffDate && new Date(u.cutoffDate) > ahora);
    if (tieneTiempo) {
      var base = new Date(u.cutoffDate);
      var suma = new Date(base.getTime() + p.dias * 24 * 60 * 60 * 1000);
      informe.modo = 'suma';
      informe.texto =
        'Tienes tiempo hasta <span class="stt-co-fecha">' + esc(fechatxt(base.toISOString())) + '</span>. ' +
        'Al adquirir este paquete se sumarán <b>' + esc(p.dias) + ' días</b> a tu tiempo actual. ' +
        'Nueva fecha de corte estimada: <span class="stt-co-fecha">' + esc(fechatxt(suma.toISOString())) + '</span>.';
    } else {
      informe.modo = 'desde_verificacion';
      informe.texto =
        'Al verificar este comprobante, tus <b>' + esc(p.dias) + ' días</b> se contarán <b>desde el momento en que se compruebe el pago</b>. ' +
        'Si lo verificas hoy, tu tiempo vencería aproximadamente el <span class="stt-co-fecha">' +
        esc(fechatxt(nowMasDias(p.dias))) + '</span>.';
    }
    informe.texto += ' <div class="stt-co-note">Valor del paquete: <b>Bs. ' + esc(p.monto) +
      '</b> ≈ <b>Bs. ' + posDia(p) + ' por día</b>.</div>';
    return informe;
  }

  function nowMasDias(dias) {
    var d = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
    return d.toISOString();
  }

  function posDia(p) {
    return (p.monto / p.dias).toFixed(2);
  }

  function renderDetalle(p) {
    var det = calcDetalle(p);
    return '' +
      '<div class="stt-co-qr"><img src="' + esc(p.qr) + '" alt="QR de pago para ' + esc(p.dias) + ' días"></div>' +
      '<div>' + det.texto + '</div>';
  }

  function bindSeccionPlanes(body) {
    var cont = body.querySelector('#stt-co-plans');
    if (!cont) return;
    cont.addEventListener('click', function (e) {
      var el = e.target.closest('.stt-co-plan');
      if (!el) return;
      cont.querySelectorAll('.stt-co-plan').forEach(function (n) { n.classList.remove('sel'); });
      el.classList.add('sel');
      planSel = {
        cod: el.getAttribute('data-cod'),
        dias: el.getAttribute('data-dias'),
        monto: el.getAttribute('data-monto'),
        qr: el.getAttribute('data-qr')
      };
      if (!planSel.qr) planSel.qr = planQR(planSel.cod);
      actualizaBtn();
      body.querySelector('#stt-co-detail').innerHTML = renderDetalle(planSel);
    });
  }

  function planQR(cod) {
    for (var i = 0; i < planes.length; i++) if (String(planes[i].cod) === String(cod)) return planes[i].qr;
    return '';
  }

  // -------------------------------------------------- sección 2: verificación

  function renderSeccionVerificar() {
    return '' +
      '<div class="stt-co-sec">' +
      '  <label class="stt-co-sec-tit">2. Verifica tu comprobante de pago</label>' +
      '  <div id="stt-co-drop" class="stt-co-drop">' +
      '    <input type="file" id="stt-co-file" accept="image/jpeg,image/png,.jpg,.jpeg,.png">' +
      '    <div>Arrastra la imagen del recibo aquí o haz clic para seleccionarla</div>' +
      '    <div class="stt-co-note">Solo JPG o PNG</div>' +
      '  </div>' +
      '  <div class="stt-co-prev" id="stt-co-prev"></div>' +
      '  <button type="button" class="stt-co-btn" id="stt-co-verify" disabled>' +
      '    <span class="spin">⏳&nbsp;</span>Verificar comprobante' +
      '  </button>' +
      '  <div id="stt-co-result"></div>' +
      '</div>';
  }

  function bindSeccionVerificar(body) {
    var drop = body.querySelector('#stt-co-drop');
    var file = body.querySelector('#stt-co-file');
    var btn = body.querySelector('#stt-co-verify');

    drop.addEventListener('click', function () { file.click(); });
    file.addEventListener('change', function () { tomarArchivo(file.files && file.files[0]); });

    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); });
    });
    drop.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) tomarArchivo(f);
    });

    btn.addEventListener('click', verificarRecibo);

    function tomarArchivo(f) {
      if (!f) return;
      if (!TIPOS.includes(f.type)) {
        mostrarResultado(false, 'Solo se aceptan imágenes JPG o PNG.');
        return;
      }
      archivo = f;
      var prev = body.querySelector('#stt-co-prev');
      var url = URL.createObjectURL(f);
      prev.innerHTML = '<img src="' + url + '" alt="Vista previa del comprobante">';
      prev.style.display = 'block';
      actualizaBtn();
    }
  }

  function actualizaBtn() {
    var body = document.getElementById('stt-co-body');
    if (!body) return;
    var btn = body.querySelector('#stt-co-verify');
    if (btn) btn.disabled = !archivo;
  }

  function mostrarResultado(ok, mensaje) {
    var body = document.getElementById('stt-co-body');
    if (!body) return;
    var r = body.querySelector('#stt-co-result');
    if (!r) return;
    r.className = 'stt-co-result ' + (ok ? 'ok' : 'err');
    r.innerHTML = mensaje;
  }

  async function verificarRecibo() {
    if (!archivo) return;
    var token = window.STT && typeof window.STT.getToken === 'function' ? window.STT.getToken() : null;
    if (!token) {
      mostrarResultado(false, 'Debes iniciar sesión para verificar un comprobante.');
      return;
    }
    var body = document.getElementById('stt-co-body');
    var btn = body && body.querySelector('#stt-co-verify');
    if (btn) { btn.disabled = true; btn.classList.add('busy'); }
    mostrarResultado(false, 'Verificando…');

    var fd = new FormData();
    fd.append('image', archivo);
    if (planSel) {
      fd.append('planCod', planSel.cod);
      fd.append('diasSel', planSel.dias);
      fd.append('montoSel', planSel.monto);
    }

    try {
      var res = await fetch(API_BASE + 'statetty/pagos/verificar-recibo', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: fd
      });
      var data = await res.json();
      if (data && data.ok) {
        actualizarUsuario(data);
        mostrarResultado(true,
          '<div style="font-size:1.05rem;font-weight:700;margin-bottom:6px">¡Gracias por usar Statetty! ❤</div>' +
          'Comprobante verificado. Hemos agregado <b>' + esc(data.dias || '') + ' día(s)</b> a tu cuenta.<br>' +
          'Nueva fecha de corte: <b>' + esc(fechatxt(data.fechaCorteISO)) + '</b>.');
      } else if (data && data.duplicado) {
        mostrarResultado(false, 'Este comprobante ya fue procesado anteriormente. Si crees que es un error, contacta por WhatsApp.');
      } else {
        mostrarResultado(false, esc((data && data.mensaje) || 'No se pudo validar el comprobante. Prueba con una imagen más nítida o contacta por WhatsApp.'));
      }
    } catch (e) {
      mostrarResultado(false, 'Error de conexión al verificar el comprobante. Intenta de nuevo.');
    } finally {
      if (btn) btn.classList.remove('busy');
    }
  }

  // -------------------------------------------------- estado global

  function actualizarUsuario(data) {
    try {
      var stt = window.STT;
      if (!stt || !stt.usuario) return;
      if (data.fechaCorteISO) {
        stt.usuario.cutoffDate = data.fechaCorteISO;
        stt.usuario.hasTime = true;
      }
      if (data.dias && stt.usuario.dias !== undefined) {
        var base = new Date(stt.usuario.cutoffDate || Date.now());
        stt.usuario.dias = Math.max(1, Math.round((base - new Date()) / (24 * 60 * 60 * 1000)));
      }
      if (document.dispatchEvent) {
        document.dispatchEvent(new CustomEvent('statetty:user-updated', { detail: { usuario: stt.usuario } }));
      }
    } catch (e) {
      console.log('[Statetty] [error] actualizarUsuario:', e && e.message);
    }
  }

  // -------------------------------------------------- carga de planes

  async function cargarPlanes() {
    estado = ESTADOS.LOADING;
    var body = document.getElementById('stt-co-body');
    if (body) body.querySelector('#stt-co-plans').innerHTML = '<div style="grid-column:1/-1;color:#777">Cargando tarifas…</div>';
    try {
      var token = window.STT && typeof window.STT.getToken === 'function' ? window.STT.getToken() : null;
      var headers = token ? { Authorization: 'Bearer ' + token } : undefined;
      var res = await fetch(API_BASE + 'statetty/planes', { headers: headers });
      var data = await res.json();
      if (data && data.ok && Array.isArray(data.planes)) {
        planes = data.planes;
        estado = ESTADOS.READY;
      } else {
        planes = [];
        estado = ESTADOS.ERROR;
      }
    } catch (e) {
      planes = [];
      estado = ESTADOS.ERROR;
    }
    if (body) {
      var cont = body.querySelector('#stt-co-plans');
      cont.innerHTML = estado === ESTADOS.READY
        ? planes.map(function (p) {
          return '<div class="stt-co-plan" data-cod="' + esc(p.cod) + '" data-dias="' + esc(p.dias) +
            '" data-monto="' + esc(p.monto) + '" data-qr="' + esc(p.qr || '') + '">' +
            '<div class="p-dias">' + esc(p.dias) + ' días</div>' +
            '<div class="p-monto">Bs. ' + esc(p.monto) + '</div>' +
            '<div class="p-cuentas">' + esc(p.cuentas) + ' cuenta(s)</div>' +
            '</div>';
        }).join('')
        : '<div style="grid-column:1/-1;color:#b03a2e">No se pudieron cargar las tarifas. Recarga la página o inténtalo más tarde.</div>';
    }
  }

  // -------------------------------------------------- API pública

  function open() {
    inyectStyles();
    var dlg = asegurarDialog();
    var body = dlg.querySelector('#stt-co-body');

    if (body) body.innerHTML = renderSeccionPlanes() + renderSeccionVerificar();
    bindSeccionPlanes(dlg.querySelector('#stt-co-body'));
    bindSeccionVerificar(dlg.querySelector('#stt-co-body'));
    actualizaBtn();

    // Requisito: solo invocable con cuenta autenticada.
    var ready = window.STT && window.STT.ready ? window.STT.ready : Promise.resolve();
    ready.then(function () {
      var u = window.STT && window.STT.usuario;
      if (!u) {
        mostrarResultado(false, 'Debes iniciar sesión para adquirir tiempo.');
        return;
      }
      if (typeof dlg.showModal === 'function') {
        if (!dlg.open) dlg.showModal();
      } else {
        dlg.setAttribute('open', '');
      }
      if (planes.length === 0) cargarPlanes();
    });
  }

  function close() {
    var dlg = document.getElementById(DIALOG_ID);
    if (dlg && dlg.close) { try { dlg.close(); } catch (_) {} }
  }

  window.STTCheckout = { open: open, close: close };

  // Disparador declarativo: <a href="#" data-stt-checkout> abre la toolbox.
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-stt-checkout]');
    if (!t) return;
    e.preventDefault();
    open();
  });
})();