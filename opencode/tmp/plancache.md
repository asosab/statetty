# Plan de cambios — Caché de imágenes (`inmueble.js` / página de detalle)

## Contexto

Cada vez que se abre `index.html` (página de detalle de inmueble), `inmueble.js`
descarga por `fetch` los datos del inmueble y luego el navegador pide las
imágenes (`inm.fotos`) para:

- La imagen principal (`#inm-main-img`).
- Las miniaturas (`#inm-thumbs`).
- El lightbox (`#inm-lb-img`, mismo array `STATE.fotos`).

Hoy, si el usuario recarga la página (o vuelve a entrar más tarde), el
navegador vuelve a descargar todas esas imágenes desde cero, salvo que el
servidor/CDN que las sirve mande headers de caché HTTP fuertes (`Cache-Control`,
`ETag`, etc.) — algo que **no controlamos desde el frontend** si las fotos
están en un bucket/CDN de terceros.

El objetivo es agregar una capa de caché **del lado del cliente**, controlada
por nosotros, para que las fotos ya vistas no se vuelvan a descargar en la
próxima carga de la página, sin depender de qué headers mande el servidor de
imágenes.

---

## Decisión técnica: Service Worker + Cache Storage API

Se recomienda usar un **Service Worker** con la **Cache API** (`caches.open`,
no `localStorage`/`sessionStorage`, que no sirven para binarios grandes)
porque:

- Es transparente: una vez registrado, intercepta las peticiones de `<img
  src="...">` sin tener que reescribir la lógica de la galería en
  `inmueble.js`.
- Persiste entre recargas y entre sesiones (a diferencia de una caché en
  memoria con `Map`/variables JS, que se pierde al recargar).
- Permite decidir estrategia de caché por tipo de recurso.

**Alternativa descartada**: cachear manualmente con `fetch` +
`URL.createObjectURL` guardando blobs en IndexedDB, y cambiar `inmueble.js`
para pedir cada foto a través de ese helper en vez de asignar `img.src`
directo. Es más código, hay que tocar la lógica de galería/lightbox, y no
cachea automáticamente otras imágenes (og:image, favicon, etc.). Se descarta
salvo que el Service Worker no sea viable en el entorno de despliegue.

### Requisitos/limitaciones a confirmar antes de implementar

- El sitio debe servirse por **HTTPS** (o `localhost` en desarrollo); los
  Service Workers no funcionan sobre HTTP plano.
- Confirmar el **dominio(s) desde donde vienen las fotos** (`inm.fotos`) —
  necesario para decidir el alcance del `fetch` interceptado. Si son de un
  bucket/CDN sin headers CORS, las respuestas serán *opacas* (`status: 0`);
  la Cache API igual permite guardarlas y devolverlas, solo que no se puede
  inspeccionar su contenido ni tamaño real desde JS.
- Confirmar si las URLs de las fotos son **estables/únicas por archivo** (por
  ejemplo, nombres con hash tipo `abc123.jpg` que no se reescriben si el
  anunciante reemplaza la foto) o si una misma URL puede apuntar a contenido
  distinto con el tiempo. Esto determina la estrategia de invalidación (ver
  más abajo).

---

## Alcance de la caché

Cachear:

- Las imágenes de `inm.fotos` (main image, thumbs, lightbox — es la misma URL
  reusada en los tres lugares, así que cachear una vez cubre las tres).

No cachear (dejar que el navegador/CDN maneje su propio caching, para no
inflar el storage local sin necesidad):

- Los tiles del mapa (`https://{s}.tile.openstreetmap.org/...`) — son muchos,
  cambian de zoom/paneo, y OSM ya define su propia política de cache HTTP.
- El ícono del marcador (`/assets/images/pointers/pointer_statetty.png`) y su
  sombra — son estáticos y livianos, el navegador ya los cachea bien vía
  HTTP normal; opcionalmente se pueden incluir si se quiere, pero no es la
  prioridad de este plan.
