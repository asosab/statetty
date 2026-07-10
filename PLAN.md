# Plan de trabajo — Statetty.com

## Estado actual

Sitio web estático Jekyll 4.3, alojado en GitHub Pages (statetty.com). Landing page corporativa + mapas interactivos Leaflet + generación de PDF + SW caché de imágenes. Producto principal: bot de Telegram @statettybot.

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

## 2026-07-10 — Priorizar primera imagen de galería en página de detalle

- **`renderGallery`** dividida en dos pasos: (1) imagen principal arranca ya con `fetchPriority = 'high'`, (2) miniaturas se crean recién en el evento `load` (o `error`) de la principal.
- Cada miniatura ahora lleva `loading="lazy"` + `fetchPriority = 'low'`.

## 2026-07-10 — Service Worker: caché de imágenes en página de detalle

- **Creado `sw.js`** en raíz del sitio: Service Worker con estrategia `stale-while-revalidate`.
- Solo intercepta peticiones `GET` con `destination === 'image'`, excluye tiles de OSM.
- Las imágenes se sirven desde caché inmediatamente si ya fueron descargadas; en background se revalida con la red y se actualiza la caché.
- Soporta respuestas opacas (imágenes cross-origin sin CORS).
- Limpieza automática de versiones viejas de caché al activarse.
- **Registro** en `inmueble.js` post-`load`, con guard `'serviceWorker' in navigator` y fallback silencioso.

## 2026-07-10 — Formulario de contacto: validación de celular con libphonenumber-js + adiós a los alert()

- **libphonenumber-js v1.13.8** cargado lazy vía `import()` dinámico (no bloquea carga inicial).
- **`isValidPhoneNumber(fullPhone)`** validación E.164 sin mapeo país ISO.
- **Cero `alert()`**: reemplazados por mensajes inline en `#inm-form-status` con clases `show` + `error`.
- **Campos inválidos** ahora usan `classList.toggle('error', ...)` en lugar de estilos inline.
- **Checkbox de privacidad** usa clase `error` en label (CSS ya cubre input + texto).
- **Fallback**: si la CDN falla, se omite validación de formato y solo se verifica no vacío.
- No se tocó `inmueble.js`, `inmueble.css`, ni lógica de localStorage/feedclick/WhatsApp.

## 2026-07-09 — Ejecutada corrección de contraste WCAG AA

- **Fase 3 completada:** paleta aprobada desde `test_de_accesibilidad.html` aplicada a todos los archivos del sitio.
  - `opencode/statettyAccesibilidad.css` y `assets/css/statettyAccesibilidad.css`: paleta actualizada (celeste `#0284c7`, navy `#0f172a`, mostaza `#f59e0b`, texto `#334155`).
  - `_includes/head.html`: agregado `<link>` a `statettyAccesibilidad.css` después de `theme-1.css`.
  - `assets/css/theme-1.css`: fixes vía overrides en `statettyAccesibilidad.css` — títulos, links, botones CTA, tabla de precios, labels decorativos, textos grises.
  - `_layouts/page.html`: links de posts y metadatos corregidos.
  - `_includes/contacto.html`: colores de formulario corregidos (etiquetas, textos secundarios).
  - `_includes/footer.html`: texto de baja opacidad subido de `.5` a `.65`.
  - `assets/css/main.css`: footer legacy corregido.
  - Todos los cambios verificados en `test.html` (toggle ANTES/CORREGIDO).

## Pendiente — refactor blog/index.html

- 2026-06-12: **`blog/index.html` no usa layout ni includes** — tiene header, footer y `<head>` completos hardcodeados. Crea `_layouts/blog.html`, refactoriza `blog/index.html` para que herede de él y use `{% include header.html %}` / `{% include footer.html %}`. El CSS específico del blog (hero, search, cards) puede quedar inline en `blog/index.html`.

## 2026-07-06

- **Fix calculadora de tarifas**: la lógica de `tarifasCalcPrecio()` no diferenciaba individual (1-4 agentes) de grupo5. Corregido: ahora usa `p.individual` para 1-4, `p.grupo5` para 5-9, `p.grupo10` para 10+. Slider cambiado de min=2 a min=1.
- **FAQ corregido**: textos "Bs. 75" → "Bs. 100" en `_includes/faq.html`.
- **Eliminado `test.html`**: contenía precios viejos ({30:75}) y no tenía referencias.
- **Verificar**: probar calculadora con 1, 2, 4, 5, 9, 10, 15 agentes y distintas duraciones en ambos países.

## 2026-06-29

- **Cloudflare Tunnel**: configurado `cloudflared` en Contabo VPS para exponer la API Node.js (`localhost:3030`) bajo `https://api.statetty.com`. Resuelve el error Mixed Content al consumir la API HTTP desde el frontend HTTPS (GitHub Pages). Registro CNAME `api → statetty-api.trycloudflare.com` en Cloudflare. `assets/js/config.js` actualizado de `http://161.97.176.137:3030/api/statetty` a `https://api.statetty.com/api/statetty`.
- **Documentación**: creado `documentación/configuracion-api-statetty.md` con el proceso completo de configuración del tunnel.

## 2026-06-21

