/**
 * ARBAT — Buddy/modules/says/sources/agenda.js
 * ---------------------------------------------------------------------------
 * Lee la agenda pública de Google Calendar de arbat (arbat.archery@gmail.com)
 * y genera, en memoria, un arreglo de mensajes (strings) para que el futuro
 * sistema de mensajería del sitio se los muestre a los visitantes.
 *
 * No requiere frameworks. Fuente autónoma del módulo /says. Buddy decide si se carga mediante
 * modules/says/config.js; esta fuente no conoce el sitio anfitrión.
 *
 * IMPORTANTE — por qué esto NO lee el .ics público directamente:
 * El feed .ics de Google Calendar (el feed .ics público)
 * no envía cabeceras CORS, así que un fetch() a calendar.google.com desde el
 * navegador es bloqueado por el navegador mismo (no es un límite de este
 * código, es una restricción del lado de Google). El único camino 100% del
 * lado del cliente, sin backend propio, es la API REST de Google Calendar
 * (www.googleapis.com/calendar/v3/...), que sí responde con CORS cuando la
 * llamada trae una API key.
 *
 * Uso típico desde otro script:
 *   <script>window.BuddyAgendaConfig.apiKey = 'AIza...';</script>
 *   <script src="/Buddy/modules/says/sources/agenda.js" defer></script>
 *   <script>
 *     window.BuddyInformSources.agenda.obtenerMensajes().then(function (mensajes) {
 *       // mensajes es un array de strings, ya ordenados de lo más
 *       // próximo a lo más lejano en el tiempo. Puede llegar vacío
 *       // (sin agenda disponible ahora mismo, o sin API key configurada).
 *     });
 *   </script>
 * ---------------------------------------------------------------------------
 */
