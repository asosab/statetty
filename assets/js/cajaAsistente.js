/* cajaAsistente.js — asistente del buscador del mapa (#caja).
 * Heurística local: búsqueda obvia de inmueble → flujo normal; lo demás va a
 * POST /api/autorespondedor/web. Si el motor no matchea regla → búsqueda
 * normal (fallback garantizado). Respuestas = globos bajo #caja + comandos
 * sobre la página (checkout, resaltar, navegar, buscar, globo anclado).
 */
(function () {
  'use strict';
  var API = (window.STATETTY_CONFIG && STATETTY_CONFIG.WS_API_BASE) || 'https://api.statetty.com/api/';
  var TIPOS = ['casa', 'departamento', 'depto', 'terreno', 'oficina', 'tienda', 'almacen', 'galpon', 'edificio', 'inmueble', 'habitacion', 'cuarto', 'propiedad'];
  var NEGOCIO = ['alquiler', 'venta', 'anticretico', 'arriendo', 'comprar', 'compra'];
  var pasar = false, timer = null;

  function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  function pareceBusqueda(t) {
    t = ' ' + norm(t) + ' ';
    var nTipo = TIPOS.some(function (w) { return t.indexOf(' ' + w) > -1; });
    var nNeg = NEGOCIO.some(function (w) { return t.indexOf(w) > -1; });
    var nNum = /\d/.test(t);
    var nZona = / (en|zona|barrio|cerca|equipetrol|urubo|centro|norte|sur|este|oeste|avenida|av\.|calle) /i.test(t);
    return (nTipo && (nNeg || nNum || nZona)) || (nNeg && (nZona || nNum));
  }

  function css() {
    if (document.getElementById('caja-asst-css')) return;
    var st = document.createElement('style'); st.id = 'caja-asst-css';
    st.textContent =
      '.caja-globos{display:flex;flex-direction:column;gap:6px;margin-top:6px}' +
      '.caja-globo{position:relative;background:#074f66;color:#fff;border-radius:12px 12px 12px 2px;padding:9px 30px 9px 12px;font:14px/1.4 Lato,Arial,sans-serif;box-shadow:0 3px 10px rgba(0,0,0,.25);animation:cajaIn .25s ease-out}' +
      '.caja-globo button{position:absolute;top:4px;right:6px;background:none;border:none;color:#bfe4f0;font-size:15px;cursor:pointer;padding:2px;line-height:1}' +
      '.caja-globo.anclado{background:#e8a33d;color:#074f66;border-radius:12px}' +
      '.caja-globo.anclado:before{content:"";position:absolute;top:-7px;left:22px;border:7px solid transparent;border-bottom-color:#e8a33d;border-top:0}' +
      '@keyframes cajaIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1}}' +
      '.caja-resalte{outline:3px solid #e8a33d !important;outline-offset:3px;border-radius:6px;animation:cajaPulso 1s ease-in-out 3}' +
      '@keyframes cajaPulso{50%{outline-offset:7px;outline-color:#17baef}}';
    document.head.appendChild(st);
  }

  function globo(txt, ancladoA) {
    var caja = document.getElementById('caja'); if (!caja) return;
    var cont = caja.querySelector('.caja-globos');
    if (!cont) { cont = document.createElement('div'); cont.className = 'caja-globos'; caja.appendChild(cont); }
    var g = document.createElement('div');
    g.className = 'caja-globo' + (ancladoA ? ' anclado' : '');
    g.textContent = txt;
    var x = document.createElement('button'); x.textContent = '✕'; x.setAttribute('aria-label', 'Cerrar');
    x.addEventListener('click', function () { g.remove(); });
    g.appendChild(x);
    if (ancladoA) {
      var el = document.querySelector(ancladoA);
      if (el) { el.scrollIntoView({block: 'center', behavior: 'smooth'}); el.insertAdjacentElement('afterend', g); }
      else { cont.appendChild(g); }
    } else { cont.appendChild(g); }
    setTimeout(function () { if (g.parentNode) g.remove(); }, 20000);
  }

  function resaltar(sel) {
    try {
      var el = document.querySelector(sel); if (!el) return;
      el.scrollIntoView({block: 'center', behavior: 'smooth'});
      el.classList.add('caja-resalte');
      setTimeout(function () { el.classList.remove('caja-resalte'); }, 3500);
    } catch (e) {}
  }

  function ejecutar(cmds, form, input) {
    (cmds || []).forEach(function (c) {
      try {
        switch (c.tipo) {
          case 'abrir_checkout': if (window.STTCheckout && STTCheckout.open) STTCheckout.open(); break;
          case 'navegar': if (/^\//.test(c.param || '')) location.href = c.param; break;
          case 'buscar': input.value = c.param || input.value; pasar = true; form.dispatchEvent(new Event('submit', {cancelable: true})); break;
          case 'resaltar': resaltar(c.param); break;
          case 'globo': globo('👆', c.param); resaltar(c.param); break;
        }
      } catch (e) {}
    });
  }

  function enviarAR(texto, form, input) {
    var u = null;
    try { if (window.STT && STT.getUsuario) u = STT.getUsuario(); } catch (e) {}
    if (estado()) estado().textContent = '…';
    fetch(API + 'autorespondedor/web', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        texto: texto,
        senderId: u && (u.id || u.publicKey || u._id) || undefined,
        telefono: u && u.waphone || undefined,
        senderTxt: u && (u.first_name || u.nombre) || undefined,
        esAdmin: !!(u && (u.isAdmin || u.role === 'admin')),
      }),
    }).then(function (r) { return r.json(); }).then(function (r) {
      if (estado()) estado().textContent = '';
      var d = r && r.data || {};
      var respondio = (d.replies && d.replies.length) || (d.comandos && d.comandos.length);
      if (!respondio && !d.suprimido) { // sin regla → búsqueda normal
        pasar = true; form.dispatchEvent(new Event('submit', {cancelable: true})); return;
      }
      (d.replies || []).forEach(function (rep) { globo(rep.message); });
      ejecutar(d.comandos, form, input);
    }).catch(function () {
      if (estado()) estado().textContent = '';
      pasar = true; form.dispatchEvent(new Event('submit', {cancelable: true})); // offline → busca igual
    });
  }

  function estado() { return document.getElementById('estado'); }

  function init() {
    var form = document.getElementById('form-buscar');
    var input = document.getElementById('texto');
    if (!form || !input) return;
    css();
    form.addEventListener('submit', function (e) {
      if (pasar) { pasar = false; return; } // re-despachado por nosotros → flujo normal
      var texto = (input.value || '').trim();
      if (!texto || pareceBusqueda(texto)) { return; } // búsqueda obvia → no interceptar
      e.preventDefault(); e.stopImmediatePropagation();
      enviarAR(texto, form, input);
    }, true);
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();
