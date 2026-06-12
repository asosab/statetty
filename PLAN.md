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

## Próximos pasos

- Verificar que el build de Jekyll no tenga errores.
- Probar navegación responsive, scroll header, FAQ accordion, calculadora de tarifas, formulario de contacto, y blog dinámico.
- Mover JS global (scroll header, toggle nav) de inline en header.html a `assets/js/main.js` si se desea centralizar.
