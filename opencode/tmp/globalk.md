# Plan: Persistencia global de `?k=` (publicKey) — statetty.com + nodelab

## 1. Objetivo

Que el valor recibido en la query string `?k=` (en adelante `publicKey`) se capture una vez y quede
disponible automáticamente en cualquier página del dominio `statetty.com`, incluyendo el proyecto
`nodelab`, sin que el usuario tenga que repetirlo en cada URL.

## 2. Alcance (páginas afectadas)

- `/index.html` (landing)
- Blog: listado y artículos individuales (`statetty.com/blog/...`)
- Mapa interactivo
- Página de registro de inmueble

Todas las páginas anteriores forman parte del mismo sitio (Jekyll, alojado en GitHub) y sirven bajo
`statetty.com`.

- `../nodelab/views/inmueble.ejs` — vista renderizada server-side por Express, visible en el
  navegador como `statetty.com/inmueble/:_id`

## 3. Arquitectura del dominio

- El sitio principal (`index.html`, blog, mapa, registro de inmueble) es un sitio Jekyll alojado en
  GitHub, servido bajo `statetty.com`.
- `nodelab` es el servicio API/backend, expuesto en `api.statetty.com`. Ese mismo backend renderiza
  además la vista `inmueble.ejs`, cuya salida son páginas HTML servidas en
  `statetty.com/inmueble/:_id`: un **Cloudflare Route Worker** (configurado en el dashboard de
  Cloudflare, no en el repo) enruta la ruta `/inmueble/*` hacia `nodelab` a través del mismo tunnel,
  sin cambiar el host visible. Cloudflare solo enruta (no cachea en el edge). `nodelab` mantiene un
  caché propio en disco con el HTML ya renderizado; si existe, lo sirve directamente; si no
  (cache miss), renderiza `inmueble.ejs`, lo guarda en caché y lo entrega.
  `inmueble.ejs` no le hace fetch a `api.statetty.com`, ya que se renderiza dentro del mismo backend
  y accede a los datos directamente (no por HTTP).
- La comunicación contra `api.statetty.com/...` ocurre desde el sitio Jekyll (index, blog, mapa,
  registro de inmueble), no desde `inmueble.ejs`.
- `statetty.com` y `api.statetty.com` son subdominios del mismo dominio raíz, por lo que:
  - Una cookie con `Domain=.statetty.com` es enviada automáticamente en requests a ambos hosts.
  - Un fetch desde una página `statetty.com` hacia `api.statetty.com` es cross-origin (hosts
    distintos) pero same-site (mismo dominio raíz), así que una cookie `SameSite=Lax` sí viaja en
    ese fetch si se usa `credentials:'include'`. Sólo hace falta CORS para que el navegador permita
    leer la respuesta: `Access-Control-Allow-Origin: https://statetty.com` y
    `Access-Control-Allow-Credentials: true` en `api.statetty.com`.
- Conclusión: no se necesita propagar `?k=` por enlace entre páginas del sitio ni hacia la página de
  registro; todas comparten la misma cookie.
- `publicKey` se relaciona con estado activo/inactivo y vigencia de un plan/suscripción, cuya
  definición y validación vive del lado de `nodelab`/`api.statetty.com`, no en el sitio Jekyll.

## 4. Mecanismo de persistencia

### 4.1 Cookie de dominio compartido (mecanismo principal)

- Nombre: `stt_pk`
- Atributos: `Domain=.statetty.com; Path=/; Secure; SameSite=Lax; Max-Age=<vigencia_en_segundos>`
- `HttpOnly=false` (debe ser legible/escribible por JS en las páginas estáticas)
- Se escribe/renueva cada vez que `?k=` llega en la URL y se valida como activa.
- Se renueva (sliding expiration) en cada visita donde la validación siga siendo positiva.

### 4.2 localStorage (fallback same-origin)

- Clave `stt_pk`, sólo útil si todas las páginas estáticas comparten exactamente origen
  (protocolo+host+puerto). No sustituye a la cookie para el cruce con `api.statetty.com`.

