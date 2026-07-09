# Plan de trabajo — Corrección de contraste y tipografía en statetty.com

## 0. Instrucciones para el agente (OpenCode)

Este documento es un **plan de trabajo en dos fases**. No modifiques código todavía.
El objetivo de esta primera pasada es:

1. **Fase 1:** generar un **informe** (`informe-contraste.md`) con todos los puntos del
   sitio que tienen problemas de contraste y/o tamaño de texto.
2. **Fase 2:** con ese informe ya armado, generar un **plan de cambios**
   (`plan-cambios.md`) que indique, archivo por archivo y selector por selector,
   cómo corregir cada punto usando la paleta ya definida en `statettyAccesibilidad.css`.

Recién en una tercera pasada (fuera de este plan, con aprobación explícita del
usuario) se aplican los cambios al código. **No edites HTML/CSS/componentes en
esta tarea.**

---

## 1. Contexto del proyecto

Statetty es un sitio inmobiliario. Su identidad de marca usa tres colores base
(extraídos del logo oficial):

| Color | Hex | Uso previsto |
|---|---|---|
| Azul marino | `#074f67` | Color primario, texto, fondos oscuros |
| Celeste | `#16baef` | Color de acento/marca (decorativo) |
| Mostaza | `#eebe3e` | Color de acento/marca (decorativo) |

**Problema detectado:** el celeste y la mostaza tienen muy bajo contraste sobre
fondo blanco (2.26:1 y 1.74:1 respectivamente — el mínimo WCAG AA para texto
normal es **4.5:1**, y para texto grande/UI es **3:1**). Es muy probable que el
sitio los esté usando directamente como color de texto, link o botón sobre
blanco, lo que los vuelve poco o nada legibles. También puede haber tamaños de
fuente por debajo de lo recomendado (mínimo 16px en body, 14px en textos
secundarios).

## 2. Archivo de referencia (ya creado, no modificar en esta tarea)

- **`statettyAccesibilidad.css`** — ya contiene:
  - Variables (`:root`) con la paleta completa: colores de marca "decorativos"
    y sus variantes "de texto" ya corregidas para cumplir WCAG AA
    (`--celeste-texto: #076485` → 6.6:1 sobre blanco, `--mostaza-texto:
    #6e5008` → 7.5:1 sobre blanco).
  - Reglas base de tipografía (tamaño mínimo 16px, `line-height` 1.6, escala
    de títulos responsiva con `clamp()`).
  - Reglas de botones, links, fondos de marca, badges, cards, formulario,
    footer y nav ya resueltas con combinaciones que cumplen contraste.

Este archivo es la **fuente de verdad** de qué combinaciones de color están
aprobadas. El plan de la Fase 2 debe mapear los problemas del informe a las
reglas/variables que ya existen ahí, no inventar colores nuevos.

Ubicalo en el repo (buscalo por nombre; si no existe todavía en el proyecto,
asumí que se va a agregar en la carpeta de estilos principal, ej.
`src/styles/`, `public/css/` o equivalente según la estructura real) y
usalo como referencia constante durante las dos fases.

## 3. Reglas y restricciones (no negociables)

- **No cambiar la paleta de marca.** El celeste y la mostaza originales
  (`#16baef`, `#eebe3e`) se mantienen para uso decorativo (fondos grandes,
  íconos, ilustraciones, texto grande en negrita 24px+, o texto sobre fondo
  oscuro donde sí cumplen contraste). Solo se reemplaza su uso como *texto
  sobre fondo claro* por las variantes de `statettyAccesibilidad.css`.
- **No romper el layout ni el diseño visual existente** (espaciados,
  estructura, componentes). El alcance es color y tipografía.
- **Tamaño de fuente mínimo:** 16px en texto de cuerpo, 14px en textos
  secundarios/footer. Nada por debajo de eso.
- Si el sitio usa un framework/componentes (React, Vue, etc.) con estilos
  inline o `styled-components`/CSS-in-JS, marcalo aparte: esos casos no se
  resuelven solo importando el CSS, van a necesitar edición puntual del
  componente. Anotalos igual en el informe.

---

## 4. FASE 1 — Informe de contraste (`informe-contraste.md`)

### 4.1 Qué revisar

Recorré todo el código fuente del sitio (HTML, CSS, y componentes si aplica)
y relevá **cada combinación texto/fondo** que exista, prestando especial
atención a:

- Texto de cuerpo (`p`, `li`, `span`) sobre fondo blanco o claro.
- Títulos (`h1`–`h6`).
- Links (estado normal, hover, visitado).
- Botones (CTA primario, secundario, outline).
- Badges / stats (ej. contadores tipo "+120.000 inmuebles indexados").
- Nav / menú, incluido estado activo y mobile.
- Footer.
- Placeholders e inputs de formularios.
- Cualquier texto superpuesto a imágenes o gradientes.
- Tamaño de fuente real renderizado (no solo el declarado — revisar herencia
  y unidades relativas) en cada uno de los puntos anteriores.

