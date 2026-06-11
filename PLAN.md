# Plan de trabajo — Statetty.com

## Estado actual

Sitio web estático Jekyll 4.3, alojado en GitHub Pages (statetty.com). Landing page corporativa + mapas interactivos Leaflet + generación de PDF. Producto principal: bot de Telegram @statettybot.

## Paleta de colores base (logo oficial)

- **Azul**: Principal `#17baef`, Oscuro `#074f66`, Claro `#6dd0f5`
- **Amarillo**: Principal `#eebf3f`, Pálido `#f4d67a`

## Últimos cambios

- 2025-06-09: Creación de `arquitectura.md` con documentación completa de la arquitectura, incluidos diagramas Mermaid.
- 2025-06-09: Integración de SCE (Santa Cruz Estate) como nueva fuente de datos reconocida en mapa.js, mapatmp.js, mapa_link_directo.js y mapaInmo.js.
- 2025-06-11: Sección tarifas reemplazada con versión dinámica — selector de país (Bolivia/Perú), grid de precios generado por JS, calculadora de equipos con slider de agentes y selector de duración, y botón que pre-rellena el formulario de contacto con el plan calculado. Adaptado al tema claro del sitio.
- 2025-06-11: Footer reemplazado con versión moderna de test.html — 3 columnas (marca con logo+nombre, plataforma, redes+legales), iconos FontAwesome, WhatsApp CTA, año dinámico. Fondo `#042a36` mantenido.
- 2025-06-11: Link "¡Empezá ahora!" del header convertido a botón naranja (`.btn-nav-cta`) con brand `#FF5C00`, hover `#cc4900`.
- 2025-06-11: FAQ reemplazado con acordeón interactivo de test.html — 7 preguntas, estructura `data-faq` con JSON-LD autogenerado, colores claros del sitio. Texto corregido en pregunta de WhatsApp: Statetty sigue sus propios 100+ grupos inmobiliarios, no los del usuario.
- 2025-06-11: Creados posts dummy `2025-03-15-que-es-el-acm-y-como-te-ayuda-a-vender-mas` y `2025-05-20-monitoreo-whatsapp-para-agentes-inmobiliarios.md`.
- 2025-06-11: Creados 10 archivos de prueba por sección (`prueba-header.html`…`prueba-footer.html`) con la paleta oficial del logo (azul `#17baef` / amarillo `#eebf3f`).
- 2025-06-11: `prueba01.html` actualizado como página maestra que ensambla todas las secciones — paleta unificada, sin naranja. Sin tocar index.html.
- 2025-06-11: Secciones Tarifas y Contacto en `prueba01.html` reemplazadas con versiones autocontenidas (style+script inline) desde `_includes/` original, adaptadas a paleta amarilla.
- 2025-06-11: Creado `/blog/index.html` — página independiente de índice del blog con buscador JS que filtra en vivo, grid de 3 posts, header sticky y footer.

## Próximos pasos

Sin definir.
