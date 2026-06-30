# Manual: Cómo enviar imágenes desde una página web

**Endpoint:** `POST https://api.statetty.com/api/imagenes/imagen/subir`
**Formato:** `multipart/form-data`
**Límite:** 1 MB por archivo (antes de procesar)
**Formatos aceptados:** JPEG, PNG, WebP

---

## 1. HTML nativo (sin librerías)

```html
<form id="formImagen" enctype="multipart/form-data">
  <input type="file" name="imagen" accept="image/jpeg,image/png,image/webp" required />
  <input type="hidden" name="publicKey" value="a3f9c21d12345" />
  <button type="submit">Subir imagen</button>
</form>

<script>
document.getElementById('formImagen').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);

  const res = await fetch('/api/imagenes/imagen/subir', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (data.ok) {
    console.log('md5:', data.md5);
    // URL pública de la imagen:
    console.log('URL:', `/api/imagenes/imagen/${data.md5}.webp`);
  } else {
    console.error('Error:', data.error);
  }
});
</script>
```

> El `enctype="multipart/form-data"` es obligatorio en el `<form>`. Sin esto, el archivo no se envía.

---

## 2. Con preview y validación client-side

```html
<form id="formImagen" enctype="multipart/form-data">
  <input type="file" name="imagen" accept="image/jpeg,image/png,image/webp" id="inputFile" />
  <input type="hidden" name="publicKey" id="inputPublicKey" />
  <button type="submit">Subir</button>
</form>

<div id="preview"></div>
<div id="resultado"></div>

<script>
const PUBLIC_KEY = 'a3f9c21d12345'; // genera esto desde tu backend

document.getElementById('inputPublicKey').value = PUBLIC_KEY;

document.getElementById('inputFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Validar tipo
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
    alert('Solo se aceptan JPEG, PNG o WebP');
    e.target.value = '';
    return;
  }

  // Validar tamaño (1 MB)
  if (file.size > 1048576) {
    alert('La imagen no debe superar 1 MB');
    e.target.value = '';
    return;
  }

  // Preview
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById('preview').innerHTML = `<img src="${ev.target.result}" style="max-width:300px" />`;
  };
  reader.readAsDataURL(file);
});

document.getElementById('formImagen').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const res = await fetch('/api/imagenes/imagen/subir', { method: 'POST', body: formData });
  const data = await res.json();

  const div = document.getElementById('resultado');
  if (data.ok) {
    div.innerHTML = `
      <p>✅ Imagen subida</p>
      <p>md5: <code>${data.md5}</code></p>
      <p>Tamaño: ${(data.size / 1024).toFixed(1)} KB</p>
      <img src="/api/imagenes/imagen/${data.md5}.webp" style="max-width:300px" />
    `;
  } else {
    div.innerHTML = `<p style="color:red">❌ ${data.error}</p>`;
  }
});
</script>
```

---

## 3. Usando fetch directo (AJAX sin formulario)

```js
async function subirImagen(file, publicKey) {
  const formData = new FormData();
  formData.append('imagen', file);
  formData.append('publicKey', publicKey);

  const res = await fetch('/api/imagenes/imagen/subir', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error al subir imagen');
  }

  return await res.json();
  // → { ok: true, md5: "a1b2c3...", size: 12345 }
}
```

**Uso desde un input file:**

```js
document.getElementById('inputFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const result = await subirImagen(file, 'a3f9c21d12345');
    const url = `/api/imagenes/imagen/${result.md5}.webp`;
    console.log('Imagen lista en:', url);
  } catch (err) {
    console.error('Falló la subida:', err.message);
  }
});
```

---

## 4. Cómo obtener la publicKey

La `publicKey` se obtiene del usuario autenticado. En Statetty, se genera con:

```js
// Backend: generar publicKey para un userID
const UT = require('./servicios/statetty/utils');
const publicKey = UT.usrPublicKey(String(userId));
// → ej: "a3f9c21d12345"
```

La página web debe inyectar esta `publicKey` en el formulario antes de enviarlo. Normalmente se obtiene al cargar la página mediante una llamada AJAX a un endpoint interno protegido, o se renderiza directamente en el HTML si la página es generada por el backend.