- Fuentes de Google Fonts, `leaflet.css`/`leaflet.js`, `config.js`,
  `inmueble.js`, `inmueble.css` — no son "imágenes descargadas por el
  inmueble", quedan fuera de este plan.

Si más adelante se quiere ampliar el alcance, hacerlo en un plan/PR aparte
para no mezclar objetivos.

---

## Estrategia de caché: `stale-while-revalidate`

En vez de "cache-first para siempre" (que podría mostrar una foto vieja si el
anunciante la reemplazó bajo la misma URL) ni "network-first" (que anula el
beneficio de velocidad), usar **stale-while-revalidate**:

1. Al pedir una foto, si está en caché, servirla inmediatamente desde ahí
   (rápido, sin esperar red).
2. En paralelo, hacer el `fetch` real a la red y, cuando responda, actualizar
   la entrada en caché con la versión nueva (silenciosamente, no bloquea el
   render actual).
3. La próxima vez que se pida esa misma foto (siguiente recarga), ya se sirve
   la versión actualizada.

Esto da lo mejor de los dos mundos: la recarga es instantánea para fotos ya
vistas, y el contenido no queda "pegado" desactualizado para siempre.

Si al confirmar los requisitos (sección anterior) se determina que las URLs
de fotos **son inmutables** (nunca cambian de contenido bajo la misma URL),
se puede simplificar a **cache-first puro** sin revalidación — evaluarlo
antes de implementar.

---

## Archivos a crear/modificar

### 1. Nuevo archivo: `sw.js` (Service Worker)

Ubicarlo en la **raíz del sitio** (mismo nivel que `index.html` de la home),
no dentro de `assets/`, porque el *scope* de un Service Worker por defecto es
el directorio donde vive el archivo — si se necesita que cubra tanto `/` como
`/inmueble/`, tiene que estar en la raíz.

Debe implementar:

- Un nombre de caché versionado, ej. `const CACHE_NAME =
  'statetty-images-v1';` — subir el número (`v2`, `v3`, ...) cada vez que se
  quiera invalidar todo de una (ver sección de invalidación).
- Evento `install`: opcional, no es necesario pre-cachear nada (las fotos son
  dinámicas por inmueble), simplemente `self.skipWaiting()` para activar la
  versión nueva sin esperar a cerrar todas las pestañas.
- Evento `activate`: borrar cualquier caché con nombre distinto al
  `CACHE_NAME` actual (limpieza de versiones viejas) y `self.clients.claim()`
  para tomar control inmediato de las pestañas abiertas.
- Evento `fetch`: si el `request` es de tipo imagen (filtrar por
  `request.destination === 'image'`, o por extensión/dominio de las fotos —
  definir el filtro concreto una vez confirmado el dominio de `inm.fotos`),
  aplicar la lógica de `stale-while-revalidate` contra `CACHE_NAME`. Para
  cualquier otro request, no interceptar — dejar pasar a la red normal
  (`return`, sin `event.respondWith`) para no afectar el resto del sitio.
- Manejar bien las respuestas opacas (cross-origin sin CORS): igual se
  pueden guardar en caché con `cache.put(request, response.clone())`, solo
  hay que evitar intentar leer su `status`/`headers` para decidir si
  cachear o no (si es opaca, `response.type === 'opaque'`, tratarla como
  válida para cachear sin más chequeos).

### 2. Registro del Service Worker

Agregar el registro en un lugar que se ejecute en todas las páginas donde se
quiera este comportamiento (por ejemplo, al final de `inmueble.js`, en el
bootstrap, o en `config.js` si ese script se comparte entre páginas —
decidir según cómo esté organizado el resto del sitio, ya que solo tenemos a
la vista la página de detalle).

Requisitos del registro:

- Comprobar soporte (`if ('serviceWorker' in navigator)`) antes de llamar a
  `navigator.serviceWorker.register(...)`, para no romper en navegadores o
  webviews sin soporte.
- Registrar de forma que no bloquee el render ni el resto de la
  inicialización de la página (puede ir después de `window.addEventListener('load', ...)`
  para no competir con la carga de recursos críticos).
