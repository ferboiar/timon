# E2E: Edge CDP desde el portátil

Notas personales para ejecutar pruebas E2E contra la aplicación que corre en el NAS, usando Edge con Chrome DevTools Protocol (CDP) desde el portátil.

## Cómo arrancar

Puedo arrancar el entorno desde VS Code o directamente en `timon`:

```bash
npm run nas
```

## Variables de entorno para E2E

```bash
E2E_CDP_URL=http://10.0.1.2:9222
E2E_BASE_URL=http://192.168.0.166:5173
E2E_USER=<borrado>
E2E_PASSWORD=<borrado>
```

- `E2E_CDP_URL`: endpoint CDP visto desde el contenedor (puerto del portproxy, 9222).
- `E2E_BASE_URL`: URL de la aplicación en desarrollo.
- `E2E_USER` / `E2E_PASSWORD`: usuario de pruebas.

## Puertos (importante)

Edge y el portproxy **no deben compartir puerto**. Si el portproxy ocupa `0.0.0.0:9222` antes de que arranque Edge, Edge acaba escuchando solo en IPv6 (`[::1]:9222`) y el portproxy (IPv4) no llega a él.

| Componente | Escucha en |
|---|---|
| Edge CDP | `127.0.0.1:9223` |
| portproxy de Windows | `0.0.0.0:9222` -> `127.0.0.1:9223` |
| Contenedor / NAS | `10.0.1.2:9222` |

Con puertos distintos el orden de arranque (Edge / portproxy) no importa.

## Arrancar Edge con CDP en Windows

Abrir Edge con depuración remota en el puerto 9223, solo en IPv4 loopback:

```powershell
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' `
  --remote-debugging-port=9223 `
  --remote-debugging-address=127.0.0.1 `
  --user-data-dir="$env:TEMP\edge-e2e" `
  --no-first-run `
  --no-default-browser-check
```

Comprobar que escucha en IPv4:

```powershell
netstat -ano | findstr ":9223" | findstr "LISTENING"
```

Salida esperada:

```text
TCP    127.0.0.1:9223         0.0.0.0:0              LISTENING       <pid de msedge>
```

## Regla de firewall en el portátil

Permitir acceso al puerto del portproxy (9222) solo desde la LAN:

```powershell
New-NetFirewallRule `
  -DisplayName 'Edge CDP E2E - solo LAN 10.0.1.0/24' `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 9222 `
  -RemoteAddress 10.0.1.0/24 `
  -Action Allow
```

## Portproxy para acceder desde otras IPs

Edge escucha CDP solo en `127.0.0.1:9223`. Para que el contenedor o el NAS puedan llegar desde otra IP, uso un `portproxy` de Windows que escucha en 9222 y reenvía a 9223:

```powershell
netsh interface portproxy add v4tov4 `
  listenaddress=0.0.0.0 `
  listenport=9222 `
  connectaddress=127.0.0.1 `
  connectport=9223
```

Comprobar la regla:

```powershell
netsh interface portproxy show all
```

Salida esperada:

```text
Escuchar en ipv4:       Conectar a ipv4:

Dirección       Puerto      Dirección       Puerto
--------------- ----------  --------------- ----------
0.0.0.0         9222        127.0.0.1       9223
```

Si hay que borrarla:

```powershell
netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=9222
```

## Flujo de conexión

```text
Contenedor / NAS
        |
        v
10.0.1.2:9222
        |
        v
portproxy de Windows en el portátil (0.0.0.0:9222)
        |
        v
127.0.0.1:9223
        |
        v
Edge CDP
```

## Verificación

En PowerShell, usar `curl.exe` (en PowerShell `curl` es un alias de `Invoke-WebRequest`) y la URL sin formato Markdown:

```powershell
curl.exe -s --max-time 5 http://127.0.0.1:9223/json/version
curl.exe -s --max-time 5 http://10.0.1.2:9222/json/version
```

Desde dentro de `timon`, comprobar que se llega al CDP de Edge:

```bash
curl -s --max-time 5 http://10.0.1.2:9222/json/version
```

Si devuelve información de Edge/Chrome, la conexión E2E está disponible.

## Si algo falla

- Sin respuesta en `127.0.0.1:9223`: Edge no está arrancado con CDP; cerrar todos los `msedge` y relanzar con el comando de arriba.
- Responde en 9223 pero no en `10.0.1.2:9222`: revisar `netsh interface portproxy show all` y la regla de firewall.
- `netstat` muestra `[::1]` en lugar de `127.0.0.1`: había un conflicto de puerto; usar puertos distintos como arriba.
- Miles de conexiones `TIME_WAIT` contra el puerto: son conexiones ya cerradas, no un problema.
