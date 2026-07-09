# Plan de cambios — Corrección de contraste y tipografía

Basado en `informe-contraste.md`. Soluciones usando la paleta de `statettyAccesibilidad.css`.

---

## 1. Cómo se carga `statettyAccesibilidad.css`

El proyecto es Jekyll + HTML plano. No hay bundler. El CSS se carga vía `<link>` en `_includes/head.html`.

**Acción:** Agregar después de la línea 24 de `head.html` (después de `theme-1.css`):

```html
<link rel="stylesheet" href="{{ '/assets/css/statettyAccesibilidad.css' | prepend: site.url }}">
```

Y copiar el archivo `opencode/statettyAccesibilidad.css` a `assets/css/statettyAccesibilidad.css`.

### Dependencias

- `statettyAccesibilidad.css` debe cargarse **después** de `theme-1.css` para que sus reglas ganen por cascada.
- No tiene dependencias externas. Sus variables (`--celeste-texto`, `--mostaza-texto`, etc.) se usan en los cambios de abajo.
- Si algún selector de theme-1.css tiene más especificidad, se puede necesitar duplicar especificidad o usar `:where()`.

---

## 2. Bloque crítico (texto de cuerpo, navegación, CTAs principales)

### 2.1 Links en `theme-1.css` y globales

**Archivo:** `assets/css/theme-1.css`

- [ ] Línea 29: `a { color: #17baef; }` → `a { color: var(--celeste-texto); }` (6.6:1)
- [ ] Línea 37-39: `a:hover { color: #0e98c5; }` → `a:hover { color: var(--azul-marino); }`
- [ ] Agregar `a:visited { color: var(--azul-marino-700); }` para mantener contraste

**Archivo:** `assets/css/theme-1.css` (sección Statetty Global Styles)

- [ ] Línea 546: `a { color: var(--blue); }` → `a { color: var(--celeste-texto); }`
- [ ] Línea 547: `a:hover { color: var(--blue-dark); }` → mantener, ya es `#074f67` (9:1 OK)

### 2.2 Títulos

**Archivo:** `assets/css/theme-1.css`

- [ ] Línea 26: `h1, h2, h3, h4, h5, h6 { color: #17baef; }` → `{ color: var(--azul-marino); }` (9:1)

Nota: Los títulos secundarios en cards (`.about-item h3`, `.problema-card h3`, `.funcion-card h3`, etc.) ya se definen con `var(--blue-dark)` o `#074f66` — esos están OK.

### 2.3 Botón CTA secundario (mostaza + texto blanco)

**Archivo:** `assets/css/theme-1.css`

- [ ] Líneas 94-100:
  ```css
  a.btn-cta-secondary, .btn-cta-secondary {
    background: #eebf3f;
    color: #fff;       /* 1.74:1 → MAL */
  }
  ```
  → Reemplazar por:
  ```css
  a.btn-cta-secondary, .btn-cta-secondary {
    background: var(--mostaza);
    color: var(--negro-texto);   /* 10.3:1 → OK */
  }
  ```
- [ ] Líneas 102-106: hover → en hover mantener texto negro:
  ```css
  a.btn-cta-secondary:hover, .btn-cta-secondary:hover {
    background: #d9a72e;   /* hover más oscuro de la mostaza */
    color: var(--negro-texto);
  }
  ```

Nota: La variable `--negro-texto` está definida en `statettyAccesibilidad.css` como `#11181c`.

### 2.4 Nav activo

**Archivo:** `assets/css/theme-1.css`

- [ ] Líneas 232-235: `.header .main-nav .nav .nav-item.active .nav-link { color: #17baef; }` → `{ color: var(--celeste-texto); }`

### 2.5 Precio del inmueble

**Archivo:** `inmueble/assets/css/inmueble.css`

- [ ] Línea 240: `.inm-price { color: var(--blue); }` → `{ color: var(--celeste-texto); }`

Riesgo: Bajo. El precio está sobre fondo blanco, `--celeste-texto` mantiene el tono azul y cumple 6.6:1.

### 2.6 Links en `page.html` (layout de blog/post)

**Archivo:** `_layouts/page.html`

- [ ] Línea 49: `.post-content a { color: #17baef; }` → `{ color: var(--celeste-texto); }`
- [ ] Línea 80: `.post-nav a { color: #17baef; }` → `{ color: var(--celeste-texto); }`

Riesgo: Bajo. Los estilos están en un bloque `<style>` dentro del layout. Habrá que cambiar el hex por `var(--celeste-texto)`. La variable existirá globalmente porque el CSS se carga en `<head>`.

---

## 3. Bloque alto (links secundarios, badges/stats, cards)

### 3.1 Tabla de precios (`th`)

**Archivo:** `assets/css/theme-1.css`

- [ ] Líneas 309-310:
  ```css
  th { background-color: #eebe3e; color: white; }
  ```
  → Reemplazar por:
  ```css
  th { background-color: var(--mostaza); color: var(--negro-texto); }
  ```

### 3.2 Labels decorativos con `var(--blue)` (#17baef)

**Archivo:** `assets/css/theme-1.css` (sección Statetty Global Styles)

