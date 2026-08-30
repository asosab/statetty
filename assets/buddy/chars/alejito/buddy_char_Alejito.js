/**
 * buddy_char_Alejito.js
 * ---------------------------------------------------------------------------
 * Perfil del personaje "Alejito" para la arquitectura "buddy".
 * ---------------------------------------------------------------------------
 */
window.BuddyChars = window.BuddyChars || {};
window.BuddyChars.alejito = {
  perfil: {
    id: 'alejito',
    nombre: 'Alejito',
    idioma: 'es',
    estilo: 'zen'
  },

  expresiones: {
    sereno: {
      archivo: 'sereno.png',
      ancho: 402,
      alto: 1161,
      escala: 1,
      anclas: {
        // esquina superior izquierda real de la cabeza
        cabeza_superior: { x: 127, y: 18 },
        // ojos del personaje (perspectiva del personaje)
        ojo_izquierdo: { x: 237, y: 189 },  // lado derecho de la imagen
        ojo_derecho:   { x: 154, y: 188 },  // lado izquierdo de la imagen
        // verificado con el borde superior del pantalón
        cintura: { x: 175, y: 608 },
        // punto más bajo de cada pie (para la línea de piso)
        pie_izquierdo: { x: 301, y: 1154 }, // pie izquierdo del personaje
        pie_derecho:   { x: 81,  y: 1139 }  // pie derecho del personaje
      }
    },
    sonriendo: {
      archivo: 'sonriendo.png',
      ancho: 396,
      alto: 1155,
      escala: 1,
      anclas: {
        // esquina superior izquierda real de la cabeza
        cabeza_superior: { x: 124, y: 11 },
        // ojos del personaje (perspectiva del personaje)
        ojo_izquierdo: { x: 236, y: 184 }, // lado derecho de la imagen
        ojo_derecho:   { x: 150, y: 184 }, // lado izquierdo de la imagen
        cintura: { x: 170, y: 602 },
        // borde inferior de cada pie
        pie_izquierdo: { x: 294, y: 1148 }, // pie izquierdo del personaje
        pie_derecho:   { x: 78,  y: 1133 }  // pie derecho del personaje
      }
    },
    guinio: {
      archivo: 'guinio.png',
      ancho: 396,
      alto: 1149,
      escala: 1,
      anclas: {
        // esquina superior izquierda real de la cabeza
        cabeza_superior: { x: 121, y: 8 },
        // ojos del personaje (perspectiva del personaje)
        // ojo_izquierdo = cerrado (guiño), lado derecho de la imagen
        ojo_izquierdo: { x: 233, y: 182 },
        // ojo_derecho = abierto, lado izquierdo de la imagen
        ojo_derecho:   { x: 148, y: 186 },
        cintura: { x: 167, y: 599 },
        // borde inferior de cada pie (puntos más bajos detectados)
        pie_izquierdo: { x: 291, y: 1145 }, // pie izquierdo del personaje
        pie_derecho:   { x: 75,  y: 1130 }  // pie derecho del personaje
      }
    },

  },

  diccionarioExpresiones: {
    neutral: 'sereno',
    positivo: 'sonriendo',
    complice: 'guinio',
    negativo: 'sereno' // hasta que exista una expresión negativa propia
  },

  escenarios: {},

  overridesPorModulo: {
    archeryGame: {
      images: {
        apuntar: {
          archivo: 'apuntar.png',
          ancho: 864,
          alto: 1237,
          escala: 1.1,
          anclas: {
            // esquina superior izquierda de la cabeza
            cabeza_superior: { x: 518, y: 47 },
            // centro aproximado del torso a la altura del borde superior del pantalón
            cintura: { x: 540, y: 742 },
            // borde inferior de cada pie 
            pie_izquierdo: { x: 649, y: 1236 }, // pie izquierdo del personaje (lado derecho de la imagen)
            pie_derecho:   { x: 424, y: 1236 }  // pie derecho del personaje (lado izquierdo de la imagen)
          }
        },
        liberar_flecha: {
          archivo: 'liberar_flecha.png',
          ancho: 864,
          alto: 1237,
          escala: 1.1,
          anclas: {
            // esquina superior izquierda de la cabeza
            cabeza_superior: { x: 496, y: 51 },
            // borde superior del pantalón (centro del torso)
            cintura: { x: 540, y: 742 },
            // borde inferior de cada pie
            pie_izquierdo: { x: 649, y: 1236 }, // pie izquierdo del personaje (lado derecho de la imagen)
            pie_derecho:   { x: 424, y: 1236 }  // pie derecho del personaje (lado izquierdo de la imagen)
          }
        },
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
          // centro de la mira (punto rojo del peep sight)
          centro: { x: 197, y: 201 }
        },
        flechas: ['flecha01.png', 'flecha02.png', 'flecha03.png', 'flecha04.png'],
        flecha01: { archivo: 'flecha01.png', escala: 0.5 },
        flecha02: { archivo: 'flecha02.png', escala: 0.5 },
        flecha03: { archivo: 'flecha03.png', escala: 0.5 },
        flecha04: { archivo: 'flecha04.png', escala: 0.5 }
      },
      sounds: {
        disparar: 'disparar.mp3', 
        impacto: 'impacto.mp3',   
        tensar: 'tensar.mp3' 
      }
    },
    says: {}
  }
};