### 4.2 Cómo calcular el contraste

Usá la fórmula estándar WCAG de luminancia relativa para cada par
texto/fondo y compará contra:

- **4.5:1** mínimo para texto normal.
- **3:1** mínimo para texto grande (≥24px, o ≥19px en negrita) y para
  componentes de UI (bordes de inputs, iconos funcionales).

Si el color de fondo real no se puede determinar con certeza (ej. imagen de
fondo, gradiente), anotalo como "requiere revisión visual" en vez de asumir.

### 4.3 Formato de salida esperado

Generá `informe-contraste.md` con una tabla así, una fila por cada punto
encontrado:

| # | Ubicación (archivo/selector) | Texto | Fondo | Color texto | Color fondo | Contraste actual | ¿Cumple AA? | Tamaño fuente | Severidad |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `hero.css` `.hero .subtitle` | "Encontrá tu propiedad ideal" | blanco | `#16baef` | `#ffffff` | 2.26:1 | ❌ No | 14px | Alta |

Columnas:
- **Ubicación:** archivo + selector/clase o línea exacta.
- **Severidad:** Alta (texto principal, CTAs, nav — bloquea lectura),
  Media (texto secundario, badges), Baja (footer, fine print).

Al final del informe, agregá un resumen ejecutivo: cantidad total de puntos
encontrados, cuántos por severidad, y los 3 problemas más repetidos en el
sitio (patrones, no casos puntuales).

### 4.4 Qué NO incluir en el informe

No propongas soluciones todavía en este documento — el informe es solo
diagnóstico. Las soluciones van en la Fase 2.

---

## 5. FASE 2 — Plan de cambios (`plan-cambios.md`)

Una vez cerrado el informe, generá el plan de implementación.

### 5.1 Qué debe incluir

Para **cada punto del informe**, indicar:

1. Selector/archivo a modificar.
2. Valor actual → valor propuesto, citando la variable/regla exacta de
   `statettyAccesibilidad.css` que lo resuelve (ej. "reemplazar `color:
   #16baef` por `var(--celeste-texto)`" o "aplicar clase `.btn-secondary`
   en vez del estilo inline actual").
3. Si el `statettyAccesibilidad.css` **no cubre** ese caso puntual
   (selector muy específico, componente con estilos inline, estado hover
   no contemplado), proponer la regla nueva a agregar — siempre reutilizando
   las variables de color ya definidas, nunca un hex nuevo sin justificar.
4. Cómo se va a cargar/importar el CSS en el proyecto (detectar si es HTML
   plano con `<link>`, un bundler con `@import`, o un framework con CSS
   global) y dónde corresponde hacerlo.
5. Riesgo de romper algo (ej. `!important` existente, especificidad en
   conflicto) y cómo evitarlo.

### 5.2 Orden de prioridad

Agrupar el plan en 3 bloques, en este orden de ejecución:

1. **Bloque crítico:** texto de cuerpo, navegación, CTAs principales.
2. **Bloque alto:** links, badges/stats, cards.
3. **Bloque bajo:** footer, textos legales, elementos decorativos.

### 5.3 Formato esperado

Checklist accionable por bloque, tipo:

```markdown
## Bloque crítico
- [ ] `nav.css` `.navbar a` — color actual `#16baef` (2.26:1) → `var(--celeste-texto)` (6.6:1)
- [ ] `hero.jsx` botón CTA — fondo `#eebe3e` + texto blanco (1.74:1) → mantener fondo, texto `var(--negro-texto)` (10.3:1)
```

Cerrar el plan con una sección de **alcance**: cantidad de archivos que se
van a tocar, si hace falta importar `statettyAccesibilidad.css` en algún
punto de entrada nuevo, y cualquier dependencia entre cambios (ej. si dos
selectores comparten una misma regla y conviene resolverlos juntos).

---

## 6. Paleta de referencia rápida (para no tener que releer el CSS completo)

| Variable en `statettyAccesibilidad.css` | Hex | Contraste sobre blanco | Uso |
|---|---|---|---|
| `--azul-marino` | `#074f67` | 9.04:1 | Texto, títulos, fondos oscuros |
| `--negro-texto` | `#11181c` | 17.8:1 | Texto de cuerpo alternativo |
| `--celeste-texto` | `#076485` | 6.6:1 | Links y acentos chicos sobre blanco |
| `--mostaza-texto` | `#6e5008` | 7.5:1 | Acentos/badges chicos sobre blanco |
| `--celeste` (decorativo) | `#16baef` | 2.26:1 ❌ | Solo fondos, íconos, texto grande sobre fondo oscuro |
| `--mostaza` (decorativo) | `#eebe3e` | 1.74:1 ❌ | Solo fondos, íconos, texto grande sobre fondo oscuro |

---

## 7. Entregables esperados de esta tarea

- [ ] `informe-contraste.md`
- [ ] `plan-cambios.md`
- [ ] Ningún archivo de código (HTML/CSS/componentes) modificado todavía.
