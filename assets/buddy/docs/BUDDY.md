# Buddy — capa de identidad, engagement, datos y servicios transaccionales

> Documento de arquitectura y evolución de `assets/buddy` en `asosab/statetty`.
>
> **Estado:** documento de trabajo para discusión y diseño.
>
> **Última revisión:** 2026-09-01.

## 1. Qué es Buddy

Buddy es una capa reutilizable que puede incorporarse mediante un único:

```html
<script src="buddy.js?v=N"></script>
```

a sitios y aplicaciones que no necesariamente disponen de backend propio.

La arquitectura actual convierte a Buddy en una plataforma centralizada de:

- identidad y autenticación;
- perfiles de usuario;
- roles por sitio;
- módulos funcionales;
- configuración remota;
- telemetría y analítica;
- herramientas verticales;
- interacción mediante avatar/chat.

El frontend del sitio puede seguir siendo estático: el estado persistente y los servicios comunes viven en el backend central de Buddy (`api.statetty.com`).

La evolución propuesta es que Buddy deje de ser solamente una **capa de identidad/engagement para sitios estáticos** y se convierta progresivamente en una **plataforma de servicios compartidos para múltiples productos y sitios**.

Dos piezas son especialmente importantes para esa evolución:

1. **Forms** — infraestructura genérica de formularios y captura de datos.
2. **Wallet** — infraestructura de saldo, movimientos y pagos dentro del ecosistema Buddy.

---

# 2. Estado actual

## 2.1 Arquitectura de instalación

`buddy.js` se auto-localiza a partir de su propio `<script>` y deriva `ASSET_BASE`.

Esto permite:

- instalar Buddy en cualquier subcarpeta;
- utilizar cache-busting mediante `?v=N`;
- servir assets desde otro origen mediante `window.BUDDY_ASSET_BASE`;
- cargar módulos de forma asíncrona;
- mantener configuración estática local y configuración runtime proveniente del backend.

La configuración general está en:

```text
assets/buddy/config.js
```

y actualmente declara, entre otros, módulos como:

```text
telemetry
wa_listener
user
auth
admin
dashboard
config
says
chat
menu
archerySchool
archeryGame
```

## 2.2 Carga y dependencias

Buddy no debe depender del orden alfabético de los módulos.

Existe un orden explícito de carga para resolver dependencias reales:

- `telemetry` antes de módulos que necesitan comunicación con API;
- `says` antes de módulos que utilizan `window.buddy_says`;
- módulos opcionales posteriormente.

Buddy expone:

```javascript
buddy:ready
```

y una API pública mediante:

```javascript
window.Buddy
```

incluyendo la posibilidad de consultar si un módulo está activo:

```javascript
window.Buddy.modules.isActive('modulo')
```

## 2.3 Configuración runtime

Buddy consulta configuración remota mediante:

```text
/api/buddy/runtime/config
```

utilizando:

- `siteId`;
- `window.location.origin`.

La configuración recibida desde backend se fusiona con la configuración estática.

La configuración remota puede gobernar:

- módulos activos;
- parámetros;
- `enabled`;
- condiciones;
- configuraciones específicas de cada módulo.

El merge actual permite que la configuración de backend prevalezca sobre defaults estáticos sin impedir que Buddy arranque cuando el backend no está disponible.

Esto es una base importante para Forms y Wallet.

---

# 3. Identidad y multi-tenancy

## 3.1 Autenticación

Buddy utiliza autenticación passwordless mediante magic link.

Flujo actual:

```text
POST /api/buddy/auth/login
        ↓
email + appID + redirectUrl
        ↓
magic link
        ↓
GET /api/buddy/auth/verify
        ↓
accessToken + refreshToken + usuario
```

El access token es corto y se almacena en `sessionStorage`.

El refresh token se almacena en `localStorage`, rota en cada uso y detecta reutilización.

## 3.2 Identidad global

La identidad está asociada al usuario global de Buddy y no al dominio.

Conceptualmente:

```text
USER
 ├── id
 ├── email
 ├── nombre
 ├── teléfono
 └── locale

USER ↔ SITE
 ├── rol
 └── permisos
```

Esto permite que una misma persona participe en varios sitios Buddy sin duplicar su identidad.

## 3.3 Roles

Los roles actuales son principalmente contextuales al sitio.

Por ejemplo:

- `owner`;
- `admin`;
- `student`;
- `instructor`.

