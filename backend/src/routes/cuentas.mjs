/**
 * API para la gestión de cuentas bancarias
 *
 * Este módulo proporciona endpoints para administrar cuentas bancarias en la aplicación.
 * Permite obtener la lista completa de cuentas, crear o actualizar cuentas existentes,
 * eliminar cuentas individuales o múltiples, y consultar los tipos de cuentas disponibles
 * (como corriente, ahorro, etc.) definidos en la estructura de la base de datos.
 *
 * @module routes/cuentas
 */

import { deleteAccounts, getAccounts, getTipos, pushAccount } from '#backend/db/db_utilsAcc.mjs';
import { Router } from 'express';
import { verifyToken } from '#backend/middleware/auth.mjs';
import { responderError } from '../utils/errorDeNegocio.mjs';

const router = Router();

router.get('/', verifyToken, async (req, res) => {
    try {
        const accounts = await getAccounts();
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las cuentas' });
    }
});

router.post('/', verifyToken, async (req, res) => {
    const { id, nombre, tipo, iban, saldo_actual, descripcion, activa } = req.body;
    try {
        await pushAccount(id, nombre, tipo, iban, saldo_actual, descripcion, activa, req.user.id);
        res.status(201).json({ message: 'Cuenta insertada o actualizada correctamente' });
    } catch (error) {
        if (error.codigo === 'IBAN_DUPLICADO') {
            console.log(`cuentas - Alta o edición rechazada: ${error.message}`);
        }
        responderError(res, error, 'No se pudo guardar la cuenta.', { contexto: 'cuentas - POST' });
    }
});

router.delete('/', verifyToken, async (req, res) => {
    const { accounts } = req.body;
    try {
        await deleteAccounts(accounts);
        res.status(200).json({ message: 'Cuenta(s) eliminada(s) correctamente' });
    } catch (error) {
        responderError(res, error, 'No se pudieron eliminar las cuentas.', { contexto: 'cuentas - DELETE' });
    }
});

router.get('/tipos', verifyToken, async (req, res) => {
    try {
        const tipos = await getTipos();
        res.json(tipos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los tipos' });
    }
});

export default router;
