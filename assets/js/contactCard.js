/* ============================================================
   STTContact — tarjeta de contacto + handoff de WhatsApp.
   Compartida por la página /inmueble/<id> (tarjeta embebida) y por
   el toolbox <dialog> de statetty.com. Este archivo NO ejecuta nada
   solo: lo usa quien la monta.

     STTContact.mountInto(el, { inmuebleId, contacto })  // embebida
     STTContact.open({ titulo, mensaje, intent })        // flotante

   La identidad sale de window.STT.getKey() (assets/js/user.js) tras
   await window.STT.ready. Si la página no carga user.js, se envía
   null y el servidor trata la consulta como anónima.
   ============================================================ */
(function () {
  'use strict';

  var FEEDCLICK_ENDPOINT = 'statetty/feedclick';
  var FEEDCLICK_FALLBACK_URL = 'https://api.statetty.com/api/statetty/feedclick';
  var STORAGE_KEY = 'statetty_contact_form';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var PHONE_CODES = [
    ['+591', 'Bolivia'], ['+51', 'Perú'], ['+54', 'Argentina'], ['+55', 'Brasil'],
    ['+56', 'Chile'], ['+57', 'Colombia'], ['+1', 'US/Canadá'], ['+34', 'España'],
    ['+52', 'México'], ['+598', 'Uruguay'], ['+58', 'Venezuela']
  ];

  // ---------- utilidades de página (solo modo embebido) ----------

  function getPropertyId() {
    // 1) Versión cacheada: inyectado server-side (window.STATETTY_INMUEBLE_ID).
    if (window.STATETTY_INMUEBLE_ID) return window.STATETTY_INMUEBLE_ID;
    // 2) Compat con la versión dinámica anterior (?_id= o ?p=).
    var params = new URLSearchParams(window.location.search);
    var fromQuery = params.get('_id') || params.get('p');
    if (fromQuery) return fromQuery;
    // 3) Fallback: parsear /inmueble/<_id> de la ruta.
    var m = window.location.pathname.match(/\/inmueble\/([^\/?#]+)\/?$/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  function primerNombre(nombre) {
    var n = (nombre || '').trim();
    return n ? n.split(/\s+/)[0] : '';
  }

  // ---------- markup ----------

  function cardMarkup() {
    var opts = PHONE_CODES.map(function (p) {
      return '<option value="' + p[0] + '">' + p[0] + ' (' + p[1] + ')</option>';
    }).join('');

    return '' +
      '<h3 class="inm-contact-card-title"></h3>' +
      '<textarea class="inm-form-textarea" id="inm-msg" rows="4"></textarea>' +
      '<input type="text" class="inm-form-input" id="inm-name" placeholder="Tu nombre *" required>' +
      '<input type="email" class="inm-form-input" id="inm-email" placeholder="Tu email *" required>' +
      '<div class="inm-form-phone-group">' +
        '<select class="inm-form-select" id="inm-phone-code">' + opts + '</select>' +
        '<input type="tel" class="inm-form-input" id="inm-phone" placeholder="Tu celular *" required>' +
      '</div>' +
      '<label class="inm-form-checkbox" id="inm-privacy-label">' +
        '<input type="checkbox" id="inm-privacy" required>' +
        '<span>Aceptar la <a href="https://statetty.com/politica_de_privacidad.html" target="_blank" rel="noopener">política de privacidad</a> y las <a href="https://statetty.com/terminos_y_condiciones.html" target="_blank" rel="noopener">condiciones generales</a></span>' +
      '</label>' +
      '<label class="inm-form-checkbox" id="inm-newsletter-label">' +
        '<input type="checkbox" id="inm-newsletter" checked>' +
        '<span>Acepto recibir correos con opciones parecidas y otras oportunidades</span>' +
      '</label>' +
      '<label class="inm-form-checkbox" id="inm-esasesor-label">' +
        '<input type="checkbox" id="inm-esasesor">' +
        '<span>Soy asesor inmobiliario</span>' +
      '</label>' +
      '<button class="inm-form-submit" id="inm-submit" type="button">Contactar al asesor</button>' +
      '<div id="inm-form-status" class="inm-form-status" aria-live="polite"></div>' +
      '<button class="stt-tb-wa" id="inm-wa" type="button">Abrir WhatsApp</button>';
  }

  function renderCard(root) {
    root.classList.add('inm-contact-card');
    root.innerHTML = cardMarkup();
    var q = function (sel) { return root.querySelector(sel); };
    return {
      title: q('.inm-contact-card-title'),
      msg: q('#inm-msg'),
      name: q('#inm-name'),
      email: q('#inm-email'),
      phoneCode: q('#inm-phone-code'),
      phone: q('#inm-phone'),
      privacy: q('#inm-privacy'),
      privacyLabel: q('#inm-privacy-label'),
      newsletter: q('#inm-newsletter'),
      esAsesor: q('#inm-esasesor'),
      submit: q('#inm-submit'),
      status: q('#inm-form-status'),
      wa: q('#inm-wa')
    };
  }

  // ---------- texto de contacto a captadores (solo embebido + sesión con hasTime) ----------

  /**
   * Mismo template que mapa.js / mapa_link_directo.js: saludo al captador del
   * inmueble, presentación del visitante (nombre + agencia) y datos del inmueble.
   * `c` viene del mount (inmueble.ejs): { titulo, url, agente }.
   */
  function textoContactoCaptador(u, c) {
    var agente = String(c.agente || '')
      .replace(/\b(lic|ing|arq|dr|dra)\.?\s+/gi, '')
      .replace(/[^\p{L}\s'-]/gu, '')
      .trim();
    var nombreCortito = agente ? ' ' + agente.split(/\s+/)[0] : '';
    var na = ((u.first_name || '') + ' ' + (u.last_name || '')).trim();
    var ag = (u.agencia || '').trim();
    var soyNa = na ? ' ' + na : '';
    var deAg = ag ? ' de ' + ag : '';
    var sc = (na || ag) ? ' te escribe, ' : '';
    return 'Hola' + nombreCortito + ',' + soyNa + deAg + sc +
      'un gusto saludarte. Por favor, podría enviarme información sobre este inmueble, ' +
      'en caso de que siga disponible (' + (c.titulo || '') + ')\n\n' +
      'Gracias de antemano\n\nlink: ' + (c.url || '') + '\n\n' +
      'Mensaje creado con Statetty https://statetty.com';
  }

  // ---------- texto de WhatsApp por intención ----------

  function buildTextoWhatsapp(datos) {
    var intent = datos.intent || 'inmueble';
    var nombre = datos.nombre || '';
    var mensaje = datos.mensaje || '';
    var agentNameCorto = datos.agentNameCorto || '';
    var paginaUrl = datos.paginaUrl || '';

    var lineas = [];
    lineas.push(agentNameCorto ? ('Hola ' + agentNameCorto + ',') : 'Hola,');

    if (intent === 'buscar') {
      lineas.push('Me llamo ' + primerNombre(nombre) + ' y necesito que me ayudes a encontrar un inmueble.');
    } else if (intent === 'publicar') {
      lineas.push('Me llamo ' + primerNombre(nombre) + ' y quiero publicar un inmueble.');
    } else {
      lineas.push('Soy ' + nombre + ' y estoy interesado en este inmueble.');
    }

    if (mensaje) {
      lineas.push('');
      lineas.push(mensaje);
    }

    lineas.push('');
    lineas.push('\nEste mensaje fué enviado desde ' + paginaUrl);

    return lineas.join('\n');
  }

  // ---------- persistencia del formulario ----------

  function loadSavedForm() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('STATETTY: no se pudo leer el formulario guardado', err);
      return null;
    }
  }

  function saveForm(data) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn('STATETTY: no se pudo guardar el formulario', err);
    }
  }

  // ---------- libphonenumber-js (import dinámico, opcional) ----------

  var _phoneLib = null;
  function loadPhoneLib() {
    if (_phoneLib) return _phoneLib;
    _phoneLib = import('https://unpkg.com/libphonenumber-js@1.13.8/index.js')
      .then(function (m) { return m; })
      .catch(function () {
        console.warn('STATETTY: no se pudo cargar libphonenumber-js, fallback a validación básica');
        _phoneLib = null;
        return null;
      });
    return _phoneLib;
  }

  function buildFeedclickUrl() {
    var base = window.STATETTY_CONFIG ? STATETTY_CONFIG.WS_API_BASE : '';
    return base ? (base + FEEDCLICK_ENDPOINT) : FEEDCLICK_FALLBACK_URL;
  }

  async function getPublicKey() {
    try {
      if (window.STT && window.STT.ready) await window.STT.ready;
      return (window.STT && window.STT.getKey && window.STT.getKey()) || null;
    } catch (err) {
      return null;
    }
  }

  // ---------- prefill desde el usuario autenticado ----------

  /**
   * Espera a que exista window.STT antes de leer la sesión. auth.js/user.js van
   * con defer y el montaje de la tarjeta puede correr antes (inmueble.ejs monta
   * en un inline durante el parseo): sin esto, `await STT.ready` ni siquiera se
   * evalúa y la tarjeta se rinde como anónima. Los defer corren apenas termina
   * el parseo, así que 5 s alcanzan; si la página no trae auth, se sigue como
   * anónimo (igual que antes).
   */
  async function esperarSTT() {
    for (var i = 0; i < 100 && !(window.STT && window.STT.ready); i++) {
      await new Promise(function (r) { setTimeout(r, 50); });
    }
    if (window.STT && window.STT.ready) await window.STT.ready;
  }

  /**
   * Parte un teléfono con prefijo internacional en {code, number} para el par
   * #inm-phone-code (select) + #inm-phone (input). `waphone` se guarda completo
   * (ej. '+59178447518'), así que hay que separar el prefijo del resto.
   * Si el prefijo no está en PHONE_CODES se usa '+591' y el número tal cual.
   */
  function partirTelefono(tel) {
    var raw = String(tel || '').trim();
    // Normaliza a '+' inicial: los códigos de PHONE_CODES lo traen y así el
    // match no depende de cómo se haya guardado el waphone.
    var out = { code: PHONE_CODES[0][0], number: raw.indexOf('+') === 0 ? raw : '+' + raw };
    // Compara contra PHONE_CODES con el '+' incluido (los códigos lo traen), y
    // recién al final se saca. El único par donde un código es prefijo de otro
    // es +58/+598, y +598 está antes en PHONE_CODES, así que gana el largo.
    for (var i = 0; i < PHONE_CODES.length; i++) {
      var code = PHONE_CODES[i][0];
      if (out.number.indexOf(code) === 0) {
        out.code = code;
        out.number = out.number.slice(code.length);
        break;
      }
    }
    out.number = out.number.replace(/^\s*\+/, '').replace(/^\s+/, '');
    return out;
  }

  /**
   * Si hay un usuario Statetty autenticado, pasa nombre / email / teléfono /
   * "soy asesor" a solo lectura y los llena con sus datos. Da igual si tiene
   * tiempo de uso disponible (hasTime): si hay sesión, se usa la sesión.
   * Los campos sin dato quedan editables: bloqueados y vacíos romperían el
   * `required` y dejarían el formulario inservible.
   */
  async function aplicarUsuarioSesion(el, estado) {
    try {
      await esperarSTT();
    } catch (err) { /* sin user.js/auth.js en la página: se sigue como anónimo */ }

    var u = window.STT && window.STT.getUsuario ? window.STT.getUsuario() : null;
    estado.usuario = u || null;
    estado.msgCaptador = false;

    // Se corre en cada apertura del toolbox: primero se desarma el estado de la
    // corrida anterior, así un logout con la página abierta no deja la tarjeta
    // bloqueada con los datos de la cuenta que se acaba de cerrar.
    [el.name, el.email, el.phone].forEach(function (n) { n.readOnly = false; });
    el.phoneCode.disabled = false;
    if (el.esAsesor) { el.esAsesor.disabled = false; el.esAsesor.checked = false; }

    if (!u) return;

    var nombre = (u.name || u.buddyName || '').trim();
    var email = (u.email || '').trim();

    if (nombre) { el.name.value = nombre; el.name.readOnly = true; }
    if (email) { el.email.value = email; el.email.readOnly = true; }

    var waphone = (u.waphone || '').trim();
    if (waphone) {
      var tel = partirTelefono(waphone);
      el.phoneCode.value = tel.code;
      el.phoneCode.disabled = true;
      el.phone.value = tel.number;
      el.phone.readOnly = true;
    }

    if (el.esAsesor) {
      el.esAsesor.checked = true;
      el.esAsesor.disabled = true;
    }

    console.log('[Statetty] [info] aplicarUsuarioSesion: prefill desde cuenta, esAsesor forzado a true');

    // Texto de contacto a captadores: solo en la tarjeta embebida de /inmueble/<id>
    // y solo con sesión + hasTime. Pisa lo restaurado de localStorage (arriba).
    if (estado.mode === 'embed' && estado.contacto && u.hasTime) {
      estado.msgCaptador = true;
      el.msg.value = textoContactoCaptador(u, estado.contacto);
      console.log('[Statetty] [info] aplicarUsuarioSesion: inm-msg con texto de contacto a captador');
    }
  }

  // ---------- montaje ----------

  function activar(root, cfg) {
    var el = renderCard(root);

    var estado = {
      mode: cfg.mode || 'embed',
      inmuebleId: cfg.inmuebleId || null,
      intent: cfg.intent || 'inmueble',
      paginaUrl: cfg.paginaUrl || '',
      contacto: cfg.contacto || null,
      msgCaptador: false,
      usuario: null
    };

    el.title.textContent = cfg.titulo || 'Pregunta al asesor';
    if (cfg.mensaje !== undefined) el.msg.value = cfg.mensaje;
    else if (estado.mode === 'embed') el.msg.value = '¿Podría enviarme información?';

    function setFieldInvalid(node, invalid) {
      if (node) node.classList.toggle('error', invalid);
    }

    function setFormStatus(type, msg, linkUrl) {
      var s = el.status;
      s.classList.remove('show', 'success', 'warning', 'error');
      s.textContent = '';
      if (!msg) return;
      s.textContent = msg;
      s.classList.add('show', type);
      if (linkUrl) {
        var a = document.createElement('a');
        a.href = linkUrl;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = 'Ir al registro';
        s.appendChild(document.createTextNode(' '));
        s.appendChild(a);
      }
    }

    var saved = loadSavedForm();
    if (saved) {
      if (saved.email) el.email.value = saved.email;
      if (saved.phoneCode) el.phoneCode.value = saved.phoneCode;
      if (saved.phone) el.phone.value = saved.phone;
      if (saved.nombre) el.name.value = saved.nombre;
      if (saved.mensaje && cfg.mensaje === undefined) el.msg.value = saved.mensaje;
      if (el.newsletter && saved.newsletter === false) el.newsletter.checked = false;
      if (el.esAsesor && saved.esAsesor === true) el.esAsesor.checked = true;
    }

    // Después del restore: si hay sesión, la cuenta pisa lo guardado localmente.
    aplicarUsuarioSesion(el, estado);

    function persistCurrentValues() {
      // El texto de captador (sesión + hasTime) se regenera en cada carga: no se persiste.
      if (estado.msgCaptador) return;
      // Los campos que vinieron de la cuenta quedaron en solo lectura/deshabilitados:
      // se guardan vacíos para que el próximo visitante anónimo del mismo navegador
      // no herede los datos de la cuenta. Lo que escribió el visitante sí se guarda.
      saveForm({
        email: el.email.readOnly ? '' : el.email.value.trim(),
        phoneCode: el.phoneCode.disabled ? '' : el.phoneCode.value,
        phone: el.phone.readOnly ? '' : el.phone.value.trim(),
        nombre: el.name.readOnly ? '' : el.name.value.trim(),
        mensaje: el.msg.value,
        newsletter: !!(el.newsletter && el.newsletter.checked),
        esAsesor: (el.esAsesor && el.esAsesor.disabled) ? false : !!(el.esAsesor && el.esAsesor.checked)
      });
    }

    [el.msg, el.email, el.phoneCode, el.phone, el.name].forEach(function (node) {
      if (!node) return;
      var evt = (node.tagName === 'SELECT') ? 'change' : 'input';
      node.addEventListener(evt, persistCurrentValues);
    });
    if (el.newsletter) el.newsletter.addEventListener('change', persistCurrentValues);
    if (el.esAsesor) el.esAsesor.addEventListener('change', persistCurrentValues);

    el.name.addEventListener('input', function () { setFieldInvalid(el.name, false); });
    el.email.addEventListener('input', function () { setFieldInvalid(el.email, false); });
    el.phone.addEventListener('input', function () { setFieldInvalid(el.phone, false); });
    if (el.privacy) el.privacy.addEventListener('change', function () {
      if (el.privacy.checked) setFieldInvalid(el.privacyLabel, false);
    });

    el.submit.addEventListener('click', async function () {
      var mensaje = (el.msg.value || '').trim();
      var email = (el.email.value || '').trim();
      var phone = (el.phone.value || '').trim();
      var nombre = (el.name.value || '').trim();
      var privacyOk = !!(el.privacy && el.privacy.checked);
      var newsletterOk = !!(el.newsletter && el.newsletter.checked);
      var fullPhone = el.phoneCode.value + phone;

      var valid = true;
      var faltantes = [];

      setFormStatus();
      setFieldInvalid(el.name, false);
      setFieldInvalid(el.email, false);
      setFieldInvalid(el.phone, false);
      setFieldInvalid(el.privacyLabel, false);

      if (!nombre) {
        setFieldInvalid(el.name, true);
        faltantes.push('tu nombre');
        valid = false;
      }
      if (!email || !EMAIL_RE.test(email)) {
        setFieldInvalid(el.email, true);
        faltantes.push(email ? 'un email válido' : 'tu email');
        valid = false;
      }
      if (!phone) {
        setFieldInvalid(el.phone, true);
        faltantes.push('tu celular');
        valid = false;
      } else {
        var lib = await loadPhoneLib();
        if (lib && lib.isValidPhoneNumber && !lib.isValidPhoneNumber(fullPhone)) {
          setFieldInvalid(el.phone, true);
          faltantes.push('un número de celular válido');
          valid = false;
        }
      }
      if (!privacyOk) {
        setFieldInvalid(el.privacyLabel, true);
        valid = false;
      }

      if (!valid) {
        var partes = [];
        if (faltantes.length) partes.push('Por favor completá ' + faltantes.join(', ') + '.');
        if (!privacyOk) partes.push('Aceptá la política de privacidad y las condiciones generales.');
        setFormStatus('error', partes.join(' '));
        return;
      }

      var inmuebleId = estado.inmuebleId || (estado.mode === 'embed' ? getPropertyId() : null);
      if (estado.mode === 'embed' && !inmuebleId) {
        setFormStatus('error', 'No se pudo identificar el inmueble. Por favor recargá la página e intentá nuevamente.');
        return;
      }

      var paginaUrl = estado.paginaUrl ||
        (estado.mode === 'embed' ? 'https://statetty.com/inmueble/' + encodeURIComponent(inmuebleId) : (window.location.origin + window.location.pathname));

      persistCurrentValues();

      var url = buildFeedclickUrl();
      console.log('STATETTY: enviando consulta a', url);

      var opts = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': '1'
        },
        body: JSON.stringify({
          inmueble_id: inmuebleId || null,
          mensaje: mensaje,
          email: email,
          phone: fullPhone,
          nombre: nombre,
          newsletter: newsletterOk,
          esAsesor: !!(el.esAsesor && el.esAsesor.checked),
          publicKey: await getPublicKey()
        })
      };

      var controller, timeout;
      if (typeof AbortController !== 'undefined') {
        controller = new AbortController();
        timeout = setTimeout(function () { controller.abort(); }, 20000);
        opts.signal = controller.signal;
      }

      var originalText = el.submit.textContent;
      el.submit.disabled = true;
      el.submit.textContent = 'Enviando…';
      el.wa.classList.remove('show');

      try {
        var res = await fetch(url, opts);
        if (opts.signal) clearTimeout(timeout);
        var body = await res.json();

        if (res.ok && body.ok === true) {
          var payload = body.data || {};
          var agentName = payload.agentName || '';
          var agentNameCorto = agentName.trim().split(/\s+/)[0] || '';
          var agentPhon = payload.agentPhon != null ? String(payload.agentPhon) : '';

          // El servidor decide a quién va el lead. agentPhon viene vacío cuando no hay
          // destino (pool vacío, o el visitante es asesor y hay que orientarlo): en ese
          // caso no hay handoff de WhatsApp, solo el mensaje de estado.
          if (agentPhon) {
            // Con el texto de captador el mensaje ya trae saludo, link y cierre
            // (igual que mapa.js): se manda tal cual, sin envolverlo de nuevo.
            var textoWhatsapp = estado.msgCaptador ? mensaje : buildTextoWhatsapp({
              intent: estado.intent,
              agentNameCorto: agentNameCorto,
              nombre: nombre,
              mensaje: mensaje,
              paginaUrl: paginaUrl
            });

            var agentPhonLimpio = agentPhon.replace(/^\+/, '').replace(/\D/g, '');
            var waUrl = 'https://wa.me/' + agentPhonLimpio + '?text=' + encodeURIComponent(textoWhatsapp);

            // window.open() después de un await suele caer en el bloqueador de popups;
            // el botón queda como plan B (y en modo embebido nunca se muestra).
            el.wa.onclick = function () { window.open(waUrl, '_blank'); };
            if (estado.mode === 'toolbox') el.wa.classList.add('show');
            window.open(waUrl, '_blank');
          }

          console.log('STATETTY: feedclick ruta', payload.ruta);
          setFormStatus('success', payload.mensaje || 'Consulta enviada.', payload.registro || null);
        } else {
          console.warn('STATETTY: feedclick error', body);
          setFormStatus('error', 'No pudimos enviar tu consulta. Por favor intentá nuevamente en unos minutos.');
        }
      } catch (err) {
        if (opts.signal) clearTimeout(timeout);
        console.warn('STATETTY: feedclick fetch error', err);
        if (err.name === 'AbortError') {
          setFormStatus('error', 'El servidor tardó demasiado en responder. Por favor intentá nuevamente.');
        } else {
          setFormStatus('error', 'Ocurrió un error de conexión. Por favor intentá nuevamente.');
        }
      } finally {
        el.submit.disabled = false;
        el.submit.textContent = originalText;
      }
    });

    return {
      el: el,
      setContext: function (ctx) {
        if (!ctx) return;
        if (ctx.titulo !== undefined) el.title.textContent = ctx.titulo;
        if (ctx.mensaje !== undefined) el.msg.value = ctx.mensaje;
        if (ctx.intent !== undefined) estado.intent = ctx.intent;
        estado.paginaUrl = ctx.paginaUrl || (window.location.origin + window.location.pathname);
        setFormStatus();
        el.wa.classList.remove('show');
        el.wa.onclick = null;
        // El toolbox reutiliza la instancia entre aperturas (dlg.__sttInst): sin
        // esto un login o logout con la página abierta no se refleja al reabrir.
        aplicarUsuarioSesion(el, estado);
      }
    };
  }

  // ---------- API pública ----------

  function mountInto(root, opts) {
    if (!root) return null;
    opts = opts || {};
    return activar(root, {
      mode: 'embed',
      inmuebleId: opts.inmuebleId || null,
      contacto: opts.contacto || null,
      intent: 'inmueble'
    });
  }

  function open(opts) {
    opts = opts || {};

    var dlg = document.getElementById('stt-tb');
    if (!dlg) {
      // El include de Jekyll ya trae el <dialog>; esto es solo por si falta.
      dlg = document.createElement('dialog');
      dlg.id = 'stt-tb';
      dlg.className = 'stt-tb';
      var mount = document.createElement('div');
      mount.className = 'inm-contact-card';
      mount.id = 'stt-tb-mount';
      dlg.appendChild(mount);
      var close = document.createElement('button');
      close.type = 'button';
      close.className = 'stt-tb-close';
      close.setAttribute('aria-label', 'Cerrar');
      close.innerHTML = '&times;';
      dlg.appendChild(close);
      document.body.appendChild(dlg);
    }

    if (!dlg.__sttInst) {
      var mountEl = dlg.querySelector('#stt-tb-mount');
      dlg.__sttInst = activar(mountEl, { mode: 'toolbox' });
      var closeBtn = dlg.querySelector('.stt-tb-close');
      if (closeBtn) closeBtn.addEventListener('click', function () { dlg.close(); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    }

    dlg.__sttInst.setContext({
      titulo: opts.titulo || 'Contactar a un asesor',
      mensaje: opts.mensaje || '',
      intent: opts.intent || 'buscar'
    });

    if (typeof dlg.showModal === 'function') {
      if (!dlg.open) dlg.showModal();
    } else {
      dlg.setAttribute('open', '');
    }
    return dlg;
  }

  window.STTContact = { mountInto: mountInto, open: open };

  // Disparadores declarativos: cualquier [data-stt-intent] abre el toolbox.
  // Así el markup (header + /como-funciona/) no necesita un init por página.
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-stt-intent]');
    if (!t) return;
    e.preventDefault();
    open({
      intent: t.getAttribute('data-stt-intent'),
      mensaje: t.getAttribute('data-stt-msg') || '',
      titulo: t.getAttribute('data-stt-titulo') || undefined
    });
  });
})();
