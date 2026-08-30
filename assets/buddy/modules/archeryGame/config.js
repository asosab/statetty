/**
 * Buddy Archery — configuración del módulo.
 *
 * Este archivo contiene toda la configuración ajustable de /archeryGame.
 * buddy_archeryGame.js sólo implementa la mecánica y consume esta configuración.
 */
window.BuddyArcheryGameConfig = window.BuddyArcheryGameConfig || {
      enabled: true,
      localization: { enabled: true },
      // condition opcional: puede devolver true/false según URL, sitio, etc.
      // -------------------------------------------------------------------
      // Imágenes de las poses propias de Archery para Buddy.
      //
      // Estos archivos viven en modules/archeryGame/images/ y son los mismos
      // assets que se declaran en chars/*/images/archery/.
      // Se conserva aquí toda la metadata visual necesaria para que el
      // módulo no dependa de datos dispersos en buddy_char_*.js.
      // -------------------------------------------------------------------
      images: {
        // Recursos visuales del módulo. Los objetos contienen la metadata
        // que Archery necesita cuando CONFIG.resources fuerza el uso del
        // asset del módulo, sin consultar overrides del personaje.
        mira: {
          archivo: 'mira.png',
          ancho: 484,
          alto: 396,
          escala: 1,
          anclas: {}
        },
        diana: {
          archivo: 'diana.png',
          ancho: 300,
          alto: 300,
          escala: 1,
          anclas: {}
        },
        flecha01: { archivo: 'flecha01.png', ancho: 600, alto: 402, escala: 1, anclas: {} },
        flecha02: { archivo: 'flecha02.png', ancho: 600, alto: 402, escala: 1, anclas: {} },
        flecha03: { archivo: 'flecha03.png', ancho: 600, alto: 402, escala: 1, anclas: {} },
        flecha04: { archivo: 'flecha04.png', ancho: 600, alto: 402, escala: 1, anclas: {} },

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
        }
      },

      // Política de precedencia de recursos.
      // target: la diana se resuelve con precedencia página -> personaje -> módulo.
      // auto   = comportamiento normal para recursos de imagen del módulo.
      // module = fuerza el recurso del módulo para los recursos compatibles.
      // disabled = desactiva el recurso visual.
      resources: {
        target: { mode: 'auto' },
        mira: { mode: 'auto' },
        arrows: { mode: 'auto' },
        aim: { mode: 'auto' },
        fire: { mode: 'auto' }
      },

      arrowImages: ['flecha01.png', 'flecha02.png', 'flecha03.png', 'flecha04.png'],
      shotSound: 'disparar.mp3',
      hitSound: 'impacto.mp3',
      tensSound: 'tensar.mp3',
      scales: {
        mira: 1,
        arrow: 1,
        target: 1
      },

      // Tamaño base de los elementos propios del módulo, medido sobre el
      // lado largo del viewport.
      arrowLongSidePercent: 0.1,
      miraLongSidePercent: 0.20,
      targetLongSidePercent: 0.09,
      longPressThresholdMs: 350,
  
      // Ventana de disparo: soltar antes de esto = pose02 (disparó bien).
      // Coincide a propósito con CONFIG.sostenido.imposibleEnMs (8s): a
      // partir de ese punto el temblor por sostener la mira ya es tan
      // grande que en la práctica apuntar bien deja de ser posible.,
      fireWindowMs: 8000,
      // El tope de tiempo sosteniendo el arco ya no es un valor fijo: lo
      // define CONFIG.sostenido, con un instante distinto (entre
      // forzarBajaMinMs y forzarBajaMaxMs) cada vez que se apunta. Ver ese
      // bloque más abajo.
  
      // Cuánto se queda mostrando pose02/pose04 antes de volver a pose03.,
      resolveDisplayMs: 1500,
      // Cuánto se queda visible el globo de diálogo con el resultado.,
      hitDelayMs: 300,
  
      // Multiplicador de "exageración" del movimiento de la mira respecto al
      // arrastre real del puntero.
      // Sin amplificar, no hay espacio físico suficiente para mover la mira
      // hasta el borde izquierdo de la pantalla: buddy arranca pegado a la
      // esquina inferior derecha, así que el arrastre válido (ver regla de
      // "mitad de pantalla" abajo) dispone de poco recorrido en píxeles reales
      // antes de considerarse inválido. Subir este valor si la mira sigue sin
      // llegar al borde; bajarlo si se vuelve demasiado nerviosa/difícil de
      // controlar.,
      aimSensitivity: 4,
  
      // -------------------------------------------------------------------
      // Latidos de la mira (v0.4). Zona de calibración pensada para ensayo y
      // error visual, igual que `scales` — no hace falta tocar el resto del
      // script para ajustar cómo se siente el pulso.
      //
      // Mecánica: mientras se apunta, un loop de animación calcula en cada
      // frame una intensidad 0..1. Esa intensidad SUBE rápido (ver
      // `intensityAttackPerSec`) cuando el puntero real se mueve rápido
      // (medido en px/ms contra `velocityForMaxIntensity`), y BAJA lento
      // (`intensityReleasePerSec`) apenas el puntero deja de moverse — igual
      // que un pulso real, que se acelera al instante ante un sobresalto
      // pero tarda en volver a calmarse. La intensidad interpola entre los
      // valores "rest" (reposo) y "max" (agitado) de amplitud/bpm de abajo,
      // y también escala el ruido aleatorio (`jitterPx`) que hace que el
      // temblor se sienta errático y no un simple vaivén regular.,
      heartbeat: {
        enabled: true,
  
        // Amplitud del pulso en reposo (px) — debe ser chica, casi
        // imperceptible a simple vista.
        restAmplitudePx: 1.5,
        // Amplitud del pulso al máximo de agitación (px).
        maxAmplitudePx: 14,
  
        // Frecuencia del pulso en reposo, en pulsaciones por minuto (bpm),
        // como un latido cardíaco tranquilo.
        restBpm: 62,
        // Frecuencia del pulso al máximo de agitación (bpm), como un latido
        // acelerado.
        maxBpm: 190,
  
        // Velocidad real del puntero (px/ms) que corresponde a intensidad
        // máxima (1). Un arrastre rápido con mouse/dedo suele rondar 1.5-3
        // px/ms — bajar este valor si cuesta llegar a la intensidad máxima,
        // subirlo si se dispara demasiado fácil.
        velocityForMaxIntensity: 2.2,
  
        // Qué tan rápido SUBE la intensidad ante un movimiento brusco,
        // expresado en "unidades de intensidad (0 a 1) por segundo". Alto =
        // reacciona casi al instante ante el sobresalto.
        intensityAttackPerSec: 10,
        // Qué tan rápido BAJA la intensidad cuando el puntero se queda
        // quieto, mismas unidades. Bajo = tarda en calmarse.
        intensityReleasePerSec: 1.2,
        // Cuántos ms sin un evento pointermove hacen falta para considerar
        // que el puntero real "dejó de moverse" (y por lo tanto el objetivo
        // de intensidad empieza a decaer hacia el reposo).
        stillnessMs: 80,
  
        // Temblor errático adicional (px), sumado al pulso principal y
        // escalado por la intensidad actual — a intensidad 0 no suma nada,
        // a intensidad 1 suma hasta este valor en cada eje.
        jitterPx: 6
      },
  
      // -------------------------------------------------------------------
      // Temblor de cansancio muscular (v0.5). A diferencia del latido de
      // `heartbeat` (que reacciona a la VELOCIDAD del puntero real), este
      // temblor depende de CUÁNTAS flechas se llevan disparadas y CUÁNTO se
      // descansó entre una y otra — simula que sostener y tensar el arco
      // repetidas veces, sin pausas, cansa el brazo. Se suma encima del
      // pulso de `heartbeat` (ambos comparten el mismo loop de animación,
      // ver aimTremorTick), y puede activarse/desactivarse por separado con
      // `enabled`.,
      fatigue: {
        enabled: true,
  
        // Cantidad de flechas disparadas (impactadas) en la sesión a partir
        // de la cual empieza a manifestarse el cansancio. Antes de llegar a
        // esta flecha no hay temblor de cansancio (sólo puede seguir
        // habiendo latido, que es independiente).
        startAfterArrow: 6,
  
        // Tiempo mínimo esperable entre el disparo de una flecha y el
        // siguiente para considerarlo un ritmo "sano". Disparar antes de
        // que pase este tiempo desde la flecha anterior sube el temblor un
        // nivel (ver increasePerLateShot) y suma una flecha a la racha de
        // exhaustionStreak.
        expectedCooldownMs: 5000,
  
        // Cuántos niveles de temblor se suman cada vez que se dispara sin
        // respetar expectedCooldownMs.
        increasePerLateShot: 1,
  
        // Tope de niveles de temblor (0 = sin temblor). Evita que crezca
        // sin límite visual aunque se acumulen muchas flechas seguidas.
        maxLevel: 6,
  
        // A partir de cuántos ms de descanso (sin disparar) empieza a BAJAR
        // el temblor. Por debajo de este tiempo el temblor no sube (si se
        // respetó expectedCooldownMs) ni baja: queda como está.
        restStartMs: 15000,
        // Cada cuántos ms adicionales de descanso, por encima de
        // restStartMs, se suma un nivel más de reducción. Con los valores
        // por defecto: a los 15s se reduce 1 nivel, a los 20s 2 niveles, a
        // los 25s 3 niveles, y así de a restStepMs hasta llegar a 0. Ajustar
        // estos dos valores (restStartMs / restStepMs) para hacer la
        // recuperación más rápida o más lenta.
        restStepMs: 5000,
  
        // Cuántas flechas SEGUIDAS disparadas sin respetar
        // expectedCooldownMs (sin que se corte la racha con un disparo bien
        // espaciado) hacen que Raúl se agote del todo: fuerza pose04 y dice
        // exhaustionMessage, bloqueando nuevos disparos. Sólo cuenta a
        // partir de startAfterArrow.
        exhaustionStreak: 18,
        // Lo que dice Raúl al agotarse del todo. Texto real en
        // getDialogue('exhaustion') — ver enterExhaustedIdle() y
        // onPointerDown(). Null para permitir sobreescritura puntual.
        exhaustionMessage: null,
        // Cuánto descanso (ms sin disparar) hace falta, una vez agotado,
        // para que Raúl vuelva solo a pose03 y se pueda seguir jugando. Por
        // defecto es igual a restStartMs (el mismo umbral que empieza a
        // bajar el temblor), pero se deja como valor propio por si se
        // quiere pedir un descanso más largo específicamente para
        // recuperarse del agotamiento total.
        exhaustionRestMs: 15000,
  
        // Calibración visual: cuántos px de amplitud aporta CADA nivel de
        // temblor (se suma encima del pulso de heartbeat).
        amplitudePerLevelPx: 2.5,
        // Ruido/jitter aleatorio adicional por nivel, análogo a
        // heartbeat.jitterPx pero propio de este sistema.
        jitterPerLevelPx: 1.2,
        // Frecuencia de la sacudida de cansancio, en ciclos por segundo
        // (Hz). A diferencia del latido (bpm variable según intensidad),
        // acá la frecuencia es fija — sólo la amplitud/jitter escalan con
        // el nivel de cansancio.
        shakeHz: 9
      },
  
      // -------------------------------------------------------------------
      // Vaivén en forma de 8 (v0.6). Handicap de puntería independiente del
      // latido (`heartbeat`) y del temblor de cansancio (`fatigue`), aunque
      // se calcula en el mismo loop de animación y se suma encima de ambos.
      //
      // Mecánica: mientras se apunta, la mira recorre constantemente una
      // curva de Lissajous 1:2 (x = sin(fase), y = 0.5·sin(2·fase)) alrededor
      // de su posición base — el trazo clásico de un "8" acostado. A
      // diferencia del latido, NO depende de qué tan rápido se mueve el
      // puntero real: es un balanceo ambiente presente desde el primer
      // instante de apuntado, constante mientras no haya cansancio.
      //
      // El radio de ese 8 (qué tan lejos del centro llega la mira) arranca
      // chico (`baseRadiusPx`) y crece con el mismo nivel de cansancio que
      // ya calcula `currentFatigueLevel()` para `fatigue` — reutiliza ese
      // nivel (0..fatigue.maxLevel) en vez de llevar un contador propio, así
      // que si `fatigue.enabled` está en false el radio nunca crece y queda
      // fijo en `baseRadiusPx`.,
      vaiven: {
        enabled: true,
  
        // Radio (px) del 8 sin cansancio acumulado — debe ser chico, "un
        // ligero vaivén" apenas perceptible.
        baseRadiusPx: 5,
        // Radio adicional (px) que aporta CADA nivel de cansancio actual
        // (currentFatigueLevel), sumado sobre baseRadiusPx. Con los valores
        // por defecto de `fatigue` (maxLevel: 6), el radio máximo posible es
        // baseRadiusPx + 6 * radiusPerFatigueLevelPx.
        radiusPerFatigueLevelPx: 3.5,
  
        // Velocidad a la que se recorre el 8, en vueltas completas por
        // segundo (Hz). Deliberadamente lento — es un balanceo, no un
        // temblor — para que se distinga a simple vista del latido/cansancio.
        hz: 0.35
      },
  
      // -------------------------------------------------------------------
      // Cadencia de disparo (v1.0). Handicap nuevo, independiente de
      // `fatigue` aunque mide lo mismo que dispara su umbral (el tiempo
      // transcurrido desde el último disparo, `lastShotAt`). La diferencia:
      // `fatigue` sube/baja por NIVELES discretos (un nivel entero por
      // disparo apurado, decae de a pasos con `restStartMs`/`restStepMs`);
      // acá el efecto es CONTINUO y puramente de tiempo transcurrido —
      // cuanto MENOS tiempo pasó desde el último disparo, mayor el
      // multiplicador (> 1) que se aplica ENCIMA de lo que cada uno ya
      // calcula por su cuenta: la distancia del vaivén en 8
      // (`vaivenRadius`), el recorrido del latido (`amplitude`/jitter de
      // `heartbeat`) y la distancia del temblor de cansancio
      // (`fatigueAmplitude`/jitter de `fatigue`) — los tres a la vez (ver
      // `cadenciaMultiplier` y su uso en `aimTremorTick`). Con una pausa
      // de `restMs` (6s por defecto) sin disparar, el multiplicador vuelve
      // a 1 y las tres distancias quedan en su valor original, como si
      // este handicap no existiera.
      //
      // Importante: esto NO toca ninguno de los tiempos de cooldown que ya
      // exige `fatigue` (expectedCooldownMs, restStartMs/restStepMs,
      // exhaustionStreak, exhaustionRestMs) ni el cooldown del carcaj
      // (`arrowLimit`) — es un efecto puramente visual sobre la mira,
      // igual que el resto de los temblores, y nunca afecta la posición
      // BASE que se usa para validar el apuntado.,
      cadencia: {
        enabled: true,
  
        // Pausa (ms) sin disparar que hace falta para que el multiplicador
        // vuelva a 1 (distancias en su valor original).
        restMs: 6000,
  
        // Multiplicador EXTRA (encima de 1) en el peor caso, cuando el
        // tiempo desde el último disparo es ~0 (se vuelve a disparar casi
        // inmediatamente). Con el valor por defecto (1) el multiplicador
        // total va de 2× (recién disparado) a 1× (tras restMs de pausa) —
        // ajustar a mano junto con el resto de las amplitudes si se siente
        // poco o demasiado intenso.
        maxExtraMultiplier: 1
      },
  
      // -------------------------------------------------------------------
      // Cansancio por sostener la mira (v2.0). Handicap nuevo, distinto de
      // `fatigue` (que depende de cuántas flechas se dispararon en la
      // sesión) y de `heartbeat` (que depende de qué tan rápido se mueve
      // el puntero real). Este depende únicamente de cuánto tiempo lleva
      // sostenida ESTA mira sin soltar, contado desde `aimStartedAt`.
      //
      // Mecánica: desde el instante de apuntar hasta `startAfterMs` (4s)
      // no aporta nada. A partir de ahí crece con una curva EXPONENCIAL
      // real, definida por `growthRate`, hasta llegar a intensidad máxima
      // en `imposibleEnMs` (8s), momento en el que el temblor total ya es
      // tan grande que apuntar bien deja de ser posible en la práctica.
      // Ese crecimiento empuja dos cosas a la vez, tal como pidió el
      // diseño ("se incrementa el temblor y los latidos"):
      //   1. Un piso mínimo para `heartbeatTargetIntensity` (ver
      //      aimTremorTick), así el pulso de `heartbeat` también se
      //      acelera solo, aunque el puntero esté quieto.
      //   2. Una sacudida propia adicional (amplitud/jitter definidos
      //      acá), sumada encima de todo lo demás.
      //
      // Un poco después de volverse imposible de sostener, el brazo baja
      // solo: entre `forzarBajaMinMs` y `forzarBajaMaxMs` (10 a 14s) se
      // sortea un instante distinto cada vez que se apunta (ver
      // enterAimState) en el que, si todavía no se soltó, se fuerza el
      // fallo (pose04) mostrando `forzarBajaMensaje`.,
      sostenido: {
        enabled: true,
  
        // Desde acá empieza a subir la intensidad (ms desde que se
        // empezó a apuntar).
        startAfterMs: 4000,
        // En este punto la intensidad llega a su máximo (1). Coincide con
        // CONFIG.fireWindowMs por diseño (ver comentario ahí).
        imposibleEnMs: 8000,
        // Qué tan pronunciada es la curva exponencial (progress 0..1 hacia
        // intensidad 0..1). Un valor más alto mantiene el arranque más
        // suave y concentra el crecimiento fuerte cerca del final.
        growthRate: 3.5,
  
        // Amplitud propia (px) en el peor momento (intensidad 1), sumada
        // encima del pulso de heartbeat.
        maxAmplitudePx: 40,
        // Ruido aleatorio propio (px) en el peor momento, análogo a
        // heartbeat.jitterPx / fatigue.jitterPerLevelPx.
        maxJitterPx: 22,
        // Frecuencia de esta sacudida (Hz), más rápida que la de fatigue
        // para que se sienta distinta y más urgente.
        shakeHz: 11,
  
        // Ventana (ms) en la que se sortea el instante exacto en el que el
        // brazo se fuerza a bajar, si para entonces todavía no se soltó.
        forzarBajaMinMs: 10000,
        forzarBajaMaxMs: 14000,
        // Mensaje que dice Raúl al bajar el brazo forzosamente.
        forzarBajaMensaje: '¡Se me cansó el brazo! Necesito un descanzo'
      },
  
      // -------------------------------------------------------------------
      // Mira sin calibrar (v0.8). Handicap de puntería distinto a los
      // anteriores: no mueve el DIBUJO de la mira en pantalla (eso lo
      // siguen haciendo heartbeat/fatigue/vaiven encima), sino que desplaza
      // el PUNTO DE IMPACTO real (el que usan computeScore y stickArrowAt)
      // respecto de donde el jugador vio realmente el centro de la mira al
      // soltar — como una mira óptica que no está bien calibrada: uno
      // apunta donde parece correcto, pero la flecha cae corrida.
      //
      // Al cargar la página se sortea un error fijo (`calibOffsetX/Y`, ver
      // más abajo) de entre `minErrorPx` y `maxErrorPx` de magnitud, en una
      // dirección aleatoria. Ese error se mantiene igual disparo a disparo
      // dentro de una misma andanada: no es ruido nuevo en cada flecha, sino
      // un desvío constante de la mira.
      //
      // Al completar cada andanada, la mira se ajusta una sola vez. La
      // precisión del ajuste se sortea entre `minCorrectionPrecision` y
      // `maxCorrectionPrecision`: por ejemplo, con 60% de precisión queda
      // el 40% del error anterior. Si el error restante es menor que
      // `centerSnapThresholdPx`, se fuerza a 0 y la mira queda perfectamente
      // alineada. Una vez alineada no vuelve a ajustarse.
      calibracion: {
        enabled: true,
  
        // Magnitud mínima/máxima (px) del error inicial, sorteado una sola
        // vez al cargar la página (ver initCalibration).
        minErrorPx: 10,
        maxErrorPx: 30,
  
        // Precisión mínima/máxima del ajuste que se sortea al completar
        // cada andanada. 0.60 = corrige como mínimo el 60% del error actual;
        // 1.00 = corrige el 100%.
        minCorrectionPrecision: 0.60,
        maxCorrectionPrecision: 1.00,

        // Si después de un ajuste quedan menos de esta cantidad de píxeles
        // de error, se considera que la mira ya está centrada y se coloca
        // exactamente en el centro.
        centerSnapThresholdPx: 5,
  
        // Lo que dice Raúl al recalibrar, mostrado con el mismo delay que
        // dura el globo de puntaje de la última flecha de la andanada
        // (2800), para no taparlo. Texto real en
        // getDialogue('recalibrating') — ver uso en
        // scheduleCalibrationMessage(). Se deja en null para permitir
        // sobreescritura puntual si se necesita.
        message: null
      },
  
      // -------------------------------------------------------------------
      // Límite de flechas / cooldown del carcaj (v0.4). Cada
      // `countBeforeCooldown` flechas clavadas, Buddy necesita `cooldownMs`
      // antes de poder disparar de nuevo (va a buscar las flechas). A los
      // `fadeStartMs` de esa espera, las flechas de la tanda recién
      // completada empiezan a desvanecerse durante `fadeDurationMs`, hasta
      // desaparecer del todo. Si se intenta iniciar un disparo estando en
      // cooldown, se muestra `waitMessage` en vez de entrar en pose de
      // apuntado.,
      arrowLimit: {
        countBeforeCooldown: 6,
        cooldownMs: 10000,
        fadeStartMs: 5000,
        // Por defecto ocupa el resto del cooldown (cooldownMs - fadeStartMs)
        // para que las flechas terminen de desvanecerse justo cuando se
        // vuelve a poder disparar. Se puede fijar a mano si se prefiere un
        // desvanecimiento más rápido o más lento.
        fadeDurationMs: 5000,
        // Texto real en getDialogue('arrow_cooldown_wait') — ver
        // uso en onPointerDown(). Null para permitir sobreescritura puntual.
        waitMessage: null
      },
  
      // -------------------------------------------------------------------
      // Registro de flechas de la sesión (v0.5). Ver `sessionArrowLog` más
      // abajo — un arreglo en memoria con TODAS las flechas disparadas
      // (impactadas) desde que se cargó la página, pensado para usarse más
      // adelante (estadísticas, analítica, etc.).,
      arrowLog: {
        // Tamaño de cada "andanada" (grupo de flechas) para el conteo de
        // sessionArrowLog. Coincide por defecto con
        // arrowLimit.countBeforeCooldown porque conceptualmente es el mismo
        // grupo de 6, pero se deja como valor propio por si se quisiera
        // contar andanadas de un tamaño distinto al del cooldown del
        // carcaj.
        arrowsPerAndanada: 6
      },
  
      // -------------------------------------------------------------------
      // Puntaje total de la andanada (v1.5) y premio por tanda perfecta
      // (v1.6). Al completarse cada tanda de CONFIG.arrowLimit
      // .countBeforeCooldown flechas, además del globo de puntaje de cada
      // flecha individual (getDialogue('score_N')), se narra la SUMA de esa tanda
      // con un globo propio (ver narrateAndanadaTotal(), llamado desde el
      // mismo lugar que startArrowCooldown()) — o, si la tanda fue
      // perfecta y CONFIG.andanada.promo.enabled, el globo del premio (ver
      // promo más abajo) en vez del texto de puntaje. Ese globo se muestra
      // recién después de que se apaga el de la última flecha (mismo delay
      // que 2800), y el aviso de recalibración de la mira
      // se corre a su vez para aparecer justo cuando ESTE globo se apaga
      // (ver scheduleCalibrationMessage()) — sin importar si duró
      // 2800 (puntaje normal) o CONFIG.andanada.promo
      // .displayMs (premio, bastante más largo).,
      andanada: {
        // Umbral (inclusive) de puntos totales de la tanda a partir del cual
        // Raúl vuelve a pose03 (idle) como pose de reposo entre disparos;
        // por debajo de este umbral, en cambio, la pose de reposo pasa a
        // ser pose04 (fail) hasta que se complete la próxima tanda — ver
        // defaultIdlePoseKey. Pedido original: "por debajo de 35" -> pose04,
        // "36 o más" -> pose03; el valor 35 en sí no se especificó, así que
        // se resuelve igual que el resto de los valores por debajo de 36
        // (pose04), para no dejar un puntaje sin regla. Ajustar acá si se
        // quiere mover el corte.
        lowScorePoseThreshold: 36,
        // Plantilla del globo con la suma de la tanda. "{puntos}" se
        // reemplaza por el total (0..puntaje máximo posible de la tanda).
        // No se usa cuando la tanda es perfecta y CONFIG.andanada.promo
        // está habilitado (ver promo.bubbleHtml más abajo, que reemplaza a
        // perfectMessage en ese caso). Texto real en
        // getDialogue('andanada_score') — ver narrateAndanadaTotal().
        // Null para permitir sobreescritura puntual.
        message: null,
        // Plantilla especial cuando la tanda entera dio el puntaje máximo
        // posible (CONFIG.arrowLimit.countBeforeCooldown flechas, cada una
        // en el aro de mayor valor de la diana resuelta — con los valores
        // por defecto, 6 × 10 = 60). Sirve de respaldo si CONFIG.andanada
        // .promo.enabled se pone en false más adelante. Texto real en
        // getDialogue('andanada_perfect').
        perfectMessage: null,
  
        // -----------------------------------------------------------------
        // Premio por tanda perfecta (v1.6). Cuando la tanda da el puntaje
        // máximo posible (ver perfectMessage arriba) Y esto está habilitado,
        // en vez de perfectMessage se muestra bubbleHtml: un globo con un
        // link a WhatsApp que arma un mensaje de reclamo con un código
        // corto (ver buildPromoCode()/buildWhatsAppLink() más abajo).
        //
        // Supuesto documentado (no especificado en el pedido original): el
        // "código de premio" es un hash MD5 (calculado con una
        // implementación propia en JS puro — el juego no usa frameworks ni
        // Web Crypto, que además no soporta MD5) de `Date.now()` + un
        // componente aleatorio, en el instante exacto en que se completa la
        // tanda perfecta, recortado a los primeros 6 caracteres hex. Como
        // el juego es 100% cliente (sin backend), este código NO es
        // verificable del lado del servidor — funciona como un
        // comprobante liviano que el staff de arbat puede mirar a simple
        // vista, no como una prueba criptográfica. Si arbat necesita
        // validarlo contra algo (por ejemplo, un secreto compartido o un
        // registro propio), hay que ajustar buildPromoCode().
        promo: {
          enabled: true,
          whatsappNumber: '59170885758',
          // "{hash}" se reemplaza por el código de 6 caracteres.
          whatsappMessage: '¡Hola arbat! acabo de lograr hacer 60 puntos en la página web y me he ganado un 2x1, aquí está mi código de premio: {hash}',
          // Texto del globo dentro del juego (HTML — ver buddy_says
          // con opts.html). "{link}" se reemplaza por el link de WhatsApp ya
          // armado (wa.me + el mensaje de arriba, URL-encodeado). Texto real
          // en getDialogue('andanada_promo_reward') — ver uso en
          // narrateAndanadaTotal(). Null para permitir sobreescritura puntual.
          bubbleHtml: null,
          // Bastante más que 2800: hay mucho más texto
          // para leer y, a diferencia de los demás globos, éste tiene un
          // link que hay que llegar a tocar.
          displayMs: 12000
        }
      },
  
      // -------------------------------------------------------------------
      // Diana específica de la página (OPCIONAL).
      //
      // Si este bloque existe, tiene prioridad sobre la diana declarada por
      // el personaje y sobre la diana por defecto del módulo. Normalmente se
      // deja comentado/ausente. En Arbat se usa el logo real como diana.
      //
      // Los rings pertenecen a ESTA diana: describen la geometría del logo
      // de Arbat y no deben convertirse en una configuración global de
      // Archery.
      //
      target: {
        type: 'dom',
        selector: '.site-header .site-logo img',
        fallback: { enabled: true, image: 'diana.png' },
        marginPx: 16,
        scale: 1,
        // Transformación visual exclusiva para la diana DOM de la página.
        // En cada entrada a aiming se verifica el tamaño/posición reales y,
        // si hace falta, se anima hasta este estado. Al cumplirse
        // restoreAfterMs sin una nueva sumatoria de puntos y sin apuntar,
        // vuelve a su tamaño y posición originales.
        domAim: {
          sizePx: 100,
          edgeMarginPercent: 0.30,
          blurOpeningExtraPercent: 0.30,
          restoreAfterMs: 60000,
          transitionMs: 650
        },
        rings: [
          { points: 10, outerPercent: 0.14 }, // centro negro
          { points: 9,  outerPercent: 0.29 }, // espacio siguiente
          { points: 8,  outerPercent: 0.45 }, // anillo naranja
          { points: 7,  outerPercent: 0.61 }, // espacio siguiente
          { points: 6,  outerPercent: 0.81 }, // borde negro
          { points: 5,  outerPercent: 1.00 }  // espacio blanco exterior
        ]
      },

      // Diana por defecto de /archeryGame. Se usa únicamente cuando no existe
      // una diana específica de la página y el personaje tampoco declara
      // una diana propia.
      defaultTarget: {
        image: 'diana.png',
        scale: 1,
        rings: [
          // La diana genérica contiene diez zonas concéntricas, de 10 a 1
          // puntos. Cada límite está expresado como fracción del radio total.
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
  
      // Triple click de prueba para invocar/ocultar a Buddy. Cambiar
      // clicksToTrigger o windowMs si genera falsos positivos/negativos.

      testTrigger: {
        clicksToTrigger: 3,
        windowMs: 500
      },
      // -------------------------------------------------------------------
      // Efecto de concentración durante el apuntado.
      //
      // Cuando enabled=true, mientras state === 'aiming' se aplica una capa
      // fija que desenfoca y oscurece la página, dejando una ventana nítida
      // alrededor de la diana. La diana, la mira, el personaje y los misses
      // cercanos se elevan a capas superiores.
      //
      // El efecto puede desactivarse por código con:
      //   window.BuddyArchery.setAimBlurEnabled(false)
      // y volver a activarse con true. Esto permite que otros módulos
      // suspendan el blur temporalmente durante una acción especial.
      // -------------------------------------------------------------------
      aimFocus: {
        enabled: true,
        blurPx: 7,
        darkness: 0.22,
        targetFocusScale: 2.25,
        targetFocusSoftness: 0.22,
        nearMissMultiplier: 1.35,
        transitionMs: 220,
        overlayZIndex: 9000,
        nearMissZIndex: 10010,
        arrowZIndex: 10010,
        targetZIndex: 10000,
        characterZIndex: 9999,
        miraZIndex: 10020,
        chatZIndex: 10030,
        fallbackDarkness: 0.18
      },

      miraMarginPx: 16,
  
      // -------------------------------------------------------------------
      // Zona de "sabiduría": si al apuntar la mira cae en el cuarto inferior
      // de la VENTANA VISIBLE (viewport) — equivalente a apuntar hacia abajo,
      // al suelo, en vez de hacia el blanco — Raúl decide directamente no
      // disparar. A diferencia de las otras reglas de validez (mitad de
      // pantalla), esto NO es un fallo: no pasa por pose04/MISS, vuelve
      // derecho a pose03 con un mensaje propio (ver clave "arm_lowered_early" y la regla
      // en onPointerMoveWhileAiming).,
      wisdomZone: {
        // Fracción (0..1) del alto de la ventana visible que cuenta como
        // "cuarto inferior", medida desde abajo. 0.25 = el 25% más bajo del
        // viewport.
        bottomFraction: 0.25
      },
  
      // Panel de depuración visible mientras se prueba el prototipo. Poner en
      // false (o borrar el bloque marcado como DEBUG) para producción.,
      debug: false
    };
