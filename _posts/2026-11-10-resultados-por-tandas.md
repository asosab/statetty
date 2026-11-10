---
layout: page
title: "Los resultados del mapa ahora llegan por tandas"
date: 2026-11-10
categories: novedades, producto
comments: true
description: "Las búsquedas de cuentas con tiempo activo pintan los primeros inmuebles apenas llegan, en grupos de a cincuenta, en vez de esperar a que terminen todos."
tags: [statetty, mapa, búsqueda, agentes]
published: true
---

Si tu cuenta tiene tiempo activo, una búsqueda amplia puede devolver hasta 400 inmuebles. Hasta ahora el mapa esperaba a tenerlos todos antes de dibujar el primer pin, y en búsquedas grandes eso se sentía como una página congelada.

Ahora los resultados llegan por tandas de 50. Apenas entra el primer grupo, los pines empiezan a caer sobre el mapa y el contador va subiendo mientras el resto sigue llegando. No tienes que hacer nada distinto: el contador de la caja te avisa cuántos hay y cuándo terminó la búsqueda.

Bajo el capó cambiaron dos cosas. La primera es cómo viajan los datos: el servidor manda la lista en partes en lugar de un solo paquete, y cada parte lleva solo los campos que el mapa usa, así que pesa bastante menos que antes. La segunda es cómo se pintan los pines: la ficha completa de cada inmueble se arma recién cuando la abres, no por adelantado.

Hay otro cambio que puede notarse: la búsqueda del panel "Buscar Inmuebles" ahora se limita al país de tu cuenta cuando no indicas un país en el filtro. Si trabajas en Bolivia, una búsqueda por zona ya no mezcla inventario de otros países. Si alguna vez dibujas una superficie en el mapa de otro país, la búsqueda seguirá usando tu país y puede devolver vacío: es esperado.

Las búsquedas públicas, las de quienes navegan sin cuenta, funcionan igual que antes con sus diez resultados. La diferencia la vas a notar solo si tienes una cuenta activa y tus búsquedas devuelven listas largas.
