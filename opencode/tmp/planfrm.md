# Plan de cambios — Formulario de contacto (`index.html`)

## Contexto

El formulario de contacto vive en `index.html`, dentro del `<script>` inline
que empieza en el comentario `<!-- ==================== CONTACT FORM
(WhatsApp handoff) ==================== -->` (código actual: líneas
~200–467). Ese script maneja:

- Restaurar/guardar datos en `localStorage`.
- Validar nombre, email, celular y checkbox de privacidad.
- Construir `fullPhone` concatenando `phoneCodeEl.value` (ej. `+591`) con el
  número ingresado.
- Hacer `POST` a `feedclick` y abrir WhatsApp con el link generado.

Hoy los errores se muestran con `alert()` y no hay validación real de
teléfono (solo se chequea que no esté vacío).

No tocar `inmueble.js` ni `inmueble.css` salvo lo indicado en la sección de
CSS más abajo — esos archivos son de otra parte de la página (galería, mapa,
SEO) y no deben modificarse.

---

## Objetivo

1. Cargar **libphonenumber-js** (bundle `min`) vía CDN, **lazy** (con
   `import()` dinámico, no con un `<script>` bloqueante en el `<head>`), y
   usarla para validar el celular.
2. Eliminar todos los `alert()` del flujo del formulario.
3. Reemplazarlos por mensajes inline dentro de `#inm-form-status`, con tres
   estados visuales: `success`, `warning`, `error`.
4. Marcar visualmente los campos inválidos (incluido el checkbox de
   privacidad).
5. Deshabilitar el botón de envío mientras se procesa la petición, mostrando
   "Enviando…".
6. Mantener intacta toda la lógica que no se pide cambiar (persistencia en
   localStorage, construcción del texto de WhatsApp, POST a feedclick, etc).

---

## 1. Carga de libphonenumber-js (lazy, vía CDN)

- No agregar un `<script src="...">` nuevo en el `<head>` ni cerca del
  `<script src="https://unpkg.com/leaflet/dist/leaflet.js">` — se decidió
  **no** cargarla de forma bloqueante para no sumar peso antes de que el
  usuario interactúe con el formulario.
- En su lugar, dentro del script del formulario, cargarla de forma lazy con
  `import()` dinámico apuntando al bundle ESM `min` de unpkg, la primera vez
  que haga falta validar un teléfono (por ejemplo, al hacer submit, o al
  primer `blur`/`input` sobre el campo teléfono — a elección de quien
  implemente, pero solo una vez, cacheando el módulo).
- Pinnear una versión concreta (no `@latest`). Antes de escribir el código,
  verificar en npm/unpkg cuál es la última versión estable publicada de
  `libphonenumber-js` y usar esa (a la fecha de este plan se estimaba
  `1.12.38`, pero **confirmar el número real antes de pinnear**, ya que
  puede haber versiones más nuevas).
- URL de referencia (bundle min, build ESM para `import()`):
  `https://unpkg.com/libphonenumber-js@<VERSION>/bundle/libphonenumber-js.min.js`
  (confirmar que esa ruta expone un build ESM válido para `import()`; si el
  bundle `min` publicado en esa ruta es CJS/UMD y no ESM, usar la ruta
  equivalente que unpkg resuelve para ESM, p. ej. agregando `?module` al
  final de la URL: `.../libphonenumber-js.min.js?module`).
- Import a usar: la función `isValidPhoneNumber` del paquete.

### Por qué no hace falta mapear código de país → ISO

El campo `#inm-phone-code` ya guarda el código de marcado completo (`+591`,
`+54`, etc.). Al concatenarlo con el número (`fullPhone = phoneCode + phone`)
se obtiene un string en formato E.164 completo (ej. `"+59171234567"`).
`isValidPhoneNumber` de libphonenumber-js puede validar un string E.164
directamente, sin necesitar un segundo parámetro de país ISO — la librería
detecta el país a partir del signo `+` y el código de marcado. Por lo tanto:

- No crear ningún mapeo `+591 -> 'BO'`, `+54 -> 'AR'`, etc.
- Construir `fullPhone` **antes** del bloque de validaciones (moverlo desde
  donde está hoy, más abajo, hacia arriba, justo después de leer
  `phone`/`nombre`/etc.), para poder usarlo tanto en la validación como más
  tarde en el payload del POST, sin duplicar la concatenación.

### Validación de email

La validación de email **no** cambia de método: se sigue usando el regex
`EMAIL_RE` que ya existe. La librería libphonenumber-js aplica solo al
celular — no tiene sentido usarla para emails, y cambiar de un regex a otra
cosa no aporta nada aquí.

---

## 2. Reemplazo de `alert()` por mensajes inline

Buscar **todas** las llamadas a `alert(...)` dentro del script del
formulario (hay varias: validación faltante, inmueble no identificado, error
de feedclick, timeout, error de conexión) y reemplazarlas por una función
única, por ejemplo `setFormStatus(tipo, mensaje)`, que:

- Escriba el texto en `#inm-form-status` (`textContent`, no `innerHTML`, para
  no abrir la puerta a HTML injection con datos del usuario o del backend).
- Le agregue las clases `show` + (`success` | `warning` | `error`) al div,
  limpiando las otras dos clases de estado antes de aplicar la nueva.
- Estas clases ya existen en `inmueble.css` (`.inm-form-status.success`,
  `.warning`, `.error`, con su animación `inmStatusFade`) — **no hace falta
  tocar el CSS**, ya está preparado.

Criterio sugerido de qué estado usar en cada caso:

- `error`: campos faltantes/inválidos al submitear, error de servidor,
  timeout, error de conexión, inmueble no identificado.
