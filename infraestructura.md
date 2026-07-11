# Infraestructura de Statetty

## 1. Resumen de arquitectura

```
statetty.com (frontend estático)
  ┌─────────────────────────────────────┐
  │  GitHub + GitHub Actions            │
  │  → Jekyll build → GitHub Pages      │
  │  → Dominio: statetty.com (CNAME)    │
  │  → DNS: Cloudflare (proxy gris)     │
  └──────────────┬──────────────────────┘
                 │ fetch HTTPS
                 ▼
api.statetty.com (backend API)
  ┌──────────────────────────────────────┐
  │  Cloudflare Tunnel (cloudflared)     │
  │  → Proxy naranja (HTTPS → tunnel)    │
  │  → Localhost:3030 (HTTP)             │
  │  → Node.js + Express                 │
  │  → MongoDB local                     │
  │  → VPS Contabo (Ubuntu)             │
  └──────────────────────────────────────┘
```

| Componente       | Alojamiento              | Tecnología              | URL                          |
| ---------------- | ------------------------ | ----------------------- | ---------------------------- |
| Sitio web        | GitHub Pages             | Jekyll (Ruby) + HTML/JS | https://statetty.com         |
| API              | Contabo VPS (Ubuntu)    | Node.js + Express       | https://api.statetty.com     |
| Base de datos    | Contabo VPS (local)     | MongoDB                 | mongodb://localhost:3030     |
| Proxy/Túnel      | Cloudflare               | cloudflared tunnel      | HTTPS → localhost:3030       |
| DNS              | Cloudflare (nameservers) | Cloudflare DNS          | statetty.com + api.statetty.com |

---

## 2. Frontend — statetty.com (GitHub Pages + Jekyll)

### 2.1 Stack

| Capa          | Tecnología                                  |
| ------------- | ------------------------------------------- |
| Generador     | Jekyll 4.3 (Ruby 3.2)                       |
| Lenguajes     | HTML5, CSS3, JavaScript (vanilla), SCSS     |
| Templating    | Liquid                                      |
| CSS           | Bootstrap 5 + temas propios sobre SCSS      |
| Mapas         | Leaflet + OpenStreetMap tiles               |
| PDF           | jsPDF + jsPDF-AutoTable + html2canvas       |
| Service Worker| sw.js (caché de imágenes, stale-while-revalidate) |
| Analytics     | Google Analytics (G-PM2Q0F233Y) + Metricool |
| SEO           | Open Graph, Twitter Cards, oEmbed, schema.org, sitemap.xml, opensearch.xml |

### 2.2 CI/CD

GitHub Actions (`.github/workflows/jekyll.yml`):
- Trigger: push a `main`
- Build: `bundle exec jekyll build` sobre Ubuntu
- Deploy: `actions/upload-pages-artifact` + `actions/deploy-pages`
- Environment: `github-pages`

### 2.3 Archivos raíz

| Archivo/Directorio   | Propósito                                              |
| -------------------- | ------------------------------------------------------ |
| `_config.yml`        | Configuración global de Jekyll                         |
| `_config.yml.asb`    | Backup de configuración alternativa                    |
| `Gemfile`            | Dependencias Ruby (Jekyll, plugins)                    |
| `Gemfile.lock`       | Lock de dependencias                                   |
| `CNAME`              | Contiene `statetty.com` — dominio personalizado        |
| `index.html`         | Landing page (layout: landing)                         |
| `index.html.tmp2`    | Variante temporal de landing (no activa)               |
| `404.html`           | Página de error 404                                    |
| `robots.txt`         | Reglas para crawlers                                   |
| `sitemap.xml`        | Sitemap dinámico generado por Jekyll                   |
| `feed.xml`           | RSS/Atom feed para el blog                             |
| `opensearch.xml`     | OpenSearch para buscador integrado                     |
| `info.json`          | oEmbed JSON                                            |
| `info.xml`           | oEmbed XML                                             |
| `resume.json`        | Structured data tipo resume                            |
| `sw.js`              | Service Worker — caché de imágenes                     |
| `LICENSE`            | Licencia del proyecto                                  |
| `README.md`          | Readme del repositorio                                 |
| `AGENTS.md`          | Instrucciones para opencode AI                         |
| `PLAN.md`            | Plan de trabajo activo                                 |
| `CHANGELOG.md`       | Registro de cambios                                   |
| `opencode.jsonc`     | Configuración de opencode AI                           |
| `arquitectura.md`    | Documento de arquitectura del sitio                    |
| `infraestructura.md` | Este documento                                         |
| `Statetty_Pitch_Deck.md` | Pitch deck en markdown                            |

