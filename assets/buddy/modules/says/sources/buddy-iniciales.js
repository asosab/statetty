/**
 * Buddy Says — fuente de mensajes iniciales.
 *
 * El listado vive directamente en esta fuente. No depende de archivos JSON o fetch() 
 *
 * Cada elemento puede ser un string o, si en el futuro se necesita, un objeto
 * con la forma aceptada por buddy_says.js: { id, texto, emocion }.
 */
window.BuddyInformSources = window.BuddyInformSources || {};

window.BuddyInformSources.buddy-iniciales = [
  {'id':'mWelcome','emocion':'sonriendo','texto':'¡Esto es Buddy! Yo soy Alejandro y voy a contarte algunas cosas fantásticas que puedo hacer' },
  {'id':'infoGame','emocion':'sonriendo','texto':'Si deseas verme lanzando flechas mientras tanto, puedes hacer click sobre mi y sin soltar desliza el puntero' },
];
