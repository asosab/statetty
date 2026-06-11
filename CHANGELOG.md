# Changelog

## 2025-06-11

- **Posts dummy**: creados `_posts/2025-03-15-que-es-el-acm-y-como-te-ayuda-a-vender-mas.md` y `_posts/2025-05-20-monitoreo-whatsapp-para-agentes-inmobiliarios.md` — 2 entradas de blog reales sobre ACM y monitoreo de WhatsApp para que el grid del blog funcione con contenido vivo (3 posts total).
- **Archivos de prueba por sección**: creados 10 archivos HTML independientes (`prueba-header.html`, `prueba-inicio.html`, `prueba-about.html`, `prueba-beneficios.html`, `prueba-tarifas.html`, `prueba-testimonios.html`, `prueba-faq.html`, `prueba-blog.html`, `prueba-contacto.html`, `prueba-footer.html`) — cada uno autocontenido con CSS+HTML+JS, usando la paleta oficial del logo (azul `#17baef`, azul oscuro `#074f66`, amarillo `#eebf3f`).
- **prueba01.html actualizado**: página maestra que ensambla todas las secciones en orden (header, inicio, about, beneficios, tarifas, testimonios, faq, blog, contacto, footer). Paleta unificada azul/amarillo. Sin naranja. Sin tocar index.html ni los _includes/ oficiales.

- **Landing page**: reemplazada la sección tarifas (`_includes/tarifas.html`) con versión dinámica — selector de país (Bolivia/Perú), grid de 3 cards de precios renderizado por JS desde objeto `PRECIOS`, calculadora de equipos con slider (2–30 agentes) y selector de duración (30/90/180 días), botón que pre-rellena el campo `#f-mensaje` del formulario de contacto y scrollea a `#Contacto`. Estilos adaptados al tema claro existente (fondo `#f5f5f5`, cards blancas, tipografía Montserrat/Lato).
- **Landing page**: reemplazado el footer (`_includes/footer.html`) con versión moderna de 3 columnas — columna de marca con logo (favicon.ico + site.title) y WhatsApp CTA, columna de navegación de plataforma, columna de redes sociales (iconos FontAwesome) y documentos legales. Scripts JS existentes preservados. Fondo `#042a36` mantenido.
- **Landing page**: convertido el link "¡Empezá ahora!" del header (`_includes/header.html`) en botón naranja con clase `.btn-nav-cta`, color brand `#FF5C00`.
- **Landing page**: reemplazada la sección FAQ (`_includes/faq.html`) con acordeón interactivo — 7 preguntas con `data-faq` para JSON-LD autogenerado, función `toggleFaq()`, colores claros. Texto corregido en pregunta de WhatsApp: Statetty tiene su propio número independiente que sigue 100+ grupos inmobiliarios.

## 2025-06-09

- **Documentación**: creado `arquitectura.md` con análisis completo del sitio, diagramas Mermaid de jerarquía de layouts, secciones de landing y flujo de datos.
- **Fuentes de datos**: integración de SCE (Santa Cruz Estate) — detectado vía `url.includes("santa-cruz.estate")` en mapa.js, mapatmp.js, mapa_link_directo.js y mapaInmo.js; visible por defecto en el mapa con `pointer_sce.png`.
