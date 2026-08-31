/**
 * Buddy Says — fuente de mensajes iniciales.
 *
 * El listado vive directamente en esta fuente. No depende de archivos JSON o fetch() 
 *
 * Cada elemento puede ser un string o, si en el futuro se necesita, un objeto
 * con la forma aceptada por buddy_says.js: { id, texto, emocion }.
 */
window.BuddyInformSources = window.BuddyInformSources || {};

window.BuddyInformSources.inmo_iniciales = [
  {'id':'mWelcome','emocion':'sonriendo','texto':'¡Bienvenido a Statetty! Yo soy Alejandro y te acompañaré en este recorrido' },
  {'id':'infoGame','emocion':'sonriendo','texto':'Si deseas jugar, has click sobre mi y sin soltar desliza el puntero hacia abajo' }
];