- `warning`: casos intermedios si se quiere distinguir algo no bloqueante
  (por ejemplo, si se decide usarlo para algún caso específico; si no hay un
  caso claro, no forzarlo — no todos los errores actuales tienen que
  convertirse en `warning`).
- `success`: no hace falta mostrarlo en este flujo si al tener éxito se abre
  WhatsApp inmediatamente (no queda tiempo de ver el mensaje) — pero si se
  quiere feedback breve antes de abrir la ventana de WhatsApp, usar `success`
  ahí. Decidir según lo que se vea mejor, documentando la decisión en el
  commit/PR.

Antes de mostrar un mensaje nuevo, limpiar el anterior (quitar `show` y las
clases de color previas) para que la animación se vea bien en envíos
repetidos.

---

## 3. Resaltado de campos con error

- Los estilos ya existen en `inmueble.css`:
  `.inm-form-input.error`, `.inm-form-select.error`,
  `.inm-form-textarea.error`, `.inm-form-checkbox.error` (+ su input
  checkbox). **No modificar el CSS**, solo usar la clase `error`.
- Reemplazar la función actual `setFieldInvalid(el, invalid)` (que hoy
  manipula `el.style.borderColor` directamente) para que en vez de tocar
  estilos inline, haga `el.classList.toggle('error', invalid)`.
- Igual con `setCheckboxInvalid(checkboxEl, labelEl, invalid)`: hoy toca
  `style.outline`/`style.color` inline; cambiarla para que aplique/remueva la
  clase `error` sobre `labelEl` (el CSS `.inm-form-checkbox.error` ya cubre
  tanto el texto como el `input[type=checkbox]` dentro de esa clase).
- Mantener el comportamiento existente de limpiar el estado de error cuando
  el usuario corrige el campo (los listeners de `input`/`change` que ya
  están, adaptados a la nueva función basada en clases).

---

## 4. Botón deshabilitado durante el envío

Esto **ya está implementado** en el código actual (`submitBtn.disabled =
true` / `submitBtn.textContent = 'Enviando…'` antes del `fetch`, y se
revierte en el `.finally()`). Al reescribir el flujo, conservar ese
comportamiento tal cual — no hay que agregarlo de cero, solo no romperlo al
mover código alrededor. El CSS para el estado `:disabled` también ya existe
(`.inm-form-submit:disabled`).

---

## 5. Orden sugerido de la nueva lógica en el handler de submit

1. Leer valores (`mensaje`, `email`, `phone`, `nombre`, `privacyOk`,
   `newsletterOk`).
2. Construir `fullPhone = (phoneCodeEl ? phoneCodeEl.value : '') + phone`
   **acá arriba** (antes de validar), para reusarlo después.
3. Limpiar estados de error previos (clases `error` en todos los campos +
   limpiar `#inm-form-status`).
4. Validar nombre (no vacío).
5. Validar email con `EMAIL_RE` (sin cambios).
6. Validar teléfono:
   - Si `phone` está vacío → error, igual que hoy.
   - Si no está vacío, cargar (lazy) libphonenumber-js si todavía no se
     cargó, y llamar a `isValidPhoneNumber(fullPhone)`. Si devuelve `false`
     (o el import/carga falla), marcar el campo como inválido.
   - Contemplar qué pasa si el `import()` falla (sin red, CDN caído, etc.):
     no debe romper el formulario entero. Definir un fallback razonable, por
     ejemplo permitir continuar con la validación básica de "no vacío" si la
     librería no pudo cargarse, en vez de bloquear el envío por un problema
     de red ajeno al usuario.
7. Validar checkbox de privacidad.
8. Si algo falló: setear clases `error` en los campos correspondientes y
   mostrar **un solo** mensaje consolidado en `#inm-form-status` (estado
   `error`), en vez del `alert()` actual. Se puede reusar la lista
   `faltantes` que ya arma el código para el texto del mensaje.
9. Si todo es válido: continuar exactamente igual que hoy (`persistCurrentValues`,
   POST a feedclick, deshabilitar botón, etc.), pero cualquier error de red o
   de respuesta del servidor debe ir a `#inm-form-status` (`error`) en vez de
   `alert()`.

---

## 6. Qué NO cambiar

- No tocar `inmueble.js` (galería, lightbox, header, features, SEO, mapa).
- No tocar el CSS — las clases necesarias (`show`, `success`, `warning`,
  `error`, estilos de `:disabled`, animación) ya están en `inmueble.css`.
- No cambiar la lógica de `localStorage` (`loadSavedForm`/`saveForm`/
  `persistCurrentValues`).
- No cambiar la construcción del texto de WhatsApp ni el endpoint de
  `feedclick`.
- No introducir un mapeo de código de país → ISO: es innecesario porque
  `fullPhone` ya es un E.164 válido para `isValidPhoneNumber`.

---

## 7. Checklist final para validar el trabajo terminado

- [ ] libphonenumber-js se carga con `import()` dinámico (lazy), no bloquea
      el `<head>`.
- [ ] Versión pinneada explícitamente (no `@latest`), verificada como la
      última estable disponible al momento de implementar.
- [ ] `isValidPhoneNumber(fullPhone)` se usa sin parámetro de país ISO.
- [ ] Cero `alert()` restantes en el script del formulario.
- [ ] Todos los mensajes de error/aviso pasan por `#inm-form-status` con
      clases `show` + (`success`|`warning`|`error`).
- [ ] Campos inválidos usan `classList` con la clase `error` existente (no
      estilos inline).
- [ ] Checkbox de privacidad se marca en rojo (clase `error` en su label)
      cuando falta aceptarlo.
- [ ] Botón sigue deshabilitándose y mostrando "Enviando…" durante el POST.
- [ ] El resto de la lógica (localStorage, WhatsApp, feedclick) sigue
      funcionando sin cambios de comportamiento.