---

## 5. Errores posibles y códigos HTTP

| Código | `error` | Causa |
|--------|---------|-------|
| `400` | `publicKey no proporcionada` | Falta `publicKey` en query o body |
| `401` | `publicKey inválida` / `publicKey vencida` | La llave no existe o expiró (10h) |
| `400` | `Tipo de archivo no permitido: ...` | MIME type no es JPEG/PNG/WebP |
| `413` | `El archivo excede el límite de 1MB` | El archivo crudo pesa más de 1 MB |
| `413` | `La imagen procesada excede el límite de 512000 bytes...` | Incluso comprimida al mínimo, pesa >500KB |
| `400` | `No se envió ninguna imagen` | El field `imagen` no está presente en el multipart |
| `500` | `Error al procesar la imagen` | Error interno de sharp o escritura en disco |

---

## 6. URL pública de la imagen

Una vez subida, la imagen se sirve en:

```
GET https://api.statetty.com/api/imagenes/imagen/{md5}.webp
```

Ejemplo: `https://api.statetty.com/api/imagenes/imagen/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.webp`

- Cacheada por Cloudflare con `Cache-Control: public, max-age=31536000, immutable`
- No requiere autenticación para lectura
- El archivo en disco tiene sharding: `storage/imagenes/a1/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.webp`

---

## 7. Ejemplo completo (HTML standalone)

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Subir imagen</title>
</head>
<body>
  <h1>Subir imagen a Statetty</h1>

  <input type="file" id="inputFile" accept="image/jpeg,image/png,image/webp" />
  <div id="preview" style="margin:10px 0"></div>
  <button id="btnSubir" disabled>Subir</button>
  <div id="resultado" style="margin-top:10px"></div>

  <script>
    const PUBLIC_KEY = 'a3f9c21d12345'; // reemplazar con la real

    const input = document.getElementById('inputFile');
    const preview = document.getElementById('preview');
    const btn = document.getElementById('btnSubir');
    const resultado = document.getElementById('resultado');
    let archivoSeleccionado = null;

    input.addEventListener('change', (e) => {
      archivoSeleccionado = e.target.files[0];
      btn.disabled = !archivoSeleccionado;

      if (!archivoSeleccionado) { preview.innerHTML = ''; return; }

      if (archivoSeleccionado.size > 1048576) {
        preview.innerHTML = '<p style="color:red">❌ Excede 1 MB</p>';
        btn.disabled = true;
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        preview.innerHTML = `<img src="${ev.target.result}" style="max-width:200px;border:1px solid #ccc" />`;
      };
      reader.readAsDataURL(archivoSeleccionado);
    });

    btn.addEventListener('click', async () => {
      if (!archivoSeleccionado) return;

      const formData = new FormData();
      formData.append('imagen', archivoSeleccionado);
      formData.append('publicKey', PUBLIC_KEY);

      resultado.innerHTML = 'Subiendo...';

      try {
        const res = await fetch('/api/imagenes/imagen/subir', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (data.ok) {
          resultado.innerHTML = `
            <p style="color:green">✅ Subida exitosa</p>
            <p>md5: <code>${data.md5}</code></p>
            <p>Tamaño final: ${(data.size / 1024).toFixed(1)} KB</p>
            <img src="/api/imagenes/imagen/${data.md5}.webp" style="max-width:300px;border:1px solid #ccc" />
          `;
        } else {
          resultado.innerHTML = `<p style="color:red">❌ ${data.error}</p>`;
        }
      } catch (err) {
        resultado.innerHTML = `<p style="color:red">❌ Error de red: ${err.message}</p>`;
      }
    });
  </script>
</body>
</html>
```

---

## Notas importantes

- La `publicKey` tiene una validez de 10 horas (600 minutos). Si vence, el usuario debe generar una nueva (normalmente al recargar la página o con una llamada al backend).
- El servidor siempre convierte a WebP, independientemente del formato original.
- La respuesta solo incluye `md5`, no el `_id` de Mongo.
- Si se sube la misma imagen dos veces (mismo contenido exacto), el servidor incrementa `refCount` en lugar de duplicar el archivo. La respuesta será idéntica.