### 2.4 Páginas HTML/Markdown principales

| Archivo                          | Layout           | Propósito                          |
| -------------------------------- | ---------------- | ---------------------------------- |
| `index.html`                     | landing          | Landing page principal             |
| `comoimg.md`                     | page             | "¿Cómo me imagino?"                |
| `frm.md`                         | page             | Formulario de contacto             |
| `numeros.md`                     | page             | Estadísticas y números             |
| `registro/index.html`            | default          | Registro de usuarios               |
| `politica_de_privacidad.html`    | default          | Política de privacidad             |
| `terminos_y_condiciones.html`    | default          | Términos y condiciones             |
| `descargo_de_responsabilidad.html` | default        | Descargo de responsabilidad        |
| `test.html`                      | —                | Página de prueba                   |
| `test_de_accesibilidad.html`     | —                | Test de accesibilidad              |

### 2.5 `_layouts/` — Plantillas

| Archivo         | Propósito                                  |
| --------------- | ------------------------------------------ |
| `default.html`  | Layout base con header/footer completo    |
| `defaultp.html` | Variante de default                        |
| `landing.html`  | Layout para landing page (secciones)       |
| `page.html`     | Páginas de contenido genérico              |
| `post.html`     | Artículos de blog                          |
| `blog.html`     | Índice del blog                            |
| `map.html`      | Mapas Leaflet                              |
| `iframe.html`   | Páginas embebidas en iframe                |
| `grafica.html`  | Páginas con gráficas                       |
| `taller.html`   | Páginas de talleres                        |

### 2.6 `_includes/` — Fragmentos reutilizables (35 archivos)

| Archivo               | Propósito                                  |
| --------------------- | ------------------------------------------ |
| `head.html`           | `<head>` con meta tags, CSS, JS            |
| `seo.html`            | Open Graph, Twitter Cards, schema.org      |
| `analytics.html`      | Google Analytics + Metricool               |
| `favicon.html`        | Favicons                                   |
| `header.html`         | Barra de navegación principal              |
| `headerb.html`        | Variante de navegación                     |
| `headerp.html`        | Variante de navegación                     |
| `headert.html`        | Variante de navegación                     |
| `headG.html`          | Head para gráficas                         |
| `headMaps.html`       | Head para mapas                            |
| `inicio.html`         | Hero section con CTA                       |
| `about.html`          | Sección "¿Qué es Statetty?"               |
| `beneficios.html`     | 6 beneficios clave                         |
| `tarifas.html`        | Tabla de precios con gráfica               |
| `testimonios.html`    | Casos de éxito                             |
| `faq.html`            | Preguntas frecuentes                       |
| `contacto.html`       | Formulario + información de contacto       |
| `frmcontacto.html`    | Formulario de contacto embebido            |
| `footer.html`         | Pie de página con legal y redes            |
| `social_links.html`   | Iconos de redes sociales                   |
| `social-compartir.html` | Botones para compartir                   |
| `blog.html`           | Lista de posts recientes                   |
| `post-url-pretty.html`| URLs amigables para posts                  |
| `tag-list.html`       | Lista de etiquetas                         |
| `barchart.html`       | Gráfica de barras (tarifas)                |
| `funciones.html`      | Lista de funciones del bot                 |
| `problema.html`       | Sección "El problema"                      |
| `recursos.html`       | Recursos y enlaces útiles                  |
| `prensa.html`         | Kit de prensa                              |
| `talleres.html`       | Grid de talleres                           |
| `talleres.md`         | Contenido markdown de talleres             |
| `pronuntiation.html`  | Pronunciación de "Statetty"               |
| `scriptSend.html`     | Script de envío de formulario              |
| `fbButtonCode.html`   | Botón de Facebook                          |
| `disqus.html`         | Comentarios Disqus                         |

