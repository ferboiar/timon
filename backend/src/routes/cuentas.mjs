import { Router } from 'express';
import { deleteAccounts, getAccounts, getTipos, pushAccount } from '../db/db_utilsAcc.mjs';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const accounts = await getAccounts();
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las cuentas' });
    }
});

router.post('/', async (req, res) => {
    const { id, nombre, tipo, iban, saldo_actual, descripcion, activa } = req.body;
    try {
        await pushAccount(id, nombre, tipo, iban, saldo_actual, descripcion, activa);
        res.status(201).json({ message: 'Cuenta insertada o actualizada correctamente' });
    } catch (error) {
        res.status(400).json({ error: `Error al insertar o actualizar la cuenta: ${error.message}`, details: error.stack });
    }
});

router.delete('/', async (req, res) => {
    const { accounts } = req.body;
    try {
        await deleteAccounts(accounts);
        res.status(200).json({ message: 'Cuenta(s) eliminada(s) correctamente' });
    } catch (error) {
        res.status(500).json({ error: `Error al eliminar la(s) cuenta(s): ${error.message}`, details: error.stack });
    }
});

router.get('/tipos', async (req, res) => {
    try {
        const tipos = await getTipos();
        res.json(tipos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los tipos' });
    }
});

export default router;