### 4.3 Propagación por enlace

- No es necesaria: todas las páginas (`index.html`, blog, mapa, registro) y el API
  (`api.statetty.com`) son same-site, la cookie `stt_pk` viaja sola en cada fetch con
  `credentials:'include'`.
- Se deja documentada como utilidad de respaldo (`appendKeyToLink(url)`) únicamente por si en el
  futuro se enlaza a un dominio genuinamente distinto, fuera de `statetty.com`.

### 4.4 Endpoint de verificación de usuario

`GET {STATETTY_CONFIG.WS_API_BASE}statetty/getuser?publicKey=<publicKey>` → datos del usuario/agente
asociado a esa `publicKey` (si existe), estado de acceso, y sus características.

- `STATETTY_CONFIG.WS_API_BASE` ya está definido en `/assets/js/config.js`, incluido hoy en la
  página de registro de inmueble. Éste debe ser el mismo punto de configuración que use `user.js`
  para armar la URL del endpoint (no hardcodear `api.statetty.com` en `user.js`).
- Este endpoint ya existe y ya se consume así en la página de registro de inmueble (ver Anexo A);
  el trabajo de este plan es que su resultado (usuario reconocido + `publicKey`) quede disponible
  para el resto de páginas del sitio, no sólo para la que lo llama.
- Se llama siempre que hay `?k=` en la URL o hay una `publicKey` ya persistida (cookie), tanto en la
  primera carga como en visitas posteriores.
- Por ahora sólo hace falta que la respuesta indique si quien llama es un usuario reconocido, cuál
  es, y sus características (lo que traiga el endpoint). Esa respuesta es la que más adelante decide
  cómo se ve la página para ese usuario; ese comportamiento de renderizado queda fuera de este plan.
- El fetch debe usar `credentials:'include'` para que la cookie `stt_pk` viaje.
- `api.statetty.com` debe responder con `Access-Control-Allow-Origin: https://statetty.com` y
  `Access-Control-Allow-Credentials: true`.
- Ninguna acción sensible se autoriza sólo por la presencia de la cookie: toda acción protegida
  revalida contra este endpoint o el que corresponda en el backend.

## 5. Flujo de usuario

1. Usuario llega con `?k=XYZ` a cualquier página del dominio.
2. Script cliente detecta el parámetro, llama a `getuser` con esa key.
3. Si la respuesta reconoce un usuario activo: guarda cookie `stt_pk`, expone `window.publicKey`,
   dispara evento `statetty:key-ready` con los datos del usuario recibidos.
4. Si no reconoce usuario o la key es inválida: limpia cookie/localStorage previos, la página se
   comporta como anónima.
5. En visitas posteriores sin `?k=` en la URL: el script lee `publicKey` de la cookie y valida vía
   AJAX contra `getuser` de la misma forma.
6. Al navegar hacia `/inmueble/:_id`, la cookie viaja sola por ser same-origin.
7. Toda página (igual que en 5.5) valida contra el API usando `?k=` si está en la URL, o la
   `publicKey` persistida si no. Por ahora sólo se necesita saber si quien llama es un usuario, cuál,
   y sus características, según lo que traiga la respuesta de `getuser`.

## 6. Cambios requeridos por página/proyecto

| Página/archivo | Cambio |
|---|---|
| `/index.html` | Incluir `<script src="/assets/js/user.js">` antes de cierre de `</body>` |
| Blog (listado + template de artículo) | Mismo include, en el layout/partial compartido si existe |
| Mapa | Mismo include; además usar `window.publicKey` si el mapa filtra/personaliza por agente |
| Registro de inmueble | Mismo include; usa `window.publicKey` y hace sus fetch a `api.statetty.com` (permisos, reconocimiento de usuario, listado y registro) con `credentials:'include'` |
| `nodelab` (Express app) | Middleware `resolvePublicKey` que lea cookie o `req.query.k`, valide contra `getuser` y adjunte a `res.locals` |
| `nodelab/views/inmueble.ejs` | Incluir también `<script src="/assets/js/user.js">`, y consumir `res.locals.publicKey` / `res.locals.agente` ya resuelto por el middleware |
| Nuevo asset compartido | `/assets/js/user.js` (una sola fuente, incluida en `index.html`, blog, mapa, registro, e `inmueble.ejs`) |

