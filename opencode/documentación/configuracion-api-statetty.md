# Configuración de `api.statetty.com` — Cloudflare Tunnel

## Arquitectura

```
Frontend (GitHub Pages)
  → https://statetty.com           HTTPS
  → fetch a https://api.statetty.com/api/statetty/...  HTTPS
  → Cloudflare Tunnel (cloudflared)
  → http://localhost:3030/api/statetty/...  HTTP (loopback)
  → API Node.js (Contabo VPS)
```

**Problema original:** El frontend se servía vía HTTPS (GitHub Pages) pero consumía la API
en `http://161.97.176.137:3030/api/statetty` (HTTP). El navegador bloqueaba la petición
por **Mixed Content**.

**Solución:** Cloudflare Tunnel crea un túnel cifrado desde el VPS hacia Cloudflare,
exponiendo la API tras una URL HTTPS sin necesidad de certificado SSL en el servidor
origen.

---

## Requisitos

- Cuenta gratuita en [Cloudflare](https://cloudflare.com)
- Dominio (`statetty.com`) administrado en Namecheap (o cualquier registrador)
- VPS Contabo con SSH y Node.js (API en puerto 3030)

---

## Pasos

### 1. Migrar DNS de Namecheap a Cloudflare

1. Crear cuenta en Cloudflare y agregar `statetty.com`
2. Cloudflare asigna dos nameservers (ej: `joselyn.ns.cloudflare.com`,
   `miles.ns.cloudflare.com`)
3. En Namecheap → Domain List → `statetty.com` → Nameservers → **Custom DNS**
4. Ingresar los dos nameservers de Cloudflare (solo nombre, sin IP)
5. Guardar y esperar propagación (5 min — 24 h)

### 2. Configurar registros DNS en Cloudflare

| Tipo | Nombre | Valor | Proxy |
|------|--------|-------|-------|
| A | `@` | `185.199.108.153` | ☁️ DNS only (gris) |
| A | `@` | `185.199.109.153` | ☁️ DNS only (gris) |
| A | `@` | `185.199.110.153` | ☁️ DNS only (gris) |
| A | `@` | `185.199.111.153` | ☁️ DNS only (gris) |
| CNAME | `www` | `asosab.github.io` | ☁️ DNS only (gris) |

**Importante:** Los registros de GitHub Pages deben estar en **DNS only** (nube gris).
Cloudflare no debe interceptar el tráfico de GitHub Pages. El registro `api` se crea
automáticamente en el paso 6.

### 3. Instalar `cloudflared` en el VPS

```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
cloudflared version
```

### 4. Autenticar el tunnel

```bash
cloudflared tunnel login
```
Abrir el enlace en el navegador y seleccionar `statetty.com`. Autorizar.

### 5. Crear el tunnel

```bash
cloudflared tunnel create statetty-api
```
Se genera un archivo JSON con un UUID en `~/.cloudflared/`. Guardar el nombre del
archivo (ej: `46785e61-accb-488b-aec8-22b42ff960c4.json`).

### 6. Configurar el tunnel

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Contenido:

```yaml
tunnel: statetty-api
credentials-file: /root/.cloudflared/<UUID>.json

ingress:
  - hostname: api.statetty.com
    service: http://localhost:3030
  - service: http_status:404
```

Reemplazar `<UUID>` con el nombre exacto del archivo JSON generado.

### 7. Enlazar DNS

```bash
cloudflared tunnel route dns statetty-api api.statetty.com
```

Esto crea automáticamente en Cloudflare:

| Tipo | Nombre | Valor | Proxy |
|------|--------|-------|-------|
| CNAME | `api` | `statetty-api.trycloudflare.com` | 🟠 Proxied (naranja) |

El registro `api` debe quedar en **Proxied** (nube naranja) para que Cloudflare
intercepte el tráfico y lo enrute al tunnel.

### 8. Probar el tunnel

```bash
cloudflared tunnel run statetty-api
```

Mientras corre, visitar en el navegador:
```
https://api.statetty.com/api/statetty/finderresult?publicKey=8e2a162c25818353
```

Si responde con JSON, funciona. Presionar `Ctrl+C` para detener la prueba.

### 9. Instalar como servicio (inicio automático)

```bash
cloudflared service install
systemctl start cloudflared
systemctl enable cloudflared
```

### 10. Actualizar `config.js`

Editar `assets/js/config.js` en el repositorio:

```js
// Antes (HTTP directo a IP):
WS_API_BASE: "http://161.97.176.137:3030/api/statetty"

// Después (HTTPS vía Cloudflare Tunnel):
WS_API_BASE: "https://api.statetty.com/api/statetty"
```

Commitear y pushear. GitHub Pages despliega automáticamente.

---

## Verificación final

1. Abrir `https://statetty.com/maps/find/index.html?k=8e2a162c25818353`
2. Abrir DevTools (F12) → Console
3. No debe aparecer el error `Mixed Content`
4. La API debe responder y el mapa cargar los datos

---

## Comandos útiles

```bash
# Ver estado del servicio
systemctl status cloudflared

# Ver logs del tunnel
journalctl -u cloudflared -f

# Listar tunnels
cloudflared tunnel list

# Eliminar tunnel (si hay que recrearlo)
cloudflared tunnel delete statetty-api

# Probar conectividad local de la API
curl http://localhost:3030/api/statetty/finderresult?publicKey=test
```

---

## Notas

- La API sigue corriendo en HTTP en `localhost:3030` — el tunnel no cambia su
  configuración interna
- No es necesario modificar el firewall del VPS para restringir IPs de Cloudflare
  porque el tunnel inicia la conexión **desde el VPS hacia Cloudflare** (outbound),
  no al revés
- Si se cambia el puerto de la API, actualizar `service: http://localhost:<nuevo-puerto>`
  en `config.yml` y reiniciar el servicio
