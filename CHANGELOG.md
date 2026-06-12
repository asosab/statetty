# Changelog

## 2025-06-11

- **Posts dummy**: creados `_posts/2025-03-15-que-es-el-acm-y-como-te-ayuda-a-vender-mas.md` y `_posts/2025-05-20-monitoreo-whatsapp-para-agentes-inmobiliarios.md` — 2 entradas de blog reales sobre ACM y monitoreo de WhatsApp para que el grid del blog funcione con contenido vivo (3 posts total).
- **Archivos de prueba por sección**: creados 10 archivos HTML independientes (`prueba-header.html`, `prueba-inicio.html`, `prueba-about.html`, `prueba-beneficios.html`, `prueba-tarifas.html`, `prueba-testimonios.html`, `prueba-faq.html`, `prueba-blog.html`, `prueba-contacto.html`, `prueba-footer.html`) — cada uno autocontenido con CSS+HTML+JS, usando la paleta oficial del logo (azul `#17baef`, azul oscuro `#074f66`, amarillo `#eebf3f`).
- **prueba01.html actualizado**: página maestra que ensambla todas las secciones en orden (header, inicio, about, beneficios, tarifas, testimonios, faq, blog, contacto, footer). Paleta unificada azul/amarillo. Sin naranja. Sin tocar index.html ni los _includes/ oficiales.
- **Tarifas y Contacto autocontenidos**: ambas secciones en `prueba01.html` reemplazadas con bloques autónomos (style+script inline) desde `_includes/` original, con paleta amarilla `#eebf3f` y textos en `--blue-dark` (#074f66). Sin CSS/JS global duplicado.
- **Página de índice del blog**: creado `blog/index.html` con buscador JS que filtra posts por título/texto/tags en vivo, grid de 3 entradas, header sticky con navegación, hero con gradiente azul, y footer simplificado. Botón "Ver todas las entradas" en `prueba01.html` ahora enlaza a `/blog/`.
- **Estilo de posts individuales**: `_layouts/page.html` renovado con inline `<style>` — tipografía Montserrat/Lato, márgenes generosos, blockquote con borde amarillo, código oscuro tipo catppuccin, imágenes redondeadas, fecha legible, navegación "Volver al blog", y caja de compartir estilizada. Footer hereda el mismo de `_includes/footer.html` (moderno, 3 columnas).
- **Header condicional**: `_includes/header.html` ahora detecta si es la landing page (`page.layout == 'landing'`) — si lo es, usa anclas con scrollto; si es otra página (blog posts, etc.), muestra enlaces absolutos (`/`, `/#tarifas`, `/blog/`, `/#Contacto`).
- **Fix padding post**: `_layouts/page.html` — `.post` padding-top aumentado de 40px a 100px para que el título de la publicación no quede oculto bajo el header fijo.

- **Landing page**: reemplazada la sección tarifas (`_includes/tarifas.html`) con versión dinámica — selector de país (Bolivia/Perú), grid de 3 cards de precios renderizado por JS desde objeto `PRECIOS`, calculadora de equipos con slider (2–30 agentes) y selector de duración (30/90/180 días), botón que pre-rellena el campo `#f-mensaje` del formulario de contacto y scrollea a `#Contacto`. Estilos adaptados al tema claro existente (fondo `#f5f5f5`, cards blancas, tipografía Montserrat/Lato).
- **Landing page**: reemplazado el footer (`_includes/footer.html`) con versión moderna de 3 columnas — columna de marca con logo (favicon.ico + site.title) y WhatsApp CTA, columna de navegación de plataforma, columna de redes sociales (iconos FontAwesome) y documentos legales. Scripts JS existentes preservados. Fondo `#042a36` mantenido.
- **Landing page**: convertido el link "¡Empezá ahora!" del header (`_includes/header.html`) en botón naranja con clase `.btn-nav-cta`, color brand `#FF5C00`.
- **Landing page**: reemplazada la sección FAQ (`_includes/faq.html`) con acordeón interactivo — 7 preguntas con `data-faq` para JSON-LD autogenerado, función `toggleFaq()`, colores claros. Texto corregido en pregunta de WhatsApp: Statetty tiene su propio número independiente que sigue 100+ grupos inmobiliarios.

## 2025-06-09

- **Documentación**: creado `arquitectura.md` con análisis completo del sitio, diagramas Mermaid de jerarquía de layouts, secciones de landing y flujo de datos.
- **Fuentes de datos**: integración de SCE (Santa Cruz Estate) — detectado vía `url.includes("santa-cruz.estate")` en mapa.js, mapatmp.js, mapa_link_directo.js y mapaInmo.js; visible por defecto en el mapa con `pointer_sce.png`.