## 7. Especificación del script `user.js`

- Se ejecuta en `DOMContentLoaded`.
- Prioridad de lectura: `?k=` en URL > cookie `stt_pk` > localStorage (fallback).
- Responsable de dos cosas: persistir `publicKey` (cookie/localStorage) y llamar siempre a
  `api.statetty.com/api/statetty/getuser` para verificar usuario y permiso de acceso, en toda página
  donde se incluya (incluidas las servidas por `nodelab`).
- Toda llamada a `api.statetty.com` se hace con `fetch(url, {credentials:'include'})` para que la
  cookie `stt_pk` viaje.
- Expone `window.publicKey` (nunca `window.statettyKey`, para no confundir con otras llaves que se
  agreguen más adelante) y `window.STT.getKey()`.
- Dispara `document.dispatchEvent(new CustomEvent('statetty:key-ready', {detail:{key, usuario}}))`
  con la `publicKey` y los datos de usuario devueltos por `getuser`, para que cada página reaccione
  sin acoplarse al detalle de storage ni de la llamada AJAX.

## 8. Ejemplos de función (estilo del proyecto)

### 8.1 Cliente — captura, persistencia y verificación de usuario

```javascript
/** --------------------------------------------------------------------------------------------------- captureAndVerifyUser
 * Captura ?k= o cookie, persiste publicKey y verifica usuario/permisos contra el backend
 *
 * @returns {Promise<Object>}
 */
  const captureAndVerifyUser = async()=>{try{
    let t0=Date.now();
    let url=new URL(location.href),k=url.searchParams.get('k')||readCookie('stt_pk')||localStorage.getItem('stt_pk');
    if(!k){const result={tiempo:(Date.now()-t0)/1000,success:true,error:null,value:null,data:null};return result;}
    let base=window.STATETTY_CONFIG?STATETTY_CONFIG.WS_API_BASE:'';
    let res=await fetch(base+'statetty/getuser?publicKey='+encodeURIComponent(k),{credentials:'include'});
    let data=await res.json();
    if(data.usuario){writeCookie('stt_pk',k,data.expiresAt);localStorage.setItem('stt_pk',k);window.publicKey=k;}
    else {document.cookie='stt_pk=; Max-Age=0; Path=/; Domain=.statetty.com';localStorage.removeItem('stt_pk');}
    document.dispatchEvent(new CustomEvent('statetty:key-ready',{detail:{key:data.usuario?k:null,usuario:data.usuario||null}}));
    const result={tiempo:(Date.now()-t0)/1000,success:true,error:null,value:data.usuario?k:null,data:data.usuario||null};
    return result;
  } catch(e){console.log('[Statetty] [K] captureAndVerifyUser:',e.message);return {tiempo:0,success:false,error:e.message,value:null,data:null};}}
```

### 8.2 Servidor (nodelab) — middleware Express

```javascript
/** --------------------------------------------------------------------------------------------------- resolvePublicKey
 * Resuelve publicKey desde cookie o query, valida contra getuser y la deja disponible en res.locals
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 * @returns {Promise<void>}
 */
  const resolvePublicKey = async(req,res,next)=>{try{
    let t0=Date.now();
    let k=req.query.k||req.cookies.stt_pk;
    if(!k){res.locals.publicKey=null;res.locals.agente=null;return next();}
    let agente=await agenteInmuebleModel.findOne({publicKey:k,activa:true}).lean();
    if(agente){res.cookie('stt_pk',k,{domain:'.statetty.com',path:'/',secure:true,sameSite:'lax'});}
    res.locals.publicKey=agente?k:null;res.locals.agente=agente||null;
    console.log('[Statetty] [K] resolvePublicKey:',{tiempo:(Date.now()-t0)/1000,success:true,error:null});
    next();
  } catch(e){console.log('[Statetty] [K] resolvePublicKey:',e.message);res.locals.publicKey=null;res.locals.agente=null;next();}}
```

