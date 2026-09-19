(function () {
  'use strict';

  var API = (window.STATETTY_CONFIG && STATETTY_CONFIG.WS_API_BASE) || 'https://api.statetty.com/api/';
  var SUPER_ADMIN = 'asosab@gmail.com';
  var key = null;
  var usuario = null;
  var page = 1;
  var limite = 20;
  var q = '';
  var booted = false;

  var $ = function (id) { return document.getElementById(id); };

  var normEmail = function (v) { return String(v || '').trim().toLowerCase(); };

  function showPage(id) {
    ['pg-cargando', 'pg-error', 'pg-app'].forEach(function (p) {
      $(p).classList.toggle('visible', p === id);
    });
  }

  function showMsg(tipo, texto) {
    var box = $('msgBox');
    if (!texto) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="msg ' + tipo + '">' + String(texto).replace(/</g, '&lt;') + '</div>';
  }

  function apiCall(method, path, body) {
    var headers = { 'Content-Type': 'application/json' };
    if (key) headers['Authorization'] = 'Bearer ' + key;
    return fetch(API + 'shortlink' + path, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().then(function (d) { return { status: r.status, data: d }; });
    });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var terminoEditar = null;
  var editarId = null;
  var editarAction = null;

  function copyText(t) {
    t = String(t || '');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(t);
    }
    var ta = document.createElement('textarea');
    ta.value = t;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    ta.remove();
    return Promise.resolve(true);
  }

  function buildRow(item) {
    var urlCorta = 'https://statetty.com/i/' + encodeURIComponent(item.codigo);
    var tr = document.createElement('tr');

    var cCodigo = document.createElement('td');
    cCodigo.innerHTML = '<div class="codigo">' + esc(item.codigo) + '</div>';
    tr.appendChild(cCodigo);

    var cUrl = document.createElement('td');
    cUrl.innerHTML = '<div class="url">' + esc(item.url) + '</div>';
    tr.appendChild(cUrl);

    var cTitulo = document.createElement('td');
    cTitulo.innerHTML = esc(item.titulo || '—') + (item.tituloOrigen ? ' <span style="font-size:.7rem;color:#8b98a3">(' + esc(item.tituloOrigen) + ')</span>' : '');
    tr.appendChild(cTitulo);

    var cClicks = document.createElement('td');
    cClicks.textContent = item.clicks || 0;
    tr.appendChild(cClicks);

    var cEstado = document.createElement('td');
    cEstado.innerHTML = item.activo ? '<span class="ok-badge">activo</span>' : '<span class="off-badge">inactivo</span>';
    tr.appendChild(cEstado);

    var cAcciones = document.createElement('td');
    cAcciones.className = 'acciones';
    var acciones = [
      { label: 'Copiar', fn: function () { copyText(urlCorta).then(function () { showMsg('ok', 'Copiado: ' + urlCorta); }); } },
      { label: 'Abrir', fn: function () { window.open(urlCorta, '_blank'); } },
      { label: 'Título', fn: function () {
        apiCall('POST', '/' + encodeURIComponent(item.codigo) + '/meta').then(function (r) {
          showMsg(r.status === 200 ? 'ok' : 'err', r.data && r.data.error || 'Título refrescado');
          cargar();
        });
      } },
      { label: item.activo ? 'Desactivar' : 'Activar', fn: function () {
        apiCall('PUT', '/' + encodeURIComponent(item.codigo), { activo: !item.activo }).then(function (r) {
          showMsg(r.status === 200 ? 'ok' : 'err', r.data && r.data.error || 'Estado actualizado');
          cargar();
        });
      } },
      { label: 'Editar', fn: function () { $('edit-codigo').value = item.codigo; $('edit-url').value = item.url; $('edit-titulo').value = item.titulo || ''; $('edit-modal').style.display = 'flex'; editarId = item.codigo; } },
      { label: 'Borrar', cls: 'danger-link', fn: function () {
        if (!confirm('Eliminar el enlace /' + item.codigo + '?')) return;
        apiCall('DELETE', '/' + encodeURIComponent(item.codigo)).then(function () { showMsg('ok', 'Eliminado'); cargar(); });
      } }
    ];
    acciones.forEach(function (a) {
      var el = document.createElement('a');
      el.href = '#';
      el.textContent = a.label;
      if (a.cls) el.className = a.cls;
      el.addEventListener('click', function (e) { e.preventDefault(); a.fn(); });
      cAcciones.appendChild(el);
    });
    tr.appendChild(cAcciones);

    return tr;
  }

  function renderList(res) {
    var rows = $('rows');
    rows.innerHTML = '';
    (res.items || []).forEach(function (item) { rows.appendChild(buildRow(item)); });
    if (!(res.items || []).length) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="6" style="color:#8b98a3;text-align:center;">Sin resultados</td>';
      rows.appendChild(tr);
    }
    var total = res.total || 0;
    var pages = Math.max(1, Math.ceil(total / res.limite));
    $('pager').innerHTML =
      '<button class="secondary" data-pg="prev" ' + (page <= 1 ? 'disabled' : '') + '>← Anterior</button>' +
      '<span>Página ' + page + ' de ' + pages + ' (' + total + ' enlaces)</span>' +
      '<button class="secondary" data-pg="next" ' + (page >= pages ? 'disabled' : '') + '>Siguiente →</button>';
    $('pager').querySelectorAll('[data-pg]').forEach(function (b) {
      b.addEventListener('click', function () {
        page += b.dataset.pg === 'next' ? 1 : -1;
        cargar();
      });
    });
  }

  function cargar() {
    return apiCall('GET', '/buscar?q=' + encodeURIComponent(q) + '&pagina=' + page + '&limite=' + limite)
      .then(function (r) {
        if (r.status === 200 && r.data.ok) { renderList(r.data); showMsg('', ''); }
        else { renderList({ items: [], total: 0, limite: limite }); showMsg('err', r.data && r.data.error || 'No se pudo cargar.'); }
      });
  }

  function openError(titulo, texto) {
    $('errTitulo').textContent = titulo;
    $('errTexto').textContent = texto;
    showPage('pg-error');
  }

  function start() {
    if (booted) return;
    booted = true;

    key = window.STT && window.STT.getKey ? window.STT.getKey() : null;
    usuario = window.STT && window.STT.getUsuario ? window.STT.getUsuario() : null;

    if (!key) {
      openError('Ingresar', 'Necesitás iniciar sesión para administrar los enlaces cortos.');
      $('errTitulo').insertAdjacentHTML('afterend', '<p><button id="btn-login">Iniciar sesión</button></p>');
      $('btn-login').addEventListener('click', function () {
        if (window.STT && window.STT.startLogin) window.STT.startLogin();
      });
      return;
    }

    var esJwt = key.split('.').length === 3;
    if (!esJwt) {
      openError('Acceso no autorizado', 'La sesión activa no es una cuenta Buddy válida.');
      return;
    }

    if (usuario && normEmail(usuario.email) !== SUPER_ADMIN) {
      openError('Acceso no autorizado', 'Solo el superusuario puede administrar los acortadores.');
      return;
    }

    showPage('pg-app');
    bind();
    cargar();
  }

  function bind() {
    $('form-crear').addEventListener('submit', function (e) {
      e.preventDefault();
      var url = $('f-url').value.trim();
      var codigo = $('f-codigo').value.trim();
      var titulo = $('f-titulo').value.trim();
      if (!url) { showMsg('err', 'Ingresá una URL de destino.'); return; }
      apiCall('POST', '/crear', { url: url, codigo: codigo || undefined, titulo: titulo || undefined, origen: 'buddy' }).then(function (r) {
        if (r.status === 200 && r.data.ok) {
          var msg = r.data.creado ? 'Creado: https://statetty.com/i/' + r.data.codigo
            : (r.data.coincideCodigo ? 'Ya existía: https://statetty.com/i/' + r.data.codigo : 'Esa URL ya existe con otro código: /' + r.data.codigo);
          showMsg('ok', msg + ' <a href="https://statetty.com/i/' + encodeURIComponent(r.data.codigo) + '" target="_blank">abrir</a>');
          page = 1;
          q = '';
          $('b-q').value = '';
          cargar();
        } else {
          showMsg('err', r.data && r.data.error || 'No se pudo crear.');
        }
      });
    });

    var avisoCodigo = $('f-codigo-msg');
    var debounce = null;
    $('f-codigo').addEventListener('input', function () {
      var c = this.value.trim();
      clearTimeout(debounce);
      if (!c) { avisoCodigo.textContent = ''; return; }
      debounce = setTimeout(function () {
        apiCall('GET', '/disponible/' + encodeURIComponent(c)).then(function (r) {
          var d = (r.data && r.data) || {};
          avisoCodigo.textContent = d.disponible === true ? 'Nombre libre ✓' : (d.disponible === false ? 'Ya existe ✗' : '');
          avisoCodigo.style.color = d.disponible === true ? '#1d8a4e' : '#e04f5f';
        });
      }, 350);
    });

    $('b-q').addEventListener('input', function () {
      q = this.value.trim();
      page = 1;
      cargar();
    });

    $('edit-cancel').addEventListener('click', function () { $('edit-modal').style.display = 'none'; });
    $('edit-save').addEventListener('click', function () {
      if (!editarId) return;
      var body = {
        titulo: $('edit-titulo').value.trim() || null
      };
      var nuevo = $('edit-codigo').value.trim();
      var nuevaUrl = $('edit-url').value.trim();
      if (nuevo && nuevo !== editarId) { body.nuevoCodigo = nuevo; }
      if (nuevaUrl) { body.url = nuevaUrl; }
      apiCall('PUT', '/' + encodeURIComponent(editarId), body).then(function (r) {
        $('edit-modal').style.display = 'none';
        showMsg(r.status === 200 ? 'ok' : 'err', r.data && r.data.error || 'Actualizado');
        cargar();
      });
    });
  }

  window.addEventListener('statetty:auth-ready', start);
  if (window.STT && window.STT.ready) {
    window.STT.ready.then(function () {
      setTimeout(start, 300);
    });
  } else {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 300); });
  }
})();