La misma identidad puede ser usuario común en un sitio y administrador en otro.

Este modelo deberá conservarse para Forms y Wallet.

---

# 4. Módulos existentes

| Módulo | Función |
|---|---|
| `character` | Avatar/personaje, expresiones y assets |
| `says` | Frases automáticas y fuentes de contenido |
| `auth` | Magic link + JWT |
| `user` | Perfil universal y onboarding |
| `admin` | Administración de usuarios administradores por sitio |
| `dashboard` | Métricas y analítica |
| `config` | Configuración remota de Buddy |
| `menu` | Menú dinámico de módulos |
| `chat` | Interacción textual |
| `telemetry` | Cliente HTTP común y eventos |
| `wa_listener` | Detección de clicks hacia WhatsApp |
| `archerySchool` | Gestión vertical de alumnos de tiro con arco |
| `archeryGame` | Juego de puntería y ranking |

## 4.1 Patrón de módulo

El patrón establecido es:

```text
modules/<module>/
    buddy_<module>.js
    config.js
    schema.json            # cuando aplica
    ...
```

y, cuando necesita backend:

```text
/api/buddy/<module>/...
```

Los módulos no deberían implementar clientes HTTP independientes.

La comunicación debe pasar por `telemetry`, que funciona actualmente como capa común de transporte/API.

---

# 5. Principio arquitectónico de la siguiente etapa

Buddy debe evolucionar de:

```text
script + módulos + identidad + analítica
```

hacia:

```text
             BUDDY
               │
       ┌───────┼────────┐
       │       │        │
   Identity   Data    Commerce
       │       │        │
      Auth    Forms   Wallet
      User    Records Payments
      Roles   Events  Ledger
       │       │        │
       └───────┼────────┘
               │
          Verticales
               │
       ┌───────┼─────────┐
    Statetty  Arbat   otros
```

La regla fundamental debe ser:

> **Una capacidad transversal debe implementarse una sola vez en Buddy y ser consumida por los módulos verticales.**

Por ejemplo:

- Statetty no debería crear su propio sistema de formularios.
- Arbat no debería crear su propio sistema de pagos.
- Un nuevo sitio Buddy no debería crear otro sistema de usuarios.
- Los formularios de configuración tampoco deberían tener un renderer distinto del sistema general de Forms.

---

# 6. Nuevo módulo: Forms

## 6.1 Objetivo

Crear un módulo genérico de formularios con backend centralizado que permita:

1. que Buddy genere formularios para sus propios módulos;
2. que los módulos existentes dejen de implementar formularios específicos;
3. que los administradores creen formularios sin programarlos;
4. que los usuarios puedan completar formularios;
5. que las respuestas queden almacenadas en Buddy;
6. que otros módulos puedan consumir esas respuestas;
7. que un formulario pueda utilizarse como mecanismo de captura de datos de cualquier sitio Buddy.

Forms no debe ser simplemente un componente visual.

Debe ser un **servicio de definición, renderizado, validación, almacenamiento y consulta de formularios**.

---

# 7. Forms como infraestructura transversal

El primer uso debe ser interno.

Casos prioritarios:

### Registro de usuario

Actualmente `user` determina qué campos faltan del perfil.

En el futuro podría delegar la captura a Forms:

```text
user
  ↓
form: profile
  ↓
respuesta
  ↓
user profile
```

### Configuración de módulos

El actual mecanismo basado en `schema.json` ya representa conceptualmente una definición de formulario.

Forms debería convertirse progresivamente en el renderer/servicio común:

```text
module schema
      ↓
Forms renderer
      ↓
formulario
      ↓
configuración
```

### Archery School

En lugar de construir formularios específicos para alumnos:

```text
archerySchool
      ↓
Forms
      ↓
student-profile
```

### Statetty

Puede utilizar Forms para:

- registro;
- onboarding;
- encuestas;
- captación;
- formularios internos;
- preferencias;
- solicitudes;
- evaluaciones;
- formularios creados por administradores.

---

# 8. Form Builder

En una segunda etapa, un administrador podrá crear formularios.

Ejemplo conceptual:

```text
Nombre:
[ Encuesta de satisfacción ]

Campos:

[ Nombre          ] texto
[ Edad            ] número
[ ¿Recomendaría?  ] sí/no
[ Comentarios     ] texto largo

              [ Guardar ]
```

