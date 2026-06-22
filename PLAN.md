# Plan de trabajo — Statetty.com

## Estado actual

Sitio web estático Jekyll 4.3, alojado en GitHub Pages (statetty.com). Landing page corporativa + mapas interactivos Leaflet + generación de PDF. Producto principal: bot de Telegram @statettybot.

## Paleta de colores base (logo oficial)

- **Azul**: Principal `#17baef`, Oscuro `#074f66`, Claro `#6dd0f5`
- **Amarillo**: Principal `#eebf3f`, Pálido `#f4d67a`

## Últimos cambios

- 2025-06-11: **Migración completa de `prueba01.html` al sitio en vivo** — todos los estilos y secciones del prototipo movidos a sus archivos oficiales. Paleta unificada (azul `#17baef` / amarillo `#eebf3f`). Sin naranja. Todos los `prueba-*.html` eliminados.
- 2025-06-11: `theme-1.css` extendido con `:root` global (variables de paleta, tipografía, sombras, radios), resets, y estilos de header, hero, about, beneficios, testimonios, blog, footer + responsive. Sobrescribe estilos Bootstrap previos.
- 2025-06-11: `_includes/header.html` reemplazado — header fijo con hamburguesa animada, blur al scrollear, logo blanco, botón CTA amarillo/azul oscuro, Liquid condicional (landing vs otras páginas).
- 2025-06-11: `_includes/inicio.html` hero actualizado — sin `offset-header`, sin `<br><br><br>`, botones con colores de paleta.
- 2025-06-11: `_includes/about.html` convertido a CSS Grid (`.about-grid`) — tarjetas con íconos, sin Bootstrap grid.
- 2025-06-11: `_includes/beneficios.html` reemplazado — clase `beneficios-section`, fondo azul, feature-list con íconos amarillos, texto en vos/voseo.
- 2025-06-11: `_includes/testimonios.html` reemplazado — flexbox layout (`.testimonio > .testimonio-profile + .testimonio-bubble`), sin lazyload, audio Gabriel con onclick inline.
- 2025-06-11: `_includes/blog.html` reescrito — grid dinámico con Liquid `{% for post in site.posts limit:3 %}`, cards BEM, fecha en español, CTA a `/blog/`.
- 2025-06-11: `_layouts/landing.html` ahora incluye `{% include blog.html %}` entre FAQ y contacto.
- 2025-06-11: Brand colors migrados de `#FF5C00` (naranja) a `#eebf3f` (amarillo oficial) en `_includes/faq.html`, `tarifas.html`, `contacto.html`, `footer.html`. Texto sobre amarillo usa `var(--blue-dark)` en vez de `#fff`.
- 2025-06-12: **GitHub Actions workflow** creado (`.github/workflows/jekyll.yml`) para build con Jekyll 4.3 y deploy a Pages. Fix de `Gemfile.lock`: agregada plataforma `x86_64-linux` para compatibilidad con runner Ubuntu. Build y deploy verificados exitosos.
- 2025-06-12: **Fix imagen blog**: `_includes/blog.html` usaba `{{ post.image | prepend: site.url }}` sin la ruta `/assets/images/`, generando URLs rotas (ej. `https://statetty.comstatetty_phone.jpg`). Corregido a `{{ post.image | prepend: site.imageFolder | prepend: site.url }}`, usando la variable `site.imageFolder` ya existente en `_config.yml`.

## Principio de arquitectura

**Toda página debe cargar su estilo general desde `assets/css/theme-1.css`** (incluido vía `{% include head.html %}` -> `theme-1.css`). Esto garantiza consistencia visual (paleta, tipografía, resets, variables `:root`) y que un cambio en la marca se refleje en todo el sitio. Ninguna página debe duplicar variables, resets o estilos generales inline.

## Próximos pasos

- Probar navegación responsive, scroll header, FAQ accordion, calculadora de tarifas, formulario de contacto, y blog dinámico en producción.
- Mover JS global (scroll header, toggle nav) de inline en header.html a `assets/js/main.js` si se desea centralizar.

## 2026-06-21

- **Nuevo `assets/js/datos.js`**: funciones `fetchFinderResult(publicKey)` y `parseFinderResult(response)` para consultar `{WS_API_BASE}/finderresult?publicKey={k}` y transformar la respuesta al formato `locations[]` del mapa. Mapeo de campos API → Google Sheets (ej. `nombre→Titulo`, `desc→des`, `fotos[0]→foto`, etc.). Sanitización de descripción y cálculos de precioM2C/precioM2T.
- **Refactor `mapa.js`**: extraída función `renderMap(locs, centerLat, centerLng, circleRadius, avgPrice)` que encapsula toda la creación del mapa Leaflet + marcadores + popups + filtros + restauración de seleccionados.
- **Nuevo flujo de carga en `mapa.js`**: `init()` async — primero intenta con `k` param (API finderresult), si hay datos los usa; si no, fallback a Google Sheets. `info` provee lat, lng, dist (km→m), precioProm, userID. `usuario` provee nombre, agencia, teléfono (window.na/ag/an).
- **Script loading**: `datos.js` agregado en `maps/find/index.html` antes de `mapa.js`.

## 2026-06-16

- **Formulario de contacto**: países restringidos a Bolivia y Perú; ciudades limitadas a Santa Cruz de la Sierra (SCZ) y Lima (LIM) con nombres completos visibles.
- **Formulario de registro completo**: creado `/registro/index.html` con layout `default`. Formulario moderno responsivo con todos los campos de `frm.md`: email, nombres, apellidos, WhatsApp con código de país, fecha de nacimiento, sexo, agencia, país (Bolivia/Perú/OTRO), ciudades, nivel de experiencia (radiobuttons), nivel de tecnología (radiobuttons), intereses, expectativas, código de referencia y copia de respuestas. Envía al mismo endpoint que `contacto.html` (`WS_API_BASE + "/registro"`).

## Pendiente — refactor blog/index.html

- 2026-06-12: **`blog/index.html` no usa layout ni includes** — tiene header, footer y `<head>` completos hardcodeados. Crea `_layouts/blog.html`, refactoriza `blog/index.html` para que herede de él y use `{% include header.html %}` / `{% include footer.html %}`. El CSS específico del blog (hero, search, cards) puede quedar inline en `blog/index.html`.
