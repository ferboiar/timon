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

- `E2E_CDP_URL`: endpoint CDP de Edge en el portátil.
- `E2E_BASE_URL`: URL de la aplicación en desarrollo.
- `E2E_USER` / `E2E_PASSWORD`: usuario de pruebas.

## Arrancar Edge con CDP en Windows

Abrir Edge con depuración remota habilitada:

```powershell
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' `
  --remote-debugging-port=9222 `
  --user-data-dir="$env:TEMP\edge-e2e" `
  --no-first-run `
  --no-default-browser-check
```

Si necesito forzar IPv4:

```powershell
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' `
  --remote-debugging-port=9222 `
  --remote-debugging-address=127.0.0.1 `
  --user-data-dir="$env:TEMP\edge-e2e" `
  --no-first-run `
  --no-default-browser-check
```

## Regla de firewall en el portátil

Permitir acceso al puerto CDP solo desde la LAN:

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

Edge escucha CDP en `127.0.0.1:9222`. Para que el contenedor o el NAS puedan
llegar desde otra IP, uso un `portproxy` de Windows:

```powershell
netsh interface portproxy add v4tov4 `
  listenaddress=0.0.0.0 `
  listenport=9222 `
  connectaddress=127.0.0.1 `
  connectport=9222
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
0.0.0.0         9222        127.0.0.1       9222
```

Comprobar que el puerto está escuchando:

```powershell
netstat -ano | findstr :9222
```

Salida esperada:

```text
TCP    0.0.0.0:9222           0.0.0.0:0              LISTENING       3324
TCP    127.0.0.1:9222         0.0.0.0:0              LISTENING       36040
```

## Flujo de conexión

```text
Contenedor / NAS
        |
        v
10.0.1.2:9222
        |
        v
portproxy de Windows en el portátil
        |
        v
127.0.0.1:9222
        |
        v
Edge CDP
```

## Verificación desde el contenedor

Desde dentro de `timon`, comprobar que se llega al CDP de Edge:

```bash
curl -s --max-time 5 http://10.0.1.2:9222/json/version
```

Si devuelve información de Edge/Chrome, la conexión E2E está disponible.
