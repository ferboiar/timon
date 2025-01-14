/**
 * Este script incrementa la versión en el archivo package.json.
 * La versión sigue el formato X.Y.Z y se incrementa de la siguiente manera:
 * - El tercer número (Z) se incrementa en 1 con cada push.
 * - Cuando Z llega a 10, se reinicia a 0 y se incrementa el segundo número (Y).
 * - Cuando Y llega a 10, se reinicia a 0 y se incrementa el primer número (X).
 */

const fs = require('fs');
const packageFilePath = './package.json';

function incrementVersion(version) {
    let [major, minor, patch] = version.split('.').map(Number);

    patch++;
    if (patch > 9) {
        patch = 0;
        minor++;
        if (minor > 9) {
            minor = 0;
            major++;
        }
    }

    return `${major}.${minor}.${patch}`;
}

fs.readFile(packageFilePath, 'utf8', (err, data) => {
    if (err) throw err;

    // Buscar la versión actual en el archivo package.json
    const packageJson = JSON.parse(data);
    const newVersion = incrementVersion(packageJson.version);
    packageJson.version = newVersion;

    // Escribir los cambios en el archivo package.json
    fs.writeFile(packageFilePath, JSON.stringify(packageJson, null, 2), 'utf8', (err) => {
        if (err) throw err;
        console.log(`Version updated in package.json to ${newVersion}`);
    });
});