## 9. Seguridad

- `publicKey` habilita acceso: no loggear el valor completo en analítica ni en logs públicos.
- Cookie con `Secure` (sólo HTTPS) y `SameSite=Lax` como mínimo.
- Toda acción sensible (registrar inmueble, ver datos de contacto, exportar) revalida server-side,
  nunca confía sólo en la presencia de la cookie.
- Expiración de cookie igual a la vigencia real del plan (no un valor fijo genérico).
- Si la key se invalida (plan vencido), limpiar cookie/localStorage en el siguiente request.
- CORS en `api.statetty.com`: debe responder con `Access-Control-Allow-Origin: https://statetty.com`
  y `Access-Control-Allow-Credentials: true` para que `user.js` desde `statetty.com` pueda consumir
  `getuser` y el resto de endpoints autenticados vía la cookie `stt_pk`.

## 10. Anexo A — Inventario real de funciones dependientes de usuario (ejemplo: registro de inmueble)

Relevado directamente del código actual de la página de registro de inmueble. Sirve de referencia
para no romper nada al migrar de "leer `k` de la URL en cada función" a "usar `window.publicKey`
persistido por `user.js`".

**Importante:** este es un único ejemplo, no un patrón que se pueda asumir igual para el resto de
páginas. Cada página (`index.html`, blog, mapa) tiene sus propias funciones y su propia relación con
los datos de usuario; antes de tocarlas hace falta relevarlas de la misma forma (qué funciones leen
la key hoy, de dónde la sacan, y qué hacen con la respuesta de usuario), en vez de reutilizar
mecánicamente lo que aplica acá. Lo único transversal a todas las páginas es `user.js` como mecanismo
de persistencia y verificación (secciones 4 y 7); el resto de esta tabla es específico de esta página.

| Función actual | Qué hace hoy | Dependencia de usuario/`publicKey` |
|---|---|---|
| `getParam()` | Lee `k` de `location.search` | Única fuente de la key hoy; se llama en más de un lugar (no hay una sola variable de verdad) |
| `init()` | Bootstrap de la página | Llama `getParam()`, guarda en variable local `K`, si no hay key muestra estado "no autorizado" |
| `verifyUser(k)` | Llama `{WS_API_BASE}statetty/getuser?publicKey=k` | Es el mecanismo de verificación que hoy ya existe; sus 3 resultados (válida, "publicKey inválida", "publicKey vencida") deciden qué pantalla de estado se muestra |
| `showForm(user)` | Prellena el formulario | Usa `first_name`, `last_name`, `email`, `waphone`, `agenteID` de la respuesta de `getuser` para completar el badge de usuario y campos del form |
| `loadInmueble(id)` | Trae un inmueble existente (modo edición, via `?_id=`) | No depende de la key para el fetch en sí, pero sólo tiene sentido para un usuario ya verificado; prellena `agentName`/`agentPhon` guardados en ese inmueble |
| `fetchMisInmuebles()` (endpoint `ginlius`) | Lista "mis inmuebles" del usuario en un modal | Requiere `USER._id` **y** `K` juntos; si falta cualquiera de los dos, muestra error y no pide nada al servidor |
| `uploadSelectedFile(file)` | Sube una foto | Vuelve a llamar `getParam()` de forma independiente (no reutiliza `K`) y adjunta `publicKey` al `FormData` de `imagenes/imagen/subir`; si no hay `k` en la URL en ese momento, no sube |
| `handleSubmit()` / `enviarInmueble()` | Publica o actualiza el inmueble (`statetty/setinmueble`) | Arma el payload final con `publicKey: K`, además de `agenteID`, `agentName`, `agentPhon` tomados del formulario |

**Puntos a corregir al migrar a `user.js`:**

