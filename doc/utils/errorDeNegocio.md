# Utilidad de errores de negocio (`utils/errorDeNegocio`)

Archivo: `backend/src/utils/errorDeNegocio.mjs`. Utilidad del backend para distinguir un error de negocio de un error técnico (F-47 y F-48).

| Exportación | Descripción |
|---|---|
| `ErrorDeNegocio(mensaje, status = 400, codigo = null)` | Error con mensaje para el usuario, código HTTP y código de negocio opcional (por ejemplo `USUARIO_DUPLICADO`) |
| `MARCA_ERROR_DE_NEGOCIO` | Marca explícita (`Symbol.for`) que reconoce como negocio un error que no sea una instancia |
| `esErrorDeNegocio(error)` | Reconoce `ErrorDeNegocio` y sus subclases, la marca explícita y las clases heredadas `ErrorDeRecibo` y `ErrorDeAjuste` (por nombre y `status` entero). **No** considera de negocio cualquier error con `status` |
| `respuestaDeError(error, mensajePropio, { audiencia, aviso })` | Función pura: devuelve `{ status, cuerpo, tecnico }`. Un error de negocio conserva su mensaje y estado; uno técnico da 500 con el mensaje propio y la causa del [catálogo](./catalogoErrores.md) o el aviso por audiencia |
| `responderError(res, error, mensajePropio, { clave, contexto, audiencia, aviso })` | Responde al cliente y, si el error es técnico, deja el detalle en el log. `clave` es `error` por defecto; `message` en las rutas que ya usaban esa clave |
| `detalleParaLog(error)` | Detalle del error para el log: código y mensaje, sin secretos |
| `sanearParaLog(valor)` | Quita contraseñas y credenciales de una cadena antes de registrarla |

## Uso en una ruta

```javascript
import { responderError } from '../utils/errorDeNegocio.mjs';
import { AUDIENCIA_ADMIN } from '../utils/catalogoErrores.mjs';

try {
    await pushAccount(/* … */);
    res.status(201).json({ message: 'Cuenta insertada o actualizada correctamente' });
} catch (error) {
    responderError(res, error, 'No se pudo guardar la cuenta.', { contexto: 'cuentas - POST', audiencia: AUDIENCIA_ADMIN });
}
```

## Contrato de respuesta

- **Error de negocio**: `{ "error": "mensaje" }` (o `{ "message": … }` en las rutas que usan esa clave) con su estado 400, 401, 404 o 409 y, si existe, `codigo`. El IBAN duplicado responde 409 con `codigo: "IBAN_DUPLICADO"`.
- **Error técnico**: 500 con el mensaje propio de la operación seguido de la causa del catálogo o del aviso por audiencia. Nunca se devuelve la traza, el SQL, el nombre de una tabla ni el mensaje del motor.
- **Log**: el detalle real y saneado, con el formato «contexto: error técnico (estado) - código y mensaje» (DC-09).

## Audiencia

El texto de un error técnico lo decide la audiencia de la ruta y no el rol de quien llama: `AUDIENCIA_ADMIN` para las rutas que el servidor exige como administrador y `AUDIENCIA_GENERAL` para las de uso general. Las reglas están en el [catálogo de causas](./catalogoErrores.md).

## Alcance

F-47 lo aplicó a cuentas, ahorros, categorías y recibos; F-48 lo extiende a usuarios (y sus preferencias de estilo), conexión, mantenimiento, anticipos y ajustes, e incorpora el catálogo de causas y el saneado del log.

## Referencias

- [Catálogo de causas de error](./catalogoErrores.md)
- [API de Cuentas](../routes/cuentas.md)
- [API de Usuarios](../routes/users.md)
- [API de conexión a la base de datos](../routes/conexionDB.md)
- [API de mantenimiento de la base de datos](../routes/mantenimientoDB.md)
- [API de Anticipos](../routes/anticipos.md)
- [API de Ajustes](../routes/ajustes.md)
- [Utilidad de mensajes de error del frontend](./apiError.md)
