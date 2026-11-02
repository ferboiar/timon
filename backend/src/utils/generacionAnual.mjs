// U-13/DC-36: lógica pura del proceso anual.
export function opcionesGeneracion(simular, proximoDiciembre, hoy) {
    const error = (message) => Object.assign(new Error(message), { status: 400 });
    if (typeof simular !== 'boolean' || typeof proximoDiciembre !== 'boolean') throw error('Las opciones deben ser booleanas.');
    if (!simular && proximoDiciembre) throw error('Una simulación de diciembre no permite crear recibos.');
    const year = Number(hoy.slice(0, 4));
    const diciembre = year + '-12-01';
    return { simular, fecha: proximoDiciembre ? (hoy <= diciembre ? diciembre : year + 1 + '-12-01') : null };
}

export function separarResultado(filas) {
    return {
        filas: filas.filter((f) => f.origen_id != null && f.anio_nuevo != null),
        avisos: filas.filter((f) => f.origen_id == null && f.aviso).map((f) => f.aviso)
    };
}