- Reemplazar toda lectura directa de `getParam()`/`k` suelta (init, uploadSelectedFile) por
  `window.publicKey`, para que haya una sola fuente de verdad en toda la página.
- `verifyUser(k)` pasa a ser responsabilidad de `user.js` (o `user.js` reutiliza esa misma lógica),
  disparando `statetty:key-ready` con el `USER` resuelto en vez de que cada página reimplemente su
  propio fetch a `getuser`.
- `showForm`, `fetchMisInmuebles`, `uploadSelectedFile` y `enviarInmueble` deben escuchar
  `statetty:key-ready` (o leer `window.publicKey` directamente) en vez de asumir que la key sólo
  vive en la URL de esa carga de página.

## 11. Checklist de tareas

1. Inspeccionar el sitio Jekyll (GitHub) y el repo `nodelab`, y la config del reverse proxy que
   enruta `statetty.com/inmueble/:_id` hacia `nodelab`.
2. Configurar CORS en `api.statetty.com`: `Access-Control-Allow-Origin: https://statetty.com` +
   `Access-Control-Allow-Credentials: true`, para todos los endpoints que consume el sitio
   (`getuser`, permisos, listado de inmuebles, registro de inmueble).
3. Crear/confirmar el endpoint `GET {STATETTY_CONFIG.WS_API_BASE}statetty/getuser` (ya existe; ver
   Anexo A).
4. Crear `/assets/js/user.js` según sección 7, leyendo `STATETTY_CONFIG.WS_API_BASE` de
   `/assets/js/config.js` (ya incluido en la página de registro) en vez de hardcodear el host del API.
5. Incluir `<script src="/assets/js/user.js">` después de `config.js` en: `index.html`, layout del
   blog, template de artículo, página de mapa, página de registro de inmueble, e `inmueble.ejs`.
6. Refactorizar la página de registro de inmueble según el Anexo A: reemplazar las lecturas sueltas
   de `getParam()` por `window.publicKey`, y hacer que `showForm`, `fetchMisInmuebles`,
   `uploadSelectedFile` y `enviarInmueble` reaccionen a `statetty:key-ready` en vez de releer la key
   de la URL cada vez.
6-bis. Antes de tocar `index.html`, blog y mapa: relevar en cada una qué funciones (si alguna) leen
   la key o dependen de datos de usuario, siguiendo el mismo formato del Anexo A. No asumir que
   tienen las mismas funciones que la página de registro; puede que sólo necesiten incluir `user.js`
   sin más cambios, o puede que tengan sus propias dependencias a adaptar.
7. Implementar `resolvePublicKey` como middleware en `nodelab` y montarlo antes de la ruta que
   renderiza `inmueble.ejs`.
8. Adaptar `inmueble.ejs` para leer `publicKey`/`agente` desde `res.locals` en vez de sólo `req.query`.
9. Verificar con pruebas reales que la cookie `Domain=.statetty.com` llega tanto a
   `api.statetty.com` como al request que resuelve `/inmueble/:_id` a través del proxy.
10. Ejecutar las pruebas de la sección 12.

## 12. Criterios de aceptación / pruebas

- Entrar a `index.html?k=VALIDA` → cookie `stt_pk` seteada → navegar a blog sin `?k=` → `getuser`
  vuelve a reconocer al mismo usuario.
- Entrar con `?k=INVALIDA` → `getuser` no reconoce usuario → no se setea cookie, o se limpia si
  había una previa.
- Desde cualquier página del sitio, navegar a `/inmueble/:_id` → el middleware reconoce la
  `publicKey` sin que la URL la lleve explícita, e `inmueble.ejs` también carga `user.js`.
- En la página de registro, las llamadas a `api.statetty.com` (permisos, listado, registro)
  reconocen al usuario vía la cookie compartida, sin pedirle la key manualmente.
- Cookie expirada/plan vencido → `getuser` deja de reconocer usuario, siguiente visita se trata
  como anónima.
- Ninguna acción de escritura (registro de inmueble) se ejecuta sin revalidación server-side de la key.