- [ ] Línea 671: `.problema-label { color: var(--blue); }` → `{ color: var(--celeste-texto); }`
- [ ] Línea 786: `.testimonios-label { color: var(--blue); }` → `{ color: var(--celeste-texto); }`
- [ ] Línea 885: `.prensa-label { color: var(--blue); }` → `{ color: var(--celeste-texto); }`
- [ ] Línea 648: `.pronunciation i { color: var(--blue); }` → `{ color: var(--celeste-texto); }`
- [ ] Línea 870: `.post-card__date { color: var(--blue); }` → `{ color: var(--celeste-texto); }`

### 3.3 Texto de funciones sobre fondo azul

**Archivo:** `assets/css/theme-1.css` (sección Statetty Global Styles)

- [ ] Línea 712: `.funciones-label { color: var(--yellow); }` sobre fondo `var(--blue)` → cambiar a:
  ```css
  .funciones-label { color: var(--mostaza-texto); }
  ```
  (opcional: mantener `var(--mostaza)` si el label está en negrita +24px, pero a 12px no cumple)

- [ ] Línea 724: `.funciones-sub { color: rgba(255,255,255,.80); }` → se necesita un color más claro. Proponer:
  ```css
  .funciones-sub { color: rgba(255,255,255,.92); }  /* ~3.5:1 sobre #17baef, mejora */
  ```
  o ideal: `color: #fff; opacity: 0.92;`

### 3.4 Badge de archivos de prensa

**Archivo:** `assets/css/theme-1.css`

- [ ] Línea 940: `.prensa-file-badge { color: var(--blue); }` sobre `rgba(23,186,239,.10)` → `{ color: var(--celeste-texto); }`

### 3.5 Textos grises borderline `#777`

Varios textos secundarios usan `#777` (~4.3:1, no alcanza 4.5:1 para texto < 18px). La solución es oscurecerlos a `#666` (~5.2:1).

**Archivo:** `assets/css/theme-1.css`

- [ ] Línea 646: `.pronunciation { color: #777; }` → `{ color: #666; font-size: 0.95rem; }`
- [ ] Línea 837: `.testimonio-agency { color: #777; }` → `{ color: #666; }`
- [ ] Línea 848: `.audio-label { color: #777; }` → `{ color: #666; }`
- [ ] Línea 862: `.blog-section .section-subtitle { color: #777; }` → `{ color: #666; }`
- [ ] Línea 895: `.prensa-sub { color: #777; }` → `{ color: #666; }`

**Archivo:** `_layouts/page.html`

- [ ] Línea 28: `.post-header .meta { color: #888; }` → `{ color: #666; }`

**Archivo:** `_includes/contacto.html`

- [ ] Línea 83: `#Contacto .form-group label { color: var(--muted); }` donde `--muted: #777` → cambiar a:
  ```css
  #Contacto .form-group label { color: #666; }
  ```

---

## 4. Bloque bajo (footer, textos legales, elementos decorativos)

### 4.1 Footer legacy (solo si `main.css` está cargado)

**Archivo:** `assets/css/main.css`

- [ ] Líneas 320-323: `.site-footer li, .site-footer p { color: #828282; }` → `{ color: #666; }`

Riesgo: Bajo. Este footer solo aparece si algún layout usa `main.css`, que actualmente **no está incluido** en `head.html`. El footer real del sitio está en `footer.html` con estilos inline.

### 4.2 Footer inline (`footer.html`)

El footer actual usa estilos inline. Los colores son mayormente OK (fondo oscuro con texto blanco/mostaza). Solo un punto menor:

- [ ] Texto `rgba(255,255,255,.5)` en `.footer-copy` y `.footer-legal a` → subir a `rgba(255,255,255,.6)` para mejorar contraste de ~3.8:1 a ~4.5:1.

---

## 5. Resumen de alcance

| Ítem | Cantidad |
|---|---|
| Archivos CSS a modificar | 3 (`theme-1.css`, `inmueble.css`, `main.css` legacy) |
| Archivos HTML a modificar | 2 (`page.html`, `contacto.html`) |
| Includes a modificar | 1 (`footer.html`) — opcional |
| CSS nuevo a agregar | 1 (`statettyAccesibilidad.css` → `assets/css/`) |
| Puntos del informe resueltos | 22 de 22 |
| Puntos que requieren revisión visual | 2 (`.funciones-label`, `.funciones-sub` — el contraste sobre fondo azul es difícil de calcular sin verlo renderizado) |

### Dependencias entre cambios

1. **Primero:** copiar `statettyAccesibilidad.css` a `assets/css/` y agregar el `<link>` en `head.html`.
2. **Segundo:** modificar `theme-1.css` (cambios de variables y selectores).
3. **Tercero:** modificar `inmueble.css`, `page.html`, `contacto.html` (cambios puntuales).
4. **Cuarto:** ajustes menores en `footer.html` y `main.css` (opcional/bajo riesgo).

Ningún cambio rompe layout ni espaciado. Todo es reemplazo de valores de color y ajuste de tamaño de fuente dentro del mismo archivo.