(function (window, document) {
  'use strict';

  // ---------------------------------------------------------------------
  // Configuración
  // ---------------------------------------------------------------------
  var CONFIG = {
    enabled: true,

    // Calendario público configurado para Buddy: tanto las citas reservadas (turnos ocupados) como los
    // eventos especiales (torneos, clínicas) viven en un único calendario.
    calendarId: "arbat.archery@gmail.com",

    // La API key NO vive en este archivo (no es secreta, pero conviene
    // poder rotarla sin tocar código versionado). Se define ANTES de cargar
    // este script con: window.BuddyAgendaConfig.apiKey = 'AIza...'
    // Debe estar restringida por referrer HTTP a los dominios del sitio.
    // Sin key configurada, getMensajes() resuelve un
    // array vacío y avisa por consola — no rompe la página.
    apiKey: '',

    timezone: "America/La_Paz",

    // Cuántos días hacia adelante se consultan en cada llamada a la API.
    horizonteDias: 31,

    // Capacidad por turno configurada para la agenda de Buddy.
    capacidadPorTurno: 8,

    // Horarios configurados en window.BuddyAgendaConfig.horarios.
    horarios: [{"dias":"Lunes, miércoles y viernes","turnos":["16:00","18:00"],"duracion":"2 horas"},{"dias":"Sábados","turnos":["09:00–12:00","14:30–17:00"]}],

    // Un evento del calendario se trata como "evento especial" (mensaje
    // tipo 2) cuando su título contiene alguna de estas palabras. Las reservas
    // de la agenda de citas de Google se identifican exclusivamente por el
    // título automático "Agenda tu entrenamiento". Los demás eventos se
    // ignoran para el cálculo de ocupación.
    palabrasClaveEventoEspecial: [
      'competencia', 'torneo', 'campeonato', 'clínica', 'clinica', 'evento especial'
    ]
  };
  // La API key la proporciona el sitio anfitrión. Los demás valores proceden
  // de la configuración real migrada desde la agenda original.
  if (window.BuddyAgendaConfig) {
    if (window.BuddyAgendaConfig.enabled !== undefined) CONFIG.enabled = window.BuddyAgendaConfig.enabled !== false;
    if (window.BuddyAgendaConfig.apiKey !== undefined) CONFIG.apiKey = window.BuddyAgendaConfig.apiKey;
    if (window.BuddyAgendaConfig.calendarId) CONFIG.calendarId = window.BuddyAgendaConfig.calendarId;
    if (window.BuddyAgendaConfig.timezone) CONFIG.timezone = window.BuddyAgendaConfig.timezone;
    if (window.BuddyAgendaConfig.horizonteDias != null) CONFIG.horizonteDias = window.BuddyAgendaConfig.horizonteDias;
    if (window.BuddyAgendaConfig.capacidadPorTurno != null) CONFIG.capacidadPorTurno = window.BuddyAgendaConfig.capacidadPorTurno;
    if (window.BuddyAgendaConfig.horarios) CONFIG.horarios = window.BuddyAgendaConfig.horarios;
    if (window.BuddyAgendaConfig.palabrasClaveEventoEspecial) CONFIG.palabrasClaveEventoEspecial = window.BuddyAgendaConfig.palabrasClaveEventoEspecial;
  }


  function sincronizarConfiguracionBuddy() {
    var externa = window.BuddyAgendaConfig;
    if (!externa) return;
    if (externa.enabled !== undefined) CONFIG.enabled = externa.enabled !== false;
    if (externa.apiKey !== undefined) CONFIG.apiKey = externa.apiKey || '';
    if (externa.calendarId) CONFIG.calendarId = externa.calendarId;
    if (externa.timezone) CONFIG.timezone = externa.timezone;
    if (externa.horizonteDias != null) CONFIG.horizonteDias = externa.horizonteDias;
    if (externa.capacidadPorTurno != null) CONFIG.capacidadPorTurno = externa.capacidadPorTurno;
    if (externa.horarios) CONFIG.horarios = externa.horarios;
    if (externa.palabrasClaveEventoEspecial) CONFIG.palabrasClaveEventoEspecial = externa.palabrasClaveEventoEspecial;
  }


  // ---------------------------------------------------------------------
  // Utilidades de fecha/hora en huso horario de Bolivia
  // ---------------------------------------------------------------------
  // Bolivia no tiene horario de verano (UTC-4 todo el año), así que sumar
  // milisegundos fijos para avanzar "un día" es seguro acá.
  var UN_DIA_MS = 24 * 60 * 60 * 1000;

  var DIAS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MESES_ES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  var DIA_EN_A_INDICE = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  var DIAS_ES_A_INDICE = {
    domingo: 0, lunes: 1, martes: 2, miércoles: 3, miercoles: 3,
    jueves: 4, viernes: 5, sábado: 6, sabado: 6
  };

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  // Devuelve los componentes de una fecha TAL COMO SE VEN en el huso
  // horario de Bolivia, sin importar en qué huso esté el navegador de quien
  // visita el sitio (crítico: un visitante desde otro país no debería ver
  // "esta tarde" calculado con su propia hora local).
  function partesBolivia(fecha) {
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: CONFIG.timezone,
      weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
    var partes = {};
    fmt.formatToParts(fecha).forEach(function (p) { partes[p.type] = p.value; });
    // Algunos motores devuelven "24" en vez de "00" para medianoche con
    // hour12:false.
    var hora = partes.hour === '24' ? 0 : parseInt(partes.hour, 10);
    return {
      diaSemana: DIA_EN_A_INDICE[partes.weekday],
      anio: parseInt(partes.year, 10),
      mes: parseInt(partes.month, 10), // 1-12
      dia: parseInt(partes.day, 10),
      hora: hora,
      minuto: parseInt(partes.minute, 10)
    };
  }

  function mismaFecha(a, b) {
    return a.anio === b.anio && a.mes === b.mes && a.dia === b.dia;
  }

  function horaAMinutos(horaStr) {
    var partes = horaStr.split(':');
    return parseInt(partes[0], 10) * 60 + (partes[1] ? parseInt(partes[1], 10) : 0);
  }

  function sumarHoras(horaStr, horas) {
    var totalMin = horaAMinutos(horaStr) + Math.round(horas * 60);
    totalMin = ((totalMin % (24 * 60)) + 24 * 60) % (24 * 60);
    return pad2(Math.floor(totalMin / 60)) + ':' + pad2(totalMin % 60);
  }

  // Primera fecha (a partir de "ahora", buscando hacia adelante dentro del
  // horizonte configurado) cuyo día de la semana en Bolivia coincide con el
  // buscado. incluirHoy=false empieza a buscar desde mañana.
  function proximaFechaConDiaSemana(ahora, diaSemanaObjetivo, incluirHoy) {
    var desde = incluirHoy ? 0 : 1;
    for (var i = desde; i <= CONFIG.horizonteDias; i++) {
      var candidata = new Date(ahora.getTime() + i * UN_DIA_MS);
      if (partesBolivia(candidata).diaSemana === diaSemanaObjetivo) return candidata;
    }
    return null;
  }

  // ---------------------------------------------------------------------
  // Horarios: de la forma cruda de la configuración interna de Buddy (texto libre en "dias", más
  // turnos como "16:00" o "09:00–12:00") a algo que el resto del script
  // pueda usar directamente.
  // ---------------------------------------------------------------------
  function normalizarHorarios(horariosCrudos) {
    return (horariosCrudos || []).map(function (bloque) {
      var textoDias = (bloque.dias || '').toLowerCase();
      var diasSemana = [];
      Object.keys(DIAS_ES_A_INDICE).forEach(function (nombre) {
        if (textoDias.indexOf(nombre) !== -1) {
          var indice = DIAS_ES_A_INDICE[nombre];
          if (diasSemana.indexOf(indice) === -1) diasSemana.push(indice);
        }
      });

      var duracionHoras = null;
      if (bloque.duracion) {
        var coincidencia = /(\d+(?:[.,]\d+)?)/.exec(bloque.duracion);
        if (coincidencia) duracionHoras = parseFloat(coincidencia[1].replace(',', '.'));
      }

      var turnos = (bloque.turnos || []).map(function (turnoStr) {
        // Separa tanto "-" como "–" (guion largo, el que usa el sábado en
        // la configuración interna de Buddy) para no depender de cuál tipeen.
        var partes = turnoStr.split(/[–-]/).map(function (s) { return s.trim(); });
        var inicio = partes[0];
        var fin = partes[1] || (duracionHoras ? sumarHoras(inicio, duracionHoras) : sumarHoras(inicio, 2));
        return { inicio: inicio, fin: fin };
      });

      return { diasSemana: diasSemana, turnos: turnos };
    });
  }

  // ---------------------------------------------------------------------
  // Google Calendar API
  // ---------------------------------------------------------------------
  function construirUrlEventos(ahora) {
    var timeMin = ahora.toISOString();
    var timeMax = new Date(ahora.getTime() + CONFIG.horizonteDias * UN_DIA_MS).toISOString();
    var base = 'https://www.googleapis.com/calendar/v3/calendars/' +
      encodeURIComponent(CONFIG.calendarId) + '/events';
    var params = [
      'key=' + encodeURIComponent(CONFIG.apiKey),
      'timeMin=' + encodeURIComponent(timeMin),
      'timeMax=' + encodeURIComponent(timeMax),
      'singleEvents=true',
      'orderBy=startTime',
      'maxResults=250'
    ];
    return base + '?' + params.join('&');
  }

  // Devuelve un array de eventos si la consulta se hizo con éxito (aunque
  // esté vacío: un calendario sin nada agendado es información real), o
  // `null` si no se pudo consultar (sin API key, error de red, respuesta no
  // válida). Esa diferencia importa: getMensajes() usa `null` como señal de
  // "no sé si hay espacio" y en ese caso NO arma el mensaje de
  // disponibilidad, en vez de asumir que no hay reservas y afirmar algo que
  // no se pudo confirmar.
  function obtenerEventos(ahora) {
    sincronizarConfiguracionBuddy();
    if (!CONFIG.apiKey || CONFIG.apiKey === '') {
      if (window.console) {
        console.warn(
          '[Buddy Agenda] Falta configurar window.BuddyAgendaConfig.apiKey (API key ' +
          'de Google Calendar). No se generarán mensajes de agenda.'
        );
      }
      return Promise.resolve(null);
    }

    return fetch(construirUrlEventos(ahora))
      .then(function (respuesta) {
        if (!respuesta.ok) {
          if (window.console) {
            console.warn('[Buddy Agenda] Google Calendar API respondió ' + respuesta.status + '.');
          }
          return null;
        }
        return respuesta.json();
      })
      .then(function (datos) {
        if (datos === null) return null;
        return (datos.items || []).filter(function (evento) {
          return evento.status !== 'cancelled';
        });
      })
      .catch(function (error) {
        if (window.console) {
          console.warn('[Buddy Agenda] No se pudo leer la agenda de Google Calendar.', error);
        }
        return null;
      });
  }

  function esReserva(evento) {
    var titulo = (evento.summary || '').trim();
    return /^Agenda tu entrenamiento(?:\s*\([^)]*\))?$/i.test(titulo);
  }

  function esEventoEspecial(evento) {
    var titulo = (evento.summary || '').toLowerCase();
    return CONFIG.palabrasClaveEventoEspecial.some(function (palabra) {
      return titulo.indexOf(palabra) !== -1;
    });
  }

  // ---------------------------------------------------------------------
  // Mensajes tipo 1 — disponibilidad de turnos regulares
  // ---------------------------------------------------------------------
  function contarReservasEnTurno(eventosRegulares, fechaObjetivo, turno) {
    var inicioMin = horaAMinutos(turno.inicio);
    var finMin = horaAMinutos(turno.fin);
    var contador = 0;

    eventosRegulares.forEach(function (evento) {
      var inicioCrudo = evento.start && (evento.start.dateTime || evento.start.date);
      if (!inicioCrudo) return;
      var partesEvento = partesBolivia(new Date(inicioCrudo));
      if (!mismaFecha(partesEvento, fechaObjetivo)) return;
      var minutosEvento = partesEvento.hora * 60 + partesEvento.minuto;
      if (minutosEvento >= inicioMin && minutosEvento < finMin) contador++;
    });

    return contador;
  }

  // Hay espacio en un bloque de horario (weekday) en una fecha dada si al
  // menos uno de sus turnos no empezó todavía y no llegó al cupo.
  function hayEspacioEnBloque(eventosRegulares, fechaObjetivo, bloque, minutosDesde) {
    return bloque.turnos.some(function (turno) {
      if (minutosDesde !== null && horaAMinutos(turno.inicio) <= minutosDesde) return false;
      return contarReservasEnTurno(eventosRegulares, fechaObjetivo, turno) < CONFIG.capacidadPorTurno;
    });
  }

  // Busca la próxima fecha con espacio para UN día de la semana puntual
  // (no para todo el bloque). Esto es lo que permite que lunes, miércoles y
  // viernes generen cada uno su propio mensaje aunque compartan turnos y
  // vivan en el mismo bloque de horariosNormalizados.
  function proximaFechaConEspacioParaDia(eventosRegulares, ahora, diaSemanaObjetivo, turnos, minutosAhora) {
    for (var i = 0; i <= CONFIG.horizonteDias; i++) {
      var candidata = new Date(ahora.getTime() + i * UN_DIA_MS);
      var partesCandidata = partesBolivia(candidata);
      if (partesCandidata.diaSemana !== diaSemanaObjetivo) continue;

      var minutosDesde = (i === 0) ? minutosAhora : null;
      if (hayEspacioEnBloque(eventosRegulares, partesCandidata, { turnos: turnos }, minutosDesde)) {
        return { fecha: candidata, partes: partesCandidata, esHoy: i === 0 };
      }
    }
    return null;
  }

  function mensajesDisponibilidad(eventosRegulares, horariosNormalizados, ahora) {
    var resultados = [];
    var partesAhora = partesBolivia(ahora);
    var minutosAhora = partesAhora.hora * 60 + partesAhora.minuto;

    horariosNormalizados.forEach(function (bloque) {
      bloque.diasSemana.forEach(function (diaSemanaObjetivo) {
        var proxima = proximaFechaConEspacioParaDia(
          eventosRegulares, ahora, diaSemanaObjetivo, bloque.turnos, minutosAhora
        );
        if (!proxima) return;

        var mensaje;
        if (proxima.esHoy) {
          mensaje = proxima.partes.diaSemana === 6
            ? 'Aún quedan espacios disponibles en el entrenamiento de este sábado, recuerda reservar con tiempo'
            : 'Aún quedan espacios disponibles para el entrenamiento de esta tarde, recuerda reservar con tiempo';
        } else {
          var fechaTexto = DIAS_ES[proxima.partes.diaSemana] + ' ' + proxima.partes.dia +
            ' de ' + MESES_ES[proxima.partes.mes - 1];
          mensaje = 'Aún quedan espacios disponibles para el próximo entrenamiento, el ' +
            fechaTexto + ', recuerda reservar con tiempo';
        }

        resultados.push({ fecha: proxima.fecha, mensaje: mensaje });
      });
    });

    return resultados;
  }

  // ---------------------------------------------------------------------
  // Mensajes tipo 2 — eventos especiales (competencias, torneos, clínicas)
  // ---------------------------------------------------------------------
  function mensajesEventosEspeciales(eventosEspeciales) {
    var resultados = [];

    eventosEspeciales.forEach(function (evento) {
      var inicioCrudo = evento.start && (evento.start.dateTime || evento.start.date);
      if (!inicioCrudo) return;

      var fecha = new Date(inicioCrudo);
      var partes = partesBolivia(fecha);
      var fechaTexto = DIAS_ES[partes.diaSemana] + ' ' + partes.dia + ' de ' + MESES_ES[partes.mes - 1];

      // Eventos de "todo el día" (evento.start.date, sin dateTime) no traen
      // hora — se omite esa parte del mensaje en vez de inventar un horario.
      var tieneHora = !!(evento.start && evento.start.dateTime);
      var horaTexto = tieneHora ? (pad2(partes.hora) + ':' + pad2(partes.minuto)) : null;
      var lugar = evento.location ? evento.location.trim() : null;

      // El título del evento se usa tal cual está escrito en el calendario:
      // conviene redactarlo ya listo para encajar en la frase, ej. "la
      // competencia interdepartamental" en vez de
      // "Competencia Interdepartamental 2026".
      var titulo = (evento.summary || 'un evento especial').trim();

      var mensaje = 'El ' + fechaTexto + ' tendremos ' + titulo;
      if (lugar) mensaje += ', en ' + lugar;
      if (horaTexto) mensaje += ' a las ' + horaTexto;

      resultados.push({ fecha: fecha, mensaje: mensaje });
    });

    return resultados;
  }

  // ---------------------------------------------------------------------
  // Consulta pública de reservas
  // ---------------------------------------------------------------------
  // Convierte componentes de una fecha en la zona horaria configurada a un
  // Date/UTC real. Se calcula el offset con Intl para no depender de la zona
  // horaria del navegador que visita la página.
  function fechaZonificadaAUTC(anio, mes, dia, hora, minuto) {
    var aproximada = new Date(Date.UTC(anio, mes - 1, dia, hora || 0, minuto || 0, 0));
    var partes = partesBolivia(aproximada);
    var comoLocal = Date.UTC(partes.anio, partes.mes - 1, partes.dia, partes.hora, partes.minuto, 0);
    var deseada = Date.UTC(anio, mes - 1, dia, hora || 0, minuto || 0, 0);
    return new Date(aproximada.getTime() + (deseada - comoLocal));
  }

  function sumarDiasCalendario(anio, mes, dia, cantidad) {
    var d = new Date(Date.UTC(anio, mes - 1, dia + cantidad, 12, 0, 0));
    return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
  }

  function parseFechaInicial(valor) {
    if (valor instanceof Date && !isNaN(valor.getTime())) {
      var partes = partesBolivia(valor);
      return {
        fecha: partes,
        instante: valor,
        tieneHora: true
      };
    }

    if (typeof valor !== 'string' || !valor.trim()) return null;
    var texto = valor.trim();
    var soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
    if (soloFecha) {
      var f = { anio: Number(soloFecha[1]), mes: Number(soloFecha[2]), dia: Number(soloFecha[3]) };
      if (!isFinite(f.anio) || !isFinite(f.mes) || !isFinite(f.dia)) return null;
      return {
        fecha: f,
        instante: fechaZonificadaAUTC(f.anio, f.mes, f.dia, 0, 0),
        tieneHora: false
      };
    }

    var fechaISO = new Date(texto);
    if (isNaN(fechaISO.getTime())) return null;
    var partesISO = partesBolivia(fechaISO);
    return {
      fecha: partesISO,
      instante: fechaISO,
      tieneHora: true
    };
  }

  function construirRangoReservas(fechaInicial, dias) {
    var inicio = parseFechaInicial(fechaInicial);
    var cantidadDias = Number(dias);
    if (!inicio || !isFinite(cantidadDias) || cantidadDias < 1) return null;
    cantidadDias = Math.floor(cantidadDias);

    var finFecha = sumarDiasCalendario(inicio.fecha.anio, inicio.fecha.mes, inicio.fecha.dia, cantidadDias);
    var finUTC = fechaZonificadaAUTC(finFecha.anio, finFecha.mes, finFecha.dia, 0, 0);

    return {
      inicio: inicio,
      finFecha: finFecha,
      finUTC: finUTC,
      dias: cantidadDias
    };
  }

  function construirUrlEventosRango(inicio, fin, pageToken) {
    var base = 'https://www.googleapis.com/calendar/v3/calendars/' +
      encodeURIComponent(CONFIG.calendarId) + '/events';
    var params = [
      'key=' + encodeURIComponent(CONFIG.apiKey),
      'timeMin=' + encodeURIComponent(inicio.toISOString()),
      'timeMax=' + encodeURIComponent(fin.toISOString()),
      'singleEvents=true',
      'orderBy=startTime',
      'maxResults=250'
    ];
    if (pageToken) params.push('pageToken=' + encodeURIComponent(pageToken));
    return base + '?' + params.join('&');
  }

  function obtenerEventosRango(inicio, fin) {
    sincronizarConfiguracionBuddy();
    if (CONFIG.enabled === false || !CONFIG.apiKey || !CONFIG.calendarId) {
      return Promise.resolve(null);
    }

    function pagina(pageToken, acumulados) {
      return fetch(construirUrlEventosRango(inicio, fin, pageToken))
        .then(function (respuesta) {
          if (!respuesta.ok) return null;
          return respuesta.json();
        })
        .then(function (datos) {
          if (!datos) return null;
          var items = (datos.items || []).filter(function (evento) {
            return evento.status !== 'cancelled';
          });
          var todos = acumulados.concat(items);
          if (datos.nextPageToken) return pagina(datos.nextPageToken, todos);
          return todos;
        })
        .catch(function (error) {
          if (window.console) console.warn('[Buddy Agenda] No se pudo consultar el rango de reservas.', error);
          return null;
        });
    }

    return pagina('', []);
  }

  function fechaEvento(evento) {
    var inicio = evento && evento.start;
    if (!inicio) return null;
    if (inicio.dateTime) return partesBolivia(new Date(inicio.dateTime));
    if (inicio.date) {
      var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(inicio.date);
      if (p) return { anio: Number(p[1]), mes: Number(p[2]), dia: Number(p[3]) };
    }
    return null;
  }

  function fechaEnRango(partes, inicio, finFecha) {
    if (!partes) return false;
    var clave = partes.anio * 10000 + partes.mes * 100 + partes.dia;
    var claveInicio = inicio.fecha.anio * 10000 + inicio.fecha.mes * 100 + inicio.fecha.dia;
    var claveFin = finFecha.anio * 10000 + finFecha.mes * 100 + finFecha.dia;
    return clave >= claveInicio && clave < claveFin;
  }

  function emitirAgendaDesactivada() {
    var mensaje = 'La agenda está desactivada para esta página o aún no ha sido configurada';
    if (typeof window.buddy_says === 'function') {
      window.buddy_says(mensaje, { emocion: 'sereno' });
    } else if (window.console) {
      console.warn('[Buddy Agenda] ' + mensaje);
    }
  }

  function consultarReservas(opciones, diasDirectos) {
    // API admite ambas formas para facilitar su consumo desde otros módulos:
    // consultarReservas({ fechaInicial: 'YYYY-MM-DD', dias: 3 })
    // consultarReservas('YYYY-MM-DD', 3)
    if (opciones instanceof Date || typeof opciones === 'string') {
      opciones = { fechaInicial: opciones, dias: diasDirectos };
    } else {
      opciones = opciones || {};
    }
    sincronizarConfiguracionBuddy();

    if (CONFIG.enabled === false || !CONFIG.apiKey || !CONFIG.calendarId) {
      emitirAgendaDesactivada();
      return Promise.resolve(null);
    }

    var rango = construirRangoReservas(opciones.fechaInicial, opciones.dias);
    if (!rango) {
      return Promise.reject(new TypeError('BuddyAgenda.consultarReservas requiere fechaInicial válida y dias >= 1.'));
    }

    // Si se pasa un datetime, el primer día comienza exactamente en ese
    // instante. Si se pasa YYYY-MM-DD, comienza a medianoche de Bolivia.
    var inicioUTC = rango.inicio.tieneHora ? rango.inicio.instante : fechaZonificadaAUTC(
      rango.inicio.fecha.anio, rango.inicio.fecha.mes, rango.inicio.fecha.dia, 0, 0
    );

    return obtenerEventosRango(inicioUTC, rango.finUTC).then(function (eventos) {
      if (eventos === null) {
        emitirAgendaDesactivada();
        return null;
      }

      var reservas = eventos.filter(esReserva);
      var porDia = [];
      for (var i = 0; i < rango.dias; i++) {
        var fechaDia = sumarDiasCalendario(rango.inicio.fecha.anio, rango.inicio.fecha.mes, rango.inicio.fecha.dia, i);
        var totalDia = reservas.filter(function (evento) {
          var fecha = fechaEvento(evento);
          if (!fecha || fecha.anio !== fechaDia.anio || fecha.mes !== fechaDia.mes || fecha.dia !== fechaDia.dia) return false;
          if (i === 0 && rango.inicio.tieneHora && evento.start && evento.start.dateTime) {
            return new Date(evento.start.dateTime).getTime() >= rango.inicio.instante.getTime();
          }
          return true;
        }).length;
        porDia.push({ fecha: fechaDia, total: totalDia });
      }

      return {
        total: porDia.reduce(function (sum, item) { return sum + item.total; }, 0),
        porDia: porDia,
        fechaInicial: rango.inicio.fecha,
        dias: rango.dias
      };
    });
  }

  // ---------------------------------------------------------------------
  // API pública
  // ---------------------------------------------------------------------
  // Devuelve una Promise que resuelve a un array de strings (los mensajes),
  // ordenados de lo más próximo a lo más lejano en el tiempo. En cualquier
  // escenario de error (sin API key, falla de red, calendario vacío)
  // resuelve un array vacío en vez de rechazar la Promise, para que quien
  // lo consuma no necesite un catch() propio.
  function getMensajes() {
    var ahora = new Date();

    return obtenerEventos(ahora).then(function (eventos) {
      if (eventos === null) return []; // no se pudo confirmar la agenda real: no se afirma nada

      var especiales = eventos.filter(esEventoEspecial);
      var reservas = eventos.filter(esReserva);
      var horariosNormalizados = normalizarHorarios(CONFIG.horarios);

      var disponibilidad = mensajesDisponibilidad(reservas, horariosNormalizados, ahora);
      var eventosEspecialesMsgs = mensajesEventosEspeciales(especiales);

      var todos = disponibilidad.concat(eventosEspecialesMsgs);
      todos.sort(function (a, b) { return a.fecha.getTime() - b.fecha.getTime(); });

      return todos.map(function (item) { return item.mensaje; });
    });
  }

  window.BuddyInformSources = window.BuddyInformSources || {};

  window.BuddyAgenda = window.BuddyAgenda || {};
  window.BuddyAgenda.consultarReservas = consultarReservas;
  window.BuddyAgenda.config = CONFIG;

  window.BuddyInformSources['agenda'] = {
    obtenerMensajes: getMensajes,
    consultarReservas: consultarReservas,
    _CONFIG: CONFIG
  };
})(window, document);
