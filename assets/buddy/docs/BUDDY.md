# Buddy — capa de identidad, engagement y analítica para sitios estáticos

Revisión hecha sobre `assets/buddy` del repo `asosab/statetty` (commit actual de `main`).

## 1. Qué es

Un único `<script src="buddy.js?v=N">` que, embebido en cualquier página HTML estática (sin backend propio, sin base de datos), agrega:

- Un personaje animado (avatar) que sirve de interfaz conversacional.
- Registro e inicio de sesión de usuarios sin contraseña.
- Perfil de usuario persistente y compartido entre distintos sitios.
- Panel de administración del sitio (roles, dashboard de métricas).
- Telemetría de comportamiento (clicks, WhatsApp, conversiones).
- Un motor de módulos opcionales que puede activarse por sitio, por página o por segmento de usuario.

Todo el estado vive en un backend centralizado (`https://api.statetty.com`). El sitio donde se instala Buddy no necesita servidor, ni base de datos, ni sesiones: solo HTML/CSS/JS estático más este script.

## 2. Arquitectura de instalación

`buddy.js` se auto-localiza: toma su propio `<script src>`, deriva `ASSET_BASE` (la carpeta donde vive) y desde ahí construye todas las rutas de sus módulos, personajes y assets. Esto permite:

- Instalarlo en cualquier subcarpeta de cualquier dominio sin tocar rutas internas.
- Cache-busting automático: el parámetro `?v=N` del script de entrada se propaga a todos los archivos que carga dinámicamente.
- Override explícito de la base vía `window.BUDDY_ASSET_BASE` cuando se necesita servir los assets desde un CDN distinto al del sitio.

Un `config.js` por sitio define qué módulos se cargan (`window.BuddyConfig.modules`) y el identificador del sitio (`app.siteId`). Cada módulo trae su propio `config.js` (parámetros por defecto, editables) y, en varios casos, un `schema.json` que describe esos parámetros para renderizar un formulario de edición (módulo `config`, ver §3.6).

La carga es asíncrona y secuencial por dependencias: `config.js` → personaje (`modules/character`) → assets del personaje → resto de módulos en el orden declarado. Buddy expone un evento `buddy:ready` y una API pública (`window.Buddy`) con las capacidades activas (`window.Buddy.modules.isActive('x')`), resolución de assets con herencia personaje→módulo, y una política común de "ocupado" (visibilidad de pestaña + providers registrados por cada módulo) para no interrumpir al usuario con mensajes fuera de momento.

## 3. Backend central y multi-tenencia

Un solo backend (`api.statetty.com`) atiende a todos los sitios donde se instale Buddy. La separación entre sitios se hace por **`siteId`** (identificador lógico del sitio, definido en `config.js`) y por **origen** (`window.location.origin`), no por infraestructura separada. Esto es lo que habilita el modelo cross-site:

### 3.1 Autenticación sin contraseña (magic link + JWT)

Contrato completo en `modules/auth/auth-service-contract.md`. Flujo:

1. El usuario escribe su email en el chat del avatar → `POST /api/buddy/auth/login` con `email`, `appID` (el `siteId` del sitio actual) y `redirectUrl`.
2. Recibe un enlace por correo → `GET /api/buddy/auth/verify?auth=TOKEN`.
3. El backend responde `accessToken` (JWT corto) + `refreshToken` (largo) + datos del usuario.
4. El frontend guarda `accessToken` en `sessionStorage` y `refreshToken` en `localStorage` — ambos por dominio, sin cookies, sin credenciales CORS.
5. `refreshToken` rota en cada uso y detecta reuso (si un token ya revocado se reutiliza, se cierra toda la cadena de sesiones del usuario).

### 3.2 Mismo perfil, cualquier sitio

La identidad del usuario (`user.id`, email, nombre, teléfono, locale) vive en el backend, indexada por email — no por dominio. Cada sitio donde Buddy está instalado emite su propio par de tokens al mismo usuario, pero ambos apuntan al mismo registro central. Consecuencias directas:

- Un usuario que se registra en el Sitio A y luego visita el Sitio B (con Buddy instalado) puede autenticarse con el mismo email y llega con su nombre, teléfono y locale ya cargados — sin volver a completar el onboarding.
- El almacenamiento de tokens es local a cada dominio (limitación estándar de `localStorage`/`sessionStorage`), así que cada sitio requiere su propio magic link la primera vez que el usuario entra ahí — pero el perfil que se le muestra después de verificar es el mismo perfil global, y `appID` permite al backend saber desde qué sitio se originó cada login (con fines de atribución/analítica) sin fragmentar la identidad.
- El módulo `user` es "la autoridad sobre completitud del perfil" (declarado explícitamente en su config): decide qué campos faltan (`requiredProfileFields`) independientemente de qué sitio los pida.

### 3.3 Roles por sitio, identidad global

`modules/admin` gestiona administradores por sitio (`/api/buddy/admins/get|post`), con rol `owner` para el primer/único dueño y `admin` para el resto. Los menús de cada módulo (`dashboard`, `admin`, `config`) se filtran por rol (`roles: 'admin,superadmin'`, etc.), definido en la config de cada módulo. Es decir: la misma persona (mismo `user.id` global) puede ser simple visitante en un sitio y administrador en otro — el rol es un atributo de la relación usuario↔sitio, no del usuario en abstracto.

### 3.4 Dashboard de métricas por sitio

`modules/dashboard` consume `/api/buddy/dashboard` y arma un panel con: audiencia, engagement, acciones de valor (incluyendo clicks a WhatsApp), embudo, actividades, adquisición y tecnología, sobre una ventana configurable (30 días por defecto), con caché local (`localStorage`, TTL configurable) para no golpear la API en cada carga.

### 3.5 Telemetría común

`modules/telemetry` es el único punto por el que cualquier módulo debe hablar con el backend (`fetch` centralizado, no cada módulo con su propio cliente). Registra eventos (incluye clicks a enlaces `wa.me` vía `modules/wa_listener`) y expone `configureApi`/`request`/`send` al resto de módulos. Esto es lo que permite que Auth, Dashboard y Archery School compartan una sola capa de red con timeouts, headers `Authorization: Bearer` y manejo de errores consistente.

### 3.6 Toolbox de configuración remota

`modules/config` es un panel (solo visible para `superuserEmail`) que lee `schema.json` de cada módulo y genera un formulario para editar, por sitio, qué módulos están activos y con qué parámetros — sin tocar código ni redeployar el sitio estático. Esto es lo que en la práctica convierte a Buddy en un producto multi-tenant administrable centralmente: alta de un nuevo sitio, activación de módulos y ajuste de textos/roles se hace desde este panel.

## 4. Inventario de módulos actuales

| Módulo | Función |
|---|---|
| `character` | Selecciona el personaje activo (`alejito`, `raulito`) y su perfil de idioma/estilo. Sistema de expresiones con anclas de imagen (cabeza, ojos, cintura, pies) para animación y posicionamiento del globo de diálogo. |
| `says` | Motor de frases automáticas: recurrencia, frecuencia, fuentes de contenido por locale/estilo, variante que nunca interrumpe si el usuario está "ocupado". |
| `auth` | Login sin contraseña por magic link, JWT access+refresh, ver §3.1. |
| `user` | Perfil universal (nombre, teléfono, email, locale), onboarding de datos faltantes, autoridad sobre completitud de perfil, subida de foto. |
| `admin` | Alta/gestión de administradores por sitio y su rol. |
| `dashboard` | Panel ejecutivo de métricas por sitio (ver §3.4). |
| `config` | Toolbox de configuración remota por sitio (ver §3.6). |
| `menu` | Botón de login/avatar que despliega un menú flotante agregando los ítems que cada módulo activo declara (`menu: [...]` en su config), filtrados por rol. |
| `chat` | Input de texto (comandos) para interactuar con el avatar, atajo de teclado configurable. |
| `telemetry` | Cliente HTTP único hacia el backend, usado por todos los demás módulos. |
| `wa_listener` | Registra clicks en enlaces `wa.me` como eventos de telemetría (intención de contacto por WhatsApp). |
| `archerySchool` | Vertical de ejemplo: perfil de alumno de tiro con arco, atributos físicos, historial, relaciones con equipamiento — multi-rol (`student`, `instructor`, `admin`), multi-sitio (`schoolOwnerCompany`). |
| `archeryGame` | Minijuego de puntería embebido, con assets propios y posibilidad de ranking (`top10`) vía API. |