### 2.7 `assets/` — Recursos estáticos

```
assets/
├── js/
│   ├── main.js                   # Animación header, smooth scroll
│   ├── config.js                 # Config global (STATETTY_CONFIG.WS_API_BASE)
│   ├── datos.js                  # Datos auxiliares
│   ├── mapa.js                   # Mapa Leaflet (inmuebles) ~946 ln
│   ├── mapatmp.js                # Variante experimental de mapa
│   ├── mapaInmo.js               # Mapa de agencias inmobiliarias ~300 ln
│   ├── mapa_link_directo.js      # Manejo de enlaces directos al mapa
│   ├── acm.js                    # ACM (Análisis Comparativo de Mercado) ~487 ln
│   ├── inmueblesPdf.js           # Generador de brochure PDF ~693 ln
│   ├── ubigeo/
│   │   ├── BO.js                 # Ubigeo Bolivia
│   │   ├── PE.js                 # Ubigeo Perú
│   │   └── paises.js             # Países
│   └── vendor/                   # Librerías third-party
│       ├── bootstrap.js
│       ├── c3.min.js / c3ext.js
│       ├── chosen.jquery.min.js
│       ├── d3.v3.min.js / d3.v4.min.js / d3.tip.v0.6.3.js
│       ├── heatmap.min.js / leaflet-heatmap.js
│       ├── jquery-1.9.1.min.js / jquery-3.2.1.min.js
│       ├── lazysizes.min.js
│       ├── emailoctopus.js
│       ├── html5shiv.min.js / respond.min.js
│       ├── modernizr-2.7.1.custom.min.js
│       └── url.min.js
├── css/
│   ├── main.css                  # Estilos principales compilados
│   ├── bootstrap.min.css
│   ├── c3.min.css
│   ├── chosen.min.css
│   ├── statettyAccesibilidad.css
│   ├── syntax.css                # Highlighting syntax
│   └── theme-*.css               # 4 temas de color
├── scss/                         # Fuentes SCSS
│   ├── theme-*.scss
│   └── theme/
│       ├── _base.scss
│       ├── _mixins.scss
│       └── _responsive.scss
├── plugins/
│   ├── bootstrap/                # Bootstrap 5 (32 CSS + 12 JS)
│   ├── gumshoe/                  # Scroll spy
│   └── prism/                    # Syntax highlighting
├── fontawesome/                  # Font Awesome Free (iconos)
├── fonts/                        # Tipografías (Font Awesome)
├── images/                       # Imágenes del sitio
│   ├── favicon/                  # Favicon principal
│   ├── favicon_casa_azul/        # Favicon alternativo
│   ├── favicon_pin_rojo/         # Favicon alternativo
│   ├── pointers/                 # Marcadores para mapas
│   ├── realtors/                 # Logos de agencias colaboradoras
│   ├── bieni/ c21/ Capital/ elfaro/ infoCasas/ laencontre/
│   ├── nexoi/ remax/ sce/ ultracasas/ uno/
│   └── ui/                       # UI elements
├── docs/                         # Documentos descargables
│   ├── statetty_pitch_Deck.pdf
│   ├── statetty-kit-prensa.pdf
│   └── statetty_logo_*.png
└── audio/
    ├── gabriel_perez_01.mp3      # Testimonio
    └── statetty.mp3              # Pronunciación
```

### 2.8 Secciones del sitio (subdirectorios con `index.html`)

