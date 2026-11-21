---
layout: page
title: "¿Cuánto ruido hace tu calle? Ahora se puede ver en el mapa"
date: 2026-11-21
categories: novedades, producto
comments: true
description: "Statetty suma un mapa de ruido urbano construido a partir de las 120 rutas de micros de Santa Cruz: qué zonas concentran el bullicio, cuáles quedan realmente tranquilas y cómo incide la velocidad permitida en cada anillo."
image: "posts/2026-11-21-mapa-ruido.png"
tags: [statetty, mapa, ruido, micros, transporte, santa-cruz, agentes]
published: true
---

Cuando alguien elige dónde vivir o dónde poner un local, la pregunta del ruido casi siempre se responde de memoria: «esa avenida es pesada», «por mi casa no pasa nada». Funciona hasta cierto punto, pero es una sensación, no un dato. Y en Santa Cruz la sensación engaña seguido, porque el ruido acá no se reparte parejo: se amontona donde las rutas se cruzan y se apaga a pocas cuadras de distancia.

Por eso armamos un mapa de ruido. No es una medición con decibelímetro — nadie salió a contar decibelios por cada esquina — sino un índice calculado a partir de algo que sí tenemos muy bien mapeado: las 120 rutas de micros que recorren la ciudad todos los días.

## Cómo se construyó

La idea es sencilla. Cada ruta de micro es una fuente de ruido con el mismo peso, y ese ruido llega unos 30 metros para cada lado de la línea por donde pasa. A partir de ahí el modelo hace tres cosas:

- **Acumula** las rutas que comparten un mismo punto. Y no de forma lineal: donde se cruzan muchas líneas el puntaje crece más que proporcionalmente, porque ahí no solo hay más vehículos sino más bocinas, más esperas en semáforo y más choques entre choferes.
- **Modula por velocidad.** Un micro que arranca desde una cuadra tapada hace bastante más ruido que uno que rueda tranquilo por una radial ancha. Por eso el modelo aplica un factor según el anillo: el centro y los primeros anillos pesan más, porque el reglamento municipal (Art. 16 del DM 2019-032) marca velocidades bajas, más semáforos y más convivencia forzada entre vehículos y peatones.
- **Se apaga con la distancia.** El aporte de cada ruta decae hasta desaparecer a los 250 metros, que es más o menos hasta dónde llega el ruido de una calle con tráfico en condiciones normales.

El resultado es un puntaje de 0 a 100 por zona, guardado en la base de datos por celda del mapa. Las zonas sin aporte de rutas quedan marcadas como tranquilas, y eso es tan útil como saber dónde está el bullicio.

## Qué se ve en el mapa

El centro de la ciudad sale, como era de esperar, como la mancha más intensa: es donde más rutas convergen y donde más lento circulan. Los corredores que unen los anillos —las avenidas con varias líneas encima— forman las venas naranjas y rojas que atraviesan la ciudad.

Lo interesante está en los huecos. Hay zonas que a simple vista parecen «cerca del centro» pero quedan fuera del alcance de casi todas las rutas, y otras, ya más afuera, que reciben el impacto de varias líneas que compiten por el mismo tramo. La diferencia entre una cuadra tranquila y una ruidosa muchas veces son dos cuadras, no dos kilómetros.

Para quien busca inmueble —y ese es el uso principal— la herramienta responde una pregunta concreta: *¿esta zona tiene buses encima o no?*. Un local sobre un corredor con cinco rutas no es lo mismo que uno a tres cuadras de la misma avenida. Para el que vive ahí, el mapa muestra dónde conviene pagar de más por silencio y dónde ese silencio no existe.

## Una salvedad honesta

Este índice mide **exposición al tráfico de micros**, no decibelios absolutos. No contempla el volumen real de cada línea a cada hora, el estado del pavimento ni la altura de los edificios, que en un cañón urbano hacen que el sonido rebote y llegue más lejos. Sirve para comparar zonas entre sí y para detectar corredores ruidosos, no para predecir el nivel exacto de ruido de una dirección puntual.

## Cómo verlo

La capa está dentro de la herramienta «Rutas de micros» del mapa, en la caja de herramientas. Con sesión de agente se activa con un botón y se dibuja sobre el mapa con su leyenda, igual que las rutas. Cada recálculo usa las rutas vigentes en la base de datos, así que cuando entren líneas nuevas el mapa se actualiza solo en el proceso diario.

Si estás evaluando un punto para comprar, alquilar o poner un negocio, mirá primero qué color tiene la zona. A veces la diferencia entre «tranquilo» y «no se puede vivir» está a una cuadra de donde estabas mirando.
