/**
 * Buddy Says — español / tono zen.
 *
 * Este archivo pertenece exclusivamente al módulo /says.
 * NO contiene diálogos de archeryGame ni claves específicas de ningún módulo.
 * Los textos propios de una habilidad deben vivir dentro de esa habilidad,
 * por ejemplo modules/archeryGame/es/buddy_archeryGame_zen.js.
 */
window.BuddyTexts = window.BuddyTexts || {};
window.BuddyTexts.says = window.BuddyTexts.says || {};
window.BuddyTexts.says.es = window.BuddyTexts.says.es || {};

window.BuddyTexts.says.es.zen = {
  meta: {
    locale: 'es',
    region: 'generic',
    tone: 'zen'
  },
  dialogues: {
    // Se muestra cuando ningún interceptor de chat (fórmulas, IA
    // especializada, etc.) asumió la respuesta al mensaje del usuario.
    // Ver buddy_says.js: procesarMensajeUsuario() / responderSinModulo().
    // Selección aleatoria sin repetir la variante anterior.
    sinRespuesta: [
      'Esta versión de Buddy no tiene respuesta a lo que me escribes, pero en otros sitios resuelvo fórmulas matemáticas, doy respuesta especializada con IA y muchas cosas más',
      'Todavía no sé responder eso en este sitio. En otras versiones mías calculo fórmulas, converso con IA especializada y hago bastante más',
      'Por aquí no tengo un módulo que entienda ese mensaje. En otros sitios sí resuelvo matemática, respondo con IA experta y más',
      'Esa la dejo pasar por ahora, este Buddy no tiene un módulo para eso. En otras instalaciones resuelvo fórmulas, uso IA especializada y bastante más',
      'No encontré quién te responda eso aquí. Hay versiones mías que calculan fórmulas, usan IA especializada y ofrecen mucho más',
      'En este sitio todavía no tengo respuesta para lo que escribiste. En otros, resuelvo matemática, converso con IA experta y sumo varias cosas más'
    ]
  }
};
