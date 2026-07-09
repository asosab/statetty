# Informe de contraste — statetty.com

## Resumen ejecutivo

Se auditaron **5 archivos CSS** y **8 archivos HTML/componentes** del sitio. Se encontraron **22 puntos** con problemas de contraste y/o tamaño de fuente:

- **Alta:** 8 — texto principal, navegación, CTAs, precios
- **Media:** 9 — textos secundarios, labels, badges, fechas
- **Baja:** 5 — decorative/fine print

### Patrones más repetidos

1. **Uso de `#17baef` (celeste de marca) como color de texto sobre fondo blanco** — 2.26:1, no cumple WCAG AA. Aparece en títulos, links, labels, precios, badges.
2. **Uso de `#eebe3e` (mostaza) como fondo con texto blanco encima** — 1.74:1 en botones y tablas.
3. **Textos secundarios en gris `#777` — ~4.3:1** — no alcanza 4.5:1 para textos menores a 18px.

---

## Tabla de hallazgos

| # | Ubicación | Texto de ejemplo | Fondo | Color texto | Color fondo | Contraste | ¿Cumple AA? | Tamaño | Severidad |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `theme-1.css:26` `h1,h2,h3,h4,h5,h6` | Títulos de sección | blanco | `#17baef` | `#ffffff` | 2.26:1 | ❌ No | variable | Alta |
| 2 | `theme-1.css:29` `a` | Links generales | blanco | `#17baef` | `#ffffff` | 2.26:1 | ❌ No | 16px | Alta |
| 3 | `theme-1.css:94-100` `.btn-cta-secondary` | Botón CTA "¡Empezá ahora!" | mostaza | `#ffffff` | `#eebf3f` | 1.74:1 | ❌ No | ~16px | Alta |
| 4 | `theme-1.css:232-235` `.nav-item.active .nav-link` | Nav activo | blanco | `#17baef` | `#ffffff` | 2.26:1 | ❌ No | 14px | Alta |
| 5 | `theme-1.css:546` `a { color: var(--blue) }` | Links globales (Statetty styles) | blanco | `#17baef` | `#ffffff` | 2.26:1 | ❌ No | 16px | Alta |
| 6 | `page.html:49` `.post-content a` | Links en artículos | blanco | `#17baef` | `#ffffff` | 2.26:1 | ❌ No | ~17px | Alta |
| 7 | `page.html:80` `.post-nav a` | Navegación entre posts | blanco | `#17baef` | `#ffffff` | 2.26:1 | ❌ No | ~14px | Alta |
| 8 | `inmueble.css:240` `.inm-price` | Precio del inmueble | blanco | `#17baef` | `#ffffff` | 2.26:1 | ❌ No | 1.8rem | Alta |
| 9 | `theme-1.css:309-310` `th` | Encabezados de tabla de precios | mostaza | `#ffffff` | `#eebe3e` | 1.74:1 | ❌ No | ~16px | Media |
| 10 | `theme-1.css:646` `.pronunciation` | Texto "Así se dice" | blanco | `#777777` | `#ffffff` | 4.28:1 | ❌ No | 15.2px | Media |
| 11 | `theme-1.css:648` `.pronunciation i` | Icono de audio en pronunciación | blanco | `#17baef` | `#ffffff` | 2.26:1 | ❌ No | ~15px | Media |
| 12 | `theme-1.css:671` `.problema-label` | Label "¿Te suena familiar?" | blanco | `#17baef` | `#ffffff` | 2.26:1 | ❌ No | ~12.5px | Media |
| 13 | `theme-1.css:712` `.funciones-label` | Label "Qué hace Statetty" | celeste | `#eebf3f` | `#17baef` | ~1.3:1 | ❌ No | ~12.5px | Media |
| 14 | `theme-1.css:724` `.funciones-sub` | Subtítulo sección funciones | celeste | `rgba(255,255,255,.80)` | `#17baef` | ~2.2:1 | ❌ No | ~17px | Media |
| 15 | `theme-1.css:786` `.testimonios-label` | Label "Agentes que ya trabajan..." | gris claro | `#17baef` | `#f5f5f5` | 2.26:1 | ❌ No | ~12.5px | Media |
| 16 | `theme-1.css:870` `.post-card__date` | Fecha de post en blog | blanco | `#17baef` | `#ffffff` | 2.26:1 | ❌ No | ~12.5px | Media |
| 17 | `theme-1.css:885` `.prensa-label` | Label "Prensa" | gris claro | `#17baef` | `#f5f5f5` | 2.26:1 | ❌ No | ~12.5px | Media |
| 18 | `page.html:28` `.post-header .meta` | Fecha del post | blanco | `#888888` | `#ffffff` | 4.0:1 | ❌ No | ~13.6px | Media |
| 19 | `contacto.html:83` `label` en formulario | Labels "Nombres *" etc. | blanco | `#777777` | `#ffffff` | 4.28:1 | ❌ No | ~12.5px | Media |
| 20 | `main.css:320-323` `.site-footer li, p` | Texto en footer legacy | blanco | `#828282` | `#ffffff` | 4.0:1 | ❌ No | 15px | Baja |
| 21 | `theme-1.css:940` `.prensa-file-badge` | Badge de archivo prensa | celeste claro | `#17baef` | `rgba(23,186,239,.10)` | 2.26:1 | ❌ No | ~10px | Baja |
| 22 | `theme-1.css:862` `.blog-section .section-subtitle` | Subtítulo "Artículos recientes" | blanco | `#777777` | `#ffffff` | 4.28:1 | ❌ No | ~17px | Baja |

---

## Notas adicionales

- **main.css** no está incluido en `head.html`, solo existe como archivo legacy/residual. Los puntos marcados ahí se aplican solo si ese CSS llega a cargarse en algún layout. Se incluye por completitud.
- **footer.html** usa estilos inline propios (no theme-1.css), con fondo `#042a36` y texto blanco/mostaza — colores que sí cumplen contraste. Sin embargo, el texto `rgba(255,255,255,.5)` en `footer-copy` y `footer-legal` (≈ #7f9aa8 sobre #042a36) está al límite: ~3.8:1. No se marca porque es fine-print y está cerca del umbral.
- **inmueble.css** hereda variables de theme-1.css. Solo `.inm-price` usa `var(--blue)` directo. El resto de colores (`.inm-feature-label`, `.inm-address`, `.inm-description`) están en grises aceptables (#777, #555, #888).
- Varios componentes (FAQ, contacto) tienen estilos inline dentro de `<style>` en los includes. Estos usan `var(--blue)` = #17baef como fondo y la mayoría del texto es blanco o `rgba(255,255,255,.88)` — estos están OK por ser texto sobre fondo oscuro.