El administrador no debería necesitar modificar código.

El formulario tendría una definición persistente.

Conceptualmente:

```json
{
  "id": "encuesta-satisfaccion",
  "siteId": "statetty",
  "name": "Encuesta de satisfacción",
  "version": 1,
  "status": "published",
  "fields": [
    {
      "id": "nombre",
      "type": "text",
      "label": "Nombre",
      "required": true
    }
  ]
}
```

La representación exacta debe definirse durante el diseño técnico.

---

# 9. Tipos de campo iniciales

La primera versión debería mantener el conjunto deliberadamente pequeño:

- `text`
- `textarea`
- `email`
- `phone`
- `number`
- `date`
- `datetime`
- `boolean`
- `select`
- `radio`
- `checkbox`
- `multiselect`
- `file`
- `hidden`

Posteriormente:

- campos calculados;
- campos dependientes;
- búsqueda de usuarios Buddy;
- selección de productos;
- selección de entidades de otros módulos;
- firma;
- ubicación;
- cámara;
- carga múltiple.

---

# 10. Separar definición, presentación y respuesta

Forms debería diferenciar claramente:

```text
FORM DEFINITION
       │
       ├── campos
       ├── validaciones
       ├── permisos
       └── presentación
              │
              ↓
        FORM RENDERER
              │
              ↓
          RESPONSE
              │
              ├── userId
              ├── siteId
              ├── formId
              ├── version
              ├── submittedAt
              └── data
```

Esto permitirá cambiar un formulario sin destruir las respuestas históricas.

Una respuesta debe conservar la versión del formulario que la generó.

---

# 11. Versionado

Los formularios deben ser versionados.

No se debería modificar silenciosamente la estructura de un formulario ya utilizado.

Ejemplo:

```text
customer-registration v1
customer-registration v2
customer-registration v3
```

Una respuesta debe indicar:

```text
formId
formVersion
```

Esto es especialmente importante para:

- datos históricos;
- auditoría;
- cambios de campos;
- reportes;
- migraciones.

---

# 12. Permisos de Forms

El formulario debe poder definir quién puede:

- ver;
- completar;
- editar;
- publicar;
- administrar;
- consultar respuestas;
- exportar respuestas.

Inicialmente:

```text
owner
admin
user
```

Pero el diseño debe permitir permisos más específicos posteriormente.

Ejemplo:

```text
forms:create
forms:edit
forms:publish
forms:viewResponses
forms:export
```

---

# 13. Forms y datos capturados por usuarios

Una de las capacidades estratégicas del módulo es permitir:

```text
Administrador
      ↓
crea formulario
      ↓
publica formulario
      ↓
usuarios completan
      ↓
Buddy almacena respuestas
      ↓
administrador consulta datos
```

El administrador debe poder decidir si el formulario:

- es público;
- requiere login;
- pertenece a un sitio;
- pertenece a un módulo;
- puede ser respondido una vez;
- puede ser respondido varias veces;
- acepta respuestas anónimas;
- tiene fecha de inicio;
- tiene fecha de cierre.

---

# 14. Forms y módulos

Los módulos deben poder declarar formularios que necesitan.

Ejemplo:

```javascript
{
  id: 'student-profile',
  provider: 'archerySchool',
  version: 1
}
```

Buddy puede entonces resolver:

```text
module → form → renderer → response
```

El módulo no necesita conocer cómo se dibuja el formulario.

Tampoco debe conocer necesariamente cómo se almacena.

Esto reduce acoplamiento.

---

# 15. API conceptual de Forms

La API inicial podría evolucionar hacia algo parecido a:

```text
GET    /api/buddy/forms
GET    /api/buddy/forms/:id
POST   /api/buddy/forms
PUT    /api/buddy/forms/:id
POST   /api/buddy/forms/:id/publish

GET    /api/buddy/forms/:id/responses
POST   /api/buddy/forms/:id/responses
GET    /api/buddy/forms/:id/responses/:responseId
PUT    /api/buddy/forms/:id/responses/:responseId
```

No se considera todavía contrato definitivo.

---

# 16. Nuevo módulo: Wallet

## 16.1 Objetivo

Crear una billetera digital interna para usuarios Buddy.

La Wallet permitirá:

1. ingresar dinero desde una cuenta bancaria de Buddy;
2. asociar ese ingreso a un usuario;
3. mantener un saldo interno;
4. transferir saldo entre usuarios Buddy;
5. pagar productos y servicios ofrecidos dentro del ecosistema Buddy;
6. registrar todos los movimientos mediante un ledger auditable.

Ejemplo:

```text
Usuario
   │
   │ transferencia bancaria + QR
   ↓
Cuenta bancaria Buddy
   │
   │ conciliación
   ↓
Wallet Buddy
   │
   ├── transferencia → otro usuario
   │
   ├── pago → Statetty
   │
   └── pago → Arbat
```

---

# 17. Principio fundamental de Wallet

La Wallet no debe modelarse como:

```text
user.balance = 150
```

El saldo debe ser una consecuencia del historial transaccional.

La arquitectura debe utilizar un **ledger**.

Conceptualmente:

```text
TRANSACTION
 ├── id
 ├── type
 ├── status
 ├── amount
 ├── currency
 ├── source
 ├── destination
 ├── reference
 ├── createdAt
 └── metadata
```

Y las cuentas:

```text
WALLET
 ├── id
 ├── userId
 ├── currency
 └── status
```

El saldo debe poder reconstruirse a partir del ledger o de un balance derivado protegido por transacciones atómicas.

---

# 18. Estados de una transacción

Como mínimo:

```text
pending
completed
failed
cancelled
reversed
```

Especialmente importante:

> Una transacción financiera no debe eliminarse físicamente.

Si se necesita corregirla, debe generarse una operación compensatoria/reversa.

---

# 19. Carga de dinero mediante QR bancario

El flujo inicial previsto:

```text
Usuario
  ↓
"Agregar dinero"
  ↓
Buddy muestra datos / QR de cuenta bancaria
  ↓
Usuario realiza transferencia bancaria
  ↓
Banco → cuenta Buddy
  ↓
Identificación / conciliación
  ↓
Ingreso pendiente
  ↓
Confirmación
  ↓
Wallet acreditada
```

Debe existir una forma inequívoca de asociar el depósito con el usuario.

Posibles mecanismos:

- monto único;
- código de referencia;
- identificador de operación;
- comprobante;
- conciliación bancaria automatizada cuando exista API;
- conciliación manual en la primera versión.

La estrategia exacta de identificación de depósitos debe definirse antes de implementar Wallet.

---

# 20. No confundir depósito bancario con saldo disponible

Un depósito recibido no debería convertirse automáticamente en saldo disponible sin pasar por un estado de conciliación.

Conceptualmente:

```text
bank_transfer
      ↓
detected
      ↓
pending_reconciliation
      ↓
confirmed
      ↓
wallet_credit
      ↓
available_balance
```

Esto evita que un comprobante falso o una transferencia no identificada genere saldo utilizable.

---

# 21. Transferencias entre usuarios

Un usuario podrá enviar dinero a otro usuario Buddy.

Ejemplo:

```text
Alejandro
   ↓ 50 Bs
Siria
```

La operación debe ser atómica:

```text
Wallet A: -50
Wallet B: +50
```

Nunca debe existir un estado en el que:

```text
A pierde 50
B no recibe 50
```

salvo que la transacción completa esté en estado `pending` y posteriormente sea finalizada de manera segura.

---

# 22. Identificación del destinatario

La transferencia no debería depender exclusivamente del email.

El sistema debe poder soportar posteriormente:

- usuario Buddy;
- email;
- teléfono;
- username;
- QR de usuario;
- identificador Buddy.

Un QR personal podría representar:

```text
buddy://user/<public-id>
```

o un mecanismo equivalente.

El identificador público no debe exponer datos sensibles.

---

# 23. Pagos dentro del ecosistema

La Wallet debe permitir que un módulo actúe como proveedor.

Ejemplos:

### Statetty

```text
Wallet
   ↓
pago de suscripción
   ↓
Statetty
```

### Arbat

```text
Wallet
   ↓
pago de clase de tiro con arco
   ↓
Arbat / archerySchool
```

### Otros servicios

```text
Wallet
   ↓
producto/servicio
   ↓
módulo proveedor
```

Esto convierte a Buddy en una plataforma con una economía interna.

---

# 24. Modelo conceptual de Commerce

Wallet no debería conocer la lógica específica de cada producto.

Debe existir una capa de órdenes/pagos:

```text
PRODUCT / SERVICE
        ↓
       ORDER
        ↓
      PAYMENT
        ↓
      WALLET
        ↓
     LEDGER
```