- **Fix `openWsRedirect`**: el enlace "Contactar a..." en `mapa.js` y `mapatmp.js` ahora construye el mensaje WhatsApp en cliente, abre WhatsApp directo en paralelo y envía el tracking al servidor como fire-and-forget. Un error del servidor ya no bloquea la comunicación vía WhatsApp.
- **Fix `.remove-sel`**: agregado `e.stopPropagation()` en los handlers de la X roja de `mapa.js`, `mapaInmo.js`, `mapa_link_directo.js`, `mapatmp.js` para evitar cierre del toolbox al remover elemento de la selección.
- **Error modal `fetchFinderResult`**: si la API devuelve `{error: ...}`, se muestra modal con el mensaje de actualizar link desde Telegram y se detiene el flujo (no fallback).
- **Nuevo `assets/js/datos.js`**: funciones `fetchFinderResult(publicKey)` y `parseFinderResult(response)` para consultar `{WS_API_BASE}/finderresult?publicKey={k}` y transformar la respuesta al formato `locations[]` del mapa. Mapeo de campos API → Google Sheets (ej. `nombre→Titulo`, `desc→des`, `fotos[0]→foto`, etc.). Sanitización de descripción y cálculos de precioM2C/precioM2T.
- **Refactor `mapa.js`**: extraída función `renderMap(locs, centerLat, centerLng, circleRadius, avgPrice)` que encapsula toda la creación del mapa Leaflet + marcadores + popups + filtros + restauración de seleccionados.
- **Nuevo flujo de carga en `mapa.js`**: `init()` async — primero intenta con `k` param (API finderresult), si hay datos los usa; si no, fallback a Google Sheets. `info` provee lat, lng, dist (km→m), precioProm, userID. `usuario` provee nombre, agencia, teléfono (window.na/ag/an).
- **Script loading**: `datos.js` agregado en `maps/find/index.html` antes de `mapa.js`.

## 2026-06-16

- **Formulario de contacto**: países restringidos a Bolivia y Perú; ciudades limitadas a Santa Cruz de la Sierra (SCZ) y Lima (LIM) con nombres completos visibles.
- **Formulario de registro completo**: creado `/registro/index.html` con layout `default`. Formulario moderno responsivo con todos los campos de `frm.md`: email, nombres, apellidos, WhatsApp con código de país, fecha de nacimiento, sexo, agencia, país (Bolivia/Perú/OTRO), ciudades, nivel de experiencia (radiobuttons), nivel de tecnología (radiobuttons), intereses, expectativas, código de referencia y copia de respuestas. Envía al mismo endpoint que `contacto.html` (`WS_API_BASE + "/registro"`).

## 2026-06-24

- **Nueva página `/inmueble/`**: página autocontenida con header/footer propios y assets en subcarpeta (`inmueble/assets/{css,js,images}/`). Recibe `?_id={mongoId}` (query param). Consulta `{WS_API_BASE}/inmueble?_id={id}` y renderiza inmueble (galería + características + descripción). Sin layout Jekyll — HTML plano con JS vanilla.
- **Formulario de contacto en sidebar `/inmueble/`**: layout 2 columnas en desktop (main + sidebar sticky con formulario "Pregunta al anunciante"). Mobile: formulario al final del contenido + barra fija azul "Pregunta al anunciante" al tocar que hace scroll al formulario. Campos: texto pre-rellenado, email, celular con código de país, nombre, checkbox privacidad, botón "Contactar al anunciante".

## 2026-06-27

- **Formulario `/inmueble/registro/` alineado con schema Mongoose**: secciones: Datos del agente (agentName, agentPhon, agenteID oculto), Información general (nombre + tipo + negocio), Precio (USD entero), Ubicación (pais/ciudad selects dinámicos + dirección/zona + lat,lng combo), Características (dorm/baños/estac/ambientes/pisos/floorLevel/m2c/m2t), Equipamiento (pileta, petsAllowed, elevadores, duchas), Multimedia (desc + fotos + videoURL), Estado comercial (select único → booleans), Detalles adicionales (anoc, fecha_entrega, atributos). Envía `nCaptacion: true`, `activo: true`. Edición: acepta `?_id=` para cargar datos existentes y usa PUT en vez de POST.
- **Ubigeo**: creados `assets/js/ubigeo/paises.js`, `BO.js`, `PE.js` con departamentos y ciudades. País y ciudad en selects dinámicos.
- **Selector de coordenadas**: lat/lng en un solo input separado por coma + botón "📍 Encontrar coordenadas" que abre modal con mapa Leaflet. Clic en mapa coloca marcador. Botones "Usar esta ubicación" y "Cancelar".

## 2026-07-01

- **Carga de datos vía `?k=` en formularios**: `_includes/contacto.html` y `registro/index.html` ahora leen `?k=` de la URL, consultan `getuser?publicKey=...` y pre-llenan los campos mapeables del formulario. El payload del POST incluye `publicKey` cuando `k` está presente. Select `f-pais` cambiado a valores `Bolivia`/`Peru` (capitalizados), select `f-ciudad` a `SCZ`/`LIM`. La página `/registro/` normaliza país y sexo con `.toLowerCase()` para coincidir con los valores del formulario.
- **Ciudad como select en `/registro/`**: el campo `ciudades` (texto libre) reemplazado por `<select id="f-ciudad">` con opciones dinámicas `SCZ`/`LIM` según el país, igual que `_includes/contacto.html`. Eliminada la opción `otro` del país. Payload actualizado a `ciudad: ciudad.toUpperCase()`.
- **Mensajes amigables en `inmueble/registro/`**: al fallar `?k=` (inválida, vencida, faltante) se muestran mensajes específicos y en tono coloquial en lugar del genérico "Acceso no autorizado". Se parsea `res.body.error` de la API para distinguir entre `publicKey inválida`, `publicKey vencida` y otros errores.
