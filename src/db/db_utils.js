const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function getRecibos() {
  try {
    // Read password from .passwords file securely
    const passwordsPath = path.join(__dirname, '.passwords');
    const password = fs.readFileSync(passwordsPath, 'utf8').trim();

    const connection = await mysql.createConnection({
      host: 'mysql-fer-particular.b.aivencloud.com',
      port: 10613,
      user: 'avnadmin',
      password, // Use the read password
      database: 'conta_hogar',
      ssl: {
        rejectUnauthorized: true,
      },
    });

    const [rows] = await connection.execute('SELECT * FROM recibos');
    await connection.close();
    return rows;
  } catch (error) {
    console.error("Error al obtener los recibos:", error);
    throw error; // Re-lanza el error para que se maneje en otro lugar si es necesario
  }
}

module.exports = { getRecibos };