Por ejemplo:

```text
Statetty
  product: subscription-30-days
  price: 75 Bs

Arbat
  product: archery-class
  price: 50 Bs
```

Wallet solamente procesa el pago.

El módulo proveedor decide qué significa que el pago haya sido exitoso.

---

# 25. Separación entre Wallet y módulos comerciales

La responsabilidad debería quedar así:

### Wallet

- saldo;
- ledger;
- transferencias;
- pagos;
- estados;
- seguridad;
- idempotencia;
- auditoría.

### Módulo comercial

- producto;
- precio;
- disponibilidad;
- reglas de negocio;
- prestación del servicio;
- activación después del pago.

Esto evita convertir Wallet en un módulo gigantesco y acoplado a cada vertical.

---

# 26. Idempotencia

Todas las operaciones financieras que puedan repetirse por:

- doble click;
- retry HTTP;
- timeout;
- refresh;
- reenvío de petición;

deben soportar `idempotencyKey`.

Ejemplo:

```text
POST /api/buddy/wallet/payment

Idempotency-Key: 8e9...
```

Una misma operación lógica nunca debe descontar dos veces.

Esto debe ser requisito desde la primera versión.

---

# 27. Seguridad de Wallet

Wallet requiere un nivel de seguridad superior al de los módulos informativos.

Como mínimo:

- autorización por usuario;
- validación server-side;
- operaciones atómicas;
- ledger inmutable;
- idempotencia;
- auditoría;
- control de concurrencia;
- límites de operación;
- rate limiting;
- detección de operaciones sospechosas;
- separación entre datos públicos y privados;
- trazabilidad completa.

Nunca se debe confiar en:

```javascript
amount
balance
userId
price
```

provenientes del frontend.

El backend debe recalcular y validar todos los valores críticos.

---

# 28. Estados y límites de Wallet

La Wallet debería contemplar:

```text
active
blocked
suspended
closed
```

y límites configurables:

```text
maxDeposit
maxTransfer
maxDailyTransfer
maxDailySpend
```

Esto permitirá introducir controles gradualmente sin rediseñar la arquitectura.

---

# 29. Moneda

La primera implementación puede trabajar con una moneda definida por Buddy.

Por ejemplo:

```text
BOB
```

pero el modelo debe incluir:

```text
currency
```

desde el principio.

No se recomienda asumir que siempre existirá una única moneda.

---

# 30. Relación entre Forms y Wallet

Los dos módulos son independientes, pero pueden colaborar.

Ejemplo:

```text
Forms
  ↓
KYC / datos adicionales
  ↓
Wallet habilitada
```

o:

```text
Forms
  ↓
solicitud de retiro
  ↓
Wallet
  ↓
revisión administrativa
```

Forms puede convertirse también en la infraestructura para:

- datos de facturación;
- información de contacto;
- aceptación de términos;
- solicitudes;
- comprobantes;
- formularios administrativos.

---

# 31. Nueva arquitectura de Buddy

La arquitectura objetivo queda conceptualmente:

```text
                        BUDDY
                          │
          ┌───────────────┼────────────────┐
          │               │                │
       Identity          Data           Commerce
          │               │                │
     ┌────┼────┐      ┌───┴────┐      ┌────┴────┐
     │    │    │      │        │      │         │
    Auth User Roles   Forms   Telemetry Wallet  Payments
                                            │
                                         Ledger
                                            │
                                         Orders
                                            │
                                      ┌─────┴─────┐
                                      │           │
                                   Statetty     Arbat
```

Los verticales consumen capacidades de Buddy en lugar de duplicarlas.

---

# 32. Relación con `config`

El actual módulo `config` es un precursor importante de Forms.

Hoy:

```text
schema.json
    ↓
config module
    ↓
formulario de configuración
```

Objetivo:

```text
schema / definition
       ↓
      Forms
       ↓
renderer + validation
       ↓
config
```

Esto permite eliminar gradualmente código específico de formularios del módulo `config`.

El `config` deja de ser "un sistema de formularios" y pasa a ser "un consumidor de Forms".

---

# 33. Relación con `user`

El módulo `user` también debe consumir Forms.

Objetivo:

```text
auth
 ↓
user
 ↓
¿faltan datos?
 ↓
Forms
 ↓
profile form
 ↓
user profile
```

