/**
 * Mapa spec → ficheros fuente de Timón.
 * ====================================
 *
 * Para el triage: si un spec falla, estos son los ficheros cuya versión explica las
 * aserciones (selectores, textos, rutas, respuestas). Se comparan con el último verde
 * (`ultimo-verde.mjs`) antes de tocar nada.
 *
 * Las rutas son relativas a la raíz del repositorio.
 */

/** @type {Record<string, string[]>} */
export const MAPA_FUENTES = {
    'tests/auth.spec.mjs': [
        'src/views/pages/auth/Login.vue',
        'src/composables/useAuth.js',
        'src/utils/apiError.js',
        'src/router/index.js',
        'src/layout/AppTopbar.vue',
        'src/layout/AppFooter.vue',
        'src/config/api.js',
        'backend/src/routes/auth.mjs',
        'backend/src/middleware/auth.mjs'
    ],
    'tests/categorias.spec.mjs': [
        'src/views/pages/Categories.vue',
        'src/service/CatsService.js',
        'src/utils/apiError.js',
        'src/router/index.js',
        'backend/src/routes/categorias.mjs',
        'backend/src/db/db_utilsCats.mjs',
        'backend/src/utils/errorDeNegocio.mjs',
        'backend/src/db/migrations/0001_baseline.sql'
    ],
    'tests/erroresConexion.spec.mjs': [
        'src/views/pages/ProfileSettings.vue',
        'src/service/DbConfigService.js',
        'src/utils/apiError.js',
        'src/router/index.js',
        'backend/src/routes/conexionDB.mjs',
        'backend/src/db/db_utilsConn.mjs',
        'backend/src/utils/catalogoErrores.mjs',
        'backend/src/utils/errorDeNegocio.mjs'
    ],
    'tests/usuarios.spec.mjs': [
        'src/views/pages/ProfileSettings.vue',
        'src/service/UsersService.js',
        'src/utils/apiError.js',
        'src/router/index.js',
        'backend/src/routes/users.mjs',
        'backend/src/db/db_utilsUsers.mjs',
        'backend/src/utils/catalogoErrores.mjs',
        'backend/src/utils/errorDeNegocio.mjs',
        'backend/src/db/migrations/0001_baseline.sql'
    ],
    'tests/smoke.spec.mjs': ['src/main.js', 'src/App.vue', 'src/router/index.js', 'vite.config.mjs']
};

/** Lista única y ordenada de ficheros mapeados por cualquier spec. */
export function ficherosMapeados() {
    return [...new Set(Object.values(MAPA_FUENTES).flat())].sort();
}

/** Ficheros que explican un spec concreto (o lista vacía si no está mapeado). */
export function fuentesDeSpec(spec) {
    const clave = Object.keys(MAPA_FUENTES).find((ruta) => ruta.endsWith(spec) || spec.endsWith(ruta));
    return clave ? MAPA_FUENTES[clave] : [];
}
