/**
 * buddy_char_Raulito.js
 * ---------------------------------------------------------------------------
 * Perfil del personaje "Raulito" para la arquitectura "buddy".
 * Generado en la Fase 1 del plan de migración (ver planBuddy_v5.md, 4.1).
 * Fuente de valores: raulito.js (CONFIG). Estructura/contrato: planBuddy_v5.md.
 * ---------------------------------------------------------------------------
 */
window.BuddyChars = window.BuddyChars || {};
window.BuddyChars.raulito = {
  perfil: {
    id: 'raulito',
    nombre: 'Raulito',
    idioma: 'es',
    estilo: 'zen'
  },

  // Convención de nombres: el archivo se llama igual que la expresión que
  // representa. 'sereno' es obligatoria (viene de CONFIG.poses.idle /
  // pose03.png). 'sonriendo' y 'guinio' son nuevas en esta arquitectura:
  // raulito.js no tiene fuente para sus dimensiones/anclas.
  expresiones: {
    sereno: {
      archivo: 'sereno.png',
      ancho: 372,
      alto: 1195,
      escala: 1,
      anclas: {
        // esquina superior izquierda real de la cabeza (bounding box del bucket hat)
        cabeza_superior: { x: 90, y: 59 },
        // ojos del personaje (perspectiva del personaje)
        ojo_izquierdo: { x: 228, y: 182 },  // lado derecho de la imagen
        ojo_derecho:   { x: 158, y: 187 },  // lado izquierdo de la imagen
        // verificado con el borde superior de los shorts
        cintura: { x: 179, y: 621 },
        // punto más bajo de cada pie (para la línea de piso)
        pie_izquierdo: { x: 296, y: 1165 }, // pie izquierdo del personaje
        pie_derecho:   { x: 71,  y: 1171 }  // pie derecho del personaje
      }
    },
    sonriendo: {
      archivo: 'sonriendo.png',
      ancho: 372,
      alto: 1195,
      escala: 1,
      anclas: {
        // esquina superior izquierda real de la cabeza (bounding box del bucket hat)
        cabeza_superior: { x: 90, y: 59 },
        // ojos del personaje (perspectiva del personaje)
        ojo_izquierdo: { x: 228, y: 180 }, // lado derecho de la imagen
        ojo_derecho:   { x: 158, y: 182 }, // lado izquierdo de la imagen
        cintura: { x: 179, y: 622 },
        // borde inferior de cada pie
        pie_izquierdo: { x: 296, y: 1165 }, // pie izquierdo del personaje
        pie_derecho:   { x: 71,  y: 1171 }  // pie derecho del personaje
      }
    },
    guinio: {
      archivo: 'guinio.png',
      ancho: 369,
      alto: 1195,
      escala: 1,
      anclas: {
        // esquina superior izquierda real de la cabeza (bounding box del bucket hat)
        cabeza_superior: { x: 90, y: 59 },
        // ojos del personaje (perspectiva del personaje)
        // ojo_izquierdo = cerrado (guiño), lado derecho de la imagen
        ojo_izquierdo: { x: 228, y: 178 },
        // ojo_derecho = abierto, lado izquierdo de la imagen
        ojo_derecho:   { x: 160, y: 178 },
        cintura: { x: 181, y: 622 },
        // borde inferior de cada pie (puntos más bajos detectados)
        pie_izquierdo: { x: 293, y: 1194 }, // pie izquierdo del personaje
        pie_derecho:   { x: 72,  y: 1194 }  // pie derecho del personaje
      }
    }
    // Expresiones negativas futuras (pesar, dolor, melancolia...) se agregan
    // acá con el mismo criterio cuando exista el arte. pose04.png
    // (CONFIG.poses.fail) queda disponible como posible base para una de
    // ellas, pero NO se registra automáticamente como expresión negativa
    // (ver decisión F del plan): 'negativo' sigue apuntando a 'sereno'.
  },

  diccionarioExpresiones: {
    neutral: 'sereno',
    positivo: 'sonriendo',
    complice: 'guinio',
    negativo: 'sereno' // hasta que exista una expresión negativa propia
  },

  // Fondos donde este personaje puede aparecer. raulito.js no contiene
  // configuración de escenarios/fondos (no hay CONFIG.escenarios ni
  // equivalente), así que no se pudo confirmar aquí ningún nombre ni
  // dimensión propios del código fuente.
  // TODO: confirmar el set de escenarios y sus dimensiones; se deja el
  // objeto vacío por no encontrarse fuente de verdad en raulito.js.
  escenarios: {},

  overridesPorModulo: {
    archeryGame: {
      images: {
        apuntar: {
          archivo: 'apuntar.png',
          ancho: 848,
          alto: 1264,
          escala: 1.1,
          anclas: {
            // esquina superior izquierda del bucket hat (vista de espalda)
            cabeza_superior: { x: 479, y: 290 },
            // centro aproximado del torso a la altura del borde superior de los shorts
            cintura: { x: 512, y: 737 },
            // borde inferior de cada pie (vista de espalda)
            pie_izquierdo: { x: 610, y: 1239 }, // pie izquierdo del personaje (lado derecho de la imagen)
            pie_derecho:   { x: 408, y: 1231 }  // pie derecho del personaje (lado izquierdo de la imagen)
          }
        },
        liberar_flecha: {
          archivo: 'liberar_flecha.png',
          ancho: 848,
          alto: 1264,
          escala: 1.1,
          anclas: {
            // esquina superior izquierda del bucket hat (vista de espalda)
            cabeza_superior: { x: 479, y: 298 },
            // borde superior de los shorts (centro del torso)
            cintura: { x: 512, y: 736 },
            // borde inferior de cada pie (vista de espalda)
            pie_izquierdo: { x: 610, y: 1239 }, // pie izquierdo del personaje (lado derecho de la imagen)
            pie_derecho:   { x: 417, y: 1231 }  // pie derecho del personaje (lado izquierdo de la imagen)
          }
        },
        // Son los mismos archivos genéricos de archeryGame, pero Raulito los
        // declara explícitamente para que el perfil sea la fuente de sus
        // metadatos. Las escalas coinciden con CONFIG.scales del módulo:
        // mira = 1, arrow = 1, target = 1.
        diana: {
          archivo: 'diana.png',
          escala: 1, //0.375
          rings: [
            { points: 10, outerPercent: 0.10 },
            { points: 9,  outerPercent: 0.20 },
            { points: 8,  outerPercent: 0.30 },
            { points: 7,  outerPercent: 0.40 },
            { points: 6,  outerPercent: 0.50 },
            { points: 5,  outerPercent: 0.60 },
            { points: 4,  outerPercent: 0.70 },
            { points: 3,  outerPercent: 0.80 },
            { points: 2,  outerPercent: 0.90 },
            { points: 1,  outerPercent: 1.00 }
          ]
        },
        mira: {
          archivo: 'mira.png',
          escala: 1,
          // centro de la mira (centro del peep / abertura circular)
          centro: { x: 230, y: 220 }
        },
        // Se conserva la colección para la compatibilidad existente y se
        // declaran además las cuatro claves individuales con su escala.
        flechas: ['flecha01.png', 'flecha02.png', 'flecha03.png', 'flecha04.png'],
        flecha01: { archivo: 'flecha01.png', escala: 0.5 },
        flecha02: { archivo: 'flecha02.png', escala: 0.5 },
        flecha03: { archivo: 'flecha03.png', escala: 0.5 },
        flecha04: { archivo: 'flecha04.png', escala: 0.5 }
      },
      sounds: {
        disparar: 'disparar.mp3', // = CONFIG.shotSound ('disparo.mp3'), renombrado según Fase 0
        impacto: 'impacto.mp3',   // = CONFIG.hitSound ('golpe.mp3'), renombrado según Fase 0
        tensar: 'tensar.mp3'      // = CONFIG.tensSound
      }
    },
    says: {}
  }
};