`user` sigue siendo la autoridad sobre el estado del perfil, pero Forms se convierte en el mecanismo de captura.

---

# 34. Relación con `archerySchool`

`archerySchool` debe utilizar Forms para la captura de información de alumnos.

Ejemplo:

```text
archerySchool
    │
    ├── student-profile
    ├── physical-profile
    ├── equipment-profile
    └── enrollment
          │
          ↓
        Forms
```

Esto sirve además como primer caso real para validar que Forms es suficientemente flexible para verticales complejos.

---

# 35. Relación con Statetty

Statetty es uno de los primeros consumidores naturales de estas capacidades.

### Forms

Puede utilizarse para:

- registro;
- configuración;
- preferencias;
- onboarding;
- encuestas;
- formularios comerciales.

### Wallet

Puede utilizarse para:

- suscripciones;
- compra de tiempo;
- renovación;
- servicios futuros;
- promociones;
- productos digitales.

Ejemplo:

```text
Usuario Statetty
      ↓
Wallet
      ↓
75 Bs
      ↓
suscripción 30 días
      ↓
Statetty habilita servicio
```

---

# 36. Eventos de plataforma

Con la aparición de Forms y Wallet, la telemetría debería evolucionar hacia un sistema de eventos de plataforma.

Ejemplos:

```text
user.created
user.profile.updated

form.created
form.published
form.response.created

wallet.created
wallet.deposit.pending
wallet.deposit.confirmed
wallet.transfer.completed
wallet.payment.completed
wallet.payment.failed

order.created
order.paid
order.cancelled
```

Los eventos permitirán que otros módulos reaccionen sin acoplarse directamente.

---

# 37. Principio Event → Action

Ejemplo:

```text
wallet.payment.completed
          ↓
      Statetty
          ↓
 subscription.activate()
```

Otro:

```text
form.response.created
          ↓
      ArcherySchool
          ↓
 actualizar perfil alumno
```

Esto abre la posibilidad de automatizaciones posteriores.

---

# 38. Roadmap propuesto

## Fase 0 — Consolidación

Antes de implementar los dos módulos:

- estabilizar contrato de `telemetry`;
- documentar API común;
- documentar autenticación;
- documentar permisos;
- documentar configuración runtime;
- definir convenciones de endpoints;
- definir convenciones de errores;
- definir eventos.

## Fase 1 — Forms core

Implementar:

- definición de formularios;
- CRUD;
- versionado;
- renderer;
- validación;
- respuestas;
- permisos;
- almacenamiento;
- API.

## Fase 2 — Migración interna a Forms

Migrar progresivamente:

1. `config`;
2. `user`;
3. `archerySchool`;
4. otros módulos que necesiten captura.

No crear nuevos formularios específicos después de que Forms sea estable.

## Fase 3 — Form Builder

Permitir a `owner/admin`:

- crear;
- editar;
- publicar;
- versionar;
- revisar respuestas;
- exportar.

## Fase 4 — Wallet core

Implementar:

- wallet;
- ledger;
- depósitos;
- conciliación;
- transferencias;
- estados;
- idempotencia;
- auditoría.

## Fase 5 — Payments

Crear la abstracción:

```text
product
order
payment
```

y conectar Wallet.

## Fase 6 — Primeros consumidores

Prioridad:

```text
Statetty → suscripción
Arbat → clases / servicios
```

## Fase 7 — Economía Buddy

Posteriormente:

- marketplace;
- promociones;
- créditos;
- descuentos;
- pagos recurrentes;
- proveedores externos;
- programas de fidelización.

---

# 39. MVP de Forms

El MVP debería poder hacer exactamente esto:

```text
ADMIN
  ↓
Crear formulario
  ↓
Agregar campos
  ↓
Publicar
  ↓
Obtener formulario
  ↓
USER completa
  ↓
POST response
  ↓
ADMIN consulta respuestas
```

Sin intentar inicialmente construir un Typeform completo.

---

# 40. MVP de Wallet

El MVP debería poder hacer:

```text
USER
 ↓
ver saldo
 ↓
ver instrucciones/QR de depósito
 ↓
solicitar/registrar depósito
 ↓
ADMIN concilia
 ↓
saldo acreditado
 ↓
transferir a otro usuario
 ↓
pagar un servicio Buddy
```

El primer objetivo es construir un sistema interno controlado, auditable y correcto, no competir inmediatamente con una billetera bancaria.

---

