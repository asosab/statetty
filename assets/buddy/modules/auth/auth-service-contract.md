# Buddy Auth — contrato del servicio JWT

Este documento define el comportamiento del servicio Auth del servidor para el cliente `modules/auth`.

Autenticación basada en JWT: **accessToken** (corto, en memoria/sessionStorage) + **refreshToken** (largo, en localStorage). Sin cookies.

## Base URL

```text
https://api.statetty.com
```

## flujo general

1. Usuario hace clic en magic link → llega a `GET /auth/verify?auth=TOKEN`
2. Servidor responde con `{ accessToken, refreshToken, user }`
3. Frontend guarda `accessToken` en memoria/sessionStorage y `refreshToken` en localStorage
4. Cada request autenticado incluye `Authorization: Bearer <accessToken>`
5. Cuando `accessToken` expira (401), frontend llama `POST /auth/refresh` con `refreshToken`
6. Servidor rota: devuelve nuevos tokens + usuario actualizado

## Verificar enlace (magic link)

`GET /api/buddy/auth/verify?auth=HASH`

### Respuesta exitosa (usuario existente):

```json
{
  "ok": true,
  "authenticated": true,
  "newUser": false,
  "needsName": false,
  "accessToken": "eyJhbGci...",
  "refreshToken": "a1b2c3d4...",
  "user": {
    "id": "65f...",
    "email": "usuario@example.com",
    "name": "Alejandro",
    "firstName": "Alejandro",
    "lastName": "Sosa",
    "phone": "+59170000000",
    "locale": "es",
    "createdAt": "2026-08-14T00:00:00.000Z"
  }
}
```

### Respuesta exitosa (usuario nuevo):

```json
{
  "ok": true,
  "authenticated": true,
  "newUser": true,
  "needsName": true,
  "accessToken": "eyJhbGci...",
  "refreshToken": "a1b2c3d4...",
  "user": {
    "id": "65f...",
    "email": "usuario@example.com",
    "name": null,
    "firstName": null,
    "lastName": null,
    "phone": null,
    "locale": "es",
    "createdAt": "2026-08-14T00:00:00.000Z"
  }
}
```

## Consultar sesión

`GET /api/buddy/auth/session`

Header: `Authorization: Bearer <accessToken>`

### Autenticado:

```json
{
  "ok": true,
  "authenticated": true,
  "user": { "id": "...", "email": "...", "name": "..." }
}
```

### No autenticado / token expirado:

```json
{
  "ok": true,
  "authenticated": false,
  "user": null,
  "code": "TOKEN_EXPIRED"
}
```

## Refresh token

`POST /api/buddy/auth/refresh`

Body JSON: `{ "refreshToken": "..." }`

### Respuesta exitosa:

```json
{
  "ok": true,
  "accessToken": "eyJhbGci...(nuevo)",
  "refreshToken": "e5f6g7h8...(rotado)",
  "user": { "id": "...", "email": "...", "name": "..." }
}
```

### Reuso detectado (token robado):

```json
{
  "ok": false,
  "error": "Sesión comprometida. Todas las sesiones han sido cerradas.",
  "code": "REUSE_DETECTED"
}
```

## Solicitar login

`POST /api/buddy/auth/login`

Body URL-encoded: `email=usuario@example.com&appID=arbat&redirectUrl=https://...`

Respuesta: `{ "ok": true }` (202)

## Acción `register-name`

`POST /api/buddy/auth/login`

Header: `Authorization: Bearer <accessToken>`

Body URL-encoded: `action=register-name&name=Alejandro`

### Respuesta:

```json
{
  "ok": true,
  "authenticated": true,
  "newUser": false,
  "needsName": false,
  "user": { "id": "...", "email": "...", "name": "Alejandro" }
}
```

## Logout

`POST /api/buddy/auth/logout`

Header: `Authorization: Bearer <accessToken>` (opcional)

Body JSON: `{ "refreshToken": "..." }` (revoca todos los refresh tokens del usuario)

### Respuesta:

```json
{
  "ok": true,
  "authenticated": false,
  "user": null
}
```

## User profile update

`POST /api/buddy/user`

Header: `Authorization: Bearer <accessToken>`

Body URL-encoded: `name=NuevoNombre&phone=+59170000000`

### Respuesta:

```json
{
  "ok": true,
  "authenticated": true,
  "user": { "id": "...", "email": "...", "name": "NuevoNombre", "phone": "+59170000000" },
  "needsName": false
}
```

## Almacenamiento en el frontend

| Token | Ubicación | Lifetime |
|-------|-----------|----------|
| `accessToken` | memoria / sessionStorage | 1h (configurable) |
| `refreshToken` | localStorage | 120 días (configurable) |

## Seguridad

- `accessToken` es JWT firmado, payload mínimo (`sub: userId`, `iat`, `exp`)
- `refreshToken` es string aleatorio criptográfico, almacenado solo como SHA-256 en MongoDB
- Rotación con detección de reuso: si un token ya revocado se reutiliza, se revoca toda la cadena
- Sin cookies, sin `SameSite`, sin CORS credentials — solo `Authorization: Bearer`
