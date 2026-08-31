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
  {
    id: 'inmo-iniciales',
    enabled: true,
    selection: 'sequential',
    primero: true, // estos mensajes se entregan antes que cualquier otra fuente
    recurrence: 2, // cuantas veces se muestra al día
    frequency: { min: 0.3, max: 0.5 } //cada cuantos minutos se entregan mensajes de esta lista
  },  
  //{id: 'agenda',        enabled: true, selection: 'sequential',   recurrence: 1, frequency: { min: 1, max: 2 }},
  {id: 'inmo-consejos',      enabled: true, selection: 'shuffle',      recurrence: 2, frequency: { min: 0.3, max: 0.5 }},
  {id: 'inmo-curiosidades',  enabled: true, selection: 'shuffle',      recurrence: 1, frequency: { min: 0.3, max: 0.5 }}
];

window.BuddyAgendaConfig = Object.assign({
  enabled: true,
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