| Directorio              | Propósito                                        |
| ----------------------- | ------------------------------------------------ |
| `maps/find/`            | Mapa de resultados de búsqueda de inmuebles      |
| `maps/findb/`           | Mapa de resultados (variante B)                  |
| `maps/inmobiliarias/`   | Mapa de agencias inmobiliarias                   |
| `inmueble/`             | Página de propiedad individual + registro        |
| `inmueble/registro/`    | Formulario de registro de inmueble               |
| `registro/`             | Registro de usuarios                             |
| `talleres/`             | Páginas de talleres (markdown)                   |
| `blog/`                 | Índice del blog                                  |
| `tags/`                 | Página de etiquetas                              |
| `graficas/`             | Contenido de gráficas                            |
| `wa/`                   | Redirección a WhatsApp                           |
| `docs/`                 | Documentación                                    |

### 2.9 `_posts/` — Blog

| Archivo                                                     | Fecha       |
| ----------------------------------------------------------- | ----------- |
| `2026-06-12-monitoreo-whatsapp-para-agentes-inmobiliarios.md` | 2026-06-12 |
| `2026-06-15-un-gigante-se-mueve-remax-real-brokerage-bolivia.md` | 2026-06-15 |
| `2026-06-22-que-es-el-acm-y-como-te-ayuda-a-vender-mas.md` | 2026-06-22 |
| `2026-06-29-top-10-presencia-digital.md`                   | 2026-06-29 |
| `2026-07-06-la-tierra-no-se-devalua.md`                    | 2026-07-06 |
| `2026-07-13-tokenizacion.md`                               | 2026-07-13 |

### 2.10 Archivos de datos

| Archivo                         | Propósito                         |
| ------------------------------- | --------------------------------- |
| `data/mijp-paises-porcent.json` | Datos de países (MIJP)            |
| `data/mijp-edades-porcent.json` | Datos de edades (MIJP)            |

---

## 3. Backend — api.statetty.com (Contabo VPS + Node.js + MongoDB)

### 3.1 Especificaciones del servidor

| Recurso          | Detalle                           |
| ---------------- | --------------------------------- |
| Proveedor        | Contabo                           |
| Sistema          | Ubuntu (última versión LTS)       |
| API              | Node.js + Express                 |
| Puerto           | 3030 (localhost, HTTP)            |
| Base de datos    | MongoDB local                     |
| Túnel            | Cloudflare Tunnel (cloudflared)   |
| Dominio          | api.statetty.com                  |

### 3.2 Stack del backend

| Componente     | Tecnología                    |
| -------------- | ----------------------------- |
| Runtime        | Node.js                       |
| Framework      | Express                       |
| Base de datos  | MongoDB                       |
| Driver MongoDB | mongoose o mongodb-driver     |
| Túnel SSL      | cloudflared (Cloudflare Tunnel) |

### 3.3 Endpoints de la API

Base URL: `https://api.statetty.com/api/statetty`

| Endpoint            | Método | Propósito                            |
| ------------------- | ------ | ------------------------------------ |
| `/finderresult`     | GET    | Resultados de búsqueda de inmuebles  |
| `/inmueble`         | GET    | Detalle de un inmueble               |
| `/inmobiliarias`    | GET    | Datos de agencias inmobiliarias      |
| `/registro`         | POST   | Registro de usuarios                 |
| `/contacto`         | POST   | Formulario de contacto               |
| (y otros según módulo) |     |                                      |

### 3.4 Configuración de Cloudflare Tunnel

Archivo: `/root/.cloudflared/config.yml`

```yaml
tunnel: statetty-api
credentials-file: /root/.cloudflared/<UUID>.json

ingress:
  - hostname: api.statetty.com
    service: http://localhost:3030
  - service: http_status:404
```

Servicio: `cloudflared` (systemd, inicio automático)

---

## 4. DNS y Cloudflare

### 4.1 Nameservers

El dominio `statetty.com` usa nameservers de Cloudflare (migrados desde Namecheap).

### 4.2 Registros DNS

