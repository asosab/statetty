/**
 * Buddy Dashboard — vista admin.
 *
 * Esta vista es deliberadamente una capa de presentación:
 * - no hace peticiones HTTP;
 * - no calcula métricas comerciales;
 * - consume el contrato estructurado entregado por Buddy.dashboard;
 * - puede ser sustituida posteriormente por views/user.js,
 *   views/supervaca.js, etc.
 */
window.Buddy = window.Buddy || {};
window.BuddyDashboardViews = window.BuddyDashboardViews || {};

(function (window, document) {
  'use strict';

  var STYLE_ID = 'buddy-dashboard-admin-style';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatNumber(value) {
    var number = Number(value);
    if (!isFinite(number)) return '0';
    return number.toLocaleString('es-BO');
  }

  function formatPercent(value) {
    var number = Number(value);
    if (!isFinite(number)) return '0%';
    return number.toLocaleString('es-BO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }) + '%';
  }

  // Bug #3: antes devolvía solo texto y el CSS pintaba TODO cambio de verde
  // (.buddy-dashboard-card__change{color:#176b36}), sin distinguir subas de
  // bajas. Ahora se envuelve en un <span> con una clase según el signo, y
  // metricCard ya no escapa el resultado (ver más abajo) porque acá mismo
  // se escapa el texto interno antes de insertarlo.
  function formatChange(value, percentagePoints) {
    var number = Number(value);
    if (!isFinite(number) || number === 0) {
      return '<span class="buddy-dashboard-change--flat">—</span>';
    }

    var direction = number > 0 ? 'up' : 'down';
    var sign = number > 0 ? '↑ ' : '↓ ';
    var suffix = percentagePoints ? ' pp' : '%';
    var text = sign + Math.abs(number).toLocaleString('es-BO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }) + suffix;

    return '<span class="buddy-dashboard-change--' + direction + '">' + escapeHtml(text) + '</span>';
  }

  function metricValue(metric, formatter) {
    metric = metric || {};
    return (formatter || formatNumber)(metric.value);
  }

  // Definiciones cortas para los tooltips (atributo title, sin dependencias).
  // La explicación completa, con fórmulas y cómo interpretar cada dato, vive
  // en el anexo "glosario-dashboard-buddy.md" — el tooltip es solo el resumen.
  var TERM_DEFINITIONS = {
    visitantes: 'Sesiones distintas en el sitio durante el período, con o sin registro.',
    identificados: 'Visitantes que iniciaron sesión o se registraron durante el período.',
    engagementResumen: 'Porcentaje de usuarios activos que cumplió el mínimo de eventos o hizo click en WhatsApp.',
    intencionResumen: 'Usuarios únicos que hicieron click en el link de WhatsApp.',
    registradosTotal: 'Usuarios identificados (con cuenta) activos en el período.',
    registradosNuevos: 'Usuarios identificados cuyo primer evento en el sitio ocurrió en este período.',
    registradosRecurrentes: 'Usuarios identificados activos también en el período de comparación inmediato anterior.',
    anonimosVisitantes: 'Sesiones sin usuario identificado en el período.',
    anonimosSesiones: 'Total de sesiones del sitio, identificadas y anónimas.',
    anonimosEventos: 'Total de eventos registrados por Buddy en el período (todas las sesiones).',
    anonimosIdentificacion: 'Porcentaje de usuarios que se identificaron sobre el total (identificados + anónimos).',
    sesiones: 'Total de sesiones del sitio en el período.',
    usuariosActivos: 'Usuarios (identificados o anónimos) con al menos un evento en el período.',
    usuariosComprometidos: 'Usuarios que superaron el mínimo de eventos configurado o hicieron click en WhatsApp.',
    sesionesPorUsuario: 'Promedio de sesiones por cada usuario identificado.',
    eventosPorSesion: 'Promedio de eventos registrados por sesión.',
    clicksWhatsapp: 'Total de clicks en links de WhatsApp durante el período.',
    usuariosUnicosWhatsapp: 'Usuarios distintos que hicieron al menos un click en WhatsApp.',
    conversionWhatsapp: 'Usuarios únicos con click en WhatsApp sobre el total de sesiones del período.',
    embudoVisitantes: 'Total de sesiones del período (primer escalón del embudo).',
    embudoIdentificados: 'De esas sesiones, cuántas correspondían a un usuario identificado.',
    embudoActivos: 'Usuarios (identificados o anónimos) con actividad registrada.',
    embudoComprometidos: 'Usuarios que superaron el umbral de compromiso definido.',
    embudoIntencion: 'Clicks en WhatsApp registrados en el período.',
    embudoConversiones: 'Usuarios únicos que efectivamente hicieron click en WhatsApp.',
    actividadUsuarios: 'Usuarios distintos que interactuaron con este módulo.',
    actividadSesiones: 'Sesiones distintas en las que se usó este módulo.',
    actividadPartidas: 'Andanadas de archeryGame completadas.',
    actividadFlechas: 'Total de flechas disparadas en el módulo archeryGame.',
    actividadSegundosActivos: 'Segundos acumulados jugando (desde que se inicia hasta que se completa cada andanada).',
    actividadPuntos: 'Puntaje acumulado de todas las andanadas completadas.',
    archeryGameJugoNoJugo: 'Compara, entre quienes jugaron archeryGame y quienes no, qué porcentaje hizo click en WhatsApp. Con pocos actores en un grupo, un solo caso puede mover el % varios puntos — revisa el "n" de cada fila.',
    archeryGameRegistradoAnonimo: 'Compara la tasa de click en WhatsApp entre usuarios identificados y anónimos.',
    // Bug #14: antes había un solo tooltip ("tiempo promedio jugando... antes
    // del click") para un dato que en realidad era tiempo de calendario
    // transcurrido, no tiempo jugando. Ahora hay dos tooltips, uno por dato.
    archeryGameTiempoTranscurridoClick: 'Tiempo de calendario entre la primera partida de archeryGame y el primer click en WhatsApp, solo entre quienes hicieron ambas cosas y en ese orden. Puede incluir varios días si hubo visitas separadas de por medio — no es tiempo jugando continuo.',
    archeryGameTiempoJugadoClick: 'Segundos realmente activos jugando archeryGame (suma de andanadas completadas) antes del primer click en WhatsApp, sobre la misma gente que el dato anterior. Este sí es tiempo jugando, no tiempo transcurrido.',
    archeryGameNivel: 'Tasa de click en WhatsApp según cuántas partidas de archeryGame jugó cada actor (0, 1, o 2 o más).',
    adquisicionFuente: 'Sitio o app desde donde llegó la sesión ("direct" = sin referencia, típicamente escritura directa de la URL o apps).',
    adquisicionVisitantes: 'Sesiones que llegaron desde esa fuente.',
    adquisicionParticipacion: 'Porcentaje de las sesiones totales que llegó desde esa fuente.',
    adquisicionConversion: 'De los actores atribuidos a esa fuente (según su primera sesión del período), qué porcentaje hizo click en WhatsApp.',
    paginaPagina: 'Página de entrada, según su ruta dentro del sitio (sin el dominio).',
    paginaVisitantes: 'Sesiones distintas que pasaron por esa página en el período.',
    paginaConversionWhatsapp: 'De los usuarios activos en esa página, qué porcentaje hizo click en WhatsApp.',
    paginaParticipacionClicks: 'Qué porcentaje de todos los clicks de WhatsApp del período se originó en esa página.',
    tecnologiaDispositivo: 'Tipo de dispositivo detectado a partir del user-agent del navegador.',
    tecnologiaPorcentaje: 'Porcentaje de sesiones con ese dispositivo o navegador.'
  };

  // Envuelve un texto en un span con subrayado punteado y tooltip nativo
  // (atributo title). Sin dependencias externas ni iconos.
  function withTooltip(text, termKey) {
    var definition = termKey ? TERM_DEFINITIONS[termKey] : null;
    if (!definition) return escapeHtml(text);
    return '<span class="buddy-dashboard-term" tabindex="0" title="' + escapeHtml(definition) + '">' +
      escapeHtml(text) +
    '</span>';
  }

  function metricCard(title, metric, formatter, termKey, highlight) {
    metric = metric || {};
    return '<article class="buddy-dashboard-card' + (highlight ? ' buddy-dashboard-card--primary' : '') + '">' +
      '<div class="buddy-dashboard-card__label">' + withTooltip(title, termKey) + '</div>' +
      '<div class="buddy-dashboard-card__value">' + metricValue(metric, formatter) + '</div>' +
      '<div class="buddy-dashboard-card__change">' +
        formatChange(metric.change, formatter === formatPercent) +
      '</div>' +
      (metric.projection != null
        ? '<div class="buddy-dashboard-card__projection">Proyección ' +
            escapeHtml((formatter || formatNumber)(metric.projection)) +
          '</div>'
        : '') +
      '</article>';
  }

  function formatDuration(value) {
    var seconds = Number(value);
    if (!isFinite(seconds) || seconds <= 0) return '0 s';
    if (seconds < 60) return Math.round(seconds) + ' s';
    var totalMinutes = Math.floor(seconds / 60);
    if (totalMinutes < 60) {
      var rest = Math.round(seconds % 60);
      return totalMinutes + 'm ' + rest + 's';
    }
    var hours = Math.floor(totalMinutes / 60);
    var minutes = totalMinutes % 60;
    return hours + 'h ' + minutes + 'm';
  }

  function lowSampleTag(entry) {
    return (entry && entry.lowSample)
      ? ' <span class="buddy-dashboard-lowsample">muestra baja</span>'
      : '';
  }

  // Tarjeta que compara dos tasas de conversión (p.ej. jugó vs no jugó).
  // Cada lado va en su propia fila con su etiqueta pegada al número — evita
  // la ambigüedad de un formato "A% vs B%" donde no queda claro cuál es cuál.
  function comparisonCard(title, a, b, labelA, labelB, termKey) {
    a = a || {};
    b = b || {};
    return '<article class="buddy-dashboard-card">' +
      '<div class="buddy-dashboard-card__label">' + withTooltip(title, termKey) + '</div>' +
      '<div class="buddy-dashboard-compare-row">' +
        '<span class="buddy-dashboard-compare-row__label">' + escapeHtml(labelA) + '</span>' +
        '<span class="buddy-dashboard-compare-row__value">' + formatPercent(a.conversionRate) + '</span>' +
        '<span class="buddy-dashboard-compare-row__n">n=' + formatNumber(a.n) + lowSampleTag(a) + '</span>' +
      '</div>' +
      '<div class="buddy-dashboard-compare-row">' +
        '<span class="buddy-dashboard-compare-row__label">' + escapeHtml(labelB) + '</span>' +
        '<span class="buddy-dashboard-compare-row__value">' + formatPercent(b.conversionRate) + '</span>' +
        '<span class="buddy-dashboard-compare-row__n">n=' + formatNumber(b.n) + lowSampleTag(b) + '</span>' +
      '</div>' +
    '</article>';
  }

  function durationCard(title, entry, termKey) {
    entry = entry || {};
    return '<article class="buddy-dashboard-card">' +
      '<div class="buddy-dashboard-card__label">' + withTooltip(title, termKey) + '</div>' +
      '<div class="buddy-dashboard-card__value">' + formatDuration(entry.value) + '</div>' +
      '<div class="buddy-dashboard-card__samples">' +
        '<span>n=' + formatNumber(entry.n) + lowSampleTag(entry) + '</span>' +
      '</div>' +
    '</article>';
  }

  // Tabla propia (no listRows) porque necesita insertar la etiqueta de
  // muestra baja como HTML dentro de la celda, y listRows escapa todo valor.
  function conversionByLevelTable(items) {
    if (!Array.isArray(items) || !items.length) {
      return '<div class="buddy-dashboard-muted">Sin datos en este período.</div>';
    }

    return '<div class="buddy-dashboard-table-wrap"><table>' +
      '<thead><tr><th>Nivel</th><th>Actores</th><th>' +
        withTooltip('Conversión a WhatsApp', 'archeryGameNivel') +
      '</th></tr></thead><tbody>' +
      items.map(function (item) {
        item = item || {};
        return '<tr>' +
          '<td>' + escapeHtml(item.label || item.level || '—') + '</td>' +
          '<td>' + formatNumber(item.n) + '</td>' +
          '<td>' + formatPercent(item.conversionRate) + lowSampleTag(item) + '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  // Traduce la tabla "conversión por nivel de juego" a una frase en lenguaje
  // llano para el dueño del sitio. Es la comparación que el propio glosario
  // marca como más confiable de las cuatro (porque compara varios niveles en
  // vez de un solo par), así que acá vive el mensaje central de la sección
  // ArcheryGame → WhatsApp. Solo usa niveles SIN la etiqueta "muestra baja": si
  // quedan menos de dos, no arriesga ninguna lectura direccional.
  function archeryGameLevelInsight(items) {
    if (!Array.isArray(items) || !items.length) return null;

    var reliable = items.filter(function (item) { return item && !item.lowSample; });
    if (reliable.length < 2) {
      return 'Todavía no hay suficientes niveles con muestra confiable (n≥5) para leer una tendencia — esperá más datos antes de sacar conclusiones sobre el efecto del juego.';
    }

    var first = reliable[0];
    var last = reliable[reliable.length - 1];
    var firstRate = Number(first.conversionRate) || 0;
    var lastRate = Number(last.conversionRate) || 0;
    var firstLabel = escapeHtml(first.label || first.level || '—');
    var lastLabel = escapeHtml(last.label || last.level || '—');

    if (lastRate > firstRate) {
      var multiple = firstRate > 0 ? (lastRate / firstRate) : null;
      var multipleText = (multiple && multiple >= 1.3)
        ? ' (' + multiple.toLocaleString('es-BO', { maximumFractionDigits: 1 }) + '× más)'
        : '';
      return 'Entre los niveles con muestra confiable, <strong>&ldquo;' + lastLabel + '&rdquo; convierte más que &ldquo;' +
        firstLabel + '&rdquo;' + multipleText + '</strong> — una señal de que jugar más está asociado a más ' +
        'contactos por WhatsApp.';
    }
    if (lastRate < firstRate) {
      return 'Entre los niveles con muestra confiable, <strong>la conversión no aumenta con más partidas jugadas</strong> ' +
        '— todavía no hay evidencia de que jugar más ayude a convertir.';
    }
    return 'Entre los niveles con muestra confiable, la conversión se mantiene similar sin importar cuánto se jugó.';
  }

  function section(title, body, className) {
    return '<section class="buddy-dashboard-section ' + (className || '') + '">' +
      '<h2>' + escapeHtml(title) + '</h2>' +
      body +
      '</section>';
  }

  function listRows(items, columns) {
    if (!Array.isArray(items) || !items.length) {
      return '<div class="buddy-dashboard-muted">Sin datos en este período.</div>';
    }

    return '<div class="buddy-dashboard-table-wrap"><table>' +
      '<thead><tr>' +
      columns.map(function (column) {
        return '<th>' + withTooltip(column.label, column.term) + '</th>';
      }).join('') +
      '</tr></thead><tbody>' +
      items.slice(0, 10).map(function (item) {
        return '<tr>' +
          columns.map(function (column) {
            var value = typeof column.value === 'function'
              ? column.value(item)
              : item[column.value];
            return '<td>' + escapeHtml(value == null ? '—' : value) + '</td>';
          }).join('') +
          '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  // Anexo del glosario completo (glosario-dashboard-buddy.md), pensado
  // exclusivamente para cuando el dashboard se imprime o exporta a PDF: en
  // pantalla ese rol ya lo cumplen los tooltips (withTooltip), así que este
  // bloque se mantiene oculto ahí y solo se muestra vía @media print (ver
  // ensureStyles). No usa escapeHtml porque es contenido fijo, no datos de
  // la API.
  function printGlossaryHtml() {
    return '<div class="buddy-dashboard-glossary">' +
      '<section class="buddy-dashboard-section buddy-dashboard-glossary__section">' +
        '<h2>Glosario del dashboard</h2>' +
        '<p>Este anexo explica qué mide cada número del dashboard y cómo leerlo. ' +
        'En la versión en línea, cada dato tiene además un tooltip corto (pasá el ' +
        'mouse o, en celular, tocá y mantené presionado sobre el texto subrayado ' +
        'con puntitos) con un resumen de una línea; acá está la versión completa ' +
        'de esa explicación.</p>' +

        '<h3>Cómo leer cualquier número de este dashboard</h3>' +
        '<ol>' +
          '<li><strong>Mirá siempre el tamaño de muestra (<em>n</em>).</strong> Cuando un ' +
          'grupo tiene pocos usuarios o sesiones, un solo caso puede mover el ' +
          'porcentaje varios puntos. El dashboard marca esto con la etiqueta ' +
          '<strong>&ldquo;muestra baja&rdquo;</strong> cuando el grupo tiene menos de 5 ' +
          'actores. Un porcentaje con esa etiqueta es una pista, no una conclusión.</li>' +
          '<li><strong>Los primeros días después de publicar el sitio son ruidosos.</strong> ' +
          'Con pocas semanas de datos, es normal que aparezcan porcentajes que a ' +
          'primera vista no tienen sentido (ver el ejemplo real más abajo). No es ' +
          'necesariamente un error del sistema — casi siempre es que todavía no hay ' +
          'suficiente volumen para que los promedios se estabilicen.</li>' +
        '</ol>' +

        '<h3>Resumen</h3>' +
        '<div class="buddy-dashboard-table-wrap"><table>' +
          '<thead><tr><th>Dato</th><th>Qué mide</th></tr></thead>' +
          '<tbody>' +
            '<tr><td>Visitantes</td><td>Sesiones distintas en el sitio durante el período, con o sin registro.</td></tr>' +
            '<tr><td>Identificados</td><td>Visitantes que iniciaron sesión o se registraron durante el período.</td></tr>' +
            '<tr><td>Engagement</td><td>Porcentaje de usuarios activos que cumplió el mínimo de eventos configurado o hizo click en WhatsApp.</td></tr>' +
            '<tr><td>Intención</td><td>Usuarios únicos que hicieron click en el link de WhatsApp.</td></tr>' +
          '</tbody>' +
        '</table></div>' +

        '<h3>Audiencia</h3>' +
        '<p><strong>Registrados</strong> — usuarios con cuenta en el sitio.</p>' +
        '<ul>' +
          '<li>Total / Activos: usuarios identificados con actividad en el período.</li>' +
          '<li>Nuevos: su primer evento en el sitio ocurrió dentro de este período (antes no existían en el sistema).</li>' +
          '<li>Recurrentes: estuvieron activos también en el período de comparación inmediato anterior.</li>' +
        '</ul>' +
        '<p><strong>Visitantes anónimos</strong> — todo lo que pasa en el sitio sin que la persona se haya identificado.</p>' +
        '<ul>' +
          '<li>Identificación: qué porcentaje del total de visitantes (identificados + anónimos) se registró. ' +
          'Es una métrica de negocio útil para saber si vale la pena insistir con el registro.</li>' +
        '</ul>' +

        '<h3>Engagement</h3>' +
        '<ul>' +
          '<li>Sesiones: total de sesiones del sitio en el período.</li>' +
          '<li>Usuarios activos: usuarios (identificados o anónimos) con al menos un evento.</li>' +
          '<li>Usuarios comprometidos: usuarios que superaron el mínimo de eventos configurado (por defecto 5) ' +
          '<strong>o</strong> hicieron click en WhatsApp — el click cuenta como compromiso aunque la persona ' +
          'no haya generado muchos eventos antes.</li>' +
          '<li>Sesiones por usuario / Eventos por sesión: promedios simples, útiles para comparar entre ' +
          'períodos más que para leer en aislado.</li>' +
        '</ul>' +

        '<h3>Acciones de valor (WhatsApp)</h3>' +
        '<ul>' +
          '<li>Clicks WhatsApp: total de clicks en el link, sin deduplicar por persona (una misma persona ' +
          'puede aparecer varias veces).</li>' +
          '<li>Usuarios únicos: cuántas personas distintas hicieron al menos un click.</li>' +
          '<li>Conversión: usuarios únicos con click sobre el total de sesiones del período. Es la métrica ' +
          'de referencia para saber &ldquo;de cada 100 visitas, cuántas terminan escribiendo&rdquo;.</li>' +
        '</ul>' +

        '<h3>Embudo</h3>' +
        '<p>Seis escalones, cada uno subconjunto del anterior: Visitantes → Identificados → Activos → ' +
        'Comprometidos → Clicks WA (clicks en WhatsApp, sin deduplicar por persona) → Usuarios WA ' +
        '(usuarios únicos que clickearon al menos una vez). Sirve para ver en qué punto se pierde más gente.</p>' +

        '<h3>Actividades</h3>' +
        '<p>Por cada módulo de Buddy (por ejemplo archeryGame), se muestra: usuarios y sesiones que lo usaron, ' +
        'partidas jugadas (andanadas completadas), flechas disparadas, segundos activos jugando y puntaje ' +
        'acumulado. Estos números son sobre el minijuego en sí — no dicen todavía si eso ayuda a la ' +
        'conversión. Para eso está la siguiente sección.</p>' +

        '<h3>ArcheryGame → WhatsApp</h3>' +
        '<p>Esta sección cruza la actividad del minijuego con los clicks a WhatsApp, para responder si ' +
        'jugar realmente empuja a la gente a escribir.</p>' +

        '<h4>Conversión: jugó vs no jugó</h4>' +
        '<p>Compara la tasa de click a WhatsApp entre quienes jugaron al menos una partida de archeryGame y ' +
        'quienes no jugaron ninguna. La expectativa de negocio es que quienes jugaron conviertan ' +
        '<strong>más</strong> — es la hipótesis que este dashboard existe para probar o refutar.</p>' +
        '<p><strong>Ejemplo real de este sitio, primeros días tras la publicación:</strong> jugó 9,1% ' +
        '(n=44) vs no jugó 75% (n=4, muestra baja). A primera vista parece indicar lo contrario de lo ' +
        'esperado. Con estos números concretos, lo más probable es una combinación de dos cosas:</p>' +
        '<ul>' +
          '<li>El grupo &ldquo;no jugó&rdquo; tiene solo 4 personas — con una muestra así, que 3 de esas 4 ' +
          'hayan clickeado WhatsApp (75%) puede deberse a un puñado de visitantes ya muy decididos (por ' +
          'ejemplo, alguien que llegó directo a la página de precios buscando el contacto) y no a un ' +
          'patrón real del resto de tus visitantes.</li>' +
          '<li>El grupo &ldquo;jugó&rdquo; es mucho más grande (44) y probablemente incluye visitantes más ' +
          'exploratorios, que llegaron por curiosidad y todavía no estaban listos para escribir.</li>' +
        '</ul>' +
        '<p>Ninguna de las dos lecturas es una alarma por sí sola. Lo que hace falta es más volumen: con ' +
        'más semanas de datos, si la tasa de &ldquo;jugó&rdquo; empieza a superar consistentemente a la de ' +
        '&ldquo;no jugó&rdquo;, ahí sí hay evidencia real de que el juego ayuda. Si se mantiene invertida ' +
        'con muestras ya grandes en ambos lados, sería señal de revisar el diseño del minijuego o dónde ' +
        'está ubicado en el sitio.</p>' +

        '<h4>Conversión: registrado vs anónimo</h4>' +
        '<p>Compara la tasa de click a WhatsApp entre usuarios que se identificaron (tienen cuenta) y los ' +
        'que no. Ayuda a decidir si vale la pena empujar el registro como paso previo a la conversión, o ' +
        'si el registro no está relacionado con la decisión de escribir.</p>' +

        '<h4>Tiempo transcurrido hasta el click</h4>' +
        '<p>Tiempo de <strong>calendario</strong> (reloj de pared) entre la primera partida de archeryGame y el ' +
        'primer click a WhatsApp, contado solo entre las personas que hicieron ambas cosas y en ese orden ' +
        '(primero jugaron, después escribieron). Es la diferencia entre el instante del primer evento de ' +
        'archeryGame y el instante del primer click — si la persona cerró la pestaña y volvió tres días ' +
        'después a escribir, esos tres días de ausencia se cuentan igual que si hubiera estado jugando sin ' +
        'parar. Con muestra baja (como en el ejemplo de este sitio, con solo 4 casos) un número muy alto no ' +
        'debe leerse como &ldquo;la gente juega horas antes de escribir&rdquo;, sino como evidencia de que ' +
        'al menos una persona volvió al sitio después de un tiempo — revisá el &ldquo;n&rdquo; antes de ' +
        'sacar conclusiones.</p>' +

        '<h4>Tiempo jugado antes del click</h4>' +
        '<p>A diferencia del dato anterior, este sí mide tiempo <strong>jugando</strong>: la suma de los ' +
        'segundos activos (inicio a fin de cada andanada completada) que la persona acumuló antes de su ' +
        'primer click a WhatsApp. No cuenta el tiempo que la pestaña estuvo cerrada o inactiva entre ' +
        'visitas, así que suele ser mucho menor que el &ldquo;tiempo transcurrido hasta el click&rdquo; de ' +
        'arriba — la diferencia entre ambos es justamente cuánto tiempo pasó ausente. Se calcula sobre la ' +
        'misma gente (mismo &ldquo;n&rdquo;) que el dato de tiempo transcurrido, para poder compararlos ' +
        'directamente.</p>' +

        '<h4>Conversión por nivel de juego</h4>' +
        '<p>Divide a los actores en tres grupos según cuánto jugaron (no jugó / 1 partida / 2 o más ' +
        'partidas) y muestra la tasa de click a WhatsApp de cada uno. Esta es la vista más confiable de ' +
        'las cuatro para detectar el efecto del juego, porque si existe una relación real (&ldquo;jugar ' +
        'más ayuda a convertir&rdquo;), acá debería verse como una tendencia creciente entre los tres ' +
        'niveles — no como un solo número aislado.</p>' +

        '<h3>Adquisición</h3>' +
        '<p><strong>Por fuente</strong> — de dónde llegó la sesión.</p>' +
        '<ul>' +
          '<li>Fuente: &ldquo;direct&rdquo; significa que no había referencia — ' +
          'típicamente alguien que escribió la URL directamente, la tenía guardada, o llegó desde una app ' +
          'que no pasa esa información (WhatsApp, Gmail, etc.).</li>' +
          '<li>Visitantes / Participación: cuántas sesiones y qué porcentaje del total llegó desde esa ' +
          'fuente.</li>' +
          '<li>Conversión: de los actores atribuidos a esa fuente (según la fuente de su primera sesión ' +
          'del período), qué porcentaje hizo click en WhatsApp. Es una atribución de &ldquo;primer toque&rdquo;, ' +
          'no &ldquo;último toque&rdquo;.</li>' +
        '</ul>' +
        '<p><strong>Rendimiento por página</strong> — qué página convierte mejor, para decidir dónde ' +
        'reforzar el link o botón de WhatsApp.</p>' +
        '<ul>' +
          '<li>Conversión WhatsApp: de los usuarios activos en esa página, qué porcentaje hizo click.</li>' +
          '<li>Participación en clicks: qué porcentaje de todos los clicks de WhatsApp del período se ' +
          'originó en esa página.</li>' +
        '</ul>' +

        '<h3>Tecnología</h3>' +
        '<p>Desglose de dispositivo, navegador y sistema operativo, calculado a partir del user-agent del ' +
        'navegador de cada sesión (nunca se guarda ni se muestra el user-agent completo, solo la ' +
        'clasificación).</p>' +

        '<h3>Sobre las etiquetas &ldquo;muestra baja&rdquo;</h3>' +
        '<p>Se marca así cualquier grupo con menos de 5 actores. El umbral es una convención de este ' +
        'dashboard, no una regla estadística estricta — con menos de 5 casos casi cualquier porcentaje ' +
        'puede cambiar drásticamente con un solo caso más o menos, así que es la señal para tratar ese ' +
        'número como preliminar y esperar más datos antes de sacar conclusiones o tomar decisiones basadas ' +
        'en él.</p>' +
      '</section>' +
    '</div>';
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '.buddy-dashboard{max-width:1280px;margin:0 auto;padding:24px 28px;box-sizing:border-box;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#202124;background:#fff}' +
      '.buddy-dashboard *{box-sizing:border-box}' +
      '.buddy-dashboard__header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:28px}' +
      '.buddy-dashboard__eyebrow{font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;color:#70757a;margin-bottom:5px}' +
      '.buddy-dashboard__title{margin:0;font-size:1.8rem;line-height:1.2}' +
      '.buddy-dashboard__site{margin-top:6px;color:#5f6368}' +
      '.buddy-dashboard__controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}' +
      '.buddy-dashboard__period{font-size:.9rem;color:#5f6368;text-align:right}' +
      '.buddy-dashboard button{border:1px solid #d0d4d9;background:#fff;border-radius:8px;padding:9px 13px;font:inherit;cursor:pointer}' +
      '.buddy-dashboard button:hover{background:#f6f7f8}' +
      '.buddy-dashboard button:disabled{opacity:.55;cursor:wait}' +
      '.buddy-dashboard-section{margin-top:30px}' +
      '.buddy-dashboard-section>h2{font-size:1rem;text-transform:uppercase;letter-spacing:.06em;margin:0 0 13px}' +
      '.buddy-dashboard-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}' +
      '.buddy-dashboard-grid--3{grid-template-columns:repeat(3,minmax(0,1fr))}' +
      '.buddy-dashboard-grid--2{grid-template-columns:repeat(2,minmax(0,1fr))}' +
      '.buddy-dashboard-card,.buddy-dashboard-panel{border:1px solid #e2e5e9;border-radius:12px;padding:18px;background:#fff}' +
      '.buddy-dashboard-card--primary{border-color:#25923f;background:#f1faf3}' +
      '.buddy-dashboard-card--primary .buddy-dashboard-card__value{color:#176b36}' +
      '.buddy-dashboard-section-intro{color:#5f6368;margin:0 0 14px;font-size:.92rem}' +
      '.buddy-dashboard-badge{font-size:.68rem;font-weight:600;text-transform:none;letter-spacing:0;color:#176b36;background:#e3f5e8;padding:2px 8px;border-radius:20px;margin-left:8px;vertical-align:middle}' +
      '.buddy-dashboard-insight{border:1px solid #cfe8d6;background:#f1faf3;border-radius:10px;padding:12px 16px;margin-bottom:18px;font-size:.92rem;color:#1e4726}' +
      '.buddy-dashboard-card__label{font-size:.82rem;color:#5f6368;text-transform:uppercase;letter-spacing:.04em}' +
      '.buddy-dashboard-card__value{font-size:2rem;font-weight:650;line-height:1.15;margin-top:7px}' +
      '.buddy-dashboard-card__change{font-size:.9rem;margin-top:7px}' +
      '.buddy-dashboard-change--up{color:#176b36}' +
      '.buddy-dashboard-change--down{color:#c5221f}' +
      '.buddy-dashboard-change--flat{color:#5f6368}' +
      '.buddy-dashboard-card__projection{font-size:.78rem;color:#777;margin-top:7px}' +
      '.buddy-dashboard-card__samples{font-size:.78rem;color:#777;margin-top:7px;display:flex;gap:10px;flex-wrap:wrap}' +
      '.buddy-dashboard-lowsample{font-size:.72rem;color:#9a6b12;background:#fdf3e0;padding:1px 6px;border-radius:5px}' +
      '.buddy-dashboard-term{border-bottom:1px dotted #9aa0a6;cursor:help}' +
      '.buddy-dashboard-term:focus{outline:2px solid #185fa5;outline-offset:2px;border-radius:2px}' +
      '.buddy-dashboard-compare-row{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #f1f2f3}' +
      '.buddy-dashboard-compare-row:last-child{border-bottom:none}' +
      '.buddy-dashboard-compare-row__label{font-size:.85rem;color:#5f6368;flex:1}' +
      '.buddy-dashboard-compare-row__value{font-size:1.25rem;font-weight:650}' +
      '.buddy-dashboard-compare-row__n{font-size:.72rem;color:#777;white-space:nowrap}' +
      '.buddy-dashboard-panel__title{font-weight:650;margin-bottom:14px}' +
      '.buddy-dashboard-mini-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}' +
      '.buddy-dashboard-mini{padding:12px;border-radius:9px;background:#f7f8f9}' +
      '.buddy-dashboard-mini__label{font-size:.8rem;color:#666}' +
      '.buddy-dashboard-mini__value{font-size:1.35rem;font-weight:650;margin-top:3px}' +
      '.buddy-dashboard-funnel{display:flex;align-items:stretch;gap:6px;overflow:auto}' +
      '.buddy-dashboard-funnel__item{flex:1;min-width:125px;padding:15px;background:#f7f8f9;border-radius:9px}' +
      '.buddy-dashboard-funnel__label{font-size:.78rem;color:#666}' +
      '.buddy-dashboard-funnel__value{font-size:1.45rem;font-weight:650;margin-top:4px}' +
      '.buddy-dashboard-table-wrap{overflow:auto}' +
      '.buddy-dashboard table{width:100%;border-collapse:collapse;font-size:.9rem}' +
      '.buddy-dashboard th,.buddy-dashboard td{text-align:left;padding:10px 8px;border-bottom:1px solid #eceff1;white-space:nowrap}' +
      '.buddy-dashboard th{font-weight:600;color:#5f6368}' +
      '.buddy-dashboard-muted{padding:18px 0;color:#777}' +
      '.buddy-dashboard-status{padding:18px;border:1px solid #e2e5e9;border-radius:12px;color:#5f6368}' +
      '.buddy-dashboard-status--error{color:#8a1c1c}' +
      '.buddy-dashboard-skeleton{height:100px;border-radius:12px;background:linear-gradient(90deg,#f2f3f4,#fafafa,#f2f3f4);background-size:200% 100%;animation:buddy-dashboard-loading 1.3s infinite}' +
      '@keyframes buddy-dashboard-loading{from{background-position:200% 0}to{background-position:-200% 0}}' +
      '@media(max-width:900px){.buddy-dashboard-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.buddy-dashboard__header{flex-direction:column}.buddy-dashboard__controls{justify-content:flex-start}.buddy-dashboard__period{text-align:left}}' +
      '@media(max-width:600px){.buddy-dashboard{padding:18px 14px}.buddy-dashboard-grid,.buddy-dashboard-grid--2,.buddy-dashboard-grid--3{grid-template-columns:1fr}.buddy-dashboard__title{font-size:1.45rem}.buddy-dashboard-funnel{display:grid;grid-template-columns:1fr 1fr}}' +
      // El glosario completo es redundante en pantalla (ahí está withTooltip),
      // así que se mantiene oculto por defecto y solo aparece al imprimir /
      // exportar a PDF.
      '.buddy-dashboard-glossary{display:none}' +
      '@media print{' +
        '.buddy-dashboard-glossary{display:block;page-break-before:always}' +
        '.buddy-dashboard-glossary__section h2{font-size:1.2rem;margin-bottom:14px}' +
        '.buddy-dashboard-glossary__section h3{font-size:1rem;margin:22px 0 8px}' +
        '.buddy-dashboard-glossary__section h4{font-size:.92rem;margin:16px 0 6px;color:#3c4043}' +
        '.buddy-dashboard-glossary__section p,.buddy-dashboard-glossary__section li{font-size:.88rem;line-height:1.5;color:#3c4043}' +
        '.buddy-dashboard-glossary__section ul,.buddy-dashboard-glossary__section ol{margin:6px 0 14px;padding-left:22px}' +
        '.buddy-dashboard-glossary__section table{font-size:.85rem}' +
        '.buddy-dashboard__controls{display:none}' +
      '}';

    document.head.appendChild(style);
  }

  function renderLoading(target, config) {
    ensureStyles();
    target.innerHTML =
      '<div class="buddy-dashboard">' +
        '<div class="buddy-dashboard__header">' +
          '<div><div class="buddy-dashboard__eyebrow">BUDDY</div>' +
          '<h1 class="buddy-dashboard__title">Dashboard</h1></div>' +
        '</div>' +
        '<div class="buddy-dashboard-grid">' +
          '<div class="buddy-dashboard-skeleton"></div>' +
          '<div class="buddy-dashboard-skeleton"></div>' +
          '<div class="buddy-dashboard-skeleton"></div>' +
          '<div class="buddy-dashboard-skeleton"></div>' +
        '</div>' +
      '</div>';
  }

  function renderError(target, error, refresh) {
    ensureStyles();
    var message = error && error.data && error.data.error
      ? error.data.error
      : (error && error.message) || 'No pudimos actualizar las métricas.';

    target.innerHTML =
      '<div class="buddy-dashboard">' +
        '<div class="buddy-dashboard-status buddy-dashboard-status--error">' +
          '<strong>No pudimos actualizar las métricas.</strong>' +
          '<div>' + escapeHtml(message) + '</div>' +
          '<button type="button" data-dashboard-retry style="margin-top:12px">Intentar nuevamente</button>' +
        '</div>' +
      '</div>';

    var button = target.querySelector('[data-dashboard-retry]');
    if (button) {
      button.addEventListener('click', function () {
        button.disabled = true;
        Promise.resolve(refresh()).catch(function () {}).finally(function () {
          button.disabled = false;
        });
      });
    }
  }

  function renderEmpty(target) {
    ensureStyles();
    target.innerHTML =
      '<div class="buddy-dashboard">' +
        '<div class="buddy-dashboard-status">' +
          'Todavía no hay suficiente actividad para mostrar este período.' +
        '</div>' +
      '</div>';
  }

  function renderDashboard(args) {
    var target = args.target;
    var data = args.data;
    var state = args.state;
    var config = args.config || {};

    if (state.loading && !data) {
      renderLoading(target, config);
      return;
    }

    if (state.error && !data) {
      renderError(target, state.error, args.refresh);
      return;
    }

    if (!data) {
      renderEmpty(target);
      return;
    }

    ensureStyles();

    var site = data.site || {};
    var period = data.period || args.period || {};
    var current = period.current || {};
    var previous = period.previous || {};
    var audience = data.audience || {};
    var engagement = data.engagement || {};
    var intent = data.intent || {};
    var whatsapp = intent.whatsapp || {};
    var funnel = data.funnel || {};
    var acquisition = data.acquisition || {};
    var technology = data.technology || {};
    var archeryGameConversion = data.archeryGameConversion || {};

    // El objetivo principal del dueño del sitio es "cuánta gente me escribe
    // por WhatsApp", así que esas dos tarjetas (personas + tasa) van primero
    // y resaltadas; Identificados queda como detalle en Audiencia, no acá.
    var summary =
      '<div class="buddy-dashboard-grid">' +
        // Bug #1: audience.visitors ahora viene explícito del backend con el
        // total de sesiones del período; se mantiene el fallback a
        // funnel.visitors solo por si el backend desplegado todavía no
        // incluye el campo. Antes caía a audience.anonymous (32 en vez de 65).
        metricCard('Visitantes', audience.visitors || funnel.visitors, formatNumber, 'visitantes') +
        metricCard('Te escriben por WhatsApp', whatsapp.uniqueUsers || whatsapp.clicks, formatNumber, 'intencionResumen', true) +
        metricCard('Conversión a WhatsApp', whatsapp.conversionRate, formatPercent, 'conversionWhatsapp', true) +
        // Bug #2: engagement.engagementRate ahora viene precalculado del
        // backend (engagedUsers / activeUsers). Antes engagement.engagedUsers
        // (un conteo, siempre truthy) ganaba el `||` y formatPercent(13)
        // mostraba "13%" en vez de la tasa real (~31%).
        metricCard('Engagement', engagement.engagementRate, formatPercent, 'engagementResumen') +
      '</div>';

    var registered =
      '<div class="buddy-dashboard-panel">' +
        '<div class="buddy-dashboard-panel__title">Registrados</div>' +
        '<div class="buddy-dashboard-mini-grid">' +
          '<div class="buddy-dashboard-mini"><div class="buddy-dashboard-mini__label">' + withTooltip('Total', 'registradosTotal') + '</div><div class="buddy-dashboard-mini__value">' +
            metricValue(audience.registered) + '</div></div>' +
          '<div class="buddy-dashboard-mini"><div class="buddy-dashboard-mini__label">' + withTooltip('Nuevos', 'registradosNuevos') + '</div><div class="buddy-dashboard-mini__value">' +
            metricValue(audience.newUsers) + '</div></div>' +
          // Bug #5: se quitó el tile "Activos" (audience.activeUsers). El
          // backend retiró ese campo del contrato porque, con el modelo
          // actual, siempre era idéntico a "Total" (un usuario solo entra
          // al set de registrados si tuvo al menos un evento) — mostrarlo
          // era ruido, no un dato adicional.
          '<div class="buddy-dashboard-mini"><div class="buddy-dashboard-mini__label">' + withTooltip('Recurrentes', 'registradosRecurrentes') + '</div><div class="buddy-dashboard-mini__value">' +
            // Bug #4: el dato vive en engagement.returningUsers, no en
            // audience.returningUsers (ese campo nunca existió en el
            // contrato; siempre mostraba "0").
            metricValue(engagement.returningUsers) + '</div></div>' +
        '</div>' +
      '</div>';

    var anonymous =
      '<div class="buddy-dashboard-panel">' +
        '<div class="buddy-dashboard-panel__title">Visitantes anónimos</div>' +
        '<div class="buddy-dashboard-mini-grid">' +
          '<div class="buddy-dashboard-mini"><div class="buddy-dashboard-mini__label">' + withTooltip('Visitantes', 'anonimosVisitantes') + '</div><div class="buddy-dashboard-mini__value">' +
            metricValue(audience.anonymous) + '</div></div>' +
          '<div class="buddy-dashboard-mini"><div class="buddy-dashboard-mini__label">' + withTooltip('Sesiones', 'anonimosSesiones') + '</div><div class="buddy-dashboard-mini__value">' +
            metricValue(engagement.sessions) + '</div></div>' +
          '<div class="buddy-dashboard-mini"><div class="buddy-dashboard-mini__label">' + withTooltip('Eventos', 'anonimosEventos') + '</div><div class="buddy-dashboard-mini__value">' +
            metricValue(engagement.events) + '</div></div>' +
          '<div class="buddy-dashboard-mini"><div class="buddy-dashboard-mini__label">' + withTooltip('Identificación', 'anonimosIdentificacion') + '</div><div class="buddy-dashboard-mini__value">' +
            metricValue(audience.identificationRate, formatPercent) + '</div></div>' +
        '</div>' +
      '</div>';

    var engagementHtml =
      // Bug #8: se pasa de grid--3 a la grilla base (4 columnas) para sumar
      // la tarjeta "Recurrentes" sin apretar las otras tres.
      '<div class="buddy-dashboard-grid">' +
        metricCard('Sesiones', engagement.sessions, formatNumber, 'sesiones') +
        metricCard('Usuarios activos', engagement.activeUsers, formatNumber, 'usuariosActivos') +
        metricCard('Usuarios comprometidos', engagement.engagedUsers, formatNumber, 'usuariosComprometidos') +
        metricCard('Recurrentes', engagement.returningUsers, formatNumber, 'registradosRecurrentes') +
      '</div>' +
      '<div class="buddy-dashboard-status" style="margin-top:12px">' +
        // Bug #11: la etiqueta decía "por usuario" a secas; el cálculo es
        // sesiones / usuarios REGISTRADOS (65/10 ≈ 6.5), una cifra que puede
        // sorprender si se compara mentalmente contra el total de usuarios
        // activos (42). Se deja explícito en el texto visible, no solo en
        // el tooltip.
        withTooltip('Sesiones por usuario registrado', 'sesionesPorUsuario') + ': <strong>' + escapeHtml(metricValue(engagement.sessionsPerUser)) +
        '</strong> · ' + withTooltip('Eventos por sesión', 'eventosPorSesion') + ': <strong>' + escapeHtml(metricValue(engagement.eventsPerSession)) + '</strong>' +
      '</div>';

    var whatsappHtml =
      '<div class="buddy-dashboard-grid buddy-dashboard-grid--3">' +
        metricCard('Clicks WhatsApp', whatsapp.clicks, formatNumber, 'clicksWhatsapp') +
        metricCard('Usuarios únicos', whatsapp.uniqueUsers, formatNumber, 'usuariosUnicosWhatsapp') +
        metricCard('Conversión', whatsapp.conversionRate, formatPercent, 'conversionWhatsapp') +
      '</div>';

    // Bug #12: "Intención" para clicks totales confundía en el visual del
    // embudo (parecía "10 intentan → 7 convierten" cuando los 7 son
    // subconjunto de los que clickearon). Se renombra a Clicks WA / Usuarios
    // WA, que deja explícito qué se está contando en cada escalón.
    var funnelKeys = [
      ['visitors', 'Visitantes', 'embudoVisitantes'],
      ['identified', 'Identificados', 'embudoIdentificados'],
      ['active', 'Activos', 'embudoActivos'],
      ['engaged', 'Comprometidos', 'embudoComprometidos'],
      ['intent', 'Clicks WA', 'embudoIntencion'],
      ['conversions', 'Usuarios WA', 'embudoConversiones']
    ];

    var funnelHtml =
      '<div class="buddy-dashboard-funnel">' +
      funnelKeys.map(function (item) {
        return '<div class="buddy-dashboard-funnel__item">' +
          '<div class="buddy-dashboard-funnel__label">' + withTooltip(item[1], item[2]) + '</div>' +
          '<div class="buddy-dashboard-funnel__value">' + metricValue(funnel[item[0]]) + '</div>' +
        '</div>';
      }).join('') +
      '</div>';

    /*
     * Las tres secciones siguientes consumen colecciones que vienen de la API
     * con una forma distinta a las métricas simples:
     *   - activities.users/sessions son métricas { value, ... }
     *     y sus métricas específicas viven en activity.activity.
     *   - acquisition.topReferrers usa source/percentage.
     *   - technology.* usa percentage.
     *
     * No debemos pasar esos objetos directamente a Number(): Number({}) === NaN
     * y la vista terminaba mostrando 0%. Aquí adaptamos exclusivamente la
     * presentación al contrato real de la API.
     */
    function collectionMetricValue(metric, fallback) {
      if (metric && typeof metric === 'object' && metric.value != null) {
        return metric.value;
      }
      if (metric != null && typeof metric !== 'object') {
        return metric;
      }
      return fallback == null ? 0 : fallback;
    }

    // Variante de collectionMetricValue para métricas que solo aplican a
    // módulos de juego (partidas, flechas, segundos activos, puntaje): a
    // diferencia de usuarios/sesiones, estas NO existen para módulos que no
    // son minijuegos (p.ej. "Admin"), así que ausencia de dato debe quedar
    // como null (y ocultarse en el render) en vez de mostrarse como "0" —
    // ese "0" falso es justamente el bug que hacía ver "0 partidas · 0
    // flechas · 0 s activos · 0 puntos" en un módulo que no tiene nada que
    // ver con archeryGame. Un cero real enviado por el backend (juego con
    // actividad nula en el período) sí se preserva y se muestra.
    function gameplayMetricValue(metric, fallback) {
      if (metric && typeof metric === 'object' && metric.value != null) {
        return metric.value;
      }
      if (metric != null && typeof metric !== 'object') {
        return metric;
      }
      return fallback != null ? fallback : null;
    }

    function collectionPercentValue(item) {
      if (!item) return 0;
      if (item.percentage != null) return item.percentage;
      if (item.share != null) return item.share;
      if (item.rate != null) return item.rate;
      if (item.value != null && typeof item.value !== 'object') return item.value;
      return 0;
    }

    var activitiesHtml = Array.isArray(data.activities) && data.activities.length
      ? '<div class="buddy-dashboard-grid buddy-dashboard-grid--2">' +
          data.activities.slice(0, 6).map(function (activity) {
            var activityMetrics = activity.activity || {};
            var users = collectionMetricValue(activity.users, activity.userCount);
            var sessions = collectionMetricValue(activity.sessions, null);
            var games = gameplayMetricValue(activity.games, activityMetrics.games);
            var arrows = gameplayMetricValue(activity.arrows, activityMetrics.arrows);
            var activeSeconds = gameplayMetricValue(activity.activeSeconds, activityMetrics.activeSeconds);
            var score = gameplayMetricValue(activity.score, activityMetrics.score);

            return '<div class="buddy-dashboard-panel">' +
              '<div class="buddy-dashboard-panel__title">' + escapeHtml(activity.name || activity.label || activity.module || 'Actividad') + '</div>' +
              '<div>' +
                escapeHtml(formatNumber(users)) + ' ' + withTooltip('usuarios', 'actividadUsuarios') +
                (sessions != null ? ' · ' + escapeHtml(formatNumber(sessions)) + ' ' + withTooltip('sesiones', 'actividadSesiones') : '') +
                (games != null ? ' · ' + escapeHtml(formatNumber(games)) + ' ' + withTooltip('partidas', 'actividadPartidas') : '') +
              '</div>' +
              ((arrows != null || activeSeconds != null || score != null) ? '<div style="margin-top:8px;color:#5f6368">' +
                (arrows != null ? escapeHtml(formatNumber(arrows)) + ' ' + withTooltip('flechas', 'actividadFlechas') : '') +
                (activeSeconds != null ? (arrows != null ? ' · ' : '') + escapeHtml(formatNumber(activeSeconds)) + ' ' + withTooltip('s activos', 'actividadSegundosActivos') : '') +
                (score != null ? ((arrows != null || activeSeconds != null) ? ' · ' : '') + escapeHtml(formatNumber(score)) + ' ' + withTooltip('puntos', 'actividadPuntos') : '') +
              '</div>' : '') +
              (activity.ctaConversion ? '<div style="margin-top:8px">Conversión asistida: <strong>' +
                escapeHtml(formatPercent(activity.ctaConversion.value != null ? activity.ctaConversion.value : activity.ctaConversion)) +
                '</strong></div>' : '') +
            '</div>';
          }).join('') +
        '</div>'
      : '<div class="buddy-dashboard-muted">Sin actividad específica en este período.</div>';

    // Bug #13: el backend ahora manda conversions/conversionRate por fuente
    // (cruce byActor ↔ referrer); se agrega como columna en vez de dejar el
    // dato calculado sin mostrar, igual que ya pasaba con pagePerformance.
    var acquisitionHtml =
      '<div class="buddy-dashboard-panel__title">Por fuente</div>' +
      listRows(acquisition.topReferrers, [
        { label: 'Fuente', term: 'adquisicionFuente', value: function (item) {
            return item.source || item.label || item.name || item.referrer || '—';
          } },
        { label: 'Visitantes', term: 'adquisicionVisitantes', value: function (item) {
            return formatNumber(item.visitors != null ? item.visitors : item.value);
          } },
        { label: 'Participación', term: 'adquisicionParticipacion', value: function (item) {
            return formatPercent(collectionPercentValue(item));
          } },
        { label: 'Conversión', term: 'adquisicionConversion', value: function (item) {
            return item.conversionRate != null ? formatPercent(item.conversionRate) : '—';
          } }
      ]) +
      // Bug #6: acquisition.pagePerformance ya traía whatsappRate/whatsappShare
      // por página desde el backend — el dato más accionable del dashboard
      // (qué página convierte mejor) — pero nunca se renderizaba.
      '<div class="buddy-dashboard-panel__title" style="margin-top:26px">Rendimiento por página</div>' +
      '<p class="buddy-dashboard-section-intro">Qué página convierte mejor a WhatsApp, para saber dónde reforzar el CTA.</p>' +
      listRows(acquisition.pagePerformance, [
        { label: 'Página', term: 'paginaPagina', value: function (item) {
            return item.title || item.url || '—';
          } },
        { label: 'Visitantes', term: 'paginaVisitantes', value: function (item) {
            return formatNumber(item.visitors);
          } },
        { label: 'Conversión WhatsApp', term: 'paginaConversionWhatsapp', value: function (item) {
            return formatPercent(item.whatsappRate);
          } },
        { label: 'Participación en clicks', term: 'paginaParticipacionClicks', value: function (item) {
            return formatPercent(item.whatsappShare);
          } }
      ]);

    // Bug #7: technology.operatingSystems llegaba calculado desde el
    // backend pero el grid solo tenía Dispositivos y Navegadores. Se pasa a
    // 3 columnas para sumar Sistema operativo.
    var technologyHtml =
      '<div class="buddy-dashboard-grid buddy-dashboard-grid--3">' +
        '<div class="buddy-dashboard-panel"><div class="buddy-dashboard-panel__title">Dispositivos</div>' +
          listRows(technology.devices, [
            { label: 'Dispositivo', term: 'tecnologiaDispositivo', value: function (item) { return item.label || item.name || item.key; } },
            { label: '%', term: 'tecnologiaPorcentaje', value: function (item) { return formatPercent(collectionPercentValue(item)); } }
          ]) +
        '</div>' +
        '<div class="buddy-dashboard-panel"><div class="buddy-dashboard-panel__title">Navegadores</div>' +
          listRows(technology.browsers, [
            { label: 'Navegador', term: 'tecnologiaDispositivo', value: function (item) { return item.label || item.name || item.key; } },
            { label: '%', term: 'tecnologiaPorcentaje', value: function (item) { return formatPercent(collectionPercentValue(item)); } }
          ]) +
        '</div>' +
        '<div class="buddy-dashboard-panel"><div class="buddy-dashboard-panel__title">Sistema operativo</div>' +
          listRows(technology.operatingSystems, [
            { label: 'Sistema', term: 'tecnologiaDispositivo', value: function (item) { return item.label || item.name || item.key; } },
            { label: '%', term: 'tecnologiaPorcentaje', value: function (item) { return formatPercent(collectionPercentValue(item)); } }
          ]) +
        '</div>' +
      '</div>';

    // Cruce archeryGame ↔ WhatsApp: demuestra si el minijuego canaliza hacia el
    // CTA. Si el backend todavía no envía este bloque (versión previa de la
    // API), se omite la sección en vez de mostrar tarjetas vacías.
    // Bug #14: avgSecondsBeforeClick se dividió en avgElapsedSecondsBeforeClick
    // (tiempo de calendario) y avgActiveSecondsBeforeClick (tiempo jugando de
    // verdad) — ver dashboard_admin.js. Se revisan ambos por si el backend
    // todavía no manda uno de los dos.
    var hasArcheryGameConversion = archeryGameConversion.playedVsNotPlayed ||
      archeryGameConversion.identifiedVsAnonymous ||
      archeryGameConversion.avgElapsedSecondsBeforeClick ||
      archeryGameConversion.avgActiveSecondsBeforeClick ||
      (Array.isArray(archeryGameConversion.conversionByPlayLevel) && archeryGameConversion.conversionByPlayLevel.length);

    var archeryGameLevelItems = archeryGameConversion.conversionByPlayLevel;
    var archeryGameInsight = archeryGameLevelInsight(archeryGameLevelItems);

    var archeryGameConversionHtml = hasArcheryGameConversion
      ? '<p class="buddy-dashboard-section-intro">Cruza la actividad del minijuego con los clicks a WhatsApp para ver si jugar realmente ayuda a conseguir más contactos.</p>' +
        (archeryGameInsight
          ? '<div class="buddy-dashboard-insight">' + archeryGameInsight + '</div>'
          : '') +
        '<div class="buddy-dashboard-panel__title" style="margin-bottom:10px">Conversión por nivel de juego <span class="buddy-dashboard-badge">vista más confiable</span></div>' +
        conversionByLevelTable(archeryGameLevelItems) +
        '<div class="buddy-dashboard-panel__title" style="margin:22px 0 10px">Otras comparaciones</div>' +
        // Bug #14: grid pasa de --3 a la grilla base (4 columnas) para sumar
        // la nueva tarjeta de tiempo jugado sin apretar las otras tres.
        '<div class="buddy-dashboard-grid">' +
          comparisonCard(
            'Conversión: jugó vs no jugó',
            archeryGameConversion.playedVsNotPlayed && archeryGameConversion.playedVsNotPlayed.played,
            archeryGameConversion.playedVsNotPlayed && archeryGameConversion.playedVsNotPlayed.notPlayed,
            'Jugó', 'No jugó', 'archeryGameJugoNoJugo'
          ) +
          comparisonCard(
            'Conversión: registrado vs anónimo',
            archeryGameConversion.identifiedVsAnonymous && archeryGameConversion.identifiedVsAnonymous.identified,
            archeryGameConversion.identifiedVsAnonymous && archeryGameConversion.identifiedVsAnonymous.anonymous,
            'Registrado', 'Anónimo', 'archeryGameRegistradoAnonimo'
          ) +
          durationCard('Tiempo transcurrido hasta el click', archeryGameConversion.avgElapsedSecondsBeforeClick, 'archeryGameTiempoTranscurridoClick') +
          durationCard('Tiempo jugado antes del click', archeryGameConversion.avgActiveSecondsBeforeClick, 'archeryGameTiempoJugadoClick') +
        '</div>' +
        '<div class="buddy-dashboard-muted" style="padding:10px 0 0;font-size:.85rem">' +
          'Con pocos actores en un grupo (etiqueta "muestra baja"), un solo caso puede mover el % varios puntos — leé estas comparaciones como tendencia, no como certeza. Más detalle en el anexo del dashboard.' +
        '</div>'
      : '<div class="buddy-dashboard-muted">Sin datos suficientes en este período.</div>';

    target.innerHTML =
      '<div class="buddy-dashboard">' +
        '<header class="buddy-dashboard__header">' +
          '<div>' +
            '<div class="buddy-dashboard__eyebrow">BUDDY</div>' +
            '<h1 class="buddy-dashboard__title">Dashboard</h1>' +
            '<div class="buddy-dashboard__site">' +
              escapeHtml(config.labels && config.labels.site || 'Mi sitio') + ': ' +
              '<strong>' + escapeHtml(site.name || site.siteId || '—') + '</strong>' +
            '</div>' +
          '</div>' +
          '<div class="buddy-dashboard__controls">' +
            '<div class="buddy-dashboard__period">' +
              escapeHtml(config.labels && config.labels.period
                ? config.labels.period.replace('{days}', current.days || 30)
                : 'Últimos ' + (current.days || 30) + ' días') +
              '<br>' + escapeHtml(current.from || '—') + ' — ' + escapeHtml(current.to || '—') +
              (previous.from ? '<br><small>Comparado con: ' + escapeHtml(previous.from) + ' — ' + escapeHtml(previous.to) + '</small>' : '') +
            '</div>' +
            '<button type="button" data-dashboard-refresh>Actualizar ↻</button>' +
          '</div>' +
        '</header>' +

        section('Resumen', summary) +
        section('Embudo', funnelHtml) +
        section('Contactos por WhatsApp', whatsappHtml) +
        section('ArcheryGame → WhatsApp', archeryGameConversionHtml) +
        section('Actividades', activitiesHtml) +
        section('Audiencia', '<div class="buddy-dashboard-grid buddy-dashboard-grid--2">' + registered + anonymous + '</div>') +
        section('Engagement', engagementHtml) +
        section('Adquisición', acquisitionHtml) +
        section('Tecnología', technologyHtml) +
        printGlossaryHtml() +
      '</div>';

    var refreshButton = target.querySelector('[data-dashboard-refresh]');
    if (refreshButton) {
      refreshButton.addEventListener('click', function () {
        refreshButton.disabled = true;
        Promise.resolve(args.refresh()).catch(function () {}).finally(function () {
          refreshButton.disabled = false;
        });
      });
    }
  }

  window.BuddyDashboardViews.admin = renderDashboard;
})(window, document);