## 5. Propuesta de valor para prospectos (sitios estáticos sin BD)

El pitch central: *"tu sitio ya funciona, no lo tocamos — le sumamos una capa de cuentas de usuario, engagement y analítica sin que necesites servidor, base de datos ni mantenimiento."*

Puntos concretos para prospección:

- **Cero infraestructura para el cliente**: un `<script>` tag. No hay que migrar hosting, no hay que contratar backend, no hay que pensar en RGPD/seguridad de contraseñas (no hay contraseñas).
- **Identidad de una sola vez, útil en todos lados**: si el prospecto tiene varios sitios/microsites (marca, landing de campaña, escuela, tienda), un usuario que se registra en uno ya está "conocido" en los demás con Buddy instalado — sin pedirle de nuevo el email.
- **Conversión medible sin Google Analytics ni pixel de terceros**: dashboard propio con embudo, adquisición y clicks de intención (WhatsApp) listo de fábrica.
- **Personalización de marca sin reescribir lógica**: el personaje/avatar y sus textos son un módulo (`character`, `says`) independiente del motor — se puede tematizar por cliente sin tocar el core.
- **Vertical a medida sin partir de cero**: `archerySchool`/`archeryGame` muestran que el mismo motor sirve para un caso de uso de nicho (perfiles de alumno, atributos, equipamiento, gamificación) reutilizando auth/user/telemetry — argumento fuerte para prospectos con necesidades específicas (academias, clubes, comunidades).
- **Alta y ajuste centralizados**: el toolbox de configuración (`config`) permite operar múltiples cuentas de clientes desde un solo panel, sin depender de deploys por sitio.

## 6. Posibilidades de expansión

A partir del patrón ya establecido (módulo cliente + `config.js` + `schema.json` + endpoint propio bajo `/api/buddy/<modulo>`, todo pasando por `telemetry`):

- **Notificaciones proactivas**: reutilizar `says` + `telemetry` para push/email disparado por eventos de comportamiento (carrito abandonado, inactividad, hito de engagement).
- **CRM ligero por sitio**: extender `admin`/`dashboard` con listado y segmentación de usuarios identificados, exportable, para que el dueño del sitio haga seguimiento comercial directo.
- **Pagos/checkout**: módulo nuevo que reutilice `auth` (usuario ya identificado, sin passwords) para checkout de una sola pantalla en sitios sin backend transaccional propio.
- **Formularios dinámicos sin backend propio del cliente**: un módulo genérico de "formulario → guarda en API central → aparece en dashboard", vendible a cualquier sitio estático que hoy usa Google Forms o Typeform.
- **Multi-idioma real de producto** (no solo del avatar): el mecanismo de `localization.enabled` + `locale/style` ya existe en `says`/`auth`; generalizarlo a todos los módulos de cara al usuario.
- **Roles cross-site más ricos**: hoy el rol es por sitio (`admin`, `owner`); se puede modelar una jerarquía de "cuentas" (agencia → varios sitios de clientes) reutilizando el mismo `user.id` global, útil para vender el producto vía agencias/freelancers que gestionan varios sitios de prospectos.
- **Nuevas verticales** siguiendo el patrón de `archerySchool`: gimnasios, consultorios, inmobiliarias, cualquier negocio con sitio estático y necesidad de perfiles + seguimiento, sin reescribir auth/user/telemetry.
- **Marketplace de personajes/temas**: dado que `character` ya está desacoplado de la lógica, se puede vender skins de avatar por industria o por marca como upsell.
