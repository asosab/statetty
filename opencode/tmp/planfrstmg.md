# Plan de cambios — Priorizar la primera imagen de la galería

## Contexto

En `inmueble.js`, la función `renderGallery(inm)` (dentro de `render()`, que
se llama al recibir la respuesta de `statetty/inmueble`) hace lo siguiente
apenas llegan los datos:

1. `setMainImage(0)` → asigna `DOM.mainImg.src = STATE.fotos[0]`.
2. Inmediatamente después, un `forEach` sobre **todas** las fotos crea un
   `<img>` por cada miniatura y les asigna `img.src = url` en el mismo tick,
   una detrás de otra.

Hoy el `<img id="inm-main-img">` en `index.html` no tiene ningún atributo de
prioridad (`fetchpriority`, `loading`) — nace con `src=""` y recién se llena
por JS. Las miniaturas sí tienen `img.loading = 'lazy'`, pero como la tira de
miniaturas (`.inm-gallery-thumbs`) está *visible* apenas se pinta la página
(no está fuera de viewport verticalmente, solo se puede scrollear
horizontalmente), el lazy-loading nativo del navegador no las descarta como
"lejanas" y termina pidiéndolas casi en simultáneo con la imagen principal.
En conexiones lentas (celular), eso reparte el ancho de banda entre N fotos a
la vez en vez de darle prioridad a la foto principal, y el usuario ve la
página "cargando" imágenes por más tiempo del necesario antes de ver algo
nítido.

**Objetivo**: que la primera foto (la que se ve grande, arriba) se descargue
lo antes posible y con prioridad, y que el resto (miniaturas) se pidan
después, sin competir por ancho de banda con la principal.

No se toca `inmueble.css` en este plan (no hace falta ningún estilo nuevo,
esto es puramente sobre *cuándo* y *con qué prioridad* se piden las
imágenes).

---

## Cambios a implementar en `inmueble.js`

### 1. Prioridad explícita en la imagen principal

En `setMainImage(index)` (o en el HTML estático de `index.html`, a elección
de quien implemente, pero aplicarlo en un solo lugar para no duplicar
lógica), agregar:

- `fetchpriority="high"` al `<img id="inm-main-img">`. Este atributo es el
  hint estándar del navegador para decirle "esta imagen es crítica, bajala
  primero" — es exactamente el caso de uso para el que existe.
- Si se agrega en el HTML estático (`index.html`), simplemente sumar el
  atributo al tag ya existente. Si se prefiere hacerlo desde JS (por
  consistencia con cómo se arma el resto), setear
  `DOM.mainImg.fetchPriority = 'high'` (nota: en JS la propiedad del DOM es
  `fetchPriority`, camelCase; el atributo HTML es `fetchpriority`, en
  minúsculas) una sola vez, por ejemplo en `cacheDOM()` o al inicio de
  `renderGallery`, no en cada llamada a `setMainImage`.
- No hace falta `loading="eager"` en la imagen principal — es el valor por
  defecto, pero se puede dejarlo explícito para que quede documentado en el
  código que es intencional (no accidental).

### 2. Retrasar la creación de las miniaturas hasta después de que arranque la descarga de la principal

Separar `renderGallery` en dos pasos en vez de uno:

1. **Paso inmediato** (sin cambios respecto a hoy): setear
   `STATE.fotos`, `STATE.currentIndex = 0`, llamar `setMainImage(0)`,
   actualizar `DOM.galCount`, y enganchar el click del lightbox en
   `DOM.mainImg`. Esto es lo mínimo para que la imagen principal empiece a
   descargarse ya mismo.
2. **Paso diferido**: recién ahí construir las miniaturas
   (`DOM.thumbs.innerHTML = ''` + el `forEach` que crea cada `<img>`).

Para el paso diferido, no alcanza con solo mover el código más abajo en la
misma función (igual se ejecutaría en el mismo tick de JS, antes de que el
navegador haya tenido chance de priorizar la petición de la imagen
principal). Hay que efectivamente ceder el turno al navegador. Opciones,
de más a menos preferida:

- **Preferida**: enganchar la creación de miniaturas al evento `load` (y
  `error`, como fallback) de la imagen principal:
  ```js
  DOM.mainImg.addEventListener('load', renderThumbs, { once: true });
  DOM.mainImg.addEventListener('error', renderThumbs, { once: true });
  ```
  Así las miniaturas recién se piden cuando la foto principal **ya terminó**
  de descargarse (o falló), garantizando que nunca compiten por ancho de
  banda con ella. `renderThumbs` es la función que antes vivía inline en el
  `forEach` de `renderGallery`.
  - Cuidado con el caso en que `setMainImage(0)` se llama con una imagen que
    el navegador ya tiene en su caché HTTP (visita repetida): el evento
    `load` puede disparar casi instantáneamente, lo cual está bien — en ese
    caso no había nada que priorizar y las miniaturas igual se piden rápido,
    que es el comportamiento correcto.
