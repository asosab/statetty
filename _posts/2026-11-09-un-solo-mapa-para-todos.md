---
layout: page
title: "Un solo mapa: la búsqueda de inmuebles ahora vive en la portada"
date: 2026-11-09
categories: novedades, producto
comments: true
description: "La página principal y el mapa de resultados se unieron en uno solo. Si tienes tiempo activo verás tus datos completos ahí mismo, sin saltar de página."
tags: [statetty, mapa, buscador, inmuebles]
published: true
---

Hasta ahora había dos mapas: el de la portada, con la vista pública, y el de resultados que usan los asesores. Desde hoy son el mismo: todo pasa en statetty.com.

## Qué cambia para ti

- **Sin cuenta**: el mapa de la portada funciona igual que siempre. Buscas por texto o dibujando una zona y ves los inmuebles básicos.
- **Con cuenta pero sin tiempo activo**: ves la misma vista pública, con un aviso discreto de que tu tiempo venció. Nada te bloquea la búsqueda.
- **Con tiempo activo**: al entrar a la portada aparece el menú del engranaje ⚙ y tu última búsqueda se carga sola, con toda la información de asesor: datos del agente, teléfono, selección de inmuebles, estadísticas, ACM, PDF y las búsquedas guardadas.

## Lo que ya no hace falta

La página `/maps/find` dejó de existir como destino: si entras a un enlace viejo, te lleva a la portada con todo lo que traía. Los enlaces que manda el bot de Telegram también aterrizan directo en la portada, ya con tu sesión reconocida.

## Detrás del cambio

Las búsquedas con datos completos —las que ven los asesores— ahora se reservan de verdad para quien tiene tiempo activo: el servidor lo verifica en cada pedido, no solo la página. También aprovechamos para ordenar el código del mapa en módulos, así que los próximos cambios serán más rápidos y menos frágiles.
