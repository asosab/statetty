# Changelog

## 2026-06-21

- **Fix `.remove-sel`**: agregado `e.stopPropagation()` en los handlers de la X roja en `mapa.js`, `mapaInmo.js`, `mapa_link_directo.js`, `mapatmp.js` para evitar que el toolbox se cierre al hacer click (el elemento se removía del DOM antes de que el evento terminara de burbujear, dejando `e.target` detached y engañando al handler de cierre del toolbox).
- **Error modal `fetchFinderResult`**: si la API devuelve `{error: ...}`, se muestra un modal "actualiza tu link al mapa desde Statetty Telegram, entonces has click en el nuevo link" y no se intenta el fallback a Google Sheets.
- **Nuevo `datos.js`**: módulo con `fetchFinderResult()` y `parseFinderResult()` para consultar el endpoint `{WS_API_BASE}/finderresult?publicKey={k}` y transformar la respuesta al formato `locations[]` que espera el mapa.
- **Refactor `mapa.js`**: extraída `renderMap()` como función reutilizable para la creación del mapa Leaflet (marcadores, popups, filtros de agencia, restauración de seleccionados). Agregada lógica de URL param `k`: si está presente y la API responde con datos, se usan en lugar de Google Sheets. Los datos de `info` (lat, lng, dist, precioProm, userID) y `usuario` (nombre, agencia, teléfono) se cargan desde el response. Fallback a Google Sheets si no hay `k` o la API falla.
- **Script loading**: `datos.js` agregado al orden de carga en `maps/find/index.html` (después de `acm.js`, antes de `mapa.js`).

## 2026-06-16

- **Formulario de registro completo**: `registro/index.html` — página independiente con layout `default`. Formulario moderno responsivo con todos los campos de `frm.md`. Radio cards para nivel de experiencia y nivel tecnológico. Envía al mismo endpoint que `contacto.html`.
- **Formulario de contacto**: `_includes/contacto.html` — países restringidos a Bolivia y Perú; ciudades filtradas solo a Santa Cruz de la Sierra (SCZ) y Lima (LIM), con nombres completos visibles.

## 2025-06-12

- **Fix imagen blog**: `_includes/blog.html` — faltaba `site.imageFolder` en el prepend de la URL de imagen, generando rutas rotas (nombre pegado al dominio). Corregido usando `site.imageFolder` (ya definido en `_config.yml` y usado en `seo.html`).
- **Refactor blog listing**: `blog/index.html` era una página standalone sin layout, con header, footer y `<head>` completos hardcodeados. Creado `_layouts/blog.html` (patrón `head.html` + `header.html` + `content` + `footer.html`). `blog/index.html` ahora usa `layout: blog`, hereda header/footer/head de los includes, y solo conserva su CSS específico (hero, search, cards) y el JS de búsqueda. La ruta de imagen de posts también se unificó vía `site.imageFolder`.
- **GitHub Actions workflow**: creado `.github/workflows/jekyll.yml` para build y deploy automatizado con Jekyll 4.3.3. Fix de `Gemfile.lock`: agregada plataforma `x86_64-linux` (`bundle lock --add-platform x86_64-linux`) para resolver gems nativas en runner Ubuntu. Build y deployment verificados exitosos.

## 2025-06-11

- **Migración completa prueba01 → en vivo**: todos los estilos globales de `prueba01.html` movidos a `assets/css/theme-1.css` (`:root`, resets, header, hero, about, beneficios, testimonios, blog, footer + responsive). Cada `_include/*.html` actualizado con el contenido y estilo de su sección homóloga en prueba01. Eliminados todos los `prueba-*.html`.
- **Header reemplazado**: diseño custom flexbox (hamburguesa animada, scroll con blur, logo blanco, CTA amarillo/azul) con Liquid condicional para landing vs otras páginas. JS inline para scroll/toggle.
- **About**: migrado de Bootstrap grid a CSS Grid con `.about-grid`/`.about-item`/`.about-icon`.
- **Beneficios y Testimonios**: reescritos con clases namespaced (`beneficios-section`, `testimonios-section`, `.testimonio` flexbox). Sin lazyload.
- **Blog dinámico**: `_includes/blog.html` reescrito con `{% for post in site.posts limit:3 %}`, cards BEM, fechas en español. Agregado `{% include blog.html %}` a `_layouts/landing.html`.
- **Brand colors**: todos los acentos naranja `#FF5C00` reemplazados por amarillo oficial `#eebf3f` en faq, tarifas, contacto y footer. Texto sobre fondo amarillo usa `var(--blue-dark)`.

- **Posts dummy**: creados `_posts/2025-03-15-que-es-el-acm-y-como-te-ayuda-a-vender-mas.md` y `_posts/2025-05-20-monitoreo-whatsapp-para-agentes-inmobiliarios.md` — 2 entradas de blog reales sobre ACM y monitoreo de WhatsApp para que el grid del blog funcione con contenido vivo (3 posts total).
- **Archivos de prueba por sección**: creados 10 archivos HTML independientes (`prueba-header.html`, `prueba-inicio.html`, `prueba-about.html`, `prueba-beneficios.html`, `prueba-tarifas.html`, `prueba-testimonios.html`, `prueba-faq.html`, `prueba-blog.html`, `prueba-contacto.html`, `prueba-footer.html`) — cada uno autocontenido con CSS+HTML+JS, usando la paleta oficial del logo (azul `#17baef`, azul oscuro `#074f66`, amarillo `#eebf3f`).
- **prueba01.html actualizado**: página maestra que ensambla todas las secciones en orden (header, inicio, about, beneficios, tarifas, testimonios, faq, blog, contacto, footer). Paleta unificada azul/amarillo. Sin naranja. Sin tocar index.html ni los _includes/ oficiales.
- **Tarifas y Contacto autocontenidos**: ambas secciones en `prueba01.html` reemplazadas con bloques autónomos (style+script inline) desde `_includes/` original, con paleta amarilla `#eebf3f` y textos en `--blue-dark` (#074f66). Sin CSS/JS global duplicado.
- **Página de índice del blog**: `blog/index.html` convertido a página Jekyll dinámica (front matter `---` + `{% for post in site.posts %}`) — ya no tiene tarjetas hardcodeadas. Reconoce automáticamente los 4 posts existentes y cualquier post nuevo. Botón "Ver todas las entradas" en `prueba01.html` ahora enlaza a `/blog/`.
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