| Tipo  | Nombre  | Valor                               | Proxy     |
| ----- | ------- | ----------------------------------- | --------- |
| A     | `@`     | `185.199.108.153`                   | Gris (DNS only) |
| A     | `@`     | `185.199.109.153`                   | Gris (DNS only) |
| A     | `@`     | `185.199.110.153`                   | Gris (DNS only) |
| A     | `@`     | `185.199.111.153`                   | Gris (DNS only) |
| CNAME | `www`   | `asosab.github.io`                  | Gris (DNS only) |
| CNAME | `api`   | `statetty-api.trycloudflare.com`    | Naranja (Proxied) |

- Los registros de GitHub Pages (`@`, `www`) están en **DNS only** (gris) para que Cloudflare no intercepte el tráfico estático.
- El registro `api` está en **Proxied** (naranja) para que Cloudflare enrute el tráfico al tunnel.

### 4.3 Flujo de red

```
Usuario
  │
  ├── https://statetty.com ───────────────────────────────────┐
  │                                                            │
  │   DNS → Cloudflare (gris, pasa directo)                    │
  │   → GitHub Pages (185.199.108.153)                         │
  │   → Sirve HTML/JS/CSS estático                             │
  │                                                            │
  ├── fetch a https://api.statetty.com/api/statetty/...        │
  │                                                            │
  │   DNS → Cloudflare (naranja, intercepta)                   │
  │   → Cloudflare Tunnel (cloudflared)                        │
  │   → localhost:3030 (HTTP)                                  │
  │   → API Node.js                                            │
  │   → MongoDB                                                │
  └────────────────────────────────────────────────────────────┘
```

---

## 5. Archivos de documentación y desarrollo

| Archivo/Directorio              | Propósito                                        |
| ------------------------------- | ------------------------------------------------ |
| `opencode/`                     | Archivos de trabajo de opencode AI               |
| `opencode/documentación/configuracion-api-statetty.md` | Configuración del tunnel |
| `opencode/informe-contraste.md` | Informe de contraste de accesibilidad           |
| `opencode/plan-cambios.md`      | Plan de cambios del sitio                        |
| `opencode/plancss.md`           | Plan de reorganización CSS                       |
| `opencode/statettyAccesibilidad.css` | CSS de accesibilidad                         |
| `opencode/tmp/`                 | Archivos temporales de planeación                |
| `opencode.jsonc`                | Configuración de opencode AI                     |
| `AGENTS.md`                     | Instrucciones para opencode AI                   |
| `PLAN.md`                       | Plan de trabajo activo                           |
| `CHANGELOG.md`                  | Registro de cambios del proyecto                 |
| `arquitectura.md`               | Arquitectura del sitio web                       |
| `infraestructura.md`            | Este documento                                   |

---

## 6. Archivos temporales / huérfanos (no críticos)

| Archivo                     | Estado                        |
| --------------------------- | ----------------------------- |
| `index.html.tmp2`           | Temporal — no referencia     |
| `tmp.txt`                   | Temporal — sin uso           |
| `_config.yml.asb`           | Backup de configuración       |
| `inmueble/index_old.html`   | Versión anterior              |
| `inmueble/registro/index_old.html` | Versión anterior        |
| `test.html`                 | Página de prueba              |
| `test_de_accesibilidad.html` | Test de accesibilidad        |

---

## 7. Resumen de servicios externos

| Servicio                    | Uso                                            |
| --------------------------- | ---------------------------------------------- |
| GitHub + GitHub Pages       | Repositorio, CI/CD, hosting del frontend       |
| Cloudflare                  | DNS, túnel HTTPS para la API                   |
| Contabo                     | VPS para API Node.js + MongoDB                 |
| Namecheap                   | Registro del dominio statetty.com              |
| Telegram                    | Bot @statettybot (producto principal)          |
| OpenStreetMap               | Tiles para Leaflet                             |
| jsDelivr CDN                | jsPDF, jsPDF-AutoTable, html2canvas            |
| Google Analytics            | Tracking (G-PM2Q0F233Y)                        |
| Metricool                   | Tracking adicional                             |
| Google Fonts                | Lato + Montserrat                              |
| Google Forms                | Formulario de registro (iframe)                |
| Disqus                      | Comentarios del blog                           |
| Ekvilibro Lab (Netlify)     | Proxy de imágenes para PDF                     |
