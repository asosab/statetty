# Changelog

## 2025-06-11

- **Prototipo de identidad visual**: creado `prueba01.html` con la nueva paleta Statetty — azul `#447AB9` (principal/oscuro/claro) + amarillo `#FEF265` (principal/pálido). Incluye header moderno con nav fijo y efecto scroll, hero con gradiente azul, sección de beneficios demo, grid de blog con 3 tarjetas de entradas, CTA de contacto y footer armonizado. Diseño responsive, tipografía Montserrat + Lato.

- **Landing page**: reemplazada la sección tarifas (`_includes/tarifas.html`) con versión dinámica — selector de país (Bolivia/Perú), grid de 3 cards de precios renderizado por JS desde objeto `PRECIOS`, calculadora de equipos con slider (2–30 agentes) y selector de duración (30/90/180 días), botón que pre-rellena el campo `#f-mensaje` del formulario de contacto y scrollea a `#Contacto`. Estilos adaptados al tema claro existente (fondo `#f5f5f5`, cards blancas, tipografía Montserrat/Lato).
- **Landing page**: reemplazado el footer (`_includes/footer.html`) con versión moderna de 3 columnas — columna de marca con logo (favicon.ico + site.title) y WhatsApp CTA, columna de navegación de plataforma, columna de redes sociales (iconos FontAwesome) y documentos legales. Scripts JS existentes preservados. Fondo `#042a36` mantenido.
- **Landing page**: convertido el link "¡Empezá ahora!" del header (`_includes/header.html`) en botón naranja con clase `.btn-nav-cta`, color brand `#FF5C00`.
- **Landing page**: reemplazada la sección FAQ (`_includes/faq.html`) con acordeón interactivo — 7 preguntas con `data-faq` para JSON-LD autogenerado, función `toggleFaq()`, colores claros. Texto corregido en pregunta de WhatsApp: Statetty tiene su propio número independiente que sigue 100+ grupos inmobiliarios.

## 2025-06-09

- **Documentación**: creado `arquitectura.md` con análisis completo del sitio, diagramas Mermaid de jerarquía de layouts, secciones de landing y flujo de datos.
- **Fuentes de datos**: integración de SCE (Santa Cruz Estate) — detectado vía `url.includes("santa-cruz.estate")` en mapa.js, mapatmp.js, mapa_link_directo.js y mapaInmo.js; visible por defecto en el mapa con `pointer_sce.png`.
