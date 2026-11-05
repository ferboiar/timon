# Utilidad de errores de negocio (`utils/errorDeNegocio`)

Archivo: `backend/src/utils/errorDeNegocio.mjs`. Utilidad del backend para distinguir un error de negocio de un error técnico (F-47).

| Exportación | Descripción |
|---|---|
| `ErrorDeNegocio(mensaje, status = 400, codigo = null)` | Error con mensaje para el usuario y código HTTP. `codigo` es opcional (por ejemplo `IBAN_DUPLICADO`) |
| `MARCA_ERROR_DE_NEGOCIO` | Marca explícita (`Symbol.for`) que reconoce como negocio un error que no sea una instancia |
| `esErrorDeNegocio(error)` | Reconoce `ErrorDeNegocio` y sus subclases, la marca explícita y las clases heredadas `ErrorDeRecibo` y `ErrorDeAjuste` (por nombre y `status` entero). **No** considera de negocio cualquier error con `status` |
| `respuestaDeError(error, mensajeGenerico)` | Función pura: devuelve `{ status, cuerpo, tecnico }`. Un error de negocio conserva su mensaje y estado; uno técnico da 500 con el texto genérico |
| `responderError(res, error, mensajeGenerico, { clave, contexto })` | Responde al cliente y, si el error es técnico, deja el detalle en el log. `clave` es `error` por defecto; el borrado de recibos usa `message` |

## Uso en una ruta

```javascript
import { responderError } from '../utils/errorDeNegocio.mjs';

try {
    await pushAccount(/* … */);
    res.status(201).json({ message: 'Cuenta insertada o actualizada correctamente' });
} catch (error) {
    responderError(res, error, 'No se pudo guardar la cuenta.', { contexto: 'cuentas - POST' });
}
```

## Contrato de respuesta

- **Error de negocio**: `{ "error": "mensaje" }` (y `codigo` si existe) con su estado 400, 404 o 409. El IBAN duplicado responde 409 con `codigo: "IBAN_DUPLICADO"`.
- **Error técnico**: 500 con `{ "error": "texto genérico" }`. Nunca se devuelve la traza, el SQL ni el mensaje del motor.

## Alcance

F-47 lo aplica a cuentas, ahorros, categorías y recibos. Usuarios, conexión, mantenimiento, anticipos y ajustes quedan para **F-48**.

## Referencias

- [API de Cuentas](../routes/cuentas.md)
- [API de Ahorros](../routes/ahorros.md)
- [API de Categorías](../routes/categorias.md)
- [API de Recibos](../routes/recibos.md)
- [Utilidad de mensajes de error del frontend](./apiError.md)