# 41. Decisiones que deben resolverse antes de implementar Wallet

Estas decisiones son deliberadamente abiertas para discusión:

1. ¿El saldo será siempre dinero fiat o también podrá existir crédito promocional?
2. ¿La Wallet tendrá una sola moneda inicialmente?
3. ¿Cómo se identificará automáticamente una transferencia bancaria?
4. ¿Habrá conciliación automática o manual en el MVP?
5. ¿Existirán retiros hacia cuentas bancarias o inicialmente solo depósitos y consumo interno?
6. ¿Qué usuario puede transferir?
7. ¿Qué límites tendrán las operaciones?
8. ¿Habrá comisión?
9. ¿Quién es el beneficiario final de un pago?
10. ¿Cómo se manejarán reembolsos?
11. ¿Cómo se resolverán disputas?
12. ¿Qué comprobantes deben conservarse?
13. ¿Qué requisitos regulatorios aplican al modelo concreto de operación?

La arquitectura debe dejar estas cuestiones parametrizables cuando sea razonable, pero no debe ocultar decisiones regulatorias o contables detrás de simples flags de software.

---

# 42. Decisiones que deben resolverse para Forms

1. ¿Los formularios serán solamente por `siteId` o también podrán ser globales?
2. ¿Un formulario puede ser utilizado por varios módulos?
3. ¿Quién es propietario de los datos?
4. ¿Qué datos puede consultar un admin?
5. ¿Se permiten formularios públicos?
6. ¿Se permiten respuestas anónimas?
7. ¿Cómo se gestionan archivos?
8. ¿Qué formatos de exportación se necesitan?
9. ¿Qué validaciones soportará el renderer?
10. ¿Se utilizará JSON Schema como base o una definición propia de Buddy?
11. ¿Cómo se representarán condiciones entre campos?
12. ¿Cómo se relacionará una respuesta con `user.id`?
13. ¿Cómo se manejarán datos sensibles?
14. ¿Cómo se eliminarán/anonymizarán respuestas cuando corresponda?

---

# 43. Riesgos arquitectónicos

## 43.1 Convertir Buddy en un monolito

El hecho de centralizar capacidades no significa que todos los módulos deban conocer toda la plataforma.

Debe mantenerse:

```text
core services
     ↓
stable contracts
     ↓
independent modules
```

## 43.2 Forms demasiado complejo

No intentar resolver desde la primera versión:

- workflow engine;
- CRM;
- BI;
- documentos;
- firmas;
- automatización avanzada.

Forms debe comenzar como:

```text
definition
+
render
+
validate
+
store
+
query
```

## 43.3 Wallet demasiado acoplada

Wallet no debe saber qué es:

- Statetty;
- Arbat;
- una clase;
- una suscripción;
- un inmueble.

Debe saber qué es:

```text
account
ledger
order
payment
```

## 43.4 Saldo mutable sin ledger

Debe evitarse desde el principio.

La contabilidad de la Wallet debe ser auditable.

---

# 44. Visión de Buddy

La evolución propuesta cambia significativamente la naturaleza del proyecto.

### Buddy actual

```text
Identidad
+
Avatar
+
Engagement
+
Analítica
+
Módulos
```

### Buddy objetivo

```text
Identidad
+
Datos
+
Formularios
+
Eventos
+
Servicios
+
Wallet
+
Pagos
+
Módulos verticales
```

La tesis de arquitectura es:

> **Buddy debe convertirse en la capa común que permite construir pequeñas aplicaciones verticales sin que cada aplicación tenga que reinventar identidad, captura de datos, configuración, analítica y transacciones.**

Statetty y Arbat son los primeros consumidores de esa plataforma.

---

# 45. Principio final

La expansión no debe medirse por la cantidad de módulos que Buddy acumule.

Debe medirse por cuánto código deja de ser necesario duplicar en los productos que utilizan Buddy.

Si una nueva aplicación necesita:

```text
usuarios
formularios
roles
configuración
eventos
pagos
```

su implementación debería aproximarse a:

```text
Buddy
  +
configuración del sitio
  +
módulo específico del negocio
```

y no a:

```text
nuevo sistema de usuarios
+
nuevo sistema de formularios
+
nuevo sistema de pagos
+
nuevo sistema de configuración
+
nuevo sistema de analítica
```

Ese es el criterio arquitectónico que debe guiar las próximas iteraciones.
