// S-04b (DC-63): limitador de intentos sin base de datos ni esperas reales.
import assert from 'node:assert/strict';
import test from 'node:test';

import { claveDeIntento, crearLimitador } from '#backend/utils/limitadorIntentos.mjs';

/** Reloj manual para probar la ventana sin temporizadores. */
function relojManual() {
    let instante = 0;
    return {
        ahora: () => instante,
        avanzar: (ms) => {
            instante += ms;
        }
    };
}

test('no bloquea hasta alcanzar el umbral y sí en el intento siguiente', () => {
    const reloj = relojManual();
    const limitador = crearLimitador({ maxIntentos: 3, ventanaMs: 60_000, ahora: reloj.ahora, programarLimpieza: false });
    const clave = claveDeIntento('10.0.0.1', 'Ana');

    assert.equal(limitador.comprobar(clave).bloqueado, false);
    assert.equal(limitador.registrarFallo(clave).bloqueado, false);
    assert.equal(limitador.registrarFallo(clave).bloqueado, false);
    assert.equal(limitador.registrarFallo(clave).bloqueado, true);
    assert.equal(limitador.comprobar(clave).bloqueado, true);
    assert.equal(limitador.comprobar(clave).intentos, 3);
});

test('un login correcto reinicia la cuenta', () => {
    const reloj = relojManual();
    const limitador = crearLimitador({ maxIntentos: 2, ventanaMs: 60_000, ahora: reloj.ahora, programarLimpieza: false });
    const clave = claveDeIntento('10.0.0.1', 'ana');

    limitador.registrarFallo(clave);
    limitador.registrarFallo(clave);
    assert.equal(limitador.comprobar(clave).bloqueado, true);

    limitador.registrarExito(clave);
    assert.deepEqual(limitador.comprobar(clave), { bloqueado: false, intentos: 0, segundosRestantes: 0 });
});

test('la ventana caduca y deja de bloquear', () => {
    const reloj = relojManual();
    const limitador = crearLimitador({ maxIntentos: 1, ventanaMs: 60_000, ahora: reloj.ahora, programarLimpieza: false });
    const clave = '10.0.0.1|ana';

    limitador.registrarFallo(clave);
    assert.equal(limitador.comprobar(clave).bloqueado, true);
    assert.equal(limitador.comprobar(clave).segundosRestantes, 60);

    reloj.avanzar(60_001);
    assert.deepEqual(limitador.comprobar(clave), { bloqueado: false, intentos: 0, segundosRestantes: 0 });
});

test('cada IP y usuario tiene su propia cuenta', () => {
    const reloj = relojManual();
    const limitador = crearLimitador({ maxIntentos: 1, ventanaMs: 60_000, ahora: reloj.ahora, programarLimpieza: false });
    const ana = claveDeIntento('10.0.0.1', 'ana');
    const luis = claveDeIntento('10.0.0.2', 'luis');

    limitador.registrarFallo(ana);
    assert.equal(limitador.comprobar(ana).bloqueado, true);
    assert.equal(limitador.comprobar(luis).bloqueado, false);
});

test('la clave normaliza IP y usuario y acota el nombre', () => {
    assert.equal(claveDeIntento(' 10.0.0.1 ', '  Ana  '), '10.0.0.1|ana');
    assert.equal(claveDeIntento(undefined, undefined), 'desconocida|');
    assert.equal(claveDeIntento('10.0.0.1', 'a'.repeat(80)), '10.0.0.1|' + 'a'.repeat(50));
});

test('rechaza configuraciones inválidas', () => {
    assert.throws(() => crearLimitador({ maxIntentos: 0 }), /maxIntentos/);
    assert.throws(() => crearLimitador({ ventanaMs: 0 }), /ventanaMs/);
    assert.throws(() => crearLimitador({ ahora: 'ahora' }), /ahora/);
});