- No repetir el registro innecesariamente: `register()` es idempotente si la
  URL del script no cambió, así que no hace falta lógica extra para evitar
  registros duplicados.
- Loguear con `console.warn`/`console.log` en caso de error de registro
  (siguiendo el estilo `console.warn('STATETTY: ...')` ya usado en el resto
  del código), pero sin mostrar nada al usuario — si el Service Worker falla
  al registrarse, la página debe seguir funcionando normal, simplemente sin
  el beneficio de caché.

---

## Invalidación / control de tamaño

La Cache API no expira entradas sola ni tiene un límite automático — hay que
decidir una política simple para no acumular fotos de inmuebles vistos hace
meses indefinidamente:

- Opción simple recomendada: en el evento `activate`, cuando se sube la
  versión de `CACHE_NAME` (ej. `v1` → `v2`), el paso de limpieza ya borra
  *todo* lo anterior de una — es una forma de "reset manual" cuando haga
  falta (por ejemplo, si se cambia de proveedor de imágenes o se detecta
  algún problema).
- Opcional (si se quiere algo más automático): limitar la cantidad de
  entradas cacheadas a un número razonable (ej. últimas ~200 imágenes) y, al
  superar ese límite, eliminar las más antiguas (LRU simple) dentro del
  handler de `fetch`, antes de agregar una entrada nueva. Implementar esto
  solo si se considera necesario — agrega complejidad y el storage de
  imágenes de un inmueble a la vez no debería ser un problema real de
  espacio en la mayoría de los casos.

No es necesario un mecanismo de expiración por tiempo (ej. "borrar fotos de
más de 30 días") a menos que se decida explícitamente que hace falta; con
`stale-while-revalidate` el contenido igual se refresca en cada visita.

---

## Qué NO cambiar

- No tocar la lógica de `renderGallery`, `setMainImage`, `selectImage`,
  `openLightbox` en `inmueble.js` — los `<img>` siguen apuntando a las mismas
  URLs de siempre; el Service Worker intercepta esas peticiones de forma
  transparente, no hace falta que el código de la galería sepa que existe
  una caché.
- No tocar `inmueble.css`.
- No cachear el `fetch` a `statetty/inmueble` (los datos del inmueble en sí)
  a menos que se pida explícitamente en otro plan — este plan es solo para
  las imágenes.
- No cachear peticiones `POST` (como `feedclick`) — el Service Worker debe
  ignorarlas explícitamente (`if (request.method !== 'GET') return;` al
  principio del handler de `fetch`).

---

## Checklist para validar el trabajo terminado

- [ ] `sw.js` existe en la raíz del sitio y se registra correctamente (ver en
      DevTools → Application → Service Workers que quedó "activated and is
      running").
- [ ] Al recargar la página después de una primera visita, las fotos del
      inmueble aparecen en la pestaña Network marcadas como servidas por el
      Service Worker (columna "Size" suele mostrar `(ServiceWorker)`), no
      vueltas a descargar de la red.
- [ ] Las peticiones que no son imágenes (HTML, JS, CSS, el `fetch` de datos
      del inmueble, `feedclick`) siguen yendo directo a la red sin pasar por
      el Service Worker.
- [ ] Si se reemplaza la foto de un inmueble (misma URL, contenido nuevo) o
      se decidió cache-first puro, se comprobó que el comportamiento elegido
      es el esperado.
- [ ] Subir la versión de `CACHE_NAME` efectivamente borra la caché vieja
      (probar cambiando `v1` a `v2` y verificando en Application → Cache
      Storage que la caché anterior desaparece tras recargar).
- [ ] En un navegador/entorno sin soporte de Service Worker, la página sigue
      funcionando normal (sin errores en consola que rompan el resto del
      script).
- [ ] El sitio se sirve por HTTPS en producción (o se probó en `localhost`
      en desarrollo) — confirmado antes de dar por buena la implementación.
