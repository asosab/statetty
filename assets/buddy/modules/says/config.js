/**
 * Buddy Says — configuración de fuentes.
 *
 * Este archivo es el punto de configuración del módulo /says.
 * Aquí se decide qué fuentes se cargan y cómo se utiliza cada listado.
 *
 * selection:
 *   - 'sequential' : recorre el listado en orden.
 *   - 'shuffle'    : selecciona aleatoriamente.
 *
 * recurrence: máximo de veces que un mismo mensaje puede aparecer por día.
 * frequency: intervalo mínimo/máximo, en minutos, entre intentos de esa fuente.
 */
window.BuddySaysConfig = window.BuddySaysConfig || {};
window.BuddySaysConfig.enabled = window.BuddySaysConfig.enabled !== false;
window.BuddySaysConfig.localization = { enabled: true };
// Tiempo visible del globo. Se calcula automáticamente según el largo del texto.
// Puedes ajustar estos valores sin tocar buddy_says.js.
window.BuddySaysConfig.display = {
  baseMs: 2800,
  minMs: 2800,
  maxMs: 9000,
  charsPerSecond: 10,
  extraMs: 500
};

window.BuddySaysConfig.sources = [
  // Se listan todas las fuentes disponibles en modules/says/sources/*.js.
  // Cada `id` debe coincidir con el nombre de archivo (sin .js). `enabled`
  // controla si la fuente se carga. Desactiva las que no quieras usar.
  {
    id: 'buddy_iniciales',
    enabled: true,
    selection: 'sequential',
    primero: true, // estos mensajes se entregan antes que cualquier otra fuente
    recurrence: 2, // cuantas veces se muestra al día
    frequency: { min: 0.3, max: 0.5 } //cada cuantos minutos se entregan mensajes de esta lista
  },
  { id: 'inmo_consejos',      enabled: false,  selection: 'shuffle',      recurrence: 2, frequency: { min: 0.3, max: 0.5 } },
  { id: 'inmo_curiosidades',  enabled: false,  selection: 'shuffle',      recurrence: 1, frequency: { min: 0.3, max: 0.5 } },
  { id: 'agenda',             enabled: false, selection: 'sequential',   recurrence: 1, frequency: { min: 1, max: 2 } },
  { id: 'arbat_iniciales',    enabled: false, selection: 'sequential',   recurrence: 1, frequency: { min: 1, max: 3 } },
  { id: 'arbat_consejos',     enabled: false, selection: 'shuffle',      recurrence: 1, frequency: { min: 1, max: 3 } },
  { id: 'arbat_curiosidades', enabled: false, selection: 'shuffle',      recurrence: 1, frequency: { min: 1, max: 3 } }
];

window.BuddyAgendaConfig = Object.assign({
  enabled: false,
  calendarId: 'statetty@gmail.com',
  timezone: 'America/La_Paz',
  apiKey: 'AIzaSyDnoPb09RbigaWadj1ssOLYN-7IL5WSIgg',
  horizonteDias: 31,
  capacidadPorTurno: 8,
  // Disponibilidad estructural de la agenda de citas. Las reservas reales se
  // obtienen de Google Calendar mediante el título automático "Agenda tu entrenamiento".
  horarios: [
    {
      dias: 'Lunes, miércoles y viernes',
      turnos: ['16:00–18:00', '18:00–20:00'],
      duracion: '2 horas'
    },
  ],
  palabrasClaveEventoEspecial: [
    'evento especial'
  ]
}, window.BuddyAgendaConfig || {});