- **Alternativa** (si por algún motivo enganchar al evento `load` complica
  el flujo, por ejemplo si `renderGallery` necesita devolver algo
  sincrónicamente): usar `requestIdleCallback(renderThumbs)` con fallback a
  `setTimeout(renderThumbs, 0)` para navegadores sin soporte de
  `requestIdleCallback` (Safari). Esto no garantiza tan estrictamente el
  orden como enganchar al `load`, pero igual cede al menos un tick al
  navegador antes de disparar las demás descargas.

Elegir la opción preferida salvo que aparezca una razón concreta para no
poder usarla.

### 3. Mantener `loading="lazy"` en las miniaturas, y sumar `fetchpriority="low"`

Las miniaturas ya tienen `img.loading = 'lazy'` — mantenerlo (ayuda para las
que quedan fuera del área visible horizontal de la tira de scroll). Sumar
además `img.fetchPriority = 'low'` a cada miniatura creada en el `forEach`,
para reforzar que, aunque el navegador decida pedirlas, lo haga con menor
prioridad que cualquier imagen marcada `high`.

### 4. Sin cambios en el lightbox

El lightbox (`openLightbox`) ya solo asigna `DOM.lbImg.src` cuando el usuario
efectivamente lo abre — no hay que tocar nada ahí, ya se comporta de forma
diferida correctamente (no descarga las fotos del lightbox por adelantado).

---

## Resumen del nuevo flujo de `renderGallery`

```js
function renderGallery(inm) {
  var fotos = inm.fotos;
  if (!Array.isArray(fotos) || fotos.length === 0) {
    DOM.gallery.classList.add('inm-hidden');
    return;
  }
  STATE.fotos = fotos;
  STATE.currentIndex = 0;

  // Paso 1: imagen principal, ya, con prioridad alta.
  DOM.mainImg.fetchPriority = 'high';
  setMainImage(0);
  DOM.galCount.textContent = '1 / ' + fotos.length;
  DOM.mainImg.addEventListener('click', function () { openLightbox(0); });

  // Paso 2: miniaturas, recién cuando la principal terminó (o falló).
  function renderThumbs() {
    DOM.thumbs.innerHTML = '';
    fotos.forEach(function (url, i) {
      var thumb = document.createElement('div');
      thumb.className = 'inm-gallery-thumb' + (i === 0 ? ' active' : '');
      var img = document.createElement('img');
      img.src = url;
      img.alt = 'Foto ' + (i + 1);
      img.loading = 'lazy';
      img.fetchPriority = 'low';
      thumb.appendChild(img);
      thumb.addEventListener('click', function () { selectImage(i); });
      DOM.thumbs.appendChild(thumb);
    });
  }

  DOM.mainImg.addEventListener('load', renderThumbs, { once: true });
  DOM.mainImg.addEventListener('error', renderThumbs, { once: true });
}
```

(Este bloque es orientativo para dejar clara la intención — respetar el
resto de las convenciones de estilo ya usadas en el archivo, ej. `var` en
vez de `const`/`let`, que es lo que se usa en todo `inmueble.js`.)

---

## Qué NO cambiar

- No tocar `inmueble.css` — no hace falta ningún estilo nuevo para esto.
- No tocar la lógica de `selectImage`, `openLightbox`, `prevImage`,
  `nextImage` — siguen funcionando igual, esto solo cambia *cuándo* se
  crean/piden las imágenes de las miniaturas, no cómo se navega entre ellas.
- No agregar `<link rel="preload" as="image">` para la primera foto: no se
  conoce su URL hasta que responde el `fetch` a `statetty/inmueble`, así que
  un `preload` estático en el `<head>` no aplicaría acá (se descarta esta
  opción salvo que en el futuro se decida server-side-render los datos del
  inmueble, lo cual está fuera de alcance de este plan).
- No cambiar el orden en que se arma `STATE.fotos` ni el índice usado como
  "primera foto" — sigue siendo `fotos[0]`, tal cual entrega el backend.

---

## Checklist para validar el trabajo terminado

- [ ] En DevTools → Network, con throttling activado (ej. "Slow 4G"), la
      imagen principal aparece como la primera request de imagen en
      dispararse, y las miniaturas aparecen recién después (columna
      "Waterfall" muestra las miniaturas arrancando después de que la
      principal ya está en curso o terminada).
- [ ] `DOM.mainImg` tiene `fetchpriority="high"` en el DOM renderizado
      (inspeccionar con DevTools → Elements).
- [ ] Cada `<img>` de miniatura tiene `loading="lazy"` y
      `fetchpriority="low"`.
- [ ] Si `inm.fotos` tiene una sola foto, todo sigue funcionando (no debe
      haber ningún error por miniaturas vacías — `fotos.forEach` sobre un
      array de longitud 1 ya funciona bien, solo confirmar que no rompe
      nada el nuevo flujo diferido).
- [ ] Si la imagen principal falla en cargar (URL rota, 404), las
      miniaturas igual se terminan mostrando (gracias al listener de
      `error` además del de `load`).
- [ ] La percepción de carga mejora en una conexión simulada lenta: la foto
      grande se ve nítida notablemente antes que en la versión anterior del
      código, sin quedar todas las fotos "cargando" a la vez.
- [ ] El click en la imagen principal para abrir el lightbox, y el click en
      cada miniatura para cambiar de foto, siguen funcionando exactamente
      igual que antes.
