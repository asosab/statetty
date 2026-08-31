/**
 * Buddy Says — fuente de mensajes iniciales.
 *
 * El listado vive directamente en esta fuente. No depende de archivos JSON o fetch() 
 *
 * Cada elemento puede ser un string o, si en el futuro se necesita, un objeto
 * con la forma aceptada por buddy_says.js: { id, texto, emocion }.
 */
window.BuddyInformSources = window.BuddyInformSources || {};

window.BuddyInformSources.arbat_iniciales = [
  {'id':'mWelcome','emocion':'sonriendo','texto':'¡Bienvenido a arbat! Yo soy Raul, tu entrenador personal en tiro con arco' },
  {'id':'infoGame','emocion':'sonriendo','texto':'Si deseas jugar, has click sobre mi y sin soltar desliza el puntero ¡Usa el logo como diana!' },
